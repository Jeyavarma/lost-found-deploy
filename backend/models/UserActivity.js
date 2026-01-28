const mongoose = require('mongoose')

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'register',
      'report_lost', 'report_found', 'edit_item', 'delete_item',
      'claim_item', 'verify_claim', 'reject_claim',
      'send_message', 'view_item', 'search',
      'profile_update', 'password_change'
    ]
  },
  details: {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    searchQuery: String,
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

userActivitySchema.index({ userId: 1, timestamp: -1 })
userActivitySchema.index({ action: 1, timestamp: -1 })

module.exports = mongoose.model('UserActivity', userActivitySchema)