const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Claim details
  ownershipProof: { type: String, required: true },
  additionalInfo: { type: String },
  proofImages: [String],
  
  // Verification requirements
  verificationQuestions: [{
    question: String,
    answer: String,
    isCorrect: { type: Boolean, default: null }
  }],
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'completed'], 
    default: 'pending' 
  },
  
  // Admin verification
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationDate: Date,
  adminNotes: String,
  
  // Return process
  returnMethod: { 
    type: String, 
    enum: ['pickup', 'delivery', 'meetup'] 
  },
  returnLocation: String,
  returnDate: Date,
  returnCompleted: { type: Boolean, default: false },
  
  // Notifications
  ownerNotified: { type: Boolean, default: false },
  claimantNotified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);