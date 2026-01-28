const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Items collection indexes
    await db.collection('items').createIndex({ "createdAt": -1 });
    await db.collection('items').createIndex({ "status": 1, "createdAt": -1 });
    await db.collection('items').createIndex({ "category": 1, "createdAt": -1 });
    await db.collection('items').createIndex({ "reportedBy": 1, "createdAt": -1 });
    await db.collection('items').createIndex({ "location": "text", "title": "text", "description": "text" });
    
    // Users collection indexes
    await db.collection('users').createIndex({ "email": 1 }, { unique: true });
    await db.collection('users').createIndex({ "name": 1 });
    
    // Messages collection indexes (if exists)
    try {
      await db.collection('messages').createIndex({ "chatRoom": 1, "createdAt": -1 });
      await db.collection('messages').createIndex({ "sender": 1, "createdAt": -1 });
    } catch (e) {
      console.log('Messages collection not found, skipping indexes');
    }
    
    console.log('✅ All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();