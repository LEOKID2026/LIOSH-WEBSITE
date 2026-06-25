import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import { pickSessionTasks } from "../../../lib/educational-games/educational-task-picker.js";
import {
  DIFFICULTIES,
  formatSelectedPath,
  generatePathPool,
  isNumberPathWin,
  pathFeedback,
  pathTaskKey,
  SCORE,
  TASKS_PER_SESSION,
  validatePath,
} from "./leo-number-path-data.js";
import { buildLeoNumberPathMetrics } from "./leo-number-path-metrics.js";
import styles from "./LeoNumberPathGame.module.css";

/** @typedef {import('./leo-number-path-data.js').DifficultyId} DifficultyId */

const MAX_ATTEMPTS_PER_TASK = 3;

/**
 * @param {number} attemptNum
 */
function scoreForAttempt(attemptNum) {
  if (attemptNum === 1) return SCORE.first;
  if (attemptNum === 2) return SCORE.second;
  return SCORE.third;
}

export default function LeoNumberPathGame({
  autoStart = false,
  initialDifficulty = "easy",
  productionMode = false,
  onSessionEnd,
  backHref = "/student/educational-games",
  showFullscreenButton = false,
  isFullscreen = false,
  onFullscreenToggle,
}) {
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;
  const sessionEndFiredRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
  const [tasks, setTasks] = useState(/** @type {import('./leo-number-path-data.js').PathTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number[]} */ ([]));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attemptsOnTask, setAttemptsOnTask] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const diffConfig = DIFFICULTIES[difficulty];
  const currentTask = tasks[taskIndex] ?? null;
  const orderMatters = currentTask?.orderMatters ?? false;
  const stoneCols =
    currentTask && currentTask.numbers.length > 14 ? styles.stonesDense : styles.stonesNormal;

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const resetTaskUi = useCallback(() => {
    setSelected([]);
    setAttemptsOnTask(0);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    const run = pickSessionTasks(
      generatePathPool,
      difficulty,
      {},
      TASKS_PER_SESSION,
      pathTaskKey,
    );
    setTasks(run);
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setFailedAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);
    startTimeRef.current = Date.now();
    sessionEndFiredRef.current = false;
    resetTaskUi();
    setPhase("play");
  }, [difficulty, resetTaskUi]);

  useEffect(() => {
    if (!autoStart || phase !== "play" || tasks.length > 0) return;
    startGame();
  }, [autoStart, phase, tasks.length, startGame]);

  const endRun = useCallback((nextPhase) => {
    setPhase(nextPhase);
  }, []);

  const advanceTask = useCallback(() => {
    const nextIdx = taskIndex + 1;
    if (nextIdx >= tasks.length) {
      endRun("won");
      return;
    }
    setTaskIndex(nextIdx);
    resetTaskUi();
  }, [taskIndex, tasks.length, resetTaskUi, endRun]);

  const tapNumber = useCallback(
    (n) => {
      if (phase !== "play" || checkState === "ok") return;
      setSelected((prev) => {
        const idx = prev.indexOf(n);
        if (idx >= 0) return prev.filter((x) => x !== n);
        return [...prev, n];
      });
      setCheckState("idle");
      setFeedback("");
    },
    [phase, checkState],
  );

  const clearSelection = useCallback(() => {
    if (checkState === "ok") return;
    setSelected([]);
    setCheckState("idle");
    setFeedback("");
  }, [checkState]);

  const runCheck = useCallback(() => {
    if (!currentTask || phase !== "play" || checkState === "ok") return;

    const attemptNum = attemptsOnTask + 1;
    setAttemptsOnTask(attemptNum);

    const ok = validatePath(currentTask, selected);

    if (ok) {
      setCheckState("ok");
      setFeedback(pathFeedback(true));
      setSuccessCount((c) => c + 1);
      addScore(scoreForAttempt(attemptNum));

      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });

      window.setTimeout(() => {
        advanceTask();
      }, 1600);
      return;
    }

    setCheckState("bad");
    setCurrentStreak(0);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setFailedAttempts((f) => f + 1);
    setFeedback(pathFeedback(false));

    if (nextMistakes >= diffConfig.maxMistakes) {
      window.setTimeout(() => {
        endRun("lost");
      }, 1800);
      return;
    }

    if (attemptNum >= MAX_ATTEMPTS_PER_TASK) {
      window.setTimeout(() => {
        advanceTask();
      }, 1800);
    }
  }, [
    currentTask,
    phase,
    checkState,
    attemptsOnTask,
    selected,
    addScore,
    advanceTask,
    mistakes,
    diffConfig.maxMistakes,
    endRun,
  ]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const total = tasks.length || TASKS_PER_SESSION;
    const reached =
      phase === "won" ? total : Math.min(total, Math.max(1, taskIndex + 1));
    const didWin = isNumberPathWin(successCount, total, mistakes, diffConfig.maxMistakes);
    return buildLeoNumberPathMetrics({
      score,
      didWin,
      difficulty,
      tasksTotal: total,
      tasksReached: reached,
      successfulTasks: successCount,
      failedAttempts,
      mistakes,
      bestStreak,
      durationSec: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
    });
  }, [
    phase,
    score,
    difficulty,
    tasks.length,
    taskIndex,
    successCount,
    failedAttempts,
    mistakes,
    bestStreak,
    diffConfig.maxMistakes,
  ]);

  useEffect(() => {
    if (phase !== "won" && phase !== "lost") return;
    if (!productionMode || !onSessionEndRef.current || sessionEndFiredRef.current || !endMetrics) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(endMetrics);
  }, [phase, productionMode, endMetrics]);

  return (
    <div className={`${styles.shell} ${productionMode ? styles.shellEmbedded : ""}`} dir="rtl">
      <header className={styles.header}>
        {!productionMode ? (
          <Link href={backHref} className={styles.backBtn}>
            ← חזרה
          </Link>
        ) : (
          <div style={{ minWidth: 40 }} aria-hidden />
        )}
        {phase === "play" ? (
          <div className={styles.hud}>
            <span className={`${styles.hudChip} ${styles.hudScore}`}>⭐ {score}</span>
            <span className={`${styles.hudChip} ${styles.hudProgress}`}>
              🪨 {taskIndex + 1}/{TASKS_PER_SESSION}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={styles.hudChip}>{diffConfig.label}</span>
            {showFullscreenButton && onFullscreenToggle ? (
              <EducationalGameHudFullscreenButton
                isFullscreen={isFullscreen}
                onToggle={onFullscreenToggle}
              />
            ) : null}
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>{productionMode ? "🔢" : "🔢 אבטיפוס"}</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🔢🦁</p>
          <h1 className={styles.introTitle}>מסלול המספרים של ליאו</h1>
          <p className={styles.introText}>
            בחרו מספרים במסלול לפי הכלל — קפיצות, זוגי/אי־זוגי וכפולות!
          </p>
          <div className={styles.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.diffBtn} ${difficulty === id ? styles.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].label}
              </button>
            ))}
          </div>
          <p className={styles.introText} style={{ fontSize: "0.78rem" }}>
            {TASKS_PER_SESSION} משימות · עד {MAX_ATTEMPTS_PER_TASK} ניסיונות לכל משימה
          </p>
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && currentTask ? (
        <div className={styles.main}>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon}>🪨</span>
            <div className={styles.missionBody}>
              <p className={styles.missionLabel}>מסלול</p>
              <h2 className={styles.missionTitle}>משימת מספרים</h2>
              <p className={styles.missionPrompt}>{currentTask.promptHe}</p>
            </div>
          </div>

          <div className={styles.selectedBar}>
            <span className={styles.selectedLabel}>בחרנו:</span>
            <span className={styles.selectedPath} dir="ltr">
              {formatSelectedPath(selected, orderMatters)}
            </span>
          </div>

          <div className={styles.playStack}>
            <div className={styles.pathPanel}>
              <div className={`${styles.stonePath} ${stoneCols}`}>
                {currentTask.numbers.map((n) => {
                  const selIdx = selected.indexOf(n);
                  const isSel = selIdx >= 0;
                  return (
                    <button
                      key={`${n}-${currentTask.id}`}
                      type="button"
                      className={`${styles.stone} ${isSel ? styles.stoneSelected : ""}`}
                      onClick={() => tapNumber(n)}
                    >
                      {isSel && orderMatters ? (
                        <span className={styles.stoneOrder}>{selIdx + 1}</span>
                      ) : null}
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`${styles.feedbackBar} ${
                checkState === "ok"
                  ? styles.feedbackOk
                  : checkState === "bad"
                    ? styles.feedbackBad
                    : styles.feedbackNeutral
              }`}
            >
              <p className={styles.feedbackText}>
                {feedback ||
                  (attemptsOnTask > 0
                    ? `ניסיון ${attemptsOnTask}/${MAX_ATTEMPTS_PER_TASK} — לחצו על המספרים ואז בדקו`
                    : "לחצו על המספרים ואז בדקו מסלול")}
              </p>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={checkState === "ok"}
                onClick={runCheck}
              >
                בדוק מסלול
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={checkState === "ok" || selected.length === 0}
                onClick={clearSelection}
              >
                נקה בחירה
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>🎉 סיימתם את המסלול!</h2>
            <p className={styles.endStat}>⭐ ניקוד: {score}</p>
            <p className={styles.endStat}>
              ✅ הצלחות: {successCount}/{tasks.length || TASKS_PER_SESSION}
            </p>
            <p className={styles.endStat}>❌ טעויות: {mistakes}</p>
            <p className={styles.endStat}>📊 רמה: {diffConfig.label}</p>
            <div className={styles.endActions}>
              <button type="button" className={styles.startBtn} onClick={() => setPhase("intro")}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
