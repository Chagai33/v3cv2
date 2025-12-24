import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DeveloperCredit } from './DeveloperCredit';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link
              to="/terms"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              {t('footer.termsOfUse', 'תנאי שימוש')}
            </Link>
            <Link
              to="/privacy"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              {t('footer.privacyPolicy', 'מדיניות פרטיות')}
            </Link>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSf4M-3ytbYRAOIh9B7Bavgaw2WyGgDFP3PT7zgTmTMnUFXMrg/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              {t('footer.feedback', 'משוב')}
            </a>
          </div>

          {/* Developer Credit */}
          <DeveloperCredit />

          {/* Copyright */}
          <div className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} HebBirthday
          </div>
        </div>
      </div>
    </footer>
  );
};

