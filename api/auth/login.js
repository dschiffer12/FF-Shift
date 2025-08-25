const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../server/models/User');
const { connectDB, setCORSHeaders, handlePreflight } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return res.status(500).json({ error: 'Database configuration error' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Authentication configuration error' });
    }

    await connectDB();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      user: userResponse,
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more specific error messages
    if (error.name === 'MongoNetworkError') {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};
