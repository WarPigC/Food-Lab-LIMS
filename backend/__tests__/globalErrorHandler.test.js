const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const {
  normalizeError,
  globalErrorHandler,
  apiNotFoundHandler
} = require('../utils/errorHandler');
const SystemLog = require('../models/SystemLog');

describe('Global Error Handler & Normalization', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('normalizeError unit tests', () => {
    it('should normalize Mongoose ValidationError into 400 with VALIDATION_ERROR code', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        name: { message: 'Path `name` is required.' },
        email: { message: 'Path `email` is invalid.' }
      };

      const result = normalizeError(err);
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Path `name` is required.');
      expect(result.message).toContain('Path `email` is invalid.');
    });

    it('should normalize Mongoose CastError into 400 with INVALID_IDENTIFIER code', () => {
      const err = new Error('Cast failed');
      err.name = 'CastError';
      err.kind = 'ObjectId';
      err.value = 'invalid-hex-123';
      err.path = '_id';

      const result = normalizeError(err);
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('INVALID_IDENTIFIER');
      expect(result.message).toContain('_id');
    });

    it('should normalize Mongo duplicate key 11000 into 400 with DUPLICATE_KEY code', () => {
      const err = new Error('E11000 duplicate key error');
      err.code = 11000;
      err.keyValue = { sampleSerial: '260901' };

      const result = normalizeError(err);
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('DUPLICATE_KEY');
      expect(result.message).toContain('sampleSerial');
    });

    it('should normalize TokenExpiredError into 401 with TOKEN_EXPIRED code', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';

      const result = normalizeError(err);
      expect(result.statusCode).toBe(401);
      expect(result.code).toBe('TOKEN_EXPIRED');
      expect(result.message).toBe('Not authorized, token expired');
    });

    it('should normalize JsonWebTokenError into 401 with INVALID_TOKEN code', () => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';

      const result = normalizeError(err);
      expect(result.statusCode).toBe(401);
      expect(result.code).toBe('INVALID_TOKEN');
      expect(result.message).toBe('Not authorized, token failed');
    });

    it('should normalize arbitrary 500 error into 500 with INTERNAL_SERVER_ERROR code', () => {
      const err = new Error('Database connection failed');

      const result = normalizeError(err);
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Database connection failed');
    });
  });

  describe('Express Middleware integration', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      // Route throwing validation error
      testApp.get('/api/test-validation', (req, res, next) => {
        const err = new Error('Validation error');
        err.name = 'ValidationError';
        err.errors = { code: { message: 'Code is required' } };
        next(err);
      });

      // Route throwing 500 server crash
      testApp.get('/api/test-crash', (req, res, next) => {
        next(new Error('Simulated database explosion'));
      });

      // Mount 404 and global error handler
      testApp.use('/api', apiNotFoundHandler);
      testApp.use(globalErrorHandler);
    });

    it('should handle 404 for unknown /api endpoint with ROUTE_NOT_FOUND code', async () => {
      const res = await request(testApp).get('/api/unknown-endpoint-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
      expect(res.body.message).toContain('/api/unknown-endpoint-xyz');
    });

    it('should intercept validation error and return formatted 400 JSON', async () => {
      const res = await request(testApp).get('/api/test-validation');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Code is required');
    });

    it('should intercept 500 crash, return formatted 500 JSON, and log to SystemLog', async () => {
      const res = await request(testApp).get('/api/test-crash');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.message).toBe('Simulated database explosion');

      // Wait a moment for fire-and-forget SystemLog write
      await new Promise(r => setTimeout(r, 200));

      const log = await SystemLog.findOne({
        event: 'API_ERROR',
        message: { $regex: 'Simulated database explosion' }
      });

      expect(log).toBeTruthy();
      expect(log.level).toBe('error');
      expect(log.request.statusCode).toBe(500);
      expect(log.error.name).toBe('Error');
      expect(log.error.stack).toBeDefined();

      if (log) {
        await SystemLog.deleteOne({ _id: log._id });
      }
    });
  });
});

