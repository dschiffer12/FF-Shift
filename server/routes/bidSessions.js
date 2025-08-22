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
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const sessions = bidSessions.map(session => session.getSummary());

    res.json({ sessions });
  } catch (error) {
    console.error('Get bid sessions error:', error);
    res.status(500).json({ error: 'Failed to get bid sessions' });
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
  body('autoAssignTimeout').optional().isInt({ min: 1, max: 30 }).withMessage('Auto-assign timeout must be between 1-30 minutes')
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

    res.status(201).json({
      message: 'Bid session created successfully',
      bidSession: bidSession.getSummary()
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
    
    for (const user of users) {
      // Check if user is already a participant
      const existingParticipant = bidSession.participants.find(
        p => p.user.toString() === user._id.toString()
      );
      
      if (!existingParticipant) {
        user.calculateBidPriority();
        await bidSession.addParticipant(user._id, user.bidPriority);
      }
    }

    // Sort participants by bid priority (highest first)
    bidSession.participants.sort((a, b) => b.bidPriority - a.bidPriority);
    
    // Update positions after sorting
    bidSession.participants.forEach((participant, index) => {
      participant.position = index;
    });

    await bidSession.save();

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
    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'scheduled' && bidSession.status !== 'draft') {
      return res.status(400).json({ error: 'Session must be scheduled or draft to start' });
    }

    if (bidSession.participants.length === 0) {
      return res.status(400).json({ error: 'Cannot start session without participants' });
    }

    await bidSession.startSession();

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
    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Session must be active to pause' });
    }

    await bidSession.pauseSession();

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
    const bidSession = await BidSession.findById(req.params.id);
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'paused') {
      return res.status(400).json({ error: 'Session must be paused to resume' });
    }

    await bidSession.resumeSession();

    res.json({
      message: 'Bid session resumed successfully',
      bidSession: bidSession.getSummary()
    });

  } catch (error) {
    console.error('Resume bid session error:', error);
    res.status(500).json({ error: 'Failed to resume bid session' });
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
