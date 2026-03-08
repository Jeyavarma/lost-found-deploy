const { MongoClient } = require('mongodb');

async function testConnection(name, uri) {
    console.log(`Testing connection for ${name}...`);
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('mcc-lost-found');
        await db.command({ ping: 1 });
        console.log(`✅ Connection successful for ${name}.`);
    } catch (error) {
        console.error(`❌ Connection failed for ${name}:`, error.message);
    } finally {
        await client.close();
    }
}

async function run() {
    const uri1 = "mongodb+srv://render-backend:RenderBackend2024@lostandfound.6mo1sey.mongodb.net/mcc-lost-found?retryWrites=true&w=majority&appName=lostAndFound";

    const uri2 = "mongodb://ac-92n0ixp-shard-00-02.6mo1sey.mongodb.net,ac-92n0ixp-shard-00-01.6mo1sey.mongodb.net,ac-92n0ixp-shard-00-00.6mo1sey.mongodb.net/?tls=true&authMechanism=MONGODB-X509&authSource=%24external&serverMonitoringMode=poll&maxIdleTimeMS=30000&minPoolSize=0&maxPoolSize=5&maxConnecting=6&replicaSet=atlas-3l41sg-shard-0";

    await testConnection('URI 1 (Password based)', uri1);
    await testConnection('URI 2 (X509 based)', uri2);
}

run();
