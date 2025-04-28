// routes/incidentRoutes.js
const express = require('express');
const Incident = require('../models/Incident'); // Adjust path if needed
const ResponderUnit = require('../models/ResponderUnit'); // Adjust path if needed
const incidentGenerator = require('../services/incidentGenerator'); // Adjust path
const simulationManager = require('../simulationManager'); // Import simulation manager
const { authMiddleware } = require('../middleware/authMiddleware'); // Import auth middleware if needed

const router = express.Router();

// --- Existing Routes ---

// POST /api/incidents - Create Incident Manually
router.post('/', async (req, res) => {
    // ... (keep existing code)
});

// POST /api/incidents/generator/start - Start Automatic Generator
router.post('/generator/start', (req, res) => {
    // ... (keep existing code)
});

// POST /api/incidents/generator/stop - Stop Automatic Generator
router.post('/generator/stop', (req, res) => {
    // ... (keep existing code)
});

// GET /api/incidents/generator/status - Get Generator Status
router.get('/generator/status', (req, res) => {
    // ... (keep existing code)
});

// GET /api/incidents - Fetch existing incidents
router.get('/', async (req, res) => {
    // ... (keep existing code)
});


// --- NEW DISPATCH ROUTE ---
// POST /api/incidents/:incidentId/dispatch
// Dispatches a specific responder unit to a specific incident
router.post('/:incidentId/dispatch', authMiddleware, async (req, res) => { // Added authMiddleware example
    try {
        const { unitId } = req.body; // Expect unitId in the request body
        const incidentId = req.params.incidentId;
        const io = req.io; // Get the io instance passed via middleware in server.js

        if (!unitId) {
            return res.status(400).json({ message: 'Missing unitId in request body' });
        }
        if (!incidentId) {
            return res.status(400).json({ message: 'Missing incidentId in route parameters' });
        }
        if (!io) {
            console.error("Socket.IO instance (io) not found on request object. Check server middleware.");
            return res.status(500).json({ message: 'Internal server configuration error (Socket.IO)' });
        }

        // --- Fetch documents ---
        const incident = await Incident.findById(incidentId);
        const unit = await ResponderUnit.findById(unitId);

        if (!incident) {
            return res.status(404).json({ message: `Incident not found with ID: ${incidentId}` });
        }
        if (!unit) {
            return res.status(404).json({ message: `Responder unit not found with ID: ${unitId}` });
        }

        // --- Pre-dispatch checks (customize as needed) ---
        if (unit.status !== 'available') {
            return res.status(409).json({ message: `Unit ${unit.unitId} is not available (current status: ${unit.status})` });
        }
        if (['resolved', 'cancelled'].includes(incident.status)) {
             return res.status(409).json({ message: `Incident ${incidentId} is already ${incident.status}` });
        }

        // --- Calculate Route (Placeholder) ---
        // TODO: Replace this with your actual route calculation logic
        // This function should take start (unit.currentLocation) and end (incident.location)
        // and return { routeGeometry: GeoJSON LineString, durationSeconds: number }
        const calculateRoute = async (startCoords, endCoords) => {
            console.warn("Using placeholder route calculation!");
            // Simple straight line for placeholder
            const routeCoords = [startCoords.coordinates, endCoords.coordinates];
            // Estimate duration based on straight-line distance (very rough!)
            // Using a placeholder speed like 50 km/h (approx 13.8 m/s)
            const turf = require('@turf/helpers');
            const turfDistance = require('@turf/distance').default;
            const distanceKm = turfDistance(turf.point(startCoords.coordinates), turf.point(endCoords.coordinates), { units: 'kilometers' });
            const estimatedSeconds = (distanceKm / 50) * 3600; // distance / speed(km/h) * seconds/hour

            return {
                routeGeometry: { type: 'LineString', coordinates: routeCoords },
                durationSeconds: Math.max(10, Math.round(estimatedSeconds)) // Ensure minimum duration
            };
        };

        const routeData = await calculateRoute(unit.currentLocation, incident.location);
        if (!routeData || !routeData.routeGeometry || !routeData.durationSeconds) {
             throw new Error("Route calculation failed or returned invalid data.");
        }
        // --- Update Unit Status and Route Info ---
        unit.status = 'enroute';
        unit.assignedIncidentId = incident._id;
        unit.currentRoute = routeData.routeGeometry;
        unit.estimatedRouteDuration = routeData.durationSeconds;
        unit.routeStartTime = new Date();

        // --- Save the updated unit ---
        const updatedUnit = await unit.save();

        // --- Update Incident Status (Optional) ---
        if (incident.status === 'reported') {
            incident.status = 'dispatching'; // Or directly to 'enroute' if this is the first unit
            await incident.save();
        }

        // --- !!! TRIGGER THE SIMULATION !!! ---
        console.log(`Dispatching unit ${updatedUnit.unitId} (${updatedUnit._id}) to incident ${incident._id}. Starting simulation.`);
        simulationManager.startSimulation(updatedUnit, incident, io);
        // --------------------------------------

        // --- Send Response ---
        res.status(200).json({
            message: `Unit ${updatedUnit.unitId} dispatched to incident ${incidentId}`,
            data: updatedUnit // Send back the updated unit details
        });

    } catch (error) {
        console.error('Error during dispatch:', error);
        // Handle specific errors like CastError for invalid IDs
        if (error.name === 'CastError') {
             return res.status(400).json({ message: 'Invalid ID format provided.' });
        }
        res.status(500).json({ message: 'Failed to dispatch unit', error: error.message });
    }
});


module.exports = router;
