import {
  users,
  emailIntegrations,
  recipientLists,
  recipients,
  campaigns,
  followUps,
  campaignEmails,
  warmupEmails,
  warmupStats,
  warmupProgress,
  usageTracking,
  type User,
  type UpsertUser,
  type EmailIntegration,
  type InsertEmailIntegration,
  type RecipientList,
  type InsertRecipientList,
  type Recipient,
  type InsertRecipient,
  type Campaign,
  type InsertCampaign,
  type FollowUp,
  type InsertFollowUp,
  type CampaignEmail,
  type WarmupEmail,
  type WarmupStats,
  type WarmupProgress,
  type UsageTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  updateUserGoogleId(userId: string, googleId: string): Promise<User>;
  updateUser(userId: string, userData: Partial<UpsertUser>): Promise<User>;

  // Email integrations
  createEmailIntegration(userId: string, integration: InsertEmailIntegration): Promise<EmailIntegration>;
  getUserEmailIntegrations(userId: string): Promise<EmailIntegration[]>;
  updateEmailIntegrationVerification(id: number, isVerified: boolean): Promise<EmailIntegration>;
  toggleWarmup(id: number, enabled: boolean): Promise<EmailIntegration>;
  deleteEmailIntegration(id: number): Promise<void>;

  // Recipient lists
  createRecipientList(userId: string, list: InsertRecipientList): Promise<RecipientList>;
  getUserRecipientLists(userId: string): Promise<RecipientList[]>;
  getRecipientList(id: number): Promise<RecipientList | undefined>;
  deleteRecipientList(id: number): Promise<void>;

  // Recipients
  addRecipient(recipient: InsertRecipient): Promise<Recipient>;
  addRecipients(recipients: InsertRecipient[]): Promise<Recipient[]>;
  getRecipient(id: number): Promise<Recipient | undefined>;
  getListRecipients(listId: number): Promise<Recipient[]>;
  getRecentRecipients(userId: string, limit?: number): Promise<Recipient[]>;
  updateRecipientDeliverability(id: number, status: string): Promise<Recipient>;
  updateRecipientPersonalizedEmail(id: number, personalizedEmail: string): Promise<Recipient>;
  deleteRecipient(id: number): Promise<void>;
  updateAllRecipientCounts(userId: string): Promise<void>;
  removeInvalidRecipients(listId: number): Promise<number>;
  getCleanRecipients(listId: number): Promise<Recipient[]>;
  getValidationStats(listId: number): Promise<any>;

  // Campaigns
  createCampaign(userId: string, campaign: InsertCampaign): Promise<Campaign>;
  getUserCampaigns(userId: string): Promise<Campaign[]>;
  getCampaign(campaignId: number): Promise<Campaign | undefined>;
  updateCampaignStatus(campaignId: number, status: string): Promise<Campaign>;
  updateCampaign(campaignId: number, updateData: Partial<Campaign>): Promise<Campaign>;
  updateCampaignStats(id: number, stats: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;

  // Follow-ups
  addFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  getCampaignFollowUps(campaignId: number): Promise<FollowUp[]>;
  deleteFollowUp(id: number): Promise<void>;

  // Campaign emails
  createCampaignEmail(email: Omit<CampaignEmail, 'id' | 'createdAt'>): Promise<CampaignEmail>;
  updateCampaignEmailStatus(id: number, status: string, timestamp?: Date): Promise<CampaignEmail>;
  getCampaignEmails(campaignId: number): Promise<CampaignEmail[]>;

  // Warm-up
  createWarmupEmail(email: Omit<WarmupEmail, 'id' | 'sentAt'>): Promise<WarmupEmail>;
  getWarmupStats(integrationId: number): Promise<{ sent: number; received: number; opened: number; replied: number }>;
  getWarmupProgress(integrationId: number): Promise<WarmupProgress[]>;
  getTodayWarmupStats(integrationId: number): Promise<WarmupStats | undefined>;

  // Usage tracking
  getCurrentMonthUsage(userId: string): Promise<UsageTracking | undefined>;
  updateUsage(userId: string, month: string, usage: Partial<UsageTracking>): Promise<UsageTracking>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalCampaigns: number;
    emailsSent: number;
    openRate: number;
    clickRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserGoogleId(userId: string, googleId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ googleId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPlan(userId: string, plan: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ plan, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Email integrations
  async createEmailIntegration(userId: string, integration: InsertEmailIntegration): Promise<EmailIntegration> {
    const [emailIntegration] = await db
      .insert(emailIntegrations)
      .values({ ...integration, userId })
      .returning();
    return emailIntegration;
  }

  async getUserEmailIntegrations(userId: string): Promise<EmailIntegration[]> {
    return await db
      .select()
      .from(emailIntegrations)
      .where(eq(emailIntegrations.userId, userId))
      .orderBy(desc(emailIntegrations.createdAt));
  }

  async updateEmailIntegrationVerification(id: number, isVerified: boolean): Promise<EmailIntegration> {
    const [integration] = await db
      .update(emailIntegrations)
      .set({ isVerified })
      .where(eq(emailIntegrations.id, id))
      .returning();
    return integration;
  }

  async toggleWarmup(id: number, enabled: boolean): Promise<EmailIntegration> {
    const [integration] = await db
      .update(emailIntegrations)
      .set({ warmupEnabled: enabled })
      .where(eq(emailIntegrations.id, id))
      .returning();
    return integration;
  }

  async deleteEmailIntegration(id: number): Promise<void> {
    await db.delete(emailIntegrations).where(eq(emailIntegrations.id, id));
  }

  // Recipient lists
  async createRecipientList(userId: string, list: InsertRecipientList): Promise<RecipientList> {
    const [recipientList] = await db
      .insert(recipientLists)
      .values({ ...list, userId })
      .returning();
    return recipientList;
  }

  async getUserRecipientLists(userId: string): Promise<RecipientList[]> {
    const lists = await db
      .select({
        id: recipientLists.id,
        userId: recipientLists.userId,
        name: recipientLists.name,
        description: recipientLists.description,
        createdAt: recipientLists.createdAt,
        recipientCount: count(recipients.id)
      })
      .from(recipientLists)
      .leftJoin(recipients, eq(recipients.listId, recipientLists.id))
      .where(eq(recipientLists.userId, userId))
      .groupBy(recipientLists.id)
      .orderBy(desc(recipientLists.createdAt));
    
    return lists;
  }

  async getRecipientList(id: number): Promise<RecipientList | undefined> {
    const [list] = await db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.id, id));
    return list;
  }

  async deleteRecipientList(id: number): Promise<void> {
    await db.delete(recipientLists).where(eq(recipientLists.id, id));
  }

  // Recipients
  async addRecipient(recipient: InsertRecipient): Promise<Recipient> {
    const [newRecipient] = await db
      .insert(recipients)
      .values(recipient)
      .returning();
    return newRecipient;
  }

  // Alias for addRecipient
  async createRecipient(recipient: InsertRecipient): Promise<Recipient> {
    return this.addRecipient(recipient);
  }

  async addRecipients(recipientData: InsertRecipient[]): Promise<Recipient[]> {
    return await db
      .insert(recipients)
      .values(recipientData)
      .returning();
  }

  async getRecipient(id: number): Promise<Recipient | undefined> {
    const [recipient] = await db
      .select()
      .from(recipients)
      .where(eq(recipients.id, id));
    return recipient;
  }

  async getListRecipients(listId: number): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.listId, listId))
      .orderBy(desc(recipients.createdAt));
  }

  async getRecentRecipients(userId: string, limit: number = 5): Promise<Recipient[]> {
    return await db
      .select({
        id: recipients.id,
        listId: recipients.listId,
        name: recipients.name,
        lastName: recipients.lastName,
        email: recipients.email,
        companyName: recipients.companyName,
        position: recipients.position,
        websiteLink: recipients.websiteLink,
        deliverabilityStatus: recipients.deliverabilityStatus,
        personalizedEmail: recipients.personalizedEmail,
        createdAt: recipients.createdAt,
        listName: recipientLists.name,
      })
      .from(recipients)
      .leftJoin(recipientLists, eq(recipients.listId, recipientLists.id))
      .where(eq(recipientLists.userId, userId))
      .orderBy(desc(recipients.createdAt))
      .limit(limit);
  }

  async updateRecipientDeliverability(id: number, status: string): Promise<Recipient> {
    const [recipient] = await db
      .update(recipients)
      .set({ deliverabilityStatus: status })
      .where(eq(recipients.id, id))
      .returning();
    return recipient;
  }

  async updateRecipientPersonalizedEmail(id: number, personalizedEmail: string): Promise<Recipient> {
    const [recipient] = await db
      .update(recipients)
      .set({ personalizedEmail })
      .where(eq(recipients.id, id))
      .returning();
    return recipient;
  }

  async deleteRecipient(id: number): Promise<void> {
    await db.delete(recipients).where(eq(recipients.id, id));
  }

  async updateAllRecipientCounts(userId: string): Promise<void> {
    // No-op: recipient counts are calculated dynamically, not stored
    // This method exists for compatibility but doesn't need to do anything
    // since the recipient count is computed on-demand via SQL COUNT queries
  }

  async removeInvalidRecipients(listId: number): Promise<number> {
    try {
      const result = await db
        .delete(recipients)
        .where(and(eq(recipients.listId, listId), eq(recipients.deliverabilityStatus, 'invalid')));
      
      // Update the recipient count for this list
      const countResult = await db
        .select({ count: count() })
        .from(recipients)
        .where(eq(recipients.listId, listId));

      await db
        .update(recipientLists)
        .set({ recipientCount: Number(countResult[0]?.count || 0) })
        .where(eq(recipientLists.id, listId));
      
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error in removeInvalidRecipients:", error);
      // Fallback with raw SQL if Drizzle fails
      try {
        const result = await db.execute(sql`
          DELETE FROM recipients 
          WHERE list_id = ${listId} AND deliverability_status = 'invalid'
        `);
        
        // Counts are calculated dynamically, no need to update stored counts
        
        return result.rowCount || 0;
      } catch (fallbackError) {
        console.error("Fallback removeInvalidRecipients failed:", fallbackError);
        throw fallbackError;
      }
    }
  }

  async getCleanRecipients(listId: number): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(and(eq(recipients.listId, listId), eq(recipients.deliverabilityStatus, 'valid')));
  }

  async getValidationStats(listId: number): Promise<any> {
    const stats = await db
      .select({
        status: recipients.deliverabilityStatus,
        count: count()
      })
      .from(recipients)
      .where(eq(recipients.listId, listId))
      .groupBy(recipients.deliverabilityStatus);

    const result = { valid: 0, risky: 0, invalid: 0, pending: 0 };
    
    stats.forEach((stat: any) => {
      if (stat.status && result.hasOwnProperty(stat.status)) {
        result[stat.status as keyof typeof result] = Number(stat.count);
      }
    });

    return result;
  }

  // Campaigns
  async createCampaign(userId: string, campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values({ ...campaign, userId })
      .returning();
    return newCampaign;
  }

  async getUserCampaigns(userId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));
    return campaign;
  }

  async updateCampaignStatus(id: number, status: string): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ status })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async updateCampaignStats(id: number, stats: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set(stats)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Follow-ups
  async addFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const [newFollowUp] = await db
      .insert(followUps)
      .values(followUp)
      .returning();
    return newFollowUp;
  }

  async getCampaignFollowUps(campaignId: number): Promise<FollowUp[]> {
    return await db
      .select()
      .from(followUps)
      .where(eq(followUps.campaignId, campaignId))
      .orderBy(followUps.delayDays);
  }

  async deleteFollowUp(id: number): Promise<void> {
    await db.delete(followUps).where(eq(followUps.id, id));
  }

  // Campaign emails
  async createCampaignEmail(email: Omit<CampaignEmail, 'id' | 'createdAt'>): Promise<CampaignEmail> {
    const [campaignEmail] = await db
      .insert(campaignEmails)
      .values(email)
      .returning();
    return campaignEmail;
  }

  async updateCampaignEmailStatus(id: number, status: string, timestamp?: Date): Promise<CampaignEmail> {
    const updateData: any = { status };
    
    if (timestamp) {
      switch (status) {
        case 'sent':
          updateData.sentAt = timestamp;
          break;
        case 'delivered':
          updateData.deliveredAt = timestamp;
          break;
        case 'opened':
          updateData.openedAt = timestamp;
          break;
        case 'clicked':
          updateData.clickedAt = timestamp;
          break;
      }
    }

    const [campaignEmail] = await db
      .update(campaignEmails)
      .set(updateData)
      .where(eq(campaignEmails.id, id))
      .returning();
    return campaignEmail;
  }

  async getCampaignEmails(campaignId: number): Promise<CampaignEmail[]> {
    return await db
      .select()
      .from(campaignEmails)
      .where(eq(campaignEmails.campaignId, campaignId));
  }

  // Warm-up
  async createWarmupEmail(email: Omit<WarmupEmail, 'id' | 'sentAt'>): Promise<WarmupEmail> {
    const [warmupEmail] = await db
      .insert(warmupEmails)
      .values(email)
      .returning();
    return warmupEmail;
  }

  async getWarmupStats(integrationId: number): Promise<{ sent: number; received: number; opened: number; replied: number }> {
    const [sentStats] = await db
      .select({ count: count() })
      .from(warmupEmails)
      .where(eq(warmupEmails.fromIntegrationId, integrationId));

    const [receivedStats] = await db
      .select({ count: count() })
      .from(warmupEmails)
      .where(eq(warmupEmails.toIntegrationId, integrationId));

    const [openedStats] = await db
      .select({ count: count() })
      .from(warmupEmails)
      .where(and(
        eq(warmupEmails.fromIntegrationId, integrationId),
        eq(warmupEmails.status, 'opened')
      ));

    const [repliedStats] = await db
      .select({ count: count() })
      .from(warmupEmails)
      .where(and(
        eq(warmupEmails.fromIntegrationId, integrationId),
        eq(warmupEmails.status, 'replied')
      ));

    return {
      sent: sentStats.count,
      received: receivedStats.count,
      opened: openedStats.count,
      replied: repliedStats.count,
    };
  }

  async getWarmupProgress(integrationId: number): Promise<WarmupProgress[]> {
    return await db
      .select()
      .from(warmupProgress)
      .where(eq(warmupProgress.emailIntegrationId, integrationId))
      .orderBy(warmupProgress.day);
  }

  async getTodayWarmupStats(integrationId: number): Promise<WarmupStats | undefined> {
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
      );
    return stats;
  }

  // Usage tracking
  async getCurrentMonthUsage(userId: string): Promise<UsageTracking | undefined> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [usage] = await db
      .select()
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.month, currentMonth)
      ));
    return usage;
  }

  async updateUsage(userId: string, month: string, usage: Partial<UsageTracking>): Promise<UsageTracking> {
    const [updatedUsage] = await db
      .insert(usageTracking)
      .values({ userId, month, ...usage })
      .onConflictDoUpdate({
        target: [usageTracking.userId, usageTracking.month],
        set: usage,
      })
      .returning();
    return updatedUsage;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalCampaigns: number;
    emailsSent: number;
    openRate: number;
    clickRate: number;
  }> {
    const [campaignStats] = await db
      .select({
        totalCampaigns: count(),
        totalSent: sum(campaigns.sentCount),
        totalOpened: sum(campaigns.openedCount),
        totalClicked: sum(campaigns.clickedCount),
      })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    const totalSent = Number(campaignStats.totalSent) || 0;
    const totalOpened = Number(campaignStats.totalOpened) || 0;
    const totalClicked = Number(campaignStats.totalClicked) || 0;

    return {
      totalCampaigns: campaignStats.totalCampaigns,
      emailsSent: totalSent,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    };
  }

  // Campaign management methods


  async updateCampaign(campaignId: number, updateData: Partial<Campaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaignId))
      .returning();
    return updatedCampaign;
  }
}

export const storage = new DatabaseStorage();
