const express = require('express')
const router = express.Router()
const Item = require('../models/Item')
const User = require('../models/User')
const UserActivity = require('../models/UserActivity')
const authMiddleware = require('../middleware/auth/authMiddleware')

// Content moderation queue
router.get('/queue', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Items flagged for review
    const flaggedItems = await Item.find({
      $or: [
        { flagged: true },
        { approved: false },
        { 
          description: { 
            $regex: /(spam|fake|test|dummy|inappropriate)/i 
          }
        }
      ]
    }).populate('reportedBy', 'name email')

    // Suspicious user activities
    const suspiciousActivities = await UserActivity.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$userId",
          actionCount: { $sum: 1 },
          actions: { $push: "$action" }
        }
      },
      {
        $match: { actionCount: { $gt: 50 } }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ])

    res.json({
      flaggedItems,
      suspiciousActivities
    })
  } catch (error) {
    console.error('Moderation queue error:', error)
    res.status(500).json({ error: 'Failed to fetch moderation queue' })
  }
})

// Flag/unflag item
router.post('/flag-item/:itemId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { itemId } = req.params
    const { flagged, reason } = req.body

    await Item.findByIdAndUpdate(itemId, {
      flagged,
      flagReason: reason,
      flaggedBy: req.user._id,
      flaggedAt: flagged ? new Date() : null
    })

    // Log activity
    await UserActivity.create({
      userId: req.user._id,
      action: flagged ? 'flag_item' : 'unflag_item',
      details: {
        itemId,
        metadata: { reason }
      }
    })

    res.json({ message: `Item ${flagged ? 'flagged' : 'unflagged'} successfully` })
  } catch (error) {
    console.error('Flag item error:', error)
    res.status(500).json({ error: 'Failed to update item flag status' })
  }
})

// Approve/reject item
router.post('/approve-item/:itemId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { itemId } = req.params
    const { approved, notes } = req.body

    await Item.findByIdAndUpdate(itemId, {
      approved,
      moderationNotes: notes,
      moderatedBy: req.user._id,
      moderatedAt: new Date()
    })

    // Log activity
    await UserActivity.create({
      userId: req.user._id,
      action: approved ? 'approve_item' : 'reject_item',
      details: {
        itemId,
        metadata: { notes }
      }
    })

    res.json({ message: `Item ${approved ? 'approved' : 'rejected'} successfully` })
  } catch (error) {
    console.error('Approve item error:', error)
    res.status(500).json({ error: 'Failed to update item approval status' })
  }
})

module.exports = router