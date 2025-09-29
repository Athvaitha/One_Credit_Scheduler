// Test email service
require('dotenv').config();
const { sendAppointmentConfirmationEmail, sendAppointmentDeclineEmail } = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...');
  
  // Check environment variables first
  console.log('📊 Environment Check:');
  console.log('SMTP_USER:', process.env.SMTP_USER ? '✅ SET' : '❌ NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Please set SMTP_USER and SMTP_PASS in your .env file');
    return;
  }
  
  // Test data
  const testData = {
    userEmail: "athvaithae2301@gmail.com", // Using your Gmail for testing
    userName: "Test User",
    serviceName: "Hair Styling",
    date: new Date(),
    time: "2:30 PM",
    providerName: "Test Provider"
  };
  
  console.log('\n📧 Testing Confirmation Email...');
  try {
    const result = await sendAppointmentConfirmationEmail(testData);
    if (result.success) {
      console.log('✅ Confirmation email test PASSED');
      console.log('📬 Message ID:', result.messageId);
    } else {
      console.error('❌ Confirmation email test FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ Confirmation email test ERROR:', error.message);
  }
  
  console.log('\n📧 Testing Decline Email...');
  try {
    const result = await sendAppointmentDeclineEmail(testData);
    if (result.success) {
      console.log('✅ Decline email test PASSED');
      console.log('📬 Message ID:', result.messageId);
    } else {
      console.error('❌ Decline email test FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ Decline email test ERROR:', error.message);
  }
  
  console.log('\n🎯 Email service testing complete!');
}

testEmailService();