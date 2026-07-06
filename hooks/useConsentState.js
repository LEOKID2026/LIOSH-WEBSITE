import { useCallback, useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  hasConsentDecision,
  isAdsConsentGranted,
  isAnalyticsConsentGranted,
  readStoredConsent,
} from "../lib/consent/consent-storage.client.js";

/**
 * Client consent snapshot for ad gating and CMP UI.
 */
export function useConsentState() {
  const [ready, setReady] = useState(false);
  const [decided, setDecided] = useState(false);
  const [adsGranted, setAdsGranted] = useState(false);
  const [analyticsGranted, setAnalyticsGranted] = useState(false);

  const refresh = useCallback(() => {
    setDecided(hasConsentDecision());
    setAdsGranted(isAdsConsentGranted());
    setAnalyticsGranted(isAnalyticsConsentGranted());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, [refresh]);

  return {
    ready,
    decided,
    adsGranted,
    analyticsGranted,
    stored: readStoredConsent(),
    refresh,
  };
}
