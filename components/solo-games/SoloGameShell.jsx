import { useCallback, useEffect, useMemo, useState } from "react";
import { resetSoloGameDocumentShell } from "../../lib/solo-games/solo-game-document-cleanup.client.js";
import { enterMobileGameFullscreenFromUserGesture } from "../../lib/solo-games/solo-game-fullscreen.client.js";
import Head from "next/head";
import Link from "next/link";
import { findSoloGame } from "../../lib/solo-games/solo-game-registry.js";
import { useSoloGameSession } from "../../hooks/solo-games/useSoloGameSession.js";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import { useSoloGameShellAudio } from "../../hooks/solo-games/useSoloGameAudio.js";
import SoloGameEntryScreen from "./SoloGameEntryScreen.jsx";
import SoloGameFinishScreen from "./SoloGameFinishScreen.jsx";
import SoloGameSettlingOverlay from "./SoloGameSettlingOverlay.jsx";
import SoloGameAdSlot from "./SoloGameAdSlot.jsx";
import SoloGameHelpModal from "./SoloGameHelpModal.jsx";
import GameAccessGuard from "../games/GameAccessGuard.jsx";
import { useSoloGameHelp } from "../../hooks/solo-games/useSoloGameHelp.js";
import MleoCatcherEngine from "./engines/MleoCatcherEngine.jsx";
import MleoFlyerEngine from "./engines/MleoFlyerEngine.jsx";
import MleoPuzzleEngine from "./engines/MleoPuzzleEngine.jsx";
import MleoMemoryEngine from "./engines/MleoMemoryEngine.jsx";
import MleoJumpEngine from "./engines/MleoJumpEngine.jsx";
import MleoBalloonsEngine from "./engines/MleoBalloonsEngine.jsx";
import MleoMazeEngine from "./engines/MleoMazeEngine.jsx";
import MleoPicturePuzzleEngine from "./engines/MleoPicturePuzzleEngine.jsx";
import MleoTargetTapEngine from "./engines/MleoTargetTapEngine.jsx";
import MleoSortShapesEngine from "./engines/MleoSortShapesEngine.jsx";
import MleoSmartBlocksEngine from "./engines/MleoSmartBlocksEngine.jsx";
import MleoFruitSliceEngine from "./engines/MleoFruitSliceEngine.jsx";

const ENGINE_MAP = {
  catcher: MleoCatcherEngine,
  flyer: MleoFlyerEngine,
  puzzle: MleoPuzzleEngine,
  memory: MleoMemoryEngine,
  "leo-jump": MleoJumpEngine,
  balloons: MleoBalloonsEngine,
  maze: MleoMazeEngine,
  "picture-puzzle": MleoPicturePuzzleEngine,
  "target-tap": MleoTargetTapEngine,
  "sort-shapes": MleoSortShapesEngine,
  "smart-blocks": MleoSmartBlocksEngine,
  "fruit-slice": MleoFruitSliceEngine,
};

const PLAY_SHELL =
  "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-950 text-white";

/**
 * @param {{ gameKey: string }} props
 */
export default function SoloGameShell({ gameKey }) {
  const game = useMemo(() => findSoloGame(gameKey), [gameKey]);
  const Engine = ENGINE_MAP[gameKey];
  const { SG, pageBgStyle } = useSoloGameShellUi();

  const [phase, setPhase] = useState("entry");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishData, setFinishData] = useState(null);
  const [enginePreGame, setEnginePreGame] = useState(false);

  const {
    sessionId,
    busy,
    error,
    startSession,
    finishSession,
    resetSession,
  } = useSoloGameSession(gameKey);
  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();
  const { onSessionStart, onSessionWon, onSessionLost, onExit } = useSoloGameShellAudio(gameKey);

  const handleStart = useCallback(async () => {
    // Preserve the "התחל משחק" click gesture for autoStart engines (landscape mobile only).
    if (typeof document !== "undefined") {
      enterMobileGameFullscreenFromUserGesture(
        document.querySelector("[data-solo-game-shell]"),
      );
    }
    const diff = game?.hasDifficultyPicker ? difficulty : null;
    const id = await startSession(diff);
    if (id) {
      onSessionStart();
      setPhase("playing");
    }
  }, [game, difficulty, startSession, onSessionStart]);

  const handleSessionEnd = useCallback(
    async (metrics) => {
      if (metrics?.didWin === true) onSessionWon();
      else if (metrics?.didWin === false) onSessionLost();
      setPhase("settling");
      const result = await finishSession(metrics);
      if (result) {
        setFinishData(result);
        setPhase("finish");
      } else {
        setPhase("entry");
      }
    },
    [finishSession, onSessionWon, onSessionLost],
  );

  const handlePlayAgain = useCallback(() => {
    resetSession();
    setFinishData(null);
    setPhase("entry");
  }, [resetSession]);

  useEffect(() => {
    return () => {
      onExit();
      resetSoloGameDocumentShell();
    };
  }, [onExit]);

  const showReservedAd = phase === "entry" || phase === "finish";
  const themedShell =
    phase === "entry" || phase === "finish" || phase === "settling" || enginePreGame;

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
        <title>{game.titleHe} - משחקי ליאו</title>
      </Head>
      <div
        className={themedShell ? SG.shell : PLAY_SHELL}
        style={themedShell ? pageBgStyle : undefined}
        dir="rtl"
        data-solo-game-shell=""
      >
        <header className={`${themedShell ? SG.header : "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4"} relative`}>
          <Link
            href="/student/game"
            className={themedShell ? SG.navLink : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"}
          >
            משחקים
          </Link>
          <h1 className={themedShell ? SG.headerTitle : SG.playHeaderTitle}>
            {game.titleHe}
          </h1>
          <Link
            href="/student/home"
            className={themedShell ? SG.navLink : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"}
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
                onPreGameUiChange={setEnginePreGame}
              />
            </div>
          ) : null}

          <SoloGameSettlingOverlay open={phase === "settling"} />

          {phase === "finish" && finishData ? (
            <SoloGameFinishScreen
              didWin={finishData.didWin === true}
              score={finishData.score ?? 0}
              displayLevelHe={finishData.displayLevelHe || "-"}
              coinsAwarded={finishData.coinsAwarded ?? 0}
              diamondsAwarded={finishData.diamondsAwarded ?? 0}
              breakdownHe={finishData.breakdownHe}
              diamondBreakdownHe={finishData.diamondBreakdownHe}
              balanceAfter={finishData.balanceAfter}
              diamondBalanceAfter={finishData.diamondBalanceAfter}
              onPlayAgain={handlePlayAgain}
              busy={busy}
            />
          ) : null}
        </main>

        {showReservedAd ? <SoloGameAdSlot /> : null}
        <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
      </div>
    </>
    </GameAccessGuard>
  );
}
