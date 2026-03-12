const mongoose = require('mongoose');
require('dotenv').config();

const ChatRoom = require('./models/ChatRoom');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');

async function testChatDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create a dummy user if none exist
        let user1 = await User.findOne({ email: 'test1@example.com' });
        if (!user1) {
            user1 = new User({
                name: 'Test User 1',
                email: 'test1@example.com',
                password: 'password123',
                role: 'student'
            });
            await user1.save();
        }

        let user2 = await User.findOne({ email: 'test2@example.com' });
        if (!user2) {
            user2 = new User({
                name: 'Test User 2',
                email: 'test2@example.com',
                password: 'password123',
                role: 'student'
            });
            await user2.save();
        }

        // Test creating a chat room
        console.log('\n--- Testing ChatRoom Creation ---');
        const newRoom = new ChatRoom({
            type: 'direct',
            participants: [
                { userId: user1._id, role: 'participant' },
                { userId: user2._id, role: 'participant' }
            ]
        });
        const savedRoom = await newRoom.save();
        console.log('✅ Created chat room:', savedRoom._id);

        // Test sending a message
        console.log('\n--- Testing ChatMessage Creation ---');
        const newMessage = new ChatMessage({
            roomId: savedRoom._id,
            senderId: {
                _id: user1._id,
                name: user1.name,
                email: user1.email,
                role: user1.role
            },
            content: 'Hello, this is a test message!',
            type: 'text'
        });
        const savedMessage = await newMessage.save();
        console.log('✅ Created chat message:', savedMessage.content);

        // Update room with last message
        savedRoom.lastMessage = {
            content: savedMessage.content,
            senderId: user1._id,
            timestamp: savedMessage.createdAt
        };
        await savedRoom.save();
        console.log('✅ Updated room lastMessage');

        // Fetch rooms for user1
        console.log('\n--- Testing ChatRoom Retrieval ---');
        const userRooms = await ChatRoom.find({ 'participants.userId': user1._id });
        console.log(`✅ Found ${userRooms.length} rooms for user 1`);

        // Cleanup
        console.log('\n--- Cleanup ---');
        await ChatMessage.deleteMany({ roomId: savedRoom._id });
        await ChatRoom.findByIdAndDelete(savedRoom._id);
        console.log('✅ Cleanup successful');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Disconnected');
    }
}

testChatDB();
