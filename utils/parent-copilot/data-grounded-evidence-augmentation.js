/**
 * Compact, numeric parent-facing anchor lines when report volume is meaningful but the composed
 * answer still lacks an explicit subject or measurable cue — aligns mass-sim audit + copilot regex.
 * Does not invent facts: uses truthPacket.surfaceFacts + payload rollups only.
 */

import { maxGlobalReportQuestionCount } from "./report-volume-context.js";

/** Mirrors mass QUALITY + copilot harness expectations for grounded parent-facing Hebrew. */
export const DATA_GROUNDED_PARENT_SURFACE_SIGNALS_RE =
  /(עברית|חשבון|מתמטיקה|חישוב|אנגלית|מדעים|גאומטריה|גיאומטריה|מולדת|גאוגרפיה|הבנת\s*הנקרא|קריאה(?!\s+באנגלית)|אוצר\s*מילים|\d+%|\d+\s*שאלות|שאלות\s+בתרגול|לפי\s*הדוח|ממוצע|דיוק)/u;

/**
 * @param {string} text
 */
export function answerHasExplicitSubjectOrNumericEvidence(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/\d/.test(t)) return true;
  return DATA_GROUNDED_PARENT_SURFACE_SIGNALS_RE.test(t);
}

/**
 * @param {{ answerBlocks?: Array<{ textHe?: string }> }} draft
 * @param {unknown} truthPacket
 * @param {unknown} payload
 * @param {{ plannerIntent?: string }} [opts]
 */
export function augmentHighVolumeEvidenceAnchorDraft(draft, truthPacket, payload, opts = {}) {
  const blocks = Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [];
  if (!blocks.length || !truthPacket) return draft;

  const intent = String(opts.plannerIntent || "");
  if (
    intent === "clinical_boundary" ||
    intent === "sensitive_education_choice" ||
    intent === "parent_policy_refusal" ||
    intent === "off_report_subject_clarification" ||
    intent === "off_topic_redirect"
  ) {
    return draft;
  }

  const vol = Math.max(
    maxGlobalReportQuestionCount(payload),
    Math.max(0, Math.round(Number(truthPacket.surfaceFacts?.questions ?? 0))),
  );
  if (vol < 40) return draft;

  const joined = blocks
    .map((b) => String(b?.textHe || ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (answerHasExplicitSubjectOrNumericEvidence(joined)) return draft;

  const subj =
    String(truthPacket.surfaceFacts?.weakFocusSubjectLabelHe || "").trim() ||
    String(truthPacket.surfaceFacts?.subjectLabelHe || "").trim() ||
    "התחום המרכזי שעולה מהדוח";
  const acc = Math.max(0, Math.round(Number(truthPacket.surfaceFacts?.accuracy ?? 0)));
  const line =
    acc > 0
      ? `לפי נתוני הדוח, נענו כ ${vol} שאלות בתרגול, עם דיוק כללי של כ ${acc}%. כרגע כדאי למקד את התרגול ב ${subj}.`
      : `לפי נתוני הדוח, נענו כ ${vol} שאלות בתרגול. כרגע כדאי למקד את התרגול ב ${subj}.`;

  return {
    ...draft,
    answerBlocks: [...blocks, { type: "observation", textHe: line, source: "composed" }],
  };
}

export default { augmentHighVolumeEvidenceAnchorDraft, answerHasExplicitSubjectOrNumericEvidence, DATA_GROUNDED_PARENT_SURFACE_SIGNALS_RE };
