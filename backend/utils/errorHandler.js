const { logError } = require('./logger');

/**
 * Normalizes any error (Mongoose, MongoServerError, JWT, custom, or standard JS Error)
 * into a structured object with statusCode, client message, error detail, and error code.
 */
function normalizeError(err) {
  if (!err) {
    return {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      error: 'Unknown error'
    };
  }

  // 1. Mongoose Schema Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const errorDetails = Object.values(err.errors).map(e => e.message);
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${errorDetails.join('; ')}`,
      error: err.message
    };
  }

  // 2. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return {
      statusCode: 400,
      code: 'INVALID_IDENTIFIER',
      message: `Invalid format for identifier field '${err.path || 'id'}'`,
      error: `Cast to ${err.kind} failed for value "${err.value}"`
    };
  }

  // 3. MongoDB Duplicate Key Collision (code 11000)
  if (err.code === 11000) {
    const keys = err.keyValue ? Object.keys(err.keyValue) : [];
    const fieldName = keys.length > 0 ? keys.join(', ') : 'field';
    return {
      statusCode: 400,
      code: 'DUPLICATE_KEY',
      message: `A record with this ${fieldName} already exists in the system`,
      error: err.message
    };
  }

  // 4. JWT Token Expiration
  if (err.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Not authorized, token expired',
      error: err.message
    };
  }

  // 5. Malformed or Invalid JWT
  if (err.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Not authorized, token failed',
      error: err.message
    };
  }

  // 6. Generic or HTTP Errors
  const statusCode = err.statusCode || err.status || 500;
  const is5xx = statusCode >= 500;

  return {
    statusCode,
    code: (typeof err.code === 'string' && err.code) || (is5xx ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR'),
    message: err.message || (is5xx ? 'An unexpected internal error occurred' : 'Bad Request'),
    error: err.stack ? err.message : String(err)
  };
}

/**
 * Express Global Error Handling Middleware.
 * Catches all errors forwarded via next(err) or thrown in async routes.
 * Logs 5xx errors to SystemLog and returns standardized JSON.
 */
function globalErrorHandler(err, req, res, next) {
  const normalized = normalizeError(err);

  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Log all 5xx server errors to SystemLog and console
  if (normalized.statusCode >= 500) {
    try {
      logError('API_ERROR', {
        message: `${req.method} ${req.originalUrl} failed with status ${normalized.statusCode}: ${normalized.message}`,
        user: req.user ? {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role
        } : undefined,
        request: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          statusCode: normalized.statusCode
        },
        error: {
          name: err.name || 'Error',
          message: err.message || normalized.message,
          stack: err.stack
        }
      });
    } catch (logErr) {
      console.error('[ErrorHandler] Failed to log error to SystemLog:', logErr.message);
    }
  }

  // Mark handled on res.locals so requestLogger avoids duplicate warning
  res.locals.errorHandled = true;

  return res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    error: normalized.error,
    code: normalized.code
  });
}

/**
 * 404 Handler for undefined /api/* endpoints.
 */
function apiNotFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
}

module.exports = {
  normalizeError,
  globalErrorHandler,
  apiNotFoundHandler
};
