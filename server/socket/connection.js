const User = require('../models/User');
const BidSession = require('../models/BidSession');
const Station = require('../models/Station');

// Store active connections
const activeConnections = new Map();
const bidSessionRooms = new Map();

const handleSocketConnection = (socket, io) => {
  console.log(`User connected: ${socket.user.fullName} (${socket.user._id})`);
  
  // Store connection
  activeConnections.set(socket.user._id.toString(), {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });

  // Join user's personal room
  socket.join(`user_${socket.user._id}`);
  
  // Join admin room if user is admin
  if (socket.user.isAdmin) {
    socket.join('admin_room');
  }

  // Handle user joining bid session
  socket.on('join_bid_session', async (sessionId) => {
    try {
      const bidSession = await BidSession.findById(sessionId)
        .populate('participants.user', 'firstName lastName rank position')
        .populate('participants.assignedStation', 'name number');

      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      // Join session room
      socket.join(`bid_session_${sessionId}`);
      
      // Store room info
      if (!bidSessionRooms.has(sessionId)) {
        bidSessionRooms.set(sessionId, new Set());
      }
      bidSessionRooms.get(sessionId).add(socket.user._id.toString());

      // Send session info to user
      socket.emit('bid_session_joined', {
        session: bidSession.getSummary(),
        currentParticipant: bidSession.currentParticipantInfo,
        participants: bidSession.participants.map(p => ({
          id: p.user._id,
          name: `${p.user.firstName} ${p.user.lastName}`,
          rank: p.user.rank,
          position: p.user.position,
          bidPosition: p.position,
          hasBid: p.hasBid,
          assignedStation: p.assignedStation,
          assignedShift: p.assignedShift,
          autoAssigned: p.autoAssigned
        }))
      });

      // Notify others in session
      socket.to(`bid_session_${sessionId}`).emit('user_joined_session', {
        user: {
          id: socket.user._id,
          name: socket.user.fullName,
          rank: socket.user.rank,
          position: socket.user.position
        }
      });

    } catch (error) {
      console.error('Join bid session error:', error);
      socket.emit('error', { message: 'Failed to join bid session' });
    }
  });

  // Handle user leaving bid session
  socket.on('leave_bid_session', (sessionId) => {
    socket.leave(`bid_session_${sessionId}`);
    
    if (bidSessionRooms.has(sessionId)) {
      bidSessionRooms.get(sessionId).delete(socket.user._id.toString());
    }

    socket.to(`bid_session_${sessionId}`).emit('user_left_session', {
      userId: socket.user._id,
      userName: socket.user.fullName
    });
  });

  // Handle bid submission
  socket.on('submit_bid', async (data) => {
    try {
      const { sessionId, stationId, shift, position } = data;

      const bidSession = await BidSession.findById(sessionId);
      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      // Check if user is current participant
      const currentParticipant = bidSession.participants[bidSession.currentParticipant];
      if (!currentParticipant || currentParticipant.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Not your turn to bid' });
        return;
      }

      // Check if user can still bid
      if (!bidSession.participants[bidSession.currentParticipant].canBid()) {
        socket.emit('error', { message: 'Bid window has expired' });
        return;
      }

      // Validate station and position availability
      const station = await Station.findById(stationId);
      if (!station) {
        socket.emit('error', { message: 'Station not found' });
        return;
      }

      if (!station.hasAvailablePosition(shift, position)) {
        socket.emit('error', { message: 'Position not available at this station' });
        return;
      }

      // Process the bid
      await bidSession.processBid(stationId, shift, position);
      
      // Update station assignment
      await station.addAssignment(shift, socket.user._id, position);

      // Broadcast bid result to session
      io.to(`bid_session_${sessionId}`).emit('bid_submitted', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        station: station.getSummary(),
        shift,
        position,
        nextParticipant: bidSession.currentParticipantInfo
      });

      // Send confirmation to bidder
      socket.emit('bid_confirmed', {
        station: station.getSummary(),
        shift,
        position
      });

    } catch (error) {
      console.error('Submit bid error:', error);
      socket.emit('error', { message: 'Failed to submit bid' });
    }
  });

  // Handle admin session control
  socket.on('admin_start_session', async (sessionId) => {
    try {
      if (!socket.user.isAdmin) {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      const bidSession = await BidSession.findById(sessionId);
      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      await bidSession.startSession();

      // Broadcast session start
      io.to(`bid_session_${sessionId}`).emit('session_started', {
        session: bidSession.getSummary(),
        currentParticipant: bidSession.currentParticipantInfo
      });

      // Notify admin room
      io.to('admin_room').emit('session_status_changed', {
        sessionId,
        status: 'active',
        currentParticipant: bidSession.currentParticipantInfo
      });

    } catch (error) {
      console.error('Start session error:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  socket.on('admin_pause_session', async (sessionId) => {
    try {
      if (!socket.user.isAdmin) {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      const bidSession = await BidSession.findById(sessionId);
      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      await bidSession.pauseSession();

      // Broadcast session pause
      io.to(`bid_session_${sessionId}`).emit('session_paused', {
        session: bidSession.getSummary()
      });

      // Notify admin room
      io.to('admin_room').emit('session_status_changed', {
        sessionId,
        status: 'paused'
      });

    } catch (error) {
      console.error('Pause session error:', error);
      socket.emit('error', { message: 'Failed to pause session' });
    }
  });

  socket.on('admin_resume_session', async (sessionId) => {
    try {
      if (!socket.user.isAdmin) {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      const bidSession = await BidSession.findById(sessionId);
      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      await bidSession.resumeSession();

      // Broadcast session resume
      io.to(`bid_session_${sessionId}`).emit('session_resumed', {
        session: bidSession.getSummary(),
        currentParticipant: bidSession.currentParticipantInfo
      });

      // Notify admin room
      io.to('admin_room').emit('session_status_changed', {
        sessionId,
        status: 'active',
        currentParticipant: bidSession.currentParticipantInfo
      });

    } catch (error) {
      console.error('Resume session error:', error);
      socket.emit('error', { message: 'Failed to resume session' });
    }
  });

  // Handle auto-assignment timeout
  socket.on('admin_auto_assign', async (sessionId) => {
    try {
      if (!socket.user.isAdmin) {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      const bidSession = await BidSession.findById(sessionId);
      if (!bidSession) {
        socket.emit('error', { message: 'Bid session not found' });
        return;
      }

      await bidSession.autoAssignCurrentParticipant();

      // Broadcast auto-assignment
      io.to(`bid_session_${sessionId}`).emit('participant_auto_assigned', {
        participant: bidSession.participants[bidSession.currentParticipant - 1],
        nextParticipant: bidSession.currentParticipantInfo
      });

      // Notify admin room
      io.to('admin_room').emit('session_status_changed', {
        sessionId,
        status: bidSession.status,
        currentParticipant: bidSession.currentParticipantInfo
      });

    } catch (error) {
      console.error('Auto assign error:', error);
      socket.emit('error', { message: 'Failed to auto-assign participant' });
    }
  });

  // Handle real-time updates
  socket.on('request_station_updates', async (sessionId) => {
    try {
      const stations = await Station.find({ isActive: true });
      const stationUpdates = stations.map(station => station.getSummary());
      
      socket.emit('station_updates', stationUpdates);
    } catch (error) {
      console.error('Station updates error:', error);
      socket.emit('error', { message: 'Failed to get station updates' });
    }
  });

  // Handle user typing indicator
  socket.on('typing_start', (sessionId) => {
    socket.to(`bid_session_${sessionId}`).emit('user_typing', {
      userId: socket.user._id,
      userName: socket.user.fullName
    });
  });

  socket.on('typing_stop', (sessionId) => {
    socket.to(`bid_session_${sessionId}`).emit('user_stopped_typing', {
      userId: socket.user._id
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.fullName} (${socket.user._id})`);
    
    // Remove from active connections
    activeConnections.delete(socket.user._id.toString());
    
    // Remove from bid session rooms
    bidSessionRooms.forEach((users, sessionId) => {
      if (users.has(socket.user._id.toString())) {
        users.delete(socket.user._id.toString());
        io.to(`bid_session_${sessionId}`).emit('user_disconnected', {
          userId: socket.user._id,
          userName: socket.user.fullName
        });
      }
    });
  });

  // Send initial connection confirmation
  socket.emit('connected', {
    user: {
      id: socket.user._id,
      name: socket.user.fullName,
      rank: socket.user.rank,
      position: socket.user.position,
      isAdmin: socket.user.isAdmin
    },
    timestamp: new Date()
  });
};

// Utility functions for external use
const getActiveConnections = () => {
  return Array.from(activeConnections.values());
};

const getBidSessionParticipants = (sessionId) => {
  return bidSessionRooms.get(sessionId) || new Set();
};

const broadcastToSession = (io, sessionId, event, data) => {
  io.to(`bid_session_${sessionId}`).emit(event, data);
};

const broadcastToAdmin = (io, event, data) => {
  io.to('admin_room').emit(event, data);
};

module.exports = {
  handleSocketConnection,
  getActiveConnections,
  getBidSessionParticipants,
  broadcastToSession,
  broadcastToAdmin
};
