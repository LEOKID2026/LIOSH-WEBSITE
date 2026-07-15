import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import { calcTimeBonus } from "../../../lib/educational-games/continuous-play.js";
import {
  LANGUAGE_DIFFICULTIES,
  LANGUAGE_SCORE,
  LANGUAGE_SESSION_TASKS,
  taskTimeLimitSec,
} from "../../../lib/educational-games/language-game-config.js";
import { pickRemediationTask } from "../../../lib/educational-games/language-session-planner.js";
import { sharedStyles as frame } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import proto from "../../prototypes/dev/learning/shared/language-prototype-shop.module.css";
import {
  WORD_DETECTIVE_TASKS,
  detectiveFeedback,
  pickWordDetectiveSession,
  validateDetectiveTask,
} from "./leo-word-detective-data.js";
import { buildLeoWordDetectiveMetrics } from "./leo-word-detective-metrics.js";
import styles from "./LeoWordDetectiveGame.module.css";

/** @typedef {import('./leo-word-detective-data.js').DifficultyId} DifficultyId */

export default function LeoWordDetectiveGame({
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
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);
  const mistakesRef = useRef(0);
  const scheduledRemediationRef = useRef(/** @type {Set<string>} */ (new Set()));

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
  const [tasks, setTasks] = useState(/** @type {import('./leo-word-detective-data.js').DetectiveTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [zoneFills, setZoneFills] = useState(/** @type {Record<string, string>} */ ({}));
  const [selectedPiece, setSelectedPiece] = useState(/** @type {string | null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [timeLimitSec, setTimeLimitSec] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45);
  const [taskKey, setTaskKey] = useState(0);
  const [boardAnim, setBoardAnim] = useState(/** @type {'idle'|'shake'|'stamp'} */ ("idle"));

  const diffConfig = LANGUAGE_DIFFICULTIES[difficulty];
  const task = tasks[taskIndex] ?? null;
  const tasksPerSession = tasks.length || LANGUAGE_SESSION_TASKS;
  const instructionText = phase === "play" && task ? task.missionHe : "";

  const {
    onCorrect,
    onWrong,
    onStreak,
    onTimeUp,
    playFeedback,
    replayInstruction,
    audio,
  } = useEducationalEngineAudio({
    instructionText,
    autoPlayInstruction: productionMode && phase === "play" && Boolean(task),
  });

  mistakesRef.current = mistakes;
  const usedPieceIds = new Set(Object.values(zoneFills));

  const scheduleRemediation = useCallback(
    (failedTask) => {
      if (!failedTask) return;
      const pool = WORD_DETECTIVE_TASKS[difficulty] ?? WORD_DETECTIVE_TASKS.easy;
      const usedIds = new Set(tasks.map((t) => t.id));
      const remed = pickRemediationTask(pool, failedTask, usedIds, scheduledRemediationRef.current);
      if (!remed) return;
      scheduledRemediationRef.current.add(remed.id);
      const insertAt = Math.min(taskIndex + 3, tasks.length - 1);
      if (insertAt <= taskIndex + 1) return;
      setTasks((prev) => {
        const next = [...prev];
        next[insertAt] = remed;
        return next;
      });
    },
    [difficulty, tasks, taskIndex],
  );

  const resetTaskUi = useCallback(() => {
    setZoneFills({});
    setSelectedPiece(null);
    setCheckState("idle");
    setFeedback("");
    setBoardAnim("idle");
    timeoutHandledRef.current = false;
    timerPausedRef.current = false;
  }, []);

  const loadTaskTimer = useCallback(() => {
    const limit = taskTimeLimitSec(difficulty, {
      isHebrew: true,
      hasPassage: Boolean(task?.passage),
    });
    setTimeLimitSec(limit);
    setTimeLeft(limit);
  }, [difficulty, task?.passage]);

  useEffect(() => {
    if (!task) return;
    resetTaskUi();
    loadTaskTimer();
  }, [task, resetTaskUi, loadTaskTimer, taskKey]);

  const endRun = useCallback((won) => {
    timerPausedRef.current = true;
    setPhase(won ? "won" : "lost");
  }, []);

  const advanceTask = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= tasksPerSession) {
      endRun(true);
      return;
    }
    setTaskIndex(next);
    setTaskKey((k) => k + 1);
  }, [taskIndex, tasksPerSession, endRun]);

  const registerMistake = useCallback(
    (failedTask) => {
      const next = mistakesRef.current + 1;
      mistakesRef.current = next;
      setMistakes(next);
      setFailedAttempts((f) => f + 1);
      setCurrentStreak(0);
      setScore((s) => Math.max(0, s + LANGUAGE_SCORE.timeout));
      scheduleRemediation(failedTask);
      if (next >= diffConfig.maxMistakes) {
        window.setTimeout(() => endRun(false), 1200);
      }
    },
    [diffConfig.maxMistakes, endRun, scheduleRemediation],
  );

  const handleTimeout = useCallback(() => {
    if (timeoutHandledRef.current || timerPausedRef.current || phase !== "play") return;
    timeoutHandledRef.current = true;
    timerPausedRef.current = true;
    setCheckState("bad");
    setBoardAnim("shake");
    const timeoutText = "הזמן נגמר! התיק נשאר פתוח.";
    setFeedback(timeoutText);
    onTimeUp();
    playFeedback(timeoutText);
    registerMistake(task);
    window.setTimeout(() => {
      if (mistakesRef.current >= diffConfig.maxMistakes) return;
      advanceTask();
    }, 1600);
  }, [phase, registerMistake, advanceTask, diffConfig.maxMistakes, onTimeUp, playFeedback, task]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    if (timeLeft > 0) return undefined;
    handleTimeout();
    return undefined;
  }, [phase, task, timeLeft, handleTimeout]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    const t = window.setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase, task, timeLimitSec, taskKey]);

  const startGame = useCallback(() => {
    scheduledRemediationRef.current = new Set();
    setTasks(pickWordDetectiveSession(difficulty));
    setTaskIndex(0);
    setTaskKey(0);
    setScore(0);
    setMistakes(0);
    mistakesRef.current = 0;
    setSuccessCount(0);
    setFailedAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);
    startTimeRef.current = Date.now();
    sessionEndFiredRef.current = false;
    setPhase("play");
  }, [difficulty]);

  useEffect(() => {
    if (!autoStart || phase !== "play" || tasks.length > 0) return;
    startGame();
  }, [autoStart, phase, tasks.length, startGame]);

  const exitToIntro = useCallback(() => {
    timerPausedRef.current = true;
    setTasks([]);
    setTaskIndex(0);
    setPhase("intro");
  }, []);

  const placeOnZone = useCallback(
    (zoneId) => {
      if (!task || !selectedPiece || timerPausedRef.current) return;
      if (usedPieceIds.has(selectedPiece)) return;
      if (zoneFills[zoneId]) return;

      setZoneFills((z) => ({ ...z, [zoneId]: selectedPiece }));
      setSelectedPiece(null);
      setCheckState("idle");
      setFeedback("");
      audio.playSfx("sfx-evidence");
    },
    [task, selectedPiece, usedPieceIds, zoneFills, audio],
  );

  const clearZone = useCallback(
    (zoneId) => {
      if (timerPausedRef.current) return;
      setZoneFills((z) => {
        const next = { ...z };
        delete next[zoneId];
        return next;
      });
      setCheckState("idle");
      setFeedback("");
    },
    [],
  );

  const clearBoard = useCallback(() => {
    if (timerPausedRef.current) return;
    setZoneFills({});
    setSelectedPiece(null);
    setCheckState("idle");
    setFeedback("");
    setBoardAnim("idle");
  }, []);

  const solveCase = useCallback(() => {
    if (!task || timerPausedRef.current) return;
    const required = Object.keys(task.solution);
    if (required.some((z) => !zoneFills[z])) {
      setFeedback("מלאו את כל מקומות הראיות בלוח");
      return;
    }

    if (validateDetectiveTask(task, zoneFills)) {
      timerPausedRef.current = true;
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      setBoardAnim("stamp");
      const okText = detectiveFeedback(true);
      setFeedback(okText);
      onCorrect();
      playFeedback(okText);
      setSuccessCount((c) => c + 1);
      setScore((s) => {
        let next = s + LANGUAGE_SCORE.correct + bonus;
        const streak = currentStreak + 1;
        if (streak === 3) next += LANGUAGE_SCORE.streak3;
        if (streak === 5) next += LANGUAGE_SCORE.streak5;
        return next;
      });
      setCurrentStreak((p) => {
        const next = p + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next === 3 || next === 5) onStreak();
        return next;
      });
      window.setTimeout(advanceTask, 1800);
      return;
    }

    setCheckState("bad");
    setBoardAnim("shake");
    const badText = detectiveFeedback(false);
    setFeedback(badText);
    onWrong();
    playFeedback(badText);
    registerMistake(task);
    window.setTimeout(() => setBoardAnim("idle"), 700);
  }, [task, zoneFills, timeLeft, timeLimitSec, currentStreak, advanceTask, registerMistake, onCorrect, onWrong, onStreak, playFeedback]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const total = tasks.length || LANGUAGE_SESSION_TASKS;
    const reached = phase === "won" ? total : Math.min(total, Math.max(1, taskIndex + 1));
    const didWin = phase === "won" && mistakes <= diffConfig.maxMistakes;
    return buildLeoWordDetectiveMetrics({
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

  const feedbackBarClass = [
    shop.feedbackBar,
    checkState === "ok" ? shop.feedbackOk : checkState === "bad" ? shop.feedbackBad : shop.feedbackNeutral,
  ].join(" ");

  const pieceLabel = (pieceId) => task?.pieces.find((p) => p.id === pieceId)?.label ?? "";

  const evidenceButtons =
    task?.pieces.map((piece) => {
      const used = usedPieceIds.has(piece.id);
      return (
        <button
          key={piece.id}
          type="button"
          className={`${proto.pieceCard} ${selectedPiece === piece.id ? proto.pieceCardSelected : ""} ${used ? proto.pieceCardUsed : ""}`}
          disabled={used || timerPausedRef.current}
          onClick={() => {
            if (used) return;
            setSelectedPiece((cur) => (cur === piece.id ? null : piece.id));
            setCheckState("idle");
          }}
        >
          {piece.label}
        </button>
      );
    }) ?? null;

  const cardsPanel = (
    <>
      <p className={proto.cardsPanelTitle}>🧾 כרטיסי ראיות</p>
      <div className={proto.cardGrid}>{evidenceButtons}</div>
    </>
  );

  const feedbackBar = (
    <p className={shop.feedbackText}>{feedback || "גררו ראיות ללוח ולחצו פתור תיק"}</p>
  );

  return (
    <div className={`${frame.shell} ${frame.shellLavender}`} dir="rtl">
      <header className={frame.header}>
        <Link href={backHref} className={frame.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={frame.hud}>
            <span className={`${frame.hudChip} ${frame.hudScore}`}>⭐ {score}</span>
            <span className={`${frame.hudChip} ${frame.hudProgress}`}>
              🕵️ {taskIndex + 1}/{tasksPerSession}
            </span>
            <span className={`${frame.hudChip} ${frame.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${frame.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft} שנ׳
            </span>
          </div>
        ) : (
          <div className={frame.hud}>
            <span className={frame.hudChip}>{productionMode ? "🕵️" : "🕵️ אבטיפוס"}</span>
          </div>
        )}
        {phase === "play" ? (
          <button type="button" className={frame.hudChip} onClick={exitToIntro}>
            יציאה
          </button>
        ) : (
          <div style={{ minWidth: 40 }} aria-hidden />
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
          <p className={frame.introHero}>🕵️🔍</p>
          <h1 className={frame.introTitle}>בלש המילים של ליאו</h1>
          <p className={frame.introText}>
            גררו ראיות ללוח החקירה - אותיות, מילים וכרטיסי אירועים. כשהתיק מוכן, חותמים נפתר!
          </p>
          <div className={frame.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${frame.diffBtn} ${difficulty === id ? frame.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {LANGUAGE_DIFFICULTIES[id].label} · {LANGUAGE_DIFFICULTIES[id].grade}
              </button>
            ))}
          </div>
          <EducationalDifficultyGradeHint className={`${frame.introText} opacity-70`} style={{ fontSize: "0.72rem" }} />
          <p className={frame.introText} style={{ fontSize: "0.78rem" }}>
            {LANGUAGE_SESSION_TASKS} תיקים · לוח חקירה · בלי הקלדה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            פתח תיק חקירה 🕵️
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🔍 {task.caseLabel} · תיק {taskIndex + 1}/{tasksPerSession}
          </p>
          <div className={`${shop.shopGrid} ${proto.protoShopGrid}`} data-educational-workplace-grid="">
            <aside className={`${shop.customerCol} ${proto.missionMobile}`}>
              <div key={taskKey} className={shop.customerCard}>
                <span className={styles.caseBadge} aria-hidden>
                  📁
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>תיק חקירה</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>{task.missionHe}</p>
                </div>
              </div>
            </aside>

            <div key={`desk-${taskKey}`} className={proto.missionDesktop}>
              <div className={shop.missionRow}>
                <p className={proto.missionDesktopTitle}>תיק חקירה</p>
                <EducationalGameInstructionReplay
                  text={instructionText}
                  onReplay={replayInstruction}
                />
              </div>
              <p className={proto.missionDesktopText}>{task.missionHe}</p>
            </div>

            <section className={`${shop.workCol} ${proto.protoWorkCol}`}>
              <div className={styles.boardWrap}>
                {task.emoji ? <span className={styles.emojiCenter}>{task.emoji}</span> : null}
                {task.passage ? <p className={styles.passageOnBoard}>{task.passage}</p> : null}
                <div
                  className={`${styles.corkBoard} ${boardAnim === "shake" ? styles.boardShake : ""}`}
                  style={{ position: "relative" }}
                >
                  {boardAnim === "stamp" ? (
                    <div className={styles.stampOverlay}>
                      <span className={styles.stamp}>התיק נפתר ✓</span>
                    </div>
                  ) : null}
                  {task.zones.map((zone) => {
                    const pid = zoneFills[zone.id];
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        data-detective-zone={zone.id}
                        className={`${styles.zone} ${pid ? styles.zoneFilled : ""} ${selectedPiece && !pid ? styles.zoneHighlight : ""}`}
                        onClick={() => (pid ? clearZone(zone.id) : placeOnZone(zone.id))}
                      >
                        <span className={styles.stringLine} aria-hidden />
                        <span className={styles.zoneIcon}>{zone.icon ?? "📌"}</span>
                        <span className={styles.zoneLabel}>{zone.label}</span>
                        {pid ? <span className={styles.zonePiece}>{pieceLabel(pid)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className={`${shop.sideCol} ${proto.toolsMobile} ${proto.detective}`}>
              <div className={`${frame.panel} ${shop.toolsPanel} ${proto.cardsPanel}`}>{cardsPanel}</div>
            </aside>

            <div className={`${proto.cardsDesktopRow} ${proto.cardsPanel} ${proto.detective}`}>{cardsPanel}</div>

            <div className={`${proto.feedbackDesktopRow} ${feedbackBarClass}`}>{feedbackBar}</div>

            <div className={`${proto.feedbackMobile} ${feedbackBarClass}`}>{feedbackBar}</div>

            <div className={`${shop.bottomBar} ${proto.protoBottomBar}`}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} disabled={boardAnim === "stamp"} onClick={solveCase}>
                  פתור תיק 🕵️
                </button>
                <button type="button" className={shop.secondaryBtn} disabled={boardAnim === "stamp"} onClick={clearBoard}>
                  נקה לוח
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 כל התיקים נפתרו!</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>✅ הצלחות: {successCount}/{tasksPerSession}</p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={() => setPhase("intro")}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "lost" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🕵️ החקירה נעצרה</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>✅ הצלחות: {successCount}</p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={startGame}>
                נסו שוב
              </button>
              <button type="button" className={frame.secondaryBtn} onClick={() => setPhase("intro")}>
                בחירת רמה
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
