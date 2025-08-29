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
  
  // Session History - tracks all actions in the session
  sessionHistory: [{
    action: {
      type: String,
      enum: ['bid_submitted', 'turn_skipped', 'moved_to_back', 'auto_assigned', 'session_started', 'session_paused', 'session_resumed', 'session_completed'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    },
    stationName: String,
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
    },
    details: String
  }],
  
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
  try {
    if (this.totalParticipants === 0) return 0;
    return Math.round((this.completedBids / this.totalParticipants) * 100);
  } catch (error) {
    console.error('Error in progressPercentage virtual:', error);
    return 0;
  }
});

// Virtual for time remaining in current bid
bidSessionSchema.virtual('currentBidTimeRemaining').get(function() {
  try {
    if (!this.currentBidEnd) return 0;
    
    const now = new Date();
    const timeRemaining = this.currentBidEnd.getTime() - now.getTime();
    return Math.max(0, timeRemaining);
  } catch (error) {
    console.error('Error in currentBidTimeRemaining virtual:', error);
    return 0;
  }
});

// Virtual for current participant info
bidSessionSchema.virtual('currentParticipantInfo').get(function() {
  try {
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
  } catch (error) {
    console.error('Error in currentParticipantInfo virtual:', error);
    return null;
  }
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
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { totalParticipants: this.totalParticipants } },
    { new: true }
  );
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
  
  // Add to session history
  this.sessionHistory.push({
    action: 'session_started',
    details: 'Bid session started'
  });
  
  // Update the participant's time window in the database
  const participantIndex = this.currentParticipant - 1;
  const participantUpdate = {};
  participantUpdate[`participants.${participantIndex}.timeWindow`] = this.participants[participantIndex].timeWindow;

  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: {
        status: this.status,
        actualStart: this.actualStart,
        currentParticipant: this.currentParticipant,
        currentBidStart: this.currentBidStart,
        currentBidEnd: this.currentBidEnd,
        ...participantUpdate
      },
      $push: { sessionHistory: this.sessionHistory[this.sessionHistory.length - 1] }
    },
    { new: true }
  );
};

// Method to pause session
bidSessionSchema.methods.pauseSession = function() {
  this.status = 'paused';
  
  // Add to session history
  this.sessionHistory.push({
    action: 'session_paused',
    details: 'Bid session paused'
  });
  
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: { status: this.status },
      $push: { sessionHistory: this.sessionHistory[this.sessionHistory.length - 1] }
    },
    { new: true }
  );
};

// Method to resume session
bidSessionSchema.methods.resumeSession = function() {
  this.status = 'active';
  this.setCurrentParticipantTimeWindow();
  
  // Add to session history
  this.sessionHistory.push({
    action: 'session_resumed',
    details: 'Bid session resumed'
  });
  
  // Update the participant's time window in the database
  const participantIndex = this.currentParticipant - 1;
  const participantUpdate = {};
  participantUpdate[`participants.${participantIndex}.timeWindow`] = this.participants[participantIndex].timeWindow;

  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: {
        status: this.status,
        currentBidStart: this.currentBidStart,
        currentBidEnd: this.currentBidEnd,
        ...participantUpdate
      },
      $push: { sessionHistory: this.sessionHistory[this.sessionHistory.length - 1] }
    },
    { new: true }
  );
};

// Method to complete session
bidSessionSchema.methods.completeSession = function() {
  this.status = 'completed';
  this.actualEnd = new Date();
  
  // Add to session history
  this.sessionHistory.push({
    action: 'session_completed',
    details: 'Bid session completed'
  });
  
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: {
        status: this.status,
        actualEnd: this.actualEnd
      },
      $push: { sessionHistory: this.sessionHistory[this.sessionHistory.length - 1] }
    },
    { new: true }
  );
};

// Method to set current participant's time window
bidSessionSchema.methods.setCurrentParticipantTimeWindow = function() {
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) return;
  
  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + (this.bidWindowDuration * 60 * 1000));
  
  // Convert to 0-based index for array access
  const participantIndex = this.currentParticipant - 1;
  
  console.log(`Setting time window for participant ${this.currentParticipant}:`, {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: this.bidWindowDuration,
    participantIndex
  });
  
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
  
  // Don't save here - let the calling method handle the save
  return this;
};

// Method to check if session should complete
bidSessionSchema.methods.checkSessionCompletion = function() {
  const maxAttempts = 3; // Maximum number of times a participant can be moved to back
  
  // Check if all participants have either made a bid or exceeded max attempts
  const allParticipantsHandled = this.participants.every(participant => {
    return participant.hasBid || (participant.attempts >= maxAttempts);
  });
  
  if (allParticipantsHandled) {
    // Don't call completeSession() here as it calls save()
    // Just set the status and let the calling method handle the save
    this.status = 'completed';
    this.actualEnd = new Date();
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
      this.status = 'completed';
      this.actualEnd = new Date();
    }
  }
};

// Method to check if current participant's time has expired and move them to back
bidSessionSchema.methods.checkTimeExpiration = async function() {
  console.log(`Checking time expiration for session ${this._id}, status: ${this.status}, currentParticipant: ${this.currentParticipant}`);
  
  if (this.status !== 'active' || this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    console.log('Session not active or invalid current participant');
    return false;
  }
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
  if (!participant.timeWindow || !participant.timeWindow.end) {
    console.log('No time window set for current participant');
    return false;
  }
  
  const now = new Date();
  const timeExpired = now > participant.timeWindow.end;
  
  console.log(`Current time: ${now}, End time: ${participant.timeWindow.end}, Time expired: ${timeExpired}, Has bid: ${participant.hasBid}`);
  
  if (timeExpired && !participant.hasBid) {
    console.log('Time expired and no bid made, moving participant to back');
    // Time has expired and participant hasn't made a bid, move them to back
    await this.moveCurrentParticipantToBack();
    return true;
  }
  
  return false;
};

// Method to move current participant to back of queue
bidSessionSchema.methods.moveCurrentParticipantToBack = async function() {
  console.log(`Moving participant to back for session ${this._id}, currentParticipant: ${this.currentParticipant}`);
  
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    console.log('Invalid current participant index');
    return;
  }
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
  console.log(`Moving participant ${participant.user} to back of queue`);
  
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
    console.log(`Next participant set to: ${this.currentParticipant}`);
    this.setCurrentParticipantTimeWindow();
  } else {
    // All participants have either bid or exceeded max attempts
    console.log('All participants handled, completing session');
    this.status = 'completed';
    this.actualEnd = new Date();
  }
  
  // Use findOneAndUpdate to avoid parallel save issues
  const updatedSession = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $push: {
        sessionHistory: {
          action: 'moved_to_back',
          userId: participant.user,
          userName: participant.user.firstName && participant.user.lastName 
            ? `${participant.user.firstName} ${participant.user.lastName}`
            : 'Unknown User',
          details: `Moved to back of queue due to time expiration`,
          timestamp: new Date()
        }
      },
      $set: {
        participants: this.participants,
        currentParticipant: this.currentParticipant,
        currentBidStart: this.currentBidStart,
        currentBidEnd: this.currentBidEnd
      }
    },
    { new: true }
  );
  
  if (!updatedSession) {
    throw new Error('Failed to update bid session');
  }
  
  // Update the current document instance
  Object.assign(this, updatedSession.toObject());
  
  console.log('Participant moved to back successfully');
  return this;
};

// Method to process bid
bidSessionSchema.methods.processBid = async function(stationId, shift, position) {
  if (this.currentParticipant > this.participants.length || this.currentParticipant < 1) {
    throw new Error('No current participant');
  }
  
  const participantIndex = this.currentParticipant - 1;
  const participant = this.participants[participantIndex];
  
  // Update station assignment first
  const Station = require('./Station');
  const station = await Station.findById(stationId);
  if (station) {
    await station.addAssignment(shift, participant.user, position);
  }
  
  // Use findOneAndUpdate to avoid parallel save issues
  const updatedSession = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $push: {
        'participants.$.bidHistory': {
          station: stationId,
          shift: shift,
          position: position
        },
        sessionHistory: {
          action: 'bid_submitted',
          userId: participant.user,
          userName: participant.user.firstName && participant.user.lastName 
            ? `${participant.user.firstName} ${participant.user.lastName}`
            : 'Unknown User',
          station: stationId,
          stationName: station ? station.name : 'Unknown Station',
          shift: shift,
          position: position,
          details: `Bid submitted for ${station ? station.name : 'Unknown Station'} - ${shift} Shift - ${position}`,
          timestamp: new Date()
        }
      },
      $set: {
        'participants.$.assignedStation': stationId,
        'participants.$.assignedShift': shift,
        'participants.$.assignedPosition': position,
        'participants.$.hasBid': true
      }
    },
    { 
      new: true,
      arrayFilters: [{ 'participants._id': participant._id }]
    }
  );
  
  if (!updatedSession) {
    throw new Error('Failed to update bid session');
  }
  
  // Update the current document instance
  Object.assign(this, updatedSession.toObject());
  
  // Advance to next participant and save the advancement
  this.advanceToNextParticipant();
  
  // Update the participant's time window in the database
  const nextParticipantIndex = this.currentParticipant - 1;
  const participantUpdate = {};
  if (this.participants[nextParticipantIndex] && this.participants[nextParticipantIndex].timeWindow) {
    participantUpdate[`participants.${nextParticipantIndex}.timeWindow`] = this.participants[nextParticipantIndex].timeWindow;
  }

  // Use findOneAndUpdate for the advancement to avoid parallel save issues
  const finalUpdate = await this.constructor.findOneAndUpdate(
    { _id: this._id },
    {
      $set: {
        currentParticipant: this.currentParticipant,
        currentBidStart: this.currentBidStart,
        currentBidEnd: this.currentBidEnd,
        completedBids: this.completedBids,
        ...participantUpdate
      }
    },
    { new: true }
  );
  
  if (!finalUpdate) {
    throw new Error('Failed to update bid session advancement');
  }
  
  // Update the current document instance
  Object.assign(this, finalUpdate.toObject());
  
  return this;
};

// Method to calculate available stations
bidSessionSchema.methods.calculateAvailableStations = function() {
  try {
    // For now, return a simple count based on the number of active stations
    // This is a simplified version - in a real implementation, you'd check actual availability
    return 5; // Return the number of stations we know exist
  } catch (error) {
    console.error('Error in calculateAvailableStations:', error);
    return 0;
  }
};

// Method to get session history
bidSessionSchema.methods.getSessionHistory = function() {
  return this.sessionHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Method to get session summary
bidSessionSchema.methods.getSummary = function() {
  try {
    // Count participants who have been moved to back
    const movedToBackCount = this.participants.filter(p => p.movedToBack).length;
    
    const summary = {
      id: this._id,
      name: this.name,
      year: this.year,
      status: this.status,
      progress: this.progressPercentage,
      totalParticipants: this.totalParticipants,
      participantCount: this.participants.length,
      availableStations: this.calculateAvailableStations(),
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
    
    console.log('Session summary:', {
      id: summary.id,
      status: summary.status,
      currentParticipant: summary.currentParticipant,
      currentBidStart: summary.currentBidStart,
      currentBidEnd: summary.currentBidEnd,
      bidWindowDuration: summary.bidWindowDuration
    });
    
    return summary;
  } catch (error) {
    console.error('Error in getSummary:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};

// Indexes for performance
bidSessionSchema.index({ status: 1 });
bidSessionSchema.index({ year: 1 });
bidSessionSchema.index({ scheduledStart: 1 });
bidSessionSchema.index({ 'participants.user': 1 });
bidSessionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('BidSession', bidSessionSchema);
