const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../config/email');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const pushService = require('../services/pushService');

const connectedUsers = new Map();

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
    socket.userId = decoded.userId || decoded.id;
    socket.userRole = decoded.role || 'student';
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
};

const handleConnection = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to chat`);
    connectedUsers.set(socket.userId, socket.id);

    socket.join(`user_${socket.userId}`);

    socket.on('join_room', async (roomId) => {
      try {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.emit('joined_room', { roomId });
        console.log(`User ${socket.userId} joined room ${roomId}`);

        // Mark pending unread messages as read
        await ChatMessage.updateMany(
          { roomId, 'senderId._id': { $ne: socket.userId }, 'readBy.userId': { $ne: socket.userId } },
          { $push: { readBy: { userId: socket.userId, readAt: new Date() } } }
        );
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('mark_read', async (data) => {
      try {
        const { messageIds } = data;
        if (!messageIds || !messageIds.length || !socket.currentRoom) return;

        await ChatMessage.updateMany(
          { _id: { $in: messageIds }, 'readBy.userId': { $ne: socket.userId } },
          { $push: { readBy: { userId: socket.userId, readAt: new Date() } } }
        );

        socket.to(socket.currentRoom).emit('messages_read', {
          messageIds,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const { messageId, roomId, content, type = 'text' } = data;

        if (!content || !content.trim()) {
          socket.emit('message_failed', {
            messageId,
            error: 'Message content is required'
          });
          return;
        }

        const room = await ChatRoom.findById(roomId).populate('itemId', 'title');
        if (!room) {
          socket.emit('message_failed', { messageId, error: 'Room not found' });
          return;
        }

        const user = await User.findById(socket.userId).select('name email role');

        const message = new ChatMessage({
          roomId,
          senderId: {
            _id: socket.userId,
            name: user?.name || 'User',
            email: user?.email || 'user@example.com',
            role: user?.role || socket.userRole
          },
          content: content.trim(),
          type,
          clientMessageId: messageId,
          deliveryStatus: 'sent'
        });

        await message.save();

        socket.emit('message_delivered', {
          messageId,
          serverMessageId: message._id
        });

        // Emit to all room participants
        io.to(roomId).emit('new_message', message);

        // Update room's last message in db
        room.lastMessage = {
          content: content.trim(),
          senderId: socket.userId,
          timestamp: message.createdAt
        };
        room.updatedAt = new Date();
        await room.save();

        console.log(`Message sent in room ${roomId} by user ${socket.userId}`);

        // --- Offline Notification ---
        setImmediate(async () => {
          try {
            for (const participant of room.participants) {
              const participantId = participant.userId.toString();
              // Only notify the OTHER person (not the sender)
              if (participantId === socket.userId) continue;
              // Check if they are currently connected
              if (!connectedUsers.has(participantId)) {
                // Find their email and push subscription
                const recipientUser = await User.findById(participantId).select('name email pushSubscription').lean();
                if (recipientUser) {
                  const senderName = user?.name || 'A user';
                  const itemTitle = room.itemId ? room.itemId.title : 'an item';

                  // Send Push Notification
                  if (recipientUser.pushSubscription) {
                    await pushService.sendNotification(recipientUser.pushSubscription, {
                      title: `New Message from ${senderName}`,
                      body: content.trim().length > 50 ? `${content.trim().substring(0, 50)}...` : content.trim(),
                      url: `/dashboard`
                    }).catch(err => console.error('Push notification failed:', err));
                  }

                  if (recipientUser.email) {
                    const subject = `New message about: ${itemTitle}`;
                    const text = `Hi ${recipientUser.name},\n\n${senderName} sent you a message about "${itemTitle}" in the MCC Lost & Found portal.\n\nMessage preview: "${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}"\n\nLog in to reply:\n${process.env.FRONTEND_URL || 'https://lost-found-mcc.vercel.app'}/dashboard\n\n— MCC Lost & Found`;
                    const html = `<div style="font-family:sans-serif;max-width:600px;margin:auto;"><h3 style="color:#1d4ed8;">💬 You have a new message</h3><p>Hi <strong>${recipientUser.name}</strong>,</p><p><strong>${senderName}</strong> sent you a message about <em>"${itemTitle}"</em>.</p><blockquote style="background:#f3f4f6;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;color:#374151;">${content.trim().substring(0, 180)}${content.length > 180 ? '...' : ''}</blockquote><a href="${process.env.FRONTEND_URL || 'https://lost-found-mcc.vercel.app'}/dashboard" style="background:#1d4ed8;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Reply in App</a><br><br><p style="color:#9ca3af;font-size:12px;">— MCC Lost &amp; Found Automated System</p></div>`;
                    await sendEmail(recipientUser.email, subject, text, html);
                    console.log(`📧 Offline notification sent to ${recipientUser.email}`);
                  }
                }
              }
            }
          } catch (notifErr) {
            console.error('Error sending offline chat notification:', notifErr);
          }
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_failed', {
          messageId: data.messageId,
          error: 'Failed to send message'
        });
      }
    });

    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          isTyping
        });
      }
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      socket.currentRoom = null;
      socket.emit('left_room', { roomId });
    });

    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp || Date.now());
    });

    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected:`, reason);
      connectedUsers.delete(socket.userId);
    });
  });
};

module.exports = {
  handleConnection,
  connectedUsers
};