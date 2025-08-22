const Station = require('../../server/models/Station');
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

    // Get all active stations with their current assignments
    const stations = await Station.find({ isActive: true })
      .populate('currentAssignments.A', 'firstName lastName rank')
      .populate('currentAssignments.B', 'firstName lastName rank')
      .populate('currentAssignments.C', 'firstName lastName rank');

    // Calculate availability for each station
    const availableStations = stations.map(station => {
      const stationObj = station.toObject();
      
      // Calculate available positions for each shift
      stationObj.availability = {};
      ['A', 'B', 'C'].forEach(shift => {
        const capacity = station.shiftCapacity?.[shift] || 0;
        const current = station.currentAssignments?.[shift]?.length || 0;
        stationObj.availability[shift] = {
          capacity,
          current,
          available: Math.max(0, capacity - current)
        };
      });

      return stationObj;
    });

    res.status(200).json({
      stations: availableStations
    });

  } catch (error) {
    console.error('Error fetching available stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
