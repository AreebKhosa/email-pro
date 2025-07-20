import { google } from 'googleapis';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';

let oauth2Client: any = null;

async function getOAuth2Client() {
  if (!oauth2Client) {
    // Try to get credentials from environment variables first
    let googleClientId = process.env.GOOGLE_CLIENT_ID;
    let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // If not in env vars, get from admin config
    if (!googleClientId || !googleClientSecret) {
      try {
        const clientIdConfig = await storage.getConfig('google_client_id');
        const clientSecretConfig = await storage.getConfig('google_client_secret');
        
        googleClientId = googleClientId || (typeof clientIdConfig === 'string' ? clientIdConfig : clientIdConfig?.configValue);
        googleClientSecret = googleClientSecret || (typeof clientSecretConfig === 'string' ? clientSecretConfig : clientSecretConfig?.configValue);
      } catch (error) {
        console.log('Google OAuth config not found in database');
      }
    }
    
    if (googleClientId && googleClientSecret) {
      oauth2Client = new google.auth.OAuth2(
        googleClientId,
        googleClientSecret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
      );
    }
  }
  return oauth2Client;
}

// Scopes for Gmail API access
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

export function setupGoogleAuth() {
  // Only setup Google OAuth if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Google OAuth Strategy for user authentication
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (!user) {
          // Check if user exists by email
          const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
          if (existingUser) {
            // Link Google account to existing user
            user = await storage.updateUserGoogleId(existingUser.id, profile.id);
          } else {
            // Create new user
            user = await storage.createUser({
              googleId: profile.id,
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
              emailVerified: true,
            });
          }
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Local Strategy for email/password authentication
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

// Generate Gmail OAuth URL for email integration
export async function getGmailAuthUrl(userId: string): Promise<string> {
  const client = await getOAuth2Client();
  if (!client) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    state: userId, // Pass userId to identify the user during callback
    prompt: 'consent' // Force consent to get refresh token
  });
  return authUrl;
}

// Exchange authorization code for tokens
export async function exchangeGmailCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}> {
  const client = await getOAuth2Client();
  if (!client) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  const { tokens } = await client.getAccessToken({ code });
  
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiryDate: tokens.expiry_date!
  };
}

// Get user info from Gmail OAuth
export async function getGmailUserInfo(accessToken: string): Promise<{
  email: string;
  name: string;
}> {
  const client = await getOAuth2Client();
  if (!client) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const userInfo = await oauth2.userinfo.get();
  
  return {
    email: userInfo.data.email!,
    name: userInfo.data.name!
  };
}

// Refresh Gmail access token
export async function refreshGmailToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const client = await getOAuth2Client();
  if (!client) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  
  return {
    accessToken: credentials.access_token!,
    expiryDate: credentials.expiry_date!
  };
}