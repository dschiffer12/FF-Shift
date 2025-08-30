# FF Shift Bid Platform

A modern, real-time shift bidding platform designed specifically for fire departments and emergency service organizations.

## Features

### For Members
- **Real-time Bidding Interface**: Live updates during shift bid sessions
- **Personal Dashboard**: View current position, time remaining, and available positions
- **Automatic Assignment**: Fallback assignment if member doesn't bid during their window
- **Mobile Responsive**: Works seamlessly on all devices

### For Administrators
- **User Management**: Add, edit, and manage member accounts
- **Ranking System**: Configure seniority, rank, and position weights
- **Bid Session Control**: Start, pause, and manage bidding sessions
- **Password Reset**: Automated password reset functionality
- **Analytics Dashboard**: View bidding statistics and member assignments
- **Notification Management**: Test and manage email/SMS notifications

## Technology Stack

- **Frontend**: React 18, Socket.IO Client, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO for live updates

## Quick Start

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Environment Variables

Create a `.env` file with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ff-shift-bid
JWT_SECRET=your-secret-key
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@ffshiftbid.com

# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

For detailed notification setup instructions, see [NOTIFICATION_SETUP.md](NOTIFICATION_SETUP.md).

## Project Structure

```
ff-shift-bid/
├── client/                 # React frontend
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── socket/            # Socket.IO handlers
├── docs/                  # Documentation
└── README.md
```


