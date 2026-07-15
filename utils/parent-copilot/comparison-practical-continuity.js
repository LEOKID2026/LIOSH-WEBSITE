/**
 * After a comparison-style aggregate answer, keep practical follow-ups scoped to the same
 * inferred subject / comparison thread instead of falling back to a generic executive replan.
 */

import { detectAggregateQuestionClass } from "./semantic-question-class.js";
import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { planConversation } from "./conversation-planner.js";
import { composeAnswerDraft } from "./answer-composer.js";
import { compactParentAnswerBlocks } from "./answer-compaction.js";
import { readContractsSliceForScope, subjectLabelHe } from "./contract-reader.js";
import { normalizeParentFacingHe } from "../parent-report-language/parent-facing-normalize-he.js";

/** @param {Array<{ type: string; textHe: string; source: string }>} blocks */
function normalizeAnswerBlocksHe(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((b) => ({
    ...b,
    textHe: normalizeParentFacingHe(String(b?.textHe || "").trim()),
  }));
}

/** Prior aggregate classes that establish a comparison thread. */
const PRIOR_COMPARISON_THREAD = new Set([
  "strongest_subject",
  "weakest_subject",
  "hardest_subject",
  "period_highlight",
  "needs_attention",
  "comparison",
  "most_practice",
  "least_data",
  "most_stable",
  "improved",
  "still_unclear",
  "subject_listing",
]);

/**
 * @param {string} t normalized lower
 */
function scorePracticalFollowupMode(t) {
  let action = 0;
  let advance = 0;
  let strengthen = 0;
  if (
    /מה\s+עושים|מה\s+לעשות|אז\s+מה|מה\s+הלאה|מה\s+עכשיו|בפועל|במעשה|מה\s+זה\s+אומר\s+בפועל|איך\s+זה\s+מתבטא|מה\s+עושים\s+עם\s+זה/.test(t)
  ) {
    action += 2.4;
  }
  if (/ומה\s*עכשיו|ממה\s*עכשיו|אז\s*מה\s*עושים|ומה\s*בבית|ממה\s*בבית|ומה\s*מחר|ממה\s*מחר/u.test(t)) {
    action += 1.85;
  }
  if (/המלצות|הצעד\s+הבא|מה\s+לעשות\s+היום|מה\s+לעשות\s+בשבוע|שבוע\s*הקרוב/.test(t)) action += 1.6;
  if (/להתקדם|לקדם|כדאי\s+לקדם|האם\s+לקדם|מתי\s+לקדם|להעלות\s+רמה|לעלות\s+רמה|קידום|להמשיך\s+לקדם/.test(t)) advance += 2.5;
  if (/להמתין|לעצור|לא\s+לקדם|לחכות/.test(t)) advance += 0.8;
  if (/לחזק|חיזוק|לטפח|לעבוד\s+על|לחזק\s+את|חיזוקים|חיזוק\s+נוסף/.test(t)) strengthen += 2.4;
  return { action, advance, strengthen };
}

/**
 * @param {string} priorClass
 * @param {string} role
 */
function interpretationForComparisonThread(priorClass, role) {
  const p = String(priorClass || "");
  const r = String(role || "");
  if (
    p === "weakest_subject" ||
    p === "needs_attention" ||
    p === "hardest_subject" ||
    r === "weakest" ||
    r === "needs_attention" ||
    r === "hardest"
  ) {
    return "weaknesses";
  }
  if (p === "strongest_subject" || p === "improved" || r === "strongest") return "strengths";
  return "executive";
}

/**
 * @param {{ utteranceStr: string; conv: object; payload: unknown; stageA: object }} ctx
 * @returns {null|{ truthPacket: object; plannerIntent: string; answerBlocks: Array<{ type: string; textHe: string; source: string }>; scopeMeta: object }}
 */
export function tryBuildComparisonPracticalFollowupDraft(ctx) {
  const utteranceStr = String(ctx.utteranceStr || "").trim();
  const conv = ctx.conv || {};
  const payload = ctx.payload;
  const stageA = ctx.stageA || {};
  const prior = String(conv.lastAnswerAggregateClass || "").trim();
  if (!prior || !PRIOR_COMPARISON_THREAD.has(prior)) return null;

  const t = utteranceStr
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const aggQ = detectAggregateQuestionClass(utteranceStr);
  const scores = scorePracticalFollowupMode(t);
  let mode = /** @type {null|"action"|"advance"|"strengthen"} */ (null);
  if (aggQ === "recommendation_action") mode = "action";
  else if (aggQ === "advance_or_hold_question") mode = "advance";
  else {
    const best = Math.max(scores.action, scores.advance, scores.strengthen);
    if (best < 1.65) return null;
    if (best === scores.action && scores.action >= scores.advance && scores.action >= scores.strengthen) mode = "action";
    else if (best === scores.advance && scores.advance >= scores.strengthen) mode = "advance";
    else mode = "strengthen";
  }

  const sid = String(conv.lastComparisonSubjectId || "").trim();
  const role = String(conv.lastComparisonRole || "").trim();
  const interp = interpretationForComparisonThread(prior, role);

  const canon = String(stageA.canonicalIntent || "what_to_do_today").trim() || "what_to_do_today";
  let scope;
  if (sid && readContractsSliceForScope("subject", sid, sid, payload)) {
    scope = {
      scopeType: /** @type {const} */ ("subject"),
      scopeId: sid,
      scopeLabel: subjectLabelHe(sid),
      interpretationScope: interp,
      scopeClass: interp,
      canonicalIntent: canon,
    };
  } else {
    scope = {
      scopeType: /** @type {const} */ ("executive"),
      scopeId: "executive",
      scopeLabel: "הדוח בתקופה הנבחרה",
      interpretationScope: "executive",
      scopeClass: "executive",
      canonicalIntent: canon,
    };
  }

  const truthPacket = buildTruthPacketV1(payload, scope);
  if (!truthPacket) return null;

  let plannerIntent = "what_to_do_today";
  if (mode === "advance") plannerIntent = "why_not_advance";
  else if (mode === "strengthen") plannerIntent = "what_is_still_difficult";
  else if (mode === "action") {
    plannerIntent = /השבוע|שבוע\s*הקרוב|בשבוע/.test(t) ? "what_to_do_this_week" : "what_to_do_today";
  }

  const turnOrd = Array.isArray(conv.priorIntents) ? conv.priorIntents.length : 0;
  const plan = planConversation(plannerIntent, truthPacket, {
    continuityRepeat: false,
    turnOrdinal: turnOrd,
    scopeType: truthPacket.scopeType,
    interpretationScope: truthPacket.interpretationScope,
  });
  const composed = composeAnswerDraft(plan, truthPacket, {
    intent: plannerIntent,
    continuityRepeat: false,
    conversationState: conv,
    turnOrdinal: turnOrd,
  });
  let answerBlocks = compactParentAnswerBlocks(normalizeAnswerBlocksHe(composed.answerBlocks), {
    scopeType: String(truthPacket.scopeType || ""),
    maxBlocks: 5,
    maxTotalChars: 2400,
  });

  const label = sid ? subjectLabelHe(sid) : "";
  const hook = label
    ? `ממשיכים מההשוואה שהוצגה - במיוחד סביב ${label}: `
    : "ממשיכים מההשוואה על התקופה: ";
  const oix = answerBlocks.findIndex((b) => b.type === "observation" && String(b.textHe || "").trim());
  if (oix >= 0 && !String(answerBlocks[oix].textHe || "").includes("ממשיכים מההשוואה")) {
    answerBlocks[oix] = {
      ...answerBlocks[oix],
      textHe: `${hook}${String(answerBlocks[oix].textHe || "").trim()}`,
      source: "composed",
    };
  }

  const scopeMeta = {
    scopeConfidence: 0.9,
    scopeReason: "comparison_practical_continuity",
    intentConfidence: Number(stageA.canonicalIntentScore) || 0.75,
    intentReason: "comparison_practical_continuity",
  };

  return { truthPacket, plannerIntent, answerBlocks, scopeMeta };
}

export default { tryBuildComparisonPracticalFollowupDraft };
