// GoogleCalendarClient - wrapper ל-Google Calendar API

import { google } from 'googleapis';
import { SyncEvent } from '../../domain/entities/types';
import { GoogleAuthClient } from './GoogleAuthClient';

export class GoogleCalendarClient {
  constructor(private authClient: GoogleAuthClient) {}

  private async getCalendarInstance(userId: string) {
    const accessToken = await this.authClient.getValidAccessToken(userId);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async createEvent(
    userId: string,
    calendarId: string,
    event: Omit<SyncEvent, '_type' | '_year'>,
    deterministicId?: string
  ): Promise<string> {
    const calendar = await this.getCalendarInstance(userId);
    const resourceWithId = deterministicId ? 
      { ...event, id: deterministicId } : 
      event;
    
    const res = await calendar.events.insert({ 
      calendarId, 
      requestBody: resourceWithId as any 
    });
    return res.data.id!;
  }

  async updateEvent(
    userId: string,
    calendarId: string,
    eventId: string,
    event: Omit<SyncEvent, '_type' | '_year'>
  ): Promise<void> {
    const calendar = await this.getCalendarInstance(userId);
    const resourceWithStatus = { ...event, status: 'confirmed' };
    await calendar.events.patch({ 
      calendarId, 
      eventId, 
      requestBody: resourceWithStatus as any 
    });
  }

  async deleteEvent(
    userId: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const calendar = await this.getCalendarInstance(userId);
    await calendar.events.delete({ calendarId, eventId });
  }

  async listEvents(
    userId: string,
    calendarId: string,
    filters: {
      privateExtendedProperty?: string[];
      maxResults?: number;
      pageToken?: string;
      singleEvents?: boolean;
    }
  ): Promise<{ items: any[]; nextPageToken?: string }> {
    const calendar = await this.getCalendarInstance(userId);
    const res = await calendar.events.list({
      calendarId,
      ...filters
    });
    return {
      items: res.data.items || [],
      nextPageToken: res.data.nextPageToken || undefined
    };
  }

  async createCalendar(
    userId: string,
    name: string,
    description?: string
  ): Promise<string> {
    const calendar = await this.getCalendarInstance(userId);
    const res = await calendar.calendars.insert({
      requestBody: {
        summary: name,
        description: description || 'Birthday Calendar - Created by Hebrew Birthday App'
      }
    });
    return res.data.id || '';
  }

  async deleteCalendar(userId: string, calendarId: string): Promise<void> {
    const calendar = await this.getCalendarInstance(userId);
    await calendar.calendars.delete({ calendarId });
  }

  async listCalendars(userId: string): Promise<any[]> {
    const calendar = await this.getCalendarInstance(userId);
    const list = await calendar.calendarList.list({ minAccessRole: 'writer' });
    return list.data.items || [];
  }

  async getUserInfo(userId: string): Promise<{ email: string; name: string; picture: string }> {
    const accessToken = await this.authClient.getValidAccessToken(userId);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    return {
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || ''
    };
  }
}

