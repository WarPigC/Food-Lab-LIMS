/**
 * Phase 1 Tests: Parameter Delta Engine
 * 
 * Tests the core delta computation and TestInstance mutation logic.
 * Uses mongodb-memory-server for a real (but ephemeral) MongoDB instance.
 * 
 * How this works (for learning):
 * ──────────────────────────────
 * 1. `beforeAll` connects Mongoose to the in-memory DB (started in globalSetup.js)
 * 2. `beforeEach` creates fresh test data: a User, a Job, and TestInstances
 * 3. Each `it()` block runs one scenario, then checks the DB state
 * 4. `afterEach` wipes all collections so tests don't affect each other
 * 5. `afterAll` disconnects Mongoose
 */
const mongoose = require('mongoose');
const { computeDelta, applyAdditions, applyRemovals } = require('../utils/parameterDelta');
const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const User = require('../models/User');

// ── Test Fixtures ──────────────────────────────────────────────────────────────

const MICRO_PARAM_1 = {
  parameterId: new mongoose.Types.ObjectId(),
  name: 'Total Plate Count',
  type: 'Micro',
  unit: 'CFU/g',
  specification: 'Max 10000'
};

const MICRO_PARAM_2 = {
  parameterId: new mongoose.Types.ObjectId(),
  name: 'Yeast Count',
  type: 'Micro',
  unit: 'CFU/g',
  specification: 'Max 100'
};

const CHEMICAL_PARAM_1 = {
  parameterId: new mongoose.Types.ObjectId(),
  name: 'Moisture',
  type: 'Chemical',
  unit: '%',
  specification: 'Max 14'
};

const CHEMICAL_PARAM_2 = {
  parameterId: new mongoose.Types.ObjectId(),
  name: 'Ash Content',
  type: 'Chemical',
  unit: '%',
  specification: 'Max 1.5'
};

// ── Setup / Teardown ───────────────────────────────────────────────────────────

let testUser, testJob, microInstance, chemInstance;

beforeAll(async () => {
  // Connect to the in-memory MongoDB started by globalSetup.js
  await mongoose.connect(process.env.MONGO_TEST_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Create a test user (Admin Officer)
  testUser = await User.create({
    name: 'Test Admin',
    email: `admin-${Date.now()}@test.com`,
    phone: '1234567890',
    password: 'hashedpassword123',
    role: 'ADMIN_OFFICER',
    department: 'Administration'
  });

  // Create a dispatched job with Micro + Chemical params
  testJob = await Job.create({
    jobCode: `TEST${Date.now()}`,
    sampleSerial: 1001,
    clientName: 'Test Client',
    customer: { customer_name: 'Test Client' },
    sample: {
      sample_name: 'Test Sample',
      sample_id: 'TS-001',
      sample_quantity: '500 g',
      sample_count: 1,
      sample_description: 'Test sample for unit tests',
      condition_on_receipt: 'Good',
      received_date: new Date(),
      nabl_type: 'Nabl'
    },
    parameters: [
      { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId },
      { ...CHEMICAL_PARAM_1, parameterId: CHEMICAL_PARAM_1.parameterId }
    ],
    distribution: {
      micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
      chemical: { required: true, status: 'ASSIGNED_TO_ASSISTANT' }
    },
    createdBy: testUser._id
  });

  // Create a Micro analyst user
  const microAnalyst = await User.create({
    name: 'Micro Analyst',
    email: `micro-${Date.now()}@test.com`,
    phone: '1234567891',
    password: 'hashedpassword123',
    role: 'ASSISTANT',
    department: 'micro'
  });

  // Create a Chemical analyst user
  const chemAnalyst = await User.create({
    name: 'Chem Analyst',
    email: `chem-${Date.now()}@test.com`,
    phone: '1234567892',
    password: 'hashedpassword123',
    role: 'ASSISTANT',
    department: 'chemical'
  });

  // Create TestInstances (as if Head dispatched)
  microInstance = await TestInstance.create({
    jobId: testJob._id,
    testCode: `${testJob.jobCode}-1`,
    clientName: 'Test Client',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    assignedTo: microAnalyst._id,
    createdBy: microAnalyst._id,
    status: 'PENDING',
    results: [{
      parameterId: MICRO_PARAM_1.parameterId.toString(),
      name: 'Total Plate Count',
      value: '5000',       // Analyst already entered this
      unit: 'CFU/g',
      specification: 'Max 10000',
      testMethod: 'IS 5402',
      isSaved: true
    }]
  });

  chemInstance = await TestInstance.create({
    jobId: testJob._id,
    testCode: `${testJob.jobCode}-2`,
    clientName: 'Test Client',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedTo: chemAnalyst._id,
    createdBy: chemAnalyst._id,
    status: 'PENDING',
    results: [{
      parameterId: CHEMICAL_PARAM_1.parameterId.toString(),
      name: 'Moisture',
      value: '12.5',       // Analyst already entered this
      unit: '%',
      specification: 'Max 14',
      testMethod: 'IS 1011',
      isSaved: true
    }]
  });
});

afterEach(async () => {
  // Wipe all collections between tests
  await Job.deleteMany({});
  await TestInstance.deleteMany({});
  await User.deleteMany({});
});

// ── Delta Computation Tests ────────────────────────────────────────────────────

describe('computeDelta', () => {
  it('should identify added parameters', () => {
    const oldParams = [MICRO_PARAM_1];
    const newParams = [MICRO_PARAM_1, MICRO_PARAM_2];

    const { added, removed } = computeDelta(oldParams, newParams);

    expect(added).toHaveLength(1);
    expect(added[0].name).toBe('Yeast Count');
    expect(removed).toHaveLength(0);
  });

  it('should identify removed parameters', () => {
    const oldParams = [MICRO_PARAM_1, CHEMICAL_PARAM_1];
    const newParams = [MICRO_PARAM_1];

    const { added, removed } = computeDelta(oldParams, newParams);

    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('Moisture');
  });

  it('should identify both added and removed', () => {
    const oldParams = [MICRO_PARAM_1, CHEMICAL_PARAM_1];
    const newParams = [MICRO_PARAM_1, MICRO_PARAM_2]; // removed Moisture, added Yeast Count

    const { added, removed } = computeDelta(oldParams, newParams);

    expect(added).toHaveLength(1);
    expect(added[0].name).toBe('Yeast Count');
    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('Moisture');
  });

  it('should return empty delta when params are identical', () => {
    const oldParams = [MICRO_PARAM_1, CHEMICAL_PARAM_1];
    const newParams = [MICRO_PARAM_1, CHEMICAL_PARAM_1];

    const { added, removed } = computeDelta(oldParams, newParams);

    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });

  it('should handle empty old params (fresh job)', () => {
    const { added, removed } = computeDelta([], [MICRO_PARAM_1]);

    expect(added).toHaveLength(1);
    expect(removed).toHaveLength(0);
  });

  it('should handle duplicate additions idempotently (skip existing)', () => {
    const oldParams = [MICRO_PARAM_1];
    const newParams = [MICRO_PARAM_1]; // same param, no change

    const { added, removed } = computeDelta(oldParams, newParams);

    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });
});

// ── Addition Tests ─────────────────────────────────────────────────────────────

describe('applyAdditions', () => {
  it('should inject new param into TestInstance.results without touching existing data', async () => {
    await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);

    // Old result is completely untouched
    const oldResult = inst.results.find(r => r.parameterId === MICRO_PARAM_1.parameterId.toString());
    expect(oldResult.value).toBe('5000');
    expect(oldResult.testMethod).toBe('IS 5402');
    expect(oldResult.isSaved).toBe(true);

    // New result is appended with blank value
    const newResult = inst.results.find(r => r.parameterId === MICRO_PARAM_2.parameterId.toString());
    expect(newResult).toBeTruthy();
    expect(newResult.value).toBe('');
    expect(newResult.name).toBe('Yeast Count');
  });

  it('should NOT roll back a PENDING TestInstance', async () => {
    // microInstance is already PENDING
    await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);
    expect(inst.status).toBe('PENDING');
  });

  it('should roll back a COMPLETED TestInstance to PENDING', async () => {
    // Mark instance as completed
    microInstance.status = 'COMPLETED';
    await microInstance.save();

    const { rolledBackInstances } = await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);
    expect(inst.status).toBe('PENDING');
    expect(rolledBackInstances).toHaveLength(1);
  });

  it('should roll back a PENDING_HEAD_REVIEW TestInstance to PENDING', async () => {
    microInstance.status = 'PENDING_HEAD_REVIEW';
    await microInstance.save();

    const { rolledBackInstances } = await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);
    expect(inst.status).toBe('PENDING');
    expect(rolledBackInstances).toHaveLength(1);
  });

  it('should skip REOPENED and CANCELLED instances', async () => {
    microInstance.status = 'REOPENED';
    await microInstance.save();

    await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);
    // Still REOPENED, untouched
    expect(inst.status).toBe('REOPENED');
    // Original result count unchanged
    expect(inst.results).toHaveLength(1);
  });

  it('should skip if parameter already exists in instance (idempotent)', async () => {
    // Add once
    await applyAdditions(testJob, [MICRO_PARAM_2]);
    let inst = await TestInstance.findById(microInstance._id);
    expect(inst.results).toHaveLength(2);

    // Add again — should not duplicate
    await applyAdditions(testJob, [MICRO_PARAM_2]);
    inst = await TestInstance.findById(microInstance._id);
    expect(inst.results).toHaveLength(2);
  });

  it('should retain analyst custom units and methods after rollback', async () => {
    // Analyst has entered custom data
    microInstance.status = 'COMPLETED';
    microInstance.results[0].unit = 'CFU/mL';  // custom override
    microInstance.results[0].testMethod = 'Custom-Method-1';
    await microInstance.save();

    await applyAdditions(testJob, [MICRO_PARAM_2]);

    const inst = await TestInstance.findById(microInstance._id);
    const existingResult = inst.results.find(r => r.parameterId === MICRO_PARAM_1.parameterId.toString());
    expect(existingResult.unit).toBe('CFU/mL');
    expect(existingResult.testMethod).toBe('Custom-Method-1');
    expect(existingResult.value).toBe('5000');
  });
});

// ── Removal Tests ──────────────────────────────────────────────────────────────

describe('applyRemovals', () => {
  it('should pull removed param from TestInstance.results', async () => {
    const newParams = []; // removing all micro params
    await applyRemovals(testJob, [MICRO_PARAM_1], newParams);

    const inst = await TestInstance.findById(microInstance._id);
    const removedResult = inst.results.find(r => r.parameterId === MICRO_PARAM_1.parameterId.toString());
    expect(removedResult).toBeFalsy();
  });

  it('should cancel TestInstance when department reaches 0 params', async () => {
    const newParams = [CHEMICAL_PARAM_1]; // only chemical remains
    const { deactivatedDepts } = await applyRemovals(testJob, [MICRO_PARAM_1], newParams);

    expect(deactivatedDepts.has('micro')).toBe(true);
    const inst = await TestInstance.findById(microInstance._id);
    expect(inst.status).toBe('CANCELLED');
  });

  it('should NOT cancel TestInstance if department still has other params', async () => {
    // Add a second micro param first
    microInstance.results.push({
      parameterId: MICRO_PARAM_2.parameterId.toString(),
      name: 'Yeast Count',
      value: '',
      unit: 'CFU/g'
    });
    await microInstance.save();

    // Remove only one of the two micro params
    const newParams = [
      { ...MICRO_PARAM_2, parameterId: MICRO_PARAM_2.parameterId },
      { ...CHEMICAL_PARAM_1, parameterId: CHEMICAL_PARAM_1.parameterId }
    ];
    const { deactivatedDepts } = await applyRemovals(testJob, [MICRO_PARAM_1], newParams);

    expect(deactivatedDepts.has('micro')).toBe(false);
    const inst = await TestInstance.findById(microInstance._id);
    expect(inst.status).toBe('PENDING'); // unchanged
  });
});

// ── Integration: Sibling Job Isolation ─────────────────────────────────────────

describe('Sibling Job Isolation', () => {
  it('should not affect sibling job TestInstances', async () => {
    // Create a sibling job (Non-NABL) with its own instance
    const siblingJob = await Job.create({
      jobCode: `SIBLING${Date.now()}`,
      sampleSerial: 1002,
      clientName: 'Test Client',
      customer: { customer_name: 'Test Client' },
      sample: {
        sample_name: 'Test Sample',
        sample_id: 'TS-002',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Sibling sample',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Non Nabl'
      },
      parameters: [{ ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId }],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id,
      siblingJobId: testJob._id
    });

    // Link them
    testJob.siblingJobId = siblingJob._id;
    await testJob.save();

    const siblingUser = await User.create({
      name: 'Sibling Analyst',
      email: `sibling-${Date.now()}@test.com`,
      phone: '1234567893',
      password: 'hashedpassword123',
      role: 'ASSISTANT',
      department: 'micro'
    });

    const siblingInstance = await TestInstance.create({
      jobId: siblingJob._id,
      testCode: `${siblingJob.jobCode}-1`,
      clientName: 'Test Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: siblingUser._id,
      createdBy: siblingUser._id,
      status: 'PENDING',
      results: [{
        parameterId: MICRO_PARAM_1.parameterId.toString(),
        name: 'Total Plate Count',
        value: '3000',
        unit: 'CFU/g'
      }]
    });

    // Apply additions to the ORIGINAL job only
    await applyAdditions(testJob, [MICRO_PARAM_2]);

    // Sibling's instance should be completely untouched
    const sibInst = await TestInstance.findById(siblingInstance._id);
    expect(sibInst.results).toHaveLength(1); // no injection
    expect(sibInst.results[0].value).toBe('3000'); // value untouched
  });
});
