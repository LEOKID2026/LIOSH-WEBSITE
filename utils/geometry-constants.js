// קבועים לדף הגאומטריה

export const LEVELS = {
  easy: {
    name: "קל",
    maxSide: 10,
    decimals: false,
  },
  medium: {
    name: "בינוני",
    maxSide: 20,
    decimals: true,
  },
  hard: {
    name: "קשה",
    maxSide: 50,
    decimals: true,
  },
};

export const PI = 3.14;

export const TOPICS = {
  shapes_basic: { name: "צורות בסיסיות", description: "הכרת מצולעים", icon: "🔷" },
  /** Default subtitles — detailed grades א׳–ג׳ use `topicDescriptionForCurriculumPage` on the curriculum page */
  area: { name: "שטח", description: "חישוב שטח", icon: "📐" },
  perimeter: { name: "היקף", description: "חישוב היקף", icon: "📏" },
  volume: { name: "נפח", description: "חישוב נפח", icon: "📦" },
  angles: { name: "זוויות", description: "זוויות", icon: "📐" },
  parallel_perpendicular: { name: "מקבילות ומאונכות", description: "מקבילות ומאונכות", icon: "📐" },
  triangles: { name: "משולשים", description: "מיון משולשים", icon: "🔺" },
  quadrilaterals: { name: "מרובעים", description: "מיון מרובעים", icon: "⬜" },
  transformations: { name: "טרנספורמציות", description: "הזזה, שיקוף, סיבוב", icon: "🔄" },
  rotation: { name: "סיבוב", description: "סיבוב", icon: "🔄" },
  symmetry: { name: "סימטרייה", description: "סימטרייה", icon: "✨" },
  diagonal: { name: "אלכסון", description: "אלכסון", icon: "📐" },
  heights: { name: "גבהים", description: "גבהים", icon: "📏" },
  tiling: { name: "ריצוף", description: "ריצוף", icon: "🔲" },
  circles: { name: "מעגל ועיגול", description: "מעגל ועיגול", icon: "⭕" },
  solids: { name: "גופים", description: "גופים תלת-מימדיים", icon: "📦" },
  pythagoras: { name: "פיתגורס", description: "משפט פיתגורס", icon: "🔺" },
  mixed: { name: "ערבוב", description: "ערבוב", icon: "🎲" },
};

/**
 * Subtitles for כיתות א׳–ג׳ on the curriculum transparency page (מדידות וגאומטריה).
 * phrasing: היכרות / זיהוי / השוואה / מדידות — not “formal calculation only”.
 */
export const TOPIC_DESCRIPTION_LOW_GRADES = {
  g1: {
    shapes_basic: "הכרת מצולעים - זיהוי ריבוע ומלבן והשוואה בסיסית",
    transformations: "הזזה ושיקוף - היכרות (ברמה המקובלת לכיתה א׳, ללא סיבוב נפרד)",
  },
  g2: {
    shapes_basic: "צורות במישור - זיהוי והשוואה",
    area: "מדידות שטח - היכרות, השוואה וכיסוי (לפי רמת הקושי במוצר)",
    solids: "מצולעים וגופים - היכרות ושמות גופים תלת ממדיים",
    transformations: "שיקוף והזזה - המשך היכרות",
  },
  g3: {
    shapes_basic: "צורות במישור - הרחבת זיהוי",
    angles: "זוויות - סיווג והיכרות",
    parallel_perpendicular: "מקבילות ומאונכות במישור",
    triangles: "משולשים - מיון והיכרות",
    quadrilaterals: "מרובעים - מיון והיכרות",
    area: "שטח - מדידות והשוואה (עומק לפי רמה)",
    perimeter: "היקף - מדידה והיכרות במצולעים",
    rotation: "סיבוב במישור - היכרות בסיסית",
    solids: "גופים תלת ממדיים - היכרות ושמות",
  },
};

/** כיתות ד׳–ו׳ — ניסוח עמוק יותר מ«חישוב בלבד» בעמוד השקיפות בלבד */
export const TOPIC_DESCRIPTION_MID_HIGH_GRADES = {
  g4: {
    shapes_basic: "צורות במישור - תכונות ריבוע ומלבן והרחבה",
    angles: "זוויות - סיווג והמשך פיתוח",
    parallel_perpendicular: "מקבילות ומאונכות - יישום במצולעים",
    triangles: "משולשים - תכונות וסיווג",
    quadrilaterals: "מרובעים - תכונות וסיווג",
    diagonal: "אלכסונים במצולעים - היכרות ותרגול",
    symmetry: "סימטרייה במישור",
    area: "שטח - מדידות, השוואה וחישובים לפי רמה",
    perimeter: "היקף - מדידה וחישוב במצולעים",
    volume: "נפח תיבה - היכרות ומדידות בסיסיות",
    solids: "גופים תלת ממדיים - היכרות לפני נפח",
  },
  g5: {
    angles: "זוויות - יישום במצולעים",
    parallel_perpendicular: "מקבילות ומאונכות - קשר לצורות",
    quadrilaterals: "מרובעים - תכונות, מיון וקשרי הכלה",
    solids: "גופים תלת ממדיים - היכרות ושטח פנים",
    diagonal: "אלכסונים - כולל הקשר במרובעים",
    heights: "גבהים - קשר לשטח במשולשים ובמרובעים",
    tiling: "ריצוף במישור - היכרות ודוגמאות",
    area: "שטח - חישובים והשוואות לפי צורה",
    perimeter: "היקף - חישוב במצולעים מורכבים יותר",
    volume: "נפח - תיבות וגופים מוכרים",
  },
  g6: {
    solids: "גופים משוכללים - נפח ושטח פנים לפי רמה",
    circles: "מעגל ועיגול - היקף ושטח",
    volume: "נפח - גופים שונים לפי רמה",
    area: "שטח - יישומים כולל צורות מורכבות",
    perimeter: "היקף - יישומים כולל מעגל",
    angles: "זוויות - יישום במצולשים ובבעיות",
    pythagoras: "משפט פיתגורס - משולש ישר זווית",
  },
};

/**
 * @param {string} gradeKey g1..g6
 * @param {string} topicKey
 */
export function topicDescriptionForCurriculumPage(gradeKey, topicKey) {
  const low = TOPIC_DESCRIPTION_LOW_GRADES[gradeKey]?.[topicKey];
  if (low) return low;
  const mid = TOPIC_DESCRIPTION_MID_HIGH_GRADES[gradeKey]?.[topicKey];
  if (mid) return mid;
  return TOPICS[topicKey]?.description || "";
}

// עדכון ל-6 כיתות נפרדות (א', ב', ג', ד', ה', ו')
export const GRADES = {
  g1: {
    name: "כיתה א'",
    topics: ["shapes_basic", "transformations"], // הכרת מצולעים, הזזה/שיקוף
    shapes: ["square", "rectangle"],
  },
  g2: {
    name: "כיתה ב'",
    topics: ["shapes_basic", "area", "solids", "transformations"], // צורות בסיסיות + מדידות שטח, גופים, טרנספורמציות
    shapes: ["square", "rectangle", "cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"],
  },
  g3: {
    name: "כיתה ג'",
    topics: ["shapes_basic", "angles", "parallel_perpendicular", "triangles", "quadrilaterals", "area", "perimeter", "rotation", "solids"], // היכרות צורות; מאונכות/מקבילות; משולשים/מרובעים; מדידות; סיבוב; גופים
    shapes: ["triangle", "square", "rectangle", "cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"],
  },
  g4: {
    name: "כיתה ד'",
    topics: [
      "shapes_basic",
      "angles",
      "parallel_perpendicular",
      "triangles",
      "quadrilaterals",
      "diagonal",
      "symmetry",
      "area",
      "perimeter",
      "volume",
      "solids",
    ], // מצולעים, זוויות, מקבילות/מאונכות, משולשים/מרובעים, אלכסון, סימטרייה, מדידות, נפח תיבה, גופים
    shapes: ["square", "rectangle", "triangle", "circle", "rectangular_prism", "cube"],
  },
  g5: {
    name: "כיתה ה'",
    topics: ["angles", "parallel_perpendicular", "quadrilaterals", "solids", "diagonal", "heights", "tiling", "area", "perimeter", "volume", "mixed"], // גופים מוכרים נשארים זמינים לצד נושאי מישור
    shapes: ["square", "rectangle", "triangle", "circle", "parallelogram", "trapezoid", "rectangular_prism", "cube"],
  },
  g6: {
    name: "כיתה ו'",
    topics: ["solids", "circles", "volume", "area", "perimeter", "angles", "triangles", "pythagoras", "mixed"], // גופים, מעגל ועיגול, חישובי נפחים, שטח, היקף, זוויות, משולשים, פיתגורס, ערבוב (symmetry G4 per oracle)
    shapes: ["square", "rectangle", "triangle", "circle", "parallelogram", "trapezoid", "cylinder", "sphere", "cube", "rectangular_prism", "pyramid", "cone", "prism"],
  },
};

// מיפוי נושאים לצורות לפי כיתה
export const TOPIC_SHAPES = {
  shapes_basic: {
    g1: ["square", "rectangle"], // הכרת מצולעים - כיתה א'
    g2: ["square", "rectangle"],
    g3: ["square", "rectangle", "triangle"],
    g4: ["square", "rectangle"], // ריבוע ומלבן (תכונות) - כיתה ד'
  },
  area: {
    g2: ["square", "rectangle"],
    g3: ["square", "rectangle"], // triangle area formula gated to G5+ (geometry-curriculum-gates.js)
    g4: ["square", "rectangle"],
    g5: ["square", "rectangle", "triangle", "parallelogram", "trapezoid"],
    g6: ["square", "rectangle", "triangle", "parallelogram", "trapezoid", "circle"],
  },
  perimeter: {
    g3: ["square", "rectangle", "triangle"], // מדידת היקף של מצולע - כיתה ג'
    g4: ["square", "rectangle", "triangle"],
    g5: ["square", "rectangle", "triangle"],
    g6: ["square", "rectangle", "triangle", "circle"],
  },
  volume: {
    g4: ["rectangular_prism", "cube"], // תיבות - כיתה ד'
    g5: ["rectangular_prism", "cube"],
    g6: ["rectangular_prism", "cube", "cylinder", "sphere", "pyramid", "cone", "prism"], // כיתה ו' - כולל מנסרה
  },
  angles: {
    g3: ["triangle", "quadrilateral"],
    g5: ["triangle", "quadrilateral"],
    g6: ["triangle"],
  },
  parallel_perpendicular: {
    g3: ["square", "rectangle", "quadrilateral"],
    g5: ["square", "rectangle", "parallelogram", "trapezoid"],
  },
  triangles: {
    g3: ["triangle"],
    g6: ["triangle"],
  },
  quadrilaterals: {
    g3: ["square", "rectangle", "quadrilateral"],
    g5: ["square", "rectangle", "parallelogram", "trapezoid"],
  },
  transformations: {
    g1: ["square", "rectangle"],
    g2: ["square", "rectangle"],
  },
  rotation: {
    g3: ["square", "rectangle", "triangle"],
  },
  symmetry: {
    g4: ["square", "rectangle", "triangle"],
    g6: ["square", "rectangle", "triangle"],
  },
  diagonal: {
    g4: ["square", "rectangle"], // אלכסון - כיתה ד'
    g5: ["square", "rectangle", "parallelogram"], // אלכסון - כיתה ה'
  },
  heights: {
    g5: ["triangle", "parallelogram", "trapezoid"],
  },
  tiling: {
    g5: ["square", "triangle"], // ריצוף במצולעים משוכללים - כיתה ה'
  },
  circles: {
    g6: ["circle"],
  },
  solids: {
    g2: ["cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"], // גופים - כיתה ב'
    g3: ["cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"],
    g4: ["cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"],
    g5: ["cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"],
    g6: ["cube", "rectangular_prism", "cylinder", "pyramid", "cone", "sphere"], // גופים משוכללים - כיתה ו'
  },
  pythagoras: {
    g6: ["triangle"],
  },
};

export function getShapesForTopic(gradeKey, topicKey) {
  const cfg = TOPIC_SHAPES[topicKey];
  if (cfg && cfg[gradeKey] && cfg[gradeKey].length > 0) {
    return cfg[gradeKey];
  }
  // אם אין הגדרה ספציפית, נחזיר את הצורות הכלליות של הכיתה
  return GRADES[gradeKey]?.shapes || [];
}

export const MODES = {
  learning: { name: "למידה", description: "ללא סיום משחק, תרגול בקצב שלך" },
  challenge: { name: "אתגר", description: "טיימר + חיים, מרוץ ניקוד גבוה" },
  speed: { name: "מהירות", description: "תשובות מהירות = יותר נקודות! ⚡" },
  marathon: { name: "מרתון", description: "כמה שאלות תוכל לפתור? 🏃" },
  practice: { name: "תרגול", description: "התמקד בנושא אחד 📚" },
};

export const STORAGE_KEY = "mleo_geometry_master";

