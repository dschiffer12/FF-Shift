const BidSession = require('../../server/models/BidSession');
const User = require('../../server/models/User');
const Station = require('../../server/models/Station');
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
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { sessionId, stationId, shift, position } = req.body;

    if (!sessionId || !stationId || !shift) {
      return res.status(400).json({ error: 'Session ID, station ID, and shift are required' });
    }

    const bidSession = await BidSession.findById(sessionId);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Bid session is not active' });
    }

    // Check if it's the user's turn
    if (bidSession.currentParticipant >= bidSession.participants.length) {
      return res.status(400).json({ error: 'Bid session has ended' });
    }

    const currentParticipant = bidSession.participants[bidSession.currentParticipant];
    
    if (currentParticipant.user.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'It is not your turn to bid' });
    }

    // Check if user has already bid
    if (currentParticipant.hasBid) {
      return res.status(400).json({ error: 'You have already submitted a bid' });
    }

    // Check if time window is still valid
    const now = new Date();
    if (currentParticipant.timeWindow && currentParticipant.timeWindow.end < now) {
      return res.status(400).json({ error: 'Your bidding time has expired' });
    }

    // Validate station exists and is active
    const station = await Station.findById(stationId);
    if (!station || !station.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive station' });
    }

    // Validate shift
    if (!['A', 'B', 'C'].includes(shift)) {
      return res.status(400).json({ error: 'Invalid shift' });
    }

    // Check station capacity
    const capacity = station.shiftCapacity?.[shift] || 0;
    const currentAssignments = station.currentAssignments?.[shift]?.length || 0;
    
    if (currentAssignments >= capacity) {
      return res.status(400).json({ error: 'Station is at full capacity for this shift' });
    }

    // Validate position if provided
    if (position && !['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer'].includes(position)) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    // Process the bid
    try {
      // Add to bid history
      currentParticipant.bidHistory.push({
        station: stationId,
        shift: shift,
        position: position || user.position,
        timestamp: new Date()
      });

      // Assign the bid
      currentParticipant.assignedStation = stationId;
      currentParticipant.assignedShift = shift;
      currentParticipant.assignedPosition = position || user.position;
      currentParticipant.hasBid = true;

      // Update station assignments
      if (!station.currentAssignments) {
        station.currentAssignments = { A: [], B: [], C: [] };
      }
      if (!station.currentAssignments[shift]) {
        station.currentAssignments[shift] = [];
      }
      station.currentAssignments[shift].push(user._id);

      // Update user's current assignment
      user.currentStation = stationId;
      user.currentShift = shift;

      // Save all changes
      await Promise.all([
        bidSession.save(),
        station.save(),
        user.save()
      ]);

      // Advance to next participant
      bidSession.completedBids++;
      bidSession.currentParticipant++;

      if (bidSession.currentParticipant < bidSession.participants.length) {
        // Set up next participant's time window
        const nextParticipant = bidSession.participants[bidSession.currentParticipant];
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (bidSession.bidWindowDuration * 60 * 1000));
        
        nextParticipant.timeWindow = {
          start: startTime,
          end: endTime
        };
        
        bidSession.currentBidStart = startTime;
        bidSession.currentBidEnd = endTime;
      } else {
        // Session is complete
        bidSession.status = 'completed';
        bidSession.actualEnd = new Date();
      }

      await bidSession.save();

      res.status(200).json({
        message: 'Bid submitted successfully',
        success: true,
        assignedStation: station.name,
        assignedShift: shift,
        assignedPosition: position || user.position
      });

    } catch (error) {
      console.error('Error processing bid:', error);
      res.status(500).json({ error: 'Failed to process bid' });
    }

  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
