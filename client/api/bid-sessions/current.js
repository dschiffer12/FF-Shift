const BidSession = require('../../server/models/BidSession');
const { connectDB, setCORSHeaders, handlePreflight } = require('../utils/db');

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

    // Find the currently active bid session
    const activeSession = await BidSession.findOne({
      status: { $in: ['active', 'waiting'] }
    }).populate('participants', 'firstName lastName employeeId rank');

    if (!activeSession) {
      return res.status(200).json({ session: null });
    }

    res.status(200).json({
      session: activeSession.toObject()
    });

  } catch (error) {
    console.error('Error fetching active bid session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
