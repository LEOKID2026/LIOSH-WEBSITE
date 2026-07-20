import { rejectIfCrossOriginCookieMutation } from "../../../lib/security/same-origin.js";
import { safeApiLog } from "../../../lib/security/safe-log.js";
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server.js";
import { resolveColoringUploadSubject } from "../../../lib/coloring-upload/coloring-upload-visitor.server.js";
import {
  checkColoringUploadAiQuota,
  getColoringUploadAiQuotaStatus,
  recordColoringUploadAiUsage,
} from "../../../lib/coloring-upload/coloring-upload-quota.server.js";
import { generateReplicateStyleTransfer } from "../../../lib/coloring-upload/replicate-style-transfer.server.js";
import {
  estimateJsonBodyBytes,
  HF_API_MAX_JSON_BYTES,
} from "../../../lib/coloring-upload/hf-lineart-api-validation.server.js";
import { parseStyleTransferRequestBody } from "../../../lib/coloring-upload/style-transfer-api-validation.server.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

function sendError(res, status, payload) {
  return res.status(status).json({ ok: false, ...payload });
}

function sendQuotaError(res, quota) {
  if (quota.retryAfterSec) res.setHeader("Retry-After", String(quota.retryAfterSec));
  return res.status(quota.status || 429).json({
    ok: false,
    code: quota.code,
    scope: quota.scope,
    remaining: quota.remaining ?? 0,
    limit: quota.limit,
    resetAt: quota.resetAt,
    messageHe: quota.messageHe,
  });
}

function mapReplicateError(message) {
  if (message === "REPLICATE_NOT_CONFIGURED") {
    return { status: 503, code: "replicate_not_configured" };
  }
  if (message === "REPLICATE_INSUFFICIENT_CREDIT") {
    return { status: 503, code: "replicate_unavailable" };
  }
  if (message === "REPLICATE_RATE_LIMITED") {
    return { status: 503, code: "replicate_rate_limited" };
  }
  if (message === "REPLICATE_DOWNLOAD_TIMEOUT") {
    return { status: 504, code: "timeout" };
  }
  if (message.startsWith("REPLICATE_")) {
    return { status: 502, code: "upstream_failed" };
  }
  if (message === "INVALID_STYLE") {
    return { status: 400, code: "invalid_style" };
  }
  return { status: 500, code: "internal_error" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, { code: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  if (estimateJsonBodyBytes(req) > HF_API_MAX_JSON_BYTES) {
    return sendError(res, 413, { code: "payload_too_large" });
  }

  const parsed = parseStyleTransferRequestBody(req.body);
  if (!parsed.ok) return sendError(res, 400, { code: parsed.code });

  const subject = await resolveColoringUploadSubject(req, res);

  let supabase;
  try {
    supabase = getLearningSupabaseServiceRoleClient();
  } catch {
    supabase = null;
  }

  if (supabase) {
    const quota = await checkColoringUploadAiQuota(supabase, subject.subjectKey);
    if (!quota.ok) {
      if (quota.code === "db_schema_not_ready") {
        return sendError(res, 503, { code: quota.code });
      }
      return sendQuotaError(res, quota);
    }
  }

  try {
    const result = await generateReplicateStyleTransfer(parsed.style, parsed.buffer);

    if (supabase) {
      await recordColoringUploadAiUsage(supabase, subject.subjectKey);
      const status = await getColoringUploadAiQuotaStatus(supabase, subject.subjectKey);
      return res.status(200).json({
        ok: true,
        style: parsed.style,
        source: result.source,
        mimeType: result.mimeType,
        imageBase64: result.buffer.toString("base64"),
        quota: {
          remaining: status.remaining,
          limit: status.limit,
          resetAt: status.resetAt,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      style: parsed.style,
      source: result.source,
      mimeType: result.mimeType,
      imageBase64: result.buffer.toString("base64"),
      quota: {
        remaining: null,
        limit: 10,
        resetAt: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeApiLog("coloring_style_transfer_error", { style: parsed.style, message });
    const mapped = mapReplicateError(message);
    return sendError(res, mapped.status, { code: mapped.code, style: parsed.style });
  }
}
