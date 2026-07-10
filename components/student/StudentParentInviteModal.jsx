import { useEffect, useId, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import CopyConfirmPopup from "../ui/CopyConfirmPopup.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  buildParentInviteMessageHe,
  getParentPortalUrl,
} from "../../lib/site/public-site-origin.client.js";
import {
  COPY_INVITE_ERROR_MESSAGE_HE,
  COPY_INVITE_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";

export default function StudentParentInviteModal({ open, onClose }) {
  const { homeModalShell, isBright } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [copyPopupOpen, setCopyPopupOpen] = useState(false);
  const [copyPopupMessage, setCopyPopupMessage] = useState("");
  const [copyPopupIsError, setCopyPopupIsError] = useState(false);

  const parentUrl = getParentPortalUrl();

  useEffect(() => {
    if (!open) {
      setCopyFeedback("");
      setCopyPopupOpen(false);
      return undefined;
    }
    closeRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!copyFeedback) return undefined;
    const timer = window.setTimeout(() => setCopyFeedback(""), 2200);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  if (!open) return null;

  const mutedText = isBright ? "text-slate-600" : "text-white/75";
  const bodyText = isBright ? "text-slate-800" : "text-white/90";
  const linkClass = isBright
    ? "text-sky-700 underline break-all hover:text-sky-800"
    : "text-amber-300 underline break-all hover:text-amber-200";
  const actionBtn = isBright
    ? "w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100 transition"
    : "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition";
  const closeBtn = isBright
    ? "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
    : "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10 transition";

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(parentUrl);
    if (ok) setCopyFeedback("הקישור הועתק");
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(buildParentInviteMessageHe());
    if (ok) {
      setCopyPopupIsError(false);
      setCopyPopupMessage(COPY_INVITE_SUCCESS_MESSAGE_HE);
    } else {
      setCopyPopupIsError(true);
      setCopyPopupMessage(COPY_INVITE_ERROR_MESSAGE_HE);
    }
    setCopyPopupOpen(true);
  };

  return (
    <>
      <div
        className={homeModalShell.overlay}
        role="presentation"
        onClick={onClose}
        data-testid="student-parent-invite-modal"
      >
        <div
          className={`${homeModalShell.panel} w-full max-h-[90vh] overflow-y-auto overflow-x-hidden md:max-w-2xl md:max-h-none md:overflow-hidden`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          dir="rtl"
          lang="he"
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              isBright ? "border-sky-100 bg-white" : "border-white/10 bg-black/30"
            }`}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={homeModalShell.closeBtn}
              aria-label="סגור"
              data-testid="student-parent-invite-close"
            >
              ✕
            </button>
            <h2 id={titleId} className={`text-lg font-bold text-right flex-1 ${bodyText}`}>
              הורה יקר 👋
            </h2>
          </header>

          <div
            className={`${homeModalShell.body} space-y-4 text-center md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-4 md:overflow-visible md:flex-none md:space-y-0 md:text-right`}
          >
            <p className={`text-sm leading-relaxed ${bodyText} md:col-start-1 md:row-start-1 md:text-right`}>
              כדי לפתוח חשבון לילד/ה,
              <br />
              סרקו את הקוד עם הטלפון:
            </p>

            <div className="flex justify-center md:col-start-2 md:row-start-1 md:row-span-4 md:self-center">
              <div
                className={`rounded-xl p-3 ${
                  isBright ? "bg-white border border-slate-200 shadow-sm" : "bg-white"
                }`}
              >
                <QRCodeSVG
                  value={parentUrl}
                  size={200}
                  level="M"
                  includeMargin
                  aria-label="קוד QR לעמוד ההורים"
                />
              </div>
            </div>

            <div className="space-y-1 text-sm md:col-start-1 md:row-start-2 md:text-right">
              <p className={mutedText}>או היכנסו ל:</p>
              <a
                href={parentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                data-testid="student-parent-invite-link"
              >
                {parentUrl}
              </a>
            </div>

            <div className="space-y-2 pt-1 md:col-start-1 md:row-start-3 md:pt-0">
              <button
                type="button"
                className={actionBtn}
                onClick={() => void handleCopyLink()}
                data-testid="student-parent-invite-copy-link"
              >
                העתק קישור
              </button>
              <button
                type="button"
                className={actionBtn}
                onClick={() => void handleCopyMessage()}
                data-testid="student-parent-invite-copy-message"
              >
                העתק הודעה להורה
              </button>
              <button type="button" className={closeBtn} onClick={onClose}>
                סגור
              </button>
            </div>

            {copyFeedback ? (
              <p
                className={`text-sm font-medium md:col-start-1 md:row-start-4 ${isBright ? "text-emerald-700" : "text-emerald-300"}`}
                role="status"
                aria-live="polite"
              >
                {copyFeedback}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <CopyConfirmPopup
        open={copyPopupOpen}
        onClose={() => setCopyPopupOpen(false)}
        message={copyPopupMessage}
        isError={copyPopupIsError}
        bright={isBright}
        autoCloseMs={5000}
        lockBodyScroll={false}
        testId="student-parent-invite-copy-popup"
      />
    </>
  );
}
