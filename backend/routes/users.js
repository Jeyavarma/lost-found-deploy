const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth/authMiddleware');

// Search users for chat
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
    .select('name email role')
    .limit(20)
    .sort({ name: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;