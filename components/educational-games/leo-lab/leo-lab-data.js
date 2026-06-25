/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{
 *   id: string
 *   name: string
 *   icon: string
 *   category?: string
 *   imageSrc?: string
 * }} LabItem */

/** @typedef {{
 *   id: string
 *   difficulty: DifficultyId
 *   title: string
 *   prompt: string
 *   missionIcon?: string
 *   pickCount: number
 *   validItems: string[]
 *   exactMatch?: boolean
 *   resultText: string
 *   fact: string
 *   resultIcon: string
 * }} LabExperiment */

export const EXPERIMENTS_PER_LEVEL = 20;

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    shelfCount: 8,
    itemHint: "8 חפצים · בוחרים 2",
    maxMistakes: 6,
  },
  medium: {
    id: "medium",
    label: "בינוני",
    shelfCount: 12,
    itemHint: "12 חפצים · 2–3",
    maxMistakes: 5,
  },
  hard: {
    id: "hard",
    label: "קשה",
    shelfCount: 12,
    itemHint: "12 חפצים · 2–4",
    maxMistakes: 4,
  },
};

/** @type {Record<string, LabItem>} */
export const LAB_ITEMS = {
  water: { id: "water", name: "מים", icon: "💧", category: "נוזל" },
  wood: { id: "wood", name: "עץ", icon: "🪵", category: "מוצק" },
  nail: { id: "nail", name: "מסמר", icon: "🔩", category: "מתכת" },
  magnet: { id: "magnet", name: "מגנט", icon: "🧲", category: "מגנט" },
  plant: { id: "plant", name: "צמח", icon: "🌱", category: "חי" },
  mirror: { id: "mirror", name: "מראה", icon: "🪞", category: "אור" },
  light: { id: "light", name: "אור", icon: "🔦", category: "אור" },
  ice: { id: "ice", name: "קרח", icon: "🧊", category: "קר" },
  battery: { id: "battery", name: "סוללה", icon: "🔋", category: "חשמל" },
  bulb: { id: "bulb", name: "נורה", icon: "💡", category: "חשמל" },
  wire: { id: "wire", name: "חוט", icon: "🧵", category: "חשמל" },
  sun: { id: "sun", name: "שמש", icon: "☀️", category: "אור" },
  soil: { id: "soil", name: "אדמה", icon: "🟫", category: "טבע" },
  bowl: { id: "bowl", name: "קערה", icon: "🥣", category: "כלי" },
  stone: { id: "stone", name: "אבן", icon: "🪨", category: "מוצק" },
  wall: { id: "wall", name: "קיר", icon: "🧱", category: "מוצק" },
  switch: { id: "switch", name: "מתג", icon: "🎛️", category: "חשמל" },
  metal_spoon: { id: "metal_spoon", name: "כפית מתכת", icon: "🥄", category: "מתכת" },
  plastic: { id: "plastic", name: "פלסטיק", icon: "🧴", category: "חומר" },
  paper: { id: "paper", name: "נייר", icon: "📄", category: "חומר" },
  can: { id: "can", name: "פחית", icon: "🥫", category: "מתכת" },
  key: { id: "key", name: "מפתח", icon: "🔑", category: "מתכת" },
};

/** @type {Record<DifficultyId, string[]>} */
export const SHELF_BY_DIFFICULTY = {
  easy: ["magnet", "nail", "metal_spoon", "can", "plant", "water", "sun", "wood"],
  medium: [
    "battery",
    "bulb",
    "wire",
    "magnet",
    "nail",
    "metal_spoon",
    "plant",
    "water",
    "sun",
    "ice",
    "bowl",
    "mirror",
  ],
  hard: [
    "battery",
    "bulb",
    "wire",
    "switch",
    "magnet",
    "nail",
    "metal_spoon",
    "plant",
    "water",
    "sun",
    "soil",
    "stone",
  ],
};

/** @type {LabExperiment[]} */
export const EASY_EXPERIMENTS = [
  {
    id: "easy-magnet-metals",
    difficulty: "easy",
    title: "מצאו חפצים שנמשכים למגנט",
    prompt: "בחרו 2 חפצים מתכתיים שהמגנט ימשוך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["magnet", "nail", "metal_spoon", "can"],
    resultText: "מעולה! המגנט מושך מתכות.",
    fact: "מגנט מושך חלק מהמתכות.",
    resultIcon: "✨",
  },
  {
    id: "easy-plant-drink",
    difficulty: "easy",
    title: "עזרו לצמח לשתות",
    prompt: "בחרו 2 דברים שיעזרו לצמח",
    missionIcon: "🌱",
    pickCount: 2,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! הצמח שותה וגדל.",
    fact: "לצמחים צריך מים כדי לגדול.",
    resultIcon: "💧",
  },
  {
    id: "easy-warm-water",
    difficulty: "easy",
    title: "המיסו את הקרח",
    prompt: "בחרו 2 דברים שיעזרו לקרח להימס",
    missionIcon: "🧊",
    pickCount: 2,
    validItems: ["sun", "water", "plant", "wood"],
    resultText: "מעולה! חום ומים עוזרים לקרח להימס.",
    fact: "חום גורם לקרח להפוך למים.",
    resultIcon: "💦",
  },
  {
    id: "easy-shadow",
    difficulty: "easy",
    title: "צרו צל",
    prompt: "בחרו 2 חפצים שיוצרים צל",
    missionIcon: "🌓",
    pickCount: 2,
    validItems: ["sun", "wood", "magnet", "plant"],
    resultText: "מעולה! נוצר צל.",
    fact: "גוף אטום חוסם אור ויוצר צל.",
    resultIcon: "🌑",
  },
  {
    id: "easy-float",
    difficulty: "easy",
    title: "בדקו מה צף במים",
    prompt: "בחרו 2 חפצים לבדיקה במים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "wood", "plant", "can"],
    resultText: "מעולה! העץ צף על המים.",
    fact: "חומרים קלים יותר מהמים עלולים לצוף.",
    resultIcon: "🪵",
  },
  {
    id: "easy-sink",
    difficulty: "easy",
    title: "בדקו מה שוקע במים",
    prompt: "בחרו 2 חפצים לבדיקה במים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "nail", "metal_spoon", "can"],
    resultText: "מעולה! המתכת שוקעת.",
    fact: "חומרים כבדים יותר מהמים עלולים לשקוע.",
    resultIcon: "🪨",
  },
  {
    id: "easy-reflect",
    difficulty: "easy",
    title: "החזירו אור",
    prompt: "בחרו 2 חפצים שקשורים לאור",
    missionIcon: "🔦",
    pickCount: 2,
    validItems: ["sun", "water", "magnet", "wood"],
    resultText: "מעולה! השמש מאירה.",
    fact: "מקור אור מאיר את הסביבה.",
    resultIcon: "🌟",
  },
  {
    id: "easy-water-fit",
    difficulty: "easy",
    title: "בחרו חפצים שמתאימים למים",
    prompt: "בחרו 2 חפצים לניסוי עם מים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "wood", "plant", "can"],
    resultText: "מעולה! אפשר לבדוק במים.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🧪",
  },
  {
    id: "easy-plant-three",
    difficulty: "easy",
    title: "הזינו צמח",
    prompt: "בחרו 3 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! לצמח יש מים ואור.",
    fact: "צמח צריך מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "easy-light-three",
    difficulty: "easy",
    title: "האירו את החדר",
    prompt: "בחרו 3 חפצים שקשורים לאור",
    missionIcon: "☀️",
    pickCount: 3,
    validItems: ["sun", "water", "plant", "magnet"],
    resultText: "מעולה! האור מאיר.",
    fact: "מקור אור מאיר את הסביבה.",
    resultIcon: "🌟",
  },
  {
    id: "easy-metal-three",
    difficulty: "easy",
    title: "אספו מתכות",
    prompt: "בחרו 3 חפצים מתכתיים",
    missionIcon: "🧲",
    pickCount: 3,
    validItems: ["magnet", "nail", "metal_spoon", "can"],
    resultText: "מעולה! אלה חפצים מתכתיים.",
    fact: "מגנט מושך חלק מהמתכות.",
    resultIcon: "🔩",
  },
];

/** @type {LabExperiment[]} */
export const MEDIUM_EXPERIMENTS = [
  {
    id: "medium-light-bulb",
    difficulty: "medium",
    title: "הדליקו את הנורה",
    prompt: "בחרו 3 חפצים שיסגרו מעגל וידליקו נורה",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["battery", "bulb", "wire", "magnet", "bowl"],
    resultText: "מעולה! המעגל נסגר והנורה נדלקה.",
    fact: "כדי שנורה תידלק צריך מקור חשמל ומעגל סגור.",
    resultIcon: "💡",
  },
  {
    id: "medium-plant-grow",
    difficulty: "medium",
    title: "עזרו לצמח לגדול",
    prompt: "בחרו 3 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "bowl", "ice"],
    resultText: "מעולה! הצמח מקבל מים ואור.",
    fact: "צמחים צריכים מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "medium-light-target",
    difficulty: "medium",
    title: "כוונו אור למטרה",
    prompt: "בחרו 3 חפצים שיכוונו אור",
    missionIcon: "🎯",
    pickCount: 3,
    validItems: ["mirror", "sun", "water", "bowl", "ice"],
    resultText: "מעולה! האור הוחזר למקום הנכון.",
    fact: "מראה יכולה להסיט קרני אור.",
    resultIcon: "🪞",
  },
  {
    id: "medium-melt-bowl",
    difficulty: "medium",
    title: "המיסו קרח בקערה",
    prompt: "בחרו 3 חפצים להמסת קרח",
    missionIcon: "🧊",
    pickCount: 3,
    validItems: ["ice", "bowl", "sun", "water", "plant"],
    resultText: "מעולה! הקרח נמס בקערה.",
    fact: "חום מעביר קרח ממצב מוצק למים.",
    resultIcon: "💦",
  },
  {
    id: "medium-magnet-pick2",
    difficulty: "medium",
    title: "בדקו אילו חפצים נמשכים למגנט",
    prompt: "בחרו 2 מתכות שהמגנט מושך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["nail", "metal_spoon", "magnet"],
    resultText: "מעולה! המגנט מושך מתכות.",
    fact: "לא כל החומרים נמשכים למגנט.",
    resultIcon: "🔩",
  },
  {
    id: "medium-simple-circuit",
    difficulty: "medium",
    title: "בנו מעגל פשוט",
    prompt: "בחרו 3 חפצים למעגל חשמלי",
    missionIcon: "🔋",
    pickCount: 3,
    validItems: ["battery", "wire", "bulb", "magnet", "mirror"],
    resultText: "מעולה! המעגל סגור והנורה דולקת.",
    fact: "זרם חשמלי זורם במעגל סגור.",
    resultIcon: "⚡",
  },
  {
    id: "medium-clear-shadow",
    difficulty: "medium",
    title: "צרו צל ברור",
    prompt: "בחרו 3 חפצים שייצרו צל",
    missionIcon: "🌓",
    pickCount: 3,
    validItems: ["sun", "plant", "bowl", "ice", "water"],
    resultText: "מעולה! צל ברור נוצר.",
    fact: "צל נוצר כשגוף חוסם את האור.",
    resultIcon: "🌑",
  },
  {
    id: "medium-plant-place",
    difficulty: "medium",
    title: "השקו צמח במקום מתאים",
    prompt: "בחרו 3 דברים לגידול צמח",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "bowl", "ice"],
    resultText: "מעולה! לצמח יש מה שהוא צריך.",
    fact: "רוב הצמחים גדלים טוב עם מים ואור.",
    resultIcon: "🟫",
  },
  {
    id: "medium-magnet-pick2b",
    difficulty: "medium",
    title: "מצאו מתכות למגנט",
    prompt: "בחרו 2 מתכות שהמגנט מושך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["nail", "metal_spoon", "magnet"],
    resultText: "מעולה! המגנט מושך מתכות.",
    fact: "לא כל החומרים נמשכים למגנט.",
    resultIcon: "🔩",
  },
  {
    id: "medium-float-two",
    difficulty: "medium",
    title: "מה יצוף במים?",
    prompt: "בחרו 2 חפצים לבדיקה במים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "bowl", "ice", "plant"],
    resultText: "מעולה! אפשר לבדוק במים.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🪵",
  },
];

/** @type {LabExperiment[]} */
export const HARD_EXPERIMENTS = [
  {
    id: "hard-bulb-clean",
    difficulty: "hard",
    title: "הדליקו נורה בלי לבחור חפץ שלא עוזר",
    prompt: "בחרו בדיוק 3 חפצים למעגל חשמלי",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["battery", "wire", "bulb"],
    exactMatch: true,
    resultText: "מעולה! מעגל נקי ונורה דולקת.",
    fact: "חשמל זורם במתכות ובחומרים מוליכים.",
    resultIcon: "💡",
  },
  {
    id: "hard-plant-full",
    difficulty: "hard",
    title: "הכינו צמח לגדילה טובה",
    prompt: "בחרו בדיוק 4 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 4,
    validItems: ["plant", "soil", "water", "sun"],
    exactMatch: true,
    resultText: "מעולה! לצמח יש הכל לגדילה.",
    fact: "צמח צריך אדמה, מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "hard-light-reflection",
    difficulty: "hard",
    title: "צרו ניסוי שמראה החזרת אור",
    prompt: "בחרו בדיוק 3 חפצים להחזרת אור",
    missionIcon: "🪞",
    pickCount: 3,
    validItems: ["sun", "magnet", "nail"],
    exactMatch: true,
    resultText: "מעולה! רואים איך האור פועל.",
    fact: "מקור אור מאיר חפצים מסביב.",
    resultIcon: "🌟",
  },
  {
    id: "hard-magnet-exact2",
    difficulty: "hard",
    title: "בדקו מה מגנט מושך ומה לא",
    prompt: "בחרו בדיוק 2 מתכות שהמגנט מושך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["nail", "metal_spoon"],
    exactMatch: true,
    resultText: "מעולה! שתי המתכות נמשכות.",
    fact: "מגנט לא מושך אבן או צמח.",
    resultIcon: "🔩",
  },
  {
    id: "hard-melt-exact",
    difficulty: "hard",
    title: "המיסו קרח בצורה נכונה",
    prompt: "בחרו בדיוק 3 חפצים להמסת קרח",
    missionIcon: "🧊",
    pickCount: 3,
    validItems: ["sun", "water", "stone"],
    exactMatch: true,
    resultText: "מעולה! חום ומים עוזרים.",
    fact: "חום מעביר חומר ממצב אחד לאחר.",
    resultIcon: "💦",
  },
  {
    id: "hard-full-circuit",
    difficulty: "hard",
    title: "בנו מעגל חשמלי מלא",
    prompt: "בחרו בדיוק 4 חפצים למעגל עם מתג",
    missionIcon: "⚡",
    pickCount: 4,
    validItems: ["battery", "wire", "bulb", "switch"],
    exactMatch: true,
    resultText: "מעולה! מעגל מלא עם מתג.",
    fact: "מתג שולט בזרימת החשמל במעגל.",
    resultIcon: "🎛️",
  },
  {
    id: "hard-shadow-exact",
    difficulty: "hard",
    title: "צרו צל בעזרת חפץ מתאים",
    prompt: "בחרו בדיוק 3 חפצים ליצירת צל",
    missionIcon: "🌓",
    pickCount: 3,
    validItems: ["sun", "plant", "stone"],
    exactMatch: true,
    resultText: "מעולה! צל ברור נוצר.",
    fact: "רק גוף אטום יוצר צל.",
    resultIcon: "🌑",
  },
  {
    id: "hard-water-exact",
    difficulty: "hard",
    title: "בחרו רק חומרים שמתאימים לניסוי במים",
    prompt: "בחרו בדיוק 3 חפצים לניסוי במים",
    missionIcon: "💧",
    pickCount: 3,
    validItems: ["water", "plant", "stone"],
    exactMatch: true,
    resultText: "מעולה! אפשר לבדוק צף ושוקע.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🪵",
  },
];

/** @type {Record<DifficultyId, LabExperiment[]>} */
export const EXPERIMENTS_BY_DIFFICULTY = {
  easy: EASY_EXPERIMENTS,
  medium: MEDIUM_EXPERIMENTS,
  hard: HARD_EXPERIMENTS,
};

export const SCORE = {
  correct: 30,
  firstTry: 10,
  streak3: 15,
  streak5: 30,
};

/** @param {DifficultyId} difficulty @param {number} index 0-based run index */
export function pickCountForRunIndex(difficulty, index) {
  if (difficulty === "easy") {
    if (index < 10) return 2;
    if (index < 18) return 2;
    return 3;
  }
  if (difficulty === "medium") {
    return index < 10 ? 2 : 3;
  }
  if (index < 5) return 2;
  if (index < 15) return 3;
  return 4;
}

/** @param {LabExperiment[]} list @param {number} minSize */
function expandExperimentPool(list, minSize) {
  if (list.length >= minSize) return [...list];
  const out = [...list];
  let i = 0;
  while (out.length < minSize) {
    const src = list[i % list.length];
    out.push({
      ...src,
      id: `${src.id}-pool${out.length}`,
    });
    i += 1;
  }
  return out;
}

/** Fisher–Yates shuffle */
function shuffleExperiments(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {DifficultyId} difficulty
 * @returns {LabExperiment[]}
 */
export function pickExperimentsForRun(difficulty) {
  const pool = expandExperimentPool(EXPERIMENTS_BY_DIFFICULTY[difficulty] ?? EASY_EXPERIMENTS, 28);
  const shuffled = shuffleExperiments(pool);
  const used = new Set();
  /** @type {LabExperiment[]} */
  const run = [];

  for (let i = 0; i < EXPERIMENTS_PER_LEVEL; i += 1) {
    const neededPick = pickCountForRunIndex(difficulty, i);
    let exp =
      shuffled.find((e) => e.pickCount === neededPick && !used.has(e.id)) ??
      shuffled.find((e) => !used.has(e.id)) ??
      shuffled[i % shuffled.length];
    used.add(exp.id);
    run.push({ ...exp });
  }

  return run;
}

/**
 * @param {number} successfulExperiments
 * @param {number} experimentsTotal
 * @param {number} mistakes
 * @param {number} maxMistakes
 */
export function isLabWin(successfulExperiments, experimentsTotal, mistakes, maxMistakes) {
  if (mistakes > maxMistakes) return false;
  return successfulExperiments >= experimentsTotal;
}

/**
 * @param {DifficultyId} difficulty
 * @returns {LabItem[]}
 */
export function shelfItemsForDifficulty(difficulty) {
  const ids = SHELF_BY_DIFFICULTY[difficulty] ?? SHELF_BY_DIFFICULTY.easy;
  return ids.map((id) => LAB_ITEMS[id]).filter(Boolean);
}

/**
 * @param {string[]} selectedIds
 * @param {LabExperiment} experiment
 */
export function validateExperimentSelection(selectedIds, experiment) {
  const pickCount = experiment.pickCount;
  const validSet = new Set(experiment.validItems);
  const selected = [...selectedIds];

  if (selected.length < pickCount) {
    const allValid = selected.every((id) => validSet.has(id));
    if (allValid && selected.length > 0) {
      return { ok: false, reason: "partial" };
    }
    return { ok: false, reason: "missing" };
  }

  if (selected.length > pickCount) {
    return { ok: false, reason: "too_many" };
  }

  const wrong = selected.filter((id) => !validSet.has(id));
  if (wrong.length > 0) {
    return { ok: false, reason: "wrong" };
  }

  if (experiment.exactMatch) {
    const selectedSet = new Set(selected);
    const exactOk =
      experiment.validItems.length === pickCount &&
      experiment.validItems.every((id) => selectedSet.has(id));
    if (!exactOk) {
      return { ok: false, reason: "wrong" };
    }
    return { ok: true, reason: "success" };
  }

  return { ok: true, reason: "success" };
}

/**
 * @param {string} reason
 */
export function feedbackMessageForReason(reason, pickCount) {
  switch (reason) {
    case "missing":
      return `בחרו ${pickCount} חפצים לניסוי`;
    case "partial":
      return `בחרו ${pickCount} חפצים לניסוי`;
    case "wrong":
      return "כמעט! משהו בבחירה לא מתאים";
    case "too_many":
      return `בחרו ${pickCount} חפצים לניסוי`;
    default:
      return "נסו לבחור חפצים שמתאימים למשימה";
  }
}

/** @param {boolean} firstTry */
export function successFeedbackMessage(firstTry) {
  return firstTry ? "יפה! בחרת חפצים מתאימים" : "מעולה! הניסוי הצליח";
}
