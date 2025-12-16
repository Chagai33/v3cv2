// GoogleOAuthUseCase - אימות Google OAuth

import { GoogleAuthClient } from '../../../infrastructure/google/GoogleAuthClient';
import { GoogleCalendarClient } from '../../../infrastructure/google/GoogleCalendarClient';
import { TokenRepository } from '../../../infrastructure/database/repositories/TokenRepository';

export class GoogleOAuthUseCase {
  constructor(
    private authClient: GoogleAuthClient,
    private calendarClient: GoogleCalendarClient,
    private tokenRepo: TokenRepository
  ) {}

  async exchangeCode(code: string, userId: string): Promise<{ accessToken: string }> {
    await this.authClient.exchangeCode(code, userId);
    const tokenData = await this.tokenRepo.findByUserId(userId);
    return { accessToken: tokenData?.accessToken || '' };
  }

  async disconnect(userId: string): Promise<void> {
    await this.tokenRepo.delete(userId);
  }

  async getStatus(userId: string): Promise<any> {
    const tokenData = await this.tokenRepo.findByUserId(userId);
    if (!tokenData || !tokenData.accessToken) {
      return { isConnected: false };
    }

    let email = '';
    let name = '';
    let picture = '';

    try {
      const userInfo = await this.calendarClient.getUserInfo(userId);
      email = userInfo.email;
      name = userInfo.name;
      picture = userInfo.picture;
    } catch (e) {
      // Ignore
    }

    const currentCalId = tokenData.calendarId || 'primary';
    const isPrimary = currentCalId === 'primary' || (email && currentCalId === email);

    return {
      isConnected: true,
      email,
      name,
      picture,
      calendarId: currentCalId,
      calendarName: tokenData.calendarName || 'Primary Calendar',
      isPrimary,
      syncStatus: tokenData.syncStatus || 'IDLE',
      lastSyncStart: tokenData.lastSyncStart || 0
    };
  }

  async getAccountInfo(userId: string): Promise<{ email: string; name: string; picture: string }> {
    return await this.calendarClient.getUserInfo(userId);
  }
}



