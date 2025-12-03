import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { WishlistItem } from '../types';

export interface GuestVerificationData {
  type: 'gregorian' | 'hebrew';
  dateString?: string; // YYYY-MM-DD
  hebrewDay?: number;
  hebrewMonth?: string;
  hebrewYear?: number;
}

export interface GuestSession {
  birthdayId: string;
  firstName: string;
  lastName: string;
  verification: GuestVerificationData;
  expiresAt: number;
  token: string; // Added token
}

export interface GuestLoginResponse {
    success: boolean;
    token?: string;
    birthdayId?: string;
    wishlist?: WishlistItem[];
    multiple?: boolean;
    options?: Array<{ 
        birthdayId: string; 
        tenantName: string;
        // New fields for grouping
        tenantId?: string;
        tenantDisplayName?: string;
        groupDisplayName?: string;
    }>;
}

const SESSION_KEY = 'guest_portal_session';

export const guestService = {
  async login(firstName: string, lastName: string, verification: GuestVerificationData): Promise<GuestLoginResponse> {
    const fn = httpsCallable(functions, 'guestPortalOps');
    const result = await fn({ 
      mode: 'login', 
      firstName,
      lastName,
      verification 
    });
    
    const data = result.data as GuestLoginResponse;
    
    // Only auto-save session if we got a token (single match)
    if (data.success && data.token && data.birthdayId) {
      this.saveSession(data.birthdayId, firstName, lastName, verification, data.token);
    }
    
    return data;
  },

  async selectProfile(firstName: string, lastName: string, verification: GuestVerificationData, birthdayId: string): Promise<GuestLoginResponse> {
    const fn = httpsCallable(functions, 'guestPortalOps');
    const result = await fn({
        mode: 'select_profile',
        firstName,
        lastName,
        verification,
        birthdayId
    });

    const data = result.data as GuestLoginResponse;
    
    if (data.success && data.token && data.birthdayId) {
        this.saveSession(data.birthdayId, firstName, lastName, verification, data.token);
    }
    
    return data;
  },

  async addItem(item: { item_name: string; description?: string; priority: 'high' | 'medium' | 'low' }): Promise<string> {
    const session = this.getSession();
    if (!session) throw new Error('No active session');

    const fn = httpsCallable(functions, 'guestPortalOps');
    const result = await fn({
      mode: 'manage_wishlist',
      action: 'add',
      token: session.token,
      itemData: item
    });
    
    return (result.data as any).id;
  },

  async updateItem(itemId: string, item: { item_name: string; description?: string; priority: 'high' | 'medium' | 'low' }): Promise<void> {
    const session = this.getSession();
    if (!session) throw new Error('No active session');

    const fn = httpsCallable(functions, 'guestPortalOps');
    await fn({
      mode: 'manage_wishlist',
      action: 'update',
      token: session.token,
      itemId,
      itemData: item
    });
  },

  async deleteItem(itemId: string): Promise<void> {
    const session = this.getSession();
    if (!session) throw new Error('No active session');

    const fn = httpsCallable(functions, 'guestPortalOps');
    await fn({
      mode: 'manage_wishlist',
      action: 'delete',
      token: session.token,
      itemId
    });
  },

  // Session Management
  saveSession(birthdayId: string, firstName: string, lastName: string, verification: GuestVerificationData, token: string) {
    const session: GuestSession = {
      birthdayId,
      firstName,
      lastName,
      verification,
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      token
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getSession(): GuestSession | null {
    const json = sessionStorage.getItem(SESSION_KEY);
    if (!json) return null;
    
    try {
      const session = JSON.parse(json) as GuestSession;
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }
};
