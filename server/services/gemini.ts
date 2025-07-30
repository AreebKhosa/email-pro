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

// Comprehensive website content scraping function
export async function scrapeWebsiteContent(url: string): Promise<string | null> {
  try {
    console.log(`Scraping website content from: ${url}`);
    
    // Ensure URL has protocol
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract meaningful content from HTML
    const textContent = extractBusinessContent(html);
    
    console.log(`Successfully scraped ${textContent.length} characters from ${cleanUrl}`);
    return textContent;
    
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error);
    return null;
  }
}

// Extract business-relevant content from HTML
function extractBusinessContent(html: string): string {
  try {
    // Remove script and style tags and their content
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    
    // Extract text content from HTML tags
    const textContent = cleanHtml
      .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    // Focus on business-relevant sections
    const businessKeywords = [
      'about', 'services', 'products', 'solutions', 'expertise', 'experience',
      'company', 'business', 'industry', 'client', 'customer', 'portfolio',
      'team', 'mission', 'vision', 'values', 'approach', 'methodology',
      'technology', 'innovation', 'development', 'consulting', 'support',
      'contact', 'location', 'founded', 'established', 'years', 'specialist'
    ];
    
    // Split into sentences and prioritize business-relevant content
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const relevantSentences = sentences.filter(sentence => 
      businessKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    );
    
    // If we found relevant sentences, use them, otherwise use first part of content
    const finalContent = relevantSentences.length > 0 
      ? relevantSentences.join('. ') 
      : sentences.slice(0, 10).join('. ');
    
    // Limit to reasonable length for AI processing
    return finalContent.length > 2000 
      ? finalContent.substring(0, 2000) + '...'
      : finalContent;
      
  } catch (error) {
    console.error('Error extracting content from HTML:', error);
    return html.substring(0, 1000); // Fallback to raw HTML excerpt
  }
}

export async function personalizeEmailContent(
  recipient: Recipient,
  websiteContent: string | null,
  options: PersonalizationOptions
): Promise<string> {
  const prompt = `
    You are a professional business development expert writing a highly personalized ${options.emailType} email.

    RECIPIENT DETAILS:
    - Name: ${recipient.name || 'there'} ${recipient.lastName || ''}
    - Company: ${recipient.companyName || 'N/A'}
    - Position: ${recipient.position || 'N/A'}
    - Email: ${recipient.email}
    
    DETAILED WEBSITE ANALYSIS:
    ${websiteContent || 'No website information available'}
    
    EMAIL REQUIREMENTS:
    - Type: ${options.emailType}
    - Tone: ${options.tone}
    - Maximum characters: ${options.maxCharacters}
    - Call to action: ${options.callToAction}

    COMPREHENSIVE PERSONALIZATION INSTRUCTIONS:
    
    1. DEEP BUSINESS ANALYSIS: Study their website content thoroughly to understand:
       • What specific services/products they offer
       • Their target market and customer segments
       • Their unique value propositions and differentiators
       • Their expertise areas and specializations
       • Recent projects, case studies, or achievements mentioned
       • Their company approach and methodology
       • Technologies or tools they use
       • Industries they serve
       • Size and scale of their operations
    
    2. PROFESSIONAL OPENING: Begin with a personalized greeting that demonstrates you've researched them specifically
    
    3. CREDIBLE BUSINESS CONNECTION: Show genuine understanding by referencing:
       • Specific services they provide (be detailed and accurate)
       • Markets or industries they serve
       • Challenges they likely face in their industry
       • Growth opportunities in their sector
       • Their competitive positioning
    
    4. VALUE-DRIVEN PROPOSITION: Clearly articulate how we can help based on their actual business:
       • Be specific about relevant value we can provide
       • Connect our capabilities to their real business needs
       • Reference industry-specific pain points they might have
       • Show understanding of their client base and challenges
    
    5. PROFESSIONAL BUSINESS TONE: Use ${options.tone} tone while maintaining executive-level professionalism
    
    6. NATURAL CALL-TO-ACTION: Integrate "${options.callToAction}" naturally into the conversation
    
    7. CONCISE YET COMPREHENSIVE: Stay within ${options.maxCharacters} characters while showing deep business understanding
    
    Create a professional email that demonstrates you've thoroughly researched their business, understand their market position, and can offer genuine value based on what they actually do. Make it clear this is a well-researched, business-focused outreach.
    
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
        systemInstruction: "You are a senior business development professional and expert email copywriter. Create highly personalized, professional emails that demonstrate deep business research and understanding. Focus on building credible business relationships through authentic, value-driven communication that shows genuine knowledge of the recipient's industry and business model."
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