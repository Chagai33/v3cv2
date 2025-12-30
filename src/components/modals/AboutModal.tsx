import React, { useState, useMemo } from 'react';
import { X, Globe, MessageSquare, Gift, Calculator, Bell, BookOpen, Users, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGuestNotifications } from '../../contexts/GuestNotificationsContext';
import { useBirthdays } from '../../hooks/useBirthdays';
import { FloatingBackButton } from '../common/FloatingBackButton';
import { TenantSettings } from '../settings/TenantSettings';
import { InfoModal } from './InfoModal';
import { GuestActivityModal } from './GuestActivityModal';
import { GoogleCalendarModal } from './GoogleCalendarModal';
import { GuestPortalManagement } from './GuestPortalManagement';
import { GroupsPanel } from '../groups/GroupsPanel';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isNew } = useGuestNotifications();
  const { data: birthdays = [] } = useBirthdays();
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showGuestActivity, setShowGuestActivity] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showGuestPortalManagement, setShowGuestPortalManagement] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);

  // Count guest-added birthdays for notification badge
  const guestBirthdaysCount = useMemo(() => {
    return birthdays.filter(b => b.created_by_guest === true && isNew(b.created_at)).length;
  }, [birthdays, isNew]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-in relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6 pt-2">
          <div className="text-center space-y-2">
            <div className="text-lg sm:text-xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
              <span className="text-[#8e24aa]">Heb</span>
              <span className="text-[#304FFE]">Birthday</span>
              <span className="text-gray-400 text-sm ml-[1px]">.app</span>
            </div>
            <p className="text-sm text-gray-500">
              {t('common.developedBy')} <a
                href="https://www.linkedin.com/in/chagai-yechiel/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                {i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
            {/* החלפת שפה - רק בדסקטופ */}
            <button
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
            >
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">
                {i18n.language === 'he' ? t('common.switchToEnglish') : t('common.switchToHebrew')}
              </span>
            </button>

            {/* ניהול קבוצות */}
            {user && (
              <button
                onClick={() => {
                  setShowGroupsPanel(true);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
              >
                <Users className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium">{t('groups.manageGroups')}</span>
              </button>
            )}

            {/* התראות אורחים */}
            {user && (
              <button
                onClick={() => {
                  setShowGuestActivity(true);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start relative"
              >
                <Bell className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium">{t('dashboard.guestNotifications')}</span>
                {guestBirthdaysCount > 0 && (
                  <span className="mr-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {guestBirthdaysCount}
                  </span>
                )}
              </button>
            )}

            {/* חיבור ליומן גוגל */}
            {user && (
              <button
                onClick={() => setShowCalendarModal(true)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
              >
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">{t('googleCalendar.connect')}</span>
              </button>
            )}

            {/* פורטל המתנות */}
            {user && (
              <button
                onClick={() => {
                  setShowGuestPortalManagement(true);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
              >
                <Gift className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">{t('guestPortal.manage')}</span>
              </button>
            )}

            {/* דמי חנוכה/פורים */}
            {user && (
              <Link
                to="/gelt"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Calculator className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">{t('gelt.title')}</span>
              </Link>
            )}

            {/* Divider לפני המדריכים */}
            <div className="h-px bg-gray-100 my-2" />

            {/* מדריך מקוצר */}
            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
            >
              <BookOpen className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium">{t('common.quickGuide')}</span>
            </button>

            {/* המדריך המלא */}
            <Link
              to="/guide"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">{t('common.fullGuide')}</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-center gap-3 text-xs text-gray-500 mb-3">
              <Link
                to="/terms"
                onClick={onClose}
                className="hover:text-gray-700 transition-colors"
              >
                {t('footer.termsOfUse')}
              </Link>
              <span>•</span>
              <Link
                to="/privacy"
                onClick={onClose}
                className="hover:text-gray-700 transition-colors"
              >
                {t('footer.privacyPolicy')}
              </Link>
              <span>•</span>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf4M-3ytbYRAOIh9B7Bavgaw2WyGgDFP3PT7zgTmTMnUFXMrg/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 transition-colors"
              >
                {t('footer.feedback')}
              </a>
            </div>
            <div className="text-center text-xs text-gray-400">
              © {new Date().getFullYear()} All rights reserved
            </div>
          </div>
        </div>
      </div>
      <FloatingBackButton onClick={onClose} position="bottom-left" />
      {showSettings && (
        <div onClick={(e) => e.stopPropagation()}>
          <TenantSettings onClose={() => {
            setShowSettings(false);
            onClose(); // Close the parent modal as well to return to main screen
          }} />
        </div>
      )}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
      <GuestActivityModal 
        isOpen={showGuestActivity} 
        onClose={() => setShowGuestActivity(false)}
        birthdays={birthdays}
      />
      <GoogleCalendarModal 
        isOpen={showCalendarModal} 
        onClose={() => setShowCalendarModal(false)}
      />
      {showGuestPortalManagement && (
        <div onClick={(e) => e.stopPropagation()}>
          <GuestPortalManagement
            isOpen={showGuestPortalManagement}
            onClose={() => {
              setShowGuestPortalManagement(false);
              onClose();
            }}
          />
        </div>
      )}
      {showGroupsPanel && (
        <div onClick={(e) => e.stopPropagation()}>
          <GroupsPanel
            isModal={true}
            onClose={() => {
              setShowGroupsPanel(false);
              onClose();
            }}
          />
        </div>
      )}
    </div>
  );
};
