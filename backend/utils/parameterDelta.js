/**
 * Parameter Delta Engine
 * 
 * Computes the difference between old and new parameter arrays
 * and applies the necessary mutations to TestInstances.
 * 
 * Extracted as a pure utility so it can be reused by the future
 * Job Amendment feature without duplicating logic.
 */
const TestInstance = require('../models/TestInstance');
const { deleteCustomReport } = require('../services/reportStorage');

/**
 * Compute the delta between two parameter arrays.
 * 
 * @param {Array} oldParams - Current job.parameters
 * @param {Array} newParams - Incoming parameters from request body
 * @returns {{ added: Array, removed: Array }}
 */
function computeDelta(oldParams, newParams) {
  const oldIds = new Set(oldParams.map(p => {
    const id = p.parameterId?._id || p.parameterId;
    return id ? id.toString() : null;
  }).filter(Boolean));

  const newIds = new Set(newParams.map(p => {
    const id = p.parameterId?._id || p.parameterId;
    return id ? id.toString() : null;
  }).filter(Boolean));

  const added = newParams.filter(p => {
    const id = p.parameterId?._id || p.parameterId;
    return id && !oldIds.has(id.toString());
  });

  const removed = oldParams.filter(p => {
    const id = p.parameterId?._id || p.parameterId;
    return id && !newIds.has(id.toString());
  });

  return { added, removed };
}

/**
 * Apply parameter additions to existing TestInstances.
 * 
 * For each added parameter, finds active TestInstances for the
 * corresponding department and injects the parameter as a blank entry.
 * If the instance was COMPLETED or PENDING_HEAD_REVIEW, rolls it back to PENDING.
 * 
 * @param {Object} job - The Mongoose job document
 * @param {Array} addedParams - Parameters to add
 * @returns {Object} - { rolledBackInstances: Array, affectedDepts: Set }
 */
async function applyAdditions(job, addedParams) {
  const rolledBackInstances = [];
  const affectedDepts = new Set();

  for (const param of addedParams) {
    const dept = param.type === 'Micro' ? 'micro' : 'chemical';
    affectedDepts.add(dept);

    // Only inject into TestInstances if the department already has active instances
    const activeStatuses = ['PENDING', 'PENDING_HEAD_REVIEW', 'COMPLETED'];
    const instances = await TestInstance.find({
      jobId: job._id,
      status: { $in: activeStatuses }
    }).populate('createdBy', 'department');

    // Filter instances belonging to this department
    const deptInstances = instances.filter(inst => {
      const instDept = inst.createdBy?.department?.toLowerCase();
      return instDept === dept || 
        // Fallback: if createdBy.department doesn't match, check by the test code suffix
        // -1 = micro, -2 = chemical
        (dept === 'micro' && inst.testCode?.includes('-1')) ||
        (dept === 'chemical' && inst.testCode?.includes('-2'));
    });

    for (const inst of deptInstances) {
      // Check if this parameter already exists in the instance (idempotent)
      const paramId = (param.parameterId?._id || param.parameterId).toString();
      const alreadyExists = inst.results.some(r => r.parameterId === paramId);
      if (alreadyExists) continue;

      // Inject blank result entry — existing results are untouched
      inst.results.push({
        parameterId: paramId,
        name: param.name || '',
        value: '',
        unit: param.unit || '',
        specification: param.specification || '',
        isSaved: false,
        testMethod: ''
      });

      // Roll back if instance was already completed or in review
      if (['COMPLETED', 'PENDING_HEAD_REVIEW'].includes(inst.status)) {
        inst.status = 'PENDING';
        rolledBackInstances.push(inst);
      }

      await inst.save();
    }
  }

  return { rolledBackInstances, affectedDepts };
}

/**
 * Apply parameter removals to existing TestInstances.
 * 
 * For each removed parameter, pulls it from the relevant TestInstance(s).
 * If a department ends up with 0 parameters, deletes the TestInstance(s) entirely.
 * 
 * @param {Object} job - The Mongoose job document  
 * @param {Array} removedParams - Parameters that were removed
 * @param {Array} newParams - The full new parameter array (to check zero-param condition)
 * @returns {Object} - { deletedInstances: Array, deactivatedDepts: Set }
 */
async function applyRemovals(job, removedParams, newParams) {
  const deletedInstances = [];
  const deactivatedDepts = new Set();

  for (const param of removedParams) {
    const dept = param.type === 'Micro' ? 'micro' : 'chemical';
    const paramId = (param.parameterId?._id || param.parameterId).toString();

    const activeStatuses = ['PENDING', 'PENDING_HEAD_REVIEW', 'COMPLETED'];
    const instances = await TestInstance.find({
      jobId: job._id,
      status: { $in: activeStatuses }
    }).populate('createdBy', 'department');

    const deptInstances = instances.filter(inst => {
      const instDept = inst.createdBy?.department?.toLowerCase();
      return instDept === dept ||
        (dept === 'micro' && inst.testCode?.includes('-1')) ||
        (dept === 'chemical' && inst.testCode?.includes('-2'));
    });

    for (const inst of deptInstances) {
      // Pull the parameter from results
      inst.results = inst.results.filter(r => r.parameterId !== paramId);
      await inst.save();
    }
  }

  // Check zero-parameter condition per department
  for (const dept of ['micro', 'chemical']) {
    const remainingForDept = newParams.filter(p => {
      return (dept === 'micro' && p.type === 'Micro') ||
             (dept === 'chemical' && p.type === 'Chemical');
    });

    if (remainingForDept.length === 0 && job.distribution[dept]?.required) {
      // Department has zero params — delete its TestInstances and deactivate
      const activeStatuses = ['PENDING', 'PENDING_HEAD_REVIEW', 'COMPLETED'];
      const deptInstances = await TestInstance.find({
        jobId: job._id,
        status: { $in: activeStatuses }
      }).populate('createdBy', 'department');

      const toDelete = deptInstances.filter(inst => {
        const instDept = inst.createdBy?.department?.toLowerCase();
        return instDept === dept ||
          (dept === 'micro' && inst.testCode?.includes('-1')) ||
          (dept === 'chemical' && inst.testCode?.includes('-2'));
      });

      for (const inst of toDelete) {
        inst.status = 'CANCELLED';
        await inst.save();
        deletedInstances.push(inst);
      }

      deactivatedDepts.add(dept);
    }
  }

  return { deletedInstances, deactivatedDepts };
}

/**
 * Invalidate custom reports when parameters change.
 * Deletes any custom .docx uploaded to GridFS for this job.
 * 
 * @param {string} jobId - The job's MongoDB _id
 * @returns {boolean} - true if a report was deleted
 */
async function invalidateCustomReports(jobId) {
  let reverted = false;
  try {
    // Try both report types
    for (const type of ['nabl', 'non_nabl']) {
      const result = await deleteCustomReport(jobId.toString(), type);
      if (result) reverted = true;
    }
  } catch (err) {
    // Non-critical — log but don't fail the request
    console.warn('Failed to invalidate custom reports:', err.message);
  }
  return reverted;
}

module.exports = { computeDelta, applyAdditions, applyRemovals, invalidateCustomReports };
