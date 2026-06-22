import { useCallback, useEffect, useState } from "react";
import {
  fetchPolicyAcceptanceStatus,
  POLICY_STATUS_UNAVAILABLE_HE,
} from "../../lib/parent-client/policy-acceptance-api";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import ParentCompactPolicyAcceptance from "./ParentCompactPolicyAcceptance";

/**
 * Blocks parent dashboard until current Terms + Privacy versions are accepted.
 * Phase D.2F: fails closed — any status API failure hides dashboard children.
 *
 * @param {{
 *   accessToken: string;
 *   onLogout: () => void | Promise<void>;
 *   onReady?: () => void | Promise<void>;
 *   children: import("react").ReactNode;
 *   bright?: boolean;
 * }} props
 */
export default function ParentPolicyAcceptanceGate({
  accessToken,
  onLogout,
  onReady,
  children,
  bright = false,
}) {
  const T = getParentPortalTheme(bright);
  const [loading, setLoading] = useState(true);
  const [statusChecked, setStatusChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [required, setRequired] = useState({
    termsVersion: "",
    privacyVersion: "",
  });

  const loadStatus = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setStatusChecked(false);
      setAccepted(false);
      setRequired({ termsVersion: "", privacyVersion: "" });
      setError(POLICY_STATUS_UNAVAILABLE_HE);
      return;
    }

    setLoading(true);
    setStatusChecked(false);
    setAccepted(false);
    setError("");

    try {
      const { ok, payload, error: apiError } = await fetchPolicyAcceptanceStatus(accessToken);

      if (
        !ok ||
        !payload ||
        typeof payload.accepted !== "boolean" ||
        typeof payload.requiredTermsVersion !== "string" ||
        typeof payload.requiredPrivacyVersion !== "string"
      ) {
        setRequired({ termsVersion: "", privacyVersion: "" });
        setError(apiError || payload?.error || POLICY_STATUS_UNAVAILABLE_HE);
        return;
      }

      setRequired({
        termsVersion: payload.requiredTermsVersion,
        privacyVersion: payload.requiredPrivacyVersion,
      });
      setAccepted(Boolean(payload.accepted));
      setStatusChecked(true);
    } catch (_e) {
      setRequired({ termsVersion: "", privacyVersion: "" });
      setError(POLICY_STATUS_UNAVAILABLE_HE);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!accepted || typeof onReady !== "function") return;
    void onReady();
  }, [accepted, onReady]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl" lang="he">
        <p className={T.loading}>בודק אישור מדיניות...</p>
      </div>
    );
  }

  if (!statusChecked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl" lang="he">
        <div className={`${T.gateBox}`} role="alert">
          <p className={T.gateText}>{error || POLICY_STATUS_UNAVAILABLE_HE}</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button type="button" onClick={() => void loadStatus()} className={T.amberBtn}>
              נסו שוב
            </button>
            {typeof onLogout === "function" ? (
              <button type="button" onClick={() => void onLogout()} className={T.gateSecondary}>
                יציאה
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return children;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl" lang="he">
      <ParentCompactPolicyAcceptance
        bright={bright}
        accessToken={accessToken}
        acceptanceSource="parent_dashboard"
        termsVersion={required.termsVersion}
        privacyVersion={required.privacyVersion}
        onLogout={onLogout}
        onAccepted={() => {
          setAccepted(true);
          setError("");
        }}
      />
    </div>
  );
}
