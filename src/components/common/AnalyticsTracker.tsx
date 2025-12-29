import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../../services/analytics.service';

/**
 * AnalyticsTracker Component
 * Initializes analytics on mount and tracks page views on location changes.
 * Must be placed inside BrowserRouter.
 */
export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  // Initialize analytics on mount (only once)
  useEffect(() => {
    analyticsService.init();
  }, []);

  // Track page view on location change
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    analyticsService.trackPageView(fullPath);
  }, [location]);

  // This component doesn't render anything
  return null;
};
