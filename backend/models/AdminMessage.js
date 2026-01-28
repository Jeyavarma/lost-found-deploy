const mongoose = require('mongoose')

const adminMessageSchema = new mongoose.Schema({
  fromAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'suspension', 'verification', 'general'],
    default: 'general'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  relatedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }
}, {
  timestamps: true
})

adminMessageSchema.index({ toUser: 1, isRead: 1 })
adminMessageSchema.index({ fromAdmin: 1 })

module.exports = mongoose.model('AdminMessage', adminMessageSchema)