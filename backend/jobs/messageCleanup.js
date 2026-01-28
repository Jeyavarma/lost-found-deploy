let Message, ChatRoom;

try {
  Message = require('../models/Message');
  ChatRoom = require('../models/ChatRoom');
} catch (error) {
  console.error('Chat models not found, cleanup job disabled:', error.message);
  module.exports = { 
    cleanupMessages: () => console.log('Cleanup disabled - models not found'),
    startCleanupJob: () => console.log('Cleanup job disabled - models not found')
  };
  return;
}

// Clean up old messages and inactive rooms
const cleanupMessages = async () => {
  try {
    console.log('Starting message cleanup job...');
    
    // 1. Clean up failed messages older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failedResult = await Message.deleteMany({
      deliveryStatus: 'failed',
      createdAt: { $lt: sevenDaysAgo }
    });
    console.log(`Deleted ${failedResult.deletedCount} failed messages`);
    
    // 2. Clean up rooms with no messages in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveRooms = await ChatRoom.find({
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    for (const room of inactiveRooms) {
      const messageCount = await Message.countDocuments({ roomId: room._id });
      if (messageCount === 0) {
        await ChatRoom.findByIdAndDelete(room._id);
        console.log(`Deleted inactive room: ${room._id}`);
      }
    }
    
    // 3. Enforce message limits per room (keep only latest 1000)
    const rooms = await ChatRoom.find({});
    for (const room of rooms) {
      const messageCount = await Message.countDocuments({ roomId: room._id });
      if (messageCount > 1000) {
        const oldMessages = await Message.find({ roomId: room._id })
          .sort({ createdAt: 1 })
          .limit(messageCount - 1000)
          .select('_id');
        
        const oldMessageIds = oldMessages.map(msg => msg._id);
        const deleteResult = await Message.deleteMany({ _id: { $in: oldMessageIds } });
        console.log(`Cleaned ${deleteResult.deletedCount} old messages from room ${room._id}`);
      }
    }
    
    console.log('Message cleanup job completed');
  } catch (error) {
    console.error('Message cleanup job failed:', error);
  }
};

// Run cleanup every 24 hours
const startCleanupJob = () => {
  if (!Message || !ChatRoom) {
    console.log('Cleanup job disabled - models not available');
    return;
  }
  
  // Run immediately on startup (with delay to allow DB connection)
  setTimeout(() => {
    cleanupMessages();
  }, 5000);
  
  // Then run every 24 hours
  setInterval(cleanupMessages, 24 * 60 * 60 * 1000);
  console.log('Message cleanup job scheduled to run every 24 hours');
};

module.exports = { cleanupMessages, startCleanupJob };