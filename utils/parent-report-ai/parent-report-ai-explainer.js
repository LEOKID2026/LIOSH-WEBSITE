/**
 * Controlled parent-report AI explainer: narrates only allowlisted planner/diagnostic summary fields.
 * Does not choose next actions, difficulty, or practice sets — explains pre-approved signals only.
 */

import { mapPlannerNextActionToHebrew } from "../../lib/learning-client/adaptive-planner-recommendation-view-model.js";
import {
  parentReportAiInputToNarrativeEngineSnapshot,
  validateParentReportAIText,
} from "../../lib/parent-report-ai/parent-report-ai-validate.js";

/** @param {Record<string, string | undefined>} [env] */
function envStr(name, env = typeof process !== "undefined" ? process.env : {}) {
  return String(env?.[name] ?? "").trim();
}

const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  hebrew: "עברית",
  science: "מדעים",
  geometry: "גאומטריה",
  english: "אנגלית",
  "moledet-geography": "גאוגרפיה",
};

/**
 * Strict allowlisted input for parent explainer (no raw reports, metadata, or bank text).
 * @param {object} raw
 */
export function buildStrictParentReportAIInput(raw) {
  if (!raw || typeof raw !== "object") return null;
  const subject = String(raw.subject || "").trim().slice(0, 64).toLowerCase();
  const grade = String(raw.grade != null ? raw.grade : "").trim().slice(0, 16);
  const plannerNextAction = String(raw.plannerNextAction || "").trim().slice(0, 48).toLowerCase();
  const plannerTargetDifficulty = String(raw.plannerTargetDifficulty != null ? raw.plannerTargetDifficulty : "")
    .trim()
    .slice(0, 48);
  const qc = Number(raw.plannerQuestionCount);
  const plannerQuestionCount = Number.isFinite(qc) && qc >= 0 ? Math.min(9999, Math.round(qc)) : 0;
  const accuracyBand = String(raw.accuracyBand || "").trim().slice(0, 32).toLowerCase();
  const consistencyBand = String(raw.consistencyBand || "").trim().slice(0, 32).toLowerCase();
  const dataConfidence = String(raw.dataConfidence || "").trim().slice(0, 32).toLowerCase();
  const mainStrengths = String(raw.mainStrengths || "").trim().slice(0, 280);
  const mainPracticeNeeds = String(raw.mainPracticeNeeds || "").trim().slice(0, 280);
  const recommendedNextStep = String(raw.recommendedNextStep || "").trim().slice(0, 220);

  const allowedActions = new Set([
    "advance_skill",
    "maintain_skill",
    "practice_current",
    "review_prerequisite",
    "probe_skill",
    "pause_collect_more_data",
  ]);
  if (!subject || !grade || !plannerNextAction || !allowedActions.has(plannerNextAction)) return null;
  if (!accuracyBand || !consistencyBand || !dataConfidence) return null;
  if (!recommendedNextStep) return null;

  return {
    subject,
    grade,
    plannerNextAction,
    plannerTargetDifficulty,
    plannerQuestionCount,
    accuracyBand,
    consistencyBand,
    dataConfidence,
    mainStrengths,
    mainPracticeNeeds,
    recommendedNextStep,
  };
}

/**
 * Deterministic parent-facing narrative (Hebrew, professional, cautious).
 * @param {NonNullable<ReturnType<typeof buildStrictParentReportAIInput>>} input
 */
export function getDeterministicParentReportExplanation(input) {
  const subjectHe = SUBJECT_LABEL_HE[input.subject] || "המקצוע שנלמד";
  const dc = String(input.dataConfidence || "").toLowerCase();
  const accBand = String(input.accuracyBand || "").toLowerCase();

  const parts = [];
  if (dc === "thin") {
    parts.push(
      `לגבי ${subjectHe}: מהתרגול המועט שנאסף אפשר לקבל כיוון ראשוני בלבד.`
    );
  } else if (dc === "low") {
    parts.push(
      `לגבי ${subjectHe}: הנתונים בתקופה שנבחרה עדיין מצומצמים - מהתרגול שנאסף אפשר לקבל כיוון ראשוני בלבד.`
    );
  } else if (accBand === "low" || accBand === "mixed") {
    parts.push(
      `לגבי ${subjectHe}: מהתרגול שנאסף אפשר לראות תחום שכדאי לחזק בבית - כדאי להמשיך לעקוב ולא לקבוע חד משמעית רק ממפגש בודד.`
    );
  } else {
    parts.push(
      `לגבי ${subjectHe}: מהתרגול שנאסף אפשר לראות תמונה ברורה יותר של תחומים עם תוצאות טובות יחסית ושל נושאים לחיזוק - כדאי להמשיך לעקוב בעדינות.`,
    );
  }

  if (input.mainStrengths) {
    parts.push(`מה שבולט לטובה: ${input.mainStrengths}`);
  }
  if (input.mainPracticeNeeds) {
    parts.push(`כיוון שכדאי לחזק בתרגול הביתי והשיעורי: ${input.mainPracticeNeeds}`);
  }

  const consistency = input.consistencyBand;
  if (consistency === "mixed" || consistency === "unstable") {
    parts.push("התוצאות עדיין לא אחידות לחלוטין ולכן כדאי להמשיך עם תרגול רגיל ולעקוב אחרי יציבות.");
  }
  if (consistency === "possibly_fast" || consistency === "possibly_inconsistent") {
    parts.push(
      "לעיתים קצב התשובות מהיר יחסית לכן נשמרת זהירות בפרשנות ולא מסיקים מסקנות חזקות מיד."
    );
  }

  parts.push(`המלצת המערכת להמשך התרגול: ${input.recommendedNextStep}`);
  parts.push(
    "מהצד של ההורה כדאי לעודד המשך שגרה של תרגול קצר ולשמור על שיח רגוע סביב למידה."
  );

  return parts.join(" ");
}

function buildParentModelPrompt(input) {
  const subjectHe = SUBJECT_LABEL_HE[input.subject] || input.subject;
  const payload = {
    subject_he: subjectHe,
    grade: input.grade,
    planner_next_action_kind: input.plannerNextAction,
    planner_difficulty_tier: input.plannerTargetDifficulty,
    accuracy_band: input.accuracyBand,
    consistency_band: input.consistencyBand,
    data_confidence: input.dataConfidence,
    strengths_summary: input.mainStrengths,
    practice_needs_summary: input.mainPracticeNeeds,
    approved_next_step_he: input.recommendedNextStep,
  };
  return [
    "You write THREE to FIVE short sentences in Modern Hebrew for parents (calm, professional, supportive).",
    "Audience: parent reading a learning report. Not medical advice. No diagnoses, disorders, or clinical labels.",
    "Do NOT mention internal systems: metadata, diagnostics, planner, algorithms, AI, models, JSON, reason codes, scores, percentages, or raw numbers.",
    "No blame toward the child. No guarantees of future success. No scary predictions.",
    "Do NOT use markdown, emojis, bullet lists, or line breaks in the output text.",
    "Do NOT use digits in the output.",
    "Ground the message only in the provided band labels and approved_next_step_he; do not invent new subjects or diagnoses.",
    'Return JSON only: {"text":"..."}',
    `CONTEXT_JSON: ${JSON.stringify(payload)}`,
  ].join("\n");
}

/**
 * @param {AbortSignal} [signal]
 */
async function callOpenAiParentExplanation(prompt, env, signal) {
  const key = envStr("PARENT_REPORT_AI_EXPLAINER_API_KEY", env) || envStr("OPENAI_API_KEY", env);
  const model = envStr("PARENT_REPORT_AI_EXPLAINER_MODEL", env) || "gpt-4o-mini";
  const base = (envStr("PARENT_REPORT_AI_EXPLAINER_BASE_URL", env) || "https://api.openai.com/v1").replace(/\/$/, "");
  if (!key) return { ok: false, reason: "missing_api_key" };

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: "system", content: "You only output valid minified JSON with a Hebrew text field." },
        { role: "user", content: prompt },
      ],
    }),
    signal: signal || undefined,
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "invalid_response_json" };
  }
  const content = body?.choices?.[0]?.message?.content;
  const raw = String(content || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const slice = jsonMatch ? jsonMatch[0] : raw;
  let parsed;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return { ok: false, reason: "invalid_model_json" };
  }
  const text = parsed?.text != null ? String(parsed.text) : "";
  return { ok: true, text };
}

/**
 * @param {object} rawInput - fields for `buildStrictParentReportAIInput`
 * @param {{ env?: Record<string, string | undefined>, signal?: AbortSignal, preferDeterministicOnly?: boolean }} [options]
 * @returns {Promise<{ ok: true, text: string, source: "ai" | "deterministic_fallback" } | { ok: false, reason: string, source: "none" }>}
 */
export async function buildParentReportAIExplanation(rawInput, options = {}) {
  const env = options.env || (typeof process !== "undefined" ? process.env : {});
  const input = buildStrictParentReportAIInput(rawInput);
  if (!input) return { ok: false, reason: "invalid_input", source: "none" };

  const narrativeSnapshot = parentReportAiInputToNarrativeEngineSnapshot(input);
  const validateOpts = {
    runNarrativeGuard: true,
    narrativeEngineSnapshot: narrativeSnapshot,
    narrativeReportContext: { surface: "detailed" },
  };

  const fallbackRaw = getDeterministicParentReportExplanation(input);
  const fbValid = validateParentReportAIText(fallbackRaw, validateOpts);
  if (!fbValid.ok) return { ok: false, reason: "fallback_invalid", source: "none" };

  const apiKey = envStr("PARENT_REPORT_AI_EXPLAINER_API_KEY", env) || envStr("OPENAI_API_KEY", env);
  const tryLiveAi = Boolean(apiKey) && options.preferDeterministicOnly !== true;

  if (!tryLiveAi) {
    return { ok: true, text: fbValid.text, source: "deterministic_fallback" };
  }

  const prompt = buildParentModelPrompt(input);
  try {
    const ai = await callOpenAiParentExplanation(prompt, env, options.signal);
    if (ai.ok && ai.text) {
      const v = validateParentReportAIText(ai.text, validateOpts);
      if (v.ok) return { ok: true, text: v.text, source: "ai" };
    }
  } catch {
    /* network */
  }

  return { ok: true, text: fbValid.text, source: "deterministic_fallback" };
}

/**
 * Convenience: approved Hebrew planner line for `recommendedNextStep` when mirroring runtime planner.
 * @param {string} plannerNextAction
 */
export function recommendedNextStepHeFromPlannerAction(plannerNextAction) {
  return mapPlannerNextActionToHebrew(plannerNextAction);
}
