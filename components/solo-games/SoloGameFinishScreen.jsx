import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import SoloGameNavButtons from "./SoloGameNavButtons.jsx";

/**
 * @param {{
 *   didWin: boolean,
 *   score: number,
 *   displayLevelHe: string,
 *   coinsAwarded: number,
 *   diamondsAwarded?: number,
 *   breakdownHe?: string,
 *   diamondBreakdownHe?: string,
 *   balanceAfter?: number|null,
 *   diamondBalanceAfter?: number|null,
 *   onPlayAgain: () => void,
 *   busy?: boolean,
 * }} props
 */
export default function SoloGameFinishScreen({
  didWin,
  score,
  displayLevelHe,
  coinsAwarded,
  diamondsAwarded = 0,
  breakdownHe = "",
  diamondBreakdownHe = "",
  balanceAfter = null,
  diamondBalanceAfter = null,
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
            {diamondsAwarded > 0 ? (
              <p className={SG.finishCoins}>
                <span aria-hidden>💎</span> +{diamondsAwarded} יהלומים
              </p>
            ) : null}
            {breakdownHe ? <p className={SG.finishMuted}>{breakdownHe}</p> : null}
            {diamondBreakdownHe && diamondsAwarded > 0 ? (
              <p className={SG.finishMuted}>{diamondBreakdownHe}</p>
            ) : null}
            {balanceAfter != null ? (
              <p className={SG.finishMuted}>
                יתרת מטבעות: <span className={SG.finishBalance}>{balanceAfter}</span>
              </p>
            ) : null}
            {diamondBalanceAfter != null && diamondsAwarded > 0 ? (
              <p className={SG.finishMuted}>
                יתרת יהלומים: <span className={SG.finishBalance}>{diamondBalanceAfter}</span>
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
