const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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

// Update user preferences
router.put('/preferences', [
  body('preferredStations').optional().isArray(),
  body('preferredShifts').optional().isArray(),
  body('preferredShifts.*').optional().isIn(['A', 'B', 'C'])
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { preferredStations, preferredShifts } = req.body;

    const updateData = {};
    if (preferredStations !== undefined) updateData.preferredStations = preferredStations;
    if (preferredShifts !== undefined) updateData.preferredShifts = preferredShifts;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    )
    .select('-password')
    .populate('preferredStations', 'name number');

    res.json({ 
      message: 'Preferences updated successfully',
      user 
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
    const user = await User.findById(req.user._id)
      .populate({
        path: 'currentBidSession',
        populate: {
          path: 'participants.user',
          select: 'firstName lastName rank position'
        }
      });

    if (!user.currentBidSession) {
      return res.json({ bidHistory: [] });
    }

    const participant = user.currentBidSession.participants.find(
      p => p.user._id.toString() === req.user._id.toString()
    );

    res.json({ 
      bidHistory: participant ? participant.bidHistory : [],
      session: user.currentBidSession.getSummary()
    });

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

module.exports = router;
