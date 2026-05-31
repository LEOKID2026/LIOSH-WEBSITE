import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LIFECYCLE_ACCOUNT_STATUS,
  ADMIN_LIFECYCLE_BUSY,
  ADMIN_LIFECYCLE_CONFIRM_REVOKE,
  ADMIN_LIFECYCLE_DELETE,
  ADMIN_LIFECYCLE_DELETE_BLOCKED,
  ADMIN_LIFECYCLE_DELETE_BUSY,
  ADMIN_LIFECYCLE_DELETE_CANCEL,
  ADMIN_LIFECYCLE_DELETE_CONFIRM_LABEL,
  ADMIN_LIFECYCLE_DELETE_PROTECTED,
  ADMIN_LIFECYCLE_DELETE_SUBMIT,
  ADMIN_LIFECYCLE_DELETE_SUCCESS,
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
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !userId) return;
    setLoading(true);
    setError("");
    try {
      const [lifecycleRes, previewRes] = await Promise.all([
        adminAuthFetch(accessToken, `/api/admin/users/${encodeURIComponent(userId)}/lifecycle`),
        adminAuthFetch(
          accessToken,
          `/api/admin/users/${encodeURIComponent(userId)}/delete-preview`
        ),
      ]);
      const lifecycleJson = await lifecycleRes.json().catch(() => ({}));
      const previewJson = await previewRes.json().catch(() => ({}));

      if (!lifecycleRes.ok) {
        setError(apiErrorMessageHe(lifecycleJson?.error, "שגיאה בטעינה"));
        return;
      }

      const ents = lifecycleJson?.data?.entitlements || [];
      setEntitlement(ents.find((e) => e.persona === persona) || null);
      setTeacherActive(lifecycleJson?.data?.teacherIsAccountActive);

      if (previewRes.ok && previewJson?.data) {
        setDeletePreview(previewJson.data);
      } else {
        setDeletePreview(null);
      }
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
    if (action === "revoke" && !window.confirm(ADMIN_LIFECYCLE_CONFIRM_REVOKE)) return;

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
      onChanged?.();
      await load();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy("");
    }
  };

  const runDelete = async () => {
    if (!accessToken || !deleteConfirmCode.trim()) return;

    setBusy("delete");
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(userId)}/delete`,
        {
          method: "POST",
          body: JSON.stringify({ confirmCode: deleteConfirmCode.trim() }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const blockers = json?.error?.blockers;
        if (Array.isArray(blockers) && blockers.length) {
          setError(
            `${apiErrorMessageHe(json?.error, ADMIN_LIFECYCLE_DELETE_BLOCKED)} (${blockers
              .map((b) => `${b.table}${b.count != null ? `: ${b.count}` : ""}`)
              .join(", ")})`
          );
        } else {
          setError(apiErrorMessageHe(json?.error, ADMIN_LIFECYCLE_DELETE_BLOCKED));
        }
        return;
      }
      setMessage(ADMIN_LIFECYCLE_DELETE_SUCCESS);
      setDeleteConfirmOpen(false);
      setDeleteConfirmCode("");
      onDeleted?.();
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

  const showDeleteButton =
    deletePreview?.fullDeleteReady && !deleteConfirmOpen;
  const showDeleteProtectedNote =
    deletePreview?.actorIsMainAdmin && !deletePreview?.deletable && deletePreview?.protectionCode;

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
                onClick={() => void runAction("revoke")}
                className="rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-revoke"
              >
                {busy === "revoke" ? ADMIN_LIFECYCLE_BUSY : ADMIN_LIFECYCLE_REVOKE}
              </button>
            ) : null}
            {showDeleteButton ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  setDeleteConfirmOpen(true);
                  setDeleteConfirmCode("");
                  setError("");
                }}
                className="rounded-lg border border-red-500/50 bg-red-600/20 hover:bg-red-600/30 px-3 py-1.5 text-sm disabled:opacity-50"
                data-testid="lifecycle-delete"
              >
                {ADMIN_LIFECYCLE_DELETE}
              </button>
            ) : null}
          </div>

          {deleteConfirmOpen ? (
            <div
              className="mt-4 rounded-lg border border-red-400/30 bg-red-950/20 p-4 space-y-3"
              data-testid="lifecycle-delete-confirm"
            >
              <p className="text-sm text-white/80">{ADMIN_LIFECYCLE_DELETE_CONFIRM_LABEL}</p>
              {targetEmail || deletePreview?.email ? (
                <p className="text-xs text-white/50" dir="ltr">
                  {targetEmail || deletePreview?.email}
                </p>
              ) : null}
              <input
                type="password"
                value={deleteConfirmCode}
                onChange={(e) => setDeleteConfirmCode(e.target.value)}
                dir="ltr"
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
                data-testid="lifecycle-delete-confirm-code"
                autoComplete="off"
              />
              {Array.isArray(deletePreview?.blockers) && deletePreview.blockers.length > 0 ? (
                <ul className="text-xs text-amber-200/90 list-disc list-inside">
                  {deletePreview.blockers.map((b) => (
                    <li key={b.table}>
                      {b.table}
                      {b.count != null ? `: ${b.count}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmCode("");
                  }}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm"
                  data-testid="lifecycle-delete-cancel"
                >
                  {ADMIN_LIFECYCLE_DELETE_CANCEL}
                </button>
                <button
                  type="button"
                  disabled={!!busy || !deleteConfirmCode.trim()}
                  onClick={() => void runDelete()}
                  className="rounded-lg border border-red-500/50 bg-red-600/30 hover:bg-red-600/40 px-3 py-1.5 text-sm disabled:opacity-50"
                  data-testid="lifecycle-delete-submit"
                >
                  {busy === "delete" ? ADMIN_LIFECYCLE_DELETE_BUSY : ADMIN_LIFECYCLE_DELETE_SUBMIT}
                </button>
              </div>
            </div>
          ) : null}

          {showDeleteProtectedNote ? (
            <p className="text-white/50 text-xs mt-3" data-testid="lifecycle-delete-protected">
              {ADMIN_LIFECYCLE_DELETE_PROTECTED}
            </p>
          ) : null}

          {message ? <p className="text-emerald-300 text-sm mt-3">{message}</p> : null}
          {error ? <p className="text-red-300 text-sm mt-3">{error}</p> : null}
        </>
      )}
    </section>
  );
}
