const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth/authMiddleware');
const { sendNotification } = require('../services/pushService');

// Save a notification for a user (and optionally send push)
router.post('/send', auth, async (req, res) => {
  try {
    const { title, message, type, targetUsers, url } = req.body;

    const users = targetUsers && targetUsers.length > 0
      ? await User.find({ _id: { $in: targetUsers } }).select('pushSubscription notifications')
      : await User.find({}).select('pushSubscription notifications');

    let pushed = 0;
    for (const user of users) {
      // Persist notification in user document
      if (!user.notifications) user.notifications = [];
      user.notifications.unshift({
        title,
        message,
        type: type || 'info',
        read: false,
        url: url || '/',
        createdAt: new Date()
      });
      // Keep only last 50
      if (user.notifications.length > 50) user.notifications = user.notifications.slice(0, 50);
      await user.save();

      // Send push if subscription exists
      if (user.pushSubscription) {
        const ok = await sendNotification(user.pushSubscription, { title, body: message, url });
        if (ok) pushed++;
      }
    }

    res.json({
      message: 'Notification sent successfully',
      recipients: users.length,
      pushSent: pushed
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's notifications
router.get('/my', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = (user.notifications || []).map((n, i) => ({
      _id: n._id || String(i),
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      read: n.read || false,
      url: n.url || '/',
      createdAt: n.createdAt
    }));

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    (user.notifications || []).forEach(n => { n.read = true; });
    await user.save();
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark single notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notif = (user.notifications || []).find(n => String(n._id) === req.params.id);
    if (notif) {
      notif.read = true;
      await user.save();
    }
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;