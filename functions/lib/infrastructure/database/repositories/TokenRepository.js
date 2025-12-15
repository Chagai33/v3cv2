"use strict";
// TokenRepository - גישה לנתוני Google Calendar tokens ב-Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRepository = void 0;
class TokenRepository {
    constructor(db) {
        this.db = db;
    }
    async findByUserId(userId) {
        const doc = await this.db.collection('googleCalendarTokens').doc(userId).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    async save(userId, data) {
        await this.db.collection('googleCalendarTokens').doc(userId).set(data, { merge: true });
    }
    async update(userId, data) {
        await this.db.collection('googleCalendarTokens').doc(userId).update(data);
    }
    async delete(userId) {
        await this.db.collection('googleCalendarTokens').doc(userId).delete();
    }
    getDocRef(userId) {
        return this.db.collection('googleCalendarTokens').doc(userId);
    }
}
exports.TokenRepository = TokenRepository;
//# sourceMappingURL=TokenRepository.js.map