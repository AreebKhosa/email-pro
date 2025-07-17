import OpenAI from "openai";
import type { Recipient } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface PersonalizationOptions {
  emailType: string;
  tone: string;
  maxCharacters: number;
  callToAction: string;
}

async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    // Simple website scraping - in production, use a proper web scraping service
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract basic content (title, meta description, etc.)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    
    const title = titleMatch ? titleMatch[1] : '';
    const description = descMatch ? descMatch[1] : '';
    
    return `Website: ${title}\nDescription: ${description}`;
  } catch (error) {
    console.error('Error scraping website:', error);
    return '';
  }
}

export async function personalizeEmail(
  recipient: Recipient,
  options: PersonalizationOptions
): Promise<string> {
  let websiteContent = '';
  
  if (recipient.websiteLink) {
    websiteContent = await scrapeWebsiteContent(recipient.websiteLink);
  }

  const prompt = `
    Create a personalized ${options.emailType} email with the following details:
    
    Recipient Information:
    - Name: ${recipient.name || 'there'} ${recipient.lastName || ''}
    - Company: ${recipient.companyName || 'N/A'}
    - Position: ${recipient.position || 'N/A'}
    - Email: ${recipient.email}
    
    Website Content:
    ${websiteContent || 'No website information available'}
    
    Email Requirements:
    - Type: ${options.emailType}
    - Tone: ${options.tone}
    - Maximum characters: ${options.maxCharacters}
    - Call to action: ${options.callToAction}
    
    Please write a personalized email that:
    1. Addresses the recipient by name
    2. References their company/position when available
    3. Uses information from their website to make it relevant
    4. Maintains the specified tone
    5. Includes the call to action naturally
    6. Stays within the character limit
    
    Return only the email content without subject line.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert email copywriter who creates personalized, engaging emails that convert well. Focus on being helpful and authentic rather than salesy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: Math.ceil(options.maxCharacters / 2), // Rough estimate for token limit
    });

    const personalizedEmail = response.choices[0]?.message?.content || '';
    
    // Ensure we stay within character limit
    if (personalizedEmail.length > options.maxCharacters) {
      return personalizedEmail.substring(0, options.maxCharacters - 3) + '...';
    }
    
    return personalizedEmail;
  } catch (error) {
    console.error('Error personalizing email with OpenAI:', error);
    throw new Error('Failed to personalize email');
  }
}

export async function generateEmailContent(
  subject: string,
  options: PersonalizationOptions
): Promise<{ subject: string; body: string }> {
  const prompt = `
    Generate email content for a ${options.emailType} campaign:
    
    Requirements:
    - Subject line (if not provided: "${subject}")
    - Email body
    - Tone: ${options.tone}
    - Maximum body characters: ${options.maxCharacters}
    - Call to action: ${options.callToAction}
    
    The email should be professional, engaging, and include placeholders like {name}, {company_name}, {position} for personalization.
    
    Respond in JSON format with "subject" and "body" fields.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert email marketing copywriter. Create compelling email content that converts well."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      subject: result.subject || subject,
      body: result.body || ''
    };
  } catch (error) {
    console.error('Error generating email content:', error);
    throw new Error('Failed to generate email content');
  }
}
