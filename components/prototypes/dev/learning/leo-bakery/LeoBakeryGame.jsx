import { useCallback, useEffect, useMemo, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import {
  BAKERY_TASKS,
  bakeryFeedback,
  bakeryPrompt,
  validateBakery,
} from "./leo-bakery-data.js";
import styles from "./LeoBakeryGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function LeoBakeryGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-bakery-data.js').BakeryTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [trays, setTrays] = useState(1);
  const [perTray, setPerTray] = useState(1);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const task = tasks[taskIndex] ?? null;
  const total = trays * perTray;
  const fixedPerTray = task?.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
  const displayTotal =
    task?.mode === "findTrays" ? (task.total ?? total) : total;

  useEffect(() => {
    if (!task) return;
    if (task.mode === "findTrays") {
      setTrays(1);
      setPerTray(task.perTray ?? 1);
    } else if (task.mode === "findTotal") {
      setTrays(1);
      setPerTray(1);
    } else {
      setTrays(1);
      setPerTray(1);
    }
    setCheckState("idle");
    setFeedback("");
  }, [task]);

  const trayPreview = useMemo(() => {
    if (!task) return [];
    return Array.from({ length: Math.min(trays, 8) }, (_, i) => ({
      id: i,
      count: perTray,
    }));
  }, [task, trays, perTray]);

  const resetTaskUi = useCallback(() => {
    setTrays(1);
    setPerTray(1);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, BAKERY_TASKS));
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

  const clearFeedback = useCallback(() => {
    setCheckState("idle");
    setFeedback("");
  }, []);

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const answerTotal = task.mode === "findTrays" ? (task.total ?? 0) : total;
    const answerPerTray = task.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
    const result = validateBakery(task, { trays, perTray: answerPerTray, total: answerTotal });
    if (result.ok) {
      setCheckState("ok");
      setFeedback(bakeryFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(bakeryFeedback(false));
  }, [task, trays, perTray, total, advance]);

  const lockPerTray = task?.mode === "findTrays";

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="warm"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="המאפייה של ליאו"
      introHero="🥐🦁"
      introText="בנו תבניות עם כמות שווה של מאפים — כפל וקבוצות שוות!"
      introHint={`${TASKS_PER_LEVEL} משימות · תבניות ומגשים`}
      onStart={startGame}
      score={score}
      mistakes={mistakes}
      taskIndex={taskIndex}
      successCount={successCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => setPhase("intro")}
    >
      {task ? (
        <div className={s.main}>
          <div className={s.missionCard}>
            <span className={s.missionIcon}>{task.itemEmoji}</span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>הזמנה</p>
              <h2 className={s.missionTitle}>מאפיית ליאו</h2>
              <p className={s.missionPrompt}>{bakeryPrompt(task)}</p>
            </div>
          </div>

          <div className={s.leoRow}>
            <span className={s.leoBadge}>🦁👨‍🍳</span>
            <span className={s.leoCaption}>
              סך הכול: {displayTotal} {task.itemEmoji}
            </span>
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.traysPanel}`}>
              <p className={s.panelTitle}>🧁 התבניות שלכם</p>
              <div className={styles.trayGrid}>
                {trayPreview.map((tr) => (
                  <div key={tr.id} className={styles.trayCard}>
                    <span className={styles.trayLabel}>תבנית {tr.id + 1}</span>
                    <span className={styles.trayItems}>
                      {Array.from({ length: Math.min(tr.count, 6) }, (_, j) => (
                        <span key={j}>{task.itemEmoji}</span>
                      ))}
                      {tr.count > 6 ? <span className={styles.trayMore}>+{tr.count - 6}</span> : null}
                    </span>
                  </div>
                ))}
                {trays > 8 ? <p className={styles.moreTrays}>+{trays - 8} תבניות נוספות</p> : null}
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.stepperRow}>
                <span className={s.stepperLabel}>תבניות</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  disabled={lockPerTray}
                  onClick={() => {
                    setTrays((v) => Math.max(1, v - 1));
                    clearFeedback();
                  }}
                >
                  −
                </button>
                <span className={s.stepperValue}>{trays}</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  onClick={() => {
                    setTrays((v) => Math.min(12, v + 1));
                    clearFeedback();
                  }}
                >
                  +
                </button>
              </div>
              <div className={s.stepperRow}>
                <span className={s.stepperLabel}>בכל תבנית</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  disabled={lockPerTray}
                  onClick={() => {
                    setPerTray((v) => Math.max(1, v - 1));
                    clearFeedback();
                  }}
                >
                  −
                </button>
                <span className={s.stepperValue}>{fixedPerTray}</span>
                <button
                  type="button"
                  className={s.stepperBtn}
                  disabled={lockPerTray}
                  onClick={() => {
                    setPerTray((v) => Math.min(12, v + 1));
                    clearFeedback();
                  }}
                >
                  +
                </button>
              </div>
              {task.mode !== "findTrays" ? (
                <div className={s.stepperRow}>
                  <span className={s.stepperLabel}>סך הכול</span>
                  <span className={s.stepperValue}>{total}</span>
                </div>
              ) : null}
            </div>

            <div
              className={`${s.feedbackBar} ${
                checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
              }`}
            >
              <p className={s.feedbackText}>
                {feedback || "הגדירו תבניות וכמות בכל תבנית, ואז לחצו בדיקה"}
              </p>
            </div>

            <div className={s.actionRow}>
              <button type="button" className={s.primaryBtn} onClick={runCheck}>
                בדוק הזמנה
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
