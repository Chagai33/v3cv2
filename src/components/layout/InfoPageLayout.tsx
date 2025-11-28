import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from './Layout';
import { FloatingBackButton } from '../common/FloatingBackButton';

interface InfoPageLayoutProps {
  children: React.ReactNode;
}

export const InfoPageLayout: React.FC<InfoPageLayoutProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <Layout>
      {/* Mobile Button: Bottom Left (Hebrew) or Bottom Right (English) - hidden on desktop */}
      <FloatingBackButton 
        position={isHebrew ? 'bottom-left' : 'bottom-right'} 
      />

      {/* Desktop Button: Top Right (Hebrew) or Top Left (English) - visible only on desktop */}
      <FloatingBackButton 
        showOnDesktop 
        customPosition={`top-24 ${isHebrew ? 'right-8' : 'left-8'} hidden sm:block`}
      />

      {children}
    </Layout>
  );
};

