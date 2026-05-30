import { useState } from "react";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_STAFF_ACTION_BUSY,
  SCHOOL_STAFF_CODE_SHOWN,
  SCHOOL_STAFF_PIN_SHOWN,
  SCHOOL_STAFF_REACTIVATE,
  SCHOOL_STAFF_REGENERATE_CODE,
  SCHOOL_STAFF_RESET_PIN,
  SCHOOL_STAFF_STATUS_ACTIVE,
  SCHOOL_STAFF_STATUS_SUSPENDED,
  SCHOOL_STAFF_SUSPEND,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{
 *   accessToken: string,
 *   userId: string,
 *   apiBasePath: string,
 *   staffCode?: string|null,
 *   staffAccessStatus?: string|null,
 *   hasStaffCodeLogin?: boolean,
 *   onChanged?: () => void,
 * }} props
 */
export default function SchoolStaffAccessActions({
  accessToken,
  userId,
  apiBasePath,
  staffCode,
  staffAccessStatus,
  hasStaffCodeLogin,
  onChanged,
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(null);

  if (!hasStaffCodeLogin) return null;

  const run = async (action, method = "PUT") => {
    setBusy(action);
    setError("");
    setRevealed(null);
    try {
      const res = await schoolAuthFetch(accessToken, `${apiBasePath}/${encodeURIComponent(userId)}/${action}`, {
        method,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הפעולה נכשלה"));
        return;
      }
      if (json?.data?.initialPin) {
        setRevealed({
          staffCode: json.data.staffCode,
          initialPin: json.data.initialPin,
        });
      }
      onChanged?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy("");
    }
  };

  const statusLabel =
    staffAccessStatus === "suspended" ? SCHOOL_STAFF_STATUS_SUSPENDED : SCHOOL_STAFF_STATUS_ACTIVE;

  return (
    <div className="mt-3 pt-3 border-t border-white/10 text-sm space-y-2">
      {staffCode ? (
        <p className="text-white/60">
          {SCHOOL_STAFF_CODE_SHOWN}:{" "}
          <span className="font-mono text-white/90" dir="ltr">
            {staffCode}
          </span>{" "}
          · {statusLabel}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void run("pin-reset")}
          className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs"
        >
          {busy === "pin-reset" ? SCHOOL_STAFF_ACTION_BUSY : SCHOOL_STAFF_RESET_PIN}
        </button>
        {staffAccessStatus === "suspended" ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("reactivate")}
            className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs"
          >
            {busy === "reactivate" ? SCHOOL_STAFF_ACTION_BUSY : SCHOOL_STAFF_REACTIVATE}
          </button>
        ) : (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run("suspend")}
            className="rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-xs"
          >
            {busy === "suspend" ? SCHOOL_STAFF_ACTION_BUSY : SCHOOL_STAFF_SUSPEND}
          </button>
        )}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void run("code-regenerate", "POST")}
          className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-xs"
        >
          {busy === "code-regenerate" ? SCHOOL_STAFF_ACTION_BUSY : SCHOOL_STAFF_REGENERATE_CODE}
        </button>
      </div>
      {revealed ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2 text-xs">
          <p>
            {SCHOOL_STAFF_CODE_SHOWN}:{" "}
            <span className="font-mono" dir="ltr">
              {revealed.staffCode}
            </span>
          </p>
          <p>
            {SCHOOL_STAFF_PIN_SHOWN}:{" "}
            <span className="font-mono" dir="ltr">
              {revealed.initialPin}
            </span>
          </p>
        </div>
      ) : null}
      {error ? <p className="text-red-300 text-xs">{error}</p> : null}
    </div>
  );
}
