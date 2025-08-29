const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  console.log('JWT Test API called:', {
    method: req.method,
    url: req.url,
    hasJWTSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Test JWT configuration
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ 
        error: 'JWT_SECRET environment variable is not set',
        message: 'Please check your Vercel environment variables'
      });
    }

    // Try to create a test token
    try {
      const testToken = jwt.sign(
        { test: 'data', timestamp: new Date().toISOString() },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({ 
        message: 'JWT configuration is working!',
        hasJWTSecret: true,
        jwtSecretLength: process.env.JWT_SECRET.length,
        testTokenCreated: true,
        testTokenLength: testToken.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'JWT token creation failed',
        message: error.message,
        hasJWTSecret: true,
        jwtSecretLength: process.env.JWT_SECRET.length
      });
    }
  } else if (req.method === 'POST') {
    // Test token verification
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET environment variable is not set' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.status(200).json({ 
        message: 'Token is valid!',
        decoded,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Token verification failed',
        message: error.message,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      });
    }
  } else {
    res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST']
    });
  }
};
