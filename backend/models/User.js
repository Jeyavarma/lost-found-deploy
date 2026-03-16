const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
  phone: String,
  studentId: String,
  shift: String,
  department: String,
  year: String,
  rollNumber: String,
  lastLogin: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  suspendedUntil: Date,
  suspensionReason: String,
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loginAttempts: { type: Number, default: 0 },
  lastFailedLogin: Date,
  accountLocked: { type: Boolean, default: false },
  lockedUntil: Date,
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  deviceType: { type: String, enum: ['mobile', 'desktop'], default: 'desktop' },
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  notifications: [{
    title: String,
    message: String,
    type: { type: String, enum: ['info', 'match', 'message', 'claim', 'system'], default: 'info' },
    read: { type: Boolean, default: false },
    url: { type: String, default: '/' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Changed salt rounds from 10 to 8 to significantly speed up signup/login on Render Free Tier
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);