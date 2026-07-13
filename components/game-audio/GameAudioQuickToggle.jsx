import { useGameAudioOptional } from "../../hooks/useGameAudio.js";

/**
 * Compact master mute toggle for game hub nav bars.
 */
export default function GameAudioQuickToggle({ className = "" }) {
  const audio = useGameAudioOptional();
  if (!audio) return <span className={className} aria-hidden="true" />;

  const on = audio.settings.masterEnabled;
  return (
    <button
      type="button"
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2 text-sm transition hover:bg-white/20 ${className}`}
      onClick={() => audio.toggleMaster()}
      aria-pressed={on}
      aria-label={on ? "השתק את כל השמע" : "הפעל שמע"}
      title={on ? "השתק שמע" : "הפעל שמע"}
    >
      <span aria-hidden="true">{on ? "🔊" : "🔇"}</span>
    </button>
  );
}
