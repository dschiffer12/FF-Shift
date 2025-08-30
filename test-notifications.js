require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');
const BidSession = require('./server/models/BidSession');
const emailService = require('./server/services/emailService');
const smsService = require('./server/services/smsService');
const notificationScheduler = require('./server/services/notificationScheduler');

async function testNotifications() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ff-shift-bid');
    console.log('Connected to MongoDB');

    // Test email service
    console.log('\n=== Testing Email Service ===');
    const emailConnected = await emailService.verifyConnection();
    console.log('Email service connected:', emailConnected);

    // Test SMS service
    console.log('\n=== Testing SMS Service ===');
    const smsAvailable = smsService.isAvailable();
    console.log('SMS service available:', smsAvailable);

    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('No users found in database. Please create a user first.');
      return;
    }

    // Get a test session
    const testSession = await BidSession.findOne();
    if (!testSession) {
      console.log('No bid sessions found in database. Please create a session first.');
      return;
    }

    console.log('\n=== Test User ===');
    console.log('Name:', testUser.firstName, testUser.lastName);
    console.log('Email:', testUser.email);
    console.log('Phone:', testUser.phoneNumber || 'Not set');

    console.log('\n=== Test Session ===');
    console.log('Name:', testSession.name);
    console.log('Status:', testSession.status);
    console.log('Bid Window Duration:', testSession.bidWindowDuration, 'minutes');

    // Test email notification
    console.log('\n=== Testing Email Notification ===');
    const timeWindow = {
      start: new Date(),
      end: new Date(Date.now() + (testSession.bidWindowDuration * 60 * 1000))
    };

    try {
      await emailService.sendBidStartNotificationEmail(testUser, testSession, timeWindow);
      console.log('✅ Email notification sent successfully');
    } catch (error) {
      console.log('❌ Email notification failed:', error.message);
    }

    // Test SMS notification (if phone number is available)
    if (testUser.phoneNumber && smsAvailable) {
      console.log('\n=== Testing SMS Notification ===');
      try {
        await smsService.sendBidStartSMS(testUser, testSession, timeWindow);
        console.log('✅ SMS notification sent successfully');
      } catch (error) {
        console.log('❌ SMS notification failed:', error.message);
      }
    } else {
      console.log('\n=== SMS Notification ===');
      console.log('⚠️  SMS test skipped - no phone number or SMS service not available');
    }

    // Test notification scheduler
    console.log('\n=== Testing Notification Scheduler ===');
    const status = notificationScheduler.getStatus();
    console.log('Scheduler status:', status);

    // Test manual notification
    console.log('\n=== Testing Manual Notification ===');
    try {
      const result = await notificationScheduler.sendTestNotification(
        testUser._id,
        testSession._id,
        'email'
      );
      console.log('✅ Manual notification test successful:', result.message);
    } catch (error) {
      console.log('❌ Manual notification test failed:', error.message);
    }

    console.log('\n=== Notification System Test Complete ===');
    console.log('Check your email and phone for test notifications!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testNotifications();
