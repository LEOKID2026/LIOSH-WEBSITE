import { runParentReportGenerationFromApiBody } from "../learning-supabase/parent-report-from-api-payload.js";

/**
 * Parent Copilot is only available on the detailed report (`parent-report-detailed`, full mode).
 * Regular and summary reports never show Copilot.
 */
export function resolveShowParentCopilotOnShort() {
  return false;
}

/**
 * Regular report fetch must not build or retain a Copilot payload.
 */
export function resolveIncludeCopilotDetailedPayload() {
  return false;
}

/**
 * Mirrors `{showParentCopilotOnShort && copilotDetailedPayload ? <Panel/> : null}`.
 */
export function shouldRenderParentCopilotOnShortPanel() {
  return false;
}

export function resolveCopilotDetailedPayloadValue() {
  return null;
}

/**
 * @param {string} uiPeriod
 * @param {{
 *   setReport: (v: unknown) => void,
 *   setPlayerName: (v: string) => void,
 *   setShortContractTop: (v: unknown) => void,
 *   setParentReportError: (v: string) => void,
 *   setLoading: (v: boolean) => void,
 * }} setters
 */
export function applyParentReportRemoteApiBody(body, uiPeriod, setters) {
  const out = runParentReportGenerationFromApiBody(body, uiPeriod);
  if (!out.ok || !out.base) return false;
  setters.setReport(out.base);
  setters.setPlayerName(out.playerName);
  setters.setShortContractTop(out.detailed?.parentProductContractV1?.top || null);
  setters.setParentReportError("");
  setters.setLoading(false);
  return true;
}
