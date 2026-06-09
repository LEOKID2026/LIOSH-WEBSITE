#!/usr/bin/env node
/**
 * English G1/G2 phonics — parent-report QA guard (preflight + future live hook).
 *
 * Scope: QA fixture only. Does NOT edit parent-report product code, diagnostic flags,
 * banks, generator, curriculum, audio, registry, or SQL.
 *
 *   node scripts/qa/english-phonics-parent-report-guard.mjs
 *   node scripts/qa/english-phonics-parent-report-guard.mjs --write-artifacts
 *   node --env-file=.env.local scripts/qa/english-phonics-parent-report-guard.mjs --live
 *
 * --live requires phonics-only seeded students (not wired yet) — reports BLOCKED, never fake PASS.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENGLISH_G1_PAGE_SKILLS,
  ENGLISH_G2_PAGE_SKILLS,
} from "../../lib/learning-book/english-page-skill-index.js";
import {
  ENGLISH_MASTER_TOPICS,
  hasEnglishPracticeTarget,
  parseEnglishTopicFromSkillId,
  resolveEnglishPracticeTarget,
} from "../../lib/learning-book/english-book-practice-map.js";
import { FLAG_ENV } from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/english-phonics-parent-report");
const PLAN_PATH = path.join(ARTIFACT_DIR, "ENGLISH_PHONICS_PARENT_REPORT_GUARD_PLAN.md");
const FIXTURE_SPEC_PATH = path.join(ARTIFACT_DIR, "phonics-parent-report-fixture-spec.json");

/** Documented production-reality baseline (mode C). */
export const EXPECTED_FLAG_BASELINE = {
  subskill: "true",
  gating: "true",
  promotion: "false",
  modeId: "C",
  modeName: "subskill_gating",
};

export const G1_PHONICS_PAGES = [
  "letters_upper",
  "letters_lower",
  "letters_match",
  "letter_names",
  "phonics_sounds",
  "phonics_first_sound",
  "classroom_words",
  "first_words_simple",
  "first_words_cvc",
  "picture_word_match",
  "listening_classroom",
  "listening_commands",
];

export const G2_PHONICS_PAGES = [
  "letters_review",
  "letters_order",
  "phonics_sounds_review",
  "phonics_blending",
  "sound_letter_match",
  "first_word_reading",
  "word_families_cvc",
  "classroom_vocab_g2",
  "listening_comprehension",
  "picture_audio_word_match",
  "early_sentences_exposure",
];

/** Reused from parent-report-diagnostic-flags-staging-smoke.mjs */
export const LEAK_PATTERNS = [
  { name: "_evidenceQuality", re: /_evidenceQuality/i },
  { name: "bySubSkill", re: /\bbySubSkill\b/ },
  { name: "gatingDecisions", re: /\bgatingDecisions\b/ },
  { name: "promotionDecisions", re: /\bpromotionDecisions\b/ },
  { name: "supportingEvidenceIds", re: /\bsupportingEvidenceIds\b/ },
  { name: "skillId", re: /\bskillId\b/ },
  { name: "subSkill", re: /\bsubSkill\b/ },
  { name: "english_phonics_taxonomy", re: /\benglish:phonics:[a-z0-9_:]+\b/i },
  { name: "math_*", re: /\bmath_[a-z0-9_]+\b/i },
  { name: "frac_*", re: /\bfrac_[a-z0-9_]+\b/i },
];

export const STRONG_DIAGNOSIS_RE =
  /(כדאי לשים לב ל|נראה שיש קושי|הביצועים הכלליים)/;
export const SOFT_THIN_RE =
  /(מעט נתוני תרגול|יש עדיין מעט נתוני תרגול|מומלץ לשמור)/;

/** Parent-visible grammar/translation conclusions phonics-only sessions must not produce. */
export const GRAMMAR_TRANSLATION_CONCLUSION_RES = [
  { name: "english_grammar_he", re: /דקדוק באנגלית/ },
  { name: "english_translation_he", re: /תרגום.*אנגלית|תרגום מעברית/ },
  { name: "past_simple_en", re: /\bpast\s+simple\b/i },
  { name: "present_continuous_en", re: /\bpresent\s+continuous\b/i },
  { name: "grammar_basics_token", re: /\bgrammar_basics\b/i },
  { name: "translation_pool_token", re: /\benglish:pool:translation\b/i },
];

export const PHONICS_FIXTURE_SPEC = {
  version: "2026-06-09",
  status: "not_seeded",
  flagBaseline: EXPECTED_FLAG_BASELINE,
  students: [
    {
      id: "PHONICS-G1-ONLY",
      label: "PhonicsG1",
      grade: 1,
      login: "phonicsg1",
      scenario: "g1_phonics_only_thin",
      pages: G1_PHONICS_PAGES,
      sessionPlan: {
        sessions: 3,
        questionsPerSession: 6,
        itemMix: ["letter_id", "sound_match", "listening_command"],
        diagnosticContribution: "manual_only",
      },
      reportWindow: { from: "2026-06-01", to: "2026-06-09" },
      assertions: [
        "no_strong_diagnosis",
        "soft_or_thin_copy_only",
        "no_grammar_translation_conclusions",
        "no_internal_metadata_leaks",
        "gating_active_mode_c",
        "promotion_off",
      ],
    },
    {
      id: "PHONICS-G2-ONLY",
      label: "PhonicsG2",
      grade: 2,
      login: "phonicsg2",
      scenario: "g2_phonics_only_thin",
      pages: G2_PHONICS_PAGES,
      sessionPlan: {
        sessions: 4,
        questionsPerSession: 8,
        itemMix: ["blend_cvc", "listening_comprehension", "early_sentence_exposure"],
        diagnosticContribution: "manual_only",
      },
      reportWindow: { from: "2026-06-01", to: "2026-06-09" },
      assertions: [
        "no_strong_diagnosis",
        "no_grammar_translation_conclusions",
        "no_internal_metadata_leaks",
        "gating_active_mode_c",
        "promotion_off",
      ],
    },
  ],
  blockedUntil: [
    "english_phonics_question_banks_wired",
    "english-book-practice-map phonics topic routing (topic=phonics)",
    "generator emits phonics questionType (not grammar/translation)",
    "fixture seed script inserts phonics-only answer rows",
  ],
  relatedScripts: [
    "scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs",
    "scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs",
    "scripts/qa/parent-report-visible-truth-audit.mjs",
  ],
};

function parseArgs(argv) {
  return {
    writeArtifacts: argv.includes("--write-artifacts"),
    live: argv.includes("--live"),
    assertFlagBaseline: argv.includes("--assert-flag-baseline") || !argv.includes("--skip-flag-baseline"),
  };
}

function pushCheck(results, group, name, pass, detail = null) {
  results.push({ group, name, pass, detail, verdict: pass ? "PASS" : "FAIL" });
}

function collectPhonicsSkillRows() {
  const rows = [];
  for (const pageId of G1_PHONICS_PAGES) {
    const entry = ENGLISH_G1_PAGE_SKILLS[pageId];
    rows.push({ grade: "g1", pageId, entry });
  }
  for (const pageId of G2_PHONICS_PAGES) {
    const entry = ENGLISH_G2_PAGE_SKILLS[pageId];
    rows.push({ grade: "g2", pageId, entry });
  }
  return rows;
}

function runStaticPreflight() {
  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  const rows = collectPhonicsSkillRows();

  pushCheck(
    results,
    "static_preflight",
    "all_phonics_pages_have_skill_index",
    rows.every((r) => r.entry?.skillId),
    { missing: rows.filter((r) => !r.entry?.skillId).map((r) => `${r.grade}:${r.pageId}`) },
  );

  const badSkillIds = rows.filter((r) => !/^english:phonics:g[12]:[a-z0-9_]+$/.test(r.entry?.skillId || ""));
  pushCheck(
    results,
    "static_preflight",
    "phonics_skill_ids_use_english_phonics_taxonomy",
    badSkillIds.length === 0,
    badSkillIds.map((r) => ({ page: `${r.grade}:${r.pageId}`, skillId: r.entry?.skillId })),
  );

  const misrouted = rows.filter((r) => {
    const topic = parseEnglishTopicFromSkillId(r.entry?.skillId);
    return topic === "grammar" || topic === "translation" || topic === "vocabulary" || topic === "sentences";
  });
  pushCheck(
    results,
    "static_preflight",
    "phonics_skill_ids_not_parsed_as_grammar_translation_vocab",
    misrouted.length === 0,
    misrouted,
  );

  pushCheck(
    results,
    "static_preflight",
    "english_master_topics_excludes_phonics",
    !ENGLISH_MASTER_TOPICS.has("phonics"),
    { masterTopics: [...ENGLISH_MASTER_TOPICS] },
  );

  const withPractice = [];
  for (const r of rows) {
    if (hasEnglishPracticeTarget(r.grade, r.pageId)) {
      withPractice.push(`${r.grade}:${r.pageId} -> ${JSON.stringify(resolveEnglishPracticeTarget(r.grade, r.pageId))}`);
    }
  }
  pushCheck(
    results,
    "static_preflight",
    "phonics_pages_have_no_practice_targets_yet",
    withPractice.length === 0,
    withPractice,
  );

  const nonPhonicsPageType = rows.filter((r) => r.entry?.pageType !== "phonics_foundation");
  pushCheck(
    results,
    "static_preflight",
    "phonics_pages_marked_phonics_foundation",
    nonPhonicsPageType.length === 0,
    nonPhonicsPageType.map((r) => `${r.grade}:${r.pageId}:${r.entry?.pageType}`),
  );

  return results;
}

async function runFlagBaselineCheck() {
  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  const saved = {
    subskill: process.env[FLAG_ENV.subskill],
    gating: process.env[FLAG_ENV.gating],
    promotion: process.env[FLAG_ENV.promotion],
  };

  process.env[FLAG_ENV.subskill] = EXPECTED_FLAG_BASELINE.subskill;
  process.env[FLAG_ENV.gating] = EXPECTED_FLAG_BASELINE.gating;
  process.env[FLAG_ENV.promotion] = EXPECTED_FLAG_BASELINE.promotion;

  const flagMod = await import("../../lib/learning/diagnostic-metadata-subskill-flag.js");

  pushCheck(results, "flag_baseline", "subskill_enabled", flagMod.isDiagnosticMetadataSubskillEnabled() === true);
  pushCheck(results, "flag_baseline", "gating_enabled", flagMod.isDiagnosticMetadataParentGatingEnabled() === true);
  pushCheck(
    results,
    "flag_baseline",
    "promotion_disabled",
    flagMod.isDiagnosticMetadataParentPromotionEnabled() === false,
  );
  pushCheck(
    results,
    "flag_baseline",
    "active_gating_on_mode_c",
    flagMod.isActiveMetadataParentGatingEnabled() === true,
  );
  pushCheck(
    results,
    "flag_baseline",
    "active_promotion_off_mode_c",
    flagMod.isActiveMetadataParentPromotionEnabled() === false,
  );

  if (saved.subskill !== undefined) process.env[FLAG_ENV.subskill] = saved.subskill;
  else delete process.env[FLAG_ENV.subskill];
  if (saved.gating !== undefined) process.env[FLAG_ENV.gating] = saved.gating;
  else delete process.env[FLAG_ENV.gating];
  if (saved.promotion !== undefined) process.env[FLAG_ENV.promotion] = saved.promotion;
  else delete process.env[FLAG_ENV.promotion];

  return results;
}

async function runLivePhonicsGuard() {
  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    pushCheck(results, "live_phonics_report", "supabase_env_present", false, "Set NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY");
    return { results, status: "BLOCKED", reason: "missing_supabase_env" };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const logins = PHONICS_FIXTURE_SPEC.students.map((s) => s.login);
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .in("login_username", logins)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    pushCheck(results, "live_phonics_report", "fixture_lookup", false, error.message);
    return { results, status: "BLOCKED", reason: "fixture_lookup_error" };
  }

  const found = new Set((codes || []).map((c) => String(c.login_username || "").toLowerCase()));
  const missing = logins.filter((l) => !found.has(l));
  pushCheck(
    results,
    "live_phonics_report",
    "phonics_fixture_students_seeded",
    missing.length === 0,
    { expected: logins, missing },
  );

  if (missing.length > 0) {
    return {
      results,
      status: "BLOCKED",
      reason: "phonics_fixture_not_seeded",
      note: "Runtime phonics practice + seed not wired — live parent-report assertions deferred.",
    };
  }

  // Future: aggregate payloads for phonics-only students under mode C and run leak/strong/grammar scans.
  return {
    results,
    status: "BLOCKED",
    reason: "live_assertions_not_implemented",
    note: "Fixture students exist but live assertion pipeline is not implemented until banks/generator connect.",
  };
}

function leakScan(text) {
  const hits = [];
  for (const { name, re } of LEAK_PATTERNS) {
    if (re.test(String(text || ""))) hits.push(name);
  }
  return { pass: hits.length === 0, hits };
}

function grammarTranslationScan(text) {
  const hits = [];
  for (const { name, re } of GRAMMAR_TRANSLATION_CONCLUSION_RES) {
    if (re.test(String(text || ""))) hits.push(name);
  }
  return { pass: hits.length === 0, hits };
}

function summarize(results) {
  const executable = results.filter((r) => r.group !== "live_phonics_report");
  const passCount = executable.filter((r) => r.pass).length;
  const failCount = executable.filter((r) => !r.pass).length;
  const liveChecks = results.filter((r) => r.group === "live_phonics_report");
  return {
    passCount,
    failCount,
    total: executable.length,
    allPass: failCount === 0,
    liveCheckCount: liveChecks.length,
    livePassCount: liveChecks.filter((r) => r.pass).length,
  };
}

async function writeArtifacts(bundle) {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACT_DIR, "guard-results.json"), `${JSON.stringify(bundle, null, 2)}\n`);
  await writeFile(FIXTURE_SPEC_PATH, `${JSON.stringify(PHONICS_FIXTURE_SPEC, null, 2)}\n`);
  console.log(`  Wrote ${path.relative(ROOT, path.join(ARTIFACT_DIR, "guard-results.json"))}`);
  console.log(`  Wrote ${path.relative(ROOT, FIXTURE_SPEC_PATH)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  console.log("English phonics parent-report QA guard");
  console.log(`  Mode: ${args.live ? "preflight + live probe" : "preflight (dry-run)"}`);

  const staticResults = runStaticPreflight();
  const flagResults = args.assertFlagBaseline ? await runFlagBaselineCheck() : [];
  const liveBundle = args.live ? await runLivePhonicsGuard() : { results: [], status: "SKIPPED", reason: "no_--live" };

  const allResults = [...staticResults, ...flagResults, ...liveBundle.results];
  const summary = summarize(allResults);

  const bundle = {
    startedAt,
    guardType: "dry_run_preflight_with_blocked_live_hook",
    flagBaseline: EXPECTED_FLAG_BASELINE,
    staticPreflight: {
      verdict: staticResults.every((r) => r.pass) ? "PASS" : "FAIL",
      checks: staticResults,
    },
    flagBaselineCheck: {
      verdict: flagResults.length === 0 ? "SKIPPED" : flagResults.every((r) => r.pass) ? "PASS" : "FAIL",
      checks: flagResults,
    },
    livePhonicsReport: {
      status: liveBundle.status,
      reason: liveBundle.reason || null,
      note: liveBundle.note || null,
      checks: liveBundle.results,
      deferredAssertions: [
        "g1_phonics_only_no_strong_diagnosis",
        "g2_phonics_only_no_grammar_translation_conclusions",
        "thin_phonics_evidence_soft_copy_only",
        "no_internal_metadata_in_html_pdf",
        "gating_active_under_mode_c",
        "promotion_remains_off",
      ],
    },
    patterns: {
      leakScan: LEAK_PATTERNS.map((p) => p.name),
      strongDiagnosis: STRONG_DIAGNOSIS_RE.source,
      softThin: SOFT_THIN_RE.source,
      grammarTranslation: GRAMMAR_TRANSLATION_CONCLUSION_RES.map((p) => p.name),
    },
    summary,
    executableVerdict: summary.allPass ? "PASS" : "FAIL",
    liveVerdict: liveBundle.status === "PASS" ? "PASS" : liveBundle.status,
  };

  console.log("");
  for (const r of allResults) {
    console.log(`  ${r.pass ? "✓" : r.group === "live_phonics_report" ? "○" : "✗"} [${r.group}] ${r.name}`);
    if (!r.pass && r.detail) {
      const snippet = JSON.stringify(r.detail).slice(0, 200);
      console.log(`      ${snippet}`);
    }
  }

  console.log("");
  console.log(`  Executable checks: ${summary.passCount}/${summary.total} PASS`);
  console.log(`  Live phonics report: ${liveBundle.status}${liveBundle.reason ? ` (${liveBundle.reason})` : ""}`);

  if (args.writeArtifacts) {
    await writeArtifacts(bundle);
  }

  if (!summary.allPass) {
    console.error("\nenglish-phonics-parent-report-guard: executable preflight FAILED");
    process.exit(1);
  }

  console.log("\nenglish-phonics-parent-report-guard: executable preflight PASS (live assertions BLOCKED until banks/generator/seed)");
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { leakScan, grammarTranslationScan, runStaticPreflight, runFlagBaselineCheck, runLivePhonicsGuard };
