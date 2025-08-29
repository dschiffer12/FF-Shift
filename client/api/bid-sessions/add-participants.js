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

    // Only allow adding participants to draft or scheduled sessions
    if (bidSession.status !== 'draft' && bidSession.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only add participants to draft or scheduled sessions' });
    }

    // Get users and validate they exist
    const users = await User.find({ _id: { $in: participantIds } });
    
    if (users.length !== participantIds.length) {
      return res.status(400).json({ error: 'Some participants not found' });
    }

    // Check if users are already participants
    const existingParticipantIds = bidSession.participants.map(p => p.user.toString());
    const newParticipantIds = participantIds.filter(id => !existingParticipantIds.includes(id));

    if (newParticipantIds.length === 0) {
      return res.status(400).json({ error: 'All users are already participants' });
    }

    // Get new users to add
    const newUsers = users.filter(user => newParticipantIds.includes(user._id.toString()));

    // Add new participants
    const currentPosition = bidSession.participants.length;
    const newParticipants = newUsers.map((user, index) => ({
      user: user._id,
      position: currentPosition + index,
      bidPriority: user.bidPriority || 0,
      hasBid: false
    }));

    bidSession.participants.push(...newParticipants);
    bidSession.totalParticipants = bidSession.participants.length;

    await bidSession.save();

    // Populate the response
    const populatedSession = await BidSession.findById(bidSession._id)
      .populate('createdBy', 'firstName lastName')
      .populate('participants.user', 'firstName lastName employeeId rank');

    res.status(200).json({
      message: `Added ${newParticipants.length} participants successfully`,
      bidSession: populatedSession.toObject(),
      addedCount: newParticipants.length
    });

  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
