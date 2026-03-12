const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:10000/api';

async function runTest() {
    try {
        console.log('--- Starting Chat API Flow Test ---\n');

        // 1. Create/Login User 1
        console.log('1. Logging in User 1...');
        let user1Token;
        let user1Id;
        try {
            const res1 = await axios.post(`${API_URL}/auth/login`, {
                email: 'test1@example.com',
                password: 'password123'
            });
            user1Token = res1.data.token;
            user1Id = res1.data.user.id;
            console.log('✅ User 1 logged in');
        } catch (e) {
            console.log('User 1 login failed, attempting registration...');
            const res1 = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Setup User 1',
                email: 'test1@example.com',
                password: 'password123',
                role: 'student'
            });
            user1Token = res1.data.token;
            user1Id = res1.data.user.id;
            console.log('✅ User 1 registered and logged in');
        }

        // 2. Create/Login User 2
        console.log('\n2. Logging in User 2...');
        let user2Token;
        let user2Id;
        try {
            const res2 = await axios.post(`${API_URL}/auth/login`, {
                email: 'test2@example.com',
                password: 'password123'
            });
            user2Token = res2.data.token;
            user2Id = res2.data.user.id;
            console.log('✅ User 2 logged in');
        } catch (e) {
            console.log('User 2 login failed, attempting registration...');
            const res2 = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Setup User 2',
                email: 'test2@example.com',
                password: 'password123',
                role: 'student'
            });
            user2Token = res2.data.token;
            user2Id = res2.data.user.id;
            console.log('✅ User 2 registered and logged in');
        }

        // 3. User 1 creates a Lost Item
        console.log('\n3. User 1 creates a Lost Item...');
        const lostItemRes = await axios.post(`${API_URL}/items`, {
            title: 'Lost Blue Backpack',
            description: 'I lost my blue backpack near the library.',
            category: 'Bags',
            status: 'lost',
            location: 'Library',
            date: new Date()
        }, {
            headers: { Authorization: `Bearer ${user1Token}` }
        });
        const lostItemId = lostItemRes.data._id;
        console.log(`✅ Lost Item created (ID: ${lostItemId})`);

        // 4. User 2 creates a Found Item
        console.log('\n4. User 2 creates a Found Item...');
        const foundItemRes = await axios.post(`${API_URL}/items`, {
            title: 'Found Keys',
            description: 'Found a set of keys near the cafeteria.',
            category: 'Keys',
            status: 'found',
            location: 'Cafeteria',
            date: new Date()
        }, {
            headers: { Authorization: `Bearer ${user2Token}` }
        });
        const foundItemId = foundItemRes.data._id;
        console.log(`✅ Found Item created (ID: ${foundItemId})`);

        // 5. User 1 tries to contact User 2 about the found keys
        console.log('\n5. User 1 initiates chat about User 2\'s found item...');
        const chat1Res = await axios.post(`${API_URL}/chat/room/${foundItemId}`, {}, {
            headers: { Authorization: `Bearer ${user1Token}` }
        });
        console.log(`✅ Chat room created successfully! Room ID: ${chat1Res.data._id}`);

        // 6. User 2 tries to contact User 1 about the lost backpack
        console.log('\n6. User 2 initiates chat about User 1\'s lost item...');
        const chat2Res = await axios.post(`${API_URL}/chat/room/${lostItemId}`, {}, {
            headers: { Authorization: `Bearer ${user2Token}` }
        });
        console.log(`✅ Chat room created successfully! Room ID: ${chat2Res.data._id}`);

        // 7. Test contacting own item (should fail)
        console.log('\n7. User 1 tries to contact their OWN lost item (should fail)...');
        try {
            await axios.post(`${API_URL}/chat/room/${lostItemId}`, {}, {
                headers: { Authorization: `Bearer ${user1Token}` }
            });
            console.error('❌ Failed: User was able to contact themselves!');
        } catch (error) {
            console.log(`✅ Correctly blocked contacting own item: ${error.response.data.error}`);
        }

        console.log('\n🎉 All API flow tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
