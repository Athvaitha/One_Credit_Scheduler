const { sendAppointmentConfirmationEmail } = require('./services/emailService');

// Test email function
const testEmail = async () => {
  console.log('Testing email service...');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  
  const testData = {
    userEmail: 'athvaithae2301@gmail.com', // Send to your own email for testing
    userName: 'Test User',
    serviceName: 'Test Service',
    date: new Date(),
    time: '12:00',
    providerName: 'Test Provider'
  };
  
  try {
    const result = await sendAppointmentConfirmationEmail(testData);
    console.log('Email test result:', result);
  } catch (error) {
    console.error('Email test failed:', error);
  }
};

// Load environment variables
require('dotenv').config();

// Run the test
testEmail();