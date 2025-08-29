const jwt = require('jsonwebtoken');
const User = require('../models/User');

// HTTP Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Request details:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...'
    });

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Validate token format before verification
    if (typeof token !== 'string' || token.length < 10 || !token.includes('.')) {
      console.log('Auth middleware - Malformed token detected:', {
        type: typeof token,
        length: token?.length,
        preview: token?.substring(0, 20)
      });
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded successfully:', {
      userId: decoded.userId,
      iat: decoded.iat,
      exp: decoded.exp
    });

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('Auth middleware - User not found for userId:', decoded.userId);
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user.isActive) {
      console.log('Auth middleware - User account deactivated:', user.email);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    console.log('Auth middleware - Authentication successful for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', {
      name: error.name,
      message: error.message,
      path: req.path,
      method: req.method
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
    
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Socket.IO Authentication Middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: Invalid token'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: Account deactivated'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
};

// Optional Authentication (for public routes)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateSocket,
  optionalAuth,
  generateToken,
  generateRefreshToken
};
