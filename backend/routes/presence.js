const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth/authMiddleware');
const router = express.Router();

// Update user presence (heartbeat)
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const { deviceType } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      lastSeen: new Date(),
      isOnline: true,
      deviceType: deviceType || 'desktop'
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// Set user offline
router.post('/offline', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastSeen: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set offline' });
  }
});

// Get user status
router.get('/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('isOnline lastSeen deviceType name');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const minutesAgo = Math.floor((now - lastSeen) / (1000 * 60));
    
    let status = 'offline';
    let statusText = 'Offline';
    
    if (user.isOnline && minutesAgo <= 2) {
      status = 'online';
      statusText = 'Online now';
    } else if (minutesAgo <= 5) {
      status = 'away';
      statusText = `Away (last seen ${minutesAgo} min ago)`;
    } else if (minutesAgo <= 60) {
      status = 'offline';
      statusText = `Offline (last seen ${minutesAgo} min ago)`;
    } else if (minutesAgo <= 1440) { // 24 hours
      const hoursAgo = Math.floor(minutesAgo / 60);
      status = 'offline';
      statusText = `Offline (last seen ${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago)`;
    } else {
      const daysAgo = Math.floor(minutesAgo / 1440);
      status = 'offline';
      statusText = `Offline (last seen ${daysAgo} day${daysAgo > 1 ? 's' : ''} ago)`;
    }
    
    res.json({
      userId: user._id,
      name: user.name,
      status,
      statusText,
      deviceType: user.deviceType || 'desktop',
      lastSeen: user.lastSeen,
      isOnline: user.isOnline
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user status' });
  }
});

module.exports = router;