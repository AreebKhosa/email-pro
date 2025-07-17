import nodemailer from 'nodemailer';
import * as Imap from 'imap';
import type { InsertEmailIntegration } from '@shared/schema';

export async function validateEmailIntegration(config: InsertEmailIntegration): Promise<boolean> {
  try {
    // Test SMTP connection
    const smtpTransporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
    });

    await smtpTransporter.verify();

    // Test IMAP connection
    return new Promise((resolve) => {
      const imap = new Imap({
        user: config.imapUsername,
        password: config.imapPassword,
        host: config.imapHost,
        port: config.imapPort,
        tls: true,
      });

      imap.once('ready', () => {
        imap.end();
        resolve(true);
      });

      imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        resolve(false);
      });

      imap.connect();
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
    const transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
    });

    // Add tracking pixel if provided
    let htmlBody = body;
    if (trackingPixelId) {
      htmlBody += `<img src="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/track/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" />`;
    }

    const mailOptions = {
      from: config.email,
      to,
      subject,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
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
