import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import EducationalDifficultyGradeHint from "../../../../educational-games/EducationalDifficultyGradeHint.jsx";
import shop from "../../../../educational-games/shared/educational-game-shop-layout.module.css";
import { calcTimeBonus } from "../../../../../lib/educational-games/continuous-play.js";
import { sharedStyles as frame } from "../shared/LearningPrototypeFrame.jsx";
import {
  LANGUAGE_PROTOTYPE_DIFFICULTIES,
  LANGUAGE_PROTOTYPE_SCORE,
  LANGUAGE_PROTOTYPE_TASKS,
} from "../shared/language-prototype-config.js";
import {
  detectiveFeedback,
  pickWordDetectiveTasks,
  validateDetectiveTask,
} from "./leo-word-detective-data.js";
import proto from "../shared/language-prototype-shop.module.css";
import styles from "./LeoWordDetectivePrototype.module.css";

/** @typedef {import('../shared/language-prototype-config.js').DifficultyId} DifficultyId */

export default function LeoWordDetectivePrototype({ backHref = "/dev/learning-game-prototypes" }) {
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);
  const mistakesRef = useRef(0);

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-word-detective-data.js').DetectiveTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [zoneFills, setZoneFills] = useState(/** @type {Record<string, string>} */ ({}));
  const [selectedPiece, setSelectedPiece] = useState(/** @type {string | null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [timeLimitSec, setTimeLimitSec] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45);
  const [taskKey, setTaskKey] = useState(0);
  const [boardAnim, setBoardAnim] = useState(/** @type {'idle'|'shake'|'stamp'} */ ("idle"));

  const diffConfig = LANGUAGE_PROTOTYPE_DIFFICULTIES[difficulty];
  const task = tasks[taskIndex] ?? null;

  mistakesRef.current = mistakes;
  const usedPieceIds = new Set(Object.values(zoneFills));

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
    setTimeLimitSec(diffConfig.timeSec);
    setTimeLeft(diffConfig.timeSec);
  }, [diffConfig.timeSec]);

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
    if (next >= LANGUAGE_PROTOTYPE_TASKS) {
      endRun(true);
      return;
    }
    setTaskIndex(next);
    setTaskKey((k) => k + 1);
  }, [taskIndex, endRun]);

  const registerMistake = useCallback(() => {
    const next = mistakesRef.current + 1;
    mistakesRef.current = next;
    setMistakes(next);
    setCurrentStreak(0);
    setScore((s) => Math.max(0, s + LANGUAGE_PROTOTYPE_SCORE.timeout));
    if (next >= diffConfig.maxMistakes) {
      window.setTimeout(() => endRun(false), 1200);
    }
  }, [diffConfig.maxMistakes, endRun]);

  const handleTimeout = useCallback(() => {
    if (timeoutHandledRef.current || timerPausedRef.current || phase !== "play") return;
    timeoutHandledRef.current = true;
    timerPausedRef.current = true;
    setCheckState("bad");
    setBoardAnim("shake");
    setFeedback("הזמן נגמר! התיק נשאר פתוח.");
    registerMistake();
    window.setTimeout(() => {
      if (mistakesRef.current >= diffConfig.maxMistakes) return;
      advanceTask();
    }, 1600);
  }, [phase, registerMistake, advanceTask, diffConfig.maxMistakes]);

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
    setTasks(pickWordDetectiveTasks(difficulty));
    setTaskIndex(0);
    setTaskKey(0);
    setScore(0);
    setMistakes(0);
    mistakesRef.current = 0;
    setSuccessCount(0);
    setCurrentStreak(0);
    setPhase("play");
  }, [difficulty]);

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
    },
    [task, selectedPiece, usedPieceIds, zoneFills],
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
      setFeedback(detectiveFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((s) => {
        let next = s + LANGUAGE_PROTOTYPE_SCORE.correct + bonus;
        const streak = currentStreak + 1;
        if (streak === 3) next += LANGUAGE_PROTOTYPE_SCORE.streak3;
        if (streak === 5) next += LANGUAGE_PROTOTYPE_SCORE.streak5;
        return next;
      });
      setCurrentStreak((p) => p + 1);
      window.setTimeout(advanceTask, 1800);
      return;
    }

    setCheckState("bad");
    setBoardAnim("shake");
    setFeedback(detectiveFeedback(false));
    registerMistake();
    window.setTimeout(() => setBoardAnim("idle"), 700);
  }, [task, zoneFills, timeLeft, timeLimitSec, currentStreak, advanceTask, registerMistake]);

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
              🕵️ {taskIndex + 1}/{LANGUAGE_PROTOTYPE_TASKS}
            </span>
            <span className={`${frame.hudChip} ${frame.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${frame.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft}s
            </span>
          </div>
        ) : (
          <div className={frame.hud}>
            <span className={frame.hudChip}>🕵️ אבטיפוס</span>
          </div>
        )}
        {phase === "play" ? (
          <button type="button" className={frame.hudChip} onClick={exitToIntro}>
            יציאה
          </button>
        ) : (
          <div style={{ minWidth: 40 }} aria-hidden />
        )}
      </header>

      {phase === "intro" ? (
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
                {LANGUAGE_PROTOTYPE_DIFFICULTIES[id].label} · {LANGUAGE_PROTOTYPE_DIFFICULTIES[id].grade}
              </button>
            ))}
          </div>
          <EducationalDifficultyGradeHint className={`${frame.introText} opacity-70`} style={{ fontSize: "0.72rem" }} />
          <p className={frame.introText} style={{ fontSize: "0.78rem" }}>
            {LANGUAGE_PROTOTYPE_TASKS} תיקים · לוח חקירה · בלי הקלדה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            פתח תיק חקירה 🕵️
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🔍 {task.caseLabel} · תיק {taskIndex + 1}/{LANGUAGE_PROTOTYPE_TASKS}
          </p>
          <div className={`${shop.shopGrid} ${proto.protoShopGrid}`} data-educational-workplace-grid="">
            <aside className={`${shop.customerCol} ${proto.missionMobile}`}>
              <div key={taskKey} className={shop.customerCard}>
                <span className={styles.caseBadge} aria-hidden>
                  📁
                </span>
                <div className={shop.customerSpeechWrap}>
                  <p className={shop.customerName}>תיק חקירה</p>
                  <p className={shop.missionText}>{task.missionHe}</p>
                </div>
              </div>
            </aside>

            <div key={`desk-${taskKey}`} className={proto.missionDesktop}>
              <p className={proto.missionDesktopTitle}>תיק חקירה</p>
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

      {phase === "won" ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 כל התיקים נפתרו!</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>✅ הצלחות: {successCount}/{LANGUAGE_PROTOTYPE_TASKS}</p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={() => setPhase("intro")}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "lost" ? (
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
