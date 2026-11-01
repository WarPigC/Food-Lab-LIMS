const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Job = require('../../models/Job');
const TestInstance = require('../../models/TestInstance');
const SampleTransfer = require('../../models/SampleTransfer');
const User = require('../../models/User');
const UlrCounter = require('../../models/UlrCounter');
const SampleCounter = require('../../models/SampleCounter');
const SpecialProfile = require('../../models/SpecialProfile');
const { protect } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/roleMiddleware');
const { createNotification, notifyAdmins, notifyAdminOfficers } = require('../../utils/notifier');
const { audit } = require('../../utils/auditLogger');
const { computeDelta, applyAdditions, applyRemovals, invalidateCustomReports } = require('../../utils/parameterDelta');
const { buildJobCode, getNextSerial, getNextUlr } = require('../../utils/serialUtils');
const { isSampleHandoverRequired } = require('../../utils/sampleUtils');
const { attemptUlrAssignment } = require('../../utils/ulrService');

/**
 * Helper to resolve parameter snapshotting from Special Profiles
 */
const resolveProfileParameters = async (incomingParams, profiles) => {
  let params = (incomingParams || []).map(p => ({
    ...p,
    parameterId: p.parameterId || new mongoose.Types.ObjectId()
  }));
  if (profiles?.waterIso10500) {
    const profile = await SpecialProfile.findOne({ key: 'waterIso10500' });
    const profileParams = (profile?.parameters || [])
      .filter(p => !p.isCategoryHeader)
      .map(p => ({
        parameterId: new mongoose.Types.ObjectId(),
        name: p.name,
        unit: p.unit,
        type: 'Chemical',
        specification: p.requirement || ''
      }));
    params = [...params, ...profileParams];
  }
  if (profiles?.pesticides) {
    const profile = await SpecialProfile.findOne({ key: 'pesticides' });
    if (profile?.parameters) {
      const existingNames = new Set(params.map(p => (p.name || '').toLowerCase().trim()).filter(Boolean));
      const pestParams = (profile.parameters || [])
        .filter(p => !p.isCategoryHeader && !existingNames.has((p.name || '').toLowerCase().trim()))
        .map(p => ({
          parameterId: new mongoose.Types.ObjectId(),
          name: p.name,
          unit: p.unit,
          type: 'Chemical',
          specification: p.specification || ''
        }));
      params = [...params, ...pestParams];
    }
  }
  if (profiles?.fattyAcids?.enabled) {
    const profile = await SpecialProfile.findOne({ key: 'fattyAcids' });
    const variant = profile?.variants?.find(v => v.key === profiles.fattyAcids.variant);
    const existingNames = new Set(params.map(p => (p.name || '').toLowerCase().trim()).filter(Boolean));
    const faParams = (variant?.parameters || [])
      .filter(p => !existingNames.has((p.name || '').toLowerCase().trim()))
      .map(p => ({
        parameterId: new mongoose.Types.ObjectId(),
        name: p.name,
        unit: p.unit,
        type: 'Chemical',
        specification: p.specification || ''
      }));
    params = [...params, ...faParams];
  }
  return params;
};

/**
 * GET /api/jobs/next-sample-id
 * Returns the next sampleSerial so the form can pre-fill the Sample ID field.
 * Public to any authenticated user so the Admin Officer form can fetch it.
 */
router.get('/next-sample-id', protect, async (req, res) => {
  try {
    let counter = await SampleCounter.findOne({});
    const today = new Date().toISOString().split('T')[0];
    
    if (!counter) {
      const start = parseInt(process.env.SAMPLE_ID_START || '1000', 10);
      const last = await Job.findOne({}, { sampleSerial: 1 }, { sort: { sampleSerial: -1 } });
      const initialValue = last && last.sampleSerial ? last.sampleSerial : start;
      counter = { currentValue: initialValue, lastUpdatedDate: today };
    }
    
    let simulatedNextValue = counter.currentValue + 1;
    
    if (counter.lastUpdatedDate && counter.lastUpdatedDate !== today) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayPrefix = `${yy}${mm}${dd}`;
      const stringVal = String(counter.currentValue);
      const serialPart = stringVal.length >= 8 ? stringVal.slice(-4) : stringVal.padStart(4, '0');
      simulatedNextValue = parseInt(`${todayPrefix}${serialPart}`, 10) + 1;
    }
    
    res.json({ 
      currentValue: counter.currentValue, 
      nextValue: simulatedNextValue, 
      serial: simulatedNextValue, 
      padded: String(simulatedNextValue).padStart(4, '0'),
      currentJobCode: buildJobCode(counter.currentValue),
      nextJobCode: buildJobCode(simulatedNextValue)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating next sample ID', error: err.message });
  }
});

/**
 * GET /api/jobs/next-ulr
 * Returns a preview of the next ULR string.
 */
router.get('/next-ulr', protect, async (req, res) => {
  try {
    const counter = await UlrCounter.findOne({}) || { prefix: 'TC-12434', currentValue: 0 };
    const yy = String(new Date().getFullYear()).slice(2);
    const numStr = String(counter.currentValue).padStart(8, '0');
    const nextNumStr = String(counter.currentValue + 1).padStart(8, '0');
    // NOTE: In-flight NABL jobs do not increment currentValue at creation — they
    // increment at Head Approval. If multiple NABL jobs are completing concurrently,
    // the actual assigned ULR may differ from this preview by 1 or more. The preview
    // is labelled as an estimate in the UI.
    res.json({
      lastUlr: `${counter.prefix}${yy}${numStr}`,
      nextUlr: `${counter.prefix}${yy}${nextNumStr}`,
      currentValue: counter.currentValue
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating next ULR', error: err.message });
  }
});

/**
 * PUT /api/jobs/ulr-offset
 * Adjusts the offset value for the ULR counter.
 */
router.put('/ulr-offset', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const { offset } = req.body;
    const counter = await UlrCounter.findOneAndUpdate(
      {},
      { $set: { currentValue: parseInt(offset, 10), offset: 0 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'ULR value updated', currentValue: counter.currentValue });
  } catch (err) {
    res.status(500).json({ message: 'Error updating ULR offset', error: err.message });
  }
});

/**
 * PUT /api/jobs/sample-serial-offset
 * Adjusts the current value of the sample serial counter.
 */
router.put('/sample-serial-offset', protect, authorize('ADMIN_OFFICER', 'ADMIN'), async (req, res) => {
  try {
    const { offset } = req.body;
    const offsetStr = String(offset);

    // If the offset is a full job code (8+ digits like 2607170001),
    // extract the date encoded in it so the midnight rollover fires correctly.
    // Format: YYMMDD#### → lastUpdatedDate = "20YY-MM-DD"
    let lastUpdatedDate = new Date().toISOString().split('T')[0]; // default: today
    if (offsetStr.length >= 8) {
      const yy = offsetStr.slice(0, 2);
      const mm = offsetStr.slice(2, 4);
      const dd = offsetStr.slice(4, 6);
      lastUpdatedDate = `20${yy}-${mm}-${dd}`;
    }

    let counter = await SampleCounter.findOne({});
    if (!counter) {
      counter = await SampleCounter.create({ currentValue: parseInt(offset, 10), lastUpdatedDate });
    } else {
      counter.currentValue = parseInt(offset, 10);
      counter.lastUpdatedDate = lastUpdatedDate;
      await counter.save();
    }
    res.json({ message: 'Sample Serial updated', currentValue: counter.currentValue });
  } catch (err) {
    res.status(500).json({ message: 'Error updating sample serial offset', error: err.message });
  }
});

// Create a new job (ADMIN_OFFICER only)
router.post('/', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const {
      customer, sample, compliance, parameters, sampleFlow,
      assignedMicroHead, assignedChemicalHead, nablMode,
      nablParameters, nonNablParameters, groupMetadata,
      specialProfiles, nablSpecialProfiles, nonNablSpecialProfiles,
      pesticidePanel, nablGroupMetadata, nablPesticidePanel,
      nonNablGroupMetadata, nonNablPesticidePanel,
      showSpecifications, nablShowSpecifications, nonNablShowSpecifications,
      customCreationDate
    } = req.body;

    const activeSpecialProfiles = specialProfiles || (pesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : { waterIso10500: false, pesticides: false, fattyAcids: { enabled: false, variant: null } });
    const activeNablSpecialProfiles = nablSpecialProfiles || (nablPesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : { waterIso10500: false, pesticides: false, fattyAcids: { enabled: false, variant: null } });
    const activeNonNablSpecialProfiles = nonNablSpecialProfiles || (nonNablPesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : { waterIso10500: false, pesticides: false, fattyAcids: { enabled: false, variant: null } });

    // customCreationDate is an optional YYYY-MM-DD string chosen by the officer.
    // It overrides the date prefix in the job code but does NOT affect the counter.
    const serial = await getNextSerial(customCreationDate || null);
    const baseJobCode = buildJobCode(serial, customCreationDate || null);

    const sampleWithId = {
      ...sample,
      sample_id: String(serial).slice(-4).padStart(4, '0')
    };

    const flowType = sampleFlow?.type || 'PARALLEL';
    const firstDept = sampleFlow?.firstDepartm || 'micro';

    // Helper to determine distribution object for a set of parameters
    const getDistribution = (params, isSpecialChem = false) => {
      const hasMicro = params && params.some(p => p.type === 'Micro');
      const hasChemical = (params && params.some(p => p.type === 'Chemical')) || Boolean(isSpecialChem);

      // ALL jobs start at PENDING_REVIEW (universal approval gate)
      return {
        micro: { required: hasMicro, status: hasMicro ? 'PENDING_REVIEW' : 'PENDING', assignedHead: assignedMicroHead || null },
        chemical: { required: hasChemical, status: hasChemical ? 'PENDING_REVIEW' : 'PENDING', assignedHead: assignedChemicalHead || null }
      };
    };

    // Helper to send notifications for a job
    const sendNotifications = async (createdJob, params, dist) => {
      const hasMicro = dist.micro.required;
      const hasChemical = dist.chemical.required;

      await notifyAdmins({
        type: 'INFO',
        title: 'New Job Logged',
        message: `Job ${createdJob.jobCode} (Sample #${serial}) for ${customer?.customer_name} has been created.`,
        relatedJobId: createdJob._id
      });

      if (hasMicro) {
        const microHeads = await User.find({ role: 'HEAD', department: { $regex: /^micro$/i } });
        for (const head of microHeads) {
          await createNotification({
            recipient: head._id, type: 'ACTION_REQUIRED', title: 'New Job Available',
            message: `Job ${createdJob.jobCode} requires MICRO analysis. Child code: ${createdJob.jobCode}-1`,
            relatedJobId: createdJob._id, link: '/head/dispatcher'
          });
        }
      }

      if (hasChemical) {
        const chemicalHeads = await User.find({ role: 'HEAD', department: { $regex: /^(chemical|chemical)$/i } });
        for (const head of chemicalHeads) {
          await createNotification({
            recipient: head._id, type: 'ACTION_REQUIRED', title: 'New Job Available',
            message: `Job ${createdJob.jobCode} requires CHEMICAL analysis. Child code: ${createdJob.jobCode}-2`,
            relatedJobId: createdJob._id, link: '/head/dispatcher'
          });
        }
      }
    };

    let createdJobs = [];

    if (nablMode === 'hybrid') {
      const isNablSpecial = Boolean(activeNablSpecialProfiles?.pesticides || activeNablSpecialProfiles?.waterIso10500 || activeNablSpecialProfiles?.fattyAcids?.enabled);
      const isNonNablSpecial = Boolean(activeNonNablSpecialProfiles?.pesticides || activeNonNablSpecialProfiles?.waterIso10500 || activeNonNablSpecialProfiles?.fattyAcids?.enabled);

      const resolvedNablParams = await resolveProfileParameters(nablParameters, activeNablSpecialProfiles);
      const resolvedNonNablParams = await resolveProfileParameters(nonNablParameters, activeNonNablSpecialProfiles);

      const nablDist = getDistribution(resolvedNablParams, isNablSpecial);
      const nonNablDist = getDistribution(resolvedNonNablParams, isNonNablSpecial);

      // Create NABL job
      const nablJob = await Job.create({
        jobCode: `${baseJobCode}`,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: 'Nabl', ulr_no: null },
        compliance,
        parameters: resolvedNablParams,
        groupMetadata: nablGroupMetadata,
        specialProfiles: activeNablSpecialProfiles,
        distribution: nablDist,
        sampleTransferState: isSampleHandoverRequired({ distribution: nablDist, sample }) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        sampleFlow: isSampleHandoverRequired({ distribution: nablDist, sample }) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        showSpecifications: nablShowSpecifications !== undefined ? nablShowSpecifications : showSpecifications,
        customCreationDate: customCreationDate ? new Date(customCreationDate) : undefined,
        createdBy: req.user._id,
        history: [{
          action: 'CREATED',
          by: req.user._id,
          note: 'Job logged by Admin Officer'
        }]
      });

      // Create Non-NABL job
      const nonNablJob = await Job.create({
        jobCode: `${baseJobCode}-N`,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: 'Non Nabl', ulr_no: null },
        compliance,
        parameters: resolvedNonNablParams,
        groupMetadata: nonNablGroupMetadata,
        specialProfiles: activeNonNablSpecialProfiles,
        distribution: nonNablDist,
        sampleTransferState: isSampleHandoverRequired({ distribution: nonNablDist, sample }) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        sampleFlow: isSampleHandoverRequired({ distribution: nonNablDist, sample }) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        showSpecifications: nonNablShowSpecifications !== undefined ? nonNablShowSpecifications : showSpecifications,
        customCreationDate: customCreationDate ? new Date(customCreationDate) : undefined,
        createdBy: req.user._id,
        siblingJobId: nablJob._id,
        history: [{
          action: 'CREATED',
          by: req.user._id,
          note: 'Job logged by Admin Officer'
        }]
      });

      // Update NABL job with sibling link
      nablJob.siblingJobId = nonNablJob._id;
      await nablJob.save();

      await sendNotifications(nablJob, nablParameters, nablDist);
      await sendNotifications(nonNablJob, nonNablParameters, nonNablDist);
      createdJobs = [nablJob, nonNablJob];

    } else {
      const isNabl = nablMode === 'nabl';
      let reservedSlot = null;
      let reservedYear = null;

      if (!isNabl && req.body.assignUlrToNonNabl) {
        const yy = String(new Date().getFullYear()).slice(2);
        if (req.body.customUlrNumber) {
          // Custom entry: validate sequencing then reserve the slot
          const requestedNum = parseInt(req.body.customUlrNumber, 10);
          const counter = await UlrCounter.findOne({});
          const currentMax = counter?.currentValue || 0;
          if (requestedNum === currentMax + 1) {
            // Advancing the counter: increment so the slot is claimed
            await UlrCounter.findOneAndUpdate({}, { $inc: { currentValue: 1 } });
          }
          reservedSlot = requestedNum;
        } else {
          // Auto: increment counter and reserve that value
          const counter = await UlrCounter.findOneAndUpdate(
            {},
            { $inc: { currentValue: 1 }, $set: { lastYear: yy } },
            { new: true, upsert: true }
          );
          reservedSlot = counter.currentValue;
        }
        reservedYear = yy;
      }

      const effectiveNablType = isNabl ? 'Nabl' : 'Non Nabl';
      const isSpecialChem = Boolean(activeSpecialProfiles?.pesticides || activeSpecialProfiles?.waterIso10500 || activeSpecialProfiles?.fattyAcids?.enabled);
      const resolvedParams = await resolveProfileParameters(parameters, activeSpecialProfiles);
      const dist = getDistribution(resolvedParams, isSpecialChem);

      const job = await Job.create({
        jobCode: baseJobCode,
        sampleSerial: serial,
        clientName: customer?.customer_name || '',
        totalSampleVolume: parseFloat(sample?.sample_quantity) || 0,
        customer,
        sample: { ...sampleWithId, nabl_type: effectiveNablType, ulr_no: null },
        reservedUlrSlot: reservedSlot,
        reservedUlrYear: reservedYear,
        compliance,
        parameters: resolvedParams,
        groupMetadata,
        specialProfiles: activeSpecialProfiles,
        distribution: dist,
        sampleTransferState: isSampleHandoverRequired({ distribution: dist, sample }) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        sampleFlow: isSampleHandoverRequired({ distribution: dist, sample }) ? { type: 'SEQUENTIAL', firstDepartment: 'micro', transferDeadline: sampleFlow?.transferDeadline || null } : undefined,
        showSpecifications,
        customCreationDate: customCreationDate ? new Date(customCreationDate) : undefined,
        createdBy: req.user._id,
        history: [{
          action: 'CREATED',
          by: req.user._id,
          note: 'Job logged by Admin Officer'
        }]
      });

      await sendNotifications(job, parameters, dist);
      createdJobs = [job];
    }

    // Audit log each created job
    for (const cj of createdJobs) {
      audit('JOB_CREATED', {
        req,
        message: `Job ${cj.jobCode} created for ${cj.clientName} (${cj.sample?.nabl_type || 'N/A'})`,
        target: { model: 'Job', documentId: cj._id.toString(), identifier: cj.jobCode }
      });
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('JOB_CREATED');
    }

    res.status(201).json(createdJobs.length === 1 ? createdJobs[0] : createdJobs);
  } catch (error) {
    res.status(500).json({ message: 'Error creating job', error: error.message });
  }
});

// PATCH sample description — Analyst updates sample description in real-time
router.patch('/:id/sample-description', protect, authorize('ASSISTANT'), async (req, res) => {
  try {
    const { description } = req.body;
    if (typeof description !== 'string') {
      return res.status(400).json({ message: 'description must be a string' });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { 'sample.sample_description': description },
      { new: true, select: 'sample.sample_description' }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Notify all connected clients so other analysts see the update live
    if (req.app.get('io')) {
      req.app.get('io').emit('SAMPLE_DESCRIPTION_UPDATED', {
        jobId: req.params.id,
        description
      });
    }

    res.json({ description: job.sample?.sample_description });
  } catch (err) {
    res.status(500).json({ message: 'Error updating sample description', error: err.message });
  }
});

// Update an existing job (ADMIN_OFFICER only)
router.put('/:id', protect, authorize('ADMIN_OFFICER'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    // Snapshot before mutation for audit diff
    const beforeSnapshot = job ? job.toObject() : null;
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only allow editing if the job is not fully complete?
    // User requested "once the entire process is done, job form must be made immutable".
    // For now, if the distribution has completed statuses for everything required, it's immutable.
    const isMicroDone = !job.distribution.micro.required || job.distribution.micro.status === 'COMPLETED';
    const isChemicalDone = !job.distribution.chemical.required || job.distribution.chemical.status === 'COMPLETED';

    if (isMicroDone && isChemicalDone) {
      return res.status(400).json({ message: 'Job is complete and immutable.' });
    }

    let wasOnHold = false;
    if (job.status === 'ON_HOLD') {
      wasOnHold = true;
      job.status = 'ACTIVE';
      job.holdReason = null;
      job.heldAt = null;
      job.heldBy = null;
      
      // Full flow reset — distribution back to PENDING_REVIEW
      if (job.distribution?.micro?.required) {
        job.distribution.micro.status = 'PENDING_REVIEW';
      }
      if (job.distribution?.chemical?.required) {
        job.distribution.chemical.status = 'PENDING_REVIEW';
      }
      
      // Clear head approvals
      job.headApproval = { micro: false, chemical: false };
      
      // Reset sample transfer state
      const isMulti = job.distribution?.micro?.required && job.distribution?.chemical?.required;
      job.sampleTransferState = isSampleHandoverRequired(job) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED';
    }

    const { customer, sample, compliance, parameters, groupMetadata, specialProfiles, pesticidePanel, sampleFlow, assignedMicroHead, assignedChemicalHead, showSpecifications } = req.body;

    if (customer) job.customer = customer;
    
    // --- ULR Logic for PUT ---
    // 1. Admin Officer Override / Validation
    if (sample?.ulr_no && sample.ulr_no !== job.sample?.ulr_no) {
      const newUlr = sample.ulr_no;
      const counter = await UlrCounter.findOne({});
      const yy = String(new Date().getFullYear()).slice(2);
      const prefix = `${counter?.prefix || 'TC-12434'}${yy}`;
      
      if (!newUlr.startsWith(prefix)) return res.status(400).json({ message: 'ULR format invalid for current year.' });
      
      const numericPart = parseInt(newUlr.slice(prefix.length), 10);
      const currentMax = counter?.currentValue || 0;
      
      if (numericPart > currentMax + 1) return res.status(400).json({ message: 'ULR not in sequence.' });
      
      const existing = await Job.findOne({ 'sample.ulr_no': newUlr, _id: { $ne: job._id } }, { jobCode: 1 });
      if (existing) return res.status(400).json({ message: `ULR already assigned to job ${existing.jobCode}.` });
      
      if (numericPart === currentMax + 1) await UlrCounter.findOneAndUpdate({}, { $inc: { currentValue: 1 } });
    }
    
    // 2. Retroactive Non-NABL Opt-In (deferred — writes reservation, not final ULR)
    if (job.sample?.nabl_type === 'Non Nabl' && req.body.assignUlrToNonNabl && !job.sample?.ulr_no && job.reservedUlrSlot == null) {
      const yy = String(new Date().getFullYear()).slice(2);
      if (req.body.customUlrNumber) {
        const requestedNum = parseInt(req.body.customUlrNumber, 10);
        const counter = await UlrCounter.findOne({});
        const currentMax = counter?.currentValue || 0;
        if (requestedNum === currentMax + 1) {
          await UlrCounter.findOneAndUpdate({}, { $inc: { currentValue: 1 } });
        }
        job.reservedUlrSlot = requestedNum;
      } else {
        const counter = await UlrCounter.findOneAndUpdate(
          {},
          { $inc: { currentValue: 1 }, $set: { lastYear: yy } },
          { new: true, upsert: true }
        );
        job.reservedUlrSlot = counter.currentValue;
      }
      job.reservedUlrYear = yy;
      // nabl_type intentionally stays 'Non Nabl'; eligibility is driven by reservedUlrSlot
    }

    if (sample) {
      job.sample = {
        ...sample,
        nabl_type: job.sample?.nabl_type, // preserve existing type
        ulr_no: sample.ulr_no || job.sample?.ulr_no // admin override takes precedence
      };
    }
    if (compliance) job.compliance = compliance;
    if (showSpecifications !== undefined) job.showSpecifications = showSpecifications;

    if (customer && customer.customer_name) {
      job.clientName = customer.customer_name;
    }
    if (sample && sample.sample_quantity) {
      job.totalSampleVolume = parseFloat(sample.sample_quantity) || 0;
    }
    let isResubmitted = false;
    if (req.body.isResubmitted) {
      isResubmitted = true;
    }

    const activeSpecial = specialProfiles || (pesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : undefined);
    if (activeSpecial) job.specialProfiles = activeSpecial;

    // Resolve profile parameters so that special profile additions (e.g. fattyAcids, pesticides) are captured in the parameter delta
    let resolvedParameters = parameters;
    if (resolvedParameters) {
      const profilesForResolution = activeSpecial || job.specialProfiles;
      if (profilesForResolution) {
        resolvedParameters = await resolveProfileParameters(resolvedParameters, profilesForResolution);
      }
    }

    // --- Parameter Delta Engine ---
    // Detect if parameters were modified on a dispatched (in-progress) job
    let paramDelta = null;
    let paramModNotifications = [];

    if (resolvedParameters) {
      // Compute delta BEFORE overwriting job.parameters
      const isDispatched = ['ASSIGNED_TO_ASSISTANT', 'COMPLETED', 'PENDING_HEAD_REVIEW'].includes(
        job.distribution.micro?.status
      ) || ['ASSIGNED_TO_ASSISTANT', 'COMPLETED', 'PENDING_HEAD_REVIEW'].includes(
        job.distribution.chemical?.status
      );

      if (isDispatched) {
        paramDelta = computeDelta(job.parameters || [], resolvedParameters);
      }

      // If dispatched and parameters were added, stage them instead of mutating TestInstances
      let stagedAddedIds = new Set();
      if (isDispatched && paramDelta && paramDelta.added.length > 0) {
        job.pendingParamAmendments = {
          status: 'PENDING_HEAD_REVIEW',
          parameters: paramDelta.added.map(p => ({
            parameterId: p.parameterId || new mongoose.Types.ObjectId(),
            name: p.name,
            type: p.type,
            unit: p.unit,
            specification: p.specification || ''
          })),
          rejectionReason: '',
          submittedBy: req.user._id,
          submittedAt: new Date()
        };

        stagedAddedIds = new Set(
          paramDelta.added.map(p => (p.parameterId || p._id || p.name).toString())
        );

        job.history.push({
          action: 'AMENDMENT_SUBMITTED',
          by: req.user._id,
          note: `${paramDelta.added.length} parameter amendment(s) submitted for Head review`
        });

        // Notify department heads
        const addedDepts = new Set(paramDelta.added.map(p => (p.type || '').toLowerCase()));
        const heads = await User.find({ role: 'HEAD' });
        for (const head of heads) {
          const hDept = (head.department || '').toLowerCase().trim();
          if (addedDepts.has(hDept)) {
            await createNotification({
              recipient: head._id,
              type: 'ACTION_REQUIRED',
              title: 'Parameter Amendment Pending Review',
              message: `Job ${job.jobCode} has parameter amendments awaiting review.`,
              relatedJobId: job._id,
              link: '/head/dispatcher'
            });
          }
        }
        if (req.app.get('io')) {
          req.app.get('io').emit('job:amendment-pending', { jobId: job._id });
        }
      } else if (job.pendingParamAmendments?.status === 'REJECTED' && (!paramDelta || paramDelta.added.length === 0)) {
        // Discarded or resolved rejected parameters
        job.pendingParamAmendments = { status: 'NONE', parameters: [], rejectionReason: '' };
      } else if (!isDispatched) {
        job.pendingParamAmendments = { status: 'NONE', parameters: [], rejectionReason: '' };
      }

      // Only include parameters that are approved (exclude staged additions from active job.parameters)
      const approvedParameters = (resolvedParameters || []).filter(p => {
        const id = (p.parameterId || p._id || p.name)?.toString();
        return !stagedAddedIds.has(id);
      });

      job.parameters = approvedParameters.map(p => ({
        ...p,
        parameterId: p.parameterId || new mongoose.Types.ObjectId()
      }));
      if (groupMetadata) job.groupMetadata = groupMetadata;

      const isSpecialChem = Boolean(job.specialProfiles?.pesticides || job.specialProfiles?.waterIso10500 || job.specialProfiles?.fattyAcids?.enabled);
      const hasMicro = resolvedParameters.some(p => p.type === 'Micro');
      const hasChemical = resolvedParameters.some(p => p.type === 'Chemical') || isSpecialChem;

      // Retain existing valid statuses, default to PENDING_REVIEW if newly required
      let microStatus = (job.distribution.micro?.status && job.distribution.micro.status !== 'RETURNED') ? job.distribution.micro.status : 'PENDING_REVIEW';
      let chemicalStatus = (job.distribution.chemical?.status && job.distribution.chemical.status !== 'RETURNED') ? job.distribution.chemical.status : 'PENDING_REVIEW';

      if (job.distribution.micro?.status === 'RETURNED' || job.distribution.chemical?.status === 'RETURNED') {
        isResubmitted = true;
      }

      // Universal approval gate: if resubmitted, statuses go back to PENDING_REVIEW
      if (isResubmitted) {
        if (hasMicro) microStatus = 'PENDING_REVIEW';
        if (hasChemical) chemicalStatus = 'PENDING_REVIEW';
        job.headApproval = { micro: false, chemical: false };
        job.sampleTransferState = isSampleHandoverRequired({
          distribution: { micro: { required: hasMicro }, chemical: { required: hasChemical } },
          sample: job.sample
        }) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED';
      }

      // --- Apply delta mutations to TestInstances (only removals on dispatched jobs, additions are staged) ---
      if (paramDelta && paramDelta.removed.length > 0) {
        // REMOVALS: pull from TestInstances, handle zero-param cleanup
        const { deactivatedDepts } = await applyRemovals(job, paramDelta.removed, resolvedParameters);

        for (const dept of deactivatedDepts) {
          if (dept === 'micro') { microStatus = 'PENDING'; }
          if (dept === 'chemical') { chemicalStatus = 'PENDING'; }
        }

        // Invalidate custom reports (they're now stale)
        const reportReverted = await invalidateCustomReports(job._id);
        if (reportReverted) {
          job.history.push({
            action: 'REPORT_REVERTED',
            by: req.user._id,
            note: 'Custom report auto-reverted due to parameter modification'
          });
        }
      }

      // Handle newly activated / deactivated departments
      // New dept bypass: goes straight to PENDING (no PENDING_REVIEW gate)
      const wasMicroRequired = job.distribution.micro?.required;
      const wasChemicalRequired = job.distribution.chemical?.required;

      if (hasMicro && !wasMicroRequired && !isResubmitted) {
        // New department activated via param modification, bypass approval
        microStatus = 'PENDING';
        job.headApproval.micro = true;
      }
      if (hasChemical && !wasChemicalRequired && !isResubmitted) {
        chemicalStatus = 'PENDING';
        job.headApproval.chemical = true;
      }

      job.distribution = {
        micro: { required: hasMicro, status: hasMicro ? microStatus : 'PENDING', assignedHead: assignedMicroHead || job.distribution.micro?.assignedHead || null },
        chemical: { required: hasChemical, status: hasChemical ? chemicalStatus : 'PENDING', assignedHead: assignedChemicalHead || job.distribution.chemical?.assignedHead || null }
      };

      // Handle sample transfer state for single-to-multi dept transitions
      if (hasMicro && hasChemical) {
        job.sampleFlow = {
          type: 'PARALLEL',
          firstDepartment: 'micro',
          transferDeadline: sampleFlow?.transferDeadline || job.sampleFlow?.transferDeadline || null
        };
        // If transitioning from single to multi dept, set transfer state
        if (!wasMicroRequired || !wasChemicalRequired) {
          if (!isResubmitted && job.sampleTransferState === 'NOT_REQUIRED') {
            const updatedJobShape = {
              distribution: { micro: { required: hasMicro }, chemical: { required: hasChemical } },
              sample: job.sample
            };
            const chemAlreadyActive = ['ASSIGNED_TO_ASSISTANT', 'COMPLETED', 'PENDING_HEAD_REVIEW'].includes(job.distribution.chemical?.status);
            if (isSampleHandoverRequired(updatedJobShape) && !chemAlreadyActive) {
              job.sampleTransferState = 'PENDING_TRANSFER';
            } else if (chemAlreadyActive) {
              // Chemical already had the sample, no Micro to Chemical handover required
              job.sampleTransferState = 'ACCEPTED';
            }
          }
        }
      } else {
        job.sampleFlow = undefined;
        // If transitioning from multi to single dept, clean up transfer state
        if (wasMicroRequired && wasChemicalRequired) {
          job.sampleTransferState = 'NOT_REQUIRED';
        }
      }

      // Check if department instances are already completed (e.g. if pending/rejected amendments previously blocked completion)
      if (job.pendingParamAmendments?.status === 'NONE') {
        const allInstances = await TestInstance.find({ jobId: job._id }).populate('createdBy', 'department');
        const isDeptCompleted = (deptName) => {
          const deptInstances = allInstances.filter(i => {
            const instDept = i.department?.toLowerCase() || i.createdBy?.department?.toLowerCase() || (i.testCode?.includes('-1') ? 'micro' : i.testCode?.includes('-2') ? 'chemical' : '');
            return instDept === deptName.toLowerCase();
          });
          if (deptInstances.length === 0) return false;
          return deptInstances.every(i => i.status === 'COMPLETED');
        };

        if (job.distribution?.micro?.required && isDeptCompleted('micro')) {
          job.distribution.micro.status = 'COMPLETED';
        }
        if (job.distribution?.chemical?.required && isDeptCompleted('chemical')) {
          job.distribution.chemical.status = 'COMPLETED';
        }

        // Attempt ULR assignment if now fully tested
        await attemptUlrAssignment(job, req.user);
      }
    }

    // Freeze existing TestInstances if the job was on hold
    if (wasOnHold) {
      const TestInstance = require('../../models/TestInstance');
      const instances = await TestInstance.find({ jobId: job._id, status: { $ne: 'CANCELLED' } });
      
      const currentParamIds = new Set(job.parameters.map(p => String(p.parameterId)));
      
      for (const instance of instances) {
        instance.status = 'HELD';
        // Strip out results for parameters that were removed
        instance.results = instance.results.filter(r => currentParamIds.has(String(r.parameterId)));
        await instance.save();
      }
    }

    // --- History Entry ---
    let actionType = 'UPDATED';
    let actionNote = 'Job updated by Admin Officer';

    const hasParamChanges = paramDelta && (paramDelta.added.length > 0 || paramDelta.removed.length > 0);
    
    if (hasParamChanges) {
      const addedNames = paramDelta.added.map(p => p.name).filter(Boolean);
      const removedNames = paramDelta.removed.map(p => p.name).filter(Boolean);
      const parts = [];
      if (addedNames.length > 0) parts.push(`Added: ${addedNames.join(', ')}`);
      if (removedNames.length > 0) parts.push(`Removed: ${removedNames.join(', ')}`);
      
      actionNote = `Parameters modified. ${parts.join('. ')}.`;
    } else if (isResubmitted) {
      actionType = 'RESUBMITTED';
      actionNote = 'Job resubmitted by Admin Officer after corrections';
    }

    if (wasOnHold) {
      if (actionType === 'UPDATED' && !hasParamChanges) {
        actionType = 'HOLD_RELEASED';
        actionNote = 'Job edited and re-dispatched from hold.';
      } else {
        actionNote += ' (Hold Released)';
      }
    }

    job.history.push({
      action: actionType,
      by: req.user._id,
      note: actionNote
    });

    // Hybrid sibling sync: propagate customer/sample-metadata/compliance and update sibling's own params
    const { nablMode, nablParameters, nonNablParameters, nablGroupMetadata, nonNablGroupMetadata,
            nablSpecialProfiles, nonNablSpecialProfiles,
            nablPesticidePanel, nonNablPesticidePanel, nablShowSpecifications, nonNablShowSpecifications } = req.body;
    
    if (nablMode === 'hybrid' && job.siblingJobId) {
      const sibling = await Job.findById(job.siblingJobId);
      if (sibling) {
        if (customer) { sibling.customer = customer; sibling.clientName = customer.customer_name || sibling.clientName; }
        if (sample) {
          sibling.sample = {
            ...sample,
            nabl_type: sibling.sample?.nabl_type,
            ulr_no: sibling.sample?.ulr_no
          };
        }
        if (compliance) sibling.compliance = compliance;
    
        const isCurrentJobNabl = job.sample?.nabl_type === 'Nabl';
        const siblingParams    = isCurrentJobNabl ? nonNablParameters : nablParameters;
        const siblingGroupMeta = isCurrentJobNabl ? nonNablGroupMetadata : nablGroupMetadata;
        const siblingSpecial = isCurrentJobNabl
          ? (nonNablSpecialProfiles || (nonNablPesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : undefined))
          : (nablSpecialProfiles || (nablPesticidePanel?.enabled ? { waterIso10500: false, pesticides: true, fattyAcids: { enabled: false, variant: null } } : undefined));
        const siblingShowSpecs = isCurrentJobNabl ? nonNablShowSpecifications : nablShowSpecifications;
    
        if (siblingParams) {
          let resolvedSibParams = siblingParams;
          if (siblingSpecial) {
            resolvedSibParams = await resolveProfileParameters(resolvedSibParams, siblingSpecial);
          }
          sibling.parameters = resolvedSibParams;
          if (siblingGroupMeta !== undefined) sibling.groupMetadata = siblingGroupMeta;
          if (siblingSpecial) sibling.specialProfiles = siblingSpecial;
          if (siblingShowSpecs !== undefined) sibling.showSpecifications = siblingShowSpecs;
        }
        
        let siblingActionNote = 'Synced from sibling job edit';

        if (wasOnHold && sibling.status === 'ON_HOLD') {
          sibling.status = 'ACTIVE';
          sibling.holdReason = null;
          sibling.heldAt = null;
          sibling.heldBy = null;
          
          if (sibling.distribution?.micro?.required) {
            sibling.distribution.micro.status = 'PENDING_REVIEW';
          }
          if (sibling.distribution?.chemical?.required) {
            sibling.distribution.chemical.status = 'PENDING_REVIEW';
          }
          sibling.headApproval = { micro: false, chemical: false };
          
          const isSibMulti = sibling.distribution?.micro?.required && sibling.distribution?.chemical?.required;
          sibling.sampleTransferState = isSampleHandoverRequired(sibling) ? 'PENDING_APPROVAL' : 'NOT_REQUIRED';
          
          siblingActionNote = 'Hold Released (Synced from sibling job edit)';
          
          const TestInstance = require('../../models/TestInstance');
          const sibInstances = await TestInstance.find({ jobId: sibling._id, status: { $ne: 'CANCELLED' } });
          const sibParamIds = new Set(sibling.parameters.map(p => String(p.parameterId)));
          for (const instance of sibInstances) {
            instance.status = 'HELD';
            instance.results = instance.results.filter(r => sibParamIds.has(String(r.parameterId)));
            await instance.save();
          }
        }
    
        sibling.history.push({ action: 'UPDATED', by: req.user._id, note: siblingActionNote });
        await sibling.save({ validateBeforeSave: false });
      }
    }

    await job.save();

    // Audit log with before/after diff
    const hasParamChanges2 = paramDelta && (paramDelta.added.length > 0 || paramDelta.removed.length > 0);
    audit(hasParamChanges2 ? 'PARAMETERS_MODIFIED' : 'JOB_UPDATED', {
      req,
      message: `Job ${job.jobCode} ${hasParamChanges2 ? 'parameters modified' : isResubmitted ? 'resubmitted' : 'updated'}`,
      target: { model: 'Job', documentId: job._id.toString(), identifier: job.jobCode },
      before: beforeSnapshot,
      after: job.toObject(),
      fields: ['sample', 'sample.nabl_type', 'sample.ulr_no', 'sample.sample_name', 'sample.sample_description', 'customer', 'customer.customer_name', 'parameters', 'distribution', 'showSpecifications', 'compliance']
    });

    // Send queued parameter modification notifications
    if (paramModNotifications.length > 0) {
      for (const notif of paramModNotifications) {
        try { await createNotification(notif); } catch (e) { console.warn('Notification failed:', e.message); }
      }

      // Also notify affected department heads
      for (const dept of ['micro', 'chemical']) {
        const headId = job.distribution[dept]?.assignedHead;
        if (headId && paramDelta) {
          const deptAdded = paramDelta.added.filter(p => (p.type === 'Micro' ? 'micro' : 'chemical') === dept);
          const deptRemoved = paramDelta.removed.filter(p => (p.type === 'Micro' ? 'micro' : 'chemical') === dept);
          if (deptAdded.length > 0 || deptRemoved.length > 0) {
            try {
              await createNotification({
                recipient: headId,
                type: 'WARNING',
                title: 'Parameters Modified',
                message: `Parameters have been modified for Job ${job.jobCode}. Please review.`,
                relatedJobId: job._id,
                link: '/head/dispatcher'
              });
            } catch (e) { console.warn('Head notification failed:', e.message); }
          }
        }
      }
    }

    if (req.app.get('io')) {
      if (wasOnHold) {
        req.app.get('io').emit('JOB_HELD', { jobId: job._id });
        if (nablMode === 'hybrid' && job.siblingJobId) {
          req.app.get('io').emit('JOB_HELD', { jobId: job.siblingJobId });
        }
      } else {
        req.app.get('io').emit('JOB_UPDATED');
      }
      if (hasParamChanges2) {
        req.app.get('io').emit('PARAMETERS_MODIFIED', { jobId: job._id, jobCode: job.jobCode });
      }
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job', error: error.message });
  }
});

// Get a single job by ID (used for sibling job fetching in hybrid editing)
router.get('/:id', protect, async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(); // Fall through to other routes if not a valid ObjectId (e.g. next-ulr)
    }
    const job = await Job.findById(req.params.id)
      .populate('parameters.parameterId', 'name unit type _id');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error fetching job by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
