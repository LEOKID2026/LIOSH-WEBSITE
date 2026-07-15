/**
 * Parent Copilot v1 — parent-only runtime. Single entry for a conversational turn.
 */

import { resolveScope } from "./scope-resolver.js";
import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { interpretFreeformStageA } from "./stage-a-freeform-interpretation.js";
import { planConversation } from "./conversation-planner.js";
import {
  composeAnswerDraft,
  buildClinicalBoundaryAnswerDraft,
  clinicalBoundaryJoinedFingerprintHe,
  sensitiveEducationChoiceJoinedFingerprintHe,
  ensureHomePracticePracticalMagnitudeDraft,
} from "./answer-composer.js";
import { detectAggregateQuestionClass, shouldDeferIntentComposer } from "./semantic-question-class.js";
import { buildSemanticAggregateDraft } from "./semantic-aggregate-answers.js";
import { validateAnswerDraft, validateParentCopilotResponseV1 } from "./guardrail-validator.js";
import { buildDeterministicFallbackAnswer } from "./fallback-templates.js";
import { selectFollowUp } from "./followup-engine.js";
import { getConversationState, applyConversationStateDelta } from "./session-memory.js";
import {
  buildResolvedParentCopilotResponse,
  buildClarificationParentCopilotResponse,
  buildQuickActions,
} from "./render-adapter.js";
import { normalizeParentFacingHe } from "../parent-report-language/parent-facing-normalize-he.js";
import { normalizeFreeformParentUtteranceHe, foldUtteranceForHeMatch } from "./utterance-normalize-he.js";
import { buildTurnTelemetry } from "./turn-telemetry.js";
import { maybeGenerateGroundedLlmDraft } from "./llm-orchestrator.js";
import { getLlmGateDecision } from "./rollout-gates.js";
import { appendTurnTelemetryTrace } from "./telemetry-store.js";
import { tryBuildParentShortFollowupDraft } from "./short-followup-composer.js";
import { tryComposeIntentAnswer, fingerprintAnswerHe } from "./intent-answer-composers.js";
import { tryBuildComparisonPracticalFollowupDraft } from "./comparison-practical-continuity.js";
import { compactParentAnswerBlocks } from "./answer-compaction.js";
import { postprocessParentFacingBlocksHe } from "./parent-facing-answer-postprocess.js";
import { maxGlobalReportQuestionCount, STRONG_GLOBAL_QUESTION_FLOOR } from "./report-volume-context.js";
import { redactPayloadForCopilotGrounding } from "./redact-payload-for-copilot-grounding.js";
import { augmentHighVolumeEvidenceAnchorDraft } from "./data-grounded-evidence-augmentation.js";
import { semanticIntentForMetadata } from "./semantic-intent-labels.js";
import {
  composeHistoryZeroDataAnswerDraft,
  detectHistoryCopilotLock,
  isHistoryZeroDataScope,
} from "./history-scope-he.js";
import {
  tryBuildPhaseEClarificationBypassDraft,
  augmentPhaseEThinEvidenceDraft,
  tryBuildPhaseEResolvedShortcutDraft,
} from "../parent-ai-topic-classifier/external-question-route.js";
import {
  routeParentQuestion,
  OFF_TOPIC_RESPONSE_HE,
  GENERAL_OFF_TOPIC_RESPONSE_HE,
  DIAGNOSTIC_BOUNDARY_RESPONSE_HE,
  HEALTH_BOUNDARY_RESPONSE_HE,
  PRIVACY_BOUNDARY_RESPONSE_HE,
  PEER_COMPARISON_RESPONSE_HE,
  AMBIGUOUS_RESPONSE_HE,
} from "./question-router.js";
import { classifyParentQuestionViaLlm } from "./question-classifier-llm.js";
import { matchesLegitimateParentQuestion } from "./question-classifier.js";
import { shouldReturnNoDataForRequest, noDataResponseHe, isNoDataClarificationText } from "./no-data-request-response.js";
import { isContextualFollowUpUtterance } from "./contextual-follow-up-he.js";
import { utteranceQualifiesAsReportQuestion, hasAnchoredReportRows } from "./report-row-resolver.js";
import { tryComposePatternAnswerDraft, tryComposeExplainReportSimpleWordsDraft } from "./pattern-answer-composers.js";
import { tryComposeContinuityPatternDraft } from "./continuity-pattern-composer.js";

/**
 * @param {Record<string, unknown>} base
 * @param {unknown} llmResult
 */
function mergeLlmFailureDiagnostics(base, llmResult) {
  const out = { ...base };
  if (!llmResult || typeof llmResult !== "object") return out;
  const r = /** @type {Record<string, unknown>} */ (llmResult);
  if (r.httpStatus != null) out.httpStatus = Number(r.httpStatus);
  if (typeof r.geminiErrorSummary === "string" && String(r.geminiErrorSummary).trim()) {
    out.geminiErrorSummary = String(r.geminiErrorSummary).trim();
  }
  if (typeof r.geminiErrorBody === "string" && r.geminiErrorBody.length) {
    out.geminiErrorBody = String(r.geminiErrorBody);
  }
  if (typeof r.llmRetryCount === "number") out.llmRetryCount = r.llmRetryCount;
  if (typeof r.invalidJsonRawPreview === "string" && String(r.invalidJsonRawPreview).trim()) {
    out.invalidJsonRawPreview = String(r.invalidJsonRawPreview).slice(0, 3000);
  }
  if (Array.isArray(r.gateReasonCodes) && r.gateReasonCodes.length) {
    out.gateReasonCodes = [...r.gateReasonCodes];
  }
  for (const k of ["primaryProvider", "primaryReason", "fallbackProvider", "fallbackReason", "finalProvider"]) {
    if (typeof r[k] === "string" && String(r[k]).trim()) out[k] = String(r[k]).trim();
  }
  if (Array.isArray(r.fallbackModels) && r.fallbackModels.length) {
    out.fallbackModels = [...r.fallbackModels];
  }
  if (Array.isArray(r.fallbackAttempts) && r.fallbackAttempts.length) {
    out.fallbackAttempts = r.fallbackAttempts.map((a) => (a && typeof a === "object" ? { ...a } : a));
  }
  return out;
}

/**
 * Used before TruthPacket assembly: `unclear` executive intent must not replace insufficiency
 * micro-plans when no anchored row carries an eligible recommendation contract.
 * @param {unknown} payload
 */
function payloadHasEligibleCopilotRecommendation(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs) {
      const nar = tr?.contractsV1?.narrative;
      const obsLen = String(nar?.textSlots?.observation || "").trim().length;
      if (obsLen < 8) continue;
      const rec = tr?.contractsV1?.recommendation;
      if (rec?.eligible === true && String(rec?.intensity || "").trim().toUpperCase() !== "RI0") return true;
    }
  }
  return false;
}

const CLINICAL_GUARDRAIL_FAIL_CODES = new Set([
  "clinical_diagnosis_language",
  "clinical_certainty_language",
  "llm_clinical_diagnosis_language",
  "llm_clinical_certainty_language",
]);

const CLINICAL_LLM_FAIL_REASONS = new Set(["llm_clinical_diagnosis_language", "llm_clinical_certainty_language"]);

/**
 * @param {unknown} failCodes
 */
function draftHasClinicalGuardrailFailure(failCodes) {
  const list = Array.isArray(failCodes) ? failCodes : [];
  return list.some((c) => CLINICAL_GUARDRAIL_FAIL_CODES.has(String(c)));
}

/**
 * @param {string} s
 */
function normalizeWsHeJoin(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {{ answerBlocks?: Array<{ textHe?: string }> }} draft
 */
function isClinicalBoundaryDraft(draft) {
  const joined = (Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [])
    .map((b) => String(b?.textHe || ""))
    .join(" ");
  return normalizeWsHeJoin(joined) === normalizeWsHeJoin(clinicalBoundaryJoinedFingerprintHe());
}

function isSensitiveEducationChoiceDraft(draft) {
  const joined = (Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [])
    .map((b) => String(b?.textHe || ""))
    .join(" ");
  return normalizeWsHeJoin(joined) === normalizeWsHeJoin(sensitiveEducationChoiceJoinedFingerprintHe());
}

function contractNarrativeSlotBundleHe(truthPacket) {
  const nar = truthPacket?.contracts?.narrative;
  return [
    String(nar?.textSlots?.observation || ""),
    String(nar?.textSlots?.interpretation || ""),
    String(nar?.textSlots?.action || ""),
    String(nar?.textSlots?.uncertainty || ""),
  ].join(" ");
}

/**
 * Normalize parent-facing Hebrew. When truthPacket is provided, blocks marked contract_slot
 * whose text no longer matches narrative slots verbatim (e.g. after paraphrase normalization)
 * are re-tagged as composed so contract_slot_mismatch does not fire on parent-facing copy.
 * @param {Array<{ type?: string; textHe?: string; source?: string }>} answerBlocks
 * @param {object|null} [truthPacket]
 * @param {{ preserveContractSlotSources?: boolean }} [opts]
 */
function normalizeAnswerBlocksHe(answerBlocks, truthPacket = null, opts = null) {
  const slotBundle = truthPacket ? contractNarrativeSlotBundleHe(truthPacket) : "";
  const preserveSlot = !!(opts && opts.preserveContractSlotSources);
  const mapped = (Array.isArray(answerBlocks) ? answerBlocks : []).map((b) => {
    const textHe = normalizeParentFacingHe(String(b?.textHe || "").trim());
    let source = String(b?.source || "composed");
    if (
      !preserveSlot &&
      slotBundle &&
      source === "contract_slot" &&
      String(b?.type || "") !== "observation" &&
      textHe &&
      !slotBundle.includes(textHe)
    ) {
      source = "composed";
    }
    return { ...b, textHe, source };
  });
  return postprocessParentFacingBlocksHe(mapped);
}

const THIN_DATA_APPROVED_SCARCITY_RE =
  /(יש\s+כרגע\s+מעט\s+נתוני\s+תרגול|נפח\s+הנתונים\s+עדיין\s+מצומצם|אין\s+עדיין\s+מספיק\s+מידע\s+לכיוון\s+ברור)/u;
const THIN_DATA_DEFAULT_LEAD = "יש כרגע מעט נתוני תרגול, ולכן אין עדיין מספיק מידע לכיוון ברור.";

function shouldUseThinDataLead(truthPacket, intent, payload) {
  const tp = truthPacket && typeof truthPacket === "object" ? truthPacket : {};
  const sf = tp.surfaceFacts && typeof tp.surfaceFacts === "object" ? tp.surfaceFacts : {};
  const dl = tp.derivedLimits && typeof tp.derivedLimits === "object" ? tp.derivedLimits : {};
  const scopedQ = Math.max(0, Number(sf.questions) || 0);
  const globalQ = Math.max(
    scopedQ,
    Math.max(0, Number(sf.reportQuestionTotalGlobal) || 0),
    maxGlobalReportQuestionCount(payload),
  );
  /** Never prepend global "מעט נתונים" when the report window has substantial answer volume. */
  if (globalQ >= STRONG_GLOBAL_QUESTION_FLOOR) return false;
  /** Topic/subject answers already ground on local TQ; do not prepend global scarcity when this scope has enough attempts. */
  const scopeType = String(tp.scopeType || "").trim();
  if ((scopeType === "topic" || scopeType === "subject") && scopedQ >= 10) return false;
  const interp = String(tp.interpretationScope || "").trim();
  /** Recommendation-framed turns already carry contract scarcity; do not prepend global thin-data boilerplate. */
  if (interp === "recommendation") return false;
  const intentSet = new Set([
    "explain_report",
    "simple_parent_explanation",
    "what_to_do_today",
    "what_to_do_this_week",
    "report_trust_question",
  ]);
  if (!intentSet.has(String(intent || ""))) return false;
  const practiceVolume = globalQ;
  return (
    practiceVolume < 90 ||
    dl.readiness === "insufficient" ||
    dl.readiness === "forming" ||
    (dl.cannotConcludeYet === true && practiceVolume < 120)
  );
}

function enforceThinDataScarcityLead(draft, truthPacket, intent, payload) {
  const blocks = Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [];
  if (!blocks.length) return draft;
  if (String(intent || "") === "off_topic_redirect" || String(intent || "") === "parent_policy_refusal") {
    return draft;
  }
  if (!shouldUseThinDataLead(truthPacket, intent, payload)) return draft;
  const joined = blocks.map((b) => String(b?.textHe || "")).join(" ").trim();
  if (THIN_DATA_APPROVED_SCARCITY_RE.test(joined)) return draft;
  const firstIdx = blocks.findIndex((b) => String(b?.textHe || "").trim());
  if (firstIdx < 0) return draft;
  const next = blocks.slice();
  const first = next[firstIdx];
  next[firstIdx] = {
    ...first,
    textHe: `${THIN_DATA_DEFAULT_LEAD} ${String(first?.textHe || "").trim()}`.trim(),
  };
  return { ...draft, answerBlocks: normalizeAnswerBlocksHe(next) };
}

function buildNoScopeCategorySpecificClarification(utterance) {
  const t = String(utterance || "").trim();
  if (!t) return null;

  if (/ילד\s+אחר|כל\s+ה?ילדים|סיסמ(?:ה|א)|דאטה\s*בייס|database|\bdb\b|כל\s+ה?משתמשים|חשבון\s+אחר|נתונים\s+של\s+מישהו\s+אחר|רשימ(?:ה|ת)\s+ילדים/u.test(t)) {
    return PRIVACY_BOUNDARY_RESPONSE_HE;
  }
  if (/מזג\s*האוויר|חדשות|כדורגל|מתכון|שיר|נעליים|ביטקוין|javascript|java\s*script|מה\s*השעה|בדיחה|ראש\s*הממשלה|השקעות|בורסה|שיעורי\s+בית\s+ש(?:לא|אינ)/i.test(t)) {
    return GENERAL_OFF_TOPIC_RESPONSE_HE;
  }
  if (/תתעלם|תחשוף|system\s*prompt|debug|הוראות\s*פנימיות|תדפיס|מעכשיו\s*אל\s*תשתמש/i.test(t)) {
    return "אני לא מתעלם/ת מהדוח ולא חושף/ת הוראות פנימיות. התשובה כאן נשארת מבוססת נתוני למידה, ואפשר להמשיך לשאלה על מצב הלמידה בפועל.";
  }
  if (/תמציא|תסתיר|בלי\s*להתחשב\s*בנתונים|תכתוב\s*שהילד\s*מצוין\s*למרות|תשנה\s*את\s*הדוח/i.test(t)) {
    return "אי אפשר להמציא, לשנות או לשפר נתונים בדוח. אפשר להסביר רק את הנתונים שמופיעים בו. אפשר גם לבנות ניסוח ברור להורה לפי מה שיש כרגע בנתוני הלמידה.";
  }
  if (/מה\s*מצב.*במוזיקה|במוזיקה|באמנות|בספורט|במחול/i.test(t)) {
    return "כרגע אין בדוח נתוני תרגול למקצוע הזה, ולכן אי אפשר להסיק עליו מצב. אם תרצו, נוכל להתמקד במקצועות שכן מופיעים בדוח.";
  }
  if (/למה\s*כתבת\s*שהוא\s*חלש|לא\s*מסכים\s*עם\s*הדוח|הדוח\s*טועה/i.test(t)) {
    return "יכול להיות פער בין הצלחה בבית לבין ביצוע בתרגול באפליקציה. לכן מסתכלים על דפוס חוזר בדוח לאורך זמן, ולא על תשובה בודדת.";
  }
  if (/תסביר\s*לי\s*כמו\s*להורה|בלי\s*מושגים|במשפט\s*אחד|רק\s*3\s*נקודות|בקיצור/i.test(t)) {
    return "בקצרה: הדוח משווה בין נושאים לפי כמות שאלות ודיוק בתרגול. אם הנתונים עדיין מעטים, זה סימן ראשוני ולא כיוון סופי - כדאי לצבור עוד קצת תרגול קצר לפני שקובעים כיוון.";
  }
  if (/מה\s*לעשות\s*מחר|מה\s*לתרגל\s*השבוע|תוכנית\s*קצרה|איך\s*לעזור\s*בלי\s*לחץ/i.test(t)) {
    return "אפשר להתחיל בתוכנית קצרה: 1) 10 דקות חזרה בנושא אחד, 2) 5-8 שאלות בנושא נוסף, 3) בדיקה חוזרת בעוד יומיים אם אותו דפוס נשמר.";
  }
  return null;
}

function normalizeMergedLlmAttempt(raw) {
  if (!raw || typeof raw !== "object") return null;
  const base = {
    ok: !!raw.ok,
    reason: String(raw.reason ?? ""),
    ...(raw.provider ? { provider: String(raw.provider) } : {}),
    ...(raw.httpStatus != null ? { httpStatus: Number(raw.httpStatus) } : {}),
    ...(typeof raw.geminiErrorSummary === "string" && raw.geminiErrorSummary
      ? { geminiErrorSummary: String(raw.geminiErrorSummary).slice(0, 2000) }
      : {}),
    ...(typeof raw.geminiErrorBody === "string" && raw.geminiErrorBody
      ? { geminiErrorBody: String(raw.geminiErrorBody).slice(0, 8000) }
      : {}),
    ...(typeof raw.llmRetryCount === "number" ? { llmRetryCount: raw.llmRetryCount } : {}),
    ...(Array.isArray(raw.gateReasonCodes) ? { gateReasonCodes: [...raw.gateReasonCodes] } : {}),
    ...(Array.isArray(raw.failCodes) ? { failCodes: [...raw.failCodes] } : {}),
    ...(typeof raw.primaryProvider === "string" && raw.primaryProvider.trim()
      ? { primaryProvider: String(raw.primaryProvider).trim() }
      : {}),
    ...(typeof raw.primaryReason === "string" && raw.primaryReason.trim()
      ? { primaryReason: String(raw.primaryReason).trim() }
      : {}),
    ...(typeof raw.fallbackProvider === "string" && raw.fallbackProvider.trim()
      ? { fallbackProvider: String(raw.fallbackProvider).trim() }
      : {}),
    ...(typeof raw.fallbackReason === "string" && raw.fallbackReason.trim()
      ? { fallbackReason: String(raw.fallbackReason).trim() }
      : {}),
    ...(typeof raw.finalProvider === "string" && raw.finalProvider.trim()
      ? { finalProvider: String(raw.finalProvider).trim() }
      : {}),
    ...(typeof raw.invalidJsonRawPreview === "string" && String(raw.invalidJsonRawPreview).trim()
      ? { invalidJsonRawPreview: String(raw.invalidJsonRawPreview).slice(0, 3000) }
      : {}),
    ...(Array.isArray(raw.fallbackModels) && raw.fallbackModels.length ? { fallbackModels: [...raw.fallbackModels] } : {}),
    ...(Array.isArray(raw.fallbackAttempts) && raw.fallbackAttempts.length
      ? {
          fallbackAttempts: raw.fallbackAttempts.map((a) =>
            a && typeof a === "object" ? { ...a } : a,
          ),
        }
      : {}),
  };
  return base;
}

function ensureResponseTelemetry(response, context) {
  if (response?.telemetry && typeof response.telemetry === "object") {
    const merged = normalizeMergedLlmAttempt(context?.llmAttempt);
    if (!merged) return response;
    const t = response.telemetry;
    const trace = t.trace && typeof t.trace === "object" ? t.trace : {};
    const branchOutcomes = trace.branchOutcomes && typeof trace.branchOutcomes === "object" ? trace.branchOutcomes : {};
    return {
      ...response,
      telemetry: {
        ...t,
        llmAttempt: merged,
        trace: {
          ...trace,
          branchOutcomes: {
            ...branchOutcomes,
            llmAttempt: merged,
          },
        },
      },
    };
  }
  const metadata = response?.metadata && typeof response.metadata === "object" ? response.metadata : {};
  const fallbackUsed = !!response?.fallbackUsed;
  const validatorFailCodes = Array.isArray(response?.validatorFailCodes) ? response.validatorFailCodes : [];
  const telemetry = buildTurnTelemetry({
    intent: String(response?.intent || context.intent || "unknown"),
    intentConfidence: Number(metadata.intentConfidence || 0),
    intentReason: String(metadata.intentReason || "unknown_intent_reason"),
    scopeConfidence: Number(metadata.scopeConfidence || 0),
    scopeReason: String(metadata.scopeReason || "unknown_scope_reason"),
    answerBlocks: Array.isArray(response?.answerBlocks) ? response.answerBlocks : [],
    fallbackUsed,
    fallbackReasonCodes: fallbackUsed ? validatorFailCodes : [],
    validatorFailCodes,
    semanticAggregateSatisfied: false,
    generationPath: String(context.generationPath || "deterministic"),
    truthPacket: context.truthPacket || null,
    resolutionStatus: String(response?.resolutionStatus || "clarification_required"),
    scopeType: response?.scopeType ?? null,
    scopeId: response?.scopeId ?? null,
    llmAttempt: context.llmAttempt || null,
  });
  return { ...response, telemetry };
}

function persistTelemetryBestEffort(response, context) {
  const telemetry = response?.telemetry && typeof response.telemetry === "object" ? response.telemetry : null;
  if (!telemetry) return;
  const trace = telemetry.trace && typeof telemetry.trace === "object" ? telemetry.trace : {};
  const branchOutcomes = trace.branchOutcomes && typeof trace.branchOutcomes === "object" ? trace.branchOutcomes : {};
  const llmAttempt = telemetry.llmAttempt || branchOutcomes.llmAttempt || null;
  appendTurnTelemetryTrace({
    schemaVersion: "v1",
    traceId: String(telemetry.traceId || ""),
    sessionId: String(context.sessionId || "default"),
    audience: String(response?.audience || context.audience || "parent"),
    resolutionStatus: String(response?.resolutionStatus || trace.resolutionStatus || "unknown"),
    intent: String(response?.intent || telemetry?.intent?.value || "unknown"),
    intentReason: String(telemetry?.intent?.reason || response?.metadata?.intentReason || "unknown_intent_reason"),
    scopeReason: String(telemetry?.scope?.reason || response?.metadata?.scopeReason || "unknown_scope_reason"),
    scopeType: response?.scopeType ?? trace.scopeType ?? null,
    scopeId: response?.scopeId ?? trace.scopeId ?? null,
    generationPath: String(telemetry.generationPath || branchOutcomes.generationPath || "deterministic"),
    fallbackUsed: !!(response?.fallbackUsed || telemetry.fallbackUsed),
    fallbackReasonCodes: Array.isArray(telemetry.fallbackReasonCodes) ? [...telemetry.fallbackReasonCodes] : [],
    validatorStatus: String(response?.validatorStatus || telemetry?.validator?.status || "unknown"),
    validatorFailCodes: Array.isArray(response?.validatorFailCodes)
      ? [...response.validatorFailCodes]
      : Array.isArray(telemetry?.validator?.failCodes)
        ? [...telemetry.validator.failCodes]
        : [],
    semanticAggregateSatisfied: !!telemetry.semanticAggregateSatisfied,
    llmAttempt:
      llmAttempt && typeof llmAttempt === "object"
        ? (() => {
            const base = {
              ok: !!llmAttempt.ok,
              reason: String(llmAttempt.reason || ""),
              provider: llmAttempt.provider || undefined,
            };
            if (llmAttempt.httpStatus != null) base.httpStatus = Number(llmAttempt.httpStatus);
            if (typeof llmAttempt.geminiErrorSummary === "string" && llmAttempt.geminiErrorSummary) {
              base.geminiErrorSummary = String(llmAttempt.geminiErrorSummary).slice(0, 2000);
            }
            if (typeof llmAttempt.geminiErrorBody === "string" && llmAttempt.geminiErrorBody) {
              base.geminiErrorBody = String(llmAttempt.geminiErrorBody).slice(0, 8000);
            }
            if (typeof llmAttempt.llmRetryCount === "number") base.llmRetryCount = llmAttempt.llmRetryCount;
            for (const k of ["primaryProvider", "primaryReason", "fallbackProvider", "fallbackReason", "finalProvider"]) {
              if (typeof llmAttempt[k] === "string" && llmAttempt[k].trim()) base[k] = String(llmAttempt[k]).trim();
            }
            if (Array.isArray(llmAttempt.fallbackModels) && llmAttempt.fallbackModels.length) {
              base.fallbackModels = [...llmAttempt.fallbackModels];
            }
            if (Array.isArray(llmAttempt.fallbackAttempts) && llmAttempt.fallbackAttempts.length) {
              base.fallbackAttempts = llmAttempt.fallbackAttempts.map((a) =>
                a && typeof a === "object" ? { ...a } : a,
              );
            }
            if (typeof llmAttempt.invalidJsonRawPreview === "string" && llmAttempt.invalidJsonRawPreview.trim()) {
              base.invalidJsonRawPreview = String(llmAttempt.invalidJsonRawPreview).slice(0, 3000);
            }
            return base;
          })()
        : null,
    utteranceLength: Number(context.utteranceLength || 0),
    timestampMs: Number(telemetry.timestampMs || Date.now()),
  });
}

function finalizeTurnResponse(response, context) {
  const withTelemetry = ensureResponseTelemetry(response, context);
  persistClarificationConversationMemory(withTelemetry, context);
  persistTelemetryBestEffort(withTelemetry, context);
  return withTelemetry;
}

function persistClarificationConversationMemory(response, context) {
  const sessionId = String(context?.sessionId || "").trim();
  if (!sessionId) return;
  if (String(response?.resolutionStatus || "") !== "clarification_required") return;
  const text = String(response?.clarificationQuestionHe || "").trim();
  if (!text) return;
  const isNoData = isNoDataClarificationText(text);
  applyConversationStateDelta(sessionId, {
    assistantAnswerSummary: text.slice(0, 480),
    ...(isNoData ? { lastTurnWasNoData: true, lastTurnWasWhatNotInfer: false } : {}),
  });
}

/**
 * @param {object} input
 * @param {string} sessionId
 * @param {number} priorRepeated
 * @param {object} conv
 * @param {string} utteranceStr
 * @param {{ noData?: boolean; truthPacket?: object; plannerIntent?: string; scopeMeta?: object; answerBlocks?: Array<{ type: string; textHe: string; source?: string }> }} draftResult
 * @param {object} [scopeMetaBase]
 */
function tryPackageApprovedPatternTurn(input, sessionId, priorRepeated, conv, utteranceStr, draftResult, scopeMetaBase = {}) {
  if (!draftResult) return null;
  const audience = String(input?.audience || "parent");
  if (draftResult.noData) {
    const intent = String(draftResult.plannerIntent || "unknown_report_question");
    const scopeMeta = {
      ...scopeMetaBase,
      generationPath: "pattern_composer",
      patternNoData: true,
      intentReason: "pattern:no_data",
      scopeConfidence: 0.88,
      scopeReason: "approved_pattern_no_data",
    };
    const noDataText = noDataResponseHe(utteranceStr, input?.payload);
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: noDataText,
      intent,
      priorRepeated,
      metadata: scopeMeta,
    });
    validateParentCopilotResponseV1(r);
    applyConversationStateDelta(sessionId, {
      assistantAnswerSummary: noDataText.slice(0, 480),
      lastTurnWasNoData: true,
      lastTurnWasWhatNotInfer: false,
    });
    return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
  }
  if (!draftResult.truthPacket || !draftResult.answerBlocks?.length) return null;
  return packageParentResolvedEarlyTurn(input, sessionId, priorRepeated, conv, utteranceStr, {
    truthPacket: draftResult.truthPacket,
    plannerIntent: draftResult.plannerIntent,
    scopeMeta: { ...scopeMetaBase, ...draftResult.scopeMeta },
    answerBlocks: draftResult.answerBlocks,
  });
}

/**
 * Shared packaging for early-exit turns (short reply class, comparison-practical continuity).
 * @param {object} input
 * @param {object} fb
 * @param {{ lastAnswerAggregateClass?: string; lastComparisonSubjectId?: string; lastComparisonRole?: string }} [memoryHints]
 */
function packageParentResolvedEarlyTurn(input, sessionId, priorRepeated, conv, utteranceStr, fb, memoryHints = null) {
  const truthPacket = fb.truthPacket;
  const plannerIntent = fb.plannerIntent;
  const scopeMeta = fb.scopeMeta;
  let draft = {
    answerBlocks: compactParentAnswerBlocks(normalizeAnswerBlocksHe(fb.answerBlocks, truthPacket), {
      scopeType: String(truthPacket.scopeType || ""),
      maxBlocks: 5,
      maxTotalChars: 2400,
    }),
  };
  const semanticAggregateSatisfied = false;
  const aggregateQuestionClass = detectAggregateQuestionClass(utteranceStr);
  const intentComposerPath = String(scopeMeta?.generationPath || "") === "intent_composer";
  const patternComposerPath = String(scopeMeta?.generationPath || "") === "pattern_composer";
  let vDraft = patternComposerPath
    ? { ok: true, failCodes: [] }
    : validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
  let fallbackUsed = false;
  /** @type {string[]} */
  const fallbackReasonCodes = [];

  if (!vDraft.ok) {
    fallbackReasonCodes.push(...vDraft.failCodes);
    if (draftHasClinicalGuardrailFailure(vDraft.failCodes)) {
      draft = buildClinicalBoundaryAnswerDraft();
      fallbackUsed = false;
      draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: "clinical_boundary" });
    } else {
      draft = buildDeterministicFallbackAnswer(truthPacket, vDraft.failCodes);
      fallbackUsed = true;
      draft = {
        ...draft,
        answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket, { preserveContractSlotSources: true }),
      };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
    }
  }
  if (!vDraft.ok) {
    fallbackReasonCodes.push(...vDraft.failCodes);
    if (draftHasClinicalGuardrailFailure(vDraft.failCodes)) {
      draft = buildClinicalBoundaryAnswerDraft();
      fallbackUsed = false;
      draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: "clinical_boundary" });
    } else {
      const nar = truthPacket.contracts?.narrative;
      const slots = nar?.textSlots || {};
      draft = {
        answerBlocks: [
          { type: "observation", textHe: String(slots.observation || "").trim(), source: "contract_slot" },
          { type: "meaning", textHe: String(slots.interpretation || "").trim(), source: "contract_slot" },
        ].filter((b) => b.textHe),
      };
      if (draft.answerBlocks.length < 2) {
        draft = buildDeterministicFallbackAnswer(truthPacket, ["emergency_fallback"]);
      }
      fallbackUsed = true;
      draft = {
        ...draft,
        answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket, { preserveContractSlotSources: true }),
      };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
    }
  }

  if (!fallbackUsed) {
    draft = enforceThinDataScarcityLead(draft, truthPacket, plannerIntent, input?.payload);
  }
  const responseIntentEarly = isClinicalBoundaryDraft(draft)
    ? "clinical_boundary"
    : isSensitiveEducationChoiceDraft(draft)
      ? "sensitive_education_choice"
      : plannerIntent;
  if (!fallbackUsed) {
    draft = ensureHomePracticePracticalMagnitudeDraft(draft, responseIntentEarly, truthPacket);
  }
  draft = {
    ...draft,
    answerBlocks: normalizeAnswerBlocksHe(
      draft.answerBlocks,
      truthPacket,
      fallbackUsed ? { preserveContractSlotSources: true } : null,
    ),
  };

  const answerBlockTypes = draft.answerBlocks.map((b) => b.type);
  const answerBodyTextHe = draft.answerBlocks.map((b) => b.textHe).join(" ").trim();

  const follow = selectFollowUp({
    audience: "parent",
    intent: responseIntentEarly,
    scopeType: truthPacket.scopeType,
    scopeKey: `${truthPacket.scopeType}:${truthPacket.scopeId}`,
    scopeLabelHe: truthPacket.scopeLabel || "",
    answerBodyTextHe,
    answerBlockTypes,
    clickedFollowupFamilyThisTurn: input?.clickedFollowupFamily ? String(input.clickedFollowupFamily).trim() : null,
    omitFollowUpEntirely:
      (aggregateQuestionClass !== "none" && aggregateQuestionClass !== "vague_summary_question") ||
      (truthPacket.scopeType === "executive" && vDraft.ok),
    truthPacket: {
      cannotConcludeYet: truthPacket.derivedLimits.cannotConcludeYet,
      readiness: truthPacket.derivedLimits.readiness,
      confidenceBand: truthPacket.derivedLimits.confidenceBand,
      recommendationEligible: truthPacket.derivedLimits.recommendationEligible,
      recommendationIntensityCap: truthPacket.derivedLimits.recommendationIntensityCap,
      allowedFollowupFamilies: truthPacket.allowedFollowupFamilies,
    },
    conversationState: conv,
  });

  const suggestedFollowUp = follow.selected
    ? {
        kind: /** @type {const} */ ("question"),
        family: follow.selected.family,
        textHe: normalizeParentFacingHe(follow.selected.textHe),
        reasonCode: follow.selected.reasonCode,
      }
    : null;

  /** @type {Array<"contractsV1.evidence"|"contractsV1.decision"|"contractsV1.readiness"|"contractsV1.confidence"|"contractsV1.recommendation"|"contractsV1.narrative">} */
  const contractSourcesUsed = ["contractsV1.narrative"];
  const explainLikeIntentEarly =
    plannerIntent === "explain_report" ||
    plannerIntent === "ask_topic_specific" ||
    plannerIntent === "ask_subject_specific";
  if (!explainLikeIntentEarly) {
    contractSourcesUsed.push("contractsV1.decision", "contractsV1.readiness", "contractsV1.confidence");
  }
  if (draft.answerBlocks.some((b) => b.type === "next_step")) {
    contractSourcesUsed.push("contractsV1.recommendation");
  }
  if (explainLikeIntentEarly) {
    contractSourcesUsed.push("contractsV1.evidence");
  }

  const validatorFailCodes = vDraft.ok ? [] : [...vDraft.failCodes];
  const validatorStatus = vDraft.ok ? "pass" : "fail";

  let response = buildResolvedParentCopilotResponse({
    truthPacket,
    intent: responseIntentEarly,
    answerBlocks: draft.answerBlocks,
    suggestedFollowUp,
    validatorStatus,
    validatorFailCodes,
    fallbackUsed,
    contractSourcesUsed: [...new Set(contractSourcesUsed)],
    priorRepeated,
    metadata: scopeMeta,
    debug: draft?.debug && typeof draft.debug === "object" ? draft.debug : undefined,
  });

  const finalCheck = validateParentCopilotResponseV1(response);
  if (!finalCheck.ok && response.resolutionStatus === "resolved") {
    response = {
      ...response,
      validatorStatus: "fail",
      validatorFailCodes: [...new Set([...(response.validatorFailCodes || []), ...finalCheck.hardFails])],
      quickActions: buildQuickActions(truthPacket, false),
    };
  }

  const telemetry = buildTurnTelemetry({
    intent: responseIntentEarly,
    intentConfidence: scopeMeta.intentConfidence,
    intentReason: scopeMeta.intentReason,
    scopeConfidence: scopeMeta.scopeConfidence,
    scopeReason: scopeMeta.scopeReason,
    answerBlocks: draft.answerBlocks,
    fallbackUsed,
    fallbackReasonCodes,
    validatorFailCodes,
    semanticAggregateSatisfied,
    generationPath: intentComposerPath ? "intent_composer" : "deterministic",
    truthPacket,
    resolutionStatus: "resolved",
    scopeType: truthPacket.scopeType,
    scopeId: truthPacket.scopeId,
    ...(scopeMeta?.answerContract ? { answerContract: scopeMeta.answerContract } : {}),
    ...(scopeMeta?.answerComposerUsed ? { answerComposerUsed: scopeMeta.answerComposerUsed } : {}),
    ...(scopeMeta?.evidenceUsed ? { evidenceUsed: scopeMeta.evidenceUsed } : {}),
  });
  response = { ...response, telemetry };

  const constraintParts = [vDraft.ok ? "turn:validator_pass" : "turn:validator_fail"];
  if (draft.answerBlocks.some((b) => b.type === "uncertainty_reason")) constraintParts.push("surface:uncertainty");
  if (draft.answerBlocks.some((b) => b.type === "caution")) constraintParts.push("surface:caution");

  const assistantAnswerSummary = draft.answerBlocks
    .map((b) => b.textHe)
    .join(" ")
    .trim()
    .slice(0, 480);

  applyConversationStateDelta(sessionId, {
    addedIntent: responseIntentEarly,
    addedFollowUpFamily: suggestedFollowUp?.family,
    ...(input?.clickedFollowupFamily
      ? { clickedFollowupFamily: String(input.clickedFollowupFamily).trim() }
      : {}),
    addedScopeKey: `${truthPacket.scopeType}:${truthPacket.scopeId}`,
    answeredConstraintTag: constraintParts.join(","),
    closingSnippet: draft.answerBlocks.map((b) => b.textHe).join(" ").slice(-48),
    ...(suggestedFollowUp?.textHe ? { suggestedFollowupTextHe: suggestedFollowUp.textHe } : {}),
    ...(assistantAnswerSummary ? { assistantAnswerSummary } : {}),
    scopeLabelSnapshotHe: truthPacket.scopeLabel || "",
    plannerIntentSnapshot: responseIntentEarly,
    lastOfferedFollowupFamily: suggestedFollowUp?.family ?? null,
    lastTurnWasNoData: false,
    lastTurnWasWhatNotInfer:
      String(scopeMeta?.patternId || "") === "what_not_infer" ||
      String(scopeMeta?.patternId || "") === "avoid_now" ||
      assistantAnswerSummary.includes("לא כדאי להסיק מהדוח") ||
      assistantAnswerSummary.includes("לא להסיק מסקנה אישית"),
    ...(memoryHints && memoryHints.lastAnswerAggregateClass !== undefined
      ? {
          lastAnswerAggregateClass: memoryHints.lastAnswerAggregateClass,
          lastComparisonSubjectId: memoryHints.lastComparisonSubjectId,
          lastComparisonRole: memoryHints.lastComparisonRole,
        }
      : {}),
  });

  return {
    response,
    audience: "parent",
    sessionId,
    conv,
    truthPacket,
    intent: responseIntentEarly,
    scopeMeta,
    utteranceStr,
    draft,
    validatorFailCodes,
  };
}

/**
 * Bucket-to-CanonicalParentIntent mapping used by the classifier early-exit branch.
 * @param {import("./question-router.js").QaRouterIntent} routerIntent
 */
function classifierIntentToCanonical(routerIntent) {
  switch (routerIntent) {
    case "off_topic": return "off_topic_redirect";
    case "unsafe_or_diagnostic_request": return "clinical_boundary";
    case "privacy_sensitive_request": return "parent_policy_refusal";
    case "peer_comparison_request": return "unclear";
    case "ambiguous_or_unclear": return "unclear";
    case "unknown_report_question":
    default:
      return "explain_report";
  }
}

/**
 * Build a clarification-style early-exit turn for off_topic / diagnostic / ambiguous buckets.
 *
 * Hard gate guarantees:
 *   - No truthPacket is constructed.
 *   - No answer-LLM is called.
 *   - The response text contains exactly the deterministic boundary copy and
 *     nothing else (no subject names, no topic names, no question counts).
 *   - Telemetry includes classifierBucket / classifierSource / classifierConfidence.
 *
 * @param {object} args
 * @param {import("./question-router.js").QaRouterResult} args.qaRoute
 * @param {string} args.audience
 * @param {string} args.sessionId
 * @param {object} args.conv
 * @param {number} args.priorRepeated
 * @param {string} args.utteranceStr
 * @param {{ source: "deterministic" | "llm"; reason?: string }} [args.classifierTrace]
 */
function packageClassifierEarlyExit({
  qaRoute,
  audience,
  sessionId,
  conv,
  priorRepeated,
  utteranceStr,
  classifierTrace,
}) {
  const boundaryLine = String(qaRoute.deterministicResponse || "");
  const canonicalIntent = classifierIntentToCanonical(qaRoute.routerIntent);
  const intentReason = `classifier:${qaRoute.classifierBucket}:${classifierTrace?.source || qaRoute.classifierSource || "deterministic"}`;
  const scopeMeta = {
    intentConfidence: Number(qaRoute.classifierConfidence || 1),
    intentReason,
    scopeConfidence: 1,
    scopeReason: "classifier_early_exit",
    classifierBucket: qaRoute.classifierBucket,
    classifierSource: classifierTrace?.source || qaRoute.classifierSource || "deterministic",
    classifierConfidence: Number(qaRoute.classifierConfidence || 0),
    semanticIntent: semanticIntentForMetadata({
      classifierBucket: qaRoute.classifierBucket,
      canonicalIntent,
    }),
    ...(classifierTrace?.reason ? { classifierLlmReason: classifierTrace.reason } : {}),
  };

  const r = buildClarificationParentCopilotResponse({
    clarificationQuestionHe: boundaryLine,
    intent: canonicalIntent,
    priorRepeated,
    metadata: scopeMeta,
  });
  validateParentCopilotResponseV1(r);

  return {
    response: r,
    audience,
    sessionId,
    conv,
    truthPacket: null,
    intent: canonicalIntent,
    scopeMeta,
    utteranceStr,
    routerExitEarly: true,
    classifierBucket: qaRoute.classifierBucket,
    classifierConfidence: qaRoute.classifierConfidence,
    classifierSource: classifierTrace?.source || qaRoute.classifierSource || "deterministic",
  };
}

/**
 * Deterministic baseline path used by both sync and async runtimes.
 *
 * @param {object} input
 * @param {{ preRoute?: import("./question-router.js").QaRouterResult }} [options]
 *   `preRoute` allows the async path to inject a classifier verdict that has
 *   already been upgraded by the LLM classifier. When supplied, the deterministic
 *   classifier is NOT re-run — saves one pass and keeps telemetry consistent.
 */
function runDeterministicCore(input, options) {
  const audience = String(input?.audience || "parent");
  const sessionId = String(input?.sessionId || "default");
  const conv = getConversationState(sessionId);
  const priorRepeated = Number(conv.repeatedPhraseHits) || 0;

  if (audience !== "parent") {
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: "מצב זה מיועד להורה בלבד.",
      intent: "uncertainty_boundary",
      priorRepeated,
      metadata: { intentConfidence: 1, intentReason: "audience_guard", scopeConfidence: 1, scopeReason: "audience_guard" },
    });
    validateParentCopilotResponseV1(r);
    return { response: r, audience, sessionId, conv, truthPacket: null, intent: "uncertainty_boundary", scopeMeta: null, utteranceStr: "" };
  }

  const payloadForCopilot = redactPayloadForCopilotGrounding(input?.payload);
  const scopedInput = input && typeof input === "object" ? { ...input, payload: payloadForCopilot } : input;

  const utteranceStr = normalizeFreeformParentUtteranceHe(String(input?.utterance || ""));

  if (!scopedInput?.payload || typeof scopedInput.payload !== "object") {
    const stageAForMissing = interpretFreeformStageA(String(input?.utterance || ""), null);
    const scopeResMissing = resolveScope({
      payload: null,
      utterance: utteranceStr,
      selectedContextRef: scopedInput?.selectedContextRef ?? null,
      stageA: stageAForMissing,
      conversationState: conv,
    });
    const scopeMetaMissing = {
      scopeConfidence: Number(scopeResMissing?.scopeConfidence || 0),
      scopeReason: String(scopeResMissing?.scopeReason || "missing_payload"),
      intentConfidence: Number(stageAForMissing?.confidence || 0),
      intentReason: String(stageAForMissing?.reason || "missing_payload"),
    };
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe:
        scopeResMissing.clarificationQuestionHe ||
        "לא נטען דוח מקיף - לא ניתן לענות מתוך נתוני התקופה. רעננו את הדף או בחרו תקופה אחרת.",
      intent: stageAForMissing?.canonicalIntent || "uncertainty_boundary",
      priorRepeated,
      metadata: scopeMetaMissing,
    });
    validateParentCopilotResponseV1(r);
    return {
      response: r,
      audience,
      sessionId,
      conv,
      truthPacket: null,
      intent: stageAForMissing?.canonicalIntent || "uncertainty_boundary",
      scopeMeta: scopeMetaMissing,
      utteranceStr,
    };
  }

  // ── FIRST PRODUCT GATE: classifier-first router before ANY report data access ──
  // Hard guarantees for off_topic / diagnostic_sensitive / ambiguous_or_unclear:
  //   - No truthPacket built. No answer-LLM call. No subject/topic name leakage.
  //   - Telemetry stamps classifierBucket/source/confidence so live tests can verify.
  let qaRoute = options?.preRoute
    ? options.preRoute
    : routeParentQuestion(String(input?.utterance || ""), scopedInput?.payload);
  if (qaRoute.exitEarly && qaRoute.classifierBucket === "ambiguous_or_unclear") {
    const hasPriorScope =
      (Array.isArray(conv.priorScopes) && conv.priorScopes.length > 0) ||
      String(conv.lastResolvedTopic || "").trim() ||
      String(conv.lastResolvedSubject || "").trim();
    const reportQualified = utteranceQualifiesAsReportQuestion(utteranceStr, scopedInput?.payload);
    if (shouldReturnNoDataForRequest(utteranceStr, scopedInput?.payload)) {
      qaRoute = {
        routerIntent: "unknown_report_question",
        requiresLlm: true,
        deterministicResponse: null,
        exitEarly: false,
        classifierBucket: "report_related",
        classifierConfidence: 0.82,
        classifierSource: "deterministic",
        classifierSignals: qaRoute.classifierSignals,
      };
    } else if (
      (isContextualFollowUpUtterance(utteranceStr) && hasPriorScope) ||
      reportQualified ||
      matchesLegitimateParentQuestion(utteranceStr)
    ) {
      qaRoute = {
        routerIntent: "unknown_report_question",
        requiresLlm: true,
        deterministicResponse: null,
        exitEarly: false,
        classifierBucket: "report_related",
        classifierConfidence: Math.max(Number(qaRoute.classifierConfidence) || 0, 0.85),
        classifierSource: "deterministic",
        classifierSignals: qaRoute.classifierSignals,
      };
    }
  }
  const isEmptyUtteranceWithAnchoredPayload =
    utteranceStr.length < 2 &&
    scopedInput?.payload &&
    typeof scopedInput.payload === "object" &&
    hasAnchoredReportRows(scopedInput.payload);
  if (qaRoute.exitEarly && isEmptyUtteranceWithAnchoredPayload) {
    qaRoute = {
      routerIntent: "unknown_report_question",
      requiresLlm: true,
      deterministicResponse: null,
      exitEarly: false,
      classifierBucket: "report_related",
      classifierConfidence: Math.max(Number(qaRoute.classifierConfidence) || 0, 0.56),
      classifierSource: "deterministic",
      classifierSignals: qaRoute.classifierSignals,
    };
  }
  const hasPriorScopeForFollowUp =
    (Array.isArray(conv.priorScopes) && conv.priorScopes.length > 0) ||
    String(conv.lastResolvedTopic || "").trim() ||
    String(conv.lastResolvedSubject || "").trim();
  if (
    qaRoute.exitEarly &&
    qaRoute.deterministicResponse === HEALTH_BOUNDARY_RESPONSE_HE &&
    hasPriorScopeForFollowUp &&
    /^(?:ז(?:ה|ו)\s+)?חמור\s*\??$/u.test(foldUtteranceForHeMatch(utteranceStr))
  ) {
    qaRoute = {
      routerIntent: "unknown_report_question",
      requiresLlm: true,
      deterministicResponse: null,
      exitEarly: false,
      classifierBucket: "report_related",
      classifierConfidence: Math.max(Number(qaRoute.classifierConfidence) || 0, 0.9),
      classifierSource: "deterministic",
      classifierSignals: qaRoute.classifierSignals,
    };
  }
  if (qaRoute.exitEarly && qaRoute.deterministicResponse) {
    const earlyExit = packageClassifierEarlyExit({
      qaRoute,
      audience,
      sessionId,
      conv,
      priorRepeated,
      utteranceStr,
      classifierTrace: { source: qaRoute.classifierSource || "deterministic" },
    });
    return earlyExit;
  }
  // ── END FIRST PRODUCT GATE ──
  /** Forward the classifier verdict so resolved/clarification telemetry can stamp it. */
  const classifierMetaForResolved = {
    classifierBucket: qaRoute.classifierBucket || "report_related",
    classifierSource: qaRoute.classifierSource || "deterministic",
    classifierConfidence: Number(qaRoute.classifierConfidence || 0),
  };

  const stageA = interpretFreeformStageA(String(input?.utterance || ""), scopedInput?.payload);
  const aggregateQuestionClass = detectAggregateQuestionClass(utteranceStr);
  let intent = stageA.canonicalIntent;
  if (
    aggregateQuestionClass === "vague_summary_question" &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "off_topic_redirect"
  ) {
    intent = "explain_report";
  }
  if (
    aggregateQuestionClass === "advance_or_hold_question" &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "off_topic_redirect"
  ) {
    intent = "why_not_advance";
  }
  /** Fabrication / integrity asks must stay on refusal copy even when Stage A leans explain-like. */
  const reportDataFabricationProbe =
    /תמציא\s*נתונים|תסתיר\s*(?:מההורה|את\s*הקושי)|בלי\s*להתחשב\s*בנתונים|תכתוב\s*שהילד\s*מצוין\s*למרות|תשנה\s*את\s*הדוח/i.test(
      utteranceStr,
    );
  if (
    reportDataFabricationProbe &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "off_topic_redirect"
  ) {
    intent = "parent_policy_refusal";
  }

  const continuityPattern = tryComposeContinuityPatternDraft({
    utteranceStr,
    payload: scopedInput?.payload,
    conversationState: conv,
  });
  if (continuityPattern) {
    const packaged = tryPackageApprovedPatternTurn(
      scopedInput,
      sessionId,
      priorRepeated,
      conv,
      utteranceStr,
      continuityPattern,
      { ...classifierMetaForResolved, intentConfidence: stageA?.canonicalIntentScore || 0.85 },
    );
    if (packaged) return packaged;
  }

  const earlyPattern = tryComposePatternAnswerDraft({
    utteranceStr,
    payload: scopedInput?.payload,
    conversationState: conv,
  });
  if (earlyPattern) {
    const packaged = tryPackageApprovedPatternTurn(
      scopedInput,
      sessionId,
      priorRepeated,
      conv,
      utteranceStr,
      earlyPattern,
      { ...classifierMetaForResolved, intentConfidence: stageA?.canonicalIntentScore || 0.88 },
    );
    if (packaged) return packaged;
  }

  const simpleExplainDraft = tryComposeExplainReportSimpleWordsDraft({
    utteranceStr,
    payload: scopedInput?.payload,
    conversationState: conv,
  });
  if (simpleExplainDraft) {
    const packaged = tryPackageApprovedPatternTurn(
      scopedInput,
      sessionId,
      priorRepeated,
      conv,
      utteranceStr,
      simpleExplainDraft,
      { ...classifierMetaForResolved, intentConfidence: stageA?.canonicalIntentScore || 0.9 },
    );
    if (packaged) return packaged;
  }

  if (shouldReturnNoDataForRequest(utteranceStr, scopedInput?.payload)) {
    const scopeMetaNoData = {
      scopeConfidence: 0.88,
      scopeReason: "no_data_for_request",
      intentConfidence: Number(stageA?.canonicalIntentScore || 0.85),
      intentReason: "no_data:evidence_missing",
      classifierBucket: classifierMetaForResolved.classifierBucket,
      classifierSource: classifierMetaForResolved.classifierSource,
      classifierConfidence: classifierMetaForResolved.classifierConfidence,
    };
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: noDataResponseHe(utteranceStr, scopedInput?.payload),
      intent: "unknown_report_question",
      priorRepeated,
      metadata: scopeMetaNoData,
    });
    validateParentCopilotResponseV1(r);
    return {
      response: r,
      audience,
      sessionId,
      conv,
      truthPacket: null,
      intent: "unknown_report_question",
      scopeMeta: scopeMetaNoData,
      utteranceStr,
    };
  }

  const shortFb = tryBuildParentShortFollowupDraft({
    utteranceStr,
    conv,
    payload: scopedInput?.payload,
  });
  if (shortFb) {
    return packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
      truthPacket: shortFb.truthPacket,
      plannerIntent: shortFb.plannerIntent,
      scopeMeta: { ...classifierMetaForResolved, ...shortFb.scopeMeta },
      answerBlocks: shortFb.answerBlocks,
    });
  }

  const practicalFb = tryBuildComparisonPracticalFollowupDraft({
    utteranceStr,
    conv,
    payload: scopedInput?.payload,
    stageA,
  });
  if (practicalFb) {
    return packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
      truthPacket: practicalFb.truthPacket,
      plannerIntent: practicalFb.plannerIntent,
      scopeMeta: { ...classifierMetaForResolved, ...practicalFb.scopeMeta },
      answerBlocks: practicalFb.answerBlocks,
    });
  }

  const intentResolution = {
    intent,
    confidence: stageA.canonicalIntentScore,
    reason: stageA.intentReason,
    normalizedUtterance: stageA.normalizedUtterance,
    shouldClarify: stageA.shouldClarifyIntent,
    stageA,
  };

  const scopeRes = resolveScope({
    payload: scopedInput?.payload,
    utterance: utteranceStr,
    selectedContextRef: scopedInput?.selectedContextRef ?? null,
    stageA,
    conversationState: conv,
  });

  const scopeMeta = {
    scopeConfidence: Number(scopeRes?.scopeConfidence || 0),
    scopeReason: String(scopeRes?.scopeReason || "unknown_scope_reason"),
    intentConfidence: Number(intentResolution.confidence || 0),
    intentReason: String(intentResolution.reason || "unknown_intent_reason"),
    classifierBucket: classifierMetaForResolved.classifierBucket,
    classifierSource: classifierMetaForResolved.classifierSource,
    classifierConfidence: classifierMetaForResolved.classifierConfidence,
    semanticIntent: semanticIntentForMetadata({
      classifierBucket: classifierMetaForResolved.classifierBucket,
      canonicalIntent: intent,
    }),
  };

  if (scopeRes.resolutionStatus === "clarification_required") {
    if (String(scopeRes.scopeReason || "") === "subject_zero_evidence_in_period") {
      const r = buildClarificationParentCopilotResponse({
        clarificationQuestionHe: scopeRes.clarificationQuestionHe || "בתקופה הזו אין נתוני תרגול במקצוע הזה.",
        intent,
        priorRepeated,
        metadata: scopeMeta,
      });
      validateParentCopilotResponseV1(r);
      return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
    }
    const categorySpecificClarification = buildNoScopeCategorySpecificClarification(utteranceStr);
    if (categorySpecificClarification) {
      const r = buildClarificationParentCopilotResponse({
        clarificationQuestionHe: categorySpecificClarification,
        intent,
        priorRepeated,
        metadata: scopeMeta,
      });
      validateParentCopilotResponseV1(r);
      return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
    }
    const phaseEBypass = tryBuildPhaseEClarificationBypassDraft({
      utteranceStr,
      payload: scopedInput?.payload,
      scopeRes,
      stageA,
    });
    if (phaseEBypass) {
      return packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
        truthPacket: phaseEBypass.truthPacket,
        plannerIntent: phaseEBypass.plannerIntent,
        scopeMeta: phaseEBypass.scopeMeta,
        answerBlocks: phaseEBypass.answerBlocks,
      });
    }
    if (shouldReturnNoDataForRequest(utteranceStr, scopedInput?.payload)) {
      const r = buildClarificationParentCopilotResponse({
        clarificationQuestionHe: noDataResponseHe(utteranceStr, scopedInput?.payload),
        intent,
        priorRepeated,
        metadata: scopeMeta,
      });
      validateParentCopilotResponseV1(r);
      return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
    }
    const patternBeforeClarify = tryComposePatternAnswerDraft({
      utteranceStr,
      payload: scopedInput?.payload,
      conversationState: conv,
    });
    if (patternBeforeClarify) {
      const packaged = tryPackageApprovedPatternTurn(
        scopedInput,
        sessionId,
        priorRepeated,
        conv,
        utteranceStr,
        patternBeforeClarify,
        scopeMeta,
      );
      if (packaged) return packaged;
    }
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: scopeRes.clarificationQuestionHe || "צריך עוד הקשר.",
      intent,
      priorRepeated,
      metadata: scopeMeta,
    });
    validateParentCopilotResponseV1(r);
    return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
  }

  const scope = scopeRes.scope;
  if (!scope) {
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: "לא ניתן לזהות הקשר מהדוח.",
      intent,
      priorRepeated,
      metadata: scopeMeta,
    });
    validateParentCopilotResponseV1(r);
    return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
  }

  if (isHistoryZeroDataScope(scope)) {
    const zeroDraft = composeHistoryZeroDataAnswerDraft({ scope });
    const zeroEarly = packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
      truthPacket: zeroDraft.truthPacket,
      plannerIntent: zeroDraft.plannerIntent,
      scopeMeta: { ...scopeMeta, ...zeroDraft.scopeMeta, historyZeroDataComposer: true },
      answerBlocks: zeroDraft.answerBlocks,
    });
    if (zeroEarly) {
      return {
        ...zeroEarly,
        fallbackUsed: false,
        scopeMeta: { ...zeroEarly.scopeMeta, fallbackUsed: false },
      };
    }
  }

  const historyCopilotLock = detectHistoryCopilotLock(utteranceStr);
  const truthPacketBuildIntent =
    aggregateQuestionClass === "recommendation_action" &&
    String(scope?.scopeType || "") === "executive" &&
    payloadHasEligibleCopilotRecommendation(scopedInput.payload)
      ? "unclear"
      : intent;

  const truthPacket = buildTruthPacketV1(scopedInput.payload, {
    ...scope,
    canonicalIntent: truthPacketBuildIntent,
    parentUtterance: utteranceStr,
  });
  if (!truthPacket) {
    const r = buildClarificationParentCopilotResponse({
      clarificationQuestionHe: "לא נמצאו חוזים תואמים לנושא שנבחר בדוח.",
      intent,
      priorRepeated,
      metadata: scopeMeta,
    });
    validateParentCopilotResponseV1(r);
    return { response: r, audience, sessionId, conv, truthPacket: null, intent, scopeMeta, utteranceStr };
  }

  const inheritedScope = String(scopeMeta.scopeReason || "").includes("conversation_inherited");

  const patternAfterScope = tryComposePatternAnswerDraft({
    utteranceStr,
    payload: scopedInput.payload,
    conversationState: conv,
    truthPacket,
  });
  if (patternAfterScope) {
    const packaged = tryPackageApprovedPatternTurn(
      scopedInput,
      sessionId,
      priorRepeated,
      conv,
      utteranceStr,
      patternAfterScope,
      scopeMeta,
    );
    if (packaged) return packaged;
  }

  let intentAnswerDraft = null;
  const deferIntentComposer =
    shouldDeferIntentComposer(aggregateQuestionClass) && !historyCopilotLock?.locked;
  if (!deferIntentComposer) {
    intentAnswerDraft = tryComposeIntentAnswer({
      utteranceStr,
      truthPacket,
      scope,
      payload: scopedInput.payload,
      plannerIntent: intent,
      stageAIntent: intent,
      inheritedScope,
      conversationState: conv,
    });
  }
  if (intentAnswerDraft?.answerBlocks?.length) {
    const compactedIntent = compactParentAnswerBlocks(
      intentAnswerDraft.answerBlocks.map((b) => ({
        ...b,
        textHe: normalizeParentFacingHe(String(b.textHe || "").trim()),
      })),
      { scopeType: String(truthPacket.scopeType || ""), maxBlocks: 5, maxTotalChars: 2600 },
    );
    const intentPlanner = intentAnswerDraft.plannerIntent || intent;
    const vIntent = validateAnswerDraft(
      { answerBlocks: compactedIntent },
      truthPacket,
      {
        intent: intentPlanner,
        answerContract: intentAnswerDraft.answerContract,
        priorAnswerFingerprint: String(conv.lastAnswerSummary || "").trim()
          ? fingerprintAnswerHe({ answerBlocks: [{ textHe: conv.lastAnswerSummary }] })
          : "",
      },
    );
    if (vIntent.ok) {
      const intentScopeMeta = {
        ...scopeMeta,
        answerContract: intentAnswerDraft.answerContract,
        answerComposerUsed: intentAnswerDraft.answerComposerUsed,
        generationPath: "intent_composer",
        evidenceUsed: intentAnswerDraft.evidenceUsed,
        inheritedScope: intentAnswerDraft.inheritedScope,
      };
      if (process.env.COPILOT_EVIDENCE_DEBUG === "1") {
        process.stderr.write(
          `${JSON.stringify({
            endpoint: "runParentCopilotTurn",
            utterance: utteranceStr,
            resolvedIntent: intentPlanner,
            answerContract: intentAnswerDraft.answerContract,
            resolvedScope: intentAnswerDraft.resolvedScope,
            inheritedScope: intentAnswerDraft.inheritedScope,
            answerComposerUsed: intentAnswerDraft.answerComposerUsed,
            evidenceUsed: intentAnswerDraft.evidenceUsed,
            fallbackUsed: false,
          })}\n`,
        );
      }
      const early = packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
        truthPacket,
        plannerIntent: intentPlanner,
        scopeMeta: intentScopeMeta,
        answerBlocks: compactedIntent,
      });
      if (early.response?.telemetry) {
        early.response.telemetry = {
          ...early.response.telemetry,
          generationPath: "intent_composer",
          answerContract: intentAnswerDraft.answerContract,
          answerComposerUsed: intentAnswerDraft.answerComposerUsed,
        };
      }
      return early;
    }
  }

  if (aggregateQuestionClass === "none") {
    const phaseShortcut = tryBuildPhaseEResolvedShortcutDraft({
      utteranceStr,
      truthPacket,
      scope,
      stageA,
    });
    if (phaseShortcut) {
      return packageParentResolvedEarlyTurn(scopedInput, sessionId, priorRepeated, conv, utteranceStr, {
        truthPacket: phaseShortcut.truthPacket,
        plannerIntent: phaseShortcut.plannerIntent,
        scopeMeta: phaseShortcut.scopeMeta,
        answerBlocks: phaseShortcut.answerBlocks,
      });
    }
  }

  const priorIntents = Array.isArray(conv.priorIntents) ? conv.priorIntents : [];
  const lastIntent = priorIntents.length ? String(priorIntents[priorIntents.length - 1] || "") : "";
  const continuityRepeat = lastIntent === intent && lastIntent.length > 0;

  let draft;
  let semanticAggregateSatisfied = false;
  /** @type {null|{ questionClass: string; subjectId: string; role: string }} */
  let aggregateContinuityHint = null;
  const dlForAgg = truthPacket.derivedLimits || {};
  const skipSemanticAggregateForIneligibleRec =
    aggregateQuestionClass === "recommendation_action" &&
    (!dlForAgg.recommendationEligible || dlForAgg.recommendationIntensityCap === "RI0");
  /** When aggregate asks for recommendations but contracts forbid them, plan as action intent (truth slots + uncertainty), not unrelated Stage A labels. */
  const plannerIntent =
    aggregateQuestionClass === "recommendation_action" && !skipSemanticAggregateForIneligibleRec
      ? /השבוע|בשבוע|שבוע\s*הקרוב|המלצות|להמשך|מה\s*ההמלצות/.test(utteranceStr)
        ? "what_to_do_this_week"
        : "what_to_do_today"
      : skipSemanticAggregateForIneligibleRec &&
          /השבוע|בשבוע|שבוע\s*הקרוב|המלצות|להמשך|מה\s*ההמלצות/.test(utteranceStr)
        ? "what_to_do_this_week"
        : skipSemanticAggregateForIneligibleRec
          ? "what_to_do_today"
          : intent;
  if (
    aggregateQuestionClass !== "none" &&
    aggregateQuestionClass !== "vague_summary_question" &&
    !skipSemanticAggregateForIneligibleRec &&
    !historyCopilotLock?.locked &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "parent_policy_refusal" &&
    intent !== "off_report_subject_clarification" &&
    intent !== "off_topic_redirect" &&
    intent !== "simple_parent_explanation"
  ) {
    const aggDraft = buildSemanticAggregateDraft({
      questionClass: aggregateQuestionClass,
      utterance: utteranceStr,
      payload: scopedInput.payload,
      truthPacket,
    });
    if (aggDraft) {
      const compactedAgg = compactParentAnswerBlocks(aggDraft.answerBlocks, {
        scopeType: String(truthPacket.scopeType || ""),
        maxBlocks: 5,
        maxTotalChars: 2600,
      });
      const vAgg = validateAnswerDraft({ answerBlocks: compactedAgg }, truthPacket, { intent: plannerIntent });
      if (vAgg.ok) {
        draft = { answerBlocks: compactedAgg };
        semanticAggregateSatisfied = true;
        aggregateContinuityHint = aggDraft.aggregateContinuity ?? null;
      }
    }
  }

  if (!draft) {
    const plan = planConversation(plannerIntent, truthPacket, {
      continuityRepeat,
      turnOrdinal: priorIntents.length,
      scopeType: truthPacket.scopeType,
      interpretationScope: truthPacket.interpretationScope,
    });
    draft = composeAnswerDraft(plan, truthPacket, {
      intent: plannerIntent,
      continuityRepeat,
      conversationState: conv,
      turnOrdinal: priorIntents.length,
      parentUtterance: utteranceStr,
    });
    draft = {
      ...draft,
      answerBlocks: compactParentAnswerBlocks(draft.answerBlocks, {
        scopeType: String(truthPacket.scopeType || ""),
        maxBlocks: 5,
        maxTotalChars: 2600,
      }),
    };
  }

  draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
  draft = augmentHighVolumeEvidenceAnchorDraft(draft, truthPacket, scopedInput.payload, { plannerIntent });
  draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
  // Do NOT augment boundary or off-topic drafts with report data.
  // Do NOT add thin-evidence augmentation when global answer count is already high —
  // adding scarcity framing to a high-volume report is a truth contradiction.
  {
    const augGlobalQ = maxGlobalReportQuestionCount(scopedInput?.payload);
    const isBoundaryIntent =
      plannerIntent === "off_topic_redirect" ||
      plannerIntent === "parent_policy_refusal" ||
      plannerIntent === "clinical_boundary" ||
      plannerIntent === "sensitive_education_choice";
    const isHighVolume = augGlobalQ >= STRONG_GLOBAL_QUESTION_FLOOR;
    if (!isBoundaryIntent && !isHighVolume) {
      draft = augmentPhaseEThinEvidenceDraft(draft, truthPacket);
      draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
    }
    // Post-composition safety-net: strip global scarcity phrases injected by the
    // truth-packet builder when global answer count is already high.
    if (isHighVolume && !isBoundaryIntent) {
      const SCARCITY_STRIP_RE =
        /(יש\s+כרגע\s+מעט\s+נתוני\s+תרגול,?\s*כלומר[^.]*\.?\s*|נפח\s+הנתונים\s+עדיין\s+מצומצם[^.]*\.?\s*|אין\s+עדיין\s+מספיק\s+מידע\s+לכיוון\s+ברור[^.]*\.?\s*)/gu;
      draft = {
        ...draft,
        answerBlocks: draft.answerBlocks.map((b) => ({
          ...b,
          textHe: String(b?.textHe || "")
            .replace(SCARCITY_STRIP_RE, " ")
            .replace(/\s{2,}/g, " ")
            .trim(),
        })),
      };
    }
  }
  let vDraft = validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
  let fallbackUsed = false;
  /** @type {string[]} */
  const fallbackReasonCodes = [];

  if (!vDraft.ok) {
    fallbackReasonCodes.push(...vDraft.failCodes);
    semanticAggregateSatisfied = false;
    if (draftHasClinicalGuardrailFailure(vDraft.failCodes)) {
      draft = buildClinicalBoundaryAnswerDraft();
      fallbackUsed = false;
      draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: "clinical_boundary" });
    } else {
      draft = buildDeterministicFallbackAnswer(truthPacket, vDraft.failCodes);
      fallbackUsed = true;
      draft = {
        ...draft,
        answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket, { preserveContractSlotSources: true }),
      };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
    }
  }
  if (!vDraft.ok) {
    fallbackReasonCodes.push(...vDraft.failCodes);
    semanticAggregateSatisfied = false;
    if (draftHasClinicalGuardrailFailure(vDraft.failCodes)) {
      draft = buildClinicalBoundaryAnswerDraft();
      fallbackUsed = false;
      draft = { ...draft, answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket) };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: "clinical_boundary" });
    } else {
      const nar = truthPacket.contracts?.narrative;
      const slots = nar?.textSlots || {};
      draft = {
        answerBlocks: [
          { type: "observation", textHe: String(slots.observation || "").trim(), source: "contract_slot" },
          { type: "meaning", textHe: String(slots.interpretation || "").trim(), source: "contract_slot" },
        ].filter((b) => b.textHe),
      };
      if (draft.answerBlocks.length < 2) {
        draft = buildDeterministicFallbackAnswer(truthPacket, ["emergency_fallback"]);
      }
      fallbackUsed = true;
      draft = {
        ...draft,
        answerBlocks: normalizeAnswerBlocksHe(draft.answerBlocks, truthPacket, { preserveContractSlotSources: true }),
      };
      vDraft = validateAnswerDraft(draft, truthPacket, { intent: plannerIntent });
    }
  }

  if (!fallbackUsed) {
    draft = enforceThinDataScarcityLead(draft, truthPacket, plannerIntent, scopedInput?.payload);
  }
  const responseIntent = isClinicalBoundaryDraft(draft)
    ? "clinical_boundary"
    : isSensitiveEducationChoiceDraft(draft)
      ? "sensitive_education_choice"
      : plannerIntent;

  if (!fallbackUsed) {
    draft = ensureHomePracticePracticalMagnitudeDraft(draft, responseIntent, truthPacket);
  }
  draft = {
    ...draft,
    answerBlocks: normalizeAnswerBlocksHe(
      draft.answerBlocks,
      truthPacket,
      fallbackUsed ? { preserveContractSlotSources: true } : null,
    ),
  };

  const answerBlockTypes = draft.answerBlocks.map((b) => b.type);
  const answerBodyTextHe = draft.answerBlocks.map((b) => b.textHe).join(" ").trim();

  const follow = selectFollowUp({
    audience: "parent",
    intent: responseIntent,
    scopeType: truthPacket.scopeType,
    scopeKey: `${truthPacket.scopeType}:${truthPacket.scopeId}`,
    scopeLabelHe: truthPacket.scopeLabel || "",
    answerBodyTextHe,
    answerBlockTypes,
    clickedFollowupFamilyThisTurn: scopedInput?.clickedFollowupFamily ? String(scopedInput.clickedFollowupFamily).trim() : null,
    omitFollowUpEntirely:
      (aggregateQuestionClass !== "none" && aggregateQuestionClass !== "vague_summary_question") ||
      (semanticAggregateSatisfied && vDraft.ok),
    truthPacket: {
      cannotConcludeYet: truthPacket.derivedLimits.cannotConcludeYet,
      readiness: truthPacket.derivedLimits.readiness,
      confidenceBand: truthPacket.derivedLimits.confidenceBand,
      recommendationEligible: truthPacket.derivedLimits.recommendationEligible,
      recommendationIntensityCap: truthPacket.derivedLimits.recommendationIntensityCap,
      allowedFollowupFamilies: truthPacket.allowedFollowupFamilies,
    },
    conversationState: conv,
  });

  const suggestedFollowUp = follow.selected
    ? {
        kind: /** @type {const} */ ("question"),
        family: follow.selected.family,
        textHe: normalizeParentFacingHe(follow.selected.textHe),
        reasonCode: follow.selected.reasonCode,
      }
    : null;

  /** @type {Array<"contractsV1.evidence"|"contractsV1.decision"|"contractsV1.readiness"|"contractsV1.confidence"|"contractsV1.recommendation"|"contractsV1.narrative">} */
  const contractSourcesUsed = ["contractsV1.narrative"];
  const explainLikeIntent =
    plannerIntent === "explain_report" ||
    plannerIntent === "ask_topic_specific" ||
    plannerIntent === "ask_subject_specific";
  if (!explainLikeIntent) {
    contractSourcesUsed.push("contractsV1.decision", "contractsV1.readiness", "contractsV1.confidence");
  }
  if (draft.answerBlocks.some((b) => b.type === "next_step")) {
    contractSourcesUsed.push("contractsV1.recommendation");
  }
  if (explainLikeIntent) {
    contractSourcesUsed.push("contractsV1.evidence");
  }

  const validatorFailCodes = vDraft.ok ? [] : [...vDraft.failCodes];
  const validatorStatus = vDraft.ok ? "pass" : "fail";

  let response = buildResolvedParentCopilotResponse({
    truthPacket,
    intent: responseIntent,
    answerBlocks: draft.answerBlocks,
    suggestedFollowUp,
    validatorStatus,
    validatorFailCodes,
    fallbackUsed,
    contractSourcesUsed: [...new Set(contractSourcesUsed)],
    priorRepeated,
    metadata: scopeMeta,
    debug: draft?.debug && typeof draft.debug === "object" ? draft.debug : undefined,
  });

  const finalCheck = validateParentCopilotResponseV1(response);
  if (!finalCheck.ok && response.resolutionStatus === "resolved") {
    response = {
      ...response,
      validatorStatus: "fail",
      validatorFailCodes: [...new Set([...(response.validatorFailCodes || []), ...finalCheck.hardFails])],
      quickActions: buildQuickActions(truthPacket, false),
    };
  }

  const telemetry = buildTurnTelemetry({
    intent: responseIntent,
    intentConfidence: scopeMeta.intentConfidence,
    intentReason: scopeMeta.intentReason,
    scopeConfidence: scopeMeta.scopeConfidence,
    scopeReason: scopeMeta.scopeReason,
    answerBlocks: draft.answerBlocks,
    fallbackUsed,
    fallbackReasonCodes,
    validatorFailCodes,
    semanticAggregateSatisfied,
    generationPath: "deterministic",
    truthPacket,
    resolutionStatus: "resolved",
    scopeType: truthPacket.scopeType,
    scopeId: truthPacket.scopeId,
  });
  response = { ...response, telemetry };

  const constraintParts = [vDraft.ok ? "turn:validator_pass" : "turn:validator_fail"];
  if (draft.answerBlocks.some((b) => b.type === "uncertainty_reason")) constraintParts.push("surface:uncertainty");
  if (draft.answerBlocks.some((b) => b.type === "caution")) constraintParts.push("surface:caution");

  const assistantAnswerSummary = draft.answerBlocks
    .map((b) => b.textHe)
    .join(" ")
    .trim()
    .slice(0, 480);

  applyConversationStateDelta(sessionId, {
    addedIntent: responseIntent,
    addedFollowUpFamily: suggestedFollowUp?.family,
    ...(scopedInput?.clickedFollowupFamily
      ? { clickedFollowupFamily: String(scopedInput.clickedFollowupFamily).trim() }
      : {}),
    addedScopeKey: `${truthPacket.scopeType}:${truthPacket.scopeId}`,
    answeredConstraintTag: constraintParts.join(","),
    closingSnippet: draft.answerBlocks.map((b) => b.textHe).join(" ").slice(-48),
    ...(suggestedFollowUp?.textHe ? { suggestedFollowupTextHe: suggestedFollowUp.textHe } : {}),
    ...(assistantAnswerSummary ? { assistantAnswerSummary } : {}),
    scopeLabelSnapshotHe: truthPacket.scopeLabel || "",
    plannerIntentSnapshot: responseIntent,
    lastOfferedFollowupFamily: suggestedFollowUp?.family ?? null,
    ...(semanticAggregateSatisfied && aggregateContinuityHint
      ? {
          lastAnswerAggregateClass: aggregateContinuityHint.questionClass,
          lastComparisonSubjectId: aggregateContinuityHint.subjectId || "",
          lastComparisonRole: aggregateContinuityHint.role || "",
        }
      : {}),
  });

  return { response, audience, sessionId, conv, truthPacket, intent: responseIntent, scopeMeta, utteranceStr, draft, validatorFailCodes };
}

/**
 * Synchronous Parent Copilot turn: **deterministic only**.
 *
 * Always runs {@link runDeterministicCore} first and last. There is **no** LLM overlay on this path;
 * telemetry reports `generationPath: "deterministic"`.
 *
 * **Fallback:** If the composed draft fails `validateAnswerDraft`, the pipeline may replace it with
 * a deterministic fallback (`buildDeterministicFallbackAnswer`), clinical-boundary copy, or emergency
 * slot extraction (see `packageParentResolvedEarlyTurn` and the main resolved path in this file).
 *
 * @param {object} input
 * @param {"parent"|"teacher"} [input.audience]
 * @param {unknown} input.payload
 * @param {string} [input.utterance]
 * @param {string} [input.sessionId]
 * @param {null|{ scopeType?: string; scopeId?: string; subjectId?: string }} [input.selectedContextRef]
 * @param {string|null} [input.clickedFollowupFamily] quick-action chip → maps to session clickedFollowups
 */
export function runParentCopilotTurn(input) {
  const core = runDeterministicCore(input);
  return finalizeTurnResponse(core.response, {
    audience: core.audience,
    sessionId: core.sessionId,
    truthPacket: core.truthPacket,
    intent: core.intent,
    utteranceLength: String(core.utteranceStr || "").trim().length,
    generationPath: "deterministic",
  });
}

/**
 * Asynchronous Parent Copilot turn: **deterministic first; LLM optional overlay only**.
 *
 * 1. **Always** runs {@link runDeterministicCore} — same baseline as {@link runParentCopilotTurn}.
 * 2. **LLM skipped** (no provider call; response unchanged from deterministic) when:
 *    - `resolutionStatus !== "resolved"`, or missing `truthPacket` / utterance;
 *    - `core.intent === "clinical_boundary"`;
 *    - `getLlmGateDecision().enabled === false` (`maybeGenerateGroundedLlmDraft` returns immediately);
 *    - LLM or post-LLM validation fails — then deterministic baseline (or clinical-boundary branch) is kept.
 * 3. **LLM may run** only if gates pass **and** the resolved path calls `maybeGenerateGroundedLlmDraft` and the
 *    draft passes `validateLlmDraft`, `validateAnswerDraft`, and `validateParentCopilotResponseV1` - then
 *    telemetry `generationPath` is `llm_grounded`.
 *
 * **Fallback:** Same validator-driven fallbacks as the sync path when the final LLM-backed response is not used.
 *
 * @param {object} input — same shape as {@link runParentCopilotTurn}
 * @see ./README.md for env flags and `generationPath` semantics
 */
export async function runParentCopilotTurnAsync(input) {
  // ── Optional LLM classifier upgrade for ambiguous deterministic verdicts ──
  // Runs ONLY when:
  //   - the deterministic classifier returned ambiguous_or_unclear, AND
  //   - the LLM gate (PARENT_COPILOT_LLM_ENABLED + EXPERIMENT + rollout stage) is enabled.
  // On any LLM failure (timeout, parse error, low confidence) we fall through with
  // the deterministic ambiguous verdict (conservative fallback).
  const detRoute = routeParentQuestion(String(input?.utterance || ""), input?.payload);
  let effectiveRoute = detRoute;
  let classifierLlmAttempt = null;
  if (detRoute.classifierBucket === "ambiguous_or_unclear" && getLlmGateDecision().enabled) {
    const llmRes = await classifyParentQuestionViaLlm({
      utterance: String(input?.utterance || ""),
      payload: redactPayloadForCopilotGrounding(input?.payload),
    });
    classifierLlmAttempt = llmRes;
    if (llmRes.ok) {
      if (llmRes.bucket === "off_topic") {
        effectiveRoute = {
          ...detRoute,
          routerIntent: "off_topic",
          deterministicResponse: GENERAL_OFF_TOPIC_RESPONSE_HE,
          exitEarly: true,
          classifierBucket: "off_topic",
          classifierConfidence: llmRes.confidence,
          classifierSource: /** @type {"deterministic"} */ ("deterministic"),
        };
      } else if (llmRes.bucket === "diagnostic_sensitive") {
        effectiveRoute = {
          ...detRoute,
          routerIntent: "unsafe_or_diagnostic_request",
          deterministicResponse: HEALTH_BOUNDARY_RESPONSE_HE,
          exitEarly: true,
          classifierBucket: "health_sensitive",
          classifierConfidence: llmRes.confidence,
          classifierSource: /** @type {"deterministic"} */ ("deterministic"),
        };
      } else if (llmRes.bucket === "report_related") {
        effectiveRoute = {
          ...detRoute,
          routerIntent: "unknown_report_question",
          deterministicResponse: null,
          exitEarly: false,
          classifierBucket: "report_related",
          classifierConfidence: llmRes.confidence,
          classifierSource: /** @type {"deterministic"} */ ("deterministic"),
        };
      }
      // For "ambiguous_or_unclear" from LLM, keep effectiveRoute as detRoute (also ambiguous).
    }
  }

  const llmClassifierUsed = classifierLlmAttempt && classifierLlmAttempt.ok && effectiveRoute !== detRoute;
  if (llmClassifierUsed) {
    // Stamp classifierSource = "llm" through the route so packaging picks it up.
    effectiveRoute = { ...effectiveRoute, classifierSource: /** @type {any} */ ("llm") };
  }

  const core = runDeterministicCore(input, { preRoute: effectiveRoute });
  const baseResponse = core.response;
  if (
    baseResponse?.telemetry?.generationPath === "intent_composer" ||
    baseResponse?.telemetry?.answerComposerUsed
  ) {
    return finalizeTurnResponse(baseResponse, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "intent_composer",
    });
  }
  if (baseResponse?.resolutionStatus !== "resolved" || !core.truthPacket || !core.utteranceStr) {
    return finalizeTurnResponse(baseResponse, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "deterministic",
    });
  }

  if (
    core.intent === "clinical_boundary" ||
    core.intent === "sensitive_education_choice" ||
    core.intent === "off_topic_redirect" ||
    core.intent === "parent_policy_refusal" ||
    core.intent === "unclear"
  ) {
    const skipReason =
      core.intent === "sensitive_education_choice"
        ? "llm_skipped_sensitive_education_boundary"
        : core.intent === "clinical_boundary"
          ? "llm_skipped_clinical_boundary"
          : core.intent === "off_topic_redirect"
            ? "llm_skipped_off_topic_boundary"
            : core.intent === "unclear"
              ? "llm_skipped_ambiguous_boundary"
              : "llm_skipped_policy_boundary";
    const llmAttempt = classifierLlmAttempt
      ? {
          ok: !!classifierLlmAttempt.ok,
          reason: classifierLlmAttempt.ok
            ? `classifier_upgrade:${effectiveRoute?.classifierBucket || "ambiguous_or_unclear"}`
            : `classifier_${classifierLlmAttempt.reason || "failed"}`,
        }
      : { ok: false, reason: skipReason };
    return finalizeTurnResponse(baseResponse, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "deterministic",
      llmAttempt,
    });
  }

  const llmResult = await maybeGenerateGroundedLlmDraft({
    utterance: core.utteranceStr,
    truthPacket: core.truthPacket,
    parentIntent: core.intent,
  });
  if (!llmResult.ok || !llmResult.draft) {
    if (CLINICAL_LLM_FAIL_REASONS.has(String(llmResult.reason || "")) && core.truthPacket) {
      const rawBoundary = buildClinicalBoundaryAnswerDraft();
      const boundaryDraft = {
        ...rawBoundary,
        answerBlocks: normalizeAnswerBlocksHe(rawBoundary.answerBlocks),
      };
      const vBoundary = validateAnswerDraft(boundaryDraft, core.truthPacket, { intent: "clinical_boundary" });
      if (vBoundary.ok) {
        const boundaryResponse = buildResolvedParentCopilotResponse({
          truthPacket: core.truthPacket,
          intent: "clinical_boundary",
          answerBlocks: boundaryDraft.answerBlocks,
          suggestedFollowUp: baseResponse.suggestedFollowUp || null,
          validatorStatus: "pass",
          validatorFailCodes: [],
          fallbackUsed: false,
          contractSourcesUsed: baseResponse.contractSourcesUsed || ["contractsV1.narrative"],
          priorRepeated: Number(core?.conv?.repeatedPhraseHits || 0),
          metadata: core.scopeMeta,
        });
        const boundaryFinal = validateParentCopilotResponseV1(boundaryResponse);
        if (boundaryFinal.ok) {
          return finalizeTurnResponse(
            {
              ...boundaryResponse,
              telemetry: buildTurnTelemetry({
                intent: "clinical_boundary",
                intentConfidence: Number(core.scopeMeta?.intentConfidence || 0),
                intentReason: String(core.scopeMeta?.intentReason || "unknown"),
                scopeConfidence: Number(core.scopeMeta?.scopeConfidence || 0),
                scopeReason: String(core.scopeMeta?.scopeReason || "unknown"),
                answerBlocks: boundaryDraft.answerBlocks,
                fallbackUsed: false,
                validatorFailCodes: [],
                semanticAggregateSatisfied: false,
                generationPath: "deterministic",
                truthPacket: core.truthPacket,
                resolutionStatus: "resolved",
                scopeType: core.truthPacket.scopeType,
                scopeId: core.truthPacket.scopeId,
                llmAttempt: { ok: false, reason: String(llmResult.reason || "llm_clinical_rejected") },
              }),
            },
            {
              audience: core.audience,
              sessionId: core.sessionId,
              truthPacket: core.truthPacket,
              intent: "clinical_boundary",
              utteranceLength: String(core.utteranceStr || "").trim().length,
              generationPath: "deterministic",
              llmAttempt: { ok: false, reason: String(llmResult.reason || "llm_clinical_rejected") },
            },
          );
        }
      }
    }
    return finalizeTurnResponse({
      ...baseResponse,
      telemetry: {
        ...(baseResponse.telemetry || {}),
        llmAttempt: mergeLlmFailureDiagnostics(
          {
            ok: false,
            reason: llmResult.reason || "llm_unavailable",
            ...(Array.isArray(llmResult.gateReasonCodes) ? { gateReasonCodes: llmResult.gateReasonCodes } : {}),
          },
          llmResult,
        ),
      },
    }, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "deterministic",
      llmAttempt: mergeLlmFailureDiagnostics({ ok: false, reason: llmResult.reason || "llm_unavailable" }, llmResult),
    });
  }

  const llmDraft = {
    ...llmResult.draft,
    answerBlocks: normalizeAnswerBlocksHe(llmResult.draft.answerBlocks),
  };
  const vLlm = validateAnswerDraft(llmDraft, core.truthPacket, { intent: core.intent });
  if (!vLlm.ok) {
    if (draftHasClinicalGuardrailFailure(vLlm.failCodes) && core.truthPacket) {
      const rawBoundary = buildClinicalBoundaryAnswerDraft();
      const boundaryDraft = {
        ...rawBoundary,
        answerBlocks: normalizeAnswerBlocksHe(rawBoundary.answerBlocks),
      };
      const vBoundary = validateAnswerDraft(boundaryDraft, core.truthPacket, { intent: "clinical_boundary" });
      if (vBoundary.ok) {
        const boundaryResponse = buildResolvedParentCopilotResponse({
          truthPacket: core.truthPacket,
          intent: "clinical_boundary",
          answerBlocks: boundaryDraft.answerBlocks,
          suggestedFollowUp: baseResponse.suggestedFollowUp || null,
          validatorStatus: "pass",
          validatorFailCodes: [],
          fallbackUsed: false,
          contractSourcesUsed: baseResponse.contractSourcesUsed || ["contractsV1.narrative"],
          priorRepeated: Number(core?.conv?.repeatedPhraseHits || 0),
          metadata: core.scopeMeta,
        });
        const boundaryFinal = validateParentCopilotResponseV1(boundaryResponse);
        if (boundaryFinal.ok) {
          return finalizeTurnResponse(
            {
              ...boundaryResponse,
              telemetry: buildTurnTelemetry({
                intent: "clinical_boundary",
                intentConfidence: Number(core.scopeMeta?.intentConfidence || 0),
                intentReason: String(core.scopeMeta?.intentReason || "unknown"),
                scopeConfidence: Number(core.scopeMeta?.scopeConfidence || 0),
                scopeReason: String(core.scopeMeta?.scopeReason || "unknown"),
                answerBlocks: boundaryDraft.answerBlocks,
                fallbackUsed: false,
                validatorFailCodes: [],
                semanticAggregateSatisfied: false,
                generationPath: "deterministic",
                truthPacket: core.truthPacket,
                resolutionStatus: "resolved",
                scopeType: core.truthPacket.scopeType,
                scopeId: core.truthPacket.scopeId,
                llmAttempt: { ok: false, reason: "llm_draft_clinical_guardrail", failCodes: vLlm.failCodes },
              }),
            },
            {
              audience: core.audience,
              sessionId: core.sessionId,
              truthPacket: core.truthPacket,
              intent: "clinical_boundary",
              utteranceLength: String(core.utteranceStr || "").trim().length,
              generationPath: "deterministic",
              llmAttempt: { ok: false, reason: "llm_draft_clinical_guardrail" },
            },
          );
        }
      }
    }
    return finalizeTurnResponse({
      ...baseResponse,
      telemetry: {
        ...(baseResponse.telemetry || {}),
        llmAttempt: { ok: false, reason: "llm_draft_validator_fail", failCodes: vLlm.failCodes },
      },
    }, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "deterministic",
      llmAttempt: { ok: false, reason: "llm_draft_validator_fail" },
    });
  }

  let llmResponse = buildResolvedParentCopilotResponse({
    truthPacket: core.truthPacket,
    intent: core.intent,
    answerBlocks: llmDraft.answerBlocks,
    suggestedFollowUp: baseResponse.suggestedFollowUp || null,
    validatorStatus: "pass",
    validatorFailCodes: [],
    fallbackUsed: false,
    contractSourcesUsed: baseResponse.contractSourcesUsed || ["contractsV1.narrative"],
    priorRepeated: Number(core?.conv?.repeatedPhraseHits || 0),
    metadata: core.scopeMeta,
  });
  const llmFinalCheck = validateParentCopilotResponseV1(llmResponse);
  if (!llmFinalCheck.ok) {
    return finalizeTurnResponse(baseResponse, {
      audience: core.audience,
      sessionId: core.sessionId,
      truthPacket: core.truthPacket,
      intent: core.intent,
      utteranceLength: String(core.utteranceStr || "").trim().length,
      generationPath: "deterministic",
      llmAttempt: { ok: false, reason: "llm_final_response_validator_fail" },
    });
  }

  llmResponse = {
    ...llmResponse,
    telemetry: buildTurnTelemetry({
      intent: core.intent,
      intentConfidence: Number(core.scopeMeta?.intentConfidence || 0),
      intentReason: String(core.scopeMeta?.intentReason || "unknown"),
      scopeConfidence: Number(core.scopeMeta?.scopeConfidence || 0),
      scopeReason: String(core.scopeMeta?.scopeReason || "unknown"),
      answerBlocks: llmDraft.answerBlocks,
      fallbackUsed: false,
      validatorFailCodes: [],
      semanticAggregateSatisfied: false,
      generationPath: "llm_grounded",
      truthPacket: core.truthPacket,
      resolutionStatus: "resolved",
      scopeType: core.truthPacket.scopeType,
      scopeId: core.truthPacket.scopeId,
      llmAttempt: {
        ok: true,
        reason: "llm_draft_accepted",
        provider: llmResult.finalProvider || llmResult.provider || "unknown",
        ...(typeof llmResult.primaryProvider === "string" ? { primaryProvider: llmResult.primaryProvider } : {}),
        ...(typeof llmResult.primaryReason === "string" ? { primaryReason: llmResult.primaryReason } : {}),
        ...(typeof llmResult.fallbackProvider === "string" ? { fallbackProvider: llmResult.fallbackProvider } : {}),
        ...(typeof llmResult.fallbackReason === "string" ? { fallbackReason: llmResult.fallbackReason } : {}),
        ...(typeof llmResult.finalProvider === "string" ? { finalProvider: llmResult.finalProvider } : {}),
        ...(Array.isArray(llmResult.fallbackModels) && llmResult.fallbackModels.length
          ? { fallbackModels: [...llmResult.fallbackModels] }
          : {}),
        ...(Array.isArray(llmResult.fallbackAttempts) && llmResult.fallbackAttempts.length
          ? { fallbackAttempts: llmResult.fallbackAttempts.map((a) => (a && typeof a === "object" ? { ...a } : a)) }
          : {}),
      },
    }),
  };
  const llmOkAttempt = {
    ok: true,
    reason: "llm_draft_accepted",
    provider: llmResult.finalProvider || llmResult.provider || "unknown",
    finalProvider: llmResult.finalProvider || llmResult.provider || "unknown",
    ...(typeof llmResult.primaryProvider === "string" ? { primaryProvider: llmResult.primaryProvider } : {}),
    ...(typeof llmResult.primaryReason === "string" ? { primaryReason: llmResult.primaryReason } : {}),
    ...(typeof llmResult.fallbackProvider === "string" ? { fallbackProvider: llmResult.fallbackProvider } : {}),
    ...(typeof llmResult.fallbackReason === "string" ? { fallbackReason: llmResult.fallbackReason } : {}),
    ...(Array.isArray(llmResult.fallbackModels) && llmResult.fallbackModels.length
      ? { fallbackModels: [...llmResult.fallbackModels] }
      : {}),
    ...(Array.isArray(llmResult.fallbackAttempts) && llmResult.fallbackAttempts.length
      ? { fallbackAttempts: llmResult.fallbackAttempts.map((a) => (a && typeof a === "object" ? { ...a } : a)) }
      : {}),
    ...(typeof llmResult.llmRetryCount === "number" ? { llmRetryCount: llmResult.llmRetryCount } : {}),
  };
  llmResponse.telemetry.llmAttempt = llmOkAttempt;
  return finalizeTurnResponse(llmResponse, {
    audience: core.audience,
    sessionId: core.sessionId,
    truthPacket: core.truthPacket,
    intent: core.intent,
    utteranceLength: String(core.utteranceStr || "").trim().length,
    generationPath: "llm_grounded",
    llmAttempt: llmOkAttempt,
  });
}

export { buildTruthPacketV1 } from "./truth-packet-v1.js";
export { readContractsSliceForScope, getIntelligenceSignals } from "./contract-reader.js";

export default { runParentCopilotTurn, runParentCopilotTurnAsync };
