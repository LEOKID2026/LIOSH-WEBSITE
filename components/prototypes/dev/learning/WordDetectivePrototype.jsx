import { useCallback, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const CLUES = [
  { id: "ball", clue: "אני עגול וקופץ", emoji: "⚽", name: "כדור" },
  { id: "cup", clue: "שותים ממני מים", emoji: "🥤", name: "כוס" },
  { id: "flashlight", clue: "אני מאיר בחושך", emoji: "🔦", name: "פנס" },
  { id: "pencil", clue: "כותבים איתי", emoji: "✏️", name: "עיפרון" },
  { id: "book", clue: "קוראים אותי ויש בי סיפורים", emoji: "📚", name: "ספר" },
  { id: "clock", clue: "אני מראה את השעה", emoji: "⏰", name: "שעון" },
  { id: "bed", clue: "ישנים עלי בלילה", emoji: "🛏️", name: "מיטה" },
  { id: "plant", clue: "אני ירוק וגדל ליד החלון", emoji: "🪴", name: "עציץ" },
];

const ROOM_ITEMS = [
  { id: "ball", emoji: "⚽", x: 12, y: 68 },
  { id: "cup", emoji: "🥤", x: 72, y: 55 },
  { id: "flashlight", emoji: "🔦", x: 28, y: 38 },
  { id: "pencil", emoji: "✏️", x: 55, y: 62 },
  { id: "book", emoji: "📚", x: 78, y: 28 },
  { id: "clock", emoji: "⏰", x: 18, y: 18 },
  { id: "bed", emoji: "🛏️", x: 62, y: 78 },
  { id: "plant", emoji: "🪴", x: 42, y: 22 },
  { id: "lamp", emoji: "💡", x: 88, y: 48 },
  { id: "chair", emoji: "🪑", x: 35, y: 82 },
];

function pickClue(excludeIds = []) {
  const pool = CLUES.filter((c) => !excludeIds.includes(c.id));
  return pool[Math.floor(Math.random() * pool.length)] || CLUES[0];
}

export default function WordDetectivePrototype() {
  const [phase, setPhase] = useState("intro");
  const [current, setCurrent] = useState(() => pickClue());
  const [solved, setSolved] = useState(/** @type {string[]} */ ([]));
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [flash, setFlash] = useState("");

  const reset = () => {
    setPhase("intro");
    setCurrent(pickClue());
    setSolved([]);
    setScore(0);
    setFeedback("");
    setFlash("");
  };

  const start = () => {
    setPhase("play");
    setCurrent(pickClue());
    setSolved([]);
    setScore(0);
    setFeedback("");
  };

  const nextClue = useCallback((doneIds) => {
    const remaining = CLUES.filter((c) => !doneIds.includes(c.id));
    if (!remaining.length) {
      setFeedback("פתרתם את כל הרמזים! בלש מצוין 🕵️");
      setPhase("done");
      return;
    }
    setCurrent(remaining[Math.floor(Math.random() * remaining.length)]);
    setFeedback("");
  }, []);

  const pickItem = (itemId) => {
    if (phase !== "play" || !current) return;
    if (itemId === current.id) {
      const nextSolved = [...solved, current.id];
      setSolved(nextSolved);
      setScore((s) => s + 10);
      setFeedback(`מצוין! ${current.emoji} ${current.name} — ${current.clue} ✅`);
      setFlash("ok");
      window.setTimeout(() => {
        setFlash("");
        nextClue(nextSolved);
      }, 1800);
    } else {
      const decoy = CLUES.find((c) => c.id === itemId);
      setFeedback(decoy ? `לא ${decoy.name} — קראו שוב את הרמז 🔍` : "נסו חפץ אחר");
      setFlash("bad");
      window.setTimeout(() => setFlash(""), 400);
    }
  };

  return (
    <DevPrototypeShell
      title="בלש המילים"
      subtitle="אבטיפוס · חפשו את החפץ לפי הרמז"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-amber-200">{score} נק׳</span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">🕵️</p>
            <p className="max-w-sm text-sm font-semibold text-violet-200">קראו את הרמז ומצאו את החפץ הנכון בחדר!</p>
            <button type="button" onClick={start} className="min-h-[48px] rounded-xl bg-violet-600 px-8 py-2.5 text-base font-bold text-white">
              התחל חיפוש
            </button>
          </div>
        ) : (
          <>
            {phase === "play" && current ? (
              <div className="rounded-xl border-2 border-yellow-400/70 bg-slate-950/85 px-4 py-3 text-center">
                <p className="text-xs font-bold text-amber-200">🔎 רמז</p>
                <p className="mt-1 text-base font-extrabold text-white sm:text-lg">&quot;{current.clue}&quot;</p>
              </div>
            ) : null}

            <div
              className={`relative mx-auto aspect-[4/3] w-full max-w-lg rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-indigo-950/80 to-slate-900 ${
                flash === "ok" ? "ring-4 ring-emerald-400/40" : flash === "bad" ? "ring-4 ring-rose-400/40" : ""
              }`}
            >
              <p className="absolute left-3 top-2 text-[10px] font-bold text-white/35">🛋️ חדר ליאו</p>
              {ROOM_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={phase !== "play"}
                  onClick={() => pickItem(item.id)}
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-white/20 bg-slate-800/80 text-2xl active:scale-95 sm:h-14 sm:w-14 sm:text-3xl"
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                />
              ))}
            </div>

            {feedback ? <p className="text-center text-sm font-bold text-white/90">{feedback}</p> : null}

            <button type="button" onClick={reset} className="mx-auto min-h-[44px] rounded-xl border-2 border-white/25 px-6 py-2 text-sm font-bold">
              משחק חדש
            </button>
          </>
        )}
      </div>
    </DevPrototypeShell>
  );
}
