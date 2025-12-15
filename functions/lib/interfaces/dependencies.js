"use strict";
// DI Container - Manual Dependency Injection
// יצירת כל התלויות והקישור ביניהן
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
exports.createDependencies = createDependencies;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Infrastructure
const BirthdayRepository_1 = require("../infrastructure/database/repositories/BirthdayRepository");
const TenantRepository_1 = require("../infrastructure/database/repositories/TenantRepository");
const TokenRepository_1 = require("../infrastructure/database/repositories/TokenRepository");
const WishlistRepository_1 = require("../infrastructure/database/repositories/WishlistRepository");
const GroupRepository_1 = require("../infrastructure/database/repositories/GroupRepository");
const GoogleAuthClient_1 = require("../infrastructure/google/GoogleAuthClient");
const GoogleCalendarClient_1 = require("../infrastructure/google/GoogleCalendarClient");
const CloudTasksClient_1 = require("../infrastructure/tasks/CloudTasksClient");
// Domain
const ZodiacService_1 = require("../domain/services/ZodiacService");
const HebcalService_1 = require("../domain/services/HebcalService");
const EventBuilderService_1 = require("../domain/services/EventBuilderService");
// Application
const SyncBirthdayUseCase_1 = require("../application/use-cases/sync/SyncBirthdayUseCase");
const RemoveSyncUseCase_1 = require("../application/use-cases/sync/RemoveSyncUseCase");
const BulkSyncUseCase_1 = require("../application/use-cases/sync/BulkSyncUseCase");
const CalculateHebrewDataUseCase_1 = require("../application/use-cases/birthday/CalculateHebrewDataUseCase");
const CleanupOrphanEventsUseCase_1 = require("../application/use-cases/calendar/CleanupOrphanEventsUseCase");
const ManageCalendarUseCase_1 = require("../application/use-cases/calendar/ManageCalendarUseCase");
const GoogleOAuthUseCase_1 = require("../application/use-cases/auth/GoogleOAuthUseCase");
// Constants
const constants_1 = require("../shared/constants");
let _dependencies = null;
function createDependencies() {
    if (_dependencies)
        return _dependencies;
    const db = admin.firestore();
    // Config - moved here to avoid timeout during module initialization
    const GOOGLE_CLIENT_ID = functions.config().google?.client_id || '';
    const GOOGLE_CLIENT_SECRET = functions.config().google?.client_secret || '';
    const GOOGLE_REDIRECT_URI = functions.config().google?.redirect_uri || 'postmessage';
    // Infrastructure Layer
    const birthdayRepo = new BirthdayRepository_1.BirthdayRepository(db);
    const tenantRepo = new TenantRepository_1.TenantRepository(db);
    const tokenRepo = new TokenRepository_1.TokenRepository(db);
    const wishlistRepo = new WishlistRepository_1.WishlistRepository(db);
    const groupRepo = new GroupRepository_1.GroupRepository(db);
    const authClient = new GoogleAuthClient_1.GoogleAuthClient(tokenRepo, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    const calendarClient = new GoogleCalendarClient_1.GoogleCalendarClient(authClient);
    const tasksClient = new CloudTasksClient_1.TasksClient(constants_1.PROJECT_ID, constants_1.LOCATION, constants_1.QUEUE);
    // Domain Layer
    const zodiacService = new ZodiacService_1.ZodiacService();
    const hebcalService = new HebcalService_1.HebcalService();
    const eventBuilder = new EventBuilderService_1.EventBuilderService(zodiacService);
    // Application Layer
    const syncBirthdayUseCase = new SyncBirthdayUseCase_1.SyncBirthdayUseCase(birthdayRepo, tenantRepo, wishlistRepo, groupRepo, authClient, calendarClient, eventBuilder);
    const removeSyncUseCase = new RemoveSyncUseCase_1.RemoveSyncUseCase(birthdayRepo, syncBirthdayUseCase);
    const bulkSyncUseCase = new BulkSyncUseCase_1.BulkSyncUseCase(birthdayRepo, tokenRepo, tasksClient, syncBirthdayUseCase, db);
    const calculateHebrewDataUseCase = new CalculateHebrewDataUseCase_1.CalculateHebrewDataUseCase(hebcalService, birthdayRepo);
    const cleanupOrphanEventsUseCase = new CleanupOrphanEventsUseCase_1.CleanupOrphanEventsUseCase(calendarClient, authClient, db);
    const manageCalendarUseCase = new ManageCalendarUseCase_1.ManageCalendarUseCase(calendarClient, tokenRepo);
    const googleOAuthUseCase = new GoogleOAuthUseCase_1.GoogleOAuthUseCase(authClient, calendarClient, tokenRepo);
    _dependencies = {
        db,
        birthdayRepo,
        tenantRepo,
        tokenRepo,
        wishlistRepo,
        groupRepo,
        authClient,
        calendarClient,
        tasksClient,
        zodiacService,
        hebcalService,
        eventBuilder,
        syncBirthdayUseCase,
        removeSyncUseCase,
        bulkSyncUseCase,
        calculateHebrewDataUseCase,
        cleanupOrphanEventsUseCase,
        manageCalendarUseCase,
        googleOAuthUseCase
    };
    return _dependencies;
}
//# sourceMappingURL=dependencies.js.map