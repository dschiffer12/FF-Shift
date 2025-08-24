const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const stationRoutes = require('./routes/stations');
const bidSessionRoutes = require('./routes/bidSessions');
const adminRoutes = require('./routes/admin');

const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - exclude Socket.IO paths
app.use((req, res, next) => {
  if (req.path.startsWith('/socket.io/')) {
    return next();
  }
  
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  })(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ff-shift-bid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bid-sessions', bidSessionRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize Socket.IO and make it globally available
const io = initializeSocket(server);
global.io = io;

// Background task to check for timer expiration every 30 seconds
const BidSession = require('./models/BidSession');
setInterval(async () => {
  try {
    // Find all active bid sessions
    const activeSessions = await BidSession.find({ status: 'active' });
    
    for (const session of activeSessions) {
      const timeExpired = await session.checkTimeExpiration();
      
      if (timeExpired) {
        console.log(`Timer expired for session ${session._id}, participant moved to back`);
        
        // Emit turn update to all connected clients
        io.emit('turn-updated', {
          sessionId: session._id,
          currentParticipant: session.currentParticipant,
          completedBids: session.completedBids,
          status: session.status,
          message: 'Participant moved to back due to time expiration'
        });
        
        // Emit to specific session room
        io.to(`bid_session_${session._id}`).emit('turn-updated', {
          sessionId: session._id,
          currentParticipant: session.currentParticipant,
          completedBids: session.completedBids,
          status: session.status,
          message: 'Participant moved to back due to time expiration'
        });
        
        // Emit session update to refresh client data
        io.emit('session-updated', {
          sessionId: session._id,
          session: session.getSummary()
        });
        
        io.to(`bid_session_${session._id}`).emit('session-updated', {
          sessionId: session._id,
          session: session.getSummary()
        });
      }
    }
  } catch (error) {
    console.error('Error in timer expiration check:', error);
  }
}, 30000); // Check every 30 seconds

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
