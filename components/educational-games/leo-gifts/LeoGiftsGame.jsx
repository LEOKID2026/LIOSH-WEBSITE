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
  childEmojiAt,
  childrenGridClass,
  DIFFICULTIES,
  generateGiftsPool,
  giftsFeedback,
  giftsPrompt,
  giftsTaskKey,
  validateGiftsDivision,
} from "./leo-gifts-data.js";
import { buildLeoGiftsMetrics } from "./leo-gifts-metrics.js";
import styles from "./LeoGiftsGame.module.css";

/** @typedef {import('./leo-gifts-data.js').DifficultyId} DifficultyId */

export default function LeoGiftsGame({
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
  const [task, setTask] = useState(/** @type {import('./leo-gifts-data.js').GiftsTask|null} */ (null));
  const [perChild, setPerChild] = useState(0);
  const [remainder, setRemainder] = useState(0);
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
  const gridClass = task ? styles[childrenGridClass(task.children)] : "";

  const resetTaskUi = useCallback(() => {
    setPerChild(0);
    setRemainder(0);
    setCheckState("idle");
    setFeedback("");
    timeoutHandledRef.current = false;
  }, []);

  const loadNextTask = useCallback(
    (stage) => {
      let next = pickNextTask(
        generateGiftsPool,
        difficulty,
        { stage },
        usedKeysRef.current,
        lastKeyRef.current,
        giftsTaskKey,
      );
      if (!next) {
        usedKeysRef.current.clear();
        next = pickNextTask(
          generateGiftsPool,
          difficulty,
          { stage },
          usedKeysRef.current,
          null,
          giftsTaskKey,
        );
      }
      if (!next) return false;
      const key = giftsTaskKey(next);
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

  const runCheck = useCallback(() => {
    if (!task || phase !== "play" || timerPausedRef.current) return;
    const result = validateGiftsDivision(task, perChild, remainder);
    if (result.ok) {
      timerPausedRef.current = true;
      const elapsed = Math.max(0.5, (Date.now() - questionStartRef.current) / 1000);
      answerTimesRef.current.push(elapsed);
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      setFeedback(giftsFeedback(true, perChild, remainder));
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
    setFeedback(giftsFeedback(false, perChild, remainder));
    registerMistake();
  }, [
    task,
    phase,
    perChild,
    remainder,
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
    return buildLeoGiftsMetrics({
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
            <span className={styles.hudChip}>{productionMode ? "🎁" : "🎁 אבטיפוס"}</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🎁🦁</p>
          <h1 className={styles.introTitle}>המתנות של ליאו</h1>
          <p className={styles.introText}>עזרו לליאו לחלק מתנות וסוכריות בין הילדים בצורה שווה!</p>
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
          <div className={styles.taskTop}>
            <div className={styles.missionCard}>
              <span className={styles.missionIcon}>{task.itemEmoji}</span>
              <div className={styles.missionBody}>
                <p className={styles.missionLabel}>משימה</p>
                <h2 className={styles.missionTitle}>חלוקה שווה</h2>
                <p className={styles.missionPrompt}>{giftsPrompt(task)}</p>
              </div>
            </div>
            <div className={styles.infoBar}>
              {task.total} {task.itemLabel} · {task.children} ילדים
            </div>
          </div>

          <div className={styles.gameArea}>
            <div className={styles.childrenPanel}>
              <p className={styles.panelTitle}>👧👦 הילדים</p>
              <div className={`${styles.childrenGrid} ${gridClass}`}>
                {Array.from({ length: task.children }, (_, i) => (
                  <div key={i} className={styles.childCard}>
                    <span className={styles.childLabel}>ילד {i + 1}</span>
                    <span className={styles.childEmoji}>{childEmojiAt(i)}</span>
                    <span className={styles.childGift}>{task.itemEmoji}</span>
                    <span className={styles.childCount}>{perChild}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.controlsFooter}>
            <div className={styles.controlsPanel}>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>לכל ילד</span>
                <div className={styles.stepperRow}>
                  <button type="button" className={styles.stepperBtn} onClick={() => { setPerChild((v) => Math.max(0, v - 1)); setCheckState("idle"); setFeedback(""); }}>
                    −
                  </button>
                  <span className={styles.stepperValue}>{perChild}</span>
                  <button type="button" className={styles.stepperBtn} onClick={() => { setPerChild((v) => Math.min(task.total, v + 1)); setCheckState("idle"); setFeedback(""); }}>
                    +
                  </button>
                </div>
              </div>
              <div className={styles.controlCol}>
                <span className={styles.controlLabel}>נשאר לליאו 🧺</span>
                <div className={styles.stepperRow}>
                  <button type="button" className={styles.stepperBtn} onClick={() => { setRemainder((v) => Math.max(0, v - 1)); setCheckState("idle"); setFeedback(""); }}>
                    −
                  </button>
                  <span className={styles.stepperValue}>{remainder}</span>
                  <button type="button" className={styles.stepperBtn} onClick={() => { setRemainder((v) => Math.min(task.total, v + 1)); setCheckState("idle"); setFeedback(""); }}>
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className={`${styles.feedbackBar} ${checkState === "ok" ? styles.feedbackOk : checkState === "bad" ? styles.feedbackBad : styles.feedbackNeutral}`}>
              <p className={styles.feedbackText}>{feedback || "בחרו כמה כל ילד מקבל וכמה נשאר לליאו"}</p>
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryBtn} onClick={runCheck}>
                בדוק חלוקה
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
            <h2 className={styles.endTitle}>🎁 סיום משחק</h2>
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
