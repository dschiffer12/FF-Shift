const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production email service (e.g., SendGrid, AWS SES, etc.)
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      // Development - use Ethereal for testing
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'test123'
        }
      });
    }
  }

  async sendBidReminderEmail(user, bidSession, timeWindow) {
    try {
      const emailContent = this.generateBidReminderEmail(user, bidSession, timeWindow);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ffshiftbid.com',
        to: user.email,
        subject: `Bid Session Reminder: ${bidSession.name}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Bid reminder email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending bid reminder email:', error);
      throw error;
    }
  }

  async sendBidStartNotificationEmail(user, bidSession, timeWindow) {
    try {
      const emailContent = this.generateBidStartEmail(user, bidSession, timeWindow);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ffshiftbid.com',
        to: user.email,
        subject: `Your Bid Time is Starting: ${bidSession.name}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Bid start notification email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending bid start notification email:', error);
      throw error;
    }
  }

  generateBidReminderEmail(user, bidSession, timeWindow) {
    const startTime = new Date(timeWindow.start).toLocaleString();
    const endTime = new Date(timeWindow.end).toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bid Session Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .time-window { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fire Department Shift Bid Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>This is a reminder that your bid session is scheduled for today.</p>
            
            <div class="time-window">
              <h3>Bid Session Details:</h3>
              <p><strong>Session:</strong> ${bidSession.name}</p>
              <p><strong>Year:</strong> ${bidSession.year}</p>
              <p><strong>Your Bid Time:</strong> ${startTime} - ${endTime}</p>
              <p><strong>Duration:</strong> ${bidSession.bidWindowDuration} minutes</p>
            </div>
            
            <p>Please be ready to make your bid at the scheduled time. You can access the bidding system through the link below:</p>
            
            <p style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/bidding" class="button">Access Bidding System</a>
            </p>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Make sure you have a stable internet connection</li>
              <li>Have your preferred stations and shifts ready</li>
              <li>You will have ${bidSession.bidWindowDuration} minutes to make your selection</li>
              <li>If you don't bid within your time window, you may be moved to the back of the queue</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message from the Fire Department Shift Bid System.</p>
            <p>If you have any questions, please contact your department administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateBidStartEmail(user, bidSession, timeWindow) {
    const startTime = new Date(timeWindow.start).toLocaleString();
    const endTime = new Date(timeWindow.end).toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Bid Time is Starting</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .urgent { background-color: #ffebee; border: 2px solid #d32f2f; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Your Bid Time is Starting Now! 🚨</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            
            <div class="urgent">
              <h3>URGENT: Your bid window is now active!</h3>
              <p><strong>Session:</strong> ${bidSession.name}</p>
              <p><strong>Start Time:</strong> ${startTime}</p>
              <p><strong>End Time:</strong> ${endTime}</p>
              <p><strong>Time Remaining:</strong> ${bidSession.bidWindowDuration} minutes</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/bidding" class="button">START BIDDING NOW</a>
            </p>
            
            <p><strong>Quick Actions:</strong></p>
            <ul>
              <li>Click the button above to access the bidding system</li>
              <li>Review available stations and positions</li>
              <li>Make your selection within ${bidSession.bidWindowDuration} minutes</li>
              <li>Confirm your bid before time expires</li>
            </ul>
            
            <p><em>This is your opportunity to secure your preferred assignment. Don't miss your window!</em></p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Fire Department Shift Bid System.</p>
            <p>If you have any issues, contact your department administrator immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
