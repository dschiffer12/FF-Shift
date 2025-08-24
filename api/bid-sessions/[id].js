const BidSession = require('../../server/models/BidSession');
const User = require('../../server/models/User');
const { connectDB, setCORSHeaders, handlePreflight, authenticateToken, authenticateAdmin } = require('../utils/db');

module.exports = async (req, res) => {
  // Set CORS headers
  setCORSHeaders(res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  try {
    await connectDB();

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Bid session ID is required' });
    }

    // GET - Get specific bid session
    if (req.method === 'GET') {
      const bidSession = await BidSession.findById(id)
        .populate('createdBy', 'firstName lastName')
        .populate('participants.user', 'firstName lastName employeeId rank')
        .populate('participants.assignedStation', 'name number');

      if (!bidSession) {
        return res.status(404).json({ error: 'Bid session not found' });
      }

      // Get available stations
      const Station = require('../../server/models/Station');
      const availableStations = await Station.find({ isActive: true }).select('name number location availablePositions');

      res.status(200).json({
        bidSession: bidSession.toObject(),
        availableStations: availableStations
      });
    }

    // PUT - Update bid session
    else if (req.method === 'PUT') {
      const decoded = await authenticateAdmin(req);

      const bidSession = await BidSession.findById(id);
      
      if (!bidSession) {
        return res.status(404).json({ error: 'Bid session not found' });
      }

      // Only allow updates if session hasn't started
      if (bidSession.status !== 'draft' && bidSession.status !== 'scheduled') {
        return res.status(400).json({ error: 'Cannot update active or completed sessions' });
      }

      const {
        name,
        description,
        scheduledStart,
        scheduledEnd,
        bidWindowDuration,
        autoAssignTimeout,
        settings
      } = req.body;

      // Update allowed fields
      if (name) bidSession.name = name;
      if (description !== undefined) bidSession.description = description;
      if (scheduledStart) bidSession.scheduledStart = new Date(scheduledStart);
      if (scheduledEnd) bidSession.scheduledEnd = new Date(scheduledEnd);
      if (bidWindowDuration) bidSession.bidWindowDuration = bidWindowDuration;
      if (autoAssignTimeout) bidSession.autoAssignTimeout = autoAssignTimeout;
      if (settings) bidSession.settings = { ...bidSession.settings, ...settings };

      await bidSession.save();

      res.status(200).json({
        message: 'Bid session updated successfully',
        bidSession: bidSession.toObject()
      });
    }

    // DELETE - Delete bid session
    else if (req.method === 'DELETE') {
      const decoded = await authenticateAdmin(req);

      const bidSession = await BidSession.findById(id);
      
      if (!bidSession) {
        return res.status(404).json({ error: 'Bid session not found' });
      }

      // Only allow deletion of sessions that are not active or completed
      if (['active', 'completed'].includes(bidSession.status)) {
        return res.status(400).json({ error: 'Cannot delete active or completed sessions' });
      }

      await BidSession.findByIdAndDelete(id);

      res.status(200).json({
        message: 'Bid session deleted successfully'
      });
    }

    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Bid session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
