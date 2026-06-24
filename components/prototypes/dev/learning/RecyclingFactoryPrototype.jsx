import { useCallback, useRef, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const BINS = [
  { id: "paper", label: "נייר", emoji: "📄", color: "border-blue-400 bg-blue-500/20" },
  { id: "plastic", label: "פלסטיק", emoji: "🧴", color: "border-yellow-400 bg-yellow-500/20" },
  { id: "glass", label: "זכוכית", emoji: "🫙", color: "border-emerald-400 bg-emerald-500/20" },
  { id: "metal", label: "מתכת", emoji: "🥫", color: "border-slate-400 bg-slate-500/25" },
  { id: "trash", label: "רגיל", emoji: "🗑️", color: "border-rose-400 bg-rose-500/20" },
];

const ITEMS = [
  { id: "bottle", emoji: "🧴", name: "בקבוק פלסטיק", bin: "plastic" },
  { id: "newspaper", emoji: "📰", name: "עיתון", bin: "paper" },
  { id: "jar", emoji: "🫙", name: "צנצנת זכוכית", bin: "glass" },
  { id: "can", emoji: "🥫", name: "פחית", bin: "metal" },
  { id: "banana", emoji: "🍌", name: "קליפת בננה", bin: "trash" },
  { id: "box", emoji: "📦", name: "קרטון", bin: "paper" },
  { id: "bag", emoji: "🛍️", name: "שקית", bin: "plastic" },
  { id: "bulb", emoji: "💡", name: "נורה", bin: "glass" },
  { id: "foil", emoji: "🧻", name: "נייר אלומיניום", bin: "metal" },
  { id: "apple", emoji: "🍎", name: "שאריות תפוח", bin: "trash" },
];

/** @returns {typeof ITEMS[0]} */
function nextItem() {
  return ITEMS[Math.floor(Math.random() * ITEMS.length)];
}

export default function RecyclingFactoryPrototype() {
  const dragRef = useRef(null);
  const [phase, setPhase] = useState("intro");
  const [current, setCurrent] = useState(() => nextItem());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [flash, setFlash] = useState("");

  const reset = () => {
    setPhase("intro");
    setCurrent(nextItem());
    setScore(0);
    setStreak(0);
    setFeedback("");
    setFlash("");
  };

  const start = () => {
    setPhase("play");
    setCurrent(nextItem());
    setScore(0);
    setStreak(0);
    setFeedback("");
  };

  const sortToBin = useCallback(
    (binId) => {
      if (phase !== "play" || !current) return;
      const ok = current.bin === binId;
      if (ok) {
        setScore((s) => s + 10);
        setStreak((s) => s + 1);
        setFeedback(`נכון! ${current.name} → ${BINS.find((b) => b.id === binId)?.label} ✅`);
        setFlash("ok");
      } else {
        setStreak(0);
        setFeedback(
          `לא בדיוק — ${current.name} שייך ל${BINS.find((b) => b.id === current.bin)?.label} ♻️`,
        );
        setFlash("bad");
      }
      window.setTimeout(() => setFlash(""), 400);
      setCurrent(nextItem());
    },
    [phase, current],
  );

  const onItemPointerDown = () => {
    if (phase !== "play") return;
    dragRef.current = { itemId: current?.id };
  };

  const onBinPointerUp = (binId) => {
    if (dragRef.current) {
      sortToBin(binId);
      dragRef.current = null;
    }
  };

  return (
    <DevPrototypeShell
      title="מפעל המיחזור"
      subtitle="אבטיפוס · מיון לפחים · ניקוד מקומי"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-amber-200">
          {score} נק׳
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">♻️</p>
            <p className="max-w-sm text-sm font-semibold text-emerald-200">
              גררו כל פריט לפח המתאים — שמרו על כדור הארץ!
            </p>
            <button
              type="button"
              onClick={start}
              className="min-h-[48px] rounded-xl bg-emerald-500 px-8 py-2.5 text-base font-bold text-white"
            >
              התחל מיון
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-xs text-white/55">
              רצף: {streak} · לחצו על פריט ואז על פח (או גררו)
            </p>

            <div
              className={`mx-auto flex min-h-[100px] w-full max-w-md flex-col items-center justify-center rounded-2xl border-4 border-yellow-400 bg-slate-950/80 p-4 ${
                flash === "ok" ? "ring-4 ring-emerald-400/50" : flash === "bad" ? "ring-4 ring-rose-400/50" : ""
              }`}
            >
              <p className="text-xs font-bold text-amber-200">🏭 מסוע</p>
              <button
                type="button"
                onPointerDown={onItemPointerDown}
                className="mt-2 flex flex-col items-center rounded-xl border-2 border-white/25 bg-slate-800 px-6 py-3 active:scale-95"
              >
                <span className="text-4xl">{current?.emoji}</span>
                <span className="mt-1 text-sm font-bold">{current?.name}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {BINS.map((bin) => (
                <button
                  key={bin.id}
                  type="button"
                  onClick={() => sortToBin(bin.id)}
                  onPointerUp={() => onBinPointerUp(bin.id)}
                  className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 p-2 active:scale-95 ${bin.color}`}
                >
                  <span className="text-2xl">{bin.emoji}</span>
                  <span className="text-[11px] font-bold">{bin.label}</span>
                </button>
              ))}
            </div>

            {feedback ? (
              <p className="text-center text-sm font-bold text-white/90">{feedback}</p>
            ) : null}

            <button
              type="button"
              onClick={reset}
              className="mx-auto min-h-[44px] rounded-xl border-2 border-white/25 px-6 py-2 text-sm font-bold"
            >
              משחק חדש
            </button>
          </>
        )}
      </div>
    </DevPrototypeShell>
  );
}
