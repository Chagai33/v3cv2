"use strict";
// GoogleOAuthUseCase - אימות Google OAuth
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthUseCase = void 0;
class GoogleOAuthUseCase {
    constructor(authClient, calendarClient, tokenRepo) {
        this.authClient = authClient;
        this.calendarClient = calendarClient;
        this.tokenRepo = tokenRepo;
    }
    async exchangeCode(code, userId) {
        await this.authClient.exchangeCode(code, userId);
        const tokenData = await this.tokenRepo.findByUserId(userId);
        return { accessToken: tokenData?.accessToken || '' };
    }
    async disconnect(userId) {
        await this.tokenRepo.delete(userId);
    }
    async getStatus(userId) {
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
        }
        catch (e) {
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
    async getAccountInfo(userId) {
        return await this.calendarClient.getUserInfo(userId);
    }
}
exports.GoogleOAuthUseCase = GoogleOAuthUseCase;
//# sourceMappingURL=GoogleOAuthUseCase.js.map