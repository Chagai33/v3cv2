import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gray-50">
        <div className="flex flex-col items-center animate-pulse">
          <div className="text-5xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
            <span className="text-[#8e24aa]">Heb</span>
            <span className="text-[#304FFE]">Birthday</span>
            <span className="text-gray-400 text-xl ml-[2px]">.app</span>
          </div>
          <span className="text-base text-gray-500 font-medium mt-3">
            {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
          </span>
        </div>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600/50"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
