import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import SoloGameNavButtons from "./SoloGameNavButtons.jsx";

/**
 * @param {{
 *   didWin: boolean,
 *   score: number,
 *   displayLevelHe: string,
 *   coinsAwarded: number,
 *   breakdownHe?: string,
 *   balanceAfter?: number|null,
 *   onPlayAgain: () => void,
 *   busy?: boolean,
 * }} props
 */
export default function SoloGameFinishScreen({
  didWin,
  score,
  displayLevelHe,
  coinsAwarded,
  breakdownHe = "",
  balanceAfter = null,
  onPlayAgain,
  busy = false,
}) {
  const { SG } = useSoloGameShellUi();

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden overflow-x-hidden px-2 py-2 landscape:py-1 sm:px-4 sm:py-3"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-md landscape:max-w-lg">
        <div className={SG.finishCard}>
          <h2 className={SG.finishTitle}>
            {didWin ? "כל הכבוד! 🎉" : "כל הכבוד על המאמץ!"}
          </h2>

          <div className={SG.finishBody}>
            <p>
              <span className={SG.finishLabel}>ניקוד: </span>
              <span className={SG.finishValue}>{score}</span>
            </p>
            <p>
              <span className={SG.finishLabel}>רמה: </span>
              <span className={SG.finishValue}>{displayLevelHe}</span>
            </p>
            <p className={SG.finishCoins}>
              <img src="/images/coin.png" alt="" className="h-6 w-6 sm:h-8 sm:w-8 landscape:h-5 landscape:w-5" />
              +{coinsAwarded} מטבעות
            </p>
            {breakdownHe ? <p className={SG.finishMuted}>{breakdownHe}</p> : null}
            {balanceAfter != null ? (
              <p className={SG.finishMuted}>
                יתרה חדשה: <span className={SG.finishBalance}>{balanceAfter}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-4 sm:mt-5 landscape:mt-3">
            <SoloGameNavButtons
              primaryLabel="שחק שוב"
              onPrimary={onPlayAgain}
              primaryDisabled={busy}
              primaryBusy={busy}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}
