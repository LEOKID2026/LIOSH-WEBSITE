import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { studentAvatarFromHomeSummary } from "../../../lib/learning-client/studentHomeAvatarFromSummary.js";
import {
  DEMO_ARCADE_AVATAR,
  DEMO_ARCADE_HISTORY,
  DEMO_ARCADE_PROFILE,
} from "../../demo/demo-display-fixtures.js";
import { isDemoMode } from "../../../lib/demo/demo-mode.client.js";
import StudentLearningAvatar from "./StudentLearningAvatar.jsx";

function applyDemoProfileState(setters) {
  setters.setProfile({ ...DEMO_ARCADE_PROFILE });
  setters.setDisplayName(DEMO_ARCADE_PROFILE.displayName);
  setters.setHistory([...DEMO_ARCADE_HISTORY]);
  setters.setAvatarEmoji(DEMO_ARCADE_AVATAR.avatarEmoji);
  setters.setAvatarCustomDataUrl(DEMO_ARCADE_AVATAR.avatarCustomDataUrl);
  setters.setAvatarBackgroundKey(DEMO_ARCADE_AVATAR.avatarBackgroundKey);
}

/** @param {{ gh: Record<string, string>, demoMode?: boolean }} props */
export default function ArcadeClubProfilePanel({ gh, demoMode: demoModeProp = false }) {
  const demoMode = demoModeProp || isDemoMode();
  const [profile, setProfile] = useState(demoMode ? { ...DEMO_ARCADE_PROFILE } : null);
  const [history, setHistory] = useState(demoMode ? [...DEMO_ARCADE_HISTORY] : []);
  const [displayName, setDisplayName] = useState(demoMode ? DEMO_ARCADE_PROFILE.displayName : "");
  const [avatarEmoji, setAvatarEmoji] = useState(
    demoMode ? DEMO_ARCADE_AVATAR.avatarEmoji : "👤",
  );
  const [avatarCustomDataUrl, setAvatarCustomDataUrl] = useState(
    demoMode ? DEMO_ARCADE_AVATAR.avatarCustomDataUrl : "",
  );
  const [avatarBackgroundKey, setAvatarBackgroundKey] = useState(
    demoMode ? DEMO_ARCADE_AVATAR.avatarBackgroundKey : "sky",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [meRes, histRes, homeRes] = await Promise.all([
      fetch("/api/arcade/profile/me"),
      fetch("/api/arcade/history?limit=10"),
      fetch("/api/student/home-profile/summary"),
    ]);
    const meJson = await meRes.json().catch(() => ({}));
    const histJson = await histRes.json().catch(() => ({}));
    const homeJson = await homeRes.json().catch(() => ({}));
    if (meJson?.ok) {
      setProfile(meJson.profile);
      setDisplayName(meJson.profile?.displayName || "");
    }
    if (histJson?.ok) setHistory(histJson.history || []);
    if (homeJson?.profile) {
      const avatar = studentAvatarFromHomeSummary(homeJson);
      setAvatarEmoji(avatar.avatarEmoji);
      setAvatarCustomDataUrl(avatar.avatarCustomDataUrl);
      setAvatarBackgroundKey(avatar.avatarBackgroundKey);
    }
  }, []);

  useEffect(() => {
    if (demoMode) {
      applyDemoProfileState({
        setProfile,
        setDisplayName,
        setHistory,
        setAvatarEmoji,
        setAvatarCustomDataUrl,
        setAvatarBackgroundKey,
      });
      return undefined;
    }
    void load();
  }, [demoMode, load]);

  const saveName = async () => {
    if (demoMode) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/arcade/profile/display-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(json.ok ? "שם תצוגה עודכן" : json.error || "שגיאה");
      if (json.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return <div className={gh.skeleton} aria-hidden />;
  }

  return (
    <div className={`${gh.arcadePanelProfile || gh.card} space-y-4 text-right`} dir="rtl">
      <h3 className={gh.arcadeSectionTitle || gh.sectionTitle}>כרטיס שחקן</h3>

      {demoMode ? (
        <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
          תצוגת הדגמה — נתונים קבועים, ללא שמירה.
        </p>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <StudentLearningAvatar
            avatarEmoji={avatarEmoji}
            avatarCustomDataUrl={avatarCustomDataUrl}
            avatarBackgroundKey={avatarBackgroundKey}
            sizeClass="h-14 w-14 text-2xl"
          />
          {demoMode ? null : (
            <Link
              href="/student/home"
              className={`text-[11px] font-semibold underline ${gh.arcadePanelBlurb || gh.cardBlurb}`}
            >
              שנה תמונה בדף הבית
            </Link>
          )}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className={`text-lg font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>{profile.displayName}</p>
          {!demoMode && profile.fullName ? (
            <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>שם רשמי (הורה): {profile.fullName}</p>
          ) : null}
          <p className={`mt-1 text-sm ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
            ניצחונות: {profile.totalWins ?? 0} · משחקים: {profile.totalGames ?? 0}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-emerald-200/80 pt-4">
        <label className={`block text-sm font-semibold ${gh.arcadeEntryLabel || gh.entryLabel}`}>שם משחק:</label>
        {demoMode ? (
          <p className={`text-sm ${gh.arcadePanelBlurb || gh.cardBlurb}`}>{DEMO_ARCADE_PROFILE.displayName}</p>
        ) : (
          <>
            <p className={`text-[11px] ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
              שם תצוגה למשחקים בלבד - לא משנה את השם הרשמי או מספר ליאו.
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                className={`${gh.input} w-full min-w-0 sm:flex-1`}
                maxLength={20}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="שם תצוגה"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveName()}
                className={`${gh.btnJoinCode} w-full sm:w-auto sm:shrink-0`}
              >
                שמור שם
              </button>
            </div>
            {message ? <p className={`text-sm ${gh.userMessage}`}>{message}</p> : null}
          </>
        )}
      </div>

      <div className="border-t border-emerald-200/80 pt-4">
        <h4 className={`mb-2 font-semibold ${gh.arcadeSectionTitle || gh.sectionTitle}`}>היסטוריה אחרונה</h4>
        {!history.length ? (
          <p className={gh.arcadeEmptyText || gh.emptyText}>אין משחקים עדיין</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className={gh.arcadeRoomItem || gh.roomItem}>
                <span>{h.gameKey || "משחק"} · </span>
                <span>{h.resultType || "-"} · </span>
                <span>+{h.rewardAmount || 0} מטבעות</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
