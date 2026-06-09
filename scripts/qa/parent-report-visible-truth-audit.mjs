#!/usr/bin/env node
/**
 * Parent Report Visible Truth Audit — every parent-visible sentence must match
 * subject question counts in the same payload / date range.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-visible-truth-audit.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-visible-truth-audit.mjs --root-cause AAA4
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { deriveRawMetricStrengthLinesHe } from "../../utils/parent-data-presence.js";
import {
  SUBJECT_LABEL_BY_ID,
  SUBJECT_VISIBLE_LABELS_HE,
  classifySubjectEvidenceTier,
  filterRecentMistakesForVisibleSubjects,
  lineMentionsZeroEvidenceSubjectHe,
  lineViolatesZeroEvidenceInsightPolicy,
  subjectQuestionCountsFromPayload,
} from "../../utils/parent-report-language/subject-evidence-policy.js";
import {
  AAA_CHILDREN,
  COMPARISON_RANGES,
  FLAG_ENV,
  FLAG_MODES,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-visible-truth");
const REPORT_PATH = path.join(ROOT, "docs/qa/PARENT_REPORT_VISIBLE_TRUTH_AUDIT.md");
const MATRIX_PDF_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix");

/** @type {Record<string, { label: string, from: string, to: string }>} */
const FLAG_SCENARIOS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
  "PROMOTE-STRONG": { label: "AAA5", from: "2026-05-04", to: "2026-05-11" },
};

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

async function buildPublicPayload(supabase, entry, from, to, mode) {
  applyFlagMode(mode);
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(from),
    parseIsoDate(to),
    { includeParentActivities: true },
  );
  const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
  const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
  return stripInternalReportPayloadFields(structuredClone(enriched));
}

function subjectCardLineHe(label, q) {
  if (q <= 0) return "לא תורגל בתקופה שנבחרה";
  return `${q} שאלות`;
}

function isAllowedZeroSubjectVisibleMention(text, section) {
  const t = String(text || "");
  if (/לא תורגל בתקופה שנבחרה/.test(t)) return true;
  if (/מקצועות שלא תורגלו/.test(t)) return true;
  if (section === "כרטיסי מקצוע") return true;
  return false;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ child: string, rangeId?: string, modeId?: string, scenarioId?: string }} ctx
 */
function collectVisibleTruthRows(payload, ctx) {
  const counts = subjectQuestionCountsFromPayload(payload);
  const pf = payload?.parentFacing || {};
  const ov = payload?.summary?.diagnosticOverviewHe || {};
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];

  const push = (visibleText, section, subject, topic, sourceField, sourceQuestions) => {
    const sid = subject && subject !== "ALL" ? subject : null;
    const visibleQ = sid ? counts[sid] ?? counts[subject] ?? 0 : null;
    const srcQ = sourceQuestions ?? visibleQ;
    const zeroSid = sid && classifySubjectEvidenceTier(visibleQ) === "none" ? sid : null;
    const violates =
      zeroSid &&
      !isAllowedZeroSubjectVisibleMention(String(visibleText || ""), section) &&
      lineViolatesZeroEvidenceInsightPolicy(String(visibleText || ""), counts);
    const allowed = !violates;
    rows.push({
      visibleText: String(visibleText || "").slice(0, 240),
      section,
      subject: sid || "—",
      topic: topic || "—",
      sourceField,
      visibleQuestions: visibleQ,
      sourceQuestions: srcQ,
      allowed,
      verdict: allowed ? "PASS" : "FAIL",
      ...ctx,
    });
  };

  for (const line of pf.insights || []) {
    push(line, "מה חשוב לדעת", inferSubjectFromLine(line, counts), "—", "parentFacing.insights", null);
  }
  for (const line of pf.homeRecommendations || []) {
    push(line, "מה מומלץ לעשות בבית", inferSubjectFromLine(line, counts), "—", "parentFacing.homeRecommendations", null);
  }
  for (const line of pf.practiceFocus || []) {
    push(
      `מוקד: ${line?.focusLabelHe || ""}`,
      "המלצות",
      inferSubjectFromLine(String(line?.topicLabelHe || ""), counts),
      line?.topicLabelHe || "—",
      "parentFacing.practiceFocus",
      null,
    );
  }

  if (ov.practicedSubjectsSummaryHe) {
    push(ov.practicedSubjectsSummaryHe, "סיכום חכם להורה", "ALL", "—", "summary.diagnosticOverviewHe.practicedSubjectsSummaryHe", null);
  }
  if (ov.mainFocusAreaLineHe) {
    push(ov.mainFocusAreaLineHe, "סיכום חכם להורה", inferSubjectFromLine(ov.mainFocusAreaLineHe, counts), "—", "summary.diagnosticOverviewHe.mainFocusAreaLineHe", null);
  }
  if (ov.strongestAreaLineHe) {
    push(ov.strongestAreaLineHe, "סיכום חכם להורה", inferSubjectFromLine(ov.strongestAreaLineHe, counts), "—", "summary.diagnosticOverviewHe.strongestAreaLineHe", null);
  }
  for (const line of ov.readyForProgressPreviewHe || []) {
    push(line, "סיכום חכם להורה", inferSubjectFromLine(line, counts), "—", "summary.diagnosticOverviewHe.readyForProgressPreviewHe", null);
  }
  for (const line of ov.requiresAttentionPreviewHe || []) {
    push(line, "סיכום חכם להורה", inferSubjectFromLine(line, counts), "—", "summary.diagnosticOverviewHe.requiresAttentionPreviewHe", null);
  }

  for (const [sid, label] of Object.entries(SUBJECT_LABEL_BY_ID)) {
    const q = counts[sid] || 0;
    push(subjectCardLineHe(label, q), "כרטיסי מקצוע", sid, "—", `subjects.${sid}.visibleCard`, q);
  }

  for (const line of deriveRawMetricStrengthLinesHe(payload.summary)) {
    push(line, "התקדמות לפי מקצוע", inferSubjectFromLine(line, counts), "—", "deriveRawMetricStrengthLinesHe", null);
  }

  return rows;
}

function inferSubjectFromLine(line, counts) {
  const sid = lineMentionsZeroEvidenceSubjectHe(String(line || ""), counts);
  if (sid) return sid;
  for (const [subjectId, labels] of Object.entries(SUBJECT_VISIBLE_LABELS_HE)) {
    for (const label of labels) {
      if (String(line || "").includes(label)) return subjectId;
    }
  }
  return "—";
}

function auditPayload(payload, meta) {
  const counts = subjectQuestionCountsFromPayload(payload);
  const mapRows = collectVisibleTruthRows(payload, meta);
  const visibleFailures = mapRows.filter((r) => r.verdict === "FAIL");

  const pf = payload?.parentFacing || {};
  for (const line of [...(pf.insights || []), ...(pf.homeRecommendations || [])]) {
    if (lineViolatesZeroEvidenceInsightPolicy(line, counts)) {
      visibleFailures.push({
        rule: "subject_insight_on_zero_q",
        line,
        meta,
      });
    }
  }

  const rawMistakeCount = (payload.recentMistakes || []).length;
  const filteredMistakeCount = filterRecentMistakesForVisibleSubjects(payload.recentMistakes, counts).length;
  const payloadMistakeIntegrity = rawMistakeCount === filteredMistakeCount;

  return {
    counts,
    mapRows,
    failures: visibleFailures,
    payloadMistakeIntegrity,
    pass: visibleFailures.length === 0 && payloadMistakeIntegrity,
  };
}

async function scanMatrixPdfTexts() {
  const hits = [];
  let files = [];
  try {
    files = (await readdir(MATRIX_PDF_DIR)).filter((f) => f.endsWith(".pdf.txt") || f.endsWith("-body.txt"));
  } catch {
    return { scanned: 0, hits: [] };
  }

  for (const file of files) {
    const text = await readFile(path.join(MATRIX_PDF_DIR, file), "utf8");
    const englishZero = /אנגלית[\s\S]{0,80}0\s+שאלות[\s\S]{0,80}לא תורגל/.test(text);
    const englishInsight =
      /יש\s+טעויות\s+חוזרות\s+באנגלית|נראה\s+שיש\s+קושי\s+באנגלית|מעט\s+(?:נתונ|מידע)[\s\S]{0,20}אנגלית/.test(
        text,
      );
    if (englishZero && englishInsight) {
      hits.push({ file, issue: "english_zero_card_but_subject_insight_in_pdf" });
    }
  }
  return { scanned: files.length, hits };
}

async function rootCauseDump(supabase, scenarioKey) {
  const win = FLAG_SCENARIOS[scenarioKey] || FLAG_SCENARIOS.AAA4;
  const students = await resolveAaaStudents(supabase);
  const entry = students.find((s) => s.label === win.label);
  if (!entry) throw new Error(`Missing student ${win.label}`);

  const mode = FLAG_MODES.find((m) => m.id === "A");
  const payload = await buildPublicPayload(supabase, entry, win.from, win.to, mode);
  const counts = subjectQuestionCountsFromPayload(payload);
  const pf = payload.parentFacing || {};

  return {
    scenario: scenarioKey,
    student: win.label,
    range: { from: win.from, to: win.to },
    mode: "A",
    subjectQuestionCounts: counts,
    english: {
      visibleQuestions: counts.english,
      diagnosticAnswers: payload.subjects?.english?.diagnosticAnswers ?? null,
      totalAnswers: payload.subjects?.english?.answers ?? null,
    },
    parentFacing: {
      insights: pf.insights || [],
      homeRecommendations: pf.homeRecommendations || [],
      practiceFocus: pf.practiceFocus || [],
    },
    recentMistakesSubjects: [...new Set((payload.recentMistakes || []).map((m) => m?.subject))],
    recentMistakesFiltered: filterRecentMistakesForVisibleSubjects(payload.recentMistakes, counts).map(
      (m) => ({ subject: m.subject, topic: m.topic }),
    ),
    rootCause:
      "parentFacing used recentMistakes from non-diagnostic learning answers while subject cards count diagnosticAnswers only (0 for english). Fix: filter mistakes + insights by visible subject question counts.",
  };
}

function markdownTable(rows) {
  const head =
    "| visible text | section | subject | topic | source field | visible Q | source Q | allowed? | verdict |\n| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |";
  const body = rows
    .slice(0, 200)
    .map((r) => {
      const t = String(r.visibleText || "").replace(/\|/g, "\\|").slice(0, 80);
      return `| ${t} | ${r.section} | ${r.subject} | ${r.topic} | ${r.sourceField} | ${r.visibleQuestions ?? "—"} | ${r.sourceQuestions ?? "—"} | ${r.allowed ? "yes" : "no"} | ${r.verdict} |`;
    })
    .join("\n");
  return `${head}\n${body}`;
}

async function main() {
  const rootCauseArg =
    process.argv.find((a) => a.startsWith("--root-cause="))?.split("=")[1] ||
    (process.argv.includes("--root-cause") ? process.argv[process.argv.indexOf("--root-cause") + 1] : null);

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await mkdir(ARTIFACT_DIR, { recursive: true });

  if (rootCauseArg) {
    const dump = await rootCauseDump(supabase, rootCauseArg);
    const out = path.join(ARTIFACT_DIR, `root-cause-${rootCauseArg}.json`);
    await writeFile(out, JSON.stringify(dump, null, 2), "utf8");
    console.log(`Wrote ${out}`);
    return;
  }

  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));
  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  /** @type {Array<Record<string, unknown>>} */
  const allMapRows = [];

  for (const child of AAA_CHILDREN) {
    const entry = byLabel.get(child.label);
    if (!entry) continue;
    for (const range of COMPARISON_RANGES) {
      for (const mode of FLAG_MODES) {
        const payload = await buildPublicPayload(supabase, entry, range.from, range.to, mode);
        const meta = { child: child.label, rangeId: range.id, modeId: mode.id };
        const audit = auditPayload(payload, meta);
        results.push({ ...meta, ...audit, pass: audit.pass });
        allMapRows.push(...audit.mapRows);
      }
    }
  }

  for (const [scenarioId, win] of Object.entries(FLAG_SCENARIOS)) {
    const entry = byLabel.get(win.label);
    if (!entry) continue;
    for (const mode of FLAG_MODES) {
      const payload = await buildPublicPayload(supabase, entry, win.from, win.to, mode);
      const meta = { child: win.label, scenarioId, modeId: mode.id, from: win.from, to: win.to };
      const audit = auditPayload(payload, meta);
      results.push({ ...meta, ...audit, pass: audit.pass });
      allMapRows.push(...audit.mapRows);
    }
  }

  const pdfScan = await scanMatrixPdfTexts();
  const failCount = results.filter((r) => !r.pass).length;
  const passCount = results.length - failCount;
  const verdict = failCount === 0 && pdfScan.hits.length === 0 ? "PASS" : "FAIL";

  const summary = {
    generatedAt: new Date().toISOString(),
    verdict,
    casesRun: results.length,
    passCount,
    failCount,
    pdfScan,
    failedCases: results.filter((r) => !r.pass).map((r) => ({
      child: r.child,
      rangeId: r.rangeId,
      scenarioId: r.scenarioId,
      modeId: r.modeId,
      failures: r.failures,
    })),
  };

  await writeFile(path.join(ARTIFACT_DIR, "visible-truth-results.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(path.join(ARTIFACT_DIR, "visible-truth-map.json"), JSON.stringify(allMapRows, null, 2), "utf8");

  const aaa4Root = await rootCauseDump(supabase, "AAA4");
  await writeFile(path.join(ARTIFACT_DIR, "root-cause-AAA4.json"), JSON.stringify(aaa4Root, null, 2), "utf8");

  const failSamples = results.filter((r) => !r.pass).slice(0, 3);
  const md = `# Parent Report Visible Truth Audit

**Verdict: ${verdict}** — ${passCount}/${results.length} payload cases pass; PDF scan ${pdfScan.hits.length} hit(s) on ${pdfScan.scanned} file(s).

## Blocking rule

If subject visible questions = 0 in range, parent-facing text must not imply practice in that subject (mistakes, thin data, focus, difficulty).

## Root cause (AAA4 / english 0 + insight)

Scenario: **AAA4**, range \`2026-05-01\` – \`2026-06-08\`, mode **A**.

- \`english.visibleQuestions\`: ${aaa4Root.english.visibleQuestions}
- \`recentMistakesSubjects\`: ${(aaa4Root.recentMistakesSubjects || []).join(", ")}
- Before fix: \`parentFacing.insights\` could include \`יש טעויות חוזרות באנגלית\` while card shows 0 questions.
- Source: \`recentMistakes\` included learning (non-diagnostic) wrong answers; cards count \`diagnosticAnswers\` only.
- Fix: filter \`recentMistakes\` + subject-specific insights by \`subjectQuestionCountsFromPayload\`.

Public payload trace: \`docs/qa/_artifacts/parent-report-visible-truth/root-cause-AAA4.json\`

## Failed cases

${failCount === 0 ? "None." : failSamples.map((f) => `- ${f.child} ${f.rangeId || f.scenarioId} mode ${f.modeId}: ${JSON.stringify(f.failures?.slice(0, 2))}`).join("\n")}

## Visible Truth Map (sample)

${markdownTable(allMapRows.filter((r) => r.verdict === "FAIL").slice(0, 20).length ? allMapRows.filter((r) => r.verdict === "FAIL").slice(0, 20) : allMapRows.slice(0, 15))}

## Artifacts

- \`docs/qa/_artifacts/parent-report-visible-truth/visible-truth-results.json\`
- \`docs/qa/_artifacts/parent-report-visible-truth/visible-truth-map.json\`
- \`docs/qa/_artifacts/parent-report-visible-truth/root-cause-AAA4.json\`
`;

  await writeFile(REPORT_PATH, md, "utf8");

  console.log(`Visible truth audit: ${verdict} (${passCount}/${results.length})`);
  console.log(`Report: ${REPORT_PATH}`);
  if (verdict !== "PASS") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
