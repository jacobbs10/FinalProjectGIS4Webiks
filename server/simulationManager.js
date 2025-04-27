// c:\TA911\FinalProjectGIS4Webiks\server\simulationManager.js

// Import necessary Turf.js modules for geospatial calculations
const turf = require('@turf/helpers'); // Used for creating GeoJSON objects like lineString
const turfLength = require('@turf/length').default; // Calculates the length of a GeoJSON line
const turfAlong = require('@turf/along').default; // Finds a point at a specific distance along a line

// Import Mongoose models to interact with the database
const ResponderUnit = require('./models/ResponderUnit'); // Adjust path if your models folder is different
const Incident = require('./models/Incident');       // Adjust path if your models folder is different

// Object to keep track of active simulation intervals, keyed by unitId
let activeSimulations = {};

// Simulation update frequency in milliseconds (e.g., 1000ms = 1 second)
const SIMULATION_INTERVAL_MS = 1000;

/**
 * Stops the simulation interval for a specific responder unit.
 * @param {string} unitId - The ID of the responder unit whose simulation should be stopped.
 */
function stopSimulation(unitId) {
    if (activeSimulations[unitId]) {
        clearInterval(activeSimulations[unitId]); // Clear the scheduled interval
        delete activeSimulations[unitId];         // Remove the entry from the tracking object
        console.log(`Simulation stopped for unit ${unitId}`);
    }
}

/**
 * Starts the movement simulation for a dispatched responder unit.
 * @param {object} unit - The Mongoose document object for the ResponderUnit.
 * @param {object} incident - The Mongoose document object for the Incident.
 * @param {object} io - The Socket.IO server instance for emitting events.
 */
async function startSimulation(unit, incident, io) {
    const unitId = unit._id.toString(); // Use string ID for object keys
    console.log(`Attempting to start simulation for unit ${unitId} to incident ${incident._id}`);

    // --- Pre-computation and Validation ---
    // Ensure essential data for simulation exists
    if (!unit.currentRoute || !unit.currentRoute.coordinates || unit.currentRoute.coordinates.length < 2 || !unit.estimatedRouteDuration || !unit.routeStartTime) {
        console.error(`Cannot start simulation for unit ${unitId}: Missing or invalid route data.`);
        // Consider updating unit status back to 'available' or an 'error' state here
        // await ResponderUnit.findByIdAndUpdate(unitId, { status: 'available', currentRoute: null /* clear other fields */ });
        return; // Exit if data is insufficient
    }

    // Stop any potentially pre-existing simulation for this unit to prevent duplicates
    stopSimulation(unitId);

    try {
        // Create a Turf.js LineString object from the route coordinates for calculations
        const routeLine = turf.lineString(unit.currentRoute.coordinates);
        // Calculate the total length of the route (e.g., in kilometers)
        const totalRouteDistance = turfLength(routeLine, { units: 'kilometers' });

        console.log(`Simulation started for unit ${unitId}. Route distance: ${totalRouteDistance.toFixed(2)} km. Estimated duration: ${unit.estimatedRouteDuration}s.`);

        // --- Simulation Interval ---
        const intervalId = setInterval(async () => {
            try {
                // Fetch the latest unit data in each interval tick
                // This ensures we react to external status changes (e.g., manual cancellation)
                const currentUnit = await ResponderUnit.findById(unitId);

                // --- Check if Simulation Should Continue ---
                if (!currentUnit || currentUnit.status !== 'enroute' || !currentUnit.routeStartTime || !currentUnit.estimatedRouteDuration) {
                    console.log(`Unit ${unitId} status changed or data missing (${currentUnit?.status}). Stopping simulation.`);
                    stopSimulation(unitId);
                    return; // Exit this interval tick
                }

                // --- Calculate Progress ---
                const startTime = new Date(currentUnit.routeStartTime).getTime(); // Get start time in milliseconds
                const estimatedDurationMs = currentUnit.estimatedRouteDuration * 1000; // Convert duration to milliseconds
                const elapsedTimeMs = Date.now() - startTime; // Time elapsed since dispatch
                const progress = Math.min(1, elapsedTimeMs / estimatedDurationMs); // Calculate progress fraction (0 to 1), capped at 1

                // --- Check for Arrival ---
                if (progress >= 1) {
                    console.log(`Unit ${unitId} simulation progress >= 1. Processing arrival at incident ${currentUnit.assignedIncidentId}`);
                    stopSimulation(unitId); // Stop the interval timer

                    // Fetch the incident details again to ensure we have the correct final location
                    const finalIncident = await Incident.findById(currentUnit.assignedIncidentId);
                    if (!finalIncident) {
                        console.error(`Incident ${currentUnit.assignedIncidentId} not found on arrival for unit ${unitId}.`);
                        // Handle this case - maybe set unit back to available?
                        currentUnit.status = 'available'; // Or some error state
                        await currentUnit.save();
                        return;
                    }

                    const finalLocation = finalIncident.location; // The incident's GeoJSON Point location

                    // --- Update Database Records on Arrival ---
                    // Update Responder Unit
                    currentUnit.status = 'on_scene';
                    currentUnit.currentLocation = finalLocation; // Set final location
                    currentUnit.currentRoute = null; // Clear route data
                    currentUnit.estimatedRouteDuration = null;
                    currentUnit.routeStartTime = null;
                    // Keep assignedIncidentId until explicitly cleared later (e.g., when unit is released)

                    // Update Incident
                    finalIncident.status = 'on_scene'; // Or 'resolved', depending on workflow
                    finalIncident.arrivalTime = new Date();

                    // Save both updated documents
                    await currentUnit.save();
                    await finalIncident.save();
                    console.log(`Unit ${unitId} and Incident ${finalIncident._id} updated to 'on_scene' status.`);

                    // --- Emit WebSocket Events for Arrival ---
                    // Notify clients that the responder has arrived
                    io.emit('responder_arrived', {
                        unitId: unitId,
                        incidentId: finalIncident._id.toString(),
                        location: finalLocation.coordinates // Send final coords [lon, lat] for convenience
                    });

                    // Send one last position update with the exact arrival location
                    io.emit('responder_update', {
                        unitId: unitId,
                        location: finalLocation // Send the full GeoJSON Point object
                    });

                    return; // Exit this interval tick after handling arrival
                }

                // --- Interpolate Position Along Route (If Not Arrived) ---
                const distanceCovered = totalRouteDistance * progress; // Calculate distance covered based on progress
                // Find the GeoJSON Point feature at the calculated distance along the route line
                const newLocationFeature = turfAlong(routeLine, distanceCovered, { units: 'kilometers' }); // Use same units as turfLength
                const newCoords = newLocationFeature.geometry.coordinates; // Extract [lon, lat] coordinates

                // --- Update Unit Location in DB ---
                // Note: This causes frequent DB writes. For high-load systems, consider optimizations
                // like updating less frequently or only updating in memory between DB saves.
                currentUnit.currentLocation = {
                    type: 'Point',
                    coordinates: newCoords
                };
                await currentUnit.save();

                // --- Emit WebSocket Position Update ---
                // Notify clients about the unit's new position
                io.emit('responder_update', {
                    unitId: unitId,
                    location: currentUnit.currentLocation // Send the full GeoJSON Point object
                });

            } catch (error) {
                console.error(`Error during simulation interval for unit ${unitId}:`, error);
                // Optional: Decide if the simulation should stop on certain errors
                // stopSimulation(unitId);
            }
        }, SIMULATION_INTERVAL_MS); // Run the interval function repeatedly

        // Store the interval ID so we can clear it later
        activeSimulations[unitId] = intervalId;

    } catch (error) {
        console.error(`Failed to initialize simulation for unit ${unitId}:`, error);
        // Ensure simulation is marked as stopped if initialization fails
        stopSimulation(unitId);
    }
}

// Export the functions to be used by other parts of the application (like incidents.js)
module.exports = {
    startSimulation,
    stopSimulation
};
