const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    default: null
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['participant', 'owner'],
      default: 'participant'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  type: {
    type: String,
    enum: ['item', 'direct'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  },
  // Feature 22: moderation reporting fields
  reportedAt: { type: Date, default: null },
  reportReason: { type: String, default: null },
  // Feature 23: Handover Scheduling
  activeMeeting: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
    location: String,
    date: String,
    time: String,
    status: {
      type: String,
      enum: ['proposed', 'accepted', 'rejected', 'canceled'],
      default: 'proposed'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatRoomSchema.index({ 'participants.userId': 1 });
chatRoomSchema.index({ itemId: 1 });
chatRoomSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);