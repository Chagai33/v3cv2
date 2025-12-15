"use strict";
// GoogleAuthClient - ניהול אימות ו-tokens עבור Google Calendar
// מקור: שורות 133-176 מ-index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthClient = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
class GoogleAuthClient {
    constructor(tokenRepo, clientId, clientSecret, redirectUri) {
        this.tokenRepo = tokenRepo;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }
    async getValidAccessToken(userId, minValidityMillis = 60000) {
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
            const oauth2Client = new googleapis_1.google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
            oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken });
            const { credentials } = await oauth2Client.refreshAccessToken();
            await this.tokenRepo.update(userId, {
                accessToken: credentials.access_token,
                expiresAt: credentials.expiry_date || (Date.now() + 3600 * 1000),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return credentials.access_token;
        }
        catch (error) {
            functions.logger.error(`Failed to refresh token for user ${userId}:`, error);
            throw new functions.https.HttpsError('permission-denied', 'googleCalendar.connectFirst');
        }
    }
    async getCalendarId(userId) {
        const tokenData = await this.tokenRepo.findByUserId(userId);
        return tokenData?.calendarId || 'primary';
    }
    async getCalendarName(userId) {
        const tokenData = await this.tokenRepo.findByUserId(userId);
        return tokenData?.calendarName || 'Primary Calendar';
    }
    async exchangeCode(code, userId) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        const update = {
            userId,
            accessToken: tokens.access_token,
            expiresAt: tokens.expiry_date,
            scope: tokens.scope,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (tokens.refresh_token) {
            update.refreshToken = tokens.refresh_token;
        }
        await this.tokenRepo.save(userId, update);
    }
}
exports.GoogleAuthClient = GoogleAuthClient;
//# sourceMappingURL=GoogleAuthClient.js.map