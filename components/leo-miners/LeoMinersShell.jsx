import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import GameAccessGuard from "../games/GameAccessGuard.jsx";
import { createLeoMinersEconomyClient } from "../../lib/leo-miners/leo-miners-economy.client.js";
import { getDefaultGameplayTuning } from "../../lib/leo-miners/leo-miners-gameplay-config.client.js";
import { LEO_MINERS_DB_NOT_READY_MESSAGE_HE } from "../../lib/leo-miners/leo-miners-constants.js";

const LeoMinersGame = dynamic(() => import("./LeoMinersGame.jsx"), { ssr: false });

const BACK_HREF = "/game";

/**
 * Leo Miners idle game shell — auth, economy sync, DB-not-ready banner.
 */
export default function LeoMinersShell({ skipAccessGuard = false }) {
  const [dbReady, setDbReady] = useState(false);
  const [rewardsEnabled, setRewardsEnabled] = useState(false);
  const [pendingPoints, setPendingPoints] = useState(0);
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
      },
      onDbStatusChange: ({ dbReady: ready, rewardsEnabled: rewards, message }) => {
        setDbReady(ready === true);
        setRewardsEnabled(rewards === true);
        if (!ready) {
          setStatusMessage(
            message || LEO_MINERS_DB_NOT_READY_MESSAGE_HE
          );
        } else if (!rewards) {
          setStatusMessage(
            "שמירת פרסים בשרת: המשחק ממתין להפעלת migration ו-config (is_active)."
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
        setStatusMessage(LEO_MINERS_DB_NOT_READY_MESSAGE_HE);
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
        <title>ליאו הכורה — משחקי ליאו</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      {!configHydrated ? (
        <p className="text-white/70 text-sm text-center py-8" dir="rtl">
          טוען הגדרות משחק…
        </p>
      ) : (
        <LeoMinersGame
          economy={economy}
          dbReady={dbReady}
          rewardsEnabled={rewardsEnabled}
          serverPendingPoints={pendingPoints}
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
    <GameAccessGuard category="solo">
      {inner}
    </GameAccessGuard>
  );
}
