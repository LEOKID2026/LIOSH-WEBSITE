import { useState } from "react";
import GameAudioSettingsPanel from "./GameAudioSettingsPanel.jsx";

/**
 * Floating button that opens the full audio settings panel in fullscreen games.
 */
export default function GameAudioFullscreenButton({ className = "" }) {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setShowPanel((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-base backdrop-blur hover:bg-black/55"
        aria-label="הגדרות שמע"
        title="הגדרות שמע"
      >
        🎚️
      </button>
      {showPanel ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)]">
          <GameAudioSettingsPanel onClose={() => setShowPanel(false)} />
        </div>
      ) : null}
    </div>
  );
}
