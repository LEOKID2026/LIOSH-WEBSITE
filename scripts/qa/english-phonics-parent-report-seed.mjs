#!/usr/bin/env node
/**
 * Seed phonics-only practice sessions for parent-report live guard (QA tag-scoped).
 *
 * Uses existing AAA accounts (aaa1 = G1, aaa3 = G2) — no new student rows.
 *
 *   node --env-file=.env.local scripts/qa/english-phonics-parent-report-seed.mjs
 *   node --env-file=.env.local scripts/qa/english-phonics-parent-report-seed.mjs --clean-only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { resolveAaaStudents } from "./lib/parent-aaa-qa-constants.mjs";
import { bootstrapQaDbWriteGuard } from "./lib/db-write-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/english-phonics-runtime");

export const PHONICS_SEED_TAG = "english-phonics-parent-report-v1";
export const PHONICS_SEED_META_KEY = "englishPhonicsParentReport";

export const PHONICS_SEED_STUDENTS = [
  { label: "AAA1", login: "aaa1", grade: 1, reportWindow: { from: "2026-06-01", to: "2026-06-09" } },
  { label: "AAA3", login: "aaa3", grade: 2, reportWindow: { from: "2026-06-01", to: "2026-06-09" } },
];

const PHONICS_META_G1 = {
  params: {
    topic: "phonics",
    patternFamily: "phonics_mcq",
    diagnosticContribution: "thin",
    promotionEligible: false,
    diagnosticSkillId: "english:phonics:g1:letters_upper",
    canonicalMetadata: {
      skillId: "english:phonics:g1:letters_upper",
      subSkill: "choose_matching_letter",
      questionType: "choose_matching_letter",
      metadataConfidence: "low",
      diagnosticEligibleByMetadata: false,
    },
  },
  questionEngine: {
    questionType: "mcq",
    skillId: "english:phonics:g1:letters_upper",
    metadataConfidence: "low",
  },
};

const PHONICS_META_G2 = {
  params: {
    topic: "phonics",
    patternFamily: "phonics_mcq",
    diagnosticContribution: "thin",
    promotionEligible: false,
    diagnosticSkillId: "english:phonics:g2:phonics_blending",
    canonicalMetadata: {
      skillId: "english:phonics:g2:phonics_blending",
      subSkill: "early_word_reading",
      questionType: "early_word_reading",
      metadataConfidence: "low",
      diagnosticEligibleByMetadata: false,
    },
  },
  questionEngine: {
    questionType: "mcq",
    skillId: "english:phonics:g2:phonics_blending",
    metadataConfidence: "low",
  },
};

async function loadSimulationModule() {
  process.env.QA_PARENT_SEED_TAG = PHONICS_SEED_TAG;
  process.env.QA_PARENT_SEED_META_KEY = PHONICS_SEED_META_KEY;
  return import("./parent-report-q2e-monthly-simulation.mjs");
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapQaDbWriteGuard(
    "qa/english-phonics-parent-report-seed",
    "ENGLISH_PHONICS_PARENT_REPORT_SEED",
    argv
  );
  const cleanOnly = guard.mode.cleanOnly;
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary({ artifactPath: ARTIFACT_DIR });
    return;
  }
  const sim = await loadSimulationModule();
  const { cleanTaggedSeedsForTag, buildAnswerSchedule, insertPracticeSession, gradeDbKey } = sim;

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));
  const studentIds = students.map((s) => s.studentId);

  console.log(`\n=== English phonics parent-report seed (${PHONICS_SEED_TAG}) ===\n`);
  const cleanup = await cleanTaggedSeedsForTag(
    supabase,
    studentIds,
    PHONICS_SEED_TAG,
    PHONICS_SEED_META_KEY
  );
  console.log("Cleanup (tag-scoped only):", cleanup);

  if (cleanOnly) {
    console.log("--clean-only done");
    return;
  }

  /** @type {Record<string, unknown>} */
  const seeded = {};

  for (const spec of PHONICS_SEED_STUDENTS) {
    const entry = byLabel.get(spec.label);
    if (!entry) {
      seeded[spec.label] = { error: `missing student ${spec.label}` };
      continue;
    }

    const gradeKey = gradeDbKey(spec.grade);
    const meta = spec.grade === 1 ? PHONICS_META_G1 : PHONICS_META_G2;
    const answers = buildAnswerSchedule(
      ["2026-06-02", "2026-06-04", "2026-06-07"],
      [4, 4, 4],
      [1, 1, 0]
    );

    const result = await insertPracticeSession(supabase, entry.studentId, {
      subject: "english",
      topic: "phonics",
      grade: gradeKey,
      mode: "practice",
      answers,
      metaForAll: meta,
    });

    seeded[spec.label] = {
      studentId: entry.studentId,
      login: spec.login,
      grade: spec.grade,
      topic: "phonics",
      answerCount: result.answerCount,
      sessionCount: result.sessionCount,
    };
    console.log(`Seeded ${spec.label} (${spec.login}): ${result.answerCount} phonics answers`);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const artifact = {
    tag: PHONICS_SEED_TAG,
    metaKey: PHONICS_SEED_META_KEY,
    seededAt: new Date().toISOString(),
    students: PHONICS_SEED_STUDENTS,
    results: seeded,
    cleanupScope: "tag-scoped only via cleanTaggedSeedsForTag",
  };
  await writeFile(
    path.join(ARTIFACT_DIR, "phonics-parent-report-seed.json"),
    `${JSON.stringify(artifact, null, 2)}\n`
  );
  console.log(`\nWrote docs/qa/_artifacts/english-phonics-runtime/phonics-parent-report-seed.json`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
