import { useState } from "react";
import { useGameAudioOptional } from "../../hooks/useGameAudio.js";
import GameAudioSettingsModal from "../game-audio/GameAudioSettingsModal.jsx";

/**
 * Learning master audio control — same placement/styling as before, opens full settings modal.
 */
export default function LearningMasterAudioButton({ audioOn, buttonClassOn, buttonClassOff }) {
  const audio = useGameAudioOptional();
  const [showPanel, setShowPanel] = useState(false);

  if (!audio) return null;

  const masterOn = audio.settings.masterEnabled;
  const btnClass = `${audioOn && masterOn ? buttonClassOn : buttonClassOff} !shadow-md ring-2 ring-white/80`;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        className={btnClass}
        aria-label="הגדרות שמע"
        aria-expanded={showPanel}
        aria-haspopup="dialog"
        title="הגדרות שמע"
      >
        {masterOn ? "🔊" : "🔇"}
      </button>
      <GameAudioSettingsModal
        open={showPanel}
        onClose={() => setShowPanel(false)}
        musicScope="learning-master"
      />
    </>
  );
}
