import { SchoolPrimaryButton } from "./SchoolPortalUi";
import { SC_BTN_OPEN } from "../../lib/school-portal/school-communication.he";

/**
 * Mobile-friendly inbox row with explicit open action.
 */
export default function SchoolInboxMessageCard({
  message,
  messageId,
  onOpen,
  metaLine = "",
  readCountLine = "",
  disabled = false,
}) {
  const subject = message?.subject || "הודעה מבית הספר";
  const sentLabel = message?.sentAt ? new Date(message.sentAt).toLocaleString("he-IL") : "";
  const isUnread = !message?.readAt && !message?.isRead;

  return (
    <article className="rounded-xl border border-white/15 bg-white/5 p-4 text-right space-y-3">
      <div className="space-y-1">
        <h3 className="font-semibold text-base leading-snug">{subject}</h3>
        {sentLabel ? <p className="text-xs text-white/50">{sentLabel}</p> : null}
        {metaLine ? <p className="text-xs text-amber-200/80">{metaLine}</p> : null}
        {readCountLine ? <p className="text-xs text-white/55">{readCountLine}</p> : null}
        {isUnread ? <p className="text-xs text-amber-300 font-medium">חדש</p> : null}
      </div>
      <SchoolPrimaryButton
        type="button"
        disabled={disabled || !messageId}
        className="w-full sm:w-auto"
        onClick={() => onOpen(message)}
      >
        {SC_BTN_OPEN}
      </SchoolPrimaryButton>
    </article>
  );
}
