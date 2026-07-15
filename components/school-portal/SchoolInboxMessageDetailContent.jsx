import SchoolMessageConfirmationActions from "./SchoolMessageConfirmationActions";

export default function SchoolInboxMessageDetailContent({
  message,
  senderLine = "",
  markBusy = false,
  onMarkRead,
}) {
  if (!message) return null;

  const sentLabel = message.sentAt ? new Date(message.sentAt).toLocaleString("he-IL") : "";

  return (
    <>
      <h2 id="school-message-detail-title" className="text-lg font-bold leading-snug">
        {message.subject || "הודעה"}
      </h2>
      {senderLine ? <p className="text-xs text-amber-200/90">{senderLine}</p> : null}
      {sentLabel ? <p className="text-xs text-white/50">{sentLabel}</p> : null}
      <p className="text-sm text-white/85 whitespace-pre-wrap">{message.body || "-"}</p>
      <SchoolMessageConfirmationActions message={message} busy={markBusy} onMarkRead={onMarkRead} />
    </>
  );
}
