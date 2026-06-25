import { useCallback, useMemo, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import PrototypeVisual from "../shared/PrototypeVisual.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import {
  ITEMS,
  SHOP_TASKS,
  productLabel,
  shelfProducts,
  shopFeedback,
  validateShopPick,
} from "./english-clothes-shop-data.js";
import styles from "./EnglishClothesShopGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

const COLOR_DOT = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  black: "#1e293b",
  white: "#f8fafc",
};

export default function EnglishClothesShopGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./english-clothes-shop-data.js').ShopTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [pickedId, setPickedId] = useState(/** @type {string|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");

  const task = tasks[taskIndex] ?? null;
  const shelf = useMemo(() => shelfProducts(), []);

  const displayShelf = useMemo(() => {
    if (!task) return shelf;
    if (task.level === "word" && task.color) {
      return shelf.filter((p) => p.color === task.color).slice(0, 6);
    }
    if (task.level === "word" && task.item) {
      return shelf.filter((p) => p.item === task.item).slice(0, 6);
    }
    return shelf.slice(0, 12);
  }, [task, shelf]);

  const resetTaskUi = useCallback(() => {
    setPickedId(null);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, SHOP_TASKS));
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setAttemptsTotal(0);
    resetTaskUi();
    setPhase("play");
  }, [difficulty, resetTaskUi]);

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= TASKS_PER_LEVEL) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTaskUi();
  }, [taskIndex, resetTaskUi]);

  const runCheck = useCallback(() => {
    if (!task || !pickedId) return;
    const product = shelf.find((p) => p.id === pickedId);
    if (!product) return;
    setAttemptsTotal((a) => a + 1);
    const ok = validateShopPick(task, { color: product.color, item: product.item });
    if (ok) {
      setCheckState("ok");
      setFeedback(shopFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(advance, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(shopFeedback(false));
  }, [task, pickedId, shelf, advance]);

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="lavender"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="חנות הבגדים באנגלית"
      introHero="👗🛍️"
      introText="הבינו בקשה באנגלית ובחרו את הבגד הנכון מהמדף!"
      introHint={`${TASKS_PER_LEVEL} לקוחות · Tap על פריט`}
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
          <div className={styles.customerRow}>
            <span className={styles.customerEmoji}>🧑</span>
            <div className={styles.speechBubble} dir="ltr">
              <p className={styles.speechText}>{task.requestEn}</p>
            </div>
          </div>

          <div className={s.leoRow}>
            <span className={s.leoBadge}>🦁🛒</span>
            <span className={s.leoCaption}>בחרו פריט מהמדף</span>
          </div>

          <div className={s.playArea}>
            <div className={`${s.panel} ${styles.shelfPanel}`}>
              <p className={s.panelTitle}>🛍️ מדף בגדים</p>
              <div className={styles.shelfGrid}>
                {displayShelf.map((p) => {
                  const it = ITEMS[/** @type {keyof typeof ITEMS} */ (p.item)];
                  const selected = pickedId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.clothCard} ${selected ? styles.clothSelected : ""}`}
                      onClick={() => {
                        setPickedId(p.id);
                        setCheckState("idle");
                        setFeedback("");
                      }}
                    >
                      <span
                        className={styles.colorDot}
                        style={{ background: COLOR_DOT[/** @type {keyof typeof COLOR_DOT} */ (p.color)] }}
                      />
                      <PrototypeVisual emoji={it?.emoji ?? p.emoji} imageSrc={p.imageSrc} size="sm" />
                      <span className={styles.clothLabel} dir="ltr">
                        {productLabel(p.color, p.item)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {pickedId ? (
              <p className={styles.pickHint} dir="ltr">
                Selected: {productLabel(
                  shelf.find((x) => x.id === pickedId)?.color ?? "",
                  shelf.find((x) => x.id === pickedId)?.item ?? "",
                )}
              </p>
            ) : null}

            <div
              className={`${s.feedbackBar} ${
                checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
              }`}
            >
              <p className={s.feedbackText}>{feedback || "לחצו על בגד ואז מסור פריט"}</p>
            </div>

            <div className={s.actionRow}>
              <button type="button" className={s.primaryBtn} disabled={!pickedId} onClick={runCheck}>
                מסור פריט
              </button>
              <button type="button" className={s.secondaryBtn} onClick={resetTaskUi}>
                ביטול בחירה
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
