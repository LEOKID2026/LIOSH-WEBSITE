import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { isCardRewardsEnabledClient } from "../../../lib/rewards/reward-feature-flags.client.js";
import { formatCountdownHe } from "../../../lib/rewards/rewards-ui.he.js";

const STATUS_PATH = "/api/student/rewards/surprise-box/status";

export default function StudentSurpriseBoxWidget({ onOpen }) {
  const { tokens: T } = useStudentTheme();
  const [phase, setPhase] = useState("idle");
  const [ready, setReady] = useState(false);
  const [pendingBoxCount, setPendingBoxCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [errorHe, setErrorHe] = useState("");

  const loadStatus = useCallback(async () => {
    setPhase("loading");
    setErrorHe("");
    try {
      const res = await fetch(STATUS_PATH, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setErrorHe("לא הצלחנו לטעון את קופסת ההפתעה.");
        setPhase("error");
        return;
      }
      setReady(json.ready === true);
      setPendingBoxCount(Math.max(0, Number(json.pendingBoxCount) || 0));
      setSecondsRemaining(
        json.secondsRemaining != null ? Math.max(0, Number(json.secondsRemaining) || 0) : null
      );
      setPhase("ok");
    } catch {
      setErrorHe("שגיאת רשת בטעינת קופסת ההפתעה.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!isCardRewardsEnabledClient()) return undefined;
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!ready && secondsRemaining != null && secondsRemaining > 0) {
      const timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev == null || prev <= 1) {
            void loadStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [ready, secondsRemaining, loadStatus]);

  if (!isCardRewardsEnabledClient()) return null;

  return (
    <section
      className={`mt-4 md:mt-5 rounded-2xl border p-4 md:p-5 text-right overflow-x-hidden ${T.statCard}`}
      aria-label="קופסת הפתעה"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 justify-end">
            <h2 className={`text-base md:text-lg font-bold ${T.tileTitle}`}>קופסת הפתעה</h2>
            <span className="text-2xl shrink-0" aria-hidden>
              🎁
            </span>
          </div>
          {phase === "loading" ? (
            <p className={`mt-1 text-sm ${T.tileSub}`}>טוען...</p>
          ) : phase === "error" ? (
            <p className="mt-1 text-sm text-rose-600">{errorHe}</p>
          ) : ready ? (
            <p className={`mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300`}>
              {pendingBoxCount > 1
                ? `${pendingBoxCount} קופסאות מוכנות לפתיחה!`
                : "קופסת הפתעה מוכנה!"}
            </p>
          ) : secondsRemaining != null ? (
            <p className={`mt-1 text-sm ${T.tileSub}`}>
              הקופסה הבאה תהיה מוכנה בעוד{" "}
              <span className="tabular-nums font-semibold">{formatCountdownHe(secondsRemaining)}</span>
            </p>
          ) : (
            <p className={`mt-1 text-sm ${T.tileSub}`}>המשיכו ללמוד — בקרוב תגיע קופסה חדשה!</p>
          )}
        </div>
        <div className="flex flex-col xs:flex-row gap-2 shrink-0 w-full sm:w-auto">
          {ready ? (
            <button
              type="button"
              onClick={() => onOpen?.()}
              className={`${T.ctaPrimary} w-full sm:w-auto text-center`}
            >
              פתח קופסה
            </button>
          ) : null}
          <Link
            href="/student/cards"
            className={`${T.ctaGames} w-full sm:w-auto text-center`}
          >
            לאוסף שלי
          </Link>
        </div>
      </div>
    </section>
  );
}
