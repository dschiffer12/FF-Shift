const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const BidSession = require('../models/BidSession');
const notificationScheduler = require('../services/notificationScheduler');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// Get notification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = notificationScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({ error: 'Failed to get notification status' });
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { 
      notifications, 
      emailNotifications, 
      smsNotifications, 
      bidReminders 
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize bidPreferences if it doesn't exist
    if (!user.bidPreferences) {
      user.bidPreferences = {};
    }

    // Update preferences
    if (notifications !== undefined) user.bidPreferences.notifications = notifications;
    if (emailNotifications !== undefined) user.bidPreferences.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) user.bidPreferences.smsNotifications = smsNotifications;
    if (bidReminders !== undefined) user.bidPreferences.bidReminders = bidReminders;

    await user.save();

    res.json({ 
      message: 'Notification preferences updated successfully',
      preferences: user.bidPreferences 
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Update user phone number
router.put('/phone', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone number
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(cleanNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    res.json({ 
      message: 'Phone number updated successfully',
      phoneNumber: user.phoneNumber 
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      preferences: user.bidPreferences || {},
      phoneNumber: user.phoneNumber
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// Test notification (admin only)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, sessionId, type = 'email' } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'User ID and Session ID are required' });
    }

    const result = await notificationScheduler.sendTestNotification(userId, sessionId, type);
    res.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Send manual notification to all participants in a session (admin only)
router.post('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId } = req.params;
    const { type = 'email', message } = req.body;

    const session = await BidSession.findById(sessionId).populate('participants.user');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const results = [];
    for (const participant of session.participants) {
      const participantUser = participant.user;
      if (!participantUser) continue;

      try {
        const timeWindow = {
          start: new Date(),
          end: new Date(Date.now() + (session.bidWindowDuration * 60 * 1000))
        };

        if (type === 'email') {
          await emailService.sendBidStartNotificationEmail(participantUser, session, timeWindow);
        } else if (type === 'sms') {
          await smsService.sendBidStartSMS(participantUser, session, timeWindow);
        }

        results.push({
          userId: participantUser._id,
          email: participantUser.email,
          success: true
        });
      } catch (error) {
        results.push({
          userId: participantUser._id,
          email: participantUser.email,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: `Manual ${type} notifications sent to ${results.length} participants`,
      results
    });
  } catch (error) {
    console.error('Error sending manual notifications:', error);
    res.status(500).json({ error: 'Failed to send manual notifications' });
  }
});

// Clear scheduled notifications (admin only)
router.delete('/scheduled', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    notificationScheduler.clearScheduledNotifications();
    res.json({ message: 'Scheduled notifications cleared' });
  } catch (error) {
    console.error('Error clearing scheduled notifications:', error);
    res.status(500).json({ error: 'Failed to clear scheduled notifications' });
  }
});

// Verify email service connection
router.get('/verify/email', authenticateToken, async (req, res) => {
  try {
    const isConnected = await emailService.verifyConnection();
    res.json({ 
      connected: isConnected,
      service: process.env.EMAIL_SERVICE || 'gmail'
    });
  } catch (error) {
    console.error('Error verifying email service:', error);
    res.status(500).json({ error: 'Failed to verify email service' });
  }
});

// Verify SMS service connection
router.get('/verify/sms', authenticateToken, async (req, res) => {
  try {
    const isAvailable = smsService.isAvailable();
    res.json({ 
      available: isAvailable,
      service: 'twilio'
    });
  } catch (error) {
    console.error('Error verifying SMS service:', error);
    res.status(500).json({ error: 'Failed to verify SMS service' });
  }
});

// Get scheduled notifications (admin only)
router.get('/scheduled', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const scheduledNotifications = notificationScheduler.getScheduledNotifications();
    res.json({ scheduledNotifications });
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    res.status(500).json({ error: 'Failed to get scheduled notifications' });
  }
});

// Get notification history (admin only)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 50, type, userId } = req.query;
    const skip = (page - 1) * limit;

    // For now, return mock data. In a real application, you would have a NotificationHistory model
    const mockHistory = [
      {
        id: '1',
        type: 'email',
        recipient: 'john.doe@example.com',
        subject: 'Bid Session Reminder',
        status: 'sent',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        sessionName: 'January 2024 Bid Session',
        userId: 'user123'
      },
      {
        id: '2',
        type: 'sms',
        recipient: '+15551234567',
        subject: 'Bid Time Starting',
        status: 'sent',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        sessionName: 'January 2024 Bid Session',
        userId: 'user456'
      },
      {
        id: '3',
        type: 'email',
        recipient: 'jane.smith@example.com',
        subject: 'Bid Session Reminder',
        status: 'failed',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        sessionName: 'January 2024 Bid Session',
        userId: 'user789',
        error: 'Invalid email address'
      }
    ];

    // Filter by type if provided
    let filteredHistory = mockHistory;
    if (type) {
      filteredHistory = filteredHistory.filter(notification => notification.type === type);
    }

    // Filter by userId if provided
    if (userId) {
      filteredHistory = filteredHistory.filter(notification => notification.userId === userId);
    }

    // Paginate
    const total = filteredHistory.length;
    const paginatedHistory = filteredHistory.slice(skip, skip + parseInt(limit));

    res.json({
      history: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({ error: 'Failed to get notification history' });
  }
});

module.exports = router;
