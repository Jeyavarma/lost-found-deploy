const jwt = require('jsonwebtoken');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// Keep connected users in memory for real-time features
const connectedUsers = new Map();

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
    socket.userId = decoded.userId;
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

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join chat room
    socket.on('join_room', async (roomId) => {
      try {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.emit('joined_room', { roomId });
        console.log(`User ${socket.userId} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send message
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

        // Verify room access
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.participants.some(p => p.userId.toString() === socket.userId)) {
          socket.emit('message_failed', { 
            messageId, 
            error: 'Access denied' 
          });
          return;
        }

        // Get user data
        const user = await User.findById(socket.userId).select('name email role');

        // Create and save message to MongoDB
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
          clientMessageId: messageId
        });

        await message.save();

        // Update room's last message
        room.lastMessage = {
          content: content.trim(),
          senderId: socket.userId,
          timestamp: new Date()
        };
        await room.save();

        // Format message for frontend
        const formattedMessage = {
          _id: message._id.toString(),
          roomId: message.roomId,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          createdAt: message.createdAt.toISOString(),
          clientMessageId: message.clientMessageId
        };

        // Emit delivery confirmation to sender
        socket.emit('message_delivered', {
          messageId,
          serverMessageId: message._id
        });

        // Emit to all room participants
        io.to(roomId).emit('new_message', formattedMessage);

        console.log(`Message sent in room ${roomId} by user ${socket.userId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_failed', { 
          messageId: data.messageId, 
          error: 'Failed to send message' 
        });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          isTyping
        });
      }
    });

    // Leave room
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      socket.currentRoom = null;
      socket.emit('left_room', { roomId });
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { messageIds } = data;
        
        // Notify other participants about read status
        if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('messages_read', {
            messageIds,
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Health check ping/pong
    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp || Date.now());
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected:`, reason);
      connectedUsers.delete(socket.userId);
    });
  });
};

module.exports = { 
  handleConnection
};