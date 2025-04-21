const express = require('express');
const router = express.Router();
const Location = require('../models/LocationModel');
const {authMiddleware, isAdmin, isAdvanced} = require('../middleware/authMiddleware');

// Get all locations with pagination
router.get("/", authMiddleware, async (req, res) => {
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

        // Determine query based on user role
        const query = req.user && (req.user.role === 'Confidential' || req.user.role === 'Admin')
            ? {} // Fetch all records
            : { 'properties.restricted': false }; // Fetch only non-restricted records


        // Get total count of locations
        const totalCount = await Location.countDocuments(query);

        // Get locations with pagination
        const locations = await Location.find(query)
            .lean()
            .skip(skip)
            .limit(size);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / size);

        // Send response with pagination info
        res.json({
            locations: locations,
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
        console.error("Error fetching locations:", error);
        res.status(500).json({ message: "Server error" });
    } 
});

// Get all locations without pagination
router.get("/all", authMiddleware, async (req, res) => {
    try {
        // Determine query based on user role
        const query = req.user && (req.user.role === 'Confidential' || req.user.role === 'Admin')
            ? {} // Fetch all records
            : { 'properties.restricted': false }; // Fetch only non-restricted records

        // Fetch all locations from the database
        const locations = await Location.find(query).lean();

        // Send the response with all locations
        res.json({
            locations: locations,
            total: locations.length, // Include the total count of locations
        });
    } catch (error) {
        console.error("Error fetching all locations:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get locations by categories
router.get("/cat", authMiddleware, async (req, res) => {
    try {
        const { categories } = req.body;

        // Validate that categories is an array and has at least one category
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                message: "Request body must include an array of at least one category"
            });
        }

        // Determine query based on user role
        const query = {
            'properties.category': { $in: categories },
            ...(req.user && (req.user.role === 'Confidential' || req.user.role === 'Admin')
                ? {} // Fetch all records for Confidential/Admin users
                : { 'properties.restricted': false } // Fetch only non-restricted records for other users
            )
        };

        // Fetch locations matching the query
        const locations = await Location.find(query).lean();

        // Send the response with matching locations
        res.json({
            locations: locations,
            total: locations.length // Include the total count of matching locations
        });
    } catch (error) {
        console.error("Error fetching locations by categories:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get locations by area
router.post("/area", authMiddleware, async (req, res) => {
    try {
        const { categories } = req.body;
        const coordinates = Array.isArray(req.body.coordinates?.[0])
        ? req.body.coordinates[0]
        : req.body.coordinates;

        // Validate that coordinates is an array and forms a valid polygon
        if (!Array.isArray(coordinates) || coordinates.length < 4) {
            return res.status(400).json({
                message: "Coordinates must be an array with at least 4 points to form a valid polygon"
            });
        }

        // Ensure the polygon is closed (first and last points must be the same)
        const firstPoint = coordinates[0];
        const lastPoint = coordinates[coordinates.length - 1];
        if (JSON.stringify(firstPoint) !== JSON.stringify(lastPoint)) {
            return res.status(400).json({
                message: "The polygon must be closed (first and last points must be the same)"
            });
        }

        // Validate categories if provided
        let categoryFilter = {};
        if (categories) {
            if (!Array.isArray(categories) || categories.length === 0) {
                return res.status(400).json({
                    message: "Categories must be an array with at least one category"
                });
            }
            categoryFilter = { 'properties.category': { $in: categories } };
        }

        // Build the query
        const query = {
            geometry: {
                $geoIntersects: {
                    $geometry: {
                        type: "Polygon",
                        coordinates: [coordinates] // MongoDB expects an array of arrays for polygons
                    }
                }
            },
            ...(req.user && (req.user.role === 'Confidential' || req.user.role === 'Admin')
                ? {} // Fetch all records for Confidential/Admin users
                : { 'properties.restricted': false }), // Fetch only non-restricted records for other users
            ...categoryFilter // Apply category filter if provided
        };

        // Fetch locations matching the query
        const locations = await Location.find(query).lean();

        // Send the response with matching locations
        res.json({
            locations: locations,
            total: locations.length // Include the total count of matching locations
        });
    } catch (error) {
        console.error("Error fetching locations by area:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get locations by distance
router.post("/range", authMiddleware, async (req, res) => {
    try {
        const { coordinates, range, categories } = req.body;

        // Validate that point is a valid [longitude, latitude] array
        if (!Array.isArray(coordinates) || coordinates.length !== 2 || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
            return res.status(400).json({
                message: "Point must be an array of two numbers [longitude, latitude]"
            });
        }

        // Validate that range is a positive number
        if (typeof range !== 'number' || range <= 0) {
            return res.status(400).json({
                message: "Range must be a positive number (in meters)"
            });
        }

        // Validate categories if provided
        let categoryFilter = {};
        if (categories) {
            if (!Array.isArray(categories) || categories.length === 0) {
                return res.status(400).json({
                    message: "Categories must be an array with at least one category"
                });
            }
            categoryFilter = { 'properties.category': { $in: categories } };
        }

        // Build the query
        const query = {
            geometry: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates // Input point [longitude, latitude]
                    },
                    $maxDistance: range // Range in meters
                }
            },
            ...(req.user && (req.user.role === 'Confidential' || req.user.role === 'Admin')
                ? {} // Fetch all records for Confidential/Admin users
                : { 'properties.restricted': false }), // Fetch only non-restricted records for other users
            ...categoryFilter // Apply category filter if provided
        };

        // Fetch locations matching the query
        const locations = await Location.find(query).lean();

        // Send the response with matching locations
        res.json({
            locations: locations,
            total: locations.length // Include the total count of matching locations
        });
    } catch (error) {
        console.error("Error fetching locations by distance:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get location by ID
router.get("/location/:id", authMiddleware, async (req, res) => {
    try {
        const locationId = Number(req.params.id);
        if (isNaN(locationId)) {
            return res.status(400).json({ message: "Invalid location ID" });
        }
        const location = await Location.findOne({ 'properties.id': locationId });
        
        if (!location) {
            return res.status(404).json({ message: "Location not found" });
        }
        res.json(location);
    } catch (error) {
        console.error("Error fetching location:", error);
        res.status(500).json({ message: "Server error" });
    }   
});


//Create a new location
router.post("/location", authMiddleware, isAdmin, async (req, res) => {
    try {
      // Extract data from request body
      const { id, category, loc_name, address, description, restricted, email, phone, site, loc_status, photo, coordinates } = req.body;
      
      // Validate required fields
      if (!category || !loc_name || !address || !description || !coordinates) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: category, loc_name, address, description, and coordinates are required'
        });
      }
      
      // If id is not provided, find the max id and increment
      let newId = id;
      if (newId === undefined) {
        const maxIdDocument = await Location.findOne({})
          .sort({ 'properties.id': -1 }) // Sort by id in descending order
          .select('properties.id') // Only select the id field
          .lean(); // Return plain JavaScript object
        
        newId = maxIdDocument ? maxIdDocument.properties.id + 1 : 1; // If no documents exist, start with 1
      }

      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({
          message: 'Coordinates must be a valid [longitude, latitude] pair'
        });
    }
      
      // Create new location document
      const newLocation = new Location({
        type: "Feature",
        properties: {
            id: newId,
            category: category,
            loc_name: loc_name,
            address: address,
            description: description,
            restricted: restricted,
            email: email,
            phone: phone,
            site: site,
            loc_status: loc_status,
            photo: photo
        },
        geometry: {
          type: "Point",
          coordinates: coordinates // Expecting coordinates to be an array of [lon, lat] pairs
        }
      });
      
      // Save to database
      const savedLocation = await newLocation.save();
      
      // Return success response
      return res.status(201).json({
        success: true,
        data: savedLocation
      });
      
    } catch (error) {
      console.error('Error creating location:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while creating location',
        error: error.message
      });
    }
  });

  // Bulk insert locations
  router.post("/bulk", authMiddleware, isAdmin, async (req, res) => {
    try {
        const locations = req.body;        

        const ids = locations.map(n => n.id).filter(id => id !== undefined);

        // Find existing locations to avoid duplicates
        const existing = await Location.find({ 'properties.id': { $in: ids } })
            .select('properties.id')
            .lean();
        const existingIds = new Set(existing.map(n => n.properties.id));

        const toInsert = [];
        const errors = [];

        for (const n of locations) {
            const { id, category, loc_name, address, description, restricted, email, phone, site, loc_status, photo, coordinates } = n;

            if (existingIds.has(id)) {
                errors.push({ id, error: 'Location ID already exists' });
                continue;
            }

            if (!category || !loc_name || !address || !description || !Array.isArray(coordinates) || coordinates.length !== 2) {
                errors.push({ id, error: 'Missing or invalid data' });
                continue;
            }

            toInsert.push({
                type: "Feature",
                properties: { id,category, loc_name, address, description, restricted, email, phone, site, loc_status, photo },
                geometry: {
                    type: "Point",
                    coordinates: coordinates
                }
            });
        }

        let insertedDocs = [];
        if (toInsert.length > 0) {
            insertedDocs = await Location.insertMany(toInsert, { ordered: false });
        }

        const allLocations = await Location.find({});

        res.status(201).json({
            success: {
                count: insertedDocs.length,
                locations: insertedDocs.map(doc => doc.properties.id)
            },
            failures: {
                count: errors.length,
                errors: errors
            },
            allLocations: allLocations
        });

    } catch (error) {
        console.error("Error in bulk location insert:", error);
        res.status(500).json({ 
            error: 'Bulk insert failed', 
            details: error.message 
        });
    }
});

// Update location
router.put("/location", authMiddleware, isAdmin, async (req, res) => {
    const { id, category, loc_name, address, description, restricted, email, phone, site, loc_status, coordinates } = req.body;
    if (!id) {
        return res.status(400).json({ message: "ID of the location is required" });
    }

    try {        
        const updateData = {
            $set: {
                'properties.category': category,
                'properties.loc_name': loc_name,
                'properties.address': address,
                'properties.description': description,
                'properties.restricted': restricted,
                'properties.email': email,
                'properties.phone': phone,
                'properties.site': site,
                'properties.loc_status': loc_status,
                'properties.photo': photo,
                'geometry.coordinates': coordinates              
            }
        };

        const updatedLocation = await Location.findOneAndUpdate(
            { 'properties.id': id },
            updateData,
            { new: true }
        );
        
        if (!updatedLocation) {
            return res.status(404).json({ message: "Location not found" });
        }
        
        const locations = await Location.find({});
        res.json(locations);
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete locations
router.delete("/location/:id", authMiddleware, isAdmin, async (req, res) => {
    try {
        const locationId = Number(req.params.id);
        if (isNaN(locationId)) {
            return res.status(400).json({ message: "Invalid location ID" });
        }
        const result = await Location.findOneAndDelete({ 'properties.id': locationId });
       
        if (!result) {
            return res.status(404).json({ message: "Location not found" });
        }

        const locations = await Location.find({});
        res.json(locations);
    } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;