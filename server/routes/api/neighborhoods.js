// c:\TA911\FinalProjectGIS4Webiks\server\routes\api\hood.js
const express = require('express');
const router = express.Router();

// Assuming you have neighborhood data stored somewhere (e.g., a model or file)
// const Neighborhood = require('../../models/Neighborhood'); // Or load from file

// @route   GET api/hood/neighborhoods
// @desc    Get neighborhood data
// @access  Public (or Private)
router.get('/neighborhoods', async (req, res) => {
    try {
        // --- Replace this with your actual data fetching logic ---
        console.log("GET /api/hood/neighborhoods hit");
        // Example: const neighborhoodsData = await Neighborhood.find();
        // Example: const neighborhoodsData = require('../../data/neighborhoods.geojson');
        const neighborhoodsData = [ // Placeholder data
            { name: "Neighborhood A", id: 1 },
            { name: "Neighborhood B", id: 2 }
        ];
        // --- End of data fetching logic ---

        res.json(neighborhoodsData);
    } catch (err) {
        console.error("Error fetching neighborhoods:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
