// c:\TA911\FinalProjectGIS4Webiks\server\models\ResponderUnit.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the ResponderUnit collection
const ResponderUnitSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Assuming each unit has a unique name/identifier
    },
    // Optional: Link to a home station if you have a Station model
     homeStationId: {
        type: Schema.Types.ObjectId,
         ref: 'Station', // Reference to a Station model (if you create one)
         required: false, // Make true if every unit MUST have a home station
     },
    status: {
        type: String,
        required: true,
        enum: ['available', 'enroute', 'on_scene', 'returning', 'unavailable', 'error'], // Define possible statuses
        default: 'available',
    },
    currentLocation: {
        // GeoJSON Point for storing current coordinates
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    assignedIncidentId: {
        type: Schema.Types.ObjectId,
        ref: 'Incident', // Reference to the Incident model
        default: null, // Null if not assigned to an incident
    },
    // --- Single definition for route-related fields START ---
    currentRoute: {
        // GeoJSON LineString for storing the calculated route path
        type: {
            type: String,
            enum: ['LineString'],
            required: false, // Only required when status is 'enroute' or 'returning'
        },
        coordinates: {
            type: [[Number]], // Array of [longitude, latitude] pairs
            required: false,
        },
        // No default needed here
    }, // <-- Comma needed AFTER the currentRoute object definition
    routeStartTime: {
        type: Date,
        default: null, // Timestamp when the current route traversal started
    },
    estimatedRouteDuration: {
        type: Number, // Estimated duration in seconds
        default: null,
    },
    // --- Single definition for route-related fields END ---

    // You can add more fields like:
    // unitType: String, (e.g., 'Ambulance', 'FireTruck')
    // capabilities: [String],
    // personnelCount: Number,

}); // <-- This is the closing brace for the main Schema object

// Create a 2dsphere index on the currentLocation field for efficient geospatial queries ($near)
ResponderUnitSchema.index({ currentLocation: '2dsphere' });

// Create and export the Mongoose model
module.exports = mongoose.model('ResponderUnit', ResponderUnitSchema);
