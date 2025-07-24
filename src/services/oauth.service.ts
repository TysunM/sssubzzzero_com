import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/auth/google/callback`
);

export const getGoogleAuthUrl = (userId: string) => {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata'
    ],
    prompt: 'consent',
    state: userId // Pass user ID in state for callback
  });
};

export const exchangeCodeForTokens = async (code: string, userId: string) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Store tokens securely
    await storage.saveApiKey(userId, 'GMAIL_ACCESS_TOKEN', tokens.access_token!, 'email');
    if (tokens.refresh_token) {
      await storage.saveApiKey(userId, 'GMAIL_REFRESH_TOKEN', tokens.refresh_token, 'email');
    }
    if (tokens.expiry_date) {
      await storage.saveApiKey(userId, 'GMAIL_TOKEN_EXPIRES', tokens.expiry_date.toString(), 'email');
    }
    
    return tokens;
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    throw error;
  }
};

export const getStoredTokens = async (userId: string) => {
  try {
    const accessToken = await storage.getApiKey(userId, 'GMAIL_ACCESS_TOKEN');
    const refreshToken = await storage.getApiKey(userId, 'GMAIL_REFRESH_TOKEN');
    const expiresAt = await storage.getApiKey(userId, 'GMAIL_TOKEN_EXPIRES');
    
    if (!accessToken) return null;
    
    return {
      access_token: accessToken.keyValue,
      refresh_token: refreshToken?.keyValue,
      expiry_date: expiresAt ? parseInt(expiresAt.keyValue) : undefined
    };
  } catch (error) {
    console.error('Error retrieving stored tokens:', error);
    return null;
  }
};

export const refreshAccessToken = async (userId: string) => {
  try {
    const tokens = await getStoredTokens(userId);
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }
    
    oAuth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });
    
    const { credentials } = await oAuth2Client.refreshAccessToken();
    
    // Update stored access token
    if (credentials.access_token) {
      await storage.saveApiKey(userId, 'GMAIL_ACCESS_TOKEN', credentials.access_token, 'email');
    }
    if (credentials.expiry_date) {
      await storage.saveApiKey(userId, 'GMAIL_TOKEN_EXPIRES', credentials.expiry_date.toString(), 'email');
    }
    
    return credentials;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

export const isTokenValid = async (userId: string): Promise<boolean> => {
  try {
    const tokens = await getStoredTokens(userId);
    if (!tokens) return false;
    
    const now = Date.now();
    const expiryTime = tokens.expiry_date || 0;
    
    // Consider token invalid if it expires within 5 minutes
    return expiryTime > (now + 5 * 60 * 1000);
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export { oAuth2Client };