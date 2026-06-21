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
      className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-6 text-center"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-gray-900/90 p-6 shadow-xl">
        <h2 className="text-2xl font-extrabold text-yellow-300 sm:text-3xl">
          {didWin ? "כל הכבוד! 🎉" : "כל הכבוד על המאמץ!"}
        </h2>

        <div className="space-y-2 text-base text-gray-100">
          <p>
            <span className="text-gray-400">ניקוד: </span>
            <span className="font-bold">{score}</span>
          </p>
          <p>
            <span className="text-gray-400">רמה: </span>
            <span className="font-bold">{displayLevelHe}</span>
          </p>
          <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-amber-300">
            <img src="/images/coin.png" alt="" className="h-8 w-8" />
            +{coinsAwarded} מטבעות
          </p>
          {breakdownHe ? <p className="text-sm text-gray-400">{breakdownHe}</p> : null}
          {balanceAfter != null ? (
            <p className="text-sm text-gray-400">
              יתרה חדשה: <span className="font-bold text-amber-200">{balanceAfter}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onPlayAgain}
            className={`${T.ctaPrimary} min-h-[48px] w-full justify-center`}
          >
            שחק שוב
          </button>
          <Link
            href="/student/home"
            className={`${T.ctaGames || T.ctaSecondary || "rounded-xl border px-4 py-3 text-center font-bold"} min-h-[48px] w-full flex items-center justify-center`}
          >
            חזרה לעולם הילד
          </Link>
        </div>
      </div>
    </div>
  );
}
