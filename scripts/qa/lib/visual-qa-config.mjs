/**
 * Visual QA Harness — env, students, subject plans.
 */

import { GRADES as GEOMETRY_GRADES, TOPICS as GEOMETRY_TOPICS } from "../../../utils/geometry-constants.js";
import { SCIENCE_GRADES } from "../../../data/science-curriculum.js";
import { GRADES as MOLEDET_GRADES, TOPICS as MOLEDET_TOPICS } from "../../../utils/moledet-geography-constants.js";
import { MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE } from "../../../utils/moledet-geography-curriculum-gates.js";
import { HISTORY_TOPIC_ORDER, HISTORY_TOPIC_LABEL_HE } from "../../../data/history-curriculum.js";

export const GRADE_HE = {
  1: "כיתה א׳",
  2: "כיתה ב׳",
  3: "כיתה ג׳",
  4: "כיתה ד׳",
  5: "כיתה ה׳",
  6: "כיתה ו׳",
};

/** Two AAA test students per grade (pin 1234 for all). */
export const GRADE_STUDENTS = {
  1: [
    { label: "AAA1", username: "AAA1", code: "", pin: "1234" },
    { label: "AAA2", username: "AAA2", code: "", pin: "1234" },
  ],
  2: [
    { label: "AAA3", username: "AAA3", code: "", pin: "1234" },
    { label: "AAA4", username: "AAA4", code: "", pin: "1234" },
  ],
  3: [
    { label: "AAA5", username: "AAA5", code: "", pin: "1234" },
    { label: "AAA6", username: "AAA6", code: "", pin: "1234" },
  ],
  4: [
    { label: "AAA7", username: "AAA7", code: "", pin: "1234" },
    { label: "AAA8", username: "AAA8", code: "", pin: "1234" },
  ],
  5: [
    { label: "AAA9", username: "AAA9", code: "", pin: "1234" },
    { label: "AAA10", username: "AAA10", code: "", pin: "1234" },
  ],
  6: [
    { label: "AAA11", username: "AAA11", code: "", pin: "1234" },
    { label: "AAA12", username: "AAA12", code: "", pin: "1234" },
  ],
};

export const PHASE1_SUBJECTS = new Set(["math", "geometry", "hebrew", "english", "science", "moledet", "history"]);
export const FUTURE_SUBJECTS = new Set([]);

/** Visual QA harness key `moledet` → product subject `moledet-geography` (activities use moledet_geography). */
export const VISUAL_QA_PRODUCT_SUBJECT_ID = {
  moledet: "moledet-geography",
};

const TOPIC = (value, label) => ({ value, label });

function geometryTopicsByGradeFromProduct() {
  const out = {};
  for (let gradeNumber = 1; gradeNumber <= 6; gradeNumber += 1) {
    const gradeKey = `g${gradeNumber}`;
    const keys = (GEOMETRY_GRADES[gradeKey]?.topics || []).filter((k) => k !== "mixed");
    out[gradeNumber] = keys.map((value) => ({
      value,
      label: GEOMETRY_TOPICS[value]?.name || value,
    }));
  }
  return out;
}

const SCIENCE_TOPIC_LABELS = {
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  earth_space: "כדור הארץ והחלל",
  environment: "סביבה ואקולוגיה",
  experiments: "ניסויים ותהליכים",
};

function scienceTopicsByGradeFromProduct() {
  const out = {};
  for (let gradeNumber = 1; gradeNumber <= 6; gradeNumber += 1) {
    const gradeKey = `g${gradeNumber}`;
    const keys = (SCIENCE_GRADES[gradeKey]?.topics || []).filter((k) => k !== "mixed");
    out[gradeNumber] = keys.map((value) => ({
      value,
      label: SCIENCE_TOPIC_LABELS[value] || value,
    }));
  }
  return out;
}

function moledetTopicsByGradeFromProduct() {
  const out = {};
  for (let gradeNumber = MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE; gradeNumber <= 6; gradeNumber += 1) {
    const gradeKey = `g${gradeNumber}`;
    const keys = (MOLEDET_GRADES[gradeKey]?.topics || []).filter((k) => k !== "mixed");
    out[gradeNumber] = keys.map((value) => ({
      value,
      label: MOLEDET_TOPICS[value]?.name || value,
    }));
  }
  return out;
}

function historyTopicsByGradeFromProduct() {
  const topics = HISTORY_TOPIC_ORDER.filter((k) => k !== "mixed").map((value) => ({
    value,
    label: HISTORY_TOPIC_LABEL_HE[value] || value,
  }));
  return { 6: topics };
}

/** Grades included in Visual QA for moledet-geography (G1 excluded — enrichment only). */
export function visualQaGradeNumbersForSubject(subject, gradeFilter = null) {
  if (gradeFilter != null) {
    if (subject === "moledet" && gradeFilter < MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE) {
      return [];
    }
    if (subject === "history" && gradeFilter !== 6) {
      return [];
    }
    return [gradeFilter];
  }
  if (subject === "moledet") {
    return [2, 3, 4, 5, 6];
  }
  if (subject === "history") {
    return [6];
  }
  return [1, 2, 3, 4, 5, 6];
}

export const SUBJECT_PLANS = {
  math: {
    path: "/learning/math-master",
    playerTestId: "math-player-name",
    gradeSelectTestId: "math-grade-select",
    gradeValueKind: "numeric",
    topicSelectTestId: "math-operation-select",
    startTestId: "math-start-game",
    topicsByGrade: {
      1: [TOPIC("addition", "חיבור"), TOPIC("subtraction", "חיסור")],
      2: [TOPIC("addition", "חיבור"), TOPIC("fractions", "שברים")],
      3: [
        TOPIC("addition", "חיבור"),
        TOPIC("division_with_remainder", "חילוק עם שארית"),
        TOPIC("fractions", "שברים"),
        TOPIC("order_of_operations", "סדר פעולות"),
      ],
      4: [TOPIC("powers", "חזקות"), TOPIC("word_problems", "בעיות מילוליות")],
      5: [TOPIC("percentages", "אחוזים"), TOPIC("fractions", "שברים")],
      6: [TOPIC("ratio", "יחס"), TOPIC("scale", "קנה מידה")],
    },
  },
  geometry: {
    path: "/learning/geometry-master",
    playerTestId: "geometry-player-name",
    gradeSelectAfterPlayer: true,
    gradeValueKind: "g-key",
    topicSelectTestId: "geometry-topic-select",
    startTestId: "geometry-start-game",
    topicsByGrade: geometryTopicsByGradeFromProduct(),
  },
  hebrew: {
    path: "/learning/hebrew-master",
    playerTestId: "hebrew-player-name",
    gradeSelectAfterPlayer: true,
    gradeValueKind: "numeric",
    topicSelectTestId: "hebrew-topic-select",
    startTestId: "hebrew-start-game",
    topicsByGrade: {
      1: [TOPIC("reading", "קריאה"), TOPIC("vocabulary", "אוצר מילים")],
      2: [TOPIC("reading", "קריאה"), TOPIC("grammar", "דקדוק")],
      3: [TOPIC("reading", "קריאה"), TOPIC("grammar", "דקדוק"), TOPIC("vocabulary", "עושר שפתי")],
      4: [TOPIC("reading", "קריאה"), TOPIC("grammar", "דקדוק")],
      5: [TOPIC("grammar", "דקדוק"), TOPIC("writing", "כתיבה")],
      6: [TOPIC("grammar", "דקדוק"), TOPIC("writing", "כתיבה")],
    },
  },
  english: {
    path: "/learning/english-master",
    playerTestId: "english-player-name",
    gradeSelectAfterPlayer: true,
    gradeValueKind: "numeric",
    topicSelectTestId: "english-topic-select",
    startTestId: "english-start-game",
    topicsByGrade: {
      1: [TOPIC("vocabulary", "אוצר מילים"), TOPIC("phonics", "פוניקה")],
      2: [TOPIC("vocabulary", "אוצר מילים"), TOPIC("reading", "קריאה")],
      3: [TOPIC("vocabulary", "אוצר מילים"), TOPIC("grammar", "דקדוק")],
      4: [TOPIC("grammar", "דקדוק"), TOPIC("reading", "קריאה")],
      5: [TOPIC("grammar", "דקדוק"), TOPIC("writing", "כתיבה")],
      6: [TOPIC("grammar", "דקדוק"), TOPIC("writing", "כתיבה")],
    },
  },
  science: {
    path: "/learning/science-master",
    playerTestId: "science-player-name",
    gradeSelectAfterPlayer: true,
    gradeValueKind: "g-key",
    topicSelectTestId: "science-topic-select",
    startTestId: "science-start-game",
    topicsByGrade: scienceTopicsByGradeFromProduct(),
  },
  moledet: {
    path: "/learning/moledet-geography-master",
    playerTestId: "moledet-player-name",
    gradeSelectTestId: "moledet-grade-select",
    gradeValueKind: "numeric",
    topicSelectTestId: "moledet-topic-select",
    startTestId: "moledet-start-game",
    topicsByGrade: moledetTopicsByGradeFromProduct(),
  },
  history: {
    path: "/learning/history-master",
    playerTestId: "science-player-name",
    gradeSelectAfterPlayer: true,
    gradeValueKind: "g-key",
    topicSelectTestId: "science-topic-select",
    startTestId: "science-start-game",
    surfaceSubject: "science",
    topicsByGrade: historyTopicsByGradeFromProduct(),
  },
};

/** Deterministic small offset from a seed string (topic rotation / round variation). */
export function hashSampleSeed(seed) {
  const s = String(seed || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function sampleSeedTopicOffset(seed, topicCount) {
  const n = Math.max(1, Number(topicCount) || 1);
  return hashSampleSeed(seed) % n;
}

export function parseHarnessEnv() {
  const subject = String(process.env.VISUAL_QA_SUBJECT || "").trim().toLowerCase();
  const mode = String(process.env.VISUAL_QA_MODE || "sample").trim().toLowerCase();
  const samplesPerGrade = Math.max(
    1,
    Number(process.env.VISUAL_QA_SAMPLES_PER_GRADE || process.env.VISUAL_QA_SAMPLES_PER_SUBJECT || 2) || 2
  );
  const useSecondStudent =
    process.env.VISUAL_QA_USE_SECOND_STUDENT === "1" ||
    process.env.VISUAL_QA_USE_SECOND_STUDENT === "true";
  const allowMutations =
    process.env.VISUAL_QA_ALLOW_MUTATIONS === "1" ||
    process.env.VISUAL_QA_ALLOW_MUTATIONS === "true";
  const outputDir = String(process.env.VISUAL_QA_OUTPUT_DIR || "").trim();
  const sampleSeed = String(process.env.VISUAL_QA_SAMPLE_SEED || "").trim();
  const gradeFilterParsed = parseGradeFilter(process.env.VISUAL_QA_GRADE_FILTER);
  const gradeFilter = gradeFilterParsed.ok ? gradeFilterParsed.grade : null;

  return {
    subject,
    mode,
    samplesPerGrade,
    useSecondStudent,
    allowMutations,
    outputDir,
    sampleSeed,
    gradeFilter,
  };
}

/** @returns {{ ok: true, grade: number } | { ok: false, error: string }} */
export function parseGradeFilter(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: true, grade: null };
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    return { ok: false, error: `VISUAL_QA_GRADE_FILTER must be an integer 1–6, got "${raw}"` };
  }
  return { ok: true, grade: n };
}

export function resolveSubject(subject) {
  if (!subject) {
    return {
      ok: false,
      error:
        "VISUAL_QA_SUBJECT is required (math | geometry | hebrew | english | science | moledet | history)",
    };
  }
  if (FUTURE_SUBJECTS.has(subject)) {
    return {
      ok: false,
      error: `Subject "${subject}" is not implemented in harness phase 1. Supported: math, geometry, hebrew, english, science, moledet, history.`,
    };
  }
  if (!PHASE1_SUBJECTS.has(subject)) {
    return {
      ok: false,
      error: `Unknown VISUAL_QA_SUBJECT="${subject}". Supported: math, geometry, hebrew, english, science, moledet, history.`,
    };
  }
  return { ok: true, plan: SUBJECT_PLANS[subject], subject };
}

export function studentForGrade(gradeNumber, useSecondStudent) {
  const pair = GRADE_STUDENTS[gradeNumber];
  if (!pair) return null;
  return pair[useSecondStudent ? 1 : 0];
}

export function topicsForGrade(plan, gradeNumber) {
  const list = plan.topicsByGrade?.[gradeNumber];
  if (list?.length) return list;
  return plan.topics || [{ value: "mixed", label: "מעורב" }];
}
