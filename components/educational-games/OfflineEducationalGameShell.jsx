import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { findEducationalGame } from "../../lib/educational-games/educational-game-registry.js";
import { difficultyLabelHe } from "../../lib/educational-games/educational-game-registry.js";
import { useEducationalGameAudio } from "../../hooks/educational-games/useEducationalGameAudio.js";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";
import { enterMobileGameFullscreenFromUserGesture } from "../../lib/solo-games/solo-game-fullscreen.client.js";
import {
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
  OFFLINE_HUB_ROUTE,
} from "../../lib/offline/offline-game-catalog.js";
import EducationalGameEntryScreen from "./EducationalGameEntryScreen.jsx";
import SoloGameFinishScreen from "../solo-games/SoloGameFinishScreen.jsx";
import SoloGameHelpModal from "../solo-games/SoloGameHelpModal.jsx";
import { useSoloGameHelp } from "../../hooks/solo-games/useSoloGameHelp.js";
import MleoRecyclingFactoryEngine from "./engines/MleoRecyclingFactoryEngine.jsx";
import MleoLeoSupermarketEngine from "./engines/MleoLeoSupermarketEngine.jsx";
import MleoLeoLabEngine from "./engines/MleoLeoLabEngine.jsx";
import MleoLeoGiftsEngine from "./engines/MleoLeoGiftsEngine.jsx";
import MleoLeoBakeryEngine from "./engines/MleoLeoBakeryEngine.jsx";
import MleoLeoNumberPathEngine from "./engines/MleoLeoNumberPathEngine.jsx";
import MleoLeoPizzeriaEngine from "./engines/MleoLeoPizzeriaEngine.jsx";
import MleoLeoWordTrainEngine from "./engines/MleoLeoWordTrainEngine.jsx";
import MleoLeoWordDetectiveEngine from "./engines/MleoLeoWordDetectiveEngine.jsx";

const ENGINE_MAP = {
  "recycling-factory": MleoRecyclingFactoryEngine,
  "leo-supermarket": MleoLeoSupermarketEngine,
  "leo-lab": MleoLeoLabEngine,
  "leo-gifts": MleoLeoGiftsEngine,
  "leo-bakery": MleoLeoBakeryEngine,
  "leo-number-path": MleoLeoNumberPathEngine,
  "leo-pizzeria": MleoLeoPizzeriaEngine,
  "leo-word-train": MleoLeoWordTrainEngine,
  "leo-word-detective": MleoLeoWordDetectiveEngine,
};

const OFFLINE_FINISH_SUBTITLE = "משחק מקומי - ללא שמירה וללא פרסים";

const PLAY_SHELL =
  "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gray-950 text-white";

/**
 * Offline educational shell — no GameAccessGuard, no session API, no rewards.
 * @param {{ gameKey: string }} props
 */
export default function OfflineEducationalGameShell({ gameKey }) {
  const game = useMemo(() => findEducationalGame(gameKey), [gameKey]);
  const Engine = ENGINE_MAP[gameKey];
  const { SG, pageBgStyle } = useSoloGameShellUi();

  const [phase, setPhase] = useState("entry");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishData, setFinishData] = useState(null);

  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();
  const { onSessionStart, onWon, onLost, stopAll } = useEducationalGameAudio();

  const handleStart = useCallback(() => {
    if (typeof document !== "undefined") {
      enterMobileGameFullscreenFromUserGesture(
        document.querySelector("[data-educational-game-shell]"),
      );
    }
    onSessionStart();
    setPhase("playing");
  }, [onSessionStart]);

  const handleSessionEnd = useCallback(
    (metrics) => {
      if (metrics?.didWin === true) onWon();
      else if (metrics?.didWin === false) onLost();
      const diff = metrics?.difficulty || difficulty;
      setFinishData({
        didWin: metrics?.didWin === true,
        score: metrics?.score ?? 0,
        displayLevelHe: difficultyLabelHe(diff),
        coinsAwarded: 0,
        subtitleHe: OFFLINE_FINISH_SUBTITLE,
        statsLines: Array.isArray(metrics?.statsLines) ? metrics.statsLines : [],
      });
      setPhase("finish");
    },
    [difficulty, onWon, onLost],
  );

  useEffect(() => () => stopAll(), [stopAll]);

  const handlePlayAgain = useCallback(() => {
    setFinishData(null);
    setPhase("entry");
  }, []);

  const themedShell = phase === "entry" || phase === "finish";

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
        data-educational-game-shell=""
      >
        <header
          className={
            themedShell
              ? `${SG.header} relative`
              : "relative flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4"
          }
        >
          <Link
            href={OFFLINE_EDUCATIONAL_HUB_ROUTE}
            className={
              themedShell
                ? SG.navLink
                : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300"
            }
          >
            רשימה
          </Link>
          <h1 className={themedShell ? SG.headerTitle : SG.playHeaderTitle}>{game.titleHe}</h1>
          <Link
            href={OFFLINE_HUB_ROUTE}
            className={
              themedShell
                ? SG.navLink
                : "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300"
            }
          >
            אופליין
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
              />
            </div>
          ) : null}

          {phase === "finish" && finishData ? (
            <SoloGameFinishScreen
              didWin={finishData.didWin === true}
              score={finishData.score ?? 0}
              displayLevelHe={finishData.displayLevelHe || "-"}
              coinsAwarded={0}
              onPlayAgain={handlePlayAgain}
              busy={false}
              subtitleHe={finishData.subtitleHe}
              statsLines={finishData.statsLines}
              gamesHubHref={OFFLINE_EDUCATIONAL_HUB_ROUTE}
              gamesHubLabel="חזרה לרשימה"
            />
          ) : null}
        </main>
        <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
      </div>
    </>
  );
}
