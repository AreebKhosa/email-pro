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
    - TARGET LENGTH: Approximately ${Math.floor(options.maxCharacters * 0.95)} characters (95% of ${options.maxCharacters} limit - this is MANDATORY)
    - Call to action: ${options.callToAction}

    DETAILED PERSONALIZATION REQUIREMENTS:
    
    1. EXTENSIVE BUSINESS RESEARCH: Based on their website content, identify and reference:
       • Specific services/products they offer (mention by name)
       • Their target industries and customer segments
       • Technologies, methodologies, or approaches they use
       • Company size, locations, and market reach
       • Recent projects, case studies, or achievements
       • Their competitive advantages and differentiators
       • Industry challenges they help their clients solve
    
    2. COMPELLING OPENING: Start with a personalized hook that proves you've researched them thoroughly
    
    3. BUSINESS VALUE ALIGNMENT: Connect our capabilities to their specific business model:
       • Show how we can enhance their service offerings
       • Address challenges in their industry or market
       • Reference growth opportunities in their sector
       • Demonstrate understanding of their client base
    
    4. PROFESSIONAL DEPTH: Use ${options.tone} tone while providing substantial business value
    
    5. NATURAL INTEGRATION: Weave "${options.callToAction}" seamlessly into the conversation
    
    6. MANDATORY LENGTH REQUIREMENT: Your email MUST be approximately ${Math.floor(options.maxCharacters * 0.95)} characters (${options.maxCharacters} limit). Count your characters and ensure you reach this target. Include:
       • Detailed business insights and industry analysis
       • Specific service references with technical details
       • Multiple paragraphs of industry knowledge demonstration
       • Several value propositions with concrete examples
       • Professional credibility builders and case study references
       • Comprehensive market understanding
       • Detailed competitive landscape insights
    
    CRITICAL REQUIREMENT: Your email must be approximately ${Math.floor(options.maxCharacters * 0.95)} characters. If you write less than ${Math.floor(options.maxCharacters * 0.8)} characters, the email will be rejected. Expand every section with detailed business insights, specific examples, industry analysis, and comprehensive value propositions to reach the target length.
    
    CHARACTER COUNT TARGET: ${Math.floor(options.maxCharacters * 0.95)} characters
    
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
        systemInstruction: "You are a senior business development professional and expert email copywriter. Create highly personalized, professional emails that demonstrate deep business research and understanding. CRITICAL: You must write emails that are close to the maximum character limit specified. Use the full character allowance to provide comprehensive value, detailed business insights, and thorough personalization. Never write short emails when a longer limit is given."
      }
    });

    let personalizedEmail = response.text || '';
    
    // If the email is shorter than 85% of the max limit, expand it to reach the target
    if (personalizedEmail.length < options.maxCharacters * 0.85) {
      console.log(`Email too short (${personalizedEmail.length}/${options.maxCharacters}), attempting to expand...`);
      
      // Create an expansion prompt that targets the exact character count
      const targetLength = Math.floor(options.maxCharacters * 0.95); // Target 95% of max characters
      const expansionPrompt = `
        CRITICAL TASK: Expand the following email to exactly ${targetLength} characters (currently ${personalizedEmail.length} characters).
        
        You must add approximately ${targetLength - personalizedEmail.length} more characters by including:
        - Detailed industry analysis specific to their business sector
        - More comprehensive descriptions of their services and methodologies
        - Additional value propositions with concrete examples and benefits
        - Deeper competitive landscape insights and market positioning
        - More professional credibility elements, case studies, or success stories
        - Extended explanations of how our solutions address their specific challenges
        - Additional paragraphs about industry trends and opportunities
        
        Current email (${personalizedEmail.length} characters):
        ${personalizedEmail}
        
        REQUIREMENT: Your response must be approximately ${targetLength} characters. Add substantial content while maintaining the same professional ${options.tone} tone and high level of personalization.
      `;
      
      try {
        const geminiInstance = await getGeminiInstance();
        const expansionResponse = await geminiInstance.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [{ text: expansionPrompt }]
          }]
        });
        
        const expandedEmail = expansionResponse.text || personalizedEmail;
        if (expandedEmail.length > personalizedEmail.length) {
          personalizedEmail = expandedEmail;
          console.log(`Successfully expanded email to ${personalizedEmail.length} characters`);
        }
      } catch (error) {
        console.error('Error expanding email:', error);
        // Continue with original email if expansion fails
      }
    }
    
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