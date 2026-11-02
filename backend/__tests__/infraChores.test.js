const express = require('express');
const request = require('supertest');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

describe('SP3 Infrastructure Chores (C3, C4, C5, C6)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_infra';
  });

  describe('C3: HTTP Compression Middleware', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(compression({ threshold: 512 }));
      app.get('/api/test-compression', (req, res) => {
        // Return JSON response greater than 1KB
        const largeData = Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Parameter number ${i} description for testing compression`,
          standardMethod: 'IS 3025 (Part 10): 2023',
          specification: 'Acceptable limit 5.0 to 15.0 max'
        }));
        res.json({ data: largeData });
      });
    });

    it('should compress responses when client requests gzip encoding', async () => {
      const res = await request(app)
        .get('/api/test-compression')
        .set('Accept-Encoding', 'gzip');

      expect(res.status).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('should serve uncompressed response when gzip is not accepted', async () => {
      const res = await request(app)
        .get('/api/test-compression')
        .set('Accept-Encoding', 'identity');

      expect(res.status).toBe(200);
      expect(res.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('C5: Body Limit Middleware', () => {
    let app;

    beforeAll(() => {
      app = express();
      // Simulating global 50MB limit and route with 50MB
      const normalRouter = express.Router();
      normalRouter.use(express.json({ limit: '50mb' }));
      normalRouter.post('/save', (req, res) => res.json({ ok: true, size: req.body?.data?.length }));

      const exportRouter = express.Router();
      exportRouter.use(express.json({ limit: '50mb' }));
      exportRouter.post('/report-data', (req, res) => res.json({ ok: true, size: req.body?.data?.length }));

      app.use('/api/normal', normalRouter);
      app.use('/api/export', exportRouter);
    });

    it('should accept normal payloads within the 50MB limit', async () => {
      const res = await request(app)
        .post('/api/normal/save')
        .send({ data: 'hello world' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should accept payloads on export route with 50MB limit', async () => {
      const res = await request(app)
        .post('/api/export/report-data')
        .send({ data: 'custom report test content' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('C6: Socket.IO Authentication Middleware', () => {
    it('should reject connection when no token is provided', (done) => {
      const socket = {
        handshake: { auth: {}, headers: {} }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Authentication error: No token provided');
        done();
      });
    });

    it('should reject connection when token is invalid', (done) => {
      const socket = {
        handshake: { auth: { token: 'invalid_token_string' }, headers: {} }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Authentication error: Invalid token');
        done();
      });
    });

    it('should reject connection when token is expired', (done) => {
      const expiredToken = jwt.sign(
        { id: 'user_123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const socket = {
        handshake: { auth: { token: expiredToken }, headers: {} }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Authentication error: Token expired');
        done();
      });
    });

    it('should authenticate successfully when token is valid in handshake.auth', (done) => {
      const validToken = jwt.sign(
        { id: 'user_456', role: 'ADMIN_OFFICER' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const socket = {
        handshake: { auth: { token: validToken }, headers: {} }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect(socket.user).toBeDefined();
        expect(socket.user.id).toBe('user_456');
        expect(socket.user.role).toBe('ADMIN_OFFICER');
        done();
      });
    });

    it('should authenticate successfully when token is in Authorization header', (done) => {
      const validToken = jwt.sign(
        { id: 'user_789', role: 'HEAD' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const socket = {
        handshake: {
          auth: {},
          headers: { authorization: `Bearer ${validToken}` }
        }
      };

      socketAuthMiddleware(socket, (err) => {
        expect(err).toBeUndefined();
        expect(socket.user).toBeDefined();
        expect(socket.user.id).toBe('user_789');
        done();
      });
    });
  });
});
