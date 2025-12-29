import React, { createContext, useContext, useState, useEffect } from 'react';
import { tenantService } from '../services/tenant.service';
import { useTenant } from './TenantContext';

interface GuestNotificationsContextType {
  lastAcknowledged: number;
  markAsRead: () => Promise<void>;
  isNew: (dateString: string) => boolean;
}

const GuestNotificationsContext = createContext<GuestNotificationsContextType | undefined>(undefined);

export const GuestNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant } = useTenant();
  const [lastAcknowledged, setLastAcknowledged] = useState<number>(() => {
    // Fallback to localStorage for initial load
    const saved = localStorage.getItem('hebbirthday_guest_last_acknowledged');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Load from tenant when it becomes available
  useEffect(() => {
    if (currentTenant?.guest_last_acknowledged && currentTenant.guest_last_acknowledged > 0) {
      const tenantValue = currentTenant.guest_last_acknowledged;
      // Use the larger value between localStorage and Firestore
      if (tenantValue > lastAcknowledged) {
        setLastAcknowledged(tenantValue);
        localStorage.setItem('hebbirthday_guest_last_acknowledged', tenantValue.toString());
      }
    }
  }, [currentTenant?.id, currentTenant?.guest_last_acknowledged]);

  const markAsRead = async () => {
    if (!currentTenant?.id) return;
    
    const now = Date.now();
    setLastAcknowledged(now);
    
    // Save to localStorage as cache
    localStorage.setItem('hebbirthday_guest_last_acknowledged', now.toString());
    
    // Save to Firestore for cross-device sync
    try {
      await tenantService.updateTenant(currentTenant.id, {
        guest_last_acknowledged: now,
      });
    } catch (error) {
      console.error('Failed to save guest_last_acknowledged to Firestore:', error);
    }
  };

  const isNew = (dateString: string) => {
    return new Date(dateString).getTime() > lastAcknowledged;
  };

  return (
    <GuestNotificationsContext.Provider value={{ lastAcknowledged, markAsRead, isNew }}>
      {children}
    </GuestNotificationsContext.Provider>
  );
};

export const useGuestNotifications = () => {
  const context = useContext(GuestNotificationsContext);
  if (context === undefined) {
    throw new Error('useGuestNotifications must be used within a GuestNotificationsProvider');
  }
  return context;
};

