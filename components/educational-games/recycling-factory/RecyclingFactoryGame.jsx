import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BINS,
  DIFFICULTIES,
  SCORE,
  allowDualItemsAt,
  beltDurationMs,
  buildRecyclingSessionPlan,
  nextPlannedRecyclingItem,
  pickFactForBin,
} from "./recycling-factory-data.js";
import { buildRecyclingFactoryMetrics } from "./recycling-factory-metrics.js";
import RecyclingItemVisual from "./RecyclingItemVisual.jsx";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import styles from "./RecyclingFactoryGame.module.css";

const RECYCLING_INSTRUCTION =
  "מיינו כל פריט לפח הנכון - שמרו על הסביבה! גררו או לחצו פריט לפח.";

/** @typedef {import('./recycling-factory-data.js').DifficultyId} DifficultyId */
/** @typedef {import('./recycling-factory-data.js').BinId} BinId */
/** @typedef {import('./recycling-factory-data.js').RecyclingItem} RecyclingItem */

/**
 * @typedef {{ uid: string, item: RecyclingItem, progress: number, status: 'moving'|'success'|'shake', spawnTime: number }} BeltItem
 */

const DRAG_THRESHOLD_PX = 10;

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `belt-${uidCounter}`;
}

/** @param {number} x @param {number} y */
function findBinIdAtPoint(x, y) {
  const ghost = document.querySelector('[data-drag-ghost="true"]');
  if (ghost) ghost.style.visibility = "hidden";
  const hit = document.elementFromPoint(x, y);
  if (ghost) ghost.style.visibility = "visible";

  const fromPoint = hit?.closest("[data-bin-id]")?.getAttribute("data-bin-id");
  if (fromPoint) return /** @type {BinId} */ (fromPoint);

  for (const bin of document.querySelectorAll("[data-bin-id]")) {
    const rect = bin.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      const id = bin.getAttribute("data-bin-id");
      if (id) return /** @type {BinId} */ (id);
    }
  }
  return null;
}

/**
 * @param {{ bin: typeof BINS[BinId], selected: boolean, highlight: boolean, onClick: () => void }} props
 */
function RecyclingBin({ bin, selected, highlight, onClick }) {
  return (
    <button
      type="button"
      data-bin-id={bin.id}
      className={`${styles.binBtn} ${selected ? styles.binBtnActive : ""} ${highlight ? styles.binBtnHighlight : ""}`}
      onClick={onClick}
    >
      <div className={styles.binBody}>
        <div className={styles.binLid} style={{ background: bin.lid }} />
        <div className={styles.binCan} style={{ background: bin.body }}>
          <span className={styles.binEmoji}>{bin.emoji}</span>
          <span className={styles.binLabel}>{bin.label}</span>
        </div>
      </div>
    </button>
  );
}

/**
 * @param {{ item: BeltItem, selected: boolean, dragging: boolean, onPointerDown: (e: React.PointerEvent) => void, onClick: () => void }} props
 */
function BeltItemView({ item, selected, dragging, onPointerDown, onClick }) {
  const leftPct = `${Math.min(96, Math.max(4, item.progress * 100))}%`;
  const className = [
    styles.beltItem,
    selected ? styles.beltItemSelected : "",
    dragging ? styles.beltItemDragging : "",
    item.status === "success" ? styles.beltItemSuccess : "",
    item.status === "shake" ? styles.beltItemShake : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (dragging) return null;

  return (
    <div
      className={className}
      style={{ left: leftPct, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`פריט ${item.item.name}`}
    >
      <div className={styles.itemCard}>
        <RecyclingItemVisual item={item.item} />
      </div>
    </div>
  );
}

export default function RecyclingFactoryGame({
  autoStart = false,
  initialDifficulty = "easy",
  productionMode = false,
  onSessionEnd,
  backHref = "/student/educational-games",
  showFullscreenButton = false,
  isFullscreen = false,
  onFullscreenToggle,
}) {
  const sessionEndFiredRef = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const [phase, setPhase] = useState(
    /** @type {'intro'|'play'|'won'|'lost'} */ (autoStart ? "play" : "intro"),
  );
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (initialDifficulty));
  const [score, setScore] = useState(0);
  const [sortedCount, setSortedCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctItems, setCorrectItems] = useState(0);
  const [wrongItems, setWrongItems] = useState(0);
  const [missedItems, setMissedItems] = useState(0);
  const [beltItems, setBeltItems] = useState(/** @type {BeltItem[]} */ ([]));
  const [selectedUid, setSelectedUid] = useState(/** @type {string|null} */ (null));
  const [feedback, setFeedback] = useState(/** @type {{ text: string, fact: string, type: 'ok'|'bad'|'' }} */ ({
    text: "",
    fact: "",
    type: "",
  }));
  const [highlightBin, setHighlightBin] = useState(/** @type {BinId|null} */ (null));
  const [startTime, setStartTime] = useState(0);
  const [dragGhost, setDragGhost] = useState(
    /** @type {{ item: RecyclingItem, x: number, y: number }|null} */ (null),
  );
  const [draggingUid, setDraggingUid] = useState(/** @type {string|null} */ (null));

  const {
    onCorrect,
    onWrong,
    onStreak,
    onDragLift,
    onDropOk,
    playFeedback,
    replayInstruction,
    audio,
  } = useEducationalEngineAudio({
    instructionText: phase === "play" ? RECYCLING_INSTRUCTION : "",
    autoPlayInstruction: productionMode && phase === "play",
  });

  const dragRef = useRef(
    /** @type {{ uid: string, pointerId: number, moved: boolean, active: boolean, startX: number, startY: number }|null} */ (null),
  );
  const draggingUidRef = useRef(/** @type {string|null} */ (null));
  const suppressClickRef = useRef(false);
  const sortToBinRef = useRef(/** @type {(uid: string, binId: BinId) => void} */ (() => {}));
  const phaseRef = useRef(phase);
  const difficultyRef = useRef(difficulty);
  const processingRef = useRef(new Set());
  const metricsRef = useRef(null);
  const beltItemsRef = useRef(beltItems);
  const sortedCountRef = useRef(sortedCount);
  const mistakesRef = useRef(mistakes);
  const sessionPlanRef = useRef(/** @type {RecyclingItem[]} */ ([]));
  const planIndexRef = useRef(0);

  phaseRef.current = phase;
  difficultyRef.current = difficulty;
  beltItemsRef.current = beltItems;
  sortedCountRef.current = sortedCount;
  mistakesRef.current = mistakes;
  draggingUidRef.current = draggingUid;

  const diffConfig = DIFFICULTIES[difficulty];
  const activeBins = useMemo(
    () => diffConfig.bins.map((id) => BINS[id]),
    [diffConfig.bins],
  );

  const binsGridClass =
    activeBins.length <= 3
      ? styles.binsGrid3
      : activeBins.length === 4
        ? styles.binsGrid4
        : styles.binsGrid5;

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const spawnItems = useCallback(() => {
    const diff = DIFFICULTIES[difficultyRef.current];
    setBeltItems((prev) => {
      const moving = prev.filter((b) => b.status === "moving");
      const dualAllowed = allowDualItemsAt(sortedCountRef.current, difficultyRef.current);
      const maxOnBelt = dualAllowed && Math.random() < diff.dualChance ? 2 : 1;
      const slots = maxOnBelt - moving.length;
      if (slots <= 0) return prev;

      const spawnCount = dualAllowed && moving.length === 0 && Math.random() < diff.dualChance ? 2 : 1;
      const toAdd = Math.min(slots, spawnCount);
      const kept = prev.filter((b) => b.status !== "success");

      /** @type {BeltItem[]} */
      const additions = [];
      for (let i = 0; i < toAdd; i += 1) {
        const item = nextPlannedRecyclingItem(sessionPlanRef.current, planIndexRef.current);
        if (!item) break;
        planIndexRef.current += 1;
        additions.push({
          uid: nextUid(),
          item,
          progress: i * 0.32,
          status: /** @type {'moving'} */ ("moving"),
          spawnTime: Date.now(),
        });
      }
      return [...kept, ...additions];
    });
  }, []);

  const checkEnd = useCallback((nextSorted, nextMistakes) => {
    const diff = DIFFICULTIES[difficultyRef.current];
    if (nextMistakes >= diff.maxMistakes) {
      setPhase("lost");
      return true;
    }
    if (nextSorted >= diff.itemsTarget) {
      setPhase("won");
      return true;
    }
    return false;
  }, []);

  const handleMiss = useCallback(
    (uid) => {
      if (phaseRef.current !== "play") return;
      if (processingRef.current.has(uid)) return;
      processingRef.current.add(uid);

      setBeltItems((prev) => prev.filter((b) => b.uid !== uid));
      setSelectedUid((s) => (s === uid ? null : s));
      setMissedItems((m) => m + 1);
      setMistakes((m) => {
        const next = m + 1;
        checkEnd(sortedCountRef.current, next);
        return next;
      });
      addScore(SCORE.miss);
      setStreak(0);
      const missText = "הפריט עבר את המסוע - נסו להיות מהירים יותר!";
      setFeedback({ text: missText, fact: "", type: "bad" });
      onWrong();
      playFeedback(missText);
      setHighlightBin(null);

      window.setTimeout(() => {
        processingRef.current.delete(uid);
        if (phaseRef.current === "play") spawnItems();
      }, 350);
    },
    [addScore, checkEnd, spawnItems, onWrong, playFeedback],
  );

  const handleCorrect = useCallback(
    (uid, binId) => {
      const beltItem = beltItemsRef.current.find((b) => b.uid === uid);
      const progress = beltItem?.progress ?? 1;

      setBeltItems((prev) => {
        const target = prev.find((b) => b.uid === uid);
        if (!target) return prev;
        return prev.map((b) => (b.uid === uid ? { ...b, status: "success" } : b));
      });
      setSelectedUid(null);

      let bonus = SCORE.correct;
      if (progress < SCORE.fastThreshold) bonus += SCORE.fastBonus;

      setCorrectItems((c) => c + 1);
      setSortedCount((s) => {
        const next = s + 1;
        checkEnd(next, mistakesRef.current);
        return next;
      });

      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next === 5) addScore(SCORE.streak5);
        if (next === 10) addScore(SCORE.streak10);
        if (next === 5 || next === 10) onStreak();
        return next;
      });

      addScore(bonus);

      const showFact = Math.random() < 0.3;
      const okText = "נכון! כל הכבוד ♻️";
      const factText = showFact ? pickFactForBin(binId) : "";
      setFeedback({ text: okText, fact: factText, type: "ok" });
      onCorrect();
      void (async () => {
        await playFeedback(okText);
        if (factText) await playFeedback(factText);
      })();
      setHighlightBin(binId);
      window.setTimeout(() => setHighlightBin(null), 500);

      window.setTimeout(() => {
        setBeltItems((prev) => prev.filter((b) => b.uid !== uid));
        if (phaseRef.current === "play") spawnItems();
      }, 420);
    },
    [addScore, checkEnd, spawnItems, onCorrect, onStreak, playFeedback],
  );

  const handleWrong = useCallback(
    (uid, binId) => {
      setBeltItems((prev) =>
        prev.map((b) => (b.uid === uid ? { ...b, status: "shake", progress: Math.min(b.progress, 0.55) } : b)),
      );
      setSelectedUid(null);
      setWrongItems((w) => w + 1);
      setMistakes((m) => {
        const next = m + 1;
        checkEnd(sortedCountRef.current, next);
        return next;
      });
      addScore(SCORE.mistake);
      setStreak(0);

      const item = beltItemsRef.current.find((b) => b.uid === uid)?.item;
      const correctLabel = item ? BINS[item.bin]?.label : "";
      const wrongText = `לא בדיוק - ${item?.name ?? "פריט"} שייך ל${correctLabel}`;
      setFeedback({ text: wrongText, fact: "", type: "bad" });
      onWrong();
      playFeedback(wrongText);
      setHighlightBin(binId);
      window.setTimeout(() => setHighlightBin(null), 450);

      window.setTimeout(() => {
        setBeltItems((prev) =>
          prev.map((b) => (b.uid === uid ? { ...b, status: "moving" } : b)),
        );
      }, 420);
    },
    [addScore, checkEnd, onWrong, playFeedback],
  );

  const sortToBin = useCallback(
    (uid, binId) => {
      if (phaseRef.current !== "play") return;
      const beltItem = beltItemsRef.current.find((b) => b.uid === uid);
      if (!beltItem || beltItem.status !== "moving") return;

      if (beltItem.item.bin === binId) {
        handleCorrect(uid, binId);
      } else {
        handleWrong(uid, binId);
      }
    },
    [handleCorrect, handleWrong],
  );

  sortToBinRef.current = sortToBin;

  const resetGame = useCallback(() => {
    processingRef.current.clear();
    sessionEndFiredRef.current = false;
    setPhase(productionMode && autoStart ? "play" : "intro");
    setScore(0);
    setSortedCount(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectItems(0);
    setWrongItems(0);
    setMissedItems(0);
    setBeltItems([]);
    setSelectedUid(null);
    setFeedback({ text: "", fact: "", type: "" });
    setHighlightBin(null);
    setDragGhost(null);
    dragRef.current = null;
    setDraggingUid(null);
    suppressClickRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    processingRef.current.clear();
    sessionPlanRef.current = buildRecyclingSessionPlan(DIFFICULTIES[difficultyRef.current].bins);
    planIndexRef.current = 0;
    setPhase("play");
    setScore(0);
    setSortedCount(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectItems(0);
    setWrongItems(0);
    setMissedItems(0);
    setBeltItems([]);
    setSelectedUid(null);
    setFeedback({ text: "גררו פריט לפח או לחצו על פריט ואז על פח", fact: "", type: "" });
    setStartTime(Date.now());
    window.setTimeout(() => spawnItems(), 200);
  }, [spawnItems]);

  useEffect(() => {
    if (phase !== "play") {
      audio.stopAsset("sfx-conveyor");
      return undefined;
    }
    audio.playSfx("sfx-conveyor", { loop: true });
    return () => audio.stopAsset("sfx-conveyor");
  }, [phase, audio]);

  useEffect(() => {
    if (phase !== "play") return undefined;

    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = now - last;
      last = now;
      const duration = beltDurationMs(difficultyRef.current, sortedCountRef.current);

      setBeltItems((prev) => {
        const missedUids = [];
        const next = prev
          .map((bi) => {
            if (bi.status !== "moving") return bi;
            if (bi.uid === draggingUidRef.current) return bi;
            const prog = bi.progress + dt / duration;
            if (prog >= 1) {
              missedUids.push(bi.uid);
              return null;
            }
            return { ...bi, progress: prog };
          })
          .filter(Boolean);

        if (missedUids.length) {
          missedUids.forEach((uid) => {
            window.setTimeout(() => handleMiss(uid), 0);
          });
        }
        return /** @type {BeltItem[]} */ (next);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, handleMiss]);

  useEffect(() => {
    if (phase !== "won" && phase !== "lost") return;
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const payload = buildRecyclingFactoryMetrics({
      score,
      didWin: phase === "won",
      difficulty,
      sortedItems: sortedCount,
      correctItems,
      wrongItems,
      missedItems,
      mistakes: wrongItems + missedItems,
      streak,
      bestStreak,
      durationSec,
      gameKey: "recycling-factory",
      category: "educational",
    });
    metricsRef.current = payload;

    if (productionMode && onSessionEndRef.current && !sessionEndFiredRef.current) {
      sessionEndFiredRef.current = true;
      onSessionEndRef.current(payload);
    }
  }, [
    phase,
    score,
    difficulty,
    sortedCount,
    correctItems,
    wrongItems,
    missedItems,
    streak,
    bestStreak,
    startTime,
    productionMode,
  ]);

  useEffect(() => {
    if (!autoStart || phase !== "play") return;
    if (beltItems.length > 0 || sortedCount > 0) return;
    startGame();
  }, [autoStart, phase, beltItems.length, sortedCount, startGame]);

  const onItemPointerDown = useCallback((e, uid) => {
    if (phaseRef.current !== "play") return;
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const beltItem = beltItemsRef.current.find((b) => b.uid === uid);
    if (!beltItem || beltItem.status !== "moving") return;

    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      uid,
      pointerId: e.pointerId,
      moved: false,
      active: true,
      startX: e.clientX,
      startY: e.clientY,
    };
    setDraggingUid(uid);
    setDragGhost({ item: beltItem.item, x: e.clientX, y: e.clientY });
    onDragLift();
  }, [onDragLift]);

  useEffect(() => {
    if (!draggingUid) return undefined;

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

      if (drag.moved) {
        suppressClickRef.current = true;
        const binId = findBinIdAtPoint(e.clientX, e.clientY);
        if (binId) {
          onDropOk();
          sortToBinRef.current(drag.uid, binId);
        }
      } else {
        suppressClickRef.current = true;
        setSelectedUid((s) => (s === drag.uid ? null : drag.uid));
      }

      dragRef.current = null;
      setDraggingUid(null);
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
  }, [draggingUid, onDropOk]);

  const onItemClick = useCallback((uid) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (dragRef.current?.moved) return;
    setSelectedUid((s) => (s === uid ? null : uid));
  }, []);

  const onBinActivate = useCallback(
    (binId) => {
      if (phase !== "play") return;
      if (selectedUid) {
        sortToBin(selectedUid, binId);
      }
    },
    [phase, selectedUid, sortToBin],
  );

  const accuracyPct = Math.round(
    (correctItems / Math.max(1, correctItems + wrongItems + missedItems)) * 100,
  );

  const renderBins = (className) => (
    <div className={className}>
      {activeBins.map((bin) => (
        <RecyclingBin
          key={bin.id}
          bin={bin}
          selected={highlightBin === bin.id}
          highlight={highlightBin === bin.id}
          onClick={() => onBinActivate(bin.id)}
        />
      ))}
    </div>
  );

  const feedbackBarClass = [
    shop.feedbackBar,
    feedback.type === "ok"
      ? shop.feedbackOk
      : feedback.type === "bad"
        ? shop.feedbackBad
        : shop.feedbackNeutral,
  ].join(" ");

  return (
    <div className={`${styles.shell} ${productionMode ? styles.shellEmbedded : ""}`} dir="rtl">
      <span className={`${styles.deco} ${styles.gear1}`} aria-hidden>
        ⚙️
      </span>
      <span className={`${styles.deco} ${styles.gear2}`} aria-hidden>
        ⚙️
      </span>
      <span className={`${styles.deco} ${styles.leaf1}`} aria-hidden>
        🍃
      </span>
      <span className={`${styles.deco} ${styles.leaf2}`} aria-hidden>
        🌿
      </span>
      <span className={`${styles.deco} ${styles.leoHelper}`} aria-hidden title="ליאו העוזר">
        🦁
      </span>

      <header className={styles.header}>
        <Link href={backHref} className={styles.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={styles.hud}>
            <span className={`${styles.hudChip} ${styles.hudChipScore}`}>⭐ {score}</span>
            <span className={styles.hudChip}>
              📦 {sortedCount}/{diffConfig.itemsTarget}
            </span>
            <span className={`${styles.hudChip} ${styles.hudChipBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${styles.hudChip} ${styles.hudChipGood}`}>🔥 {streak}</span>
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>{productionMode ? "♻️" : "🧪 אבטיפוס"}</span>
          </div>
        )}
        {showFullscreenButton && onFullscreenToggle ? (
          <EducationalGameHudFullscreenButton
            className={styles.hudChip}
            isFullscreen={isFullscreen}
            onToggle={onFullscreenToggle}
          />
        ) : null}
      </header>

      {phase === "intro" && !autoStart ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🏭♻️</p>
          <h1 className={styles.introTitle}>מפעל המיחזור של ליאו</h1>
          <p className={styles.introText}>מיינו את הפריטים לפחים הנכונים ושמרו על הסביבה</p>
          <div className={styles.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.diffBtn} ${difficulty === id ? styles.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].label}
              </button>
            ))}
          </div>
          <EducationalDifficultyGradeHint className={`${styles.introText} opacity-70`} style={{ fontSize: "0.72rem" }} />
          <p className={styles.introText} style={{ fontSize: "0.78rem" }}>
            {diffConfig.itemsTarget} פריטים · עד {diffConfig.maxMistakes} טעויות · {activeBins.length}{" "}
            פחים
          </p>
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            ♻️ מפעל המיחזור · {sortedCount}/{diffConfig.itemsTarget} · {diffConfig.label}
          </p>

          <div className={`${shop.shopGrid} ${styles.recyclingShopGrid}`} data-educational-workplace-grid="">
            <aside className={`${shop.customerCol} ${styles.recyclingCustomerCol}`}>
              <div className={`${shop.customerCard} ${styles.recyclingMissionCard}`}>
                <span className={`${shop.customerAvatar} ${styles.recyclingMissionAvatar}`} aria-hidden>
                  🦁♻️
                </span>
                <div className={`${shop.customerSpeechWrap} ${styles.recyclingMissionSpeech}`}>
                  <div className={shop.missionRow}>
                    <p className={`${shop.customerName} ${styles.recyclingMissionTitle}`}>משימה</p>
                    <EducationalGameInstructionReplay
                      text={RECYCLING_INSTRUCTION}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={`${shop.missionText} ${styles.recyclingMissionText}`}>
                    מיינו כל פריט לפח הנכון - שמרו על הסביבה!
                    <span className={`${shop.missionTicket} ${styles.recyclingMissionHint}`}>
                      🏭 גררו או לחצו פריט ← פח
                    </span>
                  </p>
                </div>
              </div>
            </aside>

            <section className={`${shop.workCol} ${styles.recyclingWorkCol}`}>
              <div className={`${shop.workFrame} ${styles.recyclingWorkFrame}`}>
                <div className={styles.conveyorWrap}>
                  <div className={styles.conveyorFrame}>
                    <span className={styles.conveyorLabel}>🏭 מסוע</span>
                    <div className={styles.beltTrack}>
                      <div className={styles.beltSurface} aria-hidden />
                      <div className={styles.beltRollLeft} aria-hidden />
                      <div className={styles.beltRollRight} aria-hidden />
                      <div className={styles.beltItemsLayer}>
                        {beltItems.map((bi) => (
                          <BeltItemView
                            key={bi.uid}
                            item={bi}
                            selected={selectedUid === bi.uid}
                            dragging={draggingUid === bi.uid}
                            onPointerDown={(e) => onItemPointerDown(e, bi.uid)}
                            onClick={() => onItemClick(bi.uid)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className={`${shop.sideCol} ${styles.recyclingSideCol}`}>
              <div className={`${shop.toolsPanel} ${styles.recyclingBinsPanel}`}>
                <p className={shop.toolsTitle}>🗑️ פחי מיחזור</p>
                <div className={styles.binsArea} data-bin-count={activeBins.length}>
                  {renderBins(`${styles.binsGrid} ${binsGridClass}`)}
                </div>
              </div>
            </aside>

            <div className={`${shop.bottomBar} ${styles.recyclingBottomBar}`}>
              <div className={feedbackBarClass}>
                {feedback.text ? (
                  <p className={shop.feedbackText}>
                    {feedback.text}
                    {feedback.fact ? (
                      <span className={styles.feedbackFact}>{feedback.fact}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className={shop.feedbackText} style={{ opacity: 0.55 }}>
                    גררו לפח או לחצו פריט ← פח
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(phase === "won" || phase === "lost") && !productionMode ? (
        <div className={styles.screenCenter}>
          <div className={styles.endCard}>
            <h2 className={styles.endTitle}>
              {phase === "won"
                ? "כיף גדול! הצלחתם למיין את הפריטים!"
                : "לא נורא, ננסה שוב למיין טוב יותר."}
            </h2>
            <div className={styles.endStats}>
              <div className={styles.endStat}>
                ניקוד
                <span className={styles.endStatValue}>{score}</span>
              </div>
              <div className={styles.endStat}>
                פריטים נכונים
                <span className={styles.endStatValue}>{correctItems}</span>
              </div>
              <div className={styles.endStat}>
                טעויות
                <span className={styles.endStatValue}>{wrongItems + missedItems}</span>
              </div>
              <div className={styles.endStat}>
                דיוק
                <span className={styles.endStatValue}>{accuracyPct}%</span>
              </div>
              <div className={styles.endStat}>
                רצף הכי טוב
                <span className={styles.endStatValue}>{bestStreak}</span>
              </div>
              <div className={styles.endStat}>
                רמה
                <span className={styles.endStatValue}>{diffConfig.label}</span>
              </div>
            </div>
            <button type="button" className={styles.startBtn} onClick={resetGame}>
              משחק חדש
            </button>
          </div>
        </div>
      ) : null}

      {dragGhost ? (
        <div className={styles.dragOverlay} aria-hidden>
          <div
            data-drag-ghost="true"
            className={styles.dragGhost}
            style={{ left: dragGhost.x, top: dragGhost.y }}
          >
            <div className={`${styles.itemCard} ${styles.itemCardDragging}`}>
              <RecyclingItemVisual item={dragGhost.item} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
