"use strict";
// ManageCalendarUseCase - ניהול Google Calendars (יצירה, מחיקה, רשימה)
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageCalendarUseCase = void 0;
class ManageCalendarUseCase {
    constructor(calendarClient, tokenRepo) {
        this.calendarClient = calendarClient;
        this.tokenRepo = tokenRepo;
    }
    async createCalendar(userId, name) {
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
    async deleteCalendar(userId, calendarId) {
        await this.calendarClient.deleteCalendar(userId, calendarId);
    }
    async listCalendars(userId) {
        return await this.calendarClient.listCalendars(userId);
    }
    async updateSelection(userId, calendarId, calendarName) {
        await this.tokenRepo.update(userId, {
            calendarId,
            calendarName
        });
    }
}
exports.ManageCalendarUseCase = ManageCalendarUseCase;
//# sourceMappingURL=ManageCalendarUseCase.js.map