import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sharedStyles as frame } from "../../prototypes/dev/learning/shared/LearningPrototypeFrame.jsx";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import FractionDisplay, { COMPARE_LABEL_HE } from "./FractionDisplay.jsx";
import {
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES,
  SCORE,
  isPizzeriaWin,
  pickCustomersForRun,
  pizzeriaSolutionPayload,
  toppingById,
  TOPPINGS,
  validateCustomerOrder,
  validatePizzeriaAnswer,
  wedgeCenter,
  wedgePath,
} from "./leo-pizzeria-data.js";
import { buildLeoPizzeriaMetrics } from "./leo-pizzeria-metrics.js";
import styles from "./LeoPizzeriaGame.module.css";

/** @typedef {import('./leo-pizzeria-data.js').DifficultyId} DifficultyId */
/** @typedef {import('./leo-pizzeria-data.js').PizzeriaTask} PizzeriaCustomerOrder */

const MAX_ATTEMPTS = 3;
const SVG_SIZE = 200;
const CX = 100;
const CY = 100;
const R = 88;

/**
 * @param {{
 *   sliceCount: number
 *   sliceMap?: Record<number, string>
 *   locked?: boolean
 *   interactive?: boolean
 *   onSliceTap?: (i: number) => void
 *   ariaLabel?: string
 *   className?: string
 * }} props
 */
function PizzaSvg({
  sliceCount,
  sliceMap = {},
  locked = false,
  interactive = true,
  onSliceTap,
  ariaLabel = "פיצה",
  className = "",
}) {
  const slices = Array.from({ length: sliceCount }, (_, i) => {
    const toppingId = sliceMap[i];
    const topping = toppingId && toppingId !== "__prefilled__" ? toppingById(toppingId) : null;
    const center = wedgeCenter(i, sliceCount, R, CX, CY);
    const path = wedgePath(i, sliceCount, R, CX, CY);
    const filled = Boolean(toppingId);
    const isPrefill = toppingId === "__prefilled__";
    return (
      <g key={i} data-pizza-slice={interactive && !locked ? i : undefined}>
        <path
          d={path}
          fill={isPrefill ? "#fde68a" : filled ? "#fef3c7" : "#fff7ed"}
          stroke="#b45309"
          strokeWidth="2"
          style={{ cursor: interactive && !locked && !isPrefill ? "pointer" : "default" }}
          onClick={() => {
            if (!interactive || locked || isPrefill) return;
            onSliceTap?.(i);
          }}
        />
        {topping ? (
          <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize="22">
            {topping.emoji}
          </text>
        ) : null}
        {isPrefill ? (
          <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" fontSize="14">
            ✓
          </text>
        ) : null}
      </g>
    );
  });

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className={`${styles.pizzaSvg} ${className}`}
      aria-label={ariaLabel}
    >
      <circle cx={CX} cy={CY} r={R + 6} fill="#92400e" />
      <circle cx={CX} cy={CY} r={R} fill="#dc2626" opacity="0.92" />
      <circle cx={CX} cy={CY} r={R * 0.92} fill="#fbbf24" />
      {slices}
      <circle cx={CX} cy={CY} r={R * 0.1} fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
    </svg>
  );
}

/** Prefill map for a static fraction pizza */
function fractionSliceMap(n, d, toppingId) {
  /** @type {Record<number, string>} */
  const map = {};
  for (let i = 0; i < n; i += 1) map[i] = toppingId;
  return map;
}

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
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'|'reveal'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [customerKey, setCustomerKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptsOnTask, setAttemptsOnTask] = useState(0);
  const [answerNumerator, setAnswerNumerator] = useState(0);
  const [compareRelation, setCompareRelation] = useState(/** @type {'greater'|'less'|'equal'|null} */ (null));
  const [controlsLocked, setControlsLocked] = useState(false);

  const dragRef = useRef(/** @type {{ toppingId: string } | null} */ (null));
  const [dragGhost, setDragGhost] = useState(
    /** @type {{ toppingId: string, x: number, y: number } | null} */ (null),
  );

  const diffConfig = DIFFICULTIES[difficulty];
  const customer = customers[customerIndex] ?? null;
  const sliceCount = customer?.sliceCount ?? 4;
  const variant = customer?.variant ?? "build_fraction";
  const isIdentify = variant === "identify_fraction";
  const isCompare = variant === "compare_fractions";
  const isBuild = variant === "build_fraction";
  const isEquivalent = variant === "equivalent_fraction";
  const isComplete = variant === "complete_whole";
  const isCombine = variant === "combine_visual_fractions";
  const usesWorkPizza = !isCompare;
  const usesToppings = usesWorkPizza && !isIdentify;

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

  const buildPrefillMap = useCallback((cust) => {
    /** @type {Record<number, string>} */
    const map = {};
    if (!cust) return map;
    if (cust.variant === "identify_fraction" && cust.spec?.requirements) {
      let idx = 0;
      for (const [toppingId, count] of Object.entries(cust.spec.requirements)) {
        for (let i = 0; i < count; i += 1) {
          map[idx] = toppingId;
          idx += 1;
        }
      }
    }
    if (cust.variant === "complete_whole" && cust.spec?.prefilledSlices) {
      for (let i = 0; i < cust.spec.prefilledSlices; i += 1) {
        map[i] = "__prefilled__";
      }
    }
    return map;
  }, []);

  const resetPizza = useCallback((cust = null) => {
    setSliceMap(buildPrefillMap(cust));
    setSelectedTopping(cust?.toppingId || null);
    setCheckState("idle");
    setFeedback("");
    setAttemptsOnTask(0);
    setAnswerNumerator(0);
    setCompareRelation(null);
    setControlsLocked(false);
  }, [buildPrefillMap]);

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
    resetPizza(list[0]);
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
      resetPizza(customers[nextIndex]);
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

  const revealSolution = useCallback(
    (cust) => {
      setControlsLocked(true);
      setCheckState("reveal");
      const payload = pizzeriaSolutionPayload(cust);

      if (payload.type === "identify") {
        setAnswerNumerator(payload.numerator);
        setFeedback("פתרון: השבר הוא");
      } else if (payload.type === "compare") {
        setCompareRelation(/** @type {'greater'|'less'|'equal'} */ (payload.relation));
        setFeedback(`פתרון: ${COMPARE_LABEL_HE[payload.relation] || COMPARE_LABEL_HE.equal}.`);
      } else if (payload.type === "equivalent" && payload.target) {
        /** @type {Record<number, string>} */
        const map = {};
        for (let i = 0; i < payload.target.n; i += 1) map[i] = payload.toppingId;
        setSliceMap(map);
        setFeedback("פתרון: שני השברים שווים.");
      } else if (payload.type === "complete") {
        /** @type {Record<number, string>} */
        const map = {};
        for (let i = 0; i < payload.given; i += 1) map[i] = "__prefilled__";
        for (let i = 0; i < payload.missing; i += 1) {
          map[payload.given + i] = payload.toppingId;
        }
        setSliceMap(map);
        setFeedback("פתרון: השלמנו את הפרוסות החסרות וקיבלנו פיצה שלמה.");
      } else if (payload.type === "combine" && payload.result) {
        /** @type {Record<number, string>} */
        const map = {};
        for (let i = 0; i < payload.result.n; i += 1) map[i] = payload.toppingId;
        setSliceMap(map);
        setFeedback("פתרון: סכום השברים הוא");
      } else if (payload.type === "build") {
        /** @type {Record<number, string>} */
        const map = {};
        for (let i = 0; i < payload.numerator; i += 1) map[i] = payload.toppingId;
        setSliceMap(map);
        setFeedback("פתרון: כך מסמנים את השבר.");
      }

      // Revealed solution is not a success
      window.setTimeout(() => advanceAfterCustomer(customerIndex), 2400);
    },
    [advanceAfterCustomer, customerIndex],
  );

  const handleTimeout = useCallback(() => {
    if (phase !== "play" || !customer || controlsLocked) return;

    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
    addScore(SCORE.timeout);
    setCheckState("bad");
    const timeoutText = "הזמן נגמר. עוברים ללקוח הבא.";
    setFeedback(timeoutText);
    onTimeUp();
    playFeedback(timeoutText);

    if (nextMistakes >= diffConfig.maxMistakes) {
      window.setTimeout(() => endRun("lost"), 1200);
      return;
    }

    advanceAfterCustomer(customerIndex);
  }, [
    phase,
    customer,
    controlsLocked,
    addScore,
    diffConfig.maxMistakes,
    endRun,
    advanceAfterCustomer,
    customerIndex,
    onTimeUp,
    playFeedback,
  ]);

  useEffect(() => {
    if (phase !== "play" || !customer || controlsLocked) return undefined;
    if (timeLeft > 0) return undefined;
    if (timeoutHandledForCustomerRef.current === customerIndex) return undefined;
    timeoutHandledForCustomerRef.current = customerIndex;
    handleTimeout();
    return undefined;
  }, [phase, customer, timeLeft, customerIndex, handleTimeout, controlsLocked]);

  useEffect(() => {
    if (phase !== "play" || !customer || controlsLocked) return undefined;
    const t = window.setInterval(() => {
      setTimeLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, customer, customerIndex, controlsLocked]);

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
    if (controlsLocked) return;
    setSliceMap((prev) => {
      if (prev[sliceIndex] === "__prefilled__") return prev;
      return { ...prev, [sliceIndex]: toppingId };
    });
    setCheckState("idle");
    setFeedback("");
  }, [controlsLocked]);

  const onSliceTap = useCallback(
    (sliceIndex) => {
      if (controlsLocked || checkState === "ok" || checkState === "reveal") return;
      if (!selectedTopping) {
        setSliceMap((prev) => {
          if (prev[sliceIndex] === "__prefilled__") return prev;
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
    [selectedTopping, applyToppingToSlice, checkState, controlsLocked],
  );

  const onToppingPointerDown = useCallback((e, toppingId) => {
    if (controlsLocked) return;
    if (e.button !== 0) return;
    dragRef.current = { toppingId };
    setSelectedTopping(toppingId);
    setDragGhost({ toppingId, x: e.clientX, y: e.clientY });
    onDragLift();
  }, [onDragLift, controlsLocked]);

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
      if (!controlsLocked) {
        const sliceIndex = findSliceAtPoint(e.clientX, e.clientY);
        if (sliceIndex != null) {
          onDropOk();
          applyToppingToSlice(sliceIndex, dragRef.current.toppingId);
        }
      }
      dragRef.current = null;
      setDragGhost(null);
    },
    [applyToppingToSlice, findSliceAtPoint, onDropOk, controlsLocked],
  );

  const servePizza = useCallback(() => {
    if (!customer || checkState === "ok" || checkState === "reveal" || controlsLocked) return;

    let result;
    if (isIdentify) {
      result = validatePizzeriaAnswer(customer, {
        numerator: answerNumerator,
        denominator: customer.sliceCount,
      });
    } else if (isCompare) {
      result = validatePizzeriaAnswer(customer, { relation: compareRelation || "" });
    } else {
      /** @type {Record<number, string>} */
      const workMap = {};
      for (const [k, v] of Object.entries(sliceMap)) {
        if (v && v !== "__prefilled__") workMap[Number(k)] = v;
      }
      result = validateCustomerOrder(customer, workMap);
    }

    if (result.ok) {
      setCheckState("ok");
      setControlsLocked(true);
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

    const nextAttempt = attemptsOnTask + 1;
    setAttemptsOnTask(nextAttempt);
    setCheckState("bad");
    setFeedback(result.message);
    onWrong();
    playFeedback(result.message);
    setFailedAttempts((f) => f + 1);
    setCurrentStreak(0);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    mistakesRef.current = nextMistakes;
    if (nextMistakes >= diffConfig.maxMistakes) {
      window.setTimeout(() => endRun("lost"), 1800);
      return;
    }
    if (nextAttempt >= MAX_ATTEMPTS) {
      revealSolution(customer);
    }
  }, [
    customer,
    sliceMap,
    checkState,
    controlsLocked,
    customerIndex,
    advanceAfterCustomer,
    addScore,
    mistakes,
    attemptsOnTask,
    isIdentify,
    isCompare,
    answerNumerator,
    compareRelation,
    diffConfig.maxMistakes,
    endRun,
    onCorrect,
    onWrong,
    onStreak,
    playFeedback,
    revealSolution,
  ]);

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
      : checkState === "bad" || checkState === "reveal"
        ? shop.feedbackBad
        : shop.feedbackNeutral,
  ].join(" ");

  const solutionPayload = checkState === "reveal" && customer ? pizzeriaSolutionPayload(customer) : null;

  /** Mission panel with FractionDisplay where needed */
  function renderMission() {
    if (!customer) return null;
    return (
      <div className={styles.missionBlock}>
        <p className={shop.missionText}>{customer.greeting}</p>
        {(isBuild || isEquivalent) && customer.sourceFraction ? (
          <div className={styles.missionFraction}>
            <FractionDisplay
              numerator={customer.sourceFraction.n}
              denominator={customer.sourceFraction.d}
              size="lg"
            />
          </div>
        ) : null}
        {isCombine && customer.combineA && customer.combineB ? (
          <div className={styles.combineRow}>
            <FractionDisplay numerator={customer.combineA.n} denominator={customer.combineA.d} size="lg" />
            <span className={styles.combineOp} aria-hidden>+</span>
            <FractionDisplay numerator={customer.combineB.n} denominator={customer.combineB.d} size="lg" />
            <span className={styles.combineOp} aria-hidden>=</span>
            <span className={styles.combineAsk}>?</span>
          </div>
        ) : null}
        {isComplete && customer.sourceFraction ? (
          <div className={styles.missionFraction}>
            <FractionDisplay
              numerator={customer.sourceFraction.n}
              denominator={customer.sourceFraction.d}
              size="md"
            />
          </div>
        ) : null}
        <p className={styles.ticketHint}>{customer.ticketLine}</p>
      </div>
    );
  }

  function renderWorkArea() {
    if (!customer) return null;

    if (isCompare && customer.compareA && customer.compareB) {
      const highlight =
        checkState === "reveal" && compareRelation
          ? compareRelation
          : null;
      return (
        <div className={styles.compareRow}>
          <div
            className={`${styles.compareCard} ${
              highlight === "greater" || highlight === "equal" ? styles.compareHighlight : ""
            }`}
          >
            <div className={styles.pizzaFrameSm}>
              <PizzaSvg
                sliceCount={customer.compareA.d}
                sliceMap={fractionSliceMap(customer.compareA.n, customer.compareA.d, customer.compareA.toppingId)}
                interactive={false}
                locked
                ariaLabel="פיצה ראשונה"
              />
            </div>
            <FractionDisplay numerator={customer.compareA.n} denominator={customer.compareA.d} size="md" />
            <span className={styles.compareCaption}>פיצה ראשונה</span>
          </div>
          <div
            className={`${styles.compareCard} ${
              highlight === "less" || highlight === "equal" ? styles.compareHighlight : ""
            }`}
          >
            <div className={styles.pizzaFrameSm}>
              <PizzaSvg
                sliceCount={customer.compareB.d}
                sliceMap={fractionSliceMap(customer.compareB.n, customer.compareB.d, customer.compareB.toppingId)}
                interactive={false}
                locked
                ariaLabel="פיצה שנייה"
              />
            </div>
            <FractionDisplay numerator={customer.compareB.n} denominator={customer.compareB.d} size="md" />
            <span className={styles.compareCaption}>פיצה שנייה</span>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.pizzaFrame}>
        <PizzaSvg
          sliceCount={sliceCount}
          sliceMap={sliceMap}
          locked={controlsLocked || isIdentify}
          interactive={usesToppings}
          onSliceTap={onSliceTap}
          ariaLabel="הפיצה שעליה מסמנים"
        />
      </div>
    );
  }

  function renderTools() {
    if (!customer) return null;

    if (isIdentify) {
      return (
        <div className={`${frame.panel} ${shop.toolsPanel}`}>
          <p className={shop.toolsTitle}>כמה פרוסות מסומנות?</p>
          <div className={styles.identifyFraction}>
            <div className={styles.identifyStepper}>
              <button
                type="button"
                className={shop.stepperBtn}
                disabled={controlsLocked}
                onClick={() => setAnswerNumerator((v) => Math.min(sliceCount, v + 1))}
              >
                +
              </button>
              <FractionDisplay numerator={answerNumerator} denominator={sliceCount} size="lg" />
              <button
                type="button"
                className={shop.stepperBtn}
                disabled={controlsLocked}
                onClick={() => setAnswerNumerator((v) => Math.max(0, v - 1))}
              >
                −
              </button>
            </div>
            <p className={styles.identifyHint}>בחרו את מספר הפרוסות המסומנות.</p>
          </div>
        </div>
      );
    }

    if (isCompare) {
      return (
        <div className={`${frame.panel} ${shop.toolsPanel}`}>
          <p className={shop.toolsTitle}>בחרו את התשובה הנכונה.</p>
          <div className={shop.actionRow} style={{ flexDirection: "column", gap: 8 }}>
            {(["greater", "less", "equal"]).map((rel) => (
              <button
                key={rel}
                type="button"
                className={`${shop.secondaryBtn} ${compareRelation === rel ? shop.toolBtnActive : ""}`}
                disabled={controlsLocked}
                onClick={() => setCompareRelation(/** @type {'greater'|'less'|'equal'} */ (rel))}
              >
                {COMPARE_LABEL_HE[rel]}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (isEquivalent && customer.sourceFraction && customer.targetFraction) {
      return (
        <div className={`${frame.panel} ${shop.toolsPanel}`}>
          <p className={shop.toolsTitle}>סמנו על הפיצה את החלק המתאים.</p>
          {solutionPayload?.type === "equivalent" ? (
            <div className={styles.eqSolution}>
              <FractionDisplay
                numerator={customer.sourceFraction.n}
                denominator={customer.sourceFraction.d}
                size="md"
              />
              <span className={styles.combineOp}>=</span>
              <FractionDisplay
                numerator={customer.targetFraction.n}
                denominator={customer.targetFraction.d}
                size="md"
              />
            </div>
          ) : (
            <p className={styles.identifyHint}>סמנו על הפיצה את החלק המתאים.</p>
          )}
          <div className={shop.toolsGrid}>
            {TOPPINGS.filter((t) => t.id === customer.toppingId).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${shop.toolBtn} ${selectedTopping === t.id ? shop.toolBtnActive : ""}`}
                disabled={controlsLocked}
                onClick={() => setSelectedTopping(t.id)}
                onPointerDown={(e) => onToppingPointerDown(e, t.id)}
              >
                <span className={shop.toolEmoji}>{t.emoji}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`${frame.panel} ${shop.toolsPanel}`}>
        <p className={shop.toolsTitle}>בחרו תוספת</p>
        <div className={shop.toolsGrid}>
          {TOPPINGS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${shop.toolBtn} ${selectedTopping === t.id ? shop.toolBtnActive : ""}`}
              disabled={controlsLocked}
              onClick={() => {
                if (controlsLocked) return;
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
    );
  }

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
            <span className={frame.hudChip}>{productionMode ? "🍕" : "🍕"}</span>
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
            הכינו פיצות ופתרו משימות בשברים.
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
            התחלת המשחק
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
                  {renderMission()}
                </div>
              </div>
            </aside>

            <section className={shop.workCol}>{renderWorkArea()}</section>

            <aside className={shop.sideCol}>
              {renderTools()}
              {feedback || checkState !== "idle" ? (
                <div className={feedbackBarClass}>
                  <p className={shop.feedbackText}>{feedback}</p>
                  {solutionPayload?.type === "equivalent" && customer.sourceFraction && customer.targetFraction ? (
                    <div className={styles.eqSolution}>
                      <FractionDisplay
                        numerator={customer.sourceFraction.n}
                        denominator={customer.sourceFraction.d}
                        size="sm"
                      />
                      <span>=</span>
                      <FractionDisplay
                        numerator={customer.targetFraction.n}
                        denominator={customer.targetFraction.d}
                        size="sm"
                      />
                    </div>
                  ) : null}
                  {solutionPayload?.type === "identify" ? (
                    <div className={styles.eqSolution}>
                      <FractionDisplay
                        numerator={solutionPayload.numerator}
                        denominator={solutionPayload.denominator}
                        size="md"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </aside>

            <div className={shop.bottomBar}>
              <div className={shop.actionRow}>
                <button
                  type="button"
                  className={shop.primaryBtn}
                  disabled={controlsLocked || checkState === "ok" || checkState === "reveal"}
                  onClick={servePizza}
                >
                  בדיקת הפיצה
                </button>
                <button
                  type="button"
                  className={shop.secondaryBtn}
                  disabled={controlsLocked}
                  onClick={() => resetPizza(customer)}
                >
                  ניקוי הפיצה
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" && !productionMode ? (
        <div className={frame.screenCenter}>
          <div className={frame.endCard}>
            <h2 className={frame.endTitle}>כל הכבוד! סיימתם את הפיצרייה.</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>
              משימות שנפתרו: {successCount}/{customers.length}
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
            <h2 className={frame.endTitle}>כל הכבוד! סיימתם את הפיצרייה.</h2>
            <p className={frame.endStat}>⭐ ניקוד: {score}</p>
            <p className={frame.endStat}>משימות שנפתרו: {successCount}</p>
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
