const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const workerRoutes = require('./routes/workers');
const slotRoutes = require('./routes/slots');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/slots', slotRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Appointment Scheduler API' });
});

module.exports = app;