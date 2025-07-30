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
  emailVerificationTokens,
  passwordResetTokens,
  adminConfig,
  adminUsers,
  type User,
  type UpsertUser,
  type AdminConfig,
  type InsertAdminConfig,
  type AdminUser,
  type InsertAdminUser,
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
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
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
  updateUserEmailVerified(userId: string, verified: boolean): Promise<User>;

  // Email verification tokens
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<void>;
  deleteExpiredEmailVerificationTokens(): Promise<void>;

  // Password reset tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  // Admin management
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  updateAdminLastLogin(id: number): Promise<AdminUser>;
  
  // Admin configuration
  setConfig(key: string, value: string, isSecret?: boolean): Promise<AdminConfig>;
  getConfig(key: string): Promise<AdminConfig | undefined>;
  getAllConfig(): Promise<AdminConfig[]>;
  deleteConfig(key: string): Promise<void>;

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

  async updateUserEmailVerified(userId: string, verified: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: verified, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Email verification token methods
  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [verificationToken] = await db
      .insert(emailVerificationTokens)
      .values(token)
      .returning();
    return verificationToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
  }

  async deleteExpiredEmailVerificationTokens(): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(sql`expires_at < NOW()`);
  }

  // Password reset token methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`expires_at < NOW()`);
  }

  // Admin user management
  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [adminUser] = await db
      .insert(adminUsers)
      .values(admin)
      .returning();
    return adminUser;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));
    return admin;
  }

  async updateAdminLastLogin(id: number): Promise<AdminUser> {
    const [admin] = await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return admin;
  }

  // Admin configuration management
  async setConfig(key: string, value: string, isSecret = false): Promise<AdminConfig> {
    const [config] = await db
      .insert(adminConfig)
      .values({
        configKey: key,
        configValue: value,
        isSecret,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: adminConfig.configKey,
        set: {
          configValue: value,
          updatedAt: new Date()
        }
      })
      .returning();
    return config;
  }

  async getConfig(key: string): Promise<AdminConfig | undefined> {
    const [config] = await db
      .select()
      .from(adminConfig)
      .where(eq(adminConfig.configKey, key));
    return config;
  }

  async getAllConfig(): Promise<AdminConfig[]> {
    return await db
      .select()
      .from(adminConfig)
      .orderBy(adminConfig.configKey);
  }

  async deleteConfig(key: string): Promise<void> {
    await db
      .delete(adminConfig)
      .where(eq(adminConfig.configKey, key));
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
    console.log(`Saving personalized email for recipient ${id}, length: ${personalizedEmail.length}`);
    const [recipient] = await db
      .update(recipients)
      .set({ personalizedEmail })
      .where(eq(recipients.id, id))
      .returning();
    
    if (recipient?.personalizedEmail) {
      console.log(`Verified email saved successfully, actual length: ${recipient.personalizedEmail.length}`);
    } else {
      console.error(`Failed to verify email save for recipient ${id}`);
    }
    
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
      .where(and(
        eq(campaigns.userId, userId),
        sql`status != 'deleted'`  // Exclude soft-deleted campaigns
      ))
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



  async getCampaignStats(id: number): Promise<any> {
    const campaign = await this.getCampaign(id);
    if (!campaign) return null;

    return {
      totalRecipients: campaign.totalRecipients || 0,
      sentCount: campaign.sentCount || 0,
      deliveredCount: campaign.deliveredCount || 0,
      openedCount: campaign.openedCount || 0,
      clickedCount: campaign.clickedCount || 0,
      bouncedCount: campaign.bouncedCount || 0,
      spamCount: campaign.spamCount || 0,
      openRate: campaign.sentCount > 0 ? ((campaign.openedCount || 0) / campaign.sentCount * 100).toFixed(1) : '0',
      clickRate: campaign.sentCount > 0 ? ((campaign.clickedCount || 0) / campaign.sentCount * 100).toFixed(1) : '0',
      deliveryRate: campaign.sentCount > 0 ? ((campaign.deliveredCount || 0) / campaign.sentCount * 100).toFixed(1) : '0',
    };
  }

  async getEmailIntegration(id: number): Promise<EmailIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(emailIntegrations)
      .where(eq(emailIntegrations.id, id));
    return integration;
  }

  async deleteCampaign(id: number, preserveStats: boolean = false): Promise<void> {
    if (preserveStats) {
      // For completed campaigns, only mark as deleted but preserve for stats
      // We'll add a soft delete by setting a deletedAt timestamp
      await db
        .update(campaigns)
        .set({ 
          name: '[DELETED] ' + (await this.getCampaign(id))?.name || 'Campaign',
          status: 'deleted',
          updatedAt: new Date()
        })
        .where(eq(campaigns.id, id));
    } else {
      // For incomplete campaigns, hard delete
      await db.delete(campaigns).where(eq(campaigns.id, id));
    }
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

  // Campaign email tracking methods
  async getCampaignEmailByTracking(trackingPixelId: string): Promise<CampaignEmail | undefined> {
    const [campaignEmail] = await db
      .select()
      .from(campaignEmails)
      .where(eq(campaignEmails.trackingPixelId, trackingPixelId));
    return campaignEmail;
  }

  async updateCampaignEmail(id: number, updates: Partial<CampaignEmail>): Promise<CampaignEmail> {
    const [updatedEmail] = await db
      .update(campaignEmails)
      .set({ ...updates, createdAt: new Date() })
      .where(eq(campaignEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async markCampaignEmailAsOpened(trackingPixelId: string): Promise<void> {
    const campaignEmail = await this.getCampaignEmailByTracking(trackingPixelId);
    if (campaignEmail && !campaignEmail.openedAt) {
      await this.updateCampaignEmail(campaignEmail.id, {
        status: 'opened',
        openedAt: new Date(),
      });
      
      // Update campaign stats
      const [campaignId] = trackingPixelId.split('_');
      if (campaignId) {
        const campaign = await this.getCampaign(parseInt(campaignId));
        if (campaign) {
          const newOpenedCount = (campaign.openedCount || 0) + 1;
          await this.updateCampaignStats(parseInt(campaignId), { openedCount: newOpenedCount });
        }
      }
    }
  }

  async markCampaignEmailAsClicked(trackingPixelId: string): Promise<void> {
    const campaignEmail = await this.getCampaignEmailByTracking(trackingPixelId);
    if (campaignEmail) {
      await this.updateCampaignEmail(campaignEmail.id, {
        status: 'clicked',
        clickedAt: new Date(),
      });
      
      // Update campaign stats
      const [campaignId] = trackingPixelId.split('_');
      if (campaignId) {
        const campaign = await this.getCampaign(parseInt(campaignId));
        if (campaign) {
          const newClickedCount = (campaign.clickedCount || 0) + 1;
          await this.updateCampaignStats(parseInt(campaignId), { clickedCount: newClickedCount });
        }
      }
    }
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalCampaigns: number;
    emailsSent: number;
    openRate: number;
    clickRate: number;
  }> {
    // Get stats from all campaigns (including soft-deleted ones) to preserve email counts
    const [campaignStats] = await db
      .select({
        totalCampaigns: count(),
        totalSent: sum(campaigns.sentCount),
        totalOpened: sum(campaigns.openedCount),
        totalClicked: sum(campaigns.clickedCount),
      })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    // Get count of only active campaigns (non-deleted) for campaign count
    const [activeCampaignStats] = await db
      .select({
        activeCampaigns: count(),
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.userId, userId),
        sql`status != 'deleted'`
      ));

    const totalSent = Number(campaignStats.totalSent) || 0;
    const totalOpened = Number(campaignStats.totalOpened) || 0;
    const totalClicked = Number(campaignStats.totalClicked) || 0;

    return {
      totalCampaigns: activeCampaignStats.activeCampaigns, // Only count active campaigns
      emailsSent: totalSent, // Keep all email counts from all campaigns (including deleted)
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
