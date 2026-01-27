const mongoose = require('mongoose');

async function addPerformanceIndexes() {
  try {
    // Use default MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Add indexes for better query performance
    await db.collection('items').createIndex({ createdAt: -1 });
    await db.collection('items').createIndex({ status: 1 });
    await db.collection('items').createIndex({ category: 1 });
    await db.collection('items').createIndex({ status: 1, category: 1 });
    await db.collection('items').createIndex({ reportedBy: 1 });
    await db.collection('items').createIndex({ 
      title: 'text', 
      description: 'text', 
      location: 'text' 
    });

    console.log('✅ Performance indexes added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    process.exit(1);
  }
}

addPerformanceIndexes();