const express = require('express');
const jwt = require('jsonwebtoken');
const Item = require('../models/Item');
const User = require('../models/User');
const ItemTransaction = require('../models/ItemTransaction');
const UserActivity = require('../models/UserActivity');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/cloudinaryUpload');
const { trackActivity } = require('../middleware/activityTracker');
const config = require('../config/environment');
const router = express.Router();

// Text-based matching only - stable and effective
console.log('✅ Using text-based matching for item suggestions');

router.get('/', trackActivity('search'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const actualLimit = Math.min(parseInt(limit), 50); // Max 50 items per page
    const skip = (parseInt(page) - 1) * actualLimit;
    
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All Categories') filter.category = category;
    
    // Get total count for pagination
    const totalItems = await Item.countDocuments(filter);
    
    // Get paginated items
    const items = await Item.find(filter)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)
      .lean();
    
    res.json({
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / actualLimit),
        totalItems,
        itemsPerPage: actualLimit
      }
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const items = await Item.find()
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-items', auth, async (req, res) => {
  try {
    const items = await Item.find({ reportedBy: req.userId })
      .populate('reportedBy', 'name email')
      .populate('potentialMatches.itemId', 'title description imageUrl status reportedBy location createdAt')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get AI-based potential matches for user's items
router.get('/ai-matches', auth, async (req, res) => {
  try {
    // For now, return empty array since AI matching is not fully implemented
    // This prevents the dashboard from crashing
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/potential-matches', auth, async (req, res) => {
  try {
    // Get user's items to find potential matches
    const userItems = await Item.find({ reportedBy: req.userId });
    
    if (userItems.length === 0) {
      return res.json([]);
    }
    
    // Get all items from other users with opposite status
    const allItems = await Item.find({
      reportedBy: { $ne: req.userId },
      $or: [
        { status: 'found' },
        { status: 'lost' }
      ]
    }).populate('reportedBy', 'name email');
    
    // Smart matching algorithm
    const matches = [];
    
    userItems.forEach(userItem => {
      const oppositeStatus = userItem.status === 'lost' ? 'found' : 'lost';
      
      allItems.forEach(item => {
        if (item.status === oppositeStatus) {
          let score = 0;
          
          // 1. Category/Product name matching (40 points)
          if (userItem.category && item.category && 
              userItem.category.toLowerCase() === item.category.toLowerCase()) {
            score += 40;
          }
          
          // 2. Location matching (30 points)
          if (userItem.location && item.location) {
            const userLoc = userItem.location.toLowerCase();
            const itemLoc = item.location.toLowerCase();
            if (userLoc.includes(itemLoc) || itemLoc.includes(userLoc)) {
              score += 30;
            }
          }
          
          // 3. Color matching in title/description (20 points)
          const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink', 'purple', 'orange', 'gray', 'grey', 'silver', 'gold'];
          const userText = `${userItem.title} ${userItem.description}`.toLowerCase();
          const itemText = `${item.title} ${item.description}`.toLowerCase();
          
          colors.forEach(color => {
            if (userText.includes(color) && itemText.includes(color)) {
              score += 20;
            }
          });
          
          // 4. Brand matching (25 points)
          const brands = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'hp', 'dell', 'lenovo', 'canon', 'nikon'];
          brands.forEach(brand => {
            if (userText.includes(brand) && itemText.includes(brand)) {
              score += 25;
            }
          });
          
          // 5. Size matching (15 points)
          const sizes = ['small', 'medium', 'large', 'big', 'tiny', 'huge', 'mini'];
          sizes.forEach(size => {
            if (userText.includes(size) && itemText.includes(size)) {
              score += 15;
            }
          });
          
          // 6. Time proximity (10 points)
          const userDate = new Date(userItem.dateLostFound || userItem.createdAt);
          const itemDate = new Date(item.dateLostFound || item.createdAt);
          const daysDiff = Math.abs((userDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 7) score += 10; // Within a week
          else if (daysDiff <= 30) score += 5; // Within a month
          
          // 7. Material/Texture matching (10 points)
          const materials = ['leather', 'plastic', 'metal', 'fabric', 'wood', 'glass', 'rubber', 'cotton', 'silk', 'denim'];
          materials.forEach(material => {
            if (userText.includes(material) && itemText.includes(material)) {
              score += 10;
            }
          });
          
          // 8. Condition matching (5 points)
          const conditions = ['new', 'old', 'damaged', 'worn', 'broken', 'cracked', 'scratched', 'mint'];
          conditions.forEach(condition => {
            if (userText.includes(condition) && itemText.includes(condition)) {
              score += 5;
            }
          });
          
          // 9. Special features matching (15 points)
          const features = ['cracked screen', 'missing button', 'sticker', 'engraving', 'keychain', 'charm', 'case', 'cover'];
          features.forEach(feature => {
            if (userText.includes(feature) && itemText.includes(feature)) {
              score += 15;
            }
          });
          
          // 10. Value indicators (10 points)
          const values = ['expensive', 'cheap', 'valuable', 'priceless', 'costly', 'budget', 'premium'];
          values.forEach(value => {
            if (userText.includes(value) && itemText.includes(value)) {
              score += 10;
            }
          });
          
          // 11. Keyword matching (3 points)
          const userWords = userText.split(/\s+/).filter(word => word.length > 2);
          const itemWords = itemText.split(/\s+/).filter(word => word.length > 2);
          
          userWords.forEach(userWord => {
            itemWords.forEach(itemWord => {
              if (userWord === itemWord) {
                score += 3;
              }
            });
          });
          
          // Add to matches if score is above threshold
          if (score >= 10) {
            matches.push({ ...item.toObject(), matchScore: Math.min(score, 100) });
          }
        }
      });
    });
    
    // Remove duplicates and sort by score
    const uniqueMatches = matches.reduce((acc, current) => {
      const existing = acc.find(item => item._id.toString() === current._id.toString());
      if (!existing || current.matchScore > existing.matchScore) {
        return acc.filter(item => item._id.toString() !== current._id.toString()).concat(current);
      }
      return acc;
    }, []);
    
    // Sort by match score (highest first) and limit to 6
    const sortedMatches = uniqueMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
    
    res.json(sortedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const uploadFields = (req, res, next) => {
  console.log('📁 Upload middleware - Processing files...');
  
  const uploadHandler = upload.fields([
    { name: 'itemImage', maxCount: 1 },
    { name: 'locationImage', maxCount: 1 }
  ]);
  
  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('❌ Upload error:', err);
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('✅ Upload completed - Files:', req.files ? Object.keys(req.files) : 'None');
    next();
  });
};

// Optional auth middleware - sets user if token is valid, but doesn't block request
const optionalAuth = async (req, res, next) => {
  let token;
  
  console.log('🔍 OptionalAuth - Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token extracted, verifying...');
      
      const decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('✅ Token decoded, user ID:', decoded.userId || decoded.id);
      
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select('-password');
      
      if (user) {
        req.user = user;
        req.userId = userId;
        console.log('👤 User found and set:', user.name);
      } else {
        console.log('❌ User not found in database for ID:', userId);
      }
    } catch (error) {
      // Token invalid, but continue without auth
      console.log('❌ Token validation failed:', error.message);
    }
  }
  
  next();
};

router.post('/', uploadFields, optionalAuth, trackActivity('report_lost'), async (req, res) => {
  try {
    console.log('📝 POST /api/items - Request received');
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📁 Files:', req.files ? Object.keys(req.files) : 'None');
    
    const { contactName, contactEmail, contactPhone, date, time, status, ...otherFields } = req.body;
    
    // Input validation
    if (!status || !['lost', 'found'].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({ message: 'Valid status (lost/found) is required' });
    }
    
    if (!contactName || !contactEmail) {
      console.log('❌ Missing required fields - contactName:', !!contactName, 'contactEmail:', !!contactEmail);
      return res.status(400).json({ message: 'Contact name and email are required' });
    }
    
    // Use safer email validation - prevent ReDoS
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(contactEmail)) {
      console.log('❌ Invalid email format:', contactEmail);
      return res.status(400).json({ message: 'Valid email address is required' });
    }
    
    // Sanitize inputs - prevent XSS and NoSQL injection
    const sanitize = (str) => {
      if (typeof str !== 'string') return String(str);
      return str.replace(/[<>"'&${}]/g, '').trim();
    };
    const sanitizedData = {
      contactName: sanitize(contactName),
      contactEmail: sanitize(contactEmail),
      contactPhone: contactPhone ? sanitize(contactPhone) : undefined
    };
    
    console.log('📝 Item submission - Status:', status, 'User ID:', req.userId || 'None');
    
    // Business rule: Lost items require authentication, Found items can be anonymous
    if (status === 'lost' && !req.userId) {
      console.log('❌ Lost item submission blocked - no authentication');
      return res.status(401).json({ message: 'Authentication required to report lost items' });
    }
    
    // Ensure all required fields are present
    const requiredFields = ['title', 'description', 'category', 'location'];
    const missingFields = requiredFields.filter(field => !otherFields[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required item fields:', missingFields);
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields 
      });
    }
    
    const itemData = {
      ...otherFields,
      status,
      reportedBy: req.userId || null,
      contactInfo: `${sanitizedData.contactName} - ${sanitizedData.contactEmail}${sanitizedData.contactPhone ? ` - ${sanitizedData.contactPhone}` : ''}`,
      dateLostFound: date ? new Date(date) : undefined,
      timeLostFound: time || undefined,
      timeReported: new Date().toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true 
      })
    };
    
    if (req.files) {
      if (req.files.itemImage) {
        itemData.imageUrl = req.files.itemImage[0].path;
        console.log('📷 Item image uploaded:', itemData.imageUrl);
      }
      if (req.files.locationImage) {
        itemData.locationImageUrl = req.files.locationImage[0].path;
        console.log('📍 Location image uploaded:', itemData.locationImageUrl);
      }
    }
    
    console.log('💾 Creating item with data:', { ...itemData, imageUrl: itemData.imageUrl ? 'SET' : 'NONE' });
    
    const item = new Item(itemData);
    await item.save();
    
    console.log('✅ Item saved successfully with ID:', item._id);
    
    // Create transaction record
    if (req.userId) {
      const transaction = new ItemTransaction({
        itemId: item._id,
        lostReportedBy: req.userId,
        status: status,
        timeline: [{
          action: status === 'lost' ? 'reported_lost' : 'reported_found',
          userId: req.userId,
          notes: `Item ${status} reported`
        }]
      });
      await transaction.save();
    }
    
    // Handle AI features if provided
    if (req.body.imageFeatures) {
      item.imageFeatures = req.body.imageFeatures;
    }
    if (req.body.detectedObjects) {
      item.detectedObjects = req.body.detectedObjects;
    }
    if (req.body.aiCategory) {
      item.aiCategory = req.body.aiCategory;
    }
    await item.save();
    
    // Images stored for display only - matching uses text analysis
    console.log('ℹ️ Item saved with text-based matching enabled');
    
    await item.populate('reportedBy', 'name email');
    console.log('✅ Item submission completed successfully');
    res.status(201).json({ item });
  } catch (error) {
    console.error('❌ Item submission error:', error);
    console.error('Error stack:', error.stack);
    
    // Send more specific error message
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors: validationErrors });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = [
      'Deepwoods',
      'Moonshadow',
      'Octavia',
      'Barnes Hall Day',
      'Martin Hall Day',
      'Games Fury',
      'Founders Day',
      'Cultural Festival'
    ];
    
    const eventData = await Promise.all(
      events.map(async (eventName) => {
        // Check both event and culturalEvent fields for backward compatibility
        const items = await Item.find({ 
          $or: [
            { event: eventName },
            { culturalEvent: eventName }
          ]
        })
          .populate('reportedBy', 'name email')
          .sort({ createdAt: -1 });
        
        const lostCount = items.filter(item => item.status === 'lost').length;
        const foundCount = items.filter(item => item.status === 'found').length;
        
        return {
          name: eventName,
          totalItems: items.length,
          lostCount,
          foundCount,
          status: 'active',
          items
        };
      })
    );
    
    res.json(eventData.filter(event => event.totalItems > 0));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/events/:eventName', async (req, res) => {
  try {
    const { eventName } = req.params;
    const items = await Item.find({ 
      $or: [
        { event: eventName },
        { culturalEvent: eventName }
      ]
    })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    
    const lostItems = items.filter(item => item.status === 'lost');
    const foundItems = items.filter(item => item.status === 'found');
    
    res.json({
      eventName,
      totalItems: items.length,
      lostCount: lostItems.length,
      foundCount: foundItems.length,
      lostItems,
      foundItems,
      allItems: items
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', trackActivity('view_item'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('reportedBy', 'name email');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('reportedBy', 'name email');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if user owns this item
    if (item.reportedBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }
    
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim an item
router.post('/:id/claim', auth, trackActivity('claim_item'), async (req, res) => {
  try {
    const { ownershipProof, additionalInfo } = req.body;
    
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    if (item.status !== 'found') {
      return res.status(400).json({ message: 'Item is not available for claiming' });
    }
    
    if (item.claimedBy) {
      return res.status(400).json({ message: 'Item is already claimed' });
    }
    
    item.status = 'claimed';
    item.claimedBy = req.userId;
    item.claimDate = new Date();
    item.ownershipProof = ownershipProof;
    item.additionalClaimInfo = additionalInfo;
    item.verificationStatus = 'pending';
    
    await item.save();
    
    // Update transaction record
    let transaction = await ItemTransaction.findOne({ itemId: req.params.id });
    if (transaction) {
      transaction.claimedBy = req.userId;
      transaction.status = 'claimed';
      transaction.timeline.push({
        action: 'claimed',
        userId: req.userId,
        notes: 'Item claimed by user'
      });
      await transaction.save();
    }
    
    res.json({ message: 'Claim submitted successfully. Awaiting admin verification.', item });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;