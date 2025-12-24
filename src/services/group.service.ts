import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group, GroupType } from '../types';
import { retryFirestoreOperation } from './firestore.retry';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const ROOT_GROUPS = [
  { type: 'family' as GroupType, nameHe: 'משפחה', nameEn: 'Family', color: '#3b82f6' },
  { type: 'friends' as GroupType, nameHe: 'חברים', nameEn: 'Friends', color: '#10b981' },
  { type: 'work' as GroupType, nameHe: 'עבודה', nameEn: 'Work', color: '#f59e0b' }
];

export const groupService = {
  isInitializing: false,

  async initializeRootGroups(tenantId: string, userId: string, language: 'he' | 'en' = 'he'): Promise<void> {
    if (this.isInitializing) {
      logger.log('Already initializing root groups, skipping...');
      return;
    }

    return retryFirestoreOperation(async () => {
      const existingRoots = await this.getRootGroups(tenantId);

      if (existingRoots.length >= 3) {
        logger.log('Root groups already exist, skipping initialization');
        return;
      }

      if (this.isInitializing) {
        logger.log('Another initialization is in progress, skipping...');
        return;
      }

      this.isInitializing = true;

      try {
        const existingTypes = new Set(existingRoots.map(g => g.type));
        const groupsToCreate = ROOT_GROUPS.filter(root => !existingTypes.has(root.type));

        if (groupsToCreate.length === 0) {
          logger.log('All root groups already exist');
          return;
        }

        const promises = groupsToCreate.map(root =>
          addDoc(collection(db, 'groups'), {
            tenant_id: tenantId,
            name: language === 'he' ? root.nameHe : root.nameEn,
            parent_id: null,
            is_root: true,
            type: root.type,
            color: root.color,
            created_by: userId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          })
        );

        await Promise.all(promises);
        logger.log('Root groups initialized successfully');
      } finally {
        this.isInitializing = false;
      }
    });
  },

  async createGroup(
    tenantId: string,
    groupInput: {
      name: string;
      parentId?: string | null;
      color?: string;
      calendarPreference?: 'gregorian' | 'hebrew' | 'both';
      is_guest_portal_enabled?: boolean;
    },
    userId: string
  ): Promise<string> {
    const isRoot = !groupInput.parentId;

    const groupData: any = {
      tenant_id: tenantId,
      name: groupInput.name,
      parent_id: groupInput.parentId || null,
      is_root: isRoot,
      color: groupInput.color || (isRoot ? '#6366f1' : '#8b5cf6'),
      is_guest_portal_enabled: groupInput.is_guest_portal_enabled ?? true,
      created_by: userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    if (groupInput.calendarPreference) {
      groupData.calendar_preference = groupInput.calendarPreference;
    }

    const groupRef = await addDoc(collection(db, 'groups'), groupData);

    return groupRef.id;
  },

  async updateGroup(
    groupId: string,
    data: { name?: string; color?: string; calendarPreference?: 'gregorian' | 'hebrew' | 'both'; is_guest_portal_enabled?: boolean }
  ): Promise<void> {
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.calendarPreference !== undefined) updateData.calendar_preference = data.calendarPreference;
    if (data.is_guest_portal_enabled !== undefined) updateData.is_guest_portal_enabled = data.is_guest_portal_enabled;

    await updateDoc(doc(db, 'groups', groupId), updateData);
  },

  async deleteGroup(groupId: string, tenantId: string, deleteBirthdays: boolean = false): Promise<void> {
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (deleteBirthdays) {
      // Find birthdays that have this group in their group_ids array
      const birthdaysQuery = query(
        collection(db, 'birthdays'),
        where('group_ids', 'array-contains', groupId),
        where('tenant_id', '==', tenantId)
      );
      const birthdaysSnapshot = await getDocs(birthdaysQuery);
      const deletePromises = birthdaysSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } else {
      // Find birthdays that have this group in their group_ids array
      const birthdaysQuery = query(
        collection(db, 'birthdays'),
        where('group_ids', 'array-contains', groupId),
        where('tenant_id', '==', tenantId)
      );
      const birthdaysSnapshot = await getDocs(birthdaysQuery);
      
      // Remove groupId from group_ids array for each birthday
      const updatePromises = birthdaysSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const currentGroupIds = data.group_ids || (data.group_id ? [data.group_id] : []);
        const updatedGroupIds = currentGroupIds.filter((id: string) => id !== groupId);
        
        const updateData: any = {
          group_ids: updatedGroupIds,
          updated_at: serverTimestamp(),
        };
        
        // Update backward compatibility field
        if (updatedGroupIds.length > 0) {
          updateData.group_id = updatedGroupIds[0];
        } else {
          updateData.group_id = null;
        }
        
        return updateDoc(docSnap.ref, updateData);
      });
      
      await Promise.all(updatePromises);
    }

    await deleteDoc(doc(db, 'groups', groupId));
  },

  async getGroupBirthdaysCount(groupId: string, tenantId: string): Promise<number> {
    const q = query(
      collection(db, 'birthdays'),
      where('group_ids', 'array-contains', groupId),
      where('tenant_id', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) return null;

    return this.docToGroup(groupDoc.id, groupDoc.data());
  },

  async getTenantGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getRootGroups(tenantId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('tenant_id', '==', tenantId),
      where('is_root', '==', true)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getChildGroups(parentId: string): Promise<Group[]> {
    const q = query(
      collection(db, 'groups'),
      where('parent_id', '==', parentId)
    );

    const snapshot = await getDocs(q);
    const groups = snapshot.docs.map((doc) => this.docToGroup(doc.id, doc.data()));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getGroupsByType(tenantId: string, type: GroupType): Promise<Group[]> {
    const rootGroups = await this.getRootGroups(tenantId);
    const rootGroup = rootGroups.find(g => g.type === type);
    if (!rootGroup) return [];
    return await this.getChildGroups(rootGroup.id);
  },

  docToGroup(id: string, data: any): Group {
    return {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
      parent_id: data.parent_id || null,
      is_root: data.is_root || false,
      type: data.type,
      color: data.color,
      is_guest_portal_enabled: data.is_guest_portal_enabled ?? true,
      guest_access_token: data.guest_access_token || null,
      guest_token_expires_at: data.guest_token_expires_at || null,
      guest_contribution_limit: data.guest_contribution_limit || 50,
      is_guest_access_enabled: data.is_guest_access_enabled ?? false,
      calendar_preference: data.calendar_preference,
      created_by: data.created_by,
      created_at: this.timestampToString(data.created_at),
      updated_at: this.timestampToString(data.updated_at),
    };
  },

  /**
   * Generate or regenerate a unique guest access token for a group with 72-hour expiration
   * @param groupId - The ID of the group
   * @returns The new guest access token
   */
  async generateGuestAccessToken(groupId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours from now
    
    await updateDoc(doc(db, 'groups', groupId), {
      guest_access_token: token,
      guest_token_expires_at: expiresAt.toISOString(),
      guest_contribution_limit: 50, // Default limit of 50 birthdays per token
      is_guest_access_enabled: true,
      updated_at: serverTimestamp(),
    });
    logger.log(`Generated guest access token for group ${groupId} (expires: ${expiresAt.toISOString()})`);
    return token;
  },

  /**
   * Reset (clear) the guest access token for a group
   * @param groupId - The ID of the group
   */
  async resetGuestAccessToken(groupId: string): Promise<void> {
    await updateDoc(doc(db, 'groups', groupId), {
      guest_access_token: null,
      guest_token_expires_at: null,
      guest_contribution_limit: null,
      is_guest_access_enabled: false,
      updated_at: serverTimestamp(),
    });
    logger.log(`Reset guest access token for group ${groupId}`);
  },

  /**
   * Enable or disable guest access for a group
   * @param groupId - The ID of the group
   * @param enabled - Whether to enable or disable guest access
   */
  async toggleGuestAccess(groupId: string, enabled: boolean): Promise<void> {
    const updateData: any = {
      is_guest_access_enabled: enabled,
      updated_at: serverTimestamp(),
    };

    // If disabling, also clear the token for security
    if (!enabled) {
      updateData.guest_access_token = null;
    }

    await updateDoc(doc(db, 'groups', groupId), updateData);
    logger.log(`${enabled ? 'Enabled' : 'Disabled'} guest access for group ${groupId}`);
  },

  /**
   * Verify a guest access token and return the group if valid
   * @param token - The guest access token
   * @returns The group if the token is valid, null otherwise
   */
  async verifyGuestToken(token: string): Promise<Group | null> {
    try {
      const q = query(
        collection(db, 'groups'),
        where('guest_access_token', '==', token),
        where('is_guest_access_enabled', '==', true)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        logger.warn(`Invalid or disabled guest token: ${token}`);
        return null;
      }

      const groupDoc = snapshot.docs[0];
      return this.docToGroup(groupDoc.id, groupDoc.data());
    } catch (error) {
      logger.error('Error verifying guest token:', error);
      return null;
    }
  },

  timestampToString(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  },
};
