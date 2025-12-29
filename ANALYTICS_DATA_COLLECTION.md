# Analytics Data Collection Documentation

> **תיעוד איסוף נתונים לצרכי עדכון מדיניות פרטיות ותנאי שימוש**
> 
> Last Updated: December 2024

## Overview / סקירה כללית

This document details all analytics data collected by HebBirthday.app through Google Analytics 4 (GA4).
This information should be used when updating the Privacy Policy and Terms of Use.

מסמך זה מפרט את כל נתוני האנליטיקס הנאספים על ידי HebBirthday.app באמצעות Google Analytics 4.
יש להשתמש במידע זה בעת עדכון מדיניות הפרטיות ותנאי השימוש.

---

## Analytics Provider / ספק אנליטיקס

| Provider | Measurement ID | Purpose |
|----------|---------------|---------|
| Google Analytics 4 | G-T1NWK5ZTV1 | User behavior analysis, feature usage tracking, security monitoring |

---

## Data Collected / נתונים נאספים

### 1. Page Views / צפיות בדפים

**Event Type:** `pageview`

| Data Field | Description (EN) | תיאור (HE) |
|------------|-----------------|-------------|
| Page Path | Full URL path including search params | נתיב URL מלא כולל פרמטרים |
| Timestamp | When the page was viewed | מועד הצפייה |

**Pages Tracked:**
- `/` - Dashboard
- `/login` - Login page
- `/register` - Registration page
- `/groups` - Groups management
- `/gelt` - Gelt/Gifts feature
- `/guide` - User guide
- `/portal` - Guest portal
- `/guest/:groupId/:token` - Guest access page

---

### 2. User Events / אירועי משתמש

#### 2.1 Critical Events (High Reliability) / אירועים קריטיים

These events use `beacon` transport to ensure delivery even if the user closes the tab.

| Event | Category | Action | Label | Value | Description |
|-------|----------|--------|-------|-------|-------------|
| Registration | User | Sign_Up | "Email" / "Google" | - | User completed registration |
| Guest Contribution | Guest | Contribution | Group ID | - | Guest added a birthday via guest link |
| High-Volume Import | Security | HighVolume_Import | Import type | Record count | Bulk import >50 records |
| Bulk Sync | Security | Abuse_Monitor | Bulk_Sync | Record count | Bulk calendar sync >50 records |
| Bulk Delete | Security | Abuse_Monitor | Bulk_Delete | Record count | Bulk delete >50 records |

#### 2.2 Standard Marketing Events / אירועי שיווק רגילים

| Event | Category | Action | Label | Description |
|-------|----------|--------|-------|-------------|
| WhatsApp Share | Share | Share_Greeting | Format type | User copied birthday info for WhatsApp |
| Language Switch | User | Change_Language | "he_to_en" / "en_to_he" | User changed interface language |
| Input Preference | Birthday | Input_Preference | "Hebrew" / "Gregorian" | Date input method used when adding birthday |
| Wishlist Usage | Feature | Wishlist_Use | - | User opened/used wishlist feature |

---

### 3. Automatic Data (Collected by GA4) / נתונים אוטומטיים

GA4 automatically collects the following data:

| Data Type | Description | איסוף |
|-----------|-------------|-------|
| Device Info | Browser, OS, screen size | אוטומטי |
| Geographic | Country, city (approximate) | אוטומטי |
| Session Data | Session duration, pages per session | אוטומטי |
| Traffic Source | Referrer, campaign parameters | אוטומטי |

---

## What We DON'T Send to Analytics / מה אנחנו לא שולחים לאנליטיקס

**Important Distinction / הבחנה חשובה:**
The following data IS stored in our Firebase database (for the service to function), but is NOT sent to Google Analytics:

הנתונים הבאים **נשמרים** במסד הנתונים שלנו (Firebase) לצורך פעולת השירות, אך **אינם נשלחים** ל-Google Analytics:

❌ **Personal Information (not sent to GA4):**
- Names of birthday contacts
- Birth dates of contacts
- Gender information
- Notes and wishlist content
- Email addresses of contacts

❌ **Sensitive Data:**
- Payment information
- Health information
- Precise location data

---

## Data Storage & Technical Access / אחסון מידע וגישה טכנית

**Transparency Note / הערת שקיפות:**

User content (names, birth dates, notes, wishlist items) is stored in Firebase Firestore without application-level encryption. Firebase provides infrastructure-level encryption at rest and in transit.

The application developer has **technical access** to the database for:
- System maintenance and troubleshooting
- Technical support
- Service improvement

**This access is NOT used for:**
- Marketing purposes
- Selling to third parties
- Any purpose unrelated to service operation

תוכן המשתמש (שמות, תאריכי לידה, הערות) נשמר ב-Firebase ללא הצפנה ברמת האפליקציה. 
למפתח האפליקציה יש **גישה טכנית** למסד הנתונים לצורכי תחזוקה, תמיכה ושיפור השירות בלבד.

---

## Important Note: Local Hebrew Date Calculation / הערה חשובה: חישוב תאריכים עבריים מקומי

**Hebrew date calculations are performed LOCALLY in the user's browser using the `@hebcal/core` library.**

- ✅ No data is sent to external servers for date calculation
- ✅ All processing happens on the user's device
- ✅ This is a privacy-friendly approach

חישוב התאריכים העבריים מתבצע **מקומית** בדפדפן המשתמש באמצעות ספריית `@hebcal/core`.
אין שליחת מידע לשרתים חיצוניים לצורך החישוב.

---

## Security Monitoring / ניטור אבטחה

We track high-volume operations (>50 records) for abuse prevention:

| Threshold | Action | Purpose |
|-----------|--------|---------|
| >50 imports | Log event | Detect potential data scraping |
| >50 syncs | Log event | Detect API abuse |
| >50 deletes | Log event | Detect destructive behavior |

---

## Data Retention / שמירת נתונים

| Data Type | Retention Period | ניתן למחיקה |
|-----------|-----------------|-------------|
| GA4 Events | 14 months (GA4 default) | Yes, via GA4 settings |
| User Properties | As long as account exists | Yes, on account deletion |

---

## User Rights / זכויות המשתמש

Users can:
1. **Opt-out** - Using browser privacy settings or GA opt-out extension
2. **Request Data** - Contact support for data export
3. **Delete Data** - Delete account to remove all associated data
4. **Cookie Consent** - Decline tracking when prompted by the cookie consent banner

---

## GDPR Cookie Consent / הסכמה לעוגיות

### Implementation

The application implements a GDPR-compliant cookie consent system:

| Component | Location | Purpose |
|-----------|----------|---------|
| CookieConsentBanner | `src/components/common/CookieConsentBanner.tsx` | UI banner for consent |
| Analytics Service | `src/services/analytics.service.ts` | Consent-aware tracking |

### Consent Flow

1. **First Visit**: Banner appears at bottom of screen
2. **Accept**: `localStorage.cookie_consent = 'true'` → Analytics initialized
3. **Decline**: `localStorage.cookie_consent = 'false'` → No tracking
4. **Return Visit**: No banner shown, previous choice respected

### localStorage Key

| Key | Values | Effect |
|-----|--------|--------|
| `cookie_consent` | `'true'` | Analytics active |
| `cookie_consent` | `'false'` | Analytics disabled |
| `cookie_consent` | `null` | Banner shown |

### Code Pattern

```typescript
// Check consent before initializing
if (localStorage.getItem('cookie_consent') === 'true') {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

// Enable tracking on user consent
analyticsService.enableTracking(); // Sets consent + initializes
```

---

## Implementation Details / פרטי מימוש

### Code Location
- Service: `src/services/analytics.service.ts`
- Tracker Component: `src/components/common/AnalyticsTracker.tsx`
- App Integration: `src/App.tsx`

### Event Tracking Code Pattern

```typescript
// Standard event
analyticsService.trackEvent('Category', 'Action', 'Label');

// Critical event (uses beacon for reliability)
analyticsService.trackEvent('Security', 'Abuse_Monitor', 'Bulk_Delete', {
  value: recordCount,
  critical: true
});

// Non-interaction event
analyticsService.trackEvent('Feature', 'Auto_Refresh', 'Calendar', {
  nonInteraction: true
});
```

---

## Privacy Policy Update Checklist / רשימת בדיקה לעדכון מדיניות פרטיות

Updated in `src/components/pages/PrivacyPolicy.tsx` on December 29, 2025:

- [x] Use of Google Analytics 4 for usage tracking (Section 4)
- [x] Types of events tracked (page views, user actions) (Section 4)
- [x] No personal birthday data is sent to analytics (Section 4)
- [x] Security monitoring for abuse prevention (Section 4)
- [x] User rights to opt-out (Section 4, 9)
- [x] Data retention period (14 months) (Section 4)
- [x] Enhanced user rights section with self-service options (Section 9)
- [x] **Group sharing via link (not organization-wide access)** (Section 3)
- [x] **Gender is required field** (Section 1)
- [x] **Hebrew date calculation is LOCAL (no external API)** (Section 3)
- [x] **Google Calendar only writes to dedicated app-created calendars** (Section 3)
- [x] **NEW: Technical access disclosure** (Section 7)
- [x] **Data storage security details** (Section 7)

---

## Terms of Use Update Checklist / רשימת בדיקה לעדכון תנאי שימוש

Updated in `src/components/pages/TermsOfUse.tsx` on December 29, 2025:

- [x] Mention that usage data is collected for service improvement (Section 6)
- [x] Security monitoring clause for high-volume operations (Section 6)
- [x] Acceptable use policy (no bulk scraping) (Section 6)
- [x] **Groups (not "organizations/Tenants") terminology** (Sections 1, 3)
- [x] **Sharing via link mechanism clarified** (Section 1)
- [x] **Hebrew date calculation is LOCAL** (Section 8)

---

## Future Additions / תוספות עתידיות

When adding new analytics events:

1. Update this document
2. Update Privacy Policy if new data types are collected
3. Ensure no PII (Personally Identifiable Information) is sent
4. Use `critical: true` for important business events
5. Use appropriate category naming

---

## Contact / יצירת קשר

For questions about data collection: [Add contact email]

