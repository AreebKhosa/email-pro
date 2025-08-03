import { db } from "../db";
import { storage } from "../storage";
import { emailIntegrations, warmupEmails, warmupStats, warmupProgress } from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { personalizeEmailContent } from "./gemini";
import { sendEmail } from "./email";

// WarmupService class will be instantiated in routes.ts

export interface WarmupConfig {
  dailyIncrease: number;
  maxDailyEmails: number;
  warmupDays: number;
  minInterval: number; // minutes
  maxInterval: number; // minutes
}

const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
  dailyIncrease: 5,
  maxDailyEmails: 100,
  warmupDays: 15,
  minInterval: 30, // 30 minutes between cycles
  maxInterval: 60, // 60 minutes between cycles
};

export class WarmupService {
  private config: WarmupConfig;

  constructor(config: WarmupConfig = DEFAULT_WARMUP_CONFIG) {
    this.config = config;
  }

  // Get warmup statistics for a user's email integrations
  async getWarmupStats(userId: string) {
    const integrations = await db
      .select()
      .from(emailIntegrations)
      .where(eq(emailIntegrations.userId, userId));

    const stats = await Promise.all(
      integrations.map(async (integration) => {
        const todayStats = await this.getTodayStats(integration.id);
        const progress = await this.getWarmupProgress(integration.id);
        const overallStats = await this.getOverallStats(integration.id);

        return {
          integration,
          todayStats,
          progress,
          overallStats,
        };
      })
    );

    return stats;
  }

  // Get today's statistics for an email integration
  async getTodayStats(integrationId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats] = await db
      .select()
      .from(warmupStats)
      .where(
        and(
          eq(warmupStats.emailIntegrationId, integrationId),
          sql`DATE(${warmupStats.date}) = DATE(${today})`
        )
      )
      .orderBy(desc(warmupStats.date))
      .limit(1);

    return stats || {
      emailsSent: 0,
      emailsOpened: 0,
      emailsReplied: 0,
      emailsSpam: 0,
      emailsBounced: 0,
      warmupScore: 0,
      spamRate: 0,
      openRate: 0,
      replyRate: 0,
      bounceRate: 0,
    };
  }

  // Get overall statistics for an email integration
  async getOverallStats(integrationId: number) {
    const [stats] = await db
      .select({
        totalSent: sql<number>`SUM(${warmupStats.emailsSent})`,
        totalOpened: sql<number>`SUM(${warmupStats.emailsOpened})`,
        totalReplied: sql<number>`SUM(${warmupStats.emailsReplied})`,
        totalSpam: sql<number>`SUM(${warmupStats.emailsSpam})`,
        totalBounced: sql<number>`SUM(${warmupStats.emailsBounced})`,
        avgWarmupScore: sql<number>`AVG(${warmupStats.warmupScore})`,
        avgSpamRate: sql<number>`AVG(${warmupStats.spamRate})`,
        avgOpenRate: sql<number>`AVG(${warmupStats.openRate})`,
        avgReplyRate: sql<number>`AVG(${warmupStats.replyRate})`,
        avgBounceRate: sql<number>`AVG(${warmupStats.bounceRate})`,
      })
      .from(warmupStats)
      .where(eq(warmupStats.emailIntegrationId, integrationId));

    return {
      totalSent: stats.totalSent || 0,
      totalOpened: stats.totalOpened || 0,
      totalReplied: stats.totalReplied || 0,
      totalSpam: stats.totalSpam || 0,
      totalBounced: stats.totalBounced || 0,
      avgWarmupScore: stats.avgWarmupScore || 0,
      avgSpamRate: stats.avgSpamRate || 0,
      avgOpenRate: stats.avgOpenRate || 0,
      avgReplyRate: stats.avgReplyRate || 0,
      avgBounceRate: stats.avgBounceRate || 0,
    };
  }

  // Get warmup progress for an email integration
  async getWarmupProgress(integrationId: number) {
    const progress = await db
      .select()
      .from(warmupProgress)
      .where(eq(warmupProgress.emailIntegrationId, integrationId))
      .orderBy(asc(warmupProgress.day));

    return progress;
  }

  // Initialize warmup progress for an email integration
  async initializeWarmupProgress(integrationId: number) {
    const existingProgress = await db
      .select()
      .from(warmupProgress)
      .where(eq(warmupProgress.emailIntegrationId, integrationId))
      .limit(1);

    if (existingProgress.length > 0) {
      return; // Already initialized
    }

    const progressData = [];
    for (let day = 1; day <= this.config.warmupDays; day++) {
      const targetEmails = Math.min(
        this.config.dailyIncrease * day,
        this.config.maxDailyEmails
      );
      
      progressData.push({
        emailIntegrationId: integrationId,
        day,
        targetEmailsPerDay: targetEmails,
        actualEmailsSent: 0,
        isCompleted: false,
      });
    }

    await db.insert(warmupProgress).values(progressData);
  }

  // Generate AI-powered warmup email content
  async generateWarmupContent(): Promise<{ subject: string; body: string }> {
    // Create a mock recipient for AI generation
    const mockRecipient = {
      id: 0,
      name: "Colleague",
      lastName: null,
      email: "colleague@example.com",
      companyName: "Company",
      position: "Professional",
      websiteLink: "https://example.com",
      listId: 0,
      createdAt: new Date(),
      personalizedEmail: null,
      deliverabilityStatus: null,
    };

    try {
      const personalizedEmail = await personalizeEmailContent(mockRecipient, null, {
        emailType: "business_partnership",
        tone: "professional",
        maxCharacters: 300,
        callToAction: "schedule_meeting",
      });

      // Extract subject and body from the personalized email
      const lines = personalizedEmail.split('\n');
      const subject = lines[0]?.replace(/^Subject:\s*/i, '') || "Professional Connection";
      const body = lines.slice(1).join('\n').trim() || personalizedEmail;

      return { subject, body };
    } catch (error) {
      console.error("Error generating warmup content:", error);
      // Fallback to formal business templates
      const subjects = [
        "Quarterly Business Review - Partnership Opportunities",
        "Market Analysis Report - Industry Insights", 
        "Strategic Partnership Discussion - Next Steps",
        "Business Development Update - New Initiatives",
        "Project Status Update - Implementation Progress",
        "Collaboration Proposal - Growth Opportunities",
        "Industry Trends Analysis - Market Positioning",
        "Monthly Performance Review - Key Metrics",
        "Strategic Planning Session - Future Roadmap",
        "Business Intelligence Report - Competitive Analysis"
      ];
      
      const bodies = [
        "Dear Business Partner,\n\nI hope this message finds you well. I wanted to reach out regarding our ongoing strategic partnership and discuss potential collaboration opportunities.\n\nBest regards",
        "Dear Colleague,\n\nI trust this email finds you in good health. Following our recent discussions, I wanted to provide you with an update on our implementation progress.\n\nWarm regards",
        "Dear Partner,\n\nI hope you are having a productive week. I am writing to share some insights from our latest industry analysis that may be of interest.\n\nBest wishes",
        "Dear Business Contact,\n\nI trust everything is progressing well with your current projects. I wanted to touch base regarding our collaborative framework.\n\nSincerely",
        "Dear Associate,\n\nI hope this communication reaches you at a convenient time. I am reaching out to provide an update on our operational initiatives.\n\nKind regards"
      ];

      return {
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        body: bodies[Math.floor(Math.random() * bodies.length)],
      };
    }
  }

  // Send warmup emails between integrations with auto-continue
  async sendWarmupEmails(userId: string) {
    console.log(`Starting sendWarmupEmails for user ${userId}`);
    
    const activeIntegrations = await db
      .select()
      .from(emailIntegrations)
      .where(
        and(
          eq(emailIntegrations.userId, userId),
          eq(emailIntegrations.warmupEnabled, true),
          eq(emailIntegrations.isVerified, true)
        )
      );

    console.log(`Found ${activeIntegrations.length} active integrations for warmup:`);
    activeIntegrations.forEach(int => console.log(`- Integration ${int.id}: ${int.email}`));

    if (activeIntegrations.length === 0) {
      console.log("No active integrations for warmup");
      return;
    }
    
    // For single integration, enable self-warmup mode
    if (activeIntegrations.length === 1) {
      console.log("Single integration detected - using self-warmup mode");
      await this.sendSelfWarmupEmails(activeIntegrations[0]);
      return;
    }
    
    console.log("Multiple integrations detected - using cross-warmup mode");

    let emailsSent = 0;
    let hasMoreToSend = false;

    for (const fromIntegration of activeIntegrations) {
      const progress = await this.getCurrentDayProgress(fromIntegration.id);
      console.log(`Integration ${fromIntegration.id} progress:`, progress);
      
      if (!progress) {
        console.log(`No progress found for integration ${fromIntegration.id}, skipping`);
        continue;
      }
      
      if (progress.isCompleted) {
        console.log(`Progress already completed for integration ${fromIntegration.id}`);
        continue;
      }

      const todayStats = await this.getTodayStats(fromIntegration.id);
      const remainingEmails = progress.targetEmailsPerDay - (todayStats.emailsSent || 0);
      
      console.log(`Integration ${fromIntegration.id}: target=${progress.targetEmailsPerDay}, sent=${todayStats.emailsSent || 0}, remaining=${remainingEmails}`);

      if (remainingEmails <= 0) {
        console.log(`No emails remaining for integration ${fromIntegration.id}, marking as completed`);
        // Mark day as completed
        await db
          .update(warmupProgress)
          .set({ isCompleted: true })
          .where(eq(warmupProgress.id, progress.id));
        continue;
      }

      // Send 1 email per call, not all remaining
      const emailsToSend = Math.min(1, remainingEmails);
      hasMoreToSend = hasMoreToSend || remainingEmails > emailsToSend;

      console.log(`Will send ${emailsToSend} email(s) from integration ${fromIntegration.id}`);

      // Send emails to other integrations
      const otherIntegrations = activeIntegrations.filter(
        (int) => int.id !== fromIntegration.id
      );

      for (let i = 0; i < Math.min(emailsToSend, otherIntegrations.length); i++) {
        const toIntegration = otherIntegrations[i];
        console.log(`Sending warmup email from ${fromIntegration.email} to ${toIntegration.email}`);
        await this.sendSingleWarmupEmail(fromIntegration, toIntegration);
        emailsSent++;
      }
    }

    // Auto-continue: schedule next warmup cycle if there are more emails to send
    if (hasMoreToSend || emailsSent > 0) {
      const nextCycleMinutes = Math.floor(Math.random() * (this.config.maxInterval - this.config.minInterval + 1)) + this.config.minInterval;
      console.log(`Sent ${emailsSent} warmup emails, scheduling next cycle in ${nextCycleMinutes} minutes...`);
      setTimeout(() => {
        this.sendWarmupEmails(userId).catch(console.error);
      }, nextCycleMinutes * 60 * 1000); // Use configured interval
    } else {
      console.log("All warmup targets completed for today");
    }
  }

  // Send a single warmup email
  // Generate tracking ID for warmup emails
  private generateTrackingId(): string {
    return `warmup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendSingleWarmupEmail(fromIntegration: any, toIntegration: any) {
    try {
      const content = await this.generateWarmupContent();
      const trackingId = this.generateTrackingId();
      const progress = await this.getCurrentDayProgress(fromIntegration.id);
      const currentDay = progress?.day || 1;
      
      // Add tracking pixel to email body - use http for localhost, https for production
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http://' : 'https://';
      const trackingUrl = `${protocol}${domain}/api/track/warmup/open/${trackingId}`;
      
      const bodyWithTracking = `${content.body}

<img src="${trackingUrl}" width="1" height="1" style="display: none;" />`;
      
      const success = await sendEmail(
        fromIntegration,
        toIntegration.email,
        content.subject,
        bodyWithTracking
      );

      if (success) {
        // Record the warmup email with tracking
        await db.insert(warmupEmails).values({
          fromIntegrationId: fromIntegration.id,
          toIntegrationId: toIntegration.id,
          subject: content.subject,
          body: bodyWithTracking,
          status: "sent",
          trackingId,
          warmupDay: currentDay,
          deliveryLocation: 'unknown'
        });

        // Update statistics and progress
        await this.updateWarmupStats(fromIntegration.id, { emailsSent: 1 });
        
        // Check if day is completed and advance to next day if needed
        await this.checkAndAdvanceDay(fromIntegration.id);
        
        console.log(`Warmup email sent from ${fromIntegration.email} to ${toIntegration.email} with tracking ${trackingId}`);
        
        // Schedule AI-based automatic reply after 5 minutes
        const replyDelay = 5 * 60 * 1000; // 5 minutes
        setTimeout(async () => {
          await this.generateAIReplyAndSend(fromIntegration, toIntegration, content.subject, trackingId);
        }, replyDelay);
        
      } else {
        console.error(`Failed to send warmup email from ${fromIntegration.email} to ${toIntegration.email}`);
      }
    } catch (error) {
      console.error("Error sending warmup email:", error);
    }
  }

  // Simulate automatic warmup email replies for testing
  private async simulateWarmupReply(fromIntegration: any, toIntegration: any, originalSubject: string, trackingId: string) {
    try {
      // Find the warmup email record
      const warmupEmail = await storage.findWarmupEmailByTrackingId(trackingId);
      if (!warmupEmail) {
        console.log(`Warmup email not found for tracking ID: ${trackingId}`);
        return;
      }

      // Simulate different reply behaviors (70% reply, 30% just mark as opened)
      const shouldReply = Math.random() < 0.7;
      
      if (shouldReply) {
        // Generate a simple reply
        const replies = [
          "Thank you for your email. I'll review this and get back to you.",
          "Thanks for reaching out. This looks interesting.",
          "Received your message. I'll look into this further.",
          "Thank you for the information. I appreciate you sharing this.",
          "Thanks for your email. I'll give this some thought."
        ];
        const replyBody = replies[Math.floor(Math.random() * replies.length)];
        
        console.log(`Simulating reply from ${toIntegration.email} to ${fromIntegration.email}: "${replyBody}"`);
        await this.processWarmupEmailAction(warmupEmail.id, 'reply', replyBody);
      } else {
        // Just mark as opened
        console.log(`Simulating email open from ${toIntegration.email} for email from ${fromIntegration.email}`);
        await this.processWarmupEmailAction(warmupEmail.id, 'open');
      }
    } catch (error) {
      console.error("Error simulating warmup reply:", error);
    }
  }

  // Self-warmup system for single integration
  private async sendSelfWarmupEmails(integration: any) {
    try {
      const progress = await this.getCurrentDayProgress(integration.id);
      if (!progress || progress.isCompleted) {
        console.log("Warmup progress completed for today");
        return;
      }

      const todayStats = await this.getTodayStats(integration.id);
      const remainingEmails = progress.targetEmailsPerDay - (todayStats.emailsSent || 0);

      if (remainingEmails <= 0) {
        // Mark day as completed
        await db
          .update(warmupProgress)
          .set({ isCompleted: true })
          .where(eq(warmupProgress.id, progress.id));
        console.log("Daily warmup target completed");
        return;
      }

      // Send 1 self-warmup email per cycle
      const emailsToSend = Math.min(1, remainingEmails);
      
      for (let i = 0; i < emailsToSend; i++) {
        await this.sendSelfWarmupEmail(integration);
      }

      // Schedule next cycle if more emails needed
      if (remainingEmails > emailsToSend) {
        const nextCycleMinutes = Math.floor(Math.random() * (this.config.maxInterval - this.config.minInterval + 1)) + this.config.minInterval;
        console.log(`Sent ${emailsToSend} self-warmup emails, scheduling next cycle in ${nextCycleMinutes} minutes...`);
        setTimeout(() => {
          this.sendSelfWarmupEmails(integration).catch(console.error);
        }, nextCycleMinutes * 60 * 1000);
      } else {
        console.log("All self-warmup targets completed for today");
      }
    } catch (error) {
      console.error("Error in self-warmup process:", error);
    }
  }

  // Send warmup email to the same integration (self-warmup)
  private async sendSelfWarmupEmail(integration: any) {
    try {
      const content = await this.generateWarmupContent();
      const trackingId = this.generateTrackingId();
      const progress = await this.getCurrentDayProgress(integration.id);
      const currentDay = progress?.day || 1;
      
      // Add tracking pixel to email body
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http://' : 'https://';
      const trackingUrl = `${protocol}${domain}/api/track/warmup/open/${trackingId}`;
      
      const bodyWithTracking = `${content.body}

<img src="${trackingUrl}" width="1" height="1" style="display: none;" />`;
      
      console.log(`Sending self-warmup email from ${integration.email} to ${integration.email}`);
      
      const success = await sendEmail(
        integration,
        integration.email,
        `[Self-Warmup] ${content.subject}`,
        bodyWithTracking
      );

      if (success) {
        // Record the warmup email with tracking
        await db.insert(warmupEmails).values({
          fromIntegrationId: integration.id,
          toIntegrationId: integration.id, // Same integration for self-warmup
          subject: `[Self-Warmup] ${content.subject}`,
          body: bodyWithTracking,
          status: "sent",
          trackingId,
          warmupDay: currentDay,
          deliveryLocation: 'unknown'
        });

        // Update statistics and progress
        await this.updateWarmupStats(integration.id, { emailsSent: 1 });
        
        // Check if day is completed and advance to next day if needed
        await this.checkAndAdvanceDay(integration.id);
        
        console.log(`Self-warmup email sent with tracking ${trackingId}`);
        
        // Schedule AI-based automatic reply after 3 minutes for self-warmup
        const replyDelay = 3 * 60 * 1000; // 3 minutes
        setTimeout(async () => {
          await this.generateAISelfReplyAndSend(integration, content.subject, trackingId);
        }, replyDelay);
        
      } else {
        console.error(`Failed to send self-warmup email to ${integration.email}`);
      }
    } catch (error) {
      console.error("Error sending self-warmup email:", error);
    }
  }

  // Generate AI-based automatic reply using Gemini and send via SMTP
  private async generateAIReplyAndSend(fromIntegration: any, toIntegration: any, originalSubject: string, trackingId: string) {
    try {
      const warmupEmail = await storage.findWarmupEmailByTrackingId(trackingId);
      if (!warmupEmail) {
        console.log(`Warmup email not found for tracking ID: ${trackingId}`);
        return;
      }

      // 90% chance to open, 70% chance to reply if opened
      const shouldOpen = Math.random() < 0.9;
      if (shouldOpen) {
        await this.processWarmupEmailAction(warmupEmail.id, 'open');
        console.log(`AI warmup: Email opened via IMAP simulation`);
      }

      const shouldReply = Math.random() < 0.7;
      if (shouldReply) {
        // Generate AI reply using Gemini
        const aiReply = await this.generateAIReplyContent(originalSubject, warmupEmail.body);
        
        // Send actual reply via SMTP
        const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        const success = await sendEmail(
          toIntegration, // Reply comes from the recipient
          fromIntegration.email, // Back to original sender
          replySubject,
          aiReply
        );

        if (success) {
          await this.processWarmupEmailAction(warmupEmail.id, 'reply', aiReply);
          console.log(`AI warmup: Generated and sent reply from ${toIntegration.email} to ${fromIntegration.email}`);
        }
      }
    } catch (error) {
      console.error("Error generating AI warmup reply:", error);
    }
  }

  // Generate AI-based automatic self-reply
  private async generateAISelfReplyAndSend(integration: any, originalSubject: string, trackingId: string) {
    try {
      const warmupEmail = await storage.findWarmupEmailByTrackingId(trackingId);
      if (!warmupEmail) {
        console.log(`Self-warmup email not found for tracking ID: ${trackingId}`);
        return;
      }

      // Higher engagement for self-warmup (95% open, 80% reply)
      const shouldOpen = Math.random() < 0.95;
      if (shouldOpen) {
        await this.processWarmupEmailAction(warmupEmail.id, 'open');
        console.log(`AI self-warmup: Email opened`);
      }

      const shouldReply = Math.random() < 0.8;
      if (shouldReply) {
        // Generate AI reply for self-warmup
        const aiReply = await this.generateAISelfReplyContent(originalSubject, warmupEmail.body);
        
        // Send actual self-reply via SMTP
        const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        const success = await sendEmail(
          integration,
          integration.email,
          replySubject,
          aiReply
        );

        if (success) {
          await this.processWarmupEmailAction(warmupEmail.id, 'reply', aiReply);
          console.log(`AI self-warmup: Generated and sent self-reply for ${integration.email}`);
        }
      }
    } catch (error) {
      console.error("Error generating AI self-warmup reply:", error);
    }
  }

  // Generate AI reply content using Gemini
  private async generateAIReplyContent(originalSubject: string, originalBody: string): Promise<string> {
    try {
      const { generatePersonalizedResponse } = await import('./gemini');
      
      const context = {
        originalSubject,
        originalBody: originalBody.replace(/<[^>]*>/g, ''), // Strip HTML
        replyType: 'warmup_professional'
      };

      const aiReply = await generatePersonalizedResponse(
        `Generate a professional, natural reply to this email for warmup purposes. 
        The reply should be 2-3 sentences, sound human, and be appropriate for business communication.
        Original subject: ${originalSubject}
        Original content: ${context.originalBody}`
      );

      return aiReply || this.getFallbackReply();
    } catch (error) {
      console.error("Error generating AI reply:", error);
      return this.getFallbackReply();
    }
  }

  // Generate AI self-reply content
  private async generateAISelfReplyContent(originalSubject: string, originalBody: string): Promise<string> {
    try {
      const { generatePersonalizedResponse } = await import('./gemini');
      
      const context = {
        originalSubject,
        originalBody: originalBody.replace(/<[^>]*>/g, ''),
        replyType: 'warmup_self'
      };

      const aiReply = await generatePersonalizedResponse(
        `Generate a brief acknowledgment reply to this email for self-warmup purposes. 
        The reply should be 1-2 sentences, professional, and natural.
        Original subject: ${originalSubject}
        Original content: ${context.originalBody}`
      );

      return aiReply || this.getFallbackSelfReply();
    } catch (error) {
      console.error("Error generating AI self-reply:", error);
      return this.getFallbackSelfReply();
    }
  }

  // Fallback replies if AI generation fails
  private getFallbackReply(): string {
    const replies = [
      "Thank you for your email. I'll review this and get back to you if needed.",
      "Thanks for reaching out. I appreciate the information.",
      "Received your message. I'll look into this further.",
      "Thank you for sharing this. I'll give it some consideration.",
      "Thanks for your email. This looks interesting."
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private getFallbackSelfReply(): string {
    const replies = [
      "Noted. Thanks for the update.",
      "Received. I'll review this.",
      "Thanks for the information.",
      "Acknowledged. Will follow up as needed.",
      "Got it. Thanks."
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // Enhanced inter-user warmup - find other users to send warmup emails to
  async findWarmupPartners(excludeIntegrationId: number): Promise<any[]> {
    try {
      // Get all other active warmup integrations from different users
      const currentIntegration = await db
        .select()
        .from(emailIntegrations)
        .where(eq(emailIntegrations.id, excludeIntegrationId))
        .limit(1);

      if (!currentIntegration.length) return [];

      const partners = await db
        .select()
        .from(emailIntegrations)
        .where(
          and(
            eq(emailIntegrations.warmupEnabled, true),
            eq(emailIntegrations.isVerified, true),
            sql`${emailIntegrations.userId} != ${currentIntegration[0].userId}`,
            sql`${emailIntegrations.id} != ${excludeIntegrationId}`
          )
        )
        .limit(10); // Limit to prevent too many partners

      console.log(`Found ${partners.length} warmup partners for integration ${excludeIntegrationId}`);
      return partners;
    } catch (error) {
      console.error("Error finding warmup partners:", error);
      return [];
    }
  }

  // Send inter-user warmup email
  async sendInterUserWarmupEmail(fromIntegration: any, toIntegration: any, warmupDay: number) {
    try {
      const trackingId = this.generateTrackingId();
      
      // Generate natural conversation-like email
      const subjects = [
        "Quick question about your services",
        "Checking in on our potential collaboration", 
        "Follow-up on our previous discussion",
        "Exploring partnership opportunities",
        "Your expertise in our upcoming project",
        "Introduction and potential synergy",
        "Reviewing options for our next quarter",
        "Partnership discussion - next steps?",
        "Collaborative opportunity ahead",
        "Following up on our connection"
      ];

      const bodies = [
        `Hi there,

I hope this message finds you well. I've been following your work and I'm impressed with your approach.

I'd love to discuss how we might collaborate on upcoming projects. Do you have time for a brief call this week?

Looking forward to hearing from you.

Best regards,
Team`,

        `Hello,

I was referred to you by a colleague who spoke highly of your expertise.

We're exploring new partnerships and I believe there could be great synergy between our organizations. 

Would you be interested in a brief conversation to explore possibilities?

Best,
Partnership Team`,

        `Hi,

I came across your profile and was intrigued by your recent projects.

We're currently evaluating potential collaborators for an exciting initiative. Your background seems like it could be a perfect fit.

Are you available for a quick chat sometime next week?

Regards,
Business Development`
      ];

      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const body = bodies[Math.floor(Math.random() * bodies.length)];
      
      const bodyWithTracking = `${body}

<img src="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/track/warmup/open/${trackingId}" width="1" height="1" style="display: none;" />`;

      // Send the email
      const success = await sendEmail(
        fromIntegration,
        toIntegration.email,
        subject,
        bodyWithTracking
      );

      if (success) {
        // Create warmup email record
        const warmupEmail = await db.insert(warmupEmails).values({
          fromIntegrationId: fromIntegration.id,
          toIntegrationId: toIntegration.id,
          subject,
          body: bodyWithTracking,
          status: 'sent',
          trackingId,
          warmupDay,
          deliveryLocation: 'unknown'
        });

        console.log(`Inter-user warmup email sent from ${fromIntegration.email} to ${toIntegration.email}`);
        return warmupEmail;
      }
    } catch (error) {
      console.error("Error sending inter-user warmup email:", error);
      throw error;
    }
  }

  // Get current day progress for an integration
  async getCurrentDayProgress(integrationId: number): Promise<any> {
    const today = new Date();
    const startDate = await this.getWarmupStartDate(integrationId);
    
    if (!startDate) {
      await this.initializeWarmupProgress(integrationId);
      return await this.getCurrentDayProgress(integrationId);
    }

    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.min(daysSinceStart, this.config.warmupDays);

    const [progress] = await db
      .select()
      .from(warmupProgress)
      .where(
        and(
          eq(warmupProgress.emailIntegrationId, integrationId),
          eq(warmupProgress.day, currentDay)
        )
      );

    return progress;
  }

  // Get warmup start date for an integration
  async getWarmupStartDate(integrationId: number) {
    const [firstProgress] = await db
      .select()
      .from(warmupProgress)
      .where(eq(warmupProgress.emailIntegrationId, integrationId))
      .orderBy(asc(warmupProgress.createdAt))
      .limit(1);

    return firstProgress?.createdAt || null;
  }

  // Update warmup statistics
  async updateWarmupStats(integrationId: number, updates: Partial<{
    emailsSent: number;
    emailsOpened: number;
    emailsReplied: number;
    emailsSpam: number;
    emailsBounced: number;
  }>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingStats] = await db
      .select()
      .from(warmupStats)
      .where(
        and(
          eq(warmupStats.emailIntegrationId, integrationId),
          sql`DATE(${warmupStats.date}) = DATE(${today})`
        )
      );

    if (existingStats) {
      // Update existing stats
      const updatedStats = {
        emailsSent: (existingStats.emailsSent || 0) + (updates.emailsSent || 0),
        emailsOpened: (existingStats.emailsOpened || 0) + (updates.emailsOpened || 0),
        emailsReplied: (existingStats.emailsReplied || 0) + (updates.emailsReplied || 0),
        emailsSpam: (existingStats.emailsSpam || 0) + (updates.emailsSpam || 0),
        emailsBounced: (existingStats.emailsBounced || 0) + (updates.emailsBounced || 0),
      };

      // Calculate rates
      const total = updatedStats.emailsSent || 1;
      const spamRate = (updatedStats.emailsSpam / total) * 100;
      const openRate = (updatedStats.emailsOpened / total) * 100;
      const replyRate = (updatedStats.emailsReplied / total) * 100;
      const bounceRate = (updatedStats.emailsBounced / total) * 100;

      // Calculate warmup score (lower spam rate = higher score)
      const warmupScore = Math.max(0, 100 - (spamRate * 2) - (bounceRate * 1.5) + (openRate * 0.5) + (replyRate * 1.5));

      await db
        .update(warmupStats)
        .set({
          ...updatedStats,
          spamRate,
          openRate,
          replyRate,
          bounceRate,
          warmupScore,
        })
        .where(eq(warmupStats.id, existingStats.id));
    } else {
      // Create new stats
      const newStats = {
        emailIntegrationId: integrationId,
        emailsSent: updates.emailsSent || 0,
        emailsOpened: updates.emailsOpened || 0,
        emailsReplied: updates.emailsReplied || 0,
        emailsSpam: updates.emailsSpam || 0,
        emailsBounced: updates.emailsBounced || 0,
        spamRate: 0,
        openRate: 0,
        replyRate: 0,
        bounceRate: 0,
        warmupScore: 100,
      };

      await db.insert(warmupStats).values(newStats);
    }
  }

  // Check if current day is completed and advance to next day
  async checkAndAdvanceDay(integrationId: number) {
    const progress = await this.getCurrentDayProgress(integrationId);
    if (!progress) return;

    const todayStats = await this.getTodayStats(integrationId);
    const emailsSentToday = todayStats.emailsSent || 0;

    // If target is reached, mark day as completed
    if (emailsSentToday >= progress.targetEmailsPerDay && !progress.isCompleted) {
      await db
        .update(warmupProgress)
        .set({ 
          isCompleted: true
        })
        .where(eq(warmupProgress.id, progress.id));

      // Initialize next day if not the last day
      const currentDay = progress.day;
      if (currentDay < this.config.warmupDays) {
        const nextDay = currentDay + 1;
        const nextDayTarget = Math.min(
          1 + (nextDay - 1) * this.config.dailyIncrease, // Start with 1 email on day 1
          this.config.maxDailyEmails
        );

        // Check if next day already exists
        const [existingNextDay] = await db
          .select()
          .from(warmupProgress)
          .where(
            and(
              eq(warmupProgress.emailIntegrationId, integrationId),
              eq(warmupProgress.day, nextDay)
            )
          );

        if (!existingNextDay) {
          await db.insert(warmupProgress).values({
            emailIntegrationId: integrationId,
            day: nextDay,
            targetEmailsPerDay: nextDayTarget,
            isCompleted: false,
          });
        }
      }
    }
  }

  // Reset warmup progress completion status
  async resetWarmupProgress(integrationId: number) {
    console.log(`Resetting warmup progress completion status for integration ${integrationId}`);
    
    // Reset all completion flags for this integration
    await db
      .update(warmupProgress)
      .set({ isCompleted: false })
      .where(eq(warmupProgress.emailIntegrationId, integrationId));
    
    console.log(`Reset completed for integration ${integrationId}`);
  }

  // Process warmup email actions (open, reply, mark as spam)
  async processWarmupEmailAction(emailId: number, action: 'open' | 'reply' | 'spam', replyBody?: string) {
    const [warmupEmail] = await db
      .select()
      .from(warmupEmails)
      .where(eq(warmupEmails.id, emailId));

    if (!warmupEmail) {
      throw new Error("Warmup email not found");
    }

    const updates: any = {};
    const now = new Date();

    switch (action) {
      case 'open':
        updates.openedAt = now;
        updates.status = 'opened';
        await this.updateWarmupStats(warmupEmail.toIntegrationId, { emailsOpened: 1 });
        break;
      case 'reply':
        updates.repliedAt = now;
        updates.status = 'replied';
        updates.replyBody = replyBody;
        await this.updateWarmupStats(warmupEmail.toIntegrationId, { emailsReplied: 1 });
        break;
      case 'spam':
        updates.isSpam = true;
        updates.status = 'spam';
        await this.updateWarmupStats(warmupEmail.toIntegrationId, { emailsSpam: 1 });
        break;
    }

    await db
      .update(warmupEmails)
      .set(updates)
      .where(eq(warmupEmails.id, emailId));
  }


}