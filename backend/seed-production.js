require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Item = require('./models/Item');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Item.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@mcc.edu',
      password: process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(-12) + 'Admin@' + new Date().getFullYear(),
      role: 'admin',
      department: 'Administration'
    });
    await adminUser.save();
    console.log('Admin user created');

    // Create sample users
    const users = [];
    for (let i = 1; i <= 20; i++) {
      const user = new User({
        name: `Student ${i}`,
        email: `student${i}@mcc.edu`,
        password: process.env.STUDENT_PASSWORD || Math.random().toString(36).slice(-8) + '123',
        role: 'student',
        department: i % 2 === 0 ? 'Computer Science' : 'Mathematics',
        year: ['I', 'II', 'III', 'IV'][i % 4],
        shift: i % 2 === 0 ? 'Morning' : 'Afternoon',
        studentId: `MCC2024${String(i).padStart(3, '0')}`
      });
      users.push(user);
    }
    await User.insertMany(users);
    console.log('Sample users created');

    // Create sample items
    const items = [];
    const categories = ['Electronics', 'Books', 'Clothing', 'Accessories', 'Documents', 'Keys'];
    const locations = ['Library', 'Cafeteria', 'Main Building', 'Hostel A', 'Sports Complex'];
    const statuses = ['lost', 'found'];

    for (let i = 1; i <= 50; i++) {
      const item = new Item({
        title: `Item ${i}`,
        description: `Description for item ${i}`,
        category: categories[i % categories.length],
        location: locations[i % locations.length],
        status: statuses[i % 2],
        reportedBy: users[i % users.length]._id,
        contactInfo: `student${i}@mcc.edu`,
        timeReported: '10:00 AM',
        timeLostFound: '09:30 AM',
        dateLostFound: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        approved: Math.random() > 0.3 // 70% approved
      });
      items.push(item);
    }
    await Item.insertMany(items);
    console.log('Sample items created');

    console.log('Database seeded successfully!');
    console.log(`Created: ${users.length + 1} users, ${items.length} items`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();