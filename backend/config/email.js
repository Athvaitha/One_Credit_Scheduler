const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // You can use other services like Outlook, Yahoo, etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your email password or app password
    }
  });
};

// For Gmail, you need to enable 2-factor authentication and use an App Password
// For other services, check their SMTP settings

module.exports = { createTransporter };