/**
 * Parameter Schema Cleanup & Group Decoupling Tests (SP2.P15 / C8)
 *
 * Verifies that:
 * 1. Parameter schema does not contain group or subGroup fields.
 * 2. Renaming a group or subgroup updates ParameterGroup without querying or mutating Parameter.
 * 3. Deleting a group or subgroup checks incomplete jobs via groupMetadata (not parameters).
 * 4. Parameters in incomplete jobs do not falsely block deleting unrelated groups or subgroups.
 * 5. Creating a parameter via Data Settings subgroup endpoint does not attach group or subGroup.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Parameter = require('../models/Parameter');
const ParameterGroup = require('../models/ParameterGroup');
const Job = require('../models/Job');
const User = require('../models/User');
const dataSettingsRoutes = require('../routes/dataSettingsRoutes');
const parameterRoutes = require('../routes/parameterRoutes');

describe('SP2.P15: Parameter Schema Cleanup & Group Decoupling', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_p15';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    testUser = await User.create({
      name: 'Admin User',
      email: `admin_p15_${Date.now()}@test.com`,
      phone: '9876543210',
      password: 'password123',
      role: 'ADMIN'
    });

    authToken = jwt.sign(
      { id: testUser._id, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use('/api/data-settings', dataSettingsRoutes);
    app.use('/api/parameters', parameterRoutes);
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    await Parameter.deleteMany({});
    await ParameterGroup.deleteMany({});
    await Job.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Parameter.deleteMany({});
    await ParameterGroup.deleteMany({});
    await Job.deleteMany({});
  });

  it('verifies Parameter schema has no group or subGroup properties', async () => {
    const param = await Parameter.create({
      s_no: 1,
      name: 'Moisture Content',
      type: 'Chemical',
      unit: '%',
      specification: 'Max 10'
    });

    const doc = await Parameter.findById(param._id).lean();
    expect(doc.group).toBeUndefined();
    expect(doc.subGroup).toBeUndefined();

    // Even if passed in create, schema should ignore them
    const paramWithIgnoredFields = await Parameter.create({
      s_no: 2,
      name: 'Lead (Pb)',
      type: 'Chemical',
      unit: 'mg/kg',
      group: 'Heavy Metals',
      subGroup: 'Toxic Metals'
    });

    const docWithIgnored = await Parameter.findById(paramWithIgnoredFields._id).lean();
    expect(docWithIgnored.group).toBeUndefined();
    expect(docWithIgnored.subGroup).toBeUndefined();
  });

  it('renames a group without updating or requiring Parameter.group', async () => {
    await ParameterGroup.create({
      group: 'Beverages',
      subGroup: 'Juices',
      parameters: []
    });

    const param = await Parameter.create({
      s_no: 1,
      name: 'Brix',
      type: 'Chemical',
      unit: 'deg Bx'
    });

    const res = await request(app)
      .put('/api/data-settings/groups/Beverages')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newName: 'Soft Drinks' });

    expect(res.status).toBe(200);

    const updatedGroup = await ParameterGroup.findOne({ subGroup: 'Juices' });
    expect(updatedGroup.group).toBe('Soft Drinks');

    const paramAfter = await Parameter.findById(param._id).lean();
    expect(paramAfter.group).toBeUndefined();
  });

  it('renames a subgroup without updating or requiring Parameter.subGroup', async () => {
    const groupDoc = await ParameterGroup.create({
      group: 'Dairy',
      subGroup: 'Raw Milk',
      parameters: []
    });

    const param = await Parameter.create({
      s_no: 1,
      name: 'Fat',
      type: 'Chemical',
      unit: '%'
    });

    const res = await request(app)
      .put(`/api/data-settings/subgroups/${groupDoc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newName: 'Pasteurized Milk' });

    expect(res.status).toBe(200);

    const updatedGroup = await ParameterGroup.findById(groupDoc._id);
    expect(updatedGroup.subGroup).toBe('Pasteurized Milk');

    const paramAfter = await Parameter.findById(param._id).lean();
    expect(paramAfter.subGroup).toBeUndefined();
  });

  it('blocks group deletion only if incomplete jobs match groupMetadata.group', async () => {
    await ParameterGroup.create({
      group: 'Water',
      subGroup: 'Drinking Water',
      parameters: []
    });

    const incompleteJob = await Job.create({
      jobCode: '2611010001',
      sampleSerial: 1001,
      groupMetadata: {
        group: 'Water',
        subGroup: 'Drinking Water'
      },
      customer: { customer_name: 'Test Client' },
      sample: {
        sample_name: 'Drinking Water Sample',
        sample_id: 'S-01',
        sample_quantity: '1 L',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date()
      },
      distribution: {
        chemical: {
          required: true,
          status: 'PENDING_REVIEW'
        }
      },
      createdBy: testUser._id
    });

    // Attempt to delete group 'Water' should be blocked
    const resBlocked = await request(app)
      .delete('/api/data-settings/groups/Water')
      .set('Authorization', `Bearer ${authToken}`);

    expect(resBlocked.status).toBe(400);
    expect(resBlocked.body.message).toContain('used in 1 incomplete job');

    // Complete the job
    incompleteJob.distribution.chemical.status = 'COMPLETED';
    await incompleteJob.save();

    // Now deletion should succeed
    const resAllowed = await request(app)
      .delete('/api/data-settings/groups/Water')
      .set('Authorization', `Bearer ${authToken}`);

    expect(resAllowed.status).toBe(200);
  });

  it('does NOT block group deletion if incomplete job uses same parameter under a different group', async () => {
    const param = await Parameter.create({
      s_no: 1,
      name: 'Moisture',
      type: 'Chemical',
      unit: '%'
    });

    // Group to delete has parameter in its list
    await ParameterGroup.create({
      group: 'Spices',
      subGroup: 'Whole Spices',
      parameters: [{ parameterId: param._id, name: param.name }]
    });

    // An incomplete job exists for 'Grains', which also tests 'Moisture'
    await Job.create({
      jobCode: '2611010002',
      sampleSerial: 1002,
      groupMetadata: {
        group: 'Grains',
        subGroup: 'Wheat'
      },
      customer: { customer_name: 'Grain Corp' },
      sample: {
        sample_name: 'Wheat Sample',
        sample_id: 'S-02',
        sample_quantity: '500 g',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date()
      },
      parameters: [{
        parameterId: param._id,
        name: param.name,
        type: param.type,
        unit: param.unit
      }],
      distribution: {
        chemical: {
          required: true,
          status: 'PENDING_REVIEW'
        }
      },
      createdBy: testUser._id
    });

    // Deleting 'Spices' must NOT be blocked by the incomplete 'Grains' job
    const res = await request(app)
      .delete('/api/data-settings/groups/Spices')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
  });

  it('blocks subgroup deletion only if incomplete jobs match groupMetadata.subGroup', async () => {
    const subgroupDoc = await ParameterGroup.create({
      group: 'Oils',
      subGroup: 'Mustard Oil',
      parameters: []
    });

    const job = await Job.create({
      jobCode: '2611010003',
      sampleSerial: 1003,
      groupMetadata: {
        group: 'Oils',
        subGroup: 'Mustard Oil'
      },
      customer: { customer_name: 'Oil Mills' },
      sample: {
        sample_name: 'Mustard Oil Sample',
        sample_id: 'S-03',
        sample_quantity: '500 ml',
        sample_count: 1,
        condition_on_receipt: 'Good',
        received_date: new Date()
      },
      distribution: {
        chemical: {
          required: true,
          status: 'ASSIGNED_TO_ASSISTANT'
        }
      },
      createdBy: testUser._id
    });

    // Blocked
    const resBlocked = await request(app)
      .delete(`/api/data-settings/subgroups/${subgroupDoc._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(resBlocked.status).toBe(400);

    // Change job to different subgroup
    job.groupMetadata.subGroup = 'Refined Oil';
    await job.save();

    // Now deleting 'Mustard Oil' should succeed
    const resAllowed = await request(app)
      .delete(`/api/data-settings/subgroups/${subgroupDoc._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(resAllowed.status).toBe(200);
  });

  it('creates parameter via subgroup endpoint without group or subGroup properties on Parameter', async () => {
    const groupDoc = await ParameterGroup.create({
      group: 'Confectionery',
      subGroup: 'Candies',
      parameters: []
    });

    const res = await request(app)
      .post(`/api/data-settings/subgroups/${groupDoc._id}/parameters`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Total Sugars',
        type: 'Chemical',
        unit: 'g/100g'
      });

    expect(res.status).toBe(201);
    expect(res.body.parameter.name).toBe('Total Sugars');

    const createdInDb = await Parameter.findById(res.body.parameter._id).lean();
    expect(createdInDb.group).toBeUndefined();
    expect(createdInDb.subGroup).toBeUndefined();
  });

  it('unsets deadweight group and subGroup from existing MongoDB documents via migration logic', async () => {
    const rawCol = mongoose.connection.collection('parameters');

    // Simulate existing legacy documents with group and subGroup
    await rawCol.insertOne({
      s_no: 999,
      name: 'Legacy Ash',
      type: 'Chemical',
      unit: '%',
      group: 'Cereals',
      subGroup: 'Wheat Products'
    });

    const docBefore = await rawCol.findOne({ name: 'Legacy Ash' });
    expect(docBefore.group).toBe('Cereals');
    expect(docBefore.subGroup).toBe('Wheat Products');

    // Run migration unset
    const updateResult = await rawCol.updateMany(
      {},
      { $unset: { group: '', subGroup: '' } }
    );
    expect(updateResult.modifiedCount).toBeGreaterThanOrEqual(1);

    const docAfter = await rawCol.findOne({ name: 'Legacy Ash' });
    expect(docAfter.group).toBeUndefined();
    expect(docAfter.subGroup).toBeUndefined();
  });
});
