import GameAccessGuard from "../games/GameAccessGuard.jsx";
import { useOfflineSkipGameAccessGuard } from "../../lib/offline/use-offline-skip-access-guard.js";

/**
 * Skips GameAccessGuard on /student/offline/{same-device} routes only.
 * @param {{ gameKey?: string, category?: string, children: import('react').ReactNode }} props
 */
export default function MaybeGameAccessGuard({ gameKey, category, children }) {
  const skip = useOfflineSkipGameAccessGuard();
  if (skip) {
    return children;
  }
  return (
    <GameAccessGuard gameKey={gameKey} category={category}>
      {children}
    </GameAccessGuard>
  );
}
