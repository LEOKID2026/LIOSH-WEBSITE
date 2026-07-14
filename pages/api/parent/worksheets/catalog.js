import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { READY_WORKSHEET_CATALOG } from "../../../../lib/worksheets/worksheet-ready-catalog.js";
import {
  worksheetGradeLabelHe,
  worksheetLevelLabelHe,
  worksheetSubjectLabelHe,
  worksheetTopicLabelHe,
} from "../../../../lib/worksheets/worksheet-meta-labels.server.js";
import { mathPracticeFormatTitleHe } from "../../../../lib/worksheets/worksheet-math-practice-format.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const items = READY_WORKSHEET_CATALOG.map((entry) => ({
    slug: entry.slug,
    subjectId: entry.subjectId,
    subjectHe: worksheetSubjectLabelHe(entry.subjectId),
    gradeKey: entry.gradeKey,
    gradeHe: worksheetGradeLabelHe(entry.subjectId, entry.gradeKey),
    topicKey: entry.topicKey,
    topicHe:
      entry.titleHe ||
      (entry.mathPracticeFormat
        ? mathPracticeFormatTitleHe(
            entry.mathPracticeFormat,
            entry.topicKey,
            entry.gradeKey
          )
        : worksheetTopicLabelHe(entry.subjectId, entry.topicKey)),
    levelKey: entry.levelKey,
    levelHe: worksheetLevelLabelHe(entry.subjectId, entry.levelKey),
    count: entry.count,
    inkSave: entry.inkSave === true,
  }));

  return res.status(200).json({ ok: true, items });
}
