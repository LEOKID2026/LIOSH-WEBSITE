import { useMemo, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const MATERIALS = [
  { id: "magnet", emoji: "🧲", name: "מגנט" },
  { id: "nail", emoji: "🔩", name: "מסמר" },
  { id: "wood", emoji: "🪵", name: "עץ" },
  { id: "water", emoji: "💧", name: "מים" },
  { id: "ice", emoji: "🧊", name: "קרח" },
  { id: "light", emoji: "🔦", name: "אור" },
  { id: "mirror", emoji: "🪞", name: "מראה" },
  { id: "plant", emoji: "🌱", name: "צמח" },
];

/** @type {Record<string, { title: string, text: string, emoji: string }>} */
const EXPERIMENTS = {
  "magnet+nail": {
    title: "מגנט + מסמר",
    text: "המגנט מושך את המסמר! 🧲",
    emoji: "✨",
  },
  "magnet+wood": {
    title: "מגנט + עץ",
    text: "המגנט לא מושך עץ — רק מתכות.",
    emoji: "🚫",
  },
  "nail+magnet": {
    title: "מסמר + מגנט",
    text: "המגנט מושך את המסמר! 🧲",
    emoji: "✨",
  },
  "wood+magnet": {
    title: "עץ + מגנט",
    text: "המגנט לא מושך עץ — רק מתכות.",
    emoji: "🚫",
  },
  "water+ice": {
    title: "מים + קרח",
    text: "הקרח נמס במים — מצב צבירה משתנה!",
    emoji: "💦",
  },
  "ice+water": {
    title: "קרח + מים",
    text: "הקרח נמס במים — מצב צבירה משתנה!",
    emoji: "💦",
  },
  "light+mirror": {
    title: "אור + מראה",
    text: "האור מוחזר מהמראה — רואים השתקפות!",
    emoji: "🌟",
  },
  "mirror+light": {
    title: "מראה + אור",
    text: "האור מוחזר מהמראה — רואים השתקפות!",
    emoji: "🌟",
  },
  "plant+water": {
    title: "צמח + מים",
    text: "הצמח שותה מים וגדל! 🌿",
    emoji: "🌱",
  },
  "water+plant": {
    title: "מים + צמח",
    text: "הצמח שותה מים וגדל! 🌿",
    emoji: "🌱",
  },
};

function experimentKey(a, b) {
  return `${a}+${b}`;
}

export default function LeoLabPrototype() {
  const [phase, setPhase] = useState("intro");
  const [picked, setPicked] = useState(/** @type {string[]} */ ([]));
  const [result, setResult] = useState(null);
  const [tries, setTries] = useState(0);

  const reset = () => {
    setPhase("intro");
    setPicked([]);
    setResult(null);
    setTries(0);
  };

  const start = () => {
    setPhase("lab");
    setPicked([]);
    setResult(null);
    setTries(0);
  };

  const togglePick = (id) => {
    if (phase !== "lab" || result) return;
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const runTest = () => {
    if (picked.length !== 2) return;
    const key = experimentKey(picked[0], picked[1]);
    const found = EXPERIMENTS[key];
    setTries((t) => t + 1);
    if (found) {
      setResult(found);
    } else {
      setResult({
        title: "ניסוי",
        text: "לא קרה משהו מיוחד — נסו זוג אחר!",
        emoji: "🔍",
      });
    }
  };

  const pickedLabels = useMemo(
    () =>
      picked
        .map((id) => MATERIALS.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => m.name)
        .join(" + "),
    [picked],
  );

  return (
    <DevPrototypeShell
      title="מעבדת הניסויים"
      subtitle="אבטיפוס · בחרו 2 חומרים · בדקו"
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
            <p className="text-5xl">🔬</p>
            <p className="max-w-sm text-sm font-semibold text-violet-200">
              בחרו שני חומרים ולחצו &quot;בדוק&quot; — מה יקרה?
            </p>
            <button
              type="button"
              onClick={start}
              className="min-h-[48px] rounded-xl bg-violet-600 px-8 py-2.5 text-base font-bold text-white"
            >
              כניסה למעבדה
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-xs text-white/55">
              ניסויים: {tries} · נבחרו: {picked.length}/2
            </p>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:max-w-lg md:mx-auto">
              {MATERIALS.map((m) => {
                const selected = picked.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => togglePick(m.id)}
                    disabled={!!result}
                    className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 p-2 active:scale-95 ${
                      selected
                        ? "border-violet-300 bg-violet-500/30"
                        : "border-slate-600 bg-slate-800/90"
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] font-bold sm:text-xs">{m.name}</span>
                  </button>
                );
              })}
            </div>

            {picked.length === 2 && !result ? (
              <button
                type="button"
                onClick={runTest}
                className="min-h-[48px] rounded-xl bg-amber-500 px-8 py-2.5 text-base font-bold text-slate-900 shadow-lg"
              >
                בדוק 🧪
              </button>
            ) : null}

            {result ? (
              <div className="animate-pulse rounded-2xl border-4 border-yellow-400 bg-slate-950/90 p-4 text-center">
                <p className="text-4xl">{result.emoji}</p>
                <p className="mt-2 text-base font-extrabold text-yellow-200">{result.title}</p>
                <p className="mt-1 text-sm text-white/85">{pickedLabels}</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-violet-100">{result.text}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPicked([]);
                    setResult(null);
                  }}
                  className="mt-4 min-h-[44px] rounded-xl bg-violet-600 px-6 py-2 text-sm font-bold text-white"
                >
                  ניסוי נוסף
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </DevPrototypeShell>
  );
}
