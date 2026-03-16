const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth/authMiddleware');
const User = require('../models/User');
const Item = require('../models/Item');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
// Dual-provider upload service: Cloudinary primary, Firebase fallback
const { uploadChatImage } = require('../utils/uploadService');
const { sendEmail } = require('../config/email');
const { connectedUsers } = require('../socket/chatHandler');

// ─── Multer: store file in memory before uploading to Cloudinary ───────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap for chat images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ─── Helper: check if user is a participant in a room ─────────────────────────
const isParticipant = (room, userId) =>
  room.participants.some(p => p.userId.toString() === userId);

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 9 — Image Upload API (Cloudinary + Firebase fallback)
// POST /api/chat/upload
// Accepts: multipart/form-data, field name "image", optional body field "roomId"
// Returns: { url, provider }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // roomId is optional — used for Cloudinary/Firebase sub-folder organisation.
    // Falls back to 'general' when uploading before a room exists.
    const roomId = req.body.roomId || 'general';

    // Attempt Cloudinary; auto-fallback to Firebase inside uploadChatImage
    const { url, provider } = await uploadChatImage(req.file, roomId);

    res.json({ url, provider });
  } catch (error) {
    console.error('Chat image upload error (both providers failed):', error);
    res.status(500).json({ error: 'Image upload failed. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Get user's chat rooms
// GET /api/chat/rooms
// ══════════════════════════════════════════════════════════════════════════════
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      'participants.userId': req.userId,
      status: { $in: ['active'] }
    })
      .populate('itemId', 'title category imageUrl status')
      .populate('participants.userId', 'name email role')
      .sort({ updatedAt: -1 });

    const formattedRooms = await Promise.all(rooms.map(async (room) => {
      const unreadCount = await ChatMessage.countDocuments({
        roomId: room._id,
        'senderId._id': { $ne: req.userId },
        'readBy.userId': { $ne: req.userId }
      });

      return {
        _id: room._id,
        itemId: room.itemId,
        participants: room.participants,
        type: room.type,
        status: room.status,
        lastMessage: room.lastMessage,
        updatedAt: room.updatedAt,
        unreadCount
      };
    }));

    res.json(formattedRooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(200).json([]);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 15 — System Suggestion on Room Creation
// POST /api/chat/room/:itemId
// Creates a chat room (or returns existing) and injects a system message
// advising users to verify ownership details.
// ══════════════════════════════════════════════════════════════════════════════
router.post('/room/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;

    // FEATURE 18 — Duplicate prevention: return existing room if it exists
    let room = await ChatRoom.findOne({
      itemId,
      'participants.userId': req.userId,
      type: 'item'
    })
      .populate('itemId', 'title category imageUrl status')
      .populate('participants.userId', 'name email role');

    if (room) return res.json(room);

    // Get item and its owner
    const item = await Item.findById(itemId).populate('reportedBy', 'name email role');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.reportedBy._id.toString() === req.userId) {
      return res.status(400).json({ error: 'Cannot start a chat with yourself' });
    }

    // FEATURE 2 — Access control: only item participants can join
    room = new ChatRoom({
      itemId,
      type: 'item',
      participants: [
        { userId: req.userId, role: 'participant' },
        { userId: item.reportedBy._id, role: 'owner' }
      ]
    });
    await room.save();

    // FEATURE 15 — Inject AI verification suggestion as a system message
    const suggestionMsg = new ChatMessage({
      roomId: room._id.toString(),
      senderId: {
        _id: item.reportedBy._id,
        name: 'System',
        email: 'system@lost-found',
        role: 'system'
      },
      content:
        '🛡️ Ownership Verification Tip: Ask about unique marks, scratches, serial numbers, or other identifying features to confirm this item belongs to you before arranging a handover.',
      type: 'system',
      deliveryStatus: 'delivered'
    });
    await suggestionMsg.save();

    room = await ChatRoom.findById(room._id)
      .populate('itemId', 'title category imageUrl status')
      .populate('participants.userId', 'name email role');

    res.json(room);
  } catch (error) {
    console.error('Create item chat error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// Create direct chat between two users
// POST /api/chat/direct
router.post('/direct', authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (otherUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    let room = await ChatRoom.findOne({
      type: 'direct',
      $and: [
        { 'participants.userId': req.userId },
        { 'participants.userId': otherUserId }
      ]
    }).populate('participants.userId', 'name email role');

    if (room) return res.json(room);

    const otherUser = await User.findById(otherUserId).select('name email role');
    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    room = new ChatRoom({
      type: 'direct',
      participants: [
        { userId: req.userId, role: 'participant' },
        { userId: otherUserId, role: 'participant' }
      ]
    });
    await room.save();

    room = await ChatRoom.findById(room._id).populate('participants.userId', 'name email role');
    res.json(room);
  } catch (error) {
    console.error('Create direct chat error:', error);
    res.status(500).json({ error: 'Failed to create direct chat' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 17 — Paginated message history
// GET /api/chat/room/:roomId/messages?page=1&limit=30
// Returns messages newest-first (for infinite scroll), reversed for display
// ══════════════════════════════════════════════════════════════════════════════
router.get('/room/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const skip = (page - 1) * limit;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(200).json({ messages: [], hasMore: false });

    if (!isParticipant(room, req.userId)) {
      return res.status(200).json({ messages: [], hasMore: false });
    }

    const total = await ChatMessage.countDocuments({ roomId });
    // Fetch in descending order (newest first) then reverse so UI gets chronological order
    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      messages: messages.reverse(), // UI expects oldest → newest
      hasMore: skip + limit < total,
      page,
      total
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(200).json({ messages: [], hasMore: false });
  }
});

// Send a text/image message via HTTP (fallback when socket is unavailable)
// POST /api/chat/room/:roomId/message
router.post('/room/:roomId/message', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', clientMessageId } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Chat room not found' });
    if (!isParticipant(room, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // FEATURE 12 — Guard: reject messages in closed/blocked rooms
    if (room.status !== 'active') {
      return res.status(403).json({ error: 'This chat room is closed' });
    }

    const user = await User.findById(req.userId).select('name email role');
    const message = new ChatMessage({
      roomId,
      senderId: {
        _id: req.userId,
        name: user?.name || 'User',
        email: user?.email || '',
        role: user?.role || 'student'
      },
      content: content.trim(),
      type,
      clientMessageId,
      deliveryStatus: 'sent'
    });
    await message.save();

    room.updatedAt = new Date();
    room.lastMessage = { content: content.trim(), senderId: req.userId, timestamp: message.createdAt };
    await room.save();

    res.json(message);

    // --- Offline Notification for HTTP Fallback ---
    setImmediate(async () => {
      try {
        for (const participant of room.participants) {
          const participantId = participant.userId.toString();
          if (participantId === req.userId) continue;

          // Check if they are currently connected in sockets
          const isConnected = connectedUsers && connectedUsers.has(participantId);

          if (!isConnected) {
            const recipientUser = await User.findById(participantId).select('name email').lean();
            if (recipientUser && recipientUser.email) {
              const senderName = user?.name || 'A user';

              // Load itemId for title
              await room.populate('itemId', 'title');
              const itemTitle = room.itemId ? room.itemId.title : 'an item';

              const subject = `New message about: ${itemTitle}`;
              const text = `Hi ${recipientUser.name},\n\n${senderName} sent you a message about "${itemTitle}" in the MCC Lost & Found portal.\n\nMessage preview: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"\n\nLog in to reply:\n${process.env.FRONTEND_URL || 'https://lost-found-mcc.vercel.app'}/dashboard\n\n— MCC Lost & Found`;
              const html = `<div style="font-family:sans-serif;max-width:600px;margin:auto;"><h3 style="color:#1d4ed8;">💬 You have a new message</h3><p>Hi <strong>${recipientUser.name}</strong>,</p><p><strong>${senderName}</strong> sent you a message about <em>"${itemTitle}"</em>.</p><blockquote style="background:#f3f4f6;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;color:#374151;">${content.trim().substring(0, 180)}${content.length > 180 ? '...' : ''}</blockquote><a href="${process.env.FRONTEND_URL || 'https://lost-found-mcc.vercel.app'}/dashboard" style="background:#1d4ed8;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Reply in App</a><br><br><p style="color:#9ca3af;font-size:12px;">— MCC Lost &amp; Found Automated System</p></div>`;
              await sendEmail(recipientUser.email, subject, text, html);
              console.log(`📧 Offline notification sent to ${recipientUser.email} (HTTP fallback)`);
            }
          }
        }
      } catch (notifErr) {
        console.error('Error sending offline chat notification in HTTP route:', notifErr);
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 21 — Edit a message (sender only, text messages only)
// PATCH /api/chat/message/:messageId
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    if (message.type !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited' });
    }

    message.content = content.trim();
    message.editedAt = new Date(); // mark edited timestamp
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 21 — Soft-delete a message (sender only)
// DELETE /api/chat/message/:messageId
// Replaces content with a tombstone so it stays visible in history
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft-delete: keep record but replace content so chat history stays intact
    message.content = '🚫 This message was deleted.';
    message.type = 'system';
    message.deletedAt = new Date();
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 11 — Block a user
// POST /api/chat/block/:userId
// Archives all shared active chat rooms between the two users
// ══════════════════════════════════════════════════════════════════════════════
router.post('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Find and close all shared active rooms
    const result = await ChatRoom.updateMany(
      {
        $and: [
          { 'participants.userId': req.userId },
          { 'participants.userId': targetUserId }
        ],
        status: 'active'
      },
      { $set: { status: 'blocked' } }
    );

    res.json({
      success: true,
      message: 'User blocked and shared chat rooms closed.',
      roomsClosed: result.modifiedCount
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 22 — Report a chat room for safety moderation
// POST /api/chat/report/:roomId
// Body: { reason: string }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/report/:roomId', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason is required' });

    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isParticipant(room, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Store report as a system message in the room for admin visibility
    const reportMsg = new ChatMessage({
      roomId: req.params.roomId,
      senderId: { _id: req.userId, name: 'System', email: 'system@lost-found', role: 'system' },
      content: `⚠️ Chat reported by a participant. Reason: ${reason.trim()}`,
      type: 'system',
      deliveryStatus: 'delivered'
    });
    await reportMsg.save();

    // Tag the room for admin moderation review
    if (!room.reportedAt) {
      room.reportedAt = new Date();
      room.reportReason = reason.trim();
      await room.save();
    }

    res.json({ success: true, message: 'Report submitted. Our team will review this chat.' });
  } catch (error) {
    console.error('Report chat error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Archive a specific room (manual)
// POST /api/chat/room/:roomId/archive
router.post('/room/:roomId/archive', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isParticipant(room, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    room.status = 'archived';
    await room.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to archive room' });
  }
});

// Delete a chat room (admin or participant)
// DELETE /api/chat/room/:roomId
router.delete('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isParticipant(room, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await ChatMessage.deleteMany({ roomId: req.params.roomId });
    await ChatRoom.findByIdAndDelete(req.params.roomId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Mark all messages in room as read
// POST /api/chat/room/:roomId/read
router.post('/room/:roomId/read', authMiddleware, async (req, res) => {
  try {
    await ChatMessage.updateMany(
      { roomId: req.params.roomId, 'readBy.userId': { $ne: req.userId } },
      { $push: { readBy: { userId: req.userId, readAt: new Date() } } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 23 — Safe Handover Scheduling API
// ══════════════════════════════════════════════════════════════════════════════

// Propose a meeting
router.post('/room/:roomId/meeting', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { location, date, time } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isParticipant(room, req.userId)) return res.status(403).json({ error: 'Access denied' });

    const user = await User.findById(req.userId).select('name email role');

    const message = new ChatMessage({
      roomId,
      senderId: { _id: req.userId, name: user.name, email: user.email, role: user.role },
      content: 'Proposing a safe handover meeting.',
      type: 'meeting_proposal',
      meetingData: { location, date, time, status: 'proposed' },
      deliveryStatus: 'sent'
    });
    await message.save();

    room.activeMeeting = {
      messageId: message._id,
      location,
      date,
      time,
      status: 'proposed'
    };
    room.updatedAt = new Date();
    room.lastMessage = { content: 'Proposing a safe handover meeting.', senderId: req.userId, timestamp: message.createdAt };
    await room.save();

    res.json(message);
  } catch (error) {
    console.error('Propose meeting error:', error);
    res.status(500).json({ error: 'Failed to propose meeting' });
  }
});

// Update meeting status (accept/reject/cancel)
router.put('/room/:roomId/meeting/:messageId/:action', authMiddleware, async (req, res) => {
  try {
    const { roomId, messageId, action } = req.params; // action: accept, reject, cancel
    if (!['accept', 'reject', 'cancel'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isParticipant(room, req.userId)) return res.status(403).json({ error: 'Access denied' });

    const message = await ChatMessage.findById(messageId);
    if (!message || message.type !== 'meeting_proposal') return res.status(404).json({ error: 'Meeting proposal not found' });

    // Status logic
    const statusMap = { accept: 'accepted', reject: 'rejected', cancel: 'canceled' };
    const newStatus = statusMap[action];

    // Check authority: Sender can only cancel. Receiver can accept/reject.
    const isSender = message.senderId._id.toString() === req.userId;
    if (isSender && action !== 'cancel') return res.status(403).json({ error: 'You can only cancel your own proposal' });
    if (!isSender && action === 'cancel') return res.status(403).json({ error: "You cannot cancel someone else's proposal" });
    message.meetingData.status = newStatus;
    await message.save();

    // Update room's activeMeeting if it matches
    if (room.activeMeeting && room.activeMeeting.messageId?.toString() === messageId) {
      room.activeMeeting.status = newStatus;
      await room.save();
    }

    // Send system message to notify status change
    const user = await User.findById(req.userId).select('name email role');
    const systemMsg = new ChatMessage({
      roomId,
      senderId: { _id: req.userId, name: 'System', email: 'system@lost-found', role: 'system' },
      content: `${user.name} has ${newStatus} the meeting proposal.`,
      type: 'system',
      deliveryStatus: 'delivered'
    });
    await systemMsg.save();

    res.json({ success: true, message, systemMessage: systemMsg });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

module.exports = router;