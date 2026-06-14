const mongoose = require('mongoose');
const Job = require('./models/Job');
const TestInstance = require('./models/TestInstance');
const User = require('./models/User');
const Parameter = require('./models/Parameter');

mongoose.connect('mongodb://127.0.0.1:27017/aiper')
  .then(async () => {
    console.log('Connected to DB');

    // Clean existing jobs and test instances
    await Job.deleteMany({});
    await TestInstance.deleteMany({});
    console.log('Cleared existing Jobs and TestInstances.');

    // Fetch users
    const admin = await User.findOne({ email: 'admin@foodlab.com' });
    const adminOfficer = await User.findOne({ email: 'adminofficer@foodlab.com' });
    const microHead = await User.findOne({ email: 'microhead@foodlab.com' });
    const chemicalHead = await User.findOne({ email: 'chemicalhead@foodlab.com' });
    const microAnalyst = await User.findOne({ email: 'microanalyst@foodlab.com' });
    const chemicalAnalyst = await User.findOne({ email: 'chemicalanalyst@foodlab.com' });

    // Fetch parameters
    const allParams = await Parameter.find();

    const microParamsBlueprint = allParams.filter(p => p.type === 'Micro');
    const chemicalParamsBlueprint = allParams.filter(p => p.type === 'Chemical');

    console.log(`Available: Micro (${microParamsBlueprint.length}), Chemical (${chemicalParamsBlueprint.length})`);

    // We need at least 8 micro and 8 chemical parameters to exceed 12 rows (making it multiple pages)
    const nablParamsSelected = [
      ...microParamsBlueprint.slice(0, 8).map(p => ({ parameterId: p._id, name: p.name, type: p.type, unit: p.unit })),
      ...chemicalParamsBlueprint.slice(0, 8).map(p => ({ parameterId: p._id, name: p.name, type: p.type, unit: p.unit }))
    ];

    const nonNablParamsSelected = [
      ...microParamsBlueprint.slice(0, 8).map(p => ({ parameterId: p._id, name: p.name, type: p.type, unit: p.unit })),
      ...chemicalParamsBlueprint.slice(0, 8).map(p => ({ parameterId: p._id, name: p.name, type: p.type, unit: p.unit }))
    ];

    const serial = 1101;
    const baseJobCode = '2606031101';

    const customer = {
      customer_name: 'Pesticide & Agro Foods Private Limited',
      customer_address: '405, Industry House, A.B. Road, Indore, M.P.',
      contact_person: 'Mr. Rajesh Kumar',
      mobile_number: '+91 9876543210',
      email: 'contact@agrofoods.com',
      customer_reference_no: 'PO-2026-8871'
    };

    const sample = {
      sample_name: 'Purified Drinking Water',
      sample_id: '1101',
      sample_quantity: '2000 ml',
      sample_count: 2,
      sample_description: 'Water sample packed in sterile PET bottles',
      condition_on_receipt: 'Satisfactory, intact seal',
      packing_details: 'Sealed plastic bottles',
      marking_seal: 'AGRO/2026/01',
      sample_source: 'Storage Tank B',
      received_date: new Date('2026-06-03T10:00:00.000Z'),
      received_mode: 'Courier'
    };

    const compliance = {
      statement_of_conformity: 'The sample conforms to IS 10500:2012 specification for the parameters tested.',
      decision_rule: 'Decision rule applied as per lab policy FTL/DR/02.',
      accreditation_scope: 'Within NABL Scope',
      disclaimer_notes: 'Results relate only to the sample received.',
      special_handling_instructions: 'Keep in dry and cold place.'
    };

    // Create NABL Job
    const nablJob = await Job.create({
      jobCode: baseJobCode,
      sampleSerial: serial,
      clientName: customer.customer_name,
      totalSampleVolume: 2000,
      customer,
      sample: {
        ...sample,
        nabl_type: 'Nabl',
        ulr_no: 'TC-1243426000001101F'
      },
      compliance,
      parameters: nablParamsSelected,
      groupMetadata: {
        group: 'Water',
        subGroup: 'Drinking Water',
        productCategory: 'Food & Beverages'
      },
      pesticidePanel: {
        enabled: true,
        panelType: 'food'
      },
      distribution: {
        micro: { required: true, status: 'COMPLETED', assignedHead: microHead._id },
        chemical: { required: true, status: 'COMPLETED', assignedHead: chemicalHead._id }
      },
      createdBy: adminOfficer._id,
      history: [{ action: 'CREATED', by: adminOfficer._id, note: 'Job logged by Admin Officer' }]
    });

    // Create Non-NABL Job
    const nonNablJob = await Job.create({
      jobCode: `${baseJobCode}-N`,
      sampleSerial: serial,
      clientName: customer.customer_name,
      totalSampleVolume: 2000,
      customer,
      sample: {
        ...sample,
        nabl_type: 'Non Nabl',
        ulr_no: null
      },
      compliance,
      parameters: nonNablParamsSelected,
      groupMetadata: {
        group: 'Water',
        subGroup: 'Drinking Water',
        productCategory: 'Food & Beverages'
      },
      pesticidePanel: {
        enabled: true,
        panelType: 'food'
      },
      distribution: {
        micro: { required: true, status: 'COMPLETED', assignedHead: microHead._id },
        chemical: { required: true, status: 'COMPLETED', assignedHead: chemicalHead._id }
      },
      createdBy: adminOfficer._id,
      siblingJobId: nablJob._id,
      history: [{ action: 'CREATED', by: adminOfficer._id, note: 'Job logged by Admin Officer' }]
    });

    // Link NABL Job to sibling
    nablJob.siblingJobId = nonNablJob._id;
    await nablJob.save();

    console.log('Jobs created successfully!');

    // Create TestInstances helper
    const createTestInstances = async (job, suffix = '') => {
      // Micro Instance
      const microResults = job.parameters
        .filter(p => p.type === 'Micro')
        .map(p => ({
          parameterId: p.parameterId.toString(),
          name: p.name,
          value: p.name.includes('Salmonella') || p.name.includes('E. coli') || p.name.includes('Vibrio') || p.name.includes('Shigella') ? 'Absent' : '0',
          unit: p.unit,
          isSaved: true,
          testMethod: 'IS 1622:1981',
          assignedTo: microAnalyst._id
        }));

      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-1${suffix}`,
        clientName: job.clientName,
        deadline: new Date('2026-06-10T18:00:00.000Z'),
        assignedTo: microAnalyst._id,
        status: 'COMPLETED',
        results: microResults,
        createdBy: microHead._id,
        completedAt: new Date('2026-06-05T15:30:00.000Z'),
        testingPeriod: {
          startDate: new Date('2026-06-03T11:00:00.000Z'),
          endDate: new Date('2026-06-05T15:00:00.000Z')
        },
        reviewHistory: [
          { action: 'APPROVE', by: microHead._id, role: 'HEAD', note: 'All parameters tested and approved.' }
        ]
      });

      // Chemical Instance (with Pesticide Residue parameters included too)
      const chemResults = job.parameters
        .filter(p => p.type === 'Chemical')
        .map(p => ({
          parameterId: p.parameterId.toString(),
          name: p.name,
          value: p.name === 'pH' ? '7.25' : p.name.includes('Lead') || p.name.includes('Cadmium') || p.name.includes('Arsenic') || p.name.includes('Mercury') ? 'BLQ (LOQ 0.01)' : '0.05',
          unit: p.unit,
          isSaved: true,
          testMethod: 'IS 3025:1984',
          assignedTo: chemicalAnalyst._id
        }));

      // Add pesticide residues specific panel results
      chemResults.push({
        parameterId: 'pesticide_1',
        name: 'Malathion (Pesticide residue)',
        value: 'BLQ (LOQ 0.001)',
        unit: 'mg/kg',
        isSaved: true,
        testMethod: 'IS 15187:2002',
        isPanel: true,
        panelName: 'Pesticide Panel',
        assignedTo: chemicalAnalyst._id
      });
      chemResults.push({
        parameterId: 'pesticide_2',
        name: 'Chlorpyrifos (Pesticide residue)',
        value: 'BLQ (LOQ 0.001)',
        unit: 'mg/kg',
        isSaved: true,
        testMethod: 'IS 15187:2002',
        isPanel: true,
        panelName: 'Pesticide Panel',
        assignedTo: chemicalAnalyst._id
      });

      await TestInstance.create({
        jobId: job._id,
        testCode: `${job.jobCode}-2${suffix}`,
        clientName: job.clientName,
        deadline: new Date('2026-06-10T18:00:00.000Z'),
        assignedTo: chemicalAnalyst._id,
        status: 'COMPLETED',
        results: chemResults,
        createdBy: chemicalHead._id,
        completedAt: new Date('2026-06-05T16:00:00.000Z'),
        testingPeriod: {
          startDate: new Date('2026-06-03T11:00:00.000Z'),
          endDate: new Date('2026-06-05T15:30:00.000Z')
        },
        reviewHistory: [
          { action: 'APPROVE', by: chemicalHead._id, role: 'HEAD', note: 'Chemical analysis is completed.' }
        ]
      });
    };

    await createTestInstances(nablJob);
    await createTestInstances(nonNablJob, '-N');

    console.log('Completed TestInstances created successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
