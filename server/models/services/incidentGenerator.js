// services/incidentGenerator.js
const Incident = require('../models/Incident'); // Adjust path to your Incident model

let timerId = null;
let currentInterval = null; // Store interval in milliseconds
let isRunning = false;

// Function to create plausible random incident data
// --- THIS NEEDS CUSTOMIZATION FOR YOUR PROJECT ---
function createRandomIncidentData() {
    const types = ['Fire', 'Traffic', 'Power Outage', 'Gas Leak'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    // Example: Random coordinates within a bounding box (e.g., Tel Aviv area)
    const minLat = 32.0, maxLat = 32.2;
    const minLon = 34.7, maxLon = 34.9;
    const latitude = minLat + Math.random() * (maxLat - minLat);
    const longitude = minLon + Math.random() * (maxLon - minLon);

    return {
        type: randomType,
        location: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`, // Or store as GeoJSON point
        description: `Automatic ${randomType} incident reported.`,
        timestamp: new Date(),
        // Add coordinates if your model supports them directly
        // coordinates: { type: 'Point', coordinates: [longitude, latitude] },
        isAutomatic: true // Flag to distinguish from manual ones
    };
}

// Function to be called by setInterval
async function generateAndSaveIncident() {
    try {
        const incidentData = createRandomIncidentData();
        const newIncident = new Incident(incidentData);
        await newIncident.save();
        console.log(`[${new Date().toISOString()}] Auto-generated incident saved: ${newIncident.type} at ${newIncident.location}`);
        // You might want to emit this via WebSockets to update clients in real-time
    } catch (error) {
        console.error("Error auto-generating incident:", error);
        // Decide if you want to stop the generator on error, or just log it
        // stopGenerator(); // Example: Stop on error
    }
}

function startGenerator(intervalSeconds) {
    if (isRunning) {
        console.warn("Generator already running.");
        return { success: false, message: "Generator already running." };
    }
    if (!intervalSeconds || intervalSeconds < 5) { // Basic validation
         return { success: false, message: "Interval too short (min 5 seconds)." };
    }

    currentInterval = intervalSeconds * 1000;
    console.log(`Starting incident generator with interval: ${intervalSeconds} seconds`);
    // Run immediately once, then set interval
    generateAndSaveIncident();
    timerId = setInterval(generateAndSaveIncident, currentInterval);
    isRunning = true;
    return { success: true, message: `Generator started with interval ${intervalSeconds}s.` };
}

function stopGenerator() {
    if (!isRunning) {
        console.warn("Generator is not running.");
        return { success: false, message: "Generator is not running." };
    }

    console.log("Stopping incident generator.");
    clearInterval(timerId);
    timerId = null;
    currentInterval = null;
    isRunning = false;
     return { success: true, message: "Generator stopped." };
}

function getStatus() {
    return {
        isRunning,
        interval: currentInterval ? currentInterval / 1000 : null // Return interval in seconds
    };
}

module.exports = {
    startGenerator,
    stopGenerator,
    getStatus,
    isRunning: () => isRunning // Simple getter
};
