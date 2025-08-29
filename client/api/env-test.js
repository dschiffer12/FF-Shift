module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check environment variables
  const envVars = {
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
    NODE_ENV: process.env.NODE_ENV || 'Not Set'
  };

  res.status(200).json({
    message: 'Environment variables test',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
};
