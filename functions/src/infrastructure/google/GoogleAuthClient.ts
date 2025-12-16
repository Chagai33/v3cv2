// GoogleAuthClient - ניהול אימות ו-tokens עבור Google Calendar
// מקור: שורות 133-176 מ-index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { TokenRepository } from '../database/repositories/TokenRepository';

export class GoogleAuthClient {
  constructor(
    private tokenRepo: TokenRepository,
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  async getValidAccessToken(userId: string, minValidityMillis: number = 60000): Promise<string> {
    const tokenData = await this.tokenRepo.findByUserId(userId);
    if (!tokenData) {
      throw new functions.https.HttpsError('not-found', 'googleCalendar.connectFirst');
    }

    const now = Date.now();
    const expiresAt = tokenData.expiresAt || 0;

    if (now < expiresAt - minValidityMillis) {
      return tokenData.accessToken;
    }

    functions.logger.log(`Token for user ${userId} expired, refreshing...`);
    if (!tokenData.refreshToken) {
      functions.logger.warn(`No refresh token for user ${userId}`);
      throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        this.clientId, 
        this.clientSecret, 
        this.redirectUri
      );
      oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      await this.tokenRepo.update(userId, {
        accessToken: credentials.access_token!,
        expiresAt: credentials.expiry_date || (Date.now() + 3600 * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any
      });
      
      return credentials.access_token!;
    } catch (error: any) {
      functions.logger.error(`Failed to refresh token for user ${userId}:`, error);
      
      // ✅ שינוי 4: הבחנה בין טוקן מת לשגיאה זמנית
      const isTokenRevoked = error.message?.includes('invalid_grant') || 
                             error.code === 400 ||
                             error.response?.data?.error === 'invalid_grant';
      
      if (isTokenRevoked) {
        functions.logger.warn(`Token revoked for user ${userId} - marking as disconnected`);
        // מחק את הטוכן כדי לאלץ חיבור מחדש
        await this.tokenRepo.update(userId, {
          accessToken: '',
          refreshToken: ''
        });
        throw new functions.https.HttpsError('permission-denied', 'TOKEN_REVOKED');
      }
      
      // שגיאה זמנית (רשת/שרת)
      throw new functions.https.HttpsError('unavailable', 'TEMPORARY_ERROR');
    }
  }

  async getCalendarId(userId: string): Promise<string> {
    const tokenData = await this.tokenRepo.findByUserId(userId);
    return tokenData?.calendarId || 'primary';
  }

  async getCalendarName(userId: string): Promise<string> {
    const tokenData = await this.tokenRepo.findByUserId(userId);
    return tokenData?.calendarName || 'Primary Calendar';
  }

  async exchangeCode(code: string, userId: string): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId, 
      this.clientSecret, 
      this.redirectUri
    );
    const { tokens } = await oauth2Client.getToken(code);
    
    const update: any = { 
      userId, 
      accessToken: tokens.access_token!, 
      expiresAt: tokens.expiry_date!, 
      scope: tokens.scope, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (tokens.refresh_token) {
      update.refreshToken = tokens.refresh_token;
    }
    
    await this.tokenRepo.save(userId, update);
  }
}



