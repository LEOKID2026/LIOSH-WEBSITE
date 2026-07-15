import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LabItemVisual from "./LabItemVisual.jsx";
import {
  DIFFICULTIES,
  EXPERIMENTS_PER_LEVEL,
  LAB_ITEMS,
  SCORE,
  feedbackMessageForReason,
  pickExperimentsForRun,
  shelfItemsForDifficulty,
  validateExperimentSelection,
} from "./leo-lab-data.js";
import styles from "./LeoLabGame.module.css";

/** @typedef {import('./leo-lab-data.js').DifficultyId} DifficultyId */

const DRAG_THRESHOLD_PX = 10;

/** @param {number} x @param {number} y */
function findDropZoneAtPoint(x, y) {
  const ghost = document.querySelector('[data-drag-ghost="true"]');
  if (ghost) ghost.style.visibility = "hidden";
  const hit = document.elementFromPoint(x, y);
  if (ghost) ghost.style.visibility = "visible";

  const zone = hit?.closest("[data-drop-zone]")?.getAttribute("data-drop-zone");
  if (zone === "bench") return zone;
  return null;
}

/**
 * @param {{ backHref?: string }} props
 */
export default function LeoLabGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [experiments, setExperiments] = useState(/** @type {import('./leo-lab-data.js').LabExperiment[]} */ ([]));
  const [experimentIndex, setExperimentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState(/** @type {string[]} */ ([]));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [attemptsOnExperiment, setAttemptsOnExperiment] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState({ text: "", fact: "", type: "" });
  const [showResult, setShowResult] = useState(false);
  const [resultIcon, setResultIcon] = useState("");
  const [resultText, setResultText] = useState("");

  const [dragGhost, setDragGhost] = useState(
    /** @type {{ itemId: string, x: number, y: number }|null} */ (null),
  );
  const [draggingItemId, setDraggingItemId] = useState(/** @type {string|null} */ (null));

  const suppressClickRef = useRef(false);
  const dragRef = useRef(
    /** @type {{ itemId: string, pointerId: number, moved: boolean, active: boolean, startX: number, startY: number }|null} */ (null),
  );
  const phaseRef = useRef(phase);
  const selectedIdsRef = useRef(selectedIds);
  const experimentRef = useRef(experiments[0]);

  phaseRef.current = phase;
  selectedIdsRef.current = selectedIds;
  experimentRef.current = experiments[experimentIndex] ?? null;

  const diffConfig = DIFFICULTIES[difficulty];
  const currentExperiment = experiments[experimentIndex] ?? null;
  const maxPick = currentExperiment?.pickCount ?? 2;

  const shelfItems = useMemo(() => shelfItemsForDifficulty(difficulty), [difficulty]);

  const shelfGridClass =
    diffConfig.shelfCount === 8 ? styles.shelfGridEasy : styles.shelfGridTwelve;

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const resetExperimentUi = useCallback(() => {
    setSelectedIds([]);
    setAttemptsOnExperiment(0);
    setCheckState("idle");
    setFeedback({ text: "", fact: "", type: "" });
    setShowResult(false);
    setResultIcon("");
    setResultText("");
  }, []);

  const startGame = useCallback(() => {
    const run = pickExperimentsForRun(difficulty);
    setExperiments(run);
    setExperimentIndex(0);
    setScore(0);
    setMistakes(0);
    setSuccessCount(0);
    resetExperimentUi();
    setPhase("play");
  }, [difficulty, resetExperimentUi]);

  const advanceExperiment = useCallback(() => {
    const nextIdx = experimentIndex + 1;
    if (nextIdx >= experiments.length) {
      setPhase("won");
      return;
    }
    setExperimentIndex(nextIdx);
    resetExperimentUi();
  }, [experimentIndex, experiments.length, resetExperimentUi]);

  const toggleItem = useCallback(
    (itemId) => {
      if (phaseRef.current !== "play" || showResult) return;

      setSelectedIds((prev) => {
        if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
        if (prev.length >= maxPick) return prev;
        return [...prev, itemId];
      });
      setCheckState("idle");
      setFeedback({ text: "", fact: "", type: "" });
    },
    [maxPick, showResult],
  );

  const clearSelection = useCallback(() => {
    if (showResult) return;
    setSelectedIds([]);
    setCheckState("idle");
    setFeedback({ text: "", fact: "", type: "" });
    setShowResult(false);
    setResultIcon("");
    setResultText("");
  }, [showResult]);

  const runCheck = useCallback(() => {
    const exp = experimentRef.current;
    if (!exp || phaseRef.current !== "play" || showResult) return;
    if (selectedIdsRef.current.length !== exp.pickCount) return;

    const attemptNum = attemptsOnExperiment + 1;
    setAttemptsOnExperiment(attemptNum);

    const result = validateExperimentSelection(selectedIdsRef.current, exp);

    if (result.ok) {
      setCheckState("ok");
      setShowResult(true);
      setResultIcon(exp.resultIcon);
      setResultText(exp.resultText);
      setFeedback({
        text: "מעולה! הניסוי הצליח",
        fact: `עובדה: ${exp.fact}`,
        type: "ok",
      });
      setSuccessCount((c) => c + 1);
      addScore(SCORE.correct);
      if (attemptNum === 1) addScore(SCORE.firstTry);

      window.setTimeout(() => {
        advanceExperiment();
      }, 2200);
      return;
    }

    setCheckState("bad");
    setMistakes((m) => m + 1);
    addScore(SCORE.mistake);

    if (result.reason === "partial") {
      addScore(SCORE.partial);
    }

    setFeedback({
      text: feedbackMessageForReason(result.reason),
      fact: "",
      type: "bad",
    });
  }, [attemptsOnExperiment, addScore, advanceExperiment, showResult]);

  const onShelfPointerDown = useCallback(
    (e, itemId) => {
      if (phaseRef.current !== "play" || showResult) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (selectedIdsRef.current.includes(itemId) && selectedIdsRef.current.length >= maxPick) return;

      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        itemId,
        pointerId: e.pointerId,
        moved: false,
        active: true,
        startX: e.clientX,
        startY: e.clientY,
      };
      setDraggingItemId(itemId);
      setDragGhost({ itemId, x: e.clientX, y: e.clientY });
    },
    [maxPick, showResult],
  );

  const onShelfClick = useCallback(
    (itemId) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (dragRef.current?.moved) return;
      toggleItem(itemId);
    },
    [toggleItem],
  );

  useEffect(() => {
    if (!draggingItemId) return undefined;

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag?.active || e.pointerId !== drag.pointerId) return;

      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
      e.preventDefault();
      setDragGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : null));
    };

    const finishDrag = (e) => {
      const drag = dragRef.current;
      if (!drag?.active || e.pointerId !== drag.pointerId) return;

      drag.active = false;
      suppressClickRef.current = true;

      if (drag.moved) {
        const zone = findDropZoneAtPoint(e.clientX, e.clientY);
        if (zone === "bench") {
          setSelectedIds((prev) => {
            if (prev.includes(drag.itemId)) return prev;
            if (prev.length >= maxPick) return prev;
            return [...prev, drag.itemId];
          });
          setCheckState("idle");
          setFeedback({ text: "", fact: "", type: "" });
        }
      } else {
        setSelectedIds((prev) => {
          if (prev.includes(drag.itemId)) return prev.filter((id) => id !== drag.itemId);
          if (prev.length >= maxPick) return prev;
          return [...prev, drag.itemId];
        });
      }

      dragRef.current = null;
      setDraggingItemId(null);
      setDragGhost(null);
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);

    const prevTouchAction = document.body.style.touchAction;
    const prevOverflow = document.body.style.overflow;
    document.body.style.touchAction = "none";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finishDrag);
      document.removeEventListener("pointercancel", finishDrag);
      document.body.style.touchAction = prevTouchAction;
      document.body.style.overflow = prevOverflow;
    };
  }, [draggingItemId, maxPick]);

  const accuracyPct =
    experiments.length > 0
      ? Math.round((successCount / Math.max(1, successCount + mistakes)) * 100)
      : 0;

  const benchClassName = [
    styles.benchZone,
    draggingItemId ? styles.benchZoneActive : "",
    showResult ? styles.benchZoneSuccess : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.shell} dir="rtl">
      <span className={`${styles.deco} ${styles.flaskDeco}`} aria-hidden>
        🧪
      </span>
      <span className={`${styles.deco} ${styles.atomDeco}`} aria-hidden>
        ⚛️
      </span>

      <header className={styles.header}>
        <Link href={backHref} className={styles.backBtn}>
          ← חזרה
        </Link>
        {phase === "play" ? (
          <div className={styles.hud}>
            <span className={`${styles.hudChip} ${styles.hudScore}`}>⭐ {score}</span>
            <span className={`${styles.hudChip} ${styles.hudProgress}`}>
              🧪 {experimentIndex + 1}/{EXPERIMENTS_PER_LEVEL}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>❌ {mistakes}</span>
            <span className={styles.hudChip}>{diffConfig.label}</span>
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>🔬 אבטיפוס</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🔬🧪</p>
          <h1 className={styles.introTitle}>מעבדת הניסויים של ליאו</h1>
          <p className={styles.introText}>
            בחרו חפצים מהמדף, שימו על שולחן הניסוי ולחצו &quot;בדוק ניסוי&quot; - גלו איך
            העולם עובד!
          </p>
          <div className={styles.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.diffBtn} ${difficulty === id ? styles.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].label} · {DIFFICULTIES[id].itemHint}
              </button>
            ))}
          </div>
          <p className={styles.introText} style={{ fontSize: "0.78rem" }}>
            {EXPERIMENTS_PER_LEVEL} ניסויים · גרירה או לחיצה על חפצים
          </p>
          <button type="button" className={styles.startBtn} onClick={startGame}>
            כניסה למעבדה
          </button>
        </div>
      ) : null}

      {phase === "play" && currentExperiment ? (
        <div className={styles.main}>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon} aria-hidden>
              {currentExperiment.missionIcon ?? "🔬"}
            </span>
            <div className={styles.missionBody}>
              <p className={styles.missionLabel}>משימה</p>
              <h2 className={styles.missionTitle}>{currentExperiment.title}</h2>
              <p className={styles.missionPrompt}>{currentExperiment.prompt}</p>
            </div>
          </div>

          <div className={styles.leoRow}>
            <span className={styles.leoBadge} aria-hidden>
              🦁👨‍🔬
            </span>
            <span className={styles.leoCaption}>ליאו המדען עוזר לכם!</span>
          </div>

          <div className={styles.playStack}>
            <div className={styles.benchSection}>
              <p className={styles.benchLabel}>🧫 שולחן הניסוי</p>
              <div data-drop-zone="bench" className={benchClassName}>
                {showResult ? (
                  <div className={styles.resultDisplay}>
                    <span className={styles.resultIcon}>{resultIcon}</span>
                    <p className={styles.resultText}>{resultText}</p>
                  </div>
                ) : selectedIds.length > 0 ? (
                  <div className={styles.benchItems}>
                    {selectedIds.map((id) => {
                      const item = LAB_ITEMS[id];
                      if (!item) return null;
                      const isDragging = draggingItemId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={styles.benchItemBtn}
                          onClick={() => toggleItem(id)}
                          aria-label={`הסר ${item.name}`}
                        >
                          {!isDragging ? (
                            <LabItemVisual item={item} size="bench" showName />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.benchEmptyHint}>
                    גררו או לחצו על חפצים · בחרו {maxPick}
                  </p>
                )}
              </div>

              <div
                className={`${styles.feedbackBar} ${
                  checkState === "ok"
                    ? styles.feedbackOk
                    : checkState === "bad"
                      ? styles.feedbackBad
                      : styles.feedbackNeutral
                }`}
              >
                {feedback.text ? (
                  <p className={styles.feedbackText}>
                    {feedback.text}
                    {feedback.fact ? (
                      <span className={styles.feedbackFact}>{feedback.fact}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className={styles.feedbackText} style={{ opacity: 0.55 }}>
                    בחרו חפצים ולחצו &quot;בדוק ניסוי&quot;
                  </p>
                )}
              </div>
            </div>

            <section className={styles.shelfSection}>
              <p className={styles.shelfTitle}>🗄️ מדף החפצים</p>
              <div className={`${styles.shelfGrid} ${shelfGridClass}`}>
                {shelfItems.map((item) => {
                  const onBench = selectedIds.includes(item.id);
                  const isDragging = draggingItemId === item.id;
                  const shelfFull = selectedIds.length >= maxPick && !onBench;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={showResult || shelfFull}
                      className={`${styles.shelfItemBtn} ${onBench ? styles.shelfItemOnBench : ""}`}
                      onPointerDown={(e) => onShelfPointerDown(e, item.id)}
                      onClick={() => onShelfClick(item.id)}
                      aria-label={item.name}
                    >
                      {!isDragging ? <LabItemVisual item={item} size="shelf" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={showResult || selectedIds.length !== maxPick}
                onClick={runCheck}
              >
                בדוק ניסוי 🧪
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={showResult || selectedIds.length === 0}
                onClick={clearSelection}
              >
                נקה בחירה
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>🎉 סיימתם את המעבדה!</h2>
            <div className={styles.endStats}>
              <div className={styles.endStat}>
                ניקוד
                <span className={styles.endStatValue}>{score}</span>
              </div>
              <div className={styles.endStat}>
                הצלחות
                <span className={styles.endStatValue}>
                  {successCount}/{experiments.length}
                </span>
              </div>
              <div className={styles.endStat}>
                טעויות
                <span className={styles.endStatValue}>{mistakes}</span>
              </div>
              <div className={styles.endStat}>
                דיוק
                <span className={styles.endStatValue}>{accuracyPct}%</span>
              </div>
              <div className={styles.endStat} style={{ gridColumn: "1 / -1" }}>
                רמה
                <span className={styles.endStatValue}>{diffConfig.label}</span>
              </div>
            </div>
            <button type="button" className={styles.startBtn} onClick={() => setPhase("intro")}>
              משחק חדש
            </button>
          </div>
        </div>
      ) : null}

      {dragGhost && LAB_ITEMS[dragGhost.itemId] ? (
        <div className={styles.dragOverlay} aria-hidden>
          <div
            data-drag-ghost="true"
            className={styles.dragGhost}
            style={{ left: dragGhost.x, top: dragGhost.y }}
          >
            <LabItemVisual item={LAB_ITEMS[dragGhost.itemId]} size="ghost" showName={false} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
