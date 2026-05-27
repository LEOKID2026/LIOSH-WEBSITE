import { SchoolPrimaryButton } from "./SchoolPortalUi";
import {
  SC_BTN_MARK_READ,
  SC_BTN_MARK_RECEIVED,
  SC_CONFIRMED_RECEIPT,
} from "../../lib/school-portal/school-communication.he";

export default function SchoolMessageConfirmationActions({ message, busy = false, onMarkRead }) {
  const isRead = Boolean(message?.readAt || message?.isRead);
  const needsConfirmation = message?.messageType === "requires_confirmation";

  if (isRead && needsConfirmation) {
    return (
      <p className="text-sm font-semibold text-emerald-300 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
        {SC_CONFIRMED_RECEIPT}
      </p>
    );
  }

  if (isRead) {
    return null;
  }

  if (needsConfirmation) {
    return (
      <SchoolPrimaryButton
        type="button"
        disabled={busy}
        className="w-full"
        onClick={() => onMarkRead(message, true)}
      >
        {SC_BTN_MARK_RECEIVED}
      </SchoolPrimaryButton>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 px-4 py-2.5 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => onMarkRead(message, false)}
    >
      {SC_BTN_MARK_READ}
    </button>
  );
}
