import React, { useState } from 'react';
import { Header } from './Header';
import { AboutModal } from '../modals/AboutModal';
import { LayoutProvider } from '../../contexts/LayoutContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <LayoutProvider value={{ openAboutModal: () => setShowAboutModal(true) }}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 mb-20 sm:mb-0">
          {children}
        </main>
        <AboutModal 
          isOpen={showAboutModal} 
          onClose={() => setShowAboutModal(false)} 
        />
      </div>
    </LayoutProvider>
  );
};
