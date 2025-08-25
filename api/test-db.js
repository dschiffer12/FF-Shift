const { connectDB, setCORSHeaders, handlePreflight } = require('./utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const envCheck = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };

    console.log('Environment check:', envCheck);

    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ 
        error: 'Database configuration error',
        details: 'MONGODB_URI environment variable is not set',
        envCheck
      });
    }

    // Test database connection
    await connectDB();
    
    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test error:', error);
    
    res.status(500).json({
      error: 'Database test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
