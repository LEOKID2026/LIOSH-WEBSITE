import { LEVELS, GRADES, GRADE_LEVELS, TOPICS, STORAGE_KEY } from "./moledet-geography-constants.js";

// מחזיר את ההגדרות האקטואליות לפי כיתה + רמת קושי
export function getLevelConfig(grade, levelKey) {
  const safeGrade = Math.min(6, Math.max(1, grade || 1));
  const gradeCfg = GRADE_LEVELS[safeGrade];
  const gradeKey = `g${safeGrade}`;
  const gradeCfgGrades = GRADES[gradeKey] || GRADES.g3;

  let levelData;
  if (gradeCfg && gradeCfg.levels && gradeCfg.levels[levelKey]) {
    levelData = gradeCfg.levels[levelKey];
  } else {
    levelData = LEVELS[levelKey] || LEVELS.easy;
  }

  if (!levelData) {
    console.warn(`Invalid level config for grade ${grade}, level ${levelKey}, using default`);
    levelData = LEVELS.easy;
  }

  const result = {
    ...levelData,
    name: levelData.name || LEVELS[levelKey]?.name || "קל",
  };
  
  return result;
}

export function getLevelForGrade(levelKey, gradeKey) {
  const base = LEVELS[levelKey] || LEVELS.easy;
  const gradeCfg = GRADES[gradeKey] || GRADES.g3;

  return {
    name: base.name,
  };
}

// Build top 10 scores by score (highest first)
export function buildTop10ByScore(saved, level) {
  const allScores = [];

  Object.keys(TOPICS).forEach((topic) => {
    const key = `${level}_${topic}`;
    const levelData = saved[key] || [];

    if (Array.isArray(levelData)) {
      levelData.forEach((entry) => {
        const bestScore = entry.bestScore ?? entry.score ?? 0;
        const bestStreak = entry.bestStreak ?? entry.streak ?? 0;

        if (bestScore > 0) {
          allScores.push({
            name: entry.playerName || entry.name || "Player",
            bestScore,
            bestStreak,
            topic: topic,
            timestamp: entry.timestamp || 0,
          });
        }
      });
    } else {
      Object.entries(levelData).forEach(([name, data]) => {
        const bestScore = data.bestScore ?? data.score ?? 0;
        const bestStreak = data.bestStreak ?? data.streak ?? 0;

        if (bestScore > 0) {
          allScores.push({
            name,
            bestScore,
            bestStreak,
            topic: topic,
            timestamp: data.timestamp || 0,
          });
        }
      });
    }
  });

  // Sort: first by score, then by streak, then by timestamp (newer first)
  const sorted = allScores
    .sort((a, b) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return (b.timestamp || 0) - (a.timestamp || 0);
    })
    .slice(0, 10);

  // If there are fewer than 10 records, fill with placeholders
  while (sorted.length < 10) {
    sorted.push({
      name: "-",
      bestScore: 0,
      bestStreak: 0,
      topic: "",
      timestamp: 0,
      placeholder: true,
    });
  }

  return sorted;
}

// Save score entry - handles conversion from old format (object) to new format (array)
export function saveScoreEntry(saved, key, entry) {
  let levelData = saved[key];

  if (!levelData) {
    levelData = [];
  } else if (!Array.isArray(levelData)) {
    levelData = Object.entries(levelData).map(([name, data]) => ({
      playerName: name,
      bestScore: data.bestScore ?? data.score ?? 0,
      bestStreak: data.bestStreak ?? data.streak ?? 0,
      timestamp: data.timestamp || 0,
    }));
  }

  levelData.push(entry);

  // Limit to 100 entries
  if (levelData.length > 100) {
    levelData = levelData.slice(-100);
  }

  saved[key] = levelData;
}

