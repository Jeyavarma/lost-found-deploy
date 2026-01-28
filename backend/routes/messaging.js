const express = require('express')
const router = express.Router()
const AdminMessage = require('../models/AdminMessage')
const User = require('../models/User')
const UserActivity = require('../models/UserActivity')
const authMiddleware = require('../middleware/auth/authMiddleware')

// Send message to user
router.post('/send', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { toUserId, subject, message, type, relatedItemId } = req.body

    const adminMessage = new AdminMessage({
      fromAdmin: req.user._id,
      toUser: toUserId,
      subject,
      message,
      type: type || 'general',
      relatedItem: relatedItemId
    })

    await adminMessage.save()

    // Log activity
    await UserActivity.create({
      userId: req.user._id,
      action: 'send_message',
      details: {
        targetUserId: toUserId,
        metadata: { subject, type }
      }
    })

    res.json({ message: 'Message sent successfully' })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Get user messages (for users)
router.get('/inbox', authMiddleware, async (req, res) => {
  try {
    const messages = await AdminMessage.find({
      toUser: req.user._id
    })
    .populate('fromAdmin', 'name email')
    .populate('relatedItem', 'title')
    .sort({ createdAt: -1 })

    res.json(messages)
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// Mark message as read
router.post('/read/:messageId', authMiddleware, async (req, res) => {
  try {
    await AdminMessage.findOneAndUpdate(
      { _id: req.params.messageId, toUser: req.user._id },
      { isRead: true, readAt: new Date() }
    )

    res.json({ message: 'Message marked as read' })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ error: 'Failed to mark message as read' })
  }
})

// Get sent messages (for admins)
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const messages = await AdminMessage.find({
      fromAdmin: req.user._id
    })
    .populate('toUser', 'name email')
    .populate('relatedItem', 'title')
    .sort({ createdAt: -1 })

    res.json(messages)
  } catch (error) {
    console.error('Get sent messages error:', error)
    res.status(500).json({ error: 'Failed to fetch sent messages' })
  }
})

// Broadcast message to multiple users
router.post('/broadcast', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { userIds, subject, message, type } = req.body

    const messages = userIds.map(userId => ({
      fromAdmin: req.user._id,
      toUser: userId,
      subject,
      message,
      type: type || 'general'
    }))

    await AdminMessage.insertMany(messages)

    // Log activity
    await UserActivity.create({
      userId: req.user._id,
      action: 'broadcast_message',
      details: {
        metadata: { subject, type, recipientCount: userIds.length }
      }
    })

    res.json({ message: `Message sent to ${userIds.length} users` })
  } catch (error) {
    console.error('Broadcast message error:', error)
    res.status(500).json({ error: 'Failed to broadcast message' })
  }
})

module.exports = router