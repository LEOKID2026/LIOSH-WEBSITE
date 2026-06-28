import { useRouter } from "next/router";
import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import OfflineEducationalGameShell from "../../../../components/educational-games/OfflineEducationalGameShell.jsx";
import { isValidOfflineEducationalGameKey } from "../../../../lib/offline/offline-game-catalog.js";

export default function StudentOfflineEducationalGamePage() {
  const router = useRouter();
  const gameKey = String(router.query.gameKey || "").trim().toLowerCase();

  if (!router.isReady) {
    return null;
  }

  if (!isValidOfflineEducationalGameKey(gameKey)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white" dir="rtl">
        <p>משחק לא נמצא</p>
      </div>
    );
  }

  return (
    <OfflineFullGamesRouteGuard>
      <OfflineEducationalGameShell gameKey={gameKey} />
    </OfflineFullGamesRouteGuard>
  );
}
