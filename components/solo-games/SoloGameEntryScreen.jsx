import Link from "next/link";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { SOLO_DIFFICULTY_OPTIONS } from "../../lib/solo-games/solo-game-registry.js";
import { useSoloOrientationHint } from "../../hooks/solo-games/useSoloOrientationHint.js";

/**
 * @param {{
 *   game: { titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean, orientationHint?: string|null },
 *   difficulty: string,
 *   setDifficulty: (d: string) => void,
 *   onStart: () => void,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function SoloGameEntryScreen({
  game,
  difficulty,
  setDifficulty,
  onStart,
  busy = false,
  error = "",
}) {
  const { tokens: T } = useStudentTheme();
  const orientationHintMessage = useSoloOrientationHint(game.orientationHint);

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-4 sm:py-6 text-center"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-4 sm:space-y-5">
        <div className="text-5xl" aria-hidden>
          {game.emoji}
        </div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{game.titleHe}</h1>
        <p className="text-sm text-gray-300 sm:text-base">{game.blurbHe}</p>

        {orientationHintMessage ? (
          <p
            className="rounded-xl border border-sky-400/30 bg-sky-950/40 px-3 py-2 text-sm text-sky-100"
            role="note"
          >
            {orientationHintMessage}
          </p>
        ) : null}

        {game.hasDifficultyPicker ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-yellow-200">בחרו רמת קושי</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SOLO_DIFFICULTY_OPTIONS.map((opt) => {
                const selected = difficulty === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setDifficulty(opt.id)}
                    className={`min-h-[44px] min-w-[5.5rem] rounded-xl px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? "bg-yellow-400 text-black scale-105"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    {opt.labelHe}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className={`${T.ctaPrimary} min-h-[48px] w-full sm:w-auto sm:min-w-[10rem] justify-center`}
          >
            {busy ? "טוען…" : "התחל משחק"}
          </button>
          <Link
            href="/student/solo-games"
            className={`${T.ctaGames || T.ctaSecondary || "rounded-xl border px-4 py-3 text-center font-bold"} min-h-[48px] w-full sm:w-auto sm:min-w-[10rem] flex items-center justify-center`}
          >
            חזרה
          </Link>
        </div>

        <Link
          href="/student/home"
          className="text-sm text-gray-400 underline-offset-2 hover:text-gray-200 hover:underline"
        >
          חזרה לעולם הילד
        </Link>
      </div>
    </div>
  );
}
