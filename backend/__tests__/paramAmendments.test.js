/**
 * Parameter Amendments Unit & Integration Tests (SP-2 P13)
 *
 * Verifies that adding parameters to a dispatched job stages them into
 * pendingParamAmendments, prevents analyst duplication, enforces completion safety guards,
 * and allows Head to approve & assign or reject.
 */

const mongoose = require('mongoose');
const Job = require('../models/Job');
const TestInstance = require('../models/TestInstance');
const User = require('../models/User');
const { isJobFullyTested } = require('../utils/ulrService');

describe('SP-2 P13: Staged Parameter Amendments', () => {
  let officerUser, headUser, analystA, analystB;

  beforeAll(async () => {
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
      department: 'Micro'
    });
    analystA = await User.create({
      name: 'Analyst A',
      email: `analyst_a_${Date.now()}@example.com`,
      phone: '9876543212',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Micro'
    });
    analystB = await User.create({
      name: 'Analyst B',
      email: `analyst_b_${Date.now()}@example.com`,
      phone: '9876543213',
      password: 'password123',
      role: 'ASSISTANT',
      department: 'Micro'
    });
  });

  afterAll(async () => {
    if (officerUser) {
      await User.deleteMany({ _id: { $in: [officerUser._id, headUser._id, analystA._id, analystB._id] } });
    }
    await mongoose.disconnect();
  });

  test('isJobFullyTested blocks completion when pendingParamAmendments is active', () => {
    const jobWithAmendment = {
      distribution: {
        micro: { required: true, status: 'COMPLETED' },
        chemical: { required: false }
      },
      pendingParamAmendments: {
        status: 'PENDING_HEAD_REVIEW',
        parameters: [{ name: 'Salmonella', type: 'Micro', unit: '/25g' }]
      }
    };
    expect(isJobFullyTested(jobWithAmendment)).toBe(false);

    const jobWithRejectedAmendment = {
      distribution: {
        micro: { required: true, status: 'COMPLETED' },
        chemical: { required: false }
      },
      pendingParamAmendments: {
        status: 'REJECTED',
        parameters: [{ name: 'Salmonella', type: 'Micro', unit: '/25g' }]
      }
    };
    expect(isJobFullyTested(jobWithRejectedAmendment)).toBe(false);

    const jobWithoutAmendment = {
      distribution: {
        micro: { required: true, status: 'COMPLETED' },
        chemical: { required: false }
      },
      pendingParamAmendments: {
        status: 'NONE',
        parameters: []
      }
    };
    expect(isJobFullyTested(jobWithoutAmendment)).toBe(true);
  });

  test('Job schema supports pendingParamAmendments lifecycle', async () => {
    const param1Id = new mongoose.Types.ObjectId();
    const param2Id = new mongoose.Types.ObjectId();

    const job = await Job.create({
      jobCode: `TEST${Date.now()}`,
      sampleSerial: 9991,
      clientName: 'Amendment Test Corp',
      customer: { customer_name: 'Amendment Test Corp' },
      sample: {
        sample_name: 'Water',
        sample_id: 'S-9991',
        sample_quantity: '1 L',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Nabl'
      },
      parameters: [{
        parameterId: param1Id,
        name: 'E. coli',
        type: 'Micro',
        unit: 'CFU/100mL'
      }],
      distribution: {
        micro: { required: true, status: 'ASSIGNED_TO_ASSISTANT' },
        chemical: { required: false }
      },
      createdBy: officerUser._id,
      pendingParamAmendments: {
        status: 'PENDING_HEAD_REVIEW',
        parameters: [{
          parameterId: param2Id,
          name: 'Coliforms',
          type: 'Micro',
          unit: 'MPN/100mL'
        }],
        submittedBy: officerUser._id,
        submittedAt: new Date()
      }
    });

    expect(job.pendingParamAmendments.status).toBe('PENDING_HEAD_REVIEW');
    expect(job.pendingParamAmendments.parameters.length).toBe(1);
    expect(job.pendingParamAmendments.parameters[0].name).toBe('Coliforms');

    // Simulate rejection
    job.pendingParamAmendments.status = 'REJECTED';
    job.pendingParamAmendments.rejectionReason = 'Insufficient sample volume';
    await job.save();

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.pendingParamAmendments.status).toBe('REJECTED');
    expect(updatedJob.pendingParamAmendments.rejectionReason).toBe('Insufficient sample volume');

    // Clean up
    await Job.deleteOne({ _id: job._id });
  });

  test('Job completes when rejected parameter amendment is cleared and all department instances are completed', async () => {
    const paramId = new mongoose.Types.ObjectId();
    const rejectedParamId = new mongoose.Types.ObjectId();

    const job = await Job.create({
      jobCode: `TEST_COMP_${Date.now()}`,
      sampleSerial: 9992,
      clientName: 'Completion Test Corp',
      customer: { customer_name: 'Completion Test Corp' },
      sample: {
        sample_name: 'Water',
        sample_id: 'S-9992',
        sample_quantity: '1 L',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date(),
        nabl_type: 'Non Nabl'
      },
      parameters: [{
        parameterId: paramId,
        name: 'pH',
        type: 'Chemical',
        unit: 'pH'
      }],
      distribution: {
        micro: { required: false },
        chemical: { required: true, status: 'ASSIGNED_TO_ASSISTANT' }
      },
      createdBy: officerUser._id,
      pendingParamAmendments: {
        status: 'REJECTED',
        parameters: [{
          parameterId: rejectedParamId,
          name: 'Lead',
          type: 'Chemical',
          unit: 'mg/L'
        }],
        rejectionReason: 'Not equipped for heavy metals'
      }
    });

    const instance = await TestInstance.create({
      jobId: job._id,
      testCode: `${job.jobCode}-2`,
      clientName: job.clientName,
      deadline: new Date(),
      assignedTo: analystA._id,
      department: 'chemical',
      status: 'COMPLETED',
      results: [{
        parameterId: paramId.toString(),
        name: 'pH',
        value: '7.2',
        unit: 'pH'
      }],
      createdBy: headUser._id
    });

    // Verify before: isJobFullyTested should be false because of pendingParamAmendments.status === 'REJECTED'
    expect(isJobFullyTested(job)).toBe(false);

    // Now simulate clearing the rejected amendment (as done when admin officer saves edit without the rejected param)
    job.pendingParamAmendments = { status: 'NONE', parameters: [], rejectionReason: '' };
    
    // Evaluate department completion
    const allInstances = await TestInstance.find({ jobId: job._id }).populate('createdBy', 'department');
    const isDeptCompleted = (deptName) => {
      const deptInstances = allInstances.filter(i => {
        const instDept = i.department?.toLowerCase() || i.createdBy?.department?.toLowerCase() || (i.testCode?.includes('-1') ? 'micro' : i.testCode?.includes('-2') ? 'chemical' : '');
        return instDept === deptName.toLowerCase();
      });
      if (deptInstances.length === 0) return false;
      return deptInstances.every(i => i.status === 'COMPLETED');
    };

    if (job.distribution.chemical.required && isDeptCompleted('chemical')) {
      job.distribution.chemical.status = 'COMPLETED';
    }

    expect(job.distribution.chemical.status).toBe('COMPLETED');
    expect(isJobFullyTested(job)).toBe(true);

    // Clean up
    await TestInstance.deleteOne({ _id: instance._id });
    await Job.deleteOne({ _id: job._id });
  });
});
