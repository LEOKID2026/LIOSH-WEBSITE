import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Head from "next/head";

import dynamic from "next/dynamic";

import GameAccessGuard from "../games/GameAccessGuard.jsx";
import GameAudioSettingsButton from "../game-audio/GameAudioSettingsButton.jsx";

import { createLeoMinersEconomyClient } from "../../lib/leo-miners/leo-miners-economy.client.js";

import { getDefaultGameplayTuning } from "../../lib/leo-miners/leo-miners-gameplay-config.client.js";

import { LEO_MINERS_DB_NOT_READY_MESSAGE_HE, LEO_MINERS_ERROR_CODES, LEO_MINERS_GAME_KEY } from "../../lib/leo-miners/leo-miners-constants.js";



const LeoMinersGame = dynamic(() => import("./LeoMinersGame.jsx"), { ssr: false });



const BACK_HREF = "/game";



/**

 * Leo Miners idle game shell — auth, economy sync, DB-not-ready banner.

 */

export default function LeoMinersShell({ skipAccessGuard = false }) {

  const [dbReady, setDbReady] = useState(false);

  const [gameEnabled, setGameEnabled] = useState(false);

  const [economyEnabled, setEconomyEnabled] = useState(false);

  const [pendingPoints, setPendingPoints] = useState(0);

  const [economyStats, setEconomyStats] = useState({
    minedTodayPoints: 0,
    claimedTodayCoins: 0,
    claimedTotalCoins: 0,
  });

  const [statusMessage, setStatusMessage] = useState("");

  const [gameplayConfig, setGameplayConfig] = useState(null);

  const [configHydrated, setConfigHydrated] = useState(false);

  const economyRef = useRef(null);



  const economy = useMemo(() => {

    const client = createLeoMinersEconomyClient({

      onStateUpdate: (patch) => {
        if (patch?.miningPointsPending != null) {
          setPendingPoints(Number(patch.miningPointsPending));
        }
        if (
          patch?.minedTodayPoints != null ||
          patch?.claimedTodayCoins != null ||
          patch?.claimedTotalCoins != null
        ) {
          setEconomyStats((prev) => ({
            minedTodayPoints:
              patch?.minedTodayPoints != null
                ? Number(patch.minedTodayPoints)
                : prev.minedTodayPoints,
            claimedTodayCoins:
              patch?.claimedTodayCoins != null
                ? Number(patch.claimedTodayCoins)
                : prev.claimedTodayCoins,
            claimedTotalCoins:
              patch?.claimedTotalCoins != null
                ? Number(patch.claimedTotalCoins)
                : prev.claimedTotalCoins,
          }));
        }
      },

      onDbStatusChange: ({

        dbReady: ready,

        gameEnabled: gameOn,

        economyEnabled: economyOn,

        message,

        code,

      }) => {

        setDbReady(ready === true);

        setGameEnabled(gameOn === true);

        setEconomyEnabled(economyOn === true);



        if (code === LEO_MINERS_ERROR_CODES.miners_db_not_ready) {

          setStatusMessage(message || LEO_MINERS_DB_NOT_READY_MESSAGE_HE);

        } else if (!ready) {

          setStatusMessage(message || "שגיאת שרת - נסו לרענן את הדף.");

        } else if (!gameOn) {

          setStatusMessage(

            "המשחק כבוי כרגע - אפשר לשחק מקומית. להפעלה מלאה: לוח הבקרה → ליאו הכורה."

          );

        } else {

          setStatusMessage("");

        }

      },

      onConfigUpdate: ({ gameplayTuning, hydrated }) => {

        setGameplayConfig(gameplayTuning || getDefaultGameplayTuning());

        setConfigHydrated(hydrated === true);

      },

    });

    economyRef.current = client;

    return client;

  }, []);



  useEffect(() => {

    economy

      .fetchState()

      .catch(() => {

        setStatusMessage("שגיאת רשת - נסו לרענן את הדף.");

        setGameplayConfig(getDefaultGameplayTuning());

        setConfigHydrated(true);

      });

    return () => economy.dispose?.();

  }, [economy]);



  const handleSaveState = useCallback(

    (payload) => {

      if (!dbReady) return;

      economy.saveState(payload).catch(() => {});

    },

    [dbReady, economy]

  );



  const inner = (

    <>

      <Head>

        <title>ליאו הכורה - משחקי ליאו</title>

        <meta name="robots" content="noindex,nofollow" />

      </Head>

      {!configHydrated ? (
        <div className="relative py-8 text-center" dir="rtl">
          <GameAudioSettingsButton className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6" />
          <p className="text-white/70 text-sm">טוען הגדרות משחק…</p>
        </div>
      ) : (

        <LeoMinersGame

          economy={economy}

          dbReady={dbReady}

          gameEnabled={gameEnabled}

          economyEnabled={economyEnabled}

          rewardsEnabled={economyEnabled}

          serverPendingPoints={pendingPoints}

          economyStats={economyStats}

          gameplayConfig={gameplayConfig}

          backHref={BACK_HREF}

          statusMessage={statusMessage}

          onSaveState={handleSaveState}

        />

      )}

    </>

  );



  if (skipAccessGuard) return inner;



  return (

    <GameAccessGuard gameKey={LEO_MINERS_GAME_KEY}>

      {inner}

    </GameAccessGuard>

  );

}


