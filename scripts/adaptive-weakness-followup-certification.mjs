#!/usr/bin/env node
/**
 * Deterministic certification: weakness-specific adaptive follow-up across 6 subjects.
 * node scripts/adaptive-weakness-followup-certification.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SNAPSHOT = join(ROOT, "reports", "adaptive-learning-planner", "metadata-index-snapshot.json");

const bridgeMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner-runtime-bridge.js", import.meta.url).href
);
const adapterMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner-input-adapter.js", import.meta.url).href
);
const plannerMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner.js", import.meta.url).href
);
const alignMod = await import(
  new URL("../utils/adaptive-learning-planner/diagnostic-unit-skill-alignment.js", import.meta.url).href
);
const metaCtxMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner-metadata-context.js", import.meta.url).href
);
const probeMod = await import(
  new URL("../utils/active-diagnostic-runtime/probe-match.js", import.meta.url).href
);
const fixturesMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner-fixtures.js", import.meta.url).href
);

const {
  buildRuntimePlannerRecommendationFromPracticeResult,
  normalizePlannerSubject,
  gradeToScenarioFragment,
  buildSyntheticDiagnosticReport,
} = bridgeMod;
const { buildPlannerInputFromDiagnosticPayload } = adapterMod;
const { planAdaptiveLearning } = plannerMod;
const { resolveDiagnosticUnitSkillAlignment } = alignMod;
const { buildPlannerQuestionMetadataIndex, validateLightEntriesNoForbiddenFields } = metaCtxMod;
const { bankQuestionProbeMatch } = probeMod;
const { ADAPTIVE_PLANNER_FIXTURES } = fixturesMod;

const RAW_KEY_RE =
  /\b(reasonCodes|mustNotSay|skillId|subskillId|bucketKey|topicBucketKeys|metadata_index|alignment_|engineDecision)\b/i;

/** @type {{ subject: string, grade: string, weakness: string, expectedFollowUp: string, practice?: Record<string, unknown>, fixtureName?: string, assert: (ctx: object) => void }[]} */
const MATRIX = [
  {
    subject: "math",
    grade: "g4",
    weakness: "fractions",
    expectedFollowUp: "practice_current on math_frac*",
    practice: {
      scenarioSimulatorId: "cert_math_fractions_g4",
      subject: "math",
      grade: "g4",
      topic: "fractions",
      totalQuestions: 14,
      correctAnswers: 4,
      wrongAnswers: 10,
      accuracy: 29,
      durationSeconds: 420,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /frac/i, "math");
    },
  },
  {
    subject: "geometry",
    grade: "g4",
    weakness: "perimeter",
    expectedFollowUp: "practice_current on geo perimeter skill",
    practice: {
      scenarioSimulatorId: "cert_geometry_perimeter_g4",
      subject: "geometry",
      grade: "g4",
      topic: "perimeter",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 500,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /perimeter|geo_/i, "geometry");
    },
  },
  {
    subject: "hebrew",
    grade: "g3",
    weakness: "reading",
    expectedFollowUp: "practice_current on hebrew_archive_reading (g3)",
    practice: {
      scenarioSimulatorId: "cert_hebrew_reading_g3",
      subject: "hebrew",
      grade: "g3",
      topic: "reading",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 480,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /hebrew_archive_reading|reading/i, "hebrew");
      assert(ctx.out.diagnostics?.metadataSubjectFallback !== true, "g3 reading used subject fallback");
    },
  },
  {
    subject: "hebrew",
    grade: "g3",
    weakness: "writing",
    expectedFollowUp: "practice_current on hebrew_archive_writing (g3)",
    practice: {
      scenarioSimulatorId: "cert_hebrew_writing_g3",
      subject: "hebrew",
      grade: "g3",
      topic: "writing",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 480,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /hebrew_archive_writing|writing/i, "hebrew");
      assert(ctx.out.diagnostics?.metadataSubjectFallback !== true, "g3 writing used subject fallback");
    },
  },
  {
    subject: "hebrew",
    grade: "g2",
    weakness: "reading",
    expectedFollowUp: "practice_current on hebrew_archive_reading",
    practice: {
      scenarioSimulatorId: "cert_hebrew_reading_g2",
      subject: "hebrew",
      grade: "g2",
      topic: "reading",
      totalQuestions: 12,
      correctAnswers: 5,
      wrongAnswers: 7,
      accuracy: 42,
      durationSeconds: 400,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /hebrew_archive_reading|reading/i, "hebrew");
    },
  },
  {
    subject: "english",
    grade: "g1",
    weakness: "grammar (P1)",
    expectedFollowUp: "practice_current on english grammar skill",
    practice: {
      scenarioSimulatorId: "cert_english_grammar_g1",
      subject: "english",
      grade: "g1",
      topic: "grammar",
      totalQuestions: 14,
      correctAnswers: 4,
      wrongAnswers: 10,
      accuracy: 29,
      durationSeconds: 300,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /grammar|eng_/i, "english");
    },
  },
  {
    subject: "english",
    grade: "g2",
    weakness: "grammar (P2)",
    expectedFollowUp: "practice_current on english grammar skill",
    practice: {
      scenarioSimulatorId: "cert_english_grammar_g2",
      subject: "english",
      grade: "g2",
      topic: "grammar",
      totalQuestions: 14,
      correctAnswers: 3,
      wrongAnswers: 7,
      accuracy: 30,
      durationSeconds: 300,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /grammar|eng_/i, "english");
    },
  },
  {
    subject: "science",
    grade: "g3",
    weakness: "animals",
    expectedFollowUp: "practice_current on science animals",
    practice: {
      scenarioSimulatorId: "cert_science_animals_g3",
      subject: "science",
      grade: "g3",
      topic: "animals",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 520,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /animal|sci_/i, "science");
    },
  },
  {
    subject: "science",
    grade: "g4",
    weakness: "plants",
    expectedFollowUp: "practice_current on science plants",
    practice: {
      scenarioSimulatorId: "cert_science_plants_g4",
      subject: "science",
      grade: "g4",
      topic: "plants",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 520,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /plant|sci_/i, "science");
    },
  },
  {
    subject: "moledet-geography",
    grade: "g2",
    weakness: "geography strand (P2)",
    expectedFollowUp: "practice_current on moledet_geo_geography",
    practice: {
      scenarioSimulatorId: "cert_moledet_geography_g2",
      subject: "moledet-geography",
      grade: "g2",
      topic: "geography",
      totalQuestions: 12,
      correctAnswers: 4,
      wrongAnswers: 8,
      accuracy: 33,
      durationSeconds: 480,
    },
    assert(ctx) {
      assertRemediateFamily(ctx, /moledet_geo_geography|geography/i, "moledet-geography");
    },
  },
  {
    subject: "math",
    grade: "g4",
    weakness: "thin session",
    expectedFollowUp: "pause_collect_more_data (no firm remediate)",
    practice: {
      scenarioSimulatorId: "cert_thin_data_math_g4",
      subject: "math",
      grade: "g4",
      topic: "fractions",
      totalQuestions: 6,
      correctAnswers: 2,
      wrongAnswers: 4,
      accuracy: 33,
      durationSeconds: 120,
    },
    assert(ctx) {
      const na = ctx.plan.nextAction;
      if (na === "practice_current" && ctx.plan.reasonCodes?.includes("remediate")) {
        throw new Error(`thin data produced firm remediate: ${JSON.stringify(ctx.plan)}`);
      }
      if (!["pause_collect_more_data", "probe_skill", "maintain_skill", "review"].includes(na)) {
        throw new Error(`expected cautious action, got ${na}`);
      }
    },
  },
  {
    subject: "math",
    grade: "g4",
    weakness: "strong performance",
    expectedFollowUp: "advance_skill (no unnecessary remediate)",
    practice: {
      scenarioSimulatorId: "cert_strong_math_g4",
      subject: "math",
      grade: "g4",
      topic: "multiplication",
      totalQuestions: 45,
      correctAnswers: 42,
      wrongAnswers: 3,
      accuracy: 93,
      durationSeconds: 900,
    },
    assert(ctx) {
      if (ctx.plan.nextAction === "practice_current" && ctx.plan.reasonCodes?.includes("remediate")) {
        throw new Error("strong performance got remediate practice");
      }
      if (!["advance_skill", "maintain_skill", "practice_current"].includes(ctx.plan.nextAction)) {
        throw new Error(`expected non-remedial steady/advance path, got ${ctx.plan.nextAction}`);
      }
      if (ctx.plan.reasonCodes?.includes("remediate")) {
        throw new Error("strong performance must not use remediate reason code");
      }
    },
  },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

/**
 * @param {object} ctx
 * @param {RegExp} skillPattern
 * @param {string} subject
 */
function assertRemediateFamily(ctx, skillPattern, subject) {
  assert(ctx.out.ok === true, `bridge not ok: ${JSON.stringify(ctx.out)}`);
  assert(ctx.plan.nextAction === "practice_current", `expected practice_current got ${ctx.plan.nextAction}`);
  const skill = String(ctx.plan.targetSkillId || ctx.input.currentSkillId || "");
  assert(skillPattern.test(skill), `skill ${skill} does not match ${skillPattern}`);
  assert(ctx.input.subject === subject, `subject drift ${ctx.input.subject}`);
  assert(ctx.out.diagnostics?.metadataSubjectFallback !== true, "subject fallback used");
  if (ctx.metadataCandidates.length) {
    const allowed = new Set([subject, subject.replace(/-/g, "_")]);
    if (subject === "hebrew") allowed.add("hebrew-archive");
    for (const m of ctx.metadataCandidates) {
      const s = String(m.subject || "").toLowerCase();
      assert(allowed.has(s), `metadata candidate subject ${s}`);
    }
  }
  assertNoRawKeys(ctx.plan);
}

function assertNoRawKeys(plan) {
  const blobs = [plan.studentSafeSummary, plan.parentSafeSummary, ...(plan.mustNotSay || [])].join(" ");
  assert(!RAW_KEY_RE.test(blobs), `raw key leak in summaries: ${blobs}`);
}

/**
 * @param {Record<string, unknown>} practice
 * @param {{ entries: object[] }} metadataIndex
 */
function fullPlanFromPractice(practice, metadataIndex) {
  const out = buildRuntimePlannerRecommendationFromPracticeResult(practice, { metadataIndex });
  const subject = normalizePlannerSubject(practice.subject);
  const gradeFrag = gradeToScenarioFragment(practice.grade);
  const report = buildSyntheticDiagnosticReport(
    practice,
    subject,
    gradeFrag,
    String(practice.scenarioSimulatorId || "cert")
  );
  const { input, sourceInfo } = buildPlannerInputFromDiagnosticPayload(report, { metadataIndex });
  const plan = planAdaptiveLearning(input);
  const metadataCandidates = Array.isArray(input.availableQuestionMetadata) ? input.availableQuestionMetadata : [];
  return { out, plan, input, sourceInfo, metadataCandidates };
}

async function loadMetadataIndex() {
  try {
    const raw = JSON.parse(await readFile(SNAPSHOT, "utf8"));
    if (Array.isArray(raw.entries) && raw.entries.length) {
      const leaks = validateLightEntriesNoForbiddenFields(raw.entries);
      const loadErrors = Array.isArray(raw.stats?.loadErrors) ? raw.stats.loadErrors : [];
      const g3Load = loadErrors.filter((e) => String(e?.path || "").includes("hebrew-questions/g3"));
      assert(g3Load.length === 0, `hebrew g3 bank load error still present: ${JSON.stringify(g3Load)}`);
      if (!leaks.length) return { entries: raw.entries, loadErrors };
    }
  } catch {
    /* build below */
  }
  console.log("Building metadata index (snapshot missing)…");
  const index = await buildPlannerQuestionMetadataIndex({ rootAbs: ROOT });
  const g3Load = (index.stats?.loadErrors || []).filter((e) =>
    String(e?.path || "").includes("hebrew-questions/g3")
  );
  assert(g3Load.length === 0, `hebrew g3 bank load error: ${JSON.stringify(g3Load)}`);
  return { entries: index.entries, loadErrors: index.stats?.loadErrors || [] };
}

function runProbeMatchSmoke() {
  const probe = {
    diagnosticSkillId: "sci_animals_fact",
    dominantTag: "classification_error",
    expectedErrorTags: ["classification_error"],
    patternFamily: "animals_mcq",
    conceptTag: "animal_groups",
  };
  const matchRow = {
    params: {
      diagnosticSkillId: "sci_animals_fact",
      expectedErrorTags: ["classification_error"],
      patternFamily: "animals_mcq",
      conceptTag: "animal_groups",
    },
  };
  const m = bankQuestionProbeMatch(matchRow, probe);
  assert(m.matches === true, `probe match expected true got ${m.reason}`);
  const unrelated = bankQuestionProbeMatch({ params: { diagnosticSkillId: "math_frac_add_sub" } }, probe);
  assert(unrelated.matches === false, "unrelated bank row must not match probe");
}

function runDoNotConcludeFixture(metadataIndex) {
  const fixture = ADAPTIVE_PLANNER_FIXTURES.find((f) => f.name === "do_not_conclude_caution");
  assert(fixture, "missing do_not_conclude_caution fixture");
  const input = {
    ...fixture.input,
    availableQuestionMetadata: metadataIndex.entries.slice(0, 3),
  };
  const plan = planAdaptiveLearning(input);
  assert(
    plan.nextAction === "pause_collect_more_data" || plan.nextAction === "probe_skill",
    `doNotConclude must not advance/remediate firmly: ${plan.nextAction}`
  );
  assertNoRawKeys(plan);
}

/** @type {{ subject: string, grade: string, weakness: string, expectedFollowUp: string, actualFollowUp: string, result: string }[]} */
const results = [];

async function main() {
  const metadataIndex = await loadMetadataIndex();
  assert(metadataIndex.entries?.length > 0, "metadata index empty");

  runProbeMatchSmoke();
  runDoNotConcludeFixture(metadataIndex);

  let failed = 0;
  for (const row of MATRIX) {
    const label = `${row.subject} / ${row.grade} / ${row.weakness}`;
    try {
      const ctx = fullPlanFromPractice(row.practice, metadataIndex);
      row.assert(ctx);
      const aligned = resolveDiagnosticUnitSkillAlignment(
        {
          subjectId: normalizePlannerSubject(row.practice.subject),
          bucketKey: String(row.practice.topic || ""),
        },
        { scenarioId: String(row.practice.scenarioSimulatorId), metadataIndex, gradeSubskill: gradeToScenarioFragment(row.practice.grade) }
      );
      results.push({
        subject: row.subject,
        grade: row.grade,
        weakness: row.weakness,
        expectedFollowUp: row.expectedFollowUp,
        actualFollowUp: `${ctx.plan.nextAction} → ${ctx.plan.targetSkillId || ctx.input.currentSkillId || aligned.skillId || "(none)"}`,
        result: "PASS",
      });
      console.log(`PASS ${label}`);
    } catch (e) {
      failed += 1;
      results.push({
        subject: row.subject,
        grade: row.grade,
        weakness: row.weakness,
        expectedFollowUp: row.expectedFollowUp,
        actualFollowUp: String(e?.message || e),
        result: "FAIL",
      });
      console.error(`FAIL ${label}:`, e?.message || e);
    }
  }

  console.log("\n--- Scenario matrix ---");
  for (const r of results) {
    console.log(
      `${r.result}\t${r.subject}\t${r.grade}\t${r.weakness}\texpected=${r.expectedFollowUp}\tactual=${r.actualFollowUp}`
    );
  }

  if (failed > 0) {
    console.error(`\nadaptive-weakness-followup-certification: ${failed} scenario(s) failed`);
    process.exit(1);
  }
  console.log("\nadaptive-weakness-followup-certification: all scenarios passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
