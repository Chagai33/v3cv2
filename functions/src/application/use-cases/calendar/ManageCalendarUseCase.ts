// ManageCalendarUseCase - ניהול Google Calendars (יצירה, מחיקה, רשימה)

import { GoogleCalendarClient } from '../../../infrastructure/google/GoogleCalendarClient';
import { TokenRepository } from '../../../infrastructure/database/repositories/TokenRepository';

export class ManageCalendarUseCase {
  constructor(
    private calendarClient: GoogleCalendarClient,
    private tokenRepo: TokenRepository
  ) {}

  async createCalendar(
    userId: string,
    name: string
  ): Promise<{ calendarId: string; calendarName: string }> {
    const calendarId = await this.calendarClient.createCalendar(userId, name);
    
    // Update token document
    const tokenData = await this.tokenRepo.findByUserId(userId);
    const createdCalendars = tokenData?.createdCalendars || [];
    
    await this.tokenRepo.update(userId, {
      calendarId,
      calendarName: name,
      createdCalendars: [
        ...createdCalendars,
        {
          calendarId,
          calendarName: name,
          createdAt: new Date().toISOString()
        }
      ]
    });

    return { calendarId, calendarName: name };
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    await this.calendarClient.deleteCalendar(userId, calendarId);
  }

  async listCalendars(userId: string): Promise<any[]> {
    return await this.calendarClient.listCalendars(userId);
  }

  async updateSelection(
    userId: string,
    calendarId: string,
    calendarName: string
  ): Promise<void> {
    await this.tokenRepo.update(userId, {
      calendarId,
      calendarName
    });
  }
}

