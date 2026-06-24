import { useCallback, useEffect, useRef, useState } from "react";
import DevPrototypeShell from "./DevPrototypeShell.jsx";

const LANES = 3;
const BPM = 72;
const BEAT_MS = (60 / BPM) * 1000;
const TRAVEL_MS = 1800;
const HIT_WINDOW = 90;

/** @typedef {{ id: number, lane: number, spawnAt: number, hit?: boolean }} Note */

export default function RhythmPrototype() {
  const idRef = useRef(0);
  const notesRef = useRef(/** @type {Note[]} */ ([]));
  const rafRef = useRef(null);

  const [notes, setNotes] = useState(/** @type {Note[]} */ ([]));
  const [feedback, setFeedback] = useState("");
  const [stats, setStats] = useState({ perfect: 0, early: 0, late: 0, miss: 0 });
  const [beatPulse, setBeatPulse] = useState(false);

  const spawnNote = useCallback(() => {
    const lane = Math.floor(Math.random() * LANES);
    idRef.current += 1;
    const note = { id: idRef.current, lane, spawnAt: performance.now() };
    notesRef.current = [...notesRef.current, note];
    setNotes(notesRef.current);
  }, []);

  useEffect(() => {
    spawnNote();
    const beat = window.setInterval(() => {
      spawnNote();
      setBeatPulse(true);
      window.setTimeout(() => setBeatPulse(false), 120);
    }, BEAT_MS);

    const tick = () => {
      const now = performance.now();
      notesRef.current = notesRef.current.filter((n) => now - n.spawnAt < TRAVEL_MS + 400);
      setNotes([...notesRef.current]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.clearInterval(beat);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [spawnNote]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(""), 500);
  };

  const hitLane = (lane) => {
    const now = performance.now();
    let best = null;
    let bestDelta = Infinity;

    for (const n of notesRef.current) {
      if (n.lane !== lane || n.hit) continue;
      const progress = now - n.spawnAt;
      const hitAt = TRAVEL_MS;
      const delta = progress - hitAt;
      if (Math.abs(delta) < Math.abs(bestDelta)) {
        bestDelta = delta;
        best = n;
      }
    }

    if (!best || Math.abs(bestDelta) > HIT_WINDOW + 80) {
      setStats((s) => ({ ...s, miss: s.miss + 1 }));
      showFeedback("❌ פספוס");
      return;
    }

    best.hit = true;
    notesRef.current = notesRef.current.map((n) => (n.id === best.id ? { ...n, hit: true } : n));
    setNotes([...notesRef.current]);

    if (Math.abs(bestDelta) <= HIT_WINDOW * 0.35) {
      setStats((s) => ({ ...s, perfect: s.perfect + 1 }));
      showFeedback("🎯 מדויק!");
    } else if (bestDelta < 0) {
      setStats((s) => ({ ...s, early: s.early + 1 }));
      showFeedback("⏪ מוקדם");
    } else {
      setStats((s) => ({ ...s, late: s.late + 1 }));
      showFeedback("⏩ מאוחר");
    }
  };

  const noteTop = (spawnAt) => {
    const progress = (performance.now() - spawnAt) / TRAVEL_MS;
    return Math.min(100, progress * 100);
  };

  return (
    <DevPrototypeShell
      title="משחק קצב"
      subtitle="אבטיפוס · לחצו כשהסימן מגיע לקו"
      headerExtra={
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-amber-200">
          🎯{stats.perfect}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 p-3 sm:p-4">
        <p className="text-center text-xs font-semibold text-violet-200 sm:text-sm">
          3 מסלולים · BPM {BPM} · לחצו בקו הצהוב
        </p>

        <div
          className={`relative flex w-full max-w-[360px] flex-1 flex-col overflow-hidden rounded-2xl border-4 border-yellow-400 bg-slate-950/90 shadow-[0_0_32px_rgba(250,204,21,0.12)] ${
            beatPulse ? "ring-2 ring-violet-400/50" : ""
          }`}
        >
          {/* lanes */}
          <div className="relative flex flex-1">
            {Array.from({ length: LANES }).map((_, lane) => (
              <button
                key={lane}
                type="button"
                onClick={() => hitLane(lane)}
                className="relative flex flex-1 flex-col border-x border-white/10 active:bg-white/5"
                style={{ touchAction: "manipulation" }}
              >
                {notes
                  .filter((n) => n.lane === lane && !n.hit)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="pointer-events-none absolute left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-white/40 bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg sm:h-12 sm:w-12"
                      style={{
                        top: `${noteTop(n.spawnAt)}%`,
                        opacity: n.hit ? 0 : 1,
                        transform: `translateX(-50%) scale(${1 - noteTop(n.spawnAt) / 200})`,
                      }}
                    >
                      <span className="flex h-full items-center justify-center text-lg">⭐</span>
                    </div>
                  ))}
              </button>
            ))}

            {/* hit line */}
            <div className="pointer-events-none absolute bottom-[18%] left-0 right-0 border-t-4 border-dashed border-yellow-300/90" />
            <div className="pointer-events-none absolute bottom-[18%] left-0 right-0 flex justify-around px-4">
              {Array.from({ length: LANES }).map((_, i) => (
                <span key={i} className="-mt-8 rounded-full bg-yellow-400/20 px-3 py-1 text-[10px] font-bold text-yellow-200">
                  👆
                </span>
              ))}
            </div>
          </div>
        </div>

        {feedback ? (
          <p className="text-center text-lg font-extrabold text-white">{feedback}</p>
        ) : (
          <p className="text-center text-xs text-white/50">
            מדויק {stats.perfect} · מוקדם {stats.early} · מאוחר {stats.late} · פספוס {stats.miss}
          </p>
        )}
      </div>
    </DevPrototypeShell>
  );
}
