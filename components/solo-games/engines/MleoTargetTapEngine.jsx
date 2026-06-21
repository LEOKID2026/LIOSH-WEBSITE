import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
} from "./solo-v2-ui.jsx";

const DIFFICULTY_SETTINGS = {
  easy: { targetHits: 12, durationSec: 45, lifetimeMs: 1300, maxMisses: 6 },
  medium: { targetHits: 18, durationSec: 50, lifetimeMs: 1000, maxMisses: 5 },
  hard: { targetHits: 24, durationSec: 55, lifetimeMs: 800, maxMisses: 4 },
};

const SCORE_GOOD = 20;
const SCORE_BONUS = 25;

/**
 * @param {{ autoStart?: boolean, initialDifficulty?: string, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoTargetTapEngine({
  autoStart = false,
  initialDifficulty = "medium",
  onSessionEnd,
}) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const scoreRef = useRef(0);

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_SETTINGS.medium.durationSec);
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (initialDifficulty) setDifficulty(initialDifficulty);
  }, [initialDifficulty]);

  const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;

  const spawnTarget = () => {
    const roll = Math.random();
    let kind = "good";
    if (roll < 0.15) kind = "bad";
    else if (roll < 0.28) kind = "bonus";
    const pad = 10;
    const size = kind === "bonus" ? 64 : 72;
    setTarget({
      id: Date.now(),
      kind,
      x: pad + Math.random() * (100 - pad * 2 - size / 5),
      y: pad + Math.random() * (100 - pad * 2 - size / 5),
      size,
    });
  };

  const fireSessionEnd = (didWin, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
      didWin,
      difficulty,
      mistakes: missesRef.current,
      timeRemainingSec: remaining,
      levelReached: Math.floor(scoreRef.current / 5),
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const registerMiss = (remaining) => {
    missesRef.current += 1;
    setMisses(missesRef.current);
    if (missesRef.current >= settings.maxMisses) {
      endGame(false, remaining);
      return true;
    }
    return false;
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    setTarget(null);
    fireSessionEnd(didWin, remaining);
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    hitsRef.current = 0;
    missesRef.current = 0;
    scoreRef.current = 0;
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(settings.durationSec);
    setGameRunning(true);
    spawnTarget();
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(hitsRef.current >= settings.targetHits, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning || !target) return undefined;
    const t = setTimeout(() => {
      if (target.kind === "bad") {
        spawnTarget();
        return;
      }
      if (!registerMiss(timeLeft)) spawnTarget();
    }, settings.lifetimeMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, target, settings.lifetimeMs]);

  const handleTap = () => {
    if (!gameRunning || !target) return;

    if (target.kind === "bad") {
      if (registerMiss(timeLeft)) return;
      setTarget(null);
      spawnTarget();
      return;
    }

    const pts = target.kind === "bonus" ? SCORE_BONUS : SCORE_GOOD;
    scoreRef.current += pts;
    hitsRef.current += 1;
    setScore(scoreRef.current);
    setHits(hitsRef.current);

    if (hitsRef.current >= settings.targetHits) {
      endGame(true, timeLeft);
      return;
    }
    spawnTarget();
  };

  const targetVisual = () => {
    if (!target) return null;
    if (target.kind === "bad") {
      return <img src={SOLO_V2_ASSETS.bomb} alt="" className="h-full w-full object-contain p-2" />;
    }
    if (target.kind === "bonus") {
      return <img src={SOLO_V2_ASSETS.diamond} alt="" className="h-full w-full object-contain p-1" />;
    }
    return <img src={SOLO_V2_ASSETS.coin} alt="" className="h-full w-full object-contain p-1" />;
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white w-full" dir="rtl">
      <SoloV2Goal text="לחצו על מטבעות ויהלומים — לא על 💣! הגיעו ליעד הפגיעות." />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "ניקוד", value: score, accent: "text-amber-300" },
            { label: "פגיעות", value: `${hits}/${settings.targetHits}` },
            { label: "טעויות", value: `${misses}/${settings.maxMisses}` },
            { label: "זמן", value: `${timeLeft}s` },
          ]}
        />
      ) : null}

      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgSky} className="min-h-[280px]">
        {showIntro ? (
          <SoloV2Intro
            title="קליעה למטרה"
            lines={[
              "מטבע = +20",
              "יהלום = +25",
              "💣 = טעות (לא ללחוץ!)",
              "יותר מדי טעויות = הפסד",
            ]}
            onStart={startGame}
          />
        ) : (
          <div className="relative h-full w-full">
            {target ? (
              <button
                type="button"
                className={`absolute flex items-center justify-center rounded-full border-4 shadow-xl animate-pulse touch-manipulation active:scale-90 ${
                  target.kind === "bad"
                    ? "border-red-500 bg-gray-900/80"
                    : target.kind === "bonus"
                      ? "border-amber-300 bg-amber-500/30"
                      : "border-yellow-300 bg-yellow-500/20"
                }`}
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: target.size,
                  height: target.size,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTap();
                }}
                aria-label="מטרה"
              >
                {targetVisual()}
              </button>
            ) : null}

            {gameOver ? (
              <SoloV2EndBanner
                success={won}
                title={won ? "קלעת מעולה!" : "לא עמדת ביעד"}
                subtitle={`ניקוד: ${score} · פגיעות: ${hits}/${settings.targetHits}`}
              />
            ) : null}
          </div>
        )}
      </SoloV2Playfield>
    </div>
  );
}
