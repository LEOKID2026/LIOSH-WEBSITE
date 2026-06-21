import Link from "next/link";

import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

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
  const { tokens: T } = useStudentTheme();

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-2 py-2 landscape:py-1 sm:px-4 sm:py-4"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-md landscape:max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-gray-900/90 p-3 shadow-xl sm:p-5 landscape:max-h-[min(88dvh,100%)] landscape:overflow-y-auto landscape:p-3">
          <h2 className="text-xl font-extrabold text-yellow-300 sm:text-2xl landscape:text-lg">
            {didWin ? "כל הכבוד! 🎉" : "כל הכבוד על המאמץ!"}
          </h2>

          <div className="mt-3 space-y-1.5 text-sm text-gray-100 sm:mt-4 sm:space-y-2 sm:text-base landscape:mt-2 landscape:space-y-1 landscape:text-sm">
            <p>
              <span className="text-gray-400">ניקוד: </span>
              <span className="font-bold">{score}</span>
            </p>
            <p>
              <span className="text-gray-400">רמה: </span>
              <span className="font-bold">{displayLevelHe}</span>
            </p>
            <p className="flex items-center justify-center gap-2 text-base font-extrabold text-amber-300 sm:text-lg landscape:text-sm">
              <img src="/images/coin.png" alt="" className="h-6 w-6 sm:h-8 sm:w-8 landscape:h-5 landscape:w-5" />
              +{coinsAwarded} מטבעות
            </p>
            {breakdownHe ? (
              <p className="text-xs text-gray-400 sm:text-sm landscape:text-[11px]">{breakdownHe}</p>
            ) : null}
            {balanceAfter != null ? (
              <p className="text-xs text-gray-400 sm:text-sm landscape:text-[11px]">
                יתרה חדשה: <span className="font-bold text-amber-200">{balanceAfter}</span>
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
