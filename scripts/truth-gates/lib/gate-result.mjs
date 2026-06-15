/**
 * Standard Truth Gate result contract (Phase 5).
 * Exit codes: 0 = PASS, 1 = FAIL, 2 = SKIP (missing env / prerequisites).
 */

/** @typedef {"PASS"|"FAIL"|"SKIP"} GateVerdict */

/**
 * @param {{
 *   gate: string;
 *   verdict: GateVerdict;
 *   layer?: string;
 *   usesMock?: boolean;
 *   usesArtifact?: boolean;
 *   usesLiveDb?: boolean;
 *   usesLiveApi?: boolean;
 *   usesLiveUi?: boolean;
 *   usesRealPdfBytes?: boolean;
 *   message?: string;
 *   details?: Record<string, unknown>;
 * }} args
 */
export function emitGateResult(args) {
  const payload = {
    gate: args.gate,
    verdict: args.verdict,
    layer: args.layer || inferLayer(args.gate),
    usesMock: Boolean(args.usesMock),
    usesArtifact: Boolean(args.usesArtifact),
    usesLiveDb: Boolean(args.usesLiveDb),
    usesLiveApi: Boolean(args.usesLiveApi),
    usesLiveUi: Boolean(args.usesLiveUi),
    usesRealPdfBytes: Boolean(args.usesRealPdfBytes),
    message: args.message || "",
    details: args.details || {},
    at: new Date().toISOString(),
  };

  const prefix =
    payload.verdict === "PASS"
      ? `${payload.gate}: PASS`
      : payload.verdict === "SKIP"
        ? `${payload.gate}: SKIP`
        : `${payload.gate}: FAIL`;

  console.log(`${prefix} — ${payload.message || payload.layer}`);
  console.log(JSON.stringify(payload, null, 2));

  if (payload.verdict === "PASS") return 0;
  if (payload.verdict === "SKIP") return 2;
  return 1;
}

/** @param {string} gate */
function inferLayer(gate) {
  if (gate.includes("DB")) return "database";
  if (gate.includes("API")) return "api";
  if (gate.includes("UI") || gate.includes("MOCK_UI")) return "ui";
  if (gate.includes("PDF")) return "pdf";
  if (gate.includes("E2E")) return "e2e";
  if (gate.includes("LOCALSTORAGE") || gate.includes("PRODUCTION_GUARD")) return "source-guard";
  return "contract";
}

export function passGate(gate, message, extra = {}) {
  process.exit(emitGateResult({ gate, verdict: "PASS", message, ...extra }));
}

export function failGate(gate, message, extra = {}) {
  process.exit(emitGateResult({ gate, verdict: "FAIL", message, ...extra }));
}

export function skipGate(gate, message, extra = {}) {
  process.exit(emitGateResult({ gate, verdict: "SKIP", message, ...extra }));
}
