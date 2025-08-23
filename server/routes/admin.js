const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Station = require('../models/Station');
const BidSession = require('../models/BidSession');

// Admin middleware - check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Apply auth and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalStations,
      activeBidSessions,
      completedBidSessions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Station.countDocuments({ isActive: true }),
      BidSession.countDocuments({ status: 'active' }),
      BidSession.countDocuments({ status: 'completed' })
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalStations,
      activeBidSessions,
      completedBidSessions,
      pendingApprovals: 0 // Placeholder for future implementation
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/recent-activity - Get recent system activity
router.get('/recent-activity', async (req, res) => {
  try {
    // For now, return sample activity data
    // In a real implementation, you'd have an Activity model to track system events
    const activities = [
      {
        type: 'user',
        title: 'New user registered',
        description: 'John Doe registered for the system',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        action: 'view'
      },
      {
        type: 'station',
        title: 'Station updated',
        description: 'Station 1 capacity modified',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        action: 'edit'
      },
      {
        type: 'bid',
        title: 'Bid session started',
        description: 'Annual 2024 bid session initiated',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        action: 'view'
      }
    ];

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// GET /api/admin/user-activity - Get recent user activity
router.get('/user-activity', async (req, res) => {
  try {
    // For now, return sample user activity data
    // In a real implementation, you'd track user actions in a separate collection
    const activities = [
      {
        type: 'login',
        userName: 'John Smith',
        action: 'Logged into the system',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        isOnline: true
      },
      {
        type: 'bid',
        userName: 'Sarah Johnson',
        action: 'Submitted bid for Station 1',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        isOnline: true
      },
      {
        type: 'session',
        userName: 'Mike Wilson',
        action: 'Joined bid session "Annual 2024"',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        isOnline: false
      },
      {
        type: 'login',
        userName: 'Emily Davis',
        action: 'Logged into the system',
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        isOnline: true
      },
      {
        type: 'bid',
        userName: 'David Brown',
        action: 'Viewed bid session details',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        isOnline: false
      }
    ];

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// GET /api/admin/online-users - Get currently online users
router.get('/online-users', async (req, res) => {
  try {
    // For now, return sample online users data
    // In a real implementation, you'd track online status via Socket.IO
    const users = [
      {
        userId: '1',
        firstName: 'John',
        lastName: 'Smith',
        rank: 'Firefighter',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        userId: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        rank: 'Lieutenant',
        isOnline: true,
        lastSeen: new Date(Date.now() - 1000 * 60 * 2) // 2 minutes ago
      },
      {
        userId: '3',
        firstName: 'Emily',
        lastName: 'Davis',
        rank: 'Captain',
        isOnline: true,
        lastSeen: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
      },
      {
        userId: '4',
        firstName: 'Mike',
        lastName: 'Wilson',
        rank: 'Engineer',
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        userId: '5',
        firstName: 'David',
        lastName: 'Brown',
        rank: 'Firefighter',
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      }
    ];

    res.json({ users });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// PUT /api/admin/users/:id/station - Update user station assignment
router.put('/users/:id/station', [
  body('stationId').optional().isMongoId().withMessage('Invalid station ID'),
  body('shift').optional().isIn(['A', 'B', 'C']).withMessage('Shift must be A, B, or C')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stationId, shift } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

         // If stationId is provided, validate the station exists
     if (stationId) {
       const station = await Station.findById(stationId);
      if (!station) {
        return res.status(404).json({ error: 'Station not found' });
      }

      // Check station capacity for the specified shift
      const currentAssignments = station.currentAssignments[shift] || [];
      const shiftCapacity = station.shiftCapacity[shift] || 0;
      
      if (currentAssignments.length >= shiftCapacity) {
        return res.status(400).json({ 
          error: `Station ${station.name} Shift ${shift} is at full capacity (${shiftCapacity} users)` 
        });
      }

      // Update user's station assignment
      user.currentStation = stationId;
      user.currentShift = shift || 'A';
    } else {
      // Remove station assignment
      user.currentStation = null;
      user.currentShift = null;
    }

    await user.save();

    // Populate the station information for the response
    await user.populate('currentStation', 'name number');

    res.json({ 
      message: 'Station assignment updated successfully',
      user: user.toObject()
    });

  } catch (error) {
    console.error('Error updating user station assignment:', error);
    res.status(500).json({ error: 'Failed to update station assignment' });
  }
});

// GET /api/admin/users - Get all users (for user management)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('currentStation', 'name number')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('employeeId').notEmpty().withMessage('Employee ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, employeeId, rank, position, isAdmin, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or employee ID already exists' 
      });
    }

    // Create new user with default password
    const user = new User({
      firstName,
      lastName,
      email,
      employeeId,
      rank,
      position,
      isAdmin: isAdmin || false,
      isActive: isActive !== false,
      password: 'password123' // Default password - user should change on first login
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ user: userResponse });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('yearsOfService').optional().isInt({ min: 0, max: 50 }).withMessage('Years of service must be between 0 and 50'),
  body('manualSeniorityScore').optional().isInt({ min: 0 }).withMessage('Manual seniority score must be 0 or greater'),
  body('rank').optional().isIn(['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief']).withMessage('Invalid rank'),
  body('position').optional().isIn(['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']).withMessage('Invalid position')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, rank, position, yearsOfService, isAdmin, isActive, manualSeniorityScore } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user fields (only update provided fields)
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (rank !== undefined) user.rank = rank;
    if (position !== undefined) user.position = position;
    if (yearsOfService !== undefined) user.yearsOfService = yearsOfService;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (isActive !== undefined) user.isActive = isActive;
    if (manualSeniorityScore !== undefined) user.manualSeniorityScore = manualSeniorityScore;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
