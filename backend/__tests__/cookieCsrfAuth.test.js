/**
 * Cookie-Based Authentication & Double-Submit CSRF Protection Tests
 *
 * Verifies that:
 * 1. csrfMiddleware allows safe HTTP methods (GET, HEAD, OPTIONS) without CSRF token.
 * 2. csrfMiddleware allows auth entry routes (/api/auth/*) without CSRF token.
 * 3. csrfMiddleware allows mutating requests with valid Bearer authorization header.
 * 4. csrfMiddleware rejects cookie-authenticated mutating requests missing XSRF-TOKEN cookie or header with 403.
 * 5. csrfMiddleware rejects cookie-authenticated mutating requests with mismatched XSRF-TOKEN with 403.
 * 6. csrfMiddleware allows cookie-authenticated mutating requests with matching XSRF-TOKEN.
 * 7. protect middleware authenticates via req.cookies.token when Authorization header is absent.
 * 8. protect middleware authenticates via Authorization: Bearer <token> when cookie is absent.
 * 9. protect middleware ignores 'Bearer null' or 'Bearer undefined' and falls back to req.cookies.token.
 * 10. protect middleware rejects with 401 when neither cookie nor bearer token is provided.
 * 11. POST /api/auth/login attaches httpOnly token and readable XSRF-TOKEN cookies.
 * 12. POST /api/auth/renew-session attaches refreshed cookies.
 * 13. POST /api/auth/logout clears auth cookies with past expiration date.
 * 14. socketAuthMiddleware parses token from socket.handshake.headers.cookie.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');
const { protect } = require('../middlewares/authMiddleware');
const { csrfProtection } = require('../middlewares/csrfMiddleware');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

describe('Cookie-Based Auth & CSRF Protection Suite', () => {
  let app;
  let testUser;
  let userToken;
  const userPassword = 'TestPassword123!';
  const xsrfSecret = 'test_xsrf_token_abcdef123456';

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_cookie_csrf';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    testUser = await User.create({
      name: 'Test Officer',
      email: `officer_${Date.now()}@example.com`,
      phone: '9876543210',
      password: userPassword,
      role: 'ADMIN_OFFICER'
    });

    userToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(csrfProtection);
    app.use('/api/auth', authRoutes);

    // Protected mutating route
    app.post('/api/test-mutation', protect, (req, res) => {
      res.json({ success: true, user: req.user._id });
    });

    // Protected safe route
    app.get('/api/test-safe', protect, (req, res) => {
      res.json({ success: true, user: req.user._id });
    });
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
  });

  describe('1. CSRF Protection Middleware (Double-Submit Cookie)', () => {
    it('should allow GET requests without CSRF token', async () => {
      const res = await request(app)
        .get('/api/test-safe')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow auth entry routes without CSRF token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: userPassword });

      expect(res.status).toBe(200);
    });

    it('should allow mutating requests authenticated via Bearer header without CSRF token', async () => {
      const res = await request(app)
        .post('/api/test-mutation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: 'payload' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject mutating requests with cookie auth but missing CSRF header with 403', async () => {
      const res = await request(app)
        .post('/api/test-mutation')
        .set('Cookie', [`token=${userToken}`, `XSRF-TOKEN=${xsrfSecret}`])
        .send({ data: 'payload' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid or missing CSRF token');
    });

    it('should reject mutating requests with mismatched CSRF header with 403', async () => {
      const res = await request(app)
        .post('/api/test-mutation')
        .set('Cookie', [`token=${userToken}`, `XSRF-TOKEN=${xsrfSecret}`])
        .set('X-XSRF-TOKEN', 'tampered_or_different_token')
        .send({ data: 'payload' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid or missing CSRF token');
    });

    it('should allow mutating requests with matching CSRF cookie and X-XSRF-TOKEN header', async () => {
      const res = await request(app)
        .post('/api/test-mutation')
        .set('Cookie', [`token=${userToken}`, `XSRF-TOKEN=${xsrfSecret}`])
        .set('X-XSRF-TOKEN', xsrfSecret)
        .send({ data: 'payload' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Dual-Mode Authentication Middleware', () => {
    it('should authenticate via req.cookies.token when Authorization header is absent', async () => {
      const res = await request(app)
        .get('/api/test-safe')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user.toString()).toBe(testUser._id.toString());
    });

    it('should authenticate via Authorization: Bearer when cookie is absent', async () => {
      const res = await request(app)
        .get('/api/test-safe')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.toString()).toBe(testUser._id.toString());
    });

    it('should fallback to cookie when Authorization header is "Bearer null"', async () => {
      const res = await request(app)
        .get('/api/test-safe')
        .set('Authorization', 'Bearer null')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user.toString()).toBe(testUser._id.toString());
    });

    it('should fallback to cookie when Authorization header is "Bearer undefined"', async () => {
      const res = await request(app)
        .get('/api/test-safe')
        .set('Authorization', 'Bearer undefined')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user.toString()).toBe(testUser._id.toString());
    });

    it('should return 401 when neither cookie nor authorization header is provided', async () => {
      const res = await request(app).get('/api/test-safe');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should return 401 when cookie token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/test-safe')
        .set('Cookie', [`token=${expiredToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, token expired');
    });
  });

  describe('3. Auth Routes Cookie Lifecycle', () => {
    it('should set httpOnly token and readable XSRF-TOKEN cookies on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: userPassword });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      const xsrfCookie = cookies.find((c) => c.startsWith('XSRF-TOKEN='));

      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie).toContain('SameSite=Lax');

      expect(xsrfCookie).toBeDefined();
      expect(xsrfCookie).not.toContain('HttpOnly');
      expect(xsrfCookie).toContain('SameSite=Lax');
    });

    it('should renew cookies on POST /api/auth/renew-session', async () => {
      const res = await request(app)
        .post('/api/auth/renew-session')
        .send({ email: testUser.email, password: userPassword });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toContain('HttpOnly');
    });

    it('should clear cookies on POST /api/auth/logout', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      const xsrfCookie = cookies.find((c) => c.startsWith('XSRF-TOKEN='));

      expect(tokenCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(xsrfCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  describe('4. WebSocket Cookie Handshake Authentication', () => {
    it('should authenticate socket via handshake cookie header', (done) => {
      const socket = {
        handshake: {
          auth: {},
          headers: {
            cookie: `someOtherCookie=abc; token=${userToken}; XSRF-TOKEN=${xsrfSecret}`
          }
        }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect(socket.user).toBeDefined();
        expect(socket.user.id.toString()).toBe(testUser._id.toString());
        done();
      });
    });

    it('should reject socket handshake when cookie token is expired', (done) => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const socket = {
        handshake: {
          auth: {},
          headers: {
            cookie: `token=${expiredToken}`
          }
        }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Authentication error: Token expired');
        done();
      });
    });
  });
});
