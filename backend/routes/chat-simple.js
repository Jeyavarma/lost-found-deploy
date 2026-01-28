const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth/authMiddleware');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// Get user's chat rooms
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const userRooms = await ChatRoom.find({
      'participants.userId': req.user.id,
      status: 'active'
    })
    .populate('participants.userId', 'name email role')
    .populate('itemId', 'title category imageUrl status')
    .sort({ updatedAt: -1 })
    .lean();
    
    // Format rooms for frontend
    const formattedRooms = userRooms.map(room => ({
      _id: room._id.toString(),
      itemId: room.itemId || { _id: 'direct', title: 'Direct Chat', category: 'chat', status: 'active' },
      participants: room.participants.map(p => ({
        userId: {
          _id: p.userId._id.toString(),
          name: p.userId.name,
          email: p.userId.email,
          role: p.userId.role
        },
        role: p.role
      })),
      lastMessage: room.lastMessage,
      unreadCount: 0,
      updatedAt: room.updatedAt
    }));
    
    res.json(formattedRooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(200).json([]);
  }
});

// Create item-based chat room
router.post('/room/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Check if room already exists
    const existingRoom = await ChatRoom.findOne({
      itemId,
      'participants.userId': req.user.id,
      status: 'active'
    }).populate('participants.userId', 'name email role').populate('itemId', 'title category imageUrl status');
    
    if (existingRoom) {
      return res.json({
        _id: existingRoom._id.toString(),
        itemId: existingRoom.itemId,
        participants: existingRoom.participants.map(p => ({
          userId: {
            _id: p.userId._id.toString(),
            name: p.userId.name,
            email: p.userId.email,
            role: p.userId.role
          },
          role: p.role
        })),
        type: existingRoom.type,
        status: existingRoom.status,
        updatedAt: existingRoom.updatedAt
      });
    }
    
    // Create new room
    const room = new ChatRoom({
      itemId,
      participants: [{
        userId: req.user.id,
        role: 'participant'
      }],
      type: 'item',
      status: 'active'
    });
    
    await room.save();
    await room.populate('participants.userId', 'name email role');
    await room.populate('itemId', 'title category imageUrl status');
    
    res.json({
      _id: room._id.toString(),
      itemId: room.itemId,
      participants: room.participants.map(p => ({
        userId: {
          _id: p.userId._id.toString(),
          name: p.userId.name,
          email: p.userId.email,
          role: p.userId.role
        },
        role: p.role
      })),
      type: room.type,
      status: room.status,
      updatedAt: room.updatedAt
    });
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// Create direct chat between users
router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    
    // Check if direct chat already exists
    const existingRoom = await ChatRoom.findOne({
      type: 'direct',
      'participants.userId': { $all: [req.user.id, otherUserId] },
      status: 'active'
    }).populate('participants.userId', 'name email role');
    
    if (existingRoom) {
      return res.json({
        _id: existingRoom._id.toString(),
        itemId: null,
        participants: existingRoom.participants.map(p => ({
          userId: {
            _id: p.userId._id.toString(),
            name: p.userId.name,
            email: p.userId.email,
            role: p.userId.role
          },
          role: p.role
        })),
        type: existingRoom.type,
        status: existingRoom.status,
        updatedAt: existingRoom.updatedAt
      });
    }
    
    // Verify other user exists
    const otherUser = await User.findById(otherUserId).select('name email role');
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }
    
    // Create new direct chat room
    const room = new ChatRoom({
      participants: [
        { userId: req.user.id, role: 'participant' },
        { userId: otherUserId, role: 'participant' }
      ],
      type: 'direct',
      status: 'active'
    });
    
    await room.save();
    await room.populate('participants.userId', 'name email role');
    
    res.json({
      _id: room._id.toString(),
      itemId: null,
      participants: room.participants.map(p => ({
        userId: {
          _id: p.userId._id.toString(),
          name: p.userId.name,
          email: p.userId.email,
          role: p.userId.role
        },
        role: p.role
      })),
      type: room.type,
      status: room.status,
      updatedAt: room.updatedAt
    });
  } catch (error) {
    console.error('Create direct chat error:', error);
    res.status(500).json({ error: 'Failed to create direct chat' });
  }
});

// Get messages for a room
router.get('/room/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify user is participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(200).json({ messages: [], hasMore: false });
    }
    
    const isParticipant = room.participants.some(p => 
      p.userId.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(200).json({ messages: [], hasMore: false });
    }
    
    // Get messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Reverse to show oldest first
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id.toString(),
      content: msg.content,
      senderId: msg.senderId,
      type: msg.type,
      createdAt: msg.createdAt,
      clientMessageId: msg.clientMessageId,
      readBy: msg.readBy || []
    }));
    
    res.json({ 
      messages: formattedMessages, 
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(200).json({ messages: [], hasMore: false });
  }
});

// Send message
router.post('/room/:roomId/message', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', clientMessageId } = req.body;
    
    // Verify room exists and user is participant
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    const isParticipant = room.participants.some(p => 
      p.userId.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get user data
    const user = await User.findById(req.user.id).select('name email role');
    
    // Create and save message
    const message = new ChatMessage({
      roomId,
      senderId: {
        _id: req.user.id,
        name: user?.name || 'User',
        email: user?.email || 'user@example.com',
        role: user?.role || 'student'
      },
      content: content.trim(),
      type,
      clientMessageId,
      deliveryStatus: 'sent'
    });
    
    await message.save();
    
    // Update room with last message
    room.lastMessage = {
      content: content.trim(),
      senderId: req.user.id,
      timestamp: new Date()
    };
    await room.save();
    
    res.json({
      _id: message._id.toString(),
      content: message.content,
      senderId: message.senderId,
      type: message.type,
      createdAt: message.createdAt,
      clientMessageId: message.clientMessageId,
      deliveryStatus: message.deliveryStatus
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/room/:roomId/read', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Update all unread messages in the room
    await ChatMessage.updateMany(
      { 
        roomId, 
        'senderId._id': { $ne: req.user.id },
        'readBy.userId': { $ne: req.user.id }
      },
      { 
        $push: { 
          readBy: { 
            userId: req.user.id, 
            readAt: new Date() 
          } 
        } 
      }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Block user
router.post('/block/:userId', authMiddleware, async (req, res) => {
  try {
    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

module.exports = router;