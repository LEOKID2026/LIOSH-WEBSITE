import { useEffect } from "react";
import { useRouter } from "next/router";
import { OFFLINE_HUB_ROUTE } from "../../lib/offline/offline-game-catalog.js";
import { shouldBlockOfflineFullGamesRoute } from "../../lib/offline/offline-route-guard.js";
import PortalLoadingPanel from "../ui/PortalLoadingPanel.jsx";

/**
 * Redirects to offline hub when STUDENT_OFFLINE_FULL_GAMES_ENABLED is false.
 * Prevents direct URL access to solo/educational offline routes.
 */
export default function OfflineFullGamesRouteGuard({ children }) {
  const router = useRouter();
  const blocked = shouldBlockOfflineFullGamesRoute();

  useEffect(() => {
    if (blocked) {
      router.replace(OFFLINE_HUB_ROUTE);
    }
  }, [blocked, router]);

  if (blocked) {
    return <PortalLoadingPanel isBright message="טוען..." fullPage />;
  }

  return children;
}
