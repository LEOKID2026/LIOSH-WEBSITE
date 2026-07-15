import { useCallback, useEffect, useMemo, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import PrototypeVisual from "../shared/PrototypeVisual.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import {
  TRAIN_TASKS,
  letterBankForTrainTask,
  trainFeedback,
  trainSlotsCount,
  validateTrainTask,
} from "./english-word-builder-data.js";
import styles from "./EnglishWordBuilderGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function EnglishWordBuilderGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./english-word-builder-data.js').TrainTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [slots, setSlots] = useState(/** @type {string[]} */ ([]));
  const [bank, setBank] = useState(/** @type {string[]} */ ([]));
  const [usedBank, setUsedBank] = useState(/** @type {Set<number>} */ (new Set()));
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);
  const [listenFlash, setListenFlash] = useState("");

  const task = tasks[taskIndex] ?? null;

  const needsTrain = task && ["image_word", "build_word", "sentence_order"].includes(task.type);
  const needsOptions =
    task &&
    ["first_letter", "hebrew_match", "listen_pick", "fill_sentence", "sentence_image"].includes(task.type);

  const slotCount = task ? trainSlotsCount(task) : 0;

  const resetTaskUi = useCallback(() => {
    setSlots([]);
    setUsedBank(new Set());
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    setCanAdvance(false);
    setListenFlash("");
  }, []);

  useEffect(() => {
    if (!task) return;
    if (needsTrain) {
      setBank(letterBankForTrainTask(task));
      if (task.type === "sentence_order") {
        setBank([...(task.words ?? [])].sort(() => Math.random() - 0.5));
      }
    }
    resetTaskUi();
  }, [task, needsTrain, resetTaskUi]);

  const built = useMemo(() => {
    if (task?.type === "sentence_order") return slots.join(" ");
    return slots.join("");
  }, [slots, task]);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, TRAIN_TASKS));
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setAttemptsTotal(0);
    setPhase("play");
  }, [difficulty]);

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= TASKS_PER_LEVEL) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTaskUi();
  }, [taskIndex, resetTaskUi]);

  const tapBank = useCallback(
    (item, index) => {
      if (!task || usedBank.has(index)) return;
      if (slots.length >= slotCount) return;
      setSlots((prev) => [...prev, item]);
      setUsedBank((u) => new Set(u).add(index));
      setCheckState("idle");
      setFeedback("");
      setCanAdvance(false);
    },
    [task, usedBank, slots.length, slotCount],
  );

  const removeSlot = useCallback(
    (slotIdx) => {
      setSlots((prev) => {
        const next = [...prev];
        const removed = next.splice(slotIdx, 1)[0];
        if (removed && task?.type === "sentence_order") {
          const bankIdx = bank.findIndex((b, i) => b === removed && !usedBank.has(i));
          if (bankIdx >= 0) {
            setUsedBank((u) => {
              const n = new Set(u);
              n.delete(bankIdx);
              return n;
            });
          } else {
            setUsedBank(new Set());
          }
        } else if (task?.type !== "sentence_order") {
          setUsedBank(new Set());
        }
        return next;
      });
      setCheckState("idle");
      setCanAdvance(false);
    },
    [bank, task, usedBank],
  );

  const playListen = useCallback(() => {
    if (!task?.word) return;
    setListenFlash(task.word);
    window.setTimeout(() => setListenFlash(""), 1500);
  }, [task]);

  const runCheck = useCallback(() => {
    if (!task) return;
    if (needsOptions && selected == null) return;
    if (needsTrain && slots.length < slotCount) return;

    setAttemptsTotal((a) => a + 1);
    const ok = validateTrainTask(task, built, selected);
    if (ok) {
      setCheckState("ok");
      setFeedback(trainFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      setCanAdvance(true);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(trainFeedback(false));
  }, [task, needsOptions, needsTrain, selected, slots.length, slotCount, built]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="sky"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="רכבת המילים באנגלית"
      introHero="🚂🔤"
      introText="הרכיבו מילים ומשפטים באנגלית - גררו אותיות לקרונות הרכבת!"
      introHint={`${TASKS_PER_LEVEL} תחנות · אוצר מילים באנגלית`}
      startLabel="הרכבת יוצאת"
      onStart={startGame}
      score={score}
      mistakes={mistakes}
      taskIndex={taskIndex}
      successCount={successCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => setPhase("intro")}
    >
      {task ? (
        <div className={s.main}>
          <div className={s.missionCard}>
            {task.emoji ? <PrototypeVisual emoji={task.emoji} size="md" /> : <span className={s.missionIcon}>🚂</span>}
            <div className={s.missionBody}>
              <p className={s.missionLabel}>תחנה {taskIndex + 1}</p>
              <h2 className={s.missionTitle}>{task.promptHe}</h2>
              {task.hebrewHint ? <p className={styles.hebrewHint}>{task.hebrewHint}</p> : null}
              {task.sentenceTemplate ? (
                <p className={s.missionPrompt} dir="ltr">
                  {task.sentenceTemplate}
                </p>
              ) : null}
              {task.type === "listen_pick" ? (
                <>
                  <button type="button" className={styles.listenBtn} onClick={playListen}>
                    🔊 השמע מילה
                  </button>
                  {listenFlash ? (
                    <p className={s.missionPrompt} dir="ltr">
                      {listenFlash}
                    </p>
                  ) : null}
                </>
              ) : null}
              {task.words && task.type === "sentence_order" ? (
                <div className={styles.sentenceChipRow} dir="ltr">
                  {task.words.map((w) => (
                    <span key={w} className={styles.sentenceChip}>
                      {w}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

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
              <div className={`${s.panel} ${styles.bankPanel}`}>
                <p className={s.panelTitle}>בנק אותיות ומילים</p>
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
            </>
          ) : null}

          {needsOptions ? (
            <div className={`${s.playArea}`}>
              <div className={`${s.cardGrid} ${s.cardGrid2}`}>
                {(task.options ?? []).map((opt, i) => (
                  <button
                    key={`${task.id}-${i}`}
                    type="button"
                    className={`${s.tapCard} ${selected === i ? s.tapCardSelected : ""}`}
                    onClick={() => {
                      setSelected(i);
                      setCheckState("idle");
                      setCanAdvance(false);
                    }}
                  >
                    <span className={styles.optionEn}>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={`${s.feedbackBar} ${
              checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
            }`}
          >
            <p className={s.feedbackText}>{feedback || "מלאו את הקרונות ולחצו «בדוק רכבת»"}</p>
          </div>

          <div className={s.actionRow}>
            {!canAdvance ? (
              <button type="button" className={s.primaryBtn} onClick={runCheck}>
                בדוק רכבת
              </button>
            ) : (
              <button type="button" className={s.primaryBtn} onClick={advance}>
                התחנה הבאה
              </button>
            )}
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
