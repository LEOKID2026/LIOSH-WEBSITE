import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sharedStyles as frame } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import {
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES,
  SCORE,
  isPizzeriaWin,
  pickCustomersForRun,
  toppingById,
  TOPPINGS,
  validateCustomerOrder,
  wedgeCenter,
  wedgePath,
} from "./leo-pizzeria-data.js";
import { buildLeoPizzeriaMetrics } from "./leo-pizzeria-metrics.js";
import styles from "./LeoPizzeriaGame.module.css";

/** @typedef {import('./leo-pizzeria-data.js').DifficultyId} DifficultyId */
/** @typedef {import('./leo-pizzeria-data.js').PizzeriaCustomerOrder} PizzeriaCustomerOrder */

const SVG_SIZE = 200;
const CX = 100;
const CY = 100;
const R = 88;

/**
 * @param {{
 *   autoStart?: boolean,
 *   initialDifficulty?: string,
 *   productionMode?: boolean,
 *   onSessionEnd?: (metrics: object) => void,
 *   backHref?: string,
 *   showFullscreenButton?: boolean,
 *   isFullscreen?: boolean,
 *   onFullscreenToggle?: () => void,
 * }} props
 */
export default function LeoPizzeriaGame({
  autoStart = false,
  initialDifficulty = "easy",
  productionMode = false,
  onSessionEnd,
  backHref = "/student/educational-games",
  showFullscreenButton = false,
  isFullscreen = false,
  onFullscreenToggle,
}) {
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;
  const sessionEndFiredRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const mistakesRef = useRef(0);
  const timeoutHandledForCustomerRef = useRef(-1);
  const timeLeftRef = useRef(0);
  const advanceTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
  const [customers, setCustomers] = useState(/** @type {PizzeriaCustomerOrder[]} */ ([]));
  const [customerIndex, setCustomerIndex] = useState(0);
  const [selectedTopping, setSelectedTopping] = useState(/** @type {string | null} */ (null));
  /** @type {[Record<number, string>, import('react').Dispatch<import('react').SetStateAction<Record<number, string>>>]} */
  const [sliceMap, setSliceMap] = useState({});
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [customerKey, setCustomerKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const dragRef = useRef(/** @type {{ toppingId: string } | null} */ (null));
  const [dragGhost, setDragGhost] = useState(
    /** @type {{ toppingId: string, x: number, y: number } | null} */ (null),
  );

  const diffConfig = DIFFICULTIES[difficulty];
  const customer = customers[customerIndex] ?? null;
  const sliceCount = customer?.sliceCount ?? diffConfig.sliceCount;
  const instructionText =
    phase === "play" && customer ? `${customer.greeting} ${customer.ticketLine}` : "";

  const {
    onCorrect,
    onWrong,
    onStreak,
    onTimeUp,
    onDragLift,
    onDropOk,
    playFeedback,
    replayInstruction,
  } = useEducationalEngineAudio({
    instructionText,
    autoPlayInstruction: productionMode && phase === "play" && Boolean(customer),
  });

  mistakesRef.current = mistakes;
  timeLeftRef.current = timeLeft;

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const resetPizza = useCallback(() => {
    setSliceMap({});
    setSelectedTopping(null);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startGame = useCallback(() => {
    const list = pickCustomersForRun(difficulty);
    setCustomers(list);
    setCustomerIndex(0);
    setScore(0);
    setMistakes(0);
    mistakesRef.current = 0;
    setSuccessCount(0);
    setFailedAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setCustomerKey(0);
    timeoutHandledForCustomerRef.current = -1;
    startTimeRef.current = Date.now();
    sessionEndFiredRef.current = false;
    resetPizza();
    setTimeLeft(list[0]?.timeLimitSec ?? diffConfig.timeLimitsByBand[0]);
    setPhase("play");
  }, [difficulty, resetPizza, diffConfig.timeLimitsByBand]);

  const endRun = useCallback((nextPhase) => {
    setPhase(nextPhase);
  }, []);

  const nextCustomer = useCallback(
    (nextIndex) => {
      if (nextIndex >= customers.length) {
        endRun("won");
        return;
      }
      setCustomerIndex(nextIndex);
      setCustomerKey((k) => k + 1);
      resetPizza();
      timeoutHandledForCustomerRef.current = -1;
      setTimeLeft(customers[nextIndex]?.timeLimitSec ?? diffConfig.timeLimitsByBand[0]);
    },
    [customers, resetPizza, endRun, diffConfig.timeLimitsByBand],
  );

  const advanceAfterCustomer = useCallback(
    (idx) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        nextCustomer(idx + 1);
      }, 900);
    },
    [nextCustomer],
  );

  const handleTimeout = useCallback(() => {
    if (phase !== "play" || !customer) return;

    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
    addScore(SCORE.timeout);
    setCheckState("bad");
    const timeoutText = "הלקוח חיכה יותר מדי";
    setFeedback(timeoutText);
    onTimeUp();
    playFeedback(timeoutText);

    if (nextMistakes >= diffConfig.maxMistakes) {
      window.setTimeout(() => endRun("lost"), 1200);
      return;
    }

    advanceAfterCustomer(customerIndex);
  }, [phase, customer, addScore, diffConfig.maxMistakes, endRun, advanceAfterCustomer, customerIndex, onTimeUp, playFeedback]);

  useEffect(() => {
    if (phase !== "play" || !customer) return undefined;
    if (timeLeft > 0) return undefined;
    if (timeoutHandledForCustomerRef.current === customerIndex) return undefined;
    timeoutHandledForCustomerRef.current = customerIndex;
    handleTimeout();
    return undefined;
  }, [phase, customer, timeLeft, customerIndex, handleTimeout]);

  useEffect(() => {
    if (phase !== "play" || !customer) return undefined;
    const t = window.setInterval(() => {
      setTimeLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, customer, customerIndex]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoStart || phase !== "play" || customers.length > 0) return;
    startGame();
  }, [autoStart, phase, customers.length, startGame]);

  const applyToppingToSlice = useCallback((sliceIndex, toppingId) => {
    setSliceMap((prev) => ({ ...prev, [sliceIndex]: toppingId }));
    setCheckState("idle");
    setFeedback("");
  }, []);

  const onSliceTap = useCallback(
    (sliceIndex) => {
      if (checkState === "ok") return;
      if (!selectedTopping) {
        setSliceMap((prev) => {
          const next = { ...prev };
          delete next[sliceIndex];
          return next;
        });
        setCheckState("idle");
        setFeedback("");
        return;
      }
      applyToppingToSlice(sliceIndex, selectedTopping);
    },
    [selectedTopping, applyToppingToSlice, checkState],
  );

  const onToppingPointerDown = useCallback((e, toppingId) => {
    if (e.button !== 0) return;
    dragRef.current = { toppingId };
    setSelectedTopping(toppingId);
    setDragGhost({ toppingId, x: e.clientX, y: e.clientY });
    onDragLift();
  }, [onDragLift]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    setDragGhost({ toppingId: dragRef.current.toppingId, x: e.clientX, y: e.clientY });
  }, []);

  const findSliceAtPoint = useCallback((clientX, clientY) => {
    const ghost = document.querySelector('[data-drag-ghost="true"]');
    if (ghost) ghost.style.visibility = "hidden";
    const hit = document.elementFromPoint(clientX, clientY);
    if (ghost) ghost.style.visibility = "visible";
    const slice = hit?.closest("[data-pizza-slice]");
    if (!slice) return null;
    const idx = slice.getAttribute("data-pizza-slice");
    return idx != null ? Number(idx) : null;
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const sliceIndex = findSliceAtPoint(e.clientX, e.clientY);
      if (sliceIndex != null) {
        onDropOk();
        applyToppingToSlice(sliceIndex, dragRef.current.toppingId);
      }
      dragRef.current = null;
      setDragGhost(null);
    },
    [applyToppingToSlice, findSliceAtPoint, onDropOk],
  );

  const servePizza = useCallback(() => {
    if (!customer || checkState === "ok") return;

    const result = validateCustomerOrder(customer, sliceMap);
    if (result.ok) {
      setCheckState("ok");
      setFeedback(result.message);
      onCorrect();
      playFeedback(result.message);
      setSuccessCount((c) => c + 1);
      addScore(SCORE.correct);
      const wasFast = timeLeftRef.current > Math.floor(customer.timeLimitSec * 0.35);
      if (wasFast) addScore(SCORE.fastService);
      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        if (next === 3) addScore(SCORE.streak3);
        if (next === 5) addScore(SCORE.streak5);
        if (next === 3 || next === 5) onStreak();
        return next;
      });
      advanceAfterCustomer(customerIndex);
      return;
    }

    setCheckState("bad");
    setFeedback(result.message);
    onWrong();
    playFeedback(result.message);
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    if (nextMistakes >= diffConfig.maxMistakes) {
      window.setTimeout(() => endRun("lost"), 1800);
    }
  }, [
    customer,
    sliceMap,
    checkState,
    customerIndex,
    advanceAfterCustomer,
    addScore,
    mistakes,
    diffConfig.maxMistakes,
    endRun,
    onCorrect,
    onWrong,
    onStreak,
    playFeedback,
  ]);

  const pizzaSlices = useMemo(() => {
    if (!customer) return null;
    return Array.from({ length: sliceCount }, (_, i) => {
      const toppingId = sliceMap[i];
      const topping = toppingId ? toppingById(toppingId) : null;
      const center = wedgeCenter(i, sliceCount, R, CX, CY);
      const path = wedgePath(i, sliceCount, R, CX, CY);
      const filled = Boolean(toppingId);
      return (
        <g key={i} data-pizza-slice={i}>
          <path
            d={path}
            className={`${styles.slicePath} ${filled ? styles.sliceFilled : styles.sliceEmpty} ${selectedTopping ? styles.sliceHover : ""}`}
            onClick={() => onSliceTap(i)}
            role="button"
            aria-label={`חלק ${i + 1}${topping ? ` · ${topping.name}` : ""}`}
          />
          {!filled && sliceCount === 4 ? (
            <text x={center.x} y={center.y + 2} textAnchor="middle" className={styles.sliceHint}>
              {i + 1}
            </text>
          ) : null}
          {topping ? (
            <text
              x={center.x}
              y={center.y + (sliceCount <= 4 ? 8 : 6)}
              textAnchor="middle"
              className={styles.sliceToppingEmoji}
              style={{ fontSize: sliceCount <= 4 ? 36 : 28 }}
            >
              {topping.emoji}
            </text>
          ) : null}
        </g>
      );
    });
  }, [customer, sliceCount, sliceMap, selectedTopping, onSliceTap]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const total = customers.length || CUSTOMERS_PER_LEVEL;
    const reached = phase === "won" ? total : Math.min(total, Math.max(1, customerIndex + 1));
    const didWin = isPizzeriaWin(successCount, total, mistakes, diffConfig.maxMistakes);
    return buildLeoPizzeriaMetrics({
      score,
      didWin,
      difficulty,
      customersTotal: total,
      customersReached: reached,
      successfulCustomers: successCount,
      failedAttempts,
      mistakes,
      bestStreak,
      durationSec: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
    });
  }, [
    phase,
    score,
    difficulty,
    customers.length,
    customerIndex,
    successCount,
    failedAttempts,
    mistakes,
    bestStreak,
    diffConfig.maxMistakes,
  ]);

  useEffect(() => {
    if (phase !== "won" && phase !== "lost") return;
    if (!productionMode || !onSessionEndRef.current || sessionEndFiredRef.current || !endMetrics) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(endMetrics);
  }, [phase, productionMode, endMetrics]);

  const feedbackBarClass = [
    shop.feedbackBar,
    checkState === "ok"
      ? shop.feedbackOk
      : checkState === "bad"
        ? shop.feedbackBad
        : shop.feedbackNeutral,
  ].join(" ");

  return (
    <div
      className={`${frame.shell} ${frame.shellWarm} ${productionMode ? styles.shellEmbedded : ""}`}
      dir="rtl"
    >
      <header className={frame.header}>
        <Link href={backHref} className={frame.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={frame.hud}>
            <span className={`${frame.hudChip} ${frame.hudScore}`}>⭐ {score}</span>
            <span className={`${frame.hudChip} ${frame.hudProgress}`}>
              🍕 {customerIndex + 1}/{CUSTOMERS_PER_LEVEL}
            </span>
            <span className={`${frame.hudChip} ${frame.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${frame.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft} שנ׳
            </span>
            <span className={frame.hudChip}>{diffConfig.label}</span>
          </div>
        ) : (
          <div className={frame.hud}>
            <span className={frame.hudChip}>{productionMode ? "🍕" : "🍕 אבטיפוס"}</span>
          </div>
        )}
        {showFullscreenButton && onFullscreenToggle ? (
          <EducationalGameHudFullscreenButton
            className={frame.hudChip}
            isFullscreen={isFullscreen}
            onToggle={onFullscreenToggle}
          />
        ) : null}
      </header>

      {!productionMode && phase === "intro" ? (
        <div className={frame.screenCenter}>
          <p className={frame.introHero}>🍕🦁</p>
          <h1 className={frame.introTitle}>הפיצרייה של ליאו</h1>
          <p className={frame.introText}>
            לקוחות נכנסים לפיצרייה - הכינו להם בדיוק את הפיצה שהם הזמינו!
          </p>
          <div className={frame.difficultyRow}>
            {(/** @type {DifficultyId[]} */ (["easy", "medium", "hard"])).map((id) => (
              <button
                key={id}
                type="button"
                className={`${frame.diffBtn} ${difficulty === id ? frame.diffBtnSelected : ""}`}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].label} · {DIFFICULTIES[id].hint}
              </button>
            ))}
          </div>
          <EducationalDifficultyGradeHint
            className={`${frame.introText} opacity-70`}
            style={{ fontSize: "0.72rem" }}
          />
          <p className={frame.introText} style={{ fontSize: "0.78rem" }}>
            {CUSTOMERS_PER_LEVEL} לקוחות · טיימר לכל לקוח · גרירה או לחיצה על תוספות
          </p>
          <button type="button" className={frame.startBtn} onClick={startGame}>
            פתיחת משמרת 🍕
          </button>
        </div>
      ) : null}

      {phase === "play" && customer ? (
        <div
          className={shop.shopMain}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <p className={shop.counterLabel}>
            🍕 דלפק הכנה · לקוח {customerIndex + 1} מתוך {customers.length}
          </p>

          <div className={shop.shopGrid} data-educational-workplace-grid="">
            <aside className={shop.customerCol}>
              <div key={customerKey} className={shop.customerCard}>
                <span className={shop.customerAvatar} aria-hidden>
                  {customer.customerEmoji}
                </span>
                <div className={shop.customerSpeechWrap}>
                  <div className={shop.missionRow}>
                    <p className={shop.customerName}>{customer.customerName}</p>
                    <EducationalGameInstructionReplay
                      text={instructionText}
                      onReplay={replayInstruction}
                    />
                  </div>
                  <p className={shop.missionText}>
                    {customer.greeting}
                    <span className={shop.missionTicket}>🧾 {customer.ticketLine}</span>
                  </p>
                </div>
              </div>
            </aside>

            <section className={shop.workCol}>
              <div className={styles.pizzaFrame}>
                <svg
                  viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                  className={styles.pizzaSvg}
                  aria-label="פיצה לעבודה"
                >
                  <circle cx={CX} cy={CY} r={R + 6} fill="#92400e" />
                  <circle cx={CX} cy={CY} r={R} fill="#dc2626" opacity="0.92" />
                  <circle cx={CX} cy={CY} r={R * 0.92} fill="#fbbf24" />
                  {pizzaSlices}
                  <circle cx={CX} cy={CY} r={R * 0.1} fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
                </svg>
              </div>
            </section>

            <aside className={shop.sideCol}>
              <div className={`${frame.panel} ${shop.toolsPanel}`}>
                <p className={shop.toolsTitle}>🧺 מדף תוספות</p>
                <div className={shop.toolsGrid}>
                  {TOPPINGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`${shop.toolBtn} ${selectedTopping === t.id ? shop.toolBtnActive : ""}`}
                      onClick={() => {
                        setSelectedTopping((cur) => (cur === t.id ? null : t.id));
                        setCheckState("idle");
                        setFeedback("");
                      }}
                      onPointerDown={(e) => onToppingPointerDown(e, t.id)}
                      aria-label={t.name}
                      aria-pressed={selectedTopping === t.id}
                    >
                      <span className={shop.toolEmoji}>{t.emoji}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {feedback || checkState !== "idle" ? (
                <div className={feedbackBarClass}>
                  <p className={shop.feedbackText}>{feedback}</p>
                </div>
              ) : null}
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button
                  type="button"
                  className={shop.primaryBtn}
                  disabled={checkState === "ok"}
                  onClick={servePizza}
                >
                  הגש פיצה 🍕
                </button>
                <button type="button" className={shop.secondaryBtn} onClick={resetPizza}>
                  נקה פיצה
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🎉 סיימתם את המשמרת!</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>
              ✅ לקוחות: {successCount}/{customers.length}
            </p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={() => setPhase("intro")}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "lost" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>🍕 סיום משמרת</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>✅ פיצות נכונות: {successCount}</p>
            <p className={frame.endStat}>❌ טעויות: {mistakes}</p>
            <div className={frame.endActions}>
              <button type="button" className={frame.startBtn} onClick={startGame}>
                משחק חדש
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dragGhost ? (
        <div
          data-drag-ghost="true"
          style={{
            position: "fixed",
            left: dragGhost.x,
            top: dragGhost.y,
            transform: "translate(-50%, -50%)",
            fontSize: "3.2rem",
            pointerEvents: "none",
            zIndex: 9999,
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
          }}
          aria-hidden
        >
          {toppingById(dragGhost.toppingId)?.emoji}
        </div>
      ) : null}
    </div>
  );
}
