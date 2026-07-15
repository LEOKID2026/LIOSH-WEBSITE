import { useCallback, useMemo, useRef, useState } from "react";
import LearningPrototypeFrame, { sharedStyles as s } from "../shared/LearningPrototypeFrame.jsx";
import shop from "../../../../educational-games/shared/educational-game-shop-layout.module.css";
import { SCORE } from "../shared/learning-prototype-constants.js";
import {
  demoCustomersForDifficulty,
  DIFFICULTY_HINTS,
  PROTOTYPE_CUSTOMER_COUNT,
  toppingById,
  TOPPINGS,
  validateCustomerOrder,
  wedgeCenter,
  wedgePath,
} from "./leo-pizzeria-data.js";
import styles from "./LeoPizzeriaGame.module.css";

/** @typedef {import('../shared/learning-prototype-constants.js').DifficultyId} DifficultyId */
/** @typedef {import('./leo-pizzeria-data.js').PizzeriaCustomerOrder} PizzeriaCustomerOrder */

const SVG_SIZE = 200;
const CX = 100;
const CY = 100;
const R = 88;

/** @param {{ backHref?: string }} props */
export default function LeoPizzeriaGame({ backHref = "/dev/learning-game-prototypes" }) {
  const [phase, setPhase] = useState(/** @type {'intro'|'play'|'won'} */ ("intro"));
  const [difficulty, setDifficulty] = useState(/** @type {DifficultyId} */ ("easy"));
  const [customers, setCustomers] = useState(/** @type {PizzeriaCustomerOrder[]} */ ([]));
  const [customerIndex, setCustomerIndex] = useState(0);
  const [selectedTopping, setSelectedTopping] = useState(/** @type {string | null} */ (null));
  /** @type {[Record<number, string>, import('react').Dispatch<import('react').SetStateAction<Record<number, string>>>]} */
  const [sliceMap, setSliceMap] = useState({});
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [servedCount, setServedCount] = useState(0);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [checkState, setCheckState] = useState(/** @type {'idle'|'ok'|'bad'} */ ("idle"));
  const [feedback, setFeedback] = useState("");
  const [customerKey, setCustomerKey] = useState(0);

  const dragRef = useRef(/** @type {{ toppingId: string } | null} */ (null));
  const [dragGhost, setDragGhost] = useState(/** @type {{ toppingId: string, x: number, y: number } | null} */ (null));

  const customer = customers[customerIndex] ?? null;
  const sliceCount = customer?.sliceCount ?? 4;

  const resetPizza = useCallback(() => {
    setSliceMap({});
    setSelectedTopping(null);
    setCheckState("idle");
    setFeedback("");
  }, []);

  const startShift = useCallback(() => {
    setCustomers(demoCustomersForDifficulty(difficulty));
    setCustomerIndex(0);
    setScore(0);
    setMistakes(0);
    setServedCount(0);
    setAttemptsTotal(0);
    setCustomerKey(0);
    resetPizza();
    setPhase("play");
  }, [difficulty, resetPizza]);

  const nextCustomer = useCallback(() => {
    const next = customerIndex + 1;
    if (next >= customers.length) {
      setPhase("won");
      return;
    }
    setCustomerIndex(next);
    setCustomerKey((k) => k + 1);
    resetPizza();
  }, [customerIndex, customers.length, resetPizza]);

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
        setFeedback("הסרנו תוספת מהחלק - בחרו תוספת חדשה");
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
  }, []);

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
        applyToppingToSlice(sliceIndex, dragRef.current.toppingId);
      }
      dragRef.current = null;
      setDragGhost(null);
    },
    [applyToppingToSlice, findSliceAtPoint],
  );

  const servePizza = useCallback(() => {
    if (!customer || checkState === "ok") return;
    setAttemptsTotal((a) => a + 1);
    const result = validateCustomerOrder(customer, sliceMap);
    if (result.ok) {
      setCheckState("ok");
      setFeedback(result.message);
      setServedCount((c) => c + 1);
      setScore((sc) => sc + SCORE.correct);
      window.setTimeout(nextCustomer, 1600);
      return;
    }
    setCheckState("bad");
    setMistakes((m) => m + 1);
    setFeedback(result.message);
  }, [customer, sliceMap, checkState, nextCustomer]);

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

  return (
    <LearningPrototypeFrame
      backHref={backHref}
      theme="warm"
      phase={phase}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      title="הפיצרייה של ליאו"
      introHero="🍕🦁"
      introText="לקוחות נכנסים לפיצרייה - הכינו להם בדיוק את הפיצה שהם הזמינו!"
      introHint={`${DIFFICULTY_HINTS[difficulty]} · ${PROTOTYPE_CUSTOMER_COUNT} לקוחות לדוגמה`}
      startLabel="פתיחת משמרת 🍕"
      onStart={startShift}
      score={score}
      mistakes={mistakes}
      taskIndex={customerIndex}
      tasksTotal={customers.length || PROTOTYPE_CUSTOMER_COUNT}
      successCount={servedCount}
      attemptsTotal={attemptsTotal}
      onPlayAgain={() => setPhase("intro")}
    >
      {customer ? (
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
                  <p className={shop.customerName}>{customer.customerName}</p>
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
              <div className={`${s.panel} ${shop.toolsPanel}`}>
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
                <div
                  className={`${shop.feedbackBar} ${
                    checkState === "ok"
                      ? shop.feedbackOk
                      : checkState === "bad"
                        ? shop.feedbackBad
                        : shop.feedbackNeutral
                  }`}
                >
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
    </LearningPrototypeFrame>
  );
}
