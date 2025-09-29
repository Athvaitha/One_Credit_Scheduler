const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Option A: Try port 587 (more reliable)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add connection timeout
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Option B: If port 587 doesn't work, try this (uncomment to use):
/*
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Force using port 587
  port: 587,
  secure: false,
});
*/

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Error with email configuration:', error.message);
    console.log('💡 Troubleshooting tips:');
    console.log('1. Check your Gmail app password');
    console.log('2. Check firewall/antivirus settings');
    console.log('3. Try different network (mobile hotspot)');
    console.log('4. Verify Gmail account has 2FA enabled');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Rest of your code remains the same...
app.post('/send-confirmation', async (req, res) => {
  const { userEmail, scheduleDetails } = req.body;

  if (!userEmail || !scheduleDetails) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Schedule Confirmed ✅',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Schedule Confirmed! 🎉</h2>
        <p>Your schedule has been confirmed.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <h3>Details:</h3>
          <p><strong>Date:</strong> ${scheduleDetails.date}</p>
          <p><strong>Time:</strong> ${scheduleDetails.time}</p>
          <p><strong>Location:</strong> ${scheduleDetails.location}</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});