require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userActivitiesRoutes = require('./routes/userActivities');
const neighborhoodRoutes = require('./routes/neighborhoodRoutes');
const locationRoutes = require('./routes/locationRoutes');
const emergencyLocRoutes = require('./routes/emergencyLocRoutes');
const http = require('http');
const socketIo = require('socket.io');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app's URL
    methods: ["GET", "POST"]
  }
});

// Add middleware to pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userActivitiesRoutes);
app.use('/api/hood', neighborhoodRoutes);
app.use('/api/locs', locationRoutes);
app.use('/api/emrgLocs', emergencyLocRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Change the app.listen to server.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;