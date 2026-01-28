const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

// Configuration
const CHAT_RETENTION_DAYS = 90; // 3 months
const INACTIVE_ROOM_DAYS = 30;  // 1 month of inactivity

class ChatCleanup {
  // Delete messages older than retention period
  async cleanupOldMessages() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CHAT_RETENTION_DAYS);

      const result = await Message.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`🗑️ Deleted ${result.deletedCount} messages older than ${CHAT_RETENTION_DAYS} days`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
      throw error;
    }
  }

  // Archive inactive chat rooms
  async archiveInactiveRooms() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - INACTIVE_ROOM_DAYS);

      const result = await ChatRoom.updateMany(
        {
          updatedAt: { $lt: cutoffDate },
          status: 'active'
        },
        {
          $set: { status: 'archived' }
        }
      );

      console.log(`📦 Archived ${result.modifiedCount} inactive rooms older than ${INACTIVE_ROOM_DAYS} days`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error archiving inactive rooms:', error);
      throw error;
    }
  }

  // Run full cleanup process
  async runCleanup() {
    console.log('🧹 Starting chat cleanup process...');
    
    try {
      const messagesDeleted = await this.cleanupOldMessages();
      const roomsArchived = await this.archiveInactiveRooms();

      console.log('✅ Chat cleanup completed:', {
        messagesDeleted,
        roomsArchived
      });

      return { messagesDeleted, roomsArchived };
    } catch (error) {
      console.error('❌ Chat cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new ChatCleanup();