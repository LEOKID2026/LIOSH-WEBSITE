#!/usr/bin/env node
/**
 * Export parent-visible report samples for manual QA review (one student per profile).
 * Run: node --env-file=.env.local scripts/qa/export-manual-parent-report-review-samples.mjs --runId=mass-2026-06-27T13-10-20
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../../lib/parent-server/db-input-to-detailed-report.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { collectTopicEngineRowsFromReport } from "../../utils/parent-report-engine-insights-he.js";
import { buildParentReportV2FromAggregate } from "./lib/mass-virtual-students/report-v2-bridge.mjs";
import { createServiceClient } from "./lib/mass-virtual-students/supabase.mjs";
import { SUBJECT_LABELS_HE } from "./lib/mass-virtual-students/constants.mjs";

const PROFILE_ORDER = [
  "strong",
  "weak",
  "average",
  "single_topic_gap",
  "multi_topic_gap",
  "slow_accurate",
  "fast_errors",
  "improving",
  "declining",
  "unstable",
  "sparse_data",
  "parent_assigned_only",
  "mixed_sources",
];

const SUBJECT_LABEL = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדעים",
  "moledet-geography": "מולדת וגאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
};

function parseArgs(argv) {
  let runId = "mass-2026-06-27T13-10-20";
  for (const a of argv) {
    if (a.startsWith("--runId=")) runId = a.slice("--runId=".length);
  }
  return { runId };
}

function subjectsInPayload(payload) {
  const subs = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : {};
  return Object.entries(subs)
    .filter(([, s]) => (Number(s?.answers) || 0) > 0 || (Number(s?.total) || 0) > 0)
    .map(([id]) => SUBJECT_LABEL[id] || SUBJECT_LABELS_HE[id] || id);
}

function hasParentAssignedActivity(payload) {
  const subs = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : {};
  for (const sub of Object.values(subs)) {
    const mc = sub?.modeCounts;
    if (mc && (Number(mc.homework) || 0) + (Number(mc.parent_assigned) || 0) > 0) return true;
    for (const topic of Object.values(sub?.topics || {})) {
      const tmc = topic?.modeCounts;
      if (tmc && (Number(tmc.homework) || 0) > 0) return true;
      for (const slice of Object.values(topic?.byContentGrade || {})) {
        const smc = slice?.modeCounts;
        if (smc && (Number(smc.homework) || 0) > 0) return true;
      }
    }
  }
  return false;
}

function pickPrimaryDecision(v2Rows) {
  const priority = [
    "speed_pressure_pattern",
    "clear_topic_gap",
    "topic_needs_strengthening",
    "early_direction_only",
    "insufficient_data",
    "partial_stable",
    "mastery_stable",
  ];
  const seen = new Set(
    v2Rows
      .map((r) => r.topicEngineRowSignals?.engineDiagnosticDecision?.engineDecision)
      .filter(Boolean),
  );
  for (const d of priority) {
    if (seen.has(d)) return d;
  }
  return v2Rows[0]?.topicEngineRowSignals?.engineDiagnosticDecision?.engineDecision || "—";
}

function formatOverviewHe(overview) {
  if (!overview || typeof overview !== "object") return ["_(אין סיכום אבחוני)_"];
  const lines = [];
  const fields = [
    ["strongestAreaLineHe", "חוזק יחסי"],
    ["mainFocusAreaLineHe", "מוקד עיקרי"],
    ["practicedSubjectsSummaryHe", "מקצועות שתורגלו"],
    ["notPracticedSubjectsSummaryHe", "מקצועות שלא תורגלו"],
    ["thinEvidenceSubjectsHe", "מקצועות עם מעט נתונים"],
  ];
  for (const [key, label] of fields) {
    const v = overview[key];
    if (Array.isArray(v) && v.length) {
      lines.push(`**${label}:**`);
      for (const item of v) lines.push(`- ${item}`);
    } else if (typeof v === "string" && v.trim()) {
      lines.push(`**${label}:** ${v.trim()}`);
    }
  }
  for (const key of ["readyForProgressPreviewHe", "requiresAttentionPreviewHe"]) {
    const arr = Array.isArray(overview[key]) ? overview[key].filter(Boolean) : [];
    if (arr.length) {
      lines.push(`**${key === "readyForProgressPreviewHe" ? "מוכנות להתקדם" : "דורש תשומת לב"}:**`);
      for (const item of arr) lines.push(`- ${item}`);
    }
  }
  return lines.length ? lines : ["_(אין שורות סיכום)_"];
}

function formatTopicUnits(detailed) {
  const profiles = Array.isArray(detailed?.subjectProfiles) ? detailed.subjectProfiles : [];
  const rows = [];
  for (const sp of profiles) {
    const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const t of recs.slice(0, 4)) {
      const title = String(t?.narrativeTitleHe || t?.displayName || t?.topicKey || "").trim();
      if (!title) continue;
      const subject = SUBJECT_LABEL[sp?.subject] || sp?.subject || "";
      const block = [`#### ${title}${subject ? ` (${subject})` : ""}`];
      const rec = String(t?.recommendedStepLabelHe || t?.recommendedNextStep?.labelHe || "").trim();
      if (rec) block.push(`- **המלצה:** ${rec}`);
      const plan = String(
        t?.interventionPlanHe || t?.doNowHe || t?.recommendedNextStep?.actionHe || "",
      ).trim();
      if (plan) block.push(`- **מה לעשות:** ${plan}`);
      const caution = String(t?.cautionLineHe || "").trim();
      if (caution) block.push(`- **הערת זהירות:** ${caution}`);
      const explain = String(t?.whyThisRecommendationHe || "").trim();
      if (explain) block.push(`- **למה:** ${explain}`);
      const q = Number(t?.questions);
      const acc = Number(t?.accuracy);
      if (Number.isFinite(q) && q > 0) {
        block.push(`- **נפח:** ${q} שאלות${Number.isFinite(acc) ? `, דיוק ${Math.round(acc)}%` : ""}`);
      }
      rows.push(block.join("\n"));
      if (rows.length >= 8) break;
    }
    if (rows.length >= 8) break;
  }
  return rows.length ? rows : ["_(אין יחידות אבחון מפורטות עם טקסט להורה)_"];
}

function formatSampleMarkdown(sample) {
  const {
    index,
    student,
    subjects,
    primaryDecision,
    parentAssigned,
    summary,
    parentFacing,
    detailed,
    rawMetricStrengthsHe,
  } = sample;

  const lines = [
    `---`,
    ``,
    `## דוגמה ${index}: ${student.displayName}`,
    ``,
    `| שדה | ערך |`,
    `| --- | --- |`,
    `| **שם תלמיד** | ${student.displayName} |`,
    `| **login** | \`${student.login}\` |`,
    `| **כיתה** | ${student.grade} |`,
    `| **פרופיל סימולציה** | \`${student.profile}\` |`,
    `| **מקצועות בדוח** | ${subjects.join(", ") || "—"} |`,
    `| **decision מרכזי** | \`${primaryDecision}\` |`,
    `| **פעילות אישית מהורה** | ${parentAssigned ? "כן" : "לא"} |`,
    ``,
    `### סיכום תקופה (מה שהורה רואה)`,
    ``,
    `- **סה"כ שאלות:** ${summary.totalQuestions ?? "—"}`,
    `- **דיוק כללי:** ${summary.overallAccuracy != null ? `${summary.overallAccuracy}%` : "—"}`,
    ``,
    ...formatOverviewHe(summary.diagnosticOverviewHe).map((l) => (l.startsWith("**") || l.startsWith("-") ? l : `- ${l}`)),
    ``,
  ];

  if (Array.isArray(rawMetricStrengthsHe) && rawMetricStrengthsHe.length) {
    lines.push(`### חוזקות יחסיות`, ``);
    for (const line of rawMetricStrengthsHe.slice(0, 4)) lines.push(`- ${line}`);
    lines.push(``);
  }

  lines.push(`### תובנות להורים`, ``);
  if (parentFacing.insights?.length) {
    for (const line of parentFacing.insights) lines.push(`- ${line}`);
  } else {
    lines.push(`_(אין תובנות)_`);
  }
  lines.push(``);

  lines.push(`### המלצות לבית`, ``);
  if (parentFacing.homeRecommendations?.length) {
    for (const line of parentFacing.homeRecommendations) lines.push(`- ${line}`);
  } else {
    lines.push(`_(אין המלצות)_`);
  }
  lines.push(``);

  if (parentFacing.teacherMessages?.length) {
    lines.push(`### הודעות מורה`, ``);
    for (const m of parentFacing.teacherMessages.slice(0, 3)) {
      const body = String(m?.bodyHe || m?.body || "").trim();
      if (body) lines.push(`- ${body}`);
    }
    lines.push(``);
  }

  lines.push(`### נושאים מרכזיים — דוח מפורט (parent-visible)`, ``);
  lines.push(...formatTopicUnits(detailed));
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  const { runId } = parseArgs(process.argv.slice(2));
  const reportDir = join(process.cwd(), "reports", "mass-simulation", runId);
  const manifest = JSON.parse(await readFile(join(reportDir, "manifest.json"), "utf8"));
  const summary = JSON.parse(await readFile(join(reportDir, "summary.json"), "utf8"));
  const from = summary.dateRange?.from;
  const to = summary.dateRange?.to;
  if (!from || !to) throw new Error("missing dateRange in summary.json");

  const allStudents = manifest.parents.flatMap((p) =>
    (p.children || []).map((c) => ({ ...c, parentEmail: p.email })),
  );

  const picked = [];
  for (const profile of PROFILE_ORDER) {
    const student = allStudents.find((s) => s.profile === profile);
    if (student) picked.push(student);
  }

  const supabase = createServiceClient();
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  const samples = [];

  for (let i = 0; i < picked.length; i++) {
    const student = picked[i];
    const { data: row } = await supabase
      .from("students")
      .select("id, full_name, grade_level, parent_id, is_active")
      .eq("id", student.studentId)
      .maybeSingle();
    if (!row?.id) throw new Error(`student missing: ${student.login}`);

    const raw = await aggregateParentReportPayload(supabase, row, fromDate, toDate, {
      includeParentActivities: true,
    });
    const enriched = await enrichPayloadWithParentFacing(supabase, raw, student.studentId);
    const publicPayload = stripInternalReportPayloadFields(enriched);
    const detailed = await buildDetailedPayloadFromAggregatedReportBody(enriched, "custom");
    const v2 = await buildParentReportV2FromAggregate(raw, {
      studentName: row.full_name,
      fromDate,
      toDate,
    });
    const v2Rows = collectTopicEngineRowsFromReport(v2);

    samples.push({
      index: i + 1,
      student,
      subjects: subjectsInPayload(publicPayload),
      primaryDecision: pickPrimaryDecision(v2Rows),
      parentAssigned: hasParentAssignedActivity(publicPayload) || student.profile === "parent_assigned_only",
      summary: v2?.summary || {},
      parentFacing: publicPayload?.parentFacing || enriched?.parentFacing || {},
      detailed: detailed || {},
      rawMetricStrengthsHe: Array.isArray(v2?.rawMetricStrengthsHe) ? v2.rawMetricStrengthsHe : [],
    });
    console.log(`[export] ${student.login} (${student.profile}) ok`);
  }

  const header = [
    `# Manual Parent Report Review Samples`,
    ``,
    `**Run ID:** ${runId}`,
    `**טווח:** ${from} → ${to}`,
    `**תאריך ייצוא:** ${new Date().toISOString()}`,
    ``,
    `דוגמאות parent-visible בלבד — ללא metadata פנימי (evidenceSources, engine enums בגוף הדוח).`,
    `סיסמת הורה: \`747975\` | PIN תלמיד: \`7975\``,
    ``,
  ];

  const body = samples.map(formatSampleMarkdown).join("\n");
  const outPath = join(reportDir, "manual-parent-report-review-samples.md");
  await writeFile(outPath, `${header.join("\n")}${body}`, "utf8");
  console.log(`[export] wrote ${outPath} (${samples.length} samples)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
