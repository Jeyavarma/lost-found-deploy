const mongoose = require('mongoose');
require('dotenv').config();

const addIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Chat-related indexes
    await db.collection('chatrooms').createIndex({ 'participants.userId': 1 });
    await db.collection('chatrooms').createIndex({ itemId: 1 });
    await db.collection('chatrooms').createIndex({ type: 1, status: 1 });
    await db.collection('chatrooms').createIndex({ updatedAt: -1 });

    await db.collection('chatmessages').createIndex({ roomId: 1, createdAt: -1 });
    await db.collection('chatmessages').createIndex({ 'senderId._id': 1 });
    await db.collection('chatmessages').createIndex({ clientMessageId: 1 });

    // Item-related indexes
    await db.collection('items').createIndex({ status: 1, type: 1 });
    await db.collection('items').createIndex({ category: 1 });
    await db.collection('items').createIndex({ location: 1 });
    await db.collection('items').createIndex({ createdAt: -1 });
    await db.collection('items').createIndex({ userId: 1 });

    // User-related indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });

    console.log('All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

addIndexes();