/**
 * Phase 4 (approved scope): NarrativeContract only.
 * Deterministic gate-to-text binding for parent-facing wording.
 */

import { pickVariant } from "../parent-report-language/variants.js";
import {
  buildSkillDetailLimitationUncertaintyHe,
  hasTopicLevelEvidence,
  TOPIC_EVIDENCE_THRESHOLDS,
} from "../parent-report-topic-evidence.js";
import {
  resolveEngineDecisionUncertaintyText,
} from "../learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import {
  EDC_DECISION_FIELD,
  ED_CLEAR_TOPIC_GAP,
  ES_STRONG,
  readEngineDecisionCode,
  readTopicEngineContract,
} from "../learning-pattern-decision/engine-decision-codes.js";

export const NARRATIVE_CONTRACT_VERSION = "v1";

export const WORDING_ENVELOPES = Object.freeze(["WE0", "WE1", "WE2", "WE3", "WE4"]);
export const HEDGE_LEVELS = Object.freeze(["none", "light", "mandatory"]);
export const ALLOWED_SECTIONS = Object.freeze(["summary", "finding", "recommendation", "limitations"]);
export const RECOMMENDATION_INTENSITY = Object.freeze(["RI0", "RI1", "RI2", "RI3"]);

const RI_RANK = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 };
const ENVELOPE_CAP = { WE0: "RI0", WE1: "RI1", WE2: "RI1", WE3: "RI2", WE4: "RI3" };
const ENVELOPE_HEDGE = { WE0: "mandatory", WE1: "mandatory", WE2: "light", WE3: "light", WE4: "none" };

const REQUIRED_HEDGES_BY_LEVEL = {
  none: [],
  light: ["נכון לעכשיו", "כדאי להמשיך לעקוב"],
  mandatory: ["בשלב זה", "עדיין מוקדם לקבוע"],
};

const FORBIDDEN_PHRASES = Object.freeze([
  "בטוח לחלוטין",
  "בוודאות מלאה",
  "ללא ספק בכלל",
  "חד משמעית",
]);

function normalizeTopicKey(v) {
  const s = String(v ?? "").trim();
  return s || "__unknown_topic__";
}

function normalizeSubjectId(v) {
  const s = String(v ?? "").trim();
  return s || "__unknown_subject__";
}

function normalizeDisplayName(v) {
  const s = String(v ?? "").trim();
  return s || "הנושא";
}

function normalizeReadiness(value) {
  const r = String(value || "").trim().toLowerCase();
  if (r === "ready") return "ready";
  if (r === "forming" || r === "partial" || r === "moderate") return "forming";
  return "insufficient";
}

function normalizeConfidenceBand(value) {
  const c = String(value || "").trim().toLowerCase();
  if (c === "high") return "high";
  if (c === "medium" || c === "moderate") return "medium";
  return "low";
}

function normalizeDecisionTier(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.max(0, Math.min(4, Math.round(n)));
}

function normalizeRecommendationIntensity(value) {
  const key = String(value || "").trim().toUpperCase();
  if (RECOMMENDATION_INTENSITY.includes(key)) return key;
  if (key === "LIGHT") return "RI1";
  if (key === "FOCUSED") return "RI2";
  if (key === "TARGETED") return "RI3";
  return "RI0";
}

function deriveCannotConcludeYet(input) {
  if (input?.cannotConcludeYet === true) return true;
  if (input?.suppressAggressiveStep === true) return true;
  if (input?.contractsV1?.decision?.cannotConcludeYet === true) return true;
  const forbidden = Array.isArray(input?.contractsV1?.recommendation?.forbiddenBecause)
    ? input.contractsV1.recommendation.forbiddenBecause
    : [];
  return forbidden.includes("cannot_conclude_yet");
}

function deriveRecommendationEligibility(input) {
  const rec = input?.contractsV1?.recommendation;
  if (rec && typeof rec === "object") return !!rec.eligible;
  return false;
}

function deriveEnvelope(input) {
  const q = Math.max(
    0,
    Math.round(Number(input?.questions ?? input?.q ?? input?.contractsV1?.evidence?.questionCount) || 0),
  );
  const acc = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(input?.accuracy ?? input?.contractsV1?.evidence?.accuracyPct ?? input?.contractsV1?.evidence?.accuracy) ||
          0,
      ),
    ),
  );
  const readiness = normalizeReadiness(input?.contractsV1?.readiness?.readiness);
  const confidenceBand = normalizeConfidenceBand(input?.contractsV1?.confidence?.confidenceBand);
  const decisionTier = normalizeDecisionTier(input?.contractsV1?.decision?.decisionTier);
  const cannotConcludeYet = deriveCannotConcludeYet(input);
  const eligible = deriveRecommendationEligibility(input);
  const recIntensity = normalizeRecommendationIntensity(input?.contractsV1?.recommendation?.intensity);

  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsHighVolume && !cannotConcludeYet) {
    if (acc <= 54) return "WE1";
    if (acc < 75) return "WE2";
    if (eligible && readiness === "ready" && confidenceBand === "high" && RI_RANK[recIntensity] >= 2 && acc >= 78) {
      return "WE4";
    }
    if (confidenceBand === "high" && decisionTier >= 2 && acc >= 70) return "WE3";
    return "WE2";
  }
  if (
    q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate &&
    hasTopicLevelEvidence(q) &&
    !cannotConcludeYet &&
    readiness !== "insufficient"
  ) {
    if (cannotConcludeYet) return "WE1";
    if (confidenceBand === "low") return "WE2";
    if (acc <= 54) return "WE1";
    if (acc < 75) return "WE2";
    if (eligible && readiness === "ready" && confidenceBand === "high" && acc >= 78) return "WE4";
    return "WE3";
  }

  if (cannotConcludeYet || readiness === "insufficient" || confidenceBand === "low") return "WE0";
  if (readiness === "forming" || decisionTier <= 1) return "WE1";
  if (decisionTier <= 2 || confidenceBand === "medium") return "WE2";
  if (eligible && readiness === "ready" && confidenceBand === "high" && RI_RANK[recIntensity] >= 2) return "WE4";
  return "WE3";
}

function buildObservationSlot(displayName, q, acc, seed) {
  if (q <= 0) {
    return pickVariant(seed, [
      `ב${displayName} יש עדיין מעט מדי תרגול בתקופה שנבחרה כדי לדעת איך זה באמת הולך.`,
      `ב${displayName} רואים בינתיים רק מעט ניסיונות - זה בסדר; נוסיף עוד קצת ונחזור לזה.`,
      `ב${displayName} עדיין מעט תרגול בתקופה שנבחרה, ולכן נשארים עם ניסוח זהיר.`,
    ]);
  }
  return pickVariant(seed, [
    `ב${displayName} בתקופה שנבחרה יש ${q} שאלות, עם דיוק של כ ${acc}%.`,
    `ב${displayName} נאספו ${q} שאלות בתקופה, ורמת הדיוק סביב ${acc}%.`,
    `ב${displayName} נאספו ${q} שאלות בתקופה, עם דיוק ממוצע של כ ${acc}%.`,
  ]);
}

function buildInterpretationSlot(envelope, cannotConcludeYet, seed, q = 0, acc = 0) {
  if (cannotConcludeYet || envelope === "WE0") {
    return pickVariant(seed, [
      "עדיין מוקדם לקבוע כאן כיוון ברור - נמשיך לעקוב אחרי התרגול.",
      "זה מוקדם לנסח סיכום סופי; נוסיף עוד קצת תרגול ונראה איך זה נשמר.",
      "עדיין אין מספיק נתונים לקבוע כיוון ברור - נמשיך לאט ובזהירות.",
    ]);
  }
  if (envelope === "WE1") {
    const qWeak = Math.max(0, Math.round(Number(q) || 0));
    const accWeak = Math.max(0, Math.min(100, Math.round(Number(acc) || 0)));
    if (qWeak >= 8 && accWeak <= 54) {
      return pickVariant(seed, [
        "יש כאן מספיק תרגול כדי לראות דפוס, אבל הדיוק עדיין נמוך יחסית - זה מצב שדורש חיזוק ממוקד.",
        "נאספו מספיק שאלות לתמונה ראשונית, אך התוצאות עדיין מצביעות על קושי - כדאי חיזוק ממוקד לפני שמסמנים את הנושא כיציב.",
        "הנתון מראה פעילות בתקופה, אבל הדיוק נמוך יחסית - נשארים עם ניסוח זהיר ותרגול ממוקד.",
      ]);
    }
    return pickVariant(seed, [
      "מתחילים לראות סימנים ראשונים לכיוון, ועדיין צריך עוד קצת תרגול לפני שקובעים כיוון אחד.",
      "נשמע שיש כאן התחלה טובה, אבל עדיין עדיף לחזק עוד קצת לפני שקובעים כיוון ברור.",
      "זו תמונה ראשונית בלבד, ועדיין מוקדם לסיכום חד.",
    ]);
  }
  if (envelope === "WE2") {
    return pickVariant(seed, [
      "יש כאן כיוון עבודה הגיוני, ונעדיף לראות את זה חוזר עוד פעם לפני שמחמירים בקביעת כיוון.",
      "הדוח נראה מתקדם לטובה, וכדאי לוודא שזה לא מקרה חד פעמי.",
      "הכיוון חיובי יחסית; נשארים עם חיזוק קצר וברור לפני שקובעים שהנושא יציב.",
    ]);
  }
  if (envelope === "WE3") {
    return pickVariant(seed, [
      "הכיוון נראה יציב לאורך התקופה - מספיק להמשיך בתרגול שגרתי.",
      "נראה שהביצוע נשמר טוב יחסית לתקופה הזו, ונמשיך בעדינות לעקוב.",
      "יש כאן יציבות טובה יחסית בתוצאות; נמשיך לעודד ולבדוק מדי פעם שהכול נשמר.",
    ]);
  }
  // Grammar/claims fix: the two removed variants asserted attention/fatigue/pressure
  // ("קשב", "עייפות", "לחץ") with zero corresponding evidence input in this contract
  // (no attention, fatigue, or pressure signal is computed anywhere above). Kept only
  // the WE4 variant whose claim (stability over time) is actually backed by the q/acc
  // evidence gate that produced this envelope.
  return pickVariant(seed, [
    "ניכר כאן כיוון חזק יחסית; נמשיך באותו קצב ונוודא שההצלחה חוזרת לאורך זמן.",
    "יש כאן יציבות טובה יחסית בתוצאות; נמשיך מדי פעם לבדוק שהכול נשמר גם בהמשך.",
    "הדוח מצביע על ביצוע יציב יחסית בתקופה הזו, ונמשיך לעקוב מדי פעם כדי לוודא שזה נשמר.",
  ]);
}

function buildActionSlot(capIntensity, eligible, seed) {
  if (!eligible || capIntensity === "RI0") return null;
  if (capIntensity === "RI1") {
    return pickVariant(seed, [
      "כדאי תרגול קצר וממוקד באותה רמה, ואז לבדוק אם באמת כדאי לשנות משהו.",
      "נעשה עוד חזרה קצרה וברורה ברמה הנוכחית, לפני שמנסים קפיצה קטנה קדימה.",
      "כדאי להמשיך לתרגל באותה רמת קושי, ואז לבדוק שוב אם מתאים להתקדם.",
    ]);
  }
  if (capIntensity === "RI2") {
    return pickVariant(seed, [
      "כדאי חיזוק ממוקד, ואז ניסיון קצר בלי הכוונה באמצע, לפני שמעלים רמת קושי.",
      "בואו נתרגל ממוקד ואז נבדוק כמה שאלות קצרות בעצמאות, לפני שמקדמים.",
      "מוסיפים חיזוק קצר, ובודקים עצמאות קצרה, ורק אז בודקים התקדמות.",
    ]);
  }
  return pickVariant(seed, [
    "אפשר לשקול צעד התקדמות מדוד בנושא הספציפי בלבד.",
    "ניתן לשקול התקדמות קטנה ומבוקרת בנושא הזה בלבד.",
    "אפשר לעשות צעד התקדמות זהיר ומוגבל רק לנושא הזה.",
  ]);
}

function buildUncertaintySlot(hedgeLevel, seed, questionCount = 0) {
  const q = Math.max(0, Math.floor(Number(questionCount) || 0));
  if (q >= 50) return null;
  if (q >= 20 && hedgeLevel === "mandatory") return null;
  if (hedgeLevel === "mandatory") {
    return pickVariant(seed, [
      "עדיין מוקדם לקבוע כאן דבר סופי; ממשיכים עם תרגול קצר ורגיל ובודקים שוב בהמשך.",
      "עדיין מוקדם לקבוע כיוון - כדאי לאסוף עוד נתוני תרגול ואז לבדוק שוב.",
      "בשלב הזה עדיין מוקדם לקבוע כיוון סופי; נמשיך לאסוף עוד נתוני תרגול לפני שמחליטים.",
    ]);
  }
  if (hedgeLevel === "light") {
    return pickVariant(seed, [
      "נכון לעכשיו כדאי להמשיך לתרגל ולשים לב, ולבדוק שוב אחרי עוד קצת.",
      "כדאי לבדוק שוב אחרי עוד תרגול קצר, כדי לוודא שהכיוון נשמר לפני שמחמירים בקביעת כיוון.",
      "נעשה עוד תרגול קצר ואז נחזור לזה - בעיניים פתוחות ובלי למהר.",
    ]);
  }
  return null;
}

/**
 * @param {object} input
 */
export function buildNarrativeContractV1(input) {
  const topicKey = normalizeTopicKey(input?.topicKey || input?.topicRowKey);
  const subjectId = normalizeSubjectId(input?.subjectId);
  const displayName = normalizeDisplayName(input?.displayName);
  const qRaw = Math.max(0, Number(input?.questions ?? input?.q) || 0);
  const accRaw = Math.max(0, Math.min(100, Math.round(Number(input?.accuracy) || 0)));
  const ev =
    input?.contractsV1?.evidence && typeof input.contractsV1.evidence === "object"
      ? input.contractsV1.evidence
      : null;
  const qFromEv =
    ev && Number.isFinite(Number(ev.questionCount)) ? Math.max(0, Math.round(Number(ev.questionCount))) : null;
  const accFromEv =
    ev && Number.isFinite(Number(ev.accuracyPct))
      ? Math.max(0, Math.min(100, Math.round(Number(ev.accuracyPct))))
      : null;
  const q = qFromEv != null ? qFromEv : qRaw;
  const acc = accFromEv != null ? accFromEv : accRaw;
  const envelope = deriveEnvelope(input);
  const hedgeLevel = ENVELOPE_HEDGE[envelope] || "mandatory";
  const cannotConcludeYet = deriveCannotConcludeYet(input);
  const recommendationEligible = deriveRecommendationEligibility(input);
  const existingIntensity = normalizeRecommendationIntensity(input?.contractsV1?.recommendation?.intensity);
  const capIntensity = ENVELOPE_CAP[envelope] || "RI0";
  const cappedIntensity = RI_RANK[existingIntensity] > RI_RANK[capIntensity] ? capIntensity : existingIntensity;
  const baseSeed = `${topicKey}|${subjectId}|${displayName}|${envelope}|${q}|${acc}|${cappedIntensity}|${hedgeLevel}`;
  const hasSubskillMetadata = !!(
    input?.hasSubskillMetadata ||
    input?.skillDetailAvailable ||
    input?.contractsV1?.evidence?.skillBreakdownAvailable
  );
  let uncertainty = buildUncertaintySlot(hedgeLevel, `${baseSeed}:unc`, q);
  const topicEngineContract = readTopicEngineContract(input);
  const decisionCode =
    readEngineDecisionCode(topicEngineContract) ||
    (input && typeof input === "object" ? String(input[EDC_DECISION_FIELD] || "") : "");
  const evidenceStrength = String(
    input?.evidenceStrength || topicEngineContract?.evidenceStrength || "",
  );
  if (q >= 20 || evidenceStrength === ES_STRONG || decisionCode === ED_CLEAR_TOPIC_GAP) {
    const resolved = resolveEngineDecisionUncertaintyText(q, evidenceStrength, decisionCode);
    if (resolved) uncertainty = resolved;
  }
  if (!String(uncertainty || "").trim() && hasTopicLevelEvidence(q) && !hasSubskillMetadata) {
    const skillDetailNote = buildSkillDetailLimitationUncertaintyHe(false);
    if (skillDetailNote) {
      uncertainty = uncertainty && hedgeLevel !== "mandatory" ? `${uncertainty} ${skillDetailNote}` : skillDetailNote;
    }
  }
  if (q >= 50 && uncertainty && /עדיין מוקדם|כדאי לעקוב|מעט נתונים/u.test(uncertainty)) {
    uncertainty = resolveEngineDecisionUncertaintyText(q, evidenceStrength, decisionCode);
  }

  return {
    contractVersion: NARRATIVE_CONTRACT_VERSION,
    topicKey,
    subjectId,
    wordingEnvelope: envelope,
    hedgeLevel,
    allowedTone: "parent_professional_warm",
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    requiredHedges: [...(REQUIRED_HEDGES_BY_LEVEL[hedgeLevel] || [])],
    allowedSections: [...ALLOWED_SECTIONS],
    recommendationIntensityCap: capIntensity,
    textSlots: {
      observation: buildObservationSlot(displayName, q, acc, `${baseSeed}:obs`),
      interpretation: buildInterpretationSlot(envelope, cannotConcludeYet, `${baseSeed}:int`, q, acc),
      action: buildActionSlot(cappedIntensity, recommendationEligible, `${baseSeed}:act`),
      uncertainty,
    },
  };
}

/**
 * @param {unknown} contract
 */
export function validateNarrativeContractV1(contract) {
  const c = contract && typeof contract === "object" ? contract : {};
  const errors = [];
  if (c.contractVersion !== NARRATIVE_CONTRACT_VERSION) errors.push("contractVersion must be v1");
  if (!String(c.topicKey || "").trim()) errors.push("topicKey is required");
  if (!String(c.subjectId || "").trim()) errors.push("subjectId is required");
  if (!WORDING_ENVELOPES.includes(String(c.wordingEnvelope || ""))) errors.push("wordingEnvelope invalid");
  if (!HEDGE_LEVELS.includes(String(c.hedgeLevel || ""))) errors.push("hedgeLevel invalid");
  if (c.allowedTone !== "parent_professional_warm") errors.push("allowedTone invalid");
  if (!Array.isArray(c.forbiddenPhrases)) errors.push("forbiddenPhrases must be array");
  if (!Array.isArray(c.requiredHedges)) errors.push("requiredHedges must be array");
  if (!Array.isArray(c.allowedSections)) errors.push("allowedSections must be array");
  if (!RECOMMENDATION_INTENSITY.includes(String(c.recommendationIntensityCap || ""))) {
    errors.push("recommendationIntensityCap invalid");
  }
  if (!c.textSlots || typeof c.textSlots !== "object") errors.push("textSlots must be object");
  if (!String(c?.textSlots?.observation || "").trim()) errors.push("textSlots.observation required");
  if (!String(c?.textSlots?.interpretation || "").trim()) errors.push("textSlots.interpretation required");
  if (String(c.hedgeLevel || "") === "mandatory" && !String(c?.textSlots?.uncertainty || "").trim()) {
    errors.push("mandatory hedge requires textSlots.uncertainty");
  }
  if (String(c.recommendationIntensityCap || "") === "RI0" && c?.textSlots?.action) {
    errors.push("RI0 cap forbids action text");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {"summary"|"finding"|"recommendation"|"limitations"} section
 * @param {any} narrativeContract
 */
export function narrativeSectionTextHe(section, narrativeContract) {
  const c = narrativeContract && typeof narrativeContract === "object" ? narrativeContract : null;
  if (!c || !c.textSlots) return "";
  if (section === "summary") return String(c.textSlots.observation || "").trim();
  if (section === "finding") return String(c.textSlots.interpretation || "").trim();
  if (section === "recommendation") return String(c.textSlots.action || "").trim();
  if (section === "limitations") return String(c.textSlots.uncertainty || "").trim();
  return "";
}

/**
 * @param {object} rec
 * @param {object} narrativeContract
 * @param {{ ok: boolean, errors: string[] }} [validation]
 */
export function applyNarrativeContractToRecord(rec, narrativeContract, validation = null) {
  const existingContracts =
    rec?.contractsV1 && typeof rec.contractsV1 === "object" ? rec.contractsV1 : {};
  const v =
    validation && typeof validation === "object"
      ? { ok: !!validation.ok, errors: Array.isArray(validation.errors) ? validation.errors : [] }
      : { ok: true, errors: [] };
  return {
    ...rec,
    contractsV1: {
      ...existingContracts,
      narrative: narrativeContract,
      narrativeValidation: v,
    },
  };
}
