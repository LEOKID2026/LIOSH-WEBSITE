/**
 * Phase E — deterministic read-only routing for Parent Copilot.
 * Does not mutate banks, taxonomies, diagnostics, or planner outputs.
 */

import { SUBJECT_ORDER, subjectLabelHe } from "../parent-copilot/contract-reader.js";
import { foldUtteranceForHeMatch } from "../parent-copilot/utterance-normalize-he.js";

/**
 * @param {unknown} payload
 * @returns {Array<{ subjectId: string; topicRowKey: string; displayName: string; displayNameFolded: string; anchored: boolean }>}
 */
export function listTopicRowsForClassifier(payload) {
  /** @type {Array<{ subjectId: string; topicRowKey: string; displayName: string; displayNameFolded: string; anchored: boolean }>} */
  const out = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const bySubject = Object.fromEntries(profiles.map((sp) => [String(sp?.subject || ""), sp]));
  for (const sid of SUBJECT_ORDER) {
    const sp = bySubject[sid];
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const displayNameHe = String(tr?.displayName || "").trim();
      const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
      const nar = tr?.contractsV1?.narrative;
      const anchored = !!(nar && typeof nar === "object" && String(nar?.textSlots?.observation || "").trim());
      if (!topicRowKey || displayNameHe.length < 2) continue;
      out.push({
        subjectId: sid,
        topicRowKey,
        displayName: displayNameHe,
        displayNameFolded: foldUtteranceForHeMatch(displayNameHe),
        anchored,
      });
    }
    const overview = Array.isArray(sp?.topicOverviewRows) ? sp.topicOverviewRows : [];
    for (const row of overview) {
      const displayNameHe = String(row?.displayName || "").trim();
      const topicRowKey = String(row?.topicRowKey || row?.topicKey || "").trim();
      if (!topicRowKey || displayNameHe.length < 2) continue;
      if (out.some((r) => r.subjectId === sid && r.topicRowKey === topicRowKey)) continue;
      out.push({
        subjectId: sid,
        topicRowKey,
        displayName: displayNameHe,
        displayNameFolded: foldUtteranceForHeMatch(displayNameHe),
        anchored: Math.max(0, Number(row?.questions) || 0) > 0,
      });
    }
  }
  return out;
}

/**
 * Match utterance to a catalog topic row even when the row is not anchored in the report (read-only).
 * @param {string} utteranceStr
 * @param {unknown} payload
 * @returns {{ subjectId: string; topicRowKey: string; displayName: string; anchored: boolean } | null}
 */
export function matchLooseTopicFromUtterance(utteranceStr, payload) {
  const u = foldUtteranceForHeMatch(String(utteranceStr || ""));
  if (u.length < 3) return null;
  const rows = listTopicRowsForClassifier(payload);
  /** @type {Array<{ subjectId: string; topicRowKey: string; displayName: string; anchored: boolean; score: number }>} */
  const hits = [];
  for (const row of rows) {
    const d = row.displayNameFolded;
    if (d.length < 2) continue;
    if (!u.includes(d)) continue;
    hits.push({
      subjectId: row.subjectId,
      topicRowKey: row.topicRowKey,
      displayName: row.displayName,
      anchored: row.anchored,
      score: d.length,
    });
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.score - a.score || SUBJECT_ORDER.indexOf(a.subjectId) - SUBJECT_ORDER.indexOf(b.subjectId));
  const best = hits[0];
  return { subjectId: best.subjectId, topicRowKey: best.topicRowKey, displayName: best.displayName, anchored: best.anchored };
}

/**
 * Heuristic: pasted homework / external exercise (not from internal banks).
 * @param {string} utteranceStr
 */
export function looksLikeExternalPastedQuestion(utteranceStr) {
  const raw = String(utteranceStr || "").trim();
  if (raw.length < 28) return false;
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const multiLine = lines.length >= 2;
  const hasEquals = /[=≈]/.test(raw);
  const digitHeavy = (raw.match(/\d/g) || []).length >= 4;
  const asksSolve = /(?:פתור|חשב|מה\s*התוצאה|Solve|Calculate)/i.test(raw);
  const longSingle = raw.length >= 120;
  /** Parent utterances are often newline-collapsed before routing — still treat as paste if equation-like. */
  const equationLikeCompact = hasEquals && digitHeavy && raw.length >= 32;
  return (
    (multiLine && (hasEquals || digitHeavy)) ||
    equationLikeCompact ||
    (longSingle && (hasEquals || digitHeavy || asksSolve))
  );
}

/**
 * Parent asks for a similar question / practice idea (must stay generic + labeled).
 * @param {string} utteranceStr
 */
export function isPracticeSuggestionRequest(utteranceStr) {
  const u = String(utteranceStr || "").trim();
  return /(?:תרגיל\s*דומה|שאלה\s*דומה|עוד\s*שאלה\s*(?:כזו|כמו)|דוגמא\s*דומה|רעיון\s*לתרגול|תרגול\s*דומה|תנו\s*לי\s*תרגיל|תן\s*לי\s*תרגיל)/i.test(
    u,
  );
}

/**
 * @param {{ resolutionStatus?: string; scopeReason?: string }} scopeRes
 * @param {string} utteranceStr
 * @param {{ canonicalIntent?: string }} stageA
 * @param {unknown} payload
 * @returns {boolean}
 */
export function shouldPhaseEBypassClarification(scopeRes, utteranceStr, stageA, payload) {
  if (String(scopeRes?.resolutionStatus || "") !== "clarification_required") return false;
  const reason = String(scopeRes?.scopeReason || "");
  if (reason === "utterance_topic_ambiguous" || reason === "missing_payload") return false;

  const external = looksLikeExternalPastedQuestion(utteranceStr);
  const practice = isPracticeSuggestionRequest(utteranceStr);
  const loose = matchLooseTopicFromUtterance(utteranceStr, payload);
  const intent = String(stageA?.canonicalIntent || "");

  const eligibleReason =
    reason === "no_anchor_available" ||
    reason === "selected_context_topic_missing_anchor" ||
    reason === "selected_context_subject_missing_anchor";

  if (!eligibleReason && !external && !practice) return false;

  if (reason === "selected_context_subject_missing_anchor") {
    if (external || practice || intent === "clarify_term") return true;
    if (utteranceStr.length >= 50 || loose) return true;
    return false;
  }

  if (reason === "selected_context_topic_missing_anchor") {
    return !!(external || practice || intent === "clarify_term" || loose || utteranceStr.length >= 40);
  }

  if (reason === "no_anchor_available") {
    if (external || practice) return true;
    if (intent === "clarify_term") return true;
    if (loose) return true;
    if (utteranceStr.length >= 40) return true;
    return false;
  }

  return false;
}

export const PHASE_E_GENERAL_DISCLAIMER_LINE =
  "תרגול כללי - לא מתוך מאגר השאלות הרשמי ולא משנה את האבחון";

export default {
  listTopicRowsForClassifier,
  matchLooseTopicFromUtterance,
  looksLikeExternalPastedQuestion,
  isPracticeSuggestionRequest,
  shouldPhaseEBypassClarification,
};
