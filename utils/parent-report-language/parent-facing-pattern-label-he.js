/**
 * Parent-safe diagnostic pattern labels — maps engine taxonomy text (e.g. M-10)
 * to approved Hebrew for report surfaces. Does not alter engine taxonomy storage.
 */

import { mathReportBaseOperationKey } from "../math-report-generator.js";
import { rewriteEngineTaxonomySnippetForParentHe } from "../diagnostic-labels-he.js";
import { normalizeParentFacingHe } from "./parent-facing-normalize-he.js";

/** Engine-internal M-10 patternHe — must not appear parent-facing. */
export const M10_ENGINE_PATTERN_HE = "בחירת כפל לא מתאים לחילוק";

export const M10_PARENT_PATTERN_LABELS = {
  divisionBuckets:
    "לפי השאלות שתורגלו בתקופה שנבחרה, כדאי להמשיך לתרגל חילוק ולחזק את הקשר לכפל.",
  multiplication:
    "לפי השאלות שתורגלו בתקופה שנבחרה, כדאי להמשיך לתרגל את הקשר ההפוך בין כפל לחילוק.",
  thinFallback:
    "לפי השאלות שתורגלו בתקופה שנבחרה, כדאי להמשיך לתרגל חילוק ולחזק את הקשר לכפל.",
};

/**
 * @param {unknown} unit
 * @returns {boolean}
 */
export function isM10ThinOrUnclearEvidence(unit) {
  if (!unit || typeof unit !== "object") return true;
  const u = /** @type {Record<string, unknown>} */ (unit);
  const conf = String(u?.confidence?.level || "")
    .trim()
    .toLowerCase();
  if (conf === "low" || conf === "contradictory") return true;
  const gating = u?.outputGating;
  if (gating && typeof gating === "object" && /** @type {Record<string, unknown>} */ (gating).cannotConcludeYet) {
    return true;
  }
  const classification = u?.classification;
  if (
    classification &&
    typeof classification === "object" &&
    /** @type {Record<string, unknown>} */ (classification).weakFallbackBlocked
  ) {
    return true;
  }
  const diagnosis = u?.diagnosis;
  if (diagnosis && typeof diagnosis === "object" && /** @type {Record<string, unknown>} */ (diagnosis).allowed === false) {
    return true;
  }
  const recurrence = u?.recurrence;
  if (recurrence && typeof recurrence === "object" && /** @type {Record<string, unknown>} */ (recurrence).full === false) {
    return true;
  }
  const ev = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
  const vol = ev.find((e) => e && typeof e === "object" && /** @type {Record<string, unknown>} */ (e).type === "volume");
  const volVal =
    vol && typeof vol === "object" ? /** @type {Record<string, unknown>} */ (vol).value : null;
  const q =
    volVal && typeof volVal === "object" ? Number(/** @type {Record<string, unknown>} */ (volVal).questions) || 0 : 0;
  if (q > 0 && q < 10) return true;
  const wrongEv =
    recurrence && typeof recurrence === "object"
      ? Number(/** @type {Record<string, unknown>} */ (recurrence).wrongEventCount) || 0
      : 0;
  const wrongRules =
    recurrence && typeof recurrence === "object"
      ? Number(/** @type {Record<string, unknown>} */ (recurrence).wrongCountForRules) || 0
      : 0;
  if (wrongRules > 0 && wrongEv === 0) return true;
  return false;
}

/**
 * @param {unknown} bucketKeyRaw
 * @returns {string}
 */
function normalizedMathBucketKey(bucketKeyRaw) {
  const raw = String(bucketKeyRaw || "").trim();
  if (!raw) return "";
  return mathReportBaseOperationKey(raw);
}

/**
 * Approved parent label for math M-10 only.
 *
 * @param {unknown} unit
 * @returns {string}
 */
export function parentFacingM10PatternLabelHe(unit) {
  const bucket = normalizedMathBucketKey(
    unit && typeof unit === "object" ? /** @type {Record<string, unknown>} */ (unit).bucketKey : "",
  );
  if (isM10ThinOrUnclearEvidence(unit)) {
    if (bucket === "multiplication") {
      return M10_PARENT_PATTERN_LABELS.multiplication;
    }
    return M10_PARENT_PATTERN_LABELS.thinFallback;
  }
  if (bucket === "multiplication") {
    return M10_PARENT_PATTERN_LABELS.multiplication;
  }
  if (bucket === "division" || bucket === "division_with_remainder" || bucket === "ratio") {
    return M10_PARENT_PATTERN_LABELS.divisionBuckets;
  }
  return M10_PARENT_PATTERN_LABELS.thinFallback;
}

/**
 * @param {unknown} unit
 * @returns {string}
 */
function unitTaxonomyId(unit) {
  if (!unit || typeof unit !== "object") return "";
  const u = /** @type {Record<string, unknown>} */ (unit);
  const tax = u.taxonomy;
  const fromTax =
    tax && typeof tax === "object" ? String(/** @type {Record<string, unknown>} */ (tax).id || "").trim() : "";
  if (fromTax) return fromTax;
  const diag = u.diagnosis;
  return diag && typeof diag === "object"
    ? String(/** @type {Record<string, unknown>} */ (diag).taxonomyId || "").trim()
    : "";
}

/**
 * Parent-safe pattern label for a diagnostic V2 unit.
 * Non-M-10 taxonomies keep existing rewrite behavior on raw patternHe.
 *
 * @param {unknown} unit
 * @returns {string}
 */
export function parentFacingPatternLabelHe(unit) {
  if (!unit || typeof unit !== "object") return "";
  const u = /** @type {Record<string, unknown>} */ (unit);
  const raw = String(
    (u.taxonomy && typeof u.taxonomy === "object"
      ? /** @type {Record<string, unknown>} */ (u.taxonomy).patternHe
      : "") || "",
  ).trim();
  if (!raw && unitTaxonomyId(unit) !== "M-10") return "";

  if (unitTaxonomyId(unit) === "M-10") {
    return normalizeParentFacingHe(parentFacingM10PatternLabelHe(unit));
  }

  if (!raw) return "";
  return normalizeParentFacingHe(rewriteEngineTaxonomySnippetForParentHe(raw));
}

/**
 * Replace embedded engine M-10 pattern text inside longer diagnosis snippets.
 *
 * @param {unknown} unit
 * @param {string|null|undefined} rawText
 * @returns {string}
 */
export function parentFacingDiagnosisSnippetHe(unit, rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return parentFacingPatternLabelHe(unit);
  }
  if (unitTaxonomyId(unit) === "M-10" && text.includes(M10_ENGINE_PATTERN_HE)) {
    const mapped = parentFacingM10PatternLabelHe(unit);
    return normalizeParentFacingHe(text.split(M10_ENGINE_PATTERN_HE).join(mapped));
  }
  const rewritten = rewriteEngineTaxonomySnippetForParentHe(text);
  if (rewritten.includes(M10_ENGINE_PATTERN_HE)) {
    return normalizeParentFacingHe(rewritten.split(M10_ENGINE_PATTERN_HE).join(parentFacingM10PatternLabelHe(unit)));
  }
  return normalizeParentFacingHe(rewritten);
}

/**
 * @param {unknown} blob
 * @returns {string[]}
 */
export function findM10EnginePatternLeaksInValue(blob) {
  /** @type {string[]} */
  const hits = [];
  const needle = M10_ENGINE_PATTERN_HE;
  const walk = (v, path) => {
    if (typeof v === "string") {
      if (v.includes(needle)) hits.push(path || "(root)");
      return;
    }
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [k, child] of Object.entries(v)) {
      walk(child, path ? `${path}.${k}` : k);
    }
  };
  walk(blob, "");
  return hits;
}

/**
 * Replace engine-internal M-10 pattern text on embedded V2 units in parent snapshots.
 *
 * @param {unknown} diag
 * @returns {unknown}
 */
export function sanitizeDiagnosticEngineV2ForParentFacing(diag) {
  if (!diag || typeof diag !== "object" || !Array.isArray(diag.units)) return diag;
  const units = diag.units.map((u) => {
    if (!u || typeof u !== "object") return u;
    if (unitTaxonomyId(u) !== "M-10") return u;
    const mappedPattern = parentFacingPatternLabelHe(u);
    let next = { ...u };
    if (mappedPattern && next.taxonomy && typeof next.taxonomy === "object") {
      next = { ...next, taxonomy: { ...next.taxonomy, patternHe: mappedPattern } };
    }
    if (next.diagnosis && typeof next.diagnosis === "object") {
      const rawLine = String(next.diagnosis.lineHe || "").trim();
      if (rawLine) {
        next = {
          ...next,
          diagnosis: {
            ...next.diagnosis,
            lineHe: parentFacingDiagnosisSnippetHe(u, rawLine),
          },
        };
      }
    }
    return next;
  });
  return { ...diag, units };
}
