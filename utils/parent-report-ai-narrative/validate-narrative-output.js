/**
 * Validates the AI narrative writer's structured output against the Insight Packet.
 *
 * 9-step validator (see plan §6). Layered checks; first failure ⇒ caller falls back to the
 * deterministic baseline. Each text field is also passed through the existing
 * `validateParentNarrativeSafety` guard so the new path inherits the strict diagnostic /
 * permanent-ability / overconfidence-vs-thin-data rules.
 */

import { validateParentNarrativeSafety } from "../parent-narrative-safety/parent-narrative-safety-guard.js";
import { NARRATIVE_OUTPUT_SHAPE } from "./output-schema.js";

const HEBREW_LETTER_RE = /[\u0590-\u05FF]/;
const LATIN_LETTER_RE = /[A-Za-z]/;
const HEBREW_DOMINANCE_THRESHOLD = 0.6;
const RAW_KEY_RE = /[a-z][a-z0-9_]{2,}_[a-z0-9_]{2,}/i;
const MARKDOWN_LEAD_RE = /^[\s]*[#>*\-`]/;
const ABSOLUTE_TERMS_RE = /(תמיד|אף פעם|מצוין במיוחד|צריך טיפול|חייב טיפול|לעולם)/;

/**
 * Block emotional/confidence assumptions in parent-facing narrative text.
 * Product rule: parent reports must NEVER frame children's progress in terms of
 * "confidence" / "ביטחון" (positive or negative). Prefer wording like
 * "שטף", "עצמאות בתרגול", "ביסוס ההבנה", "תרגול עקבי" - see prompt.js.
 *
 * Hebrew morphology note: `ביטחון` ends with the final-nun `ן`, but with possessive
 * suffixes the same root uses the medial-nun `נ`: `ביטחונו` (his), `ביטחונה` (her),
 * `ביטחונם` (their), `ביטחוני` (my). The regex matches `ביטחו` followed by EITHER
 * final-nun `ן` OR medial-nun `נ` (so any suffix form is caught), plus the alternative
 * spelling `בטחו…` and the English word `confidence` (case-insensitive). The Hebrew
 * adjective `בטוח` ("sure/safe", spelled ב-ט-ו-ח without an inner het+vav-nun) is
 * intentionally NOT matched — it has many legitimate uses.
 */
const EMOTIONAL_CONFIDENCE_TERMS_RE = /(ביטחו[ןנ]|בטחו[ןנ]|confidence)/iu;

const SAFE_THIN_DATA_HINTS_RE = /(נתונים מועטים|נתונים מצומצמים|תרגול מועט|נתונים מצומצמים|תקופה קצרה|כיוון ראשוני|מעט נתונים)/;

/**
 * Hebrew letters / (Hebrew letters + Latin letters). Spaces, digits, and punctuation are excluded
 * from both numerator and denominator so a sentence like "התרגול ב-multiplication_table יציב"
 * can be evaluated for "is this Hebrew narrative" rather than penalized for embedded English
 * tokens that are independently flagged by the raw-English-key check.
 */
function hebrewRatio(text) {
  if (typeof text !== "string") return 0;
  let hebrew = 0;
  let latin = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (HEBREW_LETTER_RE.test(ch)) hebrew += 1;
    else if (LATIN_LETTER_RE.test(ch)) latin += 1;
  }
  if (hebrew + latin === 0) return 1;
  return hebrew / (hebrew + latin);
}

function isObjectShape(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function safeStringField(value) {
  return typeof value === "string" ? value : "";
}

function fail(reason, details) {
  return { ok: false, reason, details: details || null };
}

/**
 * @param {object} aiPayload
 * @param {object} packet — full Insight Packet
 * @param {object} [options]
 * @param {{ surface?: "short"|"detailed" }} [options.narrativeReportContext]
 * @param {object} [options.engineSnapshot]
 * @returns {{ ok: true, normalized: object } | { ok: false, reason: string, details: any }}
 */
export function validateNarrativeOutput(aiPayload, packet, options = {}) {
  if (!isObjectShape(aiPayload)) return fail("structural_invalid_root");
  const limits = NARRATIVE_OUTPUT_SHAPE.limits;

  // 1. Structural
  for (const field of NARRATIVE_OUTPUT_SHAPE.fields) {
    if (!(field in aiPayload)) {
      const snake = field.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      if (!(snake in aiPayload)) return fail(`structural_missing_field:${field}`);
    }
  }

  const summary = safeStringField(aiPayload.summary).trim();
  const cautionNote = safeStringField(aiPayload.cautionNote ?? aiPayload.caution_note).trim();
  const homeTipsRaw = aiPayload.homeTips ?? aiPayload.home_tips;
  const strengthsRaw = aiPayload.strengths;
  const focusRaw = aiPayload.focusAreas ?? aiPayload.focus_areas;

  if (!Array.isArray(homeTipsRaw)) return fail("structural_home_tips_not_array");
  if (!Array.isArray(strengthsRaw)) return fail("structural_strengths_not_array");
  if (!Array.isArray(focusRaw)) return fail("structural_focus_areas_not_array");

  if (homeTipsRaw.length < limits.minHomeTips || homeTipsRaw.length > limits.maxHomeTips) {
    return fail("structural_home_tips_count", { len: homeTipsRaw.length });
  }
  if (strengthsRaw.length > limits.maxStrengths) return fail("structural_strengths_too_many");
  if (focusRaw.length > limits.maxFocusAreas) return fail("structural_focus_too_many");

  const strengthsItems = [];
  for (const s of strengthsRaw) {
    if (!isObjectShape(s)) return fail("strengths_item_not_object");
    const textHe = safeStringField(s.textHe ?? s.text_he).trim();
    const sourceId = safeStringField(s.sourceId ?? s.source_id).trim();
    if (!textHe || !sourceId) return fail("strengths_item_missing_fields");
    strengthsItems.push({ textHe, sourceId });
  }
  const focusItems = [];
  for (const f of focusRaw) {
    if (!isObjectShape(f)) return fail("focus_item_not_object");
    const textHe = safeStringField(f.textHe ?? f.text_he).trim();
    const sourceId = safeStringField(f.sourceId ?? f.source_id).trim();
    if (!textHe || !sourceId) return fail("focus_item_missing_fields");
    focusItems.push({ textHe, sourceId });
  }
  const homeTips = [];
  for (const t of homeTipsRaw) {
    const text = safeStringField(t).trim();
    if (!text) return fail("home_tips_empty_item");
    homeTips.push(text);
  }

  // 2. Length
  if (summary.length === 0 || summary.length > limits.summaryMaxChars) return fail("length_summary");
  if (cautionNote.length > limits.cautionMaxChars) return fail("length_caution_note");
  for (const item of strengthsItems) {
    if (item.textHe.length > limits.bulletMaxChars) return fail("length_strength_bullet");
  }
  for (const item of focusItems) {
    if (item.textHe.length > limits.bulletMaxChars) return fail("length_focus_bullet");
  }
  for (const t of homeTips) {
    if (t.length > limits.bulletMaxChars) return fail("length_home_tip");
  }

  // 3. Hebrew dominance per text field
  const allTexts = [
    summary,
    ...strengthsItems.map((x) => x.textHe),
    ...focusItems.map((x) => x.textHe),
    ...homeTips,
  ];
  if (cautionNote) allTexts.push(cautionNote);
  for (const text of allTexts) {
    if (hebrewRatio(text) < HEBREW_DOMINANCE_THRESHOLD) return fail("hebrew_dominance");
  }

  // 4. No raw English keys in any visible text
  for (const text of allTexts) {
    if (RAW_KEY_RE.test(text)) return fail("raw_english_key_in_text", { text });
  }

  // 5. No Markdown leading characters
  for (const text of allTexts) {
    if (MARKDOWN_LEAD_RE.test(text)) return fail("markdown_in_text");
  }

  // 6. Diagnostic / clinical safety on each text field
  const safetyContext = options?.narrativeReportContext || { surface: "detailed" };
  const engineSnapshot = options?.engineSnapshot || {};
  for (const text of allTexts) {
    const safetyResult = validateParentNarrativeSafety({
      narrativeText: text,
      reportContext: safetyContext,
      engineOutput: engineSnapshot,
    });
    if (!safetyResult.ok || safetyResult.status === "block") {
      return fail("narrative_safety_block", { issues: safetyResult.issues || [], text });
    }
  }

  // 7. Thin-data presence: cautionNote must be non-empty AND look like a thin-data caution
  const thinWarnings = Array.isArray(packet?.thinDataWarnings) ? packet.thinDataWarnings : [];
  if (thinWarnings.length > 0) {
    if (!cautionNote) return fail("thin_data_missing_caution_note");
    if (!SAFE_THIN_DATA_HINTS_RE.test(cautionNote)) return fail("thin_data_caution_note_unsafe");
  }

  // 8. Contradiction check (sourceId-grounded)
  const allowedStrengthIds = new Set(packet?.availableStrengthSourceIds || []);
  const allowedFocusIds = new Set(packet?.availableFocusSourceIds || []);
  for (const item of strengthsItems) {
    if (allowedStrengthIds.size > 0 && !allowedStrengthIds.has(item.sourceId)) {
      return fail("contradiction_strength_source_id_not_grounded", { sourceId: item.sourceId });
    }
  }
  for (const item of focusItems) {
    if (allowedFocusIds.size > 0 && !allowedFocusIds.has(item.sourceId)) {
      return fail("contradiction_focus_source_id_not_grounded", { sourceId: item.sourceId });
    }
  }
  // Same sourceId may not appear in both strengths and focusAreas of the AI output
  const sIds = new Set(strengthsItems.map((s) => s.sourceId));
  for (const f of focusItems) {
    if (sIds.has(f.sourceId)) return fail("contradiction_source_id_in_both_lists", { sourceId: f.sourceId });
  }

  // 9. No unsupported absolute claims in any visible text
  for (const text of allTexts) {
    if (ABSOLUTE_TERMS_RE.test(text)) return fail("absolute_unsupported_claim", { text });
  }

  // 10. No emotional/confidence assumptions ("ביטחון" / "בטחון" / "confidence").
  //     Hardening: parent narrative must avoid framing progress in confidence terms,
  //     positive or negative. The deterministic fallback never uses these words.
  for (const text of allTexts) {
    if (EMOTIONAL_CONFIDENCE_TERMS_RE.test(text)) {
      return fail("emotional_confidence_language", { text });
    }
  }

  return {
    ok: true,
    normalized: {
      summary,
      strengths: strengthsItems,
      focusAreas: focusItems,
      homeTips,
      cautionNote,
    },
  };
}

export const NARRATIVE_VALIDATOR_VERSION = "v1";
