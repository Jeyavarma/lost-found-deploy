const API_URL = 'http://127.0.0.1:10009/api';

async function runContactTest() {
    try {
        console.log('--- Starting Contact Flow Automated Test ---\n');

        const email = '2@mcc.edu.in';
        const password = '123456789';

        console.log(`1. Logging in as ${email}...`);
        let token;
        let userId;

        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');

        token = loginData.token;
        userId = loginData.user?.id || loginData.userId;
        if (!userId && loginData.user) userId = loginData.user._id;
        console.log(`✅ Logged in successfully! User ID: ${userId}`);

        console.log('\n2. Fetching items from the database...');
        const itemsRes = await fetch(`${API_URL}/items`);
        const itemsData = await itemsRes.json();
        const items = itemsData.items || itemsData;
        console.log(`✅ Retrieved ${items.length} items`);

        const lostItem = items.find(i => i.status === 'lost' && i.reportedBy && i.reportedBy._id !== userId);
        const foundItem = items.find(i => i.status === 'found' && i.reportedBy && i.reportedBy._id !== userId);

        if (!lostItem) {
            console.log('⚠️ Could not find a suitable LOST item to test with.');
        } else {
            console.log(`\n3. Contacting LOST item owner: ${lostItem.title}`);
            const chatRes = await fetch(`${API_URL}/chat/room/${lostItem._id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: '{}'
            });
            const chatData = await chatRes.json();
            if (!chatRes.ok) throw new Error(chatData.error || chatData.message);
            console.log(`✅ Chat room created! Room ID: ${chatData._id}`);
        }

        if (!foundItem) {
            console.log('⚠️ Could not find a suitable FOUND item to test with.');
        } else {
            console.log(`\n4. Contacting FOUND item owner: ${foundItem.title}`);
            const chatRes = await fetch(`${API_URL}/chat/room/${foundItem._id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: '{}'
            });
            const chatData = await chatRes.json();
            if (!chatRes.ok) throw new Error(chatData.error || chatData.message);
            console.log(`✅ Chat room created! Room ID: ${chatData._id}`);
        }

        console.log('\n🎉 Contact Flow API automation test complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test execution error:', error.message);
        process.exit(1);
    }
}

runContactTest();
