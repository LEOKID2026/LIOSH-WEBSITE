/**
 * Authoritative topic discovery from source-of-truth modules (no guessed topic IDs).
 * Paths are resolved from repo root.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { isMoledetGeographyGradeAllowed } from "../../../utils/moledet-geography-curriculum-gates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root: scripts/learning-simulator/lib -> ../../../ */
export const ROOT = join(__dirname, "..", "..", "..");

export function modUrl(relPath) {
  return pathToFileURL(join(ROOT, relPath)).href;
}

export const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

export const LEVEL_KEYS = ["easy", "medium", "hard"];

/** Mirrors display labels in pages/learning/science-master.js TOPICS (for topicLabel only). */
export const SCIENCE_TOPIC_LABELS_HE = {
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  earth_space: "כדור הארץ והחלל",
  environment: "סביבה ואקולוגיה",
  experiments: "ניסויים ותהליכים",
  mixed: "ערבוב נושאים",
};

/** Mirrors display labels in pages/learning/english-master.js TOPICS */
export const ENGLISH_TOPIC_LABELS_HE = {
  vocabulary: "אוצר מילים",
  grammar: "דקדוק",
  translation: "תרגום",
  sentences: "משפטים",
  writing: "כתיבה",
  mixed: "ערבוב",
};

/**
 * Science runtime adds `mixed` in TOPICS; SCIENCE_GRADES topics come from data/science-curriculum.js.
 * Rows use curriculum topics only; see warnings for mixed/UI-only notes.
 */

export async function discoverMath() {
  const m = await import(modUrl("utils/math-constants.js"));
  const warnings = [];
  const GRADES = m.GRADES;
  const OPERATIONS = m.OPERATIONS;
  const levels = Object.keys(m.LEVELS || {}).filter((k) => LEVEL_KEYS.includes(k));
  if (levels.length !== 3) warnings.push(`expected LEVELS easy/medium/hard, got ${levels.join(",")}`);

  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const row = GRADES[gk];
    const topics = Array.isArray(row?.operations) ? [...row.operations] : [];
    byGrade[gk] = topics;
    for (const op of topics) {
      if (!OPERATIONS.includes(op)) {
        warnings.push(`grade ${gk} lists operation "${op}" not present in OPERATIONS export`);
      }
    }
  }

  return {
    subjectCanonical: "math",
    subjectRuntime: "math",
    sourceFile: "utils/math-constants.js",
    curriculumSourceFile: null,
    referenceNote: "no separate data/* math curriculum in repo; operations from utils/math-constants.js",
    levels: levels.length ? levels : LEVEL_KEYS,
    topicLabels: {},
    grades: byGrade,
    allowedGrades: [...GRADE_KEYS],
    generatorBacked: { procedural: true, module: "utils/math-question-generator.js" },
    warnings,
  };
}

export async function discoverGeometry() {
  const g = await import(modUrl("utils/geometry-constants.js"));
  const warnings = [];
  const GRADES = g.GRADES;
  const TOPICS = g.TOPICS || {};
  const levels = Object.keys(g.LEVELS || {}).filter((k) => LEVEL_KEYS.includes(k));
  if (levels.length !== 3) warnings.push(`LEVELS keys unexpected: ${levels.join(",")}`);

  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const topics = Array.isArray(GRADES[gk]?.topics) ? [...GRADES[gk].topics] : [];
    byGrade[gk] = topics;
    for (const t of topics) {
      if (!TOPICS[t]) warnings.push(`grade ${gk} topic "${t}" missing from TOPICS map`);
    }
  }

  return {
    subjectCanonical: "geometry",
    subjectRuntime: "geometry",
    sourceFile: "utils/geometry-constants.js",
    curriculumSourceFile: "pages/learning/geometry-curriculum.js",
    levels: levels.length ? levels : LEVEL_KEYS,
    topicLabels: Object.fromEntries(
      Object.entries(TOPICS).map(([k, v]) => [k, typeof v?.name === "string" ? v.name : null])
    ),
    grades: byGrade,
    allowedGrades: [...GRADE_KEYS],
    generatorBacked: { procedural: true, module: "utils/geometry-question-generator.js" },
    warnings,
  };
}

export async function discoverScience() {
  const cur = await import(modUrl("data/science-curriculum.js"));
  const warnings = [];
  const SCIENCE_GRADES = cur.SCIENCE_GRADES;
  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const topics = Array.isArray(SCIENCE_GRADES[gk]?.topics) ? [...SCIENCE_GRADES[gk].topics] : [];
    byGrade[gk] = topics;
    if (topics.length === 0) warnings.push(`SCIENCE_GRADES.${gk}.topics is empty`);
    for (const t of topics) {
      if (!SCIENCE_TOPIC_LABELS_HE[t]) {
        warnings.push(
          `topic "${t}" has no mirrored label in discovery SCIENCE_TOPIC_LABELS_HE (pages/learning/science-master.js TOPICS)`
        );
      }
    }
  }

  const curriculumTopicsUnion = new Set();
  for (const gk of GRADE_KEYS) {
    for (const t of byGrade[gk]) curriculumTopicsUnion.add(t);
  }
  const masterTopicKeys = Object.keys(SCIENCE_TOPIC_LABELS_HE);
  for (const k of masterTopicKeys) {
    if (k === "mixed" && !curriculumTopicsUnion.has("mixed")) {
      warnings.push(
        "topic key `mixed` exists in science-master TOPICS but no SCIENCE_GRADES[g].topics includes it — treat as UI/selector edge unless curriculum adds it"
      );
    }
  }

  return {
    subjectCanonical: "science",
    subjectRuntime: "science",
    sourceFile: "data/science-curriculum.js",
    curriculumSourceFile: "data/science-curriculum.js",
    runtimeCrossCheckFile: "pages/learning/science-master.js",
    levels: LEVEL_KEYS,
    topicLabels: { ...SCIENCE_TOPIC_LABELS_HE },
    grades: byGrade,
    allowedGrades: [...GRADE_KEYS],
    generatorBacked: { procedural: false, bank: "data/science-questions.js" },
    warnings,
  };
}

export async function discoverEnglish() {
  const cur = await import(modUrl("data/english-curriculum.js"));
  const warnings = [];
  const ENGLISH_GRADES = cur.ENGLISH_GRADES;
  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const topics = Array.isArray(ENGLISH_GRADES[gk]?.topics) ? [...ENGLISH_GRADES[gk].topics] : [];
    byGrade[gk] = topics;
    if (topics.length === 0) warnings.push(`ENGLISH_GRADES.${gk}.topics is empty`);
    for (const t of topics) {
      if (!ENGLISH_TOPIC_LABELS_HE[t]) {
        warnings.push(
          `topic "${t}" missing from ENGLISH_TOPIC_LABELS_HE mirror (pages/learning/english-master.js TOPICS)`
        );
      }
    }
  }

  return {
    subjectCanonical: "english",
    subjectRuntime: "english",
    sourceFile: "data/english-curriculum.js",
    curriculumSourceFile: "data/english-curriculum.js",
    gradeGatingRef: "utils/grade-gating.js",
    runtimeCrossCheckFile: "pages/learning/english-master.js",
    levels: LEVEL_KEYS,
    topicLabels: { ...ENGLISH_TOPIC_LABELS_HE },
    grades: byGrade,
    allowedGrades: [...GRADE_KEYS],
    generatorBacked: { procedural: false, inlineGenerator: "pages/learning/english-master.js" },
    warnings,
  };
}

export async function discoverHebrew() {
  const rt = await import(modUrl("utils/hebrew-constants.js"));
  const cur = await import(modUrl("data/hebrew-curriculum.js"));
  const warnings = [];
  const GRADES_RT = rt.GRADES;
  const HEBREW_GRADES = cur.HEBREW_GRADES;
  const TOPICS = rt.TOPICS || {};

  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const topics = Array.isArray(GRADES_RT[gk]?.topics) ? [...GRADES_RT[gk].topics] : [];
    byGrade[gk] = topics;
    if (topics.length === 0) warnings.push(`hebrew-constants GRADES.${gk}.topics is empty`);

    const curTopics = new Set(HEBREW_GRADES[gk]?.topics || []);
    for (const t of topics) {
      if (!TOPICS[t]) warnings.push(`topic "${t}" missing from hebrew-constants TOPICS`);
      if (!curTopics.has(t) && t !== "mixed") {
        warnings.push(`runtime topic "${t}" not found in data/hebrew-curriculum.js HEBREW_GRADES.${gk}.topics`);
      }
    }
    for (const ct of curTopics) {
      if (!topics.includes(ct)) {
        warnings.push(`curriculum lists "${ct}" for ${gk} but runtime GRADES.${gk}.topics does not include it`);
      }
    }
  }

  if (GRADE_KEYS.some((gk) => (byGrade[gk] || []).includes("mixed"))) {
    warnings.push(
      "topic `mixed` is runtime/UI selector (utils/hebrew-constants.js) — not listed in data/hebrew-curriculum.js per-grade topics"
    );
  }

  return {
    subjectCanonical: "hebrew",
    subjectRuntime: "hebrew",
    sourceFile: "utils/hebrew-constants.js",
    curriculumSourceFile: "data/hebrew-curriculum.js",
    levels: LEVEL_KEYS,
    topicLabels: Object.fromEntries(
      Object.entries(TOPICS).map(([k, v]) => [k, typeof v?.name === "string" ? v.name : null])
    ),
    grades: byGrade,
    allowedGrades: [...GRADE_KEYS],
    generatorBacked: { procedural: true, module: "utils/hebrew-question-generator.js", bank: "utils/hebrew-rich-question-bank.js" },
    warnings,
  };
}

export async function discoverMoledetGeography() {
  const rt = await import(modUrl("utils/moledet-geography-constants.js"));
  const cur = await import(modUrl("data/moledet-geography-curriculum.js"));
  const warnings = [];
  const GRADES_RT = rt.GRADES;
  const MOLEDET_GRADES = cur.MOLEDET_GEOGRAPHY_GRADES;
  const TOPICS = rt.TOPICS || {};

  const byGrade = {};
  for (const gk of GRADE_KEYS) {
    const topics = Array.isArray(GRADES_RT[gk]?.topics) ? [...GRADES_RT[gk].topics] : [];
    byGrade[gk] = topics;
    if (topics.length === 0) warnings.push(`constants GRADES.${gk}.topics is empty`);

    const curTopics = new Set(MOLEDET_GRADES[gk]?.topics || []);
    for (const t of topics) {
      if (!TOPICS[t]) warnings.push(`topic "${t}" missing from moledet-geography-constants TOPICS`);
      if (!curTopics.has(t) && t !== "mixed") {
        warnings.push(`runtime topic "${t}" not found in MOLEDET_GEOGRAPHY_GRADES.${gk}.topics`);
      }
    }
    for (const ct of curTopics) {
      if (!topics.includes(ct)) {
        warnings.push(`curriculum lists "${ct}" for ${gk} but runtime GRADES.${gk}.topics omits it`);
      }
    }
  }

  if (GRADE_KEYS.some((gk) => (byGrade[gk] || []).includes("mixed"))) {
    warnings.push(
      "topic `mixed` is runtime selector (utils/moledet-geography-constants.js) — not in data/moledet-geography-curriculum.js topic arrays"
    );
  }

  warnings.push(
    "naming aliases — storage/API often `moledet_geography`; routes/diagnostics often `moledet-geography`; spine may use `geography`"
  );
  const allowedGrades = GRADE_KEYS.filter((gk) => isMoledetGeographyGradeAllowed(gk));

  return {
    subjectCanonical: "moledet_geography",
    subjectRuntime: "moledet-geography",
    aliasSpineSubject: "geography",
    sourceFile: "utils/moledet-geography-constants.js",
    curriculumSourceFile: "data/moledet-geography-curriculum.js",
    levels: LEVEL_KEYS,
    topicLabels: Object.fromEntries(
      Object.entries(TOPICS).map(([k, v]) => [k, typeof v?.name === "string" ? v.name : null])
    ),
    grades: byGrade,
    allowedGrades,
    generatorBacked: { procedural: true, module: "utils/moledet-geography-question-generator.js", banks: "data/geography-questions/" },
    warnings,
  };
}

export async function discoverAll() {
  const unsupported = [];
  const out = {};

  const tryLoad = async (name, fn) => {
    try {
      out[name] = await fn();
    } catch (e) {
      unsupported.push({ subject: name, error: String(e?.message || e), stack: e?.stack });
    }
  };

  await tryLoad("math", discoverMath);
  await tryLoad("geometry", discoverGeometry);
  await tryLoad("science", discoverScience);
  await tryLoad("english", discoverEnglish);
  await tryLoad("hebrew", discoverHebrew);
  await tryLoad("moledet_geography", discoverMoledetGeography);

  const warnings = [];
  for (const k of Object.keys(out)) {
    warnings.push(...(out[k].warnings || []).map((w) => `${k}: ${w}`));
  }

  return {
    discoveredAt: new Date().toISOString(),
    subjects: out,
    globalWarnings: [...new Set(warnings)],
    unsupportedSubjects: unsupported,
  };
}
