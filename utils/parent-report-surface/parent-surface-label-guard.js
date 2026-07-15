/**
 * Parent report surface — block internal/taxonomy labels from parent-visible text.
 */

import { normalizeParentFacingHe } from "../parent-report-language/index.js";

const ENGLISH_TOKEN = /\b[a-z][a-z0-9_]{4,}\b/i;
const ENGINE_STEP =
  /\b(advance_level|advance_grade_topic_only|maintain_and_strengthen|remediate_same_level|drop_one_level_topic_only|drop_one_grade_topic_only|undetermined)\b/i;

/** Probe specification format — never parent-facing, even in geometry. */
const PROBE_SPECIFICATION_HE = /עם\s*\/\s*בלי/i;

/** Geometry-only phrases that must not appear outside geometry. */
const GEOMETRY_ONLY_PHRASES = [
  "אנכי מול אופקי",
  "קו גובה",
  "עם/בלי קו גובה",
  "גובה חיצוני",
  "פריסה",
  "עם/בלי פריסה",
  "עם/בלי ציר",
  "ציר + סימבולי",
];

/** Parent-facing subskill overrides (surface copy only). */
const SUBSKILL_SURFACE_HE = Object.freeze({
  "S-03": "הבנת הקשר בין חלקי הגוף",
});

/**
 * @param {string|null|undefined} taxonomyId
 * @param {string|null|undefined} subjectId
 * @param {string|null|undefined} rawSubskill
 * @param {string} [topicLabel]
 */
export function parentSubskillSurfaceLabelHe(taxonomyId, subjectId, rawSubskill, topicLabel = "") {
  void topicLabel;
  const id = String(taxonomyId || "").trim();
  if (id && SUBSKILL_SURFACE_HE[id]) return SUBSKILL_SURFACE_HE[id];
  const raw = String(rawSubskill || "").trim();
  if (!raw) return "";
  if (ENGLISH_TOKEN.test(raw)) return "";
  if (isForbiddenParentSurfaceLabel(raw, { subjectId, taxonomyId: id })) return "";
  return normalizeParentFacingHe(raw);
}

/**
 * @param {string} text
 * @param {{ subjectId?: string|null, taxonomyId?: string|null }} [ctx]
 */
export function isForbiddenParentSurfaceLabel(text, ctx = {}) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (ENGLISH_TOKEN.test(t)) return true;
  if (ENGINE_STEP.test(t)) return true;
  if (PROBE_SPECIFICATION_HE.test(t)) return true;
  if (/^probeHe$|^interventionHe$|^escalationHe$|^specificationHe$/i.test(t)) return true;

  const sid = String(ctx.subjectId || "").trim().toLowerCase();
  const isGeometry = sid === "geometry" || sid === "math-geometry";

  for (const phrase of GEOMETRY_ONLY_PHRASES) {
    if (!t.includes(phrase)) continue;
    if (!isGeometry) return true;
  }

  if (!isGeometry && /\b(אנכי|אופקי)\b/.test(t) && /מול/.test(t)) return true;

  return false;
}

/**
 * @param {unknown} text
 * @param {{ subjectId?: string|null, taxonomyId?: string|null, allowEmpty?: boolean }} [ctx]
 */
export function sanitizeParentSurfaceTextHe(text, ctx = {}) {
  let t = normalizeParentFacingHe(String(text ?? ""));
  t = t.replace(/\u0001/g, " ");
  t = t.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  t = t.replace(ENGINE_STEP, "");
  t = t.replace(/\b(no_memory|light_memory|not_enough_evidence)\b/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  if (!t) return ctx.allowEmpty ? "" : "";
  if (isForbiddenParentSurfaceLabel(t, ctx)) return "";
  if (/^[\d\s.,/%\-–-]+$/u.test(t)) return "";
  return t;
}

/**
 * @param {unknown} unit
 * @param {unknown} rawAction
 * @param {{ subjectId?: string|null, gradeKey?: string|null }} [ctx]
 */
export function sanitizeParentSurfaceActionHe(unit, rawAction, ctx = {}) {
  const sid = String(ctx.subjectId || unit?.subjectId || "").trim();
  const cleaned = sanitizeParentSurfaceTextHe(rawAction, { subjectId: sid });
  if (cleaned) return cleaned;
  return "";
}
