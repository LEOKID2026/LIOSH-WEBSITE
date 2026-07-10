import { useState } from "react";
import CopyConfirmPopup from "../ui/CopyConfirmPopup.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  COPY_LEO_NUMBER_ERROR_MESSAGE_HE,
  COPY_LEO_NUMBER_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";

/** Student home — tap Leo number chip to copy digits only + centered popup. */
export default function StudentCopyLeoNumberChip({
  leoNumber = "",
  label = "",
  className = "",
}) {
  const { isBright } = useStudentTheme();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIsError, setPopupIsError] = useState(false);

  const handleClick = async () => {
    const num = String(leoNumber || "").trim();
    if (!num) return;

    const ok = await copyTextToClipboard(num);
    if (ok) {
      setPopupIsError(false);
      setPopupMessage(COPY_LEO_NUMBER_SUCCESS_MESSAGE_HE);
    } else {
      setPopupIsError(true);
      setPopupMessage(COPY_LEO_NUMBER_ERROR_MESSAGE_HE);
    }
    setPopupOpen(true);
  };

  if (!label) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={className}
        data-testid="student-copy-leo-number-chip"
        aria-label="העתק מספר ליאו"
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
        testId="student-copy-leo-number-popup"
      />
    </>
  );
}
