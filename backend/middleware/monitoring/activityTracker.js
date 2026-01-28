const UserActivity = require('../../models/UserActivity')

const trackActivity = (action) => {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json
    
    res.json = function(data) {
      // Only log activity on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Don't await to avoid blocking the response
        logActivity(req, action, data).catch(console.error)
      }
      return originalJson.call(this, data)
    }
    
    next()
  }
}

const logActivity = async (req, action, responseData) => {
  try {
    const details = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      metadata: {}
    }

    // Extract relevant data based on action type
    switch (action) {
      case 'report_lost':
      case 'report_found':
        if (responseData?.item?._id) {
          details.itemId = responseData.item._id
        }
        break
      
      case 'claim_item':
        if (req.params.id) {
          details.itemId = req.params.id
        }
        break
      
      case 'search':
        if (req.query.search) {
          details.searchQuery = req.query.search
        }
        break
      
      case 'view_item':
        if (req.params.id) {
          details.itemId = req.params.id
        }
        break
    }

    await UserActivity.create({
      userId: req.user._id,
      action,
      details
    })
  } catch (error) {
    console.error('Activity logging error:', error)
    // Don't throw error to avoid breaking the main request
  }
}

module.exports = { trackActivity }