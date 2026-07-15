/**
 * Minimal Safe Scope — אכיפת חוזה החלטה, gate-to-text, readiness, ועוצמת המלצות (v1).
 * מקור מדיניות: docs/decision-contract-v1.md, gate-to-text-binding-v1.md,
 * subject-overall-readiness-policy-v1.md, recommendation-intensity-contract-v1.md
 */
import { buildDecisionReadinessContractsBundleV1 } from "./contracts/decision-readiness-contract-v1.js";
import {
  buildRecommendationContractV1,
  validateRecommendationContractV1,
} from "./contracts/recommendation-contract-v1.js";

/** @typedef {"not_ready"|"partial"|"ready"} Readiness */

const READINESS_RANK = { not_ready: 0, partial: 1, ready: 2 };

/**
 * @param {Readiness} a
 * @param {Readiness} b
 * @returns {Readiness}
 */
export function minReadiness(a, b) {
  const ra = READINESS_RANK[a] ?? 1;
  const rb = READINESS_RANK[b] ?? 1;
  return ra <= rb ? a : b;
}

/**
 * @param {object} ctx
 * @returns {number} 0–4 (E0–E4)
 */
export function deriveEvidenceBandFromRowSignals(ctx) {
  const q = Number(ctx?.q ?? ctx?.questions) || 0;
  const ev = String(ctx?.evidenceStrength || "low");
  const suff = String(ctx?.dataSufficiencyLevel || "low");
  const cs = String(ctx?.conclusionStrength || "tentative");
  const cannot = !!ctx?.cannotConcludeYet;

  if (cannot || q <= 0 || q < 4 || suff === "low") return 0;
  if (q < 8 || ev === "low" || cs === "withheld") return 1;
  if (cs === "tentative" || ev === "medium" || suff === "medium") return 2;
  if (cs === "moderate" || (ev === "strong" && q >= 12)) return 3;
  if (cs === "strong" && q >= 14) return 4;
  return 2;
}

/**
 * חישוב max PS (0–3) לפי gate-to-text-binding v1 + עדיפות DEv2.
 * @param {object} p
 */
export function computeEffectiveMaxPS(p) {
  const gateReadiness = String(p?.gateReadiness || "insufficient");
  const gateState = String(p?.gateState || "gates_not_ready");
  const weak = !!p?.weak;
  const cs = String(p?.conclusionStrength || "");
  const cannotConcludeYet = !!p?.cannotConcludeYet;
  const dcv = String(p?.dev2ConfidenceLevel || "");

  let maxPS = 3;
  if (gateReadiness === "insufficient") maxPS = 1;
  else if (gateReadiness === "low" || gateReadiness === "moderate") maxPS = 2;
  else if (gateReadiness === "high") maxPS = 3;

  if (gateState === "gates_not_ready") maxPS = Math.min(maxPS, 2);
  if (weak) maxPS = Math.min(maxPS, 1);
  if (cs === "tentative" || cs === "withheld") maxPS = Math.min(maxPS, 1);
  if (cannotConcludeYet) maxPS = Math.min(maxPS, 1);

  if (dcv === "insufficient_data" || dcv === "contradictory") maxPS = Math.min(maxPS, 0);
  else if (dcv === "early_signal_only" || dcv === "low") maxPS = Math.min(maxPS, 1);
  else if (dcv === "moderate") maxPS = Math.min(maxPS, 2);

  return Math.max(0, Math.min(3, maxPS));
}

const PS3_REGEX =
  /מומלץ בבירור|בהחלט כדאי|בוודאות|מוכח ש|סגורנו|אין ספק|ודאי ש|בטוח ש|מאסטרי מלא|שליטה מלאה/giu;
const PS3_PROMO_REGEX = /קפיצת כיתה|שחרור מלא|עצמאות מלאה|העלאת כיתה כעת/giu;

/**
 * @param {string} text
 * @param {number} maxPS 0–3
 * @param {"diagnosis"|"support"} contentClass
 */
export function clampHebrewParentTextToMaxPS(text, maxPS, contentClass = "diagnosis") {
  if (text == null || text === "") return text;
  let out = String(text);
  if (maxPS >= 3) return out;

  if (maxPS <= 0) {
    out = out.replace(PS3_REGEX, "נאסוף עוד תצפית");
    out = out.replace(PS3_PROMO_REGEX, "לא משנים הגדרה דרמטית בשלב זה");
    if (contentClass === "diagnosis" && !/מוקדם|חלקי|אולי|נאסוף/.test(out)) {
      out = `עדיין מוקדם לנעול כיוון - ${out}`;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  if (maxPS === 1) {
    out = out.replace(PS3_REGEX, "נראה שכדאי");
    out = out.replace(PS3_PROMO_REGEX, "לא לדחוף שינוי חד בשלב זה");
    if (contentClass === "diagnosis" && !/מוקדם|חלקי|אולי/.test(out)) {
      out = `סימן ראשוני בלבד - ${out}`;
    }
  } else if (maxPS === 2) {
    out = out.replace(/מומלץ בבירור|בהחלט כדאי/giu, "כדאי בזהירות");
  }

  return out.replace(/\s+/g, " ").trim();
}

/**
 * @param {Array<{ row?: object, rowKey?: string }>} rows
 */
export function analyzeSubjectRowsForContract(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let totalQ = 0;
  let staleW = 0;
  let q8Rows = 0;
  let singleTopicException = false;

  for (const wrap of list) {
    const row = wrap?.row || wrap;
    const q = Number(row?.questions) || 0;
    totalQ += q;
    const sig =
      row?.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object"
        ? row.topicEngineRowSignals
        : null;
    const fs = String(sig?.freshnessState || row?.freshnessState || "");
    const cf = String(sig?.conclusionFreshness || "");
    if (fs === "stale" || cf === "expired") staleW += q;

    const ev = String(row?.evidenceStrength || sig?.evidenceStrength || "low");
    if (q >= 8) q8Rows += 1;
    if (q >= 14 && ev !== "low") singleTopicException = true;
  }

  const breadthOk = q8Rows >= 2 || singleTopicException;
  const staleWeightFrac = totalQ > 0 ? staleW / totalQ : 0;

  return { totalQ, breadthOk, staleWeightFrac, q8Rows };
}

/**
 * @param {object} args
 * @returns {Readiness}
 */
export function mergeSubjectConclusionReadinessContract(args) {
  const internal = String(args?.internalReadiness || "partial");
  /** @type {Readiness} */
  let r =
    internal === "ready" || internal === "partial" || internal === "not_ready" ? internal : "partial";

  const nR = Math.max(1, Number(args?.rowCount) || 1);
  const wFrac = (Number(args?.withheldStrengthRows) || 0) / nR;
  const tFrac = (Number(args?.tentativeStrengthRows) || 0) / nR;

  const metrics = analyzeSubjectRowsForContract(args?.rows || []);

  if (wFrac >= 0.38) r = "not_ready";
  else if (wFrac + tFrac >= 0.45) r = minReadiness(r, "partial");

  if (!metrics.breadthOk) {
    r = metrics.totalQ < 8 ? minReadiness(r, "not_ready") : minReadiness(r, "partial");
  }
  if (metrics.staleWeightFrac > 0.5) r = minReadiness(r, "partial");

  if (args?.hasCannotConcludeYet) r = minReadiness(r, "partial");

  return r;
}

/**
 * @param {Readiness} phase7
 * @param {Array<{ questionCount?: number }>} subjectCoverage
 * @returns {Readiness}
 */
export function mergeCrossSubjectConclusionReadinessContract(phase7, subjectCoverage) {
  const cov = Array.isArray(subjectCoverage) ? subjectCoverage : [];
  /** @type {Readiness} */
  let r =
    phase7 === "ready" || phase7 === "partial" || phase7 === "not_ready" ? phase7 : "partial";

  const active = cov.filter((c) => (Number(c?.questionCount) || 0) > 0);
  const with12 = cov.filter((c) => (Number(c?.questionCount) || 0) >= 12).length;

  if (active.length < 2) r = minReadiness(r, "not_ready");
  if (r === "ready" && with12 < 2) r = "partial";

  const sumQ = active.reduce((s, c) => s + (Number(c?.questionCount) || 0), 0);
  const maxQ = active.reduce((m, c) => Math.max(m, Number(c?.questionCount) || 0), 0);
  const uneven =
    active.length >= 2 && maxQ > (2 * sumQ) / Math.max(active.length, 1);
  if (r === "ready" && uneven) r = "partial";

  return r;
}

const RI_RANK = { light: 1, focused: 2, targeted: 3 };
const RI_TEXT_FROM_CONTRACT = { RI0: "light", RI1: "light", RI2: "focused", RI3: "targeted" };

const RI_ORDINAL = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 };

/**
 * @param {string|undefined|null} contractRi
 * @param {string|undefined|null} canonicalRi
 */
function minRecommendationIntensityRi(contractRi, canonicalRi) {
  const a = String(contractRi || "RI0").toUpperCase();
  const b = String(canonicalRi || "RI0").toUpperCase();
  const va = RI_ORDINAL[/** @type {keyof typeof RI_ORDINAL} */ (a)] ?? 0;
  const vb = RI_ORDINAL[/** @type {keyof typeof RI_ORDINAL} */ (b)] ?? 0;
  const m = Math.min(va, vb);
  if (m <= 0) return "RI0";
  if (m === 1) return "RI1";
  if (m === 2) return "RI2";
  return "RI3";
}

/**
 * @param {"light"|"focused"|"targeted"} intensity
 * @param {object} ctx
 */
export function capInterventionIntensityByContract(intensity, ctx) {
  const canonicalCap = ctx?.canonicalIntensityCap;
  if (canonicalCap) {
    const capRank = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 }[canonicalCap] ?? 2;
    const baseRank = RI_RANK[intensity] ?? 2;
    const ri = Math.min(baseRank, capRank);
    if (ri <= 1) return "light";
    if (ri === 2) return "focused";
    return "targeted";
  }

  const base = RI_RANK[intensity] ?? 2;
  const band = Number(ctx?.evidenceBand);
  const ebMax =
    band <= 0 ? 0 : band === 1 ? 1 : band === 2 ? 2 : band >= 3 ? 3 : 2;
  let ri = Math.min(base, ebMax === 0 ? 1 : ebMax);

  if (ctx?.suppressAggressiveStep) ri = Math.min(ri, 1);
  if (ctx?.weak) ri = Math.min(ri, 1);
  if (String(ctx?.gateState || "") === "gates_not_ready") ri = Math.min(ri, 2);
  if (ctx?.interventionAllowed === false) ri = Math.min(ri, 1);

  if (ri <= 1) return "light";
  if (ri === 2) return "focused";
  return "targeted";
}

/**
 * @param {object} rec — רשומת המלצת נושא מהמנוע
 */
export function applyGateToTextClampToTopicRecord(rec) {
  if (!rec || typeof rec !== "object") return rec;
  const q = Number(rec?.questions ?? rec?.q) || 0;
  const ev = String(rec?.evidenceStrength || "low");
  const cs = String(rec?.conclusionStrength || "tentative");
  const recCannotConcludeYet = !!(
    rec?.cannotConcludeYet ||
    rec?.outputGating?.cannotConcludeYet ||
    rec?.contractsV1?.decision?.cannotConcludeYet
  );
  const weak = q < 12 || ev === "low" || cs === "withheld" || cs === "tentative";

  const maxPS = computeEffectiveMaxPS({
    gateReadiness: rec?.gateReadiness,
    gateState: rec?.gateState,
    weak,
    conclusionStrength: cs,
    cannotConcludeYet: recCannotConcludeYet,
    dev2ConfidenceLevel: null,
  });

  const contractsV1 = buildDecisionReadinessContractsBundleV1({
    contractsV1: rec?.contractsV1 || rec?.minimalSafeScope?.contractsV1,
    topicKey: String(rec?.topicKey || rec?.topicRowKey || rec?.displayName || "__unknown_topic__"),
    subjectId: String(rec?.subjectId || "__unknown_subject__"),
    q,
    accuracy: Number(rec?.accuracy) || 0,
    evidenceStrength: ev,
    dataSufficiencyLevel: String(rec?.dataSufficiencyLevel || "low"),
    conclusionStrength: cs,
    cannotConcludeYet: recCannotConcludeYet,
    weak,
    internalGateReadinessBand: rec?.gateReadiness,
    gateState: rec?.gateState,
    dev2ConfidenceLevel: String(rec?.dev2ConfidenceLevel || ""),
    confidence: String(rec?.dev2ConfidenceLevel || ""),
  });

  const sourceRecommendationContract =
    rec?.contractsV1?.recommendation && typeof rec.contractsV1.recommendation === "object"
      ? rec.contractsV1.recommendation
      : rec?.recommendationContractV1 && typeof rec.recommendationContractV1 === "object"
        ? rec.recommendationContractV1
        : null;
  const recAnchorIds =
    sourceRecommendationContract && Array.isArray(sourceRecommendationContract.anchorEvidenceIds)
      ? sourceRecommendationContract.anchorEvidenceIds
      : Array.isArray(rec?.contractsV1?.evidence?.anchorEventIds)
        ? rec.contractsV1.evidence.anchorEventIds
        : [];
  let recommendationContractV1 =
    sourceRecommendationContract ||
    buildRecommendationContractV1({
      topicKey: String(rec?.topicKey || rec?.topicRowKey || rec?.displayName || "__unknown_topic__"),
      subjectId: String(rec?.subjectId || "__unknown_subject__"),
      decisionTier: contractsV1?.decision?.decisionTier ?? 0,
      readiness: contractsV1?.readiness?.readiness ?? "insufficient",
      confidenceBand: contractsV1?.confidence?.confidenceBand ?? "low",
      cannotConcludeYet: contractsV1?.decision?.cannotConcludeYet ?? false,
      interventionIntensity: String(rec?.interventionIntensity || "focused"),
      diagnosticType: String(rec?.diagnosticType || ""),
      rootCause: String(rec?.rootCause || ""),
      retentionRisk: String(rec?.retentionRisk || ""),
      evidenceStrength: String(rec?.evidenceStrength || "low"),
      anchorEvidenceIds: recAnchorIds,
    });
  const recContractValidation = validateRecommendationContractV1(recommendationContractV1);
  const recValidationPayload = recContractValidation.ok
    ? rec?.contractsV1?.recommendationValidation && typeof rec.contractsV1.recommendationValidation === "object"
      ? {
          ok: !!rec.contractsV1.recommendationValidation.ok,
          errors: Array.isArray(rec.contractsV1.recommendationValidation.errors)
            ? rec.contractsV1.recommendationValidation.errors
            : [],
        }
      : { ok: true, errors: [] }
    : { ok: false, errors: recContractValidation.errors };
  if (!recContractValidation.ok) {
    recommendationContractV1 = {
      ...recommendationContractV1,
      eligible: false,
      intensity: "RI0",
      family: null,
      forbiddenBecause: [
        ...(Array.isArray(recommendationContractV1.forbiddenBecause)
          ? recommendationContractV1.forbiddenBecause
          : []),
        ...recContractValidation.errors,
      ],
    };
  }

  const canonCapRaw = rec?.canonicalState?.recommendation?.intensityCap;
  const canonRiCap =
    canonCapRaw && /^RI[0-3]$/i.test(String(canonCapRaw)) ? String(canonCapRaw).toUpperCase() : null;
  if (canonRiCap) {
    recommendationContractV1 = {
      ...recommendationContractV1,
      intensity: minRecommendationIntensityRi(recommendationContractV1.intensity, canonRiCap),
    };
  }

  const band = deriveEvidenceBandFromRowSignals({
    q,
    evidenceStrength: ev,
    dataSufficiencyLevel: String(rec?.dataSufficiencyLevel || "low"),
    conclusionStrength: cs,
  });

  const nextIntensity = capInterventionIntensityByContract(String(rec?.interventionIntensity || "focused"), {
    evidenceBand: band,
    gateState: String(rec?.gateState || ""),
    weak,
    suppressAggressiveStep: !!rec?.suppressAggressiveStep,
    interventionAllowed: true,
    canonicalIntensityCap: canonRiCap || undefined,
  });
  const contractIntensityText = RI_TEXT_FROM_CONTRACT[recommendationContractV1.intensity] || "light";
  const nextIntensityFinal =
    RI_RANK[nextIntensity] <= RI_RANK[contractIntensityText] ? nextIntensity : contractIntensityText;

  const parentHe = clampHebrewParentTextToMaxPS(rec.parentHe, maxPS, "support");
  const reasonHe = clampHebrewParentTextToMaxPS(rec.reasonHe, maxPS, "diagnosis");
  const why = clampHebrewParentTextToMaxPS(rec.whyThisRecommendationHe, maxPS, "diagnosis");
  const doNow = clampHebrewParentTextToMaxPS(rec.doNowHe, Math.min(maxPS, 1), "support");
  const plan = clampHebrewParentTextToMaxPS(rec.interventionPlanHe, maxPS, "support");

  return {
    ...rec,
    parentHe,
    reasonHe,
    whyThisRecommendationHe: why,
    doNowHe: doNow,
    interventionPlanHe: plan,
    interventionIntensity: nextIntensityFinal,
    contractsV1: {
      ...(rec?.contractsV1 && typeof rec.contractsV1 === "object" ? rec.contractsV1 : {}),
      recommendation: recommendationContractV1,
      recommendationValidation: recValidationPayload,
    },
    // Backward compatibility mirror only (temporary).
    recommendationContractV1,
    minimalSafeScope: {
      version: 1,
      effectiveMaxPS: maxPS,
      evidenceBand: band,
      gateToTextApplied: true,
      contractsV1,
    },
  };
}

/**
 * מערך המלצות נושא — אחרי בניית המנוע
 * @param {object[]|null|undefined} recs
 */
export function applyGateToTextClampToTopicRecommendations(recs) {
  if (!Array.isArray(recs)) return recs;
  return recs.map((r) => applyGateToTextClampToTopicRecord(r));
}

/**
 * המרת יחידות DEv2 לשורות סינתטיות לחישוב breadth/depth לפי החוזה.
 * @param {object[]} units
 */
export function v2UnitsToContractRows(units) {
  const arr = Array.isArray(units) ? units : [];
  return arr.map((u) => {
    const traces = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
    const volume = traces.find((t) => String(t?.type || "") === "volume")?.value || {};
    const q = Number(volume?.questions) || 0;
    const lev = String(u?.confidence?.level || "");
    let ev = "low";
    if (lev === "moderate") ev = "medium";
    if (lev === "high") ev = "strong";
    const cs = u?.outputGating?.cannotConcludeYet ? "withheld" : "moderate";
    return {
      row: {
        questions: q,
        evidenceStrength: ev,
        topicEngineRowSignals: { conclusionStrength: cs },
      },
    };
  });
}

/**
 * סריקת דוח מפורט לאיתור הפרות (לתרחישים)
 * @returns {{ fails: Array<{ code: string, detail?: string }> }}
 */
export function scanDetailedReportForContractViolations(detailedReport, baseReport) {
  /** @type {Array<{ code: string, detail?: string }>} */
  const fails = [];

  const profiles = detailedReport?.subjectProfiles;
  if (!Array.isArray(profiles)) return { fails };

  for (const sp of profiles) {
    const trs = sp?.topicRecommendations;
    if (!Array.isArray(trs)) continue;
    for (const tr of trs) {
      const q = Number(tr?.questions) || 0;
      const ev = String(tr?.evidenceStrength || "low");
      const cs = String(tr?.conclusionStrength || "");
      const weak = q < 12 || ev === "low" || cs === "withheld" || cs === "tentative";
      const maxPS = computeEffectiveMaxPS({
        gateReadiness: tr?.gateReadiness,
        gateState: tr?.gateState,
        weak,
        conclusionStrength: cs,
        cannotConcludeYet: false,
        dev2ConfidenceLevel: null,
      });
      const combined = `${tr?.parentHe || ""} ${tr?.whyThisRecommendationHe || ""}`;
      if (maxPS < 3 && PS3_REGEX.test(combined)) {
        fails.push({ code: "fail_gate_text", detail: "PS3 under cap" });
      }
      const band = deriveEvidenceBandFromRowSignals({
        q,
        evidenceStrength: ev,
        dataSufficiencyLevel: String(tr?.dataSufficiencyLevel || "low"),
        conclusionStrength: cs,
      });
      if (band <= 1 && /בטוח|ודאי|מוכח|סגור|יציב לחלוטין/giu.test(combined)) {
        fails.push({ code: "fail_too_early", detail: "decisive wording under E0–E1" });
      }
      const riN = RI_RANK[String(tr?.interventionIntensity)] || 0;
      const recContract =
        tr?.contractsV1?.recommendation && typeof tr.contractsV1.recommendation === "object"
          ? tr.contractsV1.recommendation
          : tr?.recommendationContractV1;
      const contractAnchors = Array.isArray(recContract?.anchorEvidenceIds) ? recContract.anchorEvidenceIds : [];
      if (riN >= 1 && contractAnchors.length === 0) {
        fails.push({ code: "fail_unsupported", detail: "recommendation without evidence anchors" });
      }
      if (
        riN >= 3 &&
        band <= 1 &&
        !/\d/.test(combined) &&
        !/שאלות|טעויות|תרגול/.test(combined)
      ) {
        fails.push({ code: "fail_generic", detail: "RI3 under thin evidence without anchor" });
      }
    }
  }

  const es = detailedReport?.executiveSummary;
  if (es?.crossSubjectConclusionReadiness === "ready" && baseReport) {
    const sum = baseReport?.summary || {};
    const qKeys = [
      "mathQuestions",
      "geometryQuestions",
      "englishQuestions",
      "scienceQuestions",
      "hebrewQuestions",
      "moledetGeographyQuestions",
    ];
    let ge12 = 0;
    for (const qk of qKeys) {
      if ((Number(sum[qk]) || 0) >= 12) ge12 += 1;
    }
    if (ge12 < 2) fails.push({ code: "fail_overstated", detail: "overall ready without 2 subjects >=12q" });
  }

  return { fails };
}
