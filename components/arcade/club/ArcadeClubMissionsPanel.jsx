import { useCallback, useEffect, useState } from "react";
import { DEMO_ARCADE_MISSIONS } from "../../demo/demo-display-fixtures.js";
import { isDemoMode } from "../../../lib/demo/demo-mode.client.js";

/** @param {{ gh: Record<string, string>, className?: string, demoMode?: boolean }} props */
export default function ArcadeClubMissionsPanel({ gh, className = "", demoMode: demoModeProp = false }) {
  const demoMode = demoModeProp || isDemoMode();
  const [missions, setMissions] = useState(demoMode ? DEMO_ARCADE_MISSIONS.missions : []);
  const [achievements, setAchievements] = useState(demoMode ? DEMO_ARCADE_MISSIONS.achievements : []);
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
    if (demoMode) {
      setMissions(DEMO_ARCADE_MISSIONS.missions);
      setAchievements(DEMO_ARCADE_MISSIONS.achievements);
      setLocked(DEMO_ARCADE_MISSIONS.featureLocked);
      return undefined;
    }
    void load();
  }, [demoMode, load]);

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
        {!achievements.length ? (
          <p className={gh.arcadeEmptyText || gh.emptyText}>אין הישגים עדיין</p>
        ) : (
          <ul className="space-y-1">
            {achievements.map((a) => (
              <li key={a.id || a.achievementId} className={gh.arcadeRoomItem || gh.roomItem}>
                {a.titleHe || a.labelHe || "הישג"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
