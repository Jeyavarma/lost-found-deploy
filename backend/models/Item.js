const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: {
    type: String,
    required: true,
    enum: [
      "Bishop Heber Hall", "Selaiyur Hall", "St. Thomas's Hall", "Barnes Hall",
      "Martin Hall", "Main Auditorium", "ICF Ground (Cricket/Athletics)", "Quadrangle",
      "Miller Library", "Main Canteen", "Zoology Department", "Botany Department",
      "Physics Department", "Chemistry Department", "Near Main Gate (Velachery Road)",
      "Near Air Force Station Road Gate", "Other"
    ]
  },
  status: { type: String, enum: ['lost', 'found', 'resolved', 'claimed', 'verified'], default: 'lost' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  contactInfo: { type: String, required: true },
  contactName: { type: String, required: false },
  contactEmail: { type: String, required: false },
  contactPhone: { type: String, required: false },
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
  returnedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnedToName: String,
  returnedAt: Date,
  returnProcessStatus: { type: String, enum: ['none', 'pending_confirmation', 'confirmed'], default: 'none' },
  handoverOTP: String,
  // Proof of Ownership (Hidden Image)
  isImageHidden: { type: Boolean, default: false },
  verificationQuestions: [String],
  claimAnswers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: [String],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now }
  }],
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
  }],
  // AI NLP Text Matching (OpenAI Embeddings)
  embedding: {
    type: [Number],
    default: undefined
  },

  // Anonymous Reporting
  isAnonymous: { type: Boolean, default: false },

  // Emergency / Critical Prioritization
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  }
}, { timestamps: true });

itemSchema.index({ reportedBy: 1, createdAt: -1 });
itemSchema.index({ status: 1, category: 1 });
itemSchema.index({ createdAt: -1 });

// --- Level 1 AI Match Fallback: Compound Text Index ---
// This enables fast keyword matching ($text search) on strings
// if OpenAI embeddings are unavailable or lack results.
itemSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  location: 'text'
});

module.exports = mongoose.model('Item', itemSchema);