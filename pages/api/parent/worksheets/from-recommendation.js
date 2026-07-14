import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import { verifyParentOwnsStudent } from "../../../../lib/parent-server/parent-activity.server.js";
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
  const studentId = String(body?.studentId || "").trim();
  if (!isUuid(studentId)) {
    return res.status(400).json({ ok: false, error: "studentId must be a UUID" });
  }

  const owned = await verifyParentOwnsStudent(ctx.serviceRole, ctx.parentUserId, studentId);
  if (!owned.ok) {
    const status = owned.status || 403;
    return res.status(status).json({ ok: false, error: owned.code || "forbidden" });
  }

  const recommendationId = String(body?.recommendationId || "").trim();
  const subjectId = body?.subjectId;
  const gradeKey = body?.gradeKey;
  const topicKey = body?.topicKey;
  const levelKey = body?.levelKey;
  const count = body?.count;
  const inkSave = body?.inkSave === true;

  const generated = await generateWorksheetForParent({
    subjectId,
    gradeKey,
    topicKey,
    levelKey,
    count,
    seed: body?.seed,
    inkSave,
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
    recommendationId: recommendationId || null,
    worksheetPayload: publicWorksheetPayload(generated.worksheetPayload),
    generation: generated.generation,
  });
}
