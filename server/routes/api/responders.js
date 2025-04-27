// c:\TA911\FinalProjectGIS4Webiks\server\routes\api\responders.js

const express = require('express');
const router = express.Router();

// Import ResponderUnit model
const ResponderUnit = require('../../models/ResponderUnit'); // Adjust path if needed

// @route   GET api/responders
// @desc    Get all responder units
// @access  Public (or Private if you add authentication)
router.get('/', async (req, res) => {
    try {
        // Fetch all responders from the database
        const responders = await ResponderUnit.find();
        console.log("GET /api/responders hit");
        res.json(responders); // Send the actual responders found
    } catch (err) {
        console.error("Error in GET /api/responders:", err.message);
        res.status(500).send('Server Error');
    }
});

// Add other routes for responders if needed (POST, PUT, DELETE, GET by ID)

module.exports = router; // Export the router
