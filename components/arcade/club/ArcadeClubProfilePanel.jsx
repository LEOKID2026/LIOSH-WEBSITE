import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { studentAvatarFromHomeSummary } from "../../../lib/learning-client/studentHomeAvatarFromSummary.js";
import StudentLearningAvatar from "./StudentLearningAvatar.jsx";

/** @param {{ gh: Record<string, string> }} props */
export default function ArcadeClubProfilePanel({ gh }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [avatarCustomDataUrl, setAvatarCustomDataUrl] = useState("");
  const [avatarBackgroundKey, setAvatarBackgroundKey] = useState("sky");
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
    void load();
  }, [load]);

  const saveName = async () => {
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

      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <StudentLearningAvatar
            avatarEmoji={avatarEmoji}
            avatarCustomDataUrl={avatarCustomDataUrl}
            avatarBackgroundKey={avatarBackgroundKey}
            sizeClass="h-14 w-14 text-2xl"
          />
          <Link href="/student/home" className={`text-[11px] font-semibold underline ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
            שנה תמונה בדף הבית
          </Link>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className={`text-lg font-bold ${gh.arcadePanelTitle || gh.cardTitle}`}>{profile.displayName}</p>
          {profile.fullName ? (
            <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>שם רשמי (הורה): {profile.fullName}</p>
          ) : null}
          <p className={`mt-1 text-sm ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
            ניצחונות: {profile.totalWins} · משחקים: {profile.totalGames}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-emerald-200/80 pt-4">
        <label className={`block text-sm font-semibold ${gh.arcadeEntryLabel || gh.entryLabel}`}>שם משחק:</label>
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
