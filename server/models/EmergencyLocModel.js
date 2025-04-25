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
        enum: ['Incidents', 'Stations']
    },
    sub_category: {
        type: String,
        required: true,
        enum: ['Police', 'Fire', 'Medical', 'ArmyRescue', 'Combined']
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
    },
    loc_status: {
        type: String,
        required: true,
        default: 'Active',
        enum: ['Active', 'Suspended', 'Removed']
    },
    photo: {
        type: String,
        required: false       
    },
    incident_start_time: {
        type: Date,
        required: false 
    },
    incident_end_time: {
        type: Date,
        required: false 
    },
    equipment: [{
        type: {
            type: String,
            enum: ['gunPack', 'granadePack', 'medicalPack', 'rescuePack'],
            required: true
        },
        qty: {
            type: Number,
            required: true
        },
        standard_qty: {
            type: Number,
            required: true
        },
        min_qty: {
            type: Number,
            required: true
        }
    }],
    vehicles: [{
        type: {
            type: String,
            enum: ['PatrolCar', 'PatrolMoto', 'FireCommand', 'FireBig', 'Ambulance', 'Motobulance', 'RescueTruck'],
            required: true
        },
        qty: {
            type: Number,
            required: true
        },
        min_capasity: {
            type: Number,
            required: true,
            default: 1
        },
        standard_qty: {
            type: Number,
            required: true,
            default: 1
        },
        min_qty: {
            type: Number,
            required: true
        }
    }],
    total_personal: {
        type: Number,
        required: true
    },
    available_personal: {
        type: Number,
        required: true
    },
    min_personal: {
        type: Number,
        required: true
    }
  
}, { _id: false }); // Disable _id for subdocuments

const EmergencyLocSchema = new mongoose.Schema({
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
}, { collection: 'EmergencyLoc' });

EmergencyLocSchema.index({ geometry: '2dsphere' });
//LocationSchema.index({ 'properties.id': 1 });
EmergencyLocSchema.index({ 'properties.category': 1, 'properties.restricted': 1 });

module.exports = mongoose.model('EmergencyLoc', EmergencyLocSchema);
