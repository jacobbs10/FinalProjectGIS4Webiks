// c:\TA911\FinalProjectGIS4Webiks\server\utils\routing.js

const axios = require('axios');

// OSRM Demo Server URL (uses OpenStreetMap data)
// Note: This is a public demo server, subject to usage limits.
// For production, consider self-hosting OSRM or using a commercial service (Mapbox, Google Maps, etc.)
const OSRM_BASE_URL = 'http://router.project-osrm.org';

/**
 * Calculates the fastest driving route between two points using OSRM.
 * @param {Array<number>} startCoords - Start coordinates as [longitude, latitude].
 * @param {Array<number>} endCoords - End coordinates as [longitude, latitude].
 * @returns {Promise<object|null>} A Promise resolving to { routeCoords: [[lon, lat], ...], duration: seconds } or null on error.
 */
const getRoute = async (startCoords, endCoords) => {
    const [startLon, startLat] = startCoords;
    const [endLon, endLat] = endCoords;

    // Construct the OSRM API request URL
    // overview=full requests the detailed geometry
    // geometries=geojson requests coordinates in GeoJSON format [lon, lat]
    const url = `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    console.log(`Requesting route from OSRM: ${url}`);

    try {
        const response = await axios.get(url);

        // Check if OSRM returned a route successfully
        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const routeInfo = {
                routeCoords: route.geometry.coordinates, // Array of [lon, lat] pairs
                duration: Math.round(route.duration)     // Duration in seconds (rounded)
            };
            console.log(`Route found. Duration: ${routeInfo.duration}s, Steps: ${routeInfo.routeCoords.length}`);
            return routeInfo;
        } else {
            console.warn(`OSRM routing failed: No route found between ${startCoords} and ${endCoords}. Response:`, response.data);
            return null; // No route found
        }
    } catch (error) {
        console.error(`OSRM routing error between ${startCoords} and ${endCoords}:`, error.response ? error.response.data : error.message);
        return null; // Return null on error
    }
};

module.exports = getRoute; // Export the function
