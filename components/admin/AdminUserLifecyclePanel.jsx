import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LIFECYCLE_ACCOUNT_STATUS,
  ADMIN_LIFECYCLE_BUSY,
  ADMIN_LIFECYCLE_CONFIRM_REVOKE,
  ADMIN_LIFECYCLE_ENTITLEMENT_STATUS,
  ADMIN_LIFECYCLE_LOADING,
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  ADMIN_LIFECYCLE_REACTIVATE,
  ADMIN_LIFECYCLE_REVOKE,
  ADMIN_LIFECYCLE_SECTION,
  ADMIN_LIFECYCLE_SUSPEND,
  ADMIN_LIFECYCLE_TEACHER_LIMITS,
  ADMIN_NO,
  ADMIN_YES,
  accountStatusLabelHe,
  apiErrorMessageHe,
  entitlementStatusLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";
import {
  ADMIN_APPROVE_ACTION,
  ADMIN_REJECT_ACTION,
} from "../../lib/auth/auth-registration.he.js";
import AdminUserDeleteSection from "./AdminUserDeleteSection.jsx";
import AdminModal, { AdminModalButton } from "./AdminModal.jsx";

function statusBadgeClass(status) {
  if (status === "active") return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
  if (status === "suspended") return "bg-amber-500/20 text-amber-200 border-amber-400/30";
  if (status === "pending") return "bg-sky-500/20 text-sky-200 border-sky-400/30";
  if (status === "rejected") return "bg-red-500/20 text-red-200 border-red-400/30";
  if (status === "revoked" || status === "cancelled") {
    return "bg-red-500/20 text-red-200 border-red-400/30";
  }
  return "bg-white/10 text-white/60 border-white/15";
}

/**
 * @param {{
 *   accessToken: string,
 *   userId: string,
 *   persona: string,
 *   accountStatus?: string|null,
 *   targetEmail?: string|null,
 *   onChanged?: () => void,
 *   onDeleted?: () => void,
 * }} props
 */
export default function AdminUserLifecyclePanel({
  accessToken,
  userId,
  persona,
  accountStatus = null,
  targetEmail = null,
  onChanged,
  onDeleted,
}) {
  const [entitlement, setEntitlement] = useState(null);
  const [teacherActive, setTeacherActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !userId) return;
    setLoading(true);
    setError("");
    try {
      const lifecycleRes = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(userId)}/lifecycle`
      );
      const lifecycleJson = await lifecycleRes.json().catch(() => ({}));

      if (!lifecycleRes.ok) {
        setError(apiErrorMessageHe(lifecycleJson?.error, "שגיאה בטעינה"));
        return;
      }

      const ents = lifecycleJson?.data?.entitlements || [];
      setEntitlement(ents.find((e) => e.persona === persona) || null);
      setTeacherActive(lifecycleJson?.data?.teacherIsAccountActive);
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId, persona]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action) => {
    if (!accessToken) return;

    setBusy(action);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(userId)}/lifecycle`,
        {
          method: "POST",
          body: JSON.stringify({ action, persona }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הפעולה נכשלה"));
        return;
      }
      if (json?.data?.entitlement) setEntitlement(json.data.entitlement);
      if (json?.data?.isAccountActive != null) setTeacherActive(json.data.isAccountActive);
      if (json?.data?.passwordSetup?.ok) {
        setMessage("הבקשה אושרה · קישור להגדרת סיסמה נשלח");
      }
      setRevokeConfirmOpen(false);
      onChanged?.();
      await load();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy("");
    }
  };

  const entStatus = entitlement?.status || "none";
  const canSuspend = entStatus === "active";
  const canApprovePending = entStatus === "pending";
  const canRejectPending = entStatus === "pending";
  const canReactivate =
    entStatus === "suspended" || entStatus === "revoked" || entStatus === "rejected";
  const canRevoke = entStatus === "active" || entStatus === "suspended";

  return (
    <section
      className="rounded-xl border border-white/15 bg-black/20 p-5 text-right mb-6"
      data-testid="admin-lifecycle-panel"
      data-persona={persona}
    >
      <h2 className="text-base font-semibold mb-3">{ADMIN_LIFECYCLE_SECTION}</h2>
      {loading ? (
        <p className="text-white/50 text-sm">{ADMIN_LIFECYCLE_LOADING}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <div>
              <p className="text-white/50 text-xs mb-1">{ADMIN_LIFECYCLE_ENTITLEMENT_STATUS}</p>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs border ${statusBadgeClass(entStatus)}`}
                data-testid="lifecycle-entitlement-status"
              >
                {entitlementStatusLabelHe(entStatus)}
              </span>
            </div>
            {accountStatus != null ? (
              <div>
                <p className="text-white/50 text-xs mb-1">{ADMIN_LIFECYCLE_ACCOUNT_STATUS}</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs border ${statusBadgeClass(accountStatus)}`}
                  data-testid="lifecycle-account-status"
                >
                  {accountStatusLabelHe(accountStatus)}
                </span>
              </div>
            ) : null}
            {persona === "private_teacher" && teacherActive != null ? (
              <div>
                <p className="text-white/50 text-xs mb-1">{ADMIN_LIFECYCLE_TEACHER_LIMITS}</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs border ${
                    teacherActive ? statusBadgeClass("active") : statusBadgeClass("suspended")
                  }`}
                >
                  {teacherActive ? ADMIN_YES : ADMIN_NO}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {canApprovePending ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runAction("reactivate")}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-approve"
              >
                {busy === "reactivate" ? ADMIN_LIFECYCLE_BUSY : ADMIN_APPROVE_ACTION}
              </button>
            ) : null}
            {canRejectPending ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runAction("reject")}
                className="rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-reject"
              >
                {busy === "reject" ? ADMIN_LIFECYCLE_BUSY : ADMIN_REJECT_ACTION}
              </button>
            ) : null}
            {canSuspend ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runAction("suspend")}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-suspend"
              >
                {busy === "suspend" ? ADMIN_LIFECYCLE_BUSY : ADMIN_LIFECYCLE_SUSPEND}
              </button>
            ) : null}
            {canReactivate ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void runAction("reactivate")}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-reactivate"
              >
                {busy === "reactivate" ? ADMIN_LIFECYCLE_BUSY : ADMIN_LIFECYCLE_REACTIVATE}
              </button>
            ) : null}
            {canRevoke ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setRevokeConfirmOpen(true)}
                className="rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-revoke"
              >
                {ADMIN_LIFECYCLE_REVOKE}
              </button>
            ) : null}
          </div>

          <AdminUserDeleteSection
            accessToken={accessToken}
            userId={userId}
            targetEmail={targetEmail}
            onDeleted={onDeleted}
            disabled={!!busy}
          />

          {message ? <p className="text-emerald-300 text-sm mt-3">{message}</p> : null}
          {error ? <p className="text-red-300 text-sm mt-3">{error}</p> : null}

          <AdminModal
            open={revokeConfirmOpen}
            onClose={() => {
              if (!busy) setRevokeConfirmOpen(false);
            }}
            title={ADMIN_LIFECYCLE_REVOKE}
            size="sm"
            footer={
              <>
                <AdminModalButton onClick={() => setRevokeConfirmOpen(false)} disabled={!!busy}>
                  ביטול
                </AdminModalButton>
                <AdminModalButton
                  variant="danger"
                  onClick={() => void runAction("revoke")}
                  disabled={!!busy}
                  busy={busy === "revoke"}
                  busyLabel={ADMIN_LIFECYCLE_BUSY}
                >
                  {ADMIN_LIFECYCLE_REVOKE}
                </AdminModalButton>
              </>
            }
          >
            <p className="text-sm text-white/80">{ADMIN_LIFECYCLE_CONFIRM_REVOKE}</p>
          </AdminModal>
        </>
      )}
    </section>
  );
}
