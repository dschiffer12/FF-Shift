const express = require('express');
const { body, validationResult } = require('express-validator');
const BidSession = require('../models/BidSession');
const User = require('../models/User');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all bid sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, year } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);

    const bidSessions = await BidSession.find(filter)
      .populate('participants.user', 'firstName lastName rank position employeeId')
      .populate('participants.assignedStation', 'name number')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const sessions = bidSessions.map(session => session.getSummary());

    res.json({ sessions });
  } catch (error) {
    console.error('Get bid sessions error:', error);
    res.status(500).json({ error: 'Failed to get bid sessions' });
  }
});

// Get current/active bid session
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const activeSession = await BidSession.findOne({
      status: { $in: ['active', 'waiting'] }
    }).populate('participants.user', 'firstName lastName rank position employeeId')
      .populate('participants.assignedStation', 'name number')
      .populate('createdBy', 'firstName lastName');

    if (!activeSession) {
      return res.status(200).json({ session: null });
    }

    res.json({ session: activeSession });
  } catch (error) {
    console.error('Get current bid session error:', error);
    res.status(500).json({ error: 'Failed to get current bid session' });
  }
});

// Get single bid session
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bidSession = await BidSession.findById(req.params.id)
      .populate('participants.user', 'firstName lastName rank position employeeId')
      .populate('participants.assignedStation', 'name number')
      .populate('createdBy', 'firstName lastName');

    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    res.json({ bidSession });
  } catch (error) {
    console.error('Get bid session error:', error);
    res.status(500).json({ error: 'Failed to get bid session' });
  }
});

// Create new bid session (admin only)
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Session name must be at least 2 characters'),
  body('year').isInt({ min: 2024 }).withMessage('Year must be 2024 or later'),
  body('scheduledStart').isISO8601().withMessage('Valid start date is required'),
  body('scheduledEnd').isISO8601().withMessage('Valid end date is required'),
  body('bidWindowDuration').optional().isInt({ min: 1, max: 60 }).withMessage('Bid window must be between 1-60 minutes'),
  body('autoAssignTimeout').optional().isInt({ min: 1, max: 30 }).withMessage('Auto-assign timeout must be between 1-30 minutes'),
  body('participantIds').optional().isArray().withMessage('Participant IDs must be an array'),
  body('participantIds.*').optional().isMongoId().withMessage('Invalid participant ID format')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      year, 
      description, 
      scheduledStart, 
      scheduledEnd, 
      bidWindowDuration, 
      autoAssignTimeout,
      settings,
      participantIds 
    } = req.body;

    // Validate dates
    if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const bidSession = new BidSession({
      name,
      year,
      description,
      scheduledStart,
      scheduledEnd,
      bidWindowDuration: bidWindowDuration || 5,
      autoAssignTimeout: autoAssignTimeout || 2,
      settings: settings || {},
      createdBy: req.user._id
    });

    await bidSession.save();

    // Add participants if provided
    if (participantIds && participantIds.length > 0) {
      // Get users and calculate their bid priorities
      const users = await User.find({ _id: { $in: participantIds } });
      
      for (const user of users) {
        user.calculateBidPriority();
        await bidSession.addParticipant(user._id, user.bidPriority);
      }

      // Sort participants by bid priority (highest first)
      bidSession.participants.sort((a, b) => b.bidPriority - a.bidPriority);
      
      // Update positions after sorting
      bidSession.participants.forEach((participant, index) => {
        participant.position = index;
      });
      
      bidSession.totalParticipants = bidSession.participants.length;
      await bidSession.save();
    }

    // Get the updated session with participants
    const updatedSession = await BidSession.findById(bidSession._id)
      .populate('participants.user', 'firstName lastName rank position employeeId')
      .populate('createdBy', 'firstName lastName');

    // Emit socket notification to all participants and automatically join them to the session
    if (global.io && participantIds && participantIds.length > 0) {
      participantIds.forEach(userId => {
        // Notify user about new bid session
        global.io.to(`user_${userId}`).emit('new-bid-session', {
          sessionId: bidSession._id,
          sessionName: bidSession.name,
          scheduledStart: bidSession.scheduledStart,
          scheduledEnd: bidSession.scheduledEnd,
          participantCount: bidSession.participants.length,
          createdBy: req.user.firstName + ' ' + req.user.lastName
        });
        
        // Automatically join the user to the bid session room
        global.io.to(`user_${userId}`).emit('auto-join-bid-session', {
          sessionId: bidSession._id,
          sessionName: bidSession.name
        });
      });

      // Also notify admin room
      global.io.to('admin_room').emit('bid-session-created', {
        sessionId: bidSession._id,
        sessionName: bidSession.name,
        participantCount: bidSession.participants.length,
        createdBy: req.user.firstName + ' ' + req.user.lastName
      });
    }

    res.status(201).json({
      message: 'Bid session created successfully',
      session: updatedSession.getSummary()
    });

  } catch (error) {
    console.error('Create bid session error:', error);
    res.status(500).json({ error: 'Failed to create bid session' });
  }
});

// Update bid session (admin only)
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('year').optional().isInt({ min: 2024 }),
  body('scheduledStart').optional().isISO8601(),
  body('scheduledEnd').optional().isISO8601(),
  body('bidWindowDuration').optional().isInt({ min: 1, max: 60 }),
  body('autoAssignTimeout').optional().isInt({ min: 1, max: 30 })
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      year, 
      description, 
      scheduledStart, 
      scheduledEnd, 
      bidWindowDuration, 
      autoAssignTimeout,
      settings 
    } = req.body;

    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    // Don't allow updates if session is active or completed
    if (['active', 'completed'].includes(bidSession.status)) {
      return res.status(400).json({ error: 'Cannot update active or completed session' });
    }

    // Validate dates if both are provided
    if (scheduledStart && scheduledEnd) {
      if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (year) updateData.year = year;
    if (description !== undefined) updateData.description = description;
    if (scheduledStart) updateData.scheduledStart = scheduledStart;
    if (scheduledEnd) updateData.scheduledEnd = scheduledEnd;
    if (bidWindowDuration) updateData.bidWindowDuration = bidWindowDuration;
    if (autoAssignTimeout) updateData.autoAssignTimeout = autoAssignTimeout;
    if (settings) updateData.settings = settings;

    const updatedSession = await BidSession.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Bid session updated successfully',
      bidSession: updatedSession.getSummary()
    });

  } catch (error) {
    console.error('Update bid session error:', error);
    res.status(500).json({ error: 'Failed to update bid session' });
  }
});

// Delete bid session (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const bidSession = await BidSession.findById(req.params.id);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    // Don't allow deletion if session is active or completed
    if (['active', 'completed'].includes(bidSession.status)) {
      return res.status(400).json({ error: 'Cannot delete active or completed session' });
    }

    await BidSession.findByIdAndDelete(req.params.id);

    // Emit socket notification to admin room
    if (global.io) {
      global.io.to('admin_room').emit('bid-session-deleted', {
        sessionId: req.params.id,
        sessionName: bidSession.name
      });
    }

    res.json({ message: 'Bid session deleted successfully' });

  } catch (error) {
    console.error('Delete bid session error:', error);
    res.status(500).json({ error: 'Failed to delete bid session' });
  }
});

// Add participants to bid session (admin only)
router.post('/:id/participants', [
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID format')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userIds } = req.body;

    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    // Don't allow changes if session is active or completed
    if (['active', 'completed'].includes(bidSession.status)) {
      return res.status(400).json({ error: 'Cannot modify active or completed session' });
    }

    // Get users and calculate their bid priorities
    const users = await User.find({ _id: { $in: userIds } });
    
    // Track which users were actually added
    const newlyAddedUserIds = [];
    
    for (const user of users) {
      // Check if user is already a participant
      const existingParticipant = bidSession.participants.find(
        p => p.user.toString() === user._id.toString()
      );
      
      if (!existingParticipant) {
        user.calculateBidPriority();
        await bidSession.addParticipant(user._id, user.bidPriority);
        newlyAddedUserIds.push(user._id);
      }
    }

    // Sort participants by bid priority (highest first)
    bidSession.participants.sort((a, b) => b.bidPriority - a.bidPriority);
    
    // Update positions after sorting
    bidSession.participants.forEach((participant, index) => {
      participant.position = index;
    });

    await bidSession.save();

    // Emit socket notification to newly added participants and automatically join them to the session
    if (global.io) {
      newlyAddedUserIds.forEach(userId => {
        // Notify user they've been added to the session
        global.io.to(`user_${userId}`).emit('added-to-bid-session', {
          sessionId: bidSession._id,
          sessionName: bidSession.name,
          participantCount: bidSession.totalParticipants
        });
        
        // Automatically join the user to the bid session room
        global.io.to(`user_${userId}`).emit('auto-join-bid-session', {
          sessionId: bidSession._id,
          sessionName: bidSession.name
        });
      });

      // Notify admin room
      global.io.to('admin_room').emit('participants-added', {
        sessionId: bidSession._id,
        sessionName: bidSession.name,
        totalParticipants: bidSession.totalParticipants,
        addedCount: newlyAddedUserIds.length
      });
    }

    res.json({
      message: 'Participants added successfully',
      totalParticipants: bidSession.totalParticipants
    });

  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({ error: 'Failed to add participants' });
  }
});

// Remove participant from bid session (admin only)
router.delete('/:id/participants/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const bidSession = await BidSession.findById(id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    // Don't allow changes if session is active or completed
    if (['active', 'completed'].includes(bidSession.status)) {
      return res.status(400).json({ error: 'Cannot modify active or completed session' });
    }

    // Remove participant
    bidSession.participants = bidSession.participants.filter(
      p => p.user.toString() !== userId
    );

    // Recalculate positions
    bidSession.participants.forEach((participant, index) => {
      participant.position = index;
    });

    bidSession.totalParticipants = bidSession.participants.length;
    await bidSession.save();

    res.json({
      message: 'Participant removed successfully',
      totalParticipants: bidSession.totalParticipants
    });

  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// Start bid session (admin only)
router.post('/:id/start', authenticateAdmin, async (req, res) => {
  try {
    console.log('Starting bid session with ID:', req.params.id);
    
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid session ID provided' });
    }

    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    console.log('Found bid session:', bidSession.name, 'Status:', bidSession.status);

    if (bidSession.status !== 'scheduled' && bidSession.status !== 'draft') {
      return res.status(400).json({ error: 'Session must be scheduled or draft to start' });
    }

    if (bidSession.participants.length === 0) {
      return res.status(400).json({ error: 'Cannot start session without participants' });
    }

    console.log('Starting session with', bidSession.participants.length, 'participants');
    await bidSession.startSession();

    // Emit socket notification to all participants
    if (global.io && bidSession.participants.length > 0) {
      bidSession.participants.forEach(participant => {
        global.io.to(`user-${participant.user}`).emit('bid-session-started', {
          sessionId: bidSession._id,
          sessionName: bidSession.name,
          scheduledStart: bidSession.scheduledStart,
          scheduledEnd: bidSession.scheduledEnd
        });
      });

      // Also notify admin room
      global.io.to('admin_room').emit('bid-session-started', {
        sessionId: bidSession._id,
        sessionName: bidSession.name,
        participantCount: bidSession.participants.length
      });
    }

    res.json({
      message: 'Bid session started successfully',
      bidSession: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Start bid session error:', error);
    res.status(500).json({ error: 'Failed to start bid session' });
  }
});

// Pause bid session (admin only)
router.post('/:id/pause', authenticateAdmin, async (req, res) => {
  try {
    console.log('Pausing bid session with ID:', req.params.id);
    
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid session ID provided' });
    }

    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Session must be active to pause' });
    }

    console.log('Pausing session:', bidSession.name);
    await bidSession.pauseSession();

    // Emit socket notification to all participants
    if (global.io && bidSession.participants.length > 0) {
      bidSession.participants.forEach(participant => {
        global.io.to(`user-${participant.user}`).emit('bid-session-paused', {
          sessionId: bidSession._id,
          sessionName: bidSession.name
        });
      });

      // Also notify admin room
      global.io.to('admin_room').emit('bid-session-paused', {
        sessionId: bidSession._id,
        sessionName: bidSession.name
      });
    }

    res.json({
      message: 'Bid session paused successfully',
      bidSession: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Pause bid session error:', error);
    res.status(500).json({ error: 'Failed to pause bid session' });
  }
});

// Resume bid session (admin only)
router.post('/:id/resume', authenticateAdmin, async (req, res) => {
  try {
    console.log('Resuming bid session with ID:', req.params.id);
    
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Invalid session ID provided' });
    }

    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'paused') {
      return res.status(400).json({ error: 'Session must be paused to resume' });
    }

    console.log('Resuming session:', bidSession.name);
    await bidSession.resumeSession();

    // Emit socket notification to all participants
    if (global.io && bidSession.participants.length > 0) {
      bidSession.participants.forEach(participant => {
        global.io.to(`user-${participant.user}`).emit('bid-session-resumed', {
          sessionId: bidSession._id,
          sessionName: bidSession.name
        });
      });

      // Also notify admin room
      global.io.to('admin_room').emit('bid-session-resumed', {
        sessionId: bidSession._id,
        sessionName: bidSession.name
      });
    }

    res.json({
      message: 'Bid session resumed successfully',
      bidSession: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Resume bid session error:', error);
    res.status(500).json({ error: 'Failed to resume bid session' });
  }
});

// POST /api/bid-sessions/:id/skip-turn - Skip current participant's turn (admin only)
router.post('/:id/skip-turn', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const bidSession = await BidSession.findById(req.params.id);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Bid session is not active' });
    }

    // Find the current participant
    const currentParticipant = bidSession.participants.find(p => p.position === bidSession.currentParticipant);
    
    if (!currentParticipant || currentParticipant.user.toString() !== userId) {
      return res.status(400).json({ error: 'Invalid current participant' });
    }

    // Mark the current participant as skipped
    currentParticipant.hasBid = true;
    currentParticipant.skipped = true;
    bidSession.completedBids++;

    // Advance to next participant
    bidSession.currentParticipant++;

    if (bidSession.currentParticipant > bidSession.participants.length) {
      // Session is complete
      bidSession.status = 'completed';
      bidSession.actualEnd = new Date();
    } else {
      // Set up next participant's time window
      bidSession.setCurrentParticipantTimeWindow();
    }

    await bidSession.save();

    // Emit turn update to all connected clients
    if (global.io) {
      global.io.emit('turn-updated', {
        sessionId: bidSession._id,
        currentParticipant: bidSession.currentParticipant,
        completedBids: bidSession.completedBids,
        status: bidSession.status
      });
    }

    res.json({ 
      message: 'Turn skipped successfully',
      session: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Skip turn error:', error);
    res.status(500).json({ error: 'Failed to skip turn' });
  }
});

// POST /api/bid-sessions/:id/move-to-back - Move current participant to back of queue (admin only)
router.post('/:id/move-to-back', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const bidSession = await BidSession.findById(req.params.id);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Bid session is not active' });
    }

    // Find the current participant
    const currentParticipant = bidSession.participants.find(p => p.position === bidSession.currentParticipant - 1);
    
    if (!currentParticipant || currentParticipant.user.toString() !== userId) {
      return res.status(400).json({ error: 'Invalid current participant' });
    }

    // Move the current participant to the back of the queue
    await bidSession.moveCurrentParticipantToBack();

    // Emit turn update to all connected clients
    if (global.io) {
      global.io.emit('turn-updated', {
        sessionId: bidSession._id,
        currentParticipant: bidSession.currentParticipant,
        completedBids: bidSession.completedBids,
        status: bidSession.status
      });
    }

    res.json({ 
      message: 'Participant moved to back of queue successfully',
      session: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Move to back error:', error);
    res.status(500).json({ error: 'Failed to move participant to back of queue' });
  }
});

// Check time expiration for current participant (admin only)
router.post('/:id/check-time-expiration', authenticateAdmin, async (req, res) => {
  try {
    const bidSession = await BidSession.findById(req.params.id);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Bid session is not active' });
    }

    const timeExpired = await bidSession.checkTimeExpiration();
    
    if (timeExpired) {
      // Emit turn update to all connected clients
      if (global.io) {
        global.io.emit('turn-updated', {
          sessionId: bidSession._id,
          currentParticipant: bidSession.currentParticipant,
          completedBids: bidSession.completedBids,
          status: bidSession.status,
          message: 'Participant moved to back due to time expiration'
        });
      }
    }

    res.json({ 
      timeExpired,
      session: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Check time expiration error:', error);
    res.status(500).json({ error: 'Failed to check time expiration' });
  }
});

// Get current user's participation in bid session
router.get('/:id/my-participation', authenticateToken, async (req, res) => {
  try {
    const bidSession = await BidSession.findById(req.params.id)
      .populate('participants.user', 'firstName lastName rank position');

    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    const participant = bidSession.participants.find(
      p => p.user._id.toString() === req.user._id.toString()
    );

    if (!participant) {
      return res.json({ 
        isParticipating: false,
        message: 'Not participating in this session'
      });
    }

    const now = new Date();
    const canBid = participant.timeWindow.start <= now && now <= participant.timeWindow.end;
    const timeRemaining = Math.max(0, participant.timeWindow.end.getTime() - now.getTime());

    res.json({
      isParticipating: true,
      participant: {
        position: participant.position,
        bidPriority: participant.bidPriority,
        hasBid: participant.hasBid,
        autoAssigned: participant.autoAssigned,
        attempts: participant.attempts || 0,
        timeWindow: participant.timeWindow,
        canBid,
        timeRemaining,
        isCurrentParticipant: bidSession.currentParticipant === participant.position
      },
      session: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Get participation error:', error);
    res.status(500).json({ error: 'Failed to get participation info' });
  }
});

module.exports = router;
