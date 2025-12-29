import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';

const COOKIE_CONSENT_KEY = 'cookie_consent';

/**
 * High-Conversion Cookie Consent Banner
 * 
 * Strategy:
 * - "Agree" button: Saves consent to localStorage, initializes analytics, hides banner permanently
 * - "X" button: Only hides banner for current session (no localStorage save)
 *   -> Banner will appear again on next visit until user explicitly agrees
 * 
 * This maximizes acceptance rates while remaining compliant.
 */
export const CookieConsentBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only hide banner if user has explicitly agreed (localStorage === 'true')
    // If null or 'false', show the banner
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (consent !== 'true') {
        setIsVisible(true);
      }
    } catch {
      // If localStorage is not available, show the banner anyway
      setIsVisible(true);
    }
  }, []);

  const handleAgree = () => {
    // Save consent and initialize analytics
    analyticsService.enableTracking();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Just hide for this session - don't save to localStorage
    // Banner will appear again on next visit
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Text Content */}
            <p className="text-gray-700 text-sm text-center sm:text-start leading-relaxed">
              {t('cookies.message', 'אנחנו משתמשים בעוגיות לשיפור החוויה. השימוש באתר מהווה הסכמה לכך.')}{' '}
              <Link 
                to="/privacy" 
                className="text-blue-600 hover:text-blue-700 underline whitespace-nowrap"
              >
                {t('cookies.privacyLink', 'מדיניות פרטיות')}
              </Link>
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleAgree}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {t('cookies.accept', 'אישור והמשך')}
              </button>
              
              {/* Close button (X) */}
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                aria-label={t('common.close', 'סגור')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
