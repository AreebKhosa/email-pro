import { Campaign, EmailIntegration, Recipient } from "@shared/schema";
import { storage } from "../storage";

export interface EmailRotationConfig {
  emailRotationEnabled: boolean;
  emailRotationIds: number[];
  emailsPerAccount: number;
  emailDelay: number;
  dailyLimit: number;
  timeWindowStart: string;
  timeWindowEnd: string;
}

export interface EmailSendingPlan {
  recipientId: number;
  emailIntegrationId: number;
  scheduledAt: Date;
  delayMinutes: number;
}

export class EmailRotationService {
  /**
   * Creates a sending plan for all recipients in a campaign
   */
  static async createSendingPlan(
    campaign: Campaign,
    recipients: Recipient[],
    emailIntegrations: EmailIntegration[]
  ): Promise<EmailSendingPlan[]> {
    const plan: EmailSendingPlan[] = [];
    
    // If email rotation is not enabled, use the primary email integration
    if (!campaign.emailRotationEnabled || !campaign.emailRotationIds || campaign.emailRotationIds.length === 0) {
      const baseTime = new Date();
      baseTime.setHours(parseInt(campaign.timeWindowStart?.split(':')[0] || '8'), 0, 0, 0);
      
      recipients.forEach((recipient, index) => {
        const scheduledAt = new Date(baseTime);
        scheduledAt.setMinutes(scheduledAt.getMinutes() + (index * (campaign.emailDelay || 5)));
        
        plan.push({
          recipientId: recipient.id,
          emailIntegrationId: campaign.emailIntegrationId,
          scheduledAt,
          delayMinutes: index * (campaign.emailDelay || 5)
        });
      });
      
      return plan;
    }

    // Email rotation is enabled - distribute emails across multiple accounts
    const rotationIds = campaign.emailRotationIds;
    const emailsPerAccount = campaign.emailsPerAccount || 30;
    const emailDelay = campaign.emailDelay || 5;
    const dailyLimit = campaign.dailyLimit || 50;
    
    const baseTime = new Date();
    baseTime.setHours(parseInt(campaign.timeWindowStart?.split(':')[0] || '8'), 0, 0, 0);
    
    let currentEmailIndex = 0;
    let emailsSentFromCurrentAccount = 0;
    let totalEmailsToday = 0;
    let currentDay = 0;
    
    recipients.forEach((recipient, index) => {
      // Check if we need to switch to the next email account
      if (emailsSentFromCurrentAccount >= emailsPerAccount) {
        currentEmailIndex = (currentEmailIndex + 1) % rotationIds.length;
        emailsSentFromCurrentAccount = 0;
      }
      
      // Check if we've reached the daily limit
      if (totalEmailsToday >= dailyLimit) {
        currentDay++;
        totalEmailsToday = 0;
        // Reset time to the start of the next day
        baseTime.setDate(baseTime.getDate() + 1);
        baseTime.setHours(parseInt(campaign.timeWindowStart?.split(':')[0] || '8'), 0, 0, 0);
      }
      
      const scheduledAt = new Date(baseTime);
      scheduledAt.setMinutes(scheduledAt.getMinutes() + (totalEmailsToday * emailDelay));
      
      plan.push({
        recipientId: recipient.id,
        emailIntegrationId: rotationIds[currentEmailIndex],
        scheduledAt,
        delayMinutes: (currentDay * 24 * 60) + (totalEmailsToday * emailDelay)
      });
      
      emailsSentFromCurrentAccount++;
      totalEmailsToday++;
    });
    
    return plan;
  }
  
  /**
   * Validates that all email integrations in rotation are verified
   */
  static validateEmailIntegrations(
    emailIntegrations: EmailIntegration[],
    rotationIds: number[]
  ): { valid: boolean; missingIds: number[] } {
    const missingIds: number[] = [];
    
    for (const id of rotationIds) {
      const integration = emailIntegrations.find(e => e.id === id);
      if (!integration || !integration.isVerified) {
        missingIds.push(id);
      }
    }
    
    return {
      valid: missingIds.length === 0,
      missingIds
    };
  }
  
  /**
   * Calculates estimated completion time for a campaign
   */
  static estimateCompletionTime(
    recipientCount: number,
    config: EmailRotationConfig
  ): { days: number; hours: number; minutes: number } {
    const emailDelay = config.emailDelay || 5;
    const dailyLimit = config.dailyLimit || 50;
    const timeWindowHours = 9; // Assume 9-hour working day
    
    const totalMinutes = recipientCount * emailDelay;
    const emailsPerDay = Math.min(dailyLimit, Math.floor((timeWindowHours * 60) / emailDelay));
    const totalDays = Math.ceil(recipientCount / emailsPerDay);
    
    return {
      days: totalDays,
      hours: Math.floor((totalMinutes % (24 * 60)) / 60),
      minutes: totalMinutes % 60
    };
  }
}