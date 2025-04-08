const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { check, validationResult } = require('express-validator');

// Get all locations
router.get('/', async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get locations within a radius
router.get('/nearby', [
  check('longitude').isFloat(),
  check('latitude').isFloat(),
  check('radius').isFloat()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { longitude, latitude, radius } = req.query;
    const locations = await Location.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      }
    });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new location
router.post('/', [
  check('name').not().isEmpty(),
  check('location.coordinates').isArray({ min: 2, max: 2 }),
  check('type').isIn(['public_resource', 'environmental', 'property', 'transportation', 'emergency'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const location = new Location(req.body);
  try {
    const newLocation = await location.save();
    res.status(201).json(newLocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router; 