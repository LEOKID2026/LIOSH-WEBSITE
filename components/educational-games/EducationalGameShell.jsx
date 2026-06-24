import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { findEducationalGame } from "../../lib/educational-games/educational-game-registry.js";
import { useEducationalGameSession } from "../../hooks/educational-games/useEducationalGameSession.js";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import { enterMobileGameFullscreenFromUserGesture } from "../../lib/solo-games/solo-game-fullscreen.client.js";
import GameAccessGuard from "../games/GameAccessGuard.jsx";
import EducationalGameEntryScreen from "./EducationalGameEntryScreen.jsx";
import SoloGameFinishScreen from "../solo-games/SoloGameFinishScreen.jsx";
import SoloGameHelpModal from "../solo-games/SoloGameHelpModal.jsx";
import SoloGameSettlingOverlay from "../solo-games/SoloGameSettlingOverlay.jsx";
import { useSoloGameHelp } from "../../hooks/solo-games/useSoloGameHelp.js";
import MleoRecyclingFactoryEngine from "./engines/MleoRecyclingFactoryEngine.jsx";

const ENGINE_MAP = {
  "recycling-factory": MleoRecyclingFactoryEngine,
};

const PLAY_SHELL =
  "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-950 text-white";

/**
 * @param {{ gameKey: string }} props
 */
export default function EducationalGameShell({ gameKey }) {
  const game = useMemo(() => findEducationalGame(gameKey), [gameKey]);
  const Engine = ENGINE_MAP[gameKey];
  const { SG, pageBgStyle } = useSoloGameShellUi();

  const [phase, setPhase] = useState("entry");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishData, setFinishData] = useState(null);

  const { sessionId, busy, error, startSession, finishSession, resetSession } =
    useEducationalGameSession(gameKey);

  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();

  const handleStart = useCallback(async () => {
    if (typeof document !== "undefined") {
      enterMobileGameFullscreenFromUserGesture(
        document.querySelector("[data-educational-game-shell]"),
      );
    }
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
    [finishSession],
  );

  const handlePlayAgain = useCallback(() => {
    resetSession();
    setFinishData(null);
    setPhase("entry");
  }, [resetSession]);

  const themedShell = phase === "entry" || phase === "finish" || phase === "settling";

  if (!game || !Engine) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white" dir="rtl">
        <p>משחק לא נמצא</p>
      </div>
    );
  }

  return (
    <GameAccessGuard gameKey={gameKey}>
      <>
        <Head>
          <title>{game.titleHe} — משחקים חינוכיים</title>
        </Head>
        <div
          className={themedShell ? SG.shell : PLAY_SHELL}
          style={themedShell ? pageBgStyle : undefined}
          dir="rtl"
          data-educational-game-shell=""
        >
          <header
            className={
              themedShell
                ? SG.header
                : "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4"
            }
          >
            <Link
              href="/student/educational-games"
              className={
                themedShell
                  ? SG.navLink
                  : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300"
              }
            >
              חזרה
            </Link>
            <h1 className={themedShell ? SG.headerTitle : SG.playHeaderTitle}>{game.titleHe}</h1>
            <Link
              href="/student/home"
              className={
                themedShell
                  ? SG.navLink
                  : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300"
              }
            >
              בית
            </Link>
          </header>

          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {phase === "entry" ? (
              <EducationalGameEntryScreen
                game={game}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                onStart={handleStart}
                onOpenHelp={openSoloGameHelp}
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
          <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
        </div>
      </>
    </GameAccessGuard>
  );
}
