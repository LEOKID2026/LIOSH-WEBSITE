/**
 * Parent-facing AI / narrative text validation (report intelligence layer).
 * English comments only; validated strings are Hebrew product copy.
 */

import { MEDICAL_DIAGNOSTIC_RES } from "../../utils/parent-narrative-safety/parent-narrative-safety-contract.js";
import { validateParentNarrativeSafety } from "../../utils/parent-narrative-safety/parent-narrative-safety-guard.js";
import {
  findForbiddenSubstringsInString,
  findReadabilityLeakSubstringsInString,
} from "../../utils/parent-report-language/forbidden-terms.js";

/** Default max length for a single parent-report narrative block (characters). */
export const PARENT_REPORT_AI_DEFAULT_MAX_LEN = 1400;

/** Internal / engineering tokens that must not appear in parent-facing copy. */
export const PARENT_REPORT_AI_INTERNAL_LEAK_RES = [
  /\bmetadata\b/i,
  /\bdiagnostics?\b/i,
  /\bplanner\b/i,
  /\breasonCodes?\b/i,
  /\bmustNotSay\b/i,
  /\bJSON\b/i,
  /\balgorithm\b/i,
  /\bAI\b/i,
  /\bLLM\b/i,
  /\bmodel\b/i,
  /\bfallback\b/i,
  /truthPacket|contractsV1|engineDecision|pattern_diagnostics/i,
];

/** Blame / judgment toward the child (block). */
export const PARENT_REPORT_AI_BLAME_RES = [
  /הילד\s*חלש/u,
  /הילדה\s*חלשה/u,
  /נכשל(?:ו|ה)?\s*ב/u,
  /יש\s*ל(?:ו|ה)\s*בעיה/u,
  /בעיה\s*חמורה/u,
  /אשמת\s*(?:הילד|הילדה)/u,
];

/** Scary predictions or alarmist framing. */
export const PARENT_REPORT_AI_SCARY_RES = [
  /סכנה\s*מיידית/u,
  /אסון/u,
  /מובטח\s*ש(?:לא|כן)/u,
  /בוודאות\s*ייכשל/u,
];

/** Promise of guaranteed improvement. */
export const PARENT_REPORT_AI_PROMISE_RES = [
  /מובטח\s*ש(?:תהיה|יהיה|תשפר)/u,
  /בטוח\s*ש(?:תצליח|יצליח)/u,
  /ודאות\s*שהשיפור/u,
];

/**
 * @typedef {object} ParentReportAIValidateOptions
 * @property {number} [maxLen]
 * @property {number} [minHebrewRatio] — ratio of Hebrew letters to all letters (default 0.48)
 * @property {boolean} [runNarrativeGuard] - run `validateParentNarrativeSafety` when engine snapshot provided
 * @property {import("../../utils/parent-narrative-safety/parent-narrative-safety-contract.js").ParentNarrativeEngineOutput} [narrativeEngineSnapshot]
 * @property {import("../../utils/parent-narrative-safety/parent-narrative-safety-contract.js").ParentNarrativeReportContext} [narrativeReportContext]
 */

/**
 * @param {string} text
 * @param {ParentReportAIValidateOptions} [options]
 * @returns {{ ok: true, text: string } | { ok: false, reason: string, detail?: string }}
 */
export function validateParentReportAIText(text, options = {}) {
  const raw = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const singleLine = raw.replace(/\s*\n+\s*/g, " ").trim();
  const maxLen = Number(options.maxLen) > 0 ? Number(options.maxLen) : PARENT_REPORT_AI_DEFAULT_MAX_LEN;
  const minHebrewRatio =
    typeof options.minHebrewRatio === "number" && options.minHebrewRatio > 0 && options.minHebrewRatio < 1
      ? options.minHebrewRatio
      : 0.48;

  if (!singleLine) return { ok: false, reason: "empty" };
  if (singleLine.length > maxLen) return { ok: false, reason: "too_long" };
  if (/[\n\r\t]/.test(singleLine)) return { ok: false, reason: "line_break" };
  if (/[#*_`[\]()]/.test(singleLine)) return { ok: false, reason: "markdown_like" };
  if (/\p{Extended_Pictographic}/u.test(singleLine)) return { ok: false, reason: "emoji" };
  if (/\d/.test(singleLine)) return { ok: false, reason: "digits" };

  const letters = singleLine.replace(/[^\p{L}]/gu, "");
  if (letters.length < 16) return { ok: false, reason: "too_short" };
  let he = 0;
  for (const ch of letters) {
    const c = ch.codePointAt(0);
    if (c >= 0x0590 && c <= 0x05ff) he += 1;
  }
  if (he / letters.length < minHebrewRatio) return { ok: false, reason: "not_hebrewish" };

  const lower = singleLine.toLowerCase();
  for (const re of PARENT_REPORT_AI_INTERNAL_LEAK_RES) {
    if (re.test(singleLine) || re.test(lower)) {
      return { ok: false, reason: "internal_leak", detail: re.source };
    }
  }

  for (const re of MEDICAL_DIAGNOSTIC_RES) {
    if (re.test(singleLine)) return { ok: false, reason: "diagnostic_language", detail: re.source };
  }
  for (const re of PARENT_REPORT_AI_BLAME_RES) {
    if (re.test(singleLine)) return { ok: false, reason: "blame_language", detail: re.source };
  }
  for (const re of PARENT_REPORT_AI_SCARY_RES) {
    if (re.test(singleLine)) return { ok: false, reason: "scary_language", detail: re.source };
  }
  for (const re of PARENT_REPORT_AI_PROMISE_RES) {
    if (re.test(singleLine)) return { ok: false, reason: "promise_language", detail: re.source };
  }

  const forbiddenHits = findForbiddenSubstringsInString(singleLine);
  if (forbiddenHits.length) return { ok: false, reason: "forbidden_engine_fragment", detail: forbiddenHits.join(",") };

  const leakHits = findReadabilityLeakSubstringsInString(singleLine);
  if (leakHits.length) return { ok: false, reason: "readability_leak", detail: leakHits.join(",") };

  if (options.runNarrativeGuard && options.narrativeEngineSnapshot) {
    const nar = validateParentNarrativeSafety({
      narrativeText: singleLine,
      engineOutput: options.narrativeEngineSnapshot,
      reportContext: options.narrativeReportContext || { surface: "other" },
      locale: "he",
    });
    if (!nar.ok) {
      return {
        ok: false,
        reason: "narrative_guard_block",
        detail: (nar.blockedReasons && nar.blockedReasons[0]) || nar.status,
      };
    }
  }

  return { ok: true, text: singleLine };
}

/**
 * Map strict parent-report AI input fields to a minimal engine snapshot for `validateParentNarrativeSafety`.
 * @param {Record<string, unknown>} input — normalized allowlisted parent explainer input
 */
export function parentReportAiInputToNarrativeEngineSnapshot(input) {
  const dc = String(input?.dataConfidence || "").toLowerCase();
  const consistency = String(input?.consistencyBand || "").toLowerCase();
  const qc = Number(input?.plannerQuestionCount);
  const n = Number.isFinite(qc) && qc >= 0 ? Math.round(qc) : 0;

  const thinData = dc === "thin" || dc === "low" || n < 10;
  const dataSufficiencyLevel = thinData ? "thin" : n >= 40 ? "strong" : "moderate";
  const engineConfidence = thinData ? "low" : dc === "moderate" ? "medium" : "high";

  const next = String(input?.plannerNextAction || "").toLowerCase();
  /** @type {"maintain"|"maintain_only"|"advance_ok"|"none"} */
  let recommendationTier = "advance_ok";
  if (next === "maintain_skill") recommendationTier = "maintain";
  else if (next === "pause_collect_more_data" || next === "probe_skill") recommendationTier = "maintain_only";

  const guessingLikelihoodHigh =
    consistency.includes("fast") || consistency.includes("guessing") || consistency === "unstable";

  return {
    thinData,
    questionCount: n || (thinData ? 5 : 20),
    dataSufficiencyLevel,
    engineConfidence,
    conclusionStrengthAllowed: thinData ? "weak" : "moderate",
    recommendationTier,
    guessingLikelihoodHigh,
    mustNotSay: [],
  };
}
