const winston = require('winston');
const { MongoDB } = require('winston-mongodb');

/**
 * Central logger for the AIPER application.
 * 
 * Transports:
 *  - Console: all levels in dev, warn+ in production
 *  - MongoDB: mutations (audit) + errors + warnings (persisted for export)
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DB_ENABLED = process.env.LOG_DB_ENABLED !== 'false'; // default true
const MONGODB_URI = process.env.MONGODB_URI;

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, event, message, user, request }) => {
    const userStr = user?.name ? ` [${user.name}]` : '';
    const reqStr = request?.method ? ` ${request.method} ${request.url}` : '';
    const statusStr = request?.statusCode ? ` → ${request.statusCode}` : '';
    const timeStr = request?.responseTimeMs ? ` (${request.responseTimeMs}ms)` : '';
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${event || 'LOG'}${userStr}${reqStr}${statusStr}${timeStr} — ${message}`;
  })
);

// Build transports array
const transports = [
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : LOG_LEVEL,
    format: consoleFormat
  })
];

// MongoDB transport — added after DB connection is established
let mongoTransportAdded = false;

const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: {
    error: 0,
    warn: 1,
    audit: 2,
    info: 3,
    debug: 4
  },
  transports,
  // Don't crash on logging failures
  exitOnError: false
});

// Add colors for custom levels
winston.addColors({
  error: 'red',
  warn: 'yellow',
  audit: 'cyan',
  info: 'green',
  debug: 'gray'
});

/**
 * Initialize the MongoDB transport once the connection is ready.
 * Called from server.js after mongoose.connect() succeeds.
 */
function initMongoTransport() {
  if (!LOG_DB_ENABLED || !MONGODB_URI || mongoTransportAdded) return;

  try {
    logger.add(new MongoDB({
      db: MONGODB_URI,
      collection: 'systemlogs',
      level: 'audit', // Only persist audit, warn, error (not info/debug)
      options: { useUnifiedTopology: true },
      storeHost: true,
      decolorize: true,
      metaKey: 'meta',
      // Transform winston log entry to match our SystemLog schema
      format: winston.format.combine(
        winston.format.metadata(),
        winston.format.json()
      )
    }));
    mongoTransportAdded = true;
    console.log('[Logger] MongoDB transport initialized');
  } catch (err) {
    console.error('[Logger] Failed to initialize MongoDB transport:', err.message);
  }
}

/**
 * Structured log helper — writes a log entry matching the SystemLog schema.
 * This is the primary interface for all logging in the app.
 * 
 * For audit/warn/error: persisted to MongoDB (queryable + exportable)
 * For info: console only (unless LOG_GET_TO_DB=true)
 */
function log(level, event, data = {}) {
  const entry = {
    level,
    event,
    message: data.message || event,
    // Metadata stored under 'meta' key for winston-mongodb
    user: data.user || undefined,
    target: data.target || undefined,
    diff: data.diff || undefined,
    request: data.request || undefined,
    error: data.error || undefined,
    source: data.source || 'server'
  };

  // Also write directly to SystemLog collection for audit entries
  // (winston-mongodb can be unreliable with custom schemas)
  if (['audit', 'error', 'warn'].includes(level) && LOG_DB_ENABLED) {
    const SystemLog = require('../models/SystemLog');
    SystemLog.create({
      level,
      event,
      message: entry.message,
      user: entry.user,
      target: entry.target,
      diff: entry.diff,
      request: entry.request,
      error: entry.error,
      source: entry.source,
      timestamp: new Date()
    }).catch(err => {
      // Fire-and-forget — never let logging break the app
      console.error('[Logger] Failed to persist log:', err.message);
    });
  }

  // Always write to console via winston
  logger.log(level, entry.message, entry);
}

// Convenience methods
const logInfo = (event, data) => log('info', event, data);
const logAudit = (event, data) => log('audit', event, data);
const logWarn = (event, data) => log('warn', event, data);
const logError = (event, data) => log('error', event, data);

module.exports = {
  logger,
  initMongoTransport,
  log,
  logInfo,
  logAudit,
  logWarn,
  logError
};
