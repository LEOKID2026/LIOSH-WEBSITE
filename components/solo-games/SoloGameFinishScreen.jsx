import Link from "next/link";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";

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
  const { SG, tokens: T } = useSoloGameShellUi();

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

          <div className="mt-4 flex flex-col gap-2 sm:mt-5 landscape:mt-3 landscape:flex-row landscape:gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPlayAgain}
              className={`${T.ctaPrimary} min-h-[44px] w-full justify-center sm:min-h-[48px] landscape:min-h-[36px] landscape:flex-1 landscape:px-3 landscape:py-2 landscape:text-sm`}
            >
              שחק שוב
            </button>
            <Link
              href="/student/home"
              className={`${T.ctaGames || T.ctaSecondary || "rounded-xl border px-4 py-3 text-center font-bold"} min-h-[44px] w-full flex items-center justify-center sm:min-h-[48px] landscape:min-h-[36px] landscape:flex-1 landscape:px-3 landscape:py-2 landscape:text-sm`}
            >
              חזרה לעולם הילד
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
