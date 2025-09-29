const { createTransporter } = require('../config/email');

const sendAppointmentConfirmation = async (appointment, userEmail, providerName, serviceName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Appointment Confirmed - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Appointment Confirmed!</h2>
          <p>Dear Customer,</p>
          <p>Your appointment has been confirmed by the service provider.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details:</h3>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <p><strong>Status:</strong> <span style="color: #28a745;">Confirmed</span></p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          
          <p>If you need to reschedule or cancel, please contact the service provider.</p>
          <p>Best regards,<br>Appointment Scheduler Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent successfully');
    return result;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
};

const sendAppointmentCancellation = async (appointment, userEmail, providerName, serviceName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Appointment Cancelled - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Appointment Cancelled</h2>
          <p>Dear Customer,</p>
          <p>We're sorry to inform you that your appointment has been cancelled by the service provider.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details:</h3>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <p><strong>Status:</strong> <span style="color: #dc3545;">Cancelled</span></p>
          </div>
          
          <p>Please feel free to book another appointment at your convenience.</p>
          <p>Best regards,<br>Appointment Scheduler Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Cancellation email sent successfully');
    return result;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    throw error;
  }
};

const sendAppointmentCompletion = async (appointment, userEmail, providerName, serviceName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Appointment Completed - ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Appointment Completed</h2>
          <p>Dear Customer,</p>
          <p>Your appointment has been marked as completed by the service provider.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details:</h3>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <p><strong>Status:</strong> <span style="color: #007bff;">Completed</span></p>
          </div>
          
          <p>Thank you for using our service! We hope to see you again soon.</p>
          <p>Best regards,<br>Appointment Scheduler Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Completion email sent successfully');
    return result;
  } catch (error) {
    console.error('Error sending completion email:', error);
    throw error;
  }
};

module.exports = {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentCompletion
};