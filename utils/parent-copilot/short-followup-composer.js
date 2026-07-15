/**
 * Continuation turns: classify short parent replies by behavior class, then compose from last scope + contracts (no full replan).
 */

import { buildTruthPacketV1 } from "./truth-packet-v1.js";
import { classifyShortParentReplyClassHe } from "./conversational-reply-class-he.js";
import { planConversation } from "./conversation-planner.js";
import { composeAnswerDraft } from "./answer-composer.js";
import { compactParentAnswerBlocks } from "./answer-compaction.js";
import { normalizeParentFacingHe } from "../parent-report-language/parent-facing-normalize-he.js";
import { foldUtteranceForHeMatch } from "./utterance-normalize-he.js";

/** Full new report questions must not be treated as short reply-class continuations. */
const EXPLICIT_NEW_REPORT_QUESTION_RE =
  /תסביר\s+לי\s+מה\s+חשוב|מה\s+חשוב\s+כאן|מה\s+לגבי|מה\s+המקצוע\s+החזק|מה\s+הטעויות|מה\s+הטעיות|מה\s+הבעיה|מה\s+לעשות\s+בבית|תסביר\s+לי\s+על\s+הדוח|מה\s+הדוח\s+אומר/u;

/**
 * @param {string} family
 * @returns {string|null}
 */
function plannerIntentForAcceptedFollowupFamily(family) {
  const f = String(family || "").trim();
  if (f === "avoid_now") return "what_not_to_do_now";
  if (f === "advance_or_hold") return "why_not_advance";
  if (f === "explain_to_child") return "how_to_tell_child";
  if (f === "ask_teacher") return "question_for_teacher";
  if (f === "uncertainty_boundary") return "clarify_term";
  return null;
}

/**
 * @param {string} family
 * @param {object} truthPacket
 */
function acceptanceHookHe(family, truthPacket) {
  const f = String(family || "").trim();
  const base =
    f === "avoid_now"
      ? "מה כדאי להימנע ממנו בשבוע הקרוב"
      : f === "advance_or_hold"
        ? "מתי כדאי לקדם ומתי לעצור"
        : f === "explain_to_child"
          ? "ניסוח קצר להסבר לילד"
          : f === "ask_teacher"
            ? "שאלה ממוקדת למורה"
            : f === "uncertainty_boundary"
              ? "מה עדיין לא ברור לפי הדוח"
              : "ההמשך שהוצע";
  const scopeTail =
    String(truthPacket.scopeType || "") === "subject" && String(truthPacket.scopeLabel || "").trim()
      ? ` (במסגרת ${String(truthPacket.scopeLabel).trim()})`
      : "";
  return `ממשיכים לפי ההצעה שבחרתם - ${base}${scopeTail}: `;
}

/**
 * @param {object} conv
 */
function lastPlannerIntentFromConv(conv) {
  const lp = String(conv.lastPlannerIntent || "").trim();
  if (lp) return lp;
  const pi = Array.isArray(conv.priorIntents) ? conv.priorIntents : [];
  return pi.length ? String(pi[pi.length - 1] || "").trim() : "";
}

/**
 * @param {object} conv
 */
function priorTurnWasStrengthSide(conv) {
  const k = lastPlannerIntentFromConv(conv);
  return k === "what_is_going_well" || k === "strength_vs_weakness_summary" || k === "what_is_most_important";
}

/**
 * @param {object} conv
 */
function priorTurnWasDifficultySide(conv) {
  const k = lastPlannerIntentFromConv(conv);
  return (
    k === "what_is_still_difficult" ||
    k === "what_not_to_do_now" ||
    k === "why_not_advance" ||
    k === "is_intervention_needed"
  );
}

/**
 * @param {string} plannerIntent
 * @param {object} truthPacket
 * @param {object} conv
 */
function composeBlocksForPlannerIntent(plannerIntent, truthPacket, conv) {
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
  return compactParentAnswerBlocks(
    (composed.answerBlocks || []).map((b) => ({
      ...b,
      textHe: normalizeParentFacingHe(String(b.textHe || "").trim()),
    })),
    { scopeType: String(truthPacket.scopeType || ""), maxBlocks: 5, maxTotalChars: 2400 },
  );
}

/**
 * @param {{ utteranceStr: string; conv: object; payload: unknown }} ctx
 * @returns {null|{ truthPacket: object; plannerIntent: string; answerBlocks: Array<{ type: string; textHe: string; source: string }>; scopeMeta: object; replyClass: string }}
 */
export function tryBuildParentShortFollowupDraft(ctx) {
  const utteranceStr = String(ctx.utteranceStr || "").trim();
  const conv = ctx.conv || {};
  const payload = ctx.payload;

  const folded = foldUtteranceForHeMatch(utteranceStr);
  if (EXPLICIT_NEW_REPORT_QUESTION_RE.test(folded)) return null;
  if (utteranceStr.length > 52) return null;

  const replyClass = classifyShortParentReplyClassHe(utteranceStr, { conv });
  if (!replyClass) return null;

  const fam = String(conv.lastOfferedFollowupFamily || "").trim();
  const scopes = Array.isArray(conv.priorScopes) ? conv.priorScopes : [];
  const scopeKey = scopes.length ? String(scopes[scopes.length - 1] || "").trim() : "";
  if (!scopeKey) return null;
  const chipOptional =
    replyClass === "contrast_follow_negative" ||
    replyClass === "contrast_follow_positive" ||
    replyClass === "vague_summary_follow" ||
    replyClass === "short_action_follow";
  if (!fam && !chipOptional) return null;
  const colon = scopeKey.indexOf(":");
  if (colon < 1) return null;
  const scopeType = scopeKey.slice(0, colon);
  const scopeId = scopeKey.slice(colon + 1);
  if (!scopeType || !scopeId) return null;

  const scopeLabel =
    String(conv.lastScopeLabelHe || "").trim() || (scopeType === "executive" ? "הדוח בתקופה הנבחרה" : "נושא");

  const scope = {
    scopeType,
    scopeId,
    scopeLabel,
    interpretationScope: "executive",
    scopeClass: "executive",
    canonicalIntent: String(conv.lastPlannerIntent || "unclear").trim() || "unclear",
  };

  const truthPacket = buildTruthPacketV1(payload, scope);
  if (!truthPacket) return null;

  const slots =
    truthPacket.contracts?.narrative?.textSlots && typeof truthPacket.contracts.narrative.textSlots === "object"
      ? truthPacket.contracts.narrative.textSlots
      : {};
  const obs = String(slots.observation || "").trim();
  const interp = String(slots.interpretation || "").trim();
  const act = String(slots.action || "").trim();
  const dl = truthPacket.derivedLimits || {};

  let plannerIntent = String(conv.lastPlannerIntent || "unclear").trim() || "unclear";

  /** @type {Array<{ type: string; textHe: string; source: string }>} */
  let answerBlocks = [];

  switch (replyClass) {
    case "affirmation_continue":
      if (fam === "action_today" || fam === "action_week") {
        plannerIntent = fam === "action_week" ? "what_to_do_this_week" : "what_to_do_today";
        if (!dl.recommendationEligible || String(dl.recommendationIntensityCap || "RI0") === "RI0") {
          answerBlocks = [
            {
              type: "observation",
              textHe:
                "לפי מה שבדוח כרגע - אין עדיין בסיס חזק מספיק לצעד גדול; עדיף צעד זעיר מאוד אחרי עוד תרגול, או המתנה קצרה.",
              source: "composed",
            },
            { type: "meaning", textHe: interp ? interp.slice(0, 420) : obs.slice(0, 420), source: "composed" },
          ];
        } else {
          answerBlocks = [
            {
              type: "observation",
              textHe: "מצוין - מתחילים בצעד קטן שמתאים למה שמופיע בדוח, בלי להרחיב מעבר לניסוח הזה.",
              source: "composed",
            },
          ];
          if (act) answerBlocks.push({ type: "next_step", textHe: act.slice(0, 420), source: "composed" });
          else answerBlocks.push({ type: "meaning", textHe: interp.slice(0, 420), source: "composed" });
        }
      } else {
        const mapped = plannerIntentForAcceptedFollowupFamily(fam);
        if (mapped) {
          plannerIntent = mapped;
          const turnOrd = Array.isArray(conv.priorIntents) ? conv.priorIntents.length : 0;
          const plan = planConversation(mapped, truthPacket, {
            continuityRepeat: false,
            turnOrdinal: turnOrd,
            scopeType: truthPacket.scopeType,
            interpretationScope: truthPacket.interpretationScope,
          });
          const composed = composeAnswerDraft(plan, truthPacket, {
            intent: mapped,
            continuityRepeat: false,
            conversationState: conv,
            turnOrdinal: turnOrd,
          });
          answerBlocks = compactParentAnswerBlocks(
            (composed.answerBlocks || []).map((b) => ({
              ...b,
              textHe: normalizeParentFacingHe(String(b.textHe || "").trim()),
            })),
            { scopeType: String(truthPacket.scopeType || ""), maxBlocks: 5, maxTotalChars: 2400 },
          );
          const hook = acceptanceHookHe(fam, truthPacket);
          const oix = answerBlocks.findIndex((b) => b.type === "observation" && String(b.textHe || "").trim());
          if (oix >= 0 && hook && !String(answerBlocks[oix].textHe || "").includes("מבצעים את ההמשך")) {
            answerBlocks[oix] = {
              ...answerBlocks[oix],
              textHe: `${hook}${String(answerBlocks[oix].textHe || "").trim()}`,
              source: "composed",
            };
          }
        } else {
          answerBlocks = [
            {
              type: "observation",
              textHe: "מובן - נשארים עם אותו ניסוח מהדוח ומתקדמים בצעד קטן הבא כשמתאים.",
              source: "composed",
            },
            { type: "meaning", textHe: interp ? interp.slice(0, 420) : obs.slice(0, 420), source: "composed" },
          ];
        }
      }
      break;

    case "rejection_not_now":
      answerBlocks = [
        {
          type: "observation",
          textHe: "בסדר - לא חייבים לקדם עכשיו. נשארים עם מה שהדוח מציג, בלי לחץ להחלטה מיידית.",
          source: "composed",
        },
        { type: "meaning", textHe: interp ? interp.slice(0, 420) : obs.slice(0, 420), source: "composed" },
      ];
      break;

    case "concern_reaction":
      plannerIntent = "is_intervention_needed";
      answerBlocks = [
        {
          type: "observation",
          textHe:
            dl.cannotConcludeYet || dl.confidenceBand === "low"
              ? "זה לא בהכרח \"לא טוב\" - זה בעיקר סימן שהדוח עדיין לא סוגר מספיק כדי לתייג מצב בצורה חדה."
              : "לפי מה שמופיע בדוח, אין כאן אות ל\"לא טוב\" גורף - עדיין מדובר בתמונה בתוך התקופה.",
          source: "composed",
        },
        { type: "meaning", textHe: interp ? interp.slice(0, 420) : obs.slice(0, 420), source: "composed" },
      ];
      break;

    case "confusion_simpler":
      plannerIntent = "clarify_term";
      answerBlocks = [
        {
          type: "observation",
          textHe: obs ? `במילים פשוטות: ${obs.slice(0, 420)}` : "אין כאן פסקה ארוכה להרחבה - אפשר לנסח במילה אחרת מה בדיוק לא ברור.",
          source: "composed",
        },
      ];
      if (interp) answerBlocks.push({ type: "meaning", textHe: interp.slice(0, 380), source: "composed" });
      break;

    case "clarify_previous": {
      plannerIntent = "clarify_term";
      const digest = String(conv.lastAssistantAnswerDigestHe || "").trim();
      const scopeBit = scopeLabel ? `בהקשר של ${scopeLabel}` : "באותו הקשר";
      const tail = digest ? ` סיכום קצר של מה שהוצג: ${digest.slice(0, 220)}${digest.length > 220 ? "…" : ""}` : "";
      answerBlocks = [
        {
          type: "observation",
          textHe: `נשארים על אותו ניסוח מהדוח ${scopeBit}, בלי להוסיף עובדה חדשה מעבר למה שכבר מופיע בדוח.${tail}`,
          source: "composed",
        },
      ];
      if (interp) answerBlocks.push({ type: "meaning", textHe: interp.slice(0, 380), source: "composed" });
      break;
    }

    case "brief_continue":
      answerBlocks = [
        {
          type: "observation",
          textHe: obs
            ? `ממשיכים מאותה נקודה של הדוח - נשארים באותה תמונה בלי להוסיף נושא חדש: ${obs.slice(0, 360)}`
            : "ממשיכים מאותה נקודה של הדוח - נשארים באותה תמונה בלי להוסיף נושא חדש מעבר למה שכבר הוצג.",
          source: "composed",
        },
      ];
      if (interp) answerBlocks.push({ type: "meaning", textHe: interp.slice(0, 400), source: "composed" });
      break;

    case "contrast_follow_negative": {
      if (!priorTurnWasStrengthSide(conv)) return null;
      plannerIntent = "what_is_still_difficult";
      answerBlocks = composeBlocksForPlannerIntent(plannerIntent, truthPacket, conv);
      break;
    }

    case "contrast_follow_positive": {
      if (!priorTurnWasDifficultySide(conv)) return null;
      plannerIntent = "what_is_going_well";
      answerBlocks = composeBlocksForPlannerIntent(plannerIntent, truthPacket, conv);
      break;
    }

    case "vague_summary_follow": {
      plannerIntent = "explain_report";
      answerBlocks = composeBlocksForPlannerIntent(plannerIntent, truthPacket, conv);
      break;
    }

    case "short_action_follow": {
      const recOk = !!dl.recommendationEligible && String(dl.recommendationIntensityCap || "RI0") !== "RI0";
      const lastFam = String(fam || "").trim();
      const lastP = lastPlannerIntentFromConv(conv);
      const wantsWeek = /מחר|השבוע|שבוע/u.test(utteranceStr);
      const priorActs = Array.isArray(conv.priorIntents)
        ? conv.priorIntents.slice(-4).filter((x) => x === "what_to_do_today" || x === "what_to_do_this_week")
        : [];
      const hadActionContext =
        lastFam === "action_today" ||
        lastFam === "action_week" ||
        lastP === "what_to_do_today" ||
        lastP === "what_to_do_this_week" ||
        priorActs.length > 0;
      if (!recOk || !hadActionContext) {
        plannerIntent = "explain_report";
      } else if (lastFam === "action_week" || lastP === "what_to_do_this_week" || wantsWeek) {
        plannerIntent = "what_to_do_this_week";
      } else if (lastFam === "action_today" || lastP === "what_to_do_today") {
        plannerIntent = "what_to_do_today";
      } else {
        plannerIntent = wantsWeek ? "what_to_do_this_week" : "what_to_do_today";
      }
      answerBlocks = composeBlocksForPlannerIntent(plannerIntent, truthPacket, conv);
      break;
    }

    default:
      return null;
  }

  answerBlocks = answerBlocks.filter((b) => String(b.textHe || "").trim().length > 1);
  if (answerBlocks.length < 2) {
    const fill = interp || obs;
    if (fill) answerBlocks.push({ type: "meaning", textHe: fill.slice(0, 400), source: "composed" });
  }
  if (answerBlocks.length < 2) return null;

  const scopeMeta = {
    scopeConfidence: 0.88,
    scopeReason: "reply_class_continuity",
    intentConfidence: 0.75,
    intentReason: `reply_class:${replyClass}`,
  };

  return { truthPacket, plannerIntent, answerBlocks, scopeMeta, replyClass };
}

export default { tryBuildParentShortFollowupDraft };
