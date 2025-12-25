import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { GroupFilterProvider } from './contexts/GroupFilterContext';
import { GoogleCalendarProvider } from './contexts/GoogleCalendarContext';
import { ToastProvider } from './contexts/ToastContext';
import { TooltipProvider } from './components/common/Tooltip';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ResetPassword } from './components/auth/ResetPassword';
import { Dashboard } from './components/Dashboard';
import { GroupsPanel } from './components/groups/GroupsPanel';
import { GeltPage } from './components/gelt/GeltPage';
import { TermsOfUse } from './components/pages/TermsOfUse';
import { PrivacyPolicy } from './components/pages/PrivacyPolicy';
import { UserGuide } from './components/pages/UserGuide';
import { GuestPortal } from './components/guest/GuestPortal';
import { GuestAccessPage } from './components/guest/GuestAccessPage';
import './config/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const ActionUrlHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'resetPassword' && oobCode) {
      navigate(`/reset-password?oobCode=${oobCode}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
};

function App() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('app.title', 'HebBirthday | Hebrew & Gregorian Calendar');
  }, [i18n.language, t]);

  // טיפול ב-Google OAuth callback אם יש טוקן ב-URL hash
  useEffect(() => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      // Google Identity Services מטפל אוטומטית ב-hash אם יש callback
      // אבל נוודא שהדף נטען כראוי
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Google GSI אמור לטפל בזה אוטומטית, אבל נוודא שהדף לא תקוע
        setTimeout(() => {
          // אם יש טוקן ב-hash, Google אמור לקרוא ל-callback
          // אם לא, ננקה את ה-hash
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }, 1000);
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
            <GoogleCalendarProvider>
              <GroupFilterProvider>
                <BrowserRouter>
                  <ActionUrlHandler />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/terms" element={<TermsOfUse />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/guide" element={<UserGuide />} />
                    <Route path="/portal" element={<GuestPortal />} />
                    <Route path="/guest/:groupId/:token" element={<GuestAccessPage />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/groups"
                      element={
                        <ProtectedRoute>
                          <GroupsPanel />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/gelt"
                      element={
                        <ProtectedRoute>
                          <GeltPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </GroupFilterProvider>
            </GoogleCalendarProvider>
          </TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
}

export default App;
