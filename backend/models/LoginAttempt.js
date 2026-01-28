const mongoose = require('mongoose')

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  success: {
    type: Boolean,
    required: true
  },
  failureReason: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

loginAttemptSchema.index({ email: 1, timestamp: -1 })
loginAttemptSchema.index({ ipAddress: 1, timestamp: -1 })
loginAttemptSchema.index({ success: 1, timestamp: -1 })

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema)