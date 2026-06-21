import Link from "next/link";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
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
  const { SG, GH, tokens: T } = useSoloGameShellUi();
  const orientationHintMessage = useSoloOrientationHint(game.orientationHint);

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden overflow-x-hidden px-4 py-2 sm:py-3 text-center"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-4 sm:space-y-5">
        <div className="text-5xl" aria-hidden>
          {game.emoji}
        </div>
        <h1 className={SG.entryTitle}>{game.titleHe}</h1>
        <p className={SG.entryBlurb}>{game.blurbHe}</p>

        {orientationHintMessage ? (
          <p className={SG.orientHint} role="note">
            {orientationHintMessage}
          </p>
        ) : null}

        {game.hasDifficultyPicker ? (
          <div className="space-y-2">
            <p className={SG.diffLabel}>בחרו רמת קושי</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SOLO_DIFFICULTY_OPTIONS.map((opt) => {
                const selected = difficulty === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setDifficulty(opt.id)}
                    className={`min-h-[44px] min-w-[5.5rem] rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      selected ? GH.entryBtnSelected : GH.entryBtnDefault
                    } ${selected ? "scale-105" : ""}`}
                  >
                    {opt.labelHe}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? <p className={SG.errorBox}>{error}</p> : null}

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

        <Link href="/student/home" className={SG.footerLink}>
          חזרה לעולם הילד
        </Link>
      </div>
    </div>
  );
}
