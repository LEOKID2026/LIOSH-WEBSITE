#!/usr/bin/env node
/**
 * Isolated parent-context QA seed for diagnostic visible-impact fixtures.
 * Tag: parent-report-diagnostic-visible-impact-v1
 * Scenarios: GATE-LOW, SUBSKILL-FOCUS, SUBSKILL-CONFLICT, PROMOTE-STRONG
 * No school / classroom data.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs --clean-only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { resolveAaaStudents } from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEED_TAG = "parent-report-diagnostic-visible-impact-v1";
const SEED_META_KEY = "parentReportDiagnosticVisibleImpact";
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-visible-impact");

/** @type {Record<string, { label: string, scenario: string, subject: string, topic: string, seed: object }>} */
export const VISIBLE_IMPACT_FIXTURES = {
  "GATE-LOW": {
    label: "AAA9",
    scenario: "GATE-LOW",
    subject: "math",
    topic: "fractions",
    seed: {
      days: ["2026-05-10", "2026-05-14", "2026-05-18"],
      counts: [5, 5, 5],
      wrongs: [3, 3, 3],
      metaKey: "weakTopicOnly",
    },
  },
  "SUBSKILL-FOCUS": {
    label: "AAA10",
    scenario: "SUBSKILL-FOCUS",
    subject: "english",
    topic: "grammar",
    seed: {
      days: ["2026-05-06", "2026-05-13", "2026-05-20"],
      counts: [4, 4, 4],
      wrongs: [2, 2, 2],
      metaKey: "englishGrammar",
    },
  },
  "SUBSKILL-CONFLICT": {
    label: "AAA8",
    scenario: "SUBSKILL-CONFLICT",
    subject: "math",
    topic: "fractions",
    seed: {
      type: "practice_mixed_meta",
      segments: [
        {
          days: ["2026-05-20", "2026-05-21"],
          counts: [4, 4],
          wrongs: [0, 1],
          metaKey: "mathTechnical",
        },
        {
          days: ["2026-05-23", "2026-05-24"],
          counts: [3, 4],
          wrongs: [2, 2],
          metaKey: "mathWordProblem",
        },
      ],
    },
  },
  "PROMOTE-STRONG": {
    label: "AAA5",
    scenario: "PROMOTE-STRONG",
    subject: "math",
    topic: "fractions",
    seed: {
      days: ["2026-05-04", "2026-05-11"],
      counts: [5, 5],
      wrongs: [2, 2],
      metaKey: "mathTechnical",
    },
  },
};

async function loadSimulationModule() {
  process.env.QA_PARENT_SEED_TAG = SEED_TAG;
  process.env.QA_PARENT_SEED_META_KEY = SEED_META_KEY;
  return import("./parent-report-q2e-monthly-simulation.mjs");
}

async function seedFixture(supabase, entry, fixture, sim) {
  const { buildAnswerSchedule, gradeDbKey, insertPracticeSession, META } = sim;
  const grade = gradeDbKey(entry.grade);
  const seed = fixture.seed;

  if (seed.type === "practice_mixed_meta") {
    const results = [];
    for (const segment of seed.segments) {
      const answers = buildAnswerSchedule(segment.days, segment.counts, segment.wrongs);
      const result = await insertPracticeSession(supabase, entry.studentId, {
        subject: fixture.subject,
        topic: fixture.topic,
        grade,
        mode: "practice",
        answers,
        metaForAll: META[segment.metaKey],
      });
      results.push(result);
    }
    return { sessions: results, answerCount: results.reduce((n, r) => n + r.answerCount, 0) };
  }

  const answers = buildAnswerSchedule(seed.days, seed.counts, seed.wrongs);
  const result = await insertPracticeSession(supabase, entry.studentId, {
    subject: fixture.subject,
    topic: fixture.topic,
    grade,
    mode: "practice",
    answers,
    metaForAll: META[seed.metaKey],
  });
  return result;
}

async function main() {
  const cleanOnly = process.argv.includes("--clean-only");
  const sim = await loadSimulationModule();
  const { cleanTaggedSeedsForTag } = sim;

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const studentIds = students.map((s) => s.studentId);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  console.log(`\n=== Visible-impact parent QA seed (${SEED_TAG}) ===\n`);
  const cleanup = await cleanTaggedSeedsForTag(supabase, studentIds, SEED_TAG, SEED_META_KEY);
  console.log("Cleanup (tag-scoped only):", cleanup);

  if (cleanOnly) {
    console.log("--clean-only done");
    return;
  }

  const seeded = [];
  for (const [fixtureId, fixture] of Object.entries(VISIBLE_IMPACT_FIXTURES)) {
    const entry = byLabel.get(fixture.label);
    if (!entry) {
      seeded.push({ fixtureId, error: `missing child ${fixture.label}` });
      continue;
    }
    const result = await seedFixture(supabase, entry, fixture, sim);
    console.log(`  ${fixtureId} (${fixture.label}):`, result.answerCount ?? result);
    seeded.push({ fixtureId, label: fixture.label, scenario: fixture.scenario, ...result });
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const outPath = path.join(ARTIFACT_DIR, "visible-impact-seed-results.json");
  await writeFile(
    outPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        seedTag: SEED_TAG,
        seedMetaKey: SEED_META_KEY,
        cleanup,
        fixtures: VISIBLE_IMPACT_FIXTURES,
        seeded,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nWrote ${outPath}`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((e) => {
    console.error(e?.stack || e);
    process.exit(1);
  });
}
