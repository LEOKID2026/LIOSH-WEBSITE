import { EDUCATIONAL_DIFFICULTIES, difficultyLabelHe } from "../../lib/educational-games/educational-game-registry.js";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";

/**
 * @param {{
 *   game: { titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean },
 *   difficulty: string,
 *   setDifficulty: (d: string) => void,
 *   onStart: () => void,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function EducationalGameEntryScreen({
  game,
  difficulty,
  setDifficulty,
  onStart,
  busy = false,
  error = "",
}) {
  const { SG, GH } = useSoloGameShellUi();

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-4 py-2 text-center"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-4">
        <div className="text-5xl" aria-hidden>
          {game.emoji}
        </div>
        <h1 className={SG.entryTitle}>{game.titleHe}</h1>
        <p className={SG.entryBlurb}>{game.blurbHe}</p>

        {game.hasDifficultyPicker ? (
          <div className="space-y-2">
            <p className={SG.diffLabel}>בחרו רמת קושי</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EDUCATIONAL_DIFFICULTIES.map((id) => {
                const selected = difficulty === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => setDifficulty(id)}
                    className={`min-h-[44px] min-w-[5.5rem] rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      selected ? GH.entryBtnSelected : GH.entryBtnDefault
                    }`}
                  >
                    {difficultyLabelHe(id)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? <p className={SG.errorBox}>{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={onStart}
          className={`${GH.entryBtnSelected} mx-auto min-h-[48px] rounded-xl px-8 py-2.5 text-base font-bold`}
        >
          {busy ? "טוען…" : "התחל משחק"}
        </button>
      </div>
    </div>
  );
}
