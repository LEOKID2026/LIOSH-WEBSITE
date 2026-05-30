import { useState } from "react";
import { SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_INVITE_ADVANCED_UUID,
  SCHOOL_INVITE_EMAIL,
  SCHOOL_INVITE_SUCCESS,
  SCHOOL_STAFF_UUID_ADVANCED,
} from "../../lib/school-portal/school-ui.he";
import { ADMIN_COL_EMAIL } from "../../lib/admin-portal/admin-ui.he.js";

/**
 * Primary staff invite by email; optional collapsed UUID fallback.
 * @param {{
 *   accessToken: string,
 *   apiPath: string,
 *   userIdBodyKey: "teacherUserId" | "operatorUserId",
 *   sectionTitle: string,
 *   submitLabel: string,
 *   helpText?: string,
 *   showDisplayName?: boolean,
 *   onSuccess?: () => void,
 * }} props
 */
export default function SchoolStaffEmailInviteForm({
  accessToken,
  apiPath,
  userIdBodyKey,
  sectionTitle,
  submitLabel,
  helpText = "",
  showDisplayName = false,
  onSuccess,
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [advancedUuid, setAdvancedUuid] = useState("");
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    const trimmedEmail = email.trim();
    const trimmedUuid = advancedUuid.trim();
    if (!useAdvanced && !trimmedEmail) return;
    if (useAdvanced && !trimmedUuid) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = useAdvanced ? { [userIdBodyKey]: trimmedUuid } : { email: trimmedEmail };
      if (showDisplayName && displayName.trim()) body.displayName = displayName.trim();
      const res = await schoolAuthFetch(accessToken, apiPath, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הזמנה נכשלה"));
        return;
      }
      setMessage(SCHOOL_INVITE_SUCCESS);
      setEmail("");
      setDisplayName("");
      setAdvancedUuid("");
      onSuccess?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = useAdvanced ? advancedUuid.trim().length > 0 : email.trim().length > 0;

  return (
    <section className={`${SCHOOL_CARD} mb-6`}>
      <div className={SCHOOL_CARD_INNER}>
        <h2 className="text-base font-semibold mb-3 text-right">{sectionTitle}</h2>
        {helpText ? <p className="text-sm text-white/60 mb-3 text-right">{helpText}</p> : null}
        <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-xl">
          {!useAdvanced ? (
            <label className="block text-sm text-right">
              <span className="text-white/60 block mb-1">{SCHOOL_INVITE_EMAIL || ADMIN_COL_EMAIL}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm"
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
          ) : (
            <label className="block text-sm text-right">
              <span className="text-white/60 block mb-1">{SCHOOL_STAFF_UUID_ADVANCED}</span>
              <input
                type="text"
                value={advancedUuid}
                onChange={(e) => setAdvancedUuid(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm font-mono"
                dir="ltr"
                autoComplete="off"
              />
            </label>
          )}

          {showDisplayName ? (
            <label className="block text-sm text-right">
              <span className="text-white/60 block mb-1">שם תצוגה (אופציונלי)</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm"
              />
            </label>
          ) : null}

          <details className="text-sm text-white/50">
            <summary className="cursor-pointer hover:text-white/70">{SCHOOL_INVITE_ADVANCED_UUID}</summary>
            <label className="flex items-center gap-2 mt-2 text-right">
              <input
                type="checkbox"
                checked={useAdvanced}
                onChange={(e) => {
                  setUseAdvanced(e.target.checked);
                  setError("");
                  setMessage("");
                }}
              />
              <span>הזמנה לפי מזהה משתמש (מתקדם)</span>
            </label>
          </details>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}
          <SchoolPrimaryButton type="submit" disabled={busy || !canSubmit}>
            {busy ? "שולח…" : submitLabel}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
