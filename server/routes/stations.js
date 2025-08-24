const express = require('express');
const { body, validationResult } = require('express-validator');
const Station = require('../models/Station');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all stations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const stations = await Station.find(filter)
      .populate('currentAssignments.A.user', 'firstName lastName rank position')
      .populate('currentAssignments.B.user', 'firstName lastName rank position')
      .populate('currentAssignments.C.user', 'firstName lastName rank position');

    const stationSummaries = stations.map(station => station.getSummary());

    res.json({ stations: stationSummaries });
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ error: 'Failed to get stations' });
  }
});

// Get single station
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id)
      .populate('currentAssignments.A.user', 'firstName lastName rank position employeeId')
      .populate('currentAssignments.B.user', 'firstName lastName rank position employeeId')
      .populate('currentAssignments.C.user', 'firstName lastName rank position employeeId');

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json({ station });
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({ error: 'Failed to get station' });
  }
});

// Create new station (admin only)
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Station name must be at least 2 characters'),
  body('number').trim().isLength({ min: 1 }).withMessage('Station number is required'),
  body('totalCapacity').isInt({ min: 1 }).withMessage('Total capacity must be at least 1'),
  body('shiftCapacity.A').isInt({ min: 1 }).withMessage('Shift A capacity must be at least 1'),
  body('shiftCapacity.B').isInt({ min: 1 }).withMessage('Shift B capacity must be at least 1'),
  body('shiftCapacity.C').isInt({ min: 1 }).withMessage('Shift C capacity must be at least 1')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, number, address, description, totalCapacity, shiftCapacity, availablePositions } = req.body;

    // Check if station number already exists
    const existingStation = await Station.findOne({ number });
    if (existingStation) {
      return res.status(400).json({ error: 'Station number already exists' });
    }

    const station = new Station({
      name,
      number,
      address,
      description,
      totalCapacity,
      shiftCapacity,
      availablePositions: availablePositions || {
        A: [],
        B: [],
        C: []
      }
    });

    await station.save();

    res.status(201).json({
      message: 'Station created successfully',
      station: station.getSummary()
    });

  } catch (error) {
    console.error('Create station error:', error);
    res.status(500).json({ error: 'Failed to create station' });
  }
});

// Update station (admin only)
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('number').optional().trim().isLength({ min: 1 }),
  body('totalCapacity').optional().isInt({ min: 1 }),
  body('shiftCapacity.A').optional().isInt({ min: 1 }),
  body('shiftCapacity.B').optional().isInt({ min: 1 }),
  body('shiftCapacity.C').optional().isInt({ min: 1 })
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, number, address, description, totalCapacity, shiftCapacity, isActive } = req.body;

    // Check if station number is being changed and if it already exists
    if (number) {
      const existingStation = await Station.findOne({ 
        number, 
        _id: { $ne: req.params.id } 
      });
      if (existingStation) {
        return res.status(400).json({ error: 'Station number already exists' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (number) updateData.number = number;
    if (address) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (totalCapacity) updateData.totalCapacity = totalCapacity;
    if (shiftCapacity) updateData.shiftCapacity = shiftCapacity;
    if (isActive !== undefined) updateData.isActive = isActive;

    const station = await Station.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json({
      message: 'Station updated successfully',
      station: station.getSummary()
    });

  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

// Delete station (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    // Check if station has any current assignments
    const hasAssignments = station.currentAssignments.A.length > 0 ||
                          station.currentAssignments.B.length > 0 ||
                          station.currentAssignments.C.length > 0;

    if (hasAssignments) {
      return res.status(400).json({ 
        error: 'Cannot delete station with current assignments' 
      });
    }

    await Station.findByIdAndDelete(req.params.id);

    res.json({ message: 'Station deleted successfully' });

  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({ error: 'Failed to delete station' });
  }
});

// Get station availability
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    const availability = {
      station: station.getSummary(),
      occupancy: station.currentOccupancy,
      available: station.availableSpots,
      assignments: {
        A: station.currentAssignments.A.map(assignment => ({
          user: assignment.user,
          position: assignment.position,
          assignedAt: assignment.assignedAt
        })),
        B: station.currentAssignments.B.map(assignment => ({
          user: assignment.user,
          position: assignment.position,
          assignedAt: assignment.assignedAt
        })),
        C: station.currentAssignments.C.map(assignment => ({
          user: assignment.user,
          position: assignment.position,
          assignedAt: assignment.assignedAt
        }))
      }
    };

    res.json({ availability });

  } catch (error) {
    console.error('Get station availability error:', error);
    res.status(500).json({ error: 'Failed to get station availability' });
  }
});

// Update station available positions (admin only)
router.put('/:id/positions', [
  body('availablePositions').isObject().withMessage('Available positions must be an object'),
  body('availablePositions.A').optional().isArray(),
  body('availablePositions.B').optional().isArray(),
  body('availablePositions.C').optional().isArray()
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { availablePositions } = req.body;

    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    station.availablePositions = availablePositions;
    await station.save();

    res.json({
      message: 'Station positions updated successfully',
      station: station.getSummary()
    });

  } catch (error) {
    console.error('Update station positions error:', error);
    res.status(500).json({ error: 'Failed to update station positions' });
  }
});

// Get available stations
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const stations = await Station.find({ isActive: true })
      .populate('currentAssignments.A.user', 'firstName lastName rank position')
      .populate('currentAssignments.B.user', 'firstName lastName rank position')
      .populate('currentAssignments.C.user', 'firstName lastName rank position');

    const stationSummaries = stations.map(station => station.getSummary());

    res.json({ stations: stationSummaries });
  } catch (error) {
    console.error('Get available stations error:', error);
    res.status(500).json({ error: 'Failed to get available stations' });
  }
});

// Get stations with available positions
router.get('/available/positions', authenticateToken, async (req, res) => {
  try {
    const { shift, position } = req.query;
    
    const filter = { isActive: true };
    if (shift && position) {
      filter[`availablePositions.${shift}`] = {
        $elemMatch: {
          position: position,
          count: { $gt: 0 }
        }
      };
    }

    const stations = await Station.find(filter);
    
    const availableStations = stations.filter(station => {
      if (!shift || !position) return true;
      
      const shiftPositions = station.availablePositions[shift] || [];
      const positionData = shiftPositions.find(p => p.position === position);
      
      if (!positionData) return false;
      
      const currentCount = station.currentAssignments[shift].filter(
        assignment => assignment.position === position
      ).length;
      
      return currentCount < positionData.count;
    });

    res.json({ 
      stations: availableStations.map(station => station.getSummary())
    });

  } catch (error) {
    console.error('Get available positions error:', error);
    res.status(500).json({ error: 'Failed to get available positions' });
  }
});

module.exports = router;
