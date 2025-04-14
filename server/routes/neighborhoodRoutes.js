const express = require('express');
const router = express.Router();
const Neighborhood = require('../models/NeighborhoodModel');
const {authMiddleware, isAdmin} = require('../middleware/authMiddleware');

// Get all neighborhoods with pagination
router.get("/neighborhoods", authMiddleware, async (req, res) => {
    try {
        // Get pagination parameters from query string
        const size = parseInt(req.query.size) || 10000;
        const page = parseInt(req.query.page) || 1;
        
        // Validate parameters
        if (size < 1 || page < 1) {
            return res.status(400).json({ 
                message: "Size and page parameters must be positive integers" 
            });
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * size;

        // Get total count of neighborhoods
        const totalCount = await Neighborhood.countDocuments({});

        // Get neighborhoods with pagination
        const neighborhoods = await Neighborhood.find({})
            .lean()
            .skip(skip)
            .limit(size);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / size);

        // Send response with pagination info
        res.json({
            neighborhoods: neighborhoods,
            pagination: {
                total: totalCount,
                pageSize: size,
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error("Error fetching neighborhoods:", error);
        res.status(500).json({ message: "Server error" });
    } 
});

// Get neighborhood by ID
router.get("/neighborhood/:id", authMiddleware, async (req, res) => {
    try {
        const neighborhoodId = Number(req.params.id);
        const neighborhood = await Neighborhood.findOne({ 'properties.id': neighborhoodId });
        
        if (!neighborhood) {
            return res.status(404).json({ message: "Neighborhood not found" });
        }
        res.json(neighborhood);
    } catch (error) {
        console.error("Error fetching neighborhood:", error);
        res.status(500).json({ message: "Server error" });
    }   
});

// Get neighborhood by position (coordinates)
router.get("/position", authMiddleware, async (req, res) => {
    try {
        // Get longitude and latitude from query parameters
        const longitude = parseFloat(req.query.lng);
        const latitude = parseFloat(req.query.lat);
        
        // Validate parameters
        if (isNaN(longitude) || isNaN(latitude)) {
            return res.status(400).json({ 
                message: "Valid longitude (lng) and latitude (lat) parameters are required" 
            });
        }
        
        // Find neighborhood containing this point using MongoDB's geospatial query
        const neighborhood = await Neighborhood.findOne({
            'geometry': {
                $geoIntersects: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude]  // GeoJSON format: [longitude, latitude]
                    }
                }
            }
        });
        
        if (!neighborhood) {
            return res.status(404).json({ 
                message: "No neighborhood found containing this position" 
            });
        }
        
        res.json(neighborhood);
    } catch (error) {
        console.error("Error finding neighborhood by position:", error);
        res.status(500).json({ message: "Server error" });
    }
});

//Create a new neighborhood
router.post("/neighborhood", authMiddleware, isAdmin, async (req, res) => {
    try {
      // Extract data from request body
      const { city, neighborhood, id, coordinates } = req.body;
      
      // Validate required fields
      if (!city || !neighborhood || !coordinates) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: city, neighborhood, and coordinates are required' 
        });
      }
      
      // If id is not provided, find the max id and increment
      let newId = id;
      if (newId === undefined) {
        const maxIdDocument = await Neighborhood.findOne({})
          .sort({ 'properties.id': -1 }) // Sort by id in descending order
          .select('properties.id') // Only select the id field
          .lean(); // Return plain JavaScript object
        
        newId = maxIdDocument ? maxIdDocument.properties.id + 1 : 1; // If no documents exist, start with 1
      }
      
      // Create new neighborhood document
      const newNeighborhood = new Neighborhood({
        type: "Feature",
        properties: {
          city,
          neighborhood,
          id: newId
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates] // Expecting coordinates to be an array of [lon, lat] pairs
        }
      });
      
      // Save to database
      const savedNeighborhood = await newNeighborhood.save();
      
      // Return success response
      return res.status(201).json({
        success: true,
        data: savedNeighborhood
      });
      
    } catch (error) {
      console.error('Error creating neighborhood:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while creating neighborhood',
        error: error.message
      });
    }
  });

  // Bulk insert neighborhoods
  router.post("/neighborhoods/bulk", authMiddleware, isAdmin, async (req, res) => {
    try {
        const neighborhoods = req.body;

        if (!Array.isArray(neighborhoods)) {
            return res.status(400).json({ 
                error: 'Request body must be an array of neighborhoods' 
            });
        }

        const ids = neighborhoods.map(n => n.id).filter(id => id !== undefined);

        // Find existing neighborhoods to avoid duplicates
        const existing = await Neighborhood.find({ 'properties.id': { $in: ids } })
            .select('properties.id')
            .lean();
        const existingIds = new Set(existing.map(n => n.properties.id));

        const toInsert = [];
        const errors = [];

        for (const n of neighborhoods) {
            const { city, neighborhood, id, coordinates } = n;

            if (existingIds.has(id)) {
                errors.push({ id, error: 'Neighborhood ID already exists' });
                continue;
            }

            if (!city || !neighborhood || !Array.isArray(coordinates)) {
                errors.push({ id, error: 'Missing or invalid data' });
                continue;
            }

            toInsert.push({
                type: "Feature",
                properties: { city, neighborhood, id },
                geometry: {
                    type: "Polygon",
                    coordinates: [coordinates]
                }
            });
        }

        let insertedDocs = [];
        if (toInsert.length > 0) {
            insertedDocs = await Neighborhood.insertMany(toInsert, { ordered: false });
        }

        const allNeighborhoods = await Neighborhood.find({});

        res.status(201).json({
            success: {
                count: insertedDocs.length,
                neighborhoods: insertedDocs.map(doc => doc.properties.id)
            },
            failures: {
                count: errors.length,
                errors: errors
            },
            allNeighborhoods: allNeighborhoods
        });

    } catch (error) {
        console.error("Error in bulk neighborhood insert:", error);
        res.status(500).json({ 
            error: 'Bulk insert failed', 
            details: error.message 
        });
    }
});

// Update neighborhood
router.put("/neighborhood", authMiddleware, isAdmin, async (req, res) => {
    const { city, neighborhood, id, coordinates } = req.body;
    if (!id) {
        return res.status(400).json({ message: "ID of the neighborhood is required" });
    }

    try {        
        const updateData = {
            $set: {
                'properties.city': city,
                'properties.neigborhood': neighborhood,
                'geometry.coordinates': coordinates              
            }
        };

        const updatedNeighborhood = await Neighborhood.findOneAndUpdate(
            { 'properties.id': id },
            updateData,
            { new: true }
        );
        
        if (!updatedNeighborhood) {
            return res.status(404).json({ message: "Neighborhood not found" });
        }
        
        const neighborhoods = await Neighborhood.find({});
        res.json(neighborhoods);
    } catch (error) {
        console.error("Error updating neighborhood:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete neighborhoods
router.delete("/neighborhood/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const neighborhoodId = Number(req.params.id);
        const result = await Neighborhood.findOneAndDelete({ 'properties.id': neighborhoodId });
       
        if (!result) {
            return res.status(404).json({ message: "Neighborhood not found" });
        }

        const neighborhoods = await Neighborhood.find({});
        res.json(neighborhoods);
    } catch (error) {
        console.error("Error deleting neighborhood:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;