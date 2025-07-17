import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  plan: varchar("plan").notNull().default("demo"), // demo, starter, pro, premium
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email integrations
export const emailIntegrations = pgTable("email_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  smtpHost: varchar("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUsername: varchar("smtp_username").notNull(),
  smtpPassword: varchar("smtp_password").notNull(),
  imapHost: varchar("imap_host").notNull(),
  imapPort: integer("imap_port").notNull(),
  imapUsername: varchar("imap_username").notNull(),
  imapPassword: varchar("imap_password").notNull(),
  isVerified: boolean("is_verified").default(false),
  warmupEnabled: boolean("warmup_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipient lists
export const recipientLists = pgTable("recipient_lists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipients
export const recipients = pgTable("recipients", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => recipientLists.id, { onDelete: "cascade" }),
  name: varchar("name"),
  lastName: varchar("last_name"),
  companyName: varchar("company_name"),
  position: varchar("position"),
  email: varchar("email").notNull(),
  websiteLink: varchar("website_link"),
  personalizedEmail: text("personalized_email"),
  deliverabilityStatus: varchar("deliverability_status"), // valid, risky, invalid
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  recipientListId: integer("recipient_list_id").notNull().references(() => recipientLists.id),
  emailIntegrationId: integer("email_integration_id").notNull().references(() => emailIntegrations.id),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, scheduled, sending, completed, paused
  scheduledAt: timestamp("scheduled_at"),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  bouncedCount: integer("bounced_count").default(0),
  spamCount: integer("spam_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow-ups
export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  delayDays: integer("delay_days").notNull(),
  sentCount: integer("sent_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign emails (tracking individual email sends)
export const campaignEmails = pgTable("campaign_emails", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id").notNull().references(() => recipients.id, { onDelete: "cascade" }),
  followUpId: integer("follow_up_id").references(() => followUps.id),
  status: varchar("status").notNull().default("pending"), // pending, sent, delivered, opened, clicked, bounced, spam
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  trackingPixelId: varchar("tracking_pixel_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Warm-up emails
export const warmupEmails = pgTable("warmup_emails", {
  id: serial("id").primaryKey(),
  fromIntegrationId: integer("from_integration_id").notNull().references(() => emailIntegrations.id),
  toIntegrationId: integer("to_integration_id").notNull().references(() => emailIntegrations.id),
  subject: varchar("subject").notNull(),
  body: text("body").notNull(),
  status: varchar("status").notNull().default("sent"), // sent, delivered, opened, replied
  sentAt: timestamp("sent_at").defaultNow(),
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
});

// Usage tracking
export const usageTracking = pgTable("usage_tracking", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: varchar("month").notNull(), // YYYY-MM format
  emailsSent: integer("emails_sent").default(0),
  recipientsUploaded: integer("recipients_uploaded").default(0),
  deliverabilityChecks: integer("deliverability_checks").default(0),
  personalizedEmails: integer("personalized_emails").default(0),
  warmupEmails: integer("warmup_emails").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.month] }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  emailIntegrations: many(emailIntegrations),
  recipientLists: many(recipientLists),
  campaigns: many(campaigns),
  usageTracking: many(usageTracking),
}));

export const emailIntegrationsRelations = relations(emailIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [emailIntegrations.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
  warmupEmailsFrom: many(warmupEmails, { relationName: "fromIntegration" }),
  warmupEmailsTo: many(warmupEmails, { relationName: "toIntegration" }),
}));

export const recipientListsRelations = relations(recipientLists, ({ one, many }) => ({
  user: one(users, {
    fields: [recipientLists.userId],
    references: [users.id],
  }),
  recipients: many(recipients),
  campaigns: many(campaigns),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  list: one(recipientLists, {
    fields: [recipients.listId],
    references: [recipientLists.id],
  }),
  campaignEmails: many(campaignEmails),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  recipientList: one(recipientLists, {
    fields: [campaigns.recipientListId],
    references: [recipientLists.id],
  }),
  emailIntegration: one(emailIntegrations, {
    fields: [campaigns.emailIntegrationId],
    references: [emailIntegrations.id],
  }),
  followUps: many(followUps),
  campaignEmails: many(campaignEmails),
}));

export const followUpsRelations = relations(followUps, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [followUps.campaignId],
    references: [campaigns.id],
  }),
  campaignEmails: many(campaignEmails),
}));

export const campaignEmailsRelations = relations(campaignEmails, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignEmails.campaignId],
    references: [campaigns.id],
  }),
  recipient: one(recipients, {
    fields: [campaignEmails.recipientId],
    references: [recipients.id],
  }),
  followUp: one(followUps, {
    fields: [campaignEmails.followUpId],
    references: [followUps.id],
  }),
}));

export const warmupEmailsRelations = relations(warmupEmails, ({ one }) => ({
  fromIntegration: one(emailIntegrations, {
    fields: [warmupEmails.fromIntegrationId],
    references: [emailIntegrations.id],
    relationName: "fromIntegration",
  }),
  toIntegration: one(emailIntegrations, {
    fields: [warmupEmails.toIntegrationId],
    references: [emailIntegrations.id],
    relationName: "toIntegration",
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, {
    fields: [usageTracking.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertEmailIntegrationSchema = createInsertSchema(emailIntegrations).omit({
  id: true,
  userId: true,
  isVerified: true,
  createdAt: true,
});

export const insertRecipientListSchema = createInsertSchema(recipientLists).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  userId: true,
  sentCount: true,
  deliveredCount: true,
  openedCount: true,
  clickedCount: true,
  bouncedCount: true,
  spamCount: true,
  createdAt: true,
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({
  id: true,
  sentCount: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type EmailIntegration = typeof emailIntegrations.$inferSelect;
export type InsertEmailIntegration = z.infer<typeof insertEmailIntegrationSchema>;
export type RecipientList = typeof recipientLists.$inferSelect;
export type InsertRecipientList = z.infer<typeof insertRecipientListSchema>;
export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = z.infer<typeof insertRecipientSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type CampaignEmail = typeof campaignEmails.$inferSelect;
export type WarmupEmail = typeof warmupEmails.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;
