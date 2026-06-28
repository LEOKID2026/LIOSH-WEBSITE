import { useRouter } from "next/router";
import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import OfflineSoloGameShell from "../../../../components/solo-games/OfflineSoloGameShell.jsx";
import { isValidOfflineSoloGameKey } from "../../../../lib/offline/offline-game-catalog.js";

export default function StudentOfflineSoloGamePage() {
  const router = useRouter();
  const gameKey = String(router.query.gameKey || "").trim().toLowerCase();

  if (!router.isReady) {
    return null;
  }

  if (!isValidOfflineSoloGameKey(gameKey)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white" dir="rtl">
        <p>משחק לא נמצא</p>
      </div>
    );
  }

  return (
    <OfflineFullGamesRouteGuard>
      <OfflineSoloGameShell gameKey={gameKey} />
    </OfflineFullGamesRouteGuard>
  );
}
