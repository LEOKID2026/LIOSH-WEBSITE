/**
 * Phase E — Parent Copilot general-education path for external / thin-context questions.
 * Read-only; does not write banks, taxonomies, diagnostics, or planner state.
 */

import { buildTruthPacketV1 } from "../parent-copilot/truth-packet-v1.js";
import {
  shouldPhaseEBypassClarification,
  matchLooseTopicFromUtterance,
  looksLikeExternalPastedQuestion,
  isPracticeSuggestionRequest,
  PHASE_E_GENERAL_DISCLAIMER_LINE,
} from "./classifier.js";

const INTERPRETATION_SCOPES = new Set([
  "recommendation",
  "confidence_uncertainty",
  "strengths",
  "weaknesses",
  "blocked_advance",
  "executive",
]);

/**
 * @param {unknown} stageA
 */
function resolveInterpretationScope(stageA) {
  const sc = String(stageA?.scopeClass || "executive").trim();
  if (INTERPRETATION_SCOPES.has(sc)) return sc;
  return "executive";
}

/**
 * Optional human-review signal for practice-idea turns (review-only; not production content).
 * Parent Copilot runs in the browser — no Node fs here. Enable server-side NDJSON capture from API later if needed.
 * @param {Record<string, unknown>} entry
 */
export function appendPhaseEPracticeReviewRecord(entry) {
  try {
    if (typeof window !== "undefined") return;
    if (process.env.PARENT_AI_PRACTICE_REVIEW_LOG !== "1") return;
    console.info("[parent-ai-practice-review]", JSON.stringify({ t: Date.now(), ...entry }));
  } catch {
    /* best-effort */
  }
}

/**
 * Build an early-exit draft when scope resolution would otherwise ask for clarification.
 * @param {{
 *   utteranceStr: string;
 *   payload: unknown;
 *   scopeRes: {
 *     resolutionStatus?: string;
 *     scopeReason?: string;
 *     clarificationQuestionHe?: string;
 *     stageA?: unknown;
 *   };
 *   stageA: {
 *     canonicalIntent?: string;
 *     canonicalIntentScore?: number;
 *     intentReason?: string;
 *     scopeClass?: string;
 *   };
 * }} input
 * @returns {null|{
 *   truthPacket: NonNullable<ReturnType<typeof buildTruthPacketV1>>;
 *   plannerIntent: string;
 *   scopeMeta: Record<string, unknown>;
 *   answerBlocks: Array<{ type: string; textHe: string; source: string }>;
 * }}
 */
export function tryBuildPhaseEClarificationBypassDraft(input) {
  const utteranceStr = String(input?.utteranceStr || "").trim();
  const payload = input?.payload;
  const scopeRes = input?.scopeRes || {};
  const stageA = input?.stageA && typeof input.stageA === "object" ? input.stageA : {};

  if (!shouldPhaseEBypassClarification(scopeRes, utteranceStr, stageA, payload)) return null;

  const practice = isPracticeSuggestionRequest(utteranceStr);
  const loose = matchLooseTopicFromUtterance(utteranceStr, payload);

  /** @type {"practice_suggestion_general"|"catalog_topic_without_anchor"|"general_external_education"} */
  let phaseERoute = "general_external_education";
  if (practice) phaseERoute = "practice_suggestion_general";
  else if (loose && !loose.anchored) phaseERoute = "catalog_topic_without_anchor";

  const interpretationScope = resolveInterpretationScope(stageA);
  const scope = {
    scopeType: /** @type {const} */ ("executive"),
    scopeId: "executive",
    scopeLabel: "הדוח בתקופה הנבחרה",
    canonicalIntent: "explain_report",
    interpretationScope,
    scopeClass: interpretationScope,
  };

  const truthPacket = buildTruthPacketV1(payload, scope);
  if (!truthPacket) return null;

  /** @type {string} */
  let observation;
  /** @type {string} */
  let meaning;

  if (practice) {
    observation = `${PHASE_E_GENERAL_DISCLAIMER_LINE}.`;
    meaning =
      "רעיון תרגול כללי (לא שאלה מהמאגר הרשמי): קצרו משימה לדקה אחת על אותו רעיון, ובקשו מהילד להסביר במילים מה עשה לפני שממשיכים. זה לא מעדכן המלצות או אבחון במערכת.";
    appendPhaseEPracticeReviewRecord({
      route: phaseERoute,
      utterancePreview: utteranceStr.slice(0, 240),
    });
  } else if (phaseERoute === "catalog_topic_without_anchor" && loose) {
    observation =
      `בשלב זה - עדיין מוקדם לקבוע לגבי ילדכם מתוך האבחון הרשמי. הכותרת «${loose.displayName}» מוכרת במבנה הנושאים, אך אין בדוח ניסוח מעוגן לילד בנושא הזה - ההמשך הוא הסבר כללי בלבד ולא ניתוח רשמי של המערכת.`;
    meaning =
      "לא ניתן להציג זאת כחולשה או חוזק של הילד במערכת. כשיופיע ניסוח מעוגן בדוח, אפשר יחזור לשאלה מתוך הדוח.";
  } else {
    const externalHint = looksLikeExternalPastedQuestion(utteranceStr)
      ? " אם מדובר בשאלה שהודבקה מבחוץ, היא מחוץ למסגרת השאלות הרשמיות של הדוח."
      : "";
    observation =
      `בשלב זה - עדיין מוקדם לקבוע כל דבר על ילדכם מתוך האבחון הרשמי של המערכת לגבי הנושא ששאלתם. זהו הסבר חינוכי כללי בלבד; הוא אינו נשען על מאגר השאלות הרשמי ואינו מהווה אבחון.${externalHint}`;
    meaning =
      "לא ניתן להציג את זה כחולשה או חוזק של הילד במערכת; זה לא מחליף המלצות רשמיות מהאבחון.";
  }

  const answerBlocks = [
    { type: "observation", textHe: observation.trim(), source: "composed" },
    { type: "meaning", textHe: meaning.trim(), source: "composed" },
  ];

  const scopeMeta = {
    scopeConfidence: 0.55,
    scopeReason: `phase_e:${phaseERoute}`,
    intentConfidence: Number(stageA.canonicalIntentScore ?? 0.62),
    intentReason: String(stageA.intentReason || "phase_e_external_route"),
    phaseERoute,
    ...(loose ? { phaseELooseTopicKey: loose.topicRowKey, phaseELooseSubjectId: loose.subjectId } : {}),
  };

  return {
    truthPacket,
    plannerIntent: "explain_report",
    scopeMeta,
    answerBlocks,
  };
}

/**
 * When a topic exists but child-level evidence in the report is thin, prepend an explicit caution (topic scope only).
 * @param {{ answerBlocks?: Array<{ type: string; textHe: string; source: string }> }} draft
 * @param {NonNullable<ReturnType<typeof buildTruthPacketV1>>} truthPacket
 */
/**
 * When scope resolved normally but the utterance is clearly an external paste or a practice-idea request,
 * stay with Parent Copilot but answer from Phase E safe templates (no pseudo-diagnosis).
 * @param {{
 *   utteranceStr: string;
 *   truthPacket: NonNullable<ReturnType<typeof buildTruthPacketV1>>;
 *   scope: { scopeType?: string };
 *   stageA: { canonicalIntentScore?: number; intentReason?: string };
 * }} input
 */
export function tryBuildPhaseEResolvedShortcutDraft(input) {
  const utteranceStr = String(input?.utteranceStr || "").trim();
  const truthPacket = input?.truthPacket;
  const scope = input?.scope && typeof input.scope === "object" ? input.scope : {};
  const stageA = input?.stageA && typeof input.stageA === "object" ? input.stageA : {};
  if (!truthPacket) return null;
  const st = String(scope.scopeType || "");
  if (st !== "executive" && st !== "topic") return null;

  const practice = isPracticeSuggestionRequest(utteranceStr);
  const external = looksLikeExternalPastedQuestion(utteranceStr);
  if (!practice && !external) return null;

  /** @type {string} */
  let observation;
  /** @type {string} */
  let meaning;
  /** @type {string} */
  let phaseERoute;

  if (practice) {
    phaseERoute = "practice_suggestion_general";
    observation = `${PHASE_E_GENERAL_DISCLAIMER_LINE}.`;
    meaning =
      "רעיון תרגול כללי (לא שאלה מהמאגר הרשמי): קצרו משימה לדקה אחת על אותו רעיון, ובקשו מהילד להסביר במילים מה עשה לפני שממשיכים. זה לא מעדכן המלצות או אבחון במערכת.";
    appendPhaseEPracticeReviewRecord({
      route: phaseERoute,
      utterancePreview: utteranceStr.slice(0, 240),
      scopeType: st,
    });
  } else {
    phaseERoute = "resolved_external_paste";
    const topicHint =
      st === "topic"
        ? ` לגבי הנושא «${String(truthPacket.surfaceFacts?.displayName || truthPacket.scopeLabel || "").trim()}»,`
        : "";
    observation =
      `בשלב זה - עדיין מוקדם לקבוע לגבי ילדכם מתוך האבחון הרשמי של המערכת.${topicHint} השאלה נראית כמו תוכן שהודבק מבחוץ - ההמשך הוא הסבר חינוכי כללי בלבד; הוא אינו נשען על מאגר השאלות הרשמי ואינו מהווה אבחון.`;
    meaning =
      "לא ניתן להציג זאת כחולשה או חוזק של הילד במערכת, ולא להסיק מהדוח על התוצאה של השאלה שהודבקה.";
  }

  const answerBlocks = [
    { type: "observation", textHe: observation.trim(), source: "composed" },
    { type: "meaning", textHe: meaning.trim(), source: "composed" },
  ];

  const scopeMeta = {
    scopeConfidence: 0.54,
    scopeReason: `phase_e:${phaseERoute}`,
    intentConfidence: Number(stageA.canonicalIntentScore ?? 0.6),
    intentReason: String(stageA.intentReason || "phase_e_resolved_shortcut"),
    phaseERoute,
  };

  return {
    truthPacket,
    plannerIntent: "explain_report",
    scopeMeta,
    answerBlocks,
  };
}

export function augmentPhaseEThinEvidenceDraft(draft, truthPacket) {
  const blocks = Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [];
  if (!blocks.length || !truthPacket) return draft;
  if (String(truthPacket.scopeType || "") !== "topic") return draft;

  const q = Number(truthPacket.surfaceFacts?.questions ?? 0);
  const dl = truthPacket.derivedLimits || {};
  const readiness = String(dl.readiness || "");
  const cannot = dl.cannotConcludeYet === true;
  const thin = q === 0 || (cannot && readiness === "insufficient");
  if (!thin) return draft;

  const joined = blocks.map((b) => String(b.textHe || "")).join(" ");
  if (/אין בדוח מספיק ראיות על ילדכם/.test(joined)) return draft;

  const topicLabel = String(truthPacket.surfaceFacts?.displayName || truthPacket.scopeLabel || "הנושא").trim();
  const hedges = Array.isArray(truthPacket.allowedClaimEnvelope?.requiredHedges)
    ? truthPacket.allowedClaimEnvelope.requiredHedges.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const hedgeLead = hedges.length ? `${hedges[0]} - ` : "בשלב זה - ";
  const caution = `${hedgeLead}אין בדוח מספיק ראיות על ילדכם בנושא «${topicLabel}» בטווח התאריכים שנבחר; מה שמוצג למטה נשען על מה שכבר מופיע בדוח, לא על כיוון רשמי מחוץ לו.`;

  return {
    ...draft,
    answerBlocks: [{ type: "caution", textHe: caution, source: "composed" }, ...blocks],
  };
}

export default {
  tryBuildPhaseEClarificationBypassDraft,
  tryBuildPhaseEResolvedShortcutDraft,
  augmentPhaseEThinEvidenceDraft,
  appendPhaseEPracticeReviewRecord,
};
