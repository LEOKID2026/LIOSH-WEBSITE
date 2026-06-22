import { useState } from "react";
import CopyConfirmPopup from "../ui/CopyConfirmPopup.jsx";
import { buildTeacherReferralInviteMessageHe } from "../../lib/site/public-site-origin.client.js";
import {
  COPY_INVITE_ERROR_MESSAGE_HE,
  COPY_INVITE_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";

/** Teacher dashboard — copy invite message + centered popup (same flow as parent dashboard). */
export default function TeacherInviteOthersButton({ bright = false }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIsError, setPopupIsError] = useState(false);

  const handleClick = async () => {
    const ok = await copyTextToClipboard(buildTeacherReferralInviteMessageHe());
    if (ok) {
      setPopupIsError(false);
      setPopupMessage(COPY_INVITE_SUCCESS_MESSAGE_HE);
    } else {
      setPopupIsError(true);
      setPopupMessage(COPY_INVITE_ERROR_MESSAGE_HE);
    }
    setPopupOpen(true);
  };

  return (
    <>
      <div className="flex flex-col items-center pt-2 md:pt-3">
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-amber-500 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-indigo-900/30 transition hover:from-indigo-600 hover:via-violet-700 hover:to-amber-600 md:w-auto md:px-5 md:py-2.5 md:text-sm"
          data-testid="teacher-invite-others-btn"
        >
          הזמן הורים ומורים נוספים
        </button>
      </div>

      <CopyConfirmPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        message={popupMessage}
        isError={popupIsError}
        bright={bright}
        autoCloseMs={3000}
        zIndexClass="z-[170]"
        testId="teacher-invite-others-popup"
      />
    </>
  );
}
