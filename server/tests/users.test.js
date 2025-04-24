const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Your Express app
const User = require('../models/User');

let mongoServer;
let adminToken;
let userToken;
let adminId;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {});

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

  // Create regular user
  const user = new User({
    username: 'user',
    user_firstname: 'Regular',
    user_lastname: 'User',
    user_cellphone: '9876543210',
    user_email: 'user@test.com',
    password: 'userpass',
    role: 'Viewer',
  });
  await user.save();
  userId = user._id.toString();

  const res2 = await request(app).post('/api/auth/login').send({
    username: 'user',
    password: 'userpass'
  });
  userToken = res2.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Management Routes', () => {
  test('GET /api/users (admin only)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/users/:id as self', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe('user');
  });

  test('PUT /api/users/:id as self updates own info', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `${userToken}`)
      .send({ user_firstname: 'UpdatedName' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user_firstname).toBe('UpdatedName');
  });

  test('PUT /api/users/:id as user fails to update role', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `${userToken}`)
      .send({ role: 'Admin' });

    expect(res.statusCode).toBe(200);
    expect(res.body.role).not.toBe('Admin'); // role should not update
  });

  test('DELETE /api/users/:id as admin', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('GET /api/users/:id forbidden as another user', async () => {
    const anotherUser = new User({
      username: 'another',
      user_email: 'another@test.com',
      password: 'pass123',
      role: 'Viewer'
    });
    await anotherUser.save();

    const resLogin = await request(app).post('/api/auth/login').send({
      username: 'another',
      password: 'pass123'
    });

    const res = await request(app)
      .get(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${resLogin.body.token}`);

    expect(res.statusCode).toBe(403);
  });
});
