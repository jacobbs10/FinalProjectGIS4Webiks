// tests/locs.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server'); // Assuming app is exported from app.js
const Location = require('../models/LocationModel');

// Helper to generate mock JWT
const generateToken = (role = 'User') => {
  return jwt.sign({ id: 'testuser', role }, 'testsecret'); // match your JWT secret
};

let mongoServer;

beforeAll(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase(); // Clean up
  await mongoose.disconnect();
});

describe('/api/locs endpoints', () => {
  describe('GET /api/locs', () => {
    it('should return paginated locations for regular user (non-restricted)', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 1,
          loc_name: 'Loc 1',
          address: 'Address 1',
          description: 'Desc 1',
          restricted: false,
          category: 'Restaurant', // Use a valid category from the enum
        },
        geometry: { type: 'Point', coordinates: [1, 2] },
      });

      const res = await request(app)
        .get('/api/locs?page=1&size=10')
        .set('Authorization', `${generateToken('User')}`);

      expect(res.status).toBe(200);
      expect(res.body.locations.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('should not return restricted records for regular user', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 2,
          loc_name: 'Restricted',
          address: 'Hidden',
          description: 'Desc',
          restricted: true,
          category: 'Restaurant', // Valid category
        },
        geometry: { type: 'Point', coordinates: [1, 2] },
      });

      const res = await request(app)
        .get('/api/locs')
        .set('Authorization', `${generateToken('User')}`);

      expect(res.body.locations.length).toBe(0);
    });
  });

  describe('GET /api/locs/all', () => {
    it('should return all locations for admin', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 3,
          loc_name: 'Admin only',
          address: 'Secret',
          description: 'Info',
          restricted: true,
          category: 'Park', // Valid category
        },
        geometry: { type: 'Point', coordinates: [3, 4] },
      });

      const res = await request(app)
        .get('/api/locs/all')
        .set('Authorization', `${generateToken('Admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });
  });

  describe('POST /api/locs/cat', () => {
    it('should return matching categories', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 4,
          category: 'Museum', // Valid category
          loc_name: 'Cat A',
          address: 'Addr',
          description: 'Desc',
          restricted: false,
        },
        geometry: { type: 'Point', coordinates: [1, 2] },
      });

      const res = await request(app)
        .post('/api/locs/cat')
        .send({ categories: ['Museum'] }) // Ensure category exists in the enum
        .set('Authorization', `${generateToken('User')}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/locs/location/:id', () => {
    it('should return a location by ID', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 5,
          loc_name: 'Find Me',
          address: 'Somewhere',
          description: 'Here',
          restricted: false,
          category: 'Shop', // Valid category
        },
        geometry: { type: 'Point', coordinates: [1, 2] },
      });

      const res = await request(app)
        .get('/api/locs/location/5')
        .set('Authorization', `${generateToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.properties.loc_name).toBe('Find Me');
    });
  });

  describe('POST /api/locs/location', () => {
    it('should create a new location', async () => {
      const res = await request(app)
        .post('/api/locs/location')
        .send({
          category: 'Restaurant', // Valid category
          loc_name: 'New Loc',
          address: 'New Addr',
          description: 'New Desc',
          coordinates: [10, 20],
          restricted: false,
        })
        .set('Authorization', `${generateToken('Admin')}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.properties.loc_name).toBe('New Loc');
    });
  });

  describe('POST /api/locs/bulk', () => {
    it('should insert multiple valid locations and skip duplicates/invalids', async () => {
      await Location.create({
        type: 'Feature',
        properties: { id: 100, category: 'Shop', loc_name: 'Dup', address: 'Dup', description: 'Dup', restricted: false },
        geometry: { type: 'Point', coordinates: [0, 0] },
      });

      const res = await request(app)
        .post('/api/locs/bulk')
        .send([
          { id: 100, loc_name: 'Dup', address: 'Dup', description: 'Dup', category: 'Shop', restricted: false, coordinates: [1, 2] },
          { id: 101, loc_name: 'Bulk1', address: 'Addr1', description: 'Desc1', category: 'Museum', restricted: false, coordinates: [1, 2] }, // Valid category
          { loc_name: 'Missing ID', address: 'No ID', description: 'Oops', category: 'Other', coordinates: [1] }, // Valid category
        ])
        .set('Authorization', `${generateToken('Admin')}`);

      expect(res.status).toBe(201);
      expect(res.body.success.count).toBe(2);
      expect(res.body.failures.count).toBe(1);
    });
  });

  describe('PUT /api/locs/location', () => {
    it('should update a location', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 999,
          loc_name: 'ToUpdate',
          address: 'Old Addr',
          description: 'Old',
          restricted: false,
          category: 'Restroom', // Valid category
        },
        geometry: { type: 'Point', coordinates: [1, 2] },
      });

      const res = await request(app)
        .put('/api/locs/location')
        .send({
          id: 999,
          loc_name: 'Updated',
          address: 'New Addr',
          description: 'New Desc',
          category: 'Restaurant', // Valid category
          restricted: true,
          email: 'new@example.com',
          phone: '12345678',
          site: 'example.com',
          coordinates: [5, 6],
        })
        .set('Authorization', `${generateToken('Admin')}`);

      expect(res.status).toBe(200);
      expect(res.body[0].properties.loc_name).toBe('Updated');
    });
  });

  describe('DELETE /api/locs/location/:id', () => {
    it('should delete a location by ID', async () => {
      await Location.create({
        type: 'Feature',
        properties: {
          id: 111,
          loc_name: 'Delete Me',
          address: 'Gone',
          description: 'Bye',
          restricted: false,
          category: 'Other', // Valid category
        },
        geometry: { type: 'Point', coordinates: [0, 0] },
      });

      const res = await request(app)
        .delete('/api/locs/location/111')
        .set('Authorization', `${generateToken('Admin')}`);

      expect(res.status).toBe(200);
      const check = await Location.findOne({ 'properties.id': 111 });
      expect(check).toBeNull();
    });
  });
});
