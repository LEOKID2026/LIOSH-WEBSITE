import { useCallback, useEffect, useState } from "react";
import {
  fetchPolicyAcceptanceStatus,
  POLICY_STATUS_UNAVAILABLE_HE,
} from "../../lib/parent-client/policy-acceptance-api";
import FullPolicyAcceptancePanel from "./FullPolicyAcceptancePanel";
import PolicyAcceptanceDeclinedBlock from "./PolicyAcceptanceDeclinedBlock";

/**
 * Blocks parent dashboard until current Terms + Privacy versions are accepted.
 * Phase D.2F: fails closed — any status API failure hides dashboard children.
 *
 * @param {{
 *   accessToken: string;
 *   onLogout: () => void | Promise<void>;
 *   onReady?: () => void | Promise<void>;
 *   children: import("react").ReactNode;
 * }} props
 */
export default function ParentPolicyAcceptanceGate({ accessToken, onLogout, onReady, children }) {
  const [loading, setLoading] = useState(true);
  const [statusChecked, setStatusChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
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
    setDeclined(false);

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
        <p className="text-white/70 text-sm">בודק אישור מדיניות...</p>
      </div>
    );
  }

  if (!statusChecked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl" lang="he">
        <div
          className="rounded-xl border border-amber-400/35 bg-black/50 p-5 sm:p-6 space-y-4 text-right"
          role="alert"
        >
          <p className="text-sm text-white/85 leading-relaxed">
            {error || POLICY_STATUS_UNAVAILABLE_HE}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="rounded bg-amber-500 text-black px-4 py-2 text-sm font-bold"
            >
              נסו שוב
            </button>
            {typeof onLogout === "function" ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className="rounded border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80"
              >
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

  if (declined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl" lang="he">
        <PolicyAcceptanceDeclinedBlock
          onReviewAgain={() => {
            setDeclined(false);
            setPanelKey((k) => k + 1);
          }}
          onReturnToLogin={() => void onLogout()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl" lang="he">
      <FullPolicyAcceptancePanel
        key={panelKey}
        layout="fullPage"
        accessToken={accessToken}
        acceptanceSource="parent_dashboard"
        termsVersion={required.termsVersion}
        privacyVersion={required.privacyVersion}
        persistToApi
        onAccepted={() => {
          setAccepted(true);
          setDeclined(false);
          setError("");
        }}
        onDeclined={() => setDeclined(true)}
      />
    </div>
  );
}
