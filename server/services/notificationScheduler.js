const BidSession = require('../models/BidSession');
const User = require('../models/User');
const emailService = require('./emailService');
const smsService = require('./smsService');

class NotificationScheduler {
  constructor() {
    this.scheduledNotifications = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting notification scheduler...');

    // Check for notifications every minute
    setInterval(() => {
      this.checkAndSendNotifications();
    }, 60000); // 1 minute

    // Initial check
    this.checkAndSendNotifications();
  }

  stop() {
    this.isRunning = false;
    console.log('Notification scheduler stopped');
  }

  async checkAndSendNotifications() {
    try {
      // Find all active bid sessions
      const activeSessions = await BidSession.find({ 
        status: 'active' 
      }).populate('participants.user');

      for (const session of activeSessions) {
        await this.processSessionNotifications(session);
      }

      // Check for daily reminders for scheduled sessions
      await this.checkDailyReminders();
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  async processSessionNotifications(session) {
    const now = new Date();
    
    for (let i = 0; i < session.participants.length; i++) {
      const participant = session.participants[i];
      const user = participant.user;
      
      if (!user || participant.hasBid) continue;

      const timeWindow = participant.timeWindow;
      if (!timeWindow || !timeWindow.start || !timeWindow.end) continue;

      const startTime = new Date(timeWindow.start);
      const endTime = new Date(timeWindow.end);

      // Check if it's time for 5-minute SMS notification
      const fiveMinutesBefore = new Date(startTime.getTime() - (5 * 60 * 1000));
      const fiveMinuteKey = `sms_5min_${session._id}_${user._id}`;
      
      if (now >= fiveMinutesBefore && now < startTime && !this.scheduledNotifications.has(fiveMinuteKey)) {
        await this.sendBidStartNotification(user, session, timeWindow, 'sms');
        this.scheduledNotifications.set(fiveMinuteKey, true);
      }

      // Check if it's time for email notification (when bid window starts)
      const emailKey = `email_start_${session._id}_${user._id}`;
      
      if (now >= startTime && now < endTime && !this.scheduledNotifications.has(emailKey)) {
        await this.sendBidStartNotification(user, session, timeWindow, 'email');
        this.scheduledNotifications.set(emailKey, true);
      }
    }
  }

  async checkDailyReminders() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));

      // Find sessions scheduled for tomorrow
      const tomorrowSessions = await BidSession.find({
        status: 'scheduled',
        scheduledStart: {
          $gte: tomorrow,
          $lt: new Date(tomorrow.getTime() + (24 * 60 * 60 * 1000))
        }
      }).populate('participants.user');

      for (const session of tomorrowSessions) {
        await this.sendDailyReminders(session);
      }
    } catch (error) {
      console.error('Error checking daily reminders:', error);
    }
  }

  async sendDailyReminders(session) {
    const reminderKey = `daily_reminder_${session._id}`;
    
    // Only send once per session per day
    if (this.scheduledNotifications.has(reminderKey)) {
      return;
    }

    for (const participant of session.participants) {
      const user = participant.user;
      if (!user) continue;

      // Calculate time window based on position and bid window duration
      const sessionStart = new Date(session.scheduledStart);
      const participantStart = new Date(sessionStart.getTime() + (participant.position * session.bidWindowDuration * 60 * 1000));
      const participantEnd = new Date(participantStart.getTime() + (session.bidWindowDuration * 60 * 1000));

      const timeWindow = {
        start: participantStart,
        end: participantEnd
      };

      await this.sendBidReminderNotification(user, session, timeWindow);
    }

    this.scheduledNotifications.set(reminderKey, true);
  }

  async sendBidStartNotification(user, session, timeWindow, type) {
    try {
      // Check user preferences
      if (!user.bidPreferences || !user.bidPreferences.notifications) {
        console.log(`Notifications disabled for user ${user._id}`);
        return;
      }

      if (type === 'sms') {
        if (user.bidPreferences.smsNotifications && user.phoneNumber) {
          await smsService.sendBidStartSMS(user, session, timeWindow);
        }
      } else if (type === 'email') {
        if (user.bidPreferences.emailNotifications) {
          await emailService.sendBidStartNotificationEmail(user, session, timeWindow);
        }
      }

      console.log(`${type.toUpperCase()} notification sent to ${user.email} for session ${session.name}`);
    } catch (error) {
      console.error(`Error sending ${type} notification to ${user.email}:`, error);
    }
  }

  async sendBidReminderNotification(user, session, timeWindow) {
    try {
      // Check user preferences
      if (!user.bidPreferences || !user.bidPreferences.notifications) {
        return;
      }

      // Send email reminder
      if (user.bidPreferences.emailNotifications) {
        await emailService.sendBidReminderEmail(user, session, timeWindow);
      }

      // Send SMS reminder (if enabled and phone number available)
      if (user.bidPreferences.smsNotifications && user.phoneNumber) {
        await smsService.sendBidReminderSMS(user, session, timeWindow);
      }

      console.log(`Daily reminder sent to ${user.email} for session ${session.name}`);
    } catch (error) {
      console.error(`Error sending daily reminder to ${user.email}:`, error);
    }
  }

  // Manual notification methods for testing
  async sendTestNotification(userId, sessionId, type = 'email') {
    try {
      const user = await User.findById(userId);
      const session = await BidSession.findById(sessionId);

      if (!user || !session) {
        throw new Error('User or session not found');
      }

      const timeWindow = {
        start: new Date(),
        end: new Date(Date.now() + (session.bidWindowDuration * 60 * 1000))
      };

      if (type === 'email') {
        await emailService.sendBidStartNotificationEmail(user, session, timeWindow);
      } else if (type === 'sms') {
        await smsService.sendBidStartSMS(user, session, timeWindow);
      }

      return { success: true, message: `${type.toUpperCase()} test notification sent` };
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Clear scheduled notifications (useful for testing)
  clearScheduledNotifications() {
    this.scheduledNotifications.clear();
    console.log('Scheduled notifications cleared');
  }

  // Get notification status
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledCount: this.scheduledNotifications.size,
      emailServiceAvailable: emailService.transporter !== null,
      smsServiceAvailable: smsService.isAvailable()
    };
  }

  // Get scheduled notifications for admin view
  getScheduledNotifications() {
    const notifications = [];
    
    for (const [key, value] of this.scheduledNotifications.entries()) {
      const parts = key.split('_');
      const type = parts[0];
      const timing = parts[1];
      const sessionId = parts[2];
      const userId = parts[3];
      
      notifications.push({
        key,
        type,
        timing,
        sessionId,
        userId,
        scheduled: value,
        scheduledAt: new Date().toISOString() // In a real app, you'd store the actual scheduled time
      });
    }
    
    return notifications;
  }
}

module.exports = new NotificationScheduler();
