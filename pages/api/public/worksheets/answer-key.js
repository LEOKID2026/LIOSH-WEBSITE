import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { rejectIfPublicWorksheetsAnswerKeyRateLimited } from "../../../../lib/security/public-api-rate-limit.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  generateAnswerKeyForParent,
  publicAnswerKeyPayload,
} from "../../../../lib/worksheets/worksheet-generate.server.js";
import { validatePublicDemoGenerationParams } from "../../../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import { getReadyWorksheetBySlug } from "../../../../lib/worksheets/worksheet-ready-catalog.js";
import { validateWorksheetPublicGenerationParams } from "../../../../lib/worksheets/worksheet-level-map.server.js";

/**
 * @param {Record<string, unknown>} body
 * @returns {{ ok: true, params: Record<string, unknown> } | { ok: false, error: string, status: number }}
 */
function resolvePublicAnswerKeyParams(body) {
  const source = String(body?.source || "").trim();
  const slug = String(body?.slug || "").trim();

  if (source === "public-ready" && slug) {
    const entry = getReadyWorksheetBySlug(slug);
    if (!entry) {
      return { ok: false, error: "not_found", status: 404 };
    }
    const validated = validateWorksheetPublicGenerationParams({
      subjectId: entry.subjectId,
      gradeKey: entry.gradeKey,
      topicKey: entry.topicKey,
      levelKey: entry.levelKey,
      count: entry.count,
      seed: entry.seed,
      mathPracticeFormat: entry.mathPracticeFormat,
    });
    if (!validated.ok) {
      return { ok: false, error: validated.error, status: 400 };
    }
    return {
      ok: true,
      params: {
        subjectId: entry.subjectId,
        gradeKey: entry.gradeKey,
        topicKey: entry.topicKey,
        levelKey: entry.levelKey,
        count: entry.count,
        seed: entry.seed,
        inkSave: entry.inkSave === true,
        mathPracticeFormat: entry.mathPracticeFormat,
        expectedWorksheetFingerprint: body?.expectedWorksheetFingerprint,
      },
    };
  }

  const validated = validatePublicDemoGenerationParams({
    subjectId: body?.subjectId,
    gradeKey: body?.gradeKey,
    topicKey: body?.topicKey,
    levelKey: body?.levelKey,
    mathPracticeFormat: body?.mathPracticeFormat,
    preferMcq: body?.preferMcq,
    inkSave: body?.inkSave,
    seed: body?.seed,
    mixedTopicKeys: body?.mixedTopicKeys,
  });

  if (!validated.ok) {
    const status =
      validated.error === "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO" ? 403 : 400;
    return { ok: false, error: validated.error, status };
  }

  return {
    ok: true,
    params: {
      ...validated.normalized,
      expectedWorksheetFingerprint: body?.expectedWorksheetFingerprint,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfPublicWorksheetsAnswerKeyRateLimited(req, res)) return undefined;

  const body = readJsonBody(req);
  if (body?.includeAnswers !== true) {
    return res.status(400).json({ ok: false, error: "includeAnswers_required" });
  }

  const resolved = resolvePublicAnswerKeyParams(body);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ ok: false, error: resolved.error });
  }

  const generated = await generateAnswerKeyForParent({
    ...resolved.params,
    includeAnswers: true,
  });

  if (!generated.ok) {
    const status = generated.status || 500;
    return res.status(status).json({
      ok: false,
      error: generated.code,
      message: generated.message,
    });
  }

  return res.status(200).json({
    ok: true,
    answerKeyPayload: publicAnswerKeyPayload(generated.answerKeyPayload),
  });
}
