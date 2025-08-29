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

    if (bidSession.status !== 'scheduled' && bidSession.status !== 'draft') {
      return res.status(400).json({ error: 'Can only start scheduled or draft sessions' });
    }

    // Check if there are participants
    if (bidSession.participants.length === 0) {
      return res.status(400).json({ error: 'Cannot start session without participants' });
    }

    // Start the session
    bidSession.status = 'active';
    bidSession.actualStart = new Date();
    bidSession.currentParticipant = 0;

    // Set up first participant's time window
    if (bidSession.participants.length > 0) {
      const now = new Date();
      const startTime = now;
      const endTime = new Date(now.getTime() + (bidSession.bidWindowDuration * 60 * 1000));
      
      bidSession.participants[0].timeWindow = {
        start: startTime,
        end: endTime
      };
      
      bidSession.currentBidStart = startTime;
      bidSession.currentBidEnd = endTime;
    }

    await bidSession.save();

    res.status(200).json({
      message: 'Bid session started successfully',
      bidSession: bidSession.toObject()
    });

  } catch (error) {
    console.error('Start bid session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
