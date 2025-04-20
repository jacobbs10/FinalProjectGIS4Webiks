const mongoose = require('mongoose');

const PropertiesSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Restroom', 'Shelter', 'Restaurant', 'Park', 'Museum', 'Shop', 'Other']
    },    
    loc_name: {
    type: String,
    required: true
    },
    address: {
        type: String,
        required: true,
        validate: {
            validator: function (value) {
                return value.length <= 100;
            },
            message: 'Address cannot exceed 100 characters'
        }
    },
    description: {
        type: String,
        required: true
    },
    restricted: {
        type: Boolean,
        required: true,
        default: false
    },
    email: {
        type: String,
        required: false,
        validate: {
            validator: function (value) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: 'Invalid email format'
        }
    },
    phone: {
        type: String,
        required: false,
        validate: {
            validator: function (value) {
                return /^[\d\s\-()+]+$/.test(value);
            },
            message: 'Invalid phone number format'
        }
    },    
    Site: {
        type: String,
        required: false
    }
  
}, { _id: false }); // Disable _id for subdocuments

const LocationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    required: true
  },
  properties: {
    type: PropertiesSchema,
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return value.length === 2;
        },
        message: 'Coordinates must be an array of two numbers'
      }
    }
  }
}, { collection: 'Locations' });

LocationSchema.index({ geometry: '2dsphere' });
//LocationSchema.index({ 'properties.id': 1 });
LocationSchema.index({ 'properties.category': 1, 'properties.restricted': 1 });

module.exports = mongoose.model('Location', LocationSchema);
