const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  
  // Station Details
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Capacity and Staffing
  totalCapacity: {
    type: Number,
    required: true,
    min: 1,
    default: 4
  },
  
  // Per-shift capacity
  shiftCapacity: {
    A: {
      type: Number,
      required: true,
      min: 1,
      default: 4
    },
    B: {
      type: Number,
      required: true,
      min: 1,
      default: 4
    },
    C: {
      type: Number,
      required: true,
      min: 1,
      default: 4
    }
  },
  
  // Current Assignments
  currentAssignments: {
    A: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],
    B: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],
    C: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Available Positions for Bidding
  availablePositions: {
    A: [{
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer'],
        required: true
      },
      count: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    B: [{
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer'],
        required: true
      },
      count: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    C: [{
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer'],
        required: true
      },
      count: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  },
  
  // Station Preferences
  preferredRanks: [{
    type: String,
    enum: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief']
  }],
  
  // Contact Information
  phoneNumber: String,
  email: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for current occupancy
stationSchema.virtual('currentOccupancy').get(function() {
  const occupancy = {};
  ['A', 'B', 'C'].forEach(shift => {
    occupancy[shift] = this.currentAssignments[shift].length;
  });
  return occupancy;
});

// Virtual for available spots
stationSchema.virtual('availableSpots').get(function() {
  const available = {};
  ['A', 'B', 'C'].forEach(shift => {
    available[shift] = this.shiftCapacity[shift] - this.currentAssignments[shift].length;
  });
  return available;
});

// Method to check if station has available positions
stationSchema.methods.hasAvailablePosition = function(shift, position) {
  const currentCount = this.currentAssignments[shift].filter(
    assignment => assignment.position === position
  ).length;
  
  const availablePosition = this.availablePositions[shift].find(
    pos => pos.position === position
  );
  
  return availablePosition && currentCount < availablePosition.count;
};

// Method to add assignment
stationSchema.methods.addAssignment = function(shift, userId, position) {
  if (!this.hasAvailablePosition(shift, position)) {
    throw new Error(`No available ${position} position on shift ${shift}`);
  }
  
  this.currentAssignments[shift].push({
    user: userId,
    position: position,
    assignedAt: new Date()
  });
  
  return this.save();
};

// Method to remove assignment
stationSchema.methods.removeAssignment = function(shift, userId) {
  this.currentAssignments[shift] = this.currentAssignments[shift].filter(
    assignment => assignment.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Method to get station summary
stationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    number: this.number,
    capacity: this.shiftCapacity,
    occupancy: this.currentOccupancy,
    available: this.availableSpots,
    isActive: this.isActive
  };
};

// Indexes for performance
stationSchema.index({ number: 1 });
stationSchema.index({ isActive: 1 });
stationSchema.index({ 'currentAssignments.A.user': 1 });
stationSchema.index({ 'currentAssignments.B.user': 1 });
stationSchema.index({ 'currentAssignments.C.user': 1 });

module.exports = mongoose.model('Station', stationSchema);
