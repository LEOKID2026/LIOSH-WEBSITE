import shop from "./educational-game-shop-layout.module.css";

/**
 * @param {{ text: string, onReplay: (text: string) => void, className?: string }} props
 */
export default function EducationalGameInstructionReplay({ text, onReplay, className = "" }) {
  if (!text?.trim()) return null;
  return (
    <button
      type="button"
      className={`${shop.instructionReplayBtn} ${className}`.trim()}
      onClick={() => onReplay(text)}
      aria-label="השמע הוראה שוב"
      title="השמע הוראה שוב"
    >
      🔊
    </button>
  );
}
