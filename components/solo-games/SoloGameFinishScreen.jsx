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
      className="flex h-full min-h-0 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-4"
      dir="rtl"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-1 text-center sm:py-2">
          <div className="rounded-2xl border border-white/10 bg-gray-900/90 p-3 shadow-xl sm:p-5">
            <h2 className="text-xl font-extrabold text-yellow-300 sm:text-2xl">
              {didWin ? "כל הכבוד! 🎉" : "כל הכבוד על המאמץ!"}
            </h2>

            <div className="mt-3 space-y-1.5 text-sm text-gray-100 sm:mt-4 sm:space-y-2 sm:text-base">
              <p>
                <span className="text-gray-400">ניקוד: </span>
                <span className="font-bold">{score}</span>
              </p>
              <p>
                <span className="text-gray-400">רמה: </span>
                <span className="font-bold">{displayLevelHe}</span>
              </p>
              <p className="flex items-center justify-center gap-2 text-base font-extrabold text-amber-300 sm:text-lg">
                <img src="/images/coin.png" alt="" className="h-6 w-6 sm:h-8 sm:w-8" />
                +{coinsAwarded} מטבעות
              </p>
              {breakdownHe ? (
                <p className="text-xs text-gray-400 sm:text-sm">{breakdownHe}</p>
              ) : null}
              {balanceAfter != null ? (
                <p className="text-xs text-gray-400 sm:text-sm">
                  יתרה חדשה: <span className="font-bold text-amber-200">{balanceAfter}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2 border-t border-white/10 bg-gray-950/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-0 sm:pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={onPlayAgain}
          className={`${T.ctaPrimary} min-h-[44px] w-full justify-center sm:min-h-[48px]`}
        >
          שחק שוב
        </button>
        <Link
          href="/student/home"
          className={`${T.ctaGames || T.ctaSecondary || "rounded-xl border px-4 py-3 text-center font-bold"} min-h-[44px] w-full flex items-center justify-center sm:min-h-[48px]`}
        >
          חזרה לעולם הילד
        </Link>
      </div>
    </div>
  );
}
