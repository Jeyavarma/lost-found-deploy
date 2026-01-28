const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory storage
const chatRooms = new Map();
const messages = new Map();
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

    socket.join(`user_${socket.userId}`);

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

        const user = await User.findById(socket.userId).select('name email role');

        const message = {
          _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          roomId,
          senderId: {
            _id: socket.userId,
            name: user?.name || 'User',
            email: user?.email || 'user@example.com',
            role: user?.role || socket.userRole
          },
          content: content.trim(),
          type,
          createdAt: new Date().toISOString(),
          clientMessageId: messageId
        };

        if (!messages.has(roomId)) {
          messages.set(roomId, []);
        }
        messages.get(roomId).push(message);

        socket.emit('message_delivered', {
          messageId,
          serverMessageId: message._id
        });

        // Emit to all room participants
        io.to(roomId).emit('new_message', message);
        
        // Update room's last message in storage
        const room = chatRooms.get(roomId);
        if (room) {
          room.lastMessage = {
            content: content.trim(),
            senderId: socket.userId,
            timestamp: new Date().toISOString()
          };
          room.updatedAt = new Date().toISOString();
        }

        console.log(`Message sent in room ${roomId} by user ${socket.userId}`);

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
  chatRooms,
  messages
};