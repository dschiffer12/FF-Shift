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
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId, participantIndex } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const bidSession = await BidSession.findById(sessionId);
    
    if (!bidSession) {
      return res.status(404).json({ error: 'Bid session not found' });
    }

    if (bidSession.status !== 'active') {
      return res.status(400).json({ error: 'Bid session is not active' });
    }

    const participantIdx = participantIndex !== undefined ? participantIndex : bidSession.currentParticipant;
    
    if (participantIdx >= bidSession.participants.length) {
      return res.status(400).json({ error: 'Invalid participant index' });
    }

    const participant = bidSession.participants[participantIdx];
    
    if (participant.hasBid) {
      return res.status(400).json({ error: 'Participant has already bid' });
    }

    // Get all available stations
    const stations = await Station.find({ isActive: true });
    
    // Find the best available assignment based on user preferences and station availability
    let bestAssignment = null;
    let bestScore = -1;

    for (const station of stations) {
      for (const shift of ['A', 'B', 'C']) {
        const capacity = station.shiftCapacity?.[shift] || 0;
        const currentAssignments = station.currentAssignments?.[shift]?.length || 0;
        
        if (currentAssignments < capacity) {
          // Calculate score based on user preferences
          let score = 0;
          
          // Prefer user's current shift if available
          if (shift === user.currentShift) {
            score += 10;
          }
          
          // Prefer stations closer to user's current station
          if (station.number === user.currentStation?.number) {
            score += 5;
          }
          
          // Prefer stations with more availability
          score += (capacity - currentAssignments);
          
          if (score > bestScore) {
            bestScore = score;
            bestAssignment = {
              station: station,
              shift: shift,
              position: user.position || 'Firefighter'
            };
          }
        }
      }
    }

    if (!bestAssignment) {
      return res.status(400).json({ error: 'No available assignments found' });
    }

    // Process auto-assignment
    try {
      const { station, shift, position } = bestAssignment;

      // Mark participant as auto-assigned
      participant.autoAssigned = true;
      participant.hasBid = true;
      participant.assignedStation = station._id;
      participant.assignedShift = shift;
      participant.assignedPosition = position;

      // Add to bid history
      participant.bidHistory.push({
        station: station._id,
        shift: shift,
        position: position,
        timestamp: new Date(),
        autoAssigned: true
      });

      // Update station assignments
      if (!station.currentAssignments) {
        station.currentAssignments = { A: [], B: [], C: [] };
      }
      if (!station.currentAssignments[shift]) {
        station.currentAssignments[shift] = [];
      }
      station.currentAssignments[shift].push(user._id);

      // Update user's current assignment
      user.currentStation = station._id;
      user.currentShift = shift;

      // Save all changes
      await Promise.all([
        bidSession.save(),
        station.save(),
        user.save()
      ]);

      // Advance to next participant
      bidSession.completedBids++;
      bidSession.autoAssignments++;
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
        message: 'Auto-assignment completed successfully',
        success: true,
        assignedStation: station.name,
        assignedShift: shift,
        assignedPosition: position,
        autoAssigned: true
      });

    } catch (error) {
      console.error('Error processing auto-assignment:', error);
      res.status(500).json({ error: 'Failed to process auto-assignment' });
    }

  } catch (error) {
    console.error('Auto-assign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
