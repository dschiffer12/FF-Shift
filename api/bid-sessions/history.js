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

    const decoded = authenticateToken(req);

    const { sessionId, limit = 50 } = req.query;

    if (sessionId) {
      // Get bid history for a specific session
      const bidSession = await BidSession.findById(sessionId)
        .populate('participants.user', 'firstName lastName employeeId rank')
        .populate('participants.assignedStation', 'name number')
        .populate('participants.bidHistory.station', 'name number');

      if (!bidSession) {
        return res.status(404).json({ error: 'Bid session not found' });
      }

      // Extract bid history from all participants
      const allBids = [];
      bidSession.participants.forEach((participant, index) => {
        participant.bidHistory.forEach(bid => {
          allBids.push({
            participant: {
              name: `${participant.user.firstName} ${participant.user.lastName}`,
              employeeId: participant.user.employeeId,
              rank: participant.user.rank,
              position: index + 1
            },
            station: bid.station,
            shift: bid.shift,
            position: bid.position,
            timestamp: bid.timestamp,
            autoAssigned: bid.autoAssigned || false
          });
        });
      });

      // Sort by timestamp (most recent first)
      allBids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.status(200).json({
        history: allBids.slice(0, parseInt(limit)),
        session: {
          id: bidSession._id,
          name: bidSession.name,
          status: bidSession.status,
          totalBids: allBids.length
        }
      });

    } else {
      // Get recent bid history across all sessions
      const recentSessions = await BidSession.find({
        status: { $in: ['completed', 'active'] }
      })
        .populate('participants.user', 'firstName lastName employeeId rank')
        .populate('participants.assignedStation', 'name number')
        .populate('participants.bidHistory.station', 'name number')
        .sort({ updatedAt: -1 })
        .limit(5);

      const allBids = [];
      
      recentSessions.forEach(session => {
        session.participants.forEach((participant, index) => {
          participant.bidHistory.forEach(bid => {
            allBids.push({
              session: {
                id: session._id,
                name: session.name,
                status: session.status
              },
              participant: {
                name: `${participant.user.firstName} ${participant.user.lastName}`,
                employeeId: participant.user.employeeId,
                rank: participant.user.rank,
                position: index + 1
              },
              station: bid.station,
              shift: bid.shift,
              position: bid.position,
              timestamp: bid.timestamp,
              autoAssigned: bid.autoAssigned || false
            });
          });
        });
      });

      // Sort by timestamp (most recent first)
      allBids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.status(200).json({
        history: allBids.slice(0, parseInt(limit)),
        sessions: recentSessions.map(session => ({
          id: session._id,
          name: session.name,
          status: session.status,
          totalBids: session.participants.reduce((sum, p) => sum + p.bidHistory.length, 0)
        }))
      });
    }

  } catch (error) {
    console.error('Bid history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
