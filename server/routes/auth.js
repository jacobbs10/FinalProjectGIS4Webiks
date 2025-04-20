const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

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

    // Create new user
    const user = new User({
      username,
      user_firstname,
      user_lastname,
      user_cellphone,
      user_email,
      password,
      role: req.body.role || 'Viewer',
      user_status: req.body.user_status !== undefined ? req.body.user_status : true
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.user_email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.user_email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk register from file (Admin only)
const upload = multer({ dest: 'uploads/' });

router.post('/bulk-register', authMiddleware, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', async (data) => {
        try {
          const user = new User(data);
          await user.save();
          results.push(user.username);
        } catch (error) {
          errors.push({ username: data.username, error: error.message });
        }
      })
      .on('end', () => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          success: results,
          errors: errors
        });
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 