import { useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import AdminPasswordSetupPanel from "./AdminPasswordSetupPanel.jsx";
import AdminModal, { AdminModalButton } from "./AdminModal.jsx";
import {
  ADMIN_APPROVE_ACTION,
  ADMIN_APPROVED_SUCCESS,
  ADMIN_REG_REQUEST_PHONE,
  ADMIN_REJECT_ACTION,
  ADMIN_REJECT_REASON_LABEL,
  ADMIN_REJECTED_SUCCESS,
  ADMIN_STATUS_PENDING,
} from "../../lib/auth/auth-registration.he.js";
import {
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  adminFormatDateHe,
  apiErrorMessageHe,
  entitlementStatusLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{ accessToken: string, school: object, registrationRequest?: object|null, onChanged?: () => void }} props
 */
export default function AdminSchoolRegistrationPanel({
  accessToken,
  school,
  registrationRequest = null,
  onChanged,
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const req = registrationRequest;
  const isPendingSchool = school?.isActive === false;

  const closeConfirm = () => {
    if (busy) return;
    setConfirmAction(null);
    setError("");
  };

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
      if (action === "approve") {
        const setupMsg =
          json?.data?.passwordSetup?.ok === true
            ? " · קישור להגדרת סיסמה נשלח לאיש קשר"
            : "";
        setMessage(`${ADMIN_APPROVED_SUCCESS}${setupMsg}`);
      } else {
        setMessage(ADMIN_REJECTED_SUCCESS);
      }
      setConfirmAction(null);
      onChanged?.();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy("");
    }
  };

  if (!req && !isPendingSchool) return null;

  const confirmTitle =
    confirmAction === "approve" ? "אישור בקשת רישום" : "דחיית בקשת רישום";

  return (
    <div className="space-y-4 mb-6">
      {req ? (
        <section
          className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-right"
          data-testid="admin-school-registration-request"
        >
          <h2 className="font-semibold mb-3">פרטי בקשת רישום</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-white/50">סטטוס: </span>
              {entitlementStatusLabelHe(req.status)}
            </p>
            <p>
              <span className="text-white/50">נשלח: </span>
              {adminFormatDateHe(req.createdAt)}
            </p>
            <p>
              <span className="text-white/50">איש קשר: </span>
              {req.contactName || "-"}
            </p>
            <p>
              <span className="text-white/50">דוא״ל: </span>
              {req.contactEmail || "-"}
            </p>
            {req.contactPhone ? (
              <p>
                <span className="text-white/50">{ADMIN_REG_REQUEST_PHONE}: </span>
                {req.contactPhone}
              </p>
            ) : null}
            {req.approxTeachers != null ? (
              <p>
                <span className="text-white/50">מורים משוער: </span>
                {req.approxTeachers}
              </p>
            ) : null}
            {req.approxStudents != null ? (
              <p>
                <span className="text-white/50">ילדים משוער: </span>
                {req.approxStudents}
              </p>
            ) : null}
            {req.message ? (
              <div>
                <p className="text-white/50 text-xs mb-1">הערות</p>
                <p className="text-white/85 whitespace-pre-wrap">{req.message}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {isPendingSchool ? (
        <section
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-right"
          data-testid="admin-school-registration-panel"
        >
          <h2 className="font-semibold mb-2">{ADMIN_STATUS_PENDING}</h2>
          <p className="text-sm text-white/70 mb-4">
            בית ספר זה נרשם וממתין לאישור מנהל/ת המערכת.
          </p>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                setError("");
                setConfirmAction("approve");
              }}
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
              data-testid="school-reg-approve"
            >
              {ADMIN_APPROVE_ACTION}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                setError("");
                setConfirmAction("reject");
              }}
              className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
              data-testid="school-reg-reject"
            >
              {ADMIN_REJECT_ACTION}
            </button>
          </div>
          {message ? <p className="text-emerald-300 text-sm mt-2">{message}</p> : null}
          {error && !confirmAction ? <p className="text-red-300 text-sm mt-2">{error}</p> : null}
        </section>
      ) : null}

      <AdminModal
        open={!!confirmAction}
        onClose={closeConfirm}
        title={confirmTitle}
        size="md"
        footer={
          <>
            <AdminModalButton onClick={closeConfirm} disabled={!!busy}>
              ביטול
            </AdminModalButton>
            <AdminModalButton
              variant={confirmAction === "reject" ? "danger" : "primary"}
              onClick={() => void run(confirmAction)}
              disabled={!!busy}
              busy={busy === confirmAction}
              busyLabel="מעבד…"
              data-testid={confirmAction === "approve" ? "school-reg-approve-submit" : "school-reg-reject-submit"}
            >
              {confirmAction === "approve" ? ADMIN_APPROVE_ACTION : ADMIN_REJECT_ACTION}
            </AdminModalButton>
          </>
        }
      >
        {confirmAction === "approve" ? (
          <p className="text-sm text-white/80">
            לאשר את בקשת הרישום של {school?.name || "בית הספר"}?
          </p>
        ) : (
          <label className="block text-sm">
            <span className="text-white/70">{ADMIN_REJECT_REASON_LABEL}</span>
            <input
              type="text"
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              maxLength={500}
              className="mt-2 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              data-testid="school-reg-reject-reason"
            />
          </label>
        )}
        {error && confirmAction ? <p className="text-red-300 text-sm mt-3">{error}</p> : null}
      </AdminModal>

      {req?.contactUserId && school?.isActive !== false ? (
        <AdminPasswordSetupPanel
          accessToken={accessToken}
          userId={req.contactUserId}
          passwordSetupSentAt={req.passwordSetupSentAt}
          passwordSetupLastError={req.passwordSetupLastError}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}
