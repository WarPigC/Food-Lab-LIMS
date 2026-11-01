const { logInfo, logWarn } = require('../utils/logger');

/**
 * Express middleware that logs every incoming HTTP request.
 * Attaches to `res.on('finish')` to capture the final status code and response time.
 * 
 * Mutations (POST/PUT/DELETE/PATCH) are logged at 'audit' level via auditLogger 
 * in individual routes. This middleware only logs the request envelope at 'info' level.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Capture when the response is sent
  res.on('finish', () => {
    const responseTimeMs = Date.now() - start;
    const user = req.user ? {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role
    } : undefined;

    const data = {
      message: `${req.method} ${req.originalUrl} → ${res.statusCode} (${responseTimeMs}ms)`,
      user,
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        responseTimeMs
      }
    };

    // Log failed requests as warnings (unless 5xx was already logged by globalErrorHandler)
    if (res.statusCode >= 400) {
      if (res.statusCode >= 500 && res.locals && res.locals.errorHandled) {
        // Already recorded with full stack trace by globalErrorHandler
        return;
      }
      if (res.locals && res.locals.errorMessage) {
        data.error = { message: res.locals.errorMessage };
      }
      logWarn('API_ERROR', data);
    } else {
      logInfo('API_REQUEST', data);
    }
  });

  next();
}

module.exports = requestLogger;
