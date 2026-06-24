/**
 * @param {{
 *   game: { titleHe: string },
 *   onOpen: (game: object) => void,
 *   className?: string,
 *   stopPropagation?: boolean,
 * }} props
 */
export default function SoloGameHelpButton({
  game,
  onOpen,
  className = "absolute left-4 top-4",
  stopPropagation = false,
}) {
  return (
    <button
      type="button"
      className={`${className} z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/95 text-sm font-extrabold text-sky-700 shadow-md shadow-black/10 ring-1 ring-sky-200 transition hover:bg-sky-50 active:scale-95 sm:h-9 sm:w-9 md:h-10 md:w-10`}
      aria-label={`עזרה על ${game.titleHe}`}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        onOpen(game);
      }}
    >
      ?
    </button>
  );
}
