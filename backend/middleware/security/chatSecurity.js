const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

// Rate limiting for chat messages
const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: { error: 'Too many messages sent, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// Rate limiting for chat room creation
const chatRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 room creations per 15 minutes
  message: { error: 'Too many chat rooms created, please wait' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// Check if user is blocked
const checkBlocked = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId) {
      // Check if current user is blocked by target user
      const isBlocked = await BlockedUser.findOne({
        userId: userId,
        blockedUserId: currentUserId
      });

      if (isBlocked) {
        return res.status(403).json({ error: 'You are blocked by this user' });
      }

      // Check if current user has blocked target user
      const hasBlocked = await BlockedUser.findOne({
        userId: currentUserId,
        blockedUserId: userId
      });

      if (hasBlocked) {
        return res.status(403).json({ error: 'You have blocked this user' });
      }
    }

    next();
  } catch (error) {
    console.error('Block check error:', error);
    res.status(500).json({ error: 'Failed to check block status' });
  }
};

// Validate message content
const validateMessage = (req, res, next) => {
  const { content, type } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
  }

  if (type && !['text', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Invalid message type' });
  }

  // Basic content filtering
  const bannedWords = ['spam', 'scam', 'fake', 'fraud'];
  const lowerContent = content.toLowerCase();
  
  if (bannedWords.some(word => lowerContent.includes(word))) {
    return res.status(400).json({ error: 'Message contains inappropriate content' });
  }

  // Sanitize content
  req.body.content = content.trim();
  next();
};

// Check user permissions for chat room
const checkRoomPermissions = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const ChatRoom = require('../models/ChatRoom');
    const room = await ChatRoom.findById(roomId).populate('participants.userId');

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(p => p.userId._id.toString() === userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    req.chatRoom = room;
    next();
  } catch (error) {
    console.error('Room permission check error:', error);
    res.status(500).json({ error: 'Failed to check room permissions' });
  }
};

// Prevent self-chat
const preventSelfChat = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    const userId = req.user.id;

    if (itemId) {
      const Item = require('../models/Item');
      const item = await Item.findById(itemId);

      if (item && item.reportedBy.toString() === userId) {
        return res.status(400).json({ error: 'Cannot start chat with yourself' });
      }
    }

    next();
  } catch (error) {
    console.error('Self-chat check error:', error);
    res.status(500).json({ error: 'Failed to validate chat request' });
  }
};

// Log chat activity for moderation
const logChatActivity = (action) => {
  return async (req, res, next) => {
    try {
      const ChatActivity = require('../models/ChatActivity');
      
      await ChatActivity.create({
        userId: req.user.id,
        action,
        roomId: req.params.roomId || req.body.roomId,
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Chat activity logging error:', error);
      // Don't block the request if logging fails
    }
    
    next();
  };
};

// Check if user account is in good standing
const checkAccountStanding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    if (user.accountLocked) {
      return res.status(423).json({ error: 'Account locked' });
    }

    next();
  } catch (error) {
    console.error('Account standing check error:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
};

module.exports = {
  chatMessageLimiter,
  chatRoomLimiter,
  checkBlocked,
  validateMessage,
  checkRoomPermissions,
  preventSelfChat,
  logChatActivity,
  checkAccountStanding
};