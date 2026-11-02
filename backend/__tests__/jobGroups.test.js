/**
 * Job Groups Backend Tests (SP-3 P13)
 *
 * Verifies that:
 * 1. PUT /api/users/job-groups saves jobGroups for authenticated ADMIN_OFFICER.
 * 2. PUT /api/users/job-groups rejects non-array payload with 400.
 * 3. PUT /api/users/job-groups rejects unauthorized roles with 403.
 * 4. GET /api/jobs supports rangeStart and rangeEnd query parameters.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Job = require('../models/Job');
require('../models/Parameter');
const userRoutes = require('../routes/userRoutes');
const jobListRoutes = require('../routes/jobs/jobListRoutes');

describe('SP-3 P13: Job Grouping Backend Endpoints', () => {
  let app;
  let officerUser;
  let headUser;
  let officerToken;
  let headToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_12345';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    officerUser = await User.create({
      name: 'Officer User',
      email: `officer_${Date.now()}@example.com`,
      phone: '9876543210',
      password: 'password123',
      role: 'ADMIN_OFFICER'
    });

    headUser = await User.create({
      name: 'Head User',
      email: `head_${Date.now()}@example.com`,
      phone: '9876543211',
      password: 'password123',
      role: 'HEAD',
      department: 'Chemical'
    });

    officerToken = jwt.sign(
      { id: officerUser._id, role: officerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    headToken = jwt.sign(
      { id: headUser._id, role: headUser.role, department: headUser.department },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    app.use('/api/jobs', jobListRoutes);
  });

  afterAll(async () => {
    if (officerUser) await User.deleteOne({ _id: officerUser._id });
    if (headUser) await User.deleteOne({ _id: headUser._id });
    await Job.deleteMany({ jobCode: { $in: ['JG-TEST-001', 'JG-TEST-002', 'JG-TEST-003'] } });
    await mongoose.connection.close();
  });

  describe('PUT /api/users/job-groups', () => {
    it('should save job groups for ADMIN_OFFICER', async () => {
      const sampleGroups = [
        {
          id: 'grp-1',
          name: 'October Batch A',
          startJobCode: '2608101159',
          endJobCode: '2608101170',
          count: 12,
          color: '#3B82F6',
          isCollapsed: true
        }
      ];

      const res = await request(app)
        .put('/api/users/job-groups')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ jobGroups: sampleGroups });

      expect(res.status).toBe(200);
      expect(res.body.jobGroups).toHaveLength(1);
      expect(res.body.jobGroups[0].name).toBe('October Batch A');

      // Verify in DB
      const updated = await User.findById(officerUser._id);
      expect(updated.jobGroups).toHaveLength(1);
      expect(updated.jobGroups[0].startJobCode).toBe('2608101159');
    });

    it('should reject non-array payload with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/users/job-groups')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ jobGroups: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/must be an array/i);
    });

    it('should forbid non-ADMIN_OFFICER roles with 403', async () => {
      const res = await request(app)
        .put('/api/users/job-groups')
        .set('Authorization', `Bearer ${headToken}`)
        .send({ jobGroups: [] });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/jobs with range query', () => {
    beforeAll(async () => {
      const baseSample = {
        sample_name: 'Water Sample',
        sample_id: 'S-TEST',
        sample_quantity: '1 L',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      };

      await Job.create([
        {
          jobCode: 'JG-TEST-001',
          sampleSerial: Math.floor(Math.random() * 90000) + 10000,
          clientName: 'Client 1',
          customer: { customer_name: 'Client 1' },
          status: 'ACTIVE',
          createdBy: officerUser._id,
          sample: { ...baseSample, sampleDescription: 'Test sample 1' },
          parameters: []
        },
        {
          jobCode: 'JG-TEST-002',
          sampleSerial: Math.floor(Math.random() * 90000) + 10000,
          clientName: 'Client 2',
          customer: { customer_name: 'Client 2' },
          status: 'ACTIVE',
          createdBy: officerUser._id,
          sample: { ...baseSample, sampleDescription: 'Test sample 2' },
          parameters: []
        },
        {
          jobCode: 'JG-TEST-003',
          sampleSerial: Math.floor(Math.random() * 90000) + 10000,
          clientName: 'Client 3',
          customer: { customer_name: 'Client 3' },
          status: 'ACTIVE',
          createdBy: officerUser._id,
          sample: { ...baseSample, sampleDescription: 'Test sample 3' },
          parameters: []
        }
      ]);
    });

    it('should fetch jobs filtered by rangeStart and rangeEnd', async () => {
      const res = await request(app)
        .get('/api/jobs?rangeStart=JG-TEST-001&rangeEnd=JG-TEST-002')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
      const codes = res.body.jobs.map(j => j.jobCode);
      expect(codes).toContain('JG-TEST-001');
      expect(codes).toContain('JG-TEST-002');
      expect(codes).not.toContain('JG-TEST-003');
    });
  });
});
