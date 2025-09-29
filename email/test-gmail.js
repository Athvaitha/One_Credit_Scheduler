// test-gmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmail() {
  console.log('Testing Gmail connection...');
  console.log('Email:', process.env.EMAIL_USER);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Try sending a test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email from Node.js',
      text: 'This is a test email from your Node.js application.',
    });
    
    console.log('✅ Test email sent! Message ID:', info.messageId);
  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed. Check your app password.');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🌐 Connection timeout. Check your network/firewall.');
    }
  }
}

testGmail();