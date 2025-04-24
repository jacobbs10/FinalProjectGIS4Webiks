const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server'); // your Express app
const User = require('../models/User');

jest.mock('../models/User');

const mockUserData = {
  _id: new mongoose.Types.ObjectId(),
  username: 'testuser',
  user_firstname: 'Test',
  user_lastname: 'User',
  user_cellphone: '123456789',
  user_email: 'test@example.com',
  password: 'password123',
  role: 'Viewer',
  user_status: true,
  comparePassword: jest.fn()
};

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue(mockUserData);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...mockUserData });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(User.prototype.save).toHaveBeenCalled();
    });

    it('should not register existing user', async () => {
      User.findOne.mockResolvedValue(mockUserData);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...mockUserData });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });
  });

  describe('POST /login', () => {
    it('should login a user with valid credentials', async () => {
      mockUserData.comparePassword.mockResolvedValue(true);
      User.findOne.mockResolvedValue(mockUserData);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'wrongpass' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should not login inactive user', async () => {
      User.findOne.mockResolvedValue({ ...mockUserData, user_status: false });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Account is inactive');
    });
  });

  // You can mock and test bulk-register similarly:
  // describe('POST /bulk-register', ...) with mocked file and authMiddleware

});
