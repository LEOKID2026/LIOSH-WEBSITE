import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "../../../../lib/worksheets/worksheet-generate.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const body = readJsonBody(req);
  const inkSave = body?.inkSave === true;

  const generated = await generateWorksheetForParent({
    subjectId: body?.subjectId,
    gradeKey: body?.gradeKey,
    topicKey: body?.topicKey,
    levelKey: body?.levelKey,
    count: body?.count,
    seed: body?.seed,
    inkSave,
    titleHe: typeof body?.titleHe === "string" ? body.titleHe : undefined,
    mathPracticeFormat:
      typeof body?.mathPracticeFormat === "string" ? body.mathPracticeFormat : undefined,
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
    worksheetPayload: publicWorksheetPayload(generated.worksheetPayload),
    generation: generated.generation,
  });
}
