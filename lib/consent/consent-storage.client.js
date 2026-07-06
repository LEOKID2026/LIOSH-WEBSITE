/** @typedef {"accepted"|"rejected"|"custom"} ConsentChoice */

/**
 * @typedef {{
 *   version: 1;
 *   choice: ConsentChoice;
 *   ads: boolean;
 *   analytics: boolean;
 *   decidedAt: string;
 *   source: "banner"|"preferences";
 * }} StoredConsentV1
 */

export const CONSENT_STORAGE_KEY = "leokids_consent_v1";
export const CONSENT_CHANGED_EVENT = "leokids:consent-changed";

/** @returns {StoredConsentV1 | null} */
export function readStoredConsent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    if (!parsed.choice || !parsed.decidedAt) return null;
    return {
      version: 1,
      choice: parsed.choice,
      ads: parsed.ads === true,
      analytics: parsed.analytics === true,
      decidedAt: String(parsed.decidedAt),
      source: parsed.source === "preferences" ? "preferences" : "banner",
    };
  } catch {
    return null;
  }
}

/**
 * @param {StoredConsentV1} record
 */
export function writeStoredConsent(record) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
}

export function hasConsentDecision() {
  return readStoredConsent() != null;
}

export function isAdsConsentGranted() {
  const stored = readStoredConsent();
  return stored?.ads === true;
}

export function isAnalyticsConsentGranted() {
  const stored = readStoredConsent();
  return stored?.analytics === true;
}

/**
 * @param {{ ads: boolean; analytics: boolean; choice: ConsentChoice; source?: "banner"|"preferences" }} input
 */
export function saveConsentChoice(input) {
  writeStoredConsent({
    version: 1,
    choice: input.choice,
    ads: input.ads === true,
    analytics: input.analytics === true,
    decidedAt: new Date().toISOString(),
    source: input.source === "preferences" ? "preferences" : "banner",
  });
}

export function acceptAllConsent(source = "banner") {
  saveConsentChoice({ choice: "accepted", ads: true, analytics: true, source });
}

export function rejectAllConsent(source = "banner") {
  saveConsentChoice({ choice: "rejected", ads: false, analytics: false, source });
}
