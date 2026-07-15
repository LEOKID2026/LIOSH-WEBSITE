import { useCallback, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const WEATHER = [
  {
    id: "sun",
    label: "שמש",
    emoji: "☀️",
    temp: 32,
    wind: 1,
    cloud: 0,
    items: ["hat", "water"],
    hint: "חם ושמש - מה צריך?",
  },
  {
    id: "rain",
    label: "גשם",
    emoji: "🌧️",
    temp: 14,
    wind: 2,
    cloud: 4,
    items: ["umbrella", "boots"],
    hint: "יורד גשם - מה לוקחים?",
  },
  {
    id: "wind",
    label: "רוח",
    emoji: "💨",
    temp: 18,
    wind: 5,
    cloud: 2,
    items: ["kite", "jacket"],
    hint: "רוח חזקה - מה מתאים?",
  },
  {
    id: "snow",
    label: "שלג",
    emoji: "❄️",
    temp: -2,
    wind: 3,
    cloud: 5,
    items: ["coat", "boots"],
    hint: "קר ושלג - מה לובשים?",
  },
  {
    id: "clouds",
    label: "עננים",
    emoji: "☁️",
    temp: 20,
    wind: 2,
    cloud: 4,
    items: ["jacket"],
    hint: "מעונן וקריר - מה עוזר?",
  },
  {
    id: "heat",
    label: "חום כבד",
    emoji: "🥵",
    temp: 38,
    wind: 0,
    cloud: 0,
    items: ["water", "hat"],
    hint: "חום כבד מאוד - מה חשוב?",
  },
];

const GEAR = [
  { id: "umbrella", emoji: "☂️", name: "מטרייה" },
  { id: "coat", emoji: "🧥", name: "מעיל" },
  { id: "hat", emoji: "🧢", name: "כובע" },
  { id: "water", emoji: "💧", name: "מים" },
  { id: "boots", emoji: "👢", name: "מגפיים" },
  { id: "kite", emoji: "🪁", name: "עפיפון" },
  { id: "jacket", emoji: "🧶", name: "סוודר" },
];

function pickWeather(exclude = []) {
  const pool = WEATHER.filter((w) => !exclude.includes(w.id));
  return pool[Math.floor(Math.random() * pool.length)] || WEATHER[0];
}

export default function WeatherStationPrototype() {
  const [phase, setPhase] = useState("intro");
  const [round, setRound] = useState(() => pickWeather());
  const [picked, setPicked] = useState(/** @type {string[]} */ ([]));
  const [score, setScore] = useState(0);
  const [roundsDone, setRoundsDone] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [flash, setFlash] = useState("");

  const reset = () => {
    setPhase("intro");
    setRound(pickWeather());
    setPicked([]);
    setScore(0);
    setRoundsDone(0);
    setFeedback("");
    setFlash("");
  };

  const start = () => {
    setPhase("play");
    setRound(pickWeather());
    setPicked([]);
    setScore(0);
    setRoundsDone(0);
    setFeedback("");
  };

  const toggleGear = (id) => {
    if (phase !== "play") return;
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setFeedback("");
  };

  const checkAnswer = useCallback(() => {
    if (!round || picked.length === 0) return;
    const needed = new Set(round.items);
    const chosen = new Set(picked);
    const correct =
      needed.size === chosen.size && [...needed].every((id) => chosen.has(id));

    if (correct) {
      setScore((s) => s + 10);
      setRoundsDone((r) => r + 1);
      setFeedback(`נכון! ${round.label} - בחירה טובה ✅`);
      setFlash("ok");
      window.setTimeout(() => {
        setFlash("");
        setRound((prev) => pickWeather([prev.id]));
        setPicked([]);
        setFeedback("");
      }, 1600);
    } else {
      setFeedback("לא בדיוק - חשבו מה מתאים למזג האוויר");
      setFlash("bad");
      window.setTimeout(() => setFlash(""), 450);
    }
  }, [round, picked]);

  return (
    <DevPrototypeShell
      title="תחנת מזג האוויר"
      subtitle="אבטיפוס · התאימו ציוד למזג האוויר"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-amber-200">
          {score} · {roundsDone} סבבים
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">🌤️</p>
            <p className="max-w-sm text-sm font-semibold text-cyan-200">בחרו את הציוד המתאים למזג האוויר שמוצג!</p>
            <button type="button" onClick={start} className="min-h-[48px] rounded-xl bg-cyan-600 px-8 py-2.5 text-base font-bold text-white">
              פתח תחנה
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl border-4 border-yellow-400 bg-slate-950/85 p-4 ${
                flash === "ok" ? "ring-4 ring-emerald-400/40" : flash === "bad" ? "ring-4 ring-rose-400/40" : ""
              }`}
            >
              <p className="text-center text-xs font-bold text-amber-200">תחנת ליאו</p>
              <p className="mt-2 text-center text-5xl">{round.emoji}</p>
              <p className="text-center text-lg font-extrabold">{round.label}</p>
              <p className="mt-1 text-center text-xs text-white/65">{round.hint}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs font-bold">
                <span className="rounded-lg bg-rose-500/20 px-2 py-1">🌡️ {round.temp}°</span>
                <span className="rounded-lg bg-sky-500/20 px-2 py-1">💨 רוח {round.wind}/5</span>
                <span className="rounded-lg bg-slate-500/30 px-2 py-1">{"☁️".repeat(round.cloud) || "☀️"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:max-w-md md:mx-auto">
              {GEAR.map((g) => {
                const on = picked.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGear(g.id)}
                    className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 p-2 active:scale-95 ${
                      on ? "border-cyan-300 bg-cyan-500/25" : "border-slate-600 bg-slate-800/90"
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-[10px] font-bold">{g.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={checkAnswer}
              disabled={!picked.length}
              className="min-h-[48px] rounded-xl bg-sky-500 px-8 py-2.5 text-base font-bold text-white disabled:opacity-40"
            >
              בדוק התאמה ✓
            </button>

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
