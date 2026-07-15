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
  childEmojiAt,
  childrenGridClass,
  buildGiftsSessionRun,
  DIFFICULTIES,
  giftsFeedback,
  giftsPrompt,
  giftsTimeLimitForTask,
  isGiftsWin,
  TASKS_PER_SESSION,
  validateGiftsDivision,
} from "./leo-gifts-data.js";
import { buildLeoGiftsMetrics } from "./leo-gifts-metrics.js";
import { sharedStyles as s } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import shop from "../shared/educational-game-shop-layout.module.css";
import gameUi from "../../prototypes/dev/learning/leo-gifts/LeoGiftsGame.module.css";
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
  const sessionTasksRef = useRef(/** @type {import('./leo-gifts-data.js').GiftsTask[]} */ ([]));
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

  const instructionText = phase === "play" && task ? giftsPrompt(task) : "";
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
  const gridClass = task ? gameUi[childrenGridClass(task.children)] : "";
  const showRemainder = difficulty !== "easy";

  const resetTaskUi = useCallback(() => {
    setPerChild(0);
    setRemainder(0);
    setCheckState("idle");
    setFeedback("");
    timeoutHandledRef.current = false;
  }, []);

  const loadTaskAtIndex = useCallback(
    (index) => {
      const next = sessionTasksRef.current[index];
      if (!next) return false;
      setTaskIndex(index);
      setTask(next);
      setInternalStage(index + 1);
      setHighestStage((h) => Math.max(h, index + 1));
      resetTaskUi();
      const limit = giftsTimeLimitForTask(difficulty, index);
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
    sessionTasksRef.current = buildGiftsSessionRun(difficulty);
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

  const runCheck = useCallback(() => {
    if (!task || phase !== "play" || timerPausedRef.current) return;
    const result = validateGiftsDivision(task, perChild, remainder);
    if (result.ok) {
      timerPausedRef.current = true;
      const elapsed = Math.max(0.5, (Date.now() - questionStartRef.current) / 1000);
      answerTimesRef.current.push(elapsed);
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      const okText = giftsFeedback(true, perChild, remainder);
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
    const badText = giftsFeedback(false, perChild, remainder);
    setFeedback(badText);
    onWrong();
    playFeedback(badText);
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
    const didWin = isGiftsWin(successCount, TASKS_PER_SESSION, mistakes, maxMistakes);
    return buildLeoGiftsMetrics({
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

  const idleFeedback = showRemainder
    ? "בחרו כמה כל ילד מקבל וכמה נשאר לליאו"
    : "בחרו כמה ממתקים כל ילד מקבל";

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
            <span className={s.hudChip}>{productionMode ? "🍬" : "🍬 אבטיפוס"}</span>
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
          <p className={styles.introHero}>🍬🦁</p>
          <h1 className={styles.introTitle}>חנות הממתקים של ליאו</h1>
          <p className={styles.introText}>עזרו לליאו לחלק ממתקים בין הילדים בצורה שווה!</p>
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
            🍬 חנות הממתקים · שלב {internalStage}
          </p>

          <div className={`${shop.shopGrid} ${styles.giftsShopGrid}`} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div className={shop.customerCard}>
                <span className={shop.customerAvatar} aria-hidden>
                  {task.itemEmoji}
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>משימה</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>{giftsPrompt(task)}</p>
                </div>
              </div>
            </aside>

            <section className={`${shop.workCol} ${styles.giftsWorkCol}`}>
              <div className={shop.workFrame}>
                <div className={shop.workSurface}>
                  <p className={shop.workSurfaceTitle}>👧👦 הילדים</p>
                  <div className={`${shop.workSurfaceBody} ${styles.childrenGridFit}`}>
                    <div className={`${gameUi.childrenGrid} ${gridClass} ${styles.childrenGridInner}`}>
                      {Array.from({ length: task.children }, (_, i) => (
                        <div key={i} className={gameUi.childCard}>
                          <span className={gameUi.childLabel}>ילד {i + 1}</span>
                          <span className={gameUi.childEmoji}>{childEmojiAt(i)}</span>
                          <span className={gameUi.childGift}>{task.itemEmoji}</span>
                          <span className={gameUi.childCount}>{perChild}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className={shop.sideCol}>
              <div className={`${s.panel} ${shop.toolsPanel} ${shop.toolsPanelLarge}`}>
                <p className={shop.toolsTitle}>🎛️ חלוקה</p>
                <div
                  className={`${shop.controlsStackInline} ${!showRemainder ? shop.controlsStackSingle : ""}`}
                >
                  <div className={shop.controlRow}>
                    <span className={shop.controlLabel}>לכל ילד</span>
                    <div className={shop.stepperRow}>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        onClick={() => {
                          setPerChild((v) => Math.min(task.total, v + 1));
                          setCheckState("idle");
                          setFeedback("");
                        }}
                      >
                        +
                      </button>
                      <span className={shop.stepperValue}>{perChild}</span>
                      <button
                        type="button"
                        className={shop.stepperBtn}
                        onClick={() => {
                          setPerChild((v) => Math.max(0, v - 1));
                          setCheckState("idle");
                          setFeedback("");
                        }}
                      >
                        −
                      </button>
                    </div>
                  </div>
                  {showRemainder ? (
                    <div className={shop.controlRow}>
                      <span className={shop.controlLabel}>נשאר לליאו 🧺</span>
                      <div className={shop.stepperRow}>
                        <button
                          type="button"
                          className={shop.stepperBtn}
                          onClick={() => {
                            setRemainder((v) => Math.min(task.total, v + 1));
                            setCheckState("idle");
                            setFeedback("");
                          }}
                        >
                          +
                        </button>
                        <span className={shop.stepperValue}>{remainder}</span>
                        <button
                          type="button"
                          className={shop.stepperBtn}
                          onClick={() => {
                            setRemainder((v) => Math.max(0, v - 1));
                            setCheckState("idle");
                            setFeedback("");
                          }}
                        >
                          −
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={feedbackBarClass}>
                <p className={shop.feedbackText}>{feedback || idleFeedback}</p>
              </div>
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} onClick={runCheck}>
                  בדוק חלוקה
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
              {phase === "won" ? "🎉 סיימתם את חנות הממתקים!" : "🍬 סיום משחק"}
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
