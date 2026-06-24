import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BINS,
  DIFFICULTIES,
  SCORE,
  pickFactForBin,
  pickRandomItem,
} from "./recycling-factory-data.js";
import { buildRecyclingFactoryMetrics } from "./recycling-factory-metrics.js";
import styles from "./RecyclingFactoryPrototype.module.css";

/** @typedef {import('./recycling-factory-data.js').DifficultyId} DifficultyId */
/** @typedef {import('./recycling-factory-data.js').BinId} BinId */

/**
 * @typedef {{ uid: string, item: import('./recycling-factory-data.js').ITEMS[0], progress: number, status: 'moving'|'success'|'shake', spawnTime: number }} BeltItem
 */

let uidCounter = 0;
function nextUid() {
  uidCounter += 1;
  return `belt-${uidCounter}`;
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
 * @param {{ item: BeltItem, selected: boolean, dragging: boolean, onPointerDown: (e: React.PointerEvent) => void, onPointerMove: (e: React.PointerEvent) => void, onPointerUp: (e: React.PointerEvent) => void, onPointerCancel: (e: React.PointerEvent) => void, onClick: () => void }} props
 */
function BeltItemView({ item, selected, dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }) {
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
      style={{ left: leftPct }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`פריט ${item.item.name}`}
    >
      <div className={styles.itemCard}>
        <span className={styles.itemEmoji}>{item.item.emoji}</span>
        <span className={styles.itemName}>{item.item.name}</span>
      </div>
    </div>
  );
}

export default function RecyclingFactoryPrototype() {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
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
  const [dragGhost, setDragGhost] = useState(/** @type {{ emoji: string, name: string, x: number, y: number }|null} */ (null));
  const [draggingUid, setDraggingUid] = useState(/** @type {string|null} */ (null));

  const dragRef = useRef(/** @type {{ uid: string, pointerId: number, moved: boolean, startX: number, startY: number }|null} */ (null));
  const phaseRef = useRef(phase);
  const difficultyRef = useRef(difficulty);
  const processingRef = useRef(new Set());
  const metricsRef = useRef(null);
  const beltItemsRef = useRef(beltItems);
  const sortedCountRef = useRef(sortedCount);
  const mistakesRef = useRef(mistakes);

  phaseRef.current = phase;
  difficultyRef.current = difficulty;
  beltItemsRef.current = beltItems;
  sortedCountRef.current = sortedCount;
  mistakesRef.current = mistakes;

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
      const maxOnBelt = diff.dualChance > 0 && Math.random() < diff.dualChance ? 2 : 1;
      const slots = maxOnBelt - moving.length;
      if (slots <= 0) return prev;

      const spawnCount = diff.dualChance > 0 && moving.length === 0 && Math.random() < diff.dualChance ? 2 : 1;
      const toAdd = Math.min(slots, spawnCount);
      const kept = prev.filter((b) => b.status !== "success");
      const additions = Array.from({ length: toAdd }, (_, i) => ({
        uid: nextUid(),
        item: pickRandomItem(diff.bins),
        progress: i * 0.32,
        status: /** @type {'moving'} */ ("moving"),
        spawnTime: Date.now(),
      }));
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
      setFeedback({
        text: "הפריט עבר את המסוע — נסו להיות מהירים יותר!",
        fact: "",
        type: "bad",
      });
      setHighlightBin(null);

      window.setTimeout(() => {
        processingRef.current.delete(uid);
        if (phaseRef.current === "play") spawnItems();
      }, 350);
    },
    [addScore, checkEnd, spawnItems],
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
        return next;
      });

      addScore(bonus);

      const showFact = Math.random() < 0.3;
      setFeedback({
        text: "נכון! כל הכבוד ♻️",
        fact: showFact ? pickFactForBin(binId) : "",
        type: "ok",
      });
      setHighlightBin(binId);
      window.setTimeout(() => setHighlightBin(null), 500);

      window.setTimeout(() => {
        setBeltItems((prev) => prev.filter((b) => b.uid !== uid));
        if (phaseRef.current === "play") spawnItems();
      }, 420);
    },
    [addScore, checkEnd, spawnItems],
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
      setFeedback({
        text: `לא בדיוק — ${item?.name ?? "פריט"} שייך ל${correctLabel}`,
        fact: "",
        type: "bad",
      });
      setHighlightBin(binId);
      window.setTimeout(() => setHighlightBin(null), 450);

      window.setTimeout(() => {
        setBeltItems((prev) =>
          prev.map((b) => (b.uid === uid ? { ...b, status: "moving" } : b)),
        );
      }, 420);
    },
    [addScore, checkEnd],
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

  const resetGame = useCallback(() => {
    processingRef.current.clear();
    setPhase("intro");
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
  }, []);

  const startGame = useCallback(() => {
    processingRef.current.clear();
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
    if (phase !== "play") return undefined;

    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = now - last;
      last = now;
      const duration = DIFFICULTIES[difficultyRef.current].beltDurationMs;

      setBeltItems((prev) => {
        const missedUids = [];
        const next = prev
          .map((bi) => {
            if (bi.status !== "moving") return bi;
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
    metricsRef.current = buildRecyclingFactoryMetrics({
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
    });
  }, [phase, score, difficulty, sortedCount, correctItems, wrongItems, missedItems, streak, bestStreak, startTime]);

  const onItemPointerDown = useCallback((e, uid) => {
    if (phaseRef.current !== "play") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      uid,
      pointerId: e.pointerId,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    const item = beltItemsRef.current.find((b) => b.uid === uid);
    if (item) {
      setDraggingUid(uid);
      setDragGhost({ emoji: item.item.emoji, name: item.item.name, x: e.clientX, y: e.clientY });
    }
  }, []);

  const onItemPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 8) drag.moved = true;
    setDragGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : null));
  }, []);

  const finishPointer = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (drag.moved) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const binEl = el?.closest("[data-bin-id]");
        const binId = binEl?.getAttribute("data-bin-id");
        if (binId) sortToBin(drag.uid, /** @type {BinId} */ (binId));
      } else {
        setSelectedUid((s) => (s === drag.uid ? null : drag.uid));
      }

      dragRef.current = null;
      setDragGhost(null);
      setDraggingUid(null);
    },
    [sortToBin],
  );

  const onBinActivate = useCallback(
    (binId) => {
      if (phase !== "play") return;
      if (selectedUid) {
        sortToBin(selectedUid, binId);
        return;
      }
      if (dragRef.current) {
        sortToBin(dragRef.current.uid, binId);
        dragRef.current = null;
        setDragGhost(null);
        setDraggingUid(null);
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

  return (
    <div className={styles.shell} dir="rtl">
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
        <Link href="/dev/learning-game-prototypes" className={styles.backBtn}>
          ← חזרה
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
            <span className={styles.hudChip}>🧪 אבטיפוס</span>
          </div>
        )}
        <div style={{ minWidth: 40 }} aria-hidden />
      </header>

      {phase === "intro" ? (
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
        <div className={styles.main}>
          <div className={styles.factorySign}>
            <h2 className={styles.factoryTitle}>מפעל המיחזור של ליאו</h2>
            <p className={styles.factorySub}>רמה: {diffConfig.label}</p>
          </div>

          <div className={styles.playArea}>
            <div className={styles.conveyorWrap}>
              <div className={styles.conveyorFrame}>
                <span className={styles.conveyorLabel}>🏭 מסוע</span>
                <div className={styles.beltTrack}>
                  <div className={styles.beltSurface} aria-hidden />
                  <div className={styles.beltRollLeft} aria-hidden />
                  <div className={styles.beltRollRight} aria-hidden />
                  <div
                    className={styles.beltItemsLayer}
                    onPointerMove={onItemPointerMove}
                  >
                    {beltItems.map((bi) => (
                      <BeltItemView
                        key={bi.uid}
                        item={bi}
                        selected={selectedUid === bi.uid}
                        dragging={draggingUid === bi.uid}
                        onPointerDown={(e) => onItemPointerDown(e, bi.uid)}
                        onPointerMove={onItemPointerMove}
                        onPointerUp={finishPointer}
                        onPointerCancel={finishPointer}
                        onClick={() => {
                          if (!dragRef.current?.moved) {
                            setSelectedUid((s) => (s === bi.uid ? null : bi.uid));
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`${styles.feedbackBar} ${
                feedback.type === "ok" ? styles.feedbackOk : feedback.type === "bad" ? styles.feedbackBad : ""
              }`}
            >
              {feedback.text ? (
                <p className={styles.feedbackText}>
                  {feedback.text}
                  {feedback.fact ? <span className={styles.feedbackFact}>{feedback.fact}</span> : null}
                </p>
              ) : (
                <p className={styles.feedbackText} style={{ opacity: 0.55 }}>
                  גררו לפח או לחצו פריט ← פח
                </p>
              )}
            </div>

            <div className={styles.binsArea}>
              {renderBins(`${styles.binsGrid} ${binsGridClass}`)}
              {renderBins(styles.binsScroll)}
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" || phase === "lost" ? (
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
        <div
          className={styles.dragGhost}
          style={{ left: dragGhost.x, top: dragGhost.y }}
          aria-hidden
        >
          <div className={styles.itemCard}>
            <span className={styles.itemEmoji}>{dragGhost.emoji}</span>
            <span className={styles.itemName}>{dragGhost.name}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
