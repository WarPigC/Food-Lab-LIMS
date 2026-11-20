const jwt = require('jsonwebtoken');

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
};

/**
 * Socket.IO Authentication Middleware
 * Scopes WebSocket connections to authenticated users only.
 * Reads token from handshake cookies, socket.handshake.auth.token,
 * or Authorization header.
 */
const socketAuthMiddleware = (socket, next) => {
  let token = socket.handshake.auth?.token;

  // 1. Fallback to handshake cookies
  if (!token && socket.handshake.headers?.cookie) {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    token = cookies.token;
  }

  // 2. Fallback to handshake authorization header
  if (!token && socket.handshake.headers?.authorization) {
    token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '');
  }

  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
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

