import { useMemo, useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import MaybeGameAccessGuard from "../../components/offline/MaybeGameAccessGuard.jsx";
import StudentAdSlot from "../../components/student/StudentAdSlot.jsx";
import GameAudioSettingsButton from "../../components/game-audio/GameAudioSettingsButton.jsx";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import OfflineGameHoldShell from "../../components/offline/OfflineGameHoldShell.jsx";
import { useGameAudio } from "../../hooks/useGameAudio";

const CARD_POOL = ["🐶", "🐱", "🪙", "💎", "🦴", "🐾", "🦊", "🌙", "⚡️", "🔥"];

function buildDeck(pairs = 8) {
  const selection = CARD_POOL.slice(0, pairs);
  const deck = selection.flatMap((emoji, idx) => [
    { id: `${idx}-a`, emoji },
    { id: `${idx}-b`, emoji },
  ]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatch() {
  useIOSViewportFix();
  const router = useRouter();
  const { playSfx, primeFromUserGesture } = useGameAudio();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const boardRef = useRef(null);
  const controlsRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [deck, setDeck] = useState(() => buildDeck());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [twoPlayers, setTwoPlayers] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  const allMatched = matched.length === deck.length && deck.length > 0;
  const isSetupPhase = (moves === 0 && flipped.length === 0) || allMatched;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic layout calculation - stable, no state dependencies
  useEffect(() => {
    if (!wrapRef.current || !mounted) return;
    const calc = () => {
      const rootH = window.visualViewport?.height ?? window.innerHeight;
      const headH = headerRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty("--head-h", headH + "px");
      
      // Measure all elements accurately for maximum board size
      const controlsH = controlsRef.current?.offsetHeight || 50;
      const titleH = 70; // Title + subtitle height
      const spacing = 12; // Reduced spacing for more board space
      const safeBottom = typeof window !== "undefined" 
        ? Math.max(parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0"), 20)
        : 20;
      
      // Calculate used space - minimize padding to maximize board
      const used =
        headH +
        titleH +
        controlsH +
        spacing * 2 + // Minimal spacing
        safeBottom;
      
      // Maximize board height - use all available space, minimum 250px
      const freeH = Math.max(250, rootH - used);
      document.documentElement.style.setProperty("--board-h", freeH + "px");
    };
    const timer = setTimeout(calc, 100);
    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, [mounted]); // Only depend on mounted

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    if (allMatched) {
      setTimerActive(false);
      playSfx("sfx-victory");
    }
  }, [allMatched, playSfx]);

  const gridColumns = useMemo(() => {
    if (deck.length <= 12) return 3;
    if (deck.length <= 16) return 4;
    return 5;
  }, [deck.length]);

  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleFlip(idx) {
    if (flipped.includes(idx) || matched.includes(deck[idx].id)) return;
    if (flipped.length === 2) return;

    primeFromUserGesture();
    playSfx("sfx-flap");

    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = deck[firstIdx];
      const secondCard = deck[secondIdx];
      setMoves((prev) => prev + 1);

      if (firstCard.emoji === secondCard.emoji) {
        setTimeout(() => {
          playSfx("sfx-match-ok");
          setMatched((prev) => [...prev, firstCard.id, secondCard.id]);
          setFlipped([]);
          if (twoPlayers) {
            setScores((prev) => {
              const copy = [...prev];
              copy[currentPlayer] += 1;
              return copy;
            });
          }
        }, 400);
      } else {
        setTimeout(() => {
          playSfx("sfx-match-bad");
          setFlipped([]);
          if (twoPlayers) {
            setCurrentPlayer((prev) => (prev === 0 ? 1 : 0));
          }
        }, 700);
      }
    }
  }

  function resetGame() {
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
    setScores([0, 0]);
    setMoves(0);
    setElapsed(0);
    setCurrentPlayer(0);
    setTimerActive(true);
  }

  const backSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push(
        window.location.pathname.startsWith("/student/") ? "/student/offline" : "/offline"
      );
    }
  };

  if (!mounted) return <OfflineGameHoldShell />;

  return (
    <MaybeGameAccessGuard gameKey="memory-match">
    <Layout>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden bg-gradient-to-b from-[#090d17] to-[#11172b] game-page-mobile flex flex-col"
        style={{ height: "100vh", height: "100dvh" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div
          ref={headerRef}
          className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div
            className="relative px-2 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
          >
            <div className="absolute left-2 top-2 flex gap-2 pointer-events-auto items-center">
              <button
                onClick={backSafe}
                className="min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10"
              >
                חזרה
              </button>
              {isSetupPhase ? <GameAudioSettingsButton /> : null}
            </div>
            <div className="absolute right-2 top-2 pointer-events-auto">
              <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                מקומי
              </span>
            </div>
          </div>
        </div>

        <div
          className="relative flex flex-col flex-1 min-h-0 items-center justify-start px-4 overflow-hidden"
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingTop: "calc(var(--head-h, 56px) + 8px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            overflow: "hidden"
          }}
        >
          <div className="text-center mb-1">
            <h1 className="text-2xl font-extrabold text-white mb-0.5">
              🧠 התאמת זיכרון
            </h1>
            <p className="text-white/70 text-xs">
              {twoPlayers ? "2 שחקנים" : "שחקן יחיד"} • {formatTime(elapsed)}
            </p>
          </div>

          <div
            ref={controlsRef}
            className="grid grid-cols-3 gap-1 mb-1 w-full max-w-md"
          >
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">זמן</div>
              <div className="text-sm font-bold text-emerald-400">
                {formatTime(elapsed)}
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">מהלכים</div>
              <div className="text-sm font-bold text-amber-400">{moves}</div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">
                {twoPlayers ? "תור" : "זוגות"}
              </div>
              <div className="text-sm font-bold text-purple-400">
                {twoPlayers
                  ? `שחקן ${currentPlayer + 1}`
                  : `${matched.length / 2}/${deck.length / 2}`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm text-white/80">
              <input
                type="checkbox"
                checked={twoPlayers}
                onChange={(e) => {
                  setTwoPlayers(e.target.checked);
                  resetGame();
                }}
                className="w-5 h-5"
              />
              2 שחקנים
            </label>
            <button
              onClick={resetGame}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              ערבוב
            </button>
          </div>

          {twoPlayers && (
            <div className="grid grid-cols-2 gap-1 mb-1 w-full max-w-md">
              <div
                className={`bg-black/30 border rounded-lg p-1 text-center ${
                  currentPlayer === 0
                    ? "border-emerald-400/50"
                    : "border-white/10"
                }`}
              >
                <div className="text-[10px] text-white/60">שחקן 1</div>
                <div className="text-sm font-bold">{scores[0]}</div>
              </div>
              <div
                className={`bg-black/30 border rounded-lg p-1 text-center ${
                  currentPlayer === 1
                    ? "border-emerald-400/50"
                    : "border-white/10"
                }`}
              >
                <div className="text-[10px] text-white/60">שחקן 2</div>
                <div className="text-sm font-bold">{scores[1]}</div>
              </div>
            </div>
          )}

          {allMatched && (
            <div className="mb-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-semibold">
              🎉 כל הזוגות נמצאו!
            </div>
          )}

          <div
            ref={boardRef}
            className="w-full max-w-md flex items-center justify-center mb-1 flex-1 overflow-hidden"
            style={{ 
              height: "var(--board-h, 400px)", 
              minHeight: "250px",
              width: "100%",
              maxWidth: "100%",
              flex: "1 1 auto"
            }}
          >
            <div
              className="grid gap-2 w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${Math.ceil(deck.length / gridColumns)}, minmax(0, 1fr))`,
                maxWidth: "min(95vw, 450px)",
                maxHeight: "100%",
                width: "100%",
                height: "100%"
              }}
            >
              {deck.map((card, idx) => {
                const isFlipped =
                  flipped.includes(idx) || matched.includes(card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => handleFlip(idx)}
                    className={`rounded-xl border-2 text-3xl md:text-4xl transition-all active:scale-95 ${
                      isFlipped
                        ? "bg-white text-[#0b1324] border-white/30"
                        : "bg-black/30 border-white/15"
                    }`}
                  >
                    {isFlipped ? card.emoji : "❔"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <StudentAdSlot variant="dvh" />
      </div>
    </Layout>
    </MaybeGameAccessGuard>
  );
}
