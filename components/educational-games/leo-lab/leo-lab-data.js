/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

import {
  EASY_EXPERIMENTS,
  MEDIUM_EXPERIMENTS,
  HARD_EXPERIMENTS,
} from "./leo-lab-experiments-clean.js";
import { SHELF_SIZE_BY_DIFFICULTY } from "./leo-lab-shelf-presets.js";

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
 *   shelfItems: string[]
 *   exactMatch?: boolean
 *   resultText: string
 *   fact: string
 *   resultIcon: string
 * }} LabExperiment */

export const EXPERIMENTS_PER_LEVEL = 20;

export const EASY_LEVEL_CONTENT_GUIDELINES = {
  audience: "כיתות א׳–ב׳",
  minColorExperimentsInEasyPool: 6,
};

const EASY_BANNED_PROMPT_RE =
  /חוסמ(?:ים|)\s*אור|עציר(?:ה|)\s*של\s*אור|מתאימ(?:ים|)\s*ליצירת\s*צל|מאפשר(?:ים|)\s*לאור\s*לעבור|שקוף\s*לאור|אור\s*וצל|ניסוי\s*אור/i;

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
    shelfCount: 10,
    itemHint: "10 חפצים · 2–3",
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
  paint_red: { id: "paint_red", name: "אדום", icon: "🟥", category: "צבע" },
  paint_yellow: { id: "paint_yellow", name: "צהוב", icon: "🟨", category: "צבע" },
  paint_blue: { id: "paint_blue", name: "כחול", icon: "🟦", category: "צבע" },
  paint_green: { id: "paint_green", name: "ירוק", icon: "🟩", category: "צבע" },
  paint_orange: { id: "paint_orange", name: "כתום", icon: "🟧", category: "צבע" },
  paint_purple: { id: "paint_purple", name: "סגול", icon: "🟪", category: "צבע" },
  paint_pink: { id: "paint_pink", name: "ורוד", icon: "🩷", category: "צבע" },
  paint_white: { id: "paint_white", name: "לבן", icon: "⬜", category: "צבע" },
};

/** @type {Record<DifficultyId, LabExperiment[]>} */
export const EXPERIMENTS_BY_DIFFICULTY = {
  easy: EASY_EXPERIMENTS,
  medium: MEDIUM_EXPERIMENTS,
  hard: HARD_EXPERIMENTS,
};

const EASY_COLOR_TOPIC_RE =
  /צבע|ערבב|כתום|ירוק|סגול|אדום|צהוב|כחול|paint_/i;
const ELECTRICITY_ITEM_IDS = new Set(["battery", "bulb", "wire", "switch"]);

/** @returns {{ easyTotal: number, colorExperimentCount: number, electricityOnEasyCount: number, gaps: string[] }} */
export function auditEasyLevelContent() {
  const easy = EXPERIMENTS_BY_DIFFICULTY.easy;
  const colorExperimentCount = easy.filter(
    (exp) =>
      EASY_COLOR_TOPIC_RE.test(`${exp.title} ${exp.prompt}`) ||
      exp.validItems.some((id) => String(id).startsWith("paint_")),
  ).length;
  const electricityOnEasyCount = easy.filter((exp) =>
    exp.validItems.some((id) => ELECTRICITY_ITEM_IDS.has(id)),
  ).length;
  const gaps = [];
  if (colorExperimentCount < EASY_LEVEL_CONTENT_GUIDELINES.minColorExperimentsInEasyPool) {
    gaps.push(
      `רמת קל: חסרים ניסויי צבעים (${colorExperimentCount}/${EASY_LEVEL_CONTENT_GUIDELINES.minColorExperimentsInEasyPool}).`,
    );
  }
  if (electricityOnEasyCount > 0) {
    gaps.push(
      `רמת קל: ${electricityOnEasyCount} ניסוי(ים) עם חשמל - להעביר לבינוני/קשה או להסיר.`,
    );
  }
  const abstractLightExperiments = easy.filter((exp) =>
    EASY_BANNED_PROMPT_RE.test(`${exp.title} ${exp.prompt}`),
  );
  if (abstractLightExperiments.length > 0) {
    gaps.push(
      `רמת קל: ניסויי אור/צל מופשטים: ${abstractLightExperiments.map((e) => e.id).join(", ")}`,
    );
  }
  return {
    easyTotal: easy.length,
    colorExperimentCount,
    electricityOnEasyCount,
    abstractLightExperiments: abstractLightExperiments.map((e) => e.id),
    gaps,
  };
}

export const SCORE = {
  correct: 30,
  firstTry: 10,
  streak3: 15,
  streak5: 30,
};

/** @param {DifficultyId} difficulty @param {number} index 0-based run index */
export function pickCountForRunIndex(difficulty, index) {
  if (difficulty === "easy") return 2;
  if (difficulty === "medium") return index < 13 ? 2 : 3;
  if (index < 3) return 2;
  if (index < 13) return 3;
  return 4;
}

/** @param {LabExperiment} exp */
function experimentRunKey(exp) {
  return `${exp.title.trim()}|${exp.prompt.trim()}`;
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
  const pool = EXPERIMENTS_BY_DIFFICULTY[difficulty] ?? EASY_EXPERIMENTS;

  /** @type {Record<number, LabExperiment[]>} */
  const byPick = {};
  for (const exp of pool) {
    if (!byPick[exp.pickCount]) byPick[exp.pickCount] = [];
    byPick[exp.pickCount].push(exp);
  }
  for (const pickCount of Object.keys(byPick)) {
    byPick[Number(pickCount)] = shuffleExperiments(byPick[Number(pickCount)]);
  }

  const usedIds = new Set();
  const usedKeys = new Set();
  /** @type {LabExperiment[]} */
  const run = [];
  /** @type {Record<number, number>} */
  const bucketIdx = {};

  for (let i = 0; i < EXPERIMENTS_PER_LEVEL; i += 1) {
    const neededPick = pickCountForRunIndex(difficulty, i);
    const bucket = byPick[neededPick] ?? [];
    if (bucketIdx[neededPick] == null) bucketIdx[neededPick] = 0;

    let exp = null;
    while (bucketIdx[neededPick] < bucket.length) {
      const candidate = bucket[bucketIdx[neededPick]];
      bucketIdx[neededPick] += 1;
      if (usedIds.has(candidate.id) || usedKeys.has(experimentRunKey(candidate))) continue;
      exp = candidate;
      break;
    }

    if (!exp) break;

    usedIds.add(exp.id);
    usedKeys.add(experimentRunKey(exp));
    run.push({ ...exp });
  }

  return run;
}

/** @returns {Record<DifficultyId, { total: number, uniqueTitles: number, uniquePrompts: number, byPickCount: Record<number, number> }>} */
export function experimentPoolStats() {
  /** @type {Record<string, { total: number, uniqueTitles: number, uniquePrompts: number, byPickCount: Record<number, number> }>} */
  const stats = {};
  for (const [diff, list] of Object.entries(EXPERIMENTS_BY_DIFFICULTY)) {
    /** @type {Record<number, number>} */
    const byPickCount = {};
    for (const exp of list) {
      byPickCount[exp.pickCount] = (byPickCount[exp.pickCount] || 0) + 1;
    }
    stats[diff] = {
      total: list.length,
      uniqueTitles: new Set(list.map((e) => e.title.trim())).size,
      uniquePrompts: new Set(list.map((e) => e.prompt.trim())).size,
      byPickCount,
    };
  }
  return stats;
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
 * @param {LabExperiment} experiment
 * @returns {LabItem[]}
 */
export function shelfItemsForExperiment(experiment) {
  if (!experiment?.shelfItems?.length) return [];
  return experiment.shelfItems.map((id) => LAB_ITEMS[id]).filter(Boolean);
}

/**
 * @param {DifficultyId} difficulty
 * @returns {number}
 */
export function shelfCountForDifficulty(difficulty) {
  return SHELF_SIZE_BY_DIFFICULTY[difficulty] ?? DIFFICULTIES.easy.shelfCount;
}

/**
 * @deprecated Use shelfItemsForExperiment(currentExperiment)
 * @param {DifficultyId} difficulty
 * @returns {LabItem[]}
 */
export function shelfItemsForDifficulty(difficulty) {
  const pool = EXPERIMENTS_BY_DIFFICULTY[difficulty] ?? [];
  const first = pool[0];
  return first ? shelfItemsForExperiment(first) : [];
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
