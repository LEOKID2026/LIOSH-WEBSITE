import { useState } from "react";
import { SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_STAFF_CODE_SHOWN,
  SCHOOL_STAFF_CREATE_DISPLAY_NAME,
  SCHOOL_STAFF_CREATE_SUCCESS,
  SCHOOL_STAFF_CREATE_SUBMIT_OPERATOR,
  SCHOOL_STAFF_CREATE_SUBMIT_TEACHER,
  SCHOOL_STAFF_PIN_SHOWN,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{
 *   accessToken: string,
 *   apiPath: string,
 *   sectionTitle: string,
 *   staffKind: "teacher" | "operator",
 *   onSuccess?: () => void,
 * }} props
 */
export default function SchoolStaffCreateForm({
  accessToken,
  apiPath,
  sectionTitle,
  staffKind,
  onSuccess,
}) {
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const submitLabel =
    staffKind === "operator" ? SCHOOL_STAFF_CREATE_SUBMIT_OPERATOR : SCHOOL_STAFF_CREATE_SUBMIT_TEACHER;

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken || !displayName.trim()) return;
    setBusy(true);
    setError("");
    setCreated(null);
    try {
      const res = await schoolAuthFetch(accessToken, apiPath, {
        method: "POST",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "יצירה נכשלה"));
        return;
      }
      setCreated(json?.data || null);
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
            <span className="text-white/60 block mb-1">{SCHOOL_STAFF_CREATE_DISPLAY_NAME}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm"
              maxLength={80}
              required
            />
          </label>
          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {created?.staffCode ? (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm space-y-1">
              <p className="text-emerald-200">{SCHOOL_STAFF_CREATE_SUCCESS}</p>
              <p>
                {SCHOOL_STAFF_CODE_SHOWN}:{" "}
                <span className="font-mono" dir="ltr">
                  {created.staffCode}
                </span>
              </p>
              <p>
                {SCHOOL_STAFF_PIN_SHOWN}:{" "}
                <span className="font-mono" dir="ltr">
                  {created.initialPin}
                </span>
              </p>
            </div>
          ) : null}
          <SchoolPrimaryButton type="submit" disabled={busy || !displayName.trim()}>
            {busy ? "יוצר…" : submitLabel}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
