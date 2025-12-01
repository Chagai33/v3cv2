import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';

export const GuestLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const currentLangLabel = i18n.language === 'en' ? 'עברית' : 'English';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple Header */}
      <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-start transition-opacity hover:opacity-80 -ms-1 pe-6"
            >
              <div className="text-xl sm:text-2xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
                <span className="text-[#8e24aa]">Heb</span>
                <span className="text-[#304FFE]">Birthday</span>
                <span className="text-gray-400 text-sm sm:text-base ml-[1px]">.app</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 font-medium -mt-0.5">
                {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
              </span>
            </button>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleLanguage}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={currentLangLabel}
                >
                    <Globe className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-md mx-auto w-full">
          {children}
        </div>
      </main>
      
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-100 bg-white mt-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/terms')} className="hover:text-gray-800 transition-colors">
              {t('footer.termsOfUse')}
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-800 transition-colors">
              {t('footer.privacyPolicy')}
            </button>
          </div>
          <div className="mt-2">
            &copy; {new Date().getFullYear()} HebBirthday
          </div>
          <div className="text-xs text-gray-400">
            <a
              href="https://www.linkedin.com/in/chagai-yechiel/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 transition-colors"
            >
              {t('common.developedBy')} {i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
