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

    const { sessionId, participantIds } = req.body;

    if (!sessionId || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'Session ID and participant IDs array are required' });
    }

    const bidSession = await BidSession.findById(sessionId);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    // Only allow removing participants from draft or scheduled sessions
    if (bidSession.status !== 'draft' && bidSession.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only remove participants from draft or scheduled sessions' });
    }

    // Remove participants
    const originalCount = bidSession.participants.length;
    bidSession.participants = bidSession.participants.filter(
      participant => !participantIds.includes(participant.user.toString())
    );

    // Reorder positions
    bidSession.participants.forEach((participant, index) => {
      participant.position = index;
    });

    bidSession.totalParticipants = bidSession.participants.length;

    await bidSession.save();

    // Populate the response
    const populatedSession = await BidSession.findById(bidSession._id)
      .populate('createdBy', 'firstName lastName')
      .populate('participants.user', 'firstName lastName employeeId rank');

    const removedCount = originalCount - bidSession.participants.length;

    res.status(200).json({
      message: `Removed ${removedCount} participants successfully`,
      bidSession: populatedSession.toObject(),
      removedCount
    });

  } catch (error) {
    console.error('Remove participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
