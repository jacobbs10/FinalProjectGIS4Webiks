const mongoose = require('mongoose');

const NeighborhoodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    required: true
  },
  properties: {
    city: {
      type: String,
      required: true
    },
    neighborhood: {
      type: String,
      required: true
    },
    id: {
      type: Number,
      required: true,
      unique: true
    }
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of arrays of numbers
      required: true
    }
  }
}, { collection: 'Neighborhoods' });

// Create a 2dsphere index on the geometry field for geospatial queries
NeighborhoodSchema.index({ geometry: '2dsphere' });
//NeighborhoodSchema.index({ 'properties.id': 1 });
NeighborhoodSchema.index({ 'properties.city': 1, 'properties.neighborhood': 1 });

module.exports = mongoose.model('Neighborhood', NeighborhoodSchema);