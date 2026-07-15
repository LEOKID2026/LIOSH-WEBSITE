/**
 * Grounded LLM path for Parent Copilot.
 * This module is optional and must degrade safely to deterministic flow.
 */

import { getLlmGateDecision } from "./rollout-gates.js";
import { clinicalBoundaryJoinedFingerprintHe } from "./answer-composer.js";
import {
  callCopilotLlmPrimaryJson,
  callCopilotLlmOpenAiChatCompletionsJson,
  copilotLlmPrimaryProviderLabel,
  getCopilotLlmFallbackConfig,
  isTransientCopilotLlmFailure,
} from "./copilot-llm-client.js";
import { collectParentFacingOutputQualityIssues } from "./guardrail-validator.js";

/**
 * Try next OpenRouter candidate after unusable output / transient HTTP / model-not-found.
 * Does not apply after validateLlmDraft rejects a successfully parsed draft.
 */
function shouldTryNextFallbackCandidate(res) {
  if (!res || res.ok) return false;
  const r = String(res.reason || "");
  if (r === "invalid_json_output") return true;
  if (r === "empty_assistant_content") return true;
  if (r === "reasoning_only_no_json_content") return true;
  if (isTransientCopilotLlmFailure(res)) return true;
  const st = Number(res.httpStatus);
  if (st === 404) return true;
  return false;
}

/**
 * Non-safety `validateLlmDraft` failures where trying another fallback model may help.
 * Does not apply to clinical/safety/contract/raw-leak/thin-data contradiction/etc.
 * @param {string} reason
 */
export function shouldTryNextFallbackCandidateAfterValidationFailure(reason) {
  const r = String(reason || "").trim();
  /** @type {Set<string>} */
  const retryable = new Set([
    "llm_answer_too_short",
    /** Guardrail `main_focus_missing_practical_action` */
    "llm_main_focus_missing_practical_action",
    /** User-facing label alias (not emitted today; kept for forward compat) */
    "llm_missing_required_practical_action",
    "llm_malformed_hebrew_fragment",
    "llm_malformed_preposition_punctuation",
    /** Legacy / forward alias if surfaced under a different guardrail label */
    "llm_main_focus_missing_practical_magnitude",
    /** Intent-specific short answer for main_focus (guardrail-validator) */
    "llm_main_focus_answer_too_short",
  ]);
  return retryable.has(r);
}

const DEFAULT_TIMEOUT_MS = 9000;

const LLM_CLINICAL_DIAGNOSIS_RES = [
  /דיסלקציה|דיסלקסיה|דיסקלקוליה/u,
  /לקות\s*למידה/u,
  /הפרעת\s*קשב/u,
  /\bADHD\b/i,
  /האבחון\s*הוא/u,
  /האבחנה\s*היא/u,
  /(?:יש\s*לילד|לילד\s*יש).{0,64}(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD)/iu,
  /(?:דיסלקציה|דיסלקסיה|דיסקלקוליה|לקות\s*למידה|הפרעת\s*קשב|ADHD).{0,64}(?:יש\s*לילד|לילד\s*יש)/iu,
];

const LLM_CLINICAL_CERTAINTY_RE = /(בוודאות|חד[\s-]*משמעית|אין\s*ספק|ברור\s*ש)/u;

/**
 * @param {string} s
 */
function normalizeWsHe(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function env(name, fallback = "") {
  let raw;
  try {
    raw = typeof process !== "undefined" && process?.env ? process.env[name] : undefined;
  } catch {
    raw = undefined;
  }
  const v = String(raw ?? "").trim();
  return v || fallback;
}

/** Same predicate as truth-packet executive strength (subject-level wording). */
function utteranceAsksSubjectLevelStrength(u) {
  return /מקצוע|מקצועות|המקצוע\s+ה(חזק|טוב)|איזה\s+מקצוע|באיזה\s+מקצוע|מה\s+המקצוע/u.test(String(u || "").trim());
}

export function buildGroundedPrompt(utterance, truthPacket, parentIntent = "") {
  const nar = truthPacket?.contracts?.narrative?.textSlots || {};
  const dl = truthPacket?.derivedLimits || {};
  const globalQ =
    Math.max(
      0,
      Number(truthPacket?.surfaceFacts?.reportQuestionTotalGlobal) || 0,
      Number(truthPacket?.surfaceFacts?.questions) || 0,
    ) || 0;
  const intentLabel = String(parentIntent || "").trim();
  const facts = {
    parentIntent: intentLabel,
    scopeType: truthPacket.scopeType,
    scopeLabel: truthPacket.scopeLabel,
    questions: truthPacket?.surfaceFacts?.questions,
    accuracy: truthPacket?.surfaceFacts?.accuracy,
    observation: String(nar.observation || ""),
    interpretation: String(nar.interpretation || ""),
    action: String(nar.action || ""),
    uncertainty: String(nar.uncertainty || ""),
    cannotConcludeYet: !!dl.cannotConcludeYet,
    recommendationEligible: !!dl.recommendationEligible,
    recommendationIntensityCap: String(dl.recommendationIntensityCap || "RI0"),
    requiredHedges: Array.isArray(truthPacket?.allowedClaimEnvelope?.requiredHedges)
      ? truthPacket.allowedClaimEnvelope.requiredHedges
      : [],
    forbiddenPhrases: Array.isArray(truthPacket?.allowedClaimEnvelope?.forbiddenPhrases)
      ? truthPacket.allowedClaimEnvelope.forbiddenPhrases
      : [],
    reportQuestionTotalGlobal: globalQ,
  };
  // Per-intent guidance for parent-friendly structured answers
  const intentGuidance = (() => {
    switch (intentLabel) {
      case "what_is_going_well": {
        const u = String(utterance || "").trim();
        const asksMiktzoa = utteranceAsksSubjectLevelStrength(u);
        if (asksMiktzoa) {
          return [
            "השאלה מתייחסת למקצוע (רמת מקצוע), לא רק לנושא בודד.",
            "  בלוק observation: התחל במשפט כמו 'המקצוע שבו נראו התוצאות הטובות ביותר הוא [שם המקצוע בעברית]', ואז במידת הצורך 'ובעיקר בנושא [שם הנושא]' - רק מה שמופיע ב-FACTS_JSON.observation.",
            "  חובה: אל תשתמש במילה «התחום» בבלוקים - במקום זה «המקצוע» או פתיחה ישירה בשם המקצוע (למשל «באנגלית נראו התוצאות הטובות ביותר בתקופה הזו…»).",
            "  אסור במפורש ניסוחים כמו «התחום שבו נראים המספרים…» - זה לא מתאים כשההורה שאל על מקצוע.",
            "  אל תפתח בניסוח שמתחיל רק מנושא ספציפי (למשל «בנושא אוצר מילים...») כשהשאלה על מקצוע - קודם שם המקצוע, ואז הנושא הבולט בתוך המקצוע.",
            "  בלוק meaning: הסבר בקצרה למה זה חיובי לפי FACTS_JSON.interpretation. אפשר להזכיר אחוז דיוק אחד.",
            "  אל תרשום רשימה של כל המקצועות. אל תכתוב 'לפי הדוח, מופיעים:' או 'המקצועות שמופיעים'. אל תציג תחום כבעל תוצאות טובות יחסית אם הוא גם מופיע כמוקד לחיזוק בדוח.",
          ].join("\n");
        }
        return [
          "השאלה היא על איפה נראית התקדמות יחסית. המבנה הנדרש:",
          "  בלוק observation: התחל בניסוח כמו 'הנושא שבו נראו התוצאות הטובות ביותר הוא...' או 'ב... נראו תוצאות טובות יחסית' - ציין 1–2 תחומים ספציפיים מה-FACTS_JSON.observation בלבד.",
          "  בלוק meaning: הסבר בקצרה למה זה חיובי, ע\"פ ה-FACTS_JSON.interpretation. אפשר להזכיר אחוז דיוק אחד.",
          "  אל תרשום רשימה של כל המקצועות. אל תכתוב 'לפי הדוח, מופיעים:' או 'המקצועות שמופיעים'. אל תציג תחום כבעל תוצאות טובות יחסית אם הוא גם מופיע כמוקד לחיזוק בדוח.",
        ].join("\n");
      }
      case "what_is_still_difficult":
        return [
          "השאלה היא על תחומי קושי. המבנה הנדרש:",
          "  בלוק observation: התחל בניסוח ישיר כמו 'התחום שדורש חיזוק כרגע הוא...' או 'התחומים שדורשים חיזוק הם...' - ציין 1–2 תחומים ספציפיים מה-FACTS_JSON.observation.",
          "  בלוק meaning: הסבר בשפה רגועה, ללא מילים מפחידות, ע\"פ ה-FACTS_JSON.interpretation.",
          "  אל תאבחן. אל תגיד 'בעיה חמורה'. השתמש בטון רגוע ומעשי.",
        ].join("\n");
      case "what_is_most_important":
        return [
          "השאלה היא על מה הכי חשוב לתרגל השבוע. חובה למלא את המבנה הבא (ניסוח טבעי, שמות נושאים מלאים מ-FACTS_JSON.observation בלבד):",
          '  בלוק observation - משפט פתיחה ישיר במבנה: "השבוע כדאי להתמקד בעיקר ב-[שם נושא מלא] וב-[שם נושא מלא נוסף כשיש]."',
          "  בלוק meaning - משפט קצר אחד להסבר למה חשוב להתמקד בכל תחום שציינת (אם יש שני תחומים - שני משפטים קצרים).",
          '  חובה לכלול משפט פעולה ביתית מעשית (בתוך meaning, או משפט נוסף באותו בלוק): "מומלץ לתרגל בערך 10 דקות, 3 פעמים בשבוע, עם 5–8 שאלות קצרות בכל פעם."',
          "  אם FACTS_JSON מאפשר בלוק next_step - אפשר לשים שם את משפט הפעולה; אם לא - עדיין חובה את אותו משפט (או ניסוח קרוב עם 10 דקות, 3 פעמים, 5–8 שאלות, תרגול קצר, בכל פעם) בתוך הטקסט.",
          "  אסור נקודה או פיסוק מיד אחרי מילת יחס (ב, על, עם, של, ל) לפני שם הנושא - אסור \"ב.\", \"ב .\", \"ב .\", \"ב-.\", \"ב:.\". המשך מיד אחרי \"ב\" עם שם הנושא המלא.",
          "  אל תפתח ב\"נראה שכדאי להתמקד ב\" ואז נקודה או מקף לפני הנושא. אל תכתוב 'אפשר לסדר מה חשוב קודם' או 'זה מה שהדוח נותן כרגע'.",
        ].join("\n");
      case "what_to_do_today":
      case "what_to_do_this_week":
        return [
          "השאלה היא על מה לעשות בבית. המבנה הנדרש:",
          "  בלוק observation: התחל ב'בבית כדאי לתרגל...' - ציין נושא ספציפי מה-FACTS_JSON.observation.",
          "  בלוק meaning: תוכנית מעשית קצרה: 5–10 דקות ביום, איזה נושא, סוג התרגול.",
          facts.recommendationEligible && facts.recommendationIntensityCap !== "RI0"
            ? "  בלוק next_step: צעד ספציפי אחד פשוט לביצוע (לפי FACTS_JSON.action)."
            : "  אסור לכלול בלוק next_step.",
          "  אל תכתוב 'אפשר לסדר' או 'זה מה שהדוח נותן'.",
        ].join("\n");
      case "is_intervention_needed":
        return [
          "השאלה היא אם יש סיבה לדאגה. המבנה הנדרש:",
          "  בלוק observation: התחל ב'בשלב הזה...' - סקירה רגועה של מצב הדוח לפי FACTS_JSON.observation.",
          "  בלוק meaning: הסבר מה המצב ומה הצעד הבא המומלץ, לפי FACTS_JSON.interpretation.",
          "  אל תאבחן. אל תגרום לפאניקה. השתמש בטון רגוע ומעשי.",
          '  פתח בטון רגוע ומקצועי. אם יש מספיק נתונים, אפשר לפתוח בנוסח: "בשלב זה אין סיבה לדאגה, אבל...". לאחר מכן חובה להמשיך לפי FACTS_JSON בלבד: אם יש ממצא לימודי מבוסס (לפי FACTS_JSON.interpretation), הצג אותו בצורה ברורה וזהירה והצע צעד לימודי מעשי; אם אין ממצא משמעותי בדוח, אפשר להרגיע בצורה קצרה. אל תאבחן, אל תשתמש בשפה רפואית/פסיכולוגית, ואל תסתיר ממצא לימודי שקיים בדוח.',
          "  אסור לכתוב \"לא להיכנס ללחץ\", אסור \"אין מה לדאוג\" בניסוח מוחלט, ואסור \"הכול בסדר\" אם יש ממצא לימודי בדוח.",
        ].join("\n");
      case "ask_subject_specific":
      case "ask_topic_specific":
        return [
          "השאלה היא על מקצוע או נושא ספציפי. המבנה הנדרש:",
          "  בלוק observation: ציין רק מה שמופיע על הנושא הספציפי ב-FACTS_JSON.observation.",
          "  בלוק meaning: הסבר מה המשמעות; כל הצעה מעשית קצרה מותרת כאן או במשפט נוסף באותו בלוק - לפי FACTS_JSON.interpretation/action רק אם מופיעים שם.",
          "  אם לנושא הספציפי יש מעט שאלות - אפשר לציין זאת בזהירות רק לנושא הזה.",
          facts.recommendationEligible && facts.recommendationIntensityCap !== "RI0"
            ? "  אופציונלי: בלוק next_step - צעד ביתי קצר אחד לפי FACTS_JSON.action בלבד."
            : "  אסור לכלול בלוק next_step - המלצות מעשיות רק בתוך בלוק meaning (FACTS_JSON מאשר המלצות רק כש-recommendationEligible=true ו-cap לא RI0).",
        ].join("\n");
      default:
        return [
          "ענה ישירות על שאלת ההורה. המבנה הנדרש:",
          "  בלוק observation: תשובה ישירה קצרה, מבוססת על FACTS_JSON.observation.",
          "  בלוק meaning: נקודה מעשית אחת מ-FACTS_JSON.interpretation.",
        ].join("\n");
    }
  })();

  const uTrim = String(utterance || "").trim();
  const subjectStrengthStyleRule =
    intentLabel === "what_is_going_well" && utteranceAsksSubjectLevelStrength(uTrim)
      ? "חוק סגנון לשאלה זו: ההורה שואל על מקצוע (חזק / הכי טוב). אסור להשתמש במילה «התחום» בתשובה - השתמש ב«המקצוע» או פתח ישירות בשם המקצוע. דוגמאות לפתיחה תקינה: «המקצוע שבו נראו התוצאות הטובות ביותר הוא אנגלית, ובעיקר בנושא אוצר מילים» או «באנגלית נראו התוצאות הטובות ביותר בתקופה הזו, בעיקר בנושא אוצר מילים». אסור: «התחום שבו נראים המספרים…»."
      : "";

  return [
    "אתה עוזר הורים מקצועי. תענה בעברית בלבד.",
    "השתמש רק בעובדות מה-FACTS_JSON. אסור להמציא עובדות שאינן בו.",
    "כתוב בשפה פשוטה, ישירה, וידידותית להורה - לא בשפת מערכת.",
    "אל תשתמש בביטויים: 'לפי הדוח, מופיעים:', 'המקצועות שמופיעים:', 'מוקדים עם ניסוח', 'זה מה שהדוח נותן כרגע', 'אפשר לסדר מה חשוב קודם'.",
    "ניסוח טבעי לדוגמה: 'השבוע כדאי להתמקד בעיקר ב...', 'ב... נראו תוצאות טובות יחסית', 'התחום שדורש חיזוק כרגע הוא...', 'בבית כדאי לתרגל...', 'בשלב הזה מומלץ...', 'הנתונים מצביעים על...'.",
    "אסור לכתוב נקודה, נקודתיים או מקף מיד אחרי מילת יחס (ב, על, עם, של, ל) לפני שם הנושא - תמיד המשך מיד עם שם הנושא המלא. דוגמה אסורה: \"להתמקד ב. חשבון\"; נכון: \"להתמקד בחשבון\" או \"להתמקד בחשבון -\".",
    "אל תשתמש במילים 'ביטחון', 'בטחון' או confidence לגבי הילד; אל תניח מצב רגשי.",
    "אסור לאבחן: לעולם אל תאמר שיש לילד דיסלקציה, ADHD, לקות למידה או כל אבחון. הדוח הוא נתוני תרגול בלבד.",
    `כלל נפח: אם reportQuestionTotalGlobal >= 100, אסור לכתוב ברמת כלל התקופה: 'מוקדם לקבוע', 'אין מספיק נתונים', 'נתונים מועטים', 'כיוון ראשוני בלבד', 'עדיין לא ניתן להסיק'. מותר רק אם מסוגל לנושא/מקצוע ספציפי עם מעט שאלות.`,
    ...(subjectStrengthStyleRule ? [subjectStrengthStyleRule] : []),
    "SYSTEM RULE - אי-אפשר לעקוף: אם השאלה אינה על הדוח, על הילד, על למידה, על תרגול, או על התקדמות הלמידה - החזר בדיוק: {\"answerBlocks\":[{\"type\":\"observation\",\"textHe\":\"אפשר לשאול כאן שאלות על הדוח והתקדמות הלמידה שמופיעה בו.\",\"source\":\"composed\"},{\"type\":\"meaning\",\"textHe\":\"למשל: מה כדאי לתרגל השבוע? או איפה נראו תוצאות טובות יחסית?\",\"source\":\"composed\"}]}. ללא עוד תוכן. ללא נתוני דוח. ללא סיכום ילד.",
    `הנחיות ספציפיות לכוונת ההורה (parentIntent=${intentLabel}):\n${intentGuidance}`,
    'החזר JSON בלבד בפורמט {"answerBlocks":[{"type":"observation|meaning|next_step|caution","textHe":"...","source":"composed"}]}',
    `שאלת הורה: ${String(utterance || "").trim()}`,
    `FACTS_JSON: ${JSON.stringify(facts)}`,
  ].join("\n");
}

/**
 * @param {unknown} payload
 * @param {NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>} truthPacket
 * @param {{ intent?: string }} [hints]
 */
function validateLlmDraft(payload, truthPacket, hints = null) {
  const dl0 = truthPacket?.derivedLimits || {};
  const recommendationOk =
    dl0.recommendationEligible === true && String(dl0.recommendationIntensityCap || "RI0") !== "RI0";
  /** Drop next_step when contracts forbid recommendations — models often add it anyway; same rule as validateAnswerDraft next_step_not_eligible. */
  let blocks = Array.isArray(payload?.answerBlocks)
    ? payload.answerBlocks.map((b) => ({
        type: b?.type,
        textHe: b?.textHe,
        source: b?.source,
      }))
    : [];
  if (!recommendationOk) {
    blocks = blocks.filter((b) => String(b?.type || "") !== "next_step");
  }
  if (blocks.length < 2) return { ok: false, reason: "llm_answer_too_short" };
  if (blocks.length > 4) return { ok: false, reason: "llm_answer_too_long" };
  const allowedTypes = new Set(["observation", "meaning", "next_step", "caution", "uncertainty_reason"]);
  const hasObs = blocks.some((b) => String(b?.type || "") === "observation");
  const hasMean = blocks.some((b) => String(b?.type || "") === "meaning");
  if (!hasObs && !hasMean) return { ok: false, reason: "llm_missing_observation_or_meaning" };

  const joined = blocks.map((b) => String(b?.textHe || "").trim()).join(" ");
  const intent = String(hints?.intent || "").trim();
  const joinedNorm = normalizeWsHe(joined);
  const boundaryNorm = normalizeWsHe(clinicalBoundaryJoinedFingerprintHe());
  const isApprovedClinicalBoundaryCopy = joinedNorm === boundaryNorm;

  if (!isApprovedClinicalBoundaryCopy) {
    for (const re of LLM_CLINICAL_DIAGNOSIS_RES) {
      if (re.test(joined)) return { ok: false, reason: "llm_clinical_diagnosis_language" };
    }
    if (intent === "clinical_boundary" && LLM_CLINICAL_CERTAINTY_RE.test(joined)) {
      return { ok: false, reason: "llm_clinical_certainty_language" };
    }
  }

  if (intent !== "clinical_boundary") {
    for (const hedge of truthPacket?.allowedClaimEnvelope?.requiredHedges || []) {
      if (hedge && !joined.includes(String(hedge))) return { ok: false, reason: "llm_missing_required_hedge" };
    }
  }
  for (const b of blocks) {
    const type = String(b?.type || "");
    const textHe = String(b?.textHe || "").trim();
    if (!allowedTypes.has(type) || !textHe) return { ok: false, reason: "llm_invalid_block_shape" };
    for (const ph of truthPacket?.allowedClaimEnvelope?.forbiddenPhrases || []) {
      if (ph && textHe.includes(String(ph))) return { ok: false, reason: "llm_forbidden_phrase" };
    }
  }
  const qualityIssues = collectParentFacingOutputQualityIssues(joined, intent);
  if (qualityIssues.length) {
    return { ok: false, reason: `llm_${qualityIssues[0]}` };
  }

  return {
    ok: true,
    draft: {
      answerBlocks: blocks.map((b) => ({
        type: String(b.type),
        textHe: String(b.textHe || "").trim(),
        source: "composed",
      })),
    },
  };
}

/**
 * @param {{ utterance: string; truthPacket: NonNullable<ReturnType<typeof import("./truth-packet-v1.js").buildTruthPacketV1>>; parentIntent?: string }} input
 */
function pickLlmFailureFields(response) {
  return {
    ...(response.httpStatus != null ? { httpStatus: response.httpStatus } : {}),
    ...(typeof response.geminiErrorBody === "string" ? { geminiErrorBody: response.geminiErrorBody } : {}),
    ...(typeof response.geminiErrorSummary === "string" ? { geminiErrorSummary: response.geminiErrorSummary } : {}),
    ...(response.geminiErrorParsed !== undefined ? { geminiErrorParsed: response.geminiErrorParsed } : {}),
    ...(typeof response.llmRetryCount === "number" ? { llmRetryCount: response.llmRetryCount } : {}),
    ...(typeof response.invalidJsonRawPreview === "string" && String(response.invalidJsonRawPreview).trim()
      ? { invalidJsonRawPreview: String(response.invalidJsonRawPreview).slice(0, 3000) }
      : {}),
    ...(typeof response.actualModel === "string" && String(response.actualModel).trim()
      ? { actualModel: String(response.actualModel).trim() }
      : {}),
    ...(Array.isArray(response.fallbackAttempts) && response.fallbackAttempts.length
      ? { fallbackAttempts: response.fallbackAttempts.map((a) => ({ ...a })) }
      : {}),
  };
}

/**
 * @param {number} timeoutMs
 * @param {(signal: AbortSignal) => Promise<unknown>} fn
 */
async function withAbortTimeout(timeoutMs, fn) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function maybeGenerateGroundedLlmDraft(input) {
  const gate = getLlmGateDecision();
  if (!gate.enabled) {
    return {
      ok: false,
      reason: "llm_disabled_by_rollout_gate",
      gateReasonCodes: gate.reasonCodes,
    };
  }
  const primaryProvider = copilotLlmPrimaryProviderLabel();
  const prompt = buildGroundedPrompt(input.utterance, input.truthPacket, String(input?.parentIntent || ""));
  const timeoutMs = Number(env("PARENT_COPILOT_LLM_TIMEOUT_MS", String(DEFAULT_TIMEOUT_MS))) || DEFAULT_TIMEOUT_MS;
  const intentHint = String(input?.parentIntent || "").trim();

  try {
    const primaryRes = await withAbortTimeout(timeoutMs, (sig) => callCopilotLlmPrimaryJson(sig, prompt));
    const primaryReason = primaryRes.ok ? "ok" : String(primaryRes.reason || "llm_provider_error");

    if (primaryRes.ok) {
      const validated = validateLlmDraft(primaryRes.payload, input.truthPacket, { intent: intentHint });
      if (!validated.ok) {
        return {
          ok: false,
          reason: validated.reason || "llm_validation_failed",
          primaryProvider,
          primaryReason: "ok",
          finalProvider: primaryProvider,
        };
      }
      return {
        ok: true,
        draft: validated.draft,
        provider: primaryProvider,
        finalProvider: primaryProvider,
        primaryProvider,
        primaryReason: "ok",
        ...(typeof primaryRes.llmRetryCount === "number" ? { llmRetryCount: primaryRes.llmRetryCount } : {}),
      };
    }

    if (!isTransientCopilotLlmFailure(primaryRes)) {
      return {
        ok: false,
        reason: primaryRes.reason || "llm_provider_error",
        primaryProvider,
        primaryReason,
        finalProvider: primaryProvider,
        ...pickLlmFailureFields(primaryRes),
      };
    }

    const fbCfg = getCopilotLlmFallbackConfig();
    if (!fbCfg) {
      return {
        ok: false,
        reason: primaryRes.reason || "llm_provider_error",
        primaryProvider,
        primaryReason,
        finalProvider: primaryProvider,
        ...pickLlmFailureFields(primaryRes),
      };
    }

    const fallbackProvider = fbCfg.telemetryFallbackProvider;
    const fallbackModels = fbCfg.fallbackModels;
    /** @type {{ model: string; reason: string; httpStatus?: number; actualModel?: string; invalidJsonRawPreview?: string }[]} */
    const fallbackAttempts = [];

    const candidates =
      Array.isArray(fallbackModels) && fallbackModels.length ? fallbackModels : [fbCfg.model];

    for (let i = 0; i < candidates.length; i++) {
      const candidateModel = candidates[i];
      const fallbackRes = await withAbortTimeout(timeoutMs, (sig) =>
        callCopilotLlmOpenAiChatCompletionsJson(sig, prompt, {
          baseUrl: fbCfg.baseUrl,
          apiKey: fbCfg.apiKey,
          model: candidateModel,
          providerKind: fbCfg.kind,
        }),
      );

      const resolvedRouteModel =
        typeof fallbackRes.actualModel === "string" && fallbackRes.actualModel.trim()
          ? fallbackRes.actualModel.trim()
          : candidateModel;

      if (!fallbackRes.ok) {
        fallbackAttempts.push({
          model: candidateModel,
          reason: String(fallbackRes.reason || "error"),
          ...(fallbackRes.httpStatus != null ? { httpStatus: Number(fallbackRes.httpStatus) } : {}),
          actualModel: resolvedRouteModel,
          ...(typeof fallbackRes.invalidJsonRawPreview === "string" && fallbackRes.invalidJsonRawPreview.trim()
            ? { invalidJsonRawPreview: String(fallbackRes.invalidJsonRawPreview).slice(0, 3000) }
            : {}),
        });
        const tryNextNetwork = shouldTryNextFallbackCandidate(fallbackRes) && i < candidates.length - 1;
        if (tryNextNetwork) continue;
        return {
          ok: false,
          reason: fallbackRes.reason || "llm_fallback_provider_error",
          primaryProvider,
          primaryReason,
          fallbackProvider,
          fallbackModels,
          fallbackAttempts,
          fallbackReason: String(fallbackRes.reason || "llm_fallback_provider_error"),
          finalProvider: fallbackProvider,
          ...pickLlmFailureFields(fallbackRes),
        };
      }

      const validatedFb = validateLlmDraft(fallbackRes.payload, input.truthPacket, { intent: intentHint });
      if (validatedFb.ok) {
        fallbackAttempts.push({
          model: candidateModel,
          reason: "ok",
          ...(fallbackRes.httpStatus != null ? { httpStatus: Number(fallbackRes.httpStatus) } : {}),
          actualModel: resolvedRouteModel,
        });
        return {
          ok: true,
          draft: validatedFb.draft,
          provider: resolvedRouteModel,
          finalProvider: resolvedRouteModel,
          primaryProvider,
          primaryReason,
          fallbackProvider,
          fallbackModels,
          fallbackAttempts,
          fallbackReason: "ok",
        };
      }

      const vr = validatedFb.reason || "llm_validation_failed";
      fallbackAttempts.push({
        model: candidateModel,
        reason: `validator_rejected:${vr}`,
        ...(fallbackRes.httpStatus != null ? { httpStatus: Number(fallbackRes.httpStatus) } : {}),
        actualModel: resolvedRouteModel,
      });

      const tryNextQuality =
        shouldTryNextFallbackCandidateAfterValidationFailure(vr) && i < candidates.length - 1;
      if (tryNextQuality) continue;

      return {
        ok: false,
        reason: vr,
        primaryProvider,
        primaryReason,
        fallbackProvider,
        fallbackModels,
        fallbackAttempts,
        fallbackReason: vr,
        finalProvider: resolvedRouteModel,
      };
    }

  } catch (error) {
    return {
      ok: false,
      reason: `llm_exception:${String(error?.message || error || "unknown")}`,
      primaryProvider,
      primaryReason: "exception",
      finalProvider: primaryProvider,
    };
  }
}

export default { maybeGenerateGroundedLlmDraft, shouldTryNextFallbackCandidateAfterValidationFailure };
