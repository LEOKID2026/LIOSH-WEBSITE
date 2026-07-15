import { useCallback, useEffect, useState } from "react";

/** @param {{ gh: Record<string, string>, className?: string }} props */
export default function ArcadeClubMissionsPanel({ gh, className = "" }) {
  const [missions, setMissions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    const [mRes, aRes] = await Promise.all([
      fetch("/api/arcade/missions/today"),
      fetch("/api/arcade/achievements"),
    ]);
    const mJson = await mRes.json().catch(() => ({}));
    const aJson = await aRes.json().catch(() => ({}));
    if (mJson?.ok) {
      setMissions(mJson.missions || []);
      setLocked(mJson.featureLocked === true);
    }
    if (aJson?.ok) setAchievements(aJson.achievements || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (locked) {
    return (
      <div className={`${gh.arcadePanelMissions || gh.card} text-right ${className}`} dir="rtl">
        <p className={gh.arcadePanelBlurb || gh.cardBlurb}>משימות יומיות - נשלט דרך Admin. כרגע לא פתוח לאורחים.</p>
      </div>
    );
  }

  return (
    <div className={`${gh.arcadePanelMissions || gh.card} space-y-4 text-right ${className}`} dir="rtl">
      <h3 className={gh.arcadeSectionTitle || gh.sectionTitle}>משימות היום</h3>
      <ul className="space-y-2">
        {missions.map((m) => (
          <li key={m.missionId} className={gh.arcadeRoomItem || gh.roomItem}>
            <p className={`font-medium ${gh.arcadePanelTitle || gh.cardTitle}`}>{m.descriptionHe}</p>
            <p className={`text-xs ${gh.arcadePanelBlurb || gh.cardBlurb}`}>
              {m.progress}/{m.goalCount} · +{m.rewardCoins} מטבעות {m.completed ? "✓" : ""}
            </p>
          </li>
        ))}
        {!missions.length ? <li className={gh.arcadeEmptyText || gh.emptyText}>אין משימות היום</li> : null}
      </ul>

      <div>
        <h4 className={`mb-2 font-semibold ${gh.arcadeSectionTitle || gh.sectionTitle}`}>הישגים</h4>
        <ul className="space-y-2">
          {achievements.map((a) => (
            <li key={a.achievementId || a.key} className={gh.arcadeRoomItem || gh.roomItem}>
              <span>{a.nameHe || a.key}</span>
              {a.unlocked ? " 🏅" : ""}
            </li>
          ))}
          {!achievements.length ? <li className={gh.arcadeEmptyText || gh.emptyText}>אין הישגים עדיין</li> : null}
        </ul>
      </div>
    </div>
  );
}
