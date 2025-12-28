import React from 'react';
import { useTranslation } from 'react-i18next';

interface DeveloperCreditProps {
  className?: string;
}

export const DeveloperCredit: React.FC<DeveloperCreditProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`text-xs text-gray-500 text-center ${className}`}>
      {t('footer.developedBy', 'פותח על ידי')}{' '}
      <a
        href="https://www.linkedin.com/in/chagai-yechiel/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        {t('footer.developerName', 'חגי יחיאל')}
      </a>
    </div>
  );
};




