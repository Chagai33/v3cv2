"use strict";
// User Triggers - Firebase Auth Triggers
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
exports.onUserCreateFn = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.onUserCreateFn = functions.auth.user().onCreate(async (user) => {
    try {
        const db = admin.firestore();
        const batch = db.batch();
        const tenantRef = db.collection('tenants').doc();
        batch.set(tenantRef, {
            name: `${user.displayName || 'User'}'s Organization`,
            owner_id: user.uid,
            default_language: 'he',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('tenant_members').doc(), {
            tenant_id: tenantRef.id,
            user_id: user.uid,
            role: 'owner'
        });
        await batch.commit();
        // Set custom claims AFTER batch commit
        await admin.auth().setCustomUserClaims(user.uid, {
            tenantId: tenantRef.id,
            role: 'owner'
        });
        functions.logger.log(`✅ User ${user.uid} created with tenant ${tenantRef.id}`);
    }
    catch (error) {
        functions.logger.error('Error in onUserCreate:', error);
        throw error;
    }
});
//# sourceMappingURL=user-triggers.js.map