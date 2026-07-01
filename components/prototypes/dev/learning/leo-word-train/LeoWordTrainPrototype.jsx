import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  letterBankForTask,
  pickWordTrainTasks,
  trainFeedback,
  trainSlotsCount,
  validateTrainTask,
} from "./leo-word-train-data.js";
import styles from "./LeoWordTrainPrototype.module.css";

/** @typedef {import('../shared/language-prototype-config.js').DifficultyId} DifficultyId */

const OPTION_TYPES = new Set([
  "case_match",
  "first_letter",
  "hebrew_match",
  "fill_sentence",
  "sentence_image",
  "phrase_pick",
  "context_pick",
]);

const TRAIN_TYPES = new Set(["image_word", "build_word", "fill_letter", "sentence_order"]);

export default function LeoWordTrainPrototype({ backHref = "/dev/learning-game-prototypes" }) {
  const timerPausedRef = useRef(false);
  const timeoutHandledRef = useRef(false);
  const mistakesRef = useRef(0);

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./leo-word-train-data.js').WordTrainTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [slots, setSlots] = useState(/** @type {string[]} */ ([]));
  const [bank, setBank] = useState(/** @type {string[]} */ ([]));
  const [usedBank, setUsedBank] = useState(/** @type {Set<number>} */ (new Set()));
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
  const needsTrain = task && TRAIN_TYPES.has(task.type);
  const needsOptions = task && OPTION_TYPES.has(task.type);
  const slotCount = task ? trainSlotsCount(task) : 0;

  mistakesRef.current = mistakes;

  const built = useMemo(() => {
    if (task?.type === "sentence_order") return slots.join(" ");
    return slots.join("");
  }, [slots, task]);

  const resetTaskUi = useCallback(() => {
    setSlots([]);
    setUsedBank(new Set());
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
    if (needsTrain) setBank(letterBankForTask(task));
    resetTaskUi();
    loadTaskTimer();
  }, [task, needsTrain, resetTaskUi, loadTaskTimer, taskKey]);

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
    setFeedback("הזמן נגמר! ננסה תחנה חדשה.");
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
    setTasks(pickWordTrainTasks(difficulty));
    setTaskIndex(0);
    setTaskKey(0);
    setScore(0);
    setMistakes(0);
    mistakesRef.current = 0;
    setSuccessCount(0);
    setCurrentStreak(0);
    setPhase("play");
  }, [difficulty]);

  const tapBank = useCallback(
    (item, index) => {
      if (!task || usedBank.has(index) || slots.length >= slotCount) return;
      setSlots((prev) => [...prev, item]);
      setUsedBank((u) => new Set(u).add(index));
      setCheckState("idle");
      setFeedback("");
    },
    [task, usedBank, slots.length, slotCount],
  );

  const removeSlot = useCallback(
    (slotIdx) => {
      setSlots((prev) => {
        const next = [...prev];
        next.splice(slotIdx, 1);
        return next;
      });
      if (task?.type !== "sentence_order") setUsedBank(new Set());
      setCheckState("idle");
    },
    [task],
  );

  const clearTrain = useCallback(() => {
    setSlots([]);
    setUsedBank(new Set());
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    if (task && needsTrain) setBank(letterBankForTask(task));
  }, [task, needsTrain]);

  const runCheck = useCallback(() => {
    if (!task || timerPausedRef.current) return;
    if (needsOptions && selected == null) return;
    if (needsTrain && slots.length < slotCount) return;

    const ok = validateTrainTask(task, built, selected);
    if (ok) {
      timerPausedRef.current = true;
      const bonus = calcTimeBonus(timeLeft, timeLimitSec);
      setCheckState("ok");
      setFeedback(trainFeedback(true));
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
    setFeedback(trainFeedback(false));
    registerMistake();
  }, [
    task,
    needsOptions,
    needsTrain,
    selected,
    slots.length,
    slotCount,
    built,
    timeLeft,
    timeLimitSec,
    currentStreak,
    advanceTask,
    registerMistake,
  ]);

  const feedbackBarClass = [
    shop.feedbackBar,
    checkState === "ok" ? shop.feedbackOk : checkState === "bad" ? shop.feedbackBad : shop.feedbackNeutral,
  ].join(" ");

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
              🚂 {taskIndex + 1}/{LANGUAGE_PROTOTYPE_TASKS}
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
            <span className={frame.hudChip}>🚂 אבטיפוס</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {phase === "intro" ? (
        <div className={frame.screenCenter}>
          <p className={frame.introHero}>🚂🔤</p>
          <h1 className={frame.introTitle}>רכבת המילים של ליאו</h1>
          <p className={frame.introText}>אנגלית — מלאו קרונות, בחרו אותיות ומילים, והרכבת יוצאת מהתחנה!</p>
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
            {LANGUAGE_PROTOTYPE_TASKS} תחנות · טיימר לכל משימה · בלי הקלדה
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            הרכבת יוצאת 🚂
          </button>
        </div>
      ) : null}

      {phase === "play" && task ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>🚉 תחנה {taskIndex + 1} מתוך {LANGUAGE_PROTOTYPE_TASKS}</p>
          <div className={shop.shopGrid} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div key={taskKey} className={shop.customerCard}>
                <span className={styles.stationEmoji} aria-hidden>
                  🚉
                </span>
                <div className={shop.customerSpeechWrap}>
                  <p className={shop.customerName}>תחנת המילים</p>
                  <p className={shop.missionText}>
                    {task.promptHe}
                    {task.hebrewHint ? (
                      <span className={shop.missionTicket}>🇮🇱 {task.hebrewHint}</span>
                    ) : null}
                    {task.sentenceTemplate ? (
                      <span className={`${shop.missionTicket} ${styles.templateLine}`} dir="ltr">
                        {task.sentenceTemplate}
                      </span>
                    ) : null}
                    {task.template ? (
                      <span className={`${shop.missionTicket} ${styles.templateLine}`} dir="ltr">
                        {task.template}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </aside>

            <section className={shop.workCol}>
              {task.emoji ? <span className={styles.emojiHero}>{task.emoji}</span> : null}
              {needsTrain ? (
                <>
                  <div className={styles.trainTrack} dir="ltr">
                    <span className={styles.engine}>🚂</span>
                    {Array.from({ length: slotCount }).map((_, i) => (
                      <button
                        key={`slot-${i}`}
                        type="button"
                        className={`${styles.carriage} ${!slots[i] ? styles.carriageEmpty : ""}`}
                        onClick={() => (slots[i] ? removeSlot(i) : undefined)}
                      >
                        {slots[i] ?? "?"}
                      </button>
                    ))}
                  </div>
                  <div className={styles.wheels} dir="ltr" aria-hidden>
                    <span className={styles.wheel} />
                    <span className={styles.wheel} />
                  </div>
                </>
              ) : needsOptions ? (
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
                      <span className={styles.optionEn}>{opt}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <aside className={shop.sideCol}>
              {needsTrain ? (
                <div className={`${frame.panel} ${shop.toolsPanel}`}>
                  <p className={shop.toolsTitle}>🎴 קלפי אותיות</p>
                  <div className={styles.letterGrid} dir="ltr">
                    {bank.map((item, i) => (
                      <button
                        key={`${item}-${i}`}
                        type="button"
                        className={`${styles.letterBtn} ${usedBank.has(i) ? styles.letterUsed : ""}`}
                        disabled={usedBank.has(i)}
                        onClick={() => tapBank(item, i)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {feedback || checkState !== "idle" ? (
                <div className={feedbackBarClass}>
                  <p className={shop.feedbackText}>{feedback}</p>
                </div>
              ) : (
                <div className={`${shop.feedbackBar} ${shop.feedbackNeutral}`}>
                  <p className={shop.feedbackText}>
                    {needsTrain ? "מלאו קרונות ולחצו «בדוק רכבת»" : "בחרו תשובה ולחצו «בדוק רכבת»"}
                  </p>
                </div>
              )}
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button type="button" className={shop.primaryBtn} onClick={runCheck}>
                  בדוק רכבת 🚂
                </button>
                <button type="button" className={shop.secondaryBtn} onClick={clearTrain}>
                  נקה רכבת
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 הרכבת הגיעה ליעד!</h2>
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
            <h2 className={frame.endTitle}>🚂 סיום משמרת</h2>
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
