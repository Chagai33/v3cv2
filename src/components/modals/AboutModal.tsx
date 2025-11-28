import React, { useState } from 'react';
import { X, Globe, Trash2, MessageSquare, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FloatingBackButton } from '../common/FloatingBackButton';
import { TenantSettings } from '../settings/TenantSettings';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6 pt-2">
          <div className="text-center space-y-2">
            <div className="text-lg sm:text-xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
              <span className="text-blue-600">Heb</span>
              <span className="text-purple-600">Birthday</span>
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
             <button
              onClick={toggleLanguage}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
            >
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{t('common.switchLanguage')}</span>
            </button>

            {user && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-start"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">{t('tenant.settings')}</span>
              </button>
            )}

            <Link
              to="/terms"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Globe className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">{t('footer.termsOfUse', 'Terms of Use')}</span>
            </Link>
            
            <Link
              to="/privacy"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Globe className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">{t('footer.privacyPolicy', 'Privacy Policy')}</span>
            </Link>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSf4M-3ytbYRAOIh9B7Bavgaw2WyGgDFP3PT7zgTmTMnUFXMrg/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">{t('footer.feedback', 'Feedback')}</span>
            </a>

            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-start mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">{t('auth.signOut')}</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} All rights reserved
          </div>
        </div>
      </div>
      <FloatingBackButton onClick={onClose} position="bottom-left" />
      {showSettings && <TenantSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
};
