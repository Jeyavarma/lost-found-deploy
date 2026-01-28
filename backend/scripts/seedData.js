require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Item.deleteMany({});

    // Create sample users
    const users = await User.create([
      {
        name: 'John Student',
        email: 'student@mcc.edu.in',
        password: process.env.STUDENT_PASSWORD || 'tempStudent123',
        role: 'student',
        studentId: 'MCC2024001',
        shift: 'aided',
        department: 'bsc-cs',
        year: '2'
      },
      {
        name: 'Jane Staff',
        email: 'staff@mcc.edu.in',
        password: process.env.STAFF_PASSWORD || 'tempStaff123',
        role: 'staff'
      },
      {
        name: 'Admin User',
        email: 'admin@mcc.edu.in',
        password: process.env.ADMIN_PASSWORD || 'tempAdmin123',
        role: 'admin'
      }
    ]);

    // Create sample items with events
    await Item.create([
      {
        title: 'Laptop Bag',
        description: 'Black laptop bag with college logo',
        category: 'bags',
        location: 'Main Auditorium',
        status: 'lost',
        reportedBy: users[0]._id,
        contactInfo: 'student@mcc.edu.in',
        timeReported: '2:30 PM',
        event: 'Games Fury',
        locationDetails: {
          building: 'Main Auditorium',
          floor: 'Ground Floor',
          room: 'Hall A'
        }
      },
      {
        title: 'ID Card',
        description: 'Student ID card with photo',
        category: 'documents',
        location: 'Registration Desk',
        status: 'found',
        reportedBy: users[1]._id,
        contactInfo: 'staff@mcc.edu.in',
        timeReported: '1:15 PM',
        event: 'Games Fury',
        locationDetails: {
          building: 'Main Building',
          floor: 'Ground Floor',
          room: 'Registration Counter'
        }
      },
      {
        title: 'Traditional Costume',
        description: 'Red and gold traditional saree',
        category: 'clothing',
        location: 'Cultural Hall',
        status: 'lost',
        reportedBy: users[0]._id,
        contactInfo: 'student@mcc.edu.in',
        timeReported: '4:45 PM',
        event: 'Deepwoods',
        locationDetails: {
          building: 'Cultural Center',
          floor: '1st Floor',
          room: 'Dressing Room 2'
        }
      },
      {
        title: 'Dance Accessories',
        description: 'Set of bharatanatyam jewelry and accessories',
        category: 'accessories',
        location: 'Stage Area',
        status: 'found',
        reportedBy: users[1]._id,
        contactInfo: 'staff@mcc.edu.in',
        timeReported: '11:20 AM',
        event: 'Deepwoods',
        locationDetails: {
          building: 'Cultural Center',
          floor: 'Ground Floor',
          room: 'Main Stage'
        }
      },
      {
        title: 'Heritage Book',
        description: 'Book about Madras history and culture',
        category: 'books',
        location: 'Exhibition Area',
        status: 'found',
        reportedBy: users[1]._id,
        contactInfo: 'staff@mcc.edu.in',
        timeReported: '3:30 PM',
        event: 'Octavia',
        locationDetails: {
          building: 'Library',
          floor: '1st Floor',
          room: 'Heritage Section'
        }
      },
      {
        title: 'Sports Water Bottle',
        description: 'Blue water bottle with MCC logo',
        category: 'personal',
        location: 'Athletic Track',
        status: 'lost',
        reportedBy: users[0]._id,
        contactInfo: 'student@mcc.edu.in',
        timeReported: '6:15 AM',
        event: 'Moonshadow',
        locationDetails: {
          building: 'Sports Complex',
          floor: 'Ground Floor',
          room: 'Track Field'
        }
      },
      {
        title: 'Running Shoes',
        description: 'Nike running shoes, size 9',
        category: 'footwear',
        location: 'Changing Room',
        status: 'found',
        reportedBy: users[1]._id,
        contactInfo: 'staff@mcc.edu.in',
        timeReported: '7:45 AM',
        event: 'Barnes Hall Day',
        locationDetails: {
          building: 'Sports Complex',
          floor: 'Ground Floor',
          room: 'Men\'s Changing Room'
        }
      }
    ]);

    console.log('Sample data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();