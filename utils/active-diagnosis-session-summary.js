/**
 * Non-visible additive payload for parent report / diagnostics consumers.
 * Reads dev/debug session snapshot only when present (browser); never overclaims.
 */

/**
 * @returns {Record<string, unknown>|null}
 */
export function getActiveDiagnosisSessionSummaryForReport() {
  if (typeof window === "undefined") return null;
  try {
    const d = window.__learningDiagnosticDebug;
    if (!d || typeof d !== "object") return null;
    return {
      version: 1,
      cautionHe:
        "תמונת מצב סשן מקומית בלבד (לא אבחון קליני ולא כיוון סופי).",
      pendingProbe: d.pendingProbe ?? null,
      hypothesisLedger: d.hypothesisLedger ?? null,
      lastProbeSelectionResult: d.lastProbeSelectionResult ?? null,
      lastInferredTags: d.lastInferredTags ?? null,
      lastProbeOutcome: d.lastProbeOutcome ?? null,
      capturedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
