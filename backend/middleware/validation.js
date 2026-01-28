const validator = require('validator');

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Email validation helper
const isValidEmail = (email) => {
  return validator.isEmail(email) && email.length <= 254;
};

// Password validation helper
const isValidPassword = (password) => {
  return password && password.length >= 6 && password.length <= 128;
};

// Validation middleware for auth routes
const validateLogin = (req, res, next) => {
  let { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  email = email.toLowerCase().trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  if (!isValidPassword(password)) {
    return res.status(400).json({ message: 'Invalid password format' });
  }
  
  req.body.email = email;
  next();
};

const validateRegister = (req, res, next) => {
  let { name, email, password, phone, studentId, shift, department, year, rollNumber } = req.body;
  
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
  
  // Validate password
  if (!isValidPassword(password)) {
    return res.status(400).json({ message: 'Password must be 6-128 characters long' });
  }
  
  // Validate name length
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ message: 'Name must be 2-100 characters long' });
  }
  
  // Update request body with sanitized values
  req.body = { name, email, password, phone, studentId, shift, department, year, rollNumber };
  next();
};

const validateForgotPassword = (req, res, next) => {
  let { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  email = email.toLowerCase().trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  req.body.email = email;
  next();
};

const validateResetPassword = (req, res, next) => {
  let { email, otp, password } = req.body;
  
  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, OTP and password are required' });
  }
  
  email = email.toLowerCase().trim();
  otp = String(otp).replace(/[^0-9]/g, '');
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be 6-128 characters long' });
  }
  
  if (otp.length !== 6) {
    return res.status(400).json({ error: 'OTP must be 6 digits' });
  }
  
  req.body = { email, otp, password };
  next();
};

module.exports = {
  sanitizeInput,
  isValidEmail,
  isValidPassword,
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword
};