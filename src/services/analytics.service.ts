/**
 * Analytics Service
 * Handles Google Analytics 4 tracking with GDPR-compliant consent management
 * Structured to easily add Facebook Pixel or other providers later
 */

import ReactGA from 'react-ga4';

// ============================================
// Configuration
// ============================================
const GA_MEASUREMENT_ID = 'G-T1NWK5ZTV1';
const COOKIE_CONSENT_KEY = 'cookie_consent';

// ============================================
// Types
// ============================================
export interface TrackEventOptions {
  /** Numeric value associated with the event */
  value?: number;
  /** If true, uses beacon transport for reliable delivery even on page close */
  critical?: boolean;
  /** If true, marks event as non-interaction (won't affect bounce rate) */
  nonInteraction?: boolean;
}

interface AnalyticsService {
  init: () => void;
  trackPageView: (path: string) => void;
  trackEvent: (category: string, action: string, label?: string, options?: TrackEventOptions) => void;
  enableTracking: () => void;
  hasConsent: () => boolean;
  isReady: () => boolean;
}

// ============================================
// Google Analytics 4
// ============================================
class GoogleAnalytics {
  private isInitialized = false;
  private isDev = import.meta.env.DEV;

  /**
   * Check if user has given consent for tracking
   */
  private hasConsent(): boolean {
    try {
      return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Initialize GA4 only if user has given consent
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    // Only initialize if user has consented
    if (!this.hasConsent()) {
      if (this.isDev) {
        console.log('[GA4] No consent - Analytics not initialized');
      }
      return;
    }

    if (this.isDev) {
      console.log('[GA4] Development mode - Analytics initialized (tracking enabled but logging)');
    }

    try {
      ReactGA.initialize(GA_MEASUREMENT_ID);
      this.isInitialized = true;
      console.log('[GA4] Google Analytics 4 initialized with ID:', GA_MEASUREMENT_ID);
    } catch (error) {
      console.warn('[GA4] Failed to initialize Google Analytics 4:', error);
    }
  }

  /**
   * Check if GA4 is initialized and ready to track
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  trackPageView(path: string): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.isDev) {
      console.log('[GA4] Page View:', path);
    }

    try {
      ReactGA.send({ hitType: 'pageview', page: path });
    } catch (error) {
      console.warn('[GA4] Failed to track page view:', error);
    }
  }

  trackEvent(category: string, action: string, label?: string, options?: TrackEventOptions): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.isDev) {
      console.log('[GA4] Event:', { category, action, label, options });
    }

    try {
      // Build GA4 event parameters
      const eventParams: Record<string, unknown> = {
        category,
        action,
      };

      if (label) {
        eventParams.label = label;
      }

      if (options?.value !== undefined) {
        eventParams.value = options.value;
      }

      if (options?.nonInteraction !== undefined) {
        eventParams.nonInteraction = options.nonInteraction;
      }

      // Use beacon transport for critical events (ensures delivery even on page close)
      if (options?.critical) {
        eventParams.transport = 'beacon';
      }

      ReactGA.event(eventParams as any);
    } catch (error) {
      console.warn('[GA4] Failed to track event:', error);
    }
  }
}

// ============================================
// Facebook Pixel (placeholder for future use)
// ============================================
// class FacebookPixel {
//   private isInitialized = false;
//   private pixelId = 'YOUR_PIXEL_ID';
//
//   init(): void { /* ... */ }
//   trackPageView(): void { /* ... */ }
//   trackEvent(eventName: string, params?: object): void { /* ... */ }
// }

// ============================================
// Analytics Service (combines all providers)
// ============================================
class Analytics implements AnalyticsService {
  private ga4 = new GoogleAnalytics();
  // private fbPixel = new FacebookPixel(); // Uncomment when ready

  /**
   * Initialize all analytics providers (only if consent was given)
   */
  init(): void {
    this.ga4.init();
    // this.fbPixel.init(); // Uncomment when ready
  }

  /**
   * Enable tracking: save consent to localStorage and initialize analytics
   * Called when user clicks "Accept" on cookie consent banner
   */
  enableTracking(): void {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
      this.init();
    } catch (error) {
      console.warn('[Analytics] Failed to enable tracking:', error);
    }
  }

  /**
   * Check if user has given consent for tracking
   */
  hasConsent(): boolean {
    try {
      return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Check if analytics is ready to track (initialized)
   */
  isReady(): boolean {
    return this.ga4.isReady();
  }

  /**
   * Track a page view across all providers
   * @param path - The full path including search params (e.g., "/page?query=value")
   */
  trackPageView(path: string): void {
    if (!this.ga4.isReady()) {
      return;
    }
    this.ga4.trackPageView(path);
    // this.fbPixel.trackPageView(); // Uncomment when ready
  }

  /**
   * Track a custom event across all providers
   * @param category - Event category (e.g., "User", "Birthday", "Security")
   * @param action - Event action (e.g., "Sign_Up", "Import", "Share_Greeting")
   * @param label - Optional event label for additional context
   * @param options - Optional settings: { value, critical, nonInteraction }
   */
  trackEvent(category: string, action: string, label?: string, options?: TrackEventOptions): void {
    if (!this.ga4.isReady()) {
      return;
    }
    this.ga4.trackEvent(category, action, label, options);
    // this.fbPixel.trackEvent(action, { category, label, ...options }); // Uncomment when ready
  }
}

// Export singleton instance
export const analyticsService: AnalyticsService = new Analytics();
