const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check httpOnly cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Fall back to Authorization header if cookie is missing
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const rawToken = req.headers.authorization.split(' ')[1];
    // Guard against manual frontend calls passing "Bearer null" or "Bearer undefined"
    if (rawToken && rawToken !== 'null' && rawToken !== 'undefined' && rawToken.trim() !== '') {
      token = rawToken;
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    next();
  } catch (error) {
    console.error(error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token expired' });
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
