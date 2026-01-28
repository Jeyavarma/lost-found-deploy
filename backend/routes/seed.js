const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');

// Seed production database via API
router.post('/populate', async (req, res) => {
  try {
    // Check if data already exists
    const userCount = await User.countDocuments();
    const itemCount = await Item.countDocuments();
    
    if (userCount > 0 || itemCount > 0) {
      return res.json({ 
        message: 'Database already has data',
        users: userCount,
        items: itemCount
      });
    }

    // Create admin user
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || Math.random().toString(36).slice(-12) + 'Admin@' + new Date().getFullYear();
    const admin = new User({
      name: 'Admin User',
      email: 'admin@mcc.edu',
      password: adminPassword,
      role: 'admin',
      department: 'Administration'
    });
    await admin.save();

    // Create sample users
    const users = [];
    const userPassword = process.env.SEED_USER_PASSWORD || Math.random().toString(36).slice(-12);
    for (let i = 1; i <= 15; i++) {
      users.push({
        name: `Student ${i}`,
        email: `student${i}@mcc.edu`,
        password: userPassword,
        role: 'student',
        department: ['Computer Science', 'Mathematics', 'Physics'][i % 3],
        year: ['I', 'II', 'III'][i % 3],
        studentId: `MCC2024${String(i).padStart(3, '0')}`
      });
    }
    const createdUsers = await User.insertMany(users);

    // Create sample items
    const items = [];
    const categories = ['Electronics', 'Books', 'Clothing', 'Accessories'];
    const locations = ['Library', 'Cafeteria', 'Main Building', 'Hostel A'];
    
    for (let i = 1; i <= 25; i++) {
      items.push({
        title: `Sample Item ${i}`,
        description: `This is a sample ${categories[i % categories.length].toLowerCase()} item for testing`,
        category: categories[i % categories.length],
        location: locations[i % locations.length],
        status: i % 2 === 0 ? 'lost' : 'found',
        reportedBy: createdUsers[i % createdUsers.length]._id,
        contactInfo: `student${i}@mcc.edu`,
        timeReported: '10:00 AM',
        approved: true
      });
    }
    await Item.insertMany(items);

    res.json({
      message: 'Database populated successfully!',
      users: users.length + 1,
      items: items.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;