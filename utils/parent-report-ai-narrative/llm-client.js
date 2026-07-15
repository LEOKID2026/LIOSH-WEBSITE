/**
 * Provider-pluggable HTTP client for the parent-report AI narrative writer.
 *
 * Supports two providers, selected via `PARENT_REPORT_NARRATIVE_LLM_PROVIDER`:
 *   - "openai" (default) - POST `${BASE_URL}/responses` with `text.format=json_object`.
 *   - "gemini"           - POST `${BASE_URL}/models/{MODEL}:generateContent` with
 *                          `generationConfig.responseMimeType="application/json"`.
 *
 * The validator in `validate-narrative-output.js` is the authoritative gate; this
 * client never trusts the model's structure. Both adapters return `{ ok, payload, raw }`
 * so the upstream pipeline (and existing mocked self-tests) stay unchanged.
 *
 * Env (all optional; LLM is OFF unless `LLM_ENABLED=true` AND an API key is resolvable):
 *   PARENT_REPORT_NARRATIVE_LLM_PROVIDER       "openai" | "gemini" (default "openai")
 *   PARENT_REPORT_NARRATIVE_LLM_ENABLED        "true" to enable; default false
 *   PARENT_REPORT_NARRATIVE_FORCE_DETERMINISTIC "true" to skip LLM unconditionally
 *   PARENT_REPORT_NARRATIVE_LLM_API_KEY        Provider-agnostic override.
 *                                              Falls back per provider:
 *                                                openai → OPENAI_API_KEY
 *                                                gemini → GEMINI_API_KEY || GOOGLE_API_KEY
 *   PARENT_REPORT_NARRATIVE_LLM_BASE_URL       Provider-agnostic override; defaults:
 *                                                openai → "https://api.openai.com/v1"
 *                                                gemini → "https://generativelanguage.googleapis.com/v1beta"
 *   PARENT_REPORT_NARRATIVE_LLM_MODEL          Defaults:
 *                                                openai → "gpt-4.1-mini"
 *                                                gemini → "gemini-2.5-flash"
 *   PARENT_REPORT_NARRATIVE_LLM_TIMEOUT_MS     default 25000
 *
 * Vercel / production: set the same names in Project Settings → Environment Variables
 * (server runtime for Preview/Production as needed). Never commit secrets; never prefix
 * the API key with NEXT_PUBLIC_. Redeploy after adding or changing variables.
 */

import { NARRATIVE_OUTPUT_SHAPE } from "./output-schema.js";

const DEFAULT_TIMEOUT_MS = 25_000;

function envStr(name, env) {
  return String(env?.[name] ?? "").trim();
}

function envBool(name, env) {
  const v = envStr(name, env).toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function getProvider(env) {
  const v = envStr("PARENT_REPORT_NARRATIVE_LLM_PROVIDER", env).toLowerCase();
  if (v === "gemini" || v === "google" || v === "google-gemini") return "gemini";
  return "openai";
}

function getApiKey(provider, env) {
  const universal = envStr("PARENT_REPORT_NARRATIVE_LLM_API_KEY", env);
  if (universal) return universal;
  if (provider === "gemini") {
    return envStr("GEMINI_API_KEY", env) || envStr("GOOGLE_API_KEY", env);
  }
  return envStr("OPENAI_API_KEY", env);
}

function getBaseUrl(provider, env) {
  const override = envStr("PARENT_REPORT_NARRATIVE_LLM_BASE_URL", env);
  if (override) return override.replace(/\/$/, "");
  if (provider === "gemini") return "https://generativelanguage.googleapis.com/v1beta";
  return "https://api.openai.com/v1";
}

function getModel(provider, env) {
  const override = envStr("PARENT_REPORT_NARRATIVE_LLM_MODEL", env);
  if (override) return override;
  if (provider === "gemini") return "gemini-2.5-flash";
  return "gpt-4.1-mini";
}

export function isNarrativeLlmEnabled(env) {
  if (!env) env = typeof process !== "undefined" ? process.env : {};
  if (envBool("PARENT_REPORT_NARRATIVE_FORCE_DETERMINISTIC", env)) return false;
  const provider = getProvider(env);
  const apiKey = getApiKey(provider, env);
  if (!apiKey) return false;
  if (!envBool("PARENT_REPORT_NARRATIVE_LLM_ENABLED", env)) return false;
  return true;
}

function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractTextFromOpenAi(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.output_text === "string") return body.output_text;
  const outputs = Array.isArray(body.output) ? body.output : [];
  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") {
        return c.text;
      }
    }
  }
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  if (choice && typeof choice.message?.content === "string") return choice.message.content;
  return "";
}

function extractTextFromGemini(body) {
  if (!body || typeof body !== "object") return "";
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  for (const c of candidates) {
    const parts = Array.isArray(c?.content?.parts) ? c.content.parts : [];
    const collected = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("");
    if (collected) return collected;
  }
  return "";
}

/**
 * Provider-agnostic normalization: convert known snake_case keys produced by some
 * providers (notably Gemini, which we explicitly instruct in the system prompt to
 * emit snake_case) into our internal canonical camelCase shape.
 *
 * The validator already accepts both spellings, so this is purely belt-and-suspenders:
 * downstream code (validator, fallback, UI) sees one canonical shape regardless of
 * provider. Snake_case keys are kept alongside camelCase for absolute backwards safety.
 */
export function normalizeNarrativeAiOutput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const out = { ...payload };
  if ("focus_areas" in out && !("focusAreas" in out)) out.focusAreas = out.focus_areas;
  if ("home_tips"  in out && !("homeTips"   in out)) out.homeTips   = out.home_tips;
  if ("caution_note" in out && !("cautionNote" in out)) out.cautionNote = out.caution_note;
  if (Array.isArray(out.strengths))  out.strengths  = out.strengths.map(normalizeBulletItem);
  if (Array.isArray(out.focusAreas)) out.focusAreas = out.focusAreas.map(normalizeBulletItem);
  return out;
}

function normalizeBulletItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  const out = { ...item };
  if ("text_he" in out && !("textHe" in out)) out.textHe = out.text_he;
  if ("source_id" in out && !("sourceId" in out)) out.sourceId = out.source_id;
  return out;
}

async function runHttpAndParse({ url, init, fetchImpl, signal, timeoutMs, extract }) {
  const controller = signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort("timeout"), timeoutMs) : null;
  if (controller) init.signal = controller.signal;

  try {
    const impl = fetchImpl || ((req) => fetch(req.url, req.init));
    const res = await impl({ url, init });
    if (!res || typeof res.ok !== "boolean") {
      return { ok: false, reason: "invalid_response_object" };
    }
    if (!res.ok) {
      let httpErrorBody = "";
      try {
        if (typeof res.text === "function") {
          httpErrorBody = await res.text();
        } else if (typeof res.json === "function") {
          const j = await res.json();
          httpErrorBody = JSON.stringify(j);
        }
      } catch {
        // best-effort only
      }
      return {
        ok: false,
        reason: `http_${res.status}`,
        httpErrorBody: String(httpErrorBody || "").slice(0, 800),
      };
    }
    const body = await res.json();
    const text = extract(body);
    const parsed = safeJsonParse(String(text || "").trim());
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, reason: "invalid_json_output", raw: String(text || "") };
    }
    return { ok: true, payload: parsed, raw: String(text || "") };
  } catch (error) {
    return {
      ok: false,
      reason: `network_or_abort:${String(error?.message || error || "unknown")}`,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callOpenAiResponses({ apiKey, env, prompt, signal, fetchImpl, timeoutMs }) {
  const baseUrl = getBaseUrl("openai", env);
  const model = getModel("openai", env);
  const url = `${baseUrl}/responses`;
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 700,
      text: { format: { type: "json_object" } },
    }),
    signal,
  };
  return runHttpAndParse({ url, init, fetchImpl, signal, timeoutMs, extract: extractTextFromOpenAi });
}

/**
 * Gemini response schema (OpenAPI 3.0 subset) that enforces our shape AND count caps
 * server-side. The validator remains authoritative for sourceId grounding, Hebrew
 * dominance, safety guard, etc. Schema uses camelCase to match our internal canonical
 * shape so `normalizeNarrativeAiOutput` is a no-op when Gemini honors the schema.
 *
 * Notes on Gemini schema constraints:
 *  - `additionalProperties` is NOT supported in Gemini's schema subset; we omit it.
 *  - Long `enum` lists are supported but verbose; we leave sourceId free-form here
 *    and let the validator enforce the closed enum (which the prompt also encodes
 *    via `available_strength_source_ids` / `available_focus_source_ids`).
 */
function buildGeminiResponseSchema() {
  const L = NARRATIVE_OUTPUT_SHAPE.limits;
  const bulletItem = {
    type: "object",
    required: ["textHe", "sourceId"],
    properties: {
      textHe: { type: "string", maxLength: L.bulletMaxChars },
      sourceId: { type: "string" },
    },
  };
  return {
    type: "object",
    required: ["summary", "strengths", "focusAreas", "homeTips", "cautionNote"],
    properties: {
      summary: { type: "string", maxLength: L.summaryMaxChars },
      strengths: {
        type: "array",
        minItems: L.minStrengths,
        maxItems: L.maxStrengths,
        items: bulletItem,
      },
      focusAreas: {
        type: "array",
        minItems: L.minFocusAreas,
        maxItems: L.maxFocusAreas,
        items: bulletItem,
      },
      homeTips: {
        type: "array",
        minItems: L.minHomeTips,
        maxItems: L.maxHomeTips,
        items: { type: "string", maxLength: L.bulletMaxChars },
      },
      cautionNote: { type: "string", maxLength: L.cautionMaxChars },
    },
  };
}

async function callGeminiGenerateContent({ apiKey, env, prompt, signal, fetchImpl, timeoutMs }) {
  const baseUrl = getBaseUrl("gemini", env);
  const model = getModel("gemini", env);
  const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        // Gemini 2.5 family counts internal "thinking" tokens against this budget.
        // We need enough headroom for a long Hebrew JSON payload even after the model
        // has spent some tokens reasoning. 2048 is plenty for our schema (≤ ~1.5 KB JSON).
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        // Server-side structural enforcement of our caps (strengths≤3, focusAreas≤3,
        // homeTips 2–3). The validator stays authoritative for content rules.
        responseSchema: buildGeminiResponseSchema(),
        // Disable internal thinking tokens for deterministic, low-latency JSON emission.
        // Validator + deterministic fallback handle any quality gaps; we don't need reasoning here.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal,
  };
  const result = await runHttpAndParse({ url, init, fetchImpl, signal, timeoutMs, extract: extractTextFromGemini });
  if (result.ok) {
    return { ...result, payload: normalizeNarrativeAiOutput(result.payload) };
  }
  return result;
}

/**
 * @param {object} args
 * @param {string} args.prompt
 * @param {AbortSignal} [args.signal]
 * @param {Record<string,string|undefined>} [args.env]
 * @param {(args: { url: string, init: RequestInit }) => Promise<Response>} [args.fetchImpl]
 *   Inject for tests; defaults to global `fetch`.
 * @returns {Promise<{ ok: true, payload: unknown, raw: string } | { ok: false, reason: string, raw?: string }>}
 */
export async function callNarrativeLlm(args) {
  const env = args?.env || (typeof process !== "undefined" ? process.env : {});
  const provider = getProvider(env);
  const apiKey = getApiKey(provider, env);
  if (!apiKey) return { ok: false, reason: "missing_api_key" };
  const timeoutMs = Number(envStr("PARENT_REPORT_NARRATIVE_LLM_TIMEOUT_MS", env)) || DEFAULT_TIMEOUT_MS;

  const common = {
    apiKey,
    env,
    prompt: args.prompt,
    signal: args.signal,
    fetchImpl: args.fetchImpl,
    timeoutMs,
  };

  if (provider === "gemini") return callGeminiGenerateContent(common);
  return callOpenAiResponses(common);
}

export const __internalForTests__ = {
  getProvider,
  getApiKey,
  getBaseUrl,
  getModel,
  extractTextFromOpenAi,
  extractTextFromGemini,
};
