import { useCallback, useEffect, useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import AdminModal, { AdminModalButton } from "./AdminModal.jsx";
import {
  ADMIN_LIFECYCLE_DELETE,
  ADMIN_LIFECYCLE_DELETE_BLOCKED,
  ADMIN_LIFECYCLE_DELETE_BUSY,
  ADMIN_LIFECYCLE_DELETE_CANCEL,
  ADMIN_LIFECYCLE_DELETE_CONFIRM_LABEL,
  ADMIN_LIFECYCLE_DELETE_PROTECTED,
  ADMIN_LIFECYCLE_DELETE_SUBMIT,
  ADMIN_LIFECYCLE_DELETE_SUCCESS,
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  apiErrorMessageHe,
  formatAdminDependencyLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * Shared main-admin hard-delete UI (preview + confirm code).
 * @param {{
 *   accessToken: string,
 *   userId: string,
 *   targetEmail?: string|null,
 *   onDeleted?: () => void,
 *   variant?: "default" | "compact",
 *   disabled?: boolean,
 *   triggerTestId?: string,
 * }} props
 */
export default function AdminUserDeleteSection({
  accessToken,
  userId,
  targetEmail = null,
  onDeleted,
  variant = "default",
  disabled = false,
  triggerTestId = "lifecycle-delete",
}) {
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPreview = useCallback(async () => {
    if (!accessToken || !userId) return;
    try {
      const previewRes = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(userId)}/delete-preview`
      );
      const previewJson = await previewRes.json().catch(() => ({}));
      if (previewRes.ok && previewJson?.data) {
        setDeletePreview(previewJson.data);
      } else {
        setDeletePreview(null);
      }
    } catch {
      setDeletePreview(null);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const closeConfirm = () => {
    if (busy) return;
    setDeleteConfirmOpen(false);
    setDeleteConfirmCode("");
    setError("");
  };

  const runDelete = async () => {
    if (!accessToken || !deleteConfirmCode.trim()) return;

    setBusy(true);
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
              .map((b) => {
                const label = formatAdminDependencyLabelHe(b.table);
                return `${label}${b.count != null ? `: ${b.count}` : ""}`;
              })
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
      setBusy(false);
    }
  };

  const showDeleteButton = deletePreview?.fullDeleteReady && !deleteConfirmOpen;
  const showDeleteProtectedNote =
    deletePreview?.actorIsMainAdmin && !deletePreview?.deletable && deletePreview?.protectionCode;

  const deleteButtonClass =
    variant === "compact"
      ? "text-red-300 hover:underline disabled:opacity-50"
      : "rounded-lg border border-red-500/50 bg-red-600/20 hover:bg-red-600/30 px-3 py-1.5 text-sm disabled:opacity-50";

  return (
    <div data-testid="admin-user-delete-section" data-variant={variant}>
      {showDeleteButton ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => {
            setDeleteConfirmOpen(true);
            setDeleteConfirmCode("");
            setError("");
          }}
          className={deleteButtonClass}
          data-testid={triggerTestId}
        >
          {ADMIN_LIFECYCLE_DELETE}
        </button>
      ) : null}

      <AdminModal
        open={deleteConfirmOpen}
        onClose={closeConfirm}
        title={ADMIN_LIFECYCLE_DELETE}
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closeConfirm} disabled={busy} data-testid="lifecycle-delete-cancel">
              {ADMIN_LIFECYCLE_DELETE_CANCEL}
            </AdminModalButton>
            <AdminModalButton
              variant="danger"
              onClick={() => void runDelete()}
              disabled={busy || !deleteConfirmCode.trim()}
              busy={busy}
              busyLabel={ADMIN_LIFECYCLE_DELETE_BUSY}
              data-testid="lifecycle-delete-submit"
            >
              {ADMIN_LIFECYCLE_DELETE_SUBMIT}
            </AdminModalButton>
          </>
        }
      >
        <div className="space-y-3 text-sm" data-testid="lifecycle-delete-confirm">
          <p className="text-white/80">{ADMIN_LIFECYCLE_DELETE_CONFIRM_LABEL}</p>
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
                  {formatAdminDependencyLabelHe(b.table)}
                  {b.count != null ? `: ${b.count}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
        </div>
      </AdminModal>

      {showDeleteProtectedNote ? (
        <p
          className={variant === "compact" ? "text-white/50 text-xs mt-1" : "text-white/50 text-xs mt-3"}
          data-testid="lifecycle-delete-protected"
        >
          {ADMIN_LIFECYCLE_DELETE_PROTECTED}
        </p>
      ) : null}

      {message ? (
        <p className={variant === "compact" ? "text-emerald-300 text-xs mt-1" : "text-emerald-300 text-sm mt-3"}>
          {message}
        </p>
      ) : null}
      {error && !deleteConfirmOpen ? (
        <p className={variant === "compact" ? "text-red-300 text-xs mt-1" : "text-red-300 text-sm mt-3"}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
