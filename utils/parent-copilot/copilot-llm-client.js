/**
 * Parent Copilot Q&A LLM - primary: OpenAI `/v1/responses` or Gemini `generateContent`.
 * Optional fallback: OpenAI-compatible `POST .../chat/completions` (OpenRouter, Groq, etc.).
 *
 * Primary env:
 *   PARENT_COPILOT_LLM_PROVIDER     "openai" | "gemini" (default "openai")
 *   PARENT_COPILOT_LLM_BASE_URL     OpenAI default https://api.openai.com/v1; Gemini API base for gemini
 *   PARENT_COPILOT_LLM_MODEL
 *   PARENT_COPILOT_LLM_API_KEY      OpenAI key when provider=openai
 *   PARENT_COPILOT_LLM_TIMEOUT_MS   (orchestrator AbortController)
 *   GEMINI_API_KEY / GOOGLE_API_KEY when provider=gemini (or PARENT_COPILOT_LLM_API_KEY override)
 *
 * Fallback env (only used after transient primary failure — see isTransientCopilotLlmFailure):
 *   PARENT_COPILOT_LLM_FALLBACK_PROVIDER   "openrouter" | "groq"
 *   PARENT_COPILOT_LLM_FALLBACK_MODEL       single model (required if FALLBACK_MODELS unset)
 *   PARENT_COPILOT_LLM_FALLBACK_MODELS      OpenRouter only: comma-separated list - app tries each model in order (single `model` per request; no OpenRouter multi-model routing)
 *   PARENT_COPILOT_LLM_FALLBACK_API_KEY     (trimmed; Bearer auth — never logged)
 *   PARENT_COPILOT_LLM_FALLBACK_BASE_URL    full URL to chat/completions (optional; sensible defaults)
 * OpenRouter-only optional attribution (see openrouter.ai docs):
 *   PARENT_COPILOT_OPENROUTER_HTTP_REFERER  default https://localhost
 *   PARENT_COPILOT_OPENROUTER_X_TITLE       default LIOSH Parent Copilot
 *   PARENT_COPILOT_OPENROUTER_REQUIRE_PARAMETERS  true|false — route only to endpoints that
 *     support all request params (e.g. response_format). Default false (free tiers often 404
 *     when true). When false, `provider` is omitted from the request body.
 *
 * Test / dev (forces primary to fail without calling the network):
 *   PARENT_COPILOT_LLM_SIMULATE_PRIMARY_TRANSIENT_FAILURE=http_429 | timeout | network
 */

function envStr(name, fallback = "") {
  try {
    const v = typeof process !== "undefined" && process.env ? process.env[name] : undefined;
    return String(v ?? "").trim() || fallback;
  } catch {
    return fallback;
  }
}

/** Parses booleans from env; unrecognized / empty → defaultValue. */
function envBool(name, defaultValue = false) {
  const v = envStr(name);
  if (!v) return defaultValue;
  const l = v.toLowerCase();
  if (["1", "true", "yes", "on"].includes(l)) return true;
  if (["0", "false", "no", "off"].includes(l)) return false;
  return defaultValue;
}

/** Trim/BOM-strip for bearer tokens (never log the raw value). */
function normalizeFallbackApiKey(raw) {
  if (raw == null) return "";
  return String(raw).replace(/^\uFEFF/, "").trim();
}

/**
 * Reads only `PARENT_COPILOT_LLM_FALLBACK_API_KEY` (required for fallback chat requests).
 */
function readParentCopilotFallbackApiKeyFromEnv() {
  try {
    const v = typeof process !== "undefined" && process.env ? process.env.PARENT_COPILOT_LLM_FALLBACK_API_KEY : undefined;
    return normalizeFallbackApiKey(v);
  } catch {
    return "";
  }
}

/** Comma-separated OpenRouter model IDs → ordered list (trim, drop empties). */
function parseFallbackModelsCsv(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getProvider() {
  const v = envStr("PARENT_COPILOT_LLM_PROVIDER").toLowerCase();
  if (v === "gemini" || v === "google" || v === "google-gemini") return "gemini";
  return "openai";
}

function getGeminiApiKey() {
  return envStr("PARENT_COPILOT_LLM_API_KEY") || envStr("GEMINI_API_KEY") || envStr("GOOGLE_API_KEY");
}

function safeJsonParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    const m = String(raw || "").match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, value: null };
    try {
      return { ok: true, value: JSON.parse(m[0]) };
    } catch {
      return { ok: false, value: null };
    }
  }
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort summary for Google Generative Language API JSON errors (quota, rate limit, overload). */
function summarizeGeminiHttpError(parsed, httpStatus) {
  if (!parsed || typeof parsed !== "object") return `HTTP ${httpStatus} (non-JSON or empty body)`;
  const err = parsed.error;
  if (!err || typeof err !== "object") {
    try {
      return `HTTP ${httpStatus}: ${JSON.stringify(parsed).slice(0, 500)}`;
    } catch {
      return `HTTP ${httpStatus}`;
    }
  }
  const bits = [];
  if (err.status) bits.push(`API status: ${err.status}`);
  if (err.code != null) bits.push(`code: ${err.code}`);
  if (err.message) bits.push(String(err.message));
  const details = Array.isArray(err.details) ? err.details : [];
  for (const d of details.slice(0, 3)) {
    if (d && typeof d === "object" && d["@type"]) bits.push(`detail: ${d["@type"]}`);
    if (d && typeof d === "object" && d.reason) bits.push(`reason: ${d.reason}`);
  }
  return bits.length ? bits.join(" · ") : `HTTP ${httpStatus}`;
}

function extractGeminiText(body) {
  if (!body || typeof body !== "object") return "";
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  for (const c of candidates) {
    const parts = Array.isArray(c?.content?.parts) ? c.content.parts : [];
    const t = parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
    if (t) return t;
  }
  return "";
}

function extractOpenAiText(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.output_text === "string") return body.output_text;
  const outputs = Array.isArray(body.output) ? body.output : [];
  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if ((c?.type === "output_text" || c?.type === "text") && typeof c.text === "string") return c.text;
    }
  }
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  const mc = choice?.message?.content;
  if (typeof mc === "string") return mc;
  if (mc === null || mc === undefined) return "";
  if (Array.isArray(mc)) {
    const t = mc
      .filter((p) => p && p.type !== "reasoning" && p.type !== "thinking")
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("");
    if (t) return t;
  }
  return "";
}

/** OpenRouter / chat.completions: reasoning may appear without `message.content` (JSON mode unusable). */
function extractOpenRouterAssistantReasoning(body) {
  if (!body || typeof body !== "object") return "";
  const choice = Array.isArray(body.choices) ? body.choices[0] : null;
  const msg = choice?.message;
  if (!msg || typeof msg !== "object") return "";
  if (typeof msg.reasoning === "string") return msg.reasoning;
  if (typeof msg.reasoning_content === "string") return msg.reasoning_content;
  const mc = msg.content;
  if (Array.isArray(mc)) {
    const fromParts = mc
      .filter((p) => p && (p.type === "reasoning" || p.type === "thinking"))
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("");
    if (fromParts) return fromParts;
  }
  const rd = msg.reasoning_details;
  if (Array.isArray(rd)) {
    return rd
      .map((x) => {
        if (typeof x === "string") return x;
        if (x && typeof x === "object" && typeof x.text === "string") return x.text;
        return "";
      })
      .join("");
  }
  return "";
}

/** Truncate model output for telemetry (invalid JSON debug). */
function previewForTelemetry(s, max = 2500) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

const OPENROUTER_JSON_SYSTEM_INSTRUCTION =
  "Return valid JSON only. No Markdown. No text outside JSON.";

function readSimulatedPrimaryFailure() {
  const v = envStr("PARENT_COPILOT_LLM_SIMULATE_PRIMARY_TRANSIENT_FAILURE").toLowerCase();
  if (!v || v === "0" || v === "false" || v === "off") return null;
  if (v === "429" || v === "http_429" || v === "rate_limit") return { reason: "http_429", httpStatus: 429 };
  if (v === "timeout" || v === "abort") return { reason: "network_or_abort:timeout" };
  if (v === "network" || v === "econnreset") return { reason: "network_or_abort:ECONNRESET" };
  if (v.startsWith("http_")) {
    const n = Number(v.replace(/^http_/, ""));
    if (Number.isFinite(n)) return { reason: `http_${n}`, httpStatus: n };
  }
  return { reason: "http_429", httpStatus: 429 };
}

/**
 * True when the grounded path may try a configured fallback provider (429, 5xx, timeout, flaky network).
 * Not used for invalid JSON, auth errors, or missing keys.
 * @param {{ ok?: boolean; reason?: string; httpStatus?: number }} res
 */
export function isTransientCopilotLlmFailure(res) {
  if (!res || res.ok) return false;
  const reason = String(res.reason || "");
  const st = Number(res.httpStatus);
  if (reason === "http_429" || st === 429) return true;
  if ([408, 500, 502, 503, 504].includes(st)) return true;
  if (/^http_(50[0-4]|408)\b/.test(reason)) return true;
  if (reason.startsWith("network_or_abort:")) {
    const tail = reason.slice("network_or_abort:".length).toLowerCase();
    if (
      tail.includes("timeout") ||
      tail.includes("abort") ||
      tail.includes("aborterror") ||
      tail.includes("fetch") ||
      tail.includes("failed to fetch") ||
      tail.includes("econnreset") ||
      tail.includes("etimedout") ||
      tail.includes("enotfound") ||
      tail.includes("socket") ||
      tail.includes("network")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @returns {null | {
 *   kind: string;
 *   baseUrl: string;
 *   apiKey: string;
 *   model: string;
 *   fallbackModels: string[];
 *   telemetryFallbackProvider: string;
 * }}
 */
export function getCopilotLlmFallbackConfig() {
  const kind = envStr("PARENT_COPILOT_LLM_FALLBACK_PROVIDER").toLowerCase();
  if (!kind || kind === "none" || kind === "off" || kind === "false" || kind === "0") return null;
  const apiKey = readParentCopilotFallbackApiKeyFromEnv();
  if (!apiKey) return null;

  const modelsFromEnv = kind === "openrouter" ? parseFallbackModelsCsv(envStr("PARENT_COPILOT_LLM_FALLBACK_MODELS")) : [];
  const singleModel = envStr("PARENT_COPILOT_LLM_FALLBACK_MODEL");

  /** @type {string | undefined} */
  let model;
  /** @type {string[] | undefined} */
  let models;
  if (modelsFromEnv.length > 0) {
    models = modelsFromEnv;
    model = modelsFromEnv[0];
  } else if (singleModel) {
    model = singleModel;
  } else {
    return null;
  }

  let baseUrl = envStr("PARENT_COPILOT_LLM_FALLBACK_BASE_URL");
  if (kind === "openrouter") {
    if (!baseUrl) baseUrl = "https://openrouter.ai/api/v1/chat/completions";
  } else if (kind === "groq") {
    if (!baseUrl) baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  } else {
    return null;
  }

  const fallbackModels = models && models.length ? [...models] : [model];

  const telemetryFallbackProvider =
    kind === "openrouter" ? "openrouter" : `${kind}_chat:${model}`;

  return {
    kind,
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model,
    fallbackModels,
    telemetryFallbackProvider,
  };
}

function extractChatCompletionsResponseModel(body) {
  if (!body || typeof body !== "object") return undefined;
  if (typeof body.model === "string" && body.model.trim()) return body.model.trim();
  return undefined;
}

/**
 * OpenAI-compatible chat.completions (OpenRouter, Groq, etc.).
 * @param {AbortSignal} signal
 * @param {string} prompt
 * @param {{ baseUrl: string; apiKey: string; model: string; providerKind?: string }} cfg
 */
export async function callCopilotLlmOpenAiChatCompletionsJson(signal, prompt, cfg) {
  const url = cfg.baseUrl;
  const isOpenRouter = String(cfg.providerKind || "").toLowerCase() === "openrouter";
  const bearer = normalizeFallbackApiKey(cfg.apiKey);
  if (!bearer) {
    return {
      ok: false,
      reason: "missing_fallback_api_key",
      geminiErrorSummary: "fallback_chat missing PARENT_COPILOT_LLM_FALLBACK_API_KEY after trim",
    };
  }
  try {
    const payloadBody = (() => {
      const baseTemp = {
        temperature: 0.2,
        max_tokens: 900,
      };
      if (isOpenRouter) {
        const strictParams = envBool("PARENT_COPILOT_OPENROUTER_REQUIRE_PARAMETERS", false);
        const msgPart = {
          messages: [
            { role: "system", content: OPENROUTER_JSON_SYSTEM_INSTRUCTION },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          ...(strictParams ? { provider: { require_parameters: true } } : {}),
        };
        return {
          ...baseTemp,
          ...msgPart,
          model: cfg.model,
        };
      }
      return {
        ...baseTemp,
        model: cfg.model,
        messages: [{ role: "user", content: prompt }],
      };
    })();

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${bearer}`);
    if (isOpenRouter) {
      const referer = envStr("PARENT_COPILOT_OPENROUTER_HTTP_REFERER", "https://localhost");
      const title = envStr("PARENT_COPILOT_OPENROUTER_X_TITLE", "LIOSH Parent Copilot");
      if (referer) headers.set("HTTP-Referer", referer);
      if (title) headers.set("X-Title", title);
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payloadBody),
      signal,
    });
    const rawText = await res.text();
    let body = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: `http_${res.status}`,
        httpStatus: res.status,
        geminiErrorBody: rawText,
        geminiErrorSummary: `fallback_chat HTTP ${res.status}`,
        actualModel: extractChatCompletionsResponseModel(body || {}),
      };
    }
    const maybeText = extractOpenAiText(body || {});
    const reasoningText = isOpenRouter ? extractOpenRouterAssistantReasoning(body || {}) : "";
    const trimmed = String(maybeText || "").trim();
    const actualModel = extractChatCompletionsResponseModel(body || {});

    if (!trimmed) {
      const reasoningTrim = String(reasoningText || "").trim();
      const previewBits = [];
      if (reasoningTrim) previewBits.push(`reasoning:${reasoningTrim}`);
      if (body && typeof body === "object") {
        try {
          previewBits.push(JSON.stringify(body).slice(0, 4000));
        } catch {
          previewBits.push("[unserializable body]");
        }
      }
      if (!previewBits.length && rawText) previewBits.push(rawText);
      const invalidJsonRawPreview = previewForTelemetry(previewBits.filter(Boolean).join("\n---\n"));
      return {
        ok: false,
        reason: reasoningTrim ? "reasoning_only_no_json_content" : "empty_assistant_content",
        raw: "",
        invalidJsonRawPreview,
        httpStatus: res.status,
        actualModel,
      };
    }

    const parsed = safeJsonParse(trimmed);
    if (!parsed.ok) {
      const previewBits = [trimmed];
      if (!trimmed && body && typeof body === "object") {
        try {
          previewBits.push(JSON.stringify(body).slice(0, 4000));
        } catch {
          previewBits.push("[unserializable body]");
        }
      }
      if (!previewBits[0] && rawText) previewBits.push(rawText);
      const invalidJsonRawPreview = previewForTelemetry(previewBits.filter(Boolean).join("\n---\n"));
      return {
        ok: false,
        reason: "invalid_json_output",
        raw: trimmed,
        invalidJsonRawPreview,
        httpStatus: res.status,
        actualModel,
      };
    }
    return { ok: true, payload: parsed.value, raw: trimmed, actualModel };
  } catch (e) {
    return { ok: false, reason: `network_or_abort:${String(e?.message || e)}` };
  }
}

/**
 * Primary provider only (Gemini or OpenAI responses API). Used by classifier LLM and as first hop for grounded Q&A.
 * @param {AbortSignal} signal
 * @param {string} prompt
 * @returns {Promise<{ ok: boolean; payload?: unknown; reason?: string; raw?: string; httpStatus?: number; geminiErrorBody?: string; geminiErrorSummary?: string; geminiErrorParsed?: unknown; llmRetryCount?: number }>}
 */
export async function callCopilotLlmPrimaryJson(signal, prompt) {
  const sim = readSimulatedPrimaryFailure();
  if (sim) {
    return { ok: false, ...sim, llmRetryCount: 0 };
  }

  const provider = getProvider();

  try {
    if (provider === "gemini") {
      const apiKey = getGeminiApiKey();
      if (!apiKey) return { ok: false, reason: "missing_gemini_api_key" };
      const baseUrl = envStr("PARENT_COPILOT_LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta").replace(
        /\/$/,
        "",
      );
      const model = envStr("PARENT_COPILOT_LLM_MODEL", "gemini-2.5-flash");
      const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
      const maxAttempts = 3;
      const backoffMs = [2000, 5000];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 900,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal,
        });
        const rawText = await res.text();
        let parsedBody = null;
        try {
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = null;
        }

        if (res.ok) {
          const body = parsedBody && typeof parsedBody === "object" ? parsedBody : {};
          const raw = extractGeminiText(body);
          const parsed = safeJsonParse(String(raw || "").trim());
          if (!parsed.ok) {
            return {
              ok: false,
              reason: "invalid_json_output",
              raw: String(raw || ""),
              httpStatus: res.status,
              llmRetryCount: attempt,
            };
          }
          return {
            ok: true,
            payload: parsed.value,
            raw: String(raw || ""),
            llmRetryCount: attempt,
          };
        }

        const is429 = res.status === 429;
        const canRetry = is429 && attempt < maxAttempts - 1;
        if (canRetry) {
          await sleepMs(backoffMs[attempt] ?? backoffMs[backoffMs.length - 1]);
          continue;
        }

        const summary = summarizeGeminiHttpError(parsedBody, res.status);
        return {
          ok: false,
          reason: `http_${res.status}`,
          httpStatus: res.status,
          geminiErrorBody: rawText,
          geminiErrorSummary: summary,
          geminiErrorParsed: parsedBody,
          llmRetryCount: attempt,
        };
      }
    }

    const url = envStr("PARENT_COPILOT_LLM_BASE_URL", "https://api.openai.com/v1/responses");
    const apiKey = envStr("PARENT_COPILOT_LLM_API_KEY");
    const model = envStr("PARENT_COPILOT_LLM_MODEL", "gpt-4.1-mini");
    if (!apiKey) return { ok: false, reason: "missing_api_key" };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.2,
        max_output_tokens: 500,
        text: { format: { type: "text" } },
      }),
      signal,
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}`, httpStatus: res.status };
    const body = await res.json();
    const maybeText = extractOpenAiText(body);
    const parsed = safeJsonParse(String(maybeText || "").trim());
    if (!parsed.ok) return { ok: false, reason: "invalid_json_output", raw: String(maybeText || "") };
    return { ok: true, payload: parsed.value, raw: String(maybeText || "") };
  } catch (e) {
    return { ok: false, reason: `network_or_abort:${String(e?.message || e)}` };
  }
}

/**
 * @deprecated Prefer callCopilotLlmPrimaryJson; kept for callers that only need primary (e.g. classifier).
 */
export async function callCopilotLlmJson(signal, prompt) {
  return callCopilotLlmPrimaryJson(signal, prompt);
}

export function copilotLlmPrimaryProviderLabel() {
  return getProvider() === "gemini" ? "gemini" : "openai_compatible";
}

/** @deprecated Use copilotLlmPrimaryProviderLabel */
export function copilotLlmProviderLabel() {
  return copilotLlmPrimaryProviderLabel();
}
