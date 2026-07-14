import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  generateAnswerKeyForParent,
  publicAnswerKeyPayload,
} from "../../../../lib/worksheets/worksheet-generate.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const body = readJsonBody(req);
  if (body?.includeAnswers !== true) {
    return res.status(400).json({ ok: false, error: "includeAnswers_required" });
  }

  const generated = await generateAnswerKeyForParent({
    subjectId: body?.subjectId,
    gradeKey: body?.gradeKey,
    topicKey: body?.topicKey,
    levelKey: body?.levelKey,
    count: body?.count,
    seed: body?.seed,
    inkSave: body?.inkSave === true,
    titleHe: typeof body?.titleHe === "string" ? body.titleHe : undefined,
    mathPracticeFormat:
      typeof body?.mathPracticeFormat === "string" ? body.mathPracticeFormat : undefined,
    preferMcq: body?.preferMcq,
    expectedWorksheetFingerprint: body?.expectedWorksheetFingerprint,
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
