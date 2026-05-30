import { useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_APPROVE_ACTION,
  ADMIN_APPROVED_SUCCESS,
  ADMIN_REJECT_ACTION,
  ADMIN_REJECT_REASON_LABEL,
  ADMIN_REJECTED_SUCCESS,
  ADMIN_STATUS_PENDING,
} from "../../lib/auth/auth-registration.he.js";
import {
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  apiErrorMessageHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{ accessToken: string, school: object, onChanged?: () => void }} props
 */
export default function AdminSchoolRegistrationPanel({ accessToken, school, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");

  if (school?.isActive !== false) return null;

  const run = async (action) => {
    if (!accessToken || !school?.schoolId) return;
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/schools/${school.schoolId}/${action}`,
        {
          method: "POST",
          body: action === "reject" ? JSON.stringify({ reason: reason.trim() || null }) : undefined,
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הפעולה נכשלה"));
        return;
      }
      setMessage(action === "approve" ? ADMIN_APPROVED_SUCCESS : ADMIN_REJECTED_SUCCESS);
      onChanged?.();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy("");
    }
  };

  return (
    <section
      className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 mb-6 text-right"
      data-testid="admin-school-registration-panel"
    >
      <h2 className="font-semibold mb-2">{ADMIN_STATUS_PENDING}</h2>
      <p className="text-sm text-white/70 mb-4">
        בית ספר זה נרשם וממתין לאישור מנהל/ת המערכת.
      </p>
      <label className="block text-sm mb-3">
        <span className="text-white/70">{ADMIN_REJECT_REASON_LABEL}</span>
        <input
          type="text"
          value={reason}
          onChange={(ev) => setReason(ev.target.value)}
          maxLength={500}
          className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
          data-testid="school-reg-reject-reason"
        />
      </label>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("approve")}
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
          data-testid="school-reg-approve"
        >
          {busy === "approve" ? "מעבד…" : ADMIN_APPROVE_ACTION}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("reject")}
          className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
          data-testid="school-reg-reject"
        >
          {busy === "reject" ? "מעבד…" : ADMIN_REJECT_ACTION}
        </button>
      </div>
      {message ? <p className="text-emerald-300 text-sm mt-2">{message}</p> : null}
      {error ? <p className="text-red-300 text-sm mt-2">{error}</p> : null}
    </section>
  );
}
