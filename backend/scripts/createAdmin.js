const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createAdminUser = async () => {
  try {
    await connectDB();
    
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    process.exit();
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();