// c:\TA911\FinalProjectGIS4Webiks\server\routes\api\incidents.js

// --- SECTION 1: Requires (Declare ONCE at the top) ---
const express = require('express');
const router = express.Router();
const Incident = require('../../models/Incident');
const ResponderUnit = require('../../models/ResponderUnit');
const geocodeAddress = require('../../utils/geocoding');
const getRoute = require('../../utils/routing');
const { startSimulation } = require('../../simulationManager'); // Import startSimulation

// --- SECTION 2: Route Definition (Define POST route ONCE) ---
// @route   POST api/incidents
// @desc    Create a new incident, geocode address, and dispatch nearest unit
// @access  Public (adjust as needed)
router.post('/', async (req, res) => {
    // --- Get io instance AT THE BEGINNING of the handler ---
    const io = req.app.get('io');

    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ msg: 'Address is required' });
    }

    try {
        // 1. Geocode Address
        const location = await geocodeAddress(address);
        if (!location) {
            return res.status(400).json({ msg: 'Could not geocode address' });
        }

        // 2. Create Incident in DB
        const newIncident = new Incident({
            address,
            location, // GeoJSON Point { type: 'Point', coordinates: [lon, lat] }
            status: 'new',
            creationTime: new Date(),
        });
        await newIncident.save();

        // 3. Emit 'incident_created' event via WebSocket
        if (io) {
            io.emit('incident_created', newIncident);
            console.log(`Emitted incident_created for ${newIncident._id}`);
        } else {
            console.error("Socket.io instance (io) not found when trying to emit incident_created");
        }

        // --- DISPATCH LOGIC ---
        // 4. Find Nearest Available Responder Unit
        const maxSearchDistance = 50000; // Example: 50km search radius in meters
        let nearestUnit = null;

        try {
            nearestUnit = await ResponderUnit.findOne({
                status: 'available',
                currentLocation: {
                    $near: {
                        $geometry: newIncident.location,
                        $maxDistance: maxSearchDistance,
                    },
                },
            });
        } catch (err) {
            console.error("Error finding nearest unit:", err);
            // Continue, incident is created but dispatch might fail
        }

        // 5. If Unit Found, Proceed with Routing and Dispatch
        if (nearestUnit) {
            console.log(`Found nearest available unit: ${nearestUnit.name}`);

            // 5a. Get Route
            const startCoords = nearestUnit.currentLocation.coordinates;
            const endCoords = newIncident.location.coordinates;
            let routeInfo = null;

            try {
                 routeInfo = await getRoute(startCoords, endCoords);
            } catch(routingError) {
                console.error(`Routing failed for unit ${nearestUnit.name} to incident ${newIncident._id}:`, routingError);
                // Incident is created, but dispatch failed. Log or handle as needed.
            }

            // 5b. If Route Found, Update Records, Emit Dispatch, Start Simulation
            if (routeInfo && routeInfo.routeCoords && routeInfo.duration) {
                const dispatchTime = new Date();

                // Update ResponderUnit document
                nearestUnit.status = 'enroute';
                nearestUnit.assignedIncidentId = newIncident._id;
                nearestUnit.currentRoute = {
                    type: 'LineString',
                    coordinates: routeInfo.routeCoords,
                };
                nearestUnit.estimatedRouteDuration = routeInfo.duration;
                nearestUnit.routeStartTime = dispatchTime;

                // Update Incident document
                newIncident.status = 'assigned';
                newIncident.assignedUnitId = nearestUnit._id;
                newIncident.dispatchTime = dispatchTime;

                // Save updates to DB
                await nearestUnit.save();
                await newIncident.save(); // Save incident again with dispatch info
                console.log(`Unit ${nearestUnit.name} and Incident ${newIncident._id} records updated for dispatch.`);

                // Emit 'responder_dispatched' event via WebSocket
                if (io) {
                    io.emit('responder_dispatched', {
                        unitId: nearestUnit._id.toString(), // Send IDs as strings
                        unitName: nearestUnit.name,
                        incidentId: newIncident._id.toString(),
                        route: nearestUnit.currentRoute,
                        estimatedDuration: nearestUnit.estimatedRouteDuration
                    });
                    console.log(`Emitted responder_dispatched for unit ${nearestUnit.name}`);
                } else {
                   console.error("Socket.io instance (io) not found when trying to emit responder_dispatched");
                }

                // Start the simulation loop for this unit
                // Pass the Mongoose documents and io instance
                startSimulation(nearestUnit, newIncident, io); // <-- Call simulation start HERE

            } else {
                 // Handle case where routing failed
                 console.log(`Could not get route for unit ${nearestUnit.name}. Incident ${newIncident._id} remains unassigned for now.`);
                 // Optionally update incident status to 'dispatch_failed' or similar
            }

        } else {
            // Handle case where no available unit was found
            console.log(`No available units found within ${maxSearchDistance}m for incident ${newIncident._id}`);
            // Incident is created but remains 'new'. Queueing logic could go here.
        }

        // --- End of Dispatch Logic ---

        // Respond to the HTTP request with the created incident details
        res.json(newIncident);

    } catch (err) {
        // Catch any errors during the process
        console.error("Error in POST /api/incidents handler:", err.message);
        res.status(500).send('Server Error');
    }
}); // --- End of router.post('/') ---

// --- SECTION 3: Export Router (ONCE at the end) ---
module.exports = router;

// --- REMOVED THE DUPLICATE CODE BLOCK THAT WAS HERE ---
