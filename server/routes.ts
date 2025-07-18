import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupGoogleAuth, getGmailAuthUrl } from "./services/googleAuth";
import { validateEmailIntegration, sendEmail } from "./services/email";
import { personalizeEmail } from "./services/openai";
import { createStripeCheckout, handleStripeWebhook } from "./services/stripe";
import { emailValidationService, type EmailValidationResult } from "./services/emailValidation";
import bcrypt from "bcryptjs";
import passport from "passport";
import { 
  insertEmailIntegrationSchema,
  insertRecipientListSchema,
  insertRecipientSchema,
  insertCampaignSchema,
  insertFollowUpSchema
} from "@shared/schema";
import { z } from "zod";

const planLimits = {
  demo: {
    emailsPerMonth: 1000,
    recipientsPerMonth: 300,
    emailIntegrations: 1,
    deliverabilityChecks: 150,
    personalizedEmails: 100,
    followUps: 0,
    campaigns: 3,
    warmupEmails: 0,
  },
  starter: {
    emailsPerMonth: 20000,
    recipientsPerMonth: 6000,
    emailIntegrations: 4,
    deliverabilityChecks: 2000,
    personalizedEmails: 2000,
    followUps: 1,
    campaigns: Infinity,
    warmupEmails: 2500,
  },
  pro: {
    emailsPerMonth: 75000,
    recipientsPerMonth: 25000,
    emailIntegrations: 20,
    deliverabilityChecks: 10000,
    personalizedEmails: 5000,
    followUps: 1,
    campaigns: Infinity,
    warmupEmails: Infinity,
  },
  premium: {
    emailsPerMonth: Infinity,
    recipientsPerMonth: Infinity,
    emailIntegrations: Infinity,
    deliverabilityChecks: Infinity,
    personalizedEmails: Infinity,
    followUps: 2,
    campaigns: Infinity,
    warmupEmails: Infinity,
  },
};

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
      return (currentUsage.recipientsUploaded || 0) + amount <= limits.recipientsPerMonth;
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  setupGoogleAuth();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit OAuth and local authentication
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "No user ID found" });
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Google OAuth routes (only if Google credentials are configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect('/');
      }
    );
  } else {
    // Fallback route when Google OAuth is not configured
    app.get('/api/auth/google', (req, res) => {
      res.status(501).json({ message: "Google OAuth not configured" });
    });
  }

  // Manual login/register routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
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

      res.json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      const usage = await storage.getCurrentMonthUsage(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        ...stats,
        usage: usage || {
          emailsSent: 0,
          recipientsUploaded: 0,
          deliverabilityChecks: 0,
          personalizedEmails: 0,
          warmupEmails: 0,
        },
        planLimits: planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User stats for usage tracking
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usage = await storage.getCurrentMonthUsage(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        deliverabilityChecksUsed: usage?.deliverabilityChecks || 0,
        recipientCount: usage?.recipientsUploaded || 0,
        emailsSent: usage?.emailsSent || 0,
        personalizedEmails: usage?.personalizedEmails || 0,
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
      const userId = req.user.claims.sub;
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
      const authUrl = getGmailAuthUrl(userId);
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
      const userId = req.user.claims.sub;
      const lists = await storage.getUserRecipientLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching recipient lists:", error);
      res.status(500).json({ message: "Failed to fetch recipient lists" });
    }
  });

  app.post('/api/recipient-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipient:", error);
      res.status(500).json({ message: "Failed to delete recipient" });
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

  // Email personalization
  app.post('/api/recipients/:id/personalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipientId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction } = req.body;

      // Check plan limits
      const canPersonalize = await checkPlanLimits(userId, 'personalization');
      if (!canPersonalize) {
        return res.status(403).json({ message: "Plan limit reached for email personalization" });
      }

      const recipients = await storage.getListRecipients(recipientId);
      const recipient = recipients.find(r => r.id === recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      const personalizedEmail = await personalizeEmail(recipient, {
        emailType,
        tone,
        maxCharacters,
        callToAction,
      });

      await storage.updateRecipientPersonalizedEmail(recipientId, personalizedEmail);

      // Update usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getCurrentMonthUsage(userId);
      await storage.updateUsage(userId, currentMonth, {
        personalizedEmails: (usage?.personalizedEmails || 0) + 1,
      });

      res.json({ personalizedEmail });
    } catch (error) {
      console.error("Error personalizing email:", error);
      res.status(500).json({ message: "Failed to personalize email" });
    }
  });

  app.post('/api/recipient-lists/:id/personalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction } = req.body;

      const recipients = await storage.getListRecipients(listId);
      
      // Check plan limits
      const canPersonalize = await checkPlanLimits(userId, 'personalization', recipients.length);
      if (!canPersonalize) {
        return res.status(403).json({ message: "Plan limit reached for email personalization" });
      }

      let personalizedCount = 0;

      for (const recipient of recipients) {
        if (recipient.websiteLink) {
          try {
            const personalizedEmail = await personalizeEmail(recipient, {
              emailType,
              tone,
              maxCharacters,
              callToAction,
            });

            await storage.updateRecipientPersonalizedEmail(recipient.id, personalizedEmail);
            personalizedCount++;
          } catch (error) {
            console.error(`Error personalizing email for recipient ${recipient.id}:`, error);
          }
        }
      }

      // Update usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await storage.getCurrentMonthUsage(userId);
      await storage.updateUsage(userId, currentMonth, {
        personalizedEmails: (usage?.personalizedEmails || 0) + personalizedCount,
      });

      res.json({ personalizedCount });
    } catch (error) {
      console.error("Error personalizing emails:", error);
      res.status(500).json({ message: "Failed to personalize emails" });
    }
  });

  // Campaigns
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaigns = await storage.getUserCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCampaignSchema.parse(req.body);
      
      // Check plan limits for campaign count
      const user = await storage.getUser(userId);
      const limits = planLimits[user?.plan as keyof typeof planLimits] || planLimits.demo;
      const existingCampaigns = await storage.getUserCampaigns(userId);
      
      if (existingCampaigns.length >= limits.campaigns) {
        return res.status(403).json({ message: "Plan limit reached for campaigns" });
      }

      const campaign = await storage.createCampaign(userId, data);
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.post('/api/campaigns/:id/follow-ups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
