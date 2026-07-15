import { useCallback, useEffect, useMemo, useState } from "react";
import { resetSoloGameDocumentShell } from "../../lib/solo-games/solo-game-document-cleanup.client.js";
import { enterMobileGameFullscreenFromUserGesture } from "../../lib/solo-games/solo-game-fullscreen.client.js";
import Head from "next/head";
import Link from "next/link";
import { findSoloGame } from "../../lib/solo-games/solo-game-registry.js";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import { difficultyLabelHe } from "../../lib/solo-games/solo-game-registry.js";
import SoloGameEntryScreen from "./SoloGameEntryScreen.jsx";
import SoloGameFinishScreen from "./SoloGameFinishScreen.jsx";
import SoloGameHelpModal from "./SoloGameHelpModal.jsx";
import { useSoloGameHelp } from "../../hooks/solo-games/useSoloGameHelp.js";
import { buildMemoryDeckOffline } from "../../lib/offline/offline-memory-deck.js";
import {
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_HUB_ROUTE,
} from "../../lib/offline/offline-game-catalog.js";
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

const OFFLINE_FINISH_SUBTITLE = "משחק מקומי - ללא שמירה וללא פרסים";

const PLAY_SHELL =
  "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-950 text-white";

/**
 * Offline solo shell — no GameAccessGuard, no session API, no rewards.
 * @param {{ gameKey: string }} props
 */
export default function OfflineSoloGameShell({ gameKey }) {
  const game = useMemo(() => findSoloGame(gameKey), [gameKey]);
  const Engine = ENGINE_MAP[gameKey];
  const { SG, pageBgStyle } = useSoloGameShellUi();

  const [phase, setPhase] = useState("entry");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishData, setFinishData] = useState(null);
  const [enginePreGame, setEnginePreGame] = useState(false);

  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();

  const handleStart = useCallback(() => {
    if (typeof document !== "undefined") {
      enterMobileGameFullscreenFromUserGesture(
        document.querySelector("[data-solo-game-shell]"),
      );
    }
    setPhase("playing");
  }, []);

  const handleSessionEnd = useCallback((metrics) => {
    const diff = metrics?.difficulty || difficulty;
    setFinishData({
      didWin: metrics?.didWin === true,
      score: metrics?.score ?? 0,
      displayLevelHe: difficultyLabelHe(diff),
      coinsAwarded: 0,
      diamondsAwarded: 0,
      subtitleHe: OFFLINE_FINISH_SUBTITLE,
    });
    setPhase("finish");
  }, [difficulty]);

  const handlePlayAgain = useCallback(() => {
    setFinishData(null);
    setPhase("entry");
  }, []);

  useEffect(() => {
    return () => {
      resetSoloGameDocumentShell();
    };
  }, []);

  const memoryDeckBuilder =
    gameKey === "memory" ? buildMemoryDeckOffline : undefined;

  const themedShell =
    phase === "entry" || phase === "finish" || enginePreGame;

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
        <title>{game.titleHe} - משחקים ללא אינטרנט</title>
      </Head>
      <div
        className={themedShell ? SG.shell : PLAY_SHELL}
        style={themedShell ? pageBgStyle : undefined}
        dir="rtl"
        data-solo-game-shell=""
      >
        <header
          className={
            themedShell
              ? SG.header
              : "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4"
          }
        >
          <Link
            href={OFFLINE_SOLO_HUB_ROUTE}
            className={
              themedShell
                ? SG.navLink
                : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
            }
          >
            רשימה
          </Link>
          <h1 className={themedShell ? SG.headerTitle : SG.playHeaderTitle}>
            {game.titleHe}
          </h1>
          <Link
            href={OFFLINE_HUB_ROUTE}
            className={
              themedShell
                ? SG.navLink
                : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white"
            }
          >
            אופליין
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
              busy={false}
              error=""
            />
          ) : null}

          {phase === "playing" ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <Engine
                autoStart
                initialDifficulty={game.hasDifficultyPicker ? difficulty : undefined}
                onSessionEnd={handleSessionEnd}
                onPreGameUiChange={setEnginePreGame}
                deckBuilder={memoryDeckBuilder}
              />
            </div>
          ) : null}

          {phase === "finish" && finishData ? (
            <SoloGameFinishScreen
              didWin={finishData.didWin === true}
              score={finishData.score ?? 0}
              displayLevelHe={finishData.displayLevelHe || "-"}
              coinsAwarded={0}
              diamondsAwarded={0}
              onPlayAgain={handlePlayAgain}
              busy={false}
              subtitleHe={finishData.subtitleHe}
              gamesHubHref={OFFLINE_SOLO_HUB_ROUTE}
              gamesHubLabel="חזרה לרשימה"
            />
          ) : null}
        </main>

        <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
      </div>
    </>
  );
}
