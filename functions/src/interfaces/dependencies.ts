// DI Container - Manual Dependency Injection
// יצירת כל התלויות והקישור ביניהן

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Infrastructure
import { BirthdayRepository } from '../infrastructure/database/repositories/BirthdayRepository';
import { TenantRepository } from '../infrastructure/database/repositories/TenantRepository';
import { TokenRepository } from '../infrastructure/database/repositories/TokenRepository';
import { WishlistRepository } from '../infrastructure/database/repositories/WishlistRepository';
import { GroupRepository } from '../infrastructure/database/repositories/GroupRepository';
import { GoogleAuthClient } from '../infrastructure/google/GoogleAuthClient';
import { GoogleCalendarClient } from '../infrastructure/google/GoogleCalendarClient';
import { TasksClient } from '../infrastructure/tasks/CloudTasksClient';

// Domain
import { ZodiacService } from '../domain/services/ZodiacService';
import { HebcalService } from '../domain/services/HebcalService';
import { EventBuilderService } from '../domain/services/EventBuilderService';

// Application
import { SyncBirthdayUseCase } from '../application/use-cases/sync/SyncBirthdayUseCase';
import { RemoveSyncUseCase } from '../application/use-cases/sync/RemoveSyncUseCase';
import { BulkSyncUseCase } from '../application/use-cases/sync/BulkSyncUseCase';
import { CalculateHebrewDataUseCase } from '../application/use-cases/birthday/CalculateHebrewDataUseCase';
import { CleanupOrphanEventsUseCase } from '../application/use-cases/calendar/CleanupOrphanEventsUseCase';
import { ManageCalendarUseCase } from '../application/use-cases/calendar/ManageCalendarUseCase';
import { GoogleOAuthUseCase } from '../application/use-cases/auth/GoogleOAuthUseCase';

// Constants
import { PROJECT_ID, LOCATION, QUEUE } from '../shared/constants';

export interface Dependencies {
  // Infrastructure
  db: admin.firestore.Firestore;
  birthdayRepo: BirthdayRepository;
  tenantRepo: TenantRepository;
  tokenRepo: TokenRepository;
  wishlistRepo: WishlistRepository;
  groupRepo: GroupRepository;
  authClient: GoogleAuthClient;
  calendarClient: GoogleCalendarClient;
  tasksClient: TasksClient;
  
  // Domain
  zodiacService: ZodiacService;
  hebcalService: HebcalService;
  eventBuilder: EventBuilderService;
  
  // Application
  syncBirthdayUseCase: SyncBirthdayUseCase;
  removeSyncUseCase: RemoveSyncUseCase;
  bulkSyncUseCase: BulkSyncUseCase;
  calculateHebrewDataUseCase: CalculateHebrewDataUseCase;
  cleanupOrphanEventsUseCase: CleanupOrphanEventsUseCase;
  manageCalendarUseCase: ManageCalendarUseCase;
  googleOAuthUseCase: GoogleOAuthUseCase;
}

let _dependencies: Dependencies | null = null;

export function createDependencies(): Dependencies {
  if (_dependencies) return _dependencies;

  const db = admin.firestore();
  
  // Config - moved here to avoid timeout during module initialization
  const GOOGLE_CLIENT_ID = functions.config().google?.client_id || '';
  const GOOGLE_CLIENT_SECRET = functions.config().google?.client_secret || '';
  const GOOGLE_REDIRECT_URI = functions.config().google?.redirect_uri || 'postmessage';
  
  // Infrastructure Layer
  const birthdayRepo = new BirthdayRepository(db);
  const tenantRepo = new TenantRepository(db);
  const tokenRepo = new TokenRepository(db);
  const wishlistRepo = new WishlistRepository(db);
  const groupRepo = new GroupRepository(db);
  
  const authClient = new GoogleAuthClient(
    tokenRepo,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  const calendarClient = new GoogleCalendarClient(authClient);
  const tasksClient = new TasksClient(PROJECT_ID, LOCATION, QUEUE);
  
  // Domain Layer
  const zodiacService = new ZodiacService();
  const hebcalService = new HebcalService();
  const eventBuilder = new EventBuilderService(zodiacService);
  
  // Application Layer
  const syncBirthdayUseCase = new SyncBirthdayUseCase(
    birthdayRepo,
    tenantRepo,
    wishlistRepo,
    groupRepo,
    authClient,
    calendarClient,
    eventBuilder
  );
  
  const removeSyncUseCase = new RemoveSyncUseCase(
    birthdayRepo,
    syncBirthdayUseCase
  );
  
  const bulkSyncUseCase = new BulkSyncUseCase(
    birthdayRepo,
    tokenRepo,
    tasksClient,
    syncBirthdayUseCase,
    db
  );
  
  const calculateHebrewDataUseCase = new CalculateHebrewDataUseCase(
    hebcalService,
    birthdayRepo
  );
  
  const cleanupOrphanEventsUseCase = new CleanupOrphanEventsUseCase(
    calendarClient,
    authClient,
    db
  );
  
  const manageCalendarUseCase = new ManageCalendarUseCase(
    calendarClient,
    tokenRepo
  );
  
  const googleOAuthUseCase = new GoogleOAuthUseCase(
    authClient,
    calendarClient,
    tokenRepo
  );
  
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

