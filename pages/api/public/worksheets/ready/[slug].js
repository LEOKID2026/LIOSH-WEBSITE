import { rejectIfPublicWorksheetsReadyRateLimited } from "../../../../../lib/security/public-api-rate-limit.js";
import { getReadyWorksheetBySlug } from "../../../../../lib/worksheets/worksheet-ready-catalog.js";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "../../../../../lib/worksheets/worksheet-generate.server.js";
import { buildWorksheetPayloadMeta } from "../../../../../lib/worksheets/worksheet-meta-labels.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfPublicWorksheetsReadyRateLimited(req, res)) return undefined;

  const slug = String(req.query?.slug || "").trim();
  const entry = getReadyWorksheetBySlug(slug);
  if (!entry) {
    return res.status(404).json({ ok: false, error: "not_found" });
  }

  const titleHe = entry.titleHe
    ? entry.titleHe
    : buildWorksheetPayloadMeta({
        subjectId: entry.subjectId,
        gradeKey: entry.gradeKey,
        topicKey: entry.topicKey,
        levelKey: entry.levelKey,
        inkSave: entry.inkSave,
        mathPracticeFormat: entry.mathPracticeFormat,
      }).titleHe;

  const generated = await generateWorksheetForParent({
    subjectId: entry.subjectId,
    gradeKey: entry.gradeKey,
    topicKey: entry.topicKey,
    levelKey: entry.levelKey,
    count: entry.count,
    seed: entry.seed,
    inkSave: entry.inkSave,
    titleHe,
    mathPracticeFormat: entry.mathPracticeFormat,
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
    slug: entry.slug,
  });
}
