const BidSession = require('../../server/models/BidSession');
const User = require('../../server/models/User');
const { connectDB, setCORSHeaders, handlePreflight, authenticateToken } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const decoded = authenticateToken(req);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const bidSession = await BidSession.findById(sessionId);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active' && bidSession.status !== 'paused') {
      return res.status(400).json({ error: 'Can only complete active or paused sessions' });
    }

    // Complete the session
    bidSession.status = 'completed';
    bidSession.actualEnd = new Date();

    await bidSession.save();

    res.status(200).json({
      message: 'Bid session completed successfully',
      bidSession: bidSession.toObject()
    });

  } catch (error) {
    console.error('Complete bid session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
