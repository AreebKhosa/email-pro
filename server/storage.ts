import {
  users,
  emailIntegrations,
  recipientLists,
  recipients,
  campaigns,
  followUps,
  campaignEmails,
  warmupEmails,
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
  type UsageTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;

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
  getListRecipients(listId: number): Promise<Recipient[]>;
  updateRecipientDeliverability(id: number, status: string): Promise<Recipient>;
  updateRecipientPersonalizedEmail(id: number, personalizedEmail: string): Promise<Recipient>;
  deleteRecipient(id: number): Promise<void>;

  // Campaigns
  createCampaign(userId: string, campaign: InsertCampaign): Promise<Campaign>;
  getUserCampaigns(userId: string): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  updateCampaignStatus(id: number, status: string): Promise<Campaign>;
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
    return await db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.userId, userId))
      .orderBy(desc(recipientLists.createdAt));
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

  async addRecipients(recipientData: InsertRecipient[]): Promise<Recipient[]> {
    return await db
      .insert(recipients)
      .values(recipientData)
      .returning();
  }

  async getListRecipients(listId: number): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.listId, listId))
      .orderBy(desc(recipients.createdAt));
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
}

export const storage = new DatabaseStorage();
