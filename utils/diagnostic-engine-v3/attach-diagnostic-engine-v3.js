/**
 * Attach Diagnostic Engine V3 to an existing report / DE2 payload (additive).
 */

import { runDiagnosticEngineV3 } from "./run-diagnostic-engine-v3.js";

/**
 * @param {object} baseReport — generateParentReportV2 output (mutated in place)
 * @param {object} [opts]
 * @param {unknown[]|null} [opts.probeEvidence]
 */
export function attachDiagnosticEngineV3(baseReport, opts = {}) {
  if (!baseReport || typeof baseReport !== "object") return null;

  const maps = {
    math: baseReport.mathOperations,
    geometry: baseReport.geometryTopics,
    english: baseReport.englishTopics,
    science: baseReport.scienceTopics,
    hebrew: baseReport.hebrewTopics,
    history: baseReport.historyTopics,
    "moledet-geography": baseReport.moledetGeographyTopics,
    ...(baseReport.maps && typeof baseReport.maps === "object" ? baseReport.maps : {}),
  };

  const rawMistakesBySubject =
    baseReport.rawMistakesBySubject ||
    baseReport._internalRawMistakesBySubject ||
    baseReport._rawMistakesBySubject ||
    baseReport.mistakesBySubjectMaps ||
    {};

  const startMs = Number(baseReport._reportStartMs) || Number(opts.startMs) || 0;
  const endMs = Number(baseReport._reportEndMs) || Number(opts.endMs) || Date.now();

  const probeEvidence =
    opts.probeEvidence ??
    baseReport.probeEvidence ??
    baseReport._reportApiPayload?.probeEvidence ??
    null;

  const probeList = Array.isArray(probeEvidence)
    ? probeEvidence
    : probeEvidence && typeof probeEvidence === "object" && Array.isArray(probeEvidence.items)
      ? probeEvidence.items
      : [];

  const v3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs,
    endMs,
    probeEvidence: probeList,
    diagnosticEngineV2: baseReport.diagnosticEngineV2 || null,
  });

  baseReport.diagnosticEngineV3 = v3;
  return v3;
}

export { runDiagnosticEngineV3 };
