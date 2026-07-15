import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTIES,
  DENOM_STYLES,
  PRODUCTS,
  SCORE,
  customerRequestText,
  formatShekel,
  generateCustomers,
  isSupermarketWin,
  LEO_CASHIER_IMAGE,
} from "./leo-supermarket-data.js";
import { buildLeoSupermarketMetrics } from "./leo-supermarket-metrics.js";
import GroceryItemVisual from "./GroceryItemVisual.jsx";
import styles from "./LeoSupermarketPrototype.module.css";

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

export default function LeoSupermarketGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'|'lost'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [customers, setCustomers] = useState(/** @type {import('./leo-supermarket-data.js').SupermarketCustomer[]} */ ([]));
  const [customerIndex, setCustomerIndex] = useState(0);
  const [step, setStep] = useState(/** @type {'product'|'change'} */ ("product"));
  const [selectedProductIds, setSelectedProductIds] = useState(/** @type {string[]} */ ([]));
  const [changeDenoms, setChangeDenoms] = useState(/** @type {number[]} */ ([]));
  const [changeAttempts, setChangeAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [correctCustomers, setCorrectCustomers] = useState(0);
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

  const diffConfig = DIFFICULTIES[difficulty];
  const customer = customers[customerIndex] || null;

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const showZoneFeedback = useCallback((zone, text, type) => {
    setZoneFeedback((prev) => ({ ...prev, [zone]: { text, type } }));
    const existing = feedbackTimersRef.current[zone];
    if (existing) clearTimeout(existing);
    feedbackTimersRef.current[zone] = setTimeout(() => {
      setZoneFeedback((prev) => ({ ...prev, [zone]: { text: "", type: "" } }));
    }, 2200);
  }, []);

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

  const finishGame = useCallback((won) => {
    setPhase(won ? "won" : "lost");
  }, []);

  const completeCustomerSuccess = useCallback(
    (wasFast) => {
      const newCorrect = correctCustomersRef.current + 1;
      correctCustomersRef.current = newCorrect;
      setCorrectCustomers(newCorrect);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      addScore(SCORE.customerComplete);
      if (wasFast) addScore(SCORE.fastService);

      const idx = customerIndexRef.current;
      const list = customersRef.current;
      const diff = DIFFICULTIES[difficulty];

      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        if (idx + 1 >= list.length) {
          finishGame(isSupermarketWin(difficulty, newCorrect, mistakesRef.current));
          return;
        }
        timeoutHandledForCustomerRef.current = -1;
        setCustomerIndex(idx + 1);
        setCustomerEnterKey((k) => k + 1);
        resetCustomerState();
        setTimeLeft(diff.timeLimitSec);
      }, 900);
    },
    [addScore, difficulty, finishGame, resetCustomerState],
  );

  const handleTimeout = useCallback(() => {
    if (phaseRef.current !== "play") return;

    const nextMistakes = mistakesRef.current + 1;
    mistakesRef.current = nextMistakes;
    setMistakes(nextMistakes);
    setTimeoutMistakes((t) => t + 1);
    setStreak(0);
    addScore(SCORE.timeout);
    showZoneFeedback("global", "הלקוח חיכה יותר מדי", "bad");

    const idx = customerIndexRef.current;
    const list = customersRef.current;
    const diff = DIFFICULTIES[difficulty];

    if (nextMistakes > diff.maxMistakes) {
      finishGame(false);
      return;
    }

    if (idx + 1 >= list.length) {
      finishGame(isSupermarketWin(difficulty, correctCustomersRef.current, nextMistakes));
      return;
    }

    timeoutHandledForCustomerRef.current = -1;
    setCustomerIndex(idx + 1);
    setCustomerEnterKey((k) => k + 1);
    resetCustomerState();
    setTimeLeft(diff.timeLimitSec);
  }, [addScore, difficulty, finishGame, resetCustomerState, showZoneFeedback]);

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
        showZoneFeedback("customer", "זה לא המוצר שהלקוח ביקש", "bad");
        if (nextMistakes > DIFFICULTIES[difficulty].maxMistakes) finishGame(false);
        return;
      }

      addScore(SCORE.correctProduct);
      const nextSelected = [...selectedProductIdsRef.current, productId];
      setSelectedProductIds(nextSelected);
      showZoneFeedback("customer", "מוצר נכון!", "ok");

      if (nextSelected.length >= cust.requestedIds.length) {
        setStep("change");
        setChangeAttempts(0);
      }
    },
    [addScore, difficulty, finishGame, showZoneFeedback],
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

    const sum = changeDenomsRef.current.reduce((s, v) => s + v, 0);
    const isFirstTry = changeAttemptsRef.current === 0;

    if (sum === cust.correctChange) {
      addScore(SCORE.correctChange);
      if (isFirstTry) addScore(SCORE.firstTryBonus);
      showZoneFeedback("register", "מעולה! החזרת עודף נכון", "ok");
      const wasFast = timeLeftRef.current > Math.floor(diffConfig.timeLimitSec * 0.35);
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
    showZoneFeedback("register", "כמעט! נסו לחשב שוב את העודף", "bad");

    if (nextMistakes > DIFFICULTIES[difficulty].maxMistakes) {
      finishGame(false);
    }
  }, [addScore, completeCustomerSuccess, diffConfig.timeLimitSec, difficulty, finishGame, showZoneFeedback]);

  const startGame = useCallback(() => {
    const list = generateCustomers(difficulty);
    setCustomers(list);
    customersRef.current = list;
    setCustomerIndex(0);
    setPhase("play");
    setScore(0);
    setMistakes(0);
    setCorrectCustomers(0);
    setWrongProducts(0);
    setWrongChange(0);
    setTimeoutMistakes(0);
    setStreak(0);
    setBestStreak(0);
    correctCustomersRef.current = 0;
    mistakesRef.current = 0;
    timeoutHandledForCustomerRef.current = -1;
    setStartTime(Date.now());
    resetCustomerState();
    setTimeLeft(diffConfig.timeLimitSec);
    setCustomerEnterKey((k) => k + 1);
  }, [difficulty, diffConfig.timeLimitSec, resetCustomerState]);

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
  }, []);

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
  }, []);

  const finishDrag = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag?.active || e.pointerId !== drag.pointerId || drag.handled) return;

      drag.active = false;
      drag.handled = true;

      if (drag.moved) {
        const zone = findDropZoneAtPoint(e.clientX, e.clientY);
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
    [tryAddProduct, addChangeDenom],
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

  const changeSum = useMemo(() => changeDenoms.reduce((s, v) => s + v, 0), [changeDenoms]);

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
    return buildLeoSupermarketMetrics({
      score,
      didWin: phase === "won",
      difficulty,
      customersServed: customers.length,
      correctCustomers,
      wrongProducts,
      wrongChange,
      timeoutMistakes,
      mistakes: wrongProducts + wrongChange + timeoutMistakes,
      bestStreak,
      durationSec: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
    });
  }, [
    phase,
    score,
    difficulty,
    customers.length,
    correctCustomers,
    wrongProducts,
    wrongChange,
    timeoutMistakes,
    bestStreak,
    startTime,
  ]);

  const accuracyPct = endMetrics ? Math.round(endMetrics.accuracy * 100) : 0;

  return (
    <div className={styles.shell} dir="rtl">
      <span className={`${styles.deco} ${styles.sign}`} aria-hidden>
        🏪
      </span>
      <span className={`${styles.deco} ${styles.cartDeco}`} aria-hidden>
        🛒
      </span>

      <header className={styles.header}>
        <Link href={backHref} className={styles.backBtn}>
          ← חזרה
        </Link>
        {phase === "play" ? (
          <div className={styles.hud}>
            <span className={`${styles.hudChip} ${styles.hudTime} ${timeLeft <= 8 ? styles.hudTimeWarn : ""}`}>
              ⏱ {timeLeft}s
            </span>
            <span className={styles.hudChip}>{DIFFICULTIES[difficulty].label}</span>
            <span className={styles.hudChip}>
              👤 {customerIndex + 1}/{customers.length}
            </span>
            <span className={`${styles.hudChip} ${styles.hudBad}`}>
              ❌ {mistakes}/{diffConfig.maxMistakes}
            </span>
            <span className={`${styles.hudChip} ${styles.hudScore}`}>⭐ {score}</span>
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
          <p className={styles.introText} style={{ fontSize: "0.78rem" }}>
            {diffConfig.customerCount} לקוחות · לפחות {diffConfig.minCorrectToWin} נכונים · עד{" "}
            {diffConfig.maxMistakes} טעויות · {diffConfig.timeLimitSec} שניות ללקוח
          </p>
          <button type="button" className={styles.startBtn} onClick={startGame}>
            התחל משחק
          </button>
        </div>
      ) : null}

      {phase === "play" && customer ? (
        <div className={styles.playArea}>
          <div key={customerEnterKey} className={`${styles.customerRow} ${styles.customerRowEnter}`}>
            <span className={styles.customerAvatar} aria-hidden>
              {customer.avatar}
            </span>
            <div className={styles.customerMain}>
              <p className={styles.speechBubble}>{customerRequestText(customer)}</p>
              <ZoneFeedbackLine fb={zoneFeedback.customer} />
            </div>
            <div className={styles.leoCashier}>
              <img
                src={LEO_CASHIER_IMAGE}
                alt="ליאו"
                className={styles.leoAvatar}
                draggable={false}
              />
            </div>
          </div>

          <section className={styles.shelfSection}>
            <p className={styles.shelfTitle}>🗄️ מדף המוצרים</p>
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
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    aria-label={product.name}
                  >
                    {!isDragging ? <GroceryItemVisual product={product} variant="shelf" /> : null}
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
              <div className={styles.checkoutFooter}>
                <div className={styles.checkoutFooterStack}>
                  <span className={styles.checkoutAmountLine}>
                    סכום הקנייה: {step === "change" ? formatShekel(customer.total) : "-"}
                  </span>
                  <span className={styles.checkoutAmountLinePaid}>
                    הלקוח שילם: {step === "change" ? formatShekel(customer.paid) : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div
              data-drop-zone="change"
              className={`${styles.changeZone} ${step === "change" ? styles.changeZoneActive : ""}`}
            >
              <p className={styles.zoneTitle}>💵 העודף שאני מחזיר</p>
              <div className={styles.zoneItems}>
                {changeDenoms.length === 0 ? (
                  <span className={styles.zoneEmpty}>{step === "change" ? "בחרו מטבעות" : "-"}</span>
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
                <p className={styles.checkoutAmountChange}>סכום שהחזרת: {formatShekel(changeSum)}</p>
              </div>
            </div>
          </div>

          <section className={styles.moneySection}>
            <p className={styles.moneyTitle}>💰 מגירת הקופה</p>
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
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                  >
                    {style?.label || `${value}₪`}
                  </button>
                );
              })}
            </div>
          </section>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.clearBtn}
              disabled={step !== "change" || changeDenoms.length === 0}
              onClick={clearChange}
            >
              נקה עודף
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              disabled={step !== "change"}
              onClick={submitChange}
            >
              מסור עודף ✓
            </button>
          </div>

          <ZoneFeedbackLine fb={zoneFeedback.global} />
        </div>
      ) : null}

      {phase === "won" || phase === "lost" ? (
        <div className={styles.screenCenter}>
          <p className={styles.introHero}>{phase === "won" ? "🎉" : "💪"}</p>
          <h2 className={styles.introTitle}>
            {phase === "won"
              ? "כל הכבוד! עזרתם לליאו לשרת את הלקוחות"
              : "לא נורא, ננסה שוב להחזיר עודף נכון"}
          </h2>
          <div className={styles.endStats}>
            <p>⭐ ניקוד: {score}</p>
            <p>
              👤 לקוחות שטופלו נכון: {correctCustomers}/{customers.length}
            </p>
            <p>❌ טעויות: {wrongProducts + wrongChange + timeoutMistakes}</p>
            <p>🎯 דיוק: {accuracyPct}%</p>
            <p>📊 רמה: {DIFFICULTIES[difficulty].label}</p>
            <p>🔥 רצף הכי טוב: {bestStreak}</p>
          </div>
          <button type="button" className={styles.startBtn} onClick={() => setPhase("intro")}>
            משחק חדש
          </button>
        </div>
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
