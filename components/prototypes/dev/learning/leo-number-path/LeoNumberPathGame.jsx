import { useCallback, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import { PATH_TASKS, pathFeedback, validatePath } from "./leo-number-path-data.js";
import styles from "./LeoNumberPathGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function LeoNumberPathGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-number-path-data.js').PathTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number[]} */ ([]));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const task = tasks[taskIndex] ?? null;
  const isOrdered = task?.rule === "skip" || task?.rule === "sequence_pick";

  const resetTaskUi = useCallback(() => {
    setSelected([]);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, PATH_TASKS));
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

  const tapNumber = useCallback(
    (n) => {
      if (!task) return;
      setSelected((prev) => {
        const idx = prev.indexOf(n);
        if (idx >= 0) return prev.filter((x) => x !== n);
        if (isOrdered) return [...prev, n];
        return [...prev, n];
      });
      setCheckState("idle");
      setFeedback("");
    },
    [task, isOrdered],
  );

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const ok = validatePath(task, selected);
    if (ok) {
      setCheckState("ok");
      setFeedback(pathFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(pathFeedback(false));
  }, [task, selected, advance]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="mint"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="מסלול המספרים של ליאו"
      introHero="🔢🦁"
      introText="בחרו מספרים במסלול לפי הכלל — קפיצות, זוגי/אי־זוגי וכפולות!"
      introHint={`${TASKS_PER_LEVEL} משימות · Tap על מספרים`}
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
            <span className={s.missionIcon}>🪨</span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>מסלול</p>
              <h2 className={s.missionTitle}>משימת מספרים</h2>
              <p className={s.missionPrompt}>{task.promptHe}</p>
            </div>
          </div>

          <div className={s.leoRow}>
            <span className={s.leoBadge}>🦁🥾</span>
            <span className={s.leoCaption}>
              נבחרו: {selected.length > 0 ? selected.join(" → ") : "—"}
            </span>
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.pathPanel}`}>
              <div className={styles.stonePath}>
                {task.numbers.map((n) => {
                  const selIdx = selected.indexOf(n);
                  const isSel = selIdx >= 0;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.stone} ${isSel ? styles.stoneSelected : ""}`}
                      onClick={() => tapNumber(n)}
                    >
                      {isSel ? <span className={styles.stoneOrder}>{selIdx + 1}</span> : null}
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`${s.feedbackBar} ${
                checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
              }`}
            >
              <p className={s.feedbackText}>{feedback || "לחצו על המספרים ואז בדקו מסלול"}</p>
            </div>

            <div className={s.actionRow}>
              <button type="button" className={s.primaryBtn} onClick={runCheck}>
                בדוק מסלול
              </button>
              <button type="button" className={s.secondaryBtn} onClick={resetTaskUi}>
                נקה בחירה
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
