/**
 * Head Monitor Tab V1 & V2 Tests (SP-2 P9 & P10)
 *
 * Verifies:
 * 1. GET /api/jobs/monitoring fetches in-flight jobs for Head's department with active PENDING instances.
 * 2. POST /api/jobs/:id/monitor-withdraw pulls job back to dispatch queue, marks instances CANCELLED, preserves results, records reviewHistory.
 * 3. PUT /api/jobs/:id/monitor-split moves parameters, merges into existing target instance without duplicates, creates new instance if none exists, cancels source if empty.
 * 4. Rescuing parameter data on re-dispatch recovers data from CANCELLED instances with isSaved: false.
 * 5. isDeptCompleted helper excludes CANCELLED instances so they do not block job completion.
 * 6. PUT /api/tests/instances/:id/save-progress emits PARAM_SAVED socket event with paramResults.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const User = require('../models/User');
const jobRoutes = require('../routes/jobRoutes');
const testRoutes = require('../routes/testRoutes');

describe('SP-2 P9 & P10: Head Monitor Tab (Withdraw, Split, Live Progress)', () => {
  let app;
  let microHead, chemHead, analystA, analystB, analystChem;
  let microHeadToken, chemHeadToken, analystAToken;
  let mockIo;
  let emittedEvents;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_999';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // Create users
    microHead = await User.create({
      name: 'Micro Head',
      email: `micro_head_${Date.now()}@example.com`,
      phone: '9876543201',
      password: 'password123',
      role: 'HEAD',
      department: 'Micro'
    });

    chemHead = await User.create({
      name: 'Chem Head',
      email: `chem_head_${Date.now()}@example.com`,
      phone: '9876543202',
      password: 'password123',
      role: 'HEAD',
      department: 'Chemical'
    });

    analystA = await User.create({
      name: 'Analyst A',
      email: `analyst_a_${Date.now()}@example.com`,
      phone: '9876543203',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Micro'
    });

    analystB = await User.create({
      name: 'Analyst B',
      email: `analyst_b_${Date.now()}@example.com`,
      phone: '9876543204',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Micro'
    });

    analystChem = await User.create({
      name: 'Analyst Chem',
      email: `analyst_chem_${Date.now()}@example.com`,
      phone: '9876543205',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Chemical'
    });

    microHeadToken = jwt.sign({ id: microHead._id, role: microHead.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    chemHeadToken = jwt.sign({ id: chemHead._id, role: chemHead.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    analystAToken = jwt.sign({ id: analystA._id, role: analystA.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Mock Socket.io
    emittedEvents = [];
    mockIo = {
      emit: (event, payload) => {
        emittedEvents.push({ event, payload });
      }
    };

    app = express();
    app.use(express.json());
    app.set('io', mockIo);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/tests', testRoutes);
  });

  afterAll(async () => {
    await User.deleteMany({
      _id: { $in: [microHead._id, chemHead._id, analystA._id, analystB._id, analystChem._id] }
    });
    await Job.deleteMany({});
    await TestInstance.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    emittedEvents = [];
    await Job.deleteMany({});
    await TestInstance.deleteMany({});
  });

  const createDispatchedJob = async (overrides = {}) => {
    const jobCode = `261101${Math.floor(1000 + Math.random() * 9000)}`;
    const job = await Job.create({
      jobCode,
      sampleSerial: 1001,
      clientName: 'Acme Beverages',
      customer: { customer_name: 'Acme Beverages' },
      sample: {
        sample_name: 'Mineral Water',
        sample_id: 'MW-01',
        sample_quantity: '1 L',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [
        { name: 'E. Coli', type: 'Micro', unit: 'CFU/ml' },
        { name: 'Coliforms', type: 'Micro', unit: 'CFU/ml' },
        { name: 'Total Plate Count', type: 'Micro', unit: 'CFU/ml' }
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT', assignedHead: microHead._id },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: microHead._id,
      ...overrides
    });
    return job;
  };

  describe('1. GET /api/jobs/monitoring', () => {
    it('returns in-flight jobs for Head department with embedded PENDING TestInstances', async () => {
      const job = await createDispatchedJob();

      const inst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '12', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' },
          { parameterId: 'p2', name: 'Coliforms', value: '', testMethod: '', isSaved: false, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .get('/api/jobs/monitoring')
        .set('Authorization', `Bearer ${microHeadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].jobCode).toBe(job.jobCode);
      expect(res.body.jobs[0].testInstances).toHaveLength(1);
      expect(res.body.jobs[0].testInstances[0].testCode).toBe(inst.testCode);
      expect(res.body.jobs[0].testInstances[0].assignedTo.name).toBe('Analyst A');
      expect(res.body.jobs[0].testInstances[0].results[0].isSaved).toBe(true);
      expect(res.body.jobs[0].testInstances[0].results[0].value).toBe('12');
    });

    it('excludes jobs from other departments', async () => {
      await createDispatchedJob();

      const res = await request(app)
        .get('/api/jobs/monitoring')
        .set('Authorization', `Bearer ${chemHeadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(0);
    });

    it('excludes jobs that have no active PENDING instances', async () => {
      const job = await createDispatchedJob();

      // Only CANCELLED instance exists
      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [{ parameterId: 'p1', name: 'E. Coli', isSaved: false }],
        createdBy: microHead._id,
        status: 'CANCELLED'
      });

      const res = await request(app)
        .get('/api/jobs/monitoring')
        .set('Authorization', `Bearer ${microHeadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(0);
    });
  });

  describe('2. POST /api/jobs/:id/monitor-withdraw', () => {
    it('successfully withdraws a job, cancelling instance, preserving results, and resetting status to PENDING', async () => {
      const job = await createDispatchedJob();

      const inst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '45', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .post(`/api/jobs/${job._id}/monitor-withdraw`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({ note: 'Reallocating work due to leave' });

      expect(res.status).toBe(200);
      expect(res.body.job.distribution.micro.status).toBe('PENDING');

      // Verify TestInstance state
      const updatedInst = await TestInstance.findById(inst._id);
      expect(updatedInst.status).toBe('CANCELLED');
      expect(updatedInst.results[0].value).toBe('45'); // preserved!
      expect(updatedInst.reviewHistory).toHaveLength(1);
      expect(updatedInst.reviewHistory[0].action).toBe('MONITOR_WITHDRAW');
      expect(updatedInst.reviewHistory[0].note).toBe('Reallocating work due to leave');

      // Verify socket events
      const withdrawnEvent = emittedEvents.find(e => e.event === 'job:monitor-withdrawn');
      expect(withdrawnEvent).toBeDefined();
      expect(withdrawnEvent.payload.jobId.toString()).toBe(job._id.toString());
      expect(withdrawnEvent.payload.affectedInstanceIds).toContain(inst._id.toString());
    });

    it('rejects withdraw if job is not in ASSIGNED_TO_ASSISTANT state', async () => {
      const job = await createDispatchedJob({
        distribution: {
          micro: { required: true, status: 'PENDING' },
          chemical: { required: false }
        }
      });

      const res = await request(app)
        .post(`/api/jobs/${job._id}/monitor-withdraw`)
        .set('Authorization', `Bearer ${microHeadToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not in a withdrawable state');
    });

    it('rejects withdraw if requested by a Head of another department', async () => {
      const job = await createDispatchedJob();

      const res = await request(app)
        .post(`/api/jobs/${job._id}/monitor-withdraw`)
        .set('Authorization', `Bearer ${chemHeadToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not require testing for your department');
    });
  });

  describe('3. PUT /api/jobs/:id/monitor-split', () => {
    it('moves parameters to target analyst who already has an instance (merge path, prevents B10)', async () => {
      const job = await createDispatchedJob();

      const sourceInst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1a`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '10', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' },
          { parameterId: 'p2', name: 'Coliforms', value: '20', testMethod: 'IS 5401', isSaved: true, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const targetInst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1b`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystB._id,
        results: [
          { parameterId: 'p3', name: 'Total Plate Count', value: '', testMethod: '', isSaved: false, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/jobs/${job._id}/monitor-split`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({
          fromAnalystId: analystA._id,
          toAnalystId: analystB._id,
          paramIds: ['p1']
        });

      expect(res.status).toBe(200);

      // Verify no extra instance created (prevent B10)
      const allInstances = await TestInstance.find({ jobId: job._id, status: 'PENDING' });
      expect(allInstances).toHaveLength(2);

      // Verify source lost p1
      const updatedSource = await TestInstance.findById(sourceInst._id);
      expect(updatedSource.results).toHaveLength(1);
      expect(updatedSource.results[0].parameterId).toBe('p2');

      // Verify target gained p1 with value preserved but isSaved: false
      const updatedTarget = await TestInstance.findById(targetInst._id);
      expect(updatedTarget.results).toHaveLength(2);
      const gainedParam = updatedTarget.results.find(r => r.parameterId === 'p1');
      expect(gainedParam).toBeDefined();
      expect(gainedParam.value).toBe('10');
      expect(gainedParam.testMethod).toBe('IS 5887');
      expect(gainedParam.isSaved).toBe(false); // locked until re-saved!

      // Verify socket
      const splitEvent = emittedEvents.find(e => e.event === 'instance:params-split');
      expect(splitEvent).toBeDefined();
      expect(splitEvent.payload.paramIds).toContain('p1');
    });

    it('creates a new TestInstance if target analyst does not have one yet', async () => {
      const job = await createDispatchedJob();

      const sourceInst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '15', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' },
          { parameterId: 'p2', name: 'Coliforms', value: '', testMethod: '', isSaved: false, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/jobs/${job._id}/monitor-split`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({
          fromAnalystId: analystA._id,
          toAnalystId: analystB._id,
          paramIds: ['p1']
        });

      expect(res.status).toBe(200);

      // Verify target instance created
      const newTarget = await TestInstance.findOne({ jobId: job._id, assignedTo: analystB._id, status: 'PENDING' });
      expect(newTarget).toBeDefined();
      expect(newTarget.results).toHaveLength(1);
      expect(newTarget.results[0].parameterId).toBe('p1');
      expect(newTarget.results[0].isSaved).toBe(false);
    });

    it('cancels source instance if all parameters are moved away', async () => {
      const job = await createDispatchedJob();

      const sourceInst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        clientName: 'Acme Beverages',
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '15', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/jobs/${job._id}/monitor-split`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({
          fromAnalystId: analystA._id,
          toAnalystId: analystB._id,
          paramIds: ['p1']
        });

      expect(res.status).toBe(200);

      const updatedSource = await TestInstance.findById(sourceInst._id);
      expect(updatedSource.status).toBe('CANCELLED');
      expect(updatedSource.results).toHaveLength(0);
    });

    it('rejects moving to analyst from another department', async () => {
      const job = await createDispatchedJob();

      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [{ parameterId: 'p1', name: 'E. Coli', isSaved: false }],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/jobs/${job._id}/monitor-split`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({
          fromAnalystId: analystA._id,
          toAnalystId: analystChem._id, // Chemical assistant!
          paramIds: ['p1']
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Target analyst must be an assistant in your department');
    });
  });

  describe('4. Rescuing parameter data on re-dispatch', () => {
    it('preserves saved values from CANCELLED instances when re-dispatching from Dispatcher', async () => {
      const job = await createDispatchedJob({
        distribution: {
          micro: { required: true, status: 'PENDING', assignedHead: microHead._id },
          chemical: { required: false }
        }
      });

      // Previous cancelled instance with saved progress
      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '99', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'CANCELLED'
      });

      // Dispatch to Analyst B
      const res = await request(app)
        .post('/api/tests/instances')
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({
          jobId: job._id,
          deadline: new Date(Date.now() + 86400000),
          assignments: [
            { assignedTo: analystB._id, parameterId: 'p1', name: 'E. Coli', unit: 'CFU/ml' }
          ]
        });

      expect(res.status).toBe(201);
      const newInst = res.body.instances[0];
      expect(newInst.results[0].value).toBe('99'); // Rescued!
      expect(newInst.results[0].testMethod).toBe('IS 5887');
      expect(newInst.results[0].isSaved).toBe(false); // Locked for re-save!
    });
  });

  describe('5. isDeptCompleted excludes CANCELLED instances', () => {
    it('completes department when one instance is CANCELLED (split) and remaining instance is APPROVED', async () => {
      const job = await createDispatchedJob({
        distribution: {
          micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT', assignedHead: microHead._id },
          chemical: { required: false }
        }
      });

      // Instance 1: CANCELLED because all params were moved to Instance 2
      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1a`,
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [],
        createdBy: microHead._id,
        status: 'CANCELLED'
      });

      // Instance 2: PENDING_HEAD_REVIEW
      const inst2 = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1b`,
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystB._id,
        results: [{ parameterId: 'p1', name: 'E. Coli', value: '0', isSaved: true }],
        createdBy: microHead._id,
        status: 'PENDING_HEAD_REVIEW'
      });

      // Head approves Instance 2
      const res = await request(app)
        .put(`/api/tests/instances/${inst2._id}/review`)
        .set('Authorization', `Bearer ${microHeadToken}`)
        .send({ action: 'APPROVE' });

      expect(res.status).toBe(200);

      // Verify job distribution marked COMPLETED because the only non-cancelled instance is COMPLETED
      const updatedJob = await Job.findById(job._id);
      expect(updatedJob.distribution.micro.status).toBe('COMPLETED');
    });
  });

  describe('6. PARAM_SAVED socket emission in save-progress', () => {
    it('emits PARAM_SAVED with delta parameter details when analyst saves progress', async () => {
      const job = await createDispatchedJob({ status: 'ACTIVE' });

      const inst = await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1`,
        deadline: new Date(Date.now() + 86400000),
        department: 'micro',
        assignedTo: analystA._id,
        results: [
          { parameterId: 'p1', name: 'E. Coli', value: '', testMethod: '', isSaved: false, unit: 'CFU/ml' }
        ],
        createdBy: microHead._id,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/tests/instances/${inst._id}/save-progress`)
        .set('Authorization', `Bearer ${analystAToken}`)
        .send({
          results: [
            { parameterId: 'p1', name: 'E. Coli', value: '42', testMethod: 'IS 5887', isSaved: true, unit: 'CFU/ml' }
          ]
        });

      expect(res.status).toBe(200);

      const paramSavedEvent = emittedEvents.find(e => e.event === 'PARAM_SAVED');
      expect(paramSavedEvent).toBeDefined();
      expect(paramSavedEvent.payload.instanceId.toString()).toBe(inst._id.toString());
      expect(paramSavedEvent.payload.paramResults[0].value).toBe('42');
      expect(paramSavedEvent.payload.paramResults[0].isSaved).toBe(true);
    });
  });
});

