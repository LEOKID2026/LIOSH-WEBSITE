import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StudentShareFriendsButton from "../StudentShareFriendsButton.jsx";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { isCardRewardsEnabledClient } from "../../../lib/rewards/reward-feature-flags.client.js";
import { formatCountdownHe } from "../../../lib/rewards/rewards-ui.he.js";

const STATUS_PATH = "/api/student/rewards/surprise-box/status";

/**
 * @param {{
 *   onOpen?: () => void,
 *   openingLocked?: boolean,
 *   refreshToken?: number,
 *   statusOverride?: { ready?: boolean, pendingBoxCount?: number } | null,
 * }} props
 */
export default function StudentSurpriseBoxWidget({
  onOpen,
  openingLocked = false,
  refreshToken = 0,
  statusOverride = null,
}) {
  const { tokens: T, isBright } = useStudentTheme();
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
  }, [loadStatus, refreshToken]);

  useEffect(() => {
    if (!statusOverride) return;
    if (statusOverride.pendingBoxCount != null) {
      const count = Math.max(0, Number(statusOverride.pendingBoxCount) || 0);
      setPendingBoxCount(count);
      setReady(count > 0);
      if (count <= 0) setSecondsRemaining(null);
    } else if (typeof statusOverride.ready === "boolean") {
      setReady(statusOverride.ready);
    }
  }, [statusOverride]);

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

  const canOpen = phase === "ok" && ready && !openingLocked;

  const compactBtn =
    "flex-1 md:flex-none !min-h-[2.75rem] !px-3 !py-2 !text-sm text-center whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none";

  const titleColorClass = isBright ? "!text-orange-600" : "!text-amber-300";

  return (
    <section
      className={`mt-4 md:mt-5 w-full text-right overflow-x-hidden ${T.statCard}`}
      aria-label="קופסת הפתעה"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 justify-start">
            <span
              className="text-[1.625rem] md:text-xl shrink-0 leading-none inline-flex items-center"
              aria-hidden
            >
              🎁
            </span>
            <h2
              className={`${T.tileTitle} ${titleColorClass} !text-[1.625rem] md:!text-base !leading-[1.625rem] md:!leading-snug !min-h-0 !line-clamp-none`}
            >
              קופסת הפתעה
            </h2>
          </div>
          {phase === "loading" ? (
            <p className={`mt-0.5 text-xs md:text-sm ${T.tileSub}`}>טוען...</p>
          ) : phase === "error" ? (
            <p className="mt-0.5 text-xs md:text-sm text-rose-600">{errorHe}</p>
          ) : ready ? (
            <p className="mt-0.5 text-xs md:text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {pendingBoxCount > 1
                ? `${pendingBoxCount} קופסאות מוכנות לפתיחה!`
                : "קופסת הפתעה מוכנה!"}
            </p>
          ) : secondsRemaining != null ? (
            <p className={`mt-0.5 text-xs md:text-sm ${T.tileSub}`}>
              הקופסה הבאה תהיה מוכנה בעוד{" "}
              <span className="tabular-nums font-semibold">{formatCountdownHe(secondsRemaining)}</span>
            </p>
          ) : (
            <p className={`mt-0.5 text-xs md:text-sm ${T.tileSub}`}>
              המשיכו ללמוד - בקרוב תגיע קופסה חדשה!
            </p>
          )}
        </div>
        <div className="flex flex-row gap-2 shrink-0 w-full md:w-auto min-w-0">
          <button
            type="button"
            disabled={!canOpen}
            onClick={() => onOpen?.()}
            className={`${T.ctaSurpriseOpen} ${compactBtn}`}
          >
            פתח קופסה
          </button>
          <Link href="/student/cards" className={`${T.ctaCollection} ${compactBtn}`}>
            לאוסף שלי
          </Link>
          <div className="hidden md:contents">
            <StudentShareFriendsButton variant="desktop-surprise" />
          </div>
        </div>
      </div>
    </section>
  );
}
