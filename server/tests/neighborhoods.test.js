const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const Neighborhood = require("../models/NeighborhoodModel");

// Mock authMiddleware and isAdmin
jest.mock("../middleware/authMiddleware", () => ({
  authMiddleware: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
}));

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

afterEach(async () => {
  await Neighborhood.deleteMany();
});

describe("Neighborhoods API", () => {
  const base = "/api/neighborhoods";

  const sampleNeighborhood = {
    city: "TestCity",
    neighborhood: "TestNeighborhood",
    id: 1,
    coordinates: [
      [34.0, 32.0],
      [34.1, 32.0],
      [34.1, 32.1],
      [34.0, 32.1],
      [34.0, 32.0]
    ]
  };

  it("should create a new neighborhood", async () => {
    const res = await request(app).post(`${base}/neighborhood`).send(sampleNeighborhood);
    expect(res.status).toBe(201);
    expect(res.body.data.properties.city).toBe("TestCity");
  });

  it("should get all neighborhoods with pagination", async () => {
    await Neighborhood.create({
      type: "Feature",
      properties: {
        city: "CityA",
        neighborhood: "A",
        id: 1
      },
      geometry: {
        type: "Polygon",
        coordinates: [[ [34, 32], [34.1, 32], [34.1, 32.1], [34, 32.1], [34, 32] ]]
      }
    });

    const res = await request(app).get(`${base}/neighborhoods?page=1&size=10`);
    expect(res.status).toBe(200);
    expect(res.body.neighborhoods.length).toBe(1);
  });

  it("should get a neighborhood by ID", async () => {
    await Neighborhood.create({
      type: "Feature",
      properties: { city: "City", neighborhood: "Name", id: 42 },
      geometry: {
        type: "Polygon",
        coordinates: [[ [34, 32], [34.1, 32], [34.1, 32.1], [34, 32.1], [34, 32] ]]
      }
    });

    const res = await request(app).get(`${base}/neighborhood/42`);
    expect(res.status).toBe(200);
    expect(res.body.properties.id).toBe(42);
  });

  it("should return 404 if neighborhood ID not found", async () => {
    const res = await request(app).get(`${base}/neighborhood/999`);
    expect(res.status).toBe(404);
  });

  it("should find neighborhood by position", async () => {
    await Neighborhood.create({
      type: "Feature",
      properties: { city: "GeoCity", neighborhood: "GeoHood", id: 99 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [34.0, 32.0],
          [34.2, 32.0],
          [34.2, 32.2],
          [34.0, 32.2],
          [34.0, 32.0]
        ]]
      }
    });

    const res = await request(app).get(`${base}/position?lng=34.1&lat=32.1`);
    expect(res.status).toBe(200);
    expect(res.body.properties.id).toBe(99);
  });

  it("should return 404 when no neighborhood found for position", async () => {
    const res = await request(app).get(`${base}/position?lng=1&lat=1`);
    expect(res.status).toBe(404);
  });

  it("should update a neighborhood", async () => {
    await Neighborhood.create({
      type: "Feature",
      properties: { city: "Old", neighborhood: "Old", id: 5 },
      geometry: {
        type: "Polygon",
        coordinates: [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]
      }
    });

    const updatedData = {
      id: 5,
      city: "NewCity",
      neighborhood: "NewName",
      coordinates: [
        [34.0, 32.0],
        [34.1, 32.0],
        [34.1, 32.1],
        [34.0, 32.1],
        [34.0, 32.0]
      ]
    };

    const res = await request(app).put(`${base}/neighborhood`).send(updatedData);
    expect(res.status).toBe(200);
    expect(res.body[0].properties.city).toBe("NewCity");
  });

  it("should delete a neighborhood", async () => {
    await Neighborhood.create({
      type: "Feature",
      properties: { city: "Del", neighborhood: "Del", id: 7 },
      geometry: {
        type: "Polygon",
        coordinates: [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]
      }
    });

    const res = await request(app).delete(`${base}/neighborhood/7`);
    expect(res.status).toBe(200);
  });

  it("should handle bulk insert", async () => {
    const res = await request(app)
      .post(`${base}/bulk`)
      .send([
        {
          city: "City1",
          neighborhood: "N1",
          id: 100,
          coordinates: [[34, 32], [34.1, 32], [34.1, 32.1], [34, 32.1], [34, 32]]
        },
        {
          city: "City2",
          neighborhood: "N2",
          id: 101,
          coordinates: [[34, 32], [34.2, 32], [34.2, 32.2], [34, 32.2], [34, 32]]
        }
      ]);
    expect(res.status).toBe(201);
    expect(res.body.success.count).toBe(2);
  });

  it("should handle bulk insert with invalid entry", async () => {
    const res = await request(app)
      .post(`${base}/bulk`)
      .send([
        {
          city: "City1",
          neighborhood: "N1",
          id: 100,
          coordinates: [[34, 32], [34.1, 32], [34.1, 32.1], [34, 32.1], [34, 32]]
        },
        {
          id: 102,
          coordinates: [[34, 32]]
        }
      ]);
    expect(res.status).toBe(201);
    expect(res.body.failures.count).toBe(1);
  });
});
