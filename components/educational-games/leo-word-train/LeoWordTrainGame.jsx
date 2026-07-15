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
  WORD_TRAIN_TASKS,
  pickWordTrainSession,
  trainFeedback,
  validateTrainTask,
} from "./leo-word-train-data.js";
import { buildLeoWordTrainMetrics } from "./leo-word-train-metrics.js";
import styles from "./LeoWordTrainGame.module.css";

/** @typedef {import('./leo-word-train-data.js').DifficultyId} DifficultyId */

export default function LeoWordTrainGame({
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
  const [tasks, setTasks] = useState(/** @type {import('./leo-word-train-data.js').TrainTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [fills, setFills] = useState(/** @type {Record<string, string>} */ ({}));
  const [pieceToCarriage, setPieceToCarriage] = useState(/** @type {Record<string, string>} */ ({}));
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
  const [trainAnim, setTrainAnim] = useState(/** @type {'idle'|'depart'|'shake'} */ ("idle"));

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

  const scheduleRemediation = useCallback(
    (failedTask) => {
      if (!failedTask) return;
      const pool = WORD_TRAIN_TASKS[difficulty] ?? WORD_TRAIN_TASKS.easy;
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
    setFills({});
    setPieceToCarriage({});
    setSelectedPiece(null);
    setCheckState("idle");
    setFeedback("");
    setTrainAnim("idle");
    timeoutHandledRef.current = false;
    timerPausedRef.current = false;
  }, []);

  const loadTaskTimer = useCallback(() => {
    const limit = taskTimeLimitSec(difficulty);
    setTimeLimitSec(limit);
    setTimeLeft(limit);
  }, [difficulty]);

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
    setTrainAnim("shake");
    const timeoutText = "הזמן נגמר! הרכבת נשארה בתחנה.";
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
    setTasks(pickWordTrainSession(difficulty));
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

  const usedPieceIds = new Set(Object.values(pieceToCarriage));

  const placePiece = useCallback(
    (carriageId) => {
      if (!task || !selectedPiece || timerPausedRef.current) return;
      const car = task.carriages.find((c) => c.id === carriageId);
      if (!car || car.kind !== "slot" || fills[carriageId]) return;
      const piece = task.pieces.find((p) => p.id === selectedPiece);
      if (!piece || usedPieceIds.has(piece.id)) return;

      setFills((f) => ({ ...f, [carriageId]: piece.label }));
      setPieceToCarriage((m) => ({ ...m, [piece.id]: carriageId }));
      setSelectedPiece(null);
      setCheckState("idle");
      setFeedback("");
      audio.playSfx("sfx-ui-click");
    },
    [task, selectedPiece, fills, usedPieceIds, audio],
  );

  const clearCarriage = useCallback(
    (carriageId) => {
      if (timerPausedRef.current) return;
      const label = fills[carriageId];
      if (!label) return;
      const pieceEntry = Object.entries(pieceToCarriage).find(([, cid]) => cid === carriageId);
      setFills((f) => {
        const next = { ...f };
        delete next[carriageId];
        return next;
      });
      if (pieceEntry) {
        const [pid] = pieceEntry;
        setPieceToCarriage((m) => {
          const next = { ...m };
          delete next[pid];
          return next;
        });
      }
      setCheckState("idle");
      setFeedback("");
    },
    [fills, pieceToCarriage],
  );

  const clearAllCarriages = useCallback(() => {
    if (timerPausedRef.current) return;
    setFills({});
    setPieceToCarriage({});
    setSelectedPiece(null);
    setCheckState("idle");
    setFeedback("");
    setTrainAnim("idle");
  }, []);

  const runDepart = useCallback(() => {
    if (!task || timerPausedRef.current) return;
    const slotIds = task.carriages.filter((c) => c.kind === "slot").map((c) => c.id);
    if (slotIds.some((id) => !fills[id])) {
      setFeedback("מלאו את כל הקרונות הריקים לפני יציאה");
      return;
    }

    if (validateTrainTask(task, fills)) {
      timerPausedRef.current = true;
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      setTrainAnim("depart");
      const okText = trainFeedback(true);
      setFeedback(okText);
      onCorrect();
      audio.playSfx("sfx-train-chug");
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
    setTrainAnim("shake");
    const badText = trainFeedback(false);
    setFeedback(badText);
    onWrong();
    playFeedback(badText);
    registerMistake(task);
    window.setTimeout(() => setTrainAnim("idle"), 700);
  }, [task, fills, timeLeft, timeLimitSec, currentStreak, advanceTask, registerMistake, onCorrect, onWrong, onStreak, playFeedback, audio]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const total = tasks.length || LANGUAGE_SESSION_TASKS;
    const reached = phase === "won" ? total : Math.min(total, Math.max(1, taskIndex + 1));
    const didWin = phase === "won" && mistakes <= diffConfig.maxMistakes;
    return buildLeoWordTrainMetrics({
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

  const cardButtons =
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
            audio.playSfx("sfx-ui-click");
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
      <p className={proto.cardsPanelTitle}>🎴 קלפים לעמיסה</p>
      <div className={proto.cardGrid} dir="ltr">
        {cardButtons}
      </div>
    </>
  );

  const feedbackBar = (
    <p className={shop.feedbackText}>
      {feedback || "העמיסו קלפים על הקרונות ולחצו הוציאו רכבת"}
    </p>
  );

  return (
    <div className={`${frame.shell} ${frame.shellSky}`} dir="rtl">
      <header className={frame.header}>
        <Link href={backHref} className={frame.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={frame.hud}>
            <span className={`${frame.hudChip} ${frame.hudScore}`}>⭐ {score}</span>
            <span className={`${frame.hudChip} ${frame.hudProgress}`}>
              🚂 {taskIndex + 1}/{tasksPerSession}
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
            <span className={frame.hudChip}>{productionMode ? "🚂" : "🚂 אבטיפוס"}</span>
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
          <p className={frame.introHero}>🚂🔤</p>
          <h1 className={frame.introTitle}>רכבת המילים של ליאו</h1>
          <p className={frame.introText}>
            העמיסו קלפים על קרונות הרכבת - אותיות, מילים ומשפטים. כשהרכבת מלאה, היא יוצאת מהתחנה!
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
            {LANGUAGE_SESSION_TASKS} תחנות · גרירה ולחיצה על קלפים · בלי הקלדה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            הרכבת יוצאת 🚂
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🚉 {task.stationLabel} · יעד {taskIndex + 1}/{tasksPerSession}
          </p>
          <div className={`${shop.shopGrid} ${proto.protoShopGrid}`} data-educational-workplace-grid="">
            <aside className={`${shop.customerCol} ${proto.missionMobile}`}>
              <div key={taskKey} className={shop.customerCard}>
                <span className={styles.stationEmoji} aria-hidden>
                  🚉
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>תחנת המילים</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>
                    {task.missionHe}
                    {task.emoji ? <span className={shop.missionTicket}>{task.emoji}</span> : null}
                  </p>
                </div>
              </div>
            </aside>

            <div key={`desk-${taskKey}`} className={proto.missionDesktop}>
              <div className={shop.missionRow}>
                <p className={proto.missionDesktopTitle}>תחנת המילים</p>
                <EducationalGameInstructionReplay
                  text={instructionText}
                  onReplay={replayInstruction}
                />
              </div>
              <p className={proto.missionDesktopText}>
                {task.missionHe}
                {task.emoji ? ` ${task.emoji}` : null}
              </p>
            </div>

            <section className={`${shop.workCol} ${proto.protoWorkCol}`}>
              <div className={styles.workWrap}>
                {trainAnim === "depart" ? <div className={styles.departBanner}>🚂 יוצאים!</div> : null}
                <div className={styles.trainWorld}>
                  <span className={styles.steam} aria-hidden>
                    💨
                  </span>
                  <div
                    className={`${styles.trainRow} ${trainAnim === "depart" ? styles.trainDepart : ""} ${trainAnim === "shake" ? styles.trainShake : ""}`}
                    dir="ltr"
                  >
                    <span className={styles.engine}>🚂</span>
                    {task.carriages.map((car) => {
                      if (car.kind === "fixed") {
                        return (
                          <div key={car.id} className={`${styles.carriage} ${styles.carriageFixed}`}>
                            <span className={styles.carriageLabel}>{car.content}</span>
                          </div>
                        );
                      }
                      const filled = fills[car.id];
                      return (
                        <button
                          key={car.id}
                          type="button"
                          data-train-slot={car.id}
                          className={`${styles.carriage} ${styles.carriageSlot} ${filled ? styles.carriageSlotFilled : ""}`}
                          onClick={() => (filled ? clearCarriage(car.id) : placePiece(car.id))}
                        >
                          {filled ? (
                            <span className={styles.carriageLabel}>{filled}</span>
                          ) : (
                            <span className={styles.carriageEmptyMark} aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.wheelsRow} dir="ltr" aria-hidden>
                    <span className={styles.wheel} />
                    <span className={styles.wheel} />
                    <span className={styles.wheel} />
                  </div>
                  <div className={styles.track} aria-hidden />
                </div>
              </div>
            </section>

            <aside className={`${shop.sideCol} ${proto.toolsMobile}`}>
              <div className={`${frame.panel} ${shop.toolsPanel} ${proto.cardsPanel}`}>{cardsPanel}</div>
            </aside>

            <div className={`${proto.cardsDesktopRow} ${proto.cardsPanel}`}>{cardsPanel}</div>

            <div className={`${proto.feedbackDesktopRow} ${feedbackBarClass}`}>{feedbackBar}</div>

            <div className={`${proto.feedbackMobile} ${feedbackBarClass}`}>{feedbackBar}</div>

            <div className={`${shop.bottomBar} ${proto.protoBottomBar}`}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} disabled={trainAnim === "depart"} onClick={runDepart}>
                  הוציאו רכבת 🚂
                </button>
                <button type="button" className={shop.secondaryBtn} disabled={trainAnim === "depart"} onClick={clearAllCarriages}>
                  נקה קרונות
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 כל התחנות הושלמו!</h2>
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
            <h2 className={frame.endTitle}>🚂 הרכבת נעצרה</h2>
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
