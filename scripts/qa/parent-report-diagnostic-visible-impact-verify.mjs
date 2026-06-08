#!/usr/bin/env node
/**
 * Isolated visible-impact fixture verification (narrow date window).
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  FLAG_ENV,
  FLAG_MODES,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";
import { VISIBLE_IMPACT_FIXTURES } from "./parent-report-diagnostic-visible-impact-seed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-visible-impact");
const WINDOW = { from: "2026-05-01", to: "2026-05-31" };

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

const FIXTURE_WINDOWS = {
  "GATE-LOW": { from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { from: "2026-05-20", to: "2026-05-24" },
  "PROMOTE-STRONG": { from: "2026-05-04", to: "2026-05-11" },
};

async function evaluateFixture(supabase, entry, fixtureId) {
  const window = FIXTURE_WINDOWS[fixtureId] || WINDOW;
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };
  const modes = {};
  for (const mode of FLAG_MODES) {
    applyFlagMode(mode);
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(window.from),
      parseIsoDate(window.to),
      { includeParentActivities: true }
    );
    const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
    const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
    const pub = stripInternalReportPayloadFields(structuredClone(enriched));
    modes[mode.id] = {
      insights: pub.parentFacing?.insights || [],
      practiceFocus: pub.parentFacing?.practiceFocus || [],
      gatingApplied: pub.parentFacing?.gatingApplied === true,
      diagnosisSuppressed: pub.parentFacing?.diagnosisSuppressed === true,
      internal: {
        bySubSkillCount: enriched.meta?._evidenceQuality?.bySubSkill
          ? Object.keys(enriched.meta._evidenceQuality.bySubSkill).length
          : 0,
        gatingDecisionCount: enriched.meta?._evidenceQuality?.gatingDecisions?.length || 0,
        promotionDecisionCount: enriched.meta?._evidenceQuality?.promotionDecisions?.length || 0,
      },
    };
  }
  return modes;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  const results = {};
  for (const [fixtureId, fixture] of Object.entries(VISIBLE_IMPACT_FIXTURES)) {
    const entry = byLabel.get(fixture.label);
    if (!entry) {
      results[fixtureId] = { error: `missing ${fixture.label}` };
      continue;
    }
    const window = FIXTURE_WINDOWS[fixtureId] || WINDOW;
    console.log(`Verify ${fixtureId} (${fixture.label}) ${window.from}..${window.to}`);
    const modes = await evaluateFixture(supabase, entry, fixtureId);
    results[fixtureId] = {
      label: fixture.label,
      scenario: fixture.scenario,
      window,
      modes,
      checks: {
        subskillInternalB: modes.B.internal.bySubSkillCount > 0,
        practiceFocusB: modes.B.practiceFocus.length > 0,
        insightsDiffAC: JSON.stringify(modes.A.insights) !== JSON.stringify(modes.C.insights),
        gatingC: modes.C.gatingApplied || modes.C.internal.gatingDecisionCount > 0,
        noPracticeFocusConflictB: modes.B.practiceFocus.length === 0,
        promotionD: modes.D.internal.promotionDecisionCount > 0,
      },
    };
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const outPath = path.join(ARTIFACT_DIR, "visible-impact-fixture-verify.json");
  await writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
