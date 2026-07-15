import { useMemo, useState } from "react";
import DevPrototypeShell from "../../../solo-games/prototypes/dev/DevPrototypeShell.jsx";

const DESTINATIONS = [
  {
    id: "jerusalem",
    name: "ירושלים",
    emoji: "🕌",
    region: "מרכז",
    fact: "ירושלים היא עיר קדושה לשלוש דתות ויש בה את הכותל.",
    quiz: "עיר הבירה של ישראל, עיר קדושה",
    x: 52,
    y: 42,
  },
  {
    id: "eilat",
    name: "אילת",
    emoji: "🐠",
    region: "דרום",
    fact: "אילת נמצאת על שפת הים האדום - מקום מצוין לשחות ולצלול.",
    quiz: "העיר הדרומית ביותר, ליד הים האדום",
    x: 28,
    y: 88,
  },
  {
    id: "dead-sea",
    name: "ים המלח",
    emoji: "🧂",
    region: "דרום",
    fact: "בים המלח המים מלוחים מאוד - קל לצוף!",
    quiz: "המקום הנמוך ביותר על פני כדור הארץ",
    x: 42,
    y: 58,
  },
  {
    id: "kinneret",
    name: "הכנרת",
    emoji: "⛵",
    region: "צפון",
    fact: "הכנרת היא אגם המים היחיד בישראל.",
    quiz: "אגם גדול בצפון, ליד טבריה",
    x: 58,
    y: 28,
  },
  {
    id: "hermon",
    name: "החרמון",
    emoji: "🏔️",
    region: "צפון",
    fact: "בחרמון יורד שלג בחורף - פסגת ההר הגבוהה בארץ.",
    quiz: "הר גבוה בצפון, עם שלג בחורף",
    x: 62,
    y: 12,
  },
  {
    id: "tel-aviv",
    name: "תל אביב",
    emoji: "🏖️",
    region: "מרכז",
    fact: "תל אביב היא עיר גדולה על הים התיכון.",
    quiz: "עיר חוף גדולה במרכז, ליד הים",
    x: 38,
    y: 38,
  },
  {
    id: "haifa",
    name: "חיפה",
    emoji: "⚓",
    region: "צפון",
    fact: "חיפה נמצאת על הים ויש בה נמל וגנים יפים.",
    quiz: "עיר נמל בצפון, על הים התיכון",
    x: 32,
    y: 22,
  },
  {
    id: "beer-sheva",
    name: "באר שבע",
    emoji: "🌵",
    region: "דרום",
    fact: "באר שבע היא עיר גדולה בנגב.",
    quiz: "עיר גדולה בנגב, בדרום הארץ",
    x: 48,
    y: 72,
  },
];

function pickMission() {
  const d = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
  return { type: "find", dest: d, prompt: `לאן נוסע ליאו? ${d.quiz}` };
}

export default function IsraelJourneyPrototype() {
  const [phase, setPhase] = useState("intro");
  const [selected, setSelected] = useState(null);
  const [mission, setMission] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [mode, setMode] = useState("explore");

  const reset = () => {
    setPhase("intro");
    setSelected(null);
    setMission(null);
    setScore(0);
    setFeedback("");
    setMode("explore");
  };

  const startExplore = () => {
    setPhase("play");
    setMode("explore");
    setSelected(null);
    setFeedback("");
    setMission(null);
  };

  const startMission = () => {
    setPhase("play");
    setMode("mission");
    setMission(pickMission());
    setSelected(null);
    setFeedback("");
  };

  const visit = (id) => {
    const d = DESTINATIONS.find((x) => x.id === id);
    if (!d) return;
    setSelected(id);

    if (mode === "explore") {
      setFeedback(`${d.emoji} ${d.name}: ${d.fact}`);
      return;
    }

    if (mode === "mission" && mission?.dest) {
      if (id === mission.dest.id) {
        setScore((s) => s + 10);
        setFeedback(`נכון! ${d.fact} 🎉`);
        window.setTimeout(() => {
          setMission(pickMission());
          setSelected(null);
          setFeedback("");
        }, 2200);
      } else {
        setFeedback("לא בדיוק - נסו יעד אחר לפי הרמז");
      }
    }
  };

  const leoAt = useMemo(() => {
    if (!selected) return { x: 50, y: 50 };
    const d = DESTINATIONS.find((x) => x.id === selected);
    return d ? { x: d.x, y: d.y } : { x: 50, y: 50 };
  }, [selected]);

  return (
    <DevPrototypeShell
      title="מסע בישראל"
      subtitle="אבטיפוס · מפה · עובדות · משימות"
      headerExtra={
        <button type="button" onClick={reset} className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold text-white/85">
          איפוס
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4">
        {phase === "intro" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-5xl">🇮🇱</p>
            <p className="max-w-sm text-sm font-semibold text-sky-200">
              טיילו עם ליאו בין יעדים בישראל - גלו עובדות או פתרו משימות!
            </p>
            <button type="button" onClick={startExplore} className="min-h-[48px] rounded-xl bg-sky-600 px-8 py-2.5 text-base font-bold text-white">
              מסע חופשי
            </button>
            <button type="button" onClick={startMission} className="min-h-[44px] rounded-xl border-2 border-yellow-400 px-6 py-2 text-sm font-bold text-yellow-200">
              משימות מסע
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-lg bg-black/50 px-2 py-1 text-xs font-bold text-amber-200">
                {mode === "mission" ? `משימה · ${score} נק׳` : "מסע חופשי"}
              </span>
              {mode === "mission" ? (
                <button type="button" onClick={startExplore} className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold">
                  מעבר לחופשי
                </button>
              ) : (
                <button type="button" onClick={startMission} className="rounded-lg border border-white/25 px-2 py-1 text-[11px] font-bold">
                  משימות
                </button>
              )}
            </div>

            {mission && mode === "mission" ? (
              <p className="rounded-xl border-2 border-yellow-400/60 bg-slate-950/80 px-3 py-2 text-center text-sm font-bold text-yellow-100">
                🧭 {mission.prompt}
              </p>
            ) : null}

            <div className="relative mx-auto aspect-[4/5] w-full max-w-md rounded-2xl border-4 border-yellow-400 bg-gradient-to-b from-amber-900/30 via-emerald-900/25 to-sky-900/30 p-2 sm:aspect-[5/6]">
              <p className="pointer-events-none absolute left-2 top-2 text-[10px] font-bold text-white/40">מפת ישראל (אבטיפוס)</p>
              <div
                className="pointer-events-none absolute text-2xl transition-all duration-500 sm:text-3xl"
                style={{ left: `${leoAt.x}%`, top: `${leoAt.y}%`, transform: "translate(-50%, -50%)" }}
              >
                🦁
              </div>
              {DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => visit(d.id)}
                  className={`absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl border-2 px-1 py-0.5 text-center active:scale-95 ${
                    selected === d.id ? "border-sky-300 bg-sky-500/35" : "border-white/30 bg-slate-900/70"
                  }`}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                >
                  <span className="text-lg sm:text-xl">{d.emoji}</span>
                  <span className="max-w-[56px] text-[8px] font-bold leading-tight sm:text-[9px]">{d.name}</span>
                </button>
              ))}
            </div>

            {feedback ? (
              <p className="text-center text-sm font-semibold leading-relaxed text-white/90">{feedback}</p>
            ) : (
              <p className="text-center text-xs text-white/45">לחצו על יעד כדי לבקר · {mode === "mission" ? "ענו על הרמז" : "קראו עובדה"}</p>
            )}
          </>
        )}
      </div>
    </DevPrototypeShell>
  );
}
