import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { GroupFilterProvider } from './contexts/GroupFilterContext';
import { GoogleCalendarProvider } from './contexts/GoogleCalendarContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { Dashboard } from './components/Dashboard';
import { GroupsPanel } from './components/groups/GroupsPanel';
import { TermsOfUse } from './components/pages/TermsOfUse';
import { PrivacyPolicy } from './components/pages/PrivacyPolicy';
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

function App() {
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
      <ToastProvider>
        <AuthProvider>
          <TenantProvider>
            <GoogleCalendarProvider>
              <GroupFilterProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/terms" element={<TermsOfUse />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
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
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </GroupFilterProvider>
            </GoogleCalendarProvider>
          </TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
