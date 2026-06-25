import { useCallback, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import {
  GIFTS_TASKS,
  childEmojiAt,
  giftsFeedback,
  giftsPrompt,
  validateGiftsDivision,
} from "./leo-gifts-data.js";
import styles from "./LeoGiftsGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function LeoGiftsGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-gifts-data.js').GiftsTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [perChild, setPerChild] = useState(0);
  const [remainder, setRemainder] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const task = tasks[taskIndex] ?? null;

  const resetTaskUi = useCallback(() => {
    setPerChild(0);
    setRemainder(0);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, GIFTS_TASKS));
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setAttemptsTotal(0);
    resetTaskUi();
    setPhase("play");
  }, [difficulty, resetTaskUi]);

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= TASKS_PER_LEVEL) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTaskUi();
  }, [taskIndex, resetTaskUi]);

  const bumpAll = useCallback(
    (delta) => {
      if (!task) return;
      setPerChild((v) => Math.max(0, Math.min(Math.floor(task.total / Math.max(1, task.children)) + 5, v + delta)));
      setCheckState("idle");
      setFeedback("");
    },
    [task],
  );

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const result = validateGiftsDivision(task, perChild, remainder);
    if (result.ok) {
      setCheckState("ok");
      setFeedback(giftsFeedback(true, task, perChild, remainder));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(giftsFeedback(false, task, perChild, remainder));
  }, [task, perChild, remainder, advance]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="pink"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="המתנות של ליאו"
      introHero="🎁🦁"
      introText="עזרו לליאו לחלק מתנות וסוכריות בין הילדים בצורה שווה!"
      introHint={`${TASKS_PER_LEVEL} משימות · חלוקה שווה ושארית`}
      onStart={startGame}
      score={score}
      mistakes={mistakes}
      taskIndex={taskIndex}
      successCount={successCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => {
        setPhase("intro");
      }}
    >
      {task ? (
        <div className={s.main}>
          <div className={s.missionCard}>
            <span className={s.missionIcon}>{task.itemEmoji}</span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>משימה</p>
              <h2 className={s.missionTitle}>חלוקה שווה</h2>
              <p className={s.missionPrompt}>{giftsPrompt(task)}</p>
            </div>
          </div>

          <div className={s.leoRow}>
            <span className={s.leoBadge}>🦁🧺</span>
            <span className={s.leoCaption}>
              {task.total} {task.itemEmoji} · {task.children} ילדים
            </span>
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.childrenPanel}`}>
              <p className={s.panelTitle}>👧👦 הילדים</p>
              <div className={styles.childrenGrid}>
                {Array.from({ length: task.children }, (_, i) => (
                  <div key={i} className={styles.childCard}>
                    <span className={styles.childEmoji}>{childEmojiAt(i)}</span>
                    <span className={styles.childBag}>🛍️</span>
                    <span className={styles.childCount}>{perChild}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={s.panel}>
              <p className={s.panelTitle}>⚙️ שליטה בחלוקה</p>
              <div className={s.stepperRow}>
                <span className={s.stepperLabel}>לכל ילד</span>
                <button type="button" className={s.stepperBtn} onClick={() => bumpAll(-1)}>
                  −
                </button>
                <span className={s.stepperValue}>{perChild}</span>
                <button type="button" className={s.stepperBtn} onClick={() => bumpAll(1)}>
                  +
                </button>
                <button type="button" className={s.secondaryBtn} onClick={() => bumpAll(1)}>
                  +1 לכולם
                </button>
                <button type="button" className={s.secondaryBtn} onClick={() => bumpAll(-1)}>
                  −1 מכולם
                </button>
              </div>
              <div className={`${s.stepperRow} ${styles.remainderRow}`}>
                <span className={s.stepperLabel}>נשאר לליאו</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  onClick={() => {
                    setRemainder((v) => Math.max(0, v - 1));
                    setCheckState("idle");
                    setFeedback("");
                  }}
                >
                  −
                </button>
                <span className={s.stepperValue}>{remainder}</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  onClick={() => {
                    setRemainder((v) => Math.min(task.total, v + 1));
                    setCheckState("idle");
                    setFeedback("");
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div
              className={`${s.feedbackBar} ${
                checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
              }`}
            >
              <p className={s.feedbackText}>
                {feedback || "בחרו כמה כל ילד מקבל וכמה נשאר לליאו, ואז לחצו בדיקה"}
              </p>
            </div>

            <div className={s.actionRow}>
              <button type="button" className={s.primaryBtn} onClick={runCheck}>
                בדוק חלוקה
              </button>
              <button type="button" className={s.secondaryBtn} onClick={resetTaskUi}>
                איפוס
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
