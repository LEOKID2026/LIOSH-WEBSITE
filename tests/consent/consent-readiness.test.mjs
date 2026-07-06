#!/usr/bin/env node
/**
 * Cookie/ads consent readiness — storage, consent mode defaults, ad gating.
 */
import assert from "node:assert/strict";
import {
  acceptAllConsent,
  CONSENT_STORAGE_KEY,
  hasConsentDecision,
  isAdsConsentGranted,
  isAnalyticsConsentGranted,
  readStoredConsent,
  rejectAllConsent,
  saveConsentChoice,
} from "../../lib/consent/consent-storage.client.js";
import { shouldDeferCookieConsentBanner } from "../../lib/consent/consent-banner-policy.client.js";
import {
  resolveStudentAdRenderModeFromEnv,
  resolveStudentAdRenderModeWithConsent,
} from "../../lib/student-ui/student-ad-config.js";
import { GOOGLE_CONSENT_BOOTSTRAP_SCRIPT } from "../../lib/consent/google-consent-mode.client.js";

const storage = new Map();

global.window = {
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  },
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
};

function resetStorage() {
  storage.clear();
}

function testBootstrapDefaultsDenied() {
  assert.match(GOOGLE_CONSENT_BOOTSTRAP_SCRIPT, /ad_storage:\s*'denied'/);
  assert.match(GOOGLE_CONSENT_BOOTSTRAP_SCRIPT, /analytics_storage:\s*'denied'/);
  assert.match(GOOGLE_CONSENT_BOOTSTRAP_SCRIPT, /ad_user_data:\s*'denied'/);
  assert.match(GOOGLE_CONSENT_BOOTSTRAP_SCRIPT, /ad_personalization:\s*'denied'/);
}

function testConsentStorageRoundTrip() {
  resetStorage();
  assert.equal(hasConsentDecision(), false);
  acceptAllConsent("banner");
  assert.equal(hasConsentDecision(), true);
  assert.equal(isAdsConsentGranted(), true);
  assert.equal(isAnalyticsConsentGranted(), true);
  const stored = readStoredConsent();
  assert.equal(stored?.choice, "accepted");
  assert.equal(stored?.source, "banner");
}

function testRejectDeniesAdsAndAnalytics() {
  resetStorage();
  rejectAllConsent("banner");
  assert.equal(isAdsConsentGranted(), false);
  assert.equal(isAnalyticsConsentGranted(), false);
}

function testCustomPreferences() {
  resetStorage();
  saveConsentChoice({
    choice: "custom",
    ads: true,
    analytics: false,
    source: "preferences",
  });
  assert.equal(isAdsConsentGranted(), true);
  assert.equal(isAnalyticsConsentGranted(), false);
  assert.equal(readStoredConsent()?.source, "preferences");
}

function testExternalAdsBlockedWithoutConsentEvenInProduction() {
  const prodExternal = {
    NODE_ENV: "production",
    NEXT_PUBLIC_STUDENT_AD_EXTERNAL_ENABLED: "true",
  };
  assert.equal(resolveStudentAdRenderModeFromEnv(prodExternal), "external");
  assert.equal(
    resolveStudentAdRenderModeWithConsent(prodExternal, { adsConsentGranted: false }),
    "placeholder",
  );
  assert.equal(
    resolveStudentAdRenderModeWithConsent(prodExternal, { adsConsentGranted: true }),
    "external",
  );
}

function testBannerDeferredOnImmersiveLearning() {
  assert.equal(shouldDeferCookieConsentBanner("/learning/math-master"), true);
  assert.equal(shouldDeferCookieConsentBanner("/offline/tic-tac-toe"), true);
  assert.equal(shouldDeferCookieConsentBanner("/student/home"), false);
  assert.equal(shouldDeferCookieConsentBanner("/"), false);
}

function testStorageKeyStable() {
  assert.equal(CONSENT_STORAGE_KEY, "leokids_consent_v1");
}

testBootstrapDefaultsDenied();
testConsentStorageRoundTrip();
testRejectDeniesAdsAndAnalytics();
testCustomPreferences();
testExternalAdsBlockedWithoutConsentEvenInProduction();
testBannerDeferredOnImmersiveLearning();
testStorageKeyStable();

console.log("consent-readiness: all checks passed");
