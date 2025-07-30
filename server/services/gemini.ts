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
  ourServices?: string;
  ourIndustry?: string;
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
  // Create type-specific prompts based on email purpose
  const getTypeSpecificPrompt = (emailType: string, websiteContent: string | null) => {
    const baseContext = `
    RECIPIENT DETAILS:
    - Name: ${recipient.name || 'there'} ${recipient.lastName || ''}
    - Company: ${recipient.companyName || 'N/A'}
    - Position: ${recipient.position || 'N/A'}
    - Email: ${recipient.email}
    
    DETAILED WEBSITE ANALYSIS:
    ${websiteContent || 'No website information available'}
    
    OUR COMPANY DETAILS:
    - Our Services/Products: ${options.ourServices || 'Not specified'}
    - Our Industry/Niche: ${options.ourIndustry || 'Not specified'}
    `;

    switch (emailType.toLowerCase()) {
      case 'marketing':
        return `You are a marketing specialist writing a ${emailType} email to promote our services.
        ${baseContext}
        
        MARKETING EMAIL STRATEGY:
        - Focus on how our services can grow their business
        - Highlight specific benefits relevant to their industry
        - Reference their current services to show we understand their market
        - Position our solution as a growth accelerator
        - Create urgency around market opportunities
        - Use data-driven benefits and results
        - Target their specific customer segments
        - Address scaling challenges they likely face
        `;
        
      case 'sales':
        return `You are a senior sales professional writing a ${emailType} email to generate qualified leads.
        ${baseContext}
        
        SALES EMAIL STRATEGY:
        - Lead with their business pain points we can solve
        - Quantify potential ROI and business impact
        - Reference similar companies we've helped
        - Create competitive advantage positioning
        - Focus on revenue generation opportunities
        - Address operational efficiency gains
        - Mention cost reduction potential
        - Build trust through industry expertise
        `;
        
      case 'partnership':
        return `You are a business development executive writing a ${emailType} email to explore strategic partnerships.
        ${baseContext}
        
        PARTNERSHIP EMAIL STRATEGY:
        - Identify mutual business opportunities
        - Reference complementary services or markets
        - Focus on shared customer segments
        - Highlight collaboration benefits
        - Discuss market expansion possibilities  
        - Address joint solution opportunities
        - Mention cross-referral potential
        - Build foundation for strategic alliance
        `;
        
      case 'introduction':
        return `You are a relationship-focused professional writing an ${emailType} email to establish new business connections.
        ${baseContext}
        
        INTRODUCTION EMAIL STRATEGY:
        - Build rapport through genuine business interest
        - Reference their industry achievements or reputation
        - Share relevant business insights or trends
        - Offer valuable resources or connections
        - Focus on long-term relationship building
        - Demonstrate industry knowledge and credibility
        - Suggest mutual learning opportunities
        - Create foundation for ongoing dialogue
        `;
        
      case 'follow-up':
        return `You are a persistent but professional business developer writing a ${emailType} email.
        ${baseContext}
        
        FOLLOW-UP EMAIL STRATEGY:
        - Reference previous touchpoint naturally
        - Provide new value or insights since last contact
        - Address potential concerns or objections
        - Share relevant case studies or success stories
        - Offer different engagement options
        - Create multiple response opportunities
        - Maintain professional persistence
        - Focus on building trust through consistency
        `;
        
      default:
        return `You are a professional business development expert writing a ${emailType} email.
        ${baseContext}
        
        GENERAL EMAIL STRATEGY:
        - Demonstrate deep understanding of their business
        - Reference specific services they provide
        - Address industry challenges they face
        - Position our value proposition clearly
        - Build credibility through research
        - Create genuine business connection
        `;
    }
  };

  const typeSpecificPrompt = getTypeSpecificPrompt(options.emailType, websiteContent);
  
  const prompt = `${typeSpecificPrompt}
    
    EMAIL REQUIREMENTS:
    - Type: ${options.emailType}
    - Tone: ${options.tone}
    - TARGET LENGTH: Maximum ${options.maxCharacters} characters (keep it concise and professional)
    - Call to action: ${options.callToAction}

    MANDATORY EMAIL STRUCTURE (Follow this exact order):
    
    STEP 1: FRIENDLY GREETING + QUICK PERSONAL LINE
    • Start with a warm greeting using their name
    • Add ONE specific observation about their business/website that shows you researched them
    • Keep this section brief (1-2 sentences maximum)
    
    STEP 2: DISCUSS THEIR SERVICES
    • Reference 1-2 specific services they offer (mention by name from website content)
    • Show genuine understanding of what they do
    • Keep it concise and focused
    
    STEP 3: PROBLEM OR PAIN POINT MENTION
    • Identify ONE relevant challenge in their industry or business type
    • Make it relatable to companies like theirs
    • Don't over-explain - just mention it briefly
    
    STEP 4: YOUR SOLUTION (VERY BRIEFLY)
    • Mention how ${options.ourServices ? `our ${options.ourServices} services` : 'our services'} can help
    • Keep this VERY short - just 1 sentence
    • Focus on the benefit, not detailed features
    
    STEP 5: CALL TO ACTION (SOFT, NOT PUSHY)
    • Use the specified CTA: ${options.callToAction}
    • Make it conversational and low-pressure
    • Suggest a simple next step
    
    STEP 6: SIGNATURE OF USER
    • End with a professional signature
    • Keep it simple and friendly
    
    CRITICAL WRITING GUIDELINES:
    1. Follow the 6-step structure exactly in order
    2. Keep total length under ${options.maxCharacters} characters
    3. Make each step concise - don't make the email too long
    4. Use a genuinely ${options.tone} but professional tone
    5. Reference specific details from their website
    6. Avoid generic sales language - be conversational
    7. Focus on building relationship, not hard selling
    
    Write a concise, structured email following the 6 steps above. Keep it professional but personal.
    Return only the email content without subject line.
  `;

  const geminiInstance = await getGeminiInstance();

  try {
    const response = await geminiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    });
    let emailContent = response.text || '';

    // Handle character limit with smart truncation if needed
    if (emailContent.length > options.maxCharacters) {
      console.log(`Email too long (${emailContent.length}/${options.maxCharacters}), truncating safely...`);
      
      // Smart truncation at sentence boundary
      const maxLength = options.maxCharacters;
      let truncated = emailContent.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      if (lastSentenceEnd > maxLength * 0.7) {
        truncated = emailContent.substring(0, lastSentenceEnd + 1);
      } else {
        // If no sentence boundary found, truncate at word boundary
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.7) {
          truncated = emailContent.substring(0, lastSpace);
        }
      }
      
      emailContent = truncated;
      console.log(`Final personalized email length: ${emailContent.length}/${options.maxCharacters}`);
    }

    return emailContent.trim();
  } catch (error: any) {
    console.error('Error generating personalized email:', error);
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
    throw new Error(`Failed to generate personalized email: ${error.message}`);
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