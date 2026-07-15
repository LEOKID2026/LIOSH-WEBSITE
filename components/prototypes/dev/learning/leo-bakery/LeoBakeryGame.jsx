import { useCallback, useEffect, useMemo, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { SCORE, SESSION_TASK_COUNT } from "../shared/learning-prototype-constants.js";
import { pickSessionTasks } from "../shared/task-session.js";
import {
  bakeryExpected,
  bakeryFeedback,
  bakeryPrompt,
  generateBakeryPool,
  trayItemDisplay,
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

  const lockTrays = task?.mode === "findTotal" || task?.mode === "findPerTray";
  const lockPerTray = task?.mode === "findTrays";
  const lockTotal = task?.mode === "build" || task?.mode === "findTrays" || task?.mode === "findPerTray";

  const displayPerTray = task?.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
  const displayTotal =
    task?.mode === "findTrays" || task?.mode === "findPerTray"
      ? (task?.total ?? total)
      : total;

  useEffect(() => {
    if (!task) return;
    setTrays(1);
    setPerTray(task.mode === "findTrays" ? (task.perTray ?? 1) : 1);
    setCheckState("idle");
    setFeedback("");
  }, [task]);

  const trayPreview = useMemo(() => {
    if (!task) return [];
    const count = Math.min(trays, 10);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      count: displayPerTray,
    }));
  }, [task, trays, displayPerTray]);

  const resetTaskUi = useCallback(() => {
    setTrays(1);
    setPerTray(1);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    setTasks(
      pickSessionTasks(
        generateBakeryPool,
        difficulty,
        (t) => {
          const e = bakeryExpected(t);
          return `${t.mode}-${e.trays}-${e.perTray}-${e.total}`;
        },
        SESSION_TASK_COUNT,
      ),
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

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const answerPerTray = task.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
    const answerTotal =
      task.mode === "findTrays" || task.mode === "findPerTray" ? (task.total ?? 0) : total;
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

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="warm"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="המאפייה של ליאו"
      introHero="🥐🦁"
      introText="בנו תבניות עם כמות שווה של מאפים - כפל וקבוצות שוות!"
      introHint="מאגר משימות גדול · תבניות ומגשים"
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
              <p className={s.missionLabel}>הזמנה</p>
              <h2 className={s.missionTitle}>מאפיית ליאו</h2>
              <p className={s.missionPrompt}>{bakeryPrompt(task)}</p>
            </div>
          </div>

          <div className={styles.formulaBar}>
            {trays} תבניות × {displayPerTray} בכל תבנית = {displayTotal} {task.itemEmoji}
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.traysPanel}`}>
              <p className={s.panelTitle}>🧁 התבניות שלכם</p>
              <div className={styles.trayGrid}>
                {trayPreview.map((tr) => {
                  const disp = trayItemDisplay(tr.count, task.itemEmoji);
                  return (
                    <div key={tr.id} className={styles.trayCard}>
                      <span className={styles.trayLabel}>תבנית {tr.id + 1}</span>
                      <span className={styles.trayItems}>
                        {disp.type === "icons" ? disp.text : disp.text}
                      </span>
                    </div>
                  );
                })}
                {trays > 10 ? <p className={styles.moreTrays}>+{trays - 10} תבניות נוספות</p> : null}
              </div>
            </div>

            <div className={`${s.panel} ${styles.controlsPanel}`}>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>תבניות</span>
                <div className={s.stepperRow}>
                  <button
                    type="button"
                    className={s.stepperBtn}
                    disabled={lockTrays}
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
                    disabled={lockTrays}
                    onClick={() => {
                      setTrays((v) => Math.min(12, v + 1));
                      clearFeedback();
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>בכל תבנית</span>
                <div className={s.stepperRow}>
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
                  <span className={s.stepperValue}>{displayPerTray}</span>
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
              </div>
              {!lockTotal ? (
                <div className={`${styles.controlCol} ${styles.totalCol}`}>
                  <span className={styles.controlLabel}>סך הכול</span>
                  <span className={styles.totalValue}>{total}</span>
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
