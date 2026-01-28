const express = require('express')
const router = express.Router()
const Item = require('../models/Item')
const User = require('../models/User')
const UserActivity = require('../models/UserActivity')
const ItemTransaction = require('../models/ItemTransaction')
const LoginAttempt = require('../models/LoginAttempt')
const authMiddleware = require('../middleware/auth/authMiddleware')

// Advanced Analytics Dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Items trend over time
    const itemsTrend = await Item.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ])

    // Category analytics
    const categoryStats = await Item.aggregate([
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          lost: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
          found: { $sum: { $cond: [{ $eq: ["$status", "found"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["claimed", "verified"]] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: ["$total", 0] },
              { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ])

    // Location heatmap
    const locationStats = await Item.aggregate([
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
          lostCount: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
          foundCount: { $sum: { $cond: [{ $eq: ["$status", "found"] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ])

    // User activity stats
    const userActivityStats = await UserActivity.aggregate([
      {
        $match: { timestamp: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Department wise activity
    const departmentStats = await User.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: 'reportedBy',
          as: 'reportedItems'
        }
      },
      {
        $group: {
          _id: "$department",
          userCount: { $sum: 1 },
          itemsReported: { $sum: { $size: "$reportedItems" } }
        }
      },
      { $sort: { itemsReported: -1 } }
    ])

    // Resolution time analytics
    const resolutionStats = await ItemTransaction.aggregate([
      {
        $match: { 
          isResolved: true,
          resolutionTime: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: "$resolutionTime" },
          minResolutionTime: { $min: "$resolutionTime" },
          maxResolutionTime: { $max: "$resolutionTime" },
          totalResolved: { $sum: 1 }
        }
      }
    ])

    res.json({
      itemsTrend,
      categoryStats,
      locationStats,
      userActivityStats,
      departmentStats,
      resolutionStats: resolutionStats[0] || {
        avgResolutionTime: 0,
        minResolutionTime: 0,
        maxResolutionTime: 0,
        totalResolved: 0
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
})

// Export reports
router.get('/export/:type', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { type } = req.params
    const { startDate, endDate } = req.query

    let data = []
    let filename = ''

    switch (type) {
      case 'items':
        data = await Item.find({
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).populate('reportedBy', 'name email department')
        filename = 'items_report.json'
        break

      case 'users':
        data = await User.find({
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).select('-password')
        filename = 'users_report.json'
        break

      case 'activities':
        data = await UserActivity.find({
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).populate('userId', 'name email')
        filename = 'activities_report.json'
        break

      default:
        return res.status(400).json({ error: 'Invalid report type' })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    res.json(data)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
})

module.exports = router