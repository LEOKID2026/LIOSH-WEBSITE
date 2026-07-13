import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import MaybeGameAccessGuard from "../../components/offline/MaybeGameAccessGuard.jsx";
import StudentAdSlot from "../../components/student/StudentAdSlot.jsx";
import GameAudioSettingsButton from "../../components/game-audio/GameAudioSettingsButton.jsx";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import OfflineGameHoldShell from "../../components/offline/OfflineGameHoldShell.jsx";
import { useGameAudio } from "../../hooks/useGameAudio";

const DURATIONS = [5, 10, 15];

export default function TapBattle() {
  useIOSViewportFix();
  const router = useRouter();
  const { playSfx, primeFromUserGesture } = useGameAudio();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const battleRef = useRef(null);
  const controlsRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [roundDuration, setRoundDuration] = useState(10);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [phase, setPhase] = useState("idle");
  const [counts, setCounts] = useState({ left: 0, right: 0 });
  const [score, setScore] = useState({ left: 0, right: 0, ties: 0 });
  const [round, setRound] = useState(1);
  const [winnerMessage, setWinnerMessage] = useState("");

  const showAudioButton = phase === "idle" || phase === "finished";

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
      
      // Measure all elements accurately for maximum battle area size
      const controlsH = controlsRef.current?.offsetHeight || 50;
      const titleH = 70; // Title + subtitle height
      const spacing = 12; // Reduced spacing for more battle area space
      const safeBottom = typeof window !== "undefined" 
        ? Math.max(parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0"), 20)
        : 20;
      
      // Calculate used space - minimize padding to maximize battle area
      const used =
        headH +
        titleH +
        controlsH +
        spacing * 2 + // Minimal spacing
        safeBottom;
      
      // Maximize battle area height - use all available space, minimum 250px
      const freeH = Math.max(250, rootH - used);
      document.documentElement.style.setProperty("--battle-h", freeH + "px");
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
    if (phase !== "countdown") return;
    if (countdown === null) return;
    if (countdown === 0) {
      setPhase("playing");
      setCountdown(null);
      setTimeLeft(roundDuration);
      return;
    }
    playSfx("sfx-countdown");
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, roundDuration, playSfx]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      finalizeRound();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => Number(Math.max(prev - 0.1, 0).toFixed(1)));
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  function startRound() {
    primeFromUserGesture();
    setCounts({ left: 0, right: 0 });
    setWinnerMessage("");
    setCountdown(3);
    setPhase("countdown");
    setTimeLeft(roundDuration);
  }

  function finalizeRound() {
    setPhase("finished");
    let message = "תיקו!";
    const nextScore = { ...score };
    if (counts.left > counts.right) {
      message = "הצד השמאלי ניצח! 🏆";
      nextScore.left += 1;
    } else if (counts.right > counts.left) {
      message = "הצד הימני ניצח! 🏆";
      nextScore.right += 1;
    } else {
      nextScore.ties += 1;
    }
    setScore(nextScore);
    setWinnerMessage(message);
    if (counts.left !== counts.right) {
      playSfx("sfx-victory");
    }
  }

  function handleTap(side) {
    if (phase !== "playing") return;
    playSfx("sfx-tap");
    setCounts((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    if ("vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
  }

  function nextRound() {
    setRound((prev) => prev + 1);
    setPhase("idle");
    setCounts({ left: 0, right: 0 });
    setWinnerMessage("");
    setTimeLeft(roundDuration);
  }

  function resetMatch() {
    setScore({ left: 0, right: 0, ties: 0 });
    setRound(1);
    nextRound();
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
    <MaybeGameAccessGuard gameKey="tap-battle">
    <Layout>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden bg-[#05070f] game-page-mobile flex flex-col"
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
              {showAudioButton ? <GameAudioSettingsButton /> : null}
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
              ⚡️ קרב הקשות
            </h1>
            <p className="text-white/70 text-xs">
              סיבוב {round} • {roundDuration} שניות
            </p>
          </div>

          <div
            ref={controlsRef}
            className="grid grid-cols-3 gap-1 mb-1 w-full max-w-md"
          >
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">שמאל</div>
              <div className="text-sm font-bold text-purple-400">{score.left}</div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">תיקו</div>
              <div className="text-sm font-bold text-amber-400">{score.ties}</div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-1 text-center">
              <div className="text-[10px] text-white/60">ימין</div>
              <div className="text-sm font-bold text-orange-400">{score.right}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
            <select
              value={roundDuration}
              onChange={(e) => {
                setRoundDuration(Number(e.target.value));
                setTimeLeft(Number(e.target.value));
              }}
              className="h-9 px-3 rounded-lg bg-black/30 border border-white/20 text-white text-sm font-bold"
            >
              {DURATIONS.map((dur) => (
                <option key={dur} value={dur}>
                  {dur} שניות
                </option>
              ))}
            </select>
            <button
              onClick={startRound}
              disabled={phase === "countdown" || phase === "playing"}
              className="h-9 px-4 rounded-lg bg-red-500/80 hover:bg-red-500 font-bold text-sm disabled:opacity-50"
            >
              התחל
            </button>
            <button
              onClick={nextRound}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              הבא
            </button>
            <button
              onClick={resetMatch}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
            >
              איפוס
            </button>
          </div>

          <div className="text-center mb-1 text-sm text-white/80 font-semibold">
            {phase === "idle" && "לחצו התחל כדי להתחיל"}
            {phase === "countdown" && `מתכוננים... ${countdown}`}
            {phase === "playing" && `זמן: ${timeLeft.toFixed(1)} שניות`}
            {phase === "finished" && winnerMessage}
          </div>

          <div className="text-center mb-1 text-3xl font-black text-white">
            {counts.left} : {counts.right}
          </div>

          <div
            ref={battleRef}
            className="w-full flex-1 grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border-2 border-white/15"
            style={{ 
              height: "var(--battle-h, 400px)", 
              minHeight: "250px",
              width: "100%",
              maxWidth: "100%",
              flex: "1 1 auto"
            }}
          >
            <button
              onClick={() => handleTap("left")}
              className={`transition-all flex flex-col items-center justify-center ${
                phase === "playing"
                  ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 active:scale-95"
                  : "bg-[#120f1b] opacity-80"
              }`}
            >
              <div className="text-4xl font-black">ש</div>
              <div className="text-sm text-white/80 font-semibold mt-2">{counts.left} הקשות</div>
            </button>
            <button
              onClick={() => handleTap("right")}
              className={`transition-all flex flex-col items-center justify-center ${
                phase === "playing"
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 active:scale-95"
                  : "bg-[#120f1b] opacity-80"
              }`}
            >
              <div className="text-4xl font-black">י</div>
              <div className="text-sm text-white/80 font-semibold mt-2">{counts.right} הקשות</div>
            </button>
          </div>
        </div>
        <StudentAdSlot variant="dvh" />
      </div>
    </Layout>
    </MaybeGameAccessGuard>
  );
}
