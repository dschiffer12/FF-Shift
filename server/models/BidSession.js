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
    movedToBack: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0
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

// Virtual for current participant info
bidSessionSchema.virtual('currentParticipantInfo').get(function() {
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    return null;
  }
  
  const participant = this.participants[this.currentParticipant - 1];
  return {
    position: participant.position,
    user: participant.user,
    hasBid: participant.hasBid,
    timeWindow: participant.timeWindow
  };
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
  this.currentParticipant = 1; // Start with first participant (1-based indexing)
  
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
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) return;
  
  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + (this.bidWindowDuration * 60 * 1000));
  
  // Convert to 0-based index for array access
  const participantIndex = this.currentParticipant - 1;
  
  this.participants[participantIndex].timeWindow = {
    start: startTime,
    end: endTime
  };
  
  this.currentBidStart = startTime;
  this.currentBidEnd = endTime;
};

// Method to advance to next participant
bidSessionSchema.methods.advanceToNextParticipant = function() {
  if (this.currentParticipant <= this.participants.length) {
    const participantIndex = this.currentParticipant - 1;
    this.participants[participantIndex].hasBid = true;
    this.completedBids++;
  }
  
  this.currentParticipant++;
  
  if (this.currentParticipant <= this.participants.length) {
    this.setCurrentParticipantTimeWindow();
  } else {
    // Check if session should complete
    this.checkSessionCompletion();
  }
  
  return this.save();
};

// Method to check if session should complete
bidSessionSchema.methods.checkSessionCompletion = function() {
  const maxAttempts = 3; // Maximum number of times a participant can be moved to back
  
  // Check if all participants have either made a bid or exceeded max attempts
  const allParticipantsHandled = this.participants.every(participant => {
    return participant.hasBid || (participant.attempts >= maxAttempts);
  });
  
  if (allParticipantsHandled) {
    this.completeSession();
  } else {
    // Find next participant who hasn't made a bid and hasn't exceeded max attempts
    const nextParticipantIndex = this.participants.findIndex(participant => {
      return !participant.hasBid && participant.attempts < maxAttempts;
    });
    
    if (nextParticipantIndex !== -1) {
      this.currentParticipant = nextParticipantIndex + 1; // Convert to 1-based indexing
      this.setCurrentParticipantTimeWindow();
    } else {
      // All participants have either bid or exceeded max attempts
      this.completeSession();
    }
  }
};

// Method to check if current participant's time has expired and move them to back
bidSessionSchema.methods.checkTimeExpiration = function() {
  if (this.status !== 'active' || this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    return false;
  }
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
  if (!participant.timeWindow || !participant.timeWindow.end) {
    return false;
  }
  
  const now = new Date();
  const timeExpired = now > participant.timeWindow.end;
  
  if (timeExpired && !participant.hasBid) {
    // Time has expired and participant hasn't made a bid, move them to back
    this.moveCurrentParticipantToBack();
    return true;
  }
  
  return false;
};

// Method to move current participant to back of queue
bidSessionSchema.methods.moveCurrentParticipantToBack = function() {
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) return;
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
  // Mark participant as moved to back and increment attempts
  participant.movedToBack = true;
  participant.attempts = (participant.attempts || 0) + 1;
  
  // Move participant to the end of the queue
  const movedParticipant = this.participants.splice(participantIndex, 1)[0];
  this.participants.push(movedParticipant);
  
  // Update positions for all participants
  this.participants.forEach((p, index) => {
    p.position = index;
  });
  
  // Don't increment completedBids since they're still in the queue
  // Don't increment autoAssignments since we're not auto-assigning
  
  // Find the next participant who hasn't made a bid and hasn't exceeded max attempts
  const maxAttempts = 3;
  const nextParticipantIndex = this.participants.findIndex(p => {
    return !p.hasBid && (p.attempts || 0) < maxAttempts;
  });
  
  if (nextParticipantIndex !== -1) {
    this.currentParticipant = nextParticipantIndex + 1; // Convert to 1-based indexing
    this.setCurrentParticipantTimeWindow();
  } else {
    // All participants have either bid or exceeded max attempts
    this.completeSession();
  }
  
  return this.save();
};

// Method to process bid
bidSessionSchema.methods.processBid = function(stationId, shift, position) {
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    throw new Error('No current participant');
  }
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
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
  // Count participants who have been moved to back
  const movedToBackCount = this.participants.filter(p => p.movedToBack).length;
  
  return {
    id: this._id,
    name: this.name,
    year: this.year,
    status: this.status,
    progress: this.progressPercentage,
    totalParticipants: this.totalParticipants,
    completedBids: this.completedBids,
    autoAssignments: this.autoAssignments,
    movedToBackCount: movedToBackCount,
    currentParticipant: this.currentParticipant,
    scheduledStart: this.scheduledStart,
    scheduledEnd: this.scheduledEnd,
    participants: this.participants,
    currentBidStart: this.currentBidStart,
    currentBidEnd: this.currentBidEnd,
    bidWindowDuration: this.bidWindowDuration,
    currentParticipantInfo: this.currentParticipantInfo
  };
};

// Indexes for performance
bidSessionSchema.index({ status: 1 });
bidSessionSchema.index({ year: 1 });
bidSessionSchema.index({ scheduledStart: 1 });
bidSessionSchema.index({ 'participants.user': 1 });
bidSessionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('BidSession', bidSessionSchema);
