import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { SCORE } from "../shared/learning-prototype-constants.js";
import {
  TRAINING_AREAS,
  TRAINING_TASKS_PER_SESSION,
  pickTrainingTasks,
  trainingFeedback,
  trainingSummaryMessage,
} from "./training-room-data.js";
import styles from "./TrainingRoomGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function TrainingRoomGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [screen, setScreen] = useState(/** @type {'pick'|'game'|'summary'} */ ("pick"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [areaId, setAreaId] = useState(/** @type {string|null} */ (null));
  const [tasks, setTasks] = useState(/** @type {import('./training-room-data.js').TrainingTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);
  const [strongAreas, setStrongAreas] = useState(/** @type {string[]} */ ([]));

  const selectedArea = useMemo(
    () => TRAINING_AREAS.find((a) => a.id === areaId) ?? null,
    [areaId],
  );

  const task = tasks[taskIndex] ?? null;
  const tasksTotal = TRAINING_TASKS_PER_SESSION;

  const resetTask = useCallback(() => {
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    setCanAdvance(false);
  }, []);

  const beginTraining = useCallback(
    (chosenAreaId) => {
      const id = chosenAreaId ?? areaId ?? TRAINING_AREAS[0].id;
      setAreaId(id);
      setTasks(pickTrainingTasks(id, difficulty));
      setTaskIndex(0);
      setScore(0);
      setMistakes(0);
      setSuccessCount(0);
      setAttemptsTotal(0);
      setStrongAreas([]);
      resetTask();
      setScreen("game");
    },
    [areaId, difficulty, resetTask],
  );

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= tasksTotal) {
      setScreen("summary");
      return;
    }
    setTaskIndex(next);
    resetTask();
  }, [taskIndex, tasksTotal, resetTask]);

  const runCheck = useCallback(() => {
    if (!task || selected == null) return;
    setAttemptsTotal((a) => a + 1);
    const ok = selected === task.correctIndex;
    if (ok) {
      setCheckState("ok");
      setFeedback(trainingFeedback(true));
      const nextSuccess = successCount + 1;
      setSuccessCount(nextSuccess);
      if (nextSuccess >= Math.ceil(tasksTotal * 0.6) && selectedArea?.title) {
        setStrongAreas((prev) => [...new Set([...prev, selectedArea.title])]);
      }
      setScore((sc) => sc + SCORE.correct);
      setCanAdvance(true);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(trainingFeedback(false));
  }, [task, selected]);

  const progressPct = tasksTotal > 0 ? Math.round(((taskIndex + (canAdvance ? 1 : 0)) / tasksTotal) * 100) : 0;

  if (screen === "summary") {
    return (
      <div className={`${s.shell} ${s.shellWarm}`} dir="rtl">
        <header className={s.header}>
          <Link href={backHref} className={s.backBtn}>
            ← חזרה
          </Link>
          <div className={s.hud}>
            <span className={s.hudChip}>🧠 סיכום</span>
          </div>
          <div style={{ minWidth: 40 }} aria-hidden />
        </header>
        <div className={styles.pickScreen}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>🎉 האימון הסתיים!</h2>
            <p className={styles.summaryLine}>תרגלתם היום כמה נקודות חשובות</p>
            <p className={styles.summaryLine}>
              ✅ {successCount} תשובות נכונות מתוך {tasksTotal}
            </p>
            <p className={styles.summaryLine}>{trainingSummaryMessage(successCount, tasksTotal)}</p>
            {strongAreas.length > 0 ? (
              <p className={styles.summaryLine}>הצלחתם ב: {strongAreas.join(" · ")}</p>
            ) : null}
            <p className={styles.summaryLine}>כדאי לחזק: {selectedArea?.title ?? "המשך תרגול"}</p>
            <div className={s.endActions}>
              <button type="button" className={s.startBtn} onClick={() => setScreen("pick")}>
                אימון נוסף
              </button>
              <Link href={backHref} className={s.secondaryBtn} style={{ textAlign: "center" }}>
                חזרה לאבטיפוסים
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "pick") {
    return (
      <div className={`${s.shell} ${s.shellWarm}`} dir="rtl">
        <header className={s.header}>
          <Link href={backHref} className={s.backBtn}>
            ← חזרה
          </Link>
          <div className={s.hud}>
            <span className={s.hudChip}>🧪 אבטיפוס</span>
          </div>
          <div style={{ minWidth: 40 }} aria-hidden />
        </header>
        <div className={styles.pickScreen}>
          <p className={styles.pickTitle}>🧠 חדר האימון של ליאo</p>
          <p className={styles.pickSub}>
            היום ליאo מצא כמה דברים שכדאי לחזק. בחרu תחום אימון או התחילu אימון אקראי.
          </p>
          <div className={styles.areaGrid}>
            {TRAINING_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                className={`${styles.areaCard} ${areaId === area.id ? styles.areaCardSelected : ""}`}
                onClick={() => setAreaId(area.id)}
              >
                <span className={styles.areaEmoji}>{area.emoji}</span>
                <p className={styles.areaTitle}>{area.title}</p>
                <p className={styles.areaSub}>{area.subtitle}</p>
              </button>
            ))}
          </div>
          <div className={s.difficultyRow}>
            {(["easy", "medium", "hard"]).map((id) => (
              <button
                key={id}
                type="button"
                className={`${s.diffBtn} ${difficulty === id ? s.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(/** @type {DifficultyId} */ (id))}
              >
                {id === "easy" ? "קל" : id === "hard" ? "קשה" : "בינוני"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={s.startBtn}
            disabled={!areaId}
            onClick={() => beginTraining(areaId)}
          >
            התחל אימון
          </button>
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => beginTraining(TRAINING_AREAS[Math.floor(Math.random() * TRAINING_AREAS.length)].id)}
          >
            אימון אקראי
          </button>
        </div>
      </div>
    );
  }

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="pink"
      phase="play"
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="חדר האימון של ליאo"
      introHero="🧠💪"
      introText=""
      onStart={() => {}}
      score={score}
      mistakes={mistakes}
      taskIndex={taskIndex}
      tasksTotal={tasksTotal}
      successCount={successCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => setScreen("pick")}
    >
      {task ? (
        <div className={s.main}>
          <div className={styles.progressBar} aria-hidden>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>

          <div className={s.missionCard}>
            {task.emoji ? <span className={s.missionIcon}>{task.emoji}</span> : <span className={s.missionIcon}>🎯</span>}
            <div className={s.missionBody}>
              <p className={s.missionLabel}>{selectedArea?.title ?? "אימון"}</p>
              <h2 className={s.missionTitle}>משימה {taskIndex + 1}</h2>
              <p className={s.missionPrompt}>{task.prompt}</p>
            </div>
          </div>

          <div className={s.playArea}>
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
                  <span dir={/^[a-zA-Z]/.test(opt) ? "ltr" : undefined}>{opt}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`${s.feedbackBar} ${
              checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
            }`}
          >
            <p className={s.feedbackText}>{feedback || "בחרu תשובה ולחצu «בדוק»"}</p>
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
