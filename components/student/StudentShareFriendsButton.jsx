import { useState } from "react";
import CopyConfirmPopup from "../ui/CopyConfirmPopup.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { buildStudentShareFriendsMessageHe } from "../../lib/site/public-site-origin.client.js";
import {
  COPY_INVITE_ERROR_MESSAGE_HE,
  COPY_INVITE_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";

const MOBILE_BTN_BRIGHT =
  "inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-teal-600 hover:to-cyan-700";

const MOBILE_BTN_CLASSIC =
  "inline-flex w-full items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30";

const SURPRISE_DESKTOP_BTN =
  "hidden md:inline-flex flex-none !min-h-[2.75rem] !px-3 !py-2 !text-sm text-center whitespace-nowrap items-center justify-center";

const CHIP_BTN_BRIGHT =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-teal-200/55 bg-teal-50/80 px-2.5 py-1.5 text-xs font-semibold text-teal-900 shadow-sm backdrop-blur-[6px] transition hover:bg-teal-100/85";

const CHIP_BTN_CLASSIC =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-2.5 py-1.5 text-xs font-semibold text-cyan-50 shadow-sm backdrop-blur-[6px] transition hover:bg-cyan-500/30";

/** Student home — copy share message for friends + centered popup. */
export default function StudentShareFriendsButton({
  className = "",
  variant = "mobile",
  label = "שתף עם חברים",
}) {
  const { tokens: T, isBright } = useStudentTheme();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIsError, setPopupIsError] = useState(false);

  const handleClick = async () => {
    const ok = await copyTextToClipboard(buildStudentShareFriendsMessageHe());
    if (ok) {
      setPopupIsError(false);
      setPopupMessage(COPY_INVITE_SUCCESS_MESSAGE_HE);
    } else {
      setPopupIsError(true);
      setPopupMessage(COPY_INVITE_ERROR_MESSAGE_HE);
    }
    setPopupOpen(true);
  };

  const btnClass =
    variant === "chip"
      ? isBright
        ? CHIP_BTN_BRIGHT
        : CHIP_BTN_CLASSIC
      : variant === "desktop-surprise"
        ? `${T.ctaShareFriends} ${SURPRISE_DESKTOP_BTN}`
        : isBright
          ? MOBILE_BTN_BRIGHT
          : MOBILE_BTN_CLASSIC;

  const testId =
    variant === "desktop-surprise"
      ? "student-share-friends-btn-desktop"
      : variant === "chip"
        ? "student-share-friends-btn-chip"
        : "student-share-friends-btn";

  const popupTestId =
    variant === "desktop-surprise"
      ? "student-share-friends-popup-desktop"
      : variant === "chip"
        ? "student-share-friends-popup-chip"
        : "student-share-friends-popup";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`${btnClass} ${className}`.trim()}
        data-testid={testId}
      >
        {label}
      </button>

      <CopyConfirmPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        message={popupMessage}
        isError={popupIsError}
        bright={isBright}
        autoCloseMs={5000}
        testId={popupTestId}
      />
    </>
  );
}
