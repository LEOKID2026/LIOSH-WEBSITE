import { useRef, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const HABITATS = [
  { id: "sea", label: "ים", emoji: "🌊", color: "border-sky-400 bg-sky-500/20" },
  { id: "desert", label: "מדבר", emoji: "🏜️", color: "border-amber-400 bg-amber-500/20" },
  { id: "forest", label: "יער", emoji: "🌲", color: "border-emerald-400 bg-emerald-500/20" },
  { id: "polar", label: "\u05e7\u05d5\u05d8\u05d1", emoji: "❄️", color: "border-cyan-300 bg-cyan-500/15" },
  { id: "farm", label: "חווה", emoji: "🌾", color: "border-lime-400 bg-lime-500/15" },
];

const ANIMALS = [
  { id: "dolphin", emoji: "🐬", name: "\u05d3\u05d5\u05dc\u05e4\u05d9\u05df", habitat: "sea", fact: "\u05d3\u05d5\u05dc\u05e4\u05d9\u05e0\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd \u05d1\u05de\u05d9\u05dd \u05d5\u05e0\u05d5\u05e9\u05de\u05d9\u05dd \u05d0\u05d5\u05d5\u05d9\u05e8." },
  { id: "camel", emoji: "🐫", name: "גמל", habitat: "desert", fact: "גמלים מותאמים לחום ולמעט מים במדבר." },
  { id: "bear", emoji: "🐻", name: "דוב", habitat: "forest", fact: "דובים מוצאים מזון ומחסה ביער." },
  { id: "penguin", emoji: "🐧", name: "פינגווין", habitat: "polar", fact: "פינגווינים חיים באזורים קרים מאוד." },
  { id: "cow", emoji: "🐄", name: "פרה", habitat: "farm", fact: "פרות גדלות בחווה וניזונות מעשב." },
  { id: "fish", emoji: "🐠", name: "דג", habitat: "sea", fact: "\u05d3\u05d2\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd \u05d1\u05de\u05d9\u05dd \u05d5\u05e9\u05d5\u05d7\u05d9\u05dd \u05e2\u05dd \u05e1\u05e0\u05e4\u05d9\u05e8\u05d9\u05dd." },
  { id: "snake", emoji: "🐍", name: "נחש", habitat: "desert", fact: "נחשים במדבר מסתתרים מהשמש בחול." },
  { id: "owl", emoji: "🦉", name: "\u05d9\u05e0\u05e9\u05d5\u05e3", habitat: "forest", fact: "\u05d9\u05e0\u05e9\u05d5\u05e4\u05d9\u05dd \u05e6\u05d3\u05d9\u05dd \u05d1\u05d9\u05e2\u05e8 \u05d1\u05dc\u05d9\u05dc\u05d4." },
  { id: "seal", emoji: "🦭", name: "כלב ים", habitat: "polar", fact: "כלבי ים שוחים במים קפואים ושוהים על קרח." },
  { id: "chicken", emoji: "🐔", name: "תרנגולת", habitat: "farm", fact: "תרנגולות מטילות ביצים בחווה." },
];

export default function AnimalHomesPrototype() {
  const [phase, setPhase] = useState("intro");
  const [pool, setPool] = useState(() => ANIMALS.map((a) => a.id));
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [fact, setFact] = useState("");
  const [flash, setFlash] = useState("");

  const reset = () => {
    setPhase("intro");
    setPool(ANIMALS.map((a) => a.id));
    setSelected(null);
    setScore(0);
    setFeedback("");
    setFact("");
    setFlash("");
  };

  const start = () => {
    setPhase("play");
    setPool(ANIMALS.map((a) => a.id));
    setSelected(null);
    setScore(0);
    setFeedback("");
    setFact("");
  };

  const assignAnimal = (animalId, habitatId) => {
    if (phase !== "play" || !pool.includes(animalId)) return;
    const animal = ANIMALS.find((a) => a.id === animalId);
    if (!animal) return;

    if (animal.habitat === habitatId) {
      setPool((p) => p.filter((id) => id !== animalId));
      setSelected(null);
      setScore((s) => s + 10);
      setFeedback(`כל הכבוד! ${animal.name} → ${HABITATS.find((h) => h.id === habitatId)?.label} ✅`);
      setFact(animal.fact);
      setFlash("ok");
    } else {
      setFeedback(
        `${animal.name} לא גר ב${HABITATS.find((h) => h.id === habitatId)?.label} - נסו שוב`,
      );
      setFact("");
      setFlash("bad");
    }
    window.setTimeout(() => setFlash(""), 450);
  };

  const remaining = pool.length;

  return (
    <DevPrototypeShell
      title="הבית של החיות"
      subtitle="אבטיפוס · בחרו חיה ואז אזור"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-amber-200">
          {score} · {remaining} נשארו
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">🦁</p>
            <p className="max-w-sm text-sm font-semibold text-lime-200">
              בחרו חיה ואז את בית הגידול המתאים!
            </p>
            <button
              type="button"
              onClick={start}
              className="min-h-[48px] rounded-xl bg-lime-600 px-8 py-2.5 text-base font-bold text-white"
            >
              התחל
            </button>
          </div>
        ) : (
          <>
            {remaining === 0 ? (
              <p className="text-center text-base font-bold text-emerald-300">סיימתם! כל החיות בבית 🎉</p>
            ) : null}

            <div className="rounded-xl border-2 border-yellow-400/70 bg-slate-950/80 p-3">
              <p className="text-xs font-bold text-amber-200">🐾 חיות - לחצו לבחירה</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {pool.map((id) => {
                  const a = ANIMALS.find((x) => x.id === id);
                  if (!a) return null;
                  const isSelected = selected === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelected(isSelected ? null : id)}
                      className={`flex min-h-[64px] min-w-[64px] flex-col items-center justify-center rounded-xl border-2 px-2 py-1 active:scale-95 ${
                        isSelected ? "border-lime-300 bg-lime-500/25" : "border-white/25 bg-slate-800"
                      }`}
                    >
                      <span className="text-2xl">{a.emoji}</span>
                      <span className="text-[10px] font-bold">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 ${
                flash === "ok" ? "ring-2 ring-emerald-400/40 rounded-xl" : flash === "bad" ? "ring-2 ring-rose-400/40 rounded-xl" : ""
              }`}
            >
              {HABITATS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  disabled={!selected}
                  onClick={() => selected && assignAnimal(selected, h.id)}
                  className={`flex min-h-[80px] flex-col items-center justify-center rounded-xl border-2 p-2 active:scale-95 disabled:opacity-40 ${h.color}`}
                >
                  <span className="text-2xl">{h.emoji}</span>
                  <span className="text-xs font-bold">{h.label}</span>
                </button>
              ))}
            </div>

            {feedback ? <p className="text-center text-sm font-bold text-white/90">{feedback}</p> : null}
            {fact ? (
              <p className="rounded-lg bg-sky-500/15 px-3 py-2 text-center text-xs font-semibold text-sky-200">
                💡 {fact}
              </p>
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
