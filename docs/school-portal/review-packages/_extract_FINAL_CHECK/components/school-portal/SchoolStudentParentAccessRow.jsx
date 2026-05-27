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

export default function SchoolStudentParentAccessRow({ row, busy, onResetPin, onBlock, onUnblock, onRevoke, onUnlink }) {
  const canAct = row.status === "active" || row.status === "blocked";

  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-right space-y-2">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-mono text-white/90">{row.loginUsername || "—"}</span>
        <span className="text-white/60">{statusLabel(row.status)}</span>
      </div>
      {row.displayLabel || row.relation ? (
        <p className="text-white/55 text-xs">
          {row.displayLabel || RELATION_LABEL[row.relation] || row.relation}
        </p>
      ) : null}
      <p className="text-xs text-white/45">
        {row.mustChangePin ? SC_MUST_CHANGE_PIN_PENDING : SC_MUST_CHANGE_PIN_DONE}
      </p>
      {canAct ? (
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onResetPin(row)}
            className="rounded border border-white/20 px-2 py-1 text-xs"
          >
            {SC_BTN_RESET_PIN}
          </button>
          {row.status === "active" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onBlock(row)}
              className="rounded border border-white/20 px-2 py-1 text-xs"
            >
              {SC_BTN_BLOCK}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnblock(row)}
              className="rounded border border-white/20 px-2 py-1 text-xs"
            >
              {SC_BTN_UNBLOCK}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(SC_CONFIRM_DISCONNECT_PARENT)) onUnlink(row);
            }}
            className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-200"
          >
            {SC_BTN_DISCONNECT_PARENT}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(SC_CONFIRM_REVOKE_PARENT)) onRevoke(row);
            }}
            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
          >
            {SC_BTN_REVOKE}
          </button>
        </div>
      ) : null}
    </div>
  );
}
