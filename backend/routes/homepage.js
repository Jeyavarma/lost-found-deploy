const express = require('express');
const Item = require('../models/Item');
const router = express.Router();

// Quick homepage data - optimized for speed
router.get('/homepage', async (req, res) => {
  try {
    // Get recent items (last 10)
    const recentItems = await Item.find()
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get basic stats
    const stats = await Promise.all([
      Item.countDocuments({ status: 'lost' }),
      Item.countDocuments({ status: 'found' }),
      Item.countDocuments({ status: 'claimed' })
    ]);

    res.json({
      recentItems,
      stats: {
        lostItems: stats[0],
        foundItems: stats[1],
        claimedItems: stats[2],
        totalItems: stats[0] + stats[1] + stats[2]
      }
    });
  } catch (error) {
    console.error('Homepage data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;