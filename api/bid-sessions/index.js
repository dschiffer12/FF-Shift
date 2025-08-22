const BidSession = require('../../server/models/BidSession');
const User = require('../../server/models/User');
const { connectDB, setCORSHeaders, handlePreflight, authenticateToken } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  try {
    await connectDB();

    // GET - List bid sessions
    if (req.method === 'GET') {
      const { status, year, page = 1, limit = 10 } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (year) filter.year = parseInt(year);

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const sessions = await BidSession.find(filter)
        .populate('createdBy', 'firstName lastName')
        .populate('participants.user', 'firstName lastName employeeId rank')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await BidSession.countDocuments(filter);

      res.status(200).json({
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    // POST - Create new bid session
    else if (req.method === 'POST') {
      const decoded = authenticateToken(req);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        name,
        year,
        description,
        scheduledStart,
        scheduledEnd,
        bidWindowDuration = 5,
        autoAssignTimeout = 2,
        settings = {},
        participants = [] // Array of user IDs to add as participants
      } = req.body;

      if (!name || !year || !scheduledStart || !scheduledEnd) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create the bid session
      const bidSession = new BidSession({
        name,
        year,
        description,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        bidWindowDuration,
        autoAssignTimeout,
        settings,
        createdBy: user._id,
        participants: [], // Start with empty participants array
        totalParticipants: 0
      });

      await bidSession.save();

      // Add participants if provided
      if (participants.length > 0) {
        // Get users and validate they exist
        const users = await User.find({ _id: { $in: participants } });
        
        if (users.length !== participants.length) {
          return res.status(400).json({ error: 'Some participants not found' });
        }

        // Add participants with their bid priority (based on seniority)
        const participantsToAdd = users.map((user, index) => ({
          user: user._id,
          position: index,
          bidPriority: user.bidPriority || 0,
          hasBid: false
        }));

        bidSession.participants = participantsToAdd;
        bidSession.totalParticipants = participantsToAdd.length;
        await bidSession.save();
      }

      // Populate the response
      const populatedSession = await BidSession.findById(bidSession._id)
        .populate('createdBy', 'firstName lastName')
        .populate('participants.user', 'firstName lastName employeeId rank');

      res.status(201).json({
        message: 'Bid session created successfully',
        bidSession: populatedSession.toObject()
      });
    }

    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Bid sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
