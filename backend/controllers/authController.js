const db = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
        const { name, email, phone, studentId, shift, department, year, rollNumber, password } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ message: 'Roll number is required.' });
    }

    // Check if user already exists
    const { Op } = require('sequelize');

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email: { [Op.iLike]: email } } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

        const existingStudentId = await db.User.findOne({ where: { studentId: { [Op.iLike]: studentId } } });
    if (existingStudentId) {
      return res.status(400).json({ message: 'User with this student ID already exists.' });
    }

        const existingRollNumber = await db.User.findOne({ where: { rollNumber: { [Op.iLike]: rollNumber } } });
    if (existingRollNumber) {
      return res.status(400).json({ message: 'User with this roll number already exists.' });
    }

    // Create new user (password will be hashed by the model hook)
    const newUser = await db.User.create({
      name,
      email,
      phone,
      studentId,
      shift,
      department,
      year,
      rollNumber,
      password,
    });

    // Generate JWT
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
      }

  try {
    // Check for user
        const { Op } = require('sequelize');
    const user = await db.User.findOne({ where: { email: email.toLowerCase() } });

    if (user && (await user.isValidPassword(password))) {
      // Create token
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login };
