/**
 * Diagnostic Engine V2 — אורכסטרציה end-to-end לפי stage1 blueprint.
 * תלות: מפות דוח V2 לאחר enrich, טעויות גולמיות, חלון זמן.
 */
import { splitTopicRowKey } from "../parent-report-row-diagnostics.js";
import { filterMistakesForRow } from "../parent-report-row-trend.js";
import { mathReportBaseOperationKey } from "../math-report-generator.js";
import { TAXONOMY_BY_ID } from "./taxonomy-registry.js";
import { taxonomyIdsForReportBucket, normalizeReportBucketKey } from "./topic-taxonomy-bridge.js";
import { orderFractionTaxonomyCandidates } from "./fraction-taxonomy-candidate-order.js";
import { orderMultiplicationTaxonomyCandidates } from "./multiplication-taxonomy-candidate-order.js";
import { orderWordProblemsTaxonomyCandidates } from "./word-problems-taxonomy-candidate-order.js";
import { orderGeometryTaxonomyCandidates } from "./geometry-taxonomy-candidate-order.js";
import { orderEnglishTaxonomyCandidates } from "./english-taxonomy-candidate-order.js";
import { orderHebrewTaxonomyCandidates } from "./hebrew-taxonomy-candidate-order.js";
import { orderMoledetTaxonomyCandidates } from "./moledet-taxonomy-candidate-order.js";
import { passesRecurrenceRules, heavyHintLikelyInvalidatesPattern } from "./recurrence.js";
import { resolveConfidenceLevel } from "./confidence-policy.js";
import { resolvePriority, breadthFromWeakRowCount } from "./priority-policy.js";
import { applyOutputGating } from "./output-gating.js";
import { buildCompetingHypotheses } from "./competing-hypotheses.js";
import { buildProbePlan } from "./probe-layer.js";
import { buildInterventionPlan } from "./intervention-layer.js";
import { deriveStrengthProfile } from "./strength-profile.js";
import { sanitizePedagogicLine } from "./human-boundaries.js";
import { buildCanonicalState, COMPOSITE_KEY_SEPARATOR } from "../canonical-topic-state/index.js";

const ENGINE_VERSION = "2.0.0";
const BLUEPRINT_REF = "docs/stage1-scientific-blueprint-source-of-truth.md v1.0";

/**
 * @param {object} params
 * @param {Record<string, Record<string, Record<string, unknown>>>} params.maps
 * @param {Record<string, unknown[]>} params.rawMistakesBySubject
 * @param {number} params.startMs
 * @param {number} params.endMs
 */
export function runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs, endMs }) {
  const generatedAt = new Date().toISOString();
  /** @type {unknown[]} */
  const allEvidenceRefs = [];

  /** @type {Record<string, number>} */
  const weakRowsBySubject = {};
  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    let c = 0;
    for (const row of Object.values(topicMap)) {
      if (row && typeof row === "object" && row.needsPractice) c += 1;
    }
    weakRowsBySubject[subjectId] = c;
  }

  /** @type {object[]} */
  const units = [];

  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const breadth = breadthFromWeakRowCount(weakRowsBySubject[subjectId] || 0);
    const raw = rawMistakesBySubject?.[subjectId] || [];

    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;

      const events = filterMistakesForRow(subjectId, topicRowKey, row, raw, startMs, endMs);
      const wrongs = events.filter((e) => !e.isCorrect);
      const rowWrongTotal = Math.max(0, Number(row.wrong) || 0);
      const wrongCountForRules = Math.max(wrongs.length, rowWrongTotal);
      const { bucketKey } = splitTopicRowKey(topicRowKey);
      const { normalizedBucketKey: taxonomyBucketKey } = normalizeReportBucketKey(bucketKey);

      const evidenceTrace = [
        { type: "volume", source: "report_row", value: { questions: row.questions, correct: row.correct, wrong: row.wrong, accuracy: row.accuracy } },
        {
          type: "mistake_events",
          source: "normalized_mistake_event",
          value: { total: events.length, wrong: wrongs.length, rowWrongTotal, wrongCountForRules },
        },
      ];
      if (row.lastSessionMs != null) evidenceTrace.push({ type: "recency", source: "row", value: { lastSessionMs: row.lastSessionMs } });

      const hintInvalidates = heavyHintLikelyInvalidatesPattern(events);

      const candidateIdsRaw = taxonomyIdsForReportBucket(subjectId, bucketKey);
      let candidateIds = candidateIdsRaw;
      if (
        subjectId === "math" &&
        mathReportBaseOperationKey(bucketKey) === "fractions" &&
        candidateIdsRaw.includes("M-04") &&
        candidateIdsRaw.includes("M-05")
      ) {
        candidateIds = orderFractionTaxonomyCandidates(candidateIdsRaw, wrongs, {
          row,
          bucketKey,
          topicRowKey,
        });
      } else if (
        subjectId === "math" &&
        mathReportBaseOperationKey(bucketKey) === "multiplication" &&
        candidateIdsRaw.includes("M-03") &&
        candidateIdsRaw.includes("M-10")
      ) {
        candidateIds = orderMultiplicationTaxonomyCandidates(candidateIdsRaw, wrongs, { row });
      } else if (
        subjectId === "math" &&
        mathReportBaseOperationKey(bucketKey) === "word_problems" &&
        candidateIdsRaw.includes("M-07") &&
        candidateIdsRaw.includes("M-08")
      ) {
        candidateIds = orderWordProblemsTaxonomyCandidates(candidateIdsRaw, wrongs, { row });
      } else if (
        subjectId === "geometry" &&
        (taxonomyBucketKey === "quadrilaterals" || taxonomyBucketKey === "area")
      ) {
        candidateIds = orderGeometryTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: taxonomyBucketKey });
      } else if (subjectId === "english") {
        const bk = String(taxonomyBucketKey || "").trim().toLowerCase();
        if (bk === "vocabulary" || bk === "grammar") {
          candidateIds = orderEnglishTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: bk });
        }
      } else if (subjectId === "hebrew") {
        const bk = String(taxonomyBucketKey || "").trim().toLowerCase();
        if (
          (bk === "grammar" && candidateIdsRaw.includes("H-02") && candidateIdsRaw.includes("H-06")) ||
          (bk === "writing" && candidateIdsRaw.includes("H-03") && candidateIdsRaw.includes("H-07"))
        ) {
          candidateIds = orderHebrewTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey });
        }
      } else if (subjectId === "moledet-geography") {
        const bk = String(taxonomyBucketKey || "").trim().toLowerCase();
        if (
          bk === "maps" &&
          candidateIdsRaw.includes("MG-01") &&
          candidateIdsRaw.includes("MG-02") &&
          candidateIdsRaw.includes("MG-08")
        ) {
          candidateIds = orderMoledetTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: bk });
        } else if (
          bk === "geography" &&
          candidateIdsRaw.includes("MG-01") &&
          candidateIdsRaw.includes("MG-02") &&
          candidateIdsRaw.includes("MG-05")
        ) {
          candidateIds = orderMoledetTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: bk });
        } else if (
          bk === "homeland" &&
          candidateIdsRaw.includes("MG-04") &&
          candidateIdsRaw.includes("MG-06")
        ) {
          candidateIds = orderMoledetTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: bk });
        }
      }
      /** @type {string|null} */
      let chosenId = null;
      for (const tid of candidateIds) {
        const trow = TAXONOMY_BY_ID[tid];
        if (!trow) continue;
        if (passesRecurrenceRules(wrongs, trow)) {
          chosenId = tid;
          break;
        }
        if (
          wrongs.length === 0 &&
          wrongCountForRules >= trow.minWrong &&
          !(trow.minDistinctDays > 0) &&
          !(trow.minDistinctPatternFamilies > 0)
        ) {
          chosenId = tid;
          break;
        }
      }
      const weakTaxonomyFallbackBlocked = !chosenId && candidateIdsRaw.length > 0 && wrongCountForRules >= 2;
      const classificationState = !candidateIdsRaw.length
        ? "unclassified_no_taxonomy_match"
        : weakTaxonomyFallbackBlocked
          ? "unclassified_weak_evidence"
          : chosenId
            ? "classified"
            : "unclassified_no_taxonomy_match";
      const classificationReasonCode = !candidateIdsRaw.length
        ? "no_taxonomy_mapping"
        : weakTaxonomyFallbackBlocked
          ? "weak_taxonomy_fallback_blocked"
          : !chosenId
            ? "taxonomy_not_matched"
            : null;

      const recurrenceFull = !!(() => {
        if (!chosenId) return false;
        const trow = TAXONOMY_BY_ID[chosenId];
        if (!trow) return false;
        if (passesRecurrenceRules(wrongs, trow)) return true;
        return (
          wrongs.length === 0 &&
          wrongCountForRules >= trow.minWrong &&
          !(trow.minDistinctDays > 0) &&
          !(trow.minDistinctPatternFamilies > 0)
        );
      })();
      const counterEvidenceStrong =
        (Number(row.accuracy) >= 88 && wrongCountForRules >= 4) ||
        (row.modeKey === "speed" && Number(row.accuracy) >= 82 && wrongCountForRules >= 2);

      const confidence = resolveConfidenceLevel({
        events,
        wrongs,
        row,
        recurrenceFull,
        hintInvalidates,
      });

      const sharpDecline =
        row?.trend && typeof row.trend === "object" && String(row.trend.accuracyDirection || "") === "down";

      const priority = resolvePriority(confidence, breadth, {
        sharpDecline: !!sharpDecline,
        crossSubjectContradiction: confidence === "contradictory",
      });

      const narrowSample = (Number(row.questions) || 0) < 10;
      const weakEvidence = wrongs.length === 0 && wrongCountForRules > 0;
      const strengthProfile = deriveStrengthProfile(row);
      const stableMasteryTag =
        Array.isArray(strengthProfile.tags) && strengthProfile.tags.includes("stable_mastery");
      if (bucketKey && bucketKey.includes(COMPOSITE_KEY_SEPARATOR)) {
        throw new Error(`runDiagnosticEngineV2: topicKey/bucketKey "${bucketKey}" contains composite separator - must be collapsed before engine`);
      }

      const gating = applyOutputGating({
        confidence,
        priority,
        recurrenceFull,
        counterEvidenceStrong,
        hasTaxonomyMatch: !!chosenId,
        narrowSample,
        weakEvidence,
        hintInvalidates,
        questions: row.questions,
        accuracy: row.accuracy,
        wrong: row.wrong,
        needsPractice: !!row.needsPractice,
        stableMasteryTag,
        wrongCountForRules,
        subjectId,
        topicKey: bucketKey,
      });

      const behaviorDom = row?.behaviorProfile?.dominantType;
      const competing = chosenId ? buildCompetingHypotheses(TAXONOMY_BY_ID[chosenId], behaviorDom) : { hypotheses: [], distinguishingEvidenceHe: [] };

      const tax = chosenId ? TAXONOMY_BY_ID[chosenId] : null;
      const diagnosisLineRaw = tax
        ? `מצביע על דפוס: ${tax.patternHe} (נקודת מיקוד: ${tax.subskillHe}) ב${String(row.displayName || bucketKey)}.`
        : "";
      const sanitized = sanitizePedagogicLine(diagnosisLineRaw);

      /** @type {string[]} */
      const whyNotStronger = [];
      if (!recurrenceFull) whyNotStronger.push("חזרתיות מלאה לפי סוג הטעות שנבחר לא הושגה");
      if (narrowSample) whyNotStronger.push("נפח שאלות בשורה קטן מדי לביטחון גבוה");
      if (weakEvidence) whyNotStronger.push("אין רצף אירועי טעות מספק; נדרש חיזוק ראיות לפני קביעה");
      if (hintInvalidates) whyNotStronger.push("רמז כבד מסביר חלק מההצלחות - אין להסיק שליטה מלאה");
      if (counterEvidenceStrong) whyNotStronger.push("דיוק גבוה יחסית לנפח טעויות - נדרשת הבחנה מול רשלנות או רעש");

      /** @type {string[]} */
      const cannotConclude = [];
      if (gating.cannotConcludeYet) cannotConclude.push("לא ניתן לקבוע כיוון עקבי כרגע - כדאי עוד תרגול בטווח");
      if (weakTaxonomyFallbackBlocked) {
        cannotConclude.push("האות עדיין לא מסווג לטקסונומיה יציבה - נשארים בשאלת בדיקה לפני כיוון.");
      }
      if (!chosenId && wrongCountForRules > 0) cannotConclude.push("לא נמצאה התאמה ברורה לסוג טעות אחרי סינון חזרתיות");

      const gradeRelation =
        typeof row.gradeRelation === "string" ? row.gradeRelation.trim() : "unknown";
      const gradeEvidenceScope =
        gradeRelation === "same"
          ? "registered_grade_primary"
          : gradeRelation === "lower"
          ? "prerequisite_foundation"
          : gradeRelation === "higher"
          ? "enrichment_stretch"
          : "unknown_scope";

      const unit = {
        blueprintRef: BLUEPRINT_REF,
        engineVersion: ENGINE_VERSION,
        unitKey: `${subjectId}::${topicRowKey}`,
        subjectId,
        topicRowKey,
        bucketKey,
        displayName: row.displayName || bucketKey,
        gradeEvidence: {
          registeredGradeKey: row.registeredGradeKey ?? null,
          contentGradeKey: row.contentGradeKey ?? row.gradeKey ?? null,
          gradeRelation,
          gradeDelta: row.gradeDelta ?? null,
          evidenceScope: gradeEvidenceScope,
          // Provenance passthrough only (Phase C) — never affects scoring/classification.
          primaryEvidenceSource:
            typeof row.primaryEvidenceSource === "string" ? row.primaryEvidenceSource : null,
          evidenceSources: Array.isArray(row.evidenceSources) ? row.evidenceSources : null,
        },
        classification: {
          state: classificationState,
          reasonCode: classificationReasonCode,
          weakFallbackBlocked: weakTaxonomyFallbackBlocked,
        },
        evidenceTrace,
        taxonomy: tax
          ? {
              id: tax.id,
              domainHe: tax.domainHe,
              topicHe: tax.topicHe,
              subskillHe: tax.subskillHe,
              patternHe: tax.patternHe,
              observableMarkersHe: tax.observableMarkersHe,
              counterEvidenceHe: tax.counterEvidenceHe,
              countsWhenHe: tax.countsWhenHe,
              doesNotCountWhenHe: tax.doesNotCountWhenHe,
              rootsHe: tax.rootsHe,
              competitorsHe: tax.competitorsHe,
              doNotConcludeHe: tax.doNotConcludeHe,
            }
          : null,
        recurrence: {
          full: recurrenceFull,
          minWrongRequired: tax ? tax.minWrong : null,
          wrongEventCount: wrongs.length,
          rowWrongTotal,
          wrongCountForRules,
        },
        confidence: { level: confidence, rowSignals: { confidence01: row.confidence01 ?? null, dataSufficiencyLevel: row.dataSufficiencyLevel ?? null, isEarlySignalOnly: row.isEarlySignalOnly ?? null } },
        priority: { level: priority, breadth },
        competingHypotheses: competing,
        strengthProfile,
        outputGating: gating,
        diagnosis:
          gating.diagnosisAllowed && !(sanitized.stripped && !sanitized.safe)
            ? {
                allowed: true,
                conditional: !!(gating.confidenceOnly || narrowSample || !recurrenceFull),
                taxonomyId: chosenId,
                lineHe: sanitized.safe || diagnosisLineRaw,
                humanBoundaryStripped: sanitized.stripped,
                forbiddenInferencesHe: tax?.doNotConcludeHe || [],
              }
            : {
                allowed: false,
                taxonomyId: chosenId,
                lineHe: sanitized.stripped ? null : sanitized.safe || null,
                conditional: false,
                humanBoundaryStripped: sanitized.stripped,
                forbiddenInferencesHe: tax?.doNotConcludeHe || [],
              },
        probe: gating.probeOnly || gating.diagnosisAllowed ? buildProbePlan(chosenId) : null,
        intervention: gating.interventionAllowed ? buildInterventionPlan(chosenId) : null,
        explainability: {
          whyNotStrongerConclusionHe: whyNotStronger,
          cannotConcludeYetHe: cannotConclude,
        },
      };
      try {
        unit.canonicalState = buildCanonicalState({
          subjectId,
          topicKey: bucketKey,
          bucketKey,
          displayName: row.displayName || bucketKey,
          evidence: {
            questions: Number(row.questions) || 0,
            correct: Number(row.correct) || 0,
            wrong: Number(row.wrong) || 0,
            wrongEventCount: wrongs.length,
            recurrenceFull,
            taxonomyMatch: !!chosenId,
            dataSufficiencyLevel: row.dataSufficiencyLevel || "low",
            confidence01: row.confidence01 ?? null,
            stableMastery: stableMasteryTag,
            needsPractice: !!row.needsPractice,
            positiveAuthorityLevel: gating.positiveAuthorityLevel || "none",
          },
          decisionInputs: {
            priorityLevel: priority,
            breadth,
            counterEvidenceStrong,
            weakEvidence,
            hintInvalidates,
            narrowSample,
          },
          classification: {
            taxonomyId: chosenId,
            classificationState,
            classificationReasonCode,
          },
          confidenceLevel: confidence,
        });
      } catch (err) {
        unit.canonicalState = null;
        unit.canonicalStateError = String(err?.message || err);
      }

      units.push(unit);
      allEvidenceRefs.push({ unitKey: unit.unitKey, evidenceTrace });
    }
  }

  const subjectRollup = Object.keys(maps || {}).map((sid) => {
    const u = units.filter((x) => x.subjectId === sid);
    const anyP4 = u.some((x) => x.priority.level === "P4");
    const anyIntervention = u.some((x) => x.outputGating?.interventionAllowed);
    return {
      subjectId: sid,
      unitCount: u.length,
      weakRowCount: weakRowsBySubject[sid] || 0,
      priorityCeiling: anyP4 ? "P4" : "P3",
      interventionAny: anyIntervention,
    };
  });

  return {
    blueprintRef: BLUEPRINT_REF,
    engineVersion: ENGINE_VERSION,
    generatedAt,
    evidenceFoundation: {
      schema: "MistakeEventV1+report_row",
      mappingChain: "question_event → topicRowKey → bucketKey → taxonomyId (bridge)",
      eventCountHint: "סוכם מסננים per-row; ראה evidenceTrace בכל unit",
    },
    units,
    subjectRollup,
    global: {
      humanReviewRecommended: units.some((u) => u.outputGating?.humanReviewRecommended),
      crossSubjectBreadth: weakRowsBySubject,
    },
    meta: { allEvidenceRefsCount: allEvidenceRefs.length },
  };
}
