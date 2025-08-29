const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const BidSession = require('./models/BidSession');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication failed'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email} (${socket.id})`);

    // Join user-specific room
    socket.on('join-user-room', (data) => {
      socket.join(`user-${data.userId}`);
      console.log(`User ${socket.user.email} joined user room: user-${data.userId}`);
      
      // Also join admin room if user is admin
      if (socket.user.isAdmin) {
        socket.join('admin_room');
        console.log(`Admin ${socket.user.email} joined admin room`);
      }

      // Emit user online status to admin room
      io.to('admin_room').emit('user-online-status', {
        userId: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        rank: socket.user.rank,
        isOnline: true,
        lastSeen: new Date()
      });

      // Emit user activity to admin room
      io.to('admin_room').emit('user-activity', {
        type: 'login',
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        action: 'Logged into the system',
        timestamp: new Date(),
        isOnline: true
      });
    });

    // Handle automatic joining of users when added by admin
    socket.on('auto_join_bid_session', async (data) => {
      try {
        const { sessionId } = data;
        await socket.emit('join_bid_session', { sessionId });
      } catch (error) {
        console.error('Auto join bid session error:', error);
        socket.emit('error', { message: 'Failed to auto-join bid session' });
      }
    });

    // Join bid session room (new format)
    socket.on('join_bid_session', async (data) => {
      try {
        const sessionId = typeof data === 'string' ? data : data.sessionId;
        console.log('Joining user to bid session:', sessionId);
        
        const bidSession = await BidSession.findById(sessionId)
          .populate('participants.user', 'firstName lastName rank position')
          .populate('participants.assignedStation', 'name number');

        if (!bidSession) {
          console.log('Bid session not found:', sessionId);
          socket.emit('error', { message: 'Bid session not found' });
          return;
        }

        // Join session room
        socket.join(`bid_session_${sessionId}`);
        console.log('User joined room:', `bid_session_${sessionId}`);

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
            name: `${socket.user.firstName} ${socket.user.lastName}`,
            rank: socket.user.rank,
            position: socket.user.position
          }
        });

        // Emit user activity to admin room
        io.to('admin_room').emit('user-activity', {
          type: 'session',
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          action: `Joined bid session`,
          timestamp: new Date(),
          isOnline: true
        });
      } catch (error) {
        console.error('Join bid session error:', error);
        socket.emit('error', { message: 'Failed to join bid session' });
      }
    });

    // Join bid session room (old format - keep for compatibility)
    socket.on('join-bid-session', (data) => {
      socket.join(`bid-session-${data.sessionId}`);
      console.log(`User ${socket.user.email} joined bid session: ${data.sessionId}`);

      // Emit user activity to admin room
      io.to('admin_room').emit('user-activity', {
        type: 'session',
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        action: `Joined bid session`,
        timestamp: new Date(),
        isOnline: true
      });
    });

    // Leave bid session room
    socket.on('leave-bid-session', (data) => {
      socket.leave(`bid-session-${data.sessionId}`);
      console.log(`User ${socket.user.email} left bid session: ${data.sessionId}`);
    });

    // Join admin room specifically
    socket.on('join-admin-room', () => {
      if (socket.user.isAdmin) {
        socket.join('admin_room');
        console.log(`Admin ${socket.user.email} joined admin room`);
      }
    });

    // Submit bid (new format)
    socket.on('submit_bid', async (data) => {
      try {
        console.log('Received bid submission:', data);
        console.log('User submitting bid:', socket.user.email);
        const { sessionId, stationId, shift, position } = data;

        const bidSession = await BidSession.findById(sessionId);
        if (!bidSession) {
          socket.emit('error', { message: 'Bid session not found' });
          return;
        }

        // Check if user is in the bid session room
        const userRooms = Array.from(socket.rooms);
        console.log('User rooms:', userRooms);
        console.log('Required room:', `bid_session_${sessionId}`);
        console.log('User authenticated:', !!socket.user);
        console.log('User ID:', socket.user._id);
        if (!userRooms.includes(`bid_session_${sessionId}`)) {
          console.log('User not in bid session room');
          socket.emit('error', { message: 'You must join the bid session first' });
          return;
        }

        // Check if user is a participant in this session
        const isParticipant = bidSession.participants.some(p => p.user.toString() === socket.user._id.toString());
        console.log('User is participant:', isParticipant);
        console.log('Session participants:', bidSession.participants.map(p => ({ userId: p.user.toString(), name: p.user.firstName })));
        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a participant in this session' });
          return;
        }

        // Check if user is current participant
        const currentParticipant = bidSession.participants[bidSession.currentParticipant - 1]; // Convert to 0-based index
        console.log('Current participant:', currentParticipant ? { userId: currentParticipant.user.toString(), name: currentParticipant.user.firstName } : 'None');
        console.log('Current participant index:', bidSession.currentParticipant);
        if (!currentParticipant || currentParticipant.user.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Not your turn to bid' });
          return;
        }

        // Check if user can still bid
        const participant = bidSession.participants[bidSession.currentParticipant - 1]; // Convert to 0-based index
        console.log('Participant time window:', participant?.timeWindow);
        if (!participant || !participant.timeWindow || !participant.timeWindow.end) {
          console.log('No active bid window');
          socket.emit('error', { message: 'No active bid window' });
          return;
        }
        
        const now = new Date();
        console.log('Current time:', now);
        console.log('Bid window end:', participant.timeWindow.end);
        console.log('Time expired:', now > participant.timeWindow.end);
        if (now > participant.timeWindow.end) {
          socket.emit('error', { message: 'Bid window has expired' });
          return;
        }

        // Validate station and position availability
        const Station = require('./models/Station');
        const station = await Station.findById(stationId);
        console.log('Found station:', station ? station.name : 'Not found');
        if (!station) {
          socket.emit('error', { message: 'Station not found' });
          return;
        }

        console.log('Checking position availability:', { shift, position, stationId });
        console.log('Station available positions:', station.availablePositions);
        console.log('Station current assignments:', station.currentAssignments);
        
        const positionAvailable = station.hasAvailablePosition(shift, position);
        console.log('Position available:', positionAvailable);
        
        if (!positionAvailable) {
          console.log('Position not available');
          socket.emit('error', { message: 'Position not available at this station' });
          return;
        }

        // Process the bid
        console.log('Processing bid...');
        await bidSession.processBid(stationId, shift, position);
        console.log('Bid processed successfully');

        // Get updated station info for confirmation
        const updatedStation = await Station.findById(stationId);

        // Broadcast bid result to session
        io.to(`bid_session_${sessionId}`).emit('bid_submitted', {
          userId: socket.user._id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          station: updatedStation.getSummary(),
          shift,
          position,
          nextParticipant: bidSession.currentParticipantInfo
        });

        // Send confirmation to bidder
        console.log('Sending bid confirmation to user');
        socket.emit('bid_confirmed', {
          station: updatedStation.getSummary(),
          shift,
          position
        });

        // Emit user activity to admin room
        io.to('admin_room').emit('user-activity', {
          type: 'bid',
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          action: `Submitted bid for station`,
          timestamp: new Date(),
          isOnline: true
        });

      } catch (error) {
        console.error('Submit bid error:', error);
        socket.emit('error', { message: 'Failed to submit bid' });
      }
    });

    // Submit bid (old format - keep for compatibility)
    socket.on('submit-bid', async (data) => {
      try {
        const { sessionId, bidData } = data;
        
        // Validate bid session
        const bidSession = await BidSession.findById(sessionId);
        if (!bidSession) {
          socket.emit('error', { message: 'Bid session not found' });
          return;
        }

        // Check if it's user's turn
        const participant = bidSession.participants.find(p => 
          p.user.toString() === socket.user._id.toString()
        );

        if (!participant) {
          socket.emit('error', { message: 'You are not a participant in this session' });
          return;
        }

        if (participant.position !== bidSession.currentParticipant) {
          socket.emit('error', { message: 'It is not your turn to bid' });
          return;
        }

        // Process the bid
        const bidResult = await processBid(bidSession, participant, bidData);
        
        if (bidResult.success) {
          // Send confirmation to bidder
          socket.emit('bid_confirmed', {
            station: { name: bidData.station, id: bidData.station },
            shift: bidData.shift,
            position: bidData.position
          });

          // Emit to all users in the session
          io.to(`bid-session-${sessionId}`).emit('bid-submitted', {
            sessionId,
            userId: socket.user._id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            station: bidData.station,
            shift: bidData.shift,
            position: bidData.position
          });

          // Emit user activity to admin room
          io.to('admin_room').emit('user-activity', {
            type: 'bid',
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            action: `Submitted bid for station`,
            timestamp: new Date(),
            isOnline: true
          });

          // Emit bid session update to admin room
          io.to('admin_room').emit('bid-session-update', {
            sessionId,
            updates: {
              completedBids: bidSession.completedBids + 1,
              currentParticipant: bidSession.currentParticipant + 1
            }
          });

          // Move to next participant
          await moveToNextParticipant(bidSession);
        } else {
          socket.emit('error', { message: bidResult.error });
        }
      } catch (error) {
        console.error('Error submitting bid:', error);
        socket.emit('error', { message: 'Failed to submit bid' });
      }
    });

    // Skip turn
    socket.on('skip-turn', async (data) => {
      try {
        const { sessionId } = data;
        
        const bidSession = await BidSession.findById(sessionId);
        if (!bidSession) {
          socket.emit('error', { message: 'Bid session not found' });
          return;
        }

        const participant = bidSession.participants.find(p => 
          p.user.toString() === socket.user._id.toString()
        );

        if (!participant || participant.position !== bidSession.currentParticipant) {
          socket.emit('error', { message: 'It is not your turn to skip' });
          return;
        }

        // Add to session history
        bidSession.sessionHistory.push({
          action: 'turn_skipped',
          userId: socket.user._id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          details: 'Turn skipped by user'
        });

        // Mark participant as skipped
        participant.skipped = true;
        await bidSession.save();

        // Move to next participant
        await moveToNextParticipant(bidSession);

        io.to(`bid-session-${sessionId}`).emit('turn-skipped', {
          sessionId,
          userId: socket.user._id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`
        });
      } catch (error) {
        console.error('Error skipping turn:', error);
        socket.emit('error', { message: 'Failed to skip turn' });
      }
    });

    // Request session update
    socket.on('request-session-update', async (data) => {
      try {
        const { sessionId } = data;
        const bidSession = await BidSession.findById(sessionId)
          .populate('participants.user', 'firstName lastName email rank')
          .populate('stations');

        if (bidSession) {
          socket.emit('session-update', {
            sessionId,
            session: bidSession,
            participants: bidSession.participants,
            currentParticipant: bidSession.currentParticipant,
            availableStations: bidSession.stations.filter(s => s.isAvailable)
          });
        }
      } catch (error) {
        console.error('Error updating session:', error);
      }
    });

    // Admin controls
    socket.on('admin-start-session', async (data) => {
      try {
        if (!socket.user.isAdmin) {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { sessionId } = data;
        const bidSession = await BidSession.findById(sessionId);
        
        if (bidSession) {
          bidSession.status = 'active';
          bidSession.currentParticipant = 1;
          bidSession.startedAt = new Date();
          await bidSession.save();

          io.to(`bid-session-${sessionId}`).emit('bid-session-started', {
            sessionId,
            sessionName: bidSession.name
          });

          // Start the first turn
          await startNextTurn(bidSession);
        }
      } catch (error) {
        console.error('Error starting session:', error);
        socket.emit('error', { message: 'Failed to start session' });
      }
    });

    socket.on('admin-pause-session', async (data) => {
      try {
        if (!socket.user.isAdmin) {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { sessionId } = data;
        const bidSession = await BidSession.findById(sessionId);
        
        if (bidSession) {
          bidSession.status = 'paused';
          await bidSession.save();

          io.to(`bid-session-${sessionId}`).emit('bid-session-paused', {
            sessionId,
            sessionName: bidSession.name
          });
        }
      } catch (error) {
        console.error('Error pausing session:', error);
        socket.emit('error', { message: 'Failed to pause session' });
      }
    });

    socket.on('admin-resume-session', async (data) => {
      try {
        if (!socket.user.isAdmin) {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { sessionId } = data;
        const bidSession = await BidSession.findById(sessionId);
        
        if (bidSession) {
          bidSession.status = 'active';
          await bidSession.save();

          io.to(`bid-session-${sessionId}`).emit('bid-session-resumed', {
            sessionId,
            sessionName: bidSession.name
          });

          // Resume current turn
          await startNextTurn(bidSession);
        }
      } catch (error) {
        console.error('Error resuming session:', error);
        socket.emit('error', { message: 'Failed to resume session' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email} (${socket.id})`);
      
      // Emit user offline status to admin room
      io.to('admin_room').emit('user-online-status', {
        userId: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        rank: socket.user.rank,
        isOnline: false,
        lastSeen: new Date()
      });
      
      // Emit user activity to admin room
      io.to('admin_room').emit('user-activity', {
        type: 'logout',
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        action: 'Logged out of the system',
        timestamp: new Date(),
        isOnline: false
      });
    });
  });

  return io;
};

// Helper functions
const processBid = async (bidSession, participant, bidData) => {
  try {
    // Check if station is available
    const station = bidSession.stations.find(s => 
      s._id.toString() === bidData.station && s.isAvailable
    );

    if (!station) {
      return { success: false, error: 'Selected station is not available' };
    }

    // Check if shift is available for this station
    const shiftAvailable = station.shifts.some(s => 
      s.shift === bidData.shift && s.isAvailable
    );

    if (!shiftAvailable) {
      return { success: false, error: 'Selected shift is not available for this station' };
    }

    // Create the bid
    const bid = {
      user: participant.user,
      station: bidData.station,
      shift: bidData.shift,
      position: bidData.position,
      submittedAt: new Date()
    };

    participant.bid = bid;
    participant.hasBid = true;
    participant.bidSubmittedAt = new Date();

    // Update station availability
    const stationIndex = bidSession.stations.findIndex(s => s._id.toString() === bidData.station);
    const shiftIndex = bidSession.stations[stationIndex].shifts.findIndex(s => s.shift === bidData.shift);
    
    bidSession.stations[stationIndex].shifts[shiftIndex].isAvailable = false;
    bidSession.stations[stationIndex].shifts[shiftIndex].assignedTo = participant.user;

    await bidSession.save();

    return { success: true };
  } catch (error) {
    console.error('Error processing bid:', error);
    return { success: false, error: 'Failed to process bid' };
  }
};

const moveToNextParticipant = async (bidSession) => {
  try {
    let nextPosition = bidSession.currentParticipant + 1;
    
    // Find next participant who hasn't bid and hasn't been skipped
    while (nextPosition <= bidSession.participants.length) {
      const nextParticipant = bidSession.participants.find(p => p.position === nextPosition);
      
      if (nextParticipant && !nextParticipant.hasBid && !nextParticipant.skipped) {
        bidSession.currentParticipant = nextPosition;
        await bidSession.save();
        await startNextTurn(bidSession);
        return;
      }
      nextPosition++;
    }

    // If we get here, all participants have had their turn
    bidSession.status = 'completed';
    bidSession.completedAt = new Date();
    await bidSession.save();

    io.to(`bid-session-${bidSession._id}`).emit('bid-session-completed', {
      sessionId: bidSession._id,
      sessionName: bidSession.name
    });
  } catch (error) {
    console.error('Error moving to next participant:', error);
  }
};

const startNextTurn = async (bidSession) => {
  try {
    const currentParticipant = bidSession.participants.find(p => p.position === bidSession.currentParticipant);
    
    if (currentParticipant) {
      const duration = bidSession.bidWindowDuration * 60; // Convert to seconds
      
      // Emit turn started event
      io.to(`bid-session-${bidSession._id}`).emit('turn-started', {
        sessionId: bidSession._id,
        userId: currentParticipant.user,
        duration: duration,
        participantName: `${currentParticipant.user.firstName} ${currentParticipant.user.lastName}`
      });

      // Set timeout for turn
      setTimeout(async () => {
        const updatedSession = await BidSession.findById(bidSession._id);
        if (updatedSession && updatedSession.currentParticipant === bidSession.currentParticipant) {
          // Turn timed out, auto-assign or skip
          const participant = updatedSession.participants.find(p => p.position === updatedSession.currentParticipant);
          
          if (participant && !participant.hasBid) {
            // Auto-assign based on preferences or skip
            await autoAssignStation(updatedSession, participant);
          }
          
          await moveToNextParticipant(updatedSession);
        }
      }, duration * 1000);
    }
  } catch (error) {
    console.error('Error starting next turn:', error);
  }
};

const autoAssignStation = async (bidSession, participant) => {
  try {
    // Find available station and shift
    for (const station of bidSession.stations) {
      for (const shift of station.shifts) {
        if (shift.isAvailable) {
          // Auto-assign this station/shift
          const bid = {
            user: participant.user,
            station: station._id,
            shift: shift.shift,
            position: 'auto-assigned',
            submittedAt: new Date(),
            autoAssigned: true
          };

          participant.bid = bid;
          participant.hasBid = true;
          participant.bidSubmittedAt = new Date();
          participant.autoAssigned = true;

          shift.isAvailable = false;
          shift.assignedTo = participant.user;

          await bidSession.save();

          // Notify user of auto-assignment
          io.to(`user-${participant.user}`).emit('auto-assignment', {
            sessionId: bidSession._id,
            station: station.name,
            shift: shift.shift
          });

          return;
        }
      }
    }

    // If no stations available, mark as skipped
    participant.skipped = true;
    await bidSession.save();
  } catch (error) {
    console.error('Error auto-assigning station:', error);
  }
};

// Export functions for use in other parts of the server
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
