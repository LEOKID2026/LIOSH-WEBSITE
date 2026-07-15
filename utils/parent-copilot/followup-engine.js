/**
 * Phase B: scored follow-up ranking + Phase A memory consumption (dedup, scope, clicks).
 * Polish: value gate, overlap vs answer / last-2 suggestions, 2-turn family reuse avoidance.
 * Deterministic only — parent-only, contract-bound families from TruthPacket.
 */

import { mapCanonicalIntentToPackGroup } from "./parent-coaching-packs.js";

const TEXT = {
  action_today: "אפשר לפרק יחד לצעד קטן היום בבית סביב אותו נושא?",
  action_week: "אפשר לשרטט יחד תוכנית קצרה לשבוע הקרוב סביב הנושא הזה?",
  avoid_now: "רוצים לסמן יחד מה כדאי להימנע ממנו בשבוע הקרוב?",
  advance_or_hold: "רוצים לבדוק יחד מתי כדאי לקדם ומתי לעצור באותו נושא?",
  explain_to_child: "רוצים ניסוח קצר להסבר לילד בלי לחץ?",
  ask_teacher: "רוצים ניסוח לשאלה ממוקדת למורה לפי מה שמופיע בדוח?",
  uncertainty_boundary: "רוצים לפרק מה עדיין לא ברור מהנתונים בדוח?",
};

/** @type {Record<string, Partial<Record<string, number>>>} */
const INTENT_FOLLOWUP_AFFINITY = {
  understand_observation: { action_today: 1, uncertainty_boundary: 2, advance_or_hold: 1 },
  understand_meaning: { uncertainty_boundary: 3, advance_or_hold: 2, action_week: 1, explain_to_child: 1 },
  action_today: { avoid_now: 3, explain_to_child: 2, ask_teacher: 1 },
  action_tomorrow: { avoid_now: 2, action_week: 2, explain_to_child: 1 },
  action_week: { avoid_now: 2, advance_or_hold: 2, explain_to_child: 1 },
  avoid_now: { action_week: 3, advance_or_hold: 2 },
  advance_or_hold: { uncertainty_boundary: 2, action_week: 2, explain_to_child: 1 },
  explain_to_child: { ask_teacher: 3, action_week: 1 },
  ask_teacher: { action_week: 2, advance_or_hold: 1 },
  uncertainty_boundary: { action_today: 1, explain_to_child: 2, ask_teacher: 1 },
};

/**
 * @param {string} text
 */
function hebrewTokens(text) {
  return String(text || "")
    .split(/\s+/)
    .map((t) => t.replace(/^[^\u0590-\u05FF]+|[^\u0590-\u05FF]+$/g, ""))
    .filter((t) => t.length >= 4);
}

/**
 * @param {string} a
 * @param {string} b
 */
function tokenOverlapCount(a, b) {
  const A = new Set(hebrewTokens(a));
  const B = new Set(hebrewTokens(b));
  let n = 0;
  for (const t of A) if (B.has(t)) n += 1;
  return n;
}

/**
 * @param {string[]} ranked
 * @param {string} family
 */
function deprioritizeFamily(ranked, family) {
  const out = ranked.filter((f) => f !== family);
  if (ranked.includes(family)) out.push(family);
  return out;
}

/**
 * @param {string[]} priorScopes
 * @param {string} scopeKey
 */
function sameScopeStreak(priorScopes, scopeKey) {
  if (!scopeKey) return 0;
  const ps = Array.isArray(priorScopes) ? priorScopes : [];
  let n = 0;
  for (let i = ps.length - 1; i >= 0; i--) {
    if (ps[i] === scopeKey) n += 1;
    else break;
  }
  return n;
}

/**
 * @param {string} family
 * @param {string} intent
 * @param {string} scopeLabelHe
 */
function followUpTextForSurface(family, intent, scopeLabelHe, scopeType = "") {
  const base = TEXT[family] || TEXT.uncertainty_boundary;
  if (String(scopeType || "").trim() === "executive") return base;
  const internalLabels = new Set(["מבט על התקופה", "הדוח בתקופה הנבחרה", "executive"]);
  const lab = String(scopeLabelHe || "").trim();
  if (!lab || lab.length < 2 || internalLabels.has(lab)) return base;
  const short = lab.length > 22 ? `${lab.slice(0, 20)}…` : lab;
  if (family === "action_today" || family === "action_week") {
    return base.replace(/\?$/, ` - סביב ${short}?`);
  }
  if (family === "uncertainty_boundary" || family === "advance_or_hold") {
    return base.replace(/\?$/, ` (${short})?`);
  }
  return base;
}

/**
 * @param {string[]} answerBlockTypes
 */
function shouldOmitFollowUpForSufficientAnswer(answerBlockTypes) {
  const t = Array.isArray(answerBlockTypes) ? answerBlockTypes : [];
  return t.includes("next_step") && t.includes("caution");
}

/**
 * @param {string} chosen
 * @param {object} ctx
 */
function followUpPassesValueGate(chosen, ctx) {
  if (ctx.omitFollowUpEntirely) return false;
  const t = followUpTextForSurface(chosen, ctx.intent, ctx.scopeLabelHe || "", ctx.scopeType || "");
  if (ctx.answerBodyTextHe && tokenOverlapCount(t, ctx.answerBodyTextHe) >= 2) return false;
  const lastTwo = Array.isArray(ctx.lastTwoSuggestedTexts) ? ctx.lastTwoSuggestedTexts : [];
  for (const prev of lastTwo) {
    if (prev && tokenOverlapCount(t, String(prev)) >= 2) return false;
  }
  const s = scoreFamilyPhaseB(chosen, ctx);
  if (s < -5) return false;
  return true;
}

/**
 * Phase B: score families for ordering (higher = better).
 * @param {string} family
 * @param {object} ctx
 */
function scoreFamilyPhaseB(family, ctx) {
  const {
    intent,
    prior,
    conv,
    recentTags,
    streak,
    scopeType,
    answerBodyTextHe,
    lastTwoSuggestedTexts,
    scopeLabelHe,
  } = ctx;
  const affKey = mapCanonicalIntentToPackGroup(intent);
  let s = INTENT_FOLLOWUP_AFFINITY[affKey]?.[family] ?? INTENT_FOLLOWUP_AFFINITY.understand_meaning?.[family] ?? 0;

  if (intent === "what_not_to_do_now") {
    if (family === "avoid_now") s += 3;
    if (family === "uncertainty_boundary") s += 1.5;
    if (family === "action_today" || family === "action_week") s -= 5;
  }

  const recentSuggest = Array.isArray(conv.recentSuggestedFollowupTexts) ? conv.recentSuggestedFollowupTexts : [];
  const answerFp = Array.isArray(conv.answerSummaryFingerprints) ? conv.answerSummaryFingerprints : [];
  const t = followUpTextForSurface(family, intent, scopeLabelHe || "", scopeType);

  for (const prev of recentSuggest) {
    const o = tokenOverlapCount(t, prev);
    if (o >= 2) s -= 8;
    else if (o >= 1) s -= 4;
  }
  const last2 = Array.isArray(lastTwoSuggestedTexts) ? lastTwoSuggestedTexts : recentSuggest.slice(-2);
  for (const prev of last2) {
    const o = tokenOverlapCount(t, String(prev || ""));
    if (o >= 2) s -= 14;
    else if (o >= 1) s -= 6;
  }

  for (const fp of answerFp.slice(-2)) {
    const o = tokenOverlapCount(t, fp);
    s -= o * 5;
  }

  if (answerBodyTextHe) {
    const oa = tokenOverlapCount(t, answerBodyTextHe);
    if (oa >= 3) s -= 22;
    else if (oa >= 2) s -= 14;
    else if (oa >= 1) s -= 6;
  }

  if (prior.slice(-2).includes(family)) s -= 6;
  else if (prior.slice(-4).includes(family)) s -= 3;

  if (streak >= 2 && scopeType === "topic" && family === "action_today") s -= 4;
  if (streak >= 2 && scopeType === "executive" && family === "action_today") s -= 5;
  if (streak >= 3 && scopeType === "executive" && family === "action_today") s -= 10;

  if (affKey !== "uncertainty_boundary") {
    if (recentTags.includes("surface:uncertainty") && family === "uncertainty_boundary") s -= 7;
    if (recentTags.includes("turn:validator_fail") && family === "uncertainty_boundary") s -= 6;
    if (recentTags.includes("turn:validator_fail") && family === "explain_to_child") s -= 3;
  }

  return s;
}

/**
 * @param {string[]} ranked
 * @param {object} ctx
 */
function rankFamiliesPhaseB(ranked, ctx) {
  const scored = ranked.map((f, i) => ({ f, score: scoreFamilyPhaseB(f, ctx), orig: i }));
  scored.sort((a, b) => b.score - a.score || a.orig - b.orig);
  return scored.map((x) => x.f);
}

/**
 * @param {string[]} ranked
 * @param {Set<string>} blocked
 * @param {string[]} prior
 * @param {number} hits
 */
function firstOpenFamily(ranked, blocked, prior, hits) {
  const recentTwo = prior.slice(-2).filter(Boolean);
  for (const fam of ranked) {
    if (blocked.has(fam)) continue;
    if (prior.slice(-2).includes(fam) && hits >= 1) continue;
    if (recentTwo.includes(fam)) {
      const hasAlt = ranked.some((f) => f !== fam && !blocked.has(f) && !recentTwo.includes(f));
      if (hasAlt) continue;
    }
    return fam;
  }
  return null;
}

/**
 * @param {object} input
 * @param {string} input.intent
 * @param {string} [input.scopeType]
 * @param {string} [input.scopeKey]
 * @param {string|null} [input.clickedFollowupFamilyThisTurn]
 * @param {string} [input.scopeLabelHe]
 * @param {string} [input.answerBodyTextHe]
 * @param {string[]} [input.answerBlockTypes]
 * @param {object} input.truthPacket
 * @param {object} input.conversationState
 * @param {boolean} [input.omitFollowUpEntirely]
 */
export function selectFollowUp(input) {
  const tp = input?.truthPacket || {};
  const conv = input?.conversationState || {};
  const intent = String(input?.intent || "");
  const affKeyFollow = mapCanonicalIntentToPackGroup(intent);
  const scopeType = String(input?.scopeType || "");
  const scopeKey = String(input?.scopeKey || "").trim();
  const clickedThis = String(input?.clickedFollowupFamilyThisTurn || "").trim() || null;
  const scopeLabelHe = String(input?.scopeLabelHe || "").trim();
  const answerBodyTextHe = String(input?.answerBodyTextHe || "").trim();
  const answerBlockTypes = Array.isArray(input?.answerBlockTypes) ? input.answerBlockTypes : [];

  const families = Array.isArray(tp?.allowedFollowupFamilies) ? tp.allowedFollowupFamilies : [];
  const prior = Array.isArray(conv.priorFollowupFamilies) ? conv.priorFollowupFamilies : [];
  const hits = Number(conv.repeatedPhraseHits) || 0;
  const clicked = Array.isArray(conv.clickedFollowups) ? conv.clickedFollowups : [];
  const answered = Array.isArray(conv.answeredConstraints) ? conv.answeredConstraints : [];
  const priorScopes = Array.isArray(conv.priorScopes) ? conv.priorScopes : [];
  const recentSuggest = Array.isArray(conv.recentSuggestedFollowupTexts) ? conv.recentSuggestedFollowupTexts : [];
  const lastTwoSuggestedTexts = recentSuggest.slice(-2);

  const omitFollowUpEntirely =
    Boolean(input?.omitFollowUpEntirely) || shouldOmitFollowUpForSufficientAnswer(answerBlockTypes);

  /** @type {string[]} */
  let ranked = [];
  for (const f of families) {
    if (!ranked.includes(f)) ranked.push(f);
  }

  const streak = sameScopeStreak(priorScopes, scopeKey);
  if (streak >= 2) {
    if (scopeType === "topic") ranked = deprioritizeFamily(ranked, "action_today");
    if (scopeType === "executive") ranked = deprioritizeFamily(ranked, "action_today");
  }

  const recentTags = answered
    .slice(-6)
    .join("|")
    .toLowerCase();
  if (affKeyFollow !== "uncertainty_boundary") {
    if (recentTags.includes("surface:uncertainty")) ranked = deprioritizeFamily(ranked, "uncertainty_boundary");
    if (recentTags.includes("turn:validator_fail")) {
      ranked = deprioritizeFamily(ranked, "uncertainty_boundary");
      ranked = deprioritizeFamily(ranked, "explain_to_child");
    }
  }

  const ctx = {
    intent,
    prior,
    conv,
    recentTags,
    streak,
    scopeType,
    answerBodyTextHe,
    lastTwoSuggestedTexts,
    scopeLabelHe,
    omitFollowUpEntirely,
  };
  ranked = rankFamiliesPhaseB(ranked, ctx);

  function buildBlocked(softClicked) {
    const blocked = new Set();
    if (tp?.cannotConcludeYet) {
      blocked.add("action_today");
      blocked.add("action_week");
    }
    if (hits >= 2) {
      const last = prior[prior.length - 1];
      if (last) blocked.add(last);
    }
    if (intent.startsWith("action") || intent === "what_to_do_today" || intent === "what_to_do_this_week") {
      blocked.add("action_today");
    }
    const lastClicked = clicked.length ? String(clicked[clicked.length - 1] || "").trim() : null;
    if (lastClicked && !softClicked.has("relax_last_clicked")) blocked.add(lastClicked);
    if (clickedThis && !softClicked.has("relax_this_click")) blocked.add(clickedThis);
    if (affKeyFollow !== "uncertainty_boundary") {
      if (recentTags.includes("surface:uncertainty")) blocked.add("uncertainty_boundary");
      if (recentTags.includes("turn:validator_fail")) {
        blocked.add("uncertainty_boundary");
      }
    }
    if (streak >= 3 && scopeType === "executive") blocked.add("action_today");
    if (
      scopeType === "executive" &&
      (tp?.recommendationEligible === false || String(tp?.recommendationIntensityCap || "RI0").toUpperCase() === "RI0")
    ) {
      blocked.add("action_today");
      blocked.add("action_week");
      blocked.add("advance_or_hold");
    }
    return blocked;
  }

  function reasonForChoice(family, hadRelax) {
    if (hadRelax) return "memory_fallback_relaxed";
    const base = scoreFamilyPhaseB(family, ctx);
    if (base >= 3) return "intent_affinity_rank";
    if (base <= -4) return "memory_dedup_diversify";
    return "advance_check_relevant";
  }

  const soft = new Set();
  let blocked = buildBlocked(soft);
  let chosen = firstOpenFamily(ranked, blocked, prior, hits);
  let relax = false;

  if (!chosen) {
    soft.add("relax_last_clicked");
    blocked = buildBlocked(soft);
    chosen = firstOpenFamily(ranked, blocked, prior, hits);
    relax = true;
  }
  if (!chosen) {
    soft.add("relax_this_click");
    blocked = buildBlocked(soft);
    chosen = firstOpenFamily(ranked, blocked, prior, hits);
    relax = true;
  }
  if (!chosen) {
    blocked = new Set();
    if (tp?.cannotConcludeYet) {
      blocked.add("action_today");
      blocked.add("action_week");
    }
    chosen = firstOpenFamily(ranked, blocked, prior, 0);
    relax = true;
  }

  if (!chosen) {
    return {
      selected: null,
      candidateFamiliesRanked: ranked,
      noneReasonCode: "no_useful_next_step",
    };
  }

  if (!followUpPassesValueGate(chosen, ctx)) {
    return {
      selected: null,
      candidateFamiliesRanked: ranked,
      noneReasonCode: "low_value_followup_suppressed",
    };
  }

  const textHe = followUpTextForSurface(chosen, intent, scopeLabelHe, scopeType);

  return {
    selected: {
      family: chosen,
      textHe,
      reasonCode: reasonForChoice(chosen, relax),
    },
    candidateFamiliesRanked: ranked,
  };
}

export default { selectFollowUp };
