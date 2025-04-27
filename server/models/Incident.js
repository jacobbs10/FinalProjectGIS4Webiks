// c:\TA911\FinalProjectGIS4Webiks\server\models\Incident.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the Incident collection
const IncidentSchema = new Schema({
    address: {
        type: String,
        required: true, // The original address provided
    },
    location: {
        // GeoJSON Point for storing coordinates
        type: {
            type: String,
            enum: ['Point'], // Only 'Point' type is allowed
            required: true,
        },
        coordinates: {
            type: [Number], // Array of numbers for longitude and latitude [lon, lat]
            required: true,
        },
    },
    status: {
        type: String,
        required: true,
        enum: ['new', 'assigned', 'enroute', 'on_scene', 'resolved', 'closed', 'dispatch_failed'], // Define possible statuses
        default: 'new', // Default status when created
    },
    creationTime: {
        type: Date,
        default: Date.now, // Automatically set to the time of creation
    },
    assignedUnitId: {
        type: Schema.Types.ObjectId,
        ref: 'ResponderUnit', // Reference to the ResponderUnit model
        default: null, // Null if no unit is assigned
    },
    dispatchTime: {
        type: Date,
        default: null, // Timestamp when a unit was dispatched
    },
    arrivalTime: {
        type: Date,
        default: null, // Timestamp when the assigned unit arrived
    },
    // You can add more fields as needed, e.g.:
    // description: String,
    // incidentType: String,
    // priority: Number,
});

// Create a 2dsphere index on the location field for efficient geospatial queries ($near)
IncidentSchema.index({ location: '2dsphere' });

// Create and export the Mongoose model
module.exports = mongoose.model('Incident', IncidentSchema);
