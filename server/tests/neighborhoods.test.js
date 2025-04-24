
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Neighborhood = require('../models/NeighborhoodModel');

let token;
let adminToken;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create admin user
    const admin = new User({
      username: 'admin',
      user_firstname: 'Admin',
      user_lastname: 'User',
      user_cellphone: '1234567890',
      user_email: 'admin@test.com',
      password: 'adminpass',
      role: 'Admin',
    });
    await admin.save();
    adminId = admin._id.toString();
  
    const res1 = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'adminpass'
    });
    adminToken = res1.body.token;   
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Neighborhoods API', () => {
  let neighborhoodId;

  it('admin can create a neighborhood', async () => {
    const res = await request(app)
      .post('/api/neighborhood')
      .set('Authorization', `${adminToken}`)
      .send({
        city: 'Tel Aviv',
        neighborhood: 'Florentin',
        coordinates: [
          [34.7708, 32.0544],
          [34.7710, 32.0544],
          [34.7710, 32.0546],
          [34.7708, 32.0546],
          [34.7708, 32.0544]
        ]
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    neighborhoodId = res.body.data.properties.id;
  });

  it('user can get all neighborhoods', async () => {
    const res = await request(app)
      .get('/api/neighborhoods')
      .set('Authorization', `${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.neighborhoods.length).toBeGreaterThan(0);
  });

  it('user can get neighborhood by ID', async () => {
    const res = await request(app)
      .get(`/api/neighborhood/${neighborhoodId}`)
      .set('Authorization', `${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.properties.id).toBe(neighborhoodId);
  });

  it('user can get neighborhood by position', async () => {
    const res = await request(app)
      .get('/api/position?lng=34.7709&lat=32.0545')
      .set('Authorization', `${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.geometry.type).toBe('Polygon');
  });

  it('admin can update a neighborhood', async () => {
    const res = await request(app)
      .put('/api/neighborhood')
      .set('Authorization', `${adminToken}`)
      .send({
        id: neighborhoodId,
        city: 'Updated City',
        neighborhood: 'Updated Hood',
        coordinates: [
          [34.7708, 32.0544],
          [34.7711, 32.0544],
          [34.7711, 32.0546],
          [34.7708, 32.0546],
          [34.7708, 32.0544]
        ]
      });
    expect(res.statusCode).toBe(200);
  });

  it('admin can delete a neighborhood', async () => {
    const res = await request(app)
      .delete(`/api/neighborhood/${neighborhoodId}`)
      .set('Authorization', `${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.some(n => n.properties.id === neighborhoodId)).toBe(false);
  });

  it('admin can bulk insert neighborhoods', async () => {
    const res = await request(app)
      .post('/api/bulk')
      .set('Authorization', `${adminToken}`)
      .send([{
        id: 999,
        city: 'City Bulk',
        neighborhood: 'Bulkhood',
        coordinates: [
          [34.7708, 32.0544],
          [34.7712, 32.0544],
          [34.7712, 32.0546],
          [34.7708, 32.0546],
          [34.7708, 32.0544]
        ]
      }]);
    expect(res.statusCode).toBe(201);
    expect(res.body.success.count).toBe(1);
  });
});
