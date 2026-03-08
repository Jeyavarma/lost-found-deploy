const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth/authMiddleware');

// Simple presence routes
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    // Return mock status to prevent 404
    res.json({
      userId: req.params.userId,
      isOnline: false,
      lastSeen: new Date(),
      deviceType: 'web'
    });
  } catch (error) {
    console.error('Get presence status error:', error);
    res.status(500).json({ error: 'Failed to get presence status' });
  }
});

router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

module.exports = router;