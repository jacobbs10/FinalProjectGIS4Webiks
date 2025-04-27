// c:\TA911\FinalProjectGIS4Webiks\server\config\db.js

const mongoose = require('mongoose');
require('dotenv').config(); // Ensure environment variables are loaded

const connectDB = async () => {
    try {
        // Get the MongoDB connection string from environment variables
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            console.error('MONGO_URI not found in environment variables. Please check your .env file.');
            process.exit(1); // Exit process with failure
        }

        // Attempt to connect to the database
        await mongoose.connect(mongoURI, {
            // Mongoose 6+ uses these options by default, but explicitly setting them can be helpful
            // useNewUrlParser: true, // No longer needed
            // useUnifiedTopology: true, // No longer needed
            // useCreateIndex: true, // No longer supported
            // useFindAndModify: false // No longer supported
        });

        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure if connection fails
        process.exit(1);
    }
};

module.exports = connectDB; // Export the function to be used in server.js
