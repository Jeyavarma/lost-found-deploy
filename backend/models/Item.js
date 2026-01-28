const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['lost', 'found', 'resolved', 'claimed', 'verified'], default: 'lost' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  contactInfo: { type: String, required: true },
  imageUrl: String,
  locationImageUrl: String,
  dateReported: { type: Date, default: Date.now },
  timeReported: { type: String, required: true },
  timeLostFound: { type: String }, // When item was lost/found
  dateLostFound: { type: Date }, // Date item was lost/found
  locationDetails: {
    building: String,
    floor: String,
    room: String
  },
  culturalEvent: String,
  culturalEventOther: String,
  event: {
    type: String,
    enum: [
      'Deepwoods',
      'Moonshadow',
      'Octavia',
      'Barnes Hall Day',
      'Martin Hall Day',
      'Games Fury',
      'Founders Day'
    ]
  },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  claimDate: { type: Date },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  ownershipProof: String,
  additionalClaimInfo: String,
  adminNotes: String,
  approved: { type: Boolean, default: true },
  flagged: { type: Boolean, default: false },
  flagReason: String,
  flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flaggedAt: Date,
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: Date,
  moderationNotes: String,
  // AI Image Matching
  imageFeatures: [Number], // MobileNet feature vector (1024 dimensions)
  detectedObjects: [{
    class: String,
    confidence: Number,
    bbox: [Number]
  }],
  aiCategory: String, // AI-suggested category
  visualSimilarity: Number, // Confidence score for visual matches
  potentialMatches: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    similarity: Number,
    confidence: { type: String, enum: ['High', 'Medium', 'Low'] },
    matchedAt: { type: Date, default: Date.now },
    viewed: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);