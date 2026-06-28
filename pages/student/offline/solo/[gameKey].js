import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import OfflineSoloGameShell from "../../../../components/solo-games/OfflineSoloGameShell.jsx";
import OfflineGameErrorBoundary from "../../../../components/offline/OfflineGameErrorBoundary.jsx";
import {
  isValidOfflineSoloGameKey,
  offlineSoloRoute,
} from "../../../../lib/offline/offline-game-catalog.js";

/**
 * Debug badge — visible for 12 seconds after mount to confirm the component ran.
 * Tap to dismiss. Disappears on its own if everything is fine.
 */
function OfflineGameDebugBadge({ gameKey, gameType }) {
  const [online] = useState(
    () => (typeof navigator !== "undefined" ? navigator.onLine : null),
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 99999,
        background: "#052e16",
        border: "1px solid #16a34a",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 11,
        color: "#86efac",
        fontFamily: "monospace",
        maxWidth: 220,
        boxShadow: "0 2px 8px rgba(0,0,0,0.9)",
        cursor: "pointer",
        userSelect: "none",
      }}
      title="tap to dismiss"
    >
      <div>✓ mounted: {gameType}/{gameKey}</div>
      <div>online: {String(online)}</div>
    </div>
  );
}

export default function StudentOfflineSoloGamePage() {
  const router = useRouter();
  const gameKey = String(router.query.gameKey || "").trim().toLowerCase();

  if (!router.isReady) {
    return null;
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
    <>
      <OfflineGameDebugBadge gameKey={gameKey} gameType="solo" />
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
    </>
  );
}
