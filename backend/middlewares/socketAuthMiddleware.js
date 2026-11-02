const jwt = require('jsonwebtoken');

/**
 * Socket.IO Authentication Middleware
 * Scopes WebSocket connections to authenticated users only.
 * Reads token from socket.handshake.auth.token or Authorization header.
 */
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    return next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuthMiddleware;

