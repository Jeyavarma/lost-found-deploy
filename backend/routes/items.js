const express = require('express');
const jwt = require('jsonwebtoken');
const Item = require('../models/Item');
const User = require('../models/User');
const ItemTransaction = require('../models/ItemTransaction');
const UserActivity = require('../models/UserActivity');
const auth = require('../middleware/auth/authMiddleware');
const { upload, uploadToCloudinary } = require('../middleware/cloudinaryUpload');
const { trackActivity } = require('../middleware/monitoring/activityTracker');
const config = require('../config/environment');
const { getCache, setCache, clearCache } = require('../config/redis-replacement');
const MatchingService = require('../services/matchingService');
const { generateEmbedding, isConfigured } = require('../utils/openai');
const { sendEmail } = require('../config/email');
const pushService = require('../services/pushService');
const router = express.Router();

// Helper to scrub PII for anonymous reports
const anonymizeItem = (itemObj, req) => {
  if (!itemObj.isAnonymous) return itemObj;

  // If the user is the reporter or an admin, they can see the original info
  const isReporter = req.userId && itemObj.reportedBy && (
    itemObj.reportedBy._id?.toString() === req.userId ||
    itemObj.reportedBy.toString() === req.userId
  );
  const isAdmin = req.user?.role === 'admin';

  if (isReporter || isAdmin) return itemObj;

  // Scrub PII
  if (itemObj.reportedBy && typeof itemObj.reportedBy === 'object') {
    itemObj.reportedBy = { ...itemObj.reportedBy, name: 'Anonymous Student', email: '', phone: '' };
  }
  itemObj.contactName = 'Anonymous Student';
  itemObj.contactEmail = '';
  itemObj.contactPhone = '';
  itemObj.contactInfo = 'Anonymous Student';

  return itemObj;
};

// Text-based matching only - stable and effective
console.log('✅ Using text-based matching for item suggestions');

router.get('/', trackActivity('search'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query;
    const actualLimit = Math.min(parseInt(limit), 50);
    const skip = (parseInt(page) - 1) * actualLimit;

    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All Categories') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Check cache first
    const cacheKey = `items:${page}:${actualLimit}:${status || 'all'}:${category || 'all'}:${search || 'none'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Parallel queries for better performance
    const [totalItems, items] = await Promise.all([
      Item.countDocuments(filter),
      Item.find(filter)
        .populate('reportedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(actualLimit)
        .lean()
        .select('title category location status imageUrl createdAt reportedBy')
    ]);

    const scrubbedItems = items.map(item => anonymizeItem(item, req));

    const result = {
      items: scrubbedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / actualLimit),
        totalItems,
        itemsPerPage: actualLimit
      }
    };

    // Cache for 2 minutes
    await setCache(cacheKey, result, 120);
    res.json(result);
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

    const scrubbedItems = items.map(item => anonymizeItem(item, req));
    res.json(scrubbedItems);
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
    // Check cache first
    const cached = await getCache(`ai_matches:${req.userId}`);
    if (cached) {
      return res.json(cached);
    }

    const matches = await MatchingService.computeMatches(req.userId);
    const formattedMatches = matches.map(m => {
      const scrubbed = anonymizeItem(m, req);
      return {
        userItem: scrubbed.matchedUserItem || { _id: 'unknown', title: 'Your Item', status: 'unknown' },
        matchedItem: scrubbed,
        confidence: scrubbed.matchScore >= 80 ? 'High' : scrubbed.matchScore >= 50 ? 'Medium' : 'Low',
        similarity: scrubbed.matchScore,
        matchedAt: scrubbed.createdAt || new Date(),
        viewed: false
      };
    });
    await setCache(`ai_matches:${req.userId}`, formattedMatches, 600);
    res.json(formattedMatches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/potential-matches', auth, async (req, res) => {
  try {
    // Check cache first
    const cached = await getCache(`matches:${req.userId}`);
    if (cached) {
      return res.json(cached);
    }

    // Compute matches in background service
    const matches = await MatchingService.computeMatches(req.userId);
    const scrubbedMatches = matches.map(m => anonymizeItem(m, req));
    res.json(scrubbedMatches);
  } catch (error) {
    console.error('Error fetching potential matches:', error);
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

router.post('/', uploadFields, uploadToCloudinary, optionalAuth, trackActivity('report_lost'), async (req, res) => {
  try {
    console.log('📝 POST /api/items - Request received');
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📁 Files:', req.files ? Object.keys(req.files) : 'None');

    const { contactName, contactEmail, contactPhone, date, time, status, isImageHidden, verificationQuestions, ...otherFields } = req.body;

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

    // FEATURE: Pre-Emptive Duplicate Prevention
    if (req.userId && req.body.bypassDuplicate !== 'true' && req.body.bypassDuplicate !== true) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentSimilarItems = await Item.find({
        reportedBy: req.userId,
        status,
        category: otherFields.category,
        createdAt: { $gte: twoHoursAgo }
      });

      const isDuplicate = recentSimilarItems.some(existingItem => {
        if (existingItem.title.toLowerCase() === otherFields.title.toLowerCase()) return true;

        const newWords = new Set(otherFields.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const oldWords = new Set(existingItem.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        let matchCount = 0;
        newWords.forEach(w => { if (oldWords.has(w)) matchCount++; });

        return matchCount >= 2 || (matchCount >= 1 && newWords.size <= 2);
      });

      if (isDuplicate) {
        console.log('⚠️ Duplicate item submission detected for user', req.userId);
        return res.status(409).json({
          message: 'It looks like you recently reported a very similar item. Are you sure you want to add this one as well?',
          isDuplicateWarning: true
        });
      }
    }

    let parsedQuestions = [];
    try {
      if (verificationQuestions) {
        parsedQuestions = JSON.parse(verificationQuestions);
      }
    } catch (e) {
      console.error('Failed to parse verificationQuestions', e);
    }

    const itemData = {
      ...otherFields,
      status,
      reportedBy: req.userId || null,
      contactInfo: `${sanitizedData.contactName} - ${sanitizedData.contactEmail}${sanitizedData.contactPhone ? ` - ${sanitizedData.contactPhone}` : ''}`,
      contactName: sanitizedData.contactName,
      contactEmail: sanitizedData.contactEmail,
      contactPhone: sanitizedData.contactPhone,
      dateLostFound: date ? new Date(date) : undefined,
      timeLostFound: time || undefined,
      isImageHidden: isImageHidden === 'true' || isImageHidden === true,
      isAnonymous: req.body.isAnonymous === 'true' || req.body.isAnonymous === true,
      priority: req.body.priority || 'normal',
      verificationQuestions: parsedQuestions,
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

    // AI Semantic Embeddings (Level 2 Match)
    if (isConfigured()) {
      try {
        const textToEmbed = `${itemData.title} ${itemData.description} ${itemData.category} ${itemData.location}`;
        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
          itemData.embedding = embedding;
          console.log('🧠 Successfully generated and attached OpenAI Vector Embedding');
        }
      } catch (embedError) {
        console.error('⚠️ Failed to generate OpenAI embedding. Skipping.', embedError.message);
        // Continue creation without embedding (it will fall back to Level 1 Text Search later)
      }
    }

    const item = new Item(itemData);
    await item.save();

    // Clear cache so the newly added item shows up immediately on Browse page
    await clearCache();

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

    // --- Proactive Matching Notification (non-blocking) ---
    // Run this after response is sent so it doesn't slow down the user
    setImmediate(async () => {
      try {
        if (item.status === 'found') {
          // Find recent 'lost' items with similar title/description/category
          const searchWords = item.title.split(/\s+/).filter(w => w.length > 3);
          if (searchWords.length === 0) return;

          const keywordQuery = searchWords.map(w => ({
            $or: [
              { title: { $regex: w, $options: 'i' } },
              { description: { $regex: w, $options: 'i' } }
            ]
          }));

          const potentialLostItems = await Item.find({
            status: 'lost',
            _id: { $ne: item._id },
            $and: keywordQuery.slice(0, 3),
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          })
            .populate('reportedBy', 'name email')
            .limit(5)
            .lean();

          for (const lostItem of potentialLostItems) {
            if (lostItem.reportedBy && lostItem.reportedBy.email && lostItem.contactEmail) {
              const emailTo = lostItem.contactEmail || lostItem.reportedBy.email;
              const subject = `Good news! Someone may have found your ${lostItem.title}`;
              const text = `Hi ${lostItem.contactName || lostItem.reportedBy.name},\n\nGood news! A newly submitted found item closely matches your lost item "${lostItem.title}".\n\nFound Item: ${item.title}\nLocation: ${item.location}\n\nLog in to the MCC Lost & Found portal to view the item and start a chat with the finder.\n\nhttps://lost-found-mcc.vercel.app/items/${item._id}\n\n— MCC Lost & Found System`;
              const html = `<div style="font-family:sans-serif;max-width:600px;margin:auto;"><h2 style="color:#b91c1c;">🎉 Good News!</h2><p>Hi <strong>${lostItem.contactName || lostItem.reportedBy.name}</strong>,</p><p>A newly submitted Found Item closely matches your lost item <strong>"${lostItem.title}"</strong>.</p><table style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;width:100%;"><tr><td><strong>Found Item:</strong></td><td>${item.title}</td></tr><tr><td><strong>Location:</strong></td><td>${item.location}</td></tr></table><br><a href="https://lost-found-mcc.vercel.app/items/${item._id}" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">View Item & Start Chat</a><br><br><p style="color:#9ca3af;font-size:12px;">— MCC Lost & Found Automated System</p></div>`;
              await sendEmail(emailTo, subject, text, html);

              // Add push notification
              try {
                const userObj = await User.findById(lostItem.reportedBy._id || lostItem.reportedBy).select('pushSubscription');
                if (userObj && userObj.pushSubscription) {
                  await pushService.sendNotification(userObj.pushSubscription, {
                    title: 'Possible Match Found!',
                    body: `A new found item might be your ${lostItem.title}`,
                    url: `/items/${item._id}`
                  });
                }
              } catch (e) {
                console.error('Push error for match:', e);
              }
            }
          }
          if (potentialLostItems.length > 0) {
            console.log(`📧 Sent match notifications for ${potentialLostItems.length} potential matches for found item: ${item.title}`);
          }
        }
      } catch (notifError) {
        console.error('Error sending proactive match notifications:', notifError);
      }
    });
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
          items: items.map(item => anonymizeItem(item.toObject ? item.toObject() : item, req))
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

    const lostItems = items.filter(item => item.status === 'lost').map(item => anonymizeItem(item.toObject ? item.toObject() : item, req));
    const foundItems = items.filter(item => item.status === 'found').map(item => anonymizeItem(item.toObject ? item.toObject() : item, req));
    const allScrubbed = items.map(item => anonymizeItem(item.toObject ? item.toObject() : item, req));

    res.json({
      eventName,
      totalItems: items.length,
      lostCount: lostItems.length,
      foundCount: foundItems.length,
      lostItems,
      foundItems,
      allItems: allScrubbed
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

    // Check if user is requesting this and if they are the receiver
    const authHeader = req.headers.authorization;
    let isReceiver = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId && item.returnedToId && decoded.userId === item.returnedToId.toString()) {
          isReceiver = true;
        }
      } catch (e) {
        // Ignore token errors for public view
      }
    }

    const itemObj = item.toObject();
    if (!isReceiver) {
      delete itemObj.handoverOTP;
    }

    res.json(itemObj);
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
    await clearCache();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark an item as returned
router.put('/:id/return', auth, trackActivity('return_item'), async (req, res) => {
  try {
    // Note: use 'req.user' if available, otherwise fetch user to check role
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Determine role (in case optionalAuth or no req.user)
    const isAdmin = req.user?.role === 'admin';

    if (item.reportedBy && item.reportedBy.toString() !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to mark this item as returned' });
    }

    item.returnedAt = new Date();

    if (req.body.returnedToId) {
      item.returnedToId = req.body.returnedToId;
      item.returnProcessStatus = 'pending_confirmation';
    } else if (req.body.returnedToEmail) {
      const emailUser = await User.findOne({ email: req.body.returnedToEmail.toLowerCase().trim() });
      if (emailUser) {
        item.returnedToId = emailUser._id;
        item.returnProcessStatus = 'pending_confirmation';
      } else {
        // If email not found, just mark resolved directly (or return error - but let's be forgiving)
        item.status = 'resolved';
        item.returnProcessStatus = 'confirmed';
      }
    } else {
      item.status = 'resolved';
      item.returnProcessStatus = 'confirmed';
    }

    if (req.body.returnedToName) {
      item.returnedToName = req.body.returnedToName;
    }

    // Generate Handover OTP if returning to someone
    if (item.returnProcessStatus === 'pending_confirmation') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      item.handoverOTP = otp;

      const recipientId = item.returnedToId;
      const recipientUser = await User.findById(recipientId);
      const recipientEmail = req.body.returnedToEmail || recipientUser?.email;

      if (recipientEmail) {
        sendEmail(
          recipientEmail,
          'Your Secure Handover OTP - MCC Lost & Found',
          `Someone has found your item: "${item.title}" and is ready to return it to you.\n\nYour secure Handover OTP is: ${otp}\n\nPlease provide this OTP to the person returning your item when you meet them physically. This ensures the item is given to the rightful owner.\n\nThank you for using MCC Lost & Found!`
        ).catch(err => console.error("Failed to send Handover OTP email", err));
      }

      if (recipientUser && recipientUser.pushSubscription) {
        pushService.sendNotification(recipientUser.pushSubscription, {
          title: 'Handover OTP Generated',
          body: `Your OTP to receive ${item.title} is ${otp}`,
          url: `/items/${item._id}`
        }).catch(err => console.error('Push error for OTP:', err));
      }
    }

    await item.save();
    await clearCache();

    const updatedItem = await Item.findById(req.params.id).populate('reportedBy', 'name email');
    res.json({ message: item.returnProcessStatus === 'pending_confirmation' ? 'Return initiated, waiting for confirmation via OTP' : 'Item marked as returned successfully', item: updatedItem });
  } catch (error) {
    console.error('Error marking item as returned:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify Handover OTP to confirm return (called by the finder/reporter)
router.post('/:id/verify-handover', auth, trackActivity('verify_handover'), async (req, res) => {
  try {
    const { otp } = req.body;
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.reportedBy?.toString() !== req.userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only the finder/reporter can verify the handover OTP.' });
    }

    if (item.returnProcessStatus !== 'pending_confirmation') {
      return res.status(400).json({ message: 'Item is not in pending confirmation state.' });
    }

    if (!item.handoverOTP || item.handoverOTP !== otp) {
      return res.status(400).json({ message: 'Invalid or missing OTP. Please ask the receiver for their Handover OTP.' });
    }

    item.returnProcessStatus = 'confirmed';
    item.status = 'resolved';
    item.handoverOTP = undefined; // Clear it for security
    await item.save();
    await clearCache();

    // Create a transaction log
    const transaction = new ItemTransaction({
      itemId: item._id,
      status: 'resolved',
      timeline: [{
        action: 'handover_verified',
        userId: req.userId,
        notes: 'Handover OTP successfully verified by Finder'
      }]
    });
    await transaction.save();

    res.json({ message: 'Handover verified and item successfully returned!', item });
  } catch (error) {
    console.error('Error verifying handover OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm an item return (called by the second party directly)
router.put('/:id/confirm-return', auth, trackActivity('confirm_return'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.returnedToId?.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to confirm this return' });
    }

    item.returnProcessStatus = 'confirmed';
    item.status = 'resolved';
    await item.save();
    await clearCache();

    // Create a transaction log
    const transaction = new ItemTransaction({
      itemId: item._id,
      status: 'resolved',
      timeline: [{
        action: 'return_confirmed',
        userId: req.userId,
        notes: 'Handover receipt confirmed by recipient'
      }]
    });
    await transaction.save();

    res.json({ message: 'Receipt confirmed successfully', item });
  } catch (error) {
    console.error('Error confirming return:', error);
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
    await clearCache();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim an item
router.post('/:id/claim', auth, trackActivity('claim_item'), async (req, res) => {
  try {
    const { ownershipProof, additionalInfo, verificationAnswers } = req.body;

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

    if (item.isImageHidden && item.verificationQuestions && item.verificationQuestions.length > 0) {
      if (!verificationAnswers || verificationAnswers.length !== item.verificationQuestions.length) {
        return res.status(400).json({ message: 'You must answer all verification questions to claim this protected item.' });
      }

      item.claimAnswers.push({
        userId: req.userId,
        answers: verificationAnswers,
        status: 'pending'
      });
    }

    item.status = 'claimed';
    item.claimedBy = req.userId;
    item.claimDate = new Date();
    item.ownershipProof = ownershipProof || '';
    item.additionalClaimInfo = additionalInfo || '';
    item.verificationStatus = 'pending';

    await item.save();
    await clearCache();

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