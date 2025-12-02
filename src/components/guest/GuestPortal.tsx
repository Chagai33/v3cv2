import React, { useState, useEffect } from 'react';
import { GuestLayout } from './GuestLayout';
import { GuestLogin } from './GuestLogin';
import { GuestWishlistManager } from './GuestWishlistManager';
import { guestService, GuestVerificationData } from '../../services/guest.service';
import { WishlistItem } from '../../types';

export const GuestPortal: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'manager'>('login');
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSearchParams, setLastSearchParams] = useState<{
    firstName: string;
    lastName: string;
    verification: GuestVerificationData;
  } | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const session = guestService.getSession();
    if (session) {
      setLastSearchParams({
          firstName: session.firstName,
          lastName: session.lastName,
          verification: session.verification
      });

      try {
        // Validate session by attempting login with stored credentials
        let response = await guestService.login(session.firstName, session.lastName, session.verification);
        
        // If server found multiple matches, but we already have a specific birthdayId in session,
        // we should auto-select that profile to restore the state correctly.
        if (response.success && response.multiple && session.birthdayId) {
            response = await guestService.selectProfile(
                session.firstName, 
                session.lastName, 
                session.verification, 
                session.birthdayId
            );
        }

        if (response.success && response.wishlist) {
          setWishlist(response.wishlist);
          setCurrentView('manager');
        } else {
          guestService.clearSession();
        }
      } catch {
        guestService.clearSession();
      }
    }
    setLoading(false);
  };

  const handleLoginSuccess = (birthdayId: string, verification: GuestVerificationData, wishlistData: WishlistItem[], firstName?: string, lastName?: string) => {
    setWishlist(wishlistData);
    if (firstName && lastName) {
        setLastSearchParams({ firstName, lastName, verification });
    }
    setCurrentView('manager');
  };

  const handleLogout = () => {
    guestService.clearSession();
    setWishlist([]);
    setLastSearchParams(null);
    setCurrentView('login');
  };

  const handleBackToSearch = () => {
    guestService.clearSession();
    setWishlist([]);
    // Do not clear lastSearchParams
    setCurrentView('login');
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {currentView === 'login' ? (
        <GuestLogin 
            onLoginSuccess={handleLoginSuccess} 
            initialValues={lastSearchParams}
        />
      ) : (
        <GuestWishlistManager 
            initialWishlist={wishlist} 
            onLogout={handleLogout} 
            onBackToSearch={handleBackToSearch}
            guestName={lastSearchParams ? `${lastSearchParams.firstName} ${lastSearchParams.lastName}` : undefined}
        />
      )}
    </GuestLayout>
  );
};

