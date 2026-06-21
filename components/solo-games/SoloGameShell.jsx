import { useCallback, useEffect, useMemo, useState } from "react";
import { resetSoloGameDocumentShell } from "../../lib/solo-games/solo-game-document-cleanup.client.js";
import Head from "next/head";
import Link from "next/link";
import { findSoloGame } from "../../lib/solo-games/solo-game-registry.js";
import { useSoloGameSession } from "../../hooks/solo-games/useSoloGameSession.js";
import SoloGameEntryScreen from "./SoloGameEntryScreen.jsx";
import SoloGameFinishScreen from "./SoloGameFinishScreen.jsx";
import SoloGameSettlingOverlay from "./SoloGameSettlingOverlay.jsx";
import MleoCatcherEngine from "./engines/MleoCatcherEngine.jsx";
import MleoFlyerEngine from "./engines/MleoFlyerEngine.jsx";
import MleoPuzzleEngine from "./engines/MleoPuzzleEngine.jsx";
import MleoMemoryEngine from "./engines/MleoMemoryEngine.jsx";

const ENGINE_MAP = {
  catcher: MleoCatcherEngine,
  flyer: MleoFlyerEngine,
  puzzle: MleoPuzzleEngine,
  memory: MleoMemoryEngine,
};

/**
 * @param {{ gameKey: string }} props
 */
export default function SoloGameShell({ gameKey }) {
  const game = useMemo(() => findSoloGame(gameKey), [gameKey]);
  const Engine = ENGINE_MAP[gameKey];

  const [phase, setPhase] = useState("entry");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishData, setFinishData] = useState(null);

  const {
    sessionId,
    busy,
    error,
    startSession,
    finishSession,
    resetSession,
  } = useSoloGameSession(gameKey);

  const handleStart = useCallback(async () => {
    const diff = game?.hasDifficultyPicker ? difficulty : null;
    const id = await startSession(diff);
    if (id) setPhase("playing");
  }, [game, difficulty, startSession]);

  const handleSessionEnd = useCallback(
    async (metrics) => {
      setPhase("settling");
      const result = await finishSession(metrics);
      if (result) {
        setFinishData(result);
        setPhase("finish");
      } else {
        setPhase("entry");
      }
    },
    [finishSession]
  );

  const handlePlayAgain = useCallback(() => {
    resetSession();
    setFinishData(null);
    setPhase("entry");
  }, [resetSession]);

  useEffect(() => {
    return () => {
      resetSoloGameDocumentShell();
    };
  }, []);

  if (!game || !Engine) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white" dir="rtl">
        <p>משחק לא נמצא</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{game.titleHe} — משחקי ליאו</title>
      </Head>
      <div
        className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-950 text-white"
        dir="rtl"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
          <Link
            href="/student/solo-games"
            className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
          >
            ← משחקים
          </Link>
          <h1 className="truncate text-sm font-extrabold sm:text-base">{game.titleHe}</h1>
          <Link
            href="/student/home"
            className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
          >
            בית
          </Link>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {phase === "entry" ? (
            <SoloGameEntryScreen
              game={game}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              onStart={handleStart}
              busy={busy}
              error={error}
            />
          ) : null}

          {phase === "playing" && sessionId ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <Engine
                autoStart
                initialDifficulty={game.hasDifficultyPicker ? difficulty : undefined}
                onSessionEnd={handleSessionEnd}
              />
            </div>
          ) : null}

          <SoloGameSettlingOverlay open={phase === "settling"} />

          {phase === "finish" && finishData ? (
            <SoloGameFinishScreen
              didWin={finishData.didWin === true}
              score={finishData.score ?? 0}
              displayLevelHe={finishData.displayLevelHe || "—"}
              coinsAwarded={finishData.coinsAwarded ?? 0}
              breakdownHe={finishData.breakdownHe}
              balanceAfter={finishData.balanceAfter}
              onPlayAgain={handlePlayAgain}
              busy={busy}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
