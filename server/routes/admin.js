const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Station = require('../models/Station');
const BidSession = require('../models/BidSession');
const { authenticateAdmin } = require('../middleware/auth');
const { getActiveConnections } = require('../socket/connection');

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { active, rank, position, search } = req.query;
    const filter = {};
    
    if (active !== undefined) filter.isActive = active === 'true';
    if (rank) filter.rank = rank;
    if (position) filter.position = position;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('currentStation', 'name number')
      .populate('assignedStation', 'name number')
      .sort({ lastName: 1, firstName: 1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user (admin only)
router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('currentStation', 'name number')
      .populate('assignedStation', 'name number')
      .populate('preferredStations', 'name number');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create user (admin only)
router.post('/users', [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('employeeId').trim().isLength({ min: 3 }).withMessage('Employee ID must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('rank').isIn(['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief']).withMessage('Valid rank is required'),
  body('position').isIn(['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']).withMessage('Valid position is required'),
  body('yearsOfService').isInt({ min: 0 }).withMessage('Years of service must be a positive number'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      employeeId, 
      password, 
      rank, 
      position, 
      yearsOfService,
      isAdmin = false 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email or employee ID already exists' 
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      employeeId,
      password,
      rank,
      position,
      yearsOfService,
      isAdmin
    });

    // Calculate bid priority
    user.calculateBidPriority();

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        employeeId: user.employeeId,
        rank: user.rank,
        position: user.position,
        yearsOfService: user.yearsOfService,
        isAdmin: user.isAdmin,
        bidPriority: user.bidPriority
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/users/:id', [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('employeeId').optional().trim().isLength({ min: 3 }),
  body('rank').optional().isIn(['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief']),
  body('position').optional().isIn(['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']),
  body('yearsOfService').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isAdmin').optional().isBoolean()
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      employeeId, 
      rank, 
      position, 
      yearsOfService,
      isActive,
      isAdmin 
    } = req.body;

    // Check if email or employee ID is being changed and if it already exists
    if (email || employeeId) {
      const existingUser = await User.findOne({
        $or: [
          ...(email ? [{ email }] : []),
          ...(employeeId ? [{ employeeId }] : [])
        ],
        _id: { $ne: req.params.id }
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: 'Email or employee ID already in use' 
        });
      }
    }

    // Update user
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (employeeId) updateData.employeeId = employeeId;
    if (rank) updateData.rank = rank;
    if (position) updateData.position = position;
    if (yearsOfService !== undefined) updateData.yearsOfService = yearsOfService;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Recalculate bid priority if relevant fields changed
    if (rank || position || yearsOfService !== undefined) {
      user.calculateBidPriority();
      await user.save();
    }

    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has any current assignments
    if (user.currentStation || user.assignedStation) {
      return res.status(400).json({ 
        error: 'Cannot delete user with current assignments' 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset user password (admin only)
router.post('/users/:id/reset-password', [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get system statistics (admin only)
router.get('/statistics', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalStations,
      activeStations,
      totalBidSessions,
      activeBidSessions,
      completedBidSessions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Station.countDocuments(),
      Station.countDocuments({ isActive: true }),
      BidSession.countDocuments(),
      BidSession.countDocuments({ status: 'active' }),
      BidSession.countDocuments({ status: 'completed' })
    ]);

    const activeConnections = getActiveConnections();

    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$rank',
          count: { $sum: 1 }
        }
      }
    ]);

    const positionStats = await User.aggregate([
      {
        $group: {
          _id: '$position',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRank: userStats,
          byPosition: positionStats
        },
        stations: {
          total: totalStations,
          active: activeStations
        },
        bidSessions: {
          total: totalBidSessions,
          active: activeBidSessions,
          completed: completedBidSessions
        },
        connections: {
          active: activeConnections.length
        }
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get active connections (admin only)
router.get('/connections', authenticateAdmin, async (req, res) => {
  try {
    const activeConnections = getActiveConnections();
    
    res.json({ 
      connections: activeConnections.map(conn => ({
        userId: conn.user._id,
        userName: conn.user.fullName,
        rank: conn.user.rank,
        position: conn.user.position,
        connectedAt: conn.connectedAt,
        socketId: conn.socketId
      }))
    });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// Bulk operations (admin only)
router.post('/bulk-operations', [
  body('operation').isIn(['activate', 'deactivate', 'delete']).withMessage('Valid operation required'),
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID format')
], authenticateAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { operation, userIds } = req.body;

    let result;
    switch (operation) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: false }
        );
        break;
      case 'delete':
        // Check if any users have assignments
        const usersWithAssignments = await User.find({
          _id: { $in: userIds },
          $or: [{ currentStation: { $exists: true } }, { assignedStation: { $exists: true } }]
        });

        if (usersWithAssignments.length > 0) {
          return res.status(400).json({ 
            error: 'Cannot delete users with current assignments',
            users: usersWithAssignments.map(u => u.fullName)
          });
        }

        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
    }

    res.json({
      message: `Bulk operation '${operation}' completed successfully`,
      modifiedCount: result.modifiedCount || result.deletedCount
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// Export user data (admin only)
router.get('/export/users', authenticateAdmin, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const users = await User.find()
      .select('-password')
      .populate('currentStation', 'name number')
      .populate('assignedStation', 'name number')
      .sort({ lastName: 1, firstName: 1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Employee ID',
        'First Name',
        'Last Name',
        'Email',
        'Rank',
        'Position',
        'Years of Service',
        'Bid Priority',
        'Current Station',
        'Assigned Station',
        'Is Active',
        'Is Admin',
        'Last Login'
      ];

      const csvData = users.map(user => [
        user.employeeId,
        user.firstName,
        user.lastName,
        user.email,
        user.rank,
        user.position,
        user.yearsOfService,
        user.bidPriority,
        user.currentStation ? user.currentStation.name : '',
        user.assignedStation ? user.assignedStation.name : '',
        user.isActive ? 'Yes' : 'No',
        user.isAdmin ? 'Yes' : 'No',
        user.lastLogin ? user.lastLogin.toISOString() : ''
      ]);

      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send(csvContent);
    } else {
      res.json({ users });
    }

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

module.exports = router;
