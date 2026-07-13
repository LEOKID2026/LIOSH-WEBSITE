import { useState } from "react";
import CopyConfirmPopup from "../ui/CopyConfirmPopup.jsx";
import { buildParentReferralInviteMessageHe } from "../../lib/site/public-site-origin.client.js";
import {
  COPY_INVITE_ERROR_MESSAGE_HE,
  COPY_INVITE_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";

/**
 * Share invite — copy message + centered popup confirmation.
 * @param {{ bright?: boolean, label?: string, className?: string, inline?: boolean }} props
 */
export default function ParentInviteOthersButton({
  bright = false,
  label = "הזמן הורים נוספים",
  className,
  inline = false,
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIsError, setPopupIsError] = useState(false);

  const handleClick = async () => {
    const ok = await copyTextToClipboard(buildParentReferralInviteMessageHe());
    if (ok) {
      setPopupIsError(false);
      setPopupMessage(COPY_INVITE_SUCCESS_MESSAGE_HE);
    } else {
      setPopupIsError(true);
      setPopupMessage(COPY_INVITE_ERROR_MESSAGE_HE);
    }
    setPopupOpen(true);
  };

  const defaultBtnClass = bright
    ? "inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-sky-600 to-teal-600 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-sky-200/50 transition hover:from-sky-600 hover:via-sky-700 hover:to-teal-700 md:w-auto md:px-5 md:py-2.5 md:text-sm"
    : "inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-6 py-3.5 text-base font-bold text-black shadow-md shadow-amber-900/30 transition hover:from-amber-300 hover:via-amber-400 hover:to-yellow-400 md:w-auto md:px-5 md:py-2.5 md:text-sm";
  const btnClass = className || defaultBtnClass;

  const button = (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={btnClass}
      data-testid="parent-invite-others-btn"
    >
      {label}
    </button>
  );

  return (
    <>
      {inline ? button : <div className="flex flex-col items-center pt-2 md:pt-3">{button}</div>}

      <CopyConfirmPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        message={popupMessage}
        isError={popupIsError}
        bright={bright}
        autoCloseMs={3000}
        zIndexClass="z-[170]"
        testId="parent-invite-others-popup"
      />
    </>
  );
}
