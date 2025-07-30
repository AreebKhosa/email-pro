import { GoogleGenAI } from "@google/genai";
import type { Recipient } from "@shared/schema";
import { storage } from '../storage';

let gemini: GoogleGenAI;

async function getGeminiInstance(): Promise<GoogleGenAI> {
  if (!gemini) {
    // Try to get Gemini API key from admin config first
    const geminiApiKeyConfig = await storage.getConfig('gemini_api_key');
    const geminiApiKey = typeof geminiApiKeyConfig === 'string' ? geminiApiKeyConfig : geminiApiKeyConfig?.configValue;
    
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    } else if (process.env.GEMINI_API_KEY) {
      // Fallback to environment variable
      gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } else {
      throw new Error('Gemini API Key not configured');
    }
  }
  return gemini;
}

export interface PersonalizationOptions {
  emailType: string;
  tone: string;
  maxCharacters: number;
  callToAction: string;
}

export async function personalizeEmailContent(
  recipient: Recipient,
  websiteContent: string | null,
  options: PersonalizationOptions
): Promise<string> {
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
    const geminiInstance = await getGeminiInstance();
    const response = await geminiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        systemInstruction: "You are an expert email copywriter who creates personalized, engaging emails that convert well. Focus on being helpful and authentic rather than salesy."
      }
    });

    const personalizedEmail = response.text || '';
    
    // Ensure we stay within character limit
    if (personalizedEmail.length > options.maxCharacters) {
      return personalizedEmail.substring(0, options.maxCharacters - 3) + '...';
    }
    
    return personalizedEmail;
  } catch (error: any) {
    console.error('Error personalizing email with Gemini:', error);
    if (error.status === 401 || error.message?.includes('API key')) {
      throw new Error('Gemini API key is invalid. Please check your API key settings.');
    }
    if (error.status === 429 || error.message?.includes('quota')) {
      // Quota exceeded - return demo email
      console.log('Using demo mode due to quota limit');
      return `Hi ${recipient.name || 'there'}!

I hope this email finds you well. I've been looking at ${recipient.companyName || 'your company'} and I'm really impressed with your work${recipient.websiteLink ? `, especially what I saw on your website` : ''}.

I'd love to explore potential ${options.emailType} opportunities between our companies. ${recipient.position ? `Given your role as ${recipient.position}, ` : ''}I believe there could be great synergy.

${options.callToAction}

Best regards,
[Your Name]

--- 
Note: This is a demo email generated due to Gemini quota limits. Please add credits to your Gemini account for full AI personalization.`;
    }
    throw new Error(`Failed to personalize email: ${error.message}`);
  }
}

export async function enhanceEmailContent(emailBody: string): Promise<string> {
  const prompt = `
    Enhance and improve the following email content:
    
    "${emailBody}"
    
    Please:
    1. Improve the clarity and flow
    2. Make it more engaging and professional
    3. Enhance the persuasive elements
    4. Maintain the original intent and tone
    5. Keep the same approximate length
    6. Ensure it's grammatically correct and well-structured
    
    Return only the enhanced email content without any additional commentary.
  `;

  try {
    const geminiInstance = await getGeminiInstance();
    const response = await geminiInstance.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{
        role: "user", 
        parts: [{ text: prompt }]
      }],
      config: {
        systemInstruction: "You are an expert email copywriter and editor. Your job is to enhance email content to make it more professional, engaging, and effective while maintaining the original intent."
      }
    });

    const enhancedContent = response.text || emailBody;
    return enhancedContent;
  } catch (error: any) {
    console.error('Error enhancing email content:', error);
    if (error.status === 401 || error.message?.includes('API key')) {
      throw new Error('Gemini API key is invalid. Please check your API key settings.');
    }
    if (error.status === 429 || error.message?.includes('quota')) {
      throw new Error('Gemini quota exceeded. Please upgrade your Gemini plan.');
    }
    throw new Error('Failed to enhance email content');
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
    const geminiInstance = await getGeminiInstance();
    const response = await geminiInstance.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        systemInstruction: "You are an expert email marketing copywriter. Create compelling email content that converts well.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      subject: result.subject || subject,
      body: result.body || ''
    };
  } catch (error: any) {
    console.error('Error generating email content:', error);
    throw new Error('Failed to generate email content');
  }
}