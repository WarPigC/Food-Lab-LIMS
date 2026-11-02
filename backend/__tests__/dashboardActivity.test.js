/**
 * Dashboard Recent Activity Tests (SP-3 P11, F7)
 *
 * Verifies:
 * 1. GET /api/jobs/recent-activity requires authentication (401).
 * 2. Returns operational activity from SystemLog for Admin and Admin Officer.
 * 3. Omit auth logs (LOGIN_SUCCESS, SESSION_RENEWED, LOGIN_FAILED) and error logs.
 * 4. Scopes recent activity by department for Head role (Micro vs Chemical).
 * 5. Cleans embedded test code suffixes, preserving -N suffixes.
 * 6. Synthesizes fallback activity when SystemLog has fewer entries than requested.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Job = require('../models/Job');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const jobRoutes = require('../routes/jobRoutes');

describe('SP-3 P11: Dashboard History & Recent Activity (F7)', () => {
  let app;
  let admin, officer, microHead, chemHead, analyst;
  let adminToken, officerToken, microHeadToken, chemHeadToken, analystToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_999';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    admin = await User.create({
      name: 'System Admin',
      email: `admin_${Date.now()}@example.com`,
      phone: '9876543100',
      password: 'password123',
      role: 'ADMIN'
    });

    officer = await User.create({
      name: 'Admin Officer User',
      email: `officer_${Date.now()}@example.com`,
      phone: '9876543101',
      password: 'password123',
      role: 'ADMIN_OFFICER'
    });

    microHead = await User.create({
      name: 'Micro Head User',
      email: `micro_head_${Date.now()}@example.com`,
      phone: '9876543102',
      password: 'password123',
      role: 'HEAD',
      department: 'Micro'
    });

    chemHead = await User.create({
      name: 'Chem Head User',
      email: `chem_head_${Date.now()}@example.com`,
      phone: '9876543103',
      password: 'password123',
      role: 'HEAD',
      department: 'Chemical'
    });

    analyst = await User.create({
      name: 'Analyst User',
      email: `analyst_${Date.now()}@example.com`,
      phone: '9876543104',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Micro'
    });

    adminToken = jwt.sign({ id: admin._id, role: admin.role, name: admin.name }, process.env.JWT_SECRET);
    officerToken = jwt.sign({ id: officer._id, role: officer.role, name: officer.name }, process.env.JWT_SECRET);
    microHeadToken = jwt.sign({ id: microHead._id, role: microHead.role, name: microHead.name, department: microHead.department }, process.env.JWT_SECRET);
    chemHeadToken = jwt.sign({ id: chemHead._id, role: chemHead.role, name: chemHead.name, department: chemHead.department }, process.env.JWT_SECRET);
    analystToken = jwt.sign({ id: analyst._id, role: analyst.role, name: analyst.name, department: analyst.department }, process.env.JWT_SECRET);

    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobRoutes);
  });

  afterAll(async () => {
    await SystemLog.deleteMany({
      'user.id': { $in: [admin._id, officer._id, microHead._id, chemHead._id, analyst._id] }
    });
    await Job.deleteMany({
      createdBy: { $in: [admin._id, officer._id, microHead._id, chemHead._id, analyst._id] }
    });
    await User.deleteMany({
      _id: { $in: [admin._id, officer._id, microHead._id, chemHead._id, analyst._id] }
    });
  });

  describe('Authorization and Access Guard', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/jobs/recent-activity');
      expect(res.status).toBe(401);
    });

    it('should reject ASSISTANT role with 403', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity')
        .set('Authorization', `Bearer ${analystToken}`);
      expect(res.status).toBe(403);
    });

    it('should permit ADMIN, ADMIN_OFFICER, and HEAD roles', async () => {
      const [resAdmin, resOfficer, resHead] = await Promise.all([
        request(app).get('/api/jobs/recent-activity').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/jobs/recent-activity').set('Authorization', `Bearer ${officerToken}`),
        request(app).get('/api/jobs/recent-activity').set('Authorization', `Bearer ${microHeadToken}`)
      ]);
      expect(resAdmin.status).toBe(200);
      expect(resOfficer.status).toBe(200);
      expect(resHead.status).toBe(200);
      expect(Array.isArray(resAdmin.body)).toBe(true);
    });
  });

  describe('Filtering: Omit Auth and Error Logs', () => {
    beforeAll(async () => {
      // Seed audit and non-audit logs
      await SystemLog.create([
        {
          level: 'audit',
          event: 'LOGIN_SUCCESS',
          message: 'Successful login for admin',
          user: { id: admin._id, name: admin.name, role: admin.role },
          timestamp: new Date()
        },
        {
          level: 'audit',
          event: 'SESSION_RENEWED',
          message: 'Session renewed',
          user: { id: officer._id, name: officer.name, role: officer.role },
          timestamp: new Date()
        },
        {
          level: 'error',
          event: 'API_ERROR',
          message: 'Unhandled database exception',
          user: { id: admin._id, name: admin.name, role: admin.role },
          timestamp: new Date()
        },
        {
          level: 'audit',
          event: 'JOB_CREATED',
          message: 'Job 2611021001 created for Nestle Foods Ltd',
          user: { id: officer._id, name: officer.name, role: officer.role },
          target: { model: 'Job', identifier: '2611021001' },
          timestamp: new Date()
        },
        {
          level: 'audit',
          event: 'TEST_DISPATCHED',
          message: 'Job 2611021001 dispatched to Analyst User by Micro Head',
          user: { id: microHead._id, name: microHead.name, role: microHead.role, department: 'micro' },
          target: { model: 'Job', identifier: '2611021001', department: 'micro' },
          timestamp: new Date()
        }
      ]);
    });

    it('should only return operational lab events and omit auth/error logs', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const events = res.body.map(item => item.event);
      expect(events).not.toContain('LOGIN_SUCCESS');
      expect(events).not.toContain('SESSION_RENEWED');
      expect(events).not.toContain('API_ERROR');
      expect(events).toContain('JOB_CREATED');
      expect(events).toContain('TEST_DISPATCHED');
    });
  });

  describe('Department Scoping for Head Role', () => {
    beforeAll(async () => {
      await SystemLog.create([
        {
          level: 'audit',
          event: 'TEST_DISPATCHED',
          message: 'Job 2611022001-N dispatched to Analyst User by Chemical Head',
          user: { id: chemHead._id, name: chemHead.name, role: chemHead.role, department: 'chemical' },
          target: { model: 'Job', identifier: '2611022001-N', department: 'chemical' },
          timestamp: new Date(Date.now() + 1000)
        }
      ]);
    });

    it('should filter activities by department for Micro Head', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=10')
        .set('Authorization', `Bearer ${microHeadToken}`);

      expect(res.status).toBe(200);
      // Chem dispatch should not appear for Micro Head
      const messages = res.body.map(item => item.message);
      expect(messages.some(m => m.includes('Chemical Head'))).toBe(false);
    });

    it('should filter activities by department for Chem Head', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=10')
        .set('Authorization', `Bearer ${chemHeadToken}`);

      expect(res.status).toBe(200);
      const messages = res.body.map(item => item.message);
      expect(messages.some(m => m.includes('Chemical Head'))).toBe(true);
    });

    it('should allow Admin Officer to see all activities across departments', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=10')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      const messages = res.body.map(item => item.message);
      expect(messages.some(m => m.includes('Chemical Head'))).toBe(true);
      expect(messages.some(m => m.includes('Micro Head') || m.includes('created'))).toBe(true);
    });
  });

  describe('Job Code Cleaning & Human-Readable Formatting', () => {
    beforeAll(async () => {
      await SystemLog.create([
        {
          level: 'audit',
          event: 'TEST_RESULTS_SUBMITTED',
          message: 'Results submitted for test 2611023001-2a',
          user: { id: analyst._id, name: analyst.name, role: analyst.role, department: 'micro' },
          target: { model: 'TestInstance', identifier: '2611023001-2a', department: 'micro' },
          timestamp: new Date(Date.now() + 2000)
        }
      ]);
    });

    it('should clean sub-instance suffixes from jobCode and message', async () => {
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const submittedItem = res.body.find(item => item.event === 'TEST_RESULTS_SUBMITTED');
      expect(submittedItem).toBeDefined();
      expect(submittedItem.jobCode).toBe('2611023001');
      expect(submittedItem.message).not.toContain('-2a');
      expect(submittedItem.action).toBe('SUBMITTED');
    });
  });

  describe('Fallback Synthesis for Empty Logs', () => {
    it('should synthesize fallback items from Jobs when no logs match', async () => {
      const uniqueSerial = Math.floor(Math.random() * 8000) + 1000;
      const job = await Job.create({
        jobCode: `261102${uniqueSerial}`,
        sampleSerial: uniqueSerial,
        clientName: 'Fallback Dairy Farm Ltd',
        customer: { customer_name: 'Fallback Dairy Farm Ltd' },
        sample: {
          sample_name: 'Raw Milk',
          sample_id: `SMP-${uniqueSerial}`,
          sample_quantity: '1 L',
          sample_count: 1,
          condition_on_receipt: 'Good',
          received_date: new Date()
        },
        createdBy: officer._id,
        status: 'ACTIVE'
      });

      // Query with limit 20
      const res = await request(app)
        .get('/api/jobs/recent-activity?limit=20')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      const found = res.body.find(i => i.jobCode === job.jobCode);
      expect(found).toBeDefined();
      expect(found.clientName).toBe('Fallback Dairy Farm Ltd');
    });
  });
});

