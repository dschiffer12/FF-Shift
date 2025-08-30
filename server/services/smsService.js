class SMSService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    try {
      // Try to require twilio, but don't crash if it's not installed
      const twilio = require('twilio');
      
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('Twilio SMS service initialized');
      } else {
        console.warn('Twilio credentials not found. SMS notifications will be disabled.');
      }
    } catch (error) {
      console.warn('Twilio module not installed. SMS notifications will be disabled.');
      console.warn('To enable SMS notifications, run: npm install twilio');
    }
  }

  async sendBidStartSMS(user, bidSession, timeWindow) {
    if (!this.client || !user.phoneNumber) {
      console.log('SMS not sent: No Twilio client or phone number');
      return null;
    }

    try {
      const startTime = new Date(timeWindow.start).toLocaleString();
      const endTime = new Date(timeWindow.end).toLocaleString();
      
      const message = `🚨 ${user.firstName}, your bid time is starting NOW!\n\n` +
        `Session: ${bidSession.name}\n` +
        `Time: ${startTime} - ${endTime}\n` +
        `Duration: ${bidSession.bidWindowDuration} minutes\n\n` +
        `Click here to bid: ${process.env.CLIENT_URL || 'http://localhost:3000'}/bidding\n\n` +
        `Don't miss your window!`;

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber
      });

      console.log('Bid start SMS sent:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending bid start SMS:', error);
      throw error;
    }
  }

  async sendBidReminderSMS(user, bidSession, timeWindow) {
    if (!this.client || !user.phoneNumber) {
      console.log('SMS not sent: No Twilio client or phone number');
      return null;
    }

    try {
      const startTime = new Date(timeWindow.start).toLocaleString();
      
      const message = `📅 Bid Session Reminder\n\n` +
        `Hello ${user.firstName},\n\n` +
        `Your bid session is scheduled for today:\n` +
        `Session: ${bidSession.name}\n` +
        `Your Time: ${startTime}\n` +
        `Duration: ${bidSession.bidWindowDuration} minutes\n\n` +
        `Be ready to bid at your scheduled time!\n` +
        `Access: ${process.env.CLIENT_URL || 'http://localhost:3000'}/bidding`;

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber
      });

      console.log('Bid reminder SMS sent:', result.sid);
      return result;
    } catch (error) {
      console.error('Error sending bid reminder SMS:', error);
      throw error;
    }
  }

  async verifyPhoneNumber(phoneNumber) {
    if (!this.client) {
      console.warn('Twilio client not initialized');
      return false;
    }

    try {
      // Basic validation - in production you might want to use Twilio's Lookup API
      const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
      return /^[\+]?[1-9][\d]{0,15}$/.test(cleanNumber);
    } catch (error) {
      console.error('Error verifying phone number:', error);
      return false;
    }
  }

  isAvailable() {
    return !!this.client;
  }
}

module.exports = new SMSService();
