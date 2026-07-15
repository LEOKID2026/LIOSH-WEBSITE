import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import {
  calcTimeBonus,
  SCORE_CORRECT,
  SCORE_STREAK_BONUS,
  STREAK_BONUS_EVERY,
} from "../../../lib/educational-games/continuous-play.js";
import { maxMistakesForDifficulty } from "../../../lib/educational-games/educational-session-standard.js";
import {
  bakeryFeedback,
  bakeryPrompt,
  bakeryTimeLimitForTask,
  buildBakerySessionRun,
  DIFFICULTIES,
  isBakeryWin,
  TASKS_PER_SESSION,
  trayItemDisplay,
  validateBakery,
} from "./leo-bakery-data.js";
import { buildLeoBakeryMetrics } from "./leo-bakery-metrics.js";
import { sharedStyles as s } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import shop from "../shared/educational-game-shop-layout.module.css";
import gameUi from "../../prototypes/dev/learning/leo-bakery/LeoBakeryGame.module.css";
import styles from "./LeoBakeryGame.module.css";

/** @typedef {import('./leo-bakery-data.js').DifficultyId} DifficultyId */

export default function LeoBakeryGame({
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
  const sessionTasksRef = useRef(/** @type {import('./leo-bakery-data.js').BakeryTask[]} */ ([]));
  const questionStartRef = useRef(Date.now());
  const answerTimesRef = useRef(/** @type {number[]} */ ([]));
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
  const [taskIndex, setTaskIndex] = useState(0);
  const [task, setTask] = useState(/** @type {import('./leo-bakery-data.js').BakeryTask|null} */ (null));
  const [trays, setTrays] = useState(1);
  const [perTray, setPerTray] = useState(1);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [highestStage, setHighestStage] = useState(1);
  const [internalStage, setInternalStage] = useState(1);
  const [timeLimitSec, setTimeLimitSec] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const instructionText = phase === "play" && task ? bakeryPrompt(task) : "";
  const {
    onCorrect,
    onWrong,
    onStreak,
    onTimeUp,
    playFeedback,
    replayInstruction,
  } = useEducationalEngineAudio({
    instructionText,
    autoPlayInstruction: productionMode && phase === "play" && Boolean(task),
  });

  const maxMistakes = maxMistakesForDifficulty(difficulty);
  const diffConfig = { label: DIFFICULTIES[difficulty].label, maxMistakes };
  const total = trays * perTray;

  const lockTrays = task?.mode === "findTotal" || task?.mode === "findPerTray";
  const lockPerTray = task?.mode === "findTrays";
  const lockTotal = task?.mode === "build" || task?.mode === "findTrays" || task?.mode === "findPerTray";

  const displayPerTray = task?.mode === "findTrays" ? (task.perTray ?? 1) : perTray;

  const trayPreview = useMemo(() => {
    if (!task) return [];
    return Array.from({ length: trays }, (_, i) => ({
      id: i,
      count: displayPerTray,
    }));
  }, [task, trays, displayPerTray]);

  const resetTaskUi = useCallback(() => {
    setTrays(1);
    setPerTray(1);
    setCheckState("idle");
    setFeedback("");
    timeoutHandledRef.current = false;
  }, []);

  useEffect(() => {
    if (!task) return;
    setTrays(1);
    setPerTray(task.mode === "findTrays" ? (task.perTray ?? 1) : 1);
    setCheckState("idle");
    setFeedback("");
  }, [task]);

  const loadTaskAtIndex = useCallback(
    (index) => {
      const next = sessionTasksRef.current[index];
      if (!next) return false;
      setTaskIndex(index);
      setTask(next);
      setInternalStage(index + 1);
      setHighestStage((h) => Math.max(h, index + 1));
      resetTaskUi();
      const limit = bakeryTimeLimitForTask(difficulty, index);
      setTimeLimitSec(limit);
      setTimeLeft(limit);
      questionStartRef.current = Date.now();
      timerPausedRef.current = false;
      return true;
    },
    [difficulty, resetTaskUi],
  );

  const endRun = useCallback((result) => {
    timerPausedRef.current = true;
    setPhase(result);
  }, []);

  const registerMistake = useCallback(() => {
    setMistakes((m) => {
      const next = m + 1;
      if (next >= maxMistakes) {
        window.setTimeout(() => endRun("lost"), 1200);
      }
      return next;
    });
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
  }, [maxMistakes, endRun]);

  const startGame = useCallback(() => {
    sessionTasksRef.current = buildBakerySessionRun(difficulty);
    answerTimesRef.current = [];
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setFailedAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setHighestStage(1);
    setInternalStage(1);
    setTaskIndex(0);
    startTimeRef.current = Date.now();
    sessionEndFiredRef.current = false;
    if (!loadTaskAtIndex(0)) return;
    setPhase("play");
  }, [difficulty, loadTaskAtIndex]);

  useEffect(() => {
    if (!autoStart || phase !== "play" || task) return;
    startGame();
  }, [autoStart, phase, task, startGame]);

  const advanceAfterSuccess = useCallback(() => {
    const nextSuccess = successCount + 1;
    setSuccessCount(nextSuccess);
    if (nextSuccess >= TASKS_PER_SESSION) {
      window.setTimeout(() => endRun("won"), 1200);
      return;
    }
    loadTaskAtIndex(nextSuccess);
  }, [successCount, loadTaskAtIndex, endRun]);

  const handleTimeout = useCallback(() => {
    if (timeoutHandledRef.current || timerPausedRef.current) return;
    timeoutHandledRef.current = true;
    timerPausedRef.current = true;
    setCheckState("bad");
    const timeoutText = "הזמן נגמר! ננסה שאלה חדשה.";
    setFeedback(timeoutText);
    onTimeUp();
    playFeedback(timeoutText);
    registerMistake();
    window.setTimeout(() => {
      if (mistakes + 1 >= maxMistakes) return;
      loadTaskAtIndex(taskIndex);
    }, 1400);
  }, [registerMistake, loadTaskAtIndex, taskIndex, mistakes, maxMistakes, onTimeUp, playFeedback]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    if (timeLeft > 0) return undefined;
    handleTimeout();
    return undefined;
  }, [phase, task, timeLeft, handleTimeout]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    const t = setInterval(() => {
      setTimeLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, task, timeLimitSec]);

  const clearFeedback = useCallback(() => {
    setCheckState("idle");
    setFeedback("");
  }, []);

  const runCheck = useCallback(() => {
    if (!task || phase !== "play" || timerPausedRef.current) return;
    const answerPerTray = task.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
    const answerTotal =
      task.mode === "findTrays" || task.mode === "findPerTray" ? (task.total ?? 0) : total;
    const result = validateBakery(task, { trays, perTray: answerPerTray, total: answerTotal });
    if (result.ok) {
      timerPausedRef.current = true;
      const elapsed = Math.max(0.5, (Date.now() - questionStartRef.current) / 1000);
      answerTimesRef.current.push(elapsed);
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      const okText = bakeryFeedback(true);
      setFeedback(okText);
      onCorrect();
      playFeedback(okText);
      setScore((s) => s + SCORE_CORRECT + bonus);
      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next > 0 && next % STREAK_BONUS_EVERY === 0) {
          setScore((sc) => sc + SCORE_STREAK_BONUS);
          onStreak();
        }
        return next;
      });
      window.setTimeout(() => {
        advanceAfterSuccess();
      }, 1400);
      return;
    }
    setCheckState("bad");
    const badText = bakeryFeedback(false);
    setFeedback(badText);
    onWrong();
    playFeedback(badText);
    registerMistake();
  }, [
    task,
    phase,
    trays,
    perTray,
    total,
    timeLeft,
    timeLimitSec,
    advanceAfterSuccess,
    registerMistake,
    onCorrect,
    onWrong,
    onStreak,
    playFeedback,
  ]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const times = answerTimesRef.current;
    const avgAnswerSec =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const didWin = isBakeryWin(successCount, TASKS_PER_SESSION, mistakes, maxMistakes);
    return buildLeoBakeryMetrics({
      score,
      didWin,
      difficulty,
      successfulQuestions: successCount,
      questionsReached: Math.min(TASKS_PER_SESSION, successCount + (phase === "play" && task ? 1 : 0)),
      failedAttempts,
      mistakes,
      bestStreak,
      highestStage,
      durationSec: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
      avgAnswerSec,
    });
  }, [phase, score, successCount, failedAttempts, mistakes, bestStreak, highestStage, difficulty, task, maxMistakes]);

  useEffect(() => {
    if (phase !== "won" && phase !== "lost") return;
    if (!productionMode || !onSessionEndRef.current || sessionEndFiredRef.current || !endMetrics) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(endMetrics);
  }, [phase, productionMode, endMetrics]);

  const trayGridSizeClass =
    trays <= 4 ? styles.trayGridFew : trays <= 8 ? styles.trayGridMedium : styles.trayGridMany;

  const avgDisplay =
    answerTimesRef.current.length > 0
      ? (answerTimesRef.current.reduce((a, b) => a + b, 0) / answerTimesRef.current.length).toFixed(1)
      : "-";

  const feedbackBarClass = [
    shop.feedbackBar,
    checkState === "ok"
      ? shop.feedbackOk
      : checkState === "bad"
        ? shop.feedbackBad
        : shop.feedbackNeutral,
  ].join(" ");

  return (
    <div className={`${s.shell} ${s.shellWarm} ${productionMode ? styles.shellEmbedded : ""}`} dir="rtl">
      <header className={s.header}>
        <Link href={backHref} className={s.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={s.hud}>
            <span className={`${s.hudChip} ${s.hudScore}`}>⭐ {score}</span>
            <span className={s.hudChip}>שלב {internalStage}</span>
            <span className={`${s.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft}
            </span>
            <span className={`${s.hudChip} ${s.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
          </div>
        ) : (
          <div className={s.hud}>
            <span className={s.hudChip}>{productionMode ? "🥐" : "🥐 אבטיפוס"}</span>
          </div>
        )}
        {showFullscreenButton && onFullscreenToggle ? (
          <EducationalGameHudFullscreenButton
            className={s.hudChip}
            isFullscreen={isFullscreen}
            onToggle={onFullscreenToggle}
          />
        ) : null}
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🥐🦁</p>
          <h1 className={styles.introTitle}>המאפייה של ליאו</h1>
          <p className={styles.introText}>בנו מגשים עם כמות שווה של מאפים - כפל וקבוצות שוות!</p>
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
          <EducationalDifficultyGradeHint className={`${styles.introText} opacity-70`} style={{ fontSize: "0.72rem" }} />
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🥐 מאפיית ליאו · שלב {internalStage}
          </p>

          <div className={`${shop.shopGrid} ${styles.bakeryShopGrid}`} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div className={shop.customerCard}>
                <span className={shop.customerAvatar} aria-hidden>
                  {task.itemEmoji}
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>הזמנה</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>{bakeryPrompt(task)}</p>
                </div>
              </div>
            </aside>

            <section className={`${shop.workCol} ${styles.bakeryWorkCol}`}>
              <div className={shop.workFrame}>
                <div className={shop.workSurface}>
                  <p className={shop.workSurfaceTitle}>🧁 המגשים שלכם</p>
                  <div className={`${shop.workSurfaceBody} ${styles.trayGridFit}`}>
                    <div
                      className={`${gameUi.trayGrid} ${styles.trayGridInner} ${trayGridSizeClass}`}
                    >
                      {trayPreview.map((tr) => {
                        const disp = trayItemDisplay(tr.count, task.itemEmoji);
                        return (
                          <div key={tr.id} className={gameUi.trayCard}>
                            <span className={gameUi.trayLabel}>מגש {tr.id + 1}</span>
                            <span className={`${gameUi.trayItems} ${styles.bakeryTrayItems}`}>{disp.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className={shop.sideCol}>
              <div className={`${s.panel} ${shop.toolsPanel} ${shop.toolsPanelLarge}`}>
                <p className={shop.toolsTitle}>🎛️ הגדרות</p>
                <div className={shop.controlsStackInline}>
                  <div className={shop.controlRow}>
                    <span className={shop.controlLabel}>מגשים</span>
                    <div className={shop.stepperRow}>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        disabled={lockTrays}
                        onClick={() => {
                          setTrays((v) => Math.min(12, v + 1));
                          clearFeedback();
                        }}
                      >
                        +
                      </button>
                      <span className={shop.stepperValue}>{trays}</span>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        disabled={lockTrays}
                        onClick={() => {
                          setTrays((v) => Math.max(1, v - 1));
                          clearFeedback();
                        }}
                      >
                        −
                      </button>
                    </div>
                  </div>
                  <div className={shop.controlRow}>
                    <span className={shop.controlLabel}>בכל מגש</span>
                    <div className={shop.stepperRow}>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        disabled={lockPerTray}
                        onClick={() => {
                          setPerTray((v) => Math.min(12, v + 1));
                          clearFeedback();
                        }}
                      >
                        +
                      </button>
                      <span className={shop.stepperValue}>{displayPerTray}</span>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        disabled={lockPerTray}
                        onClick={() => {
                          setPerTray((v) => Math.max(1, v - 1));
                          clearFeedback();
                        }}
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>
                {!lockTotal ? (
                  <div className={shop.controlRow}>
                    <span className={shop.controlLabel}>סך הכול</span>
                    <span className={shop.totalBadge}>{total}</span>
                  </div>
                ) : null}
              </div>

              <div className={feedbackBarClass}>
                <p className={shop.feedbackText}>
                  {feedback || "הגדירו מגשים וכמות בכל מגש, ואז לחצו בדיקה"}
                </p>
              </div>
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} onClick={runCheck}>
                  בדוק הזמנה
                </button>
                <button type="button" className={shop.secondaryBtn} onClick={resetTaskUi}>
                  איפוס
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" || phase === "lost" ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>
              {phase === "won" ? "🎉 סיימתם את המאפייה!" : "🥐 סיום משחק"}
            </h2>
            <p className={styles.endStat}>⭐ ניקוד: {score}</p>
            <p className={styles.endStat}>
              ✅ תשובות נכונות: {successCount}/{TASKS_PER_SESSION}
            </p>
            <p className={styles.endStat}>❌ טעויות: {mistakes}</p>
            <p className={styles.endStat}>📈 שלב הכי גבוה: {highestStage}</p>
            <p className={styles.endStat}>📊 התחלתם ב: {diffConfig.label}</p>
            <p className={styles.endStat}>⏱ זמן ממוצע: {avgDisplay} שניות</p>
            <div className={styles.endActions}>
              <button type="button" className={styles.startBtn} onClick={startGame}>
                משחק חדש
              </button>
              {!productionMode ? (
                <Link href={backHref} className={styles.secondaryBtn}>
                  חזרה למשחקים
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
