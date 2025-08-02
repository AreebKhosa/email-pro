import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { storage } from '../storage';
import { warmupService } from './warmup';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export class ImapReader {
  private config: ImapConfig;
  private imap: Imap | null = null;

  constructor(config: ImapConfig) {
    this.config = config;
  }

  // Connect to IMAP server
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      this.imap.once('ready', () => {
        console.log('IMAP connection ready');
        resolve();
      });

      this.imap.once('error', (error: Error) => {
        console.error('IMAP connection error:', error);
        reject(error);
      });

      this.imap.connect();
    });
  }

  // Read recent emails and update warmup stats
  async readWarmupEmails(integrationId: number): Promise<void> {
    if (!this.imap) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox('INBOX', true, (error, box) => {
        if (error) {
          reject(error);
          return;
        }

        // Search for emails from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        this.imap!.search(['SINCE', yesterday], (searchError, results) => {
          if (searchError) {
            reject(searchError);
            return;
          }

          if (!results || results.length === 0) {
            console.log('No recent emails found');
            resolve();
            return;
          }

          const fetch = this.imap!.fetch(results, { bodies: '' });
          let processedEmails = 0;

          fetch.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (parseError, parsed) => {
                if (parseError) {
                  console.error('Email parsing error:', parseError);
                  return;
                }

                try {
                  // Check if this is a warmup email by looking for business-related subjects
                  const isWarmupEmail = this.isWarmupEmail(parsed.subject || '');
                  
                  if (isWarmupEmail) {
                    // Update warmup stats for email opens
                    await this.updateWarmupEmailStats(integrationId, parsed);
                  }
                } catch (updateError) {
                  console.error('Error updating warmup stats:', updateError);
                }
              });
            });
          });

          fetch.once('error', (fetchError) => {
            reject(fetchError);
          });

          fetch.once('end', () => {
            console.log(`Processed ${processedEmails} emails`);
            resolve();
          });
        });
      });
    });
  }

  // Check if email is a warmup email based on subject patterns
  private isWarmupEmail(subject: string): boolean {
    const warmupKeywords = [
      'quarterly business review',
      'market analysis',
      'strategic partnership',
      'business development',
      'project status',
      'collaboration proposal',
      'industry trends',
      'performance review',
      'strategic planning',
      'business intelligence'
    ];

    const lowerSubject = subject.toLowerCase();
    return warmupKeywords.some(keyword => lowerSubject.includes(keyword));
  }

  // Update warmup email statistics based on received email
  private async updateWarmupEmailStats(integrationId: number, parsedEmail: any): Promise<void> {
    try {
      // Find warmup email in database
      const warmupEmail = await storage.findWarmupEmailBySubject(integrationId, parsedEmail.subject);
      
      if (warmupEmail) {
        // Mark as opened/replied
        await storage.updateWarmupEmailStatus(warmupEmail.id, 'opened');
        
        // Update integration stats
        await warmupService.updateWarmupStats(integrationId, { 
          emailsOpened: 1 
        });

        // Check if email has reply content
        if (parsedEmail.text && parsedEmail.text.trim().length > 50) {
          await storage.updateWarmupEmailStatus(warmupEmail.id, 'replied');
          await warmupService.updateWarmupStats(integrationId, { 
            emailsReplied: 1 
          });
        }

        console.log(`Updated warmup stats for email: ${parsedEmail.subject}`);
      }
    } catch (error) {
      console.error('Error updating warmup email stats:', error);
    }
  }

  // Disconnect from IMAP server
  disconnect(): void {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }
}

// Service function to read emails for all warmup-enabled integrations
export async function readWarmupEmailsForUser(userId: string): Promise<void> {
  try {
    const integrations = await storage.getEmailIntegrations(userId);
    const warmupIntegrations = integrations.filter(int => int.warmupEnabled && int.isVerified);

    for (const integration of warmupIntegrations) {
      try {
        // Only process integrations with IMAP credentials
        if (!integration.smtpHost || !integration.smtpUsername || !integration.smtpPassword) {
          continue;
        }

        const imapReader = new ImapReader({
          host: integration.smtpHost,
          port: 993, // Standard IMAPS port
          user: integration.smtpUsername,
          password: integration.smtpPassword,
          tls: true
        });

        await imapReader.connect();
        await imapReader.readWarmupEmails(integration.id);
        imapReader.disconnect();

        console.log(`Processed warmup emails for ${integration.email}`);
      } catch (error) {
        console.error(`Error processing emails for ${integration.email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading warmup emails:', error);
  }
}