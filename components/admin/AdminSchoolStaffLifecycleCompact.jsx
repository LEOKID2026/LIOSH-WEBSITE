import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import { schoolMembershipRoleToPersona } from "../../lib/admin-portal/admin-lifecycle-ui.js";
import AdminUserDeleteSection from "./AdminUserDeleteSection.jsx";
import AdminModal, { AdminModalButton } from "./AdminModal.jsx";
import {
  ADMIN_LIFECYCLE_BUSY,
  ADMIN_LIFECYCLE_CONFIRM_REVOKE,
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  ADMIN_LIFECYCLE_REACTIVATE,
  ADMIN_LIFECYCLE_REVOKE,
  ADMIN_LIFECYCLE_SUSPEND,
  apiErrorMessageHe,
  entitlementStatusLabelHe,
  personaLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{
 *   accessToken: string,
 *   teacherId: string,
 *   role: string,
 *   targetEmail?: string|null,
 *   onChanged?: () => void,
 *   onDeleted?: () => void,
 * }} props
 */
export default function AdminSchoolStaffLifecycleCompact({
  accessToken,
  teacherId,
  role,
  targetEmail = null,
  onChanged,
  onDeleted,
}) {
  const persona = schoolMembershipRoleToPersona(role);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await adminAuthFetch(
      accessToken,
      `/api/admin/users/${encodeURIComponent(teacherId)}/lifecycle`
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const ent = (json?.data?.entitlements || []).find((e) => e.persona === persona);
      setStatus(ent?.status || "none");
    }
  }, [accessToken, teacherId, persona]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(teacherId)}/lifecycle`,
        { method: "POST", body: JSON.stringify({ action, persona }) }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "הפעולה נכשלה"));
        return;
      }
      setStatus(json?.data?.entitlement?.status || status);
      setRevokeConfirmOpen(false);
      onChanged?.();
      await loadStatus();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const canSuspend = status === "active";
  const canReactivate =
    status === "suspended" || status === "revoked" || status === "rejected";
  const canRevoke = status === "active" || status === "suspended";

  return (
    <div className="text-xs mt-2 space-y-1" data-testid="school-staff-lifecycle">
      <p className="text-white/50">
        {personaLabelHe(persona)} · {entitlementStatusLabelHe(status)}
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        {canSuspend ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("suspend")}
            className="text-amber-300 hover:underline disabled:opacity-50"
          >
            {busy ? ADMIN_LIFECYCLE_BUSY : ADMIN_LIFECYCLE_SUSPEND}
          </button>
        ) : null}
        {canReactivate ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("reactivate")}
            className="text-emerald-300 hover:underline disabled:opacity-50"
          >
            {ADMIN_LIFECYCLE_REACTIVATE}
          </button>
        ) : null}
        {canRevoke ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setRevokeConfirmOpen(true)}
            className="text-red-300 hover:underline disabled:opacity-50"
          >
            {ADMIN_LIFECYCLE_REVOKE}
          </button>
        ) : null}
      </div>
      <AdminUserDeleteSection
        accessToken={accessToken}
        userId={teacherId}
        targetEmail={targetEmail}
        variant="compact"
        disabled={busy}
        onDeleted={() => {
          onDeleted?.();
          onChanged?.();
        }}
      />
      {error ? <span className="text-red-300 block">{error}</span> : null}

      <AdminModal
        open={revokeConfirmOpen}
        onClose={() => {
          if (!busy) setRevokeConfirmOpen(false);
        }}
        title={ADMIN_LIFECYCLE_REVOKE}
        size="sm"
        footer={
          <>
            <AdminModalButton onClick={() => setRevokeConfirmOpen(false)} disabled={busy}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant="danger"
              onClick={() => void run("revoke")}
              disabled={busy}
              busy={busy}
              busyLabel={ADMIN_LIFECYCLE_BUSY}
            >
              {ADMIN_LIFECYCLE_REVOKE}
            </AdminModalButton>
          </>
        }
      >
        <p className="text-sm text-white/80">{ADMIN_LIFECYCLE_CONFIRM_REVOKE}</p>
      </AdminModal>
    </div>
  );
}
