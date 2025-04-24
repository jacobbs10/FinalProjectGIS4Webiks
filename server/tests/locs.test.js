const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const locationsRouter = require('../routes/locations');
const Location = require('../models/LocationModel');
const User = require('../models/User');
const { authMiddleware, isAdmin, isAdvanced } = require('../middleware/authMiddleware');

// Setup express app
app.use(express.json());
app.use('/api/locations', locationsRouter);

describe('Locations API Routes', () => {
  let adminToken, viewerToken, confToken;
  let mockLocations;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/testdb');
    
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

    // Create regular user
    const conf = new User({
      username: 'conf',
      user_firstname: 'Regular',
      user_lastname: 'User',
      user_cellphone: '9876543210',
      user_email: 'conf@test.com',
      password: 'confpass',
      role: 'Confidential',
    });
    await conf.save();
    confId = user._id.toString();
  
    const res3 = await request(app).post('/api/auth/login').send({
      username: 'conf',
      password: 'confpass'
    });
    confToken = res3.body.token;
  });
    
    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });
    
    // Setup mock data
    mockLocations = [
      {
        type: "Feature",
        properties: {
          id: 1,
          category: "Restaurant",
          loc_name: "Test Restaurant",
          address: "123 Test St",
          description: "A test restaurant",
          restricted: false,
          email: "test@example.com",
          phone: "123-456-7890",
          site: "https://example.com",
          loc_status: true
        },
        geometry: {
          type: "Point",
          coordinates: [-73.9857, 40.7484]
        }
      },
      {
        type: "Feature",
        properties: {
          id: 2,
          category: "Hospital",
          loc_name: "Test Hospital",
          address: "456 Test Ave",
          description: "A test hospital",
          restricted: true,
          email: "hospital@example.com",
          phone: "987-654-3210",
          site: "https://hospital.com",
          loc_status: true
        },
        geometry: {
          type: "Point",
          coordinates: [-74.0060, 40.7128]
        }
      }
    ];
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await Location.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Seed with test data
    await Location.insertMany(mockLocations);
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // GET / (paginated)
  describe('GET /', () => {
    it('should return paginated locations for authenticated user', async () => {
      const response = await request(app)
        .get('/api/locations?page=1&size=10')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(1); // Only non-restricted
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
    });
    
    it('should return all locations for admin user', async () => {
      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(2); // All locations
    });
    
    it('should return all locations for confidential user', async () => {
      const response = await request(app)
        .get('/api/locations')
        .set('Authorization', `${confToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(2); // All locations
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/locations');
      expect(response.status).toBe(401);
    });
    
    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/locations?page=-1&size=0')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(400);
    });
  });

  // GET /all
  describe('GET /all', () => {
    it('should return all non-restricted locations for regular user', async () => {
      const response = await request(app)
        .get('/api/locations/all')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(1);
      expect(response.body.total).toBe(1);
    });
    
    it('should return all locations for admin user', async () => {
      const response = await request(app)
        .get('/api/locations/all')
        .set('Authorization', `${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  // GET /cat (by categories)
  describe('GET /cat', () => {
    it('should return locations filtered by category for regular user', async () => {
      const response = await request(app)
        .get('/api/locations/cat')
        .set('Authorization', `${viewerToken}`)
        .send({ categories: ['Restaurant'] });
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(1);
      expect(response.body.locations[0].properties.category).toBe('Restaurant');
    });
    
    it('should return all matching locations including restricted for admin', async () => {
      const response = await request(app)
        .get('/api/locations/cat')
        .set('Authorization', `${adminToken}`)
        .send({ categories: ['Hospital'] });
      
      expect(response.status).toBe(200);
      expect(response.body.locations.length).toBe(1);
      expect(response.body.locations[0].properties.category).toBe('Hospital');
    });
    
    it('should validate categories parameter', async () => {
      const response = await request(app)
        .get('/api/locations/cat')
        .set('Authorization', `${viewerToken}`)
        .send({ categories: [] });
      
      expect(response.status).toBe(400);
    });
  });

  // POST /area
  describe('POST /area', () => {
    it('should return locations within specified area for regular user', async () => {
      const response = await request(app)
        .post('/api/locations/area')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [
            [-74.01, 40.70],
            [-74.01, 40.80],
            [-73.90, 40.80],
            [-73.90, 40.70],
            [-74.01, 40.70]
          ]
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should apply category filter when specified', async () => {
      const response = await request(app)
        .post('/api/locations/area')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [
            [-74.01, 40.70],
            [-74.01, 40.80],
            [-73.90, 40.80],
            [-73.90, 40.70],
            [-74.01, 40.70]
          ],
          categories: ['Restaurant']
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should validate coordinates are properly formatted', async () => {
      const response = await request(app)
        .post('/api/locations/area')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [[-74.01, 40.70], [-74.01, 40.80]]
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should validate coordinates form a closed polygon', async () => {
      const response = await request(app)
        .post('/api/locations/area')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [
            [-74.01, 40.70],
            [-74.01, 40.80],
            [-73.90, 40.80],
            [-73.90, 40.70],
            [-73.95, 40.72] // Not closed (should end with [-74.01, 40.70])
          ]
        });
      
      expect(response.status).toBe(400);
    });
  });

  // POST /range
  describe('POST /range', () => {
    it('should return locations within specified range for regular user', async () => {
      const response = await request(app)
        .post('/api/locations/range')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [-73.9857, 40.7484],
          range: 1000 // 1km
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should apply category filter when specified', async () => {
      const response = await request(app)
        .post('/api/locations/range')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [-73.9857, 40.7484],
          range: 1000,
          categories: ['Restaurant']
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should validate coordinates parameter', async () => {
      const response = await request(app)
        .post('/api/locations/range')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [-73.9857], // Invalid, missing latitude
          range: 1000
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should validate range parameter', async () => {
      const response = await request(app)
        .post('/api/locations/range')
        .set('Authorization', `${viewerToken}`)
        .send({ 
          coordinates: [-73.9857, 40.7484],
          range: -1000 // Negative range
        });
      
      expect(response.status).toBe(400);
    });
  });

  // GET /location/:id
  describe('GET /location/:id', () => {
    it('should return a location by ID', async () => {
      const response = await request(app)
        .get('/api/locations/location/1')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.properties.id).toBe(1);
    });
    
    it('should return 404 if location not found', async () => {
      const response = await request(app)
        .get('/api/locations/location/999')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(404);
    });
    
    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/locations/location/abc')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(400);
    });
  });

  // POST /location (create)
  describe('POST /location', () => {
    it('should create a new location for admin user', async () => {
      const newLocation = {
        category: "Park",
        loc_name: "Test Park",
        address: "789 Park Rd",
        description: "A beautiful park",
        restricted: false,
        email: "park@example.com",
        phone: "555-123-4567",
        site: "https://park.com",
        loc_status: true,
        coordinates: [-73.9712, 40.7831]
      };
      
      const response = await request(app)
        .post('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(newLocation);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.loc_name).toBe("Test Park");
      
      // Should auto-generate ID if not provided
      expect(response.body.data.properties.id).toBeDefined();
    });
    
    it('should use provided ID if specified', async () => {
      const newLocation = {
        id: 100,
        category: "Library",
        loc_name: "Test Library",
        address: "100 Book St",
        description: "A quiet library",
        restricted: false,
        email: "library@example.com",
        phone: "555-789-1234",
        site: "https://library.com",
        loc_status: true,
        coordinates: [-73.9834, 40.7532]
      };
      
      const response = await request(app)
        .post('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(newLocation);
      
      expect(response.status).toBe(201);
      expect(response.body.data.properties.id).toBe(100);
    });
    
    it('should return 400 if required fields are missing', async () => {
      const incompleteLocation = {
        category: "Museum",
        // Missing loc_name and other required fields
        coordinates: [-73.9619, 40.7629]
      };
      
      const response = await request(app)
        .post('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(incompleteLocation);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 403 if user is not admin', async () => {
      const newLocation = {
        category: "Cafe",
        loc_name: "Test Cafe",
        address: "555 Coffee Ave",
        description: "A cozy cafe",
        restricted: false,
        coordinates: [-73.9965, 40.7235]
      };
      
      const response = await request(app)
        .post('/api/locations/location')
        .set('Authorization', `${viewerToken}`)
        .send(newLocation);
      
      expect(response.status).toBe(403);
    });
    
    it('should validate coordinates format', async () => {
      const invalidLocation = {
        category: "Gym",
        loc_name: "Test Gym",
        address: "200 Fitness Blvd",
        description: "A modern gym",
        restricted: false,
        coordinates: [-73.9812] // Missing latitude
      };
      
      const response = await request(app)
        .post('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(invalidLocation);
      
      expect(response.status).toBe(400);
    });
  });

  // POST /bulk
  describe('POST /bulk', () => {
    it('should bulk insert locations for admin user', async () => {
      const bulkLocations = [
        {
          id: 10,
          category: "School",
          loc_name: "Test School",
          address: "300 Education Ln",
          description: "A public school",
          restricted: false,
          coordinates: [-73.9234, 40.7612]
        },
        {
          id: 11,
          category: "Theater",
          loc_name: "Test Theater",
          address: "400 Broadway Ave",
          description: "A historic theater",
          restricted: false,
          coordinates: [-73.9876, 40.7564]
        }
      ];
      
      const response = await request(app)
        .post('/api/locations/bulk')
        .set('Authorization', `${adminToken}`)
        .send(bulkLocations);
      
      expect(response.status).toBe(201);
      expect(response.body.success.count).toBe(2);
      expect(response.body.allLocations.length).toBe(4); // 2 original + 2 new
    });
    
    it('should report failures for invalid locations', async () => {
      const mixedLocations = [
        {
          id: 12,
          category: "Mall",
          loc_name: "Test Mall",
          address: "500 Shopping Ctr",
          description: "A shopping mall",
          restricted: false,
          coordinates: [-73.9543, 40.7832]
        },
        {
          id: 1, // ID collision with existing location
          category: "Duplicate",
          loc_name: "Duplicate Location",
          address: "Duplicate Address",
          description: "Duplicate Description",
          restricted: false,
          coordinates: [-73.9999, 40.7999]
        },
        {
          id: 13,
          // Missing required fields
          loc_name: "Invalid Location"
        }
      ];
      
      const response = await request(app)
        .post('/api/locations/bulk')
        .set('Authorization', `${adminToken}`)
        .send(mixedLocations);
      
      expect(response.status).toBe(201);
      expect(response.body.success.count).toBe(1); // Only the valid one
      expect(response.body.failures.count).toBe(2); // Two failed
    });
    
    it('should return 403 if user is not admin', async () => {
      const bulkLocations = [
        {
          id: 14,
          category: "Store",
          loc_name: "Test Store",
          address: "600 Market St",
          description: "A convenience store",
          restricted: false,
          coordinates: [-73.9432, 40.7721]
        }
      ];
      
      const response = await request(app)
        .post('/api/locations/bulk')
        .set('Authorization', `${viewerToken}`)
        .send(bulkLocations);
      
      expect(response.status).toBe(403);
    });
  });

  // PUT /location
  describe('PUT /location', () => {
    it('should update a location for admin user', async () => {
      const updateData = {
        id: 1,
        category: "Updated Restaurant",
        loc_name: "Updated Test Restaurant",
        address: "123 Updated St",
        description: "An updated test restaurant",
        restricted: true,
        email: "updated@example.com",
        phone: "555-555-5555",
        site: "https://updated.com",
        loc_status: true,
        coordinates: [-73.9857, 40.7484]
      };
      
      const response = await request(app)
        .put('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      
      // Verify update in the returned list
      const updatedLocation = response.body.find(loc => loc.properties.id === 1);
      expect(updatedLocation.properties.loc_name).toBe("Updated Test Restaurant");
    });
    
    it('should return 404 if location not found', async () => {
      const updateData = {
        id: 999,
        category: "Non-existent",
        loc_name: "Does Not Exist",
        address: "Nowhere",
        description: "Does not exist",
        restricted: false,
        coordinates: [-73.9999, 40.7999]
      };
      
      const response = await request(app)
        .put('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 if ID is missing', async () => {
      const updateData = {
        // Missing ID
        category: "Invalid Update",
        loc_name: "Invalid Update",
        address: "Invalid",
        description: "Invalid",
        restricted: false,
        coordinates: [-73.9999, 40.7999]
      };
      
      const response = await request(app)
        .put('/api/locations/location')
        .set('Authorization', `${adminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 403 if user is not admin', async () => {
      const updateData = {
        id: 1,
        category: "Viewer Update",
        loc_name: "Viewer Update",
        address: "Viewer",
        description: "Viewer",
        restricted: false,
        coordinates: [-73.9857, 40.7484]
      };
      
      const response = await request(app)
        .put('/api/locations/location')
        .set('Authorization', `${viewerToken}`)
        .send(updateData);
      
      expect(response.status).toBe(403);
    });
  });

  // DELETE /location/:id
  describe('DELETE /location/:id', () => {
    it('should delete a location for admin user', async () => {
      const response = await request(app)
        .delete('/api/locations/location/1')
        .set('Authorization', `${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); // One location remaining
      
      // Verify the location was deleted
      const deletedLocation = response.body.find(loc => loc.properties.id === 1);
      expect(deletedLocation).toBeUndefined();
    });
    
    it('should return 404 if location not found', async () => {
      const response = await request(app)
        .delete('/api/locations/location/999')
        .set('Authorization', `${adminToken}`);
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 if ID is invalid', async () => {
      const response = await request(app)
        .delete('/api/locations/location/abc')
        .set('Authorization', `${adminToken}`);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 403 if user is not admin', async () => {
      const response = await request(app)
        .delete('/api/locations/location/1')
        .set('Authorization', `${viewerToken}`);
      
      expect(response.status).toBe(403);
    });
  });
});