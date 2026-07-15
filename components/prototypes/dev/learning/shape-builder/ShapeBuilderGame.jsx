import { useCallback, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import { pickTasksForRun, SCORE, TASKS_PER_LEVEL } from "../shared/learning-prototype-constants.js";
import { SHAPE_LABELS, SHAPE_TASKS, gridCells, shapeFeedback } from "./shape-builder-data.js";
import styles from "./ShapeBuilderGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */

/** @param {{ shapeId: string, small?: boolean }} props */
function ShapeVisual({ shapeId, small = false }) {
  const id = shapeId.replace(/^rotate_|^reflect_|^net_/, "");
  if (id === "circle" || shapeId === "circle") return <div className={styles.circle} />;
  if (id === "square" || shapeId === "square") return <div className={styles.square} />;
  if (id === "rectangle" || shapeId === "rectangle") return <div className={styles.rectangle} />;
  if (id === "triangle" || shapeId === "triangle") return <div className={styles.triangle} />;
  if (shapeId.startsWith("net_cube")) {
    return (
      <div className={styles.netPreview}>
        {[0, 1, 0, 1, 1, 1, 0, 1, 0].map((f, i) => (
          <div key={i} className={`${styles.netFace} ${f ? "" : styles.netFaceEmpty}`} />
        ))}
      </div>
    );
  }
  if (shapeId.startsWith("net_box")) {
    return (
      <div className={styles.netPreview}>
        {[0, 1, 0, 1, 1, 1, 1, 1, 1].map((f, i) => (
          <div key={i} className={`${styles.netFace} ${f ? "" : styles.netFaceEmpty}`} />
        ))}
      </div>
    );
  }
  if (shapeId.startsWith("net_cylinder")) {
    return (
      <div style={{ textAlign: "center" }}>
        <div className={styles.rectangle} style={{ width: small ? 48 : 64, height: small ? 24 : 32, borderRadius: 8 }} />
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.65rem", fontWeight: 800 }}>גליל</p>
      </div>
    );
  }
  if (shapeId.startsWith("rotate") || shapeId.startsWith("reflect")) {
    return (
      <span className={styles.rotateHint} style={{ transform: shapeId.includes("b") || shapeId.includes("e") ? "rotate(90deg)" : shapeId.includes("f") ? "rotate(180deg)" : "none" }}>
        {shapeId.includes("arrow") || shapeId === "rotate_d" || shapeId === "rotate_e" || shapeId === "rotate_f" ? "➡️" : "◧"}
      </span>
    );
  }
  return <div className={styles.square} />;
}

/** @param {import('./shape-builder-data.js').ShapeTask} task */
function TaskBoard({ task }) {
  if (task.type === "pick_shape" || task.type === "match_shape") {
    return (
      <div className={styles.board}>
        <div className={styles.shapePreview}>
          <ShapeVisual shapeId={task.shapeId ?? "square"} />
        </div>
      </div>
    );
  }
  if (task.type === "pattern") {
    return (
      <div className={styles.board}>
        <div className={styles.patternRow}>
          {(task.pattern ?? []).map((p, i) => (
            <div key={i} className={styles.patternSlot}>
              {p === "?" ? "?" : <ShapeVisual shapeId={p} small />}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (task.type === "symmetry") {
    return (
      <div className={styles.board}>
        <div className={styles.reflectMirror}>
          <ShapeVisual shapeId={task.shapeId ?? "square"} />
          <div className={styles.mirrorLine} aria-hidden />
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#6366f1" }}>?</span>
        </div>
      </div>
    );
  }
  if (task.type === "area" || task.type === "perimeter") {
    const w = task.gridW ?? 4;
    const h = task.gridH ?? 3;
    const cells = gridCells(w, h, task.filledCount ?? 6);
    return (
      <div className={styles.board}>
        <div className={styles.gridBoard} style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
          {cells.map((filled, i) => (
            <div key={i} className={`${styles.gridCell} ${filled ? styles.gridCellFilled : ""}`} />
          ))}
        </div>
      </div>
    );
  }
  if (task.type === "rotate") {
    return (
      <div className={styles.board}>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 800 }}>לפני סיבוב</p>
        <ShapeVisual shapeId={task.rotateFrom === "arrow" ? "rotate_d" : "square"} />
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 800 }}>↻ {task.rotateDeg ?? 90}°</p>
      </div>
    );
  }
  if (task.type === "reflect") {
    return (
      <div className={styles.board}>
        <div className={styles.reflectMirror}>
          <ShapeVisual shapeId={task.shapeId ?? "triangle"} />
          <div className={styles.mirrorLine} />
          <span>🪞</span>
        </div>
      </div>
    );
  }
  if (task.type === "net") {
    return (
      <div className={styles.board}>
        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 900 }}>📐 בחרו פריסה</p>
      </div>
    );
  }
  return null;
}

export default function ShapeBuilderGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [tasks, setTasks] = useState(/** @type {import('./shape-builder-data.js').ShapeTask[]} */ ([]));
  const [taskIndex, setTaskIndex] = useState(0);
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);

  const task = tasks[taskIndex] ?? null;

  const resetTask = useCallback(() => {
    setSelected(null);
    setCheckState("idle");
    setFeedback("");
    setCanAdvance(false);
  }, []);

  const startGame = useCallback(() => {
    setTasks(pickTasksForRun(difficulty, SHAPE_TASKS));
    setTaskIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    setAttemptsTotal(0);
    resetTask();
    setPhase("play");
  }, [difficulty, resetTask]);

  const advance = useCallback(() => {
    const next = taskIndex + 1;
    if (next >= TASKS_PER_LEVEL) {
      setPhase("won");
      return;
    }
    setTaskIndex(next);
    resetTask();
  }, [taskIndex, resetTask]);

  const runCheck = useCallback(() => {
    if (!task || selected == null) return;
    setAttemptsTotal((a) => a + 1);
    const ok = selected === task.correctIndex;
    if (ok) {
      setCheckState("ok");
      setFeedback(shapeFeedback(true));
      setSuccessCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      setCanAdvance(true);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(shapeFeedback(false));
  }, [task, selected]);

  /** @param {string} opt */
  const optionLabel = (opt) => {
    if (SHAPE_LABELS[/** @type {keyof typeof SHAPE_LABELS} */ (opt)]) return SHAPE_LABELS[/** @type {keyof typeof SHAPE_LABELS} */ (opt)];
    if (["4", "5", "6", "8", "9", "10", "12", "14", "16"].includes(opt)) return opt;
    if (opt.includes("אנכי") || opt.includes("אלכסון") || opt.includes("סימטריה") || opt.includes("מלבן") || opt.includes("עיגול") || opt.includes("משולש")) return opt;
    return opt;
  };

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="mint"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="בונה הצורות של ליאו"
      introHero="📐🔺"
      introText="בנו וזהו צורות על לוח העבודה - גאומטריה ויזואלית!"
      introHint={`${TASKS_PER_LEVEL} משימות · צורות, שטח והיקף`}
      startLabel="התחל לבנות"
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
            <span className={s.missionIcon}>📐</span>
            <div className={s.missionBody}>
              <p className={s.missionLabel}>משימה {taskIndex + 1}</p>
              <h2 className={s.missionTitle}>{task.prompt}</h2>
            </div>
          </div>

          <TaskBoard task={task} />

          <div className={`${s.playArea}`}>
            <div className={`${s.cardGrid} ${task.options && task.options.length > 3 ? s.cardGrid2 : s.cardGrid2}`}>
              {(task.options ?? []).map((opt, i) => (
                <button
                  key={`${task.id}-${i}`}
                  type="button"
                  className={`${s.tapCard} ${styles.optionShape} ${selected === i ? s.tapCardSelected : ""}`}
                  onClick={() => {
                    setSelected(i);
                    setCheckState("idle");
                    setCanAdvance(false);
                  }}
                >
                  <div className={styles.optionShapeInner}>
                    {["circle", "square", "triangle", "rectangle"].includes(opt) ||
                    opt.startsWith("rotate") ||
                    opt.startsWith("reflect") ||
                    opt.startsWith("net") ? (
                      <ShapeVisual shapeId={opt} small />
                    ) : null}
                    <span className={styles.optionLabel}>{optionLabel(opt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`${s.feedbackBar} ${
              checkState === "ok" ? s.feedbackOk : checkState === "bad" ? s.feedbackBad : s.feedbackNeutral
            }`}
          >
            <p className={s.feedbackText}>{feedback || "בחרו תשובה ולחצו «בדוק צורה»"}</p>
          </div>

          <div className={s.actionRow}>
            {!canAdvance ? (
              <button type="button" className={s.primaryBtn} disabled={selected == null} onClick={runCheck}>
                בדוק צורה
              </button>
            ) : (
              <button type="button" className={s.primaryBtn} onClick={advance}>
                המשימה הבאה
              </button>
            )}
          </div>
        </div>
      ) : null}
    </LearningPrototypeFrame>
  );
}
