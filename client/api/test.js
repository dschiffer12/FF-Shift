const { setCORSHeaders, handlePreflight } = require('./utils/db');

module.exports = async (req, res) => {
  console.log('Test API called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) {
    console.log('Test API: Preflight request handled');
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ 
      message: 'GET request to test API is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } else if (req.method === 'POST') {
    res.status(200).json({ 
      message: 'POST request to test API is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      receivedBody: req.body
    });
  } else {
    res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST'],
      receivedMethod: req.method
    });
  }
};
