import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { setupGoogleAuth, getGmailAuthUrl } from "./services/googleAuth";
import { validateEmailIntegration, sendEmail } from "./services/email";
import { personalizeEmailContent, enhanceEmailContent, scrapeWebsiteContent } from "./services/gemini";
import { createStripeCheckout, handleStripeWebhook } from "./services/stripe";
import { emailValidationService, type EmailValidationResult } from "./services/emailValidation";
import { WarmupService } from "./services/warmup";

const warmupService = new WarmupService();
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
import passport from "passport";

// Helper function to send authentication emails
async function sendAuthEmail(type: 'verification' | 'reset' | 'login_verification', config: any): Promise<boolean> {
  return new Promise((resolve) => {
    const configJson = JSON.stringify(config);
    const child = spawn('python3', ['server/email_auth.py', type, configJson]);
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      console.error('Email script error:', data.toString());
    });
    
    child.on('close', (code) => {
      console.log('Email send result:', output);
      resolve(code === 0);
    });
  });
}
import { 
  insertEmailIntegrationSchema,
  insertRecipientListSchema,
  insertRecipientSchema,
  insertCampaignSchema,
  insertFollowUpSchema
} from "@shared/schema";
import { z } from "zod";

// Plan limits configuration matching your specifications
const planLimits = {
  demo: {
    emailsPerMonth: 1000,
    recipients: 300,
    emailIntegrations: 1,
    deliverabilityChecks: 100,
    personalizedEmails: 30,
    followUps: 0,
    campaigns: 3,
    warmupEmails: 1,
    emailAccounts: 1,
    dailyLimit: 50,
    emailRotation: false
  },
  starter: {
    emailsPerMonth: 50000,
    recipients: 25000,
    emailIntegrations: 10,
    deliverabilityChecks: 10000,
    personalizedEmails: 5000,
    followUps: 1,
    campaigns: Infinity,
    warmupEmails: 10,
    emailAccounts: 10,
    dailyLimit: 1667, // 50k/30 days
    emailRotation: true
  },
  premium: {
    emailsPerMonth: Infinity,
    recipients: Infinity,
    emailIntegrations: Infinity,
    deliverabilityChecks: Infinity,
    personalizedEmails: Infinity,
    followUps: 2,
    campaigns: Infinity,
    warmupEmails: Infinity,
    emailAccounts: Infinity,
    dailyLimit: Infinity,
    emailRotation: true
  }
};

// Campaign sending functionality
async function startCampaignSending(campaignId: number, userId: string) {
  try {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) return;

    const recipients = await storage.getListRecipients(campaign.recipientListId);
    const totalRecipients = recipients.length;
    
    // Update total recipients count
    await storage.updateCampaignStats(campaignId, { totalRecipients });
    
    // Get sending settings and plan limits
    const user = await storage.getUser(userId);
    const limits = planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo;
    
    // Send emails in background with respect to plan limits and sending settings
    sendCampaignEmails(campaignId, recipients, limits, campaign);
  } catch (error) {
    console.error('Error starting campaign:', error);
  }
}

async function sendCampaignEmails(campaignId: number, recipients: any[], limits: any, campaign: any) {
  const delayMs = (campaign.emailDelay || 5) * 60 * 1000; // Convert minutes to milliseconds
  let sentToday = 0;
  const dailyLimit = Math.min(campaign.dailyLimit || 50, limits.emailsPerMonth);
  
  // Get list of recipients who have already been sent emails for this campaign
  const sentEmails = await storage.getCampaignEmails(campaignId);
  const sentRecipientIds = new Set(sentEmails.map(email => email.recipientId));
  
  // Filter out recipients who have already been sent emails
  const remainingRecipients = recipients.filter(recipient => !sentRecipientIds.has(recipient.id));
  
  console.log(`Campaign ${campaignId}: Found ${sentRecipientIds.size} already sent, ${remainingRecipients.length} remaining to send`);
  
  for (let i = 0; i < remainingRecipients.length; i++) {
    // Check if campaign is still in sending status
    const currentCampaign = await storage.getCampaign(campaignId);
    if (currentCampaign?.status !== 'sending') {
      // Don't update currentEmailIndex since we're using sent tracking now
      break;
    }
    
    // Check daily limit
    if (sentToday >= dailyLimit) {
      // Don't update currentEmailIndex since we're using sent tracking now
      // Schedule to continue tomorrow with remaining recipients
      setTimeout(() => {
        if (currentCampaign?.status === 'sending') {
          sendCampaignEmails(campaignId, recipients, limits, campaign);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      break;
    }
    
    try {
      const recipient = remainingRecipients[i];
      
      // Email rotation logic - get the appropriate integration
      let integration;
      console.log(`ROTATION DEBUG - Campaign ${campaignId}: emailRotationEnabled=${campaign.emailRotationEnabled}, emailRotationIds=${JSON.stringify(campaign.emailRotationIds)}, length=${campaign.emailRotationIds?.length}`);
      
      if (campaign.emailRotationEnabled && campaign.emailRotationIds && campaign.emailRotationIds.length > 0) {
        // Calculate which email account to use - use the current loop index for proper rotation
        const emailsPerAccount = campaign.emailsPerAccount || 1; // Default to 1 for "rotate after each email"
        // Use actual emails sent count instead of campaign.sentCount which may not be updated yet
        const alreadySentCount = sentRecipientIds.size; // Number of recipients who already got emails
        const currentSendingIndex = alreadySentCount + sentToday; // Current position in sending sequence
        
        const accountIndex = Math.floor(currentSendingIndex / emailsPerAccount) % campaign.emailRotationIds.length;
        const rotationIntegrationId = campaign.emailRotationIds[accountIndex];
        integration = await storage.getEmailIntegration(rotationIntegrationId);
        console.log(`ROTATION ACTIVE - currentSendingIndex=${currentSendingIndex}, emailsPerAccount=${emailsPerAccount}, accountIndex=${accountIndex}, rotationIntegrationId=${rotationIntegrationId}, using account ${accountIndex + 1}/${campaign.emailRotationIds.length} (${integration?.email})`);
      } else {
        // Use single email account
        integration = await storage.getEmailIntegration(campaign.emailIntegrationId);
        console.log(`NO ROTATION - using primary account ID ${campaign.emailIntegrationId}: ${integration?.email}`);
      }
      
      if (!integration) {
        console.error('No valid email integration found');
        continue;
      }
      
      // Determine email content with fallback logic
      let emailBody;
      let personalizedBody;
      
      // Check personalization logic based on field types
      const hasPersonalizeEmailField = campaign.body.includes('{personalize_email}');
      const hasTraditionalFields = campaign.body.includes('{name}') || campaign.body.includes('{lastName}') || campaign.body.includes('{position}') || campaign.body.includes('{company}');
      
      // Determine email content based on new logic
      if (hasPersonalizeEmailField) {
        // If {personalize_email} field exists
        if (recipient.personalizedEmail && recipient.personalizedEmail.trim()) {
          // Recipient has personalized email - use it to replace {personalize_email}
          emailBody = campaign.body.replace(/{personalize_email}/g, recipient.personalizedEmail);
          console.log(`Using AI-personalized content for ${recipient.email}`);
        } else if (campaign.fallbackToDefault) {
          // No personalized email but fallback enabled - use user-written content with traditional fields
          emailBody = campaign.body.replace(/{personalize_email}/g, ''); // Remove the field if no personalized content
          console.log(`Using fallback content with traditional fields for ${recipient.email}`);
        } else {
          // No personalized email and fallback disabled - skip recipient
          console.log(`Skipping recipient ${recipient.email} - no personalized content and fallback disabled`);
          continue;
        }
      } else {
        // No {personalize_email} field - use traditional field replacement
        emailBody = campaign.body;
        console.log(`Using traditional field replacement for ${recipient.email}`);
      }
      
      // Create tracking pixel ID for open tracking
      const trackingPixelId = `${campaignId}_${recipient.id}_${Date.now()}`;
      
      // Replace dynamic personalization fields with recipient data
      personalizedBody = emailBody;
      
      // New single-brace format fields
      personalizedBody = personalizedBody.replace(/{name}/g, recipient.name || '');
      personalizedBody = personalizedBody.replace(/{firstName}/g, recipient.name || '');
      personalizedBody = personalizedBody.replace(/{lastName}/g, recipient.lastName || '');
      personalizedBody = personalizedBody.replace(/{email}/g, recipient.email || '');
      personalizedBody = personalizedBody.replace(/{company}/g, recipient.companyName || '');
      personalizedBody = personalizedBody.replace(/{companyName}/g, recipient.companyName || '');
      personalizedBody = personalizedBody.replace(/{website}/g, recipient.websiteLink || '');
      personalizedBody = personalizedBody.replace(/{websiteLink}/g, recipient.websiteLink || '');
      personalizedBody = personalizedBody.replace(/{position}/g, recipient.position || '');
      personalizedBody = personalizedBody.replace(/{jobTitle}/g, recipient.position || '');
      
      // Legacy double-brace format fields (for backward compatibility)
      personalizedBody = personalizedBody.replace(/\{\{name\}\}/g, recipient.name || '');
      personalizedBody = personalizedBody.replace(/\{\{firstName\}\}/g, recipient.name || '');
      personalizedBody = personalizedBody.replace(/\{\{lastName\}\}/g, recipient.lastName || '');
      personalizedBody = personalizedBody.replace(/\{\{email\}\}/g, recipient.email || '');
      personalizedBody = personalizedBody.replace(/\{\{company\}\}/g, recipient.companyName || '');
      personalizedBody = personalizedBody.replace(/\{\{companyName\}\}/g, recipient.companyName || '');
      personalizedBody = personalizedBody.replace(/\{\{website\}\}/g, recipient.websiteLink || '');
      personalizedBody = personalizedBody.replace(/\{\{websiteLink\}\}/g, recipient.websiteLink || '');
      personalizedBody = personalizedBody.replace(/\{\{position\}\}/g, recipient.position || '');
      personalizedBody = personalizedBody.replace(/\{\{jobTitle\}\}/g, recipient.position || '');
      
      // Handle any additional dynamic fields defined in the campaign
      if (campaign.dynamicFields && Array.isArray(campaign.dynamicFields)) {
        campaign.dynamicFields.forEach(field => {
          // Support both single and double brace formats
          const singleBracePattern = new RegExp(`\\{${field}\\}`, 'g');
          const doubleBracePattern = new RegExp(`\\{\\{${field}\\}\\}`, 'g');
          const value = (recipient as any)[field] || '';
          personalizedBody = personalizedBody.replace(singleBracePattern, value);
          personalizedBody = personalizedBody.replace(doubleBracePattern, value);
        });
      }
      
      console.log(`Personalizing email for ${recipient.name} ${recipient.lastName} (${recipient.email}) from ${recipient.companyName || 'Unknown Company'}`);
      
      // Send the email using SMTP
      const emailSent = await sendEmail(
        integration,
        recipient.email,
        campaign.subject,
        personalizedBody,
        trackingPixelId
      );
      
      if (!emailSent) {
        console.error(`Failed to send email to ${recipient.email}`);
        continue; // Skip to next recipient
      }

      // Create campaign email record for tracking
      try {
        await storage.createCampaignEmail({
          campaignId,
          recipientId: recipient.id,
          status: 'sent',
          trackingPixelId: trackingPixelId,
          sentAt: new Date(),
        });
      } catch (error) {
        console.error('Error creating campaign email record:', error);
      }
      
      // Update campaign stats - increment sent count
      const currentCampaign = await storage.getCampaign(campaignId);
      const newSentCount = (currentCampaign?.sentCount || 0) + 1;
      await storage.updateCampaignStats(campaignId, { sentCount: newSentCount });
      
      // Update user usage tracking
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getCurrentMonthUsage(campaign.userId);
      const currentEmailsSent = usage?.emailsSent || 0;
      await storage.updateUsage(campaign.userId, currentMonth, {
        emailsSent: currentEmailsSent + 1
      });
      
      sentToday++;
      
      // Add delay between emails
      if (i < remainingRecipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error(`Error sending email to ${remainingRecipients[i]?.email}:`, error);
    }
  }
  
  // Mark campaign as completed if all emails sent
  if (remainingRecipients.length > 0 && sentToday > 0) {
    const updatedCampaign = await storage.getCampaign(campaignId);
    if (updatedCampaign && updatedCampaign.sentCount >= updatedCampaign.totalRecipients) {
      await storage.updateCampaignStatus(campaignId, 'completed');
    }
  }
}

// Follow-up processing function
async function processFollowUps() {
  try {
    console.log('Processing follow-ups...');
    
    // Get all campaigns with follow-up enabled and completed status
    const campaigns = await storage.getAllCampaigns();
    const followUpCampaigns = campaigns.filter(campaign => 
      campaign.followUpEnabled && 
      campaign.status === 'completed'
    );
    
    for (const campaign of followUpCampaigns) {
      // Get campaign emails that were sent but meet follow-up conditions
      const campaignEmails = await storage.getCampaignEmails(campaign.id);
      
      for (const email of campaignEmails) {
        // Check if this email meets follow-up conditions and hasn't had follow-up sent yet
        if (email.followUpId) continue; // Already has follow-up
        
        const sentTime = new Date(email.sentAt!);
        const now = new Date();
        
        // Use days for follow-up delay calculation
        const followUpDays = campaign.followUpDays || 1;
        const timeDiffDays = (now.getTime() - sentTime.getTime()) / (1000 * 60 * 60 * 24);
        
        console.log(`Email ${email.id}: sent ${timeDiffDays.toFixed(1)} days ago, needs ${followUpDays} days delay`);
        
        // If enough time has passed and conditions are met
        if (timeDiffDays >= followUpDays) {
          const shouldSendFollowUp = await checkFollowUpConditions(email, campaign);
          
          if (shouldSendFollowUp) {
            console.log(`Sending follow-up for email ${email.id}`);
            await sendFollowUpEmail(email, campaign);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing follow-ups:', error);
  }
}

// Check if follow-up conditions are met
async function checkFollowUpConditions(email: any, campaign: any): Promise<boolean> {
  if (campaign.followUpCondition === 'not_opened') {
    return !email.openedAt; // No open tracking recorded
  }
  if (campaign.followUpCondition === 'no_reply') {
    // This would require reply tracking - for now just check not opened
    return !email.openedAt;
  }
  return false;
}

// Send follow-up email
async function sendFollowUpEmail(originalEmail: any, campaign: any) {
  try {
    // Get recipient details
    const recipient = await storage.getRecipient(originalEmail.recipientId);
    if (!recipient) return;
    
    // Get email integration with rotation support
    let integration;
    if (campaign.emailRotationEnabled && campaign.emailRotationIds && campaign.emailRotationIds.length > 0) {
      // Get count of follow-up emails already sent for this campaign to determine rotation
      const allFollowUpEmails = await storage.getCampaignEmails(campaign.id);
      const followUpCount = allFollowUpEmails.filter(email => email.followUpId).length;
      
      // Calculate which email account to use for follow-up rotation
      const emailsPerAccount = campaign.emailsPerAccount || 1;
      const accountIndex = Math.floor(followUpCount / emailsPerAccount) % campaign.emailRotationIds.length;
      const rotationIntegrationId = campaign.emailRotationIds[accountIndex];
      integration = await storage.getEmailIntegration(rotationIntegrationId);
      
      console.log(`FOLLOW-UP ROTATION - followUpCount=${followUpCount}, accountIndex=${accountIndex}, using account ${accountIndex + 1}/${campaign.emailRotationIds.length} (${integration?.email})`);
    } else {
      // Use single email account for follow-ups
      integration = await storage.getEmailIntegration(campaign.emailIntegrationId);
      console.log(`FOLLOW-UP NO ROTATION - using primary account: ${integration?.email}`);
    }
    
    if (!integration) return;
    
    // Create tracking pixel for follow-up
    const trackingPixelId = `${campaign.id}_${recipient.id}_followup_${Date.now()}`;
    
    // Personalize follow-up content
    let personalizedSubject = campaign.followUpSubject || 'Follow-up';
    let personalizedBody = campaign.followUpBody || 'Follow-up message';
    
    // Apply personalization
    personalizedSubject = personalizedSubject.replace(/{name}/g, recipient.name || '');
    personalizedSubject = personalizedSubject.replace(/{lastName}/g, recipient.lastName || '');
    personalizedSubject = personalizedSubject.replace(/{company}/g, recipient.companyName || '');
    
    personalizedBody = personalizedBody.replace(/{name}/g, recipient.name || '');
    personalizedBody = personalizedBody.replace(/{lastName}/g, recipient.lastName || '');
    personalizedBody = personalizedBody.replace(/{company}/g, recipient.companyName || '');
    personalizedBody = personalizedBody.replace(/{email}/g, recipient.email || '');
    personalizedBody = personalizedBody.replace(/{position}/g, recipient.position || '');
    
    // Add tracking pixel (using correct endpoint)
    personalizedBody += `\n\n<img src="http://localhost:5000/api/track/pixel/${trackingPixelId}" width="1" height="1" style="display: none;" />`;
    
    // Send the follow-up email
    const emailSent = await sendEmail(
      integration,
      recipient.email,
      personalizedSubject,
      personalizedBody,
      trackingPixelId
    );
    
    if (emailSent) {
      // Create follow-up email record
      await storage.createCampaignEmail({
        campaignId: campaign.id,
        recipientId: recipient.id,
        followUpId: originalEmail.id, // Link to original email
        status: 'sent',
        trackingPixelId: trackingPixelId,
        sentAt: new Date(),
      });
      
      console.log(`Follow-up sent successfully to ${recipient.email}`);
    }
  } catch (error) {
    console.error('Error sending follow-up email:', error);
  }
}

// Start follow-up processing interval (check every minute)
setInterval(processFollowUps, 60 * 1000); // Run every minute

// Plan validation function
async function checkPlanLimits(userId: string, resource: string, amount: number = 1): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  const limits = planLimits[user.plan as keyof typeof planLimits];
  if (!limits) return false;

  const usage = await storage.getCurrentMonthUsage(userId);
  const currentUsage = usage || {
    emailsSent: 0,
    recipientsUploaded: 0,
    deliverabilityChecks: 0,
    personalizedEmails: 0,
    warmupEmails: 0,
  };

  switch (resource) {
    case 'emails':
      return (currentUsage.emailsSent || 0) + amount <= limits.emailsPerMonth;
    case 'recipients':
      return (currentUsage.recipientsUploaded || 0) + amount <= limits.recipients;
    case 'deliverability':
      return (currentUsage.deliverabilityChecks || 0) + amount <= limits.deliverabilityChecks;
    case 'personalization':
      return (currentUsage.personalizedEmails || 0) + amount <= limits.personalizedEmails;
    case 'warmup':
      return (currentUsage.warmupEmails || 0) + amount <= limits.warmupEmails;
    case 'emailIntegrations':
      const integrations = await storage.getUserEmailIntegrations(userId);
      return integrations.length < limits.emailIntegrations;
    default:
      return false;
  }
}



// Send verification email using Python script
async function sendVerificationEmail(config: {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  to_email: string;
  user_name: string;
  verification_link: string;
}): Promise<void> {
  console.log('Preparing verification email with config:', {
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port,
    smtp_username: config.smtp_username,
    smtp_password: '[HIDDEN]',
    from_email: config.from_email,
    to_email: config.to_email,
    user_name: config.user_name,
    verification_link: config.verification_link
  });

  // Prepare config for Python script
  const pythonConfig = {
    smtp_config: {
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_username: config.smtp_username,
      smtp_password: config.smtp_password,
      from_email: config.from_email
    },
    to_email: config.to_email,
    user_name: config.user_name,
    verification_link: config.verification_link
  };

  return new Promise<void>((resolve, reject) => {
    const pythonScript = spawn('python3', [
      'server/email_auth.py', 
      'verification', 
      JSON.stringify(pythonConfig)
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    pythonScript.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    pythonScript.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    pythonScript.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Verification email sending failed with code ${code}`));
      }
    });
  });
}

// Enhanced authentication middleware for manual users
const isAuthenticated = (req: any, res: any, next: any) => {
  // Check for OAuth users
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  // Check for manual auth users in session
  if (req.session?.manualUser) {
    req.user = req.session.manualUser;
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Auth middleware setup
  await setupAuth(app);

  // Manual Authentication Routes
  // User signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = crypto.randomUUID();
      const user = await storage.createUser({
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
        plan: 'demo'
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt
      });

      // Try to send verification email using admin SMTP settings
      try {
        console.log('Starting email verification process...');
        // Get admin SMTP configuration
        const smtpHostConfig = await storage.getConfig('smtp_host');
        const smtpPortConfig = await storage.getConfig('smtp_port');
        const smtpUsernameConfig = await storage.getConfig('smtp_username');
        const smtpPasswordConfig = await storage.getConfig('smtp_password');
        const smtpFromEmailConfig = await storage.getConfig('smtp_from_email');
        
        console.log('Retrieved SMTP configs:', {
          hasHost: !!smtpHostConfig,
          hasPort: !!smtpPortConfig,
          hasUsername: !!smtpUsernameConfig,
          hasPassword: !!smtpPasswordConfig,
          hasFromEmail: !!smtpFromEmailConfig
        });
        
        if (smtpHostConfig && smtpUsernameConfig && smtpPasswordConfig && smtpFromEmailConfig) {
          console.log('Admin SMTP config found:', {
            host: smtpHostConfig.configValue,
            port: smtpPortConfig?.configValue,
            username: smtpUsernameConfig.configValue,
            fromEmail: smtpFromEmailConfig.configValue
          });
          
          // Send verification email
          const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}`;
          
          const emailConfig = {
            smtp_config: {
              smtp_host: smtpHostConfig.configValue,
              smtp_port: parseInt(smtpPortConfig?.configValue || '587'),
              smtp_username: smtpUsernameConfig.configValue,
              smtp_password: smtpPasswordConfig.configValue,
              from_email: smtpFromEmailConfig.configValue
            },
            to_email: email,
            verification_link: verificationLink,
            user_name: firstName
          };

          console.log('Attempting to send verification email to:', email);
          await sendAuthEmail('verification', emailConfig);
          console.log('Verification email sent successfully');
          res.json({ 
            message: 'Account created successfully. Please check your email to verify your account.',
            userId: user.id 
          });
        } else {
          console.log('Admin SMTP not configured. Missing configs:', {
            host: !!smtpHostConfig,
            username: !!smtpUsernameConfig,
            password: !!smtpPasswordConfig,
            fromEmail: !!smtpFromEmailConfig
          });
          // No admin SMTP configured, auto-verify for now
          await storage.updateUserEmailVerified(user.id, true);
          res.json({ 
            message: 'Account created successfully. You can now log in. (Email verification disabled - no SMTP configured)',
            userId: user.id 
          });
        }
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Auto-verify if email sending fails
        await storage.updateUserEmailVerified(user.id, true);
        res.json({ 
          message: 'Account created successfully. You can now log in. (Email verification failed)',
          userId: user.id 
        });
      }

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  // Email verification
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      // Clean up expired tokens
      await storage.deleteExpiredEmailVerificationTokens();

      // Find verification token
      const verificationToken = await storage.getEmailVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      // Check if token is expired
      if (verificationToken.expiresAt < new Date()) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).json({ message: 'Verification token has expired' });
      }

      // Update user as verified
      await storage.updateUserEmailVerified(verificationToken.userId, true);
      
      // Delete the used token
      await storage.deleteEmailVerificationToken(token);

      res.json({ message: 'Email verified successfully. You can now log in.' });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Failed to verify email' });
    }
  });

  // Manual login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, verificationCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(401).json({ message: 'Please verify your email before logging in' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Get user's IP address and user agent
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || '';

      // Check if IP is trusted
      const isTrustedIp = await storage.isIpTrusted(user.id, ipAddress);

      if (!isTrustedIp) {
        // If verification code is provided, verify it
        if (verificationCode) {
          const validCode = await storage.getLoginVerificationCode(verificationCode, user.id);
          
          if (!validCode) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
          }

          // Mark code as used
          await storage.markLoginVerificationCodeUsed(validCode.id);

          // Add IP as trusted
          await storage.addTrustedIp(user.id, ipAddress, userAgent);
        } else {
          // Generate and send verification code
          const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

          await storage.createLoginVerificationCode({
            userId: user.id,
            code,
            ipAddress,
            userAgent,
            expiresAt,
            isUsed: false,
          });

          // Try to send verification email
          try {
            const smtpHostConfig = await storage.getConfig('smtp_host');
            const smtpPortConfig = await storage.getConfig('smtp_port');
            const smtpUsernameConfig = await storage.getConfig('smtp_username');
            const smtpPasswordConfig = await storage.getConfig('smtp_password');
            const smtpFromEmailConfig = await storage.getConfig('smtp_from_email');

            if (smtpHostConfig && smtpUsernameConfig && smtpPasswordConfig && smtpFromEmailConfig) {
              const emailConfig = {
                smtp_config: {
                  smtp_host: smtpHostConfig.configValue,
                  smtp_port: parseInt(smtpPortConfig?.configValue || '587'),
                  smtp_username: smtpUsernameConfig.configValue,
                  smtp_password: smtpPasswordConfig.configValue,
                  from_email: smtpFromEmailConfig.configValue
                },
                to_email: user.email,
                verification_code: code,
                user_name: user.firstName || user.email,
                ip_address: ipAddress,
                location: 'Unknown' // You can integrate with IP geolocation service later
              };

              await sendAuthEmail('login_verification', emailConfig);
              
              return res.status(200).json({ 
                requiresVerification: true,
                message: 'New device detected. Please check your email for a verification code to complete login.'
              });
            } else {
              // No SMTP configured, auto-trust the IP
              await storage.addTrustedIp(user.id, ipAddress, userAgent);
            }
          } catch (emailError) {
            console.error('Failed to send login verification email:', emailError);
            // Auto-trust the IP if email fails
            await storage.addTrustedIp(user.id, ipAddress, userAgent);
          }
        }
      } else {
        // Update last used time for trusted IP
        await storage.updateTrustedIpLastUsed(user.id, ipAddress);
      }

      // Create session manually
      req.session.manualUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        plan: user.plan,
        isManualAuth: true
      };
      
      res.json({ 
        message: 'Login successful', 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          plan: user.plan
        } 
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to log in' });
    }
  });

  // Forget password
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: 'If an account with this email exists, a password reset link will be sent.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });

      res.json({ message: 'If an account with this email exists, a password reset link will be sent.' });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Admin authentication routes
  const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

  // Create default admin user
  app.post('/api/admin/create-default', async (req, res) => {
    try {
      const { username = 'admin', password = 'admin123456' } = req.body;
      
      // Check if admin already exists
      const existingAdmin = await storage.getAdminByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin user already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      const adminUser = await storage.createAdminUser({
        username,
        password: hashedPassword
      });

      res.json({ 
        message: 'Admin user created successfully',
        username: adminUser.username
      });

    } catch (error) {
      console.error('Admin creation error:', error);
      res.status(500).json({ message: 'Failed to create admin user' });
    }
  });

  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Get admin user
      const adminUser = await storage.getAdminByUsername(username);
      if (!adminUser) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, adminUser.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await storage.updateAdminLastLogin(adminUser.id);

      // Generate JWT token
      const token = jwt.sign(
        { adminId: adminUser.id, username: adminUser.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        message: 'Login successful',
        token,
        admin: {
          id: adminUser.id,
          username: adminUser.username
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Admin auth middleware
  const adminAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const adminUser = await storage.getAdminByUsername(decoded.username);
      if (!adminUser) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      req.admin = adminUser;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Get admin configuration
  app.get('/api/admin/config', adminAuth, async (req, res) => {
    try {
      const configs = await storage.getAllConfig();
      
      // Transform into easy-to-use object
      const configObj: any = {};
      configs.forEach(config => {
        configObj[config.configKey] = config.configValue;
      });

      res.json(configObj);
    } catch (error) {
      console.error('Get config error:', error);
      res.status(500).json({ message: 'Failed to get configuration' });
    }
  });

  // Update admin configuration
  app.put('/api/admin/config', adminAuth, async (req, res) => {
    try {
      const {
        geminiApiKey,
        stripeSecretKey,
        stripePublicKey,
        stripeStarterPriceId,
        stripeProPriceId,
        stripePremiumPriceId,
        googleClientId,
        googleClientSecret,
        smtpHost,
        smtpPort,
        smtpUsername,
        smtpPassword,
        smtpFromEmail
      } = req.body;

      // Store each config value (marked as secret for sensitive data)
      const configUpdates = [
        { key: 'gemini_api_key', value: geminiApiKey, secret: true },
        { key: 'stripe_secret_key', value: stripeSecretKey, secret: true },
        { key: 'stripe_public_key', value: stripePublicKey, secret: false },
        { key: 'stripe_starter_price_id', value: stripeStarterPriceId, secret: false },
        { key: 'stripe_pro_price_id', value: stripeProPriceId, secret: false },
        { key: 'stripe_premium_price_id', value: stripePremiumPriceId, secret: false },
        { key: 'google_client_id', value: googleClientId, secret: false },
        { key: 'google_client_secret', value: googleClientSecret, secret: true },
        { key: 'smtp_host', value: smtpHost, secret: false },
        { key: 'smtp_port', value: smtpPort?.toString(), secret: false },
        { key: 'smtp_username', value: smtpUsername, secret: false },
        { key: 'smtp_password', value: smtpPassword, secret: true },
        { key: 'smtp_from_email', value: smtpFromEmail, secret: false },
      ];

      // Update each config value
      for (const config of configUpdates) {
        if (config.value !== undefined && config.value !== null && config.value !== '') {
          await storage.setConfig(config.key, config.value, config.secret);
        }
      }

      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Update config error:', error);
      res.status(500).json({ message: 'Failed to update configuration' });
    }
  });

  // Test email sending route
  app.post('/api/admin/test-email', adminAuth, async (req, res) => {
    try {
      const { testEmail } = req.body;
      
      if (!testEmail) {
        return res.status(400).json({ message: 'Test email address is required' });
      }

      // Get admin SMTP configuration
      const smtpHostConfig = await storage.getConfig('smtp_host');
      const smtpPortConfig = await storage.getConfig('smtp_port');
      const smtpUsernameConfig = await storage.getConfig('smtp_username');
      const smtpPasswordConfig = await storage.getConfig('smtp_password');
      const smtpFromEmailConfig = await storage.getConfig('smtp_from_email');
      
      if (!smtpHostConfig || !smtpUsernameConfig || !smtpPasswordConfig || !smtpFromEmailConfig) {
        return res.status(400).json({ message: 'SMTP configuration incomplete' });
      }

      // Test verification email
      const testVerificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=test123`;
      
      const emailConfig = {
        smtp_config: {
          smtp_host: smtpHostConfig.configValue,
          smtp_port: parseInt(smtpPortConfig?.configValue || '587'),
          smtp_username: smtpUsernameConfig.configValue,
          smtp_password: smtpPasswordConfig.configValue,
          from_email: smtpFromEmailConfig.configValue
        },
        to_email: testEmail,
        verification_link: testVerificationLink,
        user_name: 'Test User'
      };

      console.log('Testing email with config:', emailConfig);
      await sendAuthEmail('verification', emailConfig);
      console.log('Test email sent successfully');
      
      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ message: 'Failed to send test email: ' + error.message });
    }
  });

  // Admin setup route
  app.post('/api/admin/setup', async (req, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;

      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin user already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user with fixed ID "admin"
      const adminUser = await storage.createUser({
        id: "admin",
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: true,
        plan: 'premium' // Give admin premium access
      });

      res.json({ 
        message: 'Admin user created successfully',
        userId: adminUser.id 
      });

    } catch (error) {
      console.error('Admin setup error:', error);
      res.status(500).json({ message: 'Failed to create admin user' });
    }
  });

  // Reset password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Clean up expired tokens
      await storage.deleteExpiredPasswordResetTokens();

      // Find reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUser(resetToken.userId, { 
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      // Delete the used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: 'Password reset successfully. You can now log in with your new password.' });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Handle both Replit OAuth and manual authentication
      let user = null;
      
      // Check for manual authentication session first
      if (req.session?.manualUser) {
        user = await storage.getUser(req.session.manualUser.id);
      }
      // Then check for OAuth authentication
      else if (req.user?.claims?.sub) {
        user = await storage.getUser(req.user.claims.sub);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { firstName, lastName, email } = req.body;
      const updateData: any = {};
      
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;

      await storage.updateUser(userId, updateData);
      
      // Return the updated user data
      const updatedUser = await storage.getUser(userId);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Object storage routes for profile pictures
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub || req.session?.manualUser?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Profile picture update endpoint
  app.put("/api/profile/picture", isAuthenticated, async (req, res) => {
    if (!req.body.profileImageURL) {
      return res.status(400).json({ error: "profileImageURL is required" });
    }

    const userId = req.user?.claims?.sub || req.session?.manualUser?.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profileImageURL,
        {
          owner: userId,
          visibility: "public", // Profile images should be public
        },
      );

      // Update user's profile image in database
      await storage.updateUser(userId, { profileImageUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Google OAuth setup
  const setupGoogleOAuth = async () => {
    try {
      // Try to get credentials from environment variables first (if provided by Replit Secrets)
      let googleClientId = process.env.GOOGLE_CLIENT_ID;
      let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

      // If not in env vars, try to get from admin config
      if (!googleClientId || !googleClientSecret) {
        try {
          const clientIdConfig = await storage.getConfig('google_client_id');
          const clientSecretConfig = await storage.getConfig('google_client_secret');
          
          googleClientId = googleClientId || clientIdConfig?.configValue;
          googleClientSecret = googleClientSecret || clientSecretConfig?.configValue;
        } catch (error) {
          console.log('Google OAuth config not found in database, checking env vars only');
        }
      }

      if (googleClientId && googleClientSecret) {
        const { Strategy: GoogleStrategy } = await import('passport-google-oauth20');
        
        passport.use(new GoogleStrategy({
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${process.env.NODE_ENV === 'production' ? 'https://' + (process.env.REPLIT_DOMAINS || 'localhost:5000') : 'http://localhost:5000'}/api/auth/google/callback`
        }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
          try {
            // Check if user exists with this Google ID
            let user = await storage.getUserByEmail(profile.emails[0].value);
            
            if (!user) {
              // Create new user with Google profile
              user = await storage.createUser({
                id: Date.now().toString(),
                email: profile.emails[0].value,
                firstName: profile.name.givenName || profile.displayName?.split(' ')[0] || '',
                lastName: profile.name.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
                password: '', // No password for OAuth users
                emailVerified: true, // Google email is already verified
                plan: 'demo',
                profileImageUrl: profile.photos?.[0]?.value
              });
            } else if (!user.emailVerified) {
              // If user exists but email not verified, verify it via Google
              await storage.updateUser(user.id, { 
                emailVerified: true,
                profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl
              });
            }
            
            return done(null, user);
          } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
          }
        }));
        
        console.log('Google OAuth configured successfully');
      } else {
        console.log('Google OAuth credentials not available');
      }
    } catch (error) {
      console.error('Error setting up Google OAuth:', error);
    }
  };

  // Initialize Google OAuth
  setupGoogleOAuth();

  // Google OAuth routes
  app.get('/api/auth/google', async (req, res, next) => {
    // Check if Google OAuth is configured
    const hasGoogleClientId = process.env.GOOGLE_CLIENT_ID || (await storage.getConfig('google_client_id'))?.configValue;
    if (!hasGoogleClientId) {
      return res.status(501).json({ message: "Google OAuth not configured. Please configure it in admin panel." });
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    (req, res) => {
      // Set manual user session for consistency
      if (req.user) {
        req.session.manualUser = req.user;
      }
      res.redirect('/?google_login=success');
    }
  );

  // Manual login/register routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('=== REGISTER REQUEST STARTED ===');
      const { firstName, lastName, email, password } = req.body;
      console.log('Register data:', { firstName, lastName, email, password: '[HIDDEN]' });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await storage.createUser({
        id: Date.now().toString(), // Generate unique ID
        email,
        firstName,
        lastName,
        password: hashedPassword,
        emailVerified: false,
      });

      console.log('User created with ID:', user.id);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt
      });

      console.log('Verification token created:', verificationToken);

      // Try to send verification email using admin SMTP settings
      try {
        console.log('Starting email verification process...');
        // Get admin SMTP configuration
        const smtpHostConfig = await storage.getConfig('smtp_host');
        const smtpPortConfig = await storage.getConfig('smtp_port');
        const smtpUsernameConfig = await storage.getConfig('smtp_username');
        const smtpPasswordConfig = await storage.getConfig('smtp_password');
        const smtpFromEmailConfig = await storage.getConfig('smtp_from_email');
        
        console.log('Retrieved SMTP configs:', {
          hasHost: !!smtpHostConfig,
          hasPort: !!smtpPortConfig,
          hasUsername: !!smtpUsernameConfig,
          hasPassword: !!smtpPasswordConfig,
          hasFromEmail: !!smtpFromEmailConfig
        });

        if (smtpHostConfig && smtpPortConfig && smtpUsernameConfig && smtpPasswordConfig && smtpFromEmailConfig) {
          const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}`;
          
          console.log('Attempting to send verification email to:', email);
          console.log('Verification link:', verificationLink);

          // Send verification email
          await sendVerificationEmail({
            smtp_host: smtpHostConfig.configValue || smtpHostConfig,
            smtp_port: parseInt(smtpPortConfig.configValue || smtpPortConfig),
            smtp_username: smtpUsernameConfig.configValue || smtpUsernameConfig,
            smtp_password: smtpPasswordConfig.configValue || smtpPasswordConfig,
            from_email: smtpFromEmailConfig.configValue || smtpFromEmailConfig,
            to_email: email,
            user_name: `${firstName} ${lastName}`,
            verification_link: verificationLink
          });

          console.log('✓ Verification email sent successfully to:', email);
          res.json({ 
            message: "User created successfully. Please check your email to verify your account.", 
            userId: user.id 
          });
        } else {
          console.log('❌ SMTP configuration incomplete - cannot send verification email');
          res.json({ 
            message: "User created successfully, but email verification is not configured.", 
            userId: user.id 
          });
        }
      } catch (emailError) {
        console.error('❌ Error sending verification email:', emailError);
        res.json({ 
          message: "User created successfully, but verification email could not be sent. Please contact support.", 
          userId: user.id 
        });
      }

    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Resend verification email route
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Delete any existing verification tokens for this user
      await storage.deleteEmailVerificationTokensByUserId(user.id);

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt
      });

      console.log(`Resend verification token created: ${verificationToken}`);

      // Send verification email
      const emailSent = await sendVerificationEmail(
        email,
        `${user.firstName} ${user.lastName}`,
        verificationToken
      );

      if (emailSent) {
        res.status(200).json({ 
          message: "Verification email sent successfully. Please check your inbox." 
        });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }

    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Email verification route
  app.get('/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Invalid Verification Link</h2>
              <p>The verification link is invalid or missing. Please try again or request a new verification email.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Clean up expired tokens first
      await storage.deleteExpiredEmailVerificationTokens();

      // Find and validate token
      const verificationToken = await storage.getEmailVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Invalid or Expired Token</h2>
              <p>This verification link is invalid or has expired. Please try signing up again or request a new verification email.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Check if token is expired
      if (verificationToken.expiresAt < new Date()) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Expired</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Verification Link Expired</h2>
              <p>This verification link has expired. Please sign up again to receive a new verification email.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Mark user as verified
      await storage.updateUser(verificationToken.userId, {
        emailVerified: true,
        updatedAt: new Date()
      });

      // Delete the used token
      await storage.deleteEmailVerificationToken(token);

      // Return success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { background-color: #d4edda; color: #155724; padding: 30px; border-radius: 5px; margin-bottom: 20px; }
            .login-button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
            }
            .login-button:hover { background-color: #0056b3; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>🎉 Email Verified Successfully!</h2>
            <p>Your email address has been verified. You can now log in to your account and start using our email marketing platform.</p>
          </div>
          <a href="/login" class="login-button">Log In to Your Account</a>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Verification Error</h2>
            <p>An error occurred during email verification. Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const stats = await storage.getDashboardStats(userId);
      const usage = await storage.getCurrentMonthUsage(userId);
      const user = await storage.getUser(userId);
      const emailIntegrations = await storage.getUserEmailIntegrations(userId);
      
      res.json({
        ...stats,
        usage: {
          emailsSent: usage?.emailsSent || 0,
          recipientsUploaded: usage?.recipientsUploaded || 0,
          deliverabilityChecks: usage?.deliverabilityChecks || 0,
          personalizedEmails: usage?.personalizedEmails || 0,
          warmupEmails: usage?.warmupEmails || 0,
          emailIntegrations: emailIntegrations.length,
        },
        planLimits: planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Plan validation endpoint
  app.get('/api/plan/limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const limits = planLimits[user.plan as keyof typeof planLimits] || planLimits.demo;
      res.json(limits);
    } catch (error) {
      console.error("Error fetching plan limits:", error);
      res.status(500).json({ message: "Failed to fetch plan limits" });
    }
  });

  // Check if user can perform an action based on plan limits
  app.post('/api/plan/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { resource, amount = 1 } = req.body;
      
      const canPerform = await checkPlanLimits(userId, resource, amount);
      res.json({ allowed: canPerform });
    } catch (error) {
      console.error("Error checking plan limits:", error);
      res.status(500).json({ message: "Failed to check plan limits" });
    }
  });

  // User stats for usage tracking
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const usage = await storage.getCurrentMonthUsage(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        deliverabilityChecksUsed: usage?.deliverabilityChecks || 0,
        recipientCount: usage?.recipientsUploaded || 0,
        emailsSent: usage?.emailsSent || 0,
        personalizationsUsed: usage?.personalizedEmails || 0,
        warmupEmails: usage?.warmupEmails || 0,
        planLimits: planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Email integrations
  app.get('/api/email-integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const integrations = await storage.getUserEmailIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching email integrations:", error);
      res.status(500).json({ message: "Failed to fetch email integrations" });
    }
  });

  // Gmail OAuth auth URL endpoint
  app.post('/api/email-integrations/gmail-auth-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      const authUrl = await getGmailAuthUrl(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Gmail auth URL:", error);
      res.status(500).json({ message: "Failed to generate Gmail auth URL" });
    }
  });

  app.post('/api/email-integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.id;
      
      // Check plan limits
      const canAdd = await checkPlanLimits(userId, 'emailIntegrations');
      if (!canAdd) {
        return res.status(403).json({ message: "Plan limit reached for email integrations" });
      }

      const data = insertEmailIntegrationSchema.parse(req.body);
      
      // For SMTP connections, validate the connection
      if (data.connectionType === 'smtp') {
        const isValid = await validateEmailIntegration(data);
        if (!isValid) {
          return res.status(400).json({ message: "Email integration validation failed" });
        }
      }

      const integration = await storage.createEmailIntegration(userId, data);
      
      // Mark SMTP integrations as verified after successful validation
      if (data.connectionType === 'smtp') {
        await storage.updateEmailIntegrationVerification(integration.id, true);
      }
      
      res.json(integration);
    } catch (error) {
      console.error("Error creating email integration:", error);
      res.status(500).json({ message: "Failed to create email integration" });
    }
  });

  app.delete('/api/email-integrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmailIntegration(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email integration:", error);
      res.status(500).json({ message: "Failed to delete email integration" });
    }
  });

  app.post('/api/email-integrations/:id/toggle-warmup', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { enabled } = req.body;
      const integration = await storage.toggleWarmup(id, enabled);
      res.json(integration);
    } catch (error) {
      console.error("Error toggling warmup:", error);
      res.status(500).json({ message: "Failed to toggle warmup" });
    }
  });

  // Recipient lists
  app.get('/api/recipient-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const lists = await storage.getUserRecipientLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching recipient lists:", error);
      res.status(500).json({ message: "Failed to fetch recipient lists" });
    }
  });

  // Check personalization status for a recipient list
  app.get('/api/recipient-lists/:id/personalization-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }

      // Get recipients for this list  
      const recipients = await storage.getListRecipients(listId);
      
      // Verify list belongs to user
      const recipientList = await storage.getRecipientList(listId);
      if (!recipientList || recipientList.userId !== userId) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Check personalization status
      const totalRecipients = recipients.length;
      const personalizedRecipients = recipients.filter(r => r.personalizedEmail && r.personalizedEmail.trim() !== '').length;
      const hasAllPersonalized = totalRecipients > 0 && personalizedRecipients === totalRecipients;
      
      // Get sample personalized data for preview (first 3 recipients)
      const sampleData = recipients.slice(0, 3).map(recipient => ({
        name: recipient.name || recipient.email.split('@')[0],
        email: recipient.email,
        company: recipient.companyName,
        hasPersonalizedEmail: !!recipient.personalizedEmail,
        personalizedEmailPreview: recipient.personalizedEmail ? recipient.personalizedEmail.substring(0, 150) + '...' : null
      }));

      res.json({
        totalRecipients,
        personalizedRecipients,
        hasAllPersonalized,
        personalizationPercentage: totalRecipients > 0 ? Math.round((personalizedRecipients / totalRecipients) * 100) : 0,
        sampleData
      });
    } catch (error) {
      console.error('Get personalization status error:', error);
      res.status(500).json({ message: 'Failed to get personalization status' });
    }
  });

  app.post('/api/recipient-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const data = insertRecipientListSchema.parse(req.body);
      const list = await storage.createRecipientList(userId, data);
      res.json(list);
    } catch (error) {
      console.error("Error creating recipient list:", error);
      res.status(500).json({ message: "Failed to create recipient list" });
    }
  });

  app.get('/api/recipient-lists/:id/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const recipients = await storage.getListRecipients(listId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.post('/api/recipient-lists/:id/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      const { recipients: recipientData } = req.body;

      // Check plan limits
      const canAdd = await checkPlanLimits(userId, 'recipients', recipientData.length);
      if (!canAdd) {
        return res.status(403).json({ message: "Your uploaded list exceeds your plan limit. Please upgrade your plan to add more recipients." });
      }

      const validatedRecipients = recipientData.map((r: any) => 
        insertRecipientSchema.parse({ ...r, listId })
      );

      const recipients = await storage.addRecipients(validatedRecipients);

      // Update usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getCurrentMonthUsage(userId);
      await storage.updateUsage(userId, currentMonth, {
        recipientsUploaded: (usage?.recipientsUploaded || 0) + recipients.length,
      });

      res.json(recipients);
    } catch (error) {
      console.error("Error adding recipients:", error);
      res.status(500).json({ message: "Failed to add recipients" });
    }
  });

  // Deliverability checking
  app.post('/api/recipients/:id/check-deliverability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const recipientId = parseInt(req.params.id);

      // Check plan limits
      const canCheck = await checkPlanLimits(userId, 'deliverability');
      if (!canCheck) {
        return res.status(403).json({ message: "Plan limit reached for deliverability checks" });
      }

      // Enhanced email validation with Python service
      const recipient = await storage.getRecipient(recipientId);
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      try {
        const validationResult = await emailValidationService.validateEmail(recipient.email);
        const status = emailValidationService.getDeliverabilityStatus(validationResult);
        
        await storage.updateRecipientDeliverability(recipientId, status);
        
        // Update usage
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await storage.getCurrentMonthUsage(userId);
        await storage.updateUsage(userId, currentMonth, {
          deliverabilityChecks: (usage?.deliverabilityChecks || 0) + 1,
        });
        
        res.json({ 
          status,
          details: validationResult,
          reason: emailValidationService.getValidationReason(validationResult)
        });
      } catch (error) {
        console.error("Email validation error:", error);
        // Fallback to basic validation
        const fallbackStatus = 'risky'; // Conservative fallback
        await storage.updateRecipientDeliverability(recipientId, fallbackStatus);
        
        // Update usage
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await storage.getCurrentMonthUsage(userId);
        await storage.updateUsage(userId, currentMonth, {
          deliverabilityChecks: (usage?.deliverabilityChecks || 0) + 1,
        });
        
        res.json({ 
          status: fallbackStatus,
          reason: 'Validation service unavailable - marked as risky'
        });
      }
    } catch (error) {
      console.error("Error checking deliverability:", error);
      res.status(500).json({ message: "Failed to check deliverability" });
    }
  });

  app.post('/api/recipient-lists/:id/check-deliverability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      
      const recipients = await storage.getListRecipients(listId);
      
      // Check plan limits
      const canCheck = await checkPlanLimits(userId, 'deliverability', recipients.length);
      if (!canCheck) {
        return res.status(403).json({ message: "Plan limit reached for deliverability checks" });
      }

      const results = { valid: 0, risky: 0, invalid: 0 };
      
      // Extract emails for bulk validation
      const emails = recipients.map(r => r.email);
      
      try {
        const validationResults = await emailValidationService.validateEmails(emails);
        
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          const validationResult = validationResults[i];
          const status = emailValidationService.getDeliverabilityStatus(validationResult);
          
          await storage.updateRecipientDeliverability(recipient.id, status);
          results[status as keyof typeof results]++;
        }
      } catch (error) {
        console.error("Bulk email validation error:", error);
        // Fallback to conservative marking
        for (const recipient of recipients) {
          const status = 'risky'; // Conservative fallback
          await storage.updateRecipientDeliverability(recipient.id, status);
          results[status as keyof typeof results]++;
        }
      }

      // Update usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getCurrentMonthUsage(userId);
      await storage.updateUsage(userId, currentMonth, {
        deliverabilityChecks: (usage?.deliverabilityChecks || 0) + recipients.length,
      });

      res.json(results);
    } catch (error) {
      console.error("Error checking list deliverability:", error);
      res.status(500).json({ message: "Failed to check deliverability" });
    }
  });

  // Remove invalid emails from list
  app.post('/api/recipient-lists/:id/remove-invalid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      
      const removedCount = await storage.removeInvalidRecipients(listId);
      
      res.json({ removedCount });
    } catch (error) {
      console.error("Error removing invalid recipients:", error);
      res.status(500).json({ message: "Failed to remove invalid recipients" });
    }
  });

  // Export clean list (valid emails only)
  app.get('/api/recipient-lists/:id/export-clean', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      
      const cleanRecipients = await storage.getCleanRecipients(listId);
      
      // Generate CSV
      const csvHeader = 'Name,Last Name,Email,Company,Position\n';
      const csvRows = cleanRecipients.map(r => 
        `"${r.name || ''}","${r.lastName || ''}","${r.email}","${r.companyName || ''}","${r.position || ''}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="clean-list-${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting clean list:", error);
      res.status(500).json({ message: "Failed to export clean list" });
    }
  });

  // Delete recipient
  app.delete('/api/recipients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recipientId = parseInt(req.params.id);
      
      await storage.deleteRecipient(recipientId);
      
      // Update recipient counts for all lists (but don't decrease upload usage)
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      await storage.updateAllRecipientCounts(userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipient:", error);
      res.status(500).json({ message: "Failed to delete recipient" });
    }
  });

  // Delete recipient list
  app.delete('/api/recipient-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      
      // First delete all recipients in the list
      const recipients = await storage.getListRecipients(listId);
      for (const recipient of recipients) {
        await storage.deleteRecipient(recipient.id);
      }
      
      // Then delete the list
      await storage.deleteRecipientList(listId);
      res.json({ message: "Recipient list deleted successfully" });
    } catch (error) {
      console.error("Error deleting recipient list:", error);
      res.status(500).json({ message: "Failed to delete recipient list" });
    }
  });

  // Get recently uploaded recipients (last 5 across all lists)
  app.get('/api/recipients/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const recentRecipients = await storage.getRecentRecipients(userId, 5);
      res.json(recentRecipients);
    } catch (error) {
      console.error("Error fetching recent recipients:", error);
      res.status(500).json({ message: "Failed to fetch recent recipients" });
    }
  });

  // Get validation stats for a list
  app.get('/api/recipient-lists/:id/validation-stats', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      
      const stats = await storage.getValidationStats(listId);
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting validation stats:", error);
      res.status(500).json({ message: "Failed to get validation stats" });
    }
  });

  // Email personalization - single recipient
  app.post('/api/recipients/:id/personalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const recipientId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction, ourServices, ourIndustry } = req.body;

      console.log('Personalizing recipient:', { recipientId, userId, emailType, tone });

      // Check plan limits
      const canPersonalize = await checkPlanLimits(userId, 'personalization');
      if (!canPersonalize) {
        return res.status(403).json({ message: "Plan limit reached for email personalization" });
      }

      // Get recipient directly
      const recipient = await storage.getRecipient(recipientId);
      if (!recipient) {
        console.error('Recipient not found:', recipientId);
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (!recipient.websiteLink) {
        console.error('Recipient has no website:', recipient);
        return res.status(400).json({ message: "Recipient has no website" });
      }

      console.log('Found recipient with website:', { id: recipient.id, website: recipient.websiteLink });

      // Get website content for better personalization
      let websiteContent = null;
      if (recipient.websiteLink) {
        console.log('Scraping website for personalization:', recipient.websiteLink);
        websiteContent = await scrapeWebsiteContent(recipient.websiteLink);
        if (websiteContent) {
          console.log('Successfully scraped website content, length:', websiteContent.length);
        } else {
          console.log('Failed to scrape website content, proceeding without it');
        }
      }

      const personalizedEmail = await personalizeEmailContent(recipient, websiteContent, {
        emailType,
        tone,
        maxCharacters: parseInt(maxCharacters.toString()),
        callToAction,
        ourServices,
        ourIndustry,
      });

      console.log('Generated personalized email, length:', personalizedEmail.length);
      console.log('Full personalized email content:', personalizedEmail.substring(0, 200) + '...');

      await storage.updateRecipientPersonalizedEmail(recipientId, personalizedEmail);
      console.log('Successfully saved personalized email to database');

      // Update usage - track all personalized emails (including demo emails)
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await storage.getCurrentMonthUsage(userId);
        await storage.updateUsage(userId, currentMonth, {
          personalizedEmails: (usage?.personalizedEmails || 0) + 1,
        });
        console.log('Updated usage successfully');
      } catch (usageError) {
        console.error('Error updating usage (non-critical):', usageError);
        // Don't fail the request if usage tracking fails
      }

      res.json({ personalizedEmail });
    } catch (error) {
      console.error("Error personalizing email:", error);
      res.status(500).json({ message: `Failed to personalize email: ${error.message}` });
    }
  });

  app.post('/api/recipient-lists/:id/personalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const listId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction, ourServices, ourIndustry } = req.body;

      const recipients = await storage.getListRecipients(listId);
      const unPersonalizedRecipients = recipients.filter(r => r.websiteLink && !r.personalizedEmail);
      
      // Check plan limits
      const canPersonalize = await checkPlanLimits(userId, 'personalization', unPersonalizedRecipients.length);
      if (!canPersonalize) {
        return res.status(403).json({ message: "Plan limit reached for email personalization" });
      }

      let personalizedCount = 0;

      for (const recipient of unPersonalizedRecipients) {
        try {
          // Get website content for better personalization
          let websiteContent = null;
          if (recipient.websiteLink) {
            console.log(`Scraping website for recipient ${recipient.id}:`, recipient.websiteLink);
            websiteContent = await scrapeWebsiteContent(recipient.websiteLink);
            if (websiteContent) {
              console.log(`Successfully scraped website content for ${recipient.id}, length:`, websiteContent.length);
            }
          }

          const personalizedEmail = await personalizeEmailContent(recipient, websiteContent, {
            emailType,
            tone,
            maxCharacters,
            callToAction,
            ourServices,
            ourIndustry,
          });

          await storage.updateRecipientPersonalizedEmail(recipient.id, personalizedEmail);
          personalizedCount++;
        } catch (error) {
          console.error(`Error personalizing email for recipient ${recipient.id}:`, error);
          // Skip this recipient in bulk mode if it fails
        }
      }

      // Update usage - track all personalized emails (including demo emails)
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await storage.getCurrentMonthUsage(userId);
        await storage.updateUsage(userId, currentMonth, {
          personalizedEmails: (usage?.personalizedEmails || 0) + personalizedCount,
        });
      } catch (usageError) {
        console.error('Error updating bulk usage (non-critical):', usageError);
      }

      res.json({ personalizedCount });
    } catch (error) {
      console.error("Error personalizing emails:", error);
      res.status(500).json({ message: "Failed to personalize emails" });
    }
  });

  // Export recipient list with personalized emails
  app.get('/api/recipient-lists/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const recipients = await storage.getListRecipients(listId);
      
      // Create CSV content
      const headers = ['Name', 'Email', 'Website', 'Personalized Email'];
      const csvRows = [
        headers.join(','),
        ...recipients.map(recipient => [
          `"${recipient.name || ''}"`,
          `"${recipient.email || ''}"`,
          `"${recipient.websiteLink || ''}"`,
          `"${recipient.personalizedEmail || (recipient.websiteLink ? 'Not generated' : 'No website')}"`
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=personalized-emails-${listId}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting recipient list:", error);
      res.status(500).json({ message: "Failed to export recipient list" });
    }
  });

  // Update recipient list with personalized emails
  app.post('/api/recipient-lists/:targetListId/update-with-personalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const targetListId = parseInt(req.params.targetListId);
      const { sourceListId } = req.body;

      // Get personalized recipients from source list
      const sourceRecipients = await storage.getListRecipients(sourceListId);
      const personalizedRecipients = sourceRecipients.filter(r => r.personalizedEmail);

      if (personalizedRecipients.length === 0) {
        return res.status(400).json({ message: "No personalized emails found in source list" });
      }

      // Check if target list exists and belongs to user
      const targetList = await storage.getRecipientList(targetListId);
      if (!targetList || targetList.userId !== userId) {
        return res.status(404).json({ message: "Target list not found" });
      }

      // Get existing recipients in target list
      const existingRecipients = await storage.getListRecipients(targetListId);
      
      let updatedCount = 0;
      let addedCount = 0;

      for (const personalizedRecipient of personalizedRecipients) {
        // Check if recipient with same email already exists in target list
        const existingRecipient = existingRecipients.find(r => r.email === personalizedRecipient.email);
        
        if (existingRecipient) {
          // Update existing recipient with personalized email
          await storage.updateRecipientPersonalizedEmail(existingRecipient.id, personalizedRecipient.personalizedEmail);
          updatedCount++;
        } else {
          // Add new recipient to target list
          await storage.createRecipient({
            listId: targetListId,
            name: personalizedRecipient.name,
            email: personalizedRecipient.email,
            companyName: personalizedRecipient.companyName,
            position: personalizedRecipient.position,
            websiteLink: personalizedRecipient.websiteLink,
            personalizedEmail: personalizedRecipient.personalizedEmail,
          });
          addedCount++;
        }
      }

      res.json({ 
        message: `Updated ${updatedCount} existing recipients and added ${addedCount} new recipients with personalized emails`,
        updatedCount,
        addedCount
      });
    } catch (error) {
      console.error("Error updating recipient list:", error);
      res.status(500).json({ message: "Failed to update recipient list" });
    }
  });

  // AI email enhancement
  app.post('/api/ai/enhance-email', isAuthenticated, async (req: any, res) => {
    try {
      const { body } = req.body;
      
      if (!body || body.trim() === '') {
        return res.status(400).json({ message: "Email body is required" });
      }

      const enhancedBody = await enhanceEmailContent(body);
      
      res.json({ enhancedBody });
    } catch (error) {
      console.error("Error enhancing email:", error);
      res.status(500).json({ message: "Failed to enhance email content" });
    }
  });

  // Campaigns
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const campaigns = await storage.getUserCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Extract the required fields for the campaign schema
      const { 
        name, 
        recipientListId, 
        emailIntegrationId, 
        subject, 
        body, 
        emailRotationEnabled,
        emailRotationIds,
        emailsPerAccount,
        emailDelay,
        dailyLimit,
        timeWindowStart,
        timeWindowEnd,
        ...extraFields 
      } = req.body;
      
      // Validate required fields
      if (!name || !recipientListId || !emailIntegrationId || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: name, recipientListId, emailIntegrationId, subject, body" });
      }
      
      const campaignData = {
        name,
        recipientListId,
        emailIntegrationId,
        subject,
        body,
        emailRotationEnabled: emailRotationEnabled || false,
        emailRotationIds: emailRotationIds || [],
        emailsPerAccount: emailsPerAccount || 30,
        emailDelay: emailDelay || 5,
        dailyLimit: dailyLimit || 50,
        timeWindowStart: timeWindowStart || "08:00",
        timeWindowEnd: timeWindowEnd || "17:00",
        // Follow-up settings
        followUpEnabled: extraFields.followUpEnabled || false,
        followUpSubject: extraFields.followUpSubject || null,
        followUpBody: extraFields.followUpBody || null,
        followUpCondition: extraFields.followUpCondition || "not_opened",
        followUpDays: extraFields.followUpDays || 3,
        scheduledAt: extraFields.scheduledAt || null,
        status: extraFields.status || "draft"
      };
      
      const validatedData = insertCampaignSchema.parse(campaignData);
      
      // Check plan limits for campaign count
      const user = await storage.getUser(userId);
      const limits = planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo;
      const existingCampaigns = await storage.getUserCampaigns(userId);
      
      if (existingCampaigns.length >= limits.campaigns) {
        return res.status(403).json({ message: "Plan limit reached for campaigns" });
      }

      const campaign = await storage.createCampaign(userId, validatedData);
      
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Update campaign status
  app.patch('/api/campaigns/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const campaignId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status || !['draft', 'scheduled', 'sending', 'paused', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Verify campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // If starting campaign, begin sending emails
      if (status === 'sending') {
        // Get user plan to check limits
        const user = await storage.getUser(userId);
        const currentPlan = user?.plan || 'demo';
        const limits = planLimits[currentPlan as keyof typeof planLimits];
        
        // Get current month usage
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usage = await storage.getCurrentMonthUsage(userId);
        const emailsSentThisMonth = usage?.emailsSent || 0;

        // Check plan limits before starting
        if (emailsSentThisMonth >= limits.emailsPerMonth) {
          return res.status(403).json({ 
            message: `Plan limit reached. You've sent ${emailsSentThisMonth} of ${limits.emailsPerMonth} monthly emails.`
          });
        }

        // Start sending emails asynchronously
        startCampaignSending(campaignId, userId).catch(err => {
          console.error('Campaign sending error:', err);
        });
      }

      const updatedCampaign = await storage.updateCampaignStatus(campaignId, status);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign status:", error);
      res.status(500).json({ message: "Failed to update campaign status" });
    }
  });

  // Get campaign stats
  app.get('/api/campaigns/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = await storage.getCampaignStats(campaignId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
      res.status(500).json({ message: "Failed to fetch campaign stats" });
    }
  });

  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const campaignId = parseInt(req.params.id);
      
      // Verify campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Check if campaign is completed - preserve email counts for completed campaigns
      const isCompleted = campaign.status === 'completed';
      
      await storage.deleteCampaign(campaignId, isCompleted);
      
      res.json({ 
        message: "Campaign deleted successfully",
        preservedStats: isCompleted
      });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Update campaign content
  app.patch('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const campaignId = parseInt(req.params.id);
      const { subject, body, followUpSubject, followUpBody } = req.body;

      // Verify campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Only allow editing if campaign is draft or paused
      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        return res.status(400).json({ message: "Campaign cannot be edited while active" });
      }

      const updateData: any = {};
      if (subject !== undefined) updateData.subject = subject;
      if (body !== undefined) updateData.body = body;
      if (followUpSubject !== undefined) updateData.followUpSubject = followUpSubject;
      if (followUpBody !== undefined) updateData.followUpBody = followUpBody;

      const updatedCampaign = await storage.updateCampaign(campaignId, updateData);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.post('/api/campaigns/:id/follow-ups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const campaignId = parseInt(req.params.id);
      
      // Check plan limits for follow-ups
      const user = await storage.getUser(userId);
      const limits = planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo;
      const existingFollowUps = await storage.getCampaignFollowUps(campaignId);
      
      if (existingFollowUps.length >= limits.followUps) {
        return res.status(403).json({ message: "Plan limit reached for follow-ups" });
      }

      const data = insertFollowUpSchema.parse({ ...req.body, campaignId });
      const followUp = await storage.addFollowUp(data);
      res.json(followUp);
    } catch (error) {
      console.error("Error adding follow-up:", error);
      res.status(500).json({ message: "Failed to add follow-up" });
    }
  });

  // Stripe integration
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      const { plan } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const checkoutUrl = await createStripeCheckout(user.email, plan, userId);
      res.json({ checkoutUrl });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post('/api/stripe/webhook', async (req, res) => {
    try {
      await handleStripeWebhook(req, res);
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      res.status(500).json({ message: "Webhook error" });
    }
  });

  // Warmup API routes
  app.get('/api/warmup/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; 
      if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      
      const integrations = await storage.getUserEmailIntegrations(userId);
      
      const statsPromises = integrations.map(async (integration: EmailIntegration) => {
        const fullStats = await storage.getWarmupStatsForIntegration(integration.id);
        const warmupScore = await storage.calculateWarmupScore(integration.id);
        
        return {
          integration,
          todayStats: {
            ...fullStats.todayStats,
            warmupScore
          },
          overallStats: {
            ...fullStats.overallStats,
            avgWarmupScore: warmupScore
          },
          progress: fullStats.progress.map((p: any) => ({
            id: p.id,
            day: p.day,
            targetEmailsPerDay: p.targetEmailsPerDay,
            actualEmailsSent: p.actualEmailsSent,
            emailsOpened: p.emailsOpened || 0,
            emailsInInbox: p.emailsInInbox || 0,
            emailsInSpam: p.emailsInSpam || 0,
            spamTransferred: p.spamTransferred || 0,
            dailyScore: p.dailyScore || 0,
            isCompleted: p.isCompleted,
          })),
        };
      });
      
      const stats = await Promise.all(statsPromises);
      res.json(stats);
    } catch (error) {
      console.error("Error getting warmup stats:", error);
      res.status(500).json({ message: "Failed to get warmup stats" });
    }
  });

  // Warmup email tracking endpoints
  app.get("/api/track/warmup/open/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      console.log(`Warmup email opened - tracking ID: ${trackingId}`);
      
      const warmupEmail = await storage.markWarmupEmailAsOpened(trackingId);
      if (warmupEmail) {
        console.log(`Warmup open tracked for email ${warmupEmail.id}`);
      }
      
      // Return 1x1 pixel tracking image
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(pixel);
    } catch (error) {
      console.error("Error tracking warmup email open:", error);
      res.status(200).end();
    }
  });

  app.post("/api/track/warmup/reply/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { replyBody } = req.body;
      console.log(`Warmup email replied - tracking ID: ${trackingId}`);
      
      await storage.markWarmupEmailAsReplied(trackingId, replyBody);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking warmup email reply:", error);
      res.status(500).json({ message: "Failed to track reply" });
    }
  });

  app.post("/api/track/warmup/spam/:trackingId", async (req, res) => {
    try {
      const { trackingId } = req.params;
      console.log(`Warmup email marked as spam - tracking ID: ${trackingId}`);
      
      await storage.markWarmupEmailAsSpam(trackingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking warmup email spam:", error);
      res.status(500).json({ message: "Failed to track spam" });
    }
  });

  app.post('/api/warmup/initialize/:integrationId', isAuthenticated, async (req: any, res) => {
    try {
      const { integrationId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; if (!userId) { return res.status(401).json({ message: "User ID not found" }); }

      // Verify the integration belongs to the user
      const integration = await storage.getUserEmailIntegrations(userId);
      const userIntegration = integration.find(i => i.id === parseInt(integrationId));
      
      if (!userIntegration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      await warmupService.initializeWarmupProgress(parseInt(integrationId));
      res.json({ message: "Warmup initialized successfully" });
    } catch (error) {
      console.error("Error initializing warmup:", error);
      res.status(500).json({ message: "Failed to initialize warmup" });
    }
  });

  app.post('/api/warmup/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; 
      if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      
      console.log(`Starting warmup process for user ${userId}`);
      
      // Get user's email integrations
      const integrations = await storage.getUserEmailIntegrations(userId);
      const warmupIntegrations = integrations.filter(i => i.warmupEnabled && i.isVerified);
      
      console.log(`Found ${integrations.length} total integrations, ${warmupIntegrations.length} warmup-enabled and verified`);
      console.log('Integrations:', integrations.map(i => ({ id: i.id, email: i.email, warmupEnabled: i.warmupEnabled, isVerified: i.isVerified })));
      
      if (warmupIntegrations.length === 0) {
        return res.status(400).json({ message: "No verified email integrations enabled for warmup" });
      }
      
      // Initialize warmup progress if needed and reset completion status
      for (const integration of warmupIntegrations) {
        await warmupService.initializeWarmupProgress(integration.id);
        await warmupService.resetWarmupProgress(integration.id);
        console.log(`Initialized and reset warmup progress for integration ${integration.id} (${integration.email})`);
      }
      
      // Mark warmup as active for user's integrations
      for (const integration of warmupIntegrations) {
        await storage.updateEmailIntegration(integration.id, { lastWarmupAt: new Date() });
      }
      
      // Start the warmup process
      console.log(`Calling warmupService.sendWarmupEmails for user ${userId} with ${warmupIntegrations.length} integrations`);
      warmupService.sendWarmupEmails(userId).catch(console.error);
      
      res.json({ 
        message: "Warmup process started successfully",
        integrations: warmupIntegrations.length,
        mode: warmupIntegrations.length === 1 ? "self-warmup" : "cross-warmup"
      });
    } catch (error) {
      console.error("Error starting warmup process:", error);
      res.status(500).json({ message: "Failed to start warmup process" });
    }
  });

  // Stop warmup process
  app.post('/api/warmup/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || req.session?.manualUser?.id; 
      if (!userId) { return res.status(401).json({ message: "User ID not found" }); }
      
      // Clear last warmup timestamp for user's integrations
      const integrations = await storage.getUserEmailIntegrations(userId);
      for (const integration of integrations.filter(i => i.warmupEnabled)) {
        await storage.updateEmailIntegration(integration.id, { lastWarmupAt: null });
      }
      
      res.json({ message: "Warmup process stopped successfully" });
    } catch (error) {
      console.error("Error stopping warmup process:", error);
      res.status(500).json({ message: "Failed to stop warmup process" });
    }
  });

  // Handle warmup email opens
  app.post('/api/warmup/email-opened', isAuthenticated, async (req: any, res) => {
    try {
      const { emailId } = req.body;
      // Update warmup email status to opened
      await storage.updateWarmupEmailStatus(emailId, 'opened');
      
      // Get the email integration ID to update stats
      const warmupEmail = await storage.getWarmupEmail(emailId);
      if (warmupEmail) {
        await warmupService.updateWarmupStats(warmupEmail.fromIntegrationId, { emailsOpened: 1 });
      }
      
      res.json({ message: "Warmup email marked as opened" });
    } catch (error) {
      console.error("Error marking warmup email as opened:", error);
      res.status(500).json({ message: "Failed to mark email as opened" });
    }
  });



  app.post('/api/warmup/action/:emailId', isAuthenticated, async (req: any, res) => {
    try {
      const { emailId } = req.params;
      const { action, replyBody } = req.body;

      if (!['open', 'reply', 'spam'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      await warmupService.processWarmupEmailAction(parseInt(emailId), action, replyBody);
      res.json({ message: "Action processed successfully" });
    } catch (error) {
      console.error("Error processing warmup action:", error);
      res.status(500).json({ message: "Failed to process action" });
    }
  });

  // Email tracking endpoints
  app.get('/api/track/pixel/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      console.log(`Email opened - tracking ID: ${trackingId}`);
      
      // Parse tracking ID: campaignId_recipientId_timestamp
      const [campaignId, recipientId] = trackingId.split('_');
      
      if (campaignId && recipientId) {
        // Use proper tracking method that checks for duplicates
        await storage.markCampaignEmailAsOpened(trackingId);
      }
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(pixel);
    } catch (error) {
      console.error('Error tracking email open:', error);
      res.status(200).send(''); // Don't break email display if tracking fails
    }
  });

  // Warmup email tracking endpoint
  app.get('/api/track/warmup/open/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      console.log(`Warmup email opened - tracking ID: ${trackingId}`);
      
      // Find warmup email by tracking ID and mark as opened
      const warmupEmail = await storage.findWarmupEmailByTrackingId(trackingId);
      if (warmupEmail) {
        await warmupService.processWarmupEmailAction(warmupEmail.id, 'open');
      }
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(pixel);
    } catch (error) {
      console.error('Error tracking warmup email open:', error);
      res.status(200).send(''); // Don't break email display if tracking fails
    }
  });

  app.get('/api/track/click/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      const { url } = req.query;
      
      console.log(`Email link clicked - tracking ID: ${trackingId}, URL: ${url}`);
      
      // Parse tracking ID: campaignId_recipientId_timestamp
      const [campaignId, recipientId] = trackingId.split('_');
      
      if (campaignId && recipientId) {
        // Use proper tracking method that checks for duplicates
        await storage.markCampaignEmailAsClicked(trackingId);
      }
      
      // Redirect to the original URL
      if (url && typeof url === 'string') {
        res.redirect(url);
      } else {
        res.status(400).send('Invalid URL');
      }
    } catch (error) {
      console.error('Error tracking email click:', error);
      res.status(500).send('Tracking error');
    }
  });



  // Debug endpoint to reset warmup progress  
  app.post("/api/warmup/debug-reset", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Find user's integrations
      const integrations = await db
        .select()
        .from(emailIntegrations)
        .where(eq(emailIntegrations.userId, userId));

      // Reset progress for all integrations
      for (const integration of integrations) {
        await db
          .delete(warmupProgress)
          .where(eq(warmupProgress.emailIntegrationId, integration.id));
        
        await db
          .delete(warmupStats)
          .where(eq(warmupStats.emailIntegrationId, integration.id));
        
        // Reinitialize progress with correct formula
        await warmupService.initializeWarmupProgress(integration.id);
      }

      res.json({ message: "Warmup progress reset and reinitialized successfully" });
    } catch (error) {
      console.error("Error resetting warmup progress:", error);
      res.status(500).json({ error: "Failed to reset warmup progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


