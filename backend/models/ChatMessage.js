const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    role: String
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'system', 'meeting_proposal'],
    default: 'text'
  },
  meetingData: {
    location: String,
    date: String,
    time: String,
    status: {
      type: String,
      enum: ['proposed', 'accepted', 'rejected', 'canceled'],
      default: 'proposed'
    }
  },
  clientMessageId: String,
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  // Feature 21: edit and soft-delete support
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ 'senderId._id': 1 });
chatMessageSchema.index({ clientMessageId: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);