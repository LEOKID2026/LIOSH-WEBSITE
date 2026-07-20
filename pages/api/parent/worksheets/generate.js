import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  getTypeHandler,
  resolveWorksheetType,
} from "../../../../lib/worksheets/worksheet-type-registry.js";
import { worksheetMixedTopicsErrorHe } from "../../../../lib/worksheets/worksheet-mixed-topics.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const body = readJsonBody(req);
  const worksheetType = resolveWorksheetType(body);
  const handler = getTypeHandler(worksheetType);

  const generated = await handler.generate({
    ...body,
    inkSave: body?.inkSave === true,
    mixedTopicKeys: Array.isArray(body?.mixedTopicKeys)
      ? body.mixedTopicKeys
      : body?.mixedTopicKeys === null
        ? null
        : undefined,
    preferMcq:
      body?.preferMcq === true ? true : body?.preferMcq === false ? false : undefined,
  });

  if (!generated.ok) {
    const status = generated.status || 500;
    const mixedMsg = worksheetMixedTopicsErrorHe(String(generated.code || ""));
    return res.status(status).json({
      ok: false,
      error: generated.code,
      message: mixedMsg || generated.message,
    });
  }

  return res.status(200).json({
    ok: true,
    worksheetPayload: handler.publicPayload(generated.worksheetPayload),
    generation: generated.generation,
  });
}
