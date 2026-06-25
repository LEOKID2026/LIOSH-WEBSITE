import { useCallback, useEffect, useMemo, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import PrototypeVisual from "../shared/PrototypeVisual.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import {
  CATEGORY_LABELS,
  WORD_TASKS,
  letterBankForTask,
  wordBuilderFeedback,
} from "./english-word-builder-data.js";
import styles from "./EnglishWordBuilderGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

export default function EnglishWordBuilderGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./english-word-builder-data.js').WordTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [picked, setPicked] = useState(/** @type {{ letter: string, bankIdx: number }[]} */ ([]));
  const [bank, setBank] = useState(/** @type {string[]} */ ([]));
  const [usedIndices, setUsedIndices] = useState(/** @type {Set<number>} */ (new Set()));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const task = tasks[taskIndex] ?? null;

  const displayWord = useMemo(() => {
    if (!task) return "";
    if (task.missingIndex == null) return picked.map((p) => p.letter).join("");
    const chars = task.word.split("");
    return chars
      .map((c, i) => {
        if (i === task.missingIndex) {
          return picked[0]?.letter ?? "_";
        }
        return c;
      })
      .join("");
  }, [task, picked]);

  const resetTaskUi = useCallback(() => {
    setPicked([]);
    setUsedIndices(new Set());
    setCheckState("idle");
    setFeedback("");
  }, []);

  useEffect(() => {
    if (!task) return;
    setBank(letterBankForTask(task));
    resetTaskUi();
  }, [task, resetTaskUi]);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, WORD_TASKS));
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
  }, [taskIndex]);

  const tapLetter = useCallback(
    (letter, index) => {
      if (!task || usedIndices.has(index)) return;
      const maxLen = task.missingIndex != null ? 1 : task.word.length;
      if (picked.length >= maxLen) return;
      setPicked((p) => [...p, { letter, bankIdx: index }]);
      setUsedIndices((u) => new Set(u).add(index));
      setCheckState("idle");
      setFeedback("");
    },
    [task, picked.length, usedIndices],
  );

  const removeAt = useCallback(
    (pickIndex) => {
      setPicked((p) => {
        const next = [...p];
        const removed = next.splice(pickIndex, 1)[0];
        if (removed) {
          setUsedIndices((u) => {
            const n = new Set(u);
            n.delete(removed.bankIdx);
            return n;
          });
        }
        return next;
      });
      setCheckState("idle");
      setFeedback("");
    },
    [],
  );

  const clearAll = useCallback(() => {
    resetTaskUi();
  }, [resetTaskUi]);

  const runCheck = useCallback(() => {
    if (!task) return;
    setAttemptsTotal((a) => a + 1);
    const built = task.missingIndex != null ? picked[0]?.letter ?? "" : picked.map((p) => p.letter).join("");
    const expected =
      task.missingIndex != null ? task.word[task.missingIndex] : task.word;
    const ok = built.toLowerCase() === expected.toLowerCase();
    if (ok) {
      setCheckState("ok");
      setFeedback(wordBuilderFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1400);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(wordBuilderFeedback(false));
  }, [task, picked, advance]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="sky"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="הרכבת מילים באנגלית"
      introHero="🔤🦁"
      introText="הרכיבו מילים באנגלית לפי התמונה — לחיצה על אותיות!"
      introHint={`${TASKS_PER_LEVEL} מילים · Tap על אותיות`}
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
            <PrototypeVisual emoji={task.emoji} imageSrc={task.imageSrc} size="lg" />
            <div className={s.missionBody}>
              <p className={s.missionLabel}>{CATEGORY_LABELS[task.category] ?? task.category}</p>
              <h2 className={s.missionTitle}>Build the word</h2>
              <p className={s.missionPrompt}>
                {task.missingIndex != null ? "Fill the missing letter" : "Tap letters to spell"}
              </p>
            </div>
          </div>

          <div className={`${s.panel} ${styles.wordPanel}`}>
            <p className={styles.builtWord} dir="ltr">
              {task.missingIndex != null ? displayWord : picked.map((p) => p.letter).join("") || "_ _ _"}
            </p>
            {picked.length > 0 ? (
              <div className={styles.pickedRow} dir="ltr">
                {picked.map((entry, i) => (
                  <button
                    key={`${entry.letter}-${entry.bankIdx}-${i}`}
                    type="button"
                    className={styles.pickedChip}
                    onClick={() => removeAt(i)}
                  >
                    {entry.letter}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`${s.panel} ${styles.bankPanel}`}>
            <p className={s.panelTitle}>Letters</p>
            <div className={styles.letterGrid} dir="ltr">
              {bank.map((letter, i) => (
                <button
                  key={`${letter}-${i}`}
                  type="button"
                  className={`${styles.letterBtn} ${usedIndices.has(i) ? styles.letterUsed : ""}`}
                  disabled={usedIndices.has(i)}
                  onClick={() => tapLetter(letter, i)}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`${s.feedbackBar} ${
              checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
            }`}
          >
            <p className={s.feedbackText} dir="ltr">
              {feedback || "Tap letters, then Check word"}
            </p>
          </div>

          <div className={s.actionRow}>
            <button type="button" className={s.primaryBtn} onClick={runCheck}>
              בדוק מילה
            </button>
            <button type="button" className={s.secondaryBtn} onClick={clearAll}>
              נקה
            </button>
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
