import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sharedStyles as frame } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import {
  DIFFICULTIES,
  buildOrderedSessionRun,
  formatSelectedPath,
  isNumberPathWin,
  pathFeedback,
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
  const instructionText = phase === "play" && currentTask ? currentTask.promptHe : "";
  const {
    onCorrect,
    onWrong,
    onStreak,
    playFeedback,
    replayInstruction,
    audio,
  } = useEducationalEngineAudio({
    instructionText,
    autoPlayInstruction: productionMode && phase === "play" && Boolean(currentTask),
  });
  const orderMatters = currentTask?.orderMatters ?? false;
  const stoneGridSizeClass = currentTask
    ? currentTask.numbers.length <= 12
      ? styles.stonesGridFew
      : currentTask.numbers.length <= 18
        ? styles.stonesGridMedium
        : styles.stonesGridMany
    : "";

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
    const run = buildOrderedSessionRun(difficulty, TASKS_PER_SESSION);
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
      audio.playSfx("sfx-ui-click");
    },
    [phase, checkState, audio],
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
      const okText = pathFeedback(true);
      setFeedback(okText);
      onCorrect();
      playFeedback(okText);
      setSuccessCount((c) => c + 1);
      addScore(scoreForAttempt(attemptNum));

      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next === 3 || next === 5) onStreak();
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
    const badText = pathFeedback(false);
    setFeedback(badText);
    onWrong();
    playFeedback(badText);

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
    onCorrect,
    onWrong,
    onStreak,
    playFeedback,
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
    <div className={`${frame.shell} ${frame.shellWarm} ${productionMode ? styles.shellEmbedded : ""}`} dir="rtl">
      <header className={frame.header}>
        <Link href={backHref} className={frame.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={frame.hud}>
            <span className={`${frame.hudChip} ${frame.hudScore}`}>⭐ {score}</span>
            <span className={`${frame.hudChip} ${frame.hudProgress}`}>
              🪨 {taskIndex + 1}/{TASKS_PER_SESSION}
            </span>
            <span className={`${frame.hudChip} ${frame.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={frame.hudChip}>{diffConfig.label}</span>
          </div>
        ) : (
          <div className={frame.hud}>
            <span className={frame.hudChip}>{productionMode ? "🔢" : "🔢 אבטיפוס"}</span>
          </div>
        )}
        {showFullscreenButton && onFullscreenToggle ? (
          <EducationalGameHudFullscreenButton
            className={frame.hudChip}
            isFullscreen={isFullscreen}
            onToggle={onFullscreenToggle}
          />
        ) : null}
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={frame.screenCenter}>
          <p className={frame.introHero}>🔢🦁</p>
          <h1 className={frame.introTitle}>מסלול המספרים של ליאו</h1>
          <p className={frame.introText}>
            בחרו מספרים במסלול לפי הכלל - קפיצות, זוגי/אי-זוגי וכפולות!
          </p>
          <div className={frame.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${frame.diffBtn} ${difficulty === id ? frame.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].label}
              </button>
            ))}
          </div>
          <EducationalDifficultyGradeHint className={`${frame.introText} opacity-70`} style={{ fontSize: "0.72rem" }} />
          <p className={frame.introText} style={{ fontSize: "0.78rem" }}>
            {TASKS_PER_SESSION} משימות · עד {MAX_ATTEMPTS_PER_TASK} ניסיונות לכל משימה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && currentTask ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🔢 מסלול המספרים · משימה {taskIndex + 1}/{TASKS_PER_SESSION}
          </p>

          <div className={`${shop.shopGrid} ${styles.pathShopGrid}`} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div className={shop.customerCard}>
                <span className={shop.customerAvatar} aria-hidden>
                  🪨
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>משימת מספרים</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>
                    {currentTask.promptHe}
                    <span className={shop.missionTicket}>
                      🧾 ניסיון {Math.max(1, attemptsOnTask || 1)}/{MAX_ATTEMPTS_PER_TASK}
                    </span>
                  </p>
                </div>
              </div>
            </aside>

            <section className={`${shop.workCol} ${styles.pathWorkCol}`}>
              <div className={shop.workFrame}>
                <div className={shop.workSurface}>
                  <p className={shop.workSurfaceTitle}>🪨 בחרו מספרים</p>
                  <div className={`${shop.workSurfaceBody} ${styles.pathPanel}`}>
                    <div
                      className={`${styles.stonePath} ${stoneGridSizeClass} ${styles.stonePathFit}`}
                    >
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
                </div>
              </div>
            </section>

            <aside className={shop.sideCol}>
              <div className={`${frame.panel} ${shop.toolsPanel}`}>
                <p className={shop.toolsTitle}>📍 המסלול שלכם</p>
                <div className={styles.selectedBar}>
                  <span className={styles.selectedLabel}>בחרנו:</span>
                  <span className={styles.selectedPath} dir="ltr">
                    {formatSelectedPath(selected, orderMatters)}
                  </span>
                </div>
              </div>

              <div
                className={[
                  shop.feedbackBar,
                  checkState === "ok"
                    ? shop.feedbackOk
                    : checkState === "bad"
                      ? shop.feedbackBad
                      : shop.feedbackNeutral,
                ].join(" ")}
              >
                <p className={shop.feedbackText}>
                  {feedback ||
                    (attemptsOnTask > 0
                      ? `ניסיון ${attemptsOnTask}/${MAX_ATTEMPTS_PER_TASK} - לחצו על המספרים ואז בדקו`
                      : "לחצו על המספרים ואז בדקו מסלול")}
                </p>
              </div>
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button
                  type="button"
                  className={shop.primaryBtn}
                  disabled={checkState === "ok"}
                  onClick={runCheck}
                >
                  בדוק מסלול
                </button>
                <button
                  type="button"
                  className={shop.secondaryBtn}
                  disabled={checkState === "ok" || selected.length === 0}
                  onClick={clearSelection}
                >
                  נקה בחירה
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 סיימתם את המסלול!</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>
              ✅ הצלחות: {successCount}/{tasks.length || TASKS_PER_SESSION}
            </p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <p className={frame.endStat}>📊 רמה: {diffConfig.label}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={() => setPhase("intro")}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
