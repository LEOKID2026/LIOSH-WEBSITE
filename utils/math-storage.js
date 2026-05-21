import { LEVELS, GRADES, GRADE_LEVELS, OPERATIONS, STORAGE_KEY } from './math-constants.js';

// מחזיר את ההגדרות האקטואליות לפי כיתה + רמת קושי
export function getLevelConfig(grade, levelKey) {
  const safeGrade = Math.min(6, Math.max(1, grade || 1));
  const gradeCfg = GRADE_LEVELS[safeGrade];
  const gradeKey = `g${safeGrade}`; // g1, g2, g3, g4, g5, g6
  const gradeCfgGrades = GRADES[gradeKey] || GRADES.g3;

  let levelData;
  if (gradeCfg && gradeCfg.levels && gradeCfg.levels[levelKey]) {
    levelData = gradeCfg.levels[levelKey];
  } else {
    // אם משום מה אין – נופלים להגדרות הכלליות
    levelData = LEVELS[levelKey] || LEVELS.easy;
  }

  // לוודא שיש ערך תקין
  if (!levelData) {
    console.warn(`Invalid level config for grade ${grade}, level ${levelKey}, using default`);
    levelData = LEVELS.easy;
  }

  // מוסיפים שדות נוספים שנדרשים
  // אם אין כפל/חילוק/שברים בכיתה - לא נוסיף אותם
  const result = {
    ...levelData,
    name: levelData.name || LEVELS[levelKey]?.name || "קל",
    allowNegatives: gradeCfgGrades.allowNegatives && levelKey === "hard",
    allowTwoStep: levelKey !== "easy" && safeGrade >= 5,
    allowFractions: gradeCfgGrades.allowFractions,
  };
  
  // אם אין כפל/חילוק/שברים בכיתה - נסיר אותם מהתוצאה
  if (!gradeCfgGrades.operations.includes("multiplication")) {
    delete result.multiplication;
  }
  if (!gradeCfgGrades.operations.includes("division")) {
    delete result.division;
  }
  if (!gradeCfgGrades.allowFractions) {
    delete result.fractions;
  }
  
  // הסרת פעולות שלא מוגדרות בכיתה
  const operationsToCheck = [
    "percentages", "sequences", "decimals", "rounding", 
    "divisibility", "prime_composite", "powers", "ratio",
    "order_of_operations", "estimation", "properties_0_1",
    "decimal_measures", "scale",
    "equations", "compare", "number_sense", "factors_multiples", "word_problems"
  ];
  
  operationsToCheck.forEach(op => {
    if (!gradeCfgGrades.operations.includes(op)) {
      delete result[op];
    }
  });

  // שדות שהגנרטור בודק ברמת השורש (לא רק תחת decimals)
  if (result.decimals?.repeatingDecimals) {
    result.repeatingDecimals = true;
  }

  return result;
}

export function getLevelForGrade(levelKey, gradeKey) {
  const base = LEVELS[levelKey] || LEVELS.easy;
  const gradeCfg = GRADES[gradeKey] || GRADES.g3;

  let factor = 1;
  let allowNegatives = false;
  let allowTwoStep = false;

  // 6 כיתות נפרדות
  if (gradeKey === "g1" || gradeKey === "g2") {
    factor = 0.6;
  } else if (gradeKey === "g3" || gradeKey === "g4") {
    factor = 1;
  } else if (gradeKey === "g5" || gradeKey === "g6") {
    factor = 1.4;
    allowNegatives = gradeCfg.allowNegatives;
    allowTwoStep = levelKey !== "easy";
  }

  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const scale = (n, min, max) => clamp(Math.round(n * factor), min, max);

  const additionMax = scale(base.addition?.max || 20, 10, 999);
  const subMax = scale(base.subtraction?.max || 20, 10, 999);
  const subMin =
    base.subtraction?.min != null ? Math.round(base.subtraction.min * factor) : 0;
  const mulMax = scale(base.multiplication?.max || 10, 3, 20);
  const divMax = scale(base.division?.max || 50, 10, 999);
  const maxDivisor = base.division?.maxDivisor || 12;

  let maxDen = base.fractions?.maxDen || 4;
  if (!gradeCfg.allowFractions) {
    maxDen = 0;
  } else if (gradeKey === "g3" || gradeKey === "g4") {
    maxDen = Math.min(maxDen, 8);
  } else if (gradeKey === "g5" || gradeKey === "g6") {
    maxDen = Math.min(Math.max(maxDen, 8), 12);
  }

  return {
    name: base.name,
    addition: { max: additionMax },
    subtraction: { min: subMin, max: subMax },
    multiplication: { max: mulMax },
    division: { max: divMax, maxDivisor },
    fractions: { maxDen },
    allowNegatives,
    allowTwoStep,
    allowFractions: gradeCfg.allowFractions,
  };
}

// Build top 10 scores by score (highest first)
export function buildTop10ByScore(saved, level) {
  const allScores = [];

  OPERATIONS.forEach((op) => {
    const key = `${level}_${op}`;
    const levelData = saved[key] || [];

    if (Array.isArray(levelData)) {
      // New format – array
      levelData.forEach((entry) => {
        const bestScore = entry.bestScore ?? entry.score ?? 0;
        const bestStreak = entry.bestStreak ?? entry.streak ?? 0;

        if (bestScore > 0) {
          allScores.push({
            name: entry.playerName || entry.name || "Player",
            bestScore,
            bestStreak,
            operation: op,
            timestamp: entry.timestamp || 0,
          });
        }
      });
    } else {
      // Old format – object { [name]: {bestScore, bestStreak...} }
      Object.entries(levelData).forEach(([name, data]) => {
        const bestScore = data.bestScore ?? data.score ?? 0;
        const bestStreak = data.bestStreak ?? data.streak ?? 0;

        if (bestScore > 0) {
          allScores.push({
            name,
            bestScore,
            bestStreak,
            operation: op,
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
      operation: "",
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
    // Nothing exists – start with new array
    levelData = [];
  } else if (!Array.isArray(levelData)) {
    // Old format: convert to array of entries
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

