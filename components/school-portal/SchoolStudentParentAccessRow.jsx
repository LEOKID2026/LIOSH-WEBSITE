import {
  SC_BTN_BLOCK,
  SC_BTN_DISCONNECT_PARENT,
  SC_BTN_RESET_PIN,
  SC_BTN_REVOKE,
  SC_BTN_UNBLOCK,
  SC_CONFIRM_DISCONNECT_PARENT,
  SC_CONFIRM_REVOKE_PARENT,
  SC_MUST_CHANGE_PIN_DONE,
  SC_MUST_CHANGE_PIN_PENDING,
  SC_RELATION_FATHER,
  SC_RELATION_GUARDIAN,
  SC_RELATION_MOTHER,
  SC_RELATION_OTHER,
  SC_STATUS_ACTIVE,
  SC_STATUS_BLOCKED,
  SC_STATUS_REVOKED,
} from "../../lib/school-portal/school-communication.he";
import { SCHOOL_PORTAL_BTN_CURSOR } from "./SchoolPortalUi";

const RELATION_LABEL = {
  mother: SC_RELATION_MOTHER,
  father: SC_RELATION_FATHER,
  guardian: SC_RELATION_GUARDIAN,
  other: SC_RELATION_OTHER,
};

function statusLabel(status) {
  if (status === "active") return SC_STATUS_ACTIVE;
  if (status === "blocked") return SC_STATUS_BLOCKED;
  if (status === "revoked") return SC_STATUS_REVOKED;
  return status;
}

function actionBtnClass(variant = "default") {
  const cursor = SCHOOL_PORTAL_BTN_CURSOR;
  if (variant === "danger") {
    return `rounded-lg border border-red-500/50 bg-red-950/30 text-red-200 px-3 py-2 text-sm font-medium disabled:opacity-50 ${cursor}`;
  }
  if (variant === "warn") {
    return `rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-2 text-sm font-medium disabled:opacity-50 ${cursor}`;
  }
  return `rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm disabled:opacity-50 ${cursor}`;
}

export default function SchoolStudentParentAccessRow({
  row,
  busy,
  readOnly = false,
  hint = "",
  onResetPin,
  onBlock,
  onUnblock,
  onRevoke,
  onUnlink,
}) {
  const canAct = !readOnly && (row.status === "active" || row.status === "blocked");

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-right space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-mono text-white/90 break-all">{row.loginUsername || "-"}</span>
        <span className="text-white/60 shrink-0">{statusLabel(row.status)}</span>
      </div>
      {row.displayLabel || row.relation ? (
        <p className="text-white/55 text-xs">
          {row.displayLabel || RELATION_LABEL[row.relation] || row.relation}
        </p>
      ) : null}
      {!readOnly ? (
        <p className="text-xs text-white/45">
          {row.mustChangePin ? SC_MUST_CHANGE_PIN_PENDING : SC_MUST_CHANGE_PIN_DONE}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-white/45 leading-relaxed">{hint}</p> : null}
      {canAct ? (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResetPin(row)}
              className={actionBtnClass()}
            >
              {SC_BTN_RESET_PIN}
            </button>
            {row.status === "active" ? (
              <button type="button" disabled={busy} onClick={() => onBlock(row)} className={actionBtnClass()}>
                {SC_BTN_BLOCK}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => onUnblock(row)} className={actionBtnClass()}>
                {SC_BTN_UNBLOCK}
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(SC_CONFIRM_DISCONNECT_PARENT)) onUnlink(row);
              }}
              className={actionBtnClass("warn")}
            >
              {SC_BTN_DISCONNECT_PARENT}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(SC_CONFIRM_REVOKE_PARENT)) onRevoke(row);
              }}
              className={actionBtnClass("danger")}
            >
              {SC_BTN_REVOKE}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
