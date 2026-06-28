import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";
import GameLockedScreen from "./GameLockedScreen.jsx";

/**
 * Client guard for game pages — checks access via /api/student/game-access.
 * @param {{ gameKey?: string, category?: string, children: React.ReactNode }} props
 */
export default function GameAccessGuard({ gameKey, category, children }) {
  const router = useRouter();
  const { tokens: T } = useStudentTheme();
  const [state, setState] = useState("loading");
  const [block, setBlock] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/student/game-access", { credentials: "include" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          if (!cancelled) {
            router.replace(`/student/login?next=${encodeURIComponent(router.asPath)}`);
          }
          return;
        }

        if (gameKey) {
          const row = (json.games || []).find((g) => g.gameKey === gameKey);
          if (!row || row.accessState === "admin_disabled") {
            if (!cancelled) {
              setBlock({ adminDisabled: true });
              setState("blocked");
            }
            return;
          }
          if (row.accessState === "parent_locked") {
            if (!cancelled) {
              setBlock({ adminDisabled: false });
              setState("blocked");
            }
            return;
          }
        } else if (category) {
          const cat = json.categories?.[category];
          if (!cat?.visible) {
            if (!cancelled) {
              setBlock({ adminDisabled: true });
              setState("blocked");
            }
            return;
          }
          if (cat.locked) {
            if (!cancelled) {
              setBlock({ adminDisabled: false });
              setState("blocked");
            }
            return;
          }
        }

        if (!cancelled) setState("allowed");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [gameKey, category, router]);

  if (state === "loading") {
    return <StudentLoadingPanel message="טוען..." reportPage className="min-h-[40vh]" />;
  }

  if (state === "blocked" && block) {
    return (
      <GameLockedScreen adminDisabled={block.adminDisabled} />
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center" dir="rtl">
        <p className={T.loadingText}>שגיאה בטעינה</p>
      </div>
    );
  }

  return children;
}
