/**
 * Session Expiry and In-Place Re-Authentication Tests
 *
 * Verifies that:
 * 1. POST /api/auth/renew-session successfully re-authenticates with correct credentials and returns a fresh token.
 * 2. POST /api/auth/renew-session rejects with 401 when given an invalid password.
 * 3. POST /api/auth/renew-session rejects with 400 when missing email or password.
 * 4. Auth protect middleware returns 401 with 'Not authorized, token expired' when token is expired.
 * 5. Auth protect middleware returns 401 with 'Not authorized, token failed' when token is malformed.
 * 6. Auth protect middleware returns 401 with 'Not authorized, no token' when authorization header is absent.
 * 7. Protected routes accept newly renewed token.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');
const { protect } = require('../middlewares/authMiddleware');

describe('Session Expiry & Re-Auth System', () => {
  let app;
  let testUser;
  const userPassword = 'TestPassword123!';

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_12345';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // Create a real test user
    testUser = await User.create({
      name: 'Ashwin Patel',
      email: `ashwin_${Date.now()}@example.com`,
      phone: '9876543210',
      password: userPassword,
      role: 'ADMIN_OFFICER'
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Protected test endpoint to test authMiddleware
    app.get('/api/test-protected', protect, (req, res) => {
      res.json({ message: 'Success', user: req.user });
    });
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
  });

  describe('POST /api/auth/renew-session', () => {
    it('should renew session with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/renew-session')
        .send({
          email: testUser.email,
          password: userPassword
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe('ADMIN_OFFICER');

      // Verify token decoded claims
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(testUser._id.toString());
      // Check expiration is roughly 12 hours from now
      const expiresInSec = decoded.exp - decoded.iat;
      expect(expiresInSec).toBe(12 * 60 * 60);
    });

    it('should reject renewal with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/renew-session')
        .send({
          email: testUser.email,
          password: 'wrong_password_here'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid password');
    });

    it('should reject renewal when email or password is missing with 400', async () => {
      const res1 = await request(app)
        .post('/api/auth/renew-session')
        .send({ email: testUser.email });

      expect(res1.status).toBe(400);
      expect(res1.body.message).toBe('Email and password are required');

      const res2 = await request(app)
        .post('/api/auth/renew-session')
        .send({ password: userPassword });

      expect(res2.status).toBe(400);
      expect(res2.body.message).toBe('Email and password are required');
    });
  });

  describe('Auth protect middleware distinction', () => {
    it('should return 401 with "Not authorized, token expired" when token is expired', async () => {
      // Create an expired token (expired 10 seconds ago)
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/test-protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, token expired');
    });

    it('should return 401 with "Not authorized, token failed" when token signature is invalid', async () => {
      const invalidToken = jwt.sign(
        { id: testUser._id },
        'wrong_secret_key_used',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/test-protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should return 401 with "Not authorized, no token" when no authorization header is sent', async () => {
      const res = await request(app)
        .get('/api/test-protected');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should allow access to protected route when renewed token is used', async () => {
      // Step 1: Renew session
      const renewRes = await request(app)
        .post('/api/auth/renew-session')
        .send({
          email: testUser.email,
          password: userPassword
        });

      const freshToken = renewRes.body.token;

      // Step 2: Use fresh token to call protected route
      const res = await request(app)
        .get('/api/test-protected')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Success');
      expect(res.body.user._id).toBe(testUser._id.toString());
    });
  });
});

