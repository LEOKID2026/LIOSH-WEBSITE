/**
 * Visual split for moledet-geography — internal keys stay moledet_geography / moledet-geography.
 * Window/card level: always show moledet + geography (no student-grade gating).
 * In-window content: catalog/strand filtered grades & topics only.
 */

export const VISUAL_STRAND_MOLEDET = "moledet";
export const VISUAL_STRAND_GEOGRAPHY = "geography";

/** Grades with authored moledet books in catalog. */
export const MOLEDET_CATALOG_GRADE_KEYS = Object.freeze(["g2", "g3", "g4"]);
/** Grades with authored geography books in catalog. */
export const GEOGRAPHY_CATALOG_GRADE_KEYS = Object.freeze(["g5", "g6"]);

export const MOLEDET_STRAND_TOPIC_KEYS = Object.freeze([
  "homeland",
  "community",
  "citizenship",
  "values",
  "mixed",
]);
export const GEOGRAPHY_STRAND_TOPIC_KEYS = Object.freeze(["geography", "maps", "mixed"]);

export const MOLEDET_TOPIC_KEYS_CORE = Object.freeze([
  "homeland",
  "community",
  "citizenship",
  "values",
]);
export const GEOGRAPHY_TOPIC_KEYS_CORE = Object.freeze(["geography", "maps"]);

export const VISUAL_STRAND_LABEL_HE = Object.freeze({
  [VISUAL_STRAND_MOLEDET]: "מולדת",
  [VISUAL_STRAND_GEOGRAPHY]: "גאוגרפיה",
});

export const MOLEDET_MASTER_HREF = "/learning/moledet-master";
export const GEOGRAPHY_MASTER_HREF = "/learning/geography-master";

/**
 * @param {string|null|undefined} strand
 * @returns {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY}
 */
export function normalizeVisualStrand(strand) {
  const s = String(strand || "").trim().toLowerCase();
  if (s === VISUAL_STRAND_GEOGRAPHY) return VISUAL_STRAND_GEOGRAPHY;
  return VISUAL_STRAND_MOLEDET;
}

/**
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string[]}
 */
export function catalogGradeKeysForVisualStrand(visualStrand) {
  return visualStrand === VISUAL_STRAND_GEOGRAPHY
    ? [...GEOGRAPHY_CATALOG_GRADE_KEYS]
    : [...MOLEDET_CATALOG_GRADE_KEYS];
}

/**
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {"moledet"|"geography"}
 */
export function catalogSubjectForVisualStrand(visualStrand) {
  return visualStrand === VISUAL_STRAND_GEOGRAPHY ? "geography" : "moledet";
}

/**
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string}
 */
export function visualStrandTitleHe(visualStrand) {
  return visualStrand === VISUAL_STRAND_GEOGRAPHY ? "🗺️ גאוגרפיה" : "🏠 מולדת";
}

/**
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string}
 */
export function visualStrandMasterHref(visualStrand) {
  return visualStrand === VISUAL_STRAND_GEOGRAPHY ? GEOGRAPHY_MASTER_HREF : MOLEDET_MASTER_HREF;
}

/**
 * @param {string[]|undefined} topics
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string[]}
 */
export function filterTopicsForVisualStrand(topics, visualStrand) {
  const allowed = new Set(
    visualStrand === VISUAL_STRAND_GEOGRAPHY
      ? GEOGRAPHY_STRAND_TOPIC_KEYS
      : MOLEDET_STRAND_TOPIC_KEYS
  );
  return (topics || []).filter((t) => allowed.has(t));
}

/**
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string}
 */
export function defaultTopicForVisualStrand(visualStrand) {
  return visualStrand === VISUAL_STRAND_GEOGRAPHY ? "geography" : "homeland";
}

/**
 * @param {string|null|undefined} gradeKey
 * @returns {number|null}
 */
export function gradeNumberFromGradeKey(gradeKey) {
  const m = String(gradeKey || "").match(/(\d)/);
  return m ? Number(m[1]) : null;
}

/**
 * @param {string|null|undefined} gradeKey
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @returns {string|null}
 */
export function clampGradeKeyToVisualStrand(gradeKey, visualStrand) {
  const keys = catalogGradeKeysForVisualStrand(visualStrand);
  const gk = String(gradeKey || "").toLowerCase();
  if (keys.includes(gk)) return gk;
  return keys[0] ?? null;
}

/**
 * @param {unknown} rowData
 * @returns {string|null}
 */
export function extractTopicRowGradeKey(rowData) {
  const r = rowData && typeof rowData === "object" ? rowData : {};
  const raw = r.rowIdentityV1?.gradeKey ?? r.gradeKey ?? r.grade ?? null;
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (/^g[1-6]$/.test(s)) return s;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  if (n >= 1 && n <= 6) return `g${n}`;
  return null;
}

/**
 * Parent-report / topic-map partition (no duplicate mixed unless grade evidence).
 * @param {string} topicKey
 * @param {typeof VISUAL_STRAND_MOLEDET | typeof VISUAL_STRAND_GEOGRAPHY} visualStrand
 * @param {unknown} [rowData]
 */
export function topicBucketBelongsToVisualStrand(topicKey, visualStrand, rowData = null) {
  const k = String(topicKey || "").trim().toLowerCase();
  if (k === "mixed") {
    const gk = extractTopicRowGradeKey(rowData);
    if (!gk) return false;
    const n = gradeNumberFromGradeKey(gk);
    if (n == null) return false;
    if (visualStrand === VISUAL_STRAND_MOLEDET) return n >= 2 && n <= 4;
    if (visualStrand === VISUAL_STRAND_GEOGRAPHY) return n >= 5 && n <= 6;
    return false;
  }
  const core =
    visualStrand === VISUAL_STRAND_GEOGRAPHY
      ? GEOGRAPHY_TOPIC_KEYS_CORE
      : MOLEDET_TOPIC_KEYS_CORE;
  return core.includes(k);
}

/**
 * @param {Record<string, unknown>|null|undefined} map
 */
export function splitMoledetGeographyTopicMap(map) {
  /** @type {Record<string, unknown>} */
  const moledet = {};
  /** @type {Record<string, unknown>} */
  const geography = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (topicBucketBelongsToVisualStrand(k, VISUAL_STRAND_MOLEDET, v)) moledet[k] = v;
    if (topicBucketBelongsToVisualStrand(k, VISUAL_STRAND_GEOGRAPHY, v)) geography[k] = v;
  }
  return { moledet, geography };
}

/**
 * @param {Record<string, { questions?: number, correct?: number, timeMinutes?: number }>|null|undefined} map
 */
export function aggregateTopicMapPracticeStats(map) {
  let questions = 0;
  let correct = 0;
  let minutes = 0;
  for (const data of Object.values(map || {})) {
    questions += Number(data?.questions) || 0;
    correct += Number(data?.correct) || 0;
    minutes += Number(data?.timeMinutes) || 0;
  }
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  return { questions, correct, accuracy, minutes };
}

/**
 * @param {{ moledetGeographyTopics?: Record<string, unknown> }|null|undefined} report
 */
export function splitMoledetGeographyReportForDisplay(report) {
  const { moledet, geography } = splitMoledetGeographyTopicMap(report?.moledetGeographyTopics);
  return {
    moledetTopics: moledet,
    geographyTopics: geography,
    moledetStats: aggregateTopicMapPracticeStats(moledet),
    geographyStats: aggregateTopicMapPracticeStats(geography),
  };
}

/**
 * @param {Array<{ date: string, moledetGeographyTopics?: number }>|undefined} dailyActivity
 * @param {{ moledetGeographyTopics?: Record<string, unknown> }|null|undefined} report
 */
export function enrichDailyActivityWithVisualStrands(dailyActivity, report) {
  const { moledet, geography } = splitMoledetGeographyTopicMap(report?.moledetGeographyTopics);
  const moledetKeys = Object.keys(moledet).length;
  const geoKeys = Object.keys(geography).length;
  const denom = moledetKeys + geoKeys;
  const moledetShare = denom > 0 ? moledetKeys / denom : 0.5;
  return (dailyActivity || []).map((row) => {
    const combined = Number(row?.moledetGeographyTopics) || 0;
    if (denom === 0) {
      return { ...row, moledetVisualTopics: 0, geographyVisualTopics: 0 };
    }
    const moledetVisualTopics = Math.round(combined * moledetShare);
    return {
      ...row,
      moledetVisualTopics,
      geographyVisualTopics: Math.max(0, combined - moledetVisualTopics),
    };
  });
}
