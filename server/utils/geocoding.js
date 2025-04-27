// c:\TA911\FinalProjectGIS4Webiks\server\utils\geocoding.js

const NodeGeocoder = require('node-geocoder');
require('dotenv').config(); // To potentially load API keys if needed for other providers

// Configure the geocoder
const options = {
    provider: 'openstreetmap', // Using Nominatim (free, requires attribution)

    // Optional: If using other providers like Mapbox, Google, etc.,
    // you would configure them here, often using API keys from .env
    // provider: 'mapbox',
    // apiKey: process.env.MAPBOX_API_KEY,

    // provider: 'google',
    // apiKey: process.env.GOOGLE_API_KEY,

    fetch: fetch, // Use the global fetch API (available in Node 18+)
    formatter: null // Use default formatting
};

const geocoder = NodeGeocoder(options);

/**
 * Geocodes an address string into coordinates.
 * @param {string} address - The address string to geocode.
 * @returns {Promise<object|null>} A Promise that resolves to a GeoJSON Point object { type: 'Point', coordinates: [lon, lat] } or null if not found/error.
 */
const geocodeAddress = async (address) => {
    try {
        console.log(`Geocoding address: "${address}"`);
        const res = await geocoder.geocode(address);

        // Check if results were found
        if (res && res.length > 0) {
            const firstResult = res[0];
            const location = {
                type: 'Point',
                coordinates: [firstResult.longitude, firstResult.latitude] // [lon, lat]
            };
            console.log(`Geocoding successful: ${location.coordinates}`);
            return location;
        } else {
            console.warn(`Geocoding failed: No results found for "${address}"`);
            return null; // No results found
        }
    } catch (err) {
        console.error(`Geocoding error for address "${address}":`, err.message);
        return null; // Return null on error
    }
};

module.exports = geocodeAddress; // Export the function
