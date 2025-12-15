import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Interfaces
interface GuestVerifyRequest {
  firstName?: string;
  lastName?: string;
  verification?: { // Optional in manage_wishlist if token is present
    type: 'gregorian' | 'hebrew';
    dateString?: string; // "YYYY-MM-DD"
    hebrewDay?: number;
    hebrewMonth?: string;
    hebrewYear?: number;
  };
  token?: string; // New session token
  birthdayId?: string; // For selecting specific profile
}

interface RateLimitData {
  attempts: number;
  blockedUntil: admin.firestore.Timestamp;
}

// --- Rate Limiting Logic ---
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

  // If block expired, reset attempts (or we can keep them and decay, but simple reset is fine for now)
  if (data.blockedUntil && data.blockedUntil <= now) {
      await rateLimitRef.delete();
  }

  return { allowed: true };
}

async function recordFailedAttempt(ip: string) {
  console.log(`Recording failed attempt for IP: ${ip}`); // Added logging
  const rateLimitRef = db.collection('rate_limits').doc(ip.replace(/\./g, '_'));
  
  await db.runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    let attempts = 1;
    
    if (doc.exists) {
      attempts = (doc.data()?.attempts || 0) + 1;
    }

    let blockedUntil = null;
    // Policy: 3 free attempts.
    // 4th attempt -> block 30s
    // 5th attempt -> block 60s
    // 6th+ attempt -> block 5 mins
    if (attempts >= 3) {
        let delaySeconds = 0;
        if (attempts === 3) delaySeconds = 30;
        else if (attempts === 4) delaySeconds = 60;
        else delaySeconds = 300;

        blockedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + (delaySeconds * 1000));
        console.log(`Blocking IP ${ip} until ${blockedUntil.toDate().toISOString()} (${delaySeconds}s)`); // Added logging
    }

    t.set(rateLimitRef, {
        attempts,
        blockedUntil: blockedUntil, // Only set if explicitly defined, otherwise null
        lastAttempt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

// --- Session Management ---
async function createSession(birthdayId: string, tenantId: string): Promise<string> {
    const token = db.collection('guest_sessions').doc().id; // Generate random ID
    await db.collection('guest_sessions').doc(token).set({
        birthdayId,
        tenantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (5 * 60 * 1000)) // 5 minutes
    });
    return token;
}

async function validateSession(token: string): Promise<{ isValid: boolean; birthdayId?: string; tenantId?: string }> {
    const doc = await db.collection('guest_sessions').doc(token).get();
    if (!doc.exists) return { isValid: false };

    const data = doc.data();
    if (!data) return { isValid: false };
    
    const now = Date.now();
    const expiresAt = typeof data.expiresAt === 'string' 
        ? new Date(data.expiresAt).getTime() 
        : data.expiresAt?.toMillis?.() || 0;

    if (expiresAt <= now) {
        // Expired
        await doc.ref.delete(); // Cleanup
        return { isValid: false };
    }

    return { isValid: true, birthdayId: data.birthdayId, tenantId: data.tenantId };
}

// --- Identity Verification ---
// Updated to return ALL matches
async function findAllMatchingGuests(firstName: string, lastName: string, verification: GuestVerifyRequest['verification']): Promise<Array<{ tenantId: string; birthdayId: string; groupIds?: string[]; birthday: any }>> {
  try {
    const snapshot = await db.collection('birthdays')
        .where('first_name', '==', firstName)
        .where('last_name', '==', lastName)
        .where('archived', '==', false)
        .limit(10) // Limit to avoid abuse
        .get();

    if (snapshot.empty) return [];

    const matches = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let isMatch = false;

        if (verification?.type === 'gregorian' && verification.dateString) {
            if (data.birth_date_gregorian === verification.dateString) isMatch = true;
        } else if (verification?.type === 'hebrew' && verification.hebrewYear) {
            if (
                data.hebrew_year === verification.hebrewYear &&
                data.hebrew_month === verification.hebrewMonth &&
                data.hebrew_day === verification.hebrewDay
            ) isMatch = true;
        }

        if (isMatch) {
            matches.push({
                tenantId: data.tenant_id,
                birthdayId: doc.id,
                groupIds: data.group_ids || (data.group_id ? [data.group_id] : []),
                birthday: data
            });
        }
    }
    return matches;
  } catch (error) {
    console.error('Error verifying guest:', error);
    return [];
  }
}

// Helper to get Tenant Owner Name
async function getTenantDisplayName(tenantId: string): Promise<string> {
    try {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) return 'Unknown Group';
        
        const tenantData = tenantDoc.data();
        if (!tenantData) return 'Unknown Group';

        // Try to get owner's display name
        if (tenantData.owner_id) {
            const userDoc = await db.collection('users').doc(tenantData.owner_id).get();
            if (userDoc.exists && userDoc.data()?.display_name) {
                return userDoc.data()?.display_name;
            }
        }

        // Fallback to tenant name
        return tenantData.name || 'Unknown Group';
    } catch {
        return 'Unknown Group';
    }
}

// Helper to get Group Name
async function getGroupName(groupId?: string): Promise<string> {
    if (!groupId) return '';
    try {
        const doc = await db.collection('groups').doc(groupId).get();
        return doc.exists ? (doc.data()?.name || '') : '';
    } catch {
        return '';
    }
}

// Helper to check if guest access is enabled for Tenant/Group
async function isGuestAccessAllowed(tenantId: string, groupIds?: string[]): Promise<boolean> {
    try {
        // Check Tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) return false;
        const tenantData = tenantDoc.data();
        // Default to true if undefined
        if (tenantData?.is_guest_portal_enabled === false) return false;

        // If no groups, allowed by tenant
        if (!groupIds || groupIds.length === 0) return true;

        // Permissive Logic: If ANY group allows access, return true.
        for (const groupId of groupIds) {
            // Check Group
            const groupDoc = await db.collection('groups').doc(groupId).get();
            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                // Default to true if undefined
                if (groupData?.is_guest_portal_enabled === false) continue; // This group blocked, check next

                // Check Parent
                let parentBlocked = false;
                if (groupData?.parent_id) {
                    const parentDoc = await db.collection('groups').doc(groupData.parent_id).get();
                    if (parentDoc.exists) {
                            const parentData = parentDoc.data();
                            if (parentData?.is_guest_portal_enabled === false) parentBlocked = true;
                    }
                }
                
                if (!parentBlocked) {
                    return true; // Found an open path!
                }
            }
        }

        return false; // No open path found
    } catch (error) {
        console.error('Error checking guest access:', error);
        // Fail safe
        return true; 
    }
}

export const guestPortalOps = functions.https.onCall(async (data, context) => {
  const mode = data.mode as 'login' | 'select_profile' | 'manage_wishlist';
  // Get IP from context (best effort)
  const ip = context.rawRequest.ip || context.rawRequest.headers['x-forwarded-for'] || 'unknown';
  const ipStr = Array.isArray(ip) ? ip[0] : ip;

  console.log(`Guest Portal Ops called. Mode: ${mode}, IP: ${ipStr}`); // Added logging

  // 1. LOGIN (Find & Verify)
  if (mode === 'login') {
    // Check Rate Limit
    const limitCheck = await checkRateLimit(ipStr);
    if (!limitCheck.allowed) {
        throw new functions.https.HttpsError(
            'resource-exhausted', 
            `Too many attempts. Please wait ${limitCheck.waitSeconds} seconds.`
        );
    }

    const { firstName, lastName, verification } = data;
    if (!firstName || !lastName || !verification) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing fields');
    }

    const matchesRaw = await findAllMatchingGuests(firstName, lastName, verification);
    
    // Filter out matches where guest portal is disabled
    // Use Promise.all to check all concurrently
    const accessChecks = await Promise.all(matchesRaw.map(m => isGuestAccessAllowed(m.tenantId, m.groupIds)));
    const matches = matchesRaw.filter((_, index) => accessChecks[index]);
    
    if (matches.length === 0) {
        await recordFailedAttempt(ipStr);
        throw new functions.https.HttpsError('not-found', 'No matching record found or incorrect date.');
    }

    // Case A: Single Match
    if (matches.length === 1) {
        const { birthdayId, tenantId } = matches[0];
        const token = await createSession(birthdayId, tenantId);
        
        // Fetch wishlist items
        const wishlistSnapshot = await db.collection('wishlist_items')
            .where('birthday_id', '==', birthdayId)
            .get();

        const wishlist = wishlistSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        return { success: true, token, birthdayId, wishlist };
    }

    // Case B: Multiple Matches
    if (matches.length > 1) {
        // Fetch tenant owner names and group names
        const options = await Promise.all(matches.map(async (m) => {
            const ownerName = await getTenantDisplayName(m.tenantId);
            // For group names, we might have multiple.
            // If multiple, maybe show "Multiple Groups" or the first one?
            // Or join them: "Family, Friends"
            let groupDisplayName = '';
            if (m.groupIds && m.groupIds.length > 0) {
                const names = await Promise.all(m.groupIds.map(id => getGroupName(id)));
                groupDisplayName = names.filter(n => n).join(', ');
            }
            
            // Format: "רשימה אצל [שם הבעלים] ([שם הקבוצה])" or just "[שם הבעלים]"
            const fullDescription = groupDisplayName ? `${ownerName} • ${groupDisplayName}` : ownerName;
            
            return {
                birthdayId: m.birthdayId,
                tenantName: fullDescription, // Keep legacy field for backward compatibility
                tenantId: m.tenantId,
                tenantDisplayName: ownerName,
                groupDisplayName: groupDisplayName
            };
        }));

        return { 
            success: true, 
            multiple: true, 
            options 
        };
    }
  }

  // 2. SELECT PROFILE (For multiple matches)
  if (mode === 'select_profile') {
      const { firstName, lastName, verification, birthdayId } = data;
      
      // Re-verify to prevent ID enumeration (must match credentials)
      const matchesRaw = await findAllMatchingGuests(firstName, lastName, verification);
      
      // Filter allowed
      const accessChecks = await Promise.all(matchesRaw.map(m => isGuestAccessAllowed(m.tenantId, m.groupIds)));
      const matches = matchesRaw.filter((_, index) => accessChecks[index]);

      const selected = matches.find(m => m.birthdayId === birthdayId);

      if (!selected) {
          await recordFailedAttempt(ipStr);
          throw new functions.https.HttpsError('permission-denied', 'Invalid selection');
      }

      const token = await createSession(selected.birthdayId, selected.tenantId);
      
      const wishlistSnapshot = await db.collection('wishlist_items')
            .where('birthday_id', '==', selected.birthdayId)
            .get();

      const wishlist = wishlistSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
      }));

      return { success: true, token, birthdayId: selected.birthdayId, wishlist };
  }

  // 3. MANAGE WISHLIST (Uses Token)
  if (mode === 'manage_wishlist') {
    const { action, itemData, itemId, token } = data;
    
    if (!token) {
        throw new functions.https.HttpsError('unauthenticated', 'Missing session token');
    }

    // Verify Token
    const { isValid, birthdayId, tenantId } = await validateSession(token);
    if (!isValid || !birthdayId || !tenantId) {
        throw new functions.https.HttpsError('unauthenticated', 'Session expired or invalid');
    }

    // REAL-TIME ACCESS CHECK:
    // Even with a valid token, we must verify that the tenant/group still allows guest access.
    // This prevents access if an admin disables the portal while a guest is logged in.
    
    // 1. Fetch the birthday record to get the current group_id
    const birthdayDoc = await db.collection('birthdays').doc(birthdayId).get();
    if (!birthdayDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Birthday record not found');
    }
    const birthdayData = birthdayDoc.data();
    const groupIds = birthdayData?.group_ids || (birthdayData?.group_id ? [birthdayData.group_id] : []);

    // 2. Check permissions
    const isAllowed = await isGuestAccessAllowed(tenantId, groupIds);
    if (!isAllowed) {
         throw new functions.https.HttpsError('permission-denied', 'Guest portal access has been disabled by the administrator.');
    }

    if (action === 'add') {
        if (!itemData) throw new functions.https.HttpsError('invalid-argument', 'Missing item data');
        
        const newItem = {
            birthday_id: birthdayId,
            tenant_id: tenantId,
            item_name: itemData.item_name,
            description: itemData.description || '',
            priority: itemData.priority || 'medium',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const ref = await db.collection('wishlist_items').add(newItem);
        return { success: true, id: ref.id };
    }

    if (action === 'update') {
        if (!itemId || !itemData) throw new functions.https.HttpsError('invalid-argument', 'Missing data');
        
        const itemRef = db.collection('wishlist_items').doc(itemId);
        const itemDoc = await itemRef.get();
        
        // Verify ownership
        if (!itemDoc.exists || itemDoc.data()?.birthday_id !== birthdayId) {
            throw new functions.https.HttpsError('not-found', 'Item not found or permission denied');
        }

        await itemRef.update({
            item_name: itemData.item_name,
            description: itemData.description || '',
            priority: itemData.priority || 'medium',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true };
    }

    if (action === 'delete') {
        if (!itemId) throw new functions.https.HttpsError('invalid-argument', 'Missing item ID');

        const itemRef = db.collection('wishlist_items').doc(itemId);
        const itemDoc = await itemRef.get();
        
        if (!itemDoc.exists || itemDoc.data()?.birthday_id !== birthdayId) {
            throw new functions.https.HttpsError('not-found', 'Item not found or permission denied');
        }

        await itemRef.delete();
        return { success: true };
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid mode');
});
