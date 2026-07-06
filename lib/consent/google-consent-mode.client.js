import { isAdsConsentGranted, isAnalyticsConsentGranted } from "./consent-storage.client.js";
import { STUDENT_AD_POLICY } from "../student-ui/student-ad-config.client.js";

/**
 * Inline bootstrap — must run before any Google tag / ads script.
 * Default: all ad/analytics storage denied until user opts in.
 */
export const GOOGLE_CONSENT_BOOTSTRAP_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
`;

function callGtagUpdate(updates) {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  gtag("consent", "update", updates);
}

/**
 * Sync Google Consent Mode v2 with stored user choice.
 * Child-safe policy: ad_personalization stays denied even when ads are approved.
 */
export function applyGoogleConsentFromStorage() {
  const adsGranted = isAdsConsentGranted();
  const analyticsGranted = isAnalyticsConsentGranted();

  callGtagUpdate({
    ad_storage: adsGranted ? "granted" : "denied",
    ad_user_data: adsGranted ? "granted" : "denied",
    ad_personalization:
      adsGranted && STUDENT_AD_POLICY.personalized === true ? "granted" : "denied",
    analytics_storage: analyticsGranted ? "granted" : "denied",
  });
}
