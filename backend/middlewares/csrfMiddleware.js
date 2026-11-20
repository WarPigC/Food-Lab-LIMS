/**
 * CSRF Protection Middleware
 * Protects cookie-authenticated mutating requests (POST, PUT, DELETE, PATCH)
 * using the Double-Submit Cookie pattern.
 */
const csrfProtection = (req, res, next) => {
  // 1. Safe methods do not mutate server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 2. Auth entry routes do not require prior CSRF token
  if (req.path.startsWith('/api/auth') || req.path === '/api/auth') {
    return next();
  }

  // 3. Requests explicitly authenticated via valid Bearer authorization header
  // are immune to CSRF because cross-origin forms cannot set custom Authorization headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const rawToken = req.headers.authorization.split(' ')[1];
    if (rawToken && rawToken !== 'null' && rawToken !== 'undefined') {
      return next();
    }
  }

  // 4. If request relies on session cookie authentication, enforce CSRF token validation
  if (req.cookies && req.cookies.token) {
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ message: 'Invalid or missing CSRF token' });
    }
  }

  next();
};

module.exports = { csrfProtection };
