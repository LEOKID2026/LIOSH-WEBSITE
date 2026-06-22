#!/usr/bin/env node
/**
 * Plan-only topic mapping check — no DB, no UI.
 * Usage: node scripts/virtual-student-qa/tools/topic-mapping-plan-check.mjs --date 2026-06-08
 */
import { readFileSync } from "node:fs";
import { generateDailyPlan } from "../lib/daily-plan-generator.mjs";
import { PERSONAS, defaultTopicForSubject } from "../scenarios/student-personas.mjs";
import { resolveStateDir } from "../lib/config.mjs";

function parseArgs(argv) {
  let date = "2026-06-08";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--date") date = argv[++i];
  }
  return { date };
}

const { date } = parseArgs(process.argv);
const statePath = `${resolveStateDir()}/state.json`;
const state = JSON.parse(readFileSync(statePath, "utf8"));
const plan = generateDailyPlan({ state, date, mode: "realtime", personas: PERSONAS });

const forbidden = [];
const scienceRows = [];
const geometryRows = [];

for (const [label, st] of Object.entries(plan.students || {})) {
  const grade = st.grade ?? PERSONAS[label]?.grade;
  if (!st.studied) continue;
  for (const s of st.sessions || []) {
    if (s.subject === "science" && s.topic === "observation") {
      forbidden.push(`${label}: science/observation`);
    }
    if (s.subject === "geometry" && s.topic === "shapes") {
      forbidden.push(`${label}: geometry/shapes`);
    }
    if (s.subject === "science") {
      scienceRows.push({ label, grade, topic: s.topic, expected: defaultTopicForSubject("science", grade) });
    }
    if (s.subject === "geometry") {
      geometryRows.push({ label, grade, topic: s.topic, expected: defaultTopicForSubject("geometry", grade) });
    }
  }
}

const unitChecks = [
  { subject: "geometry", grade: 3, expect: "shapes_basic" },
  { subject: "science", grade: 1, expect: "body" },
  { subject: "science", grade: 2, expect: "experiments" },
  { subject: "science", grade: 5, expect: "experiments" },
].map(({ subject, grade, expect }) => ({
  subject,
  grade,
  expect,
  actual: defaultTopicForSubject(subject, grade),
  ok: defaultTopicForSubject(subject, grade) === expect,
}));

const pass =
  forbidden.length === 0 &&
  unitChecks.every((u) => u.ok) &&
  geometryRows.every((r) => r.topic === "shapes_basic") &&
  scienceRows.every((r) => {
    if (r.grade === 1) return r.topic === "body";
    return r.topic === "experiments";
  });

console.log("=== TOPIC MAPPING PLAN CHECK ===");
console.log(`date=${date}`);
console.log(`forbidden=${forbidden.length ? forbidden.join("; ") : "none"}`);
console.log("unitChecks=", JSON.stringify(unitChecks, null, 2));
console.log("scienceSessions=", JSON.stringify(scienceRows, null, 2));
console.log("geometrySessions=", JSON.stringify(geometryRows, null, 2));
console.log(`verdict=${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);
