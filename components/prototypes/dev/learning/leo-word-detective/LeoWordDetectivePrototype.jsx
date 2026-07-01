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
import { detectiveFeedback, pickWordDetectiveTasks } from "./leo-word-detective-data.js";
import styles from "./LeoWordDetectivePrototype.module.css";

/** @typedef {import('../shared/language-prototype-config.js').DifficultyId} DifficultyId */

export default function LeoWordDetectivePrototype({ backHref = "/dev/learning-game-prototypes" }) {
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);
  const mistakesRef = useRef(0);

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-word-detective-data.js').WordDetectiveTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [timeLimitSec, setTimeLimitSec] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45);
  const [taskKey, setTaskKey] = useState(0);

  const diffConfig = LANGUAGE_PROTOTYPE_DIFFICULTIES[difficulty];
  const task = tasks[taskIndex] ?? null;

  mistakesRef.current = mistakes;

  const resetTaskUi = useCallback(() => {
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    timeoutHandledRef.current = false;
    timerPausedRef.current = false;
  }, []);

  const loadTaskTimer = useCallback(() => {
    const limit = diffConfig.timeSec;
    setTimeLimitSec(limit);
    setTimeLeft(limit);
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
    setFeedback("הזמן נגמר! נפתח תיק חדש.");
    registerMistake();
    window.setTimeout(() => {
      if (mistakesRef.current >= diffConfig.maxMistakes) return;
      advanceTask();
    }, 1400);
  }, [phase, registerMistake, advanceTask, diffConfig.maxMistakes]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    if (timeLeft > 0) return undefined;
    handleTimeout();
    return undefined;
  }, [phase, task, timeLeft, handleTimeout]);

  useEffect(() => {
    if (phase !== "play" || !task || timerPausedRef.current) return undefined;
    const t = window.setInterval(() => {
      setTimeLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
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

  const clearSelection = useCallback(() => {
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const runCheck = useCallback(() => {
    if (!task || selected == null || timerPausedRef.current) return;

    const ok = selected === task.correctIndex;
    if (ok) {
      timerPausedRef.current = true;
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      setFeedback(detectiveFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((s) => {
        let next = s + LANGUAGE_PROTOTYPE_SCORE.correct + bonus;
        const streak = currentStreak + 1;
        if (streak === 3) next += LANGUAGE_PROTOTYPE_SCORE.streak3;
        if (streak === 5) next += LANGUAGE_PROTOTYPE_SCORE.streak5;
        return next;
      });
      setCurrentStreak((prev) => prev + 1);
      window.setTimeout(advanceTask, 1400);
      return;
    }

    setCheckState("bad");
    setFeedback(detectiveFeedback(false));
    registerMistake();
  }, [task, selected, timeLeft, timeLimitSec, currentStreak, advanceTask, registerMistake]);

  const feedbackBarClass = [
    shop.feedbackBar,
    checkState === "ok" ? shop.feedbackOk : checkState === "bad" ? shop.feedbackBad : shop.feedbackNeutral,
  ].join(" ");

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
            <span className={frame.hudChip}>{diffConfig.label}</span>
          </div>
        ) : (
          <div className={frame.hud}>
            <span className={frame.hudChip}>🕵️ אבטיפוס</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {phase === "intro" ? (
        <div className={frame.screenCenter}>
          <p className={frame.introHero}>🕵️🔍</p>
          <h1 className={frame.introTitle}>בלש המילים של ליאו</h1>
          <p className={frame.introText}>עברית — פתחו תיקי חקירה, מצאו את הרמז הנכון ובחרו תשובה!</p>
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
            {LANGUAGE_PROTOTYPE_TASKS} תיקים · טיימר לכל משימה · בלי הקלדה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            פתח תיק חקירה 🕵️
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>🔍 {task.caseLabel} · תיק {taskIndex + 1} מתוך {LANGUAGE_PROTOTYPE_TASKS}</p>
          <div className={shop.shopGrid} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div key={taskKey} className={shop.customerCard}>
                <span className={styles.caseBadge} aria-hidden>
                  📁
                </span>
                <div className={shop.customerSpeechWrap}>
                  <p className={shop.customerName}>תיק חקירה</p>
                  <p className={shop.missionText}>
                    {task.prompt}
                    {task.passage ? <span className={styles.passage}>{task.passage}</span> : null}
                  </p>
                </div>
              </div>
            </aside>

            <section className={shop.workCol}>
              {task.emoji ? <span className={styles.boardEmoji}>{task.emoji}</span> : <span className={styles.boardEmoji}>🔎</span>}
              <div className={styles.optionGrid}>
                {(task.options ?? []).map((opt, i) => (
                  <button
                    key={`${task.id}-${i}`}
                    type="button"
                    className={`${styles.optionBtn} ${selected === i ? styles.optionBtnActive : ""}`}
                    onClick={() => {
                      setSelected(i);
                      setCheckState("idle");
                      setFeedback("");
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </section>

            <aside className={shop.sideCol}>
              <div className={`${frame.panel} ${shop.toolsPanel}`}>
                <p className={shop.toolsTitle}>🧾 רמזים</p>
                <p className={shop.feedbackText} style={{ margin: 0, fontSize: "0.78rem" }}>
                  {task.passage ? "קראו את הקטע בתיק ואז בחרו תשובה." : "קראו את השאלה ובחרו את התשובה הנכונה."}
                </p>
              </div>

              {feedback || checkState !== "idle" ? (
                <div className={feedbackBarClass}>
                  <p className={shop.feedbackText}>{feedback}</p>
                </div>
              ) : (
                <div className={`${shop.feedbackBar} ${shop.feedbackNeutral}`}>
                  <p className={shop.feedbackText}>בחרו תשובה ולחצו «בדוק תשובה»</p>
                </div>
              )}
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} disabled={selected == null} onClick={runCheck}>
                  בדוק תשובה 🕵️
                </button>
                <button type="button" className={shop.secondaryBtn} onClick={clearSelection}>
                  נקה בחירה
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
            <h2 className={frame.endTitle}>🕵️ סיום חקירה</h2>
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
