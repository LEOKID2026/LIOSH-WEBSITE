import {
  SC_RECEIPTS_PANEL_TITLE,
  SC_RECEIPTS_READ_COUNT,
  SC_RECEIPTS_STATUS_CONFIRMED,
  SC_RECEIPTS_STATUS_READ,
  SC_RECEIPTS_STATUS_UNREAD,
  SC_RECEIPTS_TAB_PARENTS,
  SC_RECEIPTS_TAB_TEACHERS,
} from "../../lib/school-portal/school-communication.he";
import {
  formatSchoolMessageAudienceLabel,
  schoolMessageHasParentRecipients,
  schoolMessageHasTeacherRecipients,
  schoolMessageReadCountForTab,
} from "../../lib/school-portal/school-messaging-ui";
import { SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi";

export default function SchoolManagerMessageDetailContent({
  detail,
  recipients = [],
  receiptTab,
  onReceiptTabChange,
}) {
  if (!detail) return null;

  const sentLabel = detail.sentAt ? new Date(detail.sentAt).toLocaleString("he-IL") : "";

  return (
    <>
      <h2 id="school-message-detail-title" className="text-lg font-bold leading-snug">
        {detail.subject || SC_RECEIPTS_PANEL_TITLE}
      </h2>
      <p className="text-xs text-white/50">
        {formatSchoolMessageAudienceLabel(detail.audienceType, detail.audienceScope)}
        {sentLabel ? ` · ${sentLabel}` : ""}
      </p>
      <p className="text-sm text-white/85 whitespace-pre-wrap">{detail.body || "-"}</p>
      <p className="text-sm text-amber-200">
        {SC_RECEIPTS_READ_COUNT(
          schoolMessageReadCountForTab(receiptTab, detail).read,
          schoolMessageReadCountForTab(receiptTab, detail).total
        )}
        {detail.recipientCount != null ? ` · ${detail.recipientCount} נמענים` : ""}
      </p>
      {schoolMessageHasParentRecipients(detail) || schoolMessageHasTeacherRecipients(detail) ? (
        <div className="flex flex-wrap gap-2">
          {schoolMessageHasParentRecipients(detail) ? (
            <button
              type="button"
              className={`cursor-pointer ${
                receiptTab === "parent" ? "text-amber-200 font-semibold" : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => onReceiptTabChange("parent")}
            >
              {SC_RECEIPTS_TAB_PARENTS}
            </button>
          ) : null}
          {schoolMessageHasTeacherRecipients(detail) ? (
            <button
              type="button"
              className={`cursor-pointer ${
                receiptTab === "teacher" ? "text-amber-200 font-semibold" : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => onReceiptTabChange("teacher")}
            >
              {SC_RECEIPTS_TAB_TEACHERS}
            </button>
          ) : null}
        </div>
      ) : null}
      {recipients.length ? (
        <ul
          className={`text-sm space-y-0 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-black/25 py-2 ps-2 pe-3 ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}
        >
          {recipients.map((r) => {
            const requiresConfirmation = detail.messageType === "requires_confirmation";
            const statusLabel = requiresConfirmation && r.isRead
              ? SC_RECEIPTS_STATUS_CONFIRMED
              : r.isRead
                ? SC_RECEIPTS_STATUS_READ
                : SC_RECEIPTS_STATUS_UNREAD;
            const statusColorClass =
              statusLabel === SC_RECEIPTS_STATUS_UNREAD
                ? "text-red-300"
                : "text-emerald-300";
            return (
              <li
                key={r.recipientId || `${r.recipientType}-${r.guardianAccessId || r.recipientUserId}`}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-white/5 last:border-0 py-2 px-1"
              >
                <span className="min-w-0 break-words text-white/90">
                  {r.displayName || r.recipientId || "-"}
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap text-sm sm:text-left ps-1 ${statusColorClass}`}
                >
                  {statusLabel}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
