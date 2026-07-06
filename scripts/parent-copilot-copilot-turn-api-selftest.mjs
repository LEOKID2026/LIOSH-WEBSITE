/**
 * Focused checks for `/api/parent/copilot-turn` payload trust rules (no HTTP server).
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function loadPayloadModule() {
  return import(pathToFileURL(join(ROOT, "lib/parent-copilot/copilot-turn-payload.server.js")).href);
}

async function main() {
  const sampleUuid = "550e8400-e29b-41d4-a716-446655440000";
  const fakePayload = { version: 2, diagnosticEngineV2: { units: [] } };

  const prevNodeEnv = process.env.NODE_ENV;
  const prevEmerg = process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION;

  try {
    // --- Strict production: client payload ignored for engine; rebuild stub → 422
    process.env.NODE_ENV = "production";
    delete process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION;

    let { resolveCopilotTurnPayloadForApi, isStrictProductionCopilotPayloadMode, parseReportRangeFromBody } =
      await loadPayloadModule();
    assert.equal(isStrictProductionCopilotPayloadMode(), true);

    const explicitRange = parseReportRangeFromBody({
      reportPeriod: "month",
      rangeFrom: "2026-05-25",
      rangeTo: "2026-06-23",
    });
    assert.equal(explicitRange.ok, true);
    assert.equal(explicitRange.from, "2026-05-25");
    assert.equal(explicitRange.to, "2026-06-23");
    assert.equal(explicitRange.period, "month");

    let r = await resolveCopilotTurnPayloadForApi({
      body: {
        studentId: sampleUuid,
        reportPeriod: "week",
        payload: fakePayload,
      },
      auth: { ok: true, mode: "student_session" },
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, "SERVER_SNAPSHOT_UNAVAILABLE");

    // --- Production emergency override is fail-closed (operator flag ignored)
    process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION = "true";
    ({ resolveCopilotTurnPayloadForApi, isStrictProductionCopilotPayloadMode } = await loadPayloadModule());
    assert.equal(isStrictProductionCopilotPayloadMode(), true);

    r = await resolveCopilotTurnPayloadForApi({
      body: {
        studentId: sampleUuid,
        reportPeriod: "week",
        payload: fakePayload,
      },
      auth: { ok: true, mode: "student_session" },
    });
    assert.equal(r.ok, false);
    assert.equal(r.code, "SERVER_SNAPSHOT_UNAVAILABLE");

    // --- Development: uses client payload
    process.env.NODE_ENV = "development";
    delete process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION;
    ({ resolveCopilotTurnPayloadForApi } = await loadPayloadModule());

    r = await resolveCopilotTurnPayloadForApi({
      body: { payload: fakePayload },
      auth: { ok: true, mode: "student_session" },
    });
    assert.equal(r.ok, true);
    assert.equal(r.payload, fakePayload);
  } finally {
    if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv;
    else delete process.env.NODE_ENV;
    if (prevEmerg !== undefined) process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION = prevEmerg;
    else delete process.env.PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION;
  }

  console.log("OK parent-copilot-copilot-turn-api-selftest");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
