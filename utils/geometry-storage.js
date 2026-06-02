// פונקציות אחסון וניהול ניקוד לדף הגאומטריה

import { LEVELS, TOPICS, GRADES } from "./geometry-constants.js";

export function getLevelForGrade(levelKey, gradeKey) {
  const base = LEVELS[levelKey];
  let factor = 1;

  // התאמה לפי כיתה - עדכון ל-6 כיתות
  switch (gradeKey) {
    case "g1":
    case "g2":
      factor = 0.3;
      break;
    case "g3":
      factor = 0.5;
      break;
    case "g4":
      factor = 0.7;
      break;
    case "g5":
      factor = 1;
      break;
    case "g6":
      factor = 1.5;
      break;
    default:
      factor = 1;
  }

  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  let decimals = base.decimals;
  // כיתות א'-ג' ללא עשרוניים
  if (gradeKey === "g1" || gradeKey === "g2" || gradeKey === "g3") {
    decimals = false;
  }

  return {
    name: base.name,
    maxSide: clamp(Math.round(base.maxSide * factor), 5, 100),
    decimals,
  };
}

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
            topic,
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
            topic,
            timestamp: data.timestamp || 0,
          });
        }
      });
    }
  });
  const sorted = allScores
    .sort((a, b) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return (b.timestamp || 0) - (a.timestamp || 0);
    })
    .slice(0, 10);
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
  if (levelData.length > 100) {
    levelData = levelData.slice(-100);
  }
  saved[key] = levelData;
}

