/**
 * Validates draft answers and final ParentCopilotResponseV1-shaped payloads.
 * Phase 5: truth consistency, recommendation boundary, forbidden surfaces, parent-facing Hebrew.
 *
 * **Fail-code categories (documentation only — see implementation for exact codes):**
 * - **Clinical / diagnostic surface:** patterns that imply diagnosis, disability labels, or forbidden certainty on boundary turns.
 * - **Recommendation / contract boundary:** `next_step` or imperative coaching when contracts forbid it; premature “closed” conclusions when `cannotConcludeYet`; strength hype / blocked-advance contradictions per truth.
 * - **Internal or dev leakage:** internal tokens, raw intensity codes, URLs, JSON/debug vocabulary in parent-facing text.
 * - **Hebrew / parent-facing hygiene:** normalization and filler/blacklist rules for composed glue.
 *
 * Deterministic and LLM paths both pass through `validateAnswerDraft` / `validateParentCopilotResponseV1` as appropriate.
 */

import {
  clinicalBoundaryJoinedFingerprintHe,
  peerComparisonBoundaryJoinedFingerprintHe,
  sensitiveEducationChoiceJoinedFingerprintHe,
} from "./answer-composer.js";
import { textViolatesPolarityForEvidence } from "./evidence-polarity.js";
import { STRONG_GLOBAL_QUESTION_FLOOR } from "./report-volume-context.js";
import {
  subjectQuestionCountsFromPayload,
  textViolatesZeroEvidencePolicy,
  lineMentionsZeroEvidenceSubjectHe,
  lineViolatesZeroEvidenceInsightPolicy,
} from "../parent-report-language/subject-evidence-policy.js";

/** Deterministic clinical / diagnostic labeling (joined parent copy + contract slots). Not the fixed boundary fingerprint. */
const CLINICAL_DIAGNOSIS_SURFACE_RES = [
  /דיסלקציה|דיסלקסיה|דיסקלקוליה/u,
  /לקות\s*למידה/u,
  /הפרעת\s*קשב/u,
  /\bADHD\b/i,
  /האבחון\s*הוא/u,
  /האבחנה\s*היא/u,
  /(?:יש\s*לילד|לילד\s*יש).{0,64}(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD)/iu,
  /(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD).{0,64}(?:יש\s*לילד|לילד\s*יש)/iu,
];

/** Over-certain tone when answering a clinical-boundary-class turn. */
const CLINICAL_CERTAINTY_RE = /(בוודאות|חד[\s-]*משמעית|אין\s*ספק|ברור\s*ש)/u;

/**
 * @param {string} s
 */
function normalizeWsHe(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Filler-only closings (avoid substrings that appear inside approved narrative contract slots). */
const FILLER_BLACKLIST = ["נמשיך ונראה", "הכול תלוי בהמשך", "נראה בסדר באופן כללי"];

/** Must never appear in parent-facing answer blocks (product QA + internal labels). */
const FORBIDDEN_PARENT_SURFACE_TOKENS = [
  "AI Hybrid",
  "reviewHybrid",
  "Parent Copilot",
  "AiHybridInternalReviewerPanel",
  "ai-hybrid-internal-reviewer",
  "contractsV1",
  "validatorFailCodes",
  "schemaVersion",
  "telemetry.trace",
  "interpretationScope",
  "truthPacket",
  "selectedContextRef",
  "topicStateId",
  "stateHash",
  "forbiddenMoves",
  "allowedFollowupFamilies",
];

/** Dev / schema / enum leaks (parent must never see these). */
const INTERNAL_DEV_PATTERNS = [
  /\bJSON\.stringify\b/i,
  /\bundefined\b/,
  /\bnull\b/,
  /\b(?:true|false)\b(?=\s*[,\}\]]|\s*$)/i,
  /\bconsole\.(log|debug|warn|error)\b/i,
  /\bhttps?:\/\//i,
  /\bscope_type\b|\bresolution_status\b/i,
];

/** Raw recommendation intensity codes in parent copy. */
const RAW_INTENSITY_RE = /\bRI[0-3]\b/i;

/** Strength celebration / ranking hype (composed glue only when truth forbids strength framing). */
const STRENGTH_HYPE_COMPOSED_RE =
  /(מצטיין|מצטיינים|חוזק\s*יוצא\s*דופן|חוזקות\s*יוצאות\s*דופן|מובילים\s*בציונים|הכי\s*חזקים\s*בכיתה|top\s*tier|#\s*1\s*במקצוע)/iu;

/** Concrete home-action imperatives when recommendation is not allowed (composed only). */
const INELIGIBLE_HOME_ACTION_COMPOSED_RE =
  /(מומלץ\s+לכם\s+לתרגל|עליכם\s+היום\s+ל|כדאי\s+שתתחילו\s+בתרגול|תבחרו\s+נושא\s+ו?לתרגלו|תתרגלו\s+היום\s+חמש|בצעו\s+היום\s+דקות)/u;

/** Over-absolute conclusion tone when contract says cannot conclude yet (composed only). */
const PREMATURE_CONCLUSION_COMPOSED_RE =
  /(אין\s*על\s*מה\s*להתווכח|זה\s*סופי\s*ש|הוכח\s*מעל\s*כל\s*ספק|חד[\s\-]*משמעית\s*לחלוטין)/u;

/** Dismisses uncertainty when interpretation demands uncertainty framing (composed only). */
const CONFIDENCE_UNCERTAINTY_CONTRADICTION_RE =
  /(אין\s*ספק\s*שזה|בוודאות\s*מוחלטת|וודאות\s*של\s*מאה\s*אחוז)/u;

/** Under blocked_advance framing, must not push immediate promotion (composed only). */
const BLOCKED_ADVANCE_CONTRADICTION_RE = /(אפשר\s+לקדם\s+מיד|להעלות\s+רמה\s+עכשיו\s+בלי\s*הסתייגות|קדמו\s*כבר\s*לשלב\s*הבא)/u;

/** Parent-facing adaptation / meta instructions (composed). */
const PARENT_META_INSTRUCTION_RE =
  /(התאימו\s+את\s+התשובה|נא\s+לנסח\s+מחדש|עדכנו\s+את\s+הפרומפט|שכתבו\s+את\s+המודל|עליכם\s+לשנות\s+את\s+הניסוח\s*שלכם)/u;

/** Robotic / system phrasing. */
const ROBOTIC_SYSTEM_RE = /(\[object\s+Object\]|TODO:|FIXME:|stack\s*trace|error\s*code\s*\d+)/i;

/** Same family as parent-report narrative — emotional "confidence" framing is product-forbidden. */
/** Do not match `ביטחון` inside `בביטחון` / `הביטחון` (contract statistical phrasing). */
const EMOTIONAL_CONFIDENCE_TERMS_RE = /((?<!ב)(?<!ה)ביטחו[ןנ]|בטחו[ןנ]|confidence)/iu;

/**
 * Global scarcity claims must not appear in composed glue when report volume is high.
 * Contract slots may still carry nuanced uncertainty; we scan composed glue only.
 *
 * These phrases are forbidden globally when totalAnswers >= STRONG_GLOBAL_QUESTION_FLOOR,
 * UNLESS they are clearly scoped to a specific subject/topic with low question count.
 * Scoping indicators: "ב[נושא] הזה", "ב[מקצוע] בלבד", "לגבי הנושא הזה"
 */
const GLOBAL_SCARCITY_CONTRADICTION_RE =
  /(מוקדם\s+לקבוע(?!\s+(?:לגבי|ב))|אין\s+מספיק\s+נתונים(?!\s+(?:לגבי|ב|על))|נתונים\s+מועטים(?!\s+(?:ב|לגבי|על\s+(?:הנושא|המקצוע)))|כיוון\s+ראשוני\s+בלבד(?!\s+(?:לגבי|ב))|עדיין\s+לא\s+ניתן\s+להסיק(?!\s+(?:לגבי|ב))|יש\s+כרגע\s+מעט\s+נתוני\s+תרגול|נפח\s+הנתונים\s+עדיין\s+מצומצם|אין\s+עדיין\s+מספיק\s+מידע\s+לכיוון\s+ברור|אין\s+מספיק\s+נתונים\s+בכלל|נתונים\s+מועטים\s+בתקופה|מוקדם\s+לקבוע\s+תמונה\s+ברורה\s+מהתרגולים)/u;

/**
 * Off-topic answers must not contain report-data commentary.
 * Detects: answer counts, accuracy percentages, "according to the report", child summaries.
 */
const OFF_TOPIC_REPORT_DATA_CONTAMINATION_RE =
  /(\d{2,}\s*שאלות|\d{2,}\s*תשובות|דיוק\s+של\s*\d|%\s*(דיוק|הצלחה)|בדוח\s+יש\s+\d|לפי\s+הדוח|על\s+פי\s+הדוח|ה?ילד\s+(מתרגל|הגיע|צבר|ענה|טעה|נכשל)|נושאים\s+בדוח|\d+\s*נושאים)/u;

/**
 * @param {ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>} truthPacket
 */
function strengthFramingOk(truthPacket) {
  const dl = truthPacket?.derivedLimits || {};
  const interp = String(truthPacket?.interpretationScope || "executive").trim();
  return (
    interp === "strengths" &&
    !dl.cannotConcludeYet &&
    dl.readiness !== "insufficient" &&
    dl.confidenceBand !== "low"
  );
}

/**
 * @param {Array<{ type: string; textHe: string; source: string }>} blocks
 */
function composedTextJoin(blocks) {
  return blocks
    .filter((b) => b && String(b.source || "") !== "contract_slot")
    .map((b) => String(b.textHe || ""))
    .join(" ")
    .trim();
}

/**
 * @param {string} s
 */
function latinToHebrewLetterRatio(s) {
  const t = String(s || "");
  let lat = 0;
  let he = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) lat += 1;
    else if (c >= 0x0590 && c <= 0x05ff) he += 1;
  }
  const sum = lat + he;
  return sum ? lat / sum : 0;
}

/** Preposition + punctuation before a Hebrew topic word (e.g. "ב. חשבון"). */
const MALFORMED_PREP_PUNCT_BEFORE_TOPIC_RE =
  /(?:^|[\s,;-])(ב|על|עם|של|ל)\s*[.:]\s+(?=[\u0590-\u05FF])/u;
/** e.g. "ב ." / "ב-." */
const MALFORMED_PREP_DASH_DOT_RE = /(?:^|[\s,;-])(ב|על|עם|של|ל)\s*[ \-]\s*\./u;

const EXPLICIT_BROKEN_FRAGMENT_RES = [
  /(?:^|[\s,;-])ב\.\s/u,
  /(?:^|[\s,;-])ב\s+\.\s/u,
  /ב \./u,
  /ב-\./u,
  /ב:\./u,
];

/** At least one practical home-practice cue for main-focus answers. */
const MAIN_FOCUS_PRACTICAL_HINT_RE =
  /10\s*דקות|3\s*פעמים|5\s*[–\-]\s*8\s*שאלות|תרגול\s*קצר|בכל\s*פעם/u;

const MAIN_FOCUS_MIN_JOINED_LEN = 90;

/**
 * @param {string} segment
 */
function sentenceEndsWithHangingPreposition(segment) {
  const t = String(segment || "").trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] || "";
  return ["ב", "על", "עם", "של", "ל"].includes(last);
}

/**
 * Hebrew surface-quality checks for parent-facing joined copy (deterministic + LLM paths).
 * @param {string} joined
 * @param {string} intent
 * @returns {string[]}
 */
export function collectParentFacingOutputQualityIssues(joined, intent) {
  /** @type {string[]} */
  const codes = [];
  const j = String(joined || "");

  for (const re of EXPLICIT_BROKEN_FRAGMENT_RES) {
    if (re.test(j)) {
      codes.push("malformed_hebrew_fragment");
      break;
    }
  }
  if (MALFORMED_PREP_PUNCT_BEFORE_TOPIC_RE.test(j)) codes.push("malformed_preposition_punctuation");
  if (MALFORMED_PREP_DASH_DOT_RE.test(j)) codes.push("malformed_preposition_punctuation");

  const roughParts = j.split(/\s*(?:[.!?]|׃)\s+/u).filter(Boolean);
  for (const part of roughParts) {
    if (sentenceEndsWithHangingPreposition(part)) {
      codes.push("sentence_hanging_preposition");
      break;
    }
  }

  const intentNorm = String(intent || "").trim();
  if (intentNorm === "what_is_most_important") {
    if (j.length > 0 && j.length < MAIN_FOCUS_MIN_JOINED_LEN) codes.push("main_focus_answer_too_short");
    if (!MAIN_FOCUS_PRACTICAL_HINT_RE.test(j)) codes.push("main_focus_missing_practical_action");
  }

  return [...new Set(codes)];
}

/**
 * @param {{ answerBlocks: Array<{ type: string; textHe: string; source: string }> }} draft
 * @param {NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>} truthPacket
 * @param {{ intent?: string }} [hints]
 */
export function validateAnswerDraft(draft, truthPacket, hints = null) {
  /** @type {string[]} */
  const failCodes = [];
  const blocks = Array.isArray(draft?.answerBlocks) ? draft.answerBlocks : [];
  if (blocks.length < 2) failCodes.push("answer_too_short");

  const hasObs = blocks.some((b) => b.type === "observation");
  const hasMean = blocks.some((b) => b.type === "meaning");
  if (!hasObs && !hasMean) failCodes.push("missing_observation_or_meaning");

  const joined = blocks.map((b) => String(b.textHe || "")).join(" ");
  const composedJoined = composedTextJoin(blocks);
  const intent = String(hints?.intent || "").trim();
  const joinedNorm = normalizeWsHe(joined);
  const boundaryNorm = normalizeWsHe(clinicalBoundaryJoinedFingerprintHe());
  const boundaryNormSensitive = normalizeWsHe(sensitiveEducationChoiceJoinedFingerprintHe());
  const boundaryNormPeer = normalizeWsHe(peerComparisonBoundaryJoinedFingerprintHe());
  const isApprovedClinicalBoundaryCopy = joinedNorm === boundaryNorm;
  const isApprovedSensitiveEducationCopy = joinedNorm === boundaryNormSensitive;
  const isApprovedPeerComparisonCopy = joinedNorm === boundaryNormPeer;
  const isApprovedFixedBoundaryCopy =
    isApprovedClinicalBoundaryCopy || isApprovedSensitiveEducationCopy || isApprovedPeerComparisonCopy;

  if (/\bcontractsV1\b|validatorFailCodes|schemaVersion|fail_codes\b|telemetry\.trace\b/i.test(joined)) {
    failCodes.push("internal_surface_leak");
  }
  const joinedLower = joined.toLowerCase();
  for (const tok of FORBIDDEN_PARENT_SURFACE_TOKENS) {
    if (!tok) continue;
    const needle = tok.toLowerCase();
    if (joinedLower.includes(needle)) failCodes.push("forbidden_parent_surface_token");
  }
  if (/\bcanonical\b/i.test(joined) || /\bdebug\b/i.test(joined)) {
    failCodes.push("forbidden_parent_surface_token");
  }

  for (const re of INTERNAL_DEV_PATTERNS) {
    if (re.test(joined)) {
      failCodes.push("forbidden_internal_dev_string");
      break;
    }
  }
  if (RAW_INTENSITY_RE.test(joined)) failCodes.push("raw_intensity_code_leak");

  const scopeQ = Math.max(0, Number(truthPacket?.surfaceFacts?.questions) || 0);
  const scopeAcc = Math.max(0, Math.min(100, Math.round(Number(truthPacket?.surfaceFacts?.accuracy) || 0)));
  if (
    intent !== "off_topic_redirect" &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "parent_policy_refusal" &&
    String(truthPacket?.scopeType || "") === "topic" &&
    scopeQ > 0 &&
    textViolatesPolarityForEvidence(joined, scopeQ, scopeAcc)
  ) {
    failCodes.push("polarity_contradicts_evidence");
  }

  const answerContract = String(hints?.answerContract || "").trim();
  const priorFp = String(hints?.priorAnswerFingerprint || "").trim();
  const joinedFp = joined.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 220);

  if (answerContract === "mistake_pattern") {
    const hasMistakeFraming = /הטעות|דפוס|סוג הטעות|פירוט מספיק|לרשום משפט|לפני שטעה/u.test(joined);
    const metricOnly =
      /\d+\s*שאלות/u.test(joined) &&
      /דיוק/u.test(joined) &&
      !hasMistakeFraming;
    if (metricOnly) failCodes.push("mistake_intent_metric_only_repeat");
  }

  if (answerContract === "report_explanation") {
    const reportLevel =
      /מקצוע|תורגל|סה״כ|מה שעובד|מקצועות שלא|בטווח התקופה|תמונה כללית/u.test(joined);
    const singleWeakOnly =
      /שברים|נושא/u.test(joined) &&
      /\d+\s*שאלות/u.test(joined) &&
      /דיוק/u.test(joined) &&
      !reportLevel;
    if (singleWeakOnly) failCodes.push("report_explanation_single_topic_only");
  }

  if (answerContract && priorFp && priorFp.length > 40 && joinedFp === priorFp) {
    failCodes.push("intent_answer_duplicate_prior_turn");
  }

  if (/אפשר לפרק יחד|נפרק יחד|ננסה לפרק/u.test(joined) && joined.length < 140 && blocks.length <= 2) {
    failCodes.push("empty_deflection_without_answer");
  }

  if (ROBOTIC_SYSTEM_RE.test(joined)) failCodes.push("robotic_system_phrasing");
  if (PARENT_META_INSTRUCTION_RE.test(composedJoined)) failCodes.push("parent_meta_instruction_wording");

  const latinRatio = latinToHebrewLetterRatio(joined);
  if (latinRatio > 0.34 && joined.length > 24) failCodes.push("excess_latin_in_parent_copy");

  const globalQ = Math.max(
    Number(truthPacket?.surfaceFacts?.reportQuestionTotalGlobal) || 0,
    Number(truthPacket?.surfaceFacts?.questions) || 0,
  );
  if (
    intent !== "off_topic_redirect" &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "parent_policy_refusal" &&
    intent !== "off_report_subject_clarification"
  ) {
    if (EMOTIONAL_CONFIDENCE_TERMS_RE.test(joined)) failCodes.push("emotional_confidence_language");
    if (globalQ >= STRONG_GLOBAL_QUESTION_FLOOR && GLOBAL_SCARCITY_CONTRADICTION_RE.test(composedJoined)) {
      failCodes.push("truth_contradiction_global_thin_language_high_volume");
    }
  }

  // Off-topic answers must be clean boundary text — no report data, no child commentary
  if (intent === "off_topic_redirect" && OFF_TOPIC_REPORT_DATA_CONTAMINATION_RE.test(joined)) {
    failCodes.push("off_topic_report_data_contamination");
  }

  const nar = truthPacket?.contracts?.narrative;
  const slotText = [
    String(nar?.textSlots?.observation || ""),
    String(nar?.textSlots?.interpretation || ""),
    String(nar?.textSlots?.action || ""),
    String(nar?.textSlots?.uncertainty || ""),
  ].join(" ");

  for (const ph of truthPacket?.allowedClaimEnvelope?.forbiddenPhrases || []) {
    if (ph && joined.includes(String(ph))) failCodes.push("forbidden_phrase_contract");
  }
  for (const ph of FILLER_BLACKLIST) {
    if (joined.includes(ph)) failCodes.push("filler_blacklist");
  }
  const slotBundle = String(slotText + joined);
  if (
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "off_topic_redirect" &&
    intent !== "simple_parent_explanation" &&
    intent !== "parent_policy_refusal" &&
    intent !== "off_report_subject_clarification"
  ) {
    for (const hedge of truthPacket?.allowedClaimEnvelope?.requiredHedges || []) {
      if (hedge && !slotBundle.includes(String(hedge))) failCodes.push("missing_required_hedge");
    }
  }

  const dl = truthPacket?.derivedLimits || {};
  const hasNext = blocks.some((b) => b.type === "next_step");
  if (hasNext && (!dl.recommendationEligible || dl.recommendationIntensityCap === "RI0")) {
    failCodes.push("next_step_not_eligible");
  }

  const recOk = dl.recommendationEligible === true && dl.recommendationIntensityCap !== "RI0";
  if (!recOk && INELIGIBLE_HOME_ACTION_COMPOSED_RE.test(composedJoined)) {
    failCodes.push("ineligible_recommendation_wording");
  }

  if (!strengthFramingOk(truthPacket) && STRENGTH_HYPE_COMPOSED_RE.test(composedJoined)) {
    failCodes.push("strength_framing_not_allowed");
  }

  if (dl.cannotConcludeYet === true && PREMATURE_CONCLUSION_COMPOSED_RE.test(composedJoined)) {
    failCodes.push("truth_contradiction_premature_conclusion");
  }

  const interp = String(truthPacket?.interpretationScope || "executive").trim();
  if (interp === "confidence_uncertainty" && CONFIDENCE_UNCERTAINTY_CONTRADICTION_RE.test(composedJoined)) {
    failCodes.push("interpretation_scope_contradiction");
  }
  if (interp === "blocked_advance" && BLOCKED_ADVANCE_CONTRADICTION_RE.test(composedJoined)) {
    failCodes.push("interpretation_scope_contradiction");
  }

  if (interp === "weaknesses" && /(חוזק\s*יוצא\s*דופן|מצטיינים\s*במקצוע)/u.test(composedJoined)) {
    failCodes.push("interpretation_scope_contradiction");
  }

  if (intent === "what_is_going_well" && !strengthFramingOk(truthPacket) && STRENGTH_HYPE_COMPOSED_RE.test(composedJoined)) {
    failCodes.push("strength_framing_intent_mismatch");
  }

  if (dl.readiness === "insufficient" && /(מוכנים\s*לקידום|מקודמים\s*כבר\s*לשלב|מספיק\s*יציבים\s*לקידום\s*מיידי)/u.test(composedJoined)) {
    failCodes.push("truth_contradiction_readiness");
  }

  for (const b of blocks) {
    if (b.source === "contract_slot" && String(b.textHe || "").trim()) {
      const t = String(b.textHe).trim();
      if (!slotText.includes(t) && b.type !== "observation") {
        failCodes.push("contract_slot_mismatch");
        break;
      }
    }
  }

  if (!isApprovedFixedBoundaryCopy) {
    for (const re of CLINICAL_DIAGNOSIS_SURFACE_RES) {
      if (re.test(joined)) {
        failCodes.push("clinical_diagnosis_language");
        break;
      }
    }
    if (intent === "clinical_boundary" && CLINICAL_CERTAINTY_RE.test(joined)) {
      failCodes.push("clinical_certainty_language");
    }
  }

  for (const q of collectParentFacingOutputQualityIssues(joined, intent)) {
    failCodes.push(q);
  }

  const subjectQuestionCounts =
    truthPacket?.subjectQuestionCounts && typeof truthPacket.subjectQuestionCounts === "object"
      ? truthPacket.subjectQuestionCounts
      : null;
  if (
    subjectQuestionCounts &&
    intent !== "off_topic_redirect" &&
    intent !== "clinical_boundary" &&
    intent !== "sensitive_education_choice" &&
    intent !== "parent_policy_refusal"
  ) {
    if (textViolatesZeroEvidencePolicy(joined) || textViolatesZeroEvidencePolicy(composedJoined)) {
      failCodes.push("zero_evidence_forbidden_phrasing");
    }
    for (const seg of [joined, composedJoined]) {
      if (
        lineViolatesZeroEvidenceInsightPolicy(seg, subjectQuestionCounts) ||
        (lineMentionsZeroEvidenceSubjectHe(seg, subjectQuestionCounts) &&
          textViolatesZeroEvidencePolicy(seg))
      ) {
        failCodes.push("zero_evidence_subject_mention");
        break;
      }
    }
  }

  return {
    ok: failCodes.length === 0,
    failCodes,
    specificityScore: failCodes.length === 0 ? 80 : 40,
  };
}

/**
 * @param {object} response
 */
export function validateParentCopilotResponseV1(response) {
  /** @type {string[]} */
  const hardFails = [];
  const softFails = [];

  if (!response || typeof response !== "object") return { ok: false, hardFails: ["empty_response"] };

  if (response.schemaVersion !== "v1") hardFails.push("schema_version");
  if (response.audience !== "parent") hardFails.push("audience_lock");

  const rs = response.resolutionStatus;
  if (rs === "clarification_required") {
    if (!String(response.clarificationQuestionHe || "").trim()) hardFails.push("clarification_missing");
    if (response.answerBlocks?.length) hardFails.push("clarification_answer_blocks_non_empty");
    if (response.contractSourcesUsed?.length) hardFails.push("clarification_contract_sources_non_empty");
    if (response.suggestedFollowUp != null) hardFails.push("clarification_followup_non_null");
    if (response.quickActions?.length) hardFails.push("clarification_quick_actions_non_empty");
    if (response.fallbackUsed === true) hardFails.push("clarification_fallback_true");
  } else if (rs === "resolved") {
    if (!response.scopeType) hardFails.push("resolved_scope_type");
    if (!String(response.scopeId || "").trim()) hardFails.push("resolved_scope_id");
    if (!String(response.scopeLabel || "").trim()) hardFails.push("resolved_scope_label");
    const ab = Array.isArray(response.answerBlocks) ? response.answerBlocks : [];
    if (ab.length < 2) hardFails.push("resolved_answer_len");
    const hasObs = ab.some((b) => b.type === "observation");
    const hasMean = ab.some((b) => b.type === "meaning");
    if (!hasObs && !hasMean) hardFails.push("resolved_obs_meaning");
    const csu = Array.isArray(response.contractSourcesUsed) ? response.contractSourcesUsed : [];
    if (!csu.includes("contractsV1.narrative")) hardFails.push("resolved_missing_narrative_source");
    if (response.fallbackUsed === true) {
      for (const b of ab) {
        if (b.source !== "contract_slot") hardFails.push("fallback_non_slot_source");
      }
    }
    const allowedTypes = new Set(["observation", "meaning", "next_step", "caution", "uncertainty_reason"]);
    for (const b of ab) {
      if (!allowedTypes.has(String(b.type || ""))) hardFails.push("invalid_answer_block_family");
    }
    for (const tok of FORBIDDEN_PARENT_SURFACE_TOKENS) {
      const body = ab.map((x) => String(x.textHe || "")).join(" ").toLowerCase();
      if (tok && body.includes(tok.toLowerCase())) hardFails.push("resolved_forbidden_surface");
    }
    if (RAW_INTENSITY_RE.test(ab.map((x) => String(x.textHe || "")).join(" "))) hardFails.push("resolved_raw_intensity");
  } else {
    hardFails.push("resolution_status");
  }

  const vf = Array.isArray(response.validatorFailCodes) ? response.validatorFailCodes : [];
  if (response.validatorStatus === "pass" && vf.length) hardFails.push("pass_with_fail_codes");

  const ok = hardFails.length === 0;
  return { ok, hardFails, softFails };
}

export default { validateAnswerDraft, validateParentCopilotResponseV1 };
