import { useCallback, useEffect, useState } from "react";
import { fetchPolicyAcceptanceStatus } from "../../lib/parent-client/policy-acceptance-api";
import FullPolicyAcceptancePanel from "./FullPolicyAcceptancePanel";

/**
 * Blocks parent dashboard until current Terms + Privacy versions are accepted
 * via the full scroll-and-read panel (Phase D.2).
 *
 * @param {{ accessToken: string; children: import("react").ReactNode }} props
 */
export default function ParentPolicyAcceptanceGate({ accessToken, children }) {
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [error, setError] = useState("");
  const [required, setRequired] = useState({
    termsVersion: "",
    privacyVersion: "",
  });

  const loadStatus = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    const { ok, payload } = await fetchPolicyAcceptanceStatus(accessToken);
    if (!ok) {
      setError(payload?.error || "לא ניתן לטעון סטטוס אישור מדיניות");
      setLoading(false);
      return;
    }
    setRequired({
      termsVersion: payload.requiredTermsVersion,
      privacyVersion: payload.requiredPrivacyVersion,
    });
    setAccepted(Boolean(payload.accepted));
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading) {
    return <p className="text-white/70 text-sm">בודק אישור מדיניות...</p>;
  }

  if (accepted) {
    return children;
  }

  const statusLoadFailed = Boolean(error) && !required.termsVersion;

  if (statusLoadFailed) {
    return (
      <div
        dir="rtl"
        lang="he"
        className="rounded-xl border border-red-400/35 bg-black/50 p-5 sm:p-6 space-y-4 text-right"
        role="alert"
      >
        <h2 className="text-lg font-bold text-red-200">לא ניתן לטעון סטטוס אישור</h2>
        <p className="text-sm text-white/80">{error}</p>
        <button
          type="button"
          onClick={() => void loadStatus()}
          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          נסו שוב
        </button>
      </div>
    );
  }

  if (showFullPanel) {
    return (
      <FullPolicyAcceptancePanel
        accessToken={accessToken}
        acceptanceSource="parent_dashboard"
        termsVersion={required.termsVersion}
        privacyVersion={required.privacyVersion}
        persistToApi
        onBack={() => setShowFullPanel(false)}
        onAccepted={() => {
          setShowFullPanel(false);
          setAccepted(true);
          setError("");
        }}
        onDeclined={() => {
          setShowFullPanel(false);
          setError("כדי להמשיך לאזור ההורים יש לאשר את תנאי השימוש ומדיניות הפרטיות.");
        }}
      />
    );
  }

  return (
    <div
      dir="rtl"
      lang="he"
      className="rounded-xl border border-amber-400/35 bg-black/50 p-5 sm:p-6 space-y-4 text-right max-w-3xl"
      role="region"
      aria-label="נדרש אישור מדיניות"
    >
      <h2 className="text-lg font-bold text-amber-200">נדרש אישור לפני המשך</h2>
      <p className="text-sm sm:text-base text-white/80 leading-relaxed">
        כדי להמשיך להשתמש באזור ההורים, יש לקרוא את תנאי השימוש ומדיניות הפרטיות בתוך האתר
        ולאשר אותם.
      </p>
      {error ? <p className="text-sm text-amber-200/90">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowFullPanel(true);
        }}
        className="rounded bg-amber-500 text-black px-4 py-2.5 text-sm font-bold"
      >
        פתחו וקראו את תנאי השימוש ומדיניות הפרטיות
      </button>
    </div>
  );
}
