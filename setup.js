#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚒 FF Shift Bid Platform Setup');
console.log('==============================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ff-shift-bid

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for password reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Client URL (for CORS and email links)
CLIENT_URL=http://localhost:3000

# Optional: Redis for session storage (if needed)
# REDIS_URL=redis://localhost:6379

# Optional: Logging
LOG_LEVEL=info
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully');
  console.log('⚠️  Please update the .env file with your actual configuration values\n');
} else {
  console.log('✅ .env file already exists\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  console.log('Installing server dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Installing client dependencies...');
  execSync('cd client && npm install', { stdio: 'inherit' });
  
  console.log('✅ All dependencies installed successfully\n');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Check if MongoDB is running
console.log('🔍 Checking MongoDB connection...');
try {
  execSync('mongosh --eval "db.runCommand(\'ping\')"', { stdio: 'ignore' });
  console.log('✅ MongoDB is running\n');
} catch (error) {
  console.log('⚠️  MongoDB is not running or not accessible');
  console.log('Please start MongoDB before running the application\n');
}

console.log('🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Update the .env file with your configuration');
console.log('2. Start MongoDB (if not already running)');
console.log('3. Run "npm run dev" to start the development server');
console.log('4. Open http://localhost:3000 in your browser');
console.log('\nFor more information, see the README.md file');
