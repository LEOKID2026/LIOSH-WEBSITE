import {
  classifyActivityEvidence,
  EVIDENCE_CATEGORIES,
} from "../lib/learning/activity-classification.js";
import {
  EVIDENCE_SOURCE,
  normalizeEvidenceSourceKey,
} from "../lib/learning-supabase/evidence-source.js";

export const DIAGNOSTIC_EVIDENCE_ELIGIBILITY_VERSION = 1;

function activitySourceFromEvent(event) {
  const raw =
    event?.evidenceSource ??
    event?.evidenceSourceKey ??
    event?.activitySource ??
    event?.metadata?.evidenceSource;
  const key = normalizeEvidenceSourceKey(raw);
  switch (key) {
    case EVIDENCE_SOURCE.PARENT_ASSIGNED:
      return "assigned_parent";
    case EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED:
      return "assigned_individual";
    case EVIDENCE_SOURCE.CLASSROOM_ASSIGNED:
      return "assigned_class";
    case EVIDENCE_SOURCE.LEARNING_BOOK:
      return "learning_book";
    default:
      return "free_practice";
  }
}

function hintsUsedFromEvent(event) {
  if (event?.hintUsed === true) return 1;
  const hints = Number(event?.hintsUsed ?? event?.metadata?.hintsUsed);
  return Number.isFinite(hints) && hints > 0 ? hints : 0;
}

/**
 * Authoritative eligibility decision shared by DE2, V3, LPD and subskill safety.
 * Diagnostic-guided and competitive evidence remain observable, but they cannot
 * establish an independent misconception recurrence.
 */
export function assessDiagnosticEvidenceEligibility(event) {
  const mode = String(event?.mode || event?.activityMode || "").trim() || null;
  const activitySource = activitySourceFromEvent(event);
  const afterStepByStep =
    event?.afterStepByStep === true ||
    event?.metadata?.afterStepByStep === true;
  const hintsUsed = hintsUsedFromEvent(event);
  const classification = classifyActivityEvidence(mode, activitySource, {
    afterStepByStep,
    hintsUsed,
  });
  const category = classification.evidenceCategory;
  const diagnosticEligible = classification.isDiagnosticEligible === true;
  const independentCategory =
    category === EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT;
  const independentRecurrenceEligible =
    diagnosticEligible &&
    independentCategory &&
    !afterStepByStep &&
    hintsUsed === 0;
  const reasonCodes = [];
  if (!diagnosticEligible) reasonCodes.push("evidence:not_diagnostic");
  if (afterStepByStep) reasonCodes.push("evidence:after_step_by_step");
  if (hintsUsed > 0) reasonCodes.push("evidence:hinted");
  if (
    diagnosticEligible &&
    category === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED
  ) {
    reasonCodes.push("evidence:guided_support_only");
  }
  if (
    diagnosticEligible &&
    category === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE
  ) {
    reasonCodes.push("evidence:competitive_separate_bucket");
  }
  if (independentRecurrenceEligible) {
    reasonCodes.push("evidence:independent_recurrence_eligible");
  }
  return {
    contractVersion: DIAGNOSTIC_EVIDENCE_ELIGIBILITY_VERSION,
    mode,
    activitySource,
    evidenceCategory: category,
    diagnosticEligible,
    independentRecurrenceEligible,
    speedPressureEligible:
      diagnosticEligible &&
      category === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE &&
      !afterStepByStep,
    guidedSupportOnly:
      diagnosticEligible &&
      category === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED,
    reasonCodes,
  };
}

export function isIndependentRecurrenceEvidence(event) {
  return assessDiagnosticEvidenceEligibility(event)
    .independentRecurrenceEligible;
}
