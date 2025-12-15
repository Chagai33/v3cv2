"use strict";
// RemoveSyncUseCase - הסרת סנכרון של יום הולדת מ-Google Calendar
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
exports.RemoveSyncUseCase = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
class RemoveSyncUseCase {
    constructor(birthdayRepo, syncUseCase) {
        this.birthdayRepo = birthdayRepo;
        this.syncUseCase = syncUseCase;
    }
    async execute(birthdayId) {
        const birthday = await this.birthdayRepo.findById(birthdayId);
        if (!birthday) {
            throw new functions.https.HttpsError('not-found', 'Birthday not found');
        }
        if (!birthday.tenant_id) {
            throw new functions.https.HttpsError('invalid-argument', 'No tenant ID');
        }
        // Mark as unsynced FIRST to prevent trigger recreation loop
        await this.birthdayRepo.update(birthdayId, { isSynced: false });
        // Perform deletion (archived: true tells SyncBirthdayUseCase to delete ALL events)
        await this.syncUseCase.execute(birthdayId, { ...birthday, isSynced: false, archived: true }, birthday.tenant_id);
        // Cleanup metadata - use FieldValue.delete() to properly remove fields
        await this.birthdayRepo.update(birthdayId, {
            googleCalendarEventsMap: admin.firestore.FieldValue.delete(),
            syncMetadata: admin.firestore.FieldValue.delete(),
            googleCalendarEventId: admin.firestore.FieldValue.delete(),
            googleCalendarEventIds: admin.firestore.FieldValue.delete(),
            lastSyncedAt: admin.firestore.FieldValue.delete()
        });
    }
}
exports.RemoveSyncUseCase = RemoveSyncUseCase;
//# sourceMappingURL=RemoveSyncUseCase.js.map