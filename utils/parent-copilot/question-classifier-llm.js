/**
 * Optional LLM upgrade for the Q&A classifier.
 *
 * Called ONLY when the deterministic classifier returns `ambiguous_or_unclear`
 * AND the Gemini gate is enabled. Tiny prompt, low token budget, strict JSON.
 *
 * Failure semantics: any error (timeout, http, JSON parse, missing key, low
 * confidence) returns `{ ok: false, reason }` and the caller falls back to
 * `ambiguous_or_unclear`. We never silently upgrade to `report_related` on a
 * weak LLM response.
 */

import { callCopilotLlmJson } from "./copilot-llm-client.js";
import { CLASSIFIER_THRESHOLDS } from "./question-classifier.js";
import { normalizeSubjectId } from "./contract-reader.js";

const DEFAULT_TIMEOUT_MS = 4000;

const VALID_BUCKETS = new Set([
  "report_related",
  "off_topic",
  "diagnostic_sensitive",
  "ambiguous_or_unclear",
]);

/**
 * @param {string} subjectId
 */
function subjectLabelLocalHe(subjectId) {
  const sid = normalizeSubjectId(subjectId);
  switch (sid) {
    case "math": return "חשבון";
    case "geometry": return "גאומטריה";
    case "english": return "אנגלית";
    case "science": return "מדעים";
    case "hebrew": return "עברית";
    case "moledet-geography": return "מולדת";
    default: return "";
  }
}

/**
 * Build a tiny per-report context summary for the LLM.
 * Only subjects + a few topic names — never numeric facts.
 * @param {unknown} payload
 */
function buildClassifierContext(payload) {
  /** @type {string[]} */
  const subjects = [];
  /** @type {string[]} */
  const topics = [];
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  for (const sp of profiles) {
    const lbl = subjectLabelLocalHe(sp?.subject);
    if (lbl) subjects.push(lbl);
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of recs.slice(0, 4)) {
      const dn = String(tr?.displayName || "").trim();
      if (dn) topics.push(dn);
    }
  }
  return {
    subjects: Array.from(new Set(subjects)).slice(0, 8),
    topics: Array.from(new Set(topics)).slice(0, 12),
  };
}

/**
 * @param {string} utterance
 * @param {unknown} payload
 */
function buildPrompt(utterance, payload) {
  const ctx = buildClassifierContext(payload);
  return [
    "אתה מסווג שאלות הורים על דוח למידה. תחזיר JSON בלבד.",
    "ארבע קטגוריות:",
    "  report_related        — שאלה על הילד, על הלמידה שלו, על התקדמות, על תרגול, או על נושא/מקצוע מהדוח.",
    "  off_topic             — שאלה כללית שאינה על הדוח/הילד/הלמידה (מזג אויר, מתכון, ידע כללי, חדשות וכד').",
    "  diagnostic_sensitive  — שאלה שמבקשת אבחנה קלינית (ADHD, דיסלקציה, לקות למידה, מצב רגשי).",
    "  ambiguous_or_unclear  — שאלה קצרה מדי, סתומה, או שלא ברור על מה היא.",
    "כללי הכרעה:",
    "  ידע כללי על נושא לימודי (\"מה זה X\") הוא off_topic, גם אם X מופיע בדוח.",
    "  שאלה על הילד בנושא מהדוח (\"הוא מתקשה ב־X\", \"מה עם X בדוח\") היא report_related.",
    "  שאלה רגשית/קלינית היא diagnostic_sensitive גם אם בדוח יש נתוני תרגול.",
    `מקצועות בדוח: ${ctx.subjects.join(", ") || "(אין)"}.`,
    `נושאים נבחרים בדוח: ${ctx.topics.join(", ") || "(אין)"}.`,
    `שאלת ההורה: ${String(utterance || "").trim()}`,
    'החזר JSON בלבד בפורמט {"bucket":"report_related|off_topic|diagnostic_sensitive|ambiguous_or_unclear","confidence":0..1}.',
  ].join("\n");
}

/**
 * Call the LLM classifier. Always non-throwing; returns ok=false on any failure.
 *
 * @param {{ utterance: string; payload?: unknown; timeoutMs?: number }} args
 * @returns {Promise<{ ok: true; bucket: import("./question-classifier.js").ClassifierBucket; confidence: number; provider?: string } | { ok: false; reason: string }>}
 */
export async function classifyParentQuestionViaLlm({ utterance, payload, timeoutMs }) {
  const u = String(utterance || "").trim();
  if (!u) return { ok: false, reason: "empty_utterance" };

  const ms = Number.isFinite(timeoutMs) ? Number(timeoutMs) : DEFAULT_TIMEOUT_MS;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);

  try {
    const prompt = buildPrompt(u, payload);
    const res = await callCopilotLlmJson(ac.signal, prompt);
    if (!res.ok) {
      return { ok: false, reason: String(res.reason || "llm_call_failed") };
    }
    const payloadJson = res.payload && typeof res.payload === "object" ? res.payload : null;
    if (!payloadJson) {
      return { ok: false, reason: "invalid_json_shape" };
    }
    const bucket = String(payloadJson.bucket || "").trim();
    const confidence = Number(payloadJson.confidence);
    if (!VALID_BUCKETS.has(bucket)) {
      return { ok: false, reason: "invalid_bucket_value" };
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return { ok: false, reason: "invalid_confidence_value" };
    }
    if (confidence < CLASSIFIER_THRESHOLDS.llmConfidenceFloor) {
      return { ok: false, reason: "llm_confidence_below_floor" };
    }
    return {
      ok: true,
      bucket: /** @type {import("./question-classifier.js").ClassifierBucket} */ (bucket),
      confidence,
    };
  } catch (e) {
    return { ok: false, reason: `llm_exception:${String(e?.message || e)}` };
  } finally {
    clearTimeout(timer);
  }
}

export default { classifyParentQuestionViaLlm };
