const BidSession = require('../server/models/BidSession');
const { connectDB, setCORSHeaders, handlePreflight, authenticateToken } = require('./utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  try {
    await connectDB();

    // GET - Get bid session history
    if (req.method === 'GET') {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const bidSession = await BidSession.findById(sessionId)
        .populate('sessionHistory.userId', 'firstName lastName employeeId')
        .populate('sessionHistory.station', 'name number location');

      if (!bidSession) {
        return res.status(404).json({ error: 'Bid session not found' });
      }

      // Get session history
      const history = bidSession.getSessionHistory();

      res.status(200).json({
        sessionId: bidSession._id,
        sessionName: bidSession.name,
        history: history
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Bid session history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
