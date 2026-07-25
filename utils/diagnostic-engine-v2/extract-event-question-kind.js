/**
 * Resolve question kind from normalized mistake events (questionId pipe format, params, metadata).
 */

import { mergeClassifierParamsFromQuestionId } from "../diagnostic-evidence.js";

/** @param {import("../mistake-event.js").MistakeEventV1} ev */
export function extractEventQuestionKind(ev) {
  if (!ev) return null;
  const fromKind = ev.kind || (ev.params && typeof ev.params === "object" ? ev.params.kind : null);
  if (fromKind) return String(fromKind).trim();
  const meta = ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {};
  if (meta.questionType) return String(meta.questionType).trim();
  const qid = ev.questionLabel || meta.questionId || null;
  if (qid) {
    const parts = String(qid).split("|");
    if (parts[1]) return parts[1].trim();
  }
  return null;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 */
export function extractMulOperandPair(ev) {
  if (!ev) return null;
  const params = mergeClassifierParamsFromQuestionId(
    ev.questionLabel || ev.metadata?.questionId,
    ev.params && typeof ev.params === "object" ? ev.params : {},
  );
  const kind = extractEventQuestionKind(ev) || String(params.kind || "");
  let a = Number(params.a);
  let b = Number(params.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    if (kind === "mul_vertical" || kind.includes("mul")) {
      a = Number(params.twoDigit ?? params.tens ?? params.hundreds ?? params.a);
      b = Number(params.oneDigit ?? params.multiplier ?? params.b);
    }
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b, key: `${a}×${b}` };
}
