const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const SystemLog = require('../models/SystemLog');
const { logInfo } = require('../utils/logger');

/**
 * POST /api/logs/client
 * Receives batched log entries from the frontend.
 * Rate-limited implicitly by the batch approach (frontend debounces).
 */
router.post('/client', protect, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'No log entries provided' });
    }

    // Cap at 20 entries per batch to prevent abuse
    const batch = entries.slice(0, 20);

    const docs = batch.map(entry => ({
      level: ['info', 'warn', 'error'].includes(entry.level) ? entry.level : 'info',
      event: entry.event || 'CLIENT_EVENT',
      message: typeof entry.message === 'string' ? entry.message.substring(0, 1000) : 'Unknown',
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      error: entry.error ? {
        name: entry.error.name,
        message: typeof entry.error.message === 'string' ? entry.error.message.substring(0, 2000) : undefined,
        stack: typeof entry.error.stack === 'string' ? entry.error.stack.substring(0, 5000) : undefined
      } : undefined,
      source: 'client',
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
    }));

    // Fire-and-forget insert
    SystemLog.insertMany(docs).catch(err => {
      console.error('[LogRoutes] Failed to persist client logs:', err.message);
    });

    res.json({ message: `Received ${docs.length} log entries` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process client logs', error: err.message });
  }
});

/**
 * GET /api/logs
 * Paginated log viewer for the Admin dashboard.
 * Supports filtering by level, event, user, date range, and search.
 */
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      event,
      userId,
      search,
      from,
      to
    } = req.query;

    const filter = {};

    if (level) filter.level = level;
    if (event) filter.event = { $regex: event, $options: 'i' };
    if (userId) filter['user.id'] = userId;

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { 'target.identifier': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { event: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      SystemLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SystemLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
});

/**
 * GET /api/logs/export
 * Export logs as CSV, filtered by date range and level.
 * Restricted to ADMIN role.
 */
router.get('/export', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { from, to, level } = req.query;

    const filter = {};
    if (level) filter.level = level;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // Default: last 30 days if no range specified
    if (!from && !to) {
      filter.timestamp = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    const logs = await SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000) // Safety cap
      .lean();

    // Build CSV
    const headers = ['Timestamp', 'Level', 'Event', 'Message', 'User', 'Role', 'Target', 'Method', 'URL', 'Status', 'ResponseTime(ms)', 'Source', 'Diff'];
    const rows = logs.map(log => [
      log.timestamp ? new Date(log.timestamp).toISOString() : '',
      log.level || '',
      log.event || '',
      csvEscape(log.message || ''),
      log.user?.name || '',
      log.user?.role || '',
      log.target?.identifier || '',
      log.request?.method || '',
      log.request?.url || '',
      log.request?.statusCode || '',
      log.request?.responseTimeMs || '',
      log.source || '',
      log.diff ? csvEscape(JSON.stringify(log.diff)) : ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const filename = `system_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

    logInfo('LOGS_EXPORTED', {
      message: `Admin exported ${logs.length} log entries`,
      user: { id: req.user._id, name: req.user.name, role: req.user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to export logs', error: err.message });
  }
});

/**
 * GET /api/logs/stats
 * Quick stats for the logs dashboard header.
 */
router.get('/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [errors24h, audits24h, total7d] = await Promise.all([
      SystemLog.countDocuments({ level: 'error', timestamp: { $gte: last24h } }),
      SystemLog.countDocuments({ level: 'audit', timestamp: { $gte: last24h } }),
      SystemLog.countDocuments({ timestamp: { $gte: last7d } })
    ]);

    res.json({ errors24h, audits24h, total7d });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch log stats', error: err.message });
  }
});

function csvEscape(str) {
  if (!str) return '';
  str = String(str).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

module.exports = router;
