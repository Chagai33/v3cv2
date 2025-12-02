import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, User, UserPlus, Globe, Gift } from 'lucide-react';

export const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { signUp, signInWithGoogle, loading: authLoading, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false); // Added email form toggle
  const termsRef = useRef<HTMLDivElement>(null);
  
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.password) {
      setPassword(state.password);
      setConfirmPassword(state.password);
    }
  }, [location.state]);

  const getErrorMessage = (code: string) => {
    const errorKey = `auth.errors.${code}`;
    const message = t(errorKey);
    return message === errorKey ? t('auth.errors.default') : message;
  };

  const handleTermsError = () => {
    setShowTermsError(true);
    setError('');
    termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      handleTermsError();
      return;
    }

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
      await signUp(email, password, displayName);
      // Don't navigate here - let AuthContext's onAuthStateChanged handle it
    } catch (err: any) {
      setError(getErrorMessage(err.message));
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');

    if (!acceptedTerms) {
      handleTermsError();
      return;
    }

    setIsSubmitting(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (!isNewUser) {
        showToast(t('auth.accountExistsLoggingIn', 'Account exists, logging in...'), 'info');
      }
      // Redirect handled by useEffect
    } catch (err: any) {
      setError(getErrorMessage(err.message));
      setIsSubmitting(false);
    }
  };

  const loading = isSubmitting || authLoading;

  const toggleLanguage = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 relative">
        <div className="flex justify-end items-center gap-1 mb-4">
            <button
            onClick={() => navigate('/portal')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('guest.portalTitle')}
            >
            <Gift className="w-5 h-5" />
            </button>
            <button
            onClick={toggleLanguage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={i18n.language === 'he' ? t('common.switchToEnglish') : t('common.switchToHebrew')}
            >
            <Globe className="w-5 h-5" />
            </button>
        </div>
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none relative inline-flex items-baseline" dir="ltr">
              <span className="text-[#8e24aa]">Heb</span>
              <span className="text-[#304FFE]">Birthday</span>
              <span className="text-gray-400 text-xl ml-[1px] absolute left-full bottom-1">.app</span>
            </div>
            <span className="text-sm text-gray-500 font-medium mt-1">
              {t('app.taglinePart1')} <span className="text-[#8e24aa]">{t('app.taglineHebrew')}</span> {t('app.taglineOr')} <span className="text-[#304FFE]">{t('app.taglineGregorian')}</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('auth.signUp')}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('auth.signUpWithGoogle')}
        </button>

        <div ref={termsRef} className="flex flex-col gap-1 mb-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (e.target.checked) setShowTermsError(false);
                }}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                // required - Removed native required to allow custom error handling
                aria-invalid={showTermsError}
                aria-describedby="terms-error"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                {t('auth.acceptTerms', 'I confirm that I have read and agree to the')}{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline" onClick={(e) => e.stopPropagation()}>
                  {t('footer.termsOfUse', 'Terms of Use')}
                </a>
                {' '}{t('auth.and', 'and')}{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline" onClick={(e) => e.stopPropagation()}>
                  {t('footer.privacyPolicy', 'Privacy Policy')}
                </a>
                .
              </label>
            </div>
            {showTermsError && (
              <p id="terms-error" className="text-sm text-red-600 ms-6">
                {t('auth.mustAcceptTerms', 'You must accept the Terms of Use and Privacy Policy')}
              </p>
            )}
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              {t('auth.or')}
            </span>
          </div>
        </div>

        {!showEmailForm ? (
            <button
                type="button"
                onClick={() => {
                    if (!acceptedTerms) {
                        handleTermsError();
                        return;
                    }
                    setShowEmailForm(true);
                }}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                <Mail className="w-5 h-5" />
                {t('auth.signUpWithEmail')}
            </button>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.displayName')}
                </label>
                <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="name"
                    required
                />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
                </label>
                <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="email"
                    required
                />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
                </label>
                <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="new-password"
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
                    autoComplete="new-password"
                    required
                    minLength={6}
                />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <UserPlus className="w-5 h-5" />
                {loading ? t('common.loading') : t('auth.signUp')}
            </button>
            </form>
        )}


        <p className="mt-6 text-center text-sm text-gray-600">
          {t('auth.alreadyHaveAccount')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('auth.signIn')}
          </button>
        </p>

        <p className="mt-4 text-center text-xs text-gray-500">
          <a
            href="https://www.linkedin.com/in/chagai-yechiel/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 transition-colors"
          >
            {t('common.developedBy')} {i18n.language === 'he' ? 'חגי יחיאל' : 'Chagai Yechiel'}
          </a>
        </p>
      </div>
    </div>
  );
};
