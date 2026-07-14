import { useEffect } from "react";
import { createPortal } from "react-dom";
import GameAudioSettingsPanel from "./GameAudioSettingsPanel.jsx";

/**
 * Full-screen modal shell for audio settings — portaled to document.body.
 */
export default function GameAudioSettingsModal({ open, onClose, musicScope = "global" }) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/45 p-3 sm:p-4"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
      }}
      dir="rtl"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[calc(100dvh-24px)] overflow-y-auto"
        style={{ maxWidth: "min(92vw, 420px)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <GameAudioSettingsPanel onClose={onClose} musicScope={musicScope} />
      </div>
    </div>,
    document.body,
  );
}
