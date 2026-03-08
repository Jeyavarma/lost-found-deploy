jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Express app exported from server.js
const Item = require('../models/Item');
const cloudinary = require('cloudinary').v2;

// Mock Cloudinary upload to avoid real network calls
jest.mock('cloudinary').v2;
cloudinary.uploader.upload.mockImplementation((path, opts) => {
    return Promise.resolve({ secure_url: 'https://res.cloudinary.com/fake/image.jpg' });
});

describe('POST /api/items', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI_TEST, { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    });

    it('stores text fields in MongoDB and uploads image to Cloudinary', async () => {
        const newItem = {
            title: 'Lost Umbrella',
            description: 'Black umbrella left in library',
            location: 'Library',
            category: 'Accessories',
            status: 'lost'
        };

        const response = await request(app)
            .post('/api/items')
            .field('title', newItem.title)
            .field('description', newItem.description)
            .field('location', newItem.location)
            .field('category', newItem.category)
            .field('status', newItem.status)
            .attach('image', Buffer.from('fakeimagecontent'), 'umbrella.jpg');

        expect(response.status).toBe(201);
        expect(response.body.imageUrl).toContain('cloudinary.com');

        const savedItem = await Item.findById(response.body._id).lean();
        expect(savedItem.title).toBe(newItem.title);
        expect(savedItem.imageUrl).toBe('https://res.cloudinary.com/fake/image.jpg');
    });
});
