import * as nodemailer from 'nodemailer';
import Imap from 'imap';
import { spawn } from 'child_process';
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
    console.log(`Sending email using Python SMTP script`);
    console.log(`From: ${config.email} to: ${to} with subject: ${subject}`);
    
    // Add tracking pixel and wrap links for click tracking
    let htmlBody = body;
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
    
    // Prepare configuration for Python script
    const emailConfig = {
      smtp_host: config.smtpHost,
      smtp_port: config.smtpPort,
      smtp_username: config.smtpUsername,
      smtp_password: config.smtpPassword,
      from_email: config.email,
      from_name: config.fromName || config.email,
      to_email: to,
      subject: subject,
      html_body: htmlBody,
      tracking_pixel_id: trackingPixelId
    };
    
    const configJson = JSON.stringify(emailConfig);
    
    // Execute Python email sender
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [
        './server/email_sender.py',
        '--config',
        configJson
      ]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        console.log(`Python SMTP: ${message.trim()}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error(`Python SMTP Error: ${message.trim()}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0 && output.includes('SUCCESS')) {
          console.log(`Email sent successfully to ${to}`);
          resolve(true);
        } else {
          console.error(`Failed to send email to ${to}. Exit code: ${code}`);
          console.error(`Error output: ${errorOutput}`);
          resolve(false);
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`Failed to start Python email sender: ${error.message}`);
        resolve(false);
      });
    });
    
  } catch (error) {
    console.error('Error in email sending process:', error);
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
