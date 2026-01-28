require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@mcc.edu.in' });
    
    if (!admin) {
      console.log('Admin user not found');
      process.exit(1);
    }

    // Set new password
    const newPassword = process.env.ADMIN_RESET_PASSWORD || Math.random().toString(36).slice(-12) + 'Admin@' + new Date().getFullYear();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    admin.password = hashedPassword;
    await admin.save();

    console.log('Admin password reset successfully');
    console.log('Email: admin@mcc.edu.in');
    console.log('Password:', newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetAdminPassword();