/**
 * Generic row identity + diagnostic consistency contract (all subjects / topics / grades).
 * Parent-facing surfaces must trace to stable row identity — never display label alone.
 */

import { splitTopicRowKey } from "../parent-report-row-diagnostics.js";
import { practiceGradeRelation } from "../../lib/learning-supabase/practice-grade-resolution.js";
import {
  classifyTopicEvidenceBand,
  hasTopicLevelEvidence,
  resolveHasSubskillMetadataFromRowSources,
} from "../parent-report-topic-evidence.js";

export const ROW_IDENTITY_CONTRACT_VERSION = "v1";

const SUBJECT_IDS = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];

const SAFE_PART = /^[a-z0-9_-]+$/i;

/**
 * @param {unknown} value
 */
function normalizePart(value) {
  const t = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return SAFE_PART.test(t) ? t : "";
}

/**
 * @param {string} topicRowKey
 */
export function parseCanonicalTopicFromRowKey(topicRowKey) {
  const raw = String(topicRowKey || "").trim();
  if (!raw) return { canonicalTopicKey: "", contentGradeKey: null, topicRowKey: raw };
  const gradeSep = "::grade:";
  if (raw.includes(gradeSep)) {
    const idx = raw.indexOf(gradeSep);
    return {
      canonicalTopicKey: raw.slice(0, idx) || raw,
      contentGradeKey: raw.slice(idx + gradeSep.length) || null,
      topicRowKey: raw,
    };
  }
  const scoped = splitTopicRowKey(raw);
  const gk =
    scoped.gradeScope && scoped.gradeScope !== "unknown" ? String(scoped.gradeScope).trim() : null;
  return {
    canonicalTopicKey: scoped.bucketKey || raw,
    contentGradeKey: gk,
    topicRowKey: raw,
  };
}

/**
 * Stable source id for insight packet / narrative grounding (grade-scoped when applicable).
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {string|null} [contentGradeKey]
 */
export function buildRowSourceId(subjectId, topicRowKey, contentGradeKey = null) {
  const sid = normalizePart(subjectId);
  if (!sid) return "";
  const { canonicalTopicKey, contentGradeKey: gFromKey } = parseCanonicalTopicFromRowKey(topicRowKey);
  const bucket = normalizePart(canonicalTopicKey) || "unknown";
  const gk = normalizePart(contentGradeKey || gFromKey);
  if (gk) return `topic:${sid}:${bucket}:grade:${gk}`;
  return `topic:${sid}:${bucket}`;
}

/**
 * @param {{
 *   subjectId: string;
 *   topicRowKey: string;
 *   displayName?: string;
 *   contentGradeKey?: string|null;
 *   registeredGradeKey?: string|null;
 *   gradeRelation?: string|null;
 *   questions?: number;
 *   correct?: number;
 *   accuracy?: number;
 *   timeSpentMinutes?: number;
 *   latestActivityAt?: string|null;
 *   dataSufficiencyLevel?: string|null;
 *   thinEvidenceDowngraded?: boolean;
 *   hasSubskillMetadata?: boolean;
 *   recommendedStepLabelHe?: string|null;
 *   diagnosticPatternHe?: string|null;
 *   evidenceSources?: string[]|null;
 *   primaryEvidenceSource?: string|null;
 *   evidenceSourceCounts?: Record<string, number>|null;
 * }} fields
 */
export function buildRowIdentityV1(fields) {
  const subjectId = String(fields?.subjectId || "").trim();
  const topicRowKey = String(fields?.topicRowKey || "").trim();
  const parsed = parseCanonicalTopicFromRowKey(topicRowKey);
  const contentGradeKey =
    fields?.contentGradeKey != null && String(fields.contentGradeKey).trim()
      ? String(fields.contentGradeKey).trim()
      : parsed.contentGradeKey;
  const registeredGradeKey =
    fields?.registeredGradeKey != null && String(fields.registeredGradeKey).trim()
      ? String(fields.registeredGradeKey).trim()
      : null;
  const gradeRelation =
    fields?.gradeRelation != null && String(fields.gradeRelation).trim()
      ? String(fields.gradeRelation).trim()
      : practiceGradeRelation(registeredGradeKey, contentGradeKey);
  const questions = Math.max(0, Math.round(Number(fields?.questions) || 0));
  const accuracy = Math.max(0, Math.min(100, Math.round(Number(fields?.accuracy) || 0)));
  const correct =
    fields?.correct != null && Number.isFinite(Number(fields.correct))
      ? Math.max(0, Math.round(Number(fields.correct)))
      : Math.round((questions * accuracy) / 100);
  const timeSpentMinutes = Math.max(0, Math.round(Number(fields?.timeSpentMinutes) || 0));

  return {
    contractVersion: ROW_IDENTITY_CONTRACT_VERSION,
    sourceId: buildRowSourceId(subjectId, topicRowKey, contentGradeKey),
    subjectId,
    topicRowKey,
    canonicalTopicKey: parsed.canonicalTopicKey,
    contentGradeKey,
    registeredGradeKey,
    gradeRelation,
    displayName: String(fields?.displayName || "").trim() || null,
    questions,
    correct,
    accuracy,
    timeSpentMinutes,
    latestActivityAt: fields?.latestActivityAt != null ? String(fields.latestActivityAt) : null,
    evidenceBand: classifyTopicEvidenceBand(questions),
    hasTopicLevelEvidence: hasTopicLevelEvidence(questions),
    dataSufficiencyLevel: String(fields?.dataSufficiencyLevel || "").trim() || null,
    thinEvidenceDowngraded: fields?.thinEvidenceDowngraded === true,
    hasSubskillMetadata: fields?.hasSubskillMetadata === true,
    recommendedStepLabelHe: fields?.recommendedStepLabelHe != null ? String(fields.recommendedStepLabelHe) : null,
    diagnosticPatternHe: fields?.diagnosticPatternHe != null ? String(fields.diagnosticPatternHe).trim() : null,
    evidenceSources: Array.isArray(fields?.evidenceSources)
      ? fields.evidenceSources.map((s) => String(s || "").trim()).filter(Boolean)
      : [],
    primaryEvidenceSource:
      fields?.primaryEvidenceSource != null && String(fields.primaryEvidenceSource).trim()
        ? String(fields.primaryEvidenceSource).trim()
        : null,
    evidenceSourceCounts:
      fields?.evidenceSourceCounts && typeof fields.evidenceSourceCounts === "object" && !Array.isArray(fields.evidenceSourceCounts)
        ? fields.evidenceSourceCounts
        : {},
  };
}

/**
 * @param {ReturnType<typeof buildRowIdentityV1>} identity
 * @returns {"strength"|"focus"|"maintain"|"thin"|"neutral"}
 */
export function classifyRowSectionPlacement(identity) {
  const q = Number(identity?.questions) || 0;
  const acc = Number(identity?.accuracy) || 0;
  if (identity?.thinEvidenceDowngraded || q < 8) return "thin";
  if (q >= 40 && acc >= 78) return "strength";
  if (q >= 12 && acc < 55) return "focus";
  if (q >= 12 && acc >= 80) return "maintain";
  if (q >= 8 && acc < 60) return "focus";
  return "neutral";
}

/** @param {string} label */
const COLLECT_MORE_DATA_HE = "לאסוף עוד מידע";

/**
 * @param {ReturnType<typeof buildRowIdentityV1>} identity
 * @param {string} text
 */
export function textImpliesThinDataMislabel(identity, text) {
  const t = String(text || "");
  if (!t.includes(COLLECT_MORE_DATA_HE) && !/עדיין מוקדם לקבוע|אין מספיק מידע על המצב/u.test(t)) {
    return false;
  }
  return identity.hasTopicLevelEvidence && !identity.thinEvidenceDowngraded;
}

/**
 * @param {ReturnType<typeof buildRowIdentityV1>} identity
 * @param {"strength"|"focus"|"weakness"} section
 */
export function sectionPlacementConsistent(identity, section) {
  const placement = classifyRowSectionPlacement(identity);
  if (section === "strength") {
    return placement === "strength" || placement === "maintain";
  }
  if (section === "focus" || section === "weakness") {
    return placement === "focus";
  }
  return true;
}

/**
 * @param {Array<ReturnType<typeof buildRowIdentityV1>>} identities
 */
export function assertDistinctSourceIds(identities) {
  const seen = new Map();
  for (const id of identities) {
    const sid = id?.sourceId;
    if (!sid) continue;
    if (seen.has(sid) && seen.get(sid) !== id.topicRowKey) {
      return {
        ok: false,
        message: `duplicate sourceId ${sid} for rows ${seen.get(sid)} vs ${id.topicRowKey}`,
      };
    }
    seen.set(sid, id.topicRowKey);
  }
  return { ok: true };
}

/**
 * @param {string} displayName
 * @param {Array<ReturnType<typeof buildRowIdentityV1>>} identities
 */
export function parentLabelHasGradeContext(displayName, identities) {
  const sameLabel = identities.filter((i) => i.displayName === displayName);
  if (sameLabel.length < 2) return true;
  const grades = new Set(sameLabel.map((i) => i.contentGradeKey).filter(Boolean));
  if (grades.size < 2) return true;
  return sameLabel.every(
    (i) =>
      /כיתה|מעל|נמוך|תרגול ב|g[1-6]/iu.test(String(i.recommendedStepLabelHe || "")) === false &&
      (i.contentGradeKey != null || /כיתה|מעל|תרגול/u.test(String(i.displayName || ""))),
  );
}

export const OUTPUT_INTEGRITY_SUBJECT_IDS = SUBJECT_IDS;

export default {
  ROW_IDENTITY_CONTRACT_VERSION,
  parseCanonicalTopicFromRowKey,
  buildRowSourceId,
  buildRowIdentityV1,
  classifyRowSectionPlacement,
  textImpliesThinDataMislabel,
  sectionPlacementConsistent,
  assertDistinctSourceIds,
  parentLabelHasGradeContext,
};
