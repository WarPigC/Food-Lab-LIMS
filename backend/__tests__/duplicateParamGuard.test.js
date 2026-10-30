/**
 * Duplicate Parameter Guard & Whitespace Trim Tests (SP-2 P14)
 *
 * Verifies that:
 * 1. POST /api/parameters trims name and unit.
 * 2. Duplicate names with leading/trailing whitespace or different casing are rejected with 400.
 * 3. Empty names or units (including whitespace-only) are rejected with 400.
 * 4. MongoDB duplicate key errors (code 11000) are caught and return 400 Bad Request.
 * 5. PUT /api/parameters/:id trims name/unit, checks collision, and catches code 11000.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Parameter = require('../models/Parameter');
const User = require('../models/User');
const parameterRoutes = require('../routes/parameterRoutes');

describe('SP-2 P14: Duplicate Parameter Guard & Whitespace Trim Fix', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_12345';
    await mongoose.connect(process.env.MONGO_TEST_URI);

    // Create a mock user and auth token
    testUser = await User.create({
      name: 'Admin User',
      email: `admin_${Date.now()}@example.com`,
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
    app.use('/api/parameters', parameterRoutes);
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    await Parameter.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Parameter.deleteMany({});
  });

  it('trims leading and trailing whitespace from name and unit on creation', async () => {
    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   Moisture Content   ',
        type: 'Chemical',
        unit: '   %   ',
        specification: 'Max 10'
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Moisture Content');
    expect(res.body.unit).toBe('%');

    const inDb = await Parameter.findById(res.body._id);
    expect(inDb.name).toBe('Moisture Content');
    expect(inDb.unit).toBe('%');
  });

  it('rejects duplicate parameter with different casing', async () => {
    await Parameter.create({
      s_no: 1,
      name: 'Total Plate Count',
      type: 'Micro',
      unit: 'CFU/g'
    });

    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'total plate count',
        type: 'Micro',
        unit: 'CFU/g'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
  });

  it('rejects duplicate parameter with leading or trailing whitespace', async () => {
    await Parameter.create({
      s_no: 1,
      name: 'Lead',
      type: 'Chemical',
      unit: 'ppm'
    });

    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   Lead   ',
        type: 'Chemical',
        unit: 'ppm'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
  });

  it('rejects empty or whitespace-only name and unit on creation', async () => {
    const emptyNameRes = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   ',
        type: 'Chemical',
        unit: 'mg/kg'
      });

    expect(emptyNameRes.status).toBe(400);

    const emptyUnitRes = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Arsenic',
        type: 'Chemical',
        unit: '   '
      });

    expect(emptyUnitRes.status).toBe(400);
  });

  it('catches Mongo duplicate key error 11000 and responds with 400 Bad Request', async () => {
    await Parameter.create({
      s_no: 1,
      name: 'Cadmium',
      type: 'Chemical',
      unit: 'ppm'
    });

    // Simulate duplicate creation via route
    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Cadmium',
        type: 'Chemical',
        unit: 'ppm'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
  });

  it('trims name and unit on update and detects collisions with other parameters', async () => {
    const param1 = await Parameter.create({
      s_no: 1,
      name: 'Zinc',
      type: 'Chemical',
      unit: 'ppm'
    });

    const param2 = await Parameter.create({
      s_no: 2,
      name: 'Iron',
      type: 'Chemical',
      unit: 'ppm'
    });

    // Attempt to rename param2 to Zinc with whitespace
    const res = await request(app)
      .put(`/api/parameters/${param2._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   Zinc   '
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');

    // Updating param2 with trimmed non-conflicting name and unit
    const successRes = await request(app)
      .put(`/api/parameters/${param2._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '   Ferrous Iron   ',
        unit: '   mg/L   '
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.name).toBe('Ferrous Iron');
    expect(successRes.body.unit).toBe('mg/L');
  });

  it('rejects duplicate parameter with internal whitespace difference (e.g. "0.1%" vs "0.1 %")', async () => {
    await Parameter.create({
      s_no: 1,
      name: '0.1 %',
      type: 'Chemical',
      unit: '%'
    });

    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '0.1%',
        type: 'Chemical',
        unit: '%'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
    expect(res.body.message).toContain('0.1 %');
  });

  it('rejects duplicate parameter with whitespace differences around punctuation and symbols', async () => {
    await Parameter.create({
      s_no: 1,
      name: 'Arsenic (as As)',
      type: 'Chemical',
      unit: 'ppm'
    });

    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Arsenic(as As)',
        type: 'Chemical',
        unit: 'ppm'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
  });

  it('rejects duplicate parameter with multiple internal spaces', async () => {
    await Parameter.create({
      s_no: 1,
      name: 'Test for Starch',
      type: 'Chemical',
      unit: '-'
    });

    const res = await request(app)
      .post('/api/parameters')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test   for   Starch',
        type: 'Chemical',
        unit: '-'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
  });

  it('rejects update when renamed to existing parameter with internal whitespace variations', async () => {
    const existingParam = await Parameter.create({
      s_no: 1,
      name: '0.1 %',
      type: 'Chemical',
      unit: '%'
    });

    const paramToUpdate = await Parameter.create({
      s_no: 2,
      name: 'Moisture',
      type: 'Chemical',
      unit: '%'
    });

    const res = await request(app)
      .put(`/api/parameters/${paramToUpdate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '0.1%'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already exists in the library');
    expect(res.body.message).toContain('0.1 %');
  });

  it('finds and ranks parameter when searching with different whitespace (e.g. search "0.1%" matches "0.1 %")', async () => {
    await Parameter.create({
      s_no: 1,
      name: '0.1 %',
      type: 'Chemical',
      unit: '%'
    });

    const res = await request(app)
      .get('/api/parameters?search=0.1%')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe('0.1 %');
  });
});
