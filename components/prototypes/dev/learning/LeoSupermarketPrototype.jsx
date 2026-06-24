import { useMemo, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const BUDGET = 48;

const PRODUCTS = [
  { id: "milk", emoji: "🥛", name: "חלב", price: 6 },
  { id: "bread", emoji: "🍞", name: "לחם", price: 5 },
  { id: "apple", emoji: "🍎", name: "תפוח", price: 3 },
  { id: "egg", emoji: "🥚", name: "ביצים", price: 8 },
  { id: "cheese", emoji: "🧀", name: "גבינה", price: 12 },
  { id: "banana", emoji: "🍌", name: "בננה", price: 4 },
  { id: "juice", emoji: "🧃", name: "מיץ", price: 7 },
  { id: "cookie", emoji: "🍪", name: "עוגיות", price: 9 },
  { id: "tomato", emoji: "🍅", name: "עגביה", price: 4 },
  { id: "fish", emoji: "🐟", name: "דג", price: 15 },
  { id: "rice", emoji: "🍚", name: "אורז", price: 10 },
  { id: "water", emoji: "💧", name: "מים", price: 2 },
];

/** @returns {typeof PRODUCTS} */
function pickShoppingList() {
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export default function LeoSupermarketPrototype() {
  const [phase, setPhase] = useState("intro");
  const [list, setList] = useState(() => pickShoppingList());
  const [cart, setCart] = useState(/** @type {string[]} */ ([]));
  const [result, setResult] = useState("");

  const cartTotal = useMemo(
    () => cart.reduce((sum, id) => sum + (PRODUCTS.find((p) => p.id === id)?.price ?? 0), 0),
    [cart],
  );

  const reset = () => {
    setList(pickShoppingList());
    setCart([]);
    setResult("");
    setPhase("intro");
  };

  const start = () => {
    setCart([]);
    setResult("");
    setPhase("shop");
  };

  const toggleCart = (id) => {
    if (phase !== "shop") return;
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setResult("");
  };

  const checkout = () => {
    const needed = new Set(list.map((p) => p.id));
    const bought = new Set(cart);
    const missing = list.filter((p) => !bought.has(p.id));
    const extra = cart.filter((id) => !needed.has(id));
    const withinBudget = cartTotal <= BUDGET;

    if (!missing.length && !extra.length && withinBudget) {
      setResult("מעולה! קניתם בדיוק לפי הרשימה ונשארתם בתקציב 🎉");
    } else if (!withinBudget) {
      setResult(`חרגתם מהתקציב (${cartTotal}₪ מתוך ${BUDGET}₪). נסו שוב`);
    } else if (missing.length) {
      setResult(`חסרים: ${missing.map((p) => p.name).join(", ")}`);
    } else if (extra.length) {
      setResult("קניתם מוצרים שלא היו ברשימה — בדקו שוב");
    }
    setPhase("done");
  };

  return (
    <DevPrototypeShell
      title="הסופר של ליאו"
      subtitle="אבטיפוס · רשימה + תקציב + עגלה"
      headerExtra={
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85"
        >
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">🛒</p>
            <p className="max-w-sm text-sm font-semibold text-sky-200">
              קנו לפי רשימת הקניות ואל תחרגו מהתקציב!
            </p>
            <button
              type="button"
              onClick={start}
              className="min-h-[48px] rounded-xl bg-emerald-500 px-8 py-2.5 text-base font-bold text-white shadow-lg"
            >
              התחל קניות
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border-2 border-yellow-400/70 bg-slate-950/80 p-3">
              <p className="text-xs font-bold text-amber-200">📋 רשימת קניות</p>
              <ul className="mt-1 flex flex-wrap gap-2 text-sm font-semibold">
                {list.map((p) => (
                  <li key={p.id} className="rounded-lg bg-slate-800 px-2 py-1">
                    {p.emoji} {p.name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-white/60">
                תקציב: <span className="font-bold text-emerald-300">{BUDGET}₪</span>
                {" · "}
                בעגלה: <span className="font-bold text-amber-200">{cartTotal}₪</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {PRODUCTS.map((p) => {
                const inCart = cart.includes(p.id);
                const onList = list.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={phase === "done"}
                    onClick={() => toggleCart(p.id)}
                    className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 p-2 transition active:scale-95 ${
                      inCart
                        ? "border-emerald-400 bg-emerald-500/25"
                        : "border-slate-600 bg-slate-800/90 hover:bg-slate-700/80"
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <span className="text-[10px] font-bold sm:text-xs">{p.name}</span>
                    <span className="text-[10px] text-amber-200">{p.price}₪</span>
                    {onList ? <span className="text-[9px] text-sky-300">ברשימה</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border-2 border-blue-400/60 bg-slate-950/70 p-3">
              <p className="text-xs font-bold text-blue-200">🛍️ עגלה</p>
              <p className="mt-1 min-h-[28px] text-sm text-white/85">
                {cart.length
                  ? cart
                      .map((id) => PRODUCTS.find((p) => p.id === id))
                      .filter(Boolean)
                      .map((p) => `${p.emoji}${p.name}`)
                      .join(" · ")
                  : "ריקה — לחצו על מוצרים"}
              </p>
            </div>

            {phase === "shop" ? (
              <button
                type="button"
                onClick={checkout}
                className="min-h-[48px] rounded-xl bg-sky-500 px-6 py-2.5 text-base font-bold text-white shadow-lg"
              >
                לקופה 💳
              </button>
            ) : null}

            {result ? (
              <p
                className={`text-center text-sm font-bold ${result.includes("מעולה") ? "text-emerald-300" : "text-amber-200"}`}
              >
                {result}
              </p>
            ) : null}

            {phase === "done" ? (
              <button
                type="button"
                onClick={start}
                className="min-h-[44px] rounded-xl border-2 border-white/30 px-6 py-2 text-sm font-bold"
              >
                משחק חדש
              </button>
            ) : null}
          </>
        )}
      </div>
    </DevPrototypeShell>
  );
}
