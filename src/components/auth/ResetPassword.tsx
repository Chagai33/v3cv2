import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth.service';
import { Lock, Globe } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      navigate('/login');
    }
  }, [oobCode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError(t('validation.passwordsDontMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('validation.passwordTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (oobCode) {
        await authService.confirmPasswordReset(oobCode, password);
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      if (err.message === 'expired-action-code') {
        setError(t('auth.expiredActionCode'));
      } else if (err.message === 'invalid-action-code') {
        setError(t('auth.invalidActionCode'));
      } else if (err.message === 'user-disabled') {
        setError(t('auth.userDisabled'));
      } else if (err.message === 'user-not-found') {
        setError(t('auth.userNotFound'));
      } else if (err.message === 'weak-password') {
        setError(t('validation.passwordTooShort'));
      } else {
        setError(t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  if (!oobCode) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 relative">
        <div className="flex justify-end items-center mb-4">
            <button
            onClick={toggleLanguage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={i18n.language === 'he' ? t('common.switchToEnglish') : t('common.switchToHebrew')}
            >
            <Globe className="w-5 h-5" />
            </button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('auth.resetPassword')}
          </h1>
        </div>

        {success ? (
          <div className="text-center py-4">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('auth.passwordResetSuccess')}
            </h3>
            <p className="text-gray-600">
              {t('auth.redirectingToLogin')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.newPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.loading') : t('auth.resetPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

