const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Department Information
  rank: {
    type: String,
    required: true,
    enum: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Deputy Chief', 'Chief'],
    default: 'Firefighter'
  },
  position: {
    type: String,
    required: true,
    enum: ['Firefighter', 'Paramedic', 'EMT', 'Driver', 'Operator', 'Officer'],
    default: 'Firefighter'
  },
  yearsOfService: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // Current Assignment
  currentStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  currentShift: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  
  // Bidding Information
  bidPriority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  
  // Bidding Session Data
  currentBidSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BidSession'
  },
  bidPosition: {
    type: Number,
    default: 0
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
  
  // Preferences
  preferredStations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  }],
  preferredShifts: [{
    type: String,
    enum: ['A', 'B', 'C']
  }],
  
  // Timestamps
  lastLogin: Date,
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

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for seniority score
userSchema.virtual('seniorityScore').get(function() {
  // Calculate seniority score based on years of service, rank, and position
  let score = this.yearsOfService * 10;
  
  // Rank multipliers
  const rankMultipliers = {
    'Firefighter': 1,
    'Engineer': 1.2,
    'Lieutenant': 1.5,
    'Captain': 2,
    'Battalion Chief': 3,
    'Deputy Chief': 4,
    'Chief': 5
  };
  
  // Position multipliers
  const positionMultipliers = {
    'Firefighter': 1,
    'Paramedic': 1.3,
    'EMT': 1.1,
    'Driver': 1.2,
    'Operator': 1.4,
    'Officer': 1.5
  };
  
  score *= (rankMultipliers[this.rank] || 1);
  score *= (positionMultipliers[this.position] || 1);
  
  return Math.round(score);
});

// Indexes for performance (email and employeeId are already indexed due to unique: true)
userSchema.index({ bidPriority: -1 });
userSchema.index({ currentBidSession: 1, bidPosition: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate bid priority
userSchema.methods.calculateBidPriority = function() {
  this.bidPriority = this.seniorityScore;
  return this.bidPriority;
};

// Method to check if user can bid
userSchema.methods.canBid = function() {
  if (!this.currentBidSession) return false;
  if (this.hasBid) return false;
  
  const now = new Date();
  return this.timeWindow.start <= now && now <= this.timeWindow.end;
};

// Method to get time remaining in bid window
userSchema.methods.getTimeRemaining = function() {
  if (!this.timeWindow.end) return 0;
  
  const now = new Date();
  const timeRemaining = this.timeWindow.end.getTime() - now.getTime();
  return Math.max(0, timeRemaining);
};

module.exports = mongoose.model('User', userSchema);
