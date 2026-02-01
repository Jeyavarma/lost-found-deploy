const express = require('express');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const LoginAttempt = require('../models/LoginAttempt');
const UserActivity = require('../models/UserActivity');
const emailService = require('../services/emailService');
const config = require('../config/environment');
const { SessionManager, blacklistToken } = require('../middleware/auth/sessionManager');
// Simple rate limiter
const passwordResetLimiter = (req, res, next) => next();
const router = express.Router();

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Email validation helper
const isValidEmail = (email) => {
  return validator.isEmail(email) && email.length <= 254;
};

// Strong password validation helper
const isValidPassword = (password) => {
  if (!password || password.length < 8 || password.length > 128) return false;
  
  // Must contain at least one uppercase, lowercase, number, and special character
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUpper && hasLower && hasNumber && hasSpecial;
};

// Password strength checker
const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
};

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Input validation and sanitization
    if (!email || !password) {
      await LoginAttempt.create({
        email: email || 'unknown',
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Missing credentials'
      });
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Sanitize and validate email
    email = email.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate password
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Invalid password format' });
    }
    
    const user = await User.findOne({ email });
    
    // Check if account is locked
    if (user && user.accountLocked && user.lockedUntil && new Date() < user.lockedUntil) {
      await LoginAttempt.create({
        email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Account locked',
        userId: user._id
      });
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({ 
        message: `Account locked. Try again in ${remainingTime} minutes.`,
        lockedUntil: user.lockedUntil
      });
    }
    
    // Auto-unlock if lock period expired
    if (user && user.accountLocked && user.lockedUntil && new Date() >= user.lockedUntil) {
      user.accountLocked = false;
      user.lockedUntil = null;
      user.loginAttempts = 0;
      await user.save();
    }
    
    // Check if user is suspended
    if (user && !user.isActive) {
      const suspendedUntil = user.suspendedUntil;
      if (!suspendedUntil || new Date() < suspendedUntil) {
        await LoginAttempt.create({
          email,
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'Account suspended',
          userId: user._id
        });
        return res.status(403).json({ 
          message: 'Account suspended', 
          reason: user.suspensionReason,
          suspendedUntil: suspendedUntil
        });
      } else {
        // Auto-unsuspend if suspension period expired
        user.isActive = true;
        user.suspendedUntil = null;
        user.suspensionReason = null;
        await user.save();
      }
    }
    
    if (!user || !(await user.comparePassword(password))) {
      // Track failed login attempts
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        user.lastFailedLogin = new Date();
        
        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 5) {
          user.accountLocked = true;
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await user.save();
      }
      
      await LoginAttempt.create({
        email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Invalid credentials',
        userId: user?._id
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login
    await LoginAttempt.create({
      email,
      ipAddress,
      userAgent,
      success: true,
      userId: user._id
    });
    
    // Log user activity
    await UserActivity.create({
      userId: user._id,
      action: 'login',
      details: {
        ipAddress,
        userAgent
      }
    });

    // Update last login and online status
    user.lastLogin = new Date();
    user.lastSeen = new Date();
    user.isOnline = true;
    user.deviceType = userAgent?.includes('Mobile') ? 'mobile' : 'desktop';
    user.loginAttempts = 0; // Reset failed attempts
    await user.save();

    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'mcc-lost-found',
      audience: 'mcc-users'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    let { name, email, password, phone, studentId, shift, department, year, rollNumber, role } = req.body;
    
    // Input validation and sanitization
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Sanitize inputs
    name = sanitizeInput(name);
    email = email.toLowerCase().trim();
    phone = phone ? sanitizeInput(phone) : undefined;
    studentId = studentId ? sanitizeInput(studentId) : undefined;
    shift = shift ? sanitizeInput(shift) : undefined;
    department = department ? sanitizeInput(department) : undefined;
    year = year ? sanitizeInput(year) : undefined;
    rollNumber = rollNumber ? sanitizeInput(rollNumber) : undefined;
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be 8-128 characters with uppercase, lowercase, number, and special character' 
      });
    }
    
    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: 'Name must be 2-100 characters long' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Prevent admin creation through regular registration
    const userRole = (role === 'admin') ? 'student' : (role || 'student');

    const user = new User({ 
      name, 
      email, 
      password, 
      role: userRole,
      phone,
      studentId,
      shift,
      department,
      year,
      rollNumber
    });
    await user.save();

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(email, name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'mcc-lost-found',
      audience: 'mcc-users'
    });
    
    res.status(201).json({
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    let { email } = req.body;
    
    // Input validation and sanitization
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    email = email.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If the email exists, an OTP has been sent' });
    }

    // Generate secure OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clean up old OTPs for this email
    await OTP.deleteMany({ email });
    await new OTP({ email, otp }).save();
    
    // Send OTP via email service
    const emailResult = await emailService.sendOTPEmail(email, otp);
    
    if (process.env.NODE_ENV === 'development') {
      res.json({ 
        message: 'OTP sent to your email',
        otp: otp, // Only for development
        emailSent: emailResult.success
      });
    } else {
      res.json({ 
        message: 'OTP sent to your email',
        emailSent: emailResult.success
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    let { email, otp, password } = req.body;
    
    // Input validation
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP and password are required' });
    }
    
    // Sanitize and validate inputs
    email = email.toLowerCase().trim();
    otp = String(otp).replace(/[^0-9]/g, '');
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be 8-128 characters with uppercase, lowercase, number, and special character' 
      });
    }
    
    if (otp.length !== 6) {
      return res.status(400).json({ error: 'OTP must be 6 digits' });
    }
    
    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.password = password;
    await user.save();
    
    // Clean up OTP after successful reset
    await OTP.deleteOne({ _id: otpDoc._id });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});



// Create first admin account (only if no admin exists)
router.post('/create-first-admin', async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account already exists. Use login instead.' });
    }

    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const user = new User({ 
      name, 
      email, 
      password, 
      role: 'admin'
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'mcc-lost-found',
      audience: 'mcc-users'
    });
    
    res.status(201).json({
      message: 'First admin account created successfully',
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = SessionManager.verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      blacklistToken(token);
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

module.exports = router;