/**
 * Parent report evidence pipeline — FACT / OBSERVED / HYPOTHESIS / CONFIRMED / PROGRESS layers.
 */

import { EVIDENCE_TYPES, evidenceAllowsSpecificDiagnosis } from "./answer-evidence-contract.js";
import { evaluateEvidenceRecurrence } from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { extractMisconceptionTagFromEvent } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";

/** @typedef {"FACT"|"OBSERVED_PATTERN"|"HYPOTHESIS"|"CONFIRMED_PATTERN"|"PROGRESS"} ParentEvidenceStatementKind */

/**
 * @param {object} p
 * @param {number} p.questions
 * @param {number} p.correct
 * @param {number} p.wrong
 * @param {import("../../utils/mistake-event.js").MistakeEventV1[]} [p.wrongEvents]
 * @param {string|null} [p.taxonomyId]
 * @param {object|null} [p.de2Unit]
 */
export function buildParentEvidenceStatements(p) {
  const q = Math.max(0, Number(p.questions) || 0);
  const c = Math.max(0, Number(p.correct) || 0);
  const w = Math.max(0, Number(p.wrong) || 0);
  const acc = q > 0 ? Math.round((c / q) * 100) : 0;
  /** @type {Array<{ kind: ParentEvidenceStatementKind, textHe: string, evidenceRef: object }>} */
  const statements = [];

  statements.push({
    kind: "FACT",
    textHe: `נפתרו ${q} שאלות, ${c} נכונות${w > 0 ? `, ${w} שגויות` : ""}${q > 0 ? ` (דיוק ${acc}%)` : ""}.`,
    evidenceRef: { source: "topic_aggregation", questions: q, correct: c, wrong: w },
  });

  const taxonomyId = p.taxonomyId || p.de2Unit?.diagnosis?.taxonomyId || p.de2Unit?.taxonomy?.id || null;
  const tax = taxonomyId ? TAXONOMY_BY_ID[taxonomyId] : null;
  const wrongEvents = Array.isArray(p.wrongEvents) ? p.wrongEvents.filter((e) => !e.isCorrect) : [];
  const evRec = tax ? evaluateEvidenceRecurrence(wrongEvents, tax) : null;

  if (evRec && evRec.evidenceCount > 0) {
    const tag = evRec.matchingEvents[0]
      ? extractMisconceptionTagFromEvent(evRec.matchingEvents[0])
      : null;
    const examples = evRec.matchingEvents.slice(0, 3).map((e) => ({
      userAnswer: e.userAnswer,
      expectedAnswer: e.correctAnswer,
      exerciseText: e.exerciseText?.slice(0, 120) || null,
      timestamp: e.timestamp,
    }));

    if (tag === "omitted_addend") {
      statements.push({
        kind: "OBSERVED_PATTERN",
        textHe: `ב-${evRec.evidenceCount} מתוך ${evRec.relevantQuestions} תרגילים עם שלושה מחוברים חוברו רק שני המחוברים הראשונים.`,
        evidenceRef: {
          tag,
          evidenceCount: evRec.evidenceCount,
          relevantQuestions: evRec.relevantQuestions,
          examples,
        },
      });
    } else if (tag === "add_instead_of_sub") {
      statements.push({
        kind: "OBSERVED_PATTERN",
        textHe: `ב-${evRec.evidenceCount} מתוך ${evRec.relevantQuestions} תרגילי חיסור, התשובה שווה לחיבור המחוסר והמחסר.`,
        evidenceRef: { tag, evidenceCount: evRec.evidenceCount, examples },
      });
    } else if (tag) {
      statements.push({
        kind: "OBSERVED_PATTERN",
        textHe: `זוהתה חזרתיות (${evRec.evidenceCount}/${evRec.relevantQuestions}) בטעות מסוג «${tag}».`,
        evidenceRef: { tag, evidenceCount: evRec.evidenceCount, examples },
      });
    }

    if (evRec.state === "suspected") {
      statements.push({
        kind: "HYPOTHESIS",
        textHe: `ייתכן שקיים דפוס בטעות «${tag || tax?.patternHe || "לא ידוע"}»; נדרשת שאלת אימות.`,
        evidenceRef: { state: evRec.state, reasonCode: evRec.reasonCode },
      });
    }

    if (evRec.confirmed || evRec.state === "confirmed") {
      statements.push({
        kind: "CONFIRMED_PATTERN",
        textHe: `הדפוס «${tax?.patternHe || tag}» חזר ${evRec.evidenceCount} פעמים עם ראיות תואמות${evRec.matchingEvents.some((e) => e.metadata?.probeConfirmed) ? " ואומת בשאלת בדיקה" : ""}.`,
        evidenceRef: { state: evRec.state, evidenceCount: evRec.evidenceCount },
      });
    }
  }

  const recentCorrect = wrongEvents.length === 0 && c >= 3;
  if (recentCorrect && p.de2Unit?.recurrence?.evidenceRecurrence?.state === "resolved") {
    statements.push({
      kind: "PROGRESS",
      textHe: "בשאלות האחרונות נראה שיפור ביחס לדפוס שזוהה קודם.",
      evidenceRef: { source: "recurrence_resolved" },
    });
  }

  return {
    statements,
    allowsSpecificDiagnosis:
      !!evRec &&
      (evRec.confirmed || evRec.recurrenceMet) &&
      evRec.evidenceCount >= (tax?.minWrong || 3),
    evidenceRecurrence: evRec,
    taxonomyId,
  };
}

/**
 * Gate parent-facing specific copy — returns null when evidence insufficient.
 * @param {string} patternLabel
 * @param {ReturnType<typeof buildParentEvidenceStatements>} pipeline
 */
export function gateParentPatternCopy(patternLabel, pipeline) {
  if (!pipeline?.allowsSpecificDiagnosis) return null;
  const pl = String(patternLabel || "");
  if (/כיוון הפוך|הוספה במקום חיסור/i.test(pl)) {
    const hasAddInstead = pipeline.statements.some(
      (s) =>
        s.kind === "OBSERVED_PATTERN" || s.kind === "CONFIRMED_PATTERN"
          ? s.evidenceRef?.tag === "add_instead_of_sub"
          : false
    );
    if (!hasAddInstead) return null;
  }
  if (/omitted|מחובר|add_three/i.test(pl)) {
    const hasOmitted = pipeline.statements.some((s) => s.evidenceRef?.tag === "omitted_addend");
    if (!hasOmitted) return null;
  }
  return pl;
}

/**
 * @param {unknown} answerPayload
 */
export function extractAnswerEvidenceFromPayload(answerPayload) {
  if (!answerPayload || typeof answerPayload !== "object") return null;
  const p = /** @type {Record<string, unknown>} */ (answerPayload);
  return p.answerEvidence || p.questionEngine?.answerEvidence || null;
}

export { evidenceAllowsSpecificDiagnosis, EVIDENCE_TYPES };
