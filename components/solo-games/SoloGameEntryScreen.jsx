import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import { SOLO_DIFFICULTY_OPTIONS } from "../../lib/solo-games/solo-game-registry.js";
import { useSoloOrientationHint } from "../../hooks/solo-games/useSoloOrientationHint.js";
import SoloGameNavButtons from "./SoloGameNavButtons.jsx";
import SoloGameHelpButton from "./SoloGameHelpButton.jsx";
import GameAudioSettingsButton from "../game-audio/GameAudioSettingsButton.jsx";

/**
 * @param {{
 *   game: { titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean, orientationHint?: string|null },
 *   difficulty: string,
 *   setDifficulty: (d: string) => void,
 *   onStart: () => void,
 *   onOpenHelp?: (game: object) => void,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function SoloGameEntryScreen({
  game,
  difficulty,
  setDifficulty,
  onStart,
  onOpenHelp,
  busy = false,
  error = "",
}) {
  const { SG, GH } = useSoloGameShellUi();
  const orientationHintMessage = useSoloOrientationHint(game.orientationHint);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden overflow-x-hidden px-4 py-2 sm:py-3 text-center"
      dir="rtl"
    >
      <GameAudioSettingsButton className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6" />
      {onOpenHelp ? (
        <SoloGameHelpButton
          game={game}
          onOpen={onOpenHelp}
          className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"
        />
      ) : null}
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

        <SoloGameNavButtons
          primaryLabel="התחל משחק"
          onPrimary={onStart}
          primaryDisabled={busy}
          primaryBusy={busy}
          primaryBusyLabel="טוען…"
        />
      </div>
    </div>
  );
}
