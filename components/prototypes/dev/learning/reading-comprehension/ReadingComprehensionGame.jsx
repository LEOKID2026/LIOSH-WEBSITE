import { useCallback, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import { READING_TASKS, readingFeedback } from "./reading-comprehension-data.js";
import styles from "./ReadingComprehensionGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function ReadingComprehensionGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./reading-comprehension-data.js').ReadingTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);

  const task = tasks[taskIndex] ?? null;

  const resetTask = useCallback(() => {
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    setCanAdvance(false);
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, READING_TASKS));
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setAttemptsTotal(0);
    resetTask();
    setPhase("play");
  }, [difficulty, resetTask]);

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= TASKS_PER_LEVEL) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTask();
  }, [taskIndex, resetTask]);

  const runCheck = useCallback(() => {
    if (!task || selected == null) return;
    setAttemptsTotal((a) => a + 1);
    const ok = selected === task.correctIndex;
    if (ok) {
      setCheckState("ok");
      setFeedback(readingFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      setCanAdvance(true);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(readingFeedback(false));
  }, [task, selected]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="warm"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="סיירת הבנת הנקרא"
      introHero="📖🧭"
      introText="\u05E7\u05E8\u05D0\u05D5 \u05E7\u05D8\u05E2\u05D9\u05DD \u05E7\u05E6\u05E8\u05D9\u05DD \u05D5\u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4 \u2014 \u05E1\u05D9\u05D9\u05E8\u05EA \u05E7\u05E8\u05D9\u05D0\u05D4 \u05E2\u05DD \u05DC\u05D9\u05D0\u05D5!"
      introHint={`${TASKS_PER_LEVEL} משימות · הבנת הנקרא`}
      startLabel="הצטרפו לסיירת"
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
          <div className={styles.passageCard}>
            <p className={styles.passageLabel}>📖 קטע לקריאה</p>
            <p className={styles.passageText}>{task.passage}</p>
          </div>

          <div className={s.missionCard}>
            <span className={s.missionIcon}>🔍</span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>שאלה {taskIndex + 1}</p>
              <h2 className={s.missionTitle}>{task.question}</h2>
            </div>
          </div>

          <div className={`${styles.optionsArea}`}>
            <div className={`${s.cardGrid} ${s.cardGrid2}`}>
              {task.options.map((opt, i) => (
                <button
                  key={`${task.id}-${i}`}
                  type="button"
                  className={`${s.tapCard} ${selected === i ? s.tapCardSelected : ""}`}
                  onClick={() => {
                    setSelected(i);
                    setCheckState("idle");
                    setCanAdvance(false);
                  }}
                >
                  <span className={styles.optionText}>{opt}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`${s.feedbackBar} ${
              checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
            }`}
          >
            <p className={s.feedbackText}>{feedback || "\u05D1\u05D7\u05E8\u05D5 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05D5\u05DC\u05D7\u05E6\u05D5 \u00AB\u05D1\u05D3\u05D5\u05E7 \u05EA\u05E9\u05D5\u05D1\u05D4\u00BB"}</p>
          </div>

          <div className={s.actionRow}>
            {!canAdvance ? (
              <button type="button" className={s.primaryBtn} disabled={selected == null} onClick={runCheck}>
                בדוק תשובה
              </button>
            ) : (
              <button type="button" className={s.primaryBtn} onClick={advance}>
                המשימה הבאה
              </button>
            )}
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
