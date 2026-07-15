import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES,
  DENOM_STYLES,
  PRODUCTS,
  SCORE,
  formatShekel,
  generateCustomers,
  getExpectedChange,
  customerRequestText,
  isChangeAmountCorrect,
  isSupermarketWin,
  sumChangeDenoms,
} from "./leo-supermarket-data.js";
import { buildLeoSupermarketMetrics } from "./leo-supermarket-metrics.js";
import GroceryItemVisual from "./GroceryItemVisual.jsx";
import EducationalDifficultyGradeHint from "../EducationalDifficultyGradeHint.jsx";
import EducationalGameHudFullscreenButton from "../EducationalGameHudFullscreenButton.jsx";
import EducationalGameInstructionReplay from "../shared/EducationalGameInstructionReplay.jsx";
import { useEducationalEngineAudio } from "../../../hooks/educational-games/useEducationalGameAudio.js";
import shop from "../shared/educational-game-shop-layout.module.css";
import styles from "./LeoSupermarketGame.module.css";

/** @typedef {import('./leo-supermarket-data.js').DifficultyId} DifficultyId */
/** @typedef {'customer'|'register'|'global'} FeedbackZone */

const DRAG_THRESHOLD_PX = 10;

const EMPTY_ZONE_FEEDBACK = { customer: { text: "", type: "" }, register: { text: "", type: "" }, global: { text: "", type: "" } };

/** @param {number} x @param {number} y */
function findDropZoneAtPoint(x, y) {
  const ghost = document.querySelector('[data-drag-ghost="true"]');
  if (ghost) ghost.style.visibility = "hidden";
  const hit = document.elementFromPoint(x, y);
  if (ghost) ghost.style.visibility = "visible";

  const zone = hit?.closest("[data-drop-zone]")?.getAttribute("data-drop-zone");
  if (zone === "register" || zone === "change") return zone;
  return null;
}

/**
 * @param {{ value: number, count?: number, onRemove?: () => void, dragging?: boolean }} props
 */
function MoneyChip({ value, count = 1, onRemove, dragging = false }) {
  const style = DENOM_STYLES[value] || { label: `${value}₪`, color: "#e2e8f0", text: "#334155" };
  if (dragging) return null;
  return (
    <button
      type="button"
      className={styles.changeChip}
      style={{ background: style.color, color: style.text }}
      onClick={onRemove}
      aria-label={`הסר ${style.label} מהעודף`}
    >
      {style.label}
      {count > 1 ? <span className={styles.changeChipCount}> × {count}</span> : null}
    </button>
  );
}

/** @param {{ customer: import('./leo-supermarket-data.js').SupermarketCustomer }} props */
function CustomerRequestBubble({ customer }) {
  const items = customer.items;
  if (items.length === 1) {
    const item = items[0];
    return (
      <p className={styles.speechBubble}>
        {item.name}{" "}
        <span className={styles.speechRequestIcon} aria-hidden>
          {item.requestIcon}
        </span>
      </p>
    );
  }

  const last = items[items.length - 1];
  const rest = items.slice(0, -1);

  return (
    <p className={styles.speechBubble}>
      {rest.map((item, index) => (
        <span key={item.id}>
          {index > 0 ? ", " : ""}
          {item.name}{" "}
          <span className={styles.speechRequestIcon} aria-hidden>
            {item.requestIcon}
          </span>
        </span>
      ))}{" "}
      ו-{last.name}{" "}
      <span className={styles.speechRequestIcon} aria-hidden>
        {last.requestIcon}
      </span>
    </p>
  );
}

/** @param {{ text: string, type: 'ok'|'bad'|'' }} fb */
function ZoneFeedbackLine({ fb }) {
  const visible = Boolean(fb.text);
  return (
    <p
      className={`${styles.zoneFeedback} ${visible ? (fb.type === "ok" ? styles.feedbackOk : styles.feedbackBad) : styles.zoneFeedbackEmpty}`}
      role={visible ? "status" : undefined}
      aria-hidden={!visible}
    >
      {fb.text || "\u00a0"}
    </p>
  );
}

export default function LeoSupermarketGame({
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

  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ (
    productionMode && autoStart ? "play" : "intro",
  ));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ (
    productionMode && autoStart ? /** @type {DifficultyId} */ (initialDifficulty) : "easy",
  ));
  const [customers, setCustomers] = useState(/** @type {import('./leo-supermarket-data.js').SupermarketCustomer[]} */ ([]));
  const [customerIndex, setCustomerIndex] = useState(0);
  const [step, setStep] = useState(/** @type {'product'|'change'} */ ("product"));
  const [selectedProductIds, setSelectedProductIds] = useState(/** @type {string[]} */ ([]));
  const [changeDenoms, setChangeDenoms] = useState(/** @type {number[]} */ ([]));
  const [changeAttempts, setChangeAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [correctCustomers, setCorrectCustomers] = useState(0);
  const [customersCompleted, setCustomersCompleted] = useState(0);
  const [wrongProducts, setWrongProducts] = useState(0);
  const [wrongChange, setWrongChange] = useState(0);
  const [timeoutMistakes, setTimeoutMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [customerEnterKey, setCustomerEnterKey] = useState(0);
  const [zoneFeedback, setZoneFeedback] = useState(EMPTY_ZONE_FEEDBACK);
  const [startTime, setStartTime] = useState(0);

  const mistakesRef = useRef(mistakes);
  const correctCustomersRef = useRef(correctCustomers);
  const customersCompletedRef = useRef(customersCompleted);
  const timeoutHandledForCustomerRef = useRef(-1);

  const [dragGhost, setDragGhost] = useState(
    /** @type {{ kind: 'product'|'money', label: string, x: number, y: number }|null} */ (null),
  );
  const [draggingKey, setDraggingKey] = useState(/** @type {string|null} */ (null));

  const dragRef = useRef(
    /** @type {{ kind: 'product'|'money', payload: string|number, pointerId: number, moved: boolean, active: boolean, startX: number, startY: number, handled: boolean }|null} */ (null),
  );
  const phaseRef = useRef(phase);
  const stepRef = useRef(step);
  const customerIndexRef = useRef(customerIndex);
  const customersRef = useRef(customers);
  const selectedProductIdsRef = useRef(selectedProductIds);
  const changeDenomsRef = useRef(changeDenoms);
  const changeAttemptsRef = useRef(changeAttempts);
  const timeLeftRef = useRef(timeLeft);
  const feedbackTimersRef = useRef(/** @type {Partial<Record<FeedbackZone, ReturnType<typeof setTimeout>>>} */ ({}));
  const advanceTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));

  phaseRef.current = phase;
  stepRef.current = step;
  customerIndexRef.current = customerIndex;
  customersRef.current = customers;
  selectedProductIdsRef.current = selectedProductIds;
  changeDenomsRef.current = changeDenoms;
  changeAttemptsRef.current = changeAttempts;
  timeLeftRef.current = timeLeft;
  mistakesRef.current = mistakes;
  correctCustomersRef.current = correctCustomers;
  customersCompletedRef.current = customersCompleted;

  const diffConfig = DIFFICULTIES[difficulty];
  const customer = customers[customerIndex] || null;
  const instructionText =
    phase === "play" && customer ? customerRequestText(customer) : "";

  const {
    onCorrect,
    onWrong,
    onStreak,
    onTimeUp,
    onDragLift,
    onDropOk,
    onSmallSuccess,
    playFeedback,
    replayInstruction,
    audio,
  } = useEducationalEngineAudio({
    instructionText,
    autoPlayInstruction: productionMode && phase === "play" && Boolean(customer),
  });

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const showZoneFeedback = useCallback((zone, text, type) => {
    setZoneFeedback((prev) => ({ ...prev, [zone]: { text, type } }));
    if (text) playFeedback(text);
    const existing = feedbackTimersRef.current[zone];
    if (existing) clearTimeout(existing);
    feedbackTimersRef.current[zone] = setTimeout(() => {
      setZoneFeedback((prev) => ({ ...prev, [zone]: { text: "", type: "" } }));
    }, 2200);
  }, [playFeedback]);

  const clearAllZoneFeedback = useCallback(() => {
    setZoneFeedback(EMPTY_ZONE_FEEDBACK);
    Object.values(feedbackTimersRef.current).forEach((t) => {
      if (t) clearTimeout(t);
    });
    feedbackTimersRef.current = {};
  }, []);

  const resetCustomerState = useCallback(() => {
    setStep("product");
    setSelectedProductIds([]);
    setChangeDenoms([]);
    setChangeAttempts(0);
    clearAllZoneFeedback();
  }, [clearAllZoneFeedback]);

  const finishGame = useCallback(
    (won) => {
      setPhase(won ? "won" : "lost");
    },
    [],
  );

  const advanceAfterCustomer = useCallback(
    (idx, list) => {
      const handled = customersCompletedRef.current + 1;
      customersCompletedRef.current = handled;
      setCustomersCompleted(handled);

      const diff = DIFFICULTIES[difficulty];
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

      if (idx + 1 >= list.length) {
        finishGame(
          isSupermarketWin(handled, diff.customerCount, mistakesRef.current, diff.maxMistakes),
        );
        return;
      }

      advanceTimerRef.current = setTimeout(() => {
        timeoutHandledForCustomerRef.current = -1;
        const nextIdx = idx + 1;
        onSmallSuccess();
        setCustomerIndex(nextIdx);
        setCustomerEnterKey((k) => k + 1);
        resetCustomerState();
        const nextCustomer = list[nextIdx];
        setTimeLeft(nextCustomer?.timeLimitSec ?? diff.timeLimitsByBand[0]);
      }, 900);
    },
    [difficulty, finishGame, resetCustomerState, onSmallSuccess],
  );

  const completeCustomerSuccess = useCallback(
    (wasFast) => {
      const newCorrect = correctCustomersRef.current + 1;
      correctCustomersRef.current = newCorrect;
      setCorrectCustomers(newCorrect);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        if (next === 3 || next === 5) onStreak();
        return next;
      });
      addScore(SCORE.customerComplete);
      if (wasFast) addScore(SCORE.fastService);

      const idx = customerIndexRef.current;
      const list = customersRef.current;
      advanceAfterCustomer(idx, list);
    },
    [addScore, advanceAfterCustomer, onStreak],
  );

  const handleTimeout = useCallback(() => {
    if (phaseRef.current !== "play") return;

    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);
    setTimeoutMistakes((t) => t + 1);
    setStreak(0);
    addScore(SCORE.timeout);
    onTimeUp();
    showZoneFeedback("global", "הלקוח חיכה יותר מדי", "bad");

    const idx = customerIndexRef.current;
    const list = customersRef.current;
    const diff = DIFFICULTIES[difficulty];

    if (nextMistakes > diff.maxMistakes) {
      finishGame(false);
      return;
    }

    advanceAfterCustomer(idx, list);
  }, [addScore, difficulty, finishGame, advanceAfterCustomer, showZoneFeedback, onTimeUp]);

  const tryAddProduct = useCallback(
    (productId) => {
      if (phaseRef.current !== "play" || stepRef.current !== "product") return;
      const cust = customersRef.current[customerIndexRef.current];
      if (!cust) return;

      if (selectedProductIdsRef.current.includes(productId)) return;

      if (!cust.requestedIds.includes(productId)) {
        const nextMistakes = mistakesRef.current + 1;
        mistakesRef.current = nextMistakes;
        setMistakes(nextMistakes);
        setWrongProducts((w) => w + 1);
        setStreak(0);
        addScore(SCORE.wrongProduct);
        onWrong();
        showZoneFeedback("customer", "זה לא המוצר שהלקוח ביקש", "bad");
        if (nextMistakes > DIFFICULTIES[difficulty].maxMistakes) finishGame(false);
        return;
      }

      addScore(SCORE.correctProduct);
      audio.playSfx("sfx-register");
      const nextSelected = [...selectedProductIdsRef.current, productId];
      setSelectedProductIds(nextSelected);
      showZoneFeedback("customer", "מוצר נכון!", "ok");

      if (nextSelected.length >= cust.requestedIds.length) {
        setStep("change");
        setChangeAttempts(0);
      }
    },
    [addScore, difficulty, finishGame, showZoneFeedback, onWrong, audio],
  );

  const addChangeDenom = useCallback((value) => {
    if (phaseRef.current !== "play" || stepRef.current !== "change") return;
    setChangeDenoms((prev) => [...prev, value]);
  }, []);

  const removeChangeAt = useCallback((index) => {
    setChangeDenoms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearChange = useCallback(() => {
    setChangeDenoms([]);
  }, []);

  const submitChange = useCallback(() => {
    if (phaseRef.current !== "play" || stepRef.current !== "change") return;
    const cust = customersRef.current[customerIndexRef.current];
    if (!cust) return;

    const isFirstTry = changeAttemptsRef.current === 0;

    if (isChangeAmountCorrect(cust, changeDenomsRef.current)) {
      addScore(SCORE.correctChange);
      if (isFirstTry) addScore(SCORE.firstTryBonus);
      onCorrect();
      audio.playSfx("sfx-coin");
      showZoneFeedback("register", "מעולה! החזרת עודף נכון", "ok");
      const wasFast = timeLeftRef.current > Math.floor(cust.timeLimitSec * 0.35);
      completeCustomerSuccess(wasFast);
      return;
    }

    setChangeAttempts((a) => a + 1);
    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);
    setWrongChange((w) => w + 1);
    setStreak(0);
    addScore(SCORE.wrongChange);
    onWrong();
    showZoneFeedback("register", "כמעט! נסו לחשב שוב את העודף", "bad");

    if (nextMistakes > DIFFICULTIES[difficulty].maxMistakes) {
      finishGame(false);
    }
  }, [addScore, completeCustomerSuccess, difficulty, finishGame, showZoneFeedback, onCorrect, onWrong, audio]);

  const startGame = useCallback(() => {
    const list = generateCustomers(difficulty);
    setCustomers(list);
    customersRef.current = list;
    setCustomerIndex(0);
    setPhase("play");
    setScore(0);
    setMistakes(0);
    setCorrectCustomers(0);
    setCustomersCompleted(0);
    setWrongProducts(0);
    setWrongChange(0);
    setTimeoutMistakes(0);
    setStreak(0);
    setBestStreak(0);
    correctCustomersRef.current = 0;
    customersCompletedRef.current = 0;
    mistakesRef.current = 0;
    timeoutHandledForCustomerRef.current = -1;
    sessionEndFiredRef.current = false;
    setStartTime(Date.now());
    resetCustomerState();
    setTimeLeft(list[0]?.timeLimitSec ?? diffConfig.timeLimitsByBand[0]);
    setCustomerEnterKey((k) => k + 1);
  }, [difficulty, diffConfig.timeLimitsByBand, resetCustomerState]);

  useEffect(() => {
    if (!autoStart || phase !== "play") return;
    if (customers.length > 0) return;
    startGame();
  }, [autoStart, phase, customers.length, startGame]);

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
    const t = setInterval(() => {
      setTimeLeft((sec) => Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, customer, customerIndex]);

  useEffect(() => {
    return () => {
      Object.values(feedbackTimersRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const onProductPointerDown = useCallback((e, productId) => {
    if (phaseRef.current !== "play" || stepRef.current !== "product") return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    dragRef.current = {
      kind: "product",
      payload: productId,
      pointerId: e.pointerId,
      moved: false,
      active: true,
      handled: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    setDraggingKey(`p-${productId}`);
    setDragGhost({ kind: "product", label: `${product.shelfIcon} ${product.name}`, x: e.clientX, y: e.clientY });
    onDragLift();
  }, [onDragLift]);

  const onMoneyPointerDown = useCallback((e, value) => {
    if (phaseRef.current !== "play" || stepRef.current !== "change") return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const style = DENOM_STYLES[value];
    dragRef.current = {
      kind: "money",
      payload: value,
      pointerId: e.pointerId,
      moved: false,
      active: true,
      handled: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    setDraggingKey(`m-${value}`);
    setDragGhost({ kind: "money", label: style?.label || `${value}₪`, x: e.clientX, y: e.clientY });
    onDragLift();
  }, [onDragLift]);

  const finishDrag = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag?.active || e.pointerId !== drag.pointerId || drag.handled) return;

      drag.active = false;
      drag.handled = true;

      if (drag.moved) {
        const zone = findDropZoneAtPoint(e.clientX, e.clientY);
        if (
          (drag.kind === "product" && zone === "register") ||
          (drag.kind === "money" && zone === "change")
        ) {
          onDropOk();
        }
        if (drag.kind === "product" && zone === "register") {
          tryAddProduct(/** @type {string} */ (drag.payload));
        } else if (drag.kind === "money" && zone === "change") {
          addChangeDenom(/** @type {number} */ (drag.payload));
        }
      } else if (drag.kind === "product") {
        tryAddProduct(/** @type {string} */ (drag.payload));
      } else if (drag.kind === "money") {
        addChangeDenom(/** @type {number} */ (drag.payload));
      }

      dragRef.current = null;
      setDraggingKey(null);
      setDragGhost(null);
    },
    [tryAddProduct, addChangeDenom, onDropOk],
  );

  useEffect(() => {
    if (!draggingKey) return undefined;

    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag?.active || e.pointerId !== drag.pointerId) return;
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
      e.preventDefault();
      setDragGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : null));
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);

    const prevTouchAction = document.body.style.touchAction;
    document.body.style.touchAction = "none";

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finishDrag);
      document.removeEventListener("pointercancel", finishDrag);
      document.body.style.touchAction = prevTouchAction;
    };
  }, [draggingKey, finishDrag]);

  const changeSum = useMemo(() => sumChangeDenoms(changeDenoms), [changeDenoms]);
  const expectedChangeForCustomer = customer ? getExpectedChange(customer) : 0;

  const groupedChangeDenoms = useMemo(() => {
    /** @type {Map<number, number[]>} */
    const map = new Map();
    changeDenoms.forEach((value, index) => {
      const list = map.get(value) || [];
      list.push(index);
      map.set(value, list);
    });
    return Array.from(map.entries()).map(([value, indices]) => ({ value, count: indices.length, lastIndex: indices[indices.length - 1] }));
  }, [changeDenoms]);

  const endMetrics = useMemo(() => {
    if (phase !== "won" && phase !== "lost") return null;
    const total = customers.length || CUSTOMERS_PER_LEVEL;
    const reached = Math.min(total, customerIndex + 1);
    const completed = customersCompleted;
    const didWin = isSupermarketWin(
      completed,
      total,
      wrongProducts + wrongChange + timeoutMistakes,
      diffConfig.maxMistakes,
    );
    return buildLeoSupermarketMetrics({
      score,
      didWin,
      difficulty,
      customersTotal: total,
      customersReached: reached,
      customersCompleted: completed,
      correctCustomers,
      wrongProducts,
      wrongChange,
      timeoutMistakes,
      bestStreak,
      durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    });
  }, [
    phase,
    score,
    difficulty,
    customers.length,
    customerIndex,
    customersCompleted,
    correctCustomers,
    wrongProducts,
    wrongChange,
    timeoutMistakes,
    bestStreak,
    startTime,
    diffConfig.maxMistakes,
  ]);

  useEffect(() => {
    if (phase !== "won" && phase !== "lost") return;
    if (!productionMode || !onSessionEndRef.current || sessionEndFiredRef.current || !endMetrics) return;
    sessionEndFiredRef.current = true;
    onSessionEndRef.current(endMetrics);
  }, [phase, productionMode, endMetrics]);

  const accuracyPct = endMetrics ? Math.round(endMetrics.accuracy * 100) : 0;

  return (
    <div className={`${styles.shell} ${productionMode ? styles.shellEmbedded : ""}`} dir="rtl">
      <span className={`${styles.deco} ${styles.sign}`} aria-hidden>
        🏪
      </span>
      <span className={`${styles.deco} ${styles.cartDeco}`} aria-hidden>
        🛒
      </span>

      <header className={`${styles.header} ${phase === "play" ? styles.headerPlayCompact : ""}`}>
        <Link href={backHref} className={styles.hudChip}>
          חזרה
        </Link>
        {phase === "play" ? (
          <div className={`${styles.hud} ${styles.hudPlaySingle}`}>
            <span className={`${styles.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft} שנ׳
            </span>
            <span className={styles.hudChip}>
              👤 {customerIndex + 1}/{CUSTOMERS_PER_LEVEL}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${styles.hudChip} ${styles.hudScore}`}>⭐ {score}</span>
          </div>
        ) : (
          <div className={styles.hud}>
            <span className={styles.hudChip}>{productionMode ? "🏪" : "🧪 אבטיפוס"}</span>
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

      {phase === "intro" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>🏪🛒</p>
          <h1 className={styles.introTitle}>המכולת של ליאו</h1>
          <p className={styles.introText}>
            עזרו לליאו המוכר - בחרו מוצר, חשבו עודף והחזירו כסף נכון ללקוח
          </p>
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
            {CUSTOMERS_PER_LEVEL} לקוחות · עד {diffConfig.maxMistakes} פסילות · הקושי עולה בהדרגה
          </p>
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && customer ? (
        <div className={shop.shopMain}>
          <p className={shop.counterLabel}>
            🏪 המכולת · לקוח {customerIndex + 1}/{CUSTOMERS_PER_LEVEL}
          </p>

          <div className={styles.supermarketFlow} data-educational-workplace-grid="">
            <div
              key={customerEnterKey}
              className={`${styles.customerRow} ${styles.customerRowEnter}`}
            >
              <span className={styles.customerAvatar} aria-hidden>
                {customer.avatar}
              </span>
              <div className={styles.customerMain}>
                <div className={shop.missionRow}>
                  <CustomerRequestBubble customer={customer} />
                  <EducationalGameInstructionReplay
                    text={instructionText}
                    onReplay={replayInstruction}
                  />
                </div>
                <ZoneFeedbackLine fb={zoneFeedback.customer} />
              </div>
            </div>

            <section className={styles.shelfSection}>
              <p className={styles.shelfTitle}>🗄️ מדף המוצרים - בחרו מה שהלקוח ביקש</p>
              <div className={styles.shelfGrid}>
                {PRODUCTS.map((product) => {
                  const onRegister = selectedProductIds.includes(product.id);
                  const isDragging = draggingKey === `p-${product.id}`;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={step !== "product" || onRegister}
                      className={`${styles.productBtn} ${onRegister ? styles.productBtnOnRegister : ""}`}
                      onPointerDown={(e) => onProductPointerDown(e, product.id)}
                      aria-label={product.name}
                    >
                      {!isDragging ? (
                        <GroceryItemVisual product={product} variant="shelf" nameOnShelf={false} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={styles.checkoutRow}>
              <div
                data-drop-zone="register"
                className={`${styles.registerZone} ${step === "product" ? styles.registerZoneActive : ""}`}
                role="region"
                aria-label="קופה"
              >
                <p className={styles.zoneTitle}>🧾 הקופה</p>
                <div className={styles.zoneItems}>
                  {selectedProductIds.length === 0 ? (
                    <span className={styles.zoneEmpty}>בחרו את המוצר שהלקוח ביקש</span>
                  ) : (
                    selectedProductIds.map((id) => {
                      const p = PRODUCTS.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className={styles.registerProductWrap}>
                          <GroceryItemVisual product={p} variant="register-chip" showPrice={false} />
                        </div>
                      );
                    })
                  )}
                </div>
                <ZoneFeedbackLine fb={zoneFeedback.register} />
              </div>

              <div
                data-drop-zone="change"
                className={`${styles.changeZone} ${step === "change" ? styles.changeZoneActive : ""}`}
              >
                <p className={styles.zoneTitle}>💵 העודף שאני מחזיר</p>
                <div className={styles.zoneItems}>
                  {changeDenoms.length === 0 ? (
                    <span className={styles.zoneEmpty}>
                      {step === "change"
                        ? expectedChangeForCustomer === 0
                          ? "אין עודף - לחצו מסור עודף"
                          : "בחרו מטבעות"
                        : "-"}
                    </span>
                  ) : (
                    groupedChangeDenoms.map(({ value, count, lastIndex }) => (
                      <MoneyChip
                        key={`${value}-${count}-${lastIndex}`}
                        value={value}
                        count={count}
                        dragging={draggingKey === `m-${value}`}
                        onRemove={() => removeChangeAt(lastIndex)}
                      />
                    ))
                  )}
                </div>
                <ZoneFeedbackLine fb={{ text: "", type: "" }} />
                <div className={styles.checkoutFooter}>
                  <div className={styles.checkoutFooterStack}>
                    <div className={styles.checkoutTotalsPair}>
                      <span className={styles.checkoutAmountLine}>
                        <span className={styles.checkoutAmountLabel}>סכום הקנייה:</span>
                        <span className={styles.checkoutAmountValue}>
                          {step === "change" ? formatShekel(customer.total) : "-"}
                        </span>
                      </span>
                      <span className={styles.checkoutAmountLinePaid}>
                        <span className={styles.checkoutAmountLabel}>הלקוח שילם:</span>
                        <span className={styles.checkoutAmountValue}>
                          {step === "change" ? formatShekel(customer.paid) : "-"}
                        </span>
                      </span>
                    </div>
                    <p className={styles.checkoutAmountChange}>
                      <span className={styles.checkoutAmountLabel}>סכום שהחזרת:</span>
                      <span className={styles.checkoutAmountValue}>{formatShekel(changeSum)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className={styles.moneySection}>
              <p className={styles.moneyTitle}>💰 מגירת הקופה - בחרו מטבעות לעודף</p>
              <div className={styles.moneyGrid}>
                {diffConfig.denoms.map((value) => {
                  const style = DENOM_STYLES[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={step !== "change"}
                      className={styles.moneyBtn}
                      style={{ background: style?.color, color: style?.text }}
                      onPointerDown={(e) => onMoneyPointerDown(e, value)}
                    >
                      {style?.label || `${value}₪`}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className={styles.supermarketBottom}>
              <ZoneFeedbackLine fb={zoneFeedback.global} />
              <div className={shop.actionRow}>
                <button
                  type="button"
                  className={shop.secondaryBtn}
                  disabled={step !== "change" || changeDenoms.length === 0}
                  onClick={clearChange}
                >
                  נקה עודף
                </button>
                <button
                  type="button"
                  className={shop.primaryBtn}
                  disabled={step !== "change"}
                  onClick={submitChange}
                >
                  מסור עודף ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "won" || phase === "lost" ? (
        !productionMode ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>{phase === "won" ? "🎉" : "💪"}</p>
          <h2 className={styles.introTitle}>
            {endMetrics?.completedAllCustomers
              ? `כל הכבוד! שירתת ${endMetrics.correctCustomers} לקוחות ועזרת לליאו במכולת`
              : `כל הכבוד! שירתת ${endMetrics?.correctCustomers ?? 0} לקוחות ועזרת לליאו במכולת`}
          </h2>
          <div className={styles.endStats}>
            <p>⭐ ניקוד: {score}</p>
            <p>
              👤 לקוחות נכונים: {correctCustomers}/{CUSTOMERS_PER_LEVEL}
            </p>
            <p>🛒 לקוחות שטופלו: {customersCompleted}/{CUSTOMERS_PER_LEVEL}</p>
            <p>❌ פסילות: {wrongProducts + wrongChange + timeoutMistakes}</p>
            <p>🎯 דיוק: {accuracyPct}%</p>
            <p>📊 רמה: {DIFFICULTIES[difficulty].label}</p>
            <p>🔥 רצף הכי טוב: {bestStreak}</p>
          </div>
          <button type="button" className={styles.startBtn} onClick={() => setPhase("intro")}>
            משחק חדש
          </button>
        </div>
        ) : null
      ) : null}

      {dragGhost ? (
        <div
          data-drag-ghost="true"
          className={styles.dragGhost}
          style={{ left: dragGhost.x, top: dragGhost.y }}
        >
          {dragGhost.label}
        </div>
      ) : null}
    </div>
  );
}
