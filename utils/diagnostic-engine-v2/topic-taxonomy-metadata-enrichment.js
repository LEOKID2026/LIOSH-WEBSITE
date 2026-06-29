/**
 * Stage 4B — enrich question metadata from existing DE v2 taxonomy (no invented rows).
 */

import {
  buildNormalizedTopicKey,
  normalizeDiagnosticSubjectId,
} from "../../utils/diagnostic-evidence.js";
import { taxonomyIdsForReportBucket } from "./topic-taxonomy-bridge.js";
import { TAXONOMY_BY_ID } from "./taxonomy-registry.js";

/**
 * @param {string|null|undefined} patternHe
 */
function patternFamilyKeyFromTaxonomy(patternHe) {
  const p = String(patternHe || "").trim();
  if (!p) return null;
  if (/בלבול|הבנה|מושג|משמעות/.test(p)) return "concept_confusion";
  if (/נוסח|חישוב|אלגוריתם|פרוצדור|עמודה|נשיא|פריט/.test(p)) return "procedure_break";
  if (/רשלנות|מהירות|לחץ/.test(p)) return "careless_flip";
  if (/יחיד|המר/.test(p)) return "unit_conversion";
  return "procedure_break";
}

/**
 * @param {import("./taxonomy-types.js").TaxonomyRow} row
 * @returns {string[]}
 */
function possiblePatternsFromTaxonomyRow(row) {
  /** @type {string[]} */
  const out = [];
  if (row.patternHe) out.push(String(row.patternHe));
  if (Array.isArray(row.competitorsHe)) {
    for (const c of row.competitorsHe) {
      const s = String(c || "").trim();
      if (s) out.push(s);
    }
  }
  if (Array.isArray(row.rootsHe)) {
    for (const r of row.rootsHe) {
      const s = String(r || "").trim();
      if (s) out.push(s);
    }
  }
  return [...new Set(out)].slice(0, 8);
}

/**
 * Pick primary taxonomy id when bucket maps to multiple candidates.
 * Uses only existing question params — no guessing beyond declared fields.
 * @param {string} subjectId
 * @param {string[]} candidateIds
 * @param {Record<string, unknown>|null|undefined} source
 */
export function pickPrimaryTaxonomyIdForMetadata(subjectId, candidateIds, source) {
  const ids = Array.isArray(candidateIds) ? candidateIds.filter(Boolean) : [];
  if (ids.length <= 1) return ids[0] || null;

  const params =
    source?.params && typeof source.params === "object" && !Array.isArray(source.params)
      ? source.params
      : {};
  const kind = String(params.kind || params.patternFamily || "").trim().toLowerCase();
  const subtype = String(params.subtype || "").trim().toLowerCase();

  if (subjectId === "math") {
    if (ids.includes("M-02") && (kind.includes("carry") || kind.includes("regroup") || subtype.includes("carry"))) {
      return "M-02";
    }
    if (ids.includes("M-09") && (kind.includes("borrow") || kind.includes("complement") || subtype.includes("ten"))) {
      return "M-09";
    }
    if (ids.includes("M-04") && (kind.includes("part_whole") || kind.includes("numerator"))) return "M-04";
    if (ids.includes("M-05") && (kind.includes("mirror") || kind.includes("equivalent"))) return "M-05";
    if (ids.includes("M-03") && kind.includes("fact")) return "M-03";
    if (ids.includes("M-10") && (kind.includes("inverse") || kind.includes("ratio"))) return "M-10";
  }

  if (subjectId === "geometry") {
    if (ids.includes("G-08") && (kind.includes("area") || kind.includes("formula"))) return "G-08";
    if (ids.includes("G-03") && (kind.includes("height") || kind.includes("base"))) return "G-03";
    if (ids.includes("G-06") && (kind.includes("perimeter") || kind.includes("unit"))) return "G-06";
  }

  if (subjectId === "english") {
    if (ids.includes("E-01") && (kind.includes("collocation") || kind.includes("vocab"))) return "E-01";
    if (ids.includes("E-05") && kind.includes("preposition")) return "E-05";
  }

  if (subjectId === "history") {
    if (ids.includes("H-08") && (kind.includes("source") || subtype.includes("source"))) return "H-08";
    if (ids.includes("H-02") && (kind.includes("timeline") || kind.includes("sequence"))) return "H-02";
    if (ids.includes("H-03") && (kind.includes("cause") || kind.includes("effect"))) return "H-03";
    if (ids.includes("H-04") && kind.includes("compare")) return "H-04";
  }

  return ids[0];
}

/**
 * @param {object} ctx
 * @param {string} ctx.subjectId
 * @param {string|null|undefined} ctx.topic
 * @param {string|null|undefined} ctx.contentGradeKey
 * @param {Record<string, unknown>|null|undefined} [ctx.source]
 * @param {Record<string, unknown>} [ctx.baseMeta]
 */
export function enrichMetadataFromTaxonomy(ctx) {
  const sid = normalizeDiagnosticSubjectId(ctx.subjectId);
  const topic = String(ctx.topic || "general").trim() || "general";
  const normKey = buildNormalizedTopicKey(topic, ctx.contentGradeKey);
  const candidateIds = taxonomyIdsForReportBucket(sid, normKey);
  const base = ctx.baseMeta && typeof ctx.baseMeta === "object" ? { ...ctx.baseMeta } : {};

  if (!candidateIds.length) {
    return {
      ...base,
      taxonomyIds: [],
      taxonomyMissing: true,
      metadataSource: base.metadataSource || "taxonomy_missing",
    };
  }

  const primaryId = pickPrimaryTaxonomyIdForMetadata(sid, candidateIds, ctx.source);
  const trow = primaryId ? TAXONOMY_BY_ID[primaryId] : null;
  if (!trow) {
    return {
      ...base,
      taxonomyIds: candidateIds,
      taxonomyMissing: false,
      metadataSource: base.metadataSource || "taxonomy_id_unresolved",
    };
  }

  const taxonomyPatterns = possiblePatternsFromTaxonomyRow(trow);
  const patternFamily =
    base.patternFamily ||
    (trow.patternHe ? patternFamilyKeyFromTaxonomy(trow.patternHe) : null) ||
    `tax_${primaryId}`;

  /** @type {string[]} */
  const possibleErrorPatterns = [];
  if (Array.isArray(base.possibleErrorPatterns)) {
    possibleErrorPatterns.push(...base.possibleErrorPatterns.map(String));
  }
  for (const p of taxonomyPatterns) possibleErrorPatterns.push(p);

  return {
    ...base,
    taxonomyIds: candidateIds,
    taxonomyId: primaryId,
    skillId: base.skillId || primaryId,
    subskillId: base.subskillId || base.subSkill || primaryId,
    subSkill: base.subSkill || trow.subskillHe || null,
    patternFamily,
    possibleErrorPatterns: possibleErrorPatterns.length ? [...new Set(possibleErrorPatterns)].slice(0, 12) : null,
    metadataConfidence: base.metadataConfidence || "medium",
    metadataSource: base.metadataSource || "taxonomy_topic_enrichment",
    taxonomyMissing: false,
  };
}
