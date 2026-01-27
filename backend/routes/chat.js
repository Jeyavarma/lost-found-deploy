const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth/authMiddleware');
const User = require('../models/User');

// Simple in-memory storage for quick testing
const chatRooms = new Map();
const messages = new Map();

// Get user's chat rooms
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const userRooms = Array.from(chatRooms.values())
      .filter(room => room.participants.some(p => p.userId._id === req.userId))
      .map(room => ({
        ...room,
        lastMessage: null,
        unreadCount: 0
      }));
    
    res.json(userRooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(200).json([]);
  }
});

// Create or get chat room for an item
router.post('/room/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Check if room already exists for this item
    const existingRoom = Array.from(chatRooms.values())
      .find(room => room.itemId === itemId && 
                   room.participants.some(p => p.userId._id === req.userId));
    
    if (existingRoom) {
      return res.json(existingRoom);
    }
    
    // Get item details
    const Item = require('../models/Item');
    const item = await Item.findById(itemId).populate('reportedBy', 'name email role');
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Don't allow user to chat with themselves
    if (item.reportedBy._id.toString() === req.userId) {
      return res.status(400).json({ error: 'Cannot start chat with yourself' });
    }
    
    const currentUser = await User.findById(req.userId).select('name email role');
    
    const roomId = `item_${itemId}_${req.user.id}_${Date.now()}`;
    
    const room = {
      _id: roomId,
      itemId: itemId,
      itemTitle: item.title,
      participants: [
        { 
          userId: { 
            _id: req.userId, 
            name: currentUser?.name || 'User', 
            email: currentUser?.email || 'user@example.com',
            role: currentUser?.role || 'student'
          }, 
          role: 'inquirer' 
        },
        { 
          userId: { 
            _id: item.reportedBy._id, 
            name: item.reportedBy.name, 
            email: item.reportedBy.email,
            role: item.reportedBy.role
          }, 
          role: 'owner' 
        }
      ],
      type: 'item',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    chatRooms.set(roomId, room);
    messages.set(roomId, []);
    
    res.json(room);
  } catch (error) {
    console.error('Create item chat error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// Create direct chat between users
router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    
    // Check if direct chat already exists
    const existingRoom = Array.from(chatRooms.values())
      .find(room => room.type === 'direct' && 
                   room.participants.some(p => p.userId._id === req.user.id) &&
                   room.participants.some(p => p.userId._id === otherUserId));
    
    if (existingRoom) {
      return res.json(existingRoom);
    }
    
    // Get both users' data
    const [currentUser, otherUser] = await Promise.all([
      User.findById(req.user.id).select('name email role'),
      User.findById(otherUserId).select('name email role')
    ]);
    
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }
    
    const roomId = `direct_${req.user.id}_${otherUserId}_${Date.now()}`;
    
    const room = {
      _id: roomId,
      itemId: null,
      participants: [
        { 
          userId: { 
            _id: req.user.id, 
            name: currentUser?.name || 'User', 
            email: currentUser?.email || 'user@example.com',
            role: currentUser?.role || 'student'
          }, 
          role: 'participant' 
        },
        { 
          userId: { 
            _id: otherUserId, 
            name: otherUser.name, 
            email: otherUser.email,
            role: otherUser.role
          }, 
          role: 'participant' 
        }
      ],
      type: 'direct',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    chatRooms.set(roomId, room);
    messages.set(roomId, []);
    
    res.json(room);
  } catch (error) {
    console.error('Create direct chat error:', error);
    res.status(500).json({ error: 'Failed to create direct chat' });
  }
});

// Get messages for a room
router.get('/room/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = chatRooms.get(roomId);
    if (!room) {
      return res.status(200).json({ messages: [], hasMore: false });
    }
    
    const isParticipant = room.participants.some(p => p.userId._id === req.userId);
    if (!isParticipant) {
      return res.status(200).json({ messages: [], hasMore: false });
    }
    
    const roomMessages = messages.get(roomId) || [];
    res.json({ messages: roomMessages, hasMore: false });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(200).json({ messages: [], hasMore: false });
  }
});

// Send message
router.post('/room/:roomId/message', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text' } = req.body;
    
    const room = chatRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    const isParticipant = room.participants.some(p => p.userId._id === req.userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await User.findById(req.userId).select('name email role');
    
    const message = {
      _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      senderId: { 
        _id: req.userId, 
        name: user?.name || 'User', 
        email: user?.email || 'user@example.com',
        role: user?.role || 'student'
      },
      content: content.trim(),
      type,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sent'
    };
    
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    
    messages.get(roomId).push(message);
    
    // Update room timestamp
    room.updatedAt = new Date().toISOString();
    room.lastMessage = {
      content: content.trim(),
      senderId: req.userId,
      timestamp: new Date().toISOString()
    };
    
    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;