const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');
const TestInstance = require('../../models/TestInstance');
const SampleTransfer = require('../../models/SampleTransfer');
const SystemLog = require('../../models/SystemLog');
const { protect } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/roleMiddleware');
const { cacheMiddleware } = require('../../utils/serverCache');

// GET /api/jobs/validate-ulr?number=26
// Validates a custom ULR counter number: checks duplicate + sequencing rules
router.get('/validate-ulr', protect, async (req, res) => {
  try {
    const { authorize } = require('../../middlewares/roleMiddleware');
    if (req.user.role !== 'ADMIN_OFFICER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ valid: false, error: 'Forbidden', existingJobCode: null });
    }

    const UlrCounter = require('../../models/UlrCounter');
    const requestedNum = parseInt(req.query.number, 10);

    if (isNaN(requestedNum) || requestedNum < 1) {
      return res.json({ valid: false, error: 'Must be a positive integer', existingJobCode: null });
    }

    const counter = await UlrCounter.findOne({});
    const currentMax = counter?.currentValue || 0;

    // Rule: must be <= currentMax (gap fill) or exactly currentMax + 1 (next in sequence)
    if (requestedNum > currentMax + 1) {
      return res.json({ valid: false, error: 'ULR not in sequence', existingJobCode: null });
    }

    // Build the full ULR string
    const yy = String(new Date().getFullYear()).slice(2);
    const numStr = String(requestedNum).padStart(8, '0');
    const fullUlr = `${counter?.prefix || 'TC-12434'}${yy}${numStr}`;

    // Check for duplicates in both locked ULRs and pending reservations
    const existing = await Job.findOne({
      $or: [
        { 'sample.ulr_no': fullUlr },
        { reservedUlrSlot: requestedNum, reservedUlrYear: yy }
      ]
    }, { jobCode: 1 });
    if (existing) {
      return res.json({ valid: false, error: 'Already assigned to another job', existingJobCode: existing.jobCode });
    }

    return res.json({ valid: true, error: null, existingJobCode: null, fullUlr });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Server error', existingJobCode: null });
  }
});

// GET /api/jobs/recent-ulrs
// Returns last 5 assigned ULR numbers (for convenience display in the ULR assignment UI)
router.get('/recent-ulrs', protect, async (req, res) => {
  try {
    const jobs = await Job.find(
      { 'sample.ulr_no': { $ne: null, $exists: true, $gt: '' } },
      { 'sample.ulr_no': 1, jobCode: 1 }
    ).sort({ updatedAt: -1 }).limit(5);

    const result = jobs.map(j => ({
      ulr: j.sample.ulr_no,
      jobCode: j.jobCode,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Operational events to include in recent activity feed
const RECENT_ACTIVITY_EVENTS = [
  'JOB_CREATED',
  'TEST_DISPATCHED',
  'BULK_DISPATCHED',
  'TEST_RESULTS_SUBMITTED',
  'TEST_REVIEWED',
  'JOB_REVIEW_APPROVED',
  'JOB_RETURNED',
  'JOB_HELD',
  'JOB_CANCELLED',
  'MONITOR_WITHDRAW',
  'MONITOR_SPLIT',
  'SAMPLE_TRANSFER_INITIATED',
  'SAMPLE_TRANSFER_RECEIVED',
  'REPORT_UPLOADED',
  'REPORT_REVERTED',
  'PARAMETERS_MODIFIED'
];

function cleanJobCodeString(raw, message) {
  if (raw) {
    const nonNablMatch = String(raw).match(/^(\d{8,12}-N)(?:-.*)?$/);
    if (nonNablMatch) return nonNablMatch[1];
    const nablMatch = String(raw).match(/^(\d{8,12})(?:-.*)?$/);
    if (nablMatch) return nablMatch[1];
  }
  if (message) {
    const msgNonNabl = String(message).match(/\b(\d{8,12}-N)\b/);
    if (msgNonNabl) return msgNonNabl[1];
    const msgNabl = String(message).match(/\b(\d{8,12})\b/);
    if (msgNabl) return msgNabl[1];
  }
  return raw || '';
}

function cleanNarrativeMessage(msg) {
  if (!msg) return '';
  return String(msg)
    .replace(/—/g, '; ')
    .replace(/\bCHEMICAL HEAD\b/g, 'Chemical Head')
    .replace(/\bMICRO HEAD\b/g, 'Micro Head')
    .replace(/\bHEAD\b/g, 'Head')
    .replace(/\b(\d{8,12}(?:-N)?)(?:-[0-9]+[a-z]?(-v[0-9]+)?|-R[a-zA-Z0-9]+)\b/g, '$1')
    .trim();
}

function resolveActionType(event, message) {
  switch (event) {
    case 'TEST_DISPATCHED':
    case 'BULK_DISPATCHED':
      return 'DISPATCHED';
    case 'TEST_RESULTS_SUBMITTED':
      return 'SUBMITTED';
    case 'TEST_REVIEWED':
      return (message && /reassign/i.test(message)) ? 'REASSIGNED' : 'APPROVED';
    case 'JOB_REVIEW_APPROVED':
      return 'APPROVED';
    case 'JOB_RETURNED':
      return 'RETURNED';
    case 'JOB_CREATED':
      return 'CREATED';
    case 'JOB_HELD':
      return 'HELD';
    case 'JOB_CANCELLED':
      return 'CANCELLED';
    case 'SAMPLE_TRANSFER_INITIATED':
    case 'SAMPLE_TRANSFER_RECEIVED':
      return 'TRANSFER';
    case 'MONITOR_WITHDRAW':
      return 'WITHDRAWN';
    case 'MONITOR_SPLIT':
    case 'PARAMETERS_MODIFIED':
      return 'AMENDED';
    case 'REPORT_UPLOADED':
    case 'REPORT_REVERTED':
      return 'REPORT';
    default:
      return 'ACTIVITY';
  }
}

// GET /api/jobs/recent-activity
// Operational activity feed for Admin, Admin Officer, and Head dashboards.
router.get('/recent-activity', protect, authorize('ADMIN', 'ADMIN_OFFICER', 'HEAD'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
    const filter = {
      level: 'audit',
      event: { $in: RECENT_ACTIVITY_EVENTS }
    };

    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    if (req.user.role === 'HEAD') {
      if (dept === 'micro' || dept === 'chemical') {
        filter.$or = [
          { 'target.department': dept },
          { 'user.department': dept },
          { message: { $regex: dept, $options: 'i' } }
        ];
      } else {
        filter._id = null;
      }
    }

    const logs = await SystemLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Collect jobCodes to batch-fetch client names
    const jobCodesToLookup = new Set();
    logs.forEach(l => {
      const code = cleanJobCodeString(l.target?.identifier, l.message);
      if (code) jobCodesToLookup.add(code);
    });

    let jobClientMap = {};
    if (jobCodesToLookup.size > 0) {
      const foundJobs = await Job.find(
        { jobCode: { $in: Array.from(jobCodesToLookup) } },
        'jobCode clientName customer'
      ).lean();
      foundJobs.forEach(j => {
        jobClientMap[j.jobCode] = j.customer?.customer_name || j.clientName || '';
      });
    }

    const activityList = logs.map(l => {
      const cleanCode = cleanJobCodeString(l.target?.identifier, l.message);
      const client = jobClientMap[cleanCode] || '';
      const action = resolveActionType(l.event, l.message);
      const cleanMsg = cleanNarrativeMessage(l.message);

      return {
        _id: l._id.toString(),
        event: l.event,
        action,
        message: cleanMsg,
        jobCode: cleanCode,
        clientName: client,
        user: {
          name: l.user?.name || 'System User',
          role: l.user?.role || '',
          department: l.user?.department || null
        },
        timestamp: l.timestamp
      };
    });

    // Fallback synthesis if logs are fewer than requested limit and jobs exist
    if (activityList.length < limit) {
      const needed = limit - activityList.length;
      let jobFallbackQuery = {};
      if (req.user.role === 'HEAD' && dept) {
        jobFallbackQuery[`distribution.${dept}.required`] = true;
      }
      const existingJobCodes = new Set(activityList.map(a => a.jobCode).filter(Boolean));
      if (existingJobCodes.size > 0) {
        jobFallbackQuery.jobCode = { $nin: Array.from(existingJobCodes) };
      }

      const fallbackJobs = await Job.find(jobFallbackQuery)
        .sort({ updatedAt: -1 })
        .limit(needed)
        .populate('createdBy', 'name role department')
        .lean();

      fallbackJobs.forEach(fj => {
        const isCompleted = fj.status === 'COMPLETED' ||
          (fj.distribution?.micro?.status === 'COMPLETED' && fj.distribution?.chemical?.status === 'COMPLETED');
        const action = isCompleted ? 'APPROVED' : fj.status === 'ON_HOLD' ? 'HELD' : 'CREATED';
        const client = fj.customer?.customer_name || fj.clientName || 'Client';
        const msg = isCompleted
          ? `Job ${fj.jobCode} completed and verified`
          : fj.status === 'ON_HOLD'
          ? `Job ${fj.jobCode} is currently on hold`
          : `Job ${fj.jobCode} created for ${client}`;

        activityList.push({
          _id: `synth-${fj._id.toString()}`,
          event: isCompleted ? 'JOB_COMPLETED' : fj.status === 'ON_HOLD' ? 'JOB_HELD' : 'JOB_CREATED',
          action,
          message: msg,
          jobCode: fj.jobCode,
          clientName: client,
          user: {
            name: fj.createdBy?.name || 'Admin Officer',
            role: fj.createdBy?.role || 'ADMIN_OFFICER',
            department: fj.createdBy?.department || null
          },
          timestamp: fj.updatedAt || fj.createdAt || new Date()
        });
      });
    }

    res.json(activityList);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity', error: error.message });
  }
});

// Get high-level stats for the dashboard
router.get('/stats', protect, cacheMiddleware('jobs_stats'), async (req, res) => {
  try {
    let baseQuery = { status: { $ne: 'CANCELLED' } };
    
    if (req.user.role === 'HEAD') {
      const dept = req.user.department ? req.user.department.toLowerCase() : '';
      if (dept === 'micro') {
        baseQuery['distribution.micro.required'] = true;
      } else if (dept === 'chemical') {
        baseQuery['distribution.chemical.required'] = true;
      } else {
        baseQuery._id = null;
      }
    }

    const totalJobs = await Job.countDocuments(baseQuery);
    
    // A completed job is one where all required distributions are COMPLETED
    const completedJobs = await Job.countDocuments({
      ...baseQuery,
      $and: [
        {
          $or: [
            { 'distribution.micro.required': false },
            { 'distribution.micro.status': 'COMPLETED' }
          ]
        },
        {
          $or: [
            { 'distribution.chemical.required': false },
            { 'distribution.chemical.status': 'COMPLETED' }
          ]
        }
      ]
    });

    const ongoingJobs = totalJobs - completedJobs;

    res.json({ ongoingJobs, completedJobs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// GET /api/jobs/monitoring
// Returns in-flight dispatched jobs with active PENDING instances for the Head's department
router.get('/monitoring', protect, authorize('HEAD', 'ADMIN'), async (req, res) => {
  try {
    const dept = req.user.department ? req.user.department.toLowerCase() : '';
    let query = { status: 'ACTIVE' };

    if (req.user.role === 'HEAD') {
      if (!['micro', 'chemical'].includes(dept)) {
        return res.json({ jobs: [], hasMore: false, nextCursor: null });
      }
      query[`distribution.${dept}.required`] = true;
      query[`distribution.${dept}.status`] = 'ASSIGNED_TO_ASSISTANT';
    } else {
      // ADMIN role fallback
      query.$or = [
        { 'distribution.micro.status': 'ASSIGNED_TO_ASSISTANT' },
        { 'distribution.chemical.status': 'ASSIGNED_TO_ASSISTANT' }
      ];
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 1000);
    const cursor = req.query.cursor;

    if (cursor) {
      query._id = { ...(query._id || {}), $lt: cursor };
    }

    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .populate('parameters.parameterId', 'name unit type')
      .populate('distribution.micro.assignedHead', 'name email')
      .populate('distribution.chemical.assignedHead', 'name email')
      .populate('history.by', 'name')
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = jobs.length > limit;
    const pageJobs = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? pageJobs[pageJobs.length - 1]._id : null;

    const jobsWithInstances = await Promise.all(pageJobs.map(async (job) => {
      let instQuery = { jobId: job._id, status: 'PENDING' };
      if (req.user.role === 'HEAD' && dept) {
        instQuery.department = dept;
      }
      const instances = await TestInstance.find(instQuery)
        .populate('assignedTo', 'name email department')
        .populate('createdBy', 'name department')
        .sort({ createdAt: 1 });

      const jobObj = job.toObject();
      return {
        ...jobObj,
        testInstances: instances
      };
    }));

    // Exclude jobs that have no active in-progress PENDING instances
    const activeJobs = jobsWithInstances.filter(j => j.testInstances && j.testInstances.length > 0);

    res.json({
      jobs: activeJobs,
      hasMore,
      nextCursor
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monitoring jobs', error: error.message });
  }
});

// Get jobs with cursor-based pagination
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.query.includeCancelled !== 'true') {
      query.status = { $nin: ['CANCELLED', 'ON_HOLD'] };
    }

    if (req.user.role === 'HEAD') {
      const dept = req.user.department ? req.user.department.toLowerCase() : '';
      if (dept === 'micro') {
        query['distribution.micro.required'] = true;
      } else if (dept === 'chemical') {
        query['distribution.chemical.required'] = true;
      } else {
        query._id = null;
      }

      if (req.query.activeForHead === 'true' && dept) {
        const statusField = `distribution.${dept}.status`;
        const headField = `distribution.${dept}.assignedHead`;
        
        query.$or = [
          {
            [statusField]: { $in: ['PENDING', 'PENDING_REVIEW', 'REVIEW_APPROVED'] },
            $or: [
              { [headField]: null },
              { [headField]: req.user._id }
            ]
          },
          {
            'pendingParamAmendments.status': 'PENDING_HEAD_REVIEW',
            'pendingParamAmendments.parameters': {
              $elemMatch: { type: new RegExp(`^${dept}$`, 'i') }
            }
          }
        ];
      }
    }

    // ── Search parameter ──
    const searchTerm = req.query.search;
    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      // Search by job code, client name, or sample description
      const searchConditions = [
        { jobCode: regex },
        { clientName: regex },
        { 'sample.sampleDescription': regex },
      ];
      // Preserve any existing $or (e.g., from HEAD role filtering)
      if (query.$or) {
        query.$and = [...(query.$and || []), { $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Range query (for on-demand job group expansion)
    const { rangeStart, rangeEnd, startSerial, endSerial } = req.query;
    if (startSerial && endSerial) {
      const s1 = parseInt(startSerial, 10);
      const s2 = parseInt(endSerial, 10);
      if (!isNaN(s1) && !isNaN(s2)) {
        const minSerial = Math.min(s1, s2);
        const maxSerial = Math.max(s1, s2);
        const serialCondition = {
          $or: [
            { sampleSerial: { $gte: minSerial, $lte: maxSerial } },
            {
              $expr: {
                $and: [
                  { $gte: [{ $mod: ['$sampleSerial', 10000] }, minSerial] },
                  { $lte: [{ $mod: ['$sampleSerial', 10000] }, maxSerial] }
                ]
              }
            }
          ]
        };
        if (query.$or) {
          query.$and = [...(query.$and || []), { $or: query.$or }, serialCondition];
          delete query.$or;
        } else {
          query.$or = serialCondition.$or;
        }
      }
    } else if (rangeStart && rangeEnd) {
      const minCode = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const maxCode = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      query.jobCode = { $gte: minCode, $lte: maxCode };
    }

    // Pagination parameters
    const isRangeQuery = (rangeStart && rangeEnd) || (startSerial && endSerial);
    const limit = isRangeQuery
      ? 200
      : Math.min(parseInt(req.query.limit) || 50, 100);
    const cursor = req.query.cursor;  // MongoDB _id of the last item from previous page

    if (cursor) {
      query._id = { ...(query._id || {}), $lt: cursor };
    }

    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .populate('parameters.parameterId', 'name unit type')
      .populate('distribution.micro.assignedHead', 'name email')
      .populate('distribution.chemical.assignedHead', 'name email')
      .populate('history.by', 'name')
      .populate('siblingJobId', 'sampleTransferState distribution headApproval jobCode sample')
      .sort({ _id: -1 })
      .limit(limit + 1);  // fetch one extra to check if there are more

    // Determine if there's a next page
    const hasMore = jobs.length > limit;
    const pageJobs = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? pageJobs[pageJobs.length - 1]._id : null;

    // Attach test instances and transfers for timeline view
    const jobsWithTimeline = await Promise.all(pageJobs.map(async (job) => {
      const instances = await TestInstance.find({ jobId: job._id })
        .populate('assignedTo', 'name')
        .populate('createdBy', 'name department')
        .populate('reviewHistory.by', 'name')
        .sort({ createdAt: 1 });
      const transfers = await SampleTransfer.find({ sampleSerial: job.sampleSerial })
        .populate('sentBy', 'name department')
        .populate('receivedBy', 'name department')
        .sort({ createdAt: 1 });
      const jobObj = job.toObject();
      if (jobObj.parameters) {
        jobObj.parameters = jobObj.parameters.filter(p => p.parameterId || p.name);
      }
      return { ...jobObj, testInstances: instances, sampleTransfers: transfers };
    }));

    return res.json({
      jobs: jobsWithTimeline,
      nextCursor,
      hasMore
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

module.exports = router;
