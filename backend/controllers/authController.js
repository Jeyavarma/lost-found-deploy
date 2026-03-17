const db = require('../models');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { SessionManager } = require('../middleware/auth/sessionManager');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, phone, studentId, shift, department, year, rollNumber, password } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ message: 'Roll number is required.' });
    }

    // Optimized: Single query to check all unique fields
    const existingUser = await db.User.findOne({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: email } },
          { studentId: { [Op.iLike]: studentId } },
          { rollNumber: { [Op.iLike]: rollNumber } }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ message: 'User with this email already exists.' });
      }
      if (existingUser.studentId === studentId) {
        return res.status(400).json({ message: 'User with this student ID already exists.' });
      }
      if (existingUser.rollNumber === rollNumber) {
        return res.status(400).json({ message: 'User with this roll number already exists.' });
      }
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

    const token = SessionManager.generateToken({ id: newUser.id }, { expiresIn: '1h' });

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

    // Check for user
    const user = await db.User.findOne({ where: { email: email.toLowerCase() } });

    if (user && (await user.isValidPassword(password))) {
      // Create token
      const token = SessionManager.generateToken({ id: user.id, role: user.role }, { expiresIn: '30d' });

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
