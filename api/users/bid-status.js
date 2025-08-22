const User = require('../../server/models/User');
const BidSession = require('../../server/models/BidSession');
const { connectDB, setCORSHeaders, handlePreflight, authenticateToken } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Authenticate user
    const decoded = authenticateToken(req);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find active bid session
    const activeSession = await BidSession.findOne({
      status: { $in: ['active', 'waiting'] }
    });

    if (!activeSession) {
      return res.status(200).json({
        position: null,
        isUserTurn: false,
        timeRemaining: 0,
        sessionId: null
      });
    }

    // Check if user is participating in this session
    const isParticipating = activeSession.participants.includes(user._id);
    
    if (!isParticipating) {
      return res.status(200).json({
        position: null,
        isUserTurn: false,
        timeRemaining: 0,
        sessionId: activeSession._id
      });
    }

    // Calculate user's position in the queue
    const participants = await User.find({
      _id: { $in: activeSession.participants }
    }).sort({ bidPriority: -1, seniorityDate: 1 });

    const userPosition = participants.findIndex(p => p._id.toString() === user._id.toString()) + 1;

    // Check if it's user's turn
    const isUserTurn = activeSession.currentBidder?.toString() === user._id.toString();
    
    // Calculate time remaining if it's user's turn
    let timeRemaining = 0;
    if (isUserTurn && activeSession.currentBidStartTime) {
      const elapsed = Math.floor((Date.now() - activeSession.currentBidStartTime.getTime()) / 1000);
      timeRemaining = Math.max(0, activeSession.bidTimeLimit - elapsed);
    }

    res.status(200).json({
      position: userPosition,
      isUserTurn,
      timeRemaining,
      sessionId: activeSession._id,
      sessionStatus: activeSession.status
    });

  } catch (error) {
    console.error('Error fetching user bid status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
