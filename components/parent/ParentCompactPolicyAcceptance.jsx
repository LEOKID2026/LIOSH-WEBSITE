import Link from "next/link";
import { useState } from "react";
import { postPolicyAcceptance } from "../../lib/parent-client/policy-acceptance-api";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";

export const PARENT_POLICY_ACCEPTANCE_LABEL_HE =
  "ביצירת חשבון או בשימוש באתר, מומלץ לעיין בתנאי השימוש ובמדיניות הפרטיות.";

function ParentPolicyAcceptanceLabelText({ bright = false }) {
  const T = getParentPortalTheme(bright);
  return (
    <>
      ביצירת חשבון או בשימוש באתר, מומלץ לעיין ב
      <Link href="/terms" className={T.linkInline} onClick={(e) => e.stopPropagation()}>
        תנאי השימוש
      </Link>
      וב
      <Link href="/privacy" className={T.linkInline} onClick={(e) => e.stopPropagation()}>
        מדיניות הפרטיות
      </Link>
      .
    </>
  );
}

/**
 * @param {{
 *   checked: boolean;
 *   onChange: (checked: boolean) => void;
 *   bright?: boolean;
 *   disabled?: boolean;
 *   id?: string;
 * }} props
 */
export function ParentPolicyAcceptanceCheckboxField({
  checked,
  onChange,
  bright = false,
  disabled = false,
  id = "parent-policy-acceptance",
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2 text-sm leading-relaxed ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      } ${bright ? "text-slate-800" : "text-white/85"}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid="parent-policy-acceptance-checkbox"
      />
      <span className="break-words">
        <ParentPolicyAcceptanceLabelText bright={bright} />
      </span>
    </label>
  );
}
/**
 * Compact policy acceptance for parent dashboard (replaces full scroll panel).
 *
 * @param {{
 *   accessToken: string;
 *   acceptanceSource: string;
 *   termsVersion: string;
 *   privacyVersion: string;
 *   onAccepted: () => void;
 *   bright?: boolean;
 *   onLogout?: () => void | Promise<void>;
 * }} props
 */
export default function ParentCompactPolicyAcceptance({
  accessToken,
  acceptanceSource,
  termsVersion,
  privacyVersion,
  onAccepted,
  bright = false,
  onLogout,
}) {
  const T = getParentPortalTheme(bright);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!checked || busy || !accessToken) return;
    setBusy(true);
    setError("");

    const { ok, payload } = await postPolicyAcceptance(accessToken, {
      termsVersion,
      privacyVersion,
      source: acceptanceSource,
    });

    if (!ok) {
      setError(typeof payload?.error === "string" ? payload.error : "שמירת האישור נכשלה. נסו שוב.");
      setBusy(false);
      return;
    }

    setBusy(false);
    onAccepted();
  };

  return (
    <div
      dir="rtl"
      lang="he"
      data-policy-acceptance-root
      data-policy-scroll-mode="compact"
      className={`${T.gateBox} max-w-lg mx-auto space-y-4`}
      aria-label="אישור תנאי שימוש ומדיניות פרטיות"
    >
      <ParentPolicyAcceptanceCheckboxField
        checked={checked}
        onChange={setChecked}
        bright={bright}
        disabled={busy}
      />
      {error ? (
        <p className={T.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        {typeof onLogout === "function" ? (
          <button
            type="button"
            onClick={() => void onLogout()}
            className={T.gateSecondary}
            disabled={busy}
          >
            יציאה
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!checked || busy}
          className={T.amberBtn}
        >
          {busy ? "שומר…" : "אישור והמשך"}
        </button>
      </div>
    </div>
  );
}
