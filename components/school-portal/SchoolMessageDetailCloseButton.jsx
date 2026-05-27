import { SchoolSecondaryButton } from "./SchoolPortalUi";
import { SC_BTN_CLOSE_MESSAGE_DETAIL } from "../../lib/school-portal/school-communication.he";

/**
 * Closes an opened school message detail panel; list state stays on the page.
 */
export default function SchoolMessageDetailCloseButton({ onClose, className = "" }) {
  if (typeof onClose !== "function") return null;
  return (
    <div className={`flex justify-end ${className}`}>
      <SchoolSecondaryButton
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto min-h-[2.5rem] px-4 py-2 text-sm"
      >
        {SC_BTN_CLOSE_MESSAGE_DETAIL}
      </SchoolSecondaryButton>
    </div>
  );
}
