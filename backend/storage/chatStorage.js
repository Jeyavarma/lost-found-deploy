// Shared in-memory storage for chat system
const chatRooms = new Map();
const messages = new Map();
const connectedUsers = new Map();

module.exports = {
  chatRooms,
  messages,
  connectedUsers
};