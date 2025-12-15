"use strict";
// GoogleCalendarClient - wrapper ל-Google Calendar API
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarClient = void 0;
const googleapis_1 = require("googleapis");
class GoogleCalendarClient {
    constructor(authClient) {
        this.authClient = authClient;
    }
    async getCalendarInstance(userId) {
        const accessToken = await this.authClient.getValidAccessToken(userId);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        return googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    }
    async createEvent(userId, calendarId, event, deterministicId) {
        const calendar = await this.getCalendarInstance(userId);
        const resourceWithId = deterministicId ?
            { ...event, id: deterministicId } :
            event;
        const res = await calendar.events.insert({
            calendarId,
            requestBody: resourceWithId
        });
        return res.data.id;
    }
    async updateEvent(userId, calendarId, eventId, event) {
        const calendar = await this.getCalendarInstance(userId);
        const resourceWithStatus = { ...event, status: 'confirmed' };
        await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: resourceWithStatus
        });
    }
    async deleteEvent(userId, calendarId, eventId) {
        const calendar = await this.getCalendarInstance(userId);
        await calendar.events.delete({ calendarId, eventId });
    }
    async listEvents(userId, calendarId, filters) {
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
    async createCalendar(userId, name, description) {
        const calendar = await this.getCalendarInstance(userId);
        const res = await calendar.calendars.insert({
            requestBody: {
                summary: name,
                description: description || 'Birthday Calendar - Created by Hebrew Birthday App'
            }
        });
        return res.data.id || '';
    }
    async deleteCalendar(userId, calendarId) {
        const calendar = await this.getCalendarInstance(userId);
        await calendar.calendars.delete({ calendarId });
    }
    async listCalendars(userId) {
        const calendar = await this.getCalendarInstance(userId);
        const list = await calendar.calendarList.list({ minAccessRole: 'writer' });
        return list.data.items || [];
    }
    async getUserInfo(userId) {
        const accessToken = await this.authClient.getValidAccessToken(userId);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        return {
            email: userInfo.data.email || '',
            name: userInfo.data.name || '',
            picture: userInfo.data.picture || ''
        };
    }
}
exports.GoogleCalendarClient = GoogleCalendarClient;
//# sourceMappingURL=GoogleCalendarClient.js.map