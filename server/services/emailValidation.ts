import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface EmailValidationResult {
  email: string;
  valid: boolean;
  checks: {
    syntax: boolean;
    dns: boolean;
    smtp: boolean;
  };
  details: {
    syntax_error?: string;
    dns_error?: string;
    smtp_error?: string;
    mx_records?: Array<{
      priority: number;
      exchange: string;
    }>;
    smtp?: {
      valid: boolean;
      mx_server?: string;
      smtp_response?: string;
      reason?: string;
      smtp_code?: number;
    };
  };
}

export class EmailValidationService {
  private pythonScript: string;

  constructor() {
    this.pythonScript = path.join(__dirname, 'emailValidator.py');
  }

  async validateEmail(email: string): Promise<EmailValidationResult> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.pythonScript, email]);
      
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout) as EmailValidationResult;
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse validation result: ${error}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
    });
  }

  async validateEmails(emails: string[]): Promise<EmailValidationResult[]> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.pythonScript, '--bulk', ...emails]);
      
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(stdout) as EmailValidationResult[];
            resolve(results);
          } catch (error) {
            reject(new Error(`Failed to parse validation results: ${error}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
    });
  }

  /**
   * Get deliverability status for display
   */
  getDeliverabilityStatus(result: EmailValidationResult): 'valid' | 'invalid' | 'risky' {
    if (!result.checks.syntax || !result.checks.dns) {
      return 'invalid';
    }
    
    if (!result.checks.smtp) {
      return 'risky'; // DNS valid but SMTP failed
    }
    
    return result.valid ? 'valid' : 'invalid';
  }

  /**
   * Get human-readable reason for validation result
   */
  getValidationReason(result: EmailValidationResult): string {
    if (!result.checks.syntax) {
      return result.details.syntax_error || 'Invalid email format';
    }
    
    if (!result.checks.dns) {
      return result.details.dns_error || 'Domain has no mail servers';
    }
    
    if (!result.checks.smtp) {
      return result.details.smtp_error || 'Mail server unreachable';
    }
    
    if (result.valid) {
      return 'Email address is valid and deliverable';
    }
    
    return 'Email validation failed';
  }
}

export const emailValidationService = new EmailValidationService();