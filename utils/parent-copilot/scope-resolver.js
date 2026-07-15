/**
 * Resolves conversational scope from payload + optional UI context + utterance (deterministic).
 * Does not build TruthPacketV1 (truth-packet-v1.js owns that).
 */

import {
  findFirstAnchoredTopicRowForSubject,
  findTopicRowByKey,
  listCopilotAnchoredTopicRows,
  subjectLabelHe,
  SUBJECT_ORDER,
} from "./contract-reader.js";
import { detectAggregateQuestionClass, EXECUTIVE_AGGREGATE_SCOPE_CLASSES } from "./semantic-question-class.js";
import { foldUtteranceForHeMatch, normalizeFreeformParentUtteranceHe } from "./utterance-normalize-he.js";
import { interpretFreeformStageA } from "./stage-a-freeform-interpretation.js";
import { resolveReportRowFromUtterance, utteranceNamesTopicRow } from "./report-row-resolver.js";
import {
  classifySubjectEvidenceTier,
  SUBJECT_EVIDENCE_TIER,
  zeroEvidenceSubjectCopilotHe,
} from "../parent-report-language/subject-evidence-policy.js";
import { tryResolveInheritedScope } from "./conversation-scope-inheritance.js";
import { tryResolveHistoryLockedScope } from "./history-scope-resolver.js";

/**
 * @param {string} s
 */
function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @param {unknown} payload
 * @param {string} subjectId
 */
function subjectQuestionCountFromPayload(payload, subjectId) {
  const sp = (Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : []).find(
    (p) => String(p?.subject || "") === subjectId,
  );
  const explicit = Math.max(0, Number(sp?.subjectQuestionCount ?? sp?.questionCount) || 0);
  if (explicit > 0) return explicit;
  const topics = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
  let sum = 0;
  for (const tr of topics) {
    sum += Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
  }
  if (sum > 0) return sum;
  for (const row of Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : []) {
    sum += Math.max(0, Number(row?.questions) || 0);
  }
  if (sum > 0) return sum;
  if (subjectId === "history") {
    const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
    return Math.max(0, Number(summary.historyQuestions) || 0);
  }
  return sum;
}

/**
 * @param {string} subjectId
 * @param {unknown} payload
 * @param {unknown} stageA
 * @param {string} reason
 * @param {number} [confidence]
 */
function resolveSubjectScopeOrZeroEvidence(subjectId, payload, stageA, reason, confidence = 0.73) {
  if (classifySubjectEvidenceTier(subjectQuestionCountFromPayload(payload, subjectId)) === SUBJECT_EVIDENCE_TIER.none) {
    return {
      resolutionStatus: "clarification_required",
      clarificationQuestionHe: zeroEvidenceSubjectCopilotHe(subjectLabelHe(subjectId)),
      scopeConfidence: 0,
      scopeReason: "subject_zero_evidence_in_period",
      stageA,
    };
  }
  return {
    resolutionStatus: "resolved",
    scope: attachScopeInterpretation(
      {
        scopeType: "subject",
        scopeId: subjectId,
        scopeLabel: subjectLabelHe(subjectId),
      },
      stageA,
    ),
    scopeConfidence: confidence,
    scopeReason: reason,
    stageA,
  };
}

/**
 * Collect topic rows with parent-visible display names (deterministic order).
 * @param {unknown} payload
 * @returns {Array<{ subjectId: string; topicRowKey: string; displayName: string }>}
 */
function listTopicDisplayIndex(payload) {
  /** @type {Array<{ subjectId: string; topicRowKey: string; displayName: string }>} */
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [String(sp?.subject || ""), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const displayName = norm(tr?.displayName);
      const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
      const nar = tr?.contractsV1?.narrative;
      const anchored = !!(nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim());
      if (!topicRowKey || displayName.length < 2 || !anchored) continue;
      out.push({ subjectId: sid, topicRowKey, displayName });
    }
  }
  return out;
}

/**
 * @param {string} utterance
 * @param {unknown} payload
 * @returns {{
 *   best: { subjectId: string; topicRowKey: string; displayName: string; score: number } | null;
 *   ambiguous: boolean;
 *   candidates: Array<{ subjectId: string; topicRowKey: string; displayName: string; score: number }>;
 * }}
 */
function matchTopicFromUtterance(utterance, payload) {
  const u = foldUtteranceForHeMatch(utterance);
  if (u.length < 2) return { best: null, ambiguous: false, candidates: [] };
  const rows = listTopicDisplayIndex(payload);
  /** @type {Array<{ subjectId: string; topicRowKey: string; displayName: string; score: number }>} */
  const hits = [];
  for (const row of rows) {
    const d = foldUtteranceForHeMatch(row.displayName);
    if (d.length < 2) continue;
    if (!u.includes(d)) continue;
    hits.push({ ...row, score: d.length });
  }
  if (!hits.length) return { best: null, ambiguous: false, candidates: [] };
  hits.sort((a, b) => b.score - a.score || SUBJECT_ORDER.indexOf(a.subjectId) - SUBJECT_ORDER.indexOf(b.subjectId));
  const best = hits[0] || null;
  const second = hits[1] || null;
  const ambiguous = !!(
    best &&
    second &&
    (best.score - second.score <= 2 || best.displayName.startsWith(second.displayName) || second.displayName.startsWith(best.displayName))
  );
  return { best, ambiguous, candidates: hits.slice(0, 3) };
}

/**
 * Match subject by approved Hebrew labels (longer labels first to reduce ambiguity).
 * @param {string} utterance
 * @param {unknown} payload
 * @returns {string | null} subjectId
 */
function matchSubjectFromUtterance(utterance, payload) {
  const u = foldUtteranceForHeMatch(utterance);
  if (u.length < 2) return null;
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const present = new Set(profiles.map((p) => String(p?.subject || "")).filter(Boolean));

  /** @type {Array<{ id: string; label: string }>} */
  const pairs = [];
  for (const sid of SUBJECT_ORDER) {
    if (!present.has(sid)) continue;
    const label = norm(subjectLabelHe(sid));
    if (label.length < 2) continue;
    pairs.push({ id: sid, label });
  }
  pairs.sort((a, b) => b.label.length - a.label.length);
  for (const { id, label } of pairs) {
    const lf = foldUtteranceForHeMatch(label);
    if (lf.length >= 4) {
      if (u.includes(lf)) return id;
    } else if (lf.length >= 2) {
      if (u === lf || u.startsWith(`${lf} `) || u.endsWith(` ${lf}`) || u.includes(` ${lf} `)) {
        return id;
      }
    }
  }
  return null;
}

/** Interpretation framing (Stage B) — distinct from entity scopeType. */
const INTERPRETATION_SCOPES = new Set([
  "recommendation",
  "confidence_uncertainty",
  "strengths",
  "weaknesses",
  "blocked_advance",
  "executive",
]);

/**
 * @param {ReturnType<typeof interpretFreeformStageA>} stageA
 * @returns {"recommendation"|"confidence_uncertainty"|"strengths"|"weaknesses"|"blocked_advance"|"executive"}
 */
function resolveInterpretationScope(stageA) {
  const sc = String(stageA?.scopeClass || "executive").trim();
  if (INTERPRETATION_SCOPES.has(sc)) return /** @type {any} */ (sc);
  return "executive";
}

/**
 * @param {object} scope
 * @param {ReturnType<typeof interpretFreeformStageA>} stageA
 */
function attachScopeInterpretation(scope, stageA) {
  const interpretationScope = resolveInterpretationScope(stageA);
  return {
    ...scope,
    interpretationScope,
    /** @deprecated prefer interpretationScope; kept for truth-packet fallbacks */
    scopeClass: interpretationScope,
  };
}

/**
 * @param {object} input
 * @param {unknown} input.payload
 * @param {string} input.utterance
 * @param {null|{ scopeType?: string; scopeId?: string; subjectId?: string }} input.selectedContextRef
 * @param {ReturnType<typeof interpretFreeformStageA>} [input.stageA]
 * @param {object} [input.conversationState]
 * @returns {{
 *   resolutionStatus: "resolved"|"clarification_required";
 *   clarificationQuestionHe?: string;
 *   scope?: {
 *     scopeType: "topic"|"subject"|"executive";
 *     scopeId: string;
 *     scopeLabel: string;
 *     interpretationScope: "recommendation"|"confidence_uncertainty"|"strengths"|"weaknesses"|"blocked_advance"|"executive";
 *     scopeClass: string;
 *   };
 *   stageA?: ReturnType<typeof interpretFreeformStageA>;
 * }}
 */
export function resolveScope(input) {
  const payload = input?.payload;
  const rawUtterance = String(input?.utterance || "");
  const normalizedUtterance = normalizeFreeformParentUtteranceHe(rawUtterance);
  const stageA =
    input?.stageA ||
    interpretFreeformStageA(rawUtterance, payload && typeof payload === "object" ? payload : null);
  const utterance = foldUtteranceForHeMatch(normalizedUtterance);
  const selected = input?.selectedContextRef && typeof input.selectedContextRef === "object" ? input.selectedContextRef : null;

  if (!payload || typeof payload !== "object") {
    return {
      resolutionStatus: "clarification_required",
      clarificationQuestionHe:
        "לא נטען דוח מקיף - לא ניתן לענות מתוך נתוני התקופה. רעננו את הדף או בחרו תקופה אחרת.",
      scopeConfidence: 0,
      scopeReason: "missing_payload",
      stageA,
    };
  }

  const canonIntent = String(stageA?.canonicalIntent || "").trim();
  if (canonIntent === "clinical_boundary" || canonIntent === "sensitive_education_choice") {
    return {
      resolutionStatus: "resolved",
      scope: attachScopeInterpretation(
        {
          scopeType: "executive",
          scopeId: "executive",
          scopeLabel: "הדוח בתקופה הנבחרה",
        },
        stageA,
      ),
      scopeConfidence: 0.96,
      scopeReason: `canonical_intent_boundary:${canonIntent}`,
      stageA,
    };
  }

  const aggregateClass = detectAggregateQuestionClass(normalizedUtterance);
  const historyLockedScope = tryResolveHistoryLockedScope({
    payload,
    utterance: normalizedUtterance || rawUtterance,
    stageA,
    attachScopeInterpretation,
    resolveSubjectScopeOrZeroEvidence,
  });
  if (historyLockedScope) return historyLockedScope;

  const rowResPre = resolveReportRowFromUtterance(normalizedUtterance || rawUtterance, payload);
  const foldedPre = foldUtteranceForHeMatch(normalizedUtterance);
  const topicNamedInAggregateQuestion =
    rowResPre.best && utteranceNamesTopicRow(foldedPre, rowResPre.best);

  if (
    aggregateClass !== "none" &&
    (EXECUTIVE_AGGREGATE_SCOPE_CLASSES.has(aggregateClass) || !topicNamedInAggregateQuestion)
  ) {
    /** Next-step / advance-hold questions on a single anchored topic row bind to that topic's contracts. */
    if (aggregateClass === "recommendation_action" || aggregateClass === "advance_or_hold_question") {
      const anchors = listCopilotAnchoredTopicRows(payload);
      if (anchors.length === 1) {
        const tr = anchors[0].tr;
        const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
        const displayName = norm(tr?.displayName) || "נושא";
        if (topicRowKey) {
          return {
            resolutionStatus: "resolved",
            scope: attachScopeInterpretation(
              {
                scopeType: "topic",
                scopeId: topicRowKey,
                scopeLabel: displayName,
              },
              stageA,
            ),
            scopeConfidence: 0.97,
            scopeReason:
              aggregateClass === "advance_or_hold_question"
                ? "aggregate_class:advance_or_hold_question_single_anchor"
                : "aggregate_class:recommendation_action_single_anchor",
            stageA,
          };
        }
      }
    }
    return {
      resolutionStatus: "resolved",
      scope: attachScopeInterpretation(
        {
          scopeType: "executive",
          scopeId: "executive",
          scopeLabel: "הדוח בתקופה הנבחרה",
        },
        stageA,
      ),
      scopeConfidence: 0.98,
      scopeReason: `aggregate_class:${aggregateClass}`,
      stageA,
    };
  }

  const st = String(selected?.scopeType || "").trim();
  const sid = String(selected?.scopeId || "").trim();
  const subj = String(selected?.subjectId || "").trim();

  if (st === "topic" && sid) {
    const hit = findTopicRowByKey(payload, sid, subj);
    if (!hit) {
      return {
        resolutionStatus: "clarification_required",
        clarificationQuestionHe: "בנושא הזה עדיין אין מספיק תרגול שמופיע בדוח - כדאי לבחור נושא שכבר יש בו תרגול.",
        scopeConfidence: 0.2,
        scopeReason: "selected_context_topic_missing_anchor",
        stageA,
      };
    }
    const label =
      String(hit?.tr?.displayName || "").trim() ||
      (subj ? `${subjectLabelHe(subj)} · נושא` : "נושא נבחר");
    return {
      resolutionStatus: "resolved",
      scope: attachScopeInterpretation(
        {
          scopeType: "topic",
          scopeId: sid,
          scopeLabel: label,
        },
        stageA,
      ),
      scopeConfidence: hit ? 0.99 : 0.35,
      scopeReason: hit ? "selected_context_topic" : "selected_context_topic_missing_anchor",
      stageA,
    };
  }
  if (st === "subject" && (sid || subj)) {
    const subjectId = sid || subj;
    const subjectHasAnchor = !!findFirstAnchoredTopicRowForSubject(payload, subjectId);
    if (!subjectHasAnchor) {
      return {
        resolutionStatus: "clarification_required",
        clarificationQuestionHe: "במקצוע הזה אין עדיין נושא עם מספיק תרגול כדי לדבר עליו - אפשר לנסות מקצוע אחר.",
        scopeConfidence: 0.24,
        scopeReason: "selected_context_subject_missing_anchor",
        stageA,
      };
    }
    return resolveSubjectScopeOrZeroEvidence(subjectId, payload, stageA, "selected_context_subject", 0.9);
  }

  const rowRes = resolveReportRowFromUtterance(normalizedUtterance || rawUtterance, payload);
  if (rowRes.ambiguous && rowRes.candidates.length >= 2) {
    const names = rowRes.candidates
      .slice(0, 3)
      .map((r) => r.displayName)
      .filter(Boolean)
      .join(" או ");
    return {
      resolutionStatus: "clarification_required",
      clarificationQuestionHe: names
        ? `יש כמה נושאים דומים בדוח - על איזה מהם לענות: ${names}?`
        : "יש כאן יותר מנושא אחד - על איזה נושא לענות?",
      scopeConfidence: 0.25,
      scopeReason: "utterance_topic_ambiguous",
      stageA,
    };
  }
  if (rowRes.best?.topicRowKey) {
    const gradeSplitTopicRowKeys =
      Array.isArray(rowRes.gradeSplitTopicRows) && rowRes.gradeSplitTopicRows.length >= 2
        ? rowRes.gradeSplitTopicRows.map((r) => String(r.topicRowKey || "").trim()).filter(Boolean)
        : [];
    return {
      resolutionStatus: "resolved",
      scope: attachScopeInterpretation(
        {
          scopeType: "topic",
          scopeId: rowRes.best.topicRowKey,
          scopeLabel: rowRes.best.displayName,
          ...(gradeSplitTopicRowKeys.length >= 2 ? { gradeSplitTopicRowKeys } : {}),
        },
        stageA,
      ),
      scopeConfidence: 0.88,
      scopeReason:
        gradeSplitTopicRowKeys.length >= 2 ? "report_row_topic_match_grade_split" : "report_row_topic_match",
      stageA,
    };
  }
  if (rowRes.subjectId && !rowRes.best) {
    return resolveSubjectScopeOrZeroEvidence(
      rowRes.subjectId,
      payload,
      stageA,
      "report_row_subject_match",
      0.8,
    );
  }

  const topicMatch = matchTopicFromUtterance(utterance, payload);
  if (topicMatch.ambiguous) {
    return {
      resolutionStatus: "clarification_required",
      clarificationQuestionHe: "יש כאן יותר מנושא אחד - על איזה נושא לענות?",
      scopeConfidence: 0.25,
      scopeReason: "utterance_topic_ambiguous",
      stageA,
    };
  }
  if (topicMatch.best) {
    return {
      resolutionStatus: "resolved",
      scope: attachScopeInterpretation(
        {
          scopeType: "topic",
          scopeId: topicMatch.best.topicRowKey,
          scopeLabel: topicMatch.best.displayName,
        },
        stageA,
      ),
      scopeConfidence: 0.84,
      scopeReason: "utterance_topic_match",
      stageA,
    };
  }

  const subjectId = matchSubjectFromUtterance(utterance, payload);
  if (subjectId) {
    return resolveSubjectScopeOrZeroEvidence(subjectId, payload, stageA, "utterance_subject_match", 0.73);
  }

  const inherited = tryResolveInheritedScope({
    utterance: normalizedUtterance || rawUtterance,
    payload,
    conversationState: input?.conversationState,
    stageA,
  });
  if (inherited?.resolutionStatus === "resolved" && inherited.scope) {
    return {
      ...inherited,
      scope: attachScopeInterpretation(inherited.scope, stageA),
    };
  }

  /**
   * After explicit topic/subject anchors: require at least one anchored row for any answer.
   * Clarification for missing data stays before broad-executive defaults.
   */
  const copilotAnchors = listCopilotAnchoredTopicRows(payload);
  if (!copilotAnchors.length) {
    return {
      resolutionStatus: "clarification_required",
      clarificationQuestionHe:
        "בדוח אין כרגע מספיק שאלות מעוגנות כדי לענות בצורה מדויקת - הנתונים עדיין מצומצמים ומוקדם לכיוון ברור. כדאי לצבור עוד קצת תרגול בטווח התאריכים (למשל 5–8 שאלות ממוקדות בשבוע), ואז לנסות שוב.",
      scopeConfidence: 0,
      scopeReason: "no_anchor_available",
      stageA,
    };
  }

  /**
   * Broad report-as-a-whole (Stage A + payload anchor): default entity scope to executive.
   * Order: selected context → explicit topic → explicit subject → this path → clarification only when above failed and no anchor.
   */
  const executiveScope = () =>
    attachScopeInterpretation(
      {
        scopeType: "executive",
        scopeId: "executive",
        scopeLabel: "הדוח בתקופה הנבחרה",
      },
      stageA,
    );

  if (stageA.shouldClarifyIntent) {
    return {
      resolutionStatus: "resolved",
      scope: executiveScope(),
      scopeConfidence: 0.58,
      scopeReason: "stage_a_intent_tie_executive_default",
      stageA,
    };
  }

  // Preserve deterministic continuity for empty input when payload is anchored.
  if (utterance.length < 2) {
    return {
      resolutionStatus: "resolved",
      scope: executiveScope(),
      scopeConfidence: 0.56,
      scopeReason: "executive_fallback_empty_utterance",
      stageA,
    };
  }

  return {
    resolutionStatus: "resolved",
    scope: executiveScope(),
    scopeConfidence: 0.61,
    scopeReason: "broad_report_executive_fallback",
    stageA,
  };
}

export default { resolveScope };
