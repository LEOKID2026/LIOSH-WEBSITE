import { useState } from "react";
import { SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import { apiErrorMessageHe, schoolAuthFetch, SCHOOL_STUDENT_ID } from "../../lib/school-portal/school-ui.he";

/**
 * Invite existing auth user by UUID (teachers or operators).
 * @param {{
 *   accessToken: string,
 *   apiPath: string,
 *   bodyKey: "teacherUserId" | "operatorUserId",
 *   sectionTitle: string,
 *   submitLabel: string,
 *   onSuccess?: () => void,
 * }} props
 */
export default function SchoolUserIdInviteForm({
  accessToken,
  apiPath,
  bodyKey,
  sectionTitle,
  submitLabel,
  onSuccess,
}) {
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken || !userId.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = { [bodyKey]: userId.trim() };
      if (displayName.trim()) body.displayName = displayName.trim();
      const res = await schoolAuthFetch(accessToken, apiPath, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הזמנה נכשלה"));
        return;
      }
      setMessage("ההזמנה בוצעה בהצלחה");
      setUserId("");
      setDisplayName("");
      onSuccess?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${SCHOOL_CARD} mb-6`}>
      <div className={SCHOOL_CARD_INNER}>
        <h2 className="text-base font-semibold mb-3 text-right">{sectionTitle}</h2>
        <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-xl">
          <label className="block text-sm text-right">
            <span className="text-white/60 block mb-1">{SCHOOL_STUDENT_ID}</span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm"
              dir="ltr"
              autoComplete="off"
            />
          </label>
          {bodyKey === "operatorUserId" ? (
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
          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}
          <SchoolPrimaryButton type="submit" disabled={busy || !userId.trim()}>
            {busy ? "שולח…" : submitLabel}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
