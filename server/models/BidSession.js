const mongoose = require('mongoose');

const bidSessionSchema = new mongoose.Schema({
  // Session Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  description: String,
  
  // Session State
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Timing
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  
  // Bidding Configuration
  bidWindowDuration: {
    type: Number, // in minutes
    required: true,
    default: 5
  },
  autoAssignTimeout: {
    type: Number, // in minutes
    required: true,
    default: 2
  },
  
  // Participant Queue
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    bidPriority: {
      type: Number,
      required: true
    },
    timeWindow: {
      start: Date,
      end: Date
    },
    hasBid: {
      type: Boolean,
      default: false
    },
    assignedStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    },
    assignedShift: {
      type: String,
      enum: ['A', 'B', 'C']
    },
    assignedPosition: {
      type: String,
      enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']
    },
    autoAssigned: {
      type: Boolean,
      default: false
    },
    bidHistory: [{
      station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station'
      },
      shift: {
        type: String,
        enum: ['A', 'B', 'C']
      },
      position: {
        type: String,
        enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer']
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Current Bidding State
  currentParticipant: {
    type: Number,
    default: 0
  },
  currentBidStart: Date,
  currentBidEnd: Date,
  
  // Session Statistics
  totalParticipants: {
    type: Number,
    default: 0
  },
  completedBids: {
    type: Number,
    default: 0
  },
  autoAssignments: {
    type: Number,
    default: 0
  },
  
  // Settings
  settings: {
    allowMultipleBids: {
      type: Boolean,
      default: false
    },
    requirePositionMatch: {
      type: Boolean,
      default: true
    },
    allowCrossShiftBidding: {
      type: Boolean,
      default: false
    },
    maxBidAttempts: {
      type: Number,
      default: 3
    }
  },
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
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

// Virtual for progress percentage
bidSessionSchema.virtual('progressPercentage').get(function() {
  if (this.totalParticipants === 0) return 0;
  return Math.round((this.completedBids / this.totalParticipants) * 100);
});

// Virtual for current participant info
bidSessionSchema.virtual('currentParticipantInfo').get(function() {
  if (this.currentParticipant >= this.participants.length) return null;
  return this.participants[this.currentParticipant];
});

// Virtual for time remaining in current bid
bidSessionSchema.virtual('currentBidTimeRemaining').get(function() {
  if (!this.currentBidEnd) return 0;
  
  const now = new Date();
  const timeRemaining = this.currentBidEnd.getTime() - now.getTime();
  return Math.max(0, timeRemaining);
});

// Method to add participant
bidSessionSchema.methods.addParticipant = function(userId, bidPriority) {
  const position = this.participants.length;
  
  this.participants.push({
    user: userId,
    position: position,
    bidPriority: bidPriority,
    hasBid: false
  });
  
  this.totalParticipants = this.participants.length;
  return this.save();
};

// Method to start session
bidSessionSchema.methods.startSession = function() {
  this.status = 'active';
  this.actualStart = new Date();
  this.currentParticipant = 0;
  
  // Set up first participant's time window
  if (this.participants.length > 0) {
    this.setCurrentParticipantTimeWindow();
  }
  
  return this.save();
};

// Method to pause session
bidSessionSchema.methods.pauseSession = function() {
  this.status = 'paused';
  return this.save();
};

// Method to resume session
bidSessionSchema.methods.resumeSession = function() {
  this.status = 'active';
  this.setCurrentParticipantTimeWindow();
  return this.save();
};

// Method to complete session
bidSessionSchema.methods.completeSession = function() {
  this.status = 'completed';
  this.actualEnd = new Date();
  return this.save();
};

// Method to set current participant's time window
bidSessionSchema.methods.setCurrentParticipantTimeWindow = function() {
  if (this.currentParticipant >= this.participants.length) return;
  
  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + (this.bidWindowDuration * 60 * 1000));
  
  this.participants[this.currentParticipant].timeWindow = {
    start: startTime,
    end: endTime
  };
  
  this.currentBidStart = startTime;
  this.currentBidEnd = endTime;
};

// Method to advance to next participant
bidSessionSchema.methods.advanceToNextParticipant = function() {
  if (this.currentParticipant < this.participants.length) {
    this.participants[this.currentParticipant].hasBid = true;
    this.completedBids++;
  }
  
  this.currentParticipant++;
  
  if (this.currentParticipant < this.participants.length) {
    this.setCurrentParticipantTimeWindow();
  } else {
    this.completeSession();
  }
  
  return this.save();
};

// Method to auto-assign current participant
bidSessionSchema.methods.autoAssignCurrentParticipant = function() {
  if (this.currentParticipant >= this.participants.length) return;
  
  const participant = this.participants[this.currentParticipant];
  participant.autoAssigned = true;
  participant.hasBid = true;
  this.autoAssignments++;
  this.completedBids++;
  
  // Auto-assignment logic would go here
  // For now, just mark as auto-assigned
  
  this.advanceToNextParticipant();
  return this.save();
};

// Method to process bid
bidSessionSchema.methods.processBid = function(stationId, shift, position) {
  if (this.currentParticipant >= this.participants.length) {
    throw new Error('No current participant');
  }
  
  const participant = this.participants[this.currentParticipant];
  
  // Add to bid history
  participant.bidHistory.push({
    station: stationId,
    shift: shift,
    position: position
  });
  
  // Assign the bid
  participant.assignedStation = stationId;
  participant.assignedShift = shift;
  participant.assignedPosition = position;
  participant.hasBid = true;
  
  this.advanceToNextParticipant();
  return this.save();
};

// Method to get session summary
bidSessionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    year: this.year,
    status: this.status,
    progress: this.progressPercentage,
    totalParticipants: this.totalParticipants,
    completedBids: this.completedBids,
    autoAssignments: this.autoAssignments,
    currentParticipant: this.currentParticipant,
    scheduledStart: this.scheduledStart,
    scheduledEnd: this.scheduledEnd
  };
};

// Indexes for performance
bidSessionSchema.index({ status: 1 });
bidSessionSchema.index({ year: 1 });
bidSessionSchema.index({ scheduledStart: 1 });
bidSessionSchema.index({ 'participants.user': 1 });
bidSessionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('BidSession', bidSessionSchema);
