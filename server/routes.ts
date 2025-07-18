import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupGoogleAuth, getGmailAuthUrl } from "./services/googleAuth";
import { validateEmailIntegration, sendEmail } from "./services/email";
import { personalizeEmail } from "./services/openai";
import { createStripeCheckout, handleStripeWebhook } from "./services/stripe";
import { emailValidationService, type EmailValidationResult } from "./services/emailValidation";
import { warmupService } from "./services/warmup";
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
    personalizedEmails: 30,
    followUps: 0,
    campaigns: 3,
    warmupEmails: 0,
  },
  starter: {
    emailsPerMonth: 20000,
    recipientsPerMonth: 6000,
    emailIntegrations: 4,
    deliverabilityChecks: 2000,
    personalizedEmails: 1000,
    followUps: 1,
    campaigns: Infinity,
    warmupEmails: 2500,
  },
  pro: {
    emailsPerMonth: 75000,
    recipientsPerMonth: 25000,
    emailIntegrations: 20,
    deliverabilityChecks: 10000,
    personalizedEmails: 1000,
    followUps: 1,
    campaigns: Infinity,
    warmupEmails: Infinity,
  },
  premium: {
    emailsPerMonth: Infinity,
    recipientsPerMonth: Infinity,
    emailIntegrations: Infinity,
    deliverabilityChecks: Infinity,
    personalizedEmails: 1000,
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
      
      // Update recipient counts for all lists (but don't decrease upload usage)
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const recipientId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction } = req.body;

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

      const personalizedEmail = await personalizeEmail(recipient, {
        emailType,
        tone,
        maxCharacters: parseInt(maxCharacters.toString()),
        callToAction,
      });

      console.log('Generated personalized email, length:', personalizedEmail.length);

      await storage.updateRecipientPersonalizedEmail(recipientId, personalizedEmail);

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
      const userId = req.user.claims.sub;
      const listId = parseInt(req.params.id);
      const { emailType, tone, maxCharacters, callToAction } = req.body;

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
      const userId = req.user.claims.sub;
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

  // Warmup API routes
  app.get('/api/warmup/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await warmupService.getWarmupStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting warmup stats:", error);
      res.status(500).json({ message: "Failed to get warmup stats" });
    }
  });

  app.post('/api/warmup/initialize/:integrationId', isAuthenticated, async (req: any, res) => {
    try {
      const { integrationId } = req.params;
      const userId = req.user.claims.sub;

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
      const userId = req.user.claims.sub;
      await warmupService.sendWarmupEmails(userId);
      res.json({ message: "Warmup emails sent successfully" });
    } catch (error) {
      console.error("Error sending warmup emails:", error);
      res.status(500).json({ message: "Failed to send warmup emails" });
    }
  });

  // Simulate warmup activity for demo purposes
  app.post('/api/warmup/simulate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's email integrations with warmup enabled
      const integrations = await storage.getUserEmailIntegrations(userId);
      const warmupIntegrations = integrations.filter(i => i.warmupEnabled);
      
      if (warmupIntegrations.length === 0) {
        return res.status(400).json({ message: "No email integrations with warmup enabled" });
      }
      
      // Simulate warmup activity for each integration
      for (const integration of warmupIntegrations) {
        await warmupService.simulateWarmupActivity(integration.id);
      }
      
      res.json({ message: "Warmup simulation completed", integrationsProcessed: warmupIntegrations.length });
    } catch (error) {
      console.error("Error simulating warmup:", error);
      res.status(500).json({ message: "Failed to simulate warmup" });
    }
  });

  // Reset/refresh simulation data
  app.post('/api/warmup/reset-simulation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's email integrations with warmup enabled
      const integrations = await storage.getUserEmailIntegrations(userId);
      const warmupIntegrations = integrations.filter(i => i.warmupEnabled);
      
      if (warmupIntegrations.length === 0) {
        return res.status(400).json({ message: "No email integrations with warmup enabled" });
      }
      
      // Clear existing simulation data and regenerate
      for (const integration of warmupIntegrations) {
        await warmupService.clearWarmupData(integration.id);
        await warmupService.simulateWarmupActivity(integration.id);
      }
      
      res.json({ message: "Warmup simulation data refreshed", integrationsProcessed: warmupIntegrations.length });
    } catch (error) {
      console.error("Error resetting simulation:", error);
      res.status(500).json({ message: "Failed to reset simulation" });
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

  const httpServer = createServer(app);
  return httpServer;
}
