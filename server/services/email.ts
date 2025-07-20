import nodemailer from 'nodemailer';
import Imap from 'imap';
import type { InsertEmailIntegration } from '@shared/schema';

export async function validateEmailIntegration(config: InsertEmailIntegration): Promise<boolean> {
  try {
    console.log('Validating email integration for:', config.email);
    console.log('SMTP Host:', config.smtpHost, 'Port:', config.smtpPort);
    console.log('Username:', config.smtpUsername);
    console.log('Password length:', config.smtpPassword?.length);
    
    // Test SMTP connection
    const smtpTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
      // Add timeout and additional settings for Gmail
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      // Gmail specific settings
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Testing SMTP connection...');
    await smtpTransporter.verify();

    console.log('SMTP connection successful, testing IMAP...');
    
    // Test IMAP connection
    return new Promise((resolve) => {
      try {
        const imap = new Imap({
          user: config.imapUsername,
          password: config.imapPassword,
          host: config.imapHost,
          port: config.imapPort,
          tls: true,
          tlsOptions: { 
            rejectUnauthorized: false 
          },
          connTimeout: 10000,
          authTimeout: 5000,
        });

        imap.once('ready', () => {
          console.log('IMAP connection successful');
          imap.end();
          resolve(true);
        });

        imap.once('error', (err) => {
          console.error('IMAP connection error:', err.message);
          console.error('IMAP Host used:', config.imapHost);
          console.error('IMAP Port used:', config.imapPort);
          resolve(false);
        });

        imap.connect();
      } catch (error) {
        console.error('IMAP constructor error:', error);
        console.error('IMAP Host used:', config.imapHost);
        console.error('IMAP Port used:', config.imapPort);
        // IMAP must work for full email integration functionality
        resolve(false);
      }
    });
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
}

export async function sendEmail(
  config: InsertEmailIntegration,
  to: string,
  subject: string,
  body: string,
  trackingPixelId?: string
): Promise<boolean> {
  try {
    console.log(`Setting up SMTP transporter for ${config.email}`);
    console.log(`SMTP Host: ${config.smtpHost}, Port: ${config.smtpPort}`);
    
    const transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
      // Add timeout and additional settings
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
    });

    // Replace placeholders in the email body with recipient data
    let personalizedBody = body;
    
    // Add tracking pixel and wrap links for click tracking
    let htmlBody = personalizedBody;
    if (trackingPixelId) {
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      
      // Wrap all links with click tracking
      htmlBody = htmlBody.replace(
        /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
        (match, beforeHref, url, afterHref) => {
          const trackingUrl = `https://${domain}/api/track/click/${trackingPixelId}?url=${encodeURIComponent(url)}`;
          return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
        }
      );
      
      // Add tracking pixel at the end
      htmlBody += `<img src="https://${domain}/api/track/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
    }

    const mailOptions = {
      from: `"${config.fromName || config.email}" <${config.email}>`,
      to,
      subject,
      html: htmlBody,
      text: htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    console.log(`Sending email from ${config.email} to ${to} with subject: ${subject}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully! Message ID: ${result.messageId}`);
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

export function generateWarmupContent(): { subject: string; body: string } {
  const subjects = [
    'Quick question about your services',
    'Following up on our conversation',
    'Checking in',
    'Hope you\'re doing well',
    'Quick update',
  ];

  const bodies = [
    'Hi there,\n\nI hope this email finds you well. I wanted to reach out and see how things are going.\n\nBest regards',
    'Hello,\n\nJust wanted to check in and see if you had any questions about what we discussed.\n\nThanks',
    'Hi,\n\nI hope you\'re having a great week. Let me know if there\'s anything I can help with.\n\nBest',
    'Hello,\n\nI wanted to follow up on our previous conversation. Please let me know if you need any additional information.\n\nRegards',
    'Hi there,\n\nI hope everything is going well on your end. Feel free to reach out if you have any questions.\n\nThanks',
  ];

  return {
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)],
  };
}
