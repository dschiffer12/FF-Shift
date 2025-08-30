const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const BidSession = require('../models/BidSession');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('currentStation', 'name number')
      .populate('assignedStation', 'name number')
      .populate('preferredStations', 'name number');

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('rank').optional().isIn(['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief']),
  body('position').optional().isIn(['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']),
  body('yearsOfService').optional().isInt({ min: 0 })
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, rank, position, yearsOfService } = req.body;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (rank) updateData.rank = rank;
    if (position) updateData.position = position;
    if (yearsOfService !== undefined) updateData.yearsOfService = yearsOfService;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Recalculate bid priority if relevant fields changed
    if (rank || position || yearsOfService !== undefined) {
      user.calculateBidPriority();
      await user.save();
    }

    res.json({ 
      message: 'Profile updated successfully',
      user 
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bidPreferences');
    res.json({ preferences: user.bidPreferences || {} });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user preferences
router.put('/preferences', [
  body('preferredStations').optional().isArray(),
  body('preferredShifts').optional().isArray(),
  body('preferredShifts.*').optional().isIn(['Day', 'Night', 'Swing', '24/48', '48/96']),
  body('autoBid').optional().isBoolean(),
  body('notifications').optional().isBoolean(),
  body('emailNotifications').optional().isBoolean(),
  body('smsNotifications').optional().isBoolean(),
  body('bidReminders').optional().isBoolean(),
  body('autoBidStrategy').optional().isIn(['preferred', 'closest', 'seniority', 'random']),
  body('maxBidAttempts').optional().isInt({ min: 1, max: 10 }),
  body('bidTimeout').optional().isInt({ min: 10, max: 300 })
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      preferredStations,
      preferredShifts,
      autoBid,
      notifications,
      emailNotifications,
      smsNotifications,
      bidReminders,
      autoBidStrategy,
      maxBidAttempts,
      bidTimeout
    } = req.body;

    const updateData = {};
    if (preferredStations !== undefined) updateData['bidPreferences.preferredStations'] = preferredStations;
    if (preferredShifts !== undefined) updateData['bidPreferences.preferredShifts'] = preferredShifts;
    if (autoBid !== undefined) updateData['bidPreferences.autoBid'] = autoBid;
    if (notifications !== undefined) updateData['bidPreferences.notifications'] = notifications;
    if (emailNotifications !== undefined) updateData['bidPreferences.emailNotifications'] = emailNotifications;
    if (smsNotifications !== undefined) updateData['bidPreferences.smsNotifications'] = smsNotifications;
    if (bidReminders !== undefined) updateData['bidPreferences.bidReminders'] = bidReminders;
    if (autoBidStrategy !== undefined) updateData['bidPreferences.autoBidStrategy'] = autoBidStrategy;
    if (maxBidAttempts !== undefined) updateData['bidPreferences.maxBidAttempts'] = maxBidAttempts;
    if (bidTimeout !== undefined) updateData['bidPreferences.bidTimeout'] = bidTimeout;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    )
    .select('bidPreferences');

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: user.bidPreferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user's bid history
router.get('/bid-history', authenticateToken, async (req, res) => {
  try {
    // Find all bid sessions where the user is a participant
    const bidSessions = await BidSession.find({
      'participants.user': req.user._id
    }).populate('participants.user', 'firstName lastName rank position')
      .populate('participants.assignedStation', 'name number')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const bidHistory = [];

    bidSessions.forEach(session => {
      const participant = session.participants.find(
        p => p.user._id.toString() === req.user._id.toString()
      );

      if (participant && participant.bidHistory && participant.bidHistory.length > 0) {
        participant.bidHistory.forEach(bid => {
          bidHistory.push({
            _id: bid._id,
            session: {
              _id: session._id,
              name: session.name,
              year: session.year
            },
            station: bid.station,
            shift: bid.shift,
            position: bid.position,
            timestamp: bid.timestamp,
            status: participant.hasBid ? 'completed' : 'pending',
            bidPriority: participant.bidPriority
          });
        });
      } else if (participant) {
        // Add a record for participation even if no bids were made
        bidHistory.push({
          _id: session._id,
          session: {
            _id: session._id,
            name: session.name,
            year: session.year
          },
          station: participant.assignedStation,
          shift: participant.assignedShift,
          position: participant.assignedPosition,
          timestamp: session.createdAt,
          status: participant.hasBid ? 'completed' : 'pending',
          bidPriority: participant.bidPriority
        });
      }
    });

    res.json({ bidHistory });

  } catch (error) {
    console.error('Get bid history error:', error);
    res.status(500).json({ error: 'Failed to get bid history' });
  }
});

// Get user's current bid status
router.get('/bid-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentBidSession')
      .populate('assignedStation', 'name number');

    if (!user.currentBidSession) {
      return res.json({ 
        hasActiveSession: false,
        message: 'No active bid session'
      });
    }

    const participant = user.currentBidSession.participants.find(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!participant) {
      return res.json({ 
        hasActiveSession: false,
        message: 'Not participating in current session'
      });
    }

    const now = new Date();
    const canBid = participant.timeWindow.start <= now && now <= participant.timeWindow.end;
    const timeRemaining = Math.max(0, participant.timeWindow.end.getTime() - now.getTime());

    res.json({
      hasActiveSession: true,
      session: user.currentBidSession.getSummary(),
      participant: {
        position: participant.position,
        bidPriority: participant.bidPriority,
        hasBid: participant.hasBid,
        autoAssigned: participant.autoAssigned,
        assignedStation: user.assignedStation,
        assignedShift: user.assignedShift,
        timeWindow: participant.timeWindow,
        canBid,
        timeRemaining,
        isCurrentParticipant: user.currentBidSession.currentParticipant === participant.position
      }
    });

  } catch (error) {
    console.error('Get bid status error:', error);
    res.status(500).json({ error: 'Failed to get bid status' });
  }
});

// Get user's seniority information
router.get('/seniority', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      seniorityScore: user.seniorityScore,
      bidPriority: user.bidPriority,
      rank: user.rank,
      position: user.position,
      yearsOfService: user.yearsOfService
    });

  } catch (error) {
    console.error('Get seniority error:', error);
    res.status(500).json({ error: 'Failed to get seniority information' });
  }
});

// Get user's recent activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    // For now, return mock data. In a real application, you would track user activity
    const activities = [
      {
        type: 'login',
        title: 'Logged in',
        description: 'Successfully logged into the system',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        type: 'profile',
        title: 'Profile Updated',
        description: 'Updated personal information',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        type: 'bid',
        title: 'Bid Submitted',
        description: 'Submitted bid for Station 1, A Shift',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];

    res.json({ activities });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find({})
      .select('firstName lastName email rank position yearsOfService isAdmin')
      .sort({ lastName: 1, firstName: 1 });

    res.json({ users });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user's notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    // For now, return mock data. In a real application, you would have a notifications system
    const notifications = [
      {
        title: 'Bid Session Starting',
        message: 'A new bid session will start in 30 minutes',
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        title: 'Your Turn',
        message: 'It\'s your turn to place a bid',
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        title: 'Bid Confirmed',
        message: 'Your bid for Station 2 has been confirmed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    ];

    res.json({ notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

module.exports = router;
