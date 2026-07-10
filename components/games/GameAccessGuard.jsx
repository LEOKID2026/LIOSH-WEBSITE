import { useRouter } from "next/router";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
import { evaluateGameAccessBlock } from "../../lib/games/game-access-guard.client.js";
import GameLockedScreen from "./GameLockedScreen.jsx";

/**
 * Client guard for game pages — validates prefetched /api/student/game-access data.
 * @param {{ gameKey?: string, category?: string, children: React.ReactNode }} props
 */
export default function GameAccessGuard({ gameKey, category, children }) {
  const router = useRouter();
  const access = useStudentGameAccess();

  if (access.state === "loading") {
    return null;
  }

  if (access.state === "error" || !access.data) {
    router.replace(`/student/login?next=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  const block = evaluateGameAccessBlock(access.data, { gameKey, category });

  if (block) {
    return <GameLockedScreen adminDisabled={block.adminDisabled} />;
  }

  return children;
}
