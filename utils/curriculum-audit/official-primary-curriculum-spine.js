/**
 * Phase 4B-0 — Official-source-anchored primary curriculum spine (grades 1–6).
 * Extends the conservative internal map with exposure buckets, strands, depth labels,
 * and explicit MoE/RAMA source references where configured.
 *
 * This is a planning artefact: it does not modify runtime or question banks.
 */

import {
  ISRAELI_PRIMARY_CURRICULUM_MAP,
  CURRICULUM_SOURCE_REF_PRESETS,
  gradeNumToKey,
  matchTopicDef,
} from "./israeli-primary-curriculum-map.js";
import {
  MATH_ELEMENTARY_GRADE_PDF_BASE,
  SOURCE_REGISTRY_CHECKED_AT,
} from "./official-curriculum-source-registry.js";

/** @typedef {'intro' | 'basic' | 'developing' | 'advanced'} GradeDepth */
/** @typedef {'high' | 'medium' | 'low'} SpineConfidence */

/**
 * @typedef {Object} OfficialTopicRef
 * @property {string} key
 * @property {string} labelHe
 * @property {string} strand
 * @property {'core' | 'allowed' | 'exposure_only' | 'enrichment' | 'not_expected_yet'} expectedLevel
 * @property {GradeDepth} gradeDepth
 * @property {SpineConfidence} confidence
 * @property {Array<{ sourceType: string, title: string, url: string, checkedAt?: string, note?: string }>} sourceRefs
 * @property {string} notes
 */

const G_HE = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];

/** @param {number} g @returns {GradeDepth} */
function depthForGrade(g) {
  if (g <= 2) return "intro";
  if (g <= 4) return "developing";
  return "advanced";
}

/** @param {string} expectedLevelRaw */
function normalizeExpectedLevel(expectedLevelRaw) {
  if (expectedLevelRaw === "not_yet") return "not_expected_yet";
  return expectedLevelRaw;
}

/**
 * @param {import("./israeli-primary-curriculum-map.js").CurriculumTopicDef} def
 * @param {string} strand
 * @param {GradeDepth} gradeDepth
 * @param {'core'|'allowed'|'exposure_only'|'enrichment'|'not_expected_yet'} bucket
 */
function toOfficialTopic(def, strand, gradeDepth, bucket, extraNotes = "") {
  const expectedLevel =
    bucket === "exposureOnlyTopics"
      ? "exposure_only"
      : normalizeExpectedLevel(def.expectedLevel || bucketToLevel(bucket));

  return {
    key: def.key,
    labelHe: def.labelHe,
    strand,
    expectedLevel,
    gradeDepth,
    confidence: /** @type {SpineConfidence} */ (def.confidence || "medium"),
    sourceRefs: Array.isArray(def.sourceRefs) ? def.sourceRefs : [],
    notes: [def.notes, extraNotes].filter(Boolean).join(" "),
  };
}

function bucketToLevel(bucket) {
  const m = {
    coreTopics: "core",
    allowedTopics: "allowed",
    enrichmentTopics: "enrichment",
    notExpectedYet: "not_expected_yet",
    exposureOnlyTopics: "exposure_only",
  };
  return m[bucket] || "allowed";
}

/** Strand labels for audit grouping (English internal keys). */
const STRAND = {
  math: {
    number: "math.number_operations",
    word_problems: "math.word_problems",
    fractions_decimals: "math.fractions_decimals_percent",
    geometry_link: "math.geometry_strand_link",
    data: "math.data_measurement",
    patterns: "math.patterns_algebra",
  },
  geometry: {
    shapes: "geometry.shapes_polygons",
    measure: "geometry.measure_perimeter_area_volume",
    angles: "geometry.angles_reasoning",
    spatial: "geometry.spatial_symmetry_transform",
    solids: "geometry.solids_3d",
  },
  hebrew: {
    decoding: "hebrew.decoding_fluency",
    comprehension: "hebrew.comprehension_inference",
    vocabulary: "hebrew.vocabulary_language",
    writing: "hebrew.writing_composition",
    oral: "hebrew.oral_expression",
  },
  english: {
    exposure: "english.exposure_oral_listening",
    lexis: "english.lexis_translation",
    grammar: "english.grammar_literacy",
    patterns: "english.sentence_discourse_patterns",
  },
  science: {
    life: "science.life_sciences",
    materials: "science.materials_changes",
    energy: "science.energy_physical",
    earth: "science.earth_environment_space",
    inquiry: "science.inquiry_practices",
    tech: "science.technology_society",
  },
  moledet: {
    citizenship: "moledet.society_citizenship_geography",
  },
};

function strandForMathKey(key) {
  if (!key.startsWith("math.")) return STRAND.math.number;
  if (key.includes("fraction") || key.includes("decimal") || key.includes("percent") || key.includes("ratio"))
    return STRAND.math.fractions_decimals;
  if (key.includes("word")) return STRAND.math.word_problems;
  if (key.includes("geometry")) return STRAND.math.geometry_link;
  if (key.includes("data")) return STRAND.math.data;
  if (key.includes("patterns") || key.includes("equations")) return STRAND.math.patterns;
  return STRAND.math.number;
}

function strandForGeometryKey(key) {
  if (key.includes("volume") || key.includes("solid")) return STRAND.geometry.solids;
  if (key.includes("angle") || key.includes("diagonal") || key.includes("pythagoras"))
    return STRAND.geometry.angles;
  if (key.includes("area") || key.includes("perimeter")) return STRAND.geometry.measure;
  if (key.includes("symmetry") || key.includes("transform")) return STRAND.geometry.spatial;
  return STRAND.geometry.shapes;
}

function strandForHebrewKey(key) {
  if (key.includes("decoding") || key.includes("fluency")) return STRAND.hebrew.decoding;
  if (key.includes("oral")) return STRAND.hebrew.oral;
  if (key.includes("writing")) return STRAND.hebrew.writing;
  if (key.includes("grammar") || key.includes("vocabulary")) return STRAND.hebrew.vocabulary;
  return STRAND.hebrew.comprehension;
}

function strandForEnglishKey(key) {
  if (key.includes("exposure") || key.includes("oral")) return STRAND.english.exposure;
  if (key.includes("grammar")) return STRAND.english.grammar;
  if (key.includes("sentence")) return STRAND.english.patterns;
  return STRAND.english.lexis;
}

function strandForScienceKey(key) {
  if (key.includes("life") || key.includes("body") || key.includes("animal") || key.includes("plant"))
    return STRAND.science.life;
  if (key.includes("material") || key.includes("matter")) return STRAND.science.materials;
  if (key.includes("energy")) return STRAND.science.energy;
  if (key.includes("earth") || key.includes("environment") || key.includes("space"))
    return STRAND.science.earth;
  if (key.includes("inquiry") || key.includes("scientific")) return STRAND.science.inquiry;
  if (key.includes("technology")) return STRAND.science.tech;
  return STRAND.science.inquiry;
}

function pickStrand(subjectKey, topicKey) {
  switch (subjectKey) {
    case "math":
      return strandForMathKey(topicKey);
    case "geometry":
      return strandForGeometryKey(topicKey);
    case "hebrew":
      return strandForHebrewKey(topicKey);
    case "english":
      return strandForEnglishKey(topicKey);
    case "science":
      return strandForScienceKey(topicKey);
    case "moledet-geography":
      return STRAND.moledet.citizenship;
    default:
      return "unknown";
  }
}

/**
 * Transform legacy grade entry into official spine shape.
 * @param {import("./israeli-primary-curriculum-map.js").GradeCurriculumEntry} legacy
 * @param {string} subjectKey
 * @param {number} gradeNum
 */
function buildOfficialGradeSlot(legacy, subjectKey, gradeNum) {
  const gd = depthForGrade(gradeNum);
  const skills = [];
  const textComplexityNotes = [];
  const difficultyNotes = [];
  const sourceRefs = [...CURRICULUM_SOURCE_REF_PRESETS.moe_portal];

  /** @type {OfficialTopicRef[]} */
  const coreTopics = [];
  /** @type {OfficialTopicRef[]} */
  const allowedTopics = [];
  /** @type {OfficialTopicRef[]} */
  const exposureOnlyTopics = [];
  /** @type {OfficialTopicRef[]} */
  const enrichmentTopics = [];
  /** @type {OfficialTopicRef[]} */
  const notExpectedYet = [];

  const pushBucket = (bucketName, arr) => {
    if (!Array.isArray(arr)) return;
    for (const def of arr) {
      const strand = pickStrand(subjectKey, def.key);
      const topic = toOfficialTopic(def, strand, gd, bucketName);
      if (bucketName === "coreTopics") coreTopics.push(topic);
      else if (bucketName === "allowedTopics") allowedTopics.push(topic);
      else if (bucketName === "enrichmentTopics") enrichmentTopics.push(topic);
      else if (bucketName === "notExpectedYet") notExpectedYet.push(topic);
      else if (bucketName === "exposureOnlyTopics") exposureOnlyTopics.push(topic);
    }
  };

  pushBucket("coreTopics", legacy.coreTopics);
  pushBucket("allowedTopics", legacy.allowedTopics);
  pushBucket("enrichmentTopics", legacy.enrichmentTopics);
  pushBucket("notExpectedYet", legacy.notExpectedYet);

  /* English g1–2: grammar pools are exposure / enrichment — not core literacy */
  if (subjectKey === "english" && gradeNum <= 2) {
    const grammarLike = enrichmentTopics.filter((t) => t.key === "english.grammar");
    for (const g of grammarLike) {
      exposureOnlyTopics.push({
        ...g,
        expectedLevel: "exposure_only",
        gradeDepth: "intro",
        notes:
          (g.notes ? `${g.notes} ` : "") +
          "Official frameworks stress exposure / oral / lexical bands in early grades - grammar drills are not treated as core literacy targets here.",
        sourceRefs: [
          ...CURRICULUM_SOURCE_REF_PRESETS.english_exposure_framework,
          ...g.sourceRefs,
        ],
      });
    }
    const filteredEnr = enrichmentTopics.filter((t) => t.key !== "english.grammar");
    enrichmentTopics.length = 0;
    enrichmentTopics.push(...filteredEnr);
    const sent = enrichmentTopics.filter((t) => t.key === "english.sentence_writing_patterns");
    for (const s of sent) {
      exposureOnlyTopics.push({
        ...s,
        expectedLevel: "exposure_only",
        notes:
          (s.notes ? `${s.notes} ` : "") +
          "Sentence-pattern pools may resemble writing skills - classify as exposure unless formally assessed.",
      });
    }
    enrichmentTopics.splice(
      0,
      enrichmentTopics.length,
      ...enrichmentTopics.filter((t) => t.key !== "english.sentence_writing_patterns")
    );
  }

  /* Hebrew: skills narrative */
  if (subjectKey === "hebrew") {
    skills.push(
      "הפרדה בין פיענוח וזרימה להבנת הנקרא, אוצר מילים, דקדוק וכתיבה.",
      "בכיתות נמוכות דגש על קריאה בסיסית ואוצר מילים; הבנת הנקרא מתפתחת בהדרגה."
    );
    textComplexityNotes.push(
      gradeNum <= 2
        ? "טקסטים קצרים, מילות תוכן ברורות - מורכבות תחבירית מוגבלת בדרך כלל."
        : gradeNum <= 4
          ? "טקסטים דומים לספרות ילדים; משימות הבנה מתחילות לכלול הסקות בסיסיות."
          : "טקסטים ארוכים יותר; דרישות הנמקה והיקש מתגברות."
    );
    difficultyNotes.push(
      "מפת רשמית לפי כיתה דורשת אימות מול מסמך משרד החינוך - כאן רמת אמון בינונית עד נמוכה."
    );
    sourceRefs.push(...CURRICULUM_SOURCE_REF_PRESETS.rama_general);
  }

  if (subjectKey === "english") {
    skills.push(
      "הפרדה בין האזנה / דיבור / חשיפה לבין דקדוק פורמלי והבנת הנקרא ברמת ספרות.",
      "כיתות 1–2: התמקדות באוצר מילים והשמה מילולית לפני ליבת דקדוק פורמלית."
    );
    textComplexityNotes.push(
      gradeNum <= 2
        ? "משפטים קצרים, שאלון מילולי בסיסי - לא ספרות כבדה."
        : "טקסטים מתארכים בהדרגה; עדיין יש לאמת מול תוכנית האנגלית בבית הספר."
    );
    sourceRefs.push(...CURRICULUM_SOURCE_REF_PRESETS.english_exposure_framework);
  }

  if (subjectKey === "science") {
    skills.push(
      "חקירה מדעית: תצפית, השערה, ניסוי בטוח בכיתה, תיעוד.",
      "תכני חיים, חומרים, אנרגיה, כדור הארץ וטכנולוגיה - לפי מסגרות מדע וטכנולוגיה."
    );
    difficultyNotes.push(
      "נושאים מתקדמים (אנרגיה מוליכים מורכבים) דורשים אימות עומק לכיתה."
    );
    sourceRefs.push(...CURRICULUM_SOURCE_REF_PRESETS.rama_general);
  }

  if (subjectKey === "math") {
    skills.push(
      "תפיסה מספרית, פעולות, שאלות מילוליות, שברים/עשרוניים (בהתאם לכיתה), נתונים ותרשימים.",
      "גאומטריה במתמטיקה: קשרים גיאומטריים בהקשר חישובי - מוסבר במיתר נפרד למוצר."
    );
    difficultyNotes.push(
      "גיאומטריה כמיתר בתוך מתמטיקה מופרד ממקצוע הגאומטריה של האתר עבור השוואות דוח.",
      "מסמך תוכנית רשמי לכיתה במאגר מיידע (PDF) משמש כעיגון כיתתי לפני תיקוני תוכן."
    );
    sourceRefs.push({
      sourceType: "official_pdf",
      title: `מתמטיקה יסודי - מסמך תוכנית לכיתה ${G_HE[gradeNum]} (מיידע)`,
      url: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita${gradeNum}.pdf`,
      checkedAt: SOURCE_REGISTRY_CHECKED_AT,
      note: "עיגון רשמי לכיתה - יש לאמת כל פריט מול הסעיפים הרלוונטיים בקובץ.",
    });
    sourceRefs.push({
      sourceType: "official_moe",
      title: "חקר נתונים - מרחב פדגוגי",
      url: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/noseem_nilmadim/choker-netunim/",
      checkedAt: SOURCE_REGISTRY_CHECKED_AT,
      note: "מיתר חקר נתונים במסגרת התוכנית.",
    });
  }

  if (subjectKey === "geometry") {
    skills.push(
      "הכרת צורות, מדידות (היקף, שטח), זוויות, גופים, סימטריה - עומק לפי כיתה.",
      "הפרדה בין הכרת צורה לבין נפח משולש למשולש פיתגורס וכו׳."
    );
    difficultyNotes.push(
      "פריטים עם נפח/אלכסונים בכיתות מוקדמות נסמנים כחשודי רצף."
    );
  }

  let confidence = /** @type {SpineConfidence} */ (legacy.confidence || "medium");
  let needsHumanPedagogyReview = confidence === "low";

  /* Moledet: ministry framing commonly grades 2–4 */
  if (subjectKey === "moledet-geography") {
    if (gradeNum < 2 || gradeNum > 4) {
      confidence = "low";
      needsHumanPedagogyReview = true;
      difficultyNotes.push(
        "מולדת/חברה לפי מסגרות רבות מותאם לכיתות ב׳–ד׳; פריטים בכיתה א׳ או בכיתות ה׳–ו׳ דורשים מקור רשמי נפרד או הסבר פדגוגי."
      );
    } else {
      confidence = "medium";
      needsHumanPedagogyReview = true;
      difficultyNotes.push("נדרש אימות מול תוכנית המוסד ומסגרות משרד החינוך לגיל המדויק.");
      /* Bank topic defs inherit legacy \"low\"; bump within official Moladeta band so compare reports do not mislabel every row as low-confidence anchoring. */
      for (const t of allowedTopics) {
        if (t.key && String(t.key).startsWith("moledet")) t.confidence = "medium";
      }
    }
    skills.push("זהות, גיאוגרפיה מקומית, חברה ואזרחות - בהתאם לבנק המופיע במוצר.");
    sourceRefs.push(...CURRICULUM_SOURCE_REF_PRESETS.moe_portal);
  }

  return {
    coreTopics,
    allowedTopics,
    exposureOnlyTopics,
    enrichmentTopics,
    notExpectedYet,
    skills,
    textComplexityNotes,
    difficultyNotes,
    sourceRefs,
    confidence,
    needsHumanPedagogyReview,
    narrativeNotes: legacy.sourceNotes || "",
    gradeLabelHe: `כיתה ${G_HE[gradeNum]}`,
  };
}

function buildOfficialSpineObject() {
  /** @type {Record<string, Record<string, object>>} */
  const out = {};
  const subjects = Object.keys(ISRAELI_PRIMARY_CURRICULUM_MAP).filter(
    (k) => !k.includes("repo") && k !== "repoHints"
  );

  for (const subjectKey of subjects) {
    const sub = ISRAELI_PRIMARY_CURRICULUM_MAP[subjectKey];
    out[subjectKey] = {};
    for (let g = 1; g <= 6; g++) {
      const gk = gradeNumToKey(g);
      const legacy = sub[gk];
      if (!legacy || !Array.isArray(legacy.coreTopics)) continue;
      out[subjectKey][gk] = buildOfficialGradeSlot(legacy, subjectKey, g);
    }
  }

  return out;
}

export const OFFICIAL_PRIMARY_CURRICULUM_SPINE = buildOfficialSpineObject();

export const OFFICIAL_SPINE_META = {
  phase: "4B-1-math-source",
  generatedFrom:
    "utils/curriculum-audit/israeli-primary-curriculum-map.js + official-curriculum-source-registry (math grades 1–6 PDFs + POP strands; RAMA supporting)",
  scope: "Israeli elementary grades 1–6 - source-anchored planning spine (not syllabus certification)",
  geometryVsMathNote:
    "Geometry appears as its own subject in the product; mathematically it is a strand - comparison reports cross-reference both.",
  moladetaGradeBandNote:
    "Moladeta / society / citizenship items outside grades 2–4 are flagged unless an additional geography source is cited.",
  disclaimer:
    "This spine does not replace Ministry PDF programmes item-by-item. Low-confidence rows require human approval before content changes.",
};

/**
 * Find topic in official spine buckets for a grade.
 * @returns {{ bucket: string, topic: OfficialTopicRef } | null}
 */
export function findOfficialTopicPlacement(subjectKey, gradeNum, normalizedKey) {
  const gk = gradeNumToKey(gradeNum);
  const slot = OFFICIAL_PRIMARY_CURRICULUM_SPINE[subjectKey]?.[gk];
  if (!slot) return null;
  const order = [
    "notExpectedYet",
    "enrichmentTopics",
    "exposureOnlyTopics",
    "allowedTopics",
    "coreTopics",
  ];
  for (const bucket of order) {
    const arr = slot[bucket];
    if (!Array.isArray(arr)) continue;
    const hit = matchTopicDef(
      arr.map((t) => ({ ...t, expectedLevel: t.expectedLevel })),
      normalizedKey
    );
    if (hit) {
      const topic = arr.find((t) => hit.key === t.key || normalizedKey.startsWith(`${hit.key}.`));
      if (topic) return { bucket, topic };
    }
  }
  return null;
}
