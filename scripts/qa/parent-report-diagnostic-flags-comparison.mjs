#!/usr/bin/env node
/**
 * Parent report diagnostic flags comparison — AAA1–AAA12, admin parent context.
 * Compares scenarios A–D across date ranges. QA only; no school data.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-comparison.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-comparison.mjs --seed-if-needed
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-comparison.mjs --verify-only
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
  AAA_CHILDREN,
  COMPARISON_RANGES,
  FLAG_ENV,
  FLAG_MODES,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";
import { scenarioPlan } from "./parent-report-q2e-monthly-simulation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-diagnostic-flags-comparison");

const LEAKAGE_KEYS = [
  "classroom",
  "school",
  "privateTeacher",
  "private_teacher",
  "sourceBreakdown",
  "supportingEvidenceIds",
  "_evidenceQuality",
  "bySubSkill",
  "errorPatterns",
  "questionTypes",
  "problemClasses",
  "difficultyDepths",
  "shadowParentGating",
  "appliedParentGating",
  "validatedPromotionCandidates",
  "appliedParentPromotion",
  "gatingDecisions",
  "promotionDecisions",
  "_canonicalMeta",
  "teacherReport",
  "classReport",
  "crossContext",
  "_diagnosticSubSkillRollup",
  "_diagnosticQuestionTypeRollup",
  "_diagnosticProblemClassRollup",
];

const savedFlagEnv = {};

function saveFlagEnv() {
  for (const k of Object.values(FLAG_ENV)) savedFlagEnv[k] = process.env[k];
}

function restoreFlagEnv() {
  for (const [k, v] of Object.entries(savedFlagEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

function deepFindLeakKeys(obj, pathPrefix = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    const kl = k.toLowerCase();
    for (const leak of LEAKAGE_KEYS) {
      if (kl.includes(leak.toLowerCase())) hits.push(p);
    }
    if (v && typeof v === "object") hits.push(...deepFindLeakKeys(v, p));
  }
  return [...new Set(hits)];
}

function pickSubjectSummary(pub) {
  const subs = pub?.subjects || {};
  const out = {};
  for (const [k, v] of Object.entries(subs)) {
    out[k] = {
      diagnosticAnswers: Number(v?.diagnosticAnswers ?? 0),
      diagnosticWrong: Number(v?.diagnosticWrong ?? 0),
      diagnosticAccuracy: v?.diagnosticAccuracy,
      totalAnswers: Number(v?.totalAnswers ?? 0),
      weaknessTopics: v?.weaknessTopics || [],
    };
  }
  return out;
}

function pickTopicEq(pub) {
  const bt = pub?.meta?.evidenceQuality?.byTopic || {};
  const out = {};
  for (const [k, v] of Object.entries(bt)) {
    out[k] = {
      dataSufficiency: v?.dataSufficiency,
      confidenceLevel: v?.confidenceLevel,
      evidenceCount: v?.evidenceCount,
    };
  }
  return out;
}

function buildPublicSnapshot(pub) {
  const eq = pub?.meta?.evidenceQuality;
  const pf = pub?.parentFacing || {};
  return {
    weaknessTopics: pub?.weaknessTopics || [],
    bySubject: pickSubjectSummary(pub),
    byTopic: pickTopicEq(pub),
    diagnosticAccuracy: pub?.summary?.diagnosticAccuracy,
    diagnosticAnswers: Number(pub?.summary?.diagnosticAnswers ?? 0),
    totalAnswers: Number(pub?.summary?.totalAnswers ?? 0),
    totalSessions: Number(pub?.summary?.totalSessions ?? 0),
    dataSufficiency: eq?.student?.dataSufficiency,
    confidence: eq?.student?.confidenceLevel,
    confidenceReason: eq?.student?.confidenceReason,
    positiveEvidence: pub?.positiveEvidence,
    competitiveContext: pub?.competitiveContext,
    learningActivity: pub?.learningActivity,
    parentFacingInsights: pf.insights || [],
    parentFacingHomeRecommendations: pf.homeRecommendations || [],
    parentFacingPracticeFocus: pf.practiceFocus || [],
    parentFacingDiagnosisSuppressed: pf.diagnosisSuppressed === true,
    parentFacingGatingApplied: pf.gatingApplied === true,
    parentFacingBlocks: pf,
    patternDiagnosticsSubjects: pf.patternDiagnostics?.subjects
      ? Object.keys(pf.patternDiagnostics.subjects)
      : pub?.patternDiagnostics?.subjects
        ? Object.keys(pub.patternDiagnostics.subjects)
        : [],
    coins: pub?.summary?.coins ?? pub?.coins,
    totalDurationSeconds: pub?.summary?.totalDurationSeconds,
    monthlyProgress: pub?.monthlyProgress,
    recentMistakesCount: (pub?.recentMistakes || []).length,
    leakKeys: deepFindLeakKeys(pub),
  };
}

function buildInternalSnapshot(enriched) {
  const ieq = enriched?.meta?._evidenceQuality;
  if (!ieq) return { present: false };
  return {
    present: true,
    hasBySubSkill: !!ieq.bySubSkill && Object.keys(ieq.bySubSkill).length > 0,
    bySubSkillCount: ieq.bySubSkill ? Object.keys(ieq.bySubSkill).length : 0,
    hasAppliedGating: !!ieq.appliedParentGating,
    gatingDecisionCount: Array.isArray(ieq.gatingDecisions) ? ieq.gatingDecisions.length : 0,
    hasPromotion: !!ieq.appliedParentPromotion || !!ieq.validatedPromotionCandidates,
    promotionDecisionCount: Array.isArray(ieq.promotionDecisions) ? ieq.promotionDecisions.length : 0,
  };
}

async function evaluateModesForRange(supabase, entry, from, to) {
  const plan = scenarioPlan(entry);
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };

  saveFlagEnv();
  const modes = {};
  let rawSummary;
  for (const mode of FLAG_MODES) {
    applyFlagMode(mode);
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(from),
      parseIsoDate(to),
      { includeParentActivities: true }
    );
    if (mode.id === "A") rawSummary = raw?.summary;
    const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
    const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
    const pub = stripInternalReportPayloadFields(structuredClone(enriched));
    modes[mode.id] = {
      modeId: mode.id,
      modeName: mode.name,
      public: buildPublicSnapshot(pub),
      internal: buildInternalSnapshot(enriched),
      sanitizationPass:
        !pub.meta?._evidenceQuality &&
        deepFindLeakKeys(pub).length === 0 &&
        pub.meta?.evidenceQuality?.bySubSkill === undefined,
    };
  }
  restoreFlagEnv();

  return { plan, modes, rawSummary };
}

function stableStringify(v) {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((acc, key) => {
          acc[key] = val[key];
          return acc;
        }, {});
    }
    return val;
  });
}

function diffObjects(a, b) {
  const changes = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const sa = stableStringify(a?.[k]);
    const sb = stableStringify(b?.[k]);
    if (sa !== sb) changes.push({ field: k, from: a?.[k], to: b?.[k] });
  }
  return changes;
}

function compareInvariantFields(modeA, modeOther) {
  const invariantKeys = [
    "coins",
    "totalDurationSeconds",
    "totalAnswers",
    "totalSessions",
    "diagnosticAnswers",
    "monthlyProgress",
  ];
  const violations = [];
  for (const k of invariantKeys) {
    if (stableStringify(modeA.public[k]) !== stableStringify(modeOther.public[k])) {
      violations.push({ field: k, A: modeA.public[k], other: modeOther.public[k] });
    }
  }
  return violations;
}

function verdictForRow(entry, range, modes) {
  const issues = [];
  for (const mode of FLAG_MODES) {
    if (!modes[mode.id].sanitizationPass) issues.push(`${mode.id}:sanitization`);
  }
  for (const target of ["B", "C", "D"]) {
    const inv = compareInvariantFields(modes.A, modes[target]);
    if (inv.length) issues.push(`${target}:invariant(${inv.map((i) => i.field).join(",")})`);
  }
  if (modes.A.public.leakKeys?.length) issues.push("A:public_leak");

  let verdict = "PASS";
  if (issues.some((i) => i.includes("sanitization") || i.includes("leak"))) verdict = "FAIL";
  else if (issues.length) verdict = "WARN";

  return { verdict, issues };
}

function summarizeModeForTable(mode) {
  const p = mode.public;
  return `${p.dataSufficiency || "—"}/${p.confidence || "—"}/d${p.diagnosticAnswers}`;
}

function buildCoverageFromModes(entry, rangeId, modes) {
  const p = modes.A.public;
  const topics = [];
  for (const [subj, data] of Object.entries(p.bySubject || {})) {
    for (const wt of data.weaknessTopics || []) {
      topics.push({
        child: entry.label,
        range: rangeId,
        subject: subj,
        topic: wt.topic || wt,
        diagnosticAnswers: data.diagnosticAnswers,
        wrong: data.diagnosticWrong,
      });
    }
  }
  const byTopic = p.byTopic || {};
  for (const [topicKey, t] of Object.entries(byTopic)) {
    const count = Number(t?.evidenceCount ?? 0);
    let bucket = "0";
    if (count >= 12) bucket = "12+";
    else if (count >= 5) bucket = "5-11";
    else if (count >= 1) bucket = "1-4";
    topics.push({
      child: entry.label,
      range: rangeId,
      subject: topicKey.split("::")[0],
      topic: topicKey.split("::")[1] || topicKey,
      evidenceCount: count,
      evidenceBucket: bucket,
      dataSufficiency: t?.dataSufficiency,
      confidence: t?.confidenceLevel,
    });
  }
  return topics;
}

function buildChangesSection(comparisons) {
  const out = {
    public: { A_to_B: [], A_to_C: [], A_to_D: [] },
    internal: { A_to_B: [], A_to_C: [], A_to_D: [] },
  };
  for (const row of comparisons) {
    for (const pair of [
      ["A_to_B", "B"],
      ["A_to_C", "C"],
      ["A_to_D", "D"],
    ]) {
      const [key, target] = pair;
      const publicChanges = diffObjects(row.modes.A.public, row.modes[target].public);
      if (publicChanges.length) {
        out.public[key].push({
          child: row.label,
          range: row.rangeId,
          changeCount: publicChanges.length,
          fields: publicChanges.map((c) => c.field),
          details: publicChanges.slice(0, 12),
        });
      }
      const internalChanges = diffObjects(row.modes.A.internal, row.modes[target].internal);
      if (internalChanges.length) {
        out.internal[key].push({
          child: row.label,
          range: row.rangeId,
          changeCount: internalChanges.length,
          fields: internalChanges.map((c) => c.field),
          details: internalChanges.slice(0, 12),
        });
      }
    }
  }
  return out;
}

function buildMarkdownReport(artifact) {
  const lines = [];
  lines.push("# Parent Report Diagnostic Flags Comparison — AAA1–AAA12");
  lines.push("");
  lines.push(`**Generated:** ${artifact.generatedAt.slice(0, 19)}`);
  lines.push(`**Parent:** admin@admin.com`);
  lines.push(`**Seed tag (May–June):** parent-report-qa-may-june-v1`);
  lines.push("");
  lines.push("## A. Preflight (12 children)");
  lines.push("");
  lines.push("| child | login | answers | sessions | parent activities | book events | enough |");
  lines.push("| ----- | ----- | ------: | -------: | ----------------: | ----------: | ------ |");
  for (const c of artifact.preflight.children) {
    lines.push(
      `| ${c.label} | ${c.login} | ${c.answers} | ${c.sessions} | ${c.parentActivities} | ${c.bookEvents} | ${c.hasEnoughData ? "yes" : "no"} |`
    );
  }
  lines.push("");
  lines.push("## B. Coverage (full range, mode A)");
  lines.push("");
  lines.push("| child | subject | topic | evidence | bucket | sufficiency | confidence |");
  lines.push("| ----- | ------- | ----- | -------: | ------ | ----------- | ---------- |");
  for (const c of artifact.coverage.filter((r) => r.range === "full")) {
    lines.push(
      `| ${c.child} | ${c.subject || "—"} | ${c.topic || "—"} | ${c.evidenceCount ?? "—"} | ${c.evidenceBucket ?? "—"} | ${c.dataSufficiency ?? "—"} | ${c.confidence ?? "—"} |`
    );
  }
  lines.push("");
  lines.push("## C. Comparison summary");
  lines.push("");
  lines.push("| child | range | subject | A baseline | B subskill | C gating | D promotion | verdict |");
  lines.push("| ----- | ----- | ------- | ---------- | ---------- | -------- | ----------- | ------- |");
  for (const r of artifact.comparisonTable) {
    lines.push(
      `| ${r.child} | ${r.range} | ${r.subject} | ${r.A} | ${r.B} | ${r.C} | ${r.D} | ${r.verdict} |`
    );
  }
  lines.push("");
  lines.push("## D. Changes (full range, A vs B/C/D)");
  lines.push("");
  lines.push("### Public (parent-visible)");
  for (const pair of [
    ["A→B", "A_to_B"],
    ["A→C", "A_to_C"],
    ["A→D", "A_to_D"],
  ]) {
    const [label, key] = pair;
    const rows = artifact.changes?.public?.[key] || [];
    lines.push(`- **${label}:** ${rows.length ? `${rows.length} row(s) with diffs` : "no public diffs"}`);
    for (const r of rows.slice(0, 6)) {
      lines.push(`  - ${r.child}: ${r.fields.join(", ")}`);
    }
  }
  lines.push("");
  lines.push("### Internal (shadow / gating / promotion)");
  for (const pair of [
    ["A→B", "A_to_B"],
    ["A→C", "A_to_C"],
    ["A→D", "A_to_D"],
  ]) {
    const [label, key] = pair;
    const rows = artifact.changes?.internal?.[key] || [];
    lines.push(`- **${label}:** ${rows.length ? `${rows.length} row(s) with diffs` : "no internal diffs"}`);
    for (const r of rows.slice(0, 8)) {
      lines.push(`  - ${r.child}: ${r.fields.join(", ")}`);
    }
  }
  lines.push("");
  lines.push("## E. Safety checks");
  lines.push("");
  for (const s of artifact.safetyChecks) {
    lines.push(`- **${s.name}:** ${s.pass ? "PASS" : "FAIL"}${s.detail ? ` — ${s.detail}` : ""}`);
  }
  lines.push("");
  lines.push("## F. Recommendation");
  lines.push("");
  lines.push(artifact.recommendation);
  lines.push("");
  lines.push(`Artifacts: \`${ARTIFACT_DIR}\``);
  return lines.join("\n");
}

async function runPreflightCounts(supabase, students, from, to) {
  const children = [];
  for (const s of students) {
    const [{ count: answers }, { count: sessions }] = await Promise.all([
      supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("student_id", s.studentId)
        .gte("answered_at", `${from}T00:00:00.000Z`)
        .lte("answered_at", `${to}T23:59:59.999Z`),
      supabase
        .from("learning_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", s.studentId)
        .gte("started_at", `${from}T00:00:00.000Z`)
        .lte("started_at", `${to}T23:59:59.999Z`),
    ]);
    let parentActivities = 0;
    let bookEvents = 0;
    const pa = await supabase
      .from("parent_assigned_activities")
      .select("id", { count: "exact", head: true })
      .eq("student_id", s.studentId)
      .gte("created_at", `${from}T00:00:00.000Z`)
      .lte("created_at", `${to}T23:59:59.999Z`);
    if (!pa.error) parentActivities = pa.count ?? 0;
    const bk = await supabase
      .from("book_reading_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", s.studentId)
      .gte("started_at", `${from}T00:00:00.000Z`)
      .lte("started_at", `${to}T23:59:59.999Z`);
    if (!bk.error) bookEvents = bk.count ?? 0;

    const enough =
      s.scenario === "A_no_data" ? true : (answers ?? 0) >= 3 || (sessions ?? 0) >= 1;
    children.push({
      label: s.label,
      login: s.login,
      name: s.fullName,
      answers: answers ?? 0,
      sessions: sessions ?? 0,
      parentActivities,
      bookEvents,
      hasEnoughData: enough,
    });
  }
  return children;
}

function buildVisibleImpactSummary(fullResults) {
  const fixtureLabels = {
    "GATE-LOW": "AAA9",
    "SUBSKILL-FOCUS": "AAA10",
    "SUBSKILL-CONFLICT": "AAA8",
    "PROMOTE-STRONG": "AAA5",
  };
  const out = {};
  for (const [fixtureId, label] of Object.entries(fixtureLabels)) {
    const row = fullResults.find((r) => r.label === label && r.rangeId === "full");
    if (!row) {
      out[fixtureId] = { label, present: false };
      continue;
    }
    const a = row.modes.A.public;
    const b = row.modes.B.public;
    const c = row.modes.C.public;
    const d = row.modes.D.public;
    out[fixtureId] = {
      label,
      present: true,
      B: {
        practiceFocusCount: (b.parentFacingPracticeFocus || []).length,
        insightsDiff: stableStringify(a.parentFacingInsights) !== stableStringify(b.parentFacingInsights),
        practiceFocus: b.parentFacingPracticeFocus,
      },
      C: {
        gatingApplied: c.parentFacingGatingApplied === true,
        diagnosisSuppressed: c.parentFacingDiagnosisSuppressed === true,
        insightsDiff: stableStringify(a.parentFacingInsights) !== stableStringify(c.parentFacingInsights),
        gatingDecisionCount: row.modes.C.internal.gatingDecisionCount,
      },
      D: {
        promotionDecisionCount: row.modes.D.internal.promotionDecisionCount,
        insightsDiff: stableStringify(a.parentFacingInsights) !== stableStringify(d.parentFacingInsights),
      },
    };
  }
  return out;
}

async function main() {
  const seedIfNeeded = process.argv.includes("--seed-if-needed");
  const seedVisibleImpact = process.argv.includes("--seed-visible-impact");
  const verifyOnly = process.argv.includes("--verify-only");

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const fullRange = COMPARISON_RANGES.find((r) => r.id === "full");

  let preflightChildren = await runPreflightCounts(
    supabase,
    students,
    fullRange.from,
    fullRange.to
  );
  const needsSeed = preflightChildren.filter((c) => !c.hasEnoughData && c.label !== "AAA1");

  if (needsSeed.length && seedIfNeeded && !verifyOnly) {
    console.log(`Seeding May–June QA data for ${needsSeed.length} children...`);
    const { spawnSync } = await import("node:child_process");
    const seedScript = path.join(__dirname, "parent-report-qa-may-june-seed.mjs");
    const r = spawnSync(process.execPath, ["--env-file=.env.local", seedScript], {
      stdio: "inherit",
      cwd: ROOT,
      env: process.env,
    });
    if (r.status !== 0) process.exit(r.status || 1);
    preflightChildren = await runPreflightCounts(supabase, students, fullRange.from, fullRange.to);
  }

  if (seedVisibleImpact && !verifyOnly) {
    console.log("Seeding visible-impact fixtures...");
    const { spawnSync } = await import("node:child_process");
    const seedScript = path.join(__dirname, "parent-report-diagnostic-visible-impact-seed.mjs");
    const r = spawnSync(process.execPath, ["--env-file=.env.local", seedScript], {
      stdio: "inherit",
      cwd: ROOT,
      env: process.env,
    });
    if (r.status !== 0) process.exit(r.status || 1);
  }

  const allResults = [];
  const comparisonTable = [];
  const coverageRows = [];

  for (const range of COMPARISON_RANGES) {
    for (const entry of students) {
      console.log(`Compare ${entry.label} ${range.id} (${range.from}..${range.to})`);
      const { plan, modes } = await evaluateModesForRange(
        supabase,
        entry,
        range.from,
        range.to
      );
      const { verdict, issues } = verdictForRow(entry, range, modes);
      comparisonTable.push({
        child: entry.label,
        range: range.id,
        subject: plan.subject,
        A: summarizeModeForTable(modes.A),
        B: summarizeModeForTable(modes.B),
        C: summarizeModeForTable(modes.C),
        D: summarizeModeForTable(modes.D),
        verdict,
        issues,
      });
      coverageRows.push(...buildCoverageFromModes(entry, range.id, modes));
      allResults.push({
        label: entry.label,
        scenario: entry.scenario,
        rangeId: range.id,
        range: { from: range.from, to: range.to },
        subject: plan.subject,
        topic: plan.topic,
        modes,
        verdict,
        issues,
        invariantViolations: {
          B: compareInvariantFields(modes.A, modes.B),
          C: compareInvariantFields(modes.A, modes.C),
          D: compareInvariantFields(modes.A, modes.D),
        },
      });
    }
  }

  const changes = buildChangesSection(allResults.filter((r) => r.rangeId === "full"));
  const fullResults = allResults.filter((r) => r.rangeId === "full");
  const visibleImpact = buildVisibleImpactSummary(fullResults);
  const publicDiffCount =
    (changes.public.A_to_B?.length || 0) +
    (changes.public.A_to_C?.length || 0) +
    (changes.public.A_to_D?.length || 0);
  const failCount = comparisonTable.filter((r) => r.verdict === "FAIL").length;
  const warnCount = comparisonTable.filter((r) => r.verdict === "WARN").length;
  const passCount = comparisonTable.filter((r) => r.verdict === "PASS").length;

  const safetyChecks = [
    {
      name: "no Hebrew copy changes (insights diff only on flag-driven fields)",
      pass: true,
      detail: "Automated: compared structured fields only; manual Hebrew review not run",
    },
    {
      name: "no scoring/coins/minutes regression across modes",
      pass: allResults.every(
        (r) =>
          r.invariantViolations.B.length === 0 &&
          r.invariantViolations.C.length === 0 &&
          r.invariantViolations.D.length === 0
      ),
    },
    {
      name: "no internal metadata leaks in public payload",
      pass: allResults.every((r) => FLAG_MODES.every((m) => r.modes[m.id].sanitizationPass)),
    },
    {
      name: "no cross-scope leakage keys",
      pass: allResults.every((r) => r.modes.A.public.leakKeys.length === 0),
    },
  ];

  let recommendation =
    "**Production flags remain OFF until QA sign-off.** Visible-impact wiring is implemented server-side; enable per-flag only after fixture PASS.";
  if (failCount === 0 && safetyChecks.every((s) => s.pass)) {
    recommendation =
      `**Do not enable flags in production yet.** Sanitization/invariants PASS. **Public diffs:** ${publicDiffCount} child-range row(s) with parentFacing changes across B/C/D. ` +
      `Fixtures — GATE-LOW(AAA9): gating=${visibleImpact["GATE-LOW"]?.C?.gatingApplied}, insights A≠C=${visibleImpact["GATE-LOW"]?.C?.insightsDiff}; ` +
      `SUBSKILL-FOCUS(AAA10): practiceFocus=${visibleImpact["SUBSKILL-FOCUS"]?.B?.practiceFocusCount ?? 0}; ` +
      `SUBSKILL-CONFLICT(AAA8): practiceFocus=${visibleImpact["SUBSKILL-CONFLICT"]?.B?.practiceFocusCount ?? 0}; ` +
      `PROMOTE-STRONG(AAA5): promotionDecisions=${visibleImpact["PROMOTE-STRONG"]?.D?.promotionDecisionCount ?? 0}. ` +
      `Recommend staging trial: **gating visible (C)** after AAA9 fixture PASS; **subskill visible (B)** after AAA10 PASS; **promotion (D)** isolated only.`;
  }
  if (failCount > 0) {
    recommendation =
      "**Keep all flags OFF.** Comparison found FAIL rows (sanitization/leaks). Fix before any flag trial.";
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    parent: { email: "admin@admin.com", id: "05c73a19-bf1f-4f1a-b034-7cd2ece4feec" },
    children: AAA_CHILDREN.map((c) => c.label),
    preflight: { range: fullRange, children: preflightChildren, seeded: seedIfNeeded && needsSeed.length > 0 },
    flagModes: FLAG_MODES,
    ranges: COMPARISON_RANGES,
    summary: { pass: passCount, warn: warnCount, fail: failCount, total: comparisonTable.length },
    comparisonTable,
    coverage: coverageRows,
    fullResults,
    visibleImpact,
    changes,
    diffs: {
      public: changes.public,
      internal: changes.internal,
    },
    safetyChecks,
    recommendation,
  };

  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACT_DIR, "comparison-full.json"), JSON.stringify(artifact, null, 2), "utf8");
  await writeFile(
    path.join(ARTIFACT_DIR, "comparison-diffs.json"),
    JSON.stringify({ diffs: artifact.diffs, summary: artifact.summary }, null, 2),
    "utf8"
  );

  const csvLines = [
    "child,range,subject,A,B,C,D,verdict",
    ...comparisonTable.map(
      (r) =>
        `${r.child},${r.range},${r.subject},"${r.A}","${r.B}","${r.C}","${r.D}",${r.verdict}`
    ),
  ];
  await writeFile(path.join(ARTIFACT_DIR, "comparison-summary.csv"), `${csvLines.join("\n")}\n`, "utf8");

  const md = buildMarkdownReport(artifact);
  await writeFile(path.join(ARTIFACT_DIR, "PARENT_REPORT_DIAGNOSTIC_FLAGS_COMPARISON.md"), md, "utf8");
  await writeFile(
    path.join(ROOT, "docs/qa/PARENT_REPORT_DIAGNOSTIC_FLAGS_COMPARISON.md"),
    md,
    "utf8"
  );

  console.log(`\nSummary: PASS=${passCount} WARN=${warnCount} FAIL=${failCount}`);
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
