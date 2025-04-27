// c:\TA911\FinalProjectGIS4Webiks\server\routes\api\auth.js
const express = require('express');
const router = express.Router();
const fs = require('fs');         // Required for bulk upload and directory check
const path = require('path');       // Required for path manipulation (optional for basic use)
const User = require('../../models/User'); // Require User model
const jwt = require('jsonwebtoken');
const { authMiddleware, isAdmin } = require('../../middleware/authMiddleware'); // Require middleware
const multer = require('multer'); // Required for bulk-register
const csv = require('csv-parser'); // Required for bulk-register
require('dotenv').config(); // Ensure JWT_SECRET is loaded

// --- Optional Diagnostic Check (Can be removed once working) ---
const userModelPath = path.resolve(__dirname, '../models/User.js');
console.log(`--- Checking for User model at: ${userModelPath} ---`);
if (fs.existsSync(userModelPath)) {
    console.log(`--- File system CONFIRMS User model exists. ---`);
} else {
    console.error(`--- File system CANNOT FIND User model at the expected path. ---`);
}
const middlewarePath = path.resolve(__dirname, '../middleware/authMiddleware.js');
console.log(`--- Checking for Middleware at: ${middlewarePath} ---`);
if (fs.existsSync(middlewarePath)) {
    console.log(`--- File system CONFIRMS Middleware exists. ---`);
} else {
    console.error(`--- File system CANNOT FIND Middleware at the expected path. ---`);
}
// --- End Optional Diagnostic Check ---


// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, user_firstname, user_lastname, user_cellphone, user_email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { user_email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine role - default to 'Viewer', prevent setting 'Admin' via this route
    let role = req.body.role;
    const validRoles = ['Viewer', 'Confidential']; // Only allow these roles via standard registration
    if (!validRoles.includes(role)) {
        role = 'Viewer';
    }

    // Create new user
    const user = new User({
      username,
      user_firstname,
      user_lastname,
      user_cellphone,
      user_email,
      password, // Hashing happens in the pre-save hook in User.js
      role,
      user_status: req.body.user_status !== undefined ? req.body.user_status : true
    });

    await user.save();
    console.log(`User registered: ${user.username}`);

    // Generate JWT token
    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Example: token expires in 24 hours
    );

    res.status(201).json({
      token,
      user: { // Send back some user info (excluding password)
        id: user._id,
        username: user.username,
        email: user.user_email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    // Provide more specific error messages if possible (e.g., validation errors)
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation Error", errors: error.errors });
    }
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login user
router.post('/login', async (req, res) => {
  console.log("POST /api/auth/login hit");
  try {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Find user by username (case-insensitive search might be better depending on requirements)
    const user = await User.findOne({ username }); // Consider .collation({ locale: 'en', strength: 2 }) for case-insensitive
    if (!user) {
      console.log(`Login attempt failed: User not found - ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is inactive
    if (user.user_status === false) {
      console.log(`Login attempt failed: Account inactive - ${username}`);
      return res.status(403).json({ message: "Account is inactive" });
    }

    // Check password using the method defined in User.js
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password - ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`Login successful: ${username}`);
    // Generate JWT token
    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { // Send back some user info (excluding password)
        id: user._id,
        username: user.username,
        email: user.user_email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// --- Bulk register setup ---
// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Files will be saved temporarily in 'uploads/'

// Ensure 'uploads' directory exists synchronously at startup
const uploadsDir = path.join(__dirname, '../../uploads'); // Use path.join for cross-platform compatibility
if (!fs.existsSync(uploadsDir)){
    console.log(`Creating uploads directory at: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir);
}

// Bulk register from file (Admin only)
router.post('/bulk-register', authMiddleware, isAdmin, upload.single('file'), async (req, res) => {
  console.log("POST /api/auth/bulk-register hit");
  const filePath = req.file ? req.file.path : null; // Get file path safely

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log(`Processing uploaded file: ${filePath}`);

    const results = [];
    const errors = [];

    // Use a promise to handle the stream processing completion
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', async (data) => {
            // IMPORTANT: Streams are fast. Pausing/resuming is complex with async/await inside.
            // A better approach for DB operations is to collect all data first, then process.
            // However, for this example, we'll try pausing (might be less reliable under load).
            // Consider using libraries like 'async' or processing after 'end' event for robustness.
            // stream.pause(); // Pausing can be tricky

            try {
              // Basic validation
              if (!data.username || !data.password || !data.user_email || !data.user_firstname || !data.user_lastname) {
                  throw new Error('Missing required fields (username, password, email, firstname, lastname)');
              }

              // Check if user already exists
              const existingUser = await User.findOne({
                 $or: [{ username: data.username }, { user_email: data.user_email }]
              });

              if (existingUser) {
                 throw new Error(`User already exists (username: ${data.username} or email: ${data.user_email})`);
              }

              // Determine role, default to Viewer if invalid or Admin
              let role = data.role;
              const validRoles = ['Viewer', 'Confidential', 'Admin']; // Define valid roles
              if (!validRoles.includes(role) || role === 'Admin') { // Prevent setting Admin via bulk upload
                  role = 'Viewer';
              }

              const user = new User({
                  username: data.username,
                  user_firstname: data.user_firstname,
                  user_lastname: data.user_lastname,
                  user_cellphone: data.user_cellphone,
                  user_email: data.user_email,
                  password: data.password, // Hashing happens in pre-save hook
                  role: role,
                  user_status: data.user_status !== undefined ? (String(data.user_status).toLowerCase() === 'true' || data.user_status === '1') : true
              });
              await user.save();
              results.push(user.username);
            } catch (error) {
              errors.push({ username: data.username || 'N/A', error: error.message });
            } finally {
              // stream.resume(); // Resume if paused
            }
          })
          .on('end', () => {
            console.log('CSV file successfully processed');
            resolve(); // Resolve the promise when stream ends
          })
          .on('error', (error) => { // Handle stream errors
              console.error('Error processing CSV stream:', error);
              reject(error); // Reject the promise on stream error
          });
    }); // End of promise wrapper

    // Clean up uploaded file AFTER processing is complete
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting uploaded CSV file:", err);
            else console.log(`Deleted uploaded file: ${filePath}`);
        });
    }

    // Send response after stream processing is done
    res.json({
      message: `Bulk registration finished. Success: ${results.length}, Errors: ${errors.length}`,
      success: results,
      errors: errors
    });

  } catch (error) { // Catch errors from routing, file handling, or the stream promise
    console.error("Error in /bulk-register route:", error.message);
    // Clean up file if it exists and an error occurred
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting uploaded CSV file on route error:", err);
        });
    }
    // Ensure response is sent only once
    if (!res.headersSent) {
        res.status(500).json({ message: "Server error during bulk registration", error: error.message });
    }
  }
});


module.exports = router;
