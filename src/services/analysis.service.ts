import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getStoredTokens, refreshAccessToken, isTokenValid } from './oauth.service';

const gmail = google.gmail('v1');

export interface DiscoveredSubscription {
  service: string;
  amount: number;
  currency: string;
  frequency: string;
  category: string;
  nextBilling: string | null;
  source: string;
  confidence: number;
  details: string;
}

export async function analyzeEmailsForSubscriptions(userId: string, maxResults = 200): Promise<DiscoveredSubscription[]> {
  try {
    // Get and validate tokens
    let tokens = await getStoredTokens(userId);
    if (!tokens) {
      throw new Error('No Gmail tokens found. Please reconnect Gmail.');
    }

    // Check if token is valid, refresh if needed
    const isValid = await isTokenValid(userId);
    if (!isValid && tokens.refresh_token) {
      console.log('Refreshing expired Gmail token...');
      tokens = await refreshAccessToken(userId);
    }

    // Set up Gmail API with authentication
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    
    gmail.auth = auth;

    const subscriptionPatterns: DiscoveredSubscription[] = [];
    
    // Comprehensive search queries for subscription emails
    const searchQueries = [
      'from:(billing@netflix.com OR noreply@netflix.com) subject:(Your Netflix bill OR payment confirmation)',
      'from:(billing@spotify.com OR noreply@spotify.com) subject:(Your Spotify Premium)',
      'from:(adobe.com) subject:(Adobe subscription OR Creative Cloud)',
      'from:(apple.com) subject:(Your receipt from Apple OR App Store)',
      'from:(google.com) subject:(Google Play receipt OR Google One)',
      'from:(amazon.com) subject:(Prime membership OR Prime Video)',
      'from:(microsoft.com) subject:(Microsoft 365 OR Office 365)',
      'from:(dropbox.com) subject:(Dropbox subscription)',
      'from:(hulu.com) subject:(Hulu subscription)',
      'from:(disney.com OR disneyplus.com) subject:(Disney+ subscription)',
      'from:(youtube.com) subject:(YouTube Premium)',
      'from:(github.com) subject:(GitHub subscription)',
      'from:(slack.com) subject:(Slack subscription)',
      'from:(zoom.us) subject:(Zoom subscription)',
      'from:(canva.com) subject:(Canva Pro)',
      'from:(figma.com) subject:(Figma subscription)',
      'from:(notion.so) subject:(Notion subscription)',
      'subject:(subscription renewal OR auto-renewal OR recurring payment)',
      'subject:(billing statement OR payment confirmation OR invoice)',
      'from:(noreply@) subject:(subscription OR billing OR payment)',
      'body:(monthly subscription OR yearly subscription OR auto-renew)'
    ];

    console.log(`Starting Gmail analysis for user ${userId}...`);

    // Search with each query
    for (const query of searchQueries) {
      try {
        console.log(`Searching with query: ${query}`);
        
        const searchResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: Math.min(maxResults / searchQueries.length, 25) // Distribute across queries
        });

        if (searchResponse.data.messages) {
          console.log(`Found ${searchResponse.data.messages.length} messages for query`);
          
          for (const message of searchResponse.data.messages) {
            try {
              const emailData = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full'
              });

              const subscription = await extractSubscriptionFromEmail(emailData.data);
              if (subscription && subscription.confidence > 0.6) {
                // Check for duplicates
                const existingIndex = subscriptionPatterns.findIndex(
                  s => s.service.toLowerCase() === subscription.service.toLowerCase()
                );
                
                if (existingIndex >= 0) {
                  // Keep the one with higher confidence
                  if (subscription.confidence > subscriptionPatterns[existingIndex].confidence) {
                    subscriptionPatterns[existingIndex] = subscription;
                  }
                } else {
                  subscriptionPatterns.push(subscription);
                }
              }
            } catch (error) {
              console.error(`Error processing message ${message.id}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`Error with search query "${query}":`, error);
        continue;
      }
    }

    console.log(`Analysis complete. Found ${subscriptionPatterns.length} unique subscriptions`);

    // Sort by confidence and return top matches
    return subscriptionPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 30); // Return top 30 most confident matches
      
  } catch (error) {
    console.error('Gmail analysis error:', error);
    throw error;
  }
}

async function extractSubscriptionFromEmail(emailData: any): Promise<DiscoveredSubscription | null> {
  try {
    const payload = emailData.payload;
    const headers = payload.headers || [];
    
    // Extract email metadata
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';
    
    // Extract email body
    const body = extractEmailBody(payload);
    const fullText = `${subject} ${from} ${body}`.toLowerCase();
    
    // Check if this is a subscription email
    const subscriptionKeywords = [
      'subscription', 'billing', 'payment', 'invoice', 'receipt', 
      'renewal', 'auto-renew', 'recurring', 'monthly', 'yearly',
      'premium', 'plan', 'membership', 'account charged'
    ];
    
    const hasSubscriptionKeywords = subscriptionKeywords.some(keyword => 
      fullText.includes(keyword)
    );
    
    if (!hasSubscriptionKeywords) {
      return null;
    }
    
    // Extract subscription details
    const serviceName = extractServiceName(from, subject, body);
    const amount = extractAmount(body);
    const frequency = extractFrequency(body, subject);
    const nextBillingDate = extractNextBillingDate(body, date);
    const category = categorizeService(serviceName);
    
    // Calculate confidence score
    let confidence = 0.4; // Base confidence
    
    if (amount > 0) confidence += 0.25;
    if (frequency !== 'monthly') confidence += 0.15; // Specific frequency found
    if (nextBillingDate) confidence += 0.1;
    if (serviceName !== 'Unknown Service') confidence += 0.1;
    
    // Boost for known services
    const knownServices = [
      'netflix', 'spotify', 'adobe', 'apple', 'google', 'amazon', 
      'microsoft', 'dropbox', 'hulu', 'disney', 'youtube', 'github',
      'slack', 'zoom', 'canva', 'figma', 'notion'
    ];
    
    if (knownServices.some(service => serviceName.toLowerCase().includes(service))) {
      confidence += 0.15;
    }
    
    // Boost for payment confirmation emails
    if (fullText.includes('payment') && fullText.includes('confirm')) {
      confidence += 0.1;
    }
    
    return {
      service: serviceName,
      amount: amount,
      currency: 'USD',
      frequency: frequency,
      category: category,
      nextBilling: nextBillingDate,
      source: 'gmail',
      confidence: Math.min(confidence, 1.0),
      details: `Found in email from ${from.split('@')[1] || from}`
    };
  } catch (error) {
    console.error('Error extracting subscription from email:', error);
    return null;
  }
}

function extractEmailBody(payload: any): string {
  let body = '';
  
  try {
    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          const htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Strip HTML tags for basic text extraction
          body += htmlBody.replace(/<[^>]*>/g, ' ');
        } else if (part.parts) {
          // Handle nested parts
          body += extractEmailBody(part);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting email body:', error);
  }
  
  return body;
}

function extractServiceName(from: string, subject: string, body: string): string {
  const text = `${from} ${subject} ${body}`.toLowerCase();
  
  // Enhanced service mapping
  const services = {
    'netflix': 'Netflix',
    'spotify': 'Spotify Premium',
    'adobe': 'Adobe Creative Cloud',
    'apple': 'Apple Services',
    'google': 'Google Services',
    'amazon': 'Amazon Prime',
    'microsoft': 'Microsoft 365',
    'dropbox': 'Dropbox',
    'hulu': 'Hulu',
    'disney': 'Disney+',
    'youtube': 'YouTube Premium',
    'github': 'GitHub',
    'slack': 'Slack',
    'zoom': 'Zoom',
    'canva': 'Canva Pro',
    'figma': 'Figma',
    'notion': 'Notion',
    'linear': 'Linear',
    'vercel': 'Vercel',
    'railway': 'Railway',
    'planetscale': 'PlanetScale',
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'replit': 'Replit'
  };
  
  for (const [key, value] of Object.entries(services)) {
    if (text.includes(key)) {
      return value;
    }
  }
  
  // Try to extract from sender domain
  const emailMatch = from.match(/@([^.]+)\./);
  if (emailMatch && emailMatch[1]) {
    const domain = emailMatch[1].toLowerCase();
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  
  return 'Unknown Service';
}

function extractAmount(text: string): number {
  const patterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|dollars?)/gi,
    /(?:total|amount|charged|billed)[\s:]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*per\s*(?:month|year)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const numStr = match.replace(/[^\d.]/g, '');
        const amount = parseFloat(numStr);
        if (amount > 0 && amount < 10000) { // Reasonable subscription range
          return amount;
        }
      }
    }
  }
  
  return 0;
}

function extractFrequency(text: string, subject: string): string {
  const combined = `${text} ${subject}`.toLowerCase();
  
  if (combined.match(/\b(?:yearly|year|annual|annually|per year|\/year)\b/)) {
    return 'yearly';
  }
  if (combined.match(/\b(?:monthly|month|per month|\/month)\b/)) {
    return 'monthly';
  }
  if (combined.match(/\b(?:weekly|week|per week|\/week)\b/)) {
    return 'weekly';
  }
  if (combined.match(/\b(?:quarterly|quarter|per quarter|\/quarter)\b/)) {
    return 'quarterly';
  }
  
  return 'monthly'; // Default assumption
}

function extractNextBillingDate(text: string, emailDate: string): string | null {
  const datePatterns = [
    /next\s+(?:billing|payment|charge)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(?:renew|renewal)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(?:due|expires?)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(\d{1,2}\/\d{1,2}\/\d{4})/g
  ];
  
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        try {
          const dateStr = match.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
          if (dateStr) {
            const date = new Date(dateStr);
            if (date.getTime() > Date.now()) {
              return date.toISOString();
            }
          }
        } catch (error) {
          continue;
        }
      }
    }
  }
  
  // Estimate based on email date
  if (emailDate) {
    try {
      const baseDate = new Date(emailDate);
      const nextMonth = new Date(baseDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString();
    } catch (error) {
      // Fallback to 30 days from now
      const future = new Date();
      future.setDate(future.getDate() + 30);
      return future.toISOString();
    }
  }
  
  return null;
}

function categorizeService(serviceName: string): string {
  const name = serviceName.toLowerCase();
  
  const categories = {
    'Entertainment': ['netflix', 'hulu', 'disney', 'youtube', 'prime video', 'paramount', 'peacock'],
    'Music': ['spotify', 'apple music', 'youtube music', 'pandora', 'tidal'],
    'Software': ['adobe', 'figma', 'canva', 'github', 'microsoft', 'office', 'zoom'],
    'Cloud Storage': ['dropbox', 'google drive', 'icloud', 'onedrive'],
    'Productivity': ['slack', 'notion', 'linear', 'trello', 'asana'],
    'Development': ['vercel', 'railway', 'planetscale', 'replit', 'github', 'openai', 'anthropic'],
    'Shopping': ['amazon prime', 'costco', 'walmart'],
    'News': ['new york times', 'wall street journal', 'washington post']
  };
  
  for (const [category, services] of Object.entries(categories)) {
    if (services.some(service => name.includes(service))) {
      return category;
    }
  }
  
  return 'Other';
}