import { SchoolSecondaryButton, SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi";
import { SC_BTN_CLOSE_MESSAGE_DETAIL } from "../../lib/school-portal/school-communication.he";

/**
 * Centered school messaging detail overlay (RTL, dark/gold).
 */
export default function SchoolMessageDetailModal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-message-detail-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#1a1208] text-right shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end shrink-0 border-b border-white/10 px-4 py-3">
          <SchoolSecondaryButton
            type="button"
            onClick={onClose}
            className="min-h-[2.5rem] px-4 py-2 text-sm"
          >
            {SC_BTN_CLOSE_MESSAGE_DETAIL}
          </SchoolSecondaryButton>
        </div>
        <div
          className={`overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 min-h-0 ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
