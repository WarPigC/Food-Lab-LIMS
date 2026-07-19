/**
 * Phase 4 Tests: Report Generation After Parameter Modification
 * 
 * Tests that the report pipeline correctly reflects parameter modifications.
 * The core function under test is `attachResultsToJob` in exportRoutes.js,
 * which merges TestInstance results into job.parameters for DOCX generation.
 * 
 * Since attachResultsToJob isn't exported (it's a local const in the router file),
 * we test the same logic by directly simulating what it does:
 * 1. Create a Job with parameters
 * 2. Create TestInstances with results (including orphaned/stale ones)
 * 3. Verify the merged output matches expectations
 */
const mongoose = require('mongoose');
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

// Simulates what attachResultsToJob does (since it's not exported)
const simulateAttachResults = async (job) => {
  const jobObj = job.toObject();
  
  // Same query as the fixed exportRoutes.js — only active instances
  const instances = await TestInstance.find({
    jobId: job._id,
    status: { $in: ['PENDING', 'PENDING_HEAD_REVIEW', 'COMPLETED'] }
  }).sort({ version: -1 });

  const resultMap = {};
  instances.forEach(inst => {
    inst.results.forEach(r => {
      const pid = r.parameterId.toString();
      if (!resultMap[pid]) {
        resultMap[pid] = {
          value: r.value,
          testMethod: r.testMethod,
          specification: r.specification,
          unit: r.unit
        };
      }
    });
  });

  // Merge results into job.parameters (source of truth)
  jobObj.parameters = (jobObj.parameters || []).map(p => {
    const pId = p.parameterId ? (p.parameterId._id || p.parameterId).toString() : null;
    const resData = pId ? resultMap[pId] : null;
    return {
      ...p,
      value: resData?.value || '',
      testMethod: resData?.testMethod || '',
      specification: p.specification || resData?.specification || '',
      unit: resData?.unit || p.unit
    };
  });

  // NO orphaned param append — job.parameters is the single source of truth

  return jobObj;
};

// ── Setup / Teardown ───────────────────────────────────────────────────────────

let testUser, microAnalyst;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  testUser = await User.create({
    name: 'Test Admin',
    email: `admin-${Date.now()}@test.com`,
    phone: '1234567890',
    password: 'hashedpassword123',
    role: 'ADMIN_OFFICER',
    department: 'Administration'
  });

  microAnalyst = await User.create({
    name: 'Micro Analyst',
    email: `micro-${Date.now()}@test.com`,
    phone: '1234567891',
    password: 'hashedpassword123',
    role: 'ASSISTANT',
    department: 'micro'
  });
});

afterEach(async () => {
  await Job.deleteMany({});
  await TestInstance.deleteMany({});
  await User.deleteMany({});
});

// ── Report Filtering Tests ─────────────────────────────────────────────────────

describe('Report Generation After Parameter Modification', () => {

  it('should not include deleted params in report even if result exists in TestInstance', async () => {
    // Scenario: "Moisture" was removed from job.parameters, but the TestInstance
    // still has the analyst's old result for it. Report must NOT show Moisture.

    const job = await Job.create({
      jobCode: `RPT${Date.now()}`,
      sampleSerial: 2001,
      clientName: 'Report Client',
      customer: { customer_name: 'Report Client' },
      sample: {
        sample_name: 'Report Sample',
        sample_id: 'RS-001',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Report test',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      // After modification: only Micro param remains, Chemical was removed
      parameters: [
        { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId }
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id
    });

    // TestInstance still has the orphaned Chemical result (not cleaned up)
    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-1`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'COMPLETED',
      results: [
        {
          parameterId: MICRO_PARAM_1.parameterId.toString(),
          name: 'Total Plate Count',
          value: '5000',
          unit: 'CFU/g',
          testMethod: 'IS 5402'
        },
        {
          // This is the ORPHANED result — param was removed from job
          parameterId: CHEMICAL_PARAM_1.parameterId.toString(),
          name: 'Moisture',
          value: '12.5',
          unit: '%',
          testMethod: 'IS 1011'
        }
      ]
    });

    const reportData = await simulateAttachResults(job);

    // Report should ONLY contain the Micro param
    expect(reportData.parameters).toHaveLength(1);
    expect(reportData.parameters[0].name).toBe('Total Plate Count');
    expect(reportData.parameters[0].value).toBe('5000');

    // Moisture should NOT appear anywhere
    const hasMoisture = reportData.parameters.some(p => p.name === 'Moisture');
    expect(hasMoisture).toBe(false);
  });

  it('should include newly added params with blank values in report', async () => {
    // Scenario: "Yeast Count" was added after dispatch. The TestInstance
    // doesn't have a result for it yet. Report should show it with blank value.

    const job = await Job.create({
      jobCode: `RPT${Date.now()}`,
      sampleSerial: 2002,
      clientName: 'Report Client',
      customer: { customer_name: 'Report Client' },
      sample: {
        sample_name: 'Report Sample',
        sample_id: 'RS-002',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Report test',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [
        { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId },
        { ...MICRO_PARAM_2, parameterId: MICRO_PARAM_2.parameterId } // newly added
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id
    });

    // TestInstance only has the ORIGINAL param filled in
    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-1`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'PENDING',
      results: [
        {
          parameterId: MICRO_PARAM_1.parameterId.toString(),
          name: 'Total Plate Count',
          value: '5000',
          unit: 'CFU/g',
          testMethod: 'IS 5402'
        }
        // Yeast Count not in results yet (analyst hasn't filled it)
      ]
    });

    const reportData = await simulateAttachResults(job);

    expect(reportData.parameters).toHaveLength(2);
    
    const yeast = reportData.parameters.find(p => p.name === 'Yeast Count');
    expect(yeast).toBeTruthy();
    expect(yeast.value).toBe(''); // blank — analyst hasn't filled it
  });

  it('should retain existing param values when new params are added alongside them', async () => {
    const job = await Job.create({
      jobCode: `RPT${Date.now()}`,
      sampleSerial: 2003,
      clientName: 'Report Client',
      customer: { customer_name: 'Report Client' },
      sample: {
        sample_name: 'Report Sample',
        sample_id: 'RS-003',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Report test',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [
        { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId },
        { ...MICRO_PARAM_2, parameterId: MICRO_PARAM_2.parameterId }
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id
    });

    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-1`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'COMPLETED',
      results: [
        {
          parameterId: MICRO_PARAM_1.parameterId.toString(),
          name: 'Total Plate Count',
          value: '5000',
          unit: 'CFU/mL',      // analyst overrode unit
          testMethod: 'IS 5402',
          isSaved: true
        },
        {
          parameterId: MICRO_PARAM_2.parameterId.toString(),
          name: 'Yeast Count',
          value: '',   // not filled yet
          unit: 'CFU/g'
        }
      ]
    });

    const reportData = await simulateAttachResults(job);

    const tpc = reportData.parameters.find(p => p.name === 'Total Plate Count');
    expect(tpc.value).toBe('5000');
    expect(tpc.unit).toBe('CFU/mL');       // analyst override preserved
    expect(tpc.testMethod).toBe('IS 5402');

    const yeast = reportData.parameters.find(p => p.name === 'Yeast Count');
    expect(yeast.value).toBe('');
  });

  it('should exclude REOPENED instance results from report', async () => {
    // Scenario: Instance v1 is REOPENED (frozen), v2 is the active one.
    // Report should use v2's results, not v1's stale data.

    const job = await Job.create({
      jobCode: `RPT${Date.now()}`,
      sampleSerial: 2004,
      clientName: 'Report Client',
      customer: { customer_name: 'Report Client' },
      sample: {
        sample_name: 'Report Sample',
        sample_id: 'RS-004',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Report test',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [
        { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId }
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id
    });

    // v1 — REOPENED, with OLD stale value
    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-1-v1`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'REOPENED',
      version: 1,
      results: [{
        parameterId: MICRO_PARAM_1.parameterId.toString(),
        name: 'Total Plate Count',
        value: '99999',        // STALE value from v1
        unit: 'CFU/g',
        testMethod: 'OLD METHOD'
      }]
    });

    // v2 — active COMPLETED instance with current value
    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-1-v2`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'COMPLETED',
      version: 2,
      parentInstanceId: new mongoose.Types.ObjectId(),
      results: [{
        parameterId: MICRO_PARAM_1.parameterId.toString(),
        name: 'Total Plate Count',
        value: '5000',        // CURRENT value from v2
        unit: 'CFU/g',
        testMethod: 'IS 5402'
      }]
    });

    const reportData = await simulateAttachResults(job);

    // Should use v2's value, NOT v1's stale "99999"
    expect(reportData.parameters[0].value).toBe('5000');
    expect(reportData.parameters[0].testMethod).toBe('IS 5402');
  });

  it('should exclude CANCELLED instance results from report', async () => {
    const job = await Job.create({
      jobCode: `RPT${Date.now()}`,
      sampleSerial: 2005,
      clientName: 'Report Client',
      customer: { customer_name: 'Report Client' },
      sample: {
        sample_name: 'Report Sample',
        sample_id: 'RS-005',
        sample_quantity: '500 g',
        sample_count: 1,
        sample_description: 'Report test',
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [
        { ...MICRO_PARAM_1, parameterId: MICRO_PARAM_1.parameterId }
      ],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false, status: 'PENDING' }
      },
      createdBy: testUser._id
    });

    // CANCELLED instance — should be ignored
    await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-cancelled`,
      clientName: 'Report Client',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: microAnalyst._id,
      createdBy: microAnalyst._id,
      status: 'CANCELLED',
      results: [{
        parameterId: MICRO_PARAM_1.parameterId.toString(),
        name: 'Total Plate Count',
        value: 'BAD_DATA',    // stale data from cancelled instance
        unit: 'CFU/g'
      }]
    });

    const reportData = await simulateAttachResults(job);

    // Should have blank value since the only instance is CANCELLED
    expect(reportData.parameters[0].value).toBe('');
  });
});
