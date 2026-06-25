import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import {
  calcTimeBonus,
  getContinuousDifficulty,
  internalStageFromSuccesses,
  SCORE_CORRECT,
  SCORE_STREAK_BONUS,
  STREAK_BONUS_EVERY,
  timeLimitForStage,
} from "../../../lib/educational-games/continuous-play.js";
import { pickNextTask } from "../../../lib/educational-games/educational-task-picker.js";
import {
  bakeryFeedback,
  bakeryPrompt,
  bakeryTaskKey,
  DIFFICULTIES,
  generateBakeryPool,
  trayItemDisplay,
  validateBakery,
} from "./leo-bakery-data.js";
import { buildLeoBakeryMetrics } from "./leo-bakery-metrics.js";
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
  const usedKeysRef = useRef(/** @type {Set<string>} */ (new Set()));
  const lastKeyRef = useRef(/** @type {string|null} */ (null));
  const questionStartRef = useRef(Date.now());
  const answerTimesRef = useRef(/** @type {number[]} */ ([]));
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
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

  const diffConfig = getContinuousDifficulty(difficulty);
  const total = trays * perTray;

  const lockTrays = task?.mode === "findTotal" || task?.mode === "findPerTray";
  const lockPerTray = task?.mode === "findTrays";
  const lockTotal = task?.mode === "build" || task?.mode === "findTrays" || task?.mode === "findPerTray";

  const displayPerTray = task?.mode === "findTrays" ? (task.perTray ?? 1) : perTray;
  const displayTotal =
    task?.mode === "findTrays" || task?.mode === "findPerTray"
      ? (task?.total ?? total)
      : total;

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
    timeoutHandledRef.current = false;
  }, []);

  useEffect(() => {
    if (!task) return;
    setTrays(1);
    setPerTray(task.mode === "findTrays" ? (task.perTray ?? 1) : 1);
    setCheckState("idle");
    setFeedback("");
  }, [task]);

  const loadNextTask = useCallback(
    (stage) => {
      let next = pickNextTask(
        generateBakeryPool,
        difficulty,
        { stage },
        usedKeysRef.current,
        lastKeyRef.current,
        bakeryTaskKey,
      );
      if (!next) {
        usedKeysRef.current.clear();
        next = pickNextTask(
          generateBakeryPool,
          difficulty,
          { stage },
          usedKeysRef.current,
          null,
          bakeryTaskKey,
        );
      }
      if (!next) return false;
      const key = bakeryTaskKey(next);
      usedKeysRef.current.add(key);
      lastKeyRef.current = key;
      setTask(next);
      resetTaskUi();
      const limit = timeLimitForStage(diffConfig.startTimeSec, stage);
      setTimeLimitSec(limit);
      setTimeLeft(limit);
      questionStartRef.current = Date.now();
      timerPausedRef.current = false;
      return true;
    },
    [difficulty, diffConfig.startTimeSec, resetTaskUi],
  );

  const endRun = useCallback(() => {
    timerPausedRef.current = true;
    setPhase("lost");
  }, []);

  const registerMistake = useCallback(() => {
    setMistakes((m) => {
      const next = m + 1;
      if (next >= diffConfig.maxMistakes) {
        window.setTimeout(endRun, 1200);
      }
      return next;
    });
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
  }, [diffConfig.maxMistakes, endRun]);

  const startGame = useCallback(() => {
    usedKeysRef.current.clear();
    lastKeyRef.current = null;
    answerTimesRef.current = [];
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setFailedAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setHighestStage(1);
    setInternalStage(1);
    startTimeRef.current = Date.now();
    sessionEndFiredRef.current = false;
    const stage = 1;
    if (!loadNextTask(stage)) return;
    setPhase("play");
  }, [loadNextTask]);

  useEffect(() => {
    if (!autoStart || phase !== "play" || task) return;
    startGame();
  }, [autoStart, phase, task, startGame]);

  const advanceAfterSuccess = useCallback(() => {
    const nextSuccess = successCount + 1;
    const stage = internalStageFromSuccesses(nextSuccess);
    setInternalStage(stage);
    setHighestStage((h) => Math.max(h, stage));
    setSuccessCount(nextSuccess);
    if (!loadNextTask(stage)) {
      endRun();
    }
  }, [successCount, loadNextTask, endRun]);

  const handleTimeout = useCallback(() => {
    if (timeoutHandledRef.current || timerPausedRef.current) return;
    timeoutHandledRef.current = true;
    timerPausedRef.current = true;
    setCheckState("bad");
    setFeedback("הזמן נגמר! ננסה שאלה חדשה.");
    registerMistake();
    const stage = internalStage;
    window.setTimeout(() => {
      if (mistakes + 1 >= diffConfig.maxMistakes) return;
      loadNextTask(stage);
    }, 1400);
  }, [registerMistake, internalStage, loadNextTask, mistakes, diffConfig.maxMistakes]);

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
      setFeedback(bakeryFeedback(true));
      setScore((s) => s + SCORE_CORRECT + bonus);
      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next > 0 && next % STREAK_BONUS_EVERY === 0) {
          setScore((sc) => sc + SCORE_STREAK_BONUS);
        }
        return next;
      });
      window.setTimeout(() => {
        advanceAfterSuccess();
      }, 1400);
      return;
    }
    setCheckState("bad");
    setFeedback(bakeryFeedback(false));
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
  ]);

  const endMetrics = useMemo(() => {
    if (phase !== "lost") return null;
    const times = answerTimesRef.current;
    const avgAnswerSec =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return buildLeoBakeryMetrics({
      score,
      didWin: successCount >= 25,
      difficulty,
      successfulQuestions: successCount,
      questionsReached: successCount + (task ? 1 : 0),
      failedAttempts,
      mistakes,
      bestStreak,
      highestStage,
      durationSec: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
      avgAnswerSec,
    });
  }, [phase, score, successCount, failedAttempts, mistakes, bestStreak, highestStage, difficulty, task]);

  useEffect(() => {
    if (phase !== "lost") return;
    if (!productionMode || !onSessionEndRef.current || sessionEndFiredRef.current || !endMetrics) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(endMetrics);
  }, [phase, productionMode, endMetrics]);

  const avgDisplay =
    answerTimesRef.current.length > 0
      ? (answerTimesRef.current.reduce((a, b) => a + b, 0) / answerTimesRef.current.length).toFixed(1)
      : "—";

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
            <span className={styles.hudChip}>שלב {internalStage}</span>
            <span className={`${styles.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            {showFullscreenButton && onFullscreenToggle ? (
              <EducationalGameHudFullscreenButton
                isFullscreen={isFullscreen}
                onToggle={onFullscreenToggle}
              />
            ) : null}
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>{productionMode ? "🥐" : "🥐 אבטיפוס"}</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🥐🦁</p>
          <h1 className={styles.introTitle}>המאפייה של ליאו</h1>
          <p className={styles.introText}>בנו תבניות עם כמות שווה של מאפים — כפל וקבוצות שוות!</p>
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
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={styles.main}>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon}>{task.itemEmoji}</span>
            <div className={styles.missionBody}>
              <p className={styles.missionLabel}>הזמנה</p>
              <h2 className={styles.missionTitle}>מאפיית ליאו</h2>
              <p className={styles.missionPrompt}>{bakeryPrompt(task)}</p>
            </div>
          </div>

          <div className={styles.formulaBar}>
            {trays} תבניות × {displayPerTray} בכל תבנית = {displayTotal} {task.itemEmoji}
          </div>

          <div className={styles.playStack}>
            <div className={styles.traysPanel}>
              <p className={styles.panelTitle}>🧁 התבניות שלכם</p>
              <div className={styles.trayGrid}>
                {trayPreview.map((tr) => {
                  const disp = trayItemDisplay(tr.count, task.itemEmoji);
                  return (
                    <div key={tr.id} className={styles.trayCard}>
                      <span className={styles.trayLabel}>תבנית {tr.id + 1}</span>
                      <span className={styles.trayItems}>{disp.text}</span>
                    </div>
                  );
                })}
                {trays > 10 ? (
                  <p className={styles.moreTrays}>+{trays - 10} תבניות נוספות</p>
                ) : null}
              </div>
            </div>

            <div className={styles.controlsPanel}>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>תבניות</span>
                <div className={styles.stepperRow}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    disabled={lockTrays}
                    onClick={() => {
                      setTrays((v) => Math.max(1, v - 1));
                      clearFeedback();
                    }}
                  >
                    −
                  </button>
                  <span className={styles.stepperValue}>{trays}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
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
                <div className={styles.stepperRow}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    disabled={lockPerTray}
                    onClick={() => {
                      setPerTray((v) => Math.max(1, v - 1));
                      clearFeedback();
                    }}
                  >
                    −
                  </button>
                  <span className={styles.stepperValue}>{displayPerTray}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
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
              className={`${styles.feedbackBar} ${
                checkState === "ok"
                  ? styles.feedbackOk
                  : checkState === "bad"
                    ? styles.feedbackBad
                    : styles.feedbackNeutral
              }`}
            >
              <p className={styles.feedbackText}>
                {feedback || "הגדירו תבניות וכמות בכל תבנית, ואז לחצו בדיקה"}
              </p>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryBtn} onClick={runCheck}>
                בדוק הזמנה
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={resetTaskUi}>
                איפוס
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "lost" ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>🥐 סיום משחק</h2>
            <p className={styles.endStat}>⭐ ניקוד: {score}</p>
            <p className={styles.endStat}>✅ תשובות נכונות: {successCount}</p>
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
