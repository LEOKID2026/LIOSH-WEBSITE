import { useCallback, useEffect, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { SCORE, SESSION_TASK_COUNT } from "../shared/learning-prototype-constants.js";
import { pickSessionTasks } from "../shared/task-session.js";
import {
  childEmojiAt,
  childrenGridClass,
  generateGiftsPool,
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
  const gridClass = task ? styles[childrenGridClass(task.children)] : "";

  const resetTaskUi = useCallback(() => {
    setPerChild(0);
    setRemainder(0);
    setCheckState("idle");
    setFeedback("");
  }, []);

  useEffect(() => {
    if (!task) return;
    resetTaskUi();
  }, [task, resetTaskUi]);

  const startGame = useCallback(() => {
    setTasks(
      pickSessionTasks(generateGiftsPool, difficulty, (t) => `${t.total}x${t.children}`, SESSION_TASK_COUNT),
    );
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
    if (next >= tasks.length) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTaskUi();
  }, [taskIndex, tasks.length, resetTaskUi]);

  const clearFeedback = useCallback(() => {
    setCheckState("idle");
    setFeedback("");
  }, []);

  const bumpPerChild = useCallback(
    (delta) => {
      if (!task) return;
      const cap = Math.ceil(task.total / Math.max(1, task.children)) + 2;
      setPerChild((v) => Math.max(0, Math.min(cap, v + delta)));
      clearFeedback();
    },
    [task, clearFeedback],
  );

  const bumpRemainder = useCallback(
    (delta) => {
      if (!task) return;
      setRemainder((v) => Math.max(0, Math.min(task.total, v + delta)));
      clearFeedback();
    },
    [task, clearFeedback],
  );

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const result = validateGiftsDivision(task, perChild, remainder);
    if (result.ok) {
      setCheckState("ok");
      setFeedback(giftsFeedback(true, perChild, remainder));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(giftsFeedback(false, perChild, remainder));
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
      introHint="מאגר משימות גדול · חלוקה שווה ושארית"
      onStart={startGame}
      score={score}
      mistakes={mistakes}
      taskIndex={taskIndex}
      tasksTotal={tasks.length || SESSION_TASK_COUNT}
      successCount={successCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => setPhase("intro")}
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

          <div className={styles.infoBar}>
            {task.total} {task.itemLabel} · {task.children} ילדים
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.childrenPanel}`}>
              <p className={s.panelTitle}>👧👦 הילדים</p>
              <div className={`${styles.childrenGrid} ${gridClass}`}>
                {Array.from({ length: task.children }, (_, i) => (
                  <div key={i} className={styles.childCard}>
                    <span className={styles.childLabel}>ילד {i + 1}</span>
                    <span className={styles.childEmoji}>{childEmojiAt(i)}</span>
                    <span className={styles.childGift}>{task.itemEmoji}</span>
                    <span className={styles.childCount}>{perChild}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.panel} ${styles.controlsPanel}`}>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>לכל ילד</span>
                <div className={s.stepperRow}>
                  <button type="button" className={s.stepperBtn} onClick={() => bumpPerChild(-1)}>
                    −
                  </button>
                  <span className={s.stepperValue}>{perChild}</span>
                  <button type="button" className={s.stepperBtn} onClick={() => bumpPerChild(1)}>
                    +
                  </button>
                </div>
              </div>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>נשאר לליאו 🧺</span>
                <div className={s.stepperRow}>
                  <button type="button" className={s.stepperBtn} onClick={() => bumpRemainder(-1)}>
                    −
                  </button>
                  <span className={s.stepperValue}>{remainder}</span>
                  <button type="button" className={s.stepperBtn} onClick={() => bumpRemainder(1)}>
                    +
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`${s.feedbackBar} ${
                checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
              }`}
            >
              <p className={s.feedbackText}>
                {feedback || "בחרו כמה כל ילד מקבל וכמה נשאר לליאו"}
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
