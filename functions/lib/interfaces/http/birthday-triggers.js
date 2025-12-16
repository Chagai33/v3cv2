"use strict";
// Birthday Triggers - Firebase Firestore Triggers
// מקור: onBirthdayWrite מ-index.ts
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
exports.onBirthdayWriteFn = void 0;
const functions = __importStar(require("firebase-functions"));
const dependencies_1 = require("../dependencies");
let deps = null;
exports.onBirthdayWriteFn = functions.firestore
    .document('birthdays/{birthdayId}')
    .onWrite(async (change, context) => {
    // Lazy initialization - רק בפעם הראשונה
    if (!deps)
        deps = (0, dependencies_1.createDependencies)();
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    // 1. Deletion
    if (!afterData) {
        if (beforeData && beforeData.tenant_id) {
            try {
                await deps.syncBirthdayUseCase.execute(context.params.birthdayId, { ...beforeData, archived: true }, beforeData.tenant_id, false, true);
            }
            catch (e) {
                functions.logger.error('Cleanup error:', e);
            }
        }
        return null;
    }
    if (!afterData.birth_date_gregorian)
        return null;
    // 2. Hebcal Logic
    const shouldCalculate = deps.calculateHebrewDataUseCase.shouldCalculate(beforeData, afterData);
    let updateData = {};
    if (shouldCalculate) {
        try {
            updateData = await deps.calculateHebrewDataUseCase.execute(context.params.birthdayId, afterData.birth_date_gregorian, afterData.after_sunset || false);
            return null; // Return early, don't continue to sync
        }
        catch (e) {
            functions.logger.error('Hebcal error:', e);
        }
    }
    // 3. Smart Sync
    const finalData = { ...afterData, ...updateData };
    // ✅ דלג על system updates כדי למנוע לולאה אינסופית
    if (afterData._systemUpdate) {
        functions.logger.log('Skipping sync - system update detected');
        return null;
    }
    if (finalData.tenant_id && finalData.isSynced === true) {
        try {
            await deps.syncBirthdayUseCase.execute(context.params.birthdayId, finalData, finalData.tenant_id);
        }
        catch (e) {
            functions.logger.error('Sync error:', e);
        }
    }
    else if (finalData.tenant_id &&
        beforeData?.isSynced === true &&
        finalData.isSynced === false) {
        try {
            await deps.syncBirthdayUseCase.execute(context.params.birthdayId, { ...finalData, archived: true }, finalData.tenant_id);
        }
        catch (e) {
            functions.logger.error('Removal error:', e);
        }
    }
    return null;
});
//# sourceMappingURL=birthday-triggers.js.map