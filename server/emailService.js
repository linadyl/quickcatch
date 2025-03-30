// server/emailService.js
const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
require('dotenv').config();

// Create reusable transporter using environment variables
const createTransporter = () => {
  // Check for required environment variables
  const requiredVars = ['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return null;
  }
  
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'outlook', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Email sending endpoint
router.post('/send', async (req, res) => {
  const { 
    recipientEmail, 
    teamName, 
    summary, 
    teamPerformance, 
    playerPerformance, 
    videoUrl 
  } = req.body;

  // Validate required fields
  if (!recipientEmail || !teamName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }
  
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return res.status(500).json({ 
        success: false, 
        message: 'Email service not properly configured' 
      });
    }
    
    // Generate HTML email content
    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d9f99d; padding: 15px; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; }
          h1 { color: #4d7c0f; margin: 0; font-size: 24px; }
          h2 { color: #65a30d; font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
          .video-container { margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          p { line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${teamName} NHL Highlights Analysis</h1>
          </div>
          <div class="content">
            <h2>Summary</h2>
            <p>${summary}</p>
            
            <h2>Team Performance</h2>
            <p>${teamPerformance}</p>
            
            <h2>Player Performance</h2>
            <p>${playerPerformance}</p>
            
            <div class="video-container">
              <h2>Watch Highlights</h2>
              <p>Check out the video highlights: <a href="${videoUrl.replace('/embed/', '/watch?v=')}" target="_blank">View on YouTube</a></p>
            </div>
            
            <div class="footer">
              <p>This analysis was shared from QuickCatch NHL Highlights Analysis</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `${teamName} NHL Highlights Analysis`,
      html: htmlContent,
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent: %s', info.messageId);
    
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

module.exports = router;