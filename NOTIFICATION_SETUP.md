# Notification System Setup Guide

This guide will help you set up the text and email notification system for the Fire Department Shift Bid Platform.

## Overview

The notification system provides:
- **Email reminders**: Sent the day before bid sessions
- **SMS notifications**: Sent 5 minutes before a user's bid time starts
- **Email notifications**: Sent when a user's bid time begins
- **User preference management**: Users can control their notification settings

## Prerequisites

1. Node.js 18+ installed
2. MongoDB database running
3. Valid email account (Gmail recommended for testing)
4. Twilio account (for SMS notifications)

## Environment Configuration

Copy the environment variables from `env.example` to your `.env` file:

```bash
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@ffshiftbid.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Email Setup

### Gmail Setup (Recommended for testing)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated password as `EMAIL_PASSWORD`

### Custom SMTP Setup

For production, you can use any SMTP provider:

```bash
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

## SMS Setup (Twilio)

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number for sending SMS
4. Add the credentials to your `.env` file

### Twilio Free Trial

- Twilio offers a free trial with $15-20 credit
- You can send SMS to verified numbers during the trial
- Perfect for testing the notification system

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install the new Twilio dependency:
```bash
npm install twilio
```

3. Start the server:
```bash
npm run server
```

## Testing the Notification System

Run the test script to verify everything is working:

```bash
node test-notifications.js
```

This will:
- Test email service connection
- Test SMS service availability
- Send test notifications to a user in your database
- Verify the notification scheduler

## User Interface

### For Users

Users can manage their notification preferences at:
- `/profile/notifications` (NotificationSettings component)

Features:
- Enable/disable all notifications
- Toggle email notifications
- Toggle SMS notifications
- Set phone number for SMS
- Enable bid reminders

### For Admins

Admins can manage notifications at:
- `/admin/notifications` (NotificationManagement component)

Features:
- View system status
- Test notifications
- Send notifications to all session participants
- Verify service connections
- Clear scheduled notifications

## Notification Schedule

### Email Reminders
- **When**: Day before bid session
- **Recipients**: All participants in scheduled sessions
- **Content**: Session details, time window, preparation tips

### SMS Notifications
- **When**: 5 minutes before user's bid time
- **Recipients**: Users with SMS enabled and phone number set
- **Content**: Urgent notification with bid time and link

### Email Notifications
- **When**: When user's bid time begins
- **Recipients**: Users with email notifications enabled
- **Content**: Detailed notification with session info and direct link

## API Endpoints

### User Endpoints
- `GET /api/notifications/preferences` - Get user preferences
- `PUT /api/notifications/preferences` - Update preferences
- `PUT /api/notifications/phone` - Update phone number

### Admin Endpoints
- `GET /api/notifications/status` - Get system status
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/session/:id` - Send to all participants
- `DELETE /api/notifications/scheduled` - Clear scheduled notifications
- `GET /api/notifications/verify/email` - Verify email service
- `GET /api/notifications/verify/sms` - Verify SMS service

## Troubleshooting

### Email Issues

1. **Gmail App Password**: Make sure you're using an App Password, not your regular password
2. **2FA Required**: Gmail requires 2-factor authentication for App Passwords
3. **Less Secure Apps**: Disabled by Google - use App Passwords instead

### SMS Issues

1. **Twilio Credentials**: Verify Account SID and Auth Token
2. **Phone Number**: Ensure the Twilio number is active
3. **Trial Limitations**: Free trial has restrictions on recipient numbers

### General Issues

1. **Environment Variables**: Check that all required variables are set
2. **Database Connection**: Ensure MongoDB is running
3. **User Phone Numbers**: Users must have valid phone numbers for SMS

## Production Considerations

### Email Service
- Use a production email service (SendGrid, AWS SES, etc.)
- Set up proper SPF/DKIM records
- Monitor delivery rates

### SMS Service
- Twilio is production-ready
- Consider message costs
- Set up webhook monitoring

### Security
- Use environment variables for all credentials
- Implement rate limiting
- Monitor for abuse

## Monitoring

The notification system includes:
- Connection status monitoring
- Delivery tracking
- Error logging
- Admin dashboard for system health

## Support

For issues with the notification system:
1. Check the test script output
2. Verify environment variables
3. Test individual services
4. Check server logs for errors

## Cost Considerations

### Email
- Gmail: Free (with limitations)
- SendGrid: $15/month for 50k emails
- AWS SES: $0.10 per 1k emails

### SMS (Twilio)
- US numbers: ~$0.0075 per message
- International: Varies by country
- Free trial available for testing
