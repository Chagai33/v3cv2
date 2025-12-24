import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ======================================================================
// Guest Access Cloud Function - Secure Read Access for Guest Magic Links
// ======================================================================

interface GetGroupBirthdaysRequest {
  mode: 'get_group_birthdays';
  groupId: string;
  token: string;
}

interface VerifyGuestTokenRequest {
  mode: 'verify_guest_token';
  groupId: string;
  token: string;
}

interface AddBirthdayRequest {
  mode: 'add_birthday';
  groupId: string;
  token: string;
  birthdayData: {
    firstName: string;
    lastName: string;
    birthDateGregorian: string;
    gender: 'male' | 'female';
    afterSunset?: boolean;
    notes?: string;
    honeyPot?: string; // Hidden field for bot detection
  };
}

type GuestAccessRequest = GetGroupBirthdaysRequest | VerifyGuestTokenRequest | AddBirthdayRequest;

interface RateLimitData {
  attempts: number;
  blockedUntil: admin.firestore.Timestamp;
}

// ======================================================================
// Rate Limiting Logic (Anti-Brute Force Protection)
// ======================================================================

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const rateLimitRef = db.collection('rate_limits').doc(ip.replace(/\./g, '_')); // Sanitize IP for doc ID
  const doc = await rateLimitRef.get();

  if (!doc.exists) {
    return { allowed: true };
  }

  const data = doc.data() as RateLimitData;
  const now = admin.firestore.Timestamp.now();

  if (data.blockedUntil && data.blockedUntil > now) {
    const waitSeconds = Math.ceil(data.blockedUntil.seconds - now.seconds);
    return { allowed: false, waitSeconds };
  }

  // If block expired, reset attempts
  if (data.blockedUntil && data.blockedUntil <= now) {
    await rateLimitRef.delete();
  }

  return { allowed: true };
}

async function recordFailedAttempt(ip: string) {
  console.log(`Recording failed guest access attempt for IP: ${ip}`);
  const rateLimitRef = db.collection('rate_limits').doc(ip.replace(/\./g, '_'));
  
  await db.runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    let attempts = 1;
    
    if (doc.exists) {
      attempts = (doc.data()?.attempts || 0) + 1;
    }

    let blockedUntil = null;
    // Policy: 3 free attempts, then progressive blocking
    // 4th attempt -> block 30s
    // 5th attempt -> block 60s
    // 6th+ attempt -> block 5 mins
    if (attempts >= 3) {
      let delaySeconds = 0;
      if (attempts === 3) delaySeconds = 30;
      else if (attempts === 4) delaySeconds = 60;
      else delaySeconds = 300;

      blockedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + (delaySeconds * 1000));
      console.log(`Blocking IP ${ip} until ${blockedUntil.toDate().toISOString()} (${delaySeconds}s)`);
    }

    t.set(rateLimitRef, {
      attempts,
      blockedUntil: blockedUntil,
      lastAttempt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

/**
 * Verify that a guest token is valid for a specific group
 * Checks: token match, access enabled, expiration time
 */
async function verifyGuestToken(groupId: string, token: string): Promise<{ isValid: boolean; groupData?: any; error?: string }> {
  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();
    
    if (!groupDoc.exists) {
      console.log(`Group ${groupId} not found`);
      return { isValid: false, error: 'GROUP_NOT_FOUND' };
    }

    const groupData = groupDoc.data();
    
    // Check if guest access is enabled
    if (groupData?.is_guest_access_enabled !== true) {
      console.log(`Guest access disabled for group ${groupId}`);
      return { isValid: false, error: 'ACCESS_DISABLED' };
    }

    // Verify token matches
    if (groupData?.guest_access_token !== token) {
      console.log(`Token mismatch for group ${groupId}`);
      return { isValid: false, error: 'INVALID_TOKEN' };
    }

    // Check token expiration (72 hours from generation)
    if (groupData?.guest_token_expires_at) {
      const expiresAt = new Date(groupData.guest_token_expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log(`Token expired for group ${groupId}. Expired at: ${expiresAt.toISOString()}`);
        return { isValid: false, error: 'TOKEN_EXPIRED' };
      }
    }

    // All checks passed
    return { isValid: true, groupData };
  } catch (error) {
    console.error('Error verifying guest token:', error);
    return { isValid: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Get all non-archived birthdays for a group (with valid guest token)
 * Includes rate limiting to prevent brute force attacks
 */
async function getGroupBirthdays(groupId: string, token: string, ip: string) {
  // Step 1: Verify token
  const { isValid, groupData, error } = await verifyGuestToken(groupId, token);
  
  if (!isValid || !groupData) {
    // Record failed attempt for rate limiting
    await recordFailedAttempt(ip);
    
    // Return specific error messages for better UX
    let errorMessage = 'Invalid token or guest access is disabled for this group';
    if (error === 'TOKEN_EXPIRED') {
      errorMessage = 'This guest link has expired (72-hour limit). Please contact the group admin for a new link.';
    } else if (error === 'ACCESS_DISABLED') {
      errorMessage = 'Guest access has been disabled for this group by the admin.';
    }
    
    throw new functions.https.HttpsError(
      'permission-denied',
      errorMessage
    );
  }

  // Step 2: Fetch all birthdays in this group
  try {
    const birthdaysSnapshot = await db.collection('birthdays')
      .where('group_ids', 'array-contains', groupId)
      .where('archived', '==', false)
      .get();

    // Step 3: Format birthdays for client (DATA MINIMIZATION - only safe fields)
    const birthdays = birthdaysSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        // Personal info (safe to share)
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        // Date info
        birth_date_gregorian: data.birth_date_gregorian,
        after_sunset: data.after_sunset || false,
        gregorian_year: data.gregorian_year,
        gregorian_month: data.gregorian_month,
        gregorian_day: data.gregorian_day,
        // PRIVACY: Do NOT return notes, created_by, updated_by, sync metadata, etc.
        // Guest indicator (for UI purposes)
        created_by_guest: data.created_by_guest || false,
      };
    });

    // Step 4: Return group info + birthdays + contribution limit
    return {
      success: true,
      group: {
        id: groupId,
        name: groupData.name,
        color: groupData.color,
        tenant_id: groupData.tenant_id,
        guest_contribution_limit: groupData.guest_contribution_limit || 50,
        guest_token_expires_at: groupData.guest_token_expires_at,
      },
      birthdays,
      count: birthdays.length,
    };
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch birthdays'
    );
  }
}

/**
 * Add a new birthday via guest access (with contribution limit check)
 */
async function addBirthdayAsGuest(
  groupId: string,
  token: string,
  birthdayData: AddBirthdayRequest['birthdayData'],
  ip: string
) {
  // Step 1: HONEY POT CHECK (Bot Detection)
  if (birthdayData.honeyPot && birthdayData.honeyPot.trim() !== '') {
    console.log(`Honey pot triggered for IP ${ip}`);
    await recordFailedAttempt(ip);
    throw new functions.https.HttpsError(
      'permission-denied',
      'Bot detected. Access denied.'
    );
  }

  // Step 2: Verify token and get group data
  const { isValid, groupData, error } = await verifyGuestToken(groupId, token);
  
  if (!isValid || !groupData) {
    await recordFailedAttempt(ip);
    
    let errorMessage = 'Invalid token or guest access is disabled for this group';
    if (error === 'TOKEN_EXPIRED') {
      errorMessage = 'This guest link has expired (72-hour limit). Please contact the group admin for a new link.';
    } else if (error === 'ACCESS_DISABLED') {
      errorMessage = 'Guest access has been disabled for this group by the admin.';
    }
    
    throw new functions.https.HttpsError('permission-denied', errorMessage);
  }

  // Step 3: Check contribution limit (default 50)
  const contributionLimit = groupData.guest_contribution_limit || 50;
  
  // Count existing birthdays created with this token
  const existingBirthdaysSnapshot = await db.collection('birthdays')
    .where('guest_token_used', '==', token)
    .where('archived', '==', false)
    .get();
  
  const currentCount = existingBirthdaysSnapshot.size;
  
  if (currentCount >= contributionLimit) {
    console.log(`Contribution limit reached for token ${token} (${currentCount}/${contributionLimit})`);
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `This guest link has reached its maximum limit of ${contributionLimit} birthday entries. Please contact the group admin.`
    );
  }

  // Step 4: Validate birthday data
  if (!birthdayData.firstName || !birthdayData.lastName || !birthdayData.birthDateGregorian) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required birthday fields');
  }

  // Parse date
  const birthDate = new Date(birthdayData.birthDateGregorian);
  if (isNaN(birthDate.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid birth date format');
  }

  // Step 5: Create birthday document
  const newBirthday = {
    tenant_id: groupData.tenant_id,
    group_ids: [groupId],
    group_id: groupId,
    first_name: birthdayData.firstName.trim(),
    last_name: birthdayData.lastName.trim(),
    birth_date_gregorian: birthdayData.birthDateGregorian,
    after_sunset: birthdayData.afterSunset || false,
    gender: birthdayData.gender,
    gregorian_year: birthDate.getFullYear(),
    gregorian_month: birthDate.getMonth() + 1,
    gregorian_day: birthDate.getDate(),
    notes: birthdayData.notes ? birthdayData.notes.trim() : '',
    archived: false,
    created_by: 'guest',
    updated_by: 'guest',
    created_by_guest: true,
    guest_token_used: token,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    // Hebrew date fields will be calculated by triggers
    birth_date_hebrew_string: null,
    next_upcoming_hebrew_birthday: null,
    future_hebrew_birthdays: [],
  };

  const birthdayRef = await db.collection('birthdays').add(newBirthday);

  console.log(`Guest added birthday ${birthdayRef.id} to group ${groupId} (${currentCount + 1}/${contributionLimit})`);

  return {
    success: true,
    birthdayId: birthdayRef.id,
    contributionsUsed: currentCount + 1,
    contributionLimit: contributionLimit,
  };
}

/**
 * Main Cloud Function: Guest Access Operations
 * 
 * Modes:
 * - verify_guest_token: Check if a token is valid for a group
 * - get_group_birthdays: Fetch all birthdays in a group (with valid token)
 * - add_birthday: Add a new birthday to a group (with contribution limit and honey pot check)
 * 
 * Security Features:
 * - Rate limiting to prevent brute force attacks
 * - Data minimization (only safe fields returned)
 * - Token validation against group document
 * - 72-hour token expiration
 * - Contribution limit (default: 50 birthdays per token)
 * - Honey pot field for bot detection
 */
export const guestAccessOps = functions.https.onCall(async (data: GuestAccessRequest, context) => {
  const { mode } = data;

  // Get IP for rate limiting
  const ip = context.rawRequest.ip || context.rawRequest.headers['x-forwarded-for'] || 'unknown';
  const ipStr = Array.isArray(ip) ? ip[0] : ip;

  console.log(`Guest Access Ops called. Mode: ${mode}, IP: ${ipStr}`);

  // Mode: Verify Guest Token
  if (mode === 'verify_guest_token') {
    // Check rate limit
    const limitCheck = await checkRateLimit(ipStr);
    if (!limitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many attempts. Please wait ${limitCheck.waitSeconds} seconds.`
      );
    }

    const { groupId, token } = data as VerifyGuestTokenRequest;

    if (!groupId || !token) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing groupId or token');
    }

    const { isValid, groupData, error } = await verifyGuestToken(groupId, token);

    if (!isValid) {
      await recordFailedAttempt(ipStr);
      
      let errorMessage = 'Invalid token or guest access is disabled';
      if (error === 'TOKEN_EXPIRED') {
        errorMessage = 'This guest link has expired (72-hour limit).';
      } else if (error === 'ACCESS_DISABLED') {
        errorMessage = 'Guest access has been disabled for this group.';
      }
      
      throw new functions.https.HttpsError('permission-denied', errorMessage);
    }

    return {
      success: true,
      group: {
        id: groupId,
        name: groupData?.name,
        color: groupData?.color,
        tenant_id: groupData?.tenant_id,
        guest_contribution_limit: groupData?.guest_contribution_limit || 50,
        guest_token_expires_at: groupData?.guest_token_expires_at,
      },
    };
  }

  // Mode: Get Group Birthdays
  if (mode === 'get_group_birthdays') {
    // Check rate limit
    const limitCheck = await checkRateLimit(ipStr);
    if (!limitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many attempts. Please wait ${limitCheck.waitSeconds} seconds.`
      );
    }

    const { groupId, token } = data as GetGroupBirthdaysRequest;

    if (!groupId || !token) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing groupId or token');
    }

    return await getGroupBirthdays(groupId, token, ipStr);
  }

  // Mode: Add Birthday
  if (mode === 'add_birthday') {
    // Check rate limit
    const limitCheck = await checkRateLimit(ipStr);
    if (!limitCheck.allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many attempts. Please wait ${limitCheck.waitSeconds} seconds.`
      );
    }

    const { groupId, token, birthdayData } = data as AddBirthdayRequest;

    if (!groupId || !token || !birthdayData) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    return await addBirthdayAsGuest(groupId, token, birthdayData, ipStr);
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid mode');
});

