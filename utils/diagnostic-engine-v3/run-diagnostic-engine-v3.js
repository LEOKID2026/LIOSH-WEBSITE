/**
 * Diagnostic Engine V3 — orchestrator (runs atop DE2; does not replace it).
 */

import { ENGINE_V3_VERSION, ENGINE_V3_BLUEPRINT, V3_WAVE1_SUBJECT_IDS } from "./types.js";
import { buildAllSubskillRollupsV3 } from "./subskill-rollups-v3.js";
import { buildEvidenceContractsFromMistakes } from "./evidence-contract-v3.js";
import { DIAGNOSIS_STAGE } from "./early-stopping-v3.js";

/**
 * @param {object} params
 * @param {Record<string, Record<string, Record<string, unknown>>>} params.maps
 * @param {Record<string, unknown[]>} params.rawMistakesBySubject
 * @param {number} params.startMs
 * @param {number} params.endMs
 * @param {unknown[]|null} [params.probeEvidence]
 * @param {object|null} [params.diagnosticEngineV2]
 */
export function runDiagnosticEngineV3(params) {
  const {
    maps = {},
    rawMistakesBySubject = {},
    startMs = 0,
    endMs = Date.now(),
    probeEvidence = [],
    diagnosticEngineV2 = null,
  } = params;

  const generatedAt = new Date().toISOString();
  const probeList = Array.isArray(probeEvidence) ? probeEvidence : [];

  const rollupsBySubject = buildAllSubskillRollupsV3(
    maps,
    rawMistakesBySubject,
    startMs,
    endMs,
    probeList,
  );

  /** @type {ReturnType<typeof buildEvidenceContractsFromMistakes>[]} */
  const evidenceContracts = [];
  for (const [subjectId, raw] of Object.entries(rawMistakesBySubject || {})) {
    evidenceContracts.push(
      ...buildEvidenceContractsFromMistakes(subjectId, raw, startMs, endMs, probeList),
    );
  }

  /** @type {object[]} */
  const unitEnrichments = [];
  const v2Units = Array.isArray(diagnosticEngineV2?.units) ? diagnosticEngineV2.units : [];

  for (const u of v2Units) {
    if (!u || typeof u !== "object") continue;
    const sid = String(u.subjectId || "");
    const trk = String(u.topicRowKey || "");
    const subjectRollups = rollupsBySubject[sid] || [];
    const match =
      subjectRollups.find((r) => r.topicRowKey === trk) ||
      subjectRollups.find((r) => String(r.topic) === String(u.topicKey || "")) ||
      null;

    unitEnrichments.push({
      subjectId: sid,
      topicRowKey: trk,
      v3Rollup: match,
      v3Confidence: match?.confidence || null,
      v3DiagnosisStage: match?.diagnosisStage || DIAGNOSIS_STAGE.NEEDS_PROBE,
      v3RecommendedNextStep: match?.recommendedNextStep || null,
      de2Confidence: u?.confidence?.level || null,
      de2DiagnosisAllowed: u?.diagnosis?.allowed === true,
    });
  }

  const allRollups = Object.values(rollupsBySubject).flat();
  const priorityRollups = allRollups
    .filter(
      (r) =>
        r.diagnosisStage === DIAGNOSIS_STAGE.STABLE ||
        r.diagnosisStage === DIAGNOSIS_STAGE.WORKING_HYPOTHESIS,
    )
    .slice(0, 12);

  const needsProbe = allRollups.filter((r) => r.diagnosisStage === DIAGNOSIS_STAGE.NEEDS_PROBE).length;
  const contradictory = allRollups.filter((r) => r.contradictorySignals).length;

  return {
    version: ENGINE_V3_VERSION,
    blueprint: ENGINE_V3_BLUEPRINT,
    generatedAt,
    scope: "internal_only",
    parentFacing: false,
    wave1Subjects: [...V3_WAVE1_SUBJECT_IDS],
    window: { startMs, endMs },
    stats: {
      evidenceContractCount: evidenceContracts.length,
      rollupCount: allRollups.length,
      probeEvidenceCount: probeList.length,
      needsProbeRollups: needsProbe,
      contradictoryRollups: contradictory,
      v2UnitsLinked: unitEnrichments.length,
    },
    evidenceContractsSample: evidenceContracts.slice(0, 50),
    rollupsBySubject,
    priorityRollups,
    unitEnrichments,
    de2Reference: diagnosticEngineV2
      ? {
          version: diagnosticEngineV2.version || null,
          unitCount: v2Units.length,
        }
      : null,
    limitations: [
      "V3 enriches DE2; does not override DE2 gating or parent-facing copy.",
      "Subskill precision depends on question metadata coverage.",
      "Correct-answer subskill attribution uses topic-row estimates when metadata sparse.",
      "probeEvidence integrated into confidence; does not replace recurrence rules in DE2.",
    ],
  };
}

export default runDiagnosticEngineV3;
