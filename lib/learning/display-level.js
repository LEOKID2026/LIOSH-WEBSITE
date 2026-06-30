/**
 * SSOT — displayLevel (regular | advanced) vs sourceDifficulty (easy | medium | hard).
 * Phase 1 — mapping only; no UI wiring.
 */

/** @typedef {"regular"|"advanced"} DisplayLevel */
/** @typedef {"easy"|"medium"|"hard"} SourceDifficulty */

export const DISPLAY_LEVELS = Object.freeze(["regular", "advanced"]);
export const SOURCE_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

/** Launch subjects where advanced is allowed (all except science). */
export const ADVANCED_ALLOWED_SUBJECT_IDS = Object.freeze([
  "math",
  "geometry",
  "hebrew",
  "english",
  "moledet_geography",
  "moledet-geography",
  "history",
]);

const DISPLAY_LABELS_HE = Object.freeze({
  regular: "רגיל",
  advanced: "מתקדם",
});

const LEGACY_TO_DISPLAY = Object.freeze({
  easy: "regular",
  medium: "regular",
  mixed: "regular",
  regular: "regular",
  hard: "advanced",
  advanced: "advanced",
});

const SOURCE_TO_DISPLAY = Object.freeze({
  easy: "regular",
  medium: "regular",
  hard: "advanced",
});

const DISPLAY_TO_ACTIVITY_DB = Object.freeze({
  regular: "mixed",
  advanced: "hard",
});

const ACTIVITY_DB_TO_DISPLAY = Object.freeze({
  easy: "regular",
  medium: "regular",
  mixed: "regular",
  regular: "regular",
  hard: "advanced",
  advanced: "advanced",
});

/**
 * @param {string|null|undefined} subjectId
 * @returns {string}
 */
export function normalizeSubjectIdForDisplayLevel(subjectId) {
  const raw = String(subjectId || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "moledet-geography" || raw === "moledet_geography") return "moledet_geography";
  return raw;
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {boolean}
 */
export function isScienceSubjectId(subjectId) {
  return normalizeSubjectIdForDisplayLevel(subjectId) === "science";
}

/**
 * @param {DisplayLevel|string|null|undefined} displayLevel
 * @param {string|null|undefined} subjectId
 * @returns {SourceDifficulty[]}
 */
export function displayLevelToSourceDifficulties(displayLevel, subjectId) {
  const dl = normalizeDisplayLevel(displayLevel);
  if (!dl) return [];
  if (dl === "advanced") return ["hard"];
  if (isScienceSubjectId(subjectId)) return ["easy", "medium", "hard"];
  return ["easy", "medium"];
}

/**
 * @param {SourceDifficulty|string|null|undefined} sourceDifficulty
 * @returns {DisplayLevel|null}
 */
export function sourceDifficultyToDisplayLevel(sourceDifficulty) {
  const key = String(sourceDifficulty || "").trim().toLowerCase();
  return SOURCE_TO_DISPLAY[key] ?? null;
}

/**
 * @param {DisplayLevel|string|null|undefined} displayLevel
 * @returns {string}
 */
export function displayLevelLabelHe(displayLevel) {
  const dl = normalizeDisplayLevel(displayLevel);
  if (!dl) return "";
  return DISPLAY_LABELS_HE[dl];
}

/**
 * @param {DisplayLevel|string|null|undefined} displayLevel
 * @param {string|null|undefined} subjectId
 * @returns {boolean}
 */
export function isDisplayLevelAllowedForSubject(displayLevel, subjectId) {
  const dl = normalizeDisplayLevel(displayLevel);
  if (!dl) return false;
  if (dl === "regular") return true;
  if (dl === "advanced") return !isScienceSubjectId(subjectId);
  return false;
}

/**
 * Maps legacy level keys (easy/medium/mixed/hard) or displayLevel strings to displayLevel.
 * @param {string|null|undefined} legacy
 * @returns {DisplayLevel|null}
 */
export function normalizeLegacyLevelToDisplayLevel(legacy) {
  const key = String(legacy || "").trim().toLowerCase();
  if (!key) return null;
  return LEGACY_TO_DISPLAY[key] ?? null;
}

/**
 * @param {DisplayLevel|string|null|undefined} displayLevel
 * @returns {"mixed"|"hard"|null}
 */
export function displayLevelToActivityDbEnum(displayLevel) {
  const dl = normalizeDisplayLevel(displayLevel);
  if (!dl) return null;
  return DISPLAY_TO_ACTIVITY_DB[dl];
}

/**
 * @param {string|null|undefined} dbEnum
 * @returns {DisplayLevel|null}
 */
export function activityDbEnumToDisplayLevel(dbEnum) {
  const key = String(dbEnum || "").trim().toLowerCase();
  return ACTIVITY_DB_TO_DISPLAY[key] ?? null;
}

/**
 * Resolves which bank source difficulties to draw from for activities / mixed mapping.
 * NOT medium-only for mixed/regular.
 *
 * @param {string|null|undefined} dbEnum easy | medium | hard | mixed
 * @param {string|null|undefined} subjectId
 * @returns {SourceDifficulty[]}
 */
export function resolveActivitySourceDifficulties(dbEnum, subjectId) {
  const key = String(dbEnum || "").trim().toLowerCase();
  if (key === "hard" || key === "advanced") return ["hard"];

  const display = activityDbEnumToDisplayLevel(key);
  if (display === "advanced") return ["hard"];
  if (display === "regular" || key === "mixed" || key === "easy" || key === "medium") {
    return displayLevelToSourceDifficulties("regular", subjectId);
  }
  return [];
}

/**
 * @param {DisplayLevel|string|null|undefined} value
 * @returns {DisplayLevel|null}
 */
export function normalizeDisplayLevel(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "regular" || key === "advanced") return key;
  return normalizeLegacyLevelToDisplayLevel(key);
}

/**
 * Unified read for session resume / legacy compat.
 *
 * @param {{
 *   level?: string|null,
 *   displayLevel?: string|null,
 *   sourceDifficulty?: string|null,
 *   regularInternalState?: string|null,
 *   scienceInternalState?: string|null,
 *   subjectId?: string|null,
 * }} input
 * @returns {{
 *   displayLevel: DisplayLevel,
 *   regularInternalState?: SourceDifficulty,
 *   scienceInternalState?: SourceDifficulty,
 *   sourceDifficulty?: SourceDifficulty,
 * }}
 */
export function resolveSessionLevels(input = {}) {
  const isScience = isScienceSubjectId(input.subjectId);

  let displayLevel = normalizeDisplayLevel(input.displayLevel);
  if (!displayLevel) {
    displayLevel = normalizeLegacyLevelToDisplayLevel(input.level);
  }
  if (!displayLevel) {
    displayLevel = "regular";
  }

  if (isScience) {
    displayLevel = "regular";
  }

  if (displayLevel === "advanced") {
    const sd =
      String(input.sourceDifficulty || "").toLowerCase() === "hard"
        ? "hard"
        : "hard";
    return { displayLevel: "advanced", sourceDifficulty: sd };
  }

  if (isScience) {
    let scienceInternalState = normalizeScienceInternalState(input.scienceInternalState);
    if (!scienceInternalState) {
      scienceInternalState = legacyLevelToScienceInternal(input.level);
    }
    return {
      displayLevel: "regular",
      scienceInternalState: scienceInternalState ?? "easy",
    };
  }

  let regularInternalState = normalizeRegularInternalState(input.regularInternalState);
  if (!regularInternalState) {
    regularInternalState = legacyLevelToRegularInternal(input.level);
  }
  return {
    displayLevel: "regular",
    regularInternalState: regularInternalState ?? "easy",
  };
}

/**
 * @param {string|null|undefined} value
 * @returns {"easy"|"medium"|null}
 */
function normalizeRegularInternalState(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "easy" || key === "medium") return key;
  return null;
}

/**
 * @param {string|null|undefined} value
 * @returns {"easy"|"medium"|"hard"|null}
 */
function normalizeScienceInternalState(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "easy" || key === "medium" || key === "hard") return key;
  return null;
}

/**
 * @param {string|null|undefined} legacyLevel
 * @returns {"easy"|"medium"|null}
 */
function legacyLevelToRegularInternal(legacyLevel) {
  const leg = String(legacyLevel || "").trim().toLowerCase();
  if (leg === "easy" || leg === "medium") return leg;
  if (leg === "mixed" || leg === "regular") return "easy";
  return null;
}

/**
 * @param {string|null|undefined} legacyLevel
 * @returns {"easy"|"medium"|"hard"|null}
 */
function legacyLevelToScienceInternal(legacyLevel) {
  const leg = String(legacyLevel || "").trim().toLowerCase();
  if (leg === "easy" || leg === "medium" || leg === "hard") return leg;
  if (leg === "mixed" || leg === "regular") return "easy";
  return null;
}
