// routes/incidentRoutes.js
const express = require('express');
const Incident = require('../models/Incident'); // Adjust path
const incidentGenerator = require('../services/incidentGenerator'); // Adjust path
const router = express.Router();

// POST /api/incidents - Create Incident Manually
router.post('/', async (req, res) => {
    try {
        // Add validation for req.body fields here
        const incidentData = { ...req.body, timestamp: new Date(), isAutomatic: false };
        const newIncident = new Incident(incidentData);
        await newIncident.save();
        res.status(201).json({ id: newIncident._id, message: "Incident created" }); // Send back ID or full object
    } catch (error) {
        console.error("Error creating manual incident:", error);
        res.status(500).json({ message: "Failed to create incident", error: error.message });
    }
});

// POST /api/incidents/generator/start - Start Automatic Generator
router.post('/generator/start', (req, res) => {
    const { interval } = req.body; // Interval in seconds from frontend
    if (typeof interval !== 'number' || interval < 5) {
        return res.status(400).json({ message: "Invalid interval provided (must be number, >= 5)." });
    }
    const result = incidentGenerator.startGenerator(interval);
    if (result.success) {
        res.status(200).json({ message: result.message });
    } else {
         // Use 409 Conflict if already running, 400 for bad input
        const statusCode = result.message.includes("already running") ? 409 : 400;
        res.status(statusCode).json({ message: result.message });
    }
});

// POST /api/incidents/generator/stop - Stop Automatic Generator
router.post('/generator/stop', (req, res) => {
    const result = incidentGenerator.stopGenerator();
     if (result.success) {
        res.status(200).json({ message: result.message });
    } else {
        // Use 409 Conflict if already stopped
        res.status(409).json({ message: result.message });
    }
});

// GET /api/incidents/generator/status - Get Generator Status
router.get('/generator/status', (req, res) => {
    res.status(200).json(incidentGenerator.getStatus());
});

// GET /api/incidents - Fetch existing incidents (you likely have this already)
router.get('/', async (req, res) => {
    try {
        const incidents = await Incident.find().sort({ timestamp: -1 }).limit(100); // Example query
        res.status(200).json(incidents);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch incidents", error: error.message });
    }
});


module.exports = router;
