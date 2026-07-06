/**
 * Assertions for global zero-evidence / inactive-subject policy.
 */

import {
  SUBJECT_EVIDENCE_TIER,
  ZERO_EVIDENCE_FORBIDDEN_RE,
  classifySubjectEvidenceTier,
  textViolatesZeroEvidencePolicy,
  zeroEvidenceSubjectLineHe,
} from "../parent-report-language/subject-evidence-policy.js";
import { stripZeroEvidenceFromPublicReportPayload } from "../../lib/parent-server/report-payload-public-sanitize.js";

const ALL_SUBJECTS = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];

const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};

/**
 * @param {unknown} baseReport
 */
export function subjectQuestionCountsFromBase(baseReport) {
  const s = baseReport?.summary || {};
  return {
    math: Number(s.mathQuestions) || 0,
    geometry: Number(s.geometryQuestions) || 0,
    english: Number(s.englishQuestions) || 0,
    science: Number(s.scienceQuestions) || 0,
    hebrew: Number(s.hebrewQuestions) || 0,
    "moledet-geography": Number(s.moledetGeographyQuestions) || 0,
  };
}

/**
 * @param {unknown} detailedReport
 * @param {unknown} baseReport
 */
export function assertZeroEvidencePolicyOnReports(baseReport, detailedReport) {
  const failures = [];
  const counts = subjectQuestionCountsFromBase(baseReport);
  const ov = baseReport?.summary?.diagnosticOverviewHe || {};

  for (const sid of ALL_SUBJECTS) {
    const tier = classifySubjectEvidenceTier(counts[sid]);
    if (tier === SUBJECT_EVIDENCE_TIER.none) {
      const label = SUBJECT_LABEL_HE[sid];
      const forbiddenBundle = [
        ov.mainFocusAreaLineHe,
        ov.strongestAreaLineHe,
        ...(ov.readyForProgressPreviewHe || []),
        ...(ov.requiresAttentionPreviewHe || []),
        ...(ov.insufficientDataSubjectsHe || []),
        ...(ov.thinEvidenceSubjectsHe || []),
      ]
        .filter(Boolean)
        .join("\n");
      if (forbiddenBundle.includes(`${label}:`) && textViolatesZeroEvidencePolicy(forbiddenBundle)) {
        failures.push(`${sid}: zero-evidence subject in diagnostic insight lines`);
      }
      if ((ov.insufficientDataSubjectsHe || []).some((line) => String(line).startsWith(`${label}:`))) {
        failures.push(`${sid}: zero-q subject wrongly in insufficientDataSubjectsHe`);
      }
      if ((ov.thinEvidenceSubjectsHe || []).some((line) => String(line).startsWith(`${label}:`))) {
        failures.push(`${sid}: zero-q subject wrongly in thinEvidenceSubjectsHe`);
      }
      if (ov.notPracticedSubjectsSummaryHe != null && String(ov.notPracticedSubjectsSummaryHe).includes(label)) {
        failures.push(`${sid}: zero-q subject must not appear in notPracticedSubjectsSummaryHe`);
      }
      if ((ov.notPracticedSubjectsHe || []).some((l) => String(l).includes(label))) {
        failures.push(`${sid}: per-subject zero line must not appear in diagnosticOverviewHe`);
      }
    }
  }

  const insightBundle = [
    ov.mainFocusAreaLineHe,
    ov.strongestAreaLineHe,
    ...(ov.readyForProgressPreviewHe || []),
    ...(ov.requiresAttentionPreviewHe || []),
  ]
    .filter(Boolean)
    .join("\n");
  for (const sid of ALL_SUBJECTS) {
    if (classifySubjectEvidenceTier(counts[sid]) !== SUBJECT_EVIDENCE_TIER.none) continue;
    const label = SUBJECT_LABEL_HE[sid];
    if (insightBundle.includes(`${label}:`)) {
      failures.push(`${sid}: appears in מה הכי בולט insight bundle despite 0 questions`);
    }
  }

  if (ov.notPracticedSubjectsSummaryHe != null) {
    failures.push("diagnosticOverviewHe must not expose notPracticedSubjectsSummaryHe");
  }
  if ((ov.notPracticedSubjectsHe || []).length > 0) {
    failures.push("diagnosticOverviewHe must not repeat per-subject notPracticed lines");
  }
  const insightWithPerSubjectZero = (ov.notPracticedSubjectsHe || [])
    .concat(ov.thinEvidenceSubjectsHe || [], ov.insufficientDataSubjectsHe || [])
    .filter((l) => /לא תורגל בתקופה/u.test(String(l)));
  if (insightWithPerSubjectZero.length > 0) {
    failures.push("per-subject לא תורגל lines must not appear in diagnostic overview arrays");
  }

  const home = (detailedReport?.homePlan?.itemsHe || []).join("\n");
  for (const sid of ALL_SUBJECTS) {
    if (classifySubjectEvidenceTier(counts[sid]) !== SUBJECT_EVIDENCE_TIER.none) continue;
    const label = SUBJECT_LABEL_HE[sid];
    if (home.includes(`${label} (`) || home.match(new RegExp(`${label}[^\\n]{0,40}חיזוק`, "u"))) {
      failures.push(`${sid}: home plan recommends unpracticed subject`);
    }
  }

  for (const sp of detailedReport?.subjectProfiles || []) {
    const sid = sp.subject;
    const q = counts[sid] ?? 0;
    if (classifySubjectEvidenceTier(q) === SUBJECT_EVIDENCE_TIER.none) {
      if ((sp.topicRecommendations || []).length > 0) {
        failures.push(`${sid}: topicRecommendations on zero-evidence subject profile`);
      }
    }
  }

  return failures;
}

/**
 * @param {unknown} payload
 * @param {string} subjectId
 */
export function assertCopilotZeroEvidenceClarification(res, subjectId) {
  const failures = [];
  const text = [
    String(res?.clarificationQuestionHe || "").trim(),
    ...(res?.answerBlocks || []).map((b) => String(b?.textHe || "").trim()),
  ]
    .filter(Boolean)
    .join("\n");
  const label = SUBJECT_LABEL_HE[subjectId] || subjectId;
  if (res?.resolutionStatus !== "clarification_required") {
    failures.push(`copilot: expected clarification_required for ${subjectId}, got ${res?.resolutionStatus}`);
  }
  if (!/אין נתוני תרגול|לא נאספו נתוני תרגול|אי אפשר להסיק מסקנה|אי אפשר לקבוע כיוון/u.test(text)) {
    failures.push(`copilot: missing no-data wording for ${label}`);
  }
  if (/כיוון ראשוני/u.test(text)) {
    failures.push(`copilot: forbidden כיוון ראשוני for zero-evidence ${label}`);
  }
  return failures;
}

export function assertEvidenceTierClassification() {
  const failures = [];
  if (classifySubjectEvidenceTier(0) !== SUBJECT_EVIDENCE_TIER.none) failures.push("0 q must be none");
  if (classifySubjectEvidenceTier(7) !== SUBJECT_EVIDENCE_TIER.thin) failures.push("7 q must be thin");
  if (classifySubjectEvidenceTier(8) !== SUBJECT_EVIDENCE_TIER.valid) failures.push("8 q must be valid");
  const zeroLine = zeroEvidenceSubjectLineHe("אנגלית");
  if (textViolatesZeroEvidencePolicy(zeroLine)) failures.push("zero line must not self-violate");
  if (ZERO_EVIDENCE_FORBIDDEN_RE.test(zeroLine)) failures.push("zero line matched forbidden re");
  return failures;
}

export function assertPublicReportPayloadStripsZeroEvidenceFields() {
  const failures = [];
  const cleaned = stripZeroEvidenceFromPublicReportPayload({
    summary: {
      diagnosticOverviewHe: {
        notPracticedSubjectsSummaryHe: "מקצועות שלא תורגלו בתקופה: גאומטריה.",
        practicedSubjectsSummaryHe: "מקצועות שתורגלו: חשבון.",
      },
    },
  });
  const text = JSON.stringify(cleaned);
  if (text.includes("לא תורגל")) failures.push("public payload still contains לא תורגל");
  if (text.includes("מקצועות שלא תורגל")) failures.push("public payload still contains summary line");
  if (cleaned?.summary?.diagnosticOverviewHe?.notPracticedSubjectsSummaryHe != null) {
    failures.push("notPracticedSubjectsSummaryHe should be stripped");
  }
  return failures;
}

export default {
  ALL_SUBJECTS,
  SUBJECT_LABEL_HE,
  subjectQuestionCountsFromBase,
  assertZeroEvidencePolicyOnReports,
  assertCopilotZeroEvidenceClarification,
  assertEvidenceTierClassification,
  assertPublicReportPayloadStripsZeroEvidenceFields,
};
