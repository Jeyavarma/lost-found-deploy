const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

blockedUserSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
blockedUserSchema.index({ blockedUserId: 1 });

module.exports = mongoose.model('BlockedUser', blockedUserSchema);