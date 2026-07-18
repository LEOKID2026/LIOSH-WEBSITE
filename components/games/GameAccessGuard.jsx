import { useRouter } from "next/router";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
import { evaluateGameAccessBlock } from "../../lib/games/game-access-guard.client.js";
import GameLockedScreen from "./GameLockedScreen.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";

/**
 * Client guard for game pages - validates prefetched /api/student/game-access data.
 * @param {{ gameKey?: string, category?: string, shellFirst?: boolean, children: React.ReactNode }} props
 */
export default function GameAccessGuard({ gameKey, category, children, shellFirst = false }) {
  const router = useRouter();
  const access = useStudentGameAccess();

  if (access.state === "loading") {
    if (shellFirst) return children;
    return <StudentLoadingPanel message="טוען הרשאות משחק..." reportPage />;
  }

  if (access.state === "error" || !access.data) {
    if (shellFirst) return children;
    router.replace(`/student/login?next=${encodeURIComponent(router.asPath)}`);
    return <StudentLoadingPanel message="מעבירים לכניסה..." reportPage />;
  }

  const block = evaluateGameAccessBlock(access.data, { gameKey, category });

  if (block) {
    return <GameLockedScreen adminDisabled={block.adminDisabled} />;
  }

  return children;
}
