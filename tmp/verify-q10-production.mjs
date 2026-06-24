#!/usr/bin/env node
import { resolveParentBearer } from "../scripts/truth-gates/lib/live-parent-report.mjs";

const PROD = process.env.COPILOT_PROD_ORIGIN || "https://liosh-website.vercel.app";

const home = await fetch(PROD);
const html = await home.text();
const buildId = html.match(/"buildId":"([^"]+)"/)?.[1] || null;

const { token } = await resolveParentBearer(PROD);
if (!token) throw new Error("Parent bearer unavailable");

const res = await fetch(`${PROD}/api/parent/copilot-turn`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: "38e2dbcf-a927-419f-a2ed-b26c7100e656",
    utterance: "תסביר לי את הדוח במילים פשוטות.",
    sessionId: `q10-prod-${Date.now()}`,
    reportPeriod: "custom",
    rangeFrom: "2026-05-26",
    rangeTo: "2026-06-24",
    payload: { version: 999, ignored: true },
  }),
  signal: AbortSignal.timeout(120_000),
});

const json = await res.json().catch(() => ({}));
const core = json?.result?.response || json?.result || json?.response || json;
const text =
  core?.resolutionStatus === "resolved"
    ? (core.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ")
    : String(core?.clarificationQuestionHe || json?.error || "");

const forbidden = [
  "אין מספיק נתונים",
  "אין מספיק תרגול",
  "אין מספיק מידע",
  "מגביל כמה ברורה",
].filter((p) => text.includes(p));

const checks = {
  http200: res.status === 200,
  opensCorrect: text.includes("במילים פשוטות: יש מספיק תרגול כדי לראות איפה להתחיל"),
  chibur102_33: /חיבור|חשבון/.test(text) && text.includes("102") && text.includes("33"),
  science44_75: text.includes("44") && text.includes("75"),
  geometry25_72: text.includes("25") && text.includes("72"),
  english18_67: text.includes("18") && text.includes("67"),
  hebrew25_64: text.includes("25") && text.includes("64"),
  homeAction: (text.includes("5–10") || text.includes("5-10")) && (text.includes("3–5") || text.includes("3-5")),
  noForbidden: forbidden.length === 0,
};

console.log(
  JSON.stringify(
    {
      buildId,
      commitExpected: "533b11bad974360eb1676bf42d76d7419784918c",
      httpStatus: res.status,
      intent: core?.intent,
      vercelId: res.headers.get("x-vercel-id"),
      pass: Object.values(checks).every(Boolean),
      checks,
      forbiddenFound: forbidden,
      fullText: text,
    },
    null,
    2,
  ),
);

process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
