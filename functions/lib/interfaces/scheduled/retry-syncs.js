"use strict";
// Scheduled function - Retry failed syncs
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
exports.retryFailedSyncsFn = void 0;
const functions = __importStar(require("firebase-functions"));
const dependencies_1 = require("../dependencies");
const calendar_utils_1 = require("../../shared/utils/calendar-utils");
const deps = (0, dependencies_1.createDependencies)();
exports.retryFailedSyncsFn = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
    const snap = await deps.db
        .collection('birthdays')
        .where('archived', '==', false)
        .where('syncMetadata.status', 'in', ['PARTIAL_SYNC', 'ERROR'])
        .limit(50) // ✅ שינוי 3: הגבלת כמות למניעת עומס
        .get();
    const tasks = snap.docs
        .map((doc) => {
        const d = doc.data();
        const retryCount = d.syncMetadata?.retryCount || 0;
        // דלג על טוקנים מתים (999) או מי שעבר את המכסה (>=3)
        if (retryCount === 999 || retryCount >= 3) {
            return null;
        }
        return () => deps.syncBirthdayUseCase.execute(doc.id, d, d.tenant_id);
    })
        .filter((t) => t !== null);
    if (tasks.length) {
        await (0, calendar_utils_1.batchProcessor)(tasks, 5);
        functions.logger.log(`Retried ${tasks.length} syncs`);
    }
});
//# sourceMappingURL=retry-syncs.js.map