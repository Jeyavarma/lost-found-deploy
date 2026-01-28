const mongoose = require('mongoose')

const itemTransactionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  lostReportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foundReportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handedOverTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['lost', 'found', 'claimed', 'verified', 'returned', 'closed'],
    default: 'lost'
  },
  timeline: [{
    action: {
      type: String,
      enum: ['reported_lost', 'reported_found', 'claimed', 'verified', 'handed_over', 'closed']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  resolutionTime: Number, // in hours
  isResolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

itemTransactionSchema.index({ itemId: 1 })
itemTransactionSchema.index({ lostReportedBy: 1 })
itemTransactionSchema.index({ status: 1 })

module.exports = mongoose.model('ItemTransaction', itemTransactionSchema)