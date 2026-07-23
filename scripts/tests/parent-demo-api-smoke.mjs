/**
 * Smoke test for public parent portal demo API (requires dev server + .env.local).
 * Run: node --env-file=.env.local scripts/tests/parent-demo-api-smoke.mjs
 * Optional: PARENT_DEMO_BASE_URL=http://127.0.0.1:3001
 */

import assert from "node:assert/strict";
import { DEMO_HISTORY_START } from "../../lib/demo/parent-demo-data/constants.js";
import { todayYmdIsrael } from "../../lib/demo/parent-demo-data/israel-date.server.js";

const BASE = (process.env.PARENT_DEMO_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const BEARER = "demo-parent-portal";
const CHILD_ID = "demo-parent-child-noam-g2";

async function fetchJson(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${BEARER}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 500));
    process.exit(1);
  }
  return { res, json };
}

const list = await fetchJson("/api/demo/parent/list-students");
assert.equal(list.res.status, 200, `list-students: ${JSON.stringify(list.json)}`);
assert.equal(list.json.ok, true);
assert.equal(list.json.students?.length, 3, "expected 3 demo children");

const to = todayYmdIsrael();
const report = await fetchJson(
  `/api/demo/parent/students/${encodeURIComponent(CHILD_ID)}/report-data?from=${DEMO_HISTORY_START}&to=${to}`,
);
assert.equal(report.res.status, 200, `report-data: ${JSON.stringify(report.json)}`);
assert.equal(report.json.ok, true);
assert.ok(report.json.student?.id === CHILD_ID, "student id in payload");

const copilot = await fetchJson("/api/demo/parent/copilot-turn", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: CHILD_ID,
    utterance: "מה המצב הכללי של הילד?",
    from: DEMO_HISTORY_START,
    to,
    sessionId: "smoke-parent-demo",
  }),
});
assert.equal(copilot.res.status, 200, `copilot-turn: ${JSON.stringify(copilot.json)}`);
assert.equal(copilot.json.ok, true);
const answerText = JSON.stringify(copilot.json.result || {});
assert.match(answerText, /[\u0590-\u05FF]/, "copilot answer should contain Hebrew");

console.log("PASS parent-demo-api-smoke");
console.log(
  JSON.stringify(
    {
      children: list.json.students?.map((s) => ({ id: s.id, name: s.full_name })),
      reportRange: { from: DEMO_HISTORY_START, to },
      copilotResolution: copilot.json.result?.resolutionStatus,
    },
    null,
    2,
  ),
);
