import styles from "./EducationalGameHudFullscreenButton.module.css";

/**
 * Inline HUD fullscreen toggle for educational games (mobile only via parent).
 * Uses data-solo-fullscreen-toggle for compatibility with solo fullscreen handlers.
 *
 * @param {{
 *   isFullscreen: boolean,
 *   onToggle: () => void,
 *   className?: string,
 * }} props
 */
export default function EducationalGameHudFullscreenButton({
  isFullscreen,
  onToggle,
  className = "",
}) {
  return (
    <button
      type="button"
      data-solo-fullscreen-toggle=""
      onClick={onToggle}
      onPointerDown={(e) => e.stopPropagation()}
      className={className ? className : styles.btn}
      style={{ touchAction: "manipulation" }}
      aria-label={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
    >
      {isFullscreen ? "יציאה" : "⛶ מסך מלא"}
    </button>
  );
}
