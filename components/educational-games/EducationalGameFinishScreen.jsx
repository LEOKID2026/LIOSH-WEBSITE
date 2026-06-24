import Link from "next/link";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";

/**
 * @param {{
 *   didWin: boolean,
 *   score: number,
 *   coinsAwarded: number,
 *   accuracy?: number,
 *   correctItems?: number,
 *   mistakes?: number,
 *   bestStreak?: number,
 *   displayLevelHe?: string,
 *   breakdownHe?: string,
 *   balanceAfter?: number|null,
 *   onPlayAgain: () => void,
 *   busy?: boolean,
 * }} props
 */
export default function EducationalGameFinishScreen({
  didWin,
  score,
  coinsAwarded,
  accuracy = 0,
  correctItems = 0,
  mistakes = 0,
  bestStreak = 0,
  displayLevelHe = "—",
  breakdownHe = "",
  balanceAfter = null,
  onPlayAgain,
  busy = false,
}) {
  const { SG } = useSoloGameShellUi();

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-3 py-2" dir="rtl">
      <div className="mx-auto w-full max-w-md">
        <div className={SG.finishCard}>
          <h2 className={SG.finishTitle}>
            {didWin
              ? "כל הכבוד! עזרתם לליאו למיין ולשמור על הסביבה"
              : "לא נורא, ננסה שוב למיין טוב יותר"}
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
            <p>
              <span className={SG.finishLabel}>דיוק: </span>
              <span className={SG.finishValue}>{accuracy}%</span>
            </p>
            <p>
              <span className={SG.finishLabel}>פריטים נכונים: </span>
              <span className={SG.finishValue}>{correctItems}</span>
            </p>
            <p>
              <span className={SG.finishLabel}>טעויות: </span>
              <span className={SG.finishValue}>{mistakes}</span>
            </p>
            <p>
              <span className={SG.finishLabel}>רצף הכי טוב: </span>
              <span className={SG.finishValue}>{bestStreak}</span>
            </p>
            <p className={SG.finishCoins}>
              <img src="/images/coin.png" alt="" className="h-6 w-6 sm:h-8 sm:w-8" />
              +{coinsAwarded} מטבעות
            </p>
            {breakdownHe ? <p className={SG.finishMuted}>{breakdownHe}</p> : null}
            {balanceAfter != null ? (
              <p className={SG.finishMuted}>
                יתרת מטבעות: <span className={SG.finishBalance}>{balanceAfter}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={onPlayAgain}
              className={`${SG.finishBtnPrimary} min-h-[44px] rounded-xl px-6 py-2 font-bold`}
            >
              {busy ? "טוען…" : "משחק חדש"}
            </button>
            <Link
              href="/student/educational-games"
              className={`${SG.finishBtnSecondary} min-h-[44px] rounded-xl px-6 py-2 text-center font-bold`}
            >
              חזרה למשחקים החינוכיים
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
