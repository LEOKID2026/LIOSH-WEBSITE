import Link from "next/link";
import styles from "./learning-prototype-shared.module.css";
import { DIFFICULTIES, SESSION_TASK_COUNT } from "./learning-prototype-constants.js";

/**
 * @param {{
 *   backHref?: string
 *   theme?: 'warm'|'pink'|'sky'|'mint'|'lavender'
 *   phase: 'intro'|'play'|'won'
 *   difficulty: import('./learning-prototype-constants.js').DifficultyId
 *   onDifficultyChange: (id: import('./learning-prototype-constants.js').DifficultyId) => void
 *   title: string
 *   introHero: string
 *   introText: string
 *   introHint?: string
 *   startLabel?: string
 *   onStart: () => void
 *   score: number
 *   mistakes: number
 *   taskIndex: number
 *   tasksTotal?: number
 *   successCount: number
 *   attemptsTotal: number
 *   onPlayAgain: () => void
 *   children?: import('react').ReactNode
 * }} props
 */
export default function LearningPrototypeFrame({
  backHref = "/dev/learning-game-prototypes",
  theme = "warm",
  phase,
  difficulty,
  onDifficultyChange,
  title,
  introHero,
  introText,
  introHint,
  startLabel = "התחל משחק",
  onStart,
  score,
  mistakes,
  taskIndex,
  tasksTotal = SESSION_TASK_COUNT,
  successCount,
  attemptsTotal,
  onPlayAgain,
  children,
}) {
  const shellTheme =
    theme === "pink"
      ? styles.shellPink
      : theme === "sky"
        ? styles.shellSky
        : theme === "mint"
          ? styles.shellMint
          : theme === "lavender"
            ? styles.shellLavender
            : styles.shellWarm;

  const diffConfig = DIFFICULTIES[difficulty];

  return (
    <div className={`${styles.shell} ${shellTheme}`} dir="rtl">
      <header className={styles.header}>
        <Link href={backHref} className={styles.backBtn}>
          ← חזרה
        </Link>
        {phase === "play" ? (
          <div className={styles.hud}>
            <span className={`${styles.hudChip} ${styles.hudScore}`}>⭐ {score}</span>
            <span className={`${styles.hudChip} ${styles.hudProgress}`}>
              🎯 {taskIndex + 1}/{tasksTotal}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>❌ {mistakes}</span>
            <span className={styles.hudChip}>{diffConfig.label}</span>
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>🧪 אבטיפוס</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>{introHero}</p>
          <h1 className={styles.introTitle}>{title}</h1>
          <p className={styles.introText}>{introText}</p>
          <div className={styles.difficultyRow}>
            {(/** @type {import('./learning-prototype-constants.js').DifficultyId[]} */ ([
              "easy",
              "medium",
              "hard",
            ])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.diffBtn} ${difficulty === id ? styles.diffBtnSelected : ""}`}
                onClick={() => onDifficultyChange(id)}
              >
                {DIFFICULTIES[id].label}
              </button>
            ))}
          </div>
          {introHint ? (
            <p className={styles.introText} style={{ fontSize: "0.78rem" }}>
              {introHint}
            </p>
          ) : null}
          <button type="button" className={styles.startBtn} onClick={onStart}>
            {startLabel}
          </button>
        </div>
      ) : null}

      {phase === "won" ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>🎉 סיימתם!</h2>
            <p className={styles.endStat}>⭐ ניקוד: {score}</p>
            <p className={styles.endStat}>
              ✅ הצלחות: {successCount} מתוך {tasksTotal}
            </p>
            <p className={styles.endStat}>❌ טעויות: {mistakes}</p>
            <p className={styles.endStat}>🔄 ניסיונות: {attemptsTotal}</p>
            <p className={styles.endStat}>📊 רמה: {diffConfig.label}</p>
            <div className={styles.endActions}>
              <button type="button" className={styles.startBtn} onClick={onPlayAgain}>
                משחק חדש
              </button>
              <Link href={backHref} className={styles.secondaryBtn} style={{ textAlign: "center" }}>
                חזרה לאבטיפוסים
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "play" ? children : null}
    </div>
  );
}

export { styles as sharedStyles };
