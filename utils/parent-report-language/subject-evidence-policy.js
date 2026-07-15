/**
 * Global subject evidence tiers for parent reports (all six subjects).
 * - none: 0 questions — no diagnostic conclusions
 * - thin: 1..VALID_MIN-1 — cautious wording only
 * - valid: VALID_MIN+ — may appear in insights/recommendations
 */

import {
  PARENT_EVIDENCE_VOLUME,
  SUBJECT_VALID_MIN_QUESTIONS,
} from "./parent-evidence-matrix.js";
import { effectivePracticeAnswerCount } from "../../lib/learning/report-practice-counts.js";

export { SUBJECT_VALID_MIN_QUESTIONS };

/** Card-visible Hebrew labels (+ aliases used in parentFacing insights). */
export const SUBJECT_VISIBLE_LABELS_HE = Object.freeze({
  math: ["מתמטיקה", "חשבון"],
  geometry: ["גאומטריה"],
  english: ["אנגלית"],
  science: ["מדעים"],
  history: ["היסטוריה"],
  hebrew: ["עברית"],
  "moledet-geography": ["מולדת וגאוגרפיה"],
  moledet: ["מולדת"],
  geography: ["גאוגרפיה"],
});

/** Primary label per subject id (matches subject cards). */
export const SUBJECT_LABEL_BY_ID = Object.freeze({
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
  moledet: "מולדת",
  geography: "גאוגרפיה",
});

export const SUBJECT_EVIDENCE_TIER = Object.freeze({
  none: "none",
  thin: "thin",
  valid: "valid",
});

/** Subject-specific insight wording forbidden when visible questions = 0. */
export const ZERO_EVIDENCE_SUBJECT_INSIGHT_RE =
  /(?:יש\s+(?:עדיין\s+)?מעט\s+(?:נתונ|מידע|תרגול)|טעויות\s+חוזרות|נראה\s+שיש\s+קושי|כדאי\s+לשים\s+לב|נושא\s+לחיזוק|מוקד\s+לתרגול|התקדמות\s+יחסית|מגמת\s|יש\s+מגמה|מגמה\s+(?:חיובית|שלילית|ברורה|כללית))/u;

/** Wording that must never accompany zero-question subjects (not bare «מגמה» — executive trend lines may quote it). */
export const ZERO_EVIDENCE_FORBIDDEN_RE =
  /כיוון ראשוני|אפשר לקבל כיוון|תחום לחיזוק|נושא למעקב|כדאי לתרגל עוד כדי לחזק|דורש חיזוק|דורש תשומת לב|מעט מדי לסיכום עשיר/u;

/**
 * @param {number} questionCount
 * @returns {typeof SUBJECT_EVIDENCE_TIER[keyof typeof SUBJECT_EVIDENCE_TIER]}
 */
export function classifySubjectEvidenceTier(questionCount) {
  const q = Math.max(0, Math.floor(Number(questionCount) || 0));
  if (q === 0) return SUBJECT_EVIDENCE_TIER.none;
  if (q < SUBJECT_VALID_MIN_QUESTIONS) return SUBJECT_EVIDENCE_TIER.thin;
  return SUBJECT_EVIDENCE_TIER.valid;
}

/**
 * @param {string} subjectLabel
 */
export function zeroEvidenceSubjectLineHe(subjectLabel) {
  return `${subjectLabel}: לא תורגל בתקופה שנבחרה`;
}

/**
 * @param {string} subjectLabel
 * @param {number} q
 */
export function thinEvidenceSubjectLineHe(subjectLabel, q) {
  const n = Math.max(0, Math.floor(Number(q) || 0));
  return `${subjectLabel}: ${n} שאלות בתקופה שנבחרה - עדיין מעט מידע; כדאי להמשיך לתרגל ולבדוק שוב`;
}

/**
 * @param {string} subjectLabel
 * @param {number} q
 */
export function insufficientSubjectQuestionsLineHe(subjectLabel, q) {
  const tier = classifySubjectEvidenceTier(q);
  if (tier === SUBJECT_EVIDENCE_TIER.none) return zeroEvidenceSubjectLineHe(subjectLabel);
  if (tier === SUBJECT_EVIDENCE_TIER.thin) return thinEvidenceSubjectLineHe(subjectLabel, q);
  return null;
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function buildSubjectEvidenceCoverageLines(subjectQuestionCounts, subjectLabelById) {
  /** @type {string[]} */
  const notPracticedSubjectsHe = [];
  /** @type {string[]} */
  const thinEvidenceSubjectsHe = [];
  for (const [sid, label] of Object.entries(subjectLabelById)) {
    const q = Math.max(0, Math.floor(Number(subjectQuestionCounts[sid]) || 0));
    const tier = classifySubjectEvidenceTier(q);
    if (tier === SUBJECT_EVIDENCE_TIER.none) {
      notPracticedSubjectsHe.push(zeroEvidenceSubjectLineHe(label));
    } else if (tier === SUBJECT_EVIDENCE_TIER.thin) {
      thinEvidenceSubjectsHe.push(thinEvidenceSubjectLineHe(label, q));
    }
  }
  return {
    /** Per-subject lines — for dedicated coverage tooling only; omit from diagnostic overview UI */
    notPracticedSubjectsHe,
    thinEvidenceSubjectsHe,
    /** @deprecated use thinEvidenceSubjectsHe — never includes zero-q subjects */
    insufficientDataSubjectsHe: thinEvidenceSubjectsHe,
    notPracticedSubjectsSummaryHe: notPracticedSubjectsSummaryLineHe(
      subjectQuestionCounts,
      subjectLabelById,
    ),
  };
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 */
export function practicedSubjectIds(subjectQuestionCounts) {
  return Object.keys(subjectQuestionCounts || {}).filter(
    (sid) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) === SUBJECT_EVIDENCE_TIER.valid,
  );
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function practicedSubjectsSummaryLineHe(subjectQuestionCounts, subjectLabelById) {
  const practiced = Object.entries(subjectLabelById)
    .filter(([sid]) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) !== SUBJECT_EVIDENCE_TIER.none)
    .map(([, label]) => label);
  if (practiced.length === 0) return "בתקופה שנבחרה לא תועד תרגול במקצועות שבדוח.";
  if (practiced.length === 1) return `המקצוע שתורגל בתקופה: ${practiced[0]}.`;
  return `המקצועות שתורגלו בתקופה: ${practiced.join(", ")}.`;
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function notPracticedSubjectsSummaryLineHe(subjectQuestionCounts, subjectLabelById) {
  const labels = Object.entries(subjectLabelById)
    .filter(([sid]) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) === SUBJECT_EVIDENCE_TIER.none)
    .map(([, label]) => label);
  if (!labels.length) return null;
  return `מקצועות שלא תורגלו בתקופה: ${labels.join(", ")}.`;
}

/**
 * @param {string} subjectLabel
 */
export function zeroEvidenceSubjectCopilotHe(subjectLabel) {
  return `בתקופה שנבחרה לא נאספו נתוני תרגול ב${subjectLabel}, ולכן אי אפשר לקבוע כיוון לפי הדוח הנוכחי.`;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function textViolatesZeroEvidencePolicy(text) {
  return ZERO_EVIDENCE_FORBIDDEN_RE.test(String(text || ""));
}

/**
 * Visible question counts aligned with subject cards (diagnosticAnswers / v2 summary).
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function subjectQuestionCountsFromPayload(payload) {
  const s = payload?.summary || {};
  if (
    s.mathQuestions != null ||
    s.englishQuestions != null ||
    s.geometryQuestions != null ||
    s.hebrewQuestions != null ||
    s.scienceQuestions != null ||
    s.historyQuestions != null ||
    s.moledetGeographyQuestions != null
  ) {
    return {
      math: Math.max(0, Math.floor(Number(s.mathQuestions) || 0)),
      geometry: Math.max(0, Math.floor(Number(s.geometryQuestions) || 0)),
      english: Math.max(0, Math.floor(Number(s.englishQuestions) || 0)),
      science: Math.max(0, Math.floor(Number(s.scienceQuestions) || 0)),
      history: Math.max(0, Math.floor(Number(s.historyQuestions) || 0)),
      hebrew: Math.max(0, Math.floor(Number(s.hebrewQuestions) || 0)),
      "moledet-geography": Math.max(0, Math.floor(Number(s.moledetGeographyQuestions) || 0)),
    };
  }

  const subjects = payload?.subjects || {};
  const read = (canonicalId) => {
    const aggKey = canonicalId === "moledet-geography" ? "moledet_geography" : canonicalId;
    const subj = subjects[aggKey];
    if (!subj || typeof subj !== "object") return 0;
    return effectivePracticeAnswerCount(subj);
  };

  return {
    math: read("math"),
    geometry: read("geometry"),
    english: read("english"),
    science: read("science"),
    history: read("history"),
    hebrew: read("hebrew"),
    "moledet-geography": read("moledet-geography"),
  };
}

/**
 * @param {string} text
 * @param {string} label
 */
export function lineMentionsSubjectLabelHe(text, label) {
  const t = String(text || "");
  const lab = String(label || "").trim();
  if (!t || !lab) return false;
  return (
    t.startsWith(`${lab}:`) ||
    t.startsWith(`${lab} -`) ||
    t.includes(`${lab}:`) ||
    t.includes(`ב${lab}`) ||
    t.includes(`${lab},`)
  );
}

/**
 * @param {string} line
 * @param {Record<string, number>} subjectQuestionCounts
 * @returns {string|null} canonical subject id when line mentions a zero-evidence subject
 */
export function lineMentionsZeroEvidenceSubjectHe(line, subjectQuestionCounts) {
  const t = String(line || "");
  if (!t) return null;
  for (const [sid, labels] of Object.entries(SUBJECT_VISIBLE_LABELS_HE)) {
    if (classifySubjectEvidenceTier(subjectQuestionCounts[sid]) !== SUBJECT_EVIDENCE_TIER.none) continue;
    for (const label of labels) {
      if (lineMentionsSubjectLabelHe(t, label)) return sid;
    }
  }
  return null;
}

/**
 * @param {unknown[]} recentMistakes
 * @param {Record<string, number>} subjectQuestionCounts
 */
export function filterRecentMistakesForVisibleSubjects(recentMistakes, subjectQuestionCounts) {
  return (recentMistakes || []).filter((m) => {
    const raw = String(m?.subject || "").trim();
    if (!raw) return false;
    const sid = raw === "moledet_geography" ? "moledet-geography" : raw;
    return (Number(subjectQuestionCounts[sid]) || 0) > 0;
  });
}

/**
 * @param {string} line
 * @param {Record<string, number>} subjectQuestionCounts
 */
export function lineViolatesZeroEvidenceInsightPolicy(line, subjectQuestionCounts) {
  const sid = lineMentionsZeroEvidenceSubjectHe(line, subjectQuestionCounts);
  if (!sid) return false;
  return ZERO_EVIDENCE_SUBJECT_INSIGHT_RE.test(String(line || ""));
}

/**
 * @param {string[]} lines
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} [subjectLabelById]
 */
export function filterInsightLinesForUnpracticedSubjects(lines, subjectQuestionCounts, subjectLabelById) {
  void subjectLabelById;
  return (lines || []).filter((line) => {
    const t = String(line || "");
    if (!t) return false;
    return !lineMentionsZeroEvidenceSubjectHe(t, subjectQuestionCounts);
  });
}

export default {
  SUBJECT_VALID_MIN_QUESTIONS,
  SUBJECT_VISIBLE_LABELS_HE,
  SUBJECT_LABEL_BY_ID,
  SUBJECT_EVIDENCE_TIER,
  ZERO_EVIDENCE_FORBIDDEN_RE,
  ZERO_EVIDENCE_SUBJECT_INSIGHT_RE,
  classifySubjectEvidenceTier,
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
  insufficientSubjectQuestionsLineHe,
  buildSubjectEvidenceCoverageLines,
  practicedSubjectIds,
  practicedSubjectsSummaryLineHe,
  notPracticedSubjectsSummaryLineHe,
  zeroEvidenceSubjectCopilotHe,
  textViolatesZeroEvidencePolicy,
  subjectQuestionCountsFromPayload,
  lineMentionsSubjectLabelHe,
  lineMentionsZeroEvidenceSubjectHe,
  filterRecentMistakesForVisibleSubjects,
  lineViolatesZeroEvidenceInsightPolicy,
  filterInsightLinesForUnpracticedSubjects,
};
