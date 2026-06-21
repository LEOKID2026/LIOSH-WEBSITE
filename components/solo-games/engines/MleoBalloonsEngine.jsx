import { useEffect, useRef, useState } from "react";
import {
  SOLO_V2_ASSETS,
  SoloV2EndBanner,
  SoloV2Goal,
  SoloV2Hud,
  SoloV2Intro,
  SoloV2Playfield,
} from "./solo-v2-ui.jsx";

const GAME_DURATION_SEC = 60;
const TARGET_POPS = 15;
const MAX_LIVES = 3;
const MAX_ESCAPED = 8;
const SCORE_GOOD = 10;
const SCORE_GOLD = 25;

/**
 * @param {{ autoStart?: boolean, onSessionEnd?: (metrics: object) => void }} props
 */
export default function MleoBalloonsEngine({ autoStart = false, onSessionEnd }) {
  const sessionEndFiredRef = useRef(false);
  const playStartedAtRef = useRef(null);
  const scoreRef = useRef(0);
  const popsRef = useRef(0);
  const idRef = useRef(0);

  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showIntro, setShowIntro] = useState(!autoStart);
  const [score, setScore] = useState(0);
  const [pops, setPops] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [escaped, setEscaped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [balloons, setBalloons] = useState([]);

  const spawnBalloon = () => {
    const roll = Math.random();
    let kind = "good";
    if (roll < 0.12) kind = "bomb";
    else if (roll < 0.22) kind = "gold";
    idRef.current += 1;
    return { id: idRef.current, kind, x: 10 + Math.random() * 80, y: 100 };
  };

  const fireSessionEnd = (didWin, remaining) => {
    if (!onSessionEnd || sessionEndFiredRef.current) return;
    sessionEndFiredRef.current = true;
    onSessionEnd({
      score: scoreRef.current,
      didWin,
      levelReached: 0,
      timeRemainingSec: remaining,
      durationMs:
        playStartedAtRef.current != null
          ? Math.max(0, Date.now() - playStartedAtRef.current)
          : undefined,
    });
  };

  const endGame = (didWin, remaining) => {
    setGameRunning(false);
    setGameOver(true);
    setWon(didWin);
    setBalloons([]);
    fireSessionEnd(didWin, remaining);
  };

  const loseLife = (remaining) => {
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) endGame(false, remaining);
      return next;
    });
  };

  const startGame = () => {
    sessionEndFiredRef.current = false;
    playStartedAtRef.current = Date.now();
    scoreRef.current = 0;
    popsRef.current = 0;
    setShowIntro(false);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setPops(0);
    setLives(MAX_LIVES);
    setEscaped(0);
    setTimeLeft(GAME_DURATION_SEC);
    setBalloons([]);
    setGameRunning(true);
  };

  useEffect(() => {
    if (autoStart && !gameRunning && !gameOver && !showIntro) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    if (timeLeft <= 0) {
      endGame(popsRef.current >= TARGET_POPS, 0);
      return undefined;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    const spawn = setInterval(() => {
      setBalloons((prev) => [...prev.slice(-12), spawnBalloon()]);
    }, 850);
    return () => clearInterval(spawn);
  }, [gameRunning]);

  useEffect(() => {
    if (!gameRunning) return undefined;
    const rise = setInterval(() => {
      setBalloons((prev) => {
        const next = [];
        for (const b of prev) {
          const ny = (b.y ?? 100) - 3.5;
          if (ny < -12) {
            if (b.kind !== "bomb") {
              setEscaped((e) => {
                const ne = e + 1;
                if (ne >= MAX_ESCAPED) endGame(false, timeLeft);
                return ne;
              });
            }
          } else {
            next.push({ ...b, y: ny });
          }
        }
        return next;
      });
    }, 120);
    return () => clearInterval(rise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning, timeLeft]);

  const popBalloon = (balloon) => {
    if (!gameRunning) return;
    setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
    if (balloon.kind === "bomb") {
      loseLife(timeLeft);
      return;
    }
    const pts = balloon.kind === "gold" ? SCORE_GOLD : SCORE_GOOD;
    scoreRef.current += pts;
    popsRef.current += 1;
    setScore(scoreRef.current);
    setPops(popsRef.current);
    if (popsRef.current >= TARGET_POPS) endGame(true, timeLeft);
  };

  const balloonStyle = (kind) => {
    if (kind === "gold") return "from-amber-300 to-yellow-500 ring-2 ring-amber-200";
    if (kind === "bomb") return "from-gray-700 to-gray-900 ring-2 ring-red-500";
    return "from-sky-400 to-blue-600 ring-2 ring-white/50";
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden px-2 py-2 text-white w-full" dir="rtl">
      <SoloV2Goal text={`פוצצו ${TARGET_POPS} בלונים טובים! בלון זהב = יותר ניקוד. אל תלחצו על 💣`} />
      {!showIntro ? (
        <SoloV2Hud
          rows={[
            { label: "ניקוד", value: score, accent: "text-amber-300" },
            { label: "בלונים", value: `${pops}/${TARGET_POPS}` },
            { label: "חיים", value: "❤️".repeat(Math.max(0, lives)) || "—" },
            { label: "פספוסים", value: `${escaped}/${MAX_ESCAPED}` },
            { label: "זמן", value: `${timeLeft}s` },
          ]}
        />
      ) : null}
      <SoloV2Playfield bg={SOLO_V2_ASSETS.bgPark} className="min-h-[280px]">
        {showIntro ? (
          <SoloV2Intro
            title="פיצוץ בלונים!"
            lines={["בלון כחול = +10", "בלון זהב = +25", "💣 = מאבדים חיים", "יותר מדי בלונים שברחו = הפסד"]}
            onStart={startGame}
          />
        ) : (
          <>
            {balloons.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`absolute flex min-h-[60px] min-w-[60px] items-center justify-center rounded-full bg-gradient-to-b shadow-lg transition active:scale-90 ${balloonStyle(b.kind)}`}
                style={{ left: `${b.x}%`, bottom: `${b.y ?? 100}%`, transform: "translateX(-50%)" }}
                onClick={() => popBalloon(b)}
              >
                {b.kind === "bomb" ? (
                  <img src={SOLO_V2_ASSETS.bomb} alt="" className="h-10 w-10 object-contain" />
                ) : b.kind === "gold" ? (
                  <span className="text-3xl">⭐</span>
                ) : (
                  <span className="text-3xl">🎈</span>
                )}
              </button>
            ))}
            {gameOver ? (
              <SoloV2EndBanner
                success={won}
                title={won ? "כל הכבוד! פיצצתם מספיק בלונים!" : "לא הצלחתם הפעם"}
                subtitle={`ניקוד: ${score} · בלונים: ${pops}/${TARGET_POPS}`}
              />
            ) : null}
          </>
        )}
      </SoloV2Playfield>
    </div>
  );
}
