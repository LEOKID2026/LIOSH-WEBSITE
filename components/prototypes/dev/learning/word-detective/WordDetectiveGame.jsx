import { useCallback, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import { DETECTIVE_TASKS, detectiveFeedback } from "./word-detective-data.js";
import styles from "./WordDetectiveGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function WordDetectiveGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./word-detective-data.js').DetectiveTask[]} */ ([]));
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
    setTasks(pickTasksForRun(difficulty, DETECTIVE_TASKS));
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
      setFeedback(detectiveFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      setCanAdvance(true);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(detectiveFeedback(false));
  }, [task, selected]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="lavender"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="בלש המילים של ליאו"
      introHero="🕵️🔍"
      introText="פתרו תיקי חקירה - השלימו מילים, סדרו משפטים ומצאו את הרמז הנכון!"
      introHint={`${TASKS_PER_LEVEL} תיקים · עברית ואוצר מילים`}
      startLabel="פתח תיק חקירה"
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
          <div className={`${s.missionCard} ${styles.caseCard}`}>
            <span className={styles.caseBadge} aria-hidden>
              📁
            </span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>{task.caseLabel}</p>
              <h2 className={s.missionTitle}>תיק חקירה</h2>
              {task.passage ? (
                <p className={styles.passage}>{task.passage}</p>
              ) : null}
              {task.words ? (
                <div className={styles.wordChips}>
                  {task.words.map((w) => (
                    <span key={w} className={styles.wordChip}>
                      {w}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className={s.missionPrompt}>
                {task.emoji ? `${task.emoji} ` : ""}
                {task.prompt}
              </p>
            </div>
          </div>

          <div className={`${s.playArea} ${styles.optionsArea}`}>
            <div className={`${s.cardGrid} ${s.cardGrid2}`}>
              {(task.options ?? []).map((opt, i) => (
                <button
                  key={`${task.id}-${i}`}
                  type="button"
                  className={`${s.tapCard} ${styles.optionCard} ${selected === i ? s.tapCardSelected : ""}`}
                  onClick={() => {
                    setSelected(i);
                    setCheckState("idle");
                    setFeedback("");
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
            <p className={s.feedbackText}>{feedback || "בחרו תשובה ולחצו «בדוק תשובה»"}</p>
          </div>

          <div className={s.actionRow}>
            {!canAdvance ? (
              <button
                type="button"
                className={s.primaryBtn}
                disabled={selected == null}
                onClick={runCheck}
              >
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
