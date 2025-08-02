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
  minInterval: 15,
  maxInterval: 30,
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

    if (activeIntegrations.length < 2) {
      console.log("Need at least 2 active integrations for warmup");
      return;
    }

    let emailsSent = 0;
    let hasMoreToSend = false;

    for (const fromIntegration of activeIntegrations) {
      const progress = await this.getCurrentDayProgress(fromIntegration.id);
      if (!progress || progress.isCompleted) {
        continue;
      }

      const todayStats = await this.getTodayStats(fromIntegration.id);
      const remainingEmails = progress.targetEmailsPerDay - (todayStats.emailsSent || 0);

      if (remainingEmails <= 0) {
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

      // Send emails to other integrations
      const otherIntegrations = activeIntegrations.filter(
        (int) => int.id !== fromIntegration.id
      );

      for (let i = 0; i < Math.min(emailsToSend, otherIntegrations.length); i++) {
        const toIntegration = otherIntegrations[i];
        await this.sendSingleWarmupEmail(fromIntegration, toIntegration);
        emailsSent++;
      }
    }

    // Auto-continue: schedule next warmup cycle if there are more emails to send
    if (hasMoreToSend || emailsSent > 0) {
      console.log(`Sent ${emailsSent} warmup emails, scheduling next cycle in 30 minutes...`);
      setTimeout(() => {
        this.sendWarmupEmails(userId).catch(console.error);
      }, 30 * 60 * 1000); // 30 minutes between cycles
    } else {
      console.log("All warmup targets completed for today");
    }
  }

  // Send a single warmup email
  async sendSingleWarmupEmail(fromIntegration: any, toIntegration: any) {
    try {
      const content = await this.generateWarmupContent();
      
      const success = await sendEmail(
        fromIntegration,
        toIntegration.email,
        content.subject,
        content.body
      );

      if (success) {
        // Record the warmup email
        await db.insert(warmupEmails).values({
          fromIntegrationId: fromIntegration.id,
          toIntegrationId: toIntegration.id,
          subject: content.subject,
          body: content.body,
          status: "sent",
        });

        // Update statistics and progress
        await this.updateWarmupStats(fromIntegration.id, { emailsSent: 1 });
        
        // Check if day is completed and advance to next day if needed
        await this.checkAndAdvanceDay(fromIntegration.id);
        
        console.log(`Warmup email sent from ${fromIntegration.email} to ${toIntegration.email}`);
      } else {
        console.error(`Failed to send warmup email from ${fromIntegration.email} to ${toIntegration.email}`);
      }
    } catch (error) {
      console.error("Error sending warmup email:", error);
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