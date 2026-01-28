const mongoose = require('mongoose');

const chatActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['message_sent', 'room_created', 'room_joined', 'room_left', 'user_blocked', 'user_unblocked']
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom'
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  // Auto-delete records older than 30 days
  expireAfterSeconds: 30 * 24 * 60 * 60
});

// Indexes for efficient querying
chatActivitySchema.index({ userId: 1, createdAt: -1 });
chatActivitySchema.index({ action: 1, createdAt: -1 });
chatActivitySchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatActivity', chatActivitySchema);