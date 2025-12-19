const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: to,
        subject: subject,
        html: html
      };

      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      if (i === retries - 1) {
        console.error('Error sending email after retries:', error);
        throw error;
      }
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
};

const getVerificationEmailTemplate = (username, verificationLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Campus Connect! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${username},</h2>
          <p>Thank you for registering with Campus Connect. To complete your registration, 
             please verify your email address by clicking the button below:</p>
          <center>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationLink}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account with Campus Connect, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Campus Connect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getPasswordResetTemplate = (username, resetLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #f5576c; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${username},</h2>
          <p>We received a request to reset your password for your Campus Connect account.</p>
          <p>Click the button below to reset your password:</p>
          <center>
            <a href="${resetLink}" class="button">Reset Password</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #f5576c;">${resetLink}</p>
          <div class="warning">
            <strong> Important:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request a password reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2025 Campus Connect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeEmailTemplate = (username) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1> Email Verified Successfully!</h1>
        </div>
        <div class="content">
          <h2>Welcome ${username}!</h2>
          <p>Your email has been verified successfully. You can now enjoy all features of Campus Connect:</p>
          <ul>
            <li> Share photos and videos</li>
            <li> Connect with friends</li>
            <li> Send messages</li>
            <li> Get notifications</li>
            <li> And much more!</li>
          </ul>
          <p>Start exploring and connecting with your campus community now!</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Campus Connect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  getVerificationEmailTemplate,
  getPasswordResetTemplate,
  getWelcomeEmailTemplate
};