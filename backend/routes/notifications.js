const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const auth = require('../middleware/auth/authMiddleware');

// Send notification to users
router.post('/send', auth, async (req, res) => {
  try {
    const { title, message, type, targetUsers } = req.body;
    
    // In a real app, you'd save notifications to DB and send emails
    // For now, just return success
    res.json({ 
      message: 'Notification sent successfully',
      recipients: targetUsers?.length || 'all users'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
router.get('/my', auth, async (req, res) => {
  try {
    // Mock notifications for now
    const notifications = [
      {
        _id: '1',
        title: 'Item Match Found',
        message: 'A potential match for your lost item has been found',
        type: 'match',
        read: false,
        createdAt: new Date()
      }
    ];
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;