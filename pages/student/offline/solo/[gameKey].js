import { useRouter } from "next/router";
import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import OfflineSoloGameShell from "../../../../components/solo-games/OfflineSoloGameShell.jsx";
import OfflineGameErrorBoundary from "../../../../components/offline/OfflineGameErrorBoundary.jsx";
import OfflineGameHoldShell from "../../../../components/offline/OfflineGameHoldShell.jsx";
import {
  isValidOfflineSoloGameKey,
  offlineSoloRoute,
} from "../../../../lib/offline/offline-game-catalog.js";

export default function StudentOfflineSoloGamePage() {
  const router = useRouter();
  const gameKey = String(router.query.gameKey || "").trim().toLowerCase();

  if (!router.isReady) {
    return <OfflineGameHoldShell />;
  }

  if (!isValidOfflineSoloGameKey(gameKey)) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-gray-950 text-white"
        dir="rtl"
      >
        <p>משחק לא נמצא</p>
      </div>
    );
  }

  return (
    <OfflineGameErrorBoundary
      key={gameKey}
      gameKey={gameKey}
      gameType="solo"
      route={offlineSoloRoute(gameKey)}
    >
      <OfflineFullGamesRouteGuard>
        <OfflineSoloGameShell gameKey={gameKey} />
      </OfflineFullGamesRouteGuard>
    </OfflineGameErrorBoundary>
  );
}
