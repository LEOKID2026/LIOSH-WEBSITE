/**
 * @param {{
 *   isFullscreen: boolean,
 *   onToggle: () => void,
 *   variant?: "compact" | "board",
 *   className?: string,
 * }} props
 */
export default function SoloGameMobileFullscreenButton({
  isFullscreen,
  onToggle,
  variant = "board",
  className = "",
}) {
  const baseClass =
    variant === "compact"
      ? "puzzle-tray-hint-btn shrink-0 rounded-md border border-sky-400/70 bg-sky-950/70 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-sky-100"
      : "shrink-0 rounded-lg border border-sky-400/70 bg-sky-950/70 px-2 py-1 text-[10px] font-bold text-sky-100 min-h-[36px]";

  return (
    <button
      type="button"
      data-solo-fullscreen-toggle=""
      onClick={onToggle}
      onPointerDown={(e) => e.stopPropagation()}
      className={`${baseClass} ${className}`.trim()}
      style={{ touchAction: "manipulation" }}
      aria-label={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
    >
      {isFullscreen ? "יציאה" : "מסך מלא"}
    </button>
  );
}
