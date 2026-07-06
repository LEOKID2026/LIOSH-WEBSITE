#!/usr/bin/env node
/**
 * Parent report DETAILED — DOM/browser truth map (full mode default).
 * Source of truth: rendered #parent-report-detailed-print, not component names alone.
 *
 * Run (dev server on 3001):
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-report-detailed-dom-window-map.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import {
  assertDevServerReachable,
  fetchLiveReportData,
  resolveParentBearer,
} from "./truth-gates/lib/live-parent-report.mjs";

loadEnvFiles();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-detailed-current-ui-window-map.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-detailed-current-ui-window-map.md");
const ARTIFACT_DIR = join(ROOT, "docs", "audits", "_artifacts", "parent-report-detailed-dom");

const STUDENT_ID = process.env.PARENT_REPORT_DOM_STUDENT_ID || "74c30e48-895b-4f4c-a65a-888f656f54f6";
const STUDENT_LABEL = process.env.PARENT_REPORT_DOM_STUDENT_LABEL || "OMER";
const RANGE = {
  from: process.env.PARENT_REPORT_DOM_FROM || "2025-09-01",
  to: process.env.PARENT_REPORT_DOM_TO || "2026-07-04",
};
const ORIGIN = (process.env.TRUTH_GATES_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";
const OMER_PARENT_ID = "be71653c-78f5-42e6-951e-c560afaa112a";
const OMER_PARENT_EMAIL = process.env.PARENT_REPORT_DOM_PARENT_EMAIL || "18eran@gmail.com";

const ENGINE_PATTERNS = [
  { id: "snake_case_token", re: /\b[a-z][a-z0-9_]{8,}\b/g },
  { id: "advance_maintain_drop", re: /\b(advance_level|advance_grade|maintain_and_strengthen|remediate_same_level|drop_one_level|drop_one_grade)\b/gi },
  { id: "memory_tokens", re: /\b(no_memory|light_memory|not_enough_evidence|undetermined)\b/gi },
  { id: "pf_k_to_paren", re: /\((pf|k|to|st|ct):[^)]*\)/gi },
  { id: "english_tech", re: /\b(responseMs|retry|hint|tier|low_confidence|min_questions)\b/gi },
  { id: "insufficient_data_he", re: /אין מספיק נתונים|עדיין אין מספיק נתונים|אין נתונים להצגה/g },
  { id: "grade_g_token", re: /\bg[1-9]\b/gi },
];

/** @param {string} url */
function supabaseAuthStorageKey(url) {
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

async function mintParentSessionForDomAudit() {
  if (!SUPABASE_URL || !SUPABASE_ANON || !SERVICE_KEY) {
    throw new Error("Missing Supabase env for parent session mint");
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: OMER_PARENT_EMAIL,
  });
  if (linkErr) throw linkErr;
  const otp = linkData?.properties?.email_otp;
  if (!otp) throw new Error("generateLink did not return email_otp");
  const { data, error } = await anon.auth.verifyOtp({
    email: OMER_PARENT_EMAIL,
    token: otp,
    type: "email",
  });
  if (error || !data?.session) throw error || new Error("verifyOtp failed");
  return data.session;
}

async function loadModule(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

/** Runs in browser — extracts visible structure from #parent-report-detailed-print */
const EXTRACT_DETAILED_DOM_FN = () => {
  const root = document.querySelector("#parent-report-detailed-print");
  if (!root) return { error: "missing #parent-report-detailed-print" };

  /** @param {Element} el */
  function lines(el) {
    return (el.innerText || "")
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** @param {Element} el */
  function bbox(el) {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
  }

  const displayMode = root.getAttribute("data-display-mode") || "full";
  const allText = (root.innerText || "").trim();

  const header = root.querySelector(".pr-detailed-doc-header");
  const headerBlock = header
    ? {
        kind: "header",
        parentVisibleTitle: (header.querySelector("h1")?.textContent || "").trim() || "דוח מקיף לתקופה",
        exactVisibleLines: lines(header),
        boundingBox: bbox(header),
      }
    : null;

  /** @type {object[]} */
  const sectionCards = [];
  for (const sec of root.querySelectorAll("section.pr-detailed-section")) {
    if (sec.closest(".internal-only")) continue;
    const titleEl = sec.querySelector(".pr-detailed-section-title");
    const title = titleEl ? (titleEl.textContent || "").trim() : null;
    sectionCards.push({
      kind: "sectionCard",
      parentVisibleTitle: title,
      exactVisibleLines: lines(sec),
      boundingBox: bbox(sec),
      domPathHint: { classList: (sec.className || "").split(/\s+/).slice(0, 8) },
    });
  }

  /** @type {object[]} */
  const screenOnlyBlocks = [];
  for (const sel of [
    ".parent-report-parent-ai-insight",
    '[data-testid="parent-report-data-health-note"]',
    "details.pr-detailed-parent-activities",
    "details.pr-detailed-out-of-grade",
  ]) {
    const el = document.querySelector(sel);
    if (!el || !el.offsetParent && sel !== ".parent-report-parent-ai-insight") {
      /* keep ai even if styled */
    }
    if (!el) continue;
    const title =
      el.querySelector("h2, summary, .font-bold")?.textContent?.trim() ||
      el.getAttribute("data-testid") ||
      sel;
    screenOnlyBlocks.push({
      kind: "screenOnly",
      selector: sel,
      parentVisibleTitle: title.slice(0, 120),
      exactVisibleLines: lines(el).slice(0, 40),
      boundingBox: bbox(el),
      inPrintRoot: Boolean(el.closest("#parent-report-detailed-print")),
    });
  }

  const aiInsight = document.querySelector(".parent-report-parent-ai-insight");
  const aiBlock = aiInsight
    ? {
        kind: "aiInsight",
        parentVisibleTitle: (aiInsight.querySelector("h2, p.font-bold")?.textContent || "תובנת AI").trim(),
        exactVisibleLines: lines(aiInsight),
        boundingBox: bbox(aiInsight),
      }
    : null;

  const subjectsRegion = root.querySelector(".pr-detailed-subjects-region");
  const subjectsRegionTitle = subjectsRegion
    ? (subjectsRegion.querySelector(".pr-detailed-subjects-region-title")?.textContent || "").trim()
    : null;

  /** @type {object[]} */
  const subjectBlocks = [];
  if (subjectsRegion) {
    for (const block of subjectsRegion.querySelectorAll(".pr-detailed-subject-block, .pr-detailed-summary-subject")) {
      const subjectTitle = (block.querySelector(".pr-detailed-subject-title")?.textContent || "").trim();
      const metricsLine = (block.querySelector(".pr-detailed-subject-metrics")?.textContent || "").trim();

      /** @type {object[]} */
      const innerWindows = [];

      const letter = block.querySelector(".pr-detailed-subject-letter");
      if (letter) {
        innerWindows.push({
          kind: "subjectLetter",
          parentVisibleTitle: "מכתב מקצוע (ללא כותרת חיצונית)",
          subHeadings: [...letter.querySelectorAll(".pr-detailed-mini-heading")].map((h) => (h.textContent || "").trim()),
          exactVisibleLines: lines(letter).slice(0, 30),
        });
      }

      const phase3 = block.querySelector(".pr-detailed-phase3-dl");
      if (phase3) {
        innerWindows.push({
          kind: "phase3Insights",
          parentVisibleTitle: "תובנות Phase3 (שורות קטנות)",
          rowLabels: [...phase3.querySelectorAll(".font-bold")].map((h) => (h.textContent || "").trim()),
          exactVisibleLines: lines(phase3),
        });
      }

      for (const tierHead of block.querySelectorAll(".pr-detailed-topic-overview-block .pr-detailed-topic-rec-head")) {
        const group = tierHead.closest(".pr-detailed-topic-tier-group") || tierHead.parentElement;
        innerWindows.push({
          kind: "topicTierGroup",
          parentVisibleTitle: (tierHead.textContent || "").trim(),
          topicCount: group?.querySelectorAll(".pr-detailed-topic-overview-item").length || 0,
          exactVisibleLines: group ? lines(group).slice(0, 15) : [],
        });
      }

      const primaryAction = block.querySelector(".pr-detailed-callout-action, .rounded-lg.border-amber-400\\/28");
      const actionEl = [...block.querySelectorAll(".pr-detailed-mini-heading")].find((h) =>
        /מה כדאי לעשות במקצוע|איך כדאי לעבוד/.test(h.textContent || "")
      );
      if (actionEl) {
        const wrap = actionEl.closest(".rounded-lg") || actionEl.parentElement;
        innerWindows.push({
          kind: "primaryAction",
          parentVisibleTitle: (actionEl.textContent || "").trim(),
          exactVisibleLines: wrap ? lines(wrap) : [],
        });
      }

      const examples = block.querySelector(".pr-detailed-tier-examples");
      if (examples) {
        innerWindows.push({
          kind: "evidenceExamples",
          parentVisibleTitle: "דוגמאות מהתרגול",
          exactVisibleLines: lines(examples),
        });
      }

      const topicRecBlock = block.querySelector(".pr-detailed-topic-rec-block");
      if (topicRecBlock) {
        const cards = [...topicRecBlock.querySelectorAll(".pr-detailed-topic-nextstep-card")];
        innerWindows.push({
          kind: "topicRecommendations",
          parentVisibleTitle: (topicRecBlock.querySelector(".pr-detailed-topic-rec-head")?.textContent || "המלצות מפורטות לפי נושא").trim(),
          cardCount: cards.length,
          cards: cards.slice(0, 12).map((card) => ({
            title: (card.querySelector(".font-bold")?.textContent || "").trim(),
            gradeSubline: (card.querySelector(".pr-detailed-muted")?.textContent || "").trim(),
            badge: (card.querySelector(".pr-detailed-topic-badge")?.textContent || "").trim(),
            lines: lines(card).slice(0, 12),
            hasExplainStrip: Boolean(card.querySelector('[data-testid="parent-report-lpd-topic-explain"]')),
          })),
        });
      }

      subjectBlocks.push({
        kind: "subjectBlock",
        subjectTitle,
        metricsLine,
        exactVisibleLines: lines(block).slice(0, 50),
        boundingBox: bbox(block),
        innerWindows,
      });
    }
  }

  const disclaimer = root.querySelector(".parent-report-important-disclaimer");
  const disclaimerBlock = disclaimer
    ? {
        kind: "disclaimer",
        parentVisibleTitle: (disclaimer.querySelector(".parent-report-important-disclaimer-title")?.textContent || "הבהרה חשובה").trim(),
        exactVisibleLines: lines(disclaimer),
        boundingBox: bbox(disclaimer),
      }
    : null;

  /** Tables inside print root */
  /** @type {object[]} */
  const tables = [];
  for (const table of root.querySelectorAll("table")) {
    const host = table.closest("section.pr-detailed-section, .pr-detailed-subject-block") || table.parentElement;
    const sectionTitle =
      host?.querySelector(".pr-detailed-section-title")?.textContent?.trim() ||
      host?.querySelector(".pr-detailed-mini-heading")?.textContent?.trim() ||
      null;
    const headers = [...table.querySelectorAll("thead th")].map((th) => (th.textContent || "").trim());
    const rows = [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("td")].map((td) => (td.textContent || "").trim());
      if (cells.length) rows.push(cells);
    }
    tables.push({ sectionTitle, headers, rowCount: rows.length, sampleRows: rows.slice(0, 8) });
  }

  /** Flat ordered top-level windows by Y */
  /** @type {object[]} */
  const topLevel = [];
  if (headerBlock) topLevel.push({ ...headerBlock, windowOrder: 0 });
  if (aiBlock) topLevel.push({ ...aiBlock, windowOrder: 0 });
  for (const s of sectionCards) topLevel.push(s);
  const dataHealth = document.querySelector('[data-testid="parent-report-data-health-note"]');
  if (dataHealth && root.contains(dataHealth)) {
    topLevel.push({
      kind: "dataHealth",
      parentVisibleTitle: "מצב הנתונים בדוח",
      exactVisibleLines: lines(dataHealth),
      boundingBox: bbox(dataHealth),
    });
  }
  if (subjectsRegion) {
    topLevel.push({
      kind: "subjectsRegion",
      parentVisibleTitle: subjectsRegionTitle,
      subjectCount: subjectBlocks.length,
      exactVisibleLines: lines(subjectsRegion).slice(0, 5),
      boundingBox: bbox(subjectsRegion),
    });
  }
  if (disclaimerBlock) topLevel.push(disclaimerBlock);

  topLevel.sort((a, b) => (a.boundingBox?.top || 0) - (b.boundingBox?.top || 0));
  topLevel.forEach((w, i) => {
    w.windowOrder = i + 1;
  });

  return {
    displayMode,
    headerBlock,
    aiBlock,
    sectionCards,
    screenOnlyBlocks,
    subjectsRegionTitle,
    subjectBlocks,
    disclaimerBlock,
    tables,
    topLevelWindows: topLevel,
    bodyContains: {
      executiveSummaryTitle: /סיכום לתקופה/.test(allText),
      subjectsRegionFull: /מקצועות הלימוד/.test(allText),
      subjectsRegionSummary: /מקוצר: מילה לכל מקצוע/.test(allText),
      noSubjectsMessage: /אין מקצועות עם מספיק נתונים/.test(allText),
      copilot: Boolean(document.querySelector(".no-pdf") && document.body.innerText.includes("Copilot")),
    },
    fullTextSample: allText.slice(0, 8000),
  };
};

/** @param {string} text */
function scanEngineLanguage(text) {
  const hits = [];
  for (const p of ENGINE_PATTERNS) {
    const m = text.match(p.re);
    if (m && m.length) hits.push({ patternId: p.id, matches: [...new Set(m)].slice(0, 8) });
  }
  return hits;
}

/** Infer payload source from UI title/kind */
function inferDataSource(windowMeta) {
  const t = String(windowMeta.parentVisibleTitle || "");
  const k = windowMeta.kind || "";
  if (k === "header") return "payload.periodInfo + static copy";
  if (k === "aiInsight") return "parentAiExplanation (async enrichDetailedParentReportWithParentAi / deterministic fallback)";
  if (t === "מה עשינו בתקופה הזאת") return "payload.overallSnapshot (totalTime, totalQuestions, overallAccuracy, subjectCoverage, sparseSubjectsHe, notableSubjectsHe)";
  if (t === "מה חשוב לדעת") return "buildParentSurfaceWhatToNoticeHe(payload) ← crossSubjectInsights / parentFacing";
  if (t === "הודעות מהמורה") return "payload._parentReportUi.parentFacing.teacherMessages";
  if (t === "מה מומלץ לעשות בבית") return "buildParentSurfaceHomeActionsHe(payload) ← homePlan / parentFacing.homeRecommendations";
  if (t === "מצב הנתונים בדוח" || k === "dataHealth") return "uiAuthority.diagnosticOverviewHe + crossSubjectInsights.dataQualityNoteHe + gradePracticeMeta.mixedGradePracticeNoteHe";
  if (t === "סיכום לתקופה") return "payload.executiveSummary → ExecutiveSummarySection (normalizeExecutiveSummary)";
  if (/מקצועות הלימוד|מקוצר: מילה/.test(t)) return "visibleSubjectProfiles ← payload.subjectProfiles filtered by subjectProfileHasPracticeEvidence";
  if (k === "subjectLetter") return "parentLetter ← buildSubjectParentLetter(sp) + topWeaknesses.parentDiagnosticExplanationV1";
  if (k === "phase3Insights") return "subjectRollup labels: dominantLearningRiskLabelHe, dominantSuccessPatternLabelHe, whatNotToDoHe, transferReadiness";
  if (k === "topicTierGroup") return "subjectRollup topicGroupsByTier + topicInsightLine (overviewStatusHe)";
  if (k === "primaryAction") return "homeAction ← sp.primaryParentActionHe";
  if (k === "topicRecommendations") return "recommendationCard ← sp.topicRecommendations + buildTopicRecommendationNarrative + topicExplain strip";
  if (k === "evidenceExamples") return "sp.evidenceExamples";
  if (k === "disclaimer") return "static ParentReportImportantDisclaimer";
  if (/פעילויות אישיות/.test(t)) return "payload.parentAssignedActivitiesInPeriod";
  if (/תרגול מחוץ/.test(t)) return "payload.outOfGradePracticeTransparency";
  return "unknown — inspect DOM kind/subject";
}

function buildPayloadAnalysis(detailed, apiBody) {
  const allProfiles = Array.isArray(detailed?.subjectProfiles) ? detailed.subjectProfiles : [];
  const visible = allProfiles.filter((sp) => {
    const q = Number(sp?.subjectQuestionCount) || 0;
    const t = Number(sp?.subjectTimeMinutes) || 0;
    return q > 0 || t > 0;
  });

  const coverage = detailed?.overallSnapshot?.subjectCoverage || [];
  const zeroPracticeInCoverage = coverage.filter((r) => (Number(r.questionCount) || 0) === 0);
  const allSubjectIds = ["math", "geometry", "english", "science", "history", "hebrew", "moledet-geography"];
  const practicedIds = new Set(coverage.filter((r) => (Number(r.questionCount) || 0) > 0).map((r) => r.subject));
  const notPracticedButInCoverage = coverage.filter((r) => (Number(r.questionCount) || 0) === 0);

  return {
    overallSnapshot: {
      totalTime: detailed?.overallSnapshot?.totalTime ?? null,
      totalQuestions: detailed?.overallSnapshot?.totalQuestions ?? null,
      overallAccuracy: detailed?.overallSnapshot?.overallAccuracy ?? null,
    },
    subjectProfilesTotal: allProfiles.length,
    subjectProfilesVisible: visible.length,
    subjectCoverageRows: coverage.length,
    subjectsWithZeroQuestionsInCoverageTable: zeroPracticeInCoverage.map((r) => ({
      subject: r.subject,
      label: r.subjectLabelHe,
      questions: r.questionCount,
      timeMinutes: r.timeMinutes,
    })),
    notPracticedSubjectIds: allSubjectIds.filter((id) => !practicedIds.has(id)),
    hasExecutiveSummaryInPayload: Boolean(detailed?.executiveSummary),
    executiveSummaryKeys: detailed?.executiveSummary ? Object.keys(detailed.executiveSummary).filter((k) => {
      const v = detailed.executiveSummary[k];
      return Array.isArray(v) ? v.length > 0 : Boolean(v);
    }).slice(0, 20) : [],
    perSubjectTopicRecCounts: visible.map((sp) => ({
      subject: sp.subject,
      label: sp.subjectLabelHe,
      topicRecommendations: (sp.topicRecommendations || []).length,
      primaryParentActionHe: Boolean(sp.primaryParentActionHe),
      hasParentLetterFields: Boolean(sp.subjectSummaryHe || sp.subjectRollupHe),
    })),
    apiParentFacing: {
      insightsCount: (apiBody?.parentFacing?.insights || []).filter(Boolean).length,
      homeRecommendationsCount: (apiBody?.parentFacing?.homeRecommendations || []).filter(Boolean).length,
      teacherMessagesCount: (apiBody?.parentFacing?.teacherMessages || []).filter(Boolean).length,
    },
    notPracticedButListedInCoverage: notPracticedButInCoverage.map((r) => r.subjectLabelHe),
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Parent Report Detailed — Current UI Window Map");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Student: ${report.student.label} (${report.student.id})`);
  lines.push(`Range: ${report.student.range.from} → ${report.student.range.to}`);
  lines.push(`Capture URL: ${report.capture.url}`);
  lines.push(`Display mode in DOM: **${report.capture.domExtract.displayMode}**`);
  lines.push(`Screenshot: ${report.capture.screenshot}`);
  lines.push("");
  lines.push("> DOM truth capture via Playwright. No product changes.");
  lines.push("");

  lines.push("## Executive findings");
  for (const f of report.findingsSummary) lines.push(`- ${f}`);
  lines.push("");

  lines.push("## Metrics vs regular report pipeline");
  lines.push(`| Metric | Detailed DOM | Detailed payload | Regular display model | Match |`);
  lines.push(`|--------|-------------|-------------------|----------------------|-------|`);
  for (const row of report.metricsComparison.rows) {
    lines.push(`| ${row.metric} | ${row.detailedDom ?? "—"} | ${row.detailedPayload ?? "—"} | ${row.regularDisplay ?? "—"} | ${row.match ? "yes" : "**no**"} |`);
  }
  lines.push("");

  lines.push("## Window order (parent-visible, top level)");
  report.windows.forEach((w) => {
    lines.push(`${w.windowOrder}. **${w.parentVisibleTitle || w.kind}** (${w.kind})`);
  });
  lines.push("");

  for (const w of report.windows) {
    lines.push("---");
    lines.push(`### ${w.windowOrder}. ${w.parentVisibleTitle || w.kind}`);
    lines.push(`- Kind: \`${w.kind}\``);
    lines.push(`- Likely data source: ${w.likelyDataSource}`);
    if (w.subjectTitle) lines.push(`- Subject: ${w.subjectTitle}`);
    if (w.metricsLine) lines.push(`- Metrics line: ${w.metricsLine}`);
    if (w.engineLanguageHits?.length) {
      lines.push("- Engine/technical language detected:");
      for (const h of w.engineLanguageHits) lines.push(`  - ${h.patternId}: ${h.matches.join(", ")}`);
    }
    if (w.innerWindows?.length) {
      lines.push("- Inner windows:");
      for (const inner of w.innerWindows) {
        lines.push(`  - ${inner.parentVisibleTitle} (${inner.kind})`);
      }
    }
    lines.push("- Visible text (sample):");
    for (const t of (w.exactVisibleLines || []).slice(0, 25)) lines.push(`  - ${t}`);
    lines.push("");
  }

  if (report.duplications?.length) {
    lines.push("## Duplications / repeated ideas");
    for (const d of report.duplications) lines.push(`- ${d}`);
    lines.push("");
  }

  if (report.initialDecisions?.length) {
    lines.push("## Initial decisions to review (no fixes yet)");
    for (const d of report.initialDecisions) lines.push(`- ${d}`);
  }

  return lines.join("\n");
}

function flattenWindows(domExtract) {
  /** @type {object[]} */
  const out = [];
  let order = 0;

  const push = (w) => {
    order += 1;
    const text = (w.exactVisibleLines || []).join("\n");
    out.push({
      ...w,
      windowOrder: order,
      likelyDataSource: inferDataSource(w),
      engineLanguageHits: scanEngineLanguage(text),
    });
  };

  if (domExtract.headerBlock) push({ ...domExtract.headerBlock, kind: "header" });
  if (domExtract.aiBlock) push({ ...domExtract.aiBlock, kind: "aiInsight" });

  for (const s of domExtract.sectionCards || []) push(s);

  const dataHealth = (domExtract.topLevelWindows || []).find((w) => w.kind === "dataHealth");
  if (dataHealth) push(dataHealth);

  for (const sb of domExtract.subjectBlocks || []) {
    push({
      kind: "subjectBlock",
      parentVisibleTitle: sb.subjectTitle,
      subjectTitle: sb.subjectTitle,
      metricsLine: sb.metricsLine,
      exactVisibleLines: sb.exactVisibleLines,
      innerWindows: sb.innerWindows,
      boundingBox: sb.boundingBox,
    });
    for (const inner of sb.innerWindows || []) {
      push({
        ...inner,
        subjectTitle: sb.subjectTitle,
        exactVisibleLines: inner.exactVisibleLines || inner.lines || [],
      });
    }
  }

  if (domExtract.disclaimerBlock) push(domExtract.disclaimerBlock);

  return out;
}

function detectDuplications(windows, domExtract) {
  const dups = [];
  const homeTitles = windows.filter((w) =>
    /מה מומלץ לעשות בבית|פעולת בית|איך כדאי לעבוד|מה כדאי לעשות במקצוע/.test(w.parentVisibleTitle || "")
  );
  if (homeTitles.length > 2) {
    dups.push(`המלצות בית/פעולה מופיעות ב-${homeTitles.length} חלונות/תת-חלונות שונים (גלובלי + per-subject + topic cards).`);
  }

  const metricsSections = windows.filter((w) => w.kind === "sectionCard" && w.parentVisibleTitle === "מה עשינו בתקופה הזאת");
  if (metricsSections.length) {
    dups.push("סטטיסטיקות תקופה (זמן/שאלות/דיוק) חוזרות גם בכותרת כל מקצוע (שאלות|דיוק) ובטבלת כיסוי.");
  }

  if (domExtract.bodyContains?.executiveSummaryTitle) {
    dups.push("קיים 'סיכום לתקופה' ב-DOM — ייתכן חפיפה עם 'מה חשוב לדעת' / AI insight / המלצות בית.");
  } else if (domExtract.payloadMeta?.hasExecutiveSummaryInPayload) {
    dups.push("payload.executiveSummary קיים בשרת אך 'סיכום לתקופה' לא נראה ב-DOM (חסר ExecutiveSummarySection בדף production).");
  }

  return dups;
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(dirname(OUT_JSON), { recursive: true });

  if (!(await assertDevServerReachable(ORIGIN))) {
    console.error(`Dev server not reachable at ${ORIGIN}. Start: npm run dev`);
    process.exit(1);
  }

  const { buildDetailedPayloadFromAggregatedReportBody } = await loadModule(
    "lib/parent-server/db-input-to-detailed-report.server.js"
  );
  const { buildRegularReportViewModel } = await loadModule("lib/parent-ui/parent-report-regular-display.js");

  await resolveParentBearer(ORIGIN);
  const parentSession = await mintParentSessionForDomAudit();
  const storageKey = supabaseAuthStorageKey(SUPABASE_URL);

  const api = await fetchLiveReportData(ORIGIN, STUDENT_ID, parentSession.access_token, RANGE);
  const apiBody = api.body || {};
  const detailed = api.ok ? await buildDetailedPayloadFromAggregatedReportBody(apiBody, "custom") : null;

  let baseReport = null;
  if (detailed && api.ok) {
    const dbInputMod = await loadModule("lib/learning-supabase/report-data-adapter.js");
    const v2Mod = await loadModule("utils/parent-report-v2.js");
    const dbInput = dbInputMod.buildReportInputFromDbData(apiBody, { period: "custom", timezone: "UTC" });
    const playerName = String(dbInput.student?.name || "").trim() || "Student";
    const from = String(dbInput.range?.from || "").slice(0, 10);
    const to = String(dbInput.range?.to || "").slice(0, 10);
    const { runWithParentReportRebuildLock } = await loadModule("lib/parent-server/db-input-to-detailed-report.server.js");
    baseReport = await runWithParentReportRebuildLock(async () => {
      const store = new Map();
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      };
      const seedMod = await loadModule("lib/learning-supabase/seed-db-report-local-storage.js");
      store.set("mleo_player_name", playerName);
      seedMod.seedLocalStorageFromDbReportInput(store, dbInput);
      return v2Mod.generateParentReportV2(playerName, "custom", from, to);
    });
  }

  const payloadAnalysis = detailed ? buildPayloadAnalysis(detailed, apiBody) : null;

  let regularViewModel = null;
  if (baseReport) {
    try {
      regularViewModel = buildRegularReportViewModel(baseReport);
    } catch {
      regularViewModel = null;
    }
  }
  const regularSummary = regularViewModel?.report?.summary || null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL", viewport: { width: 1400, height: 900 } });

  if (storageKey) {
    await context.addInitScript(
      ({ key, sessionPayload }) => {
        try {
          window.localStorage.setItem(key, JSON.stringify(sessionPayload));
        } catch {
          /* ignore */
        }
      },
      {
        key: storageKey,
        sessionPayload: {
          access_token: parentSession.access_token,
          refresh_token: parentSession.refresh_token,
          expires_at: parentSession.expires_at,
          expires_in: parentSession.expires_in,
          token_type: parentSession.token_type,
          user: parentSession.user,
        },
      }
    );
  }

  const page = await context.newPage();
  const qs = new URLSearchParams({
    studentId: STUDENT_ID,
    source: "parent",
    period: "custom",
    start: RANGE.from,
    end: RANGE.to,
    mode: "full",
  });
  const reportUrl = `${ORIGIN}/learning/parent-report-detailed?${qs}`;

  try {
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 180_000 });
    await page.locator("#parent-report-detailed-print").waitFor({ timeout: 120_000 });
    await page.getByRole("heading", { name: /דוח מקיף לתקופה/u }).waitFor({ timeout: 60_000 });
    await page.waitForTimeout(4000);

    const screenshotPath = join(ARTIFACT_DIR, "omer-parent-report-detailed-full-dom.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const domExtract = await page.evaluate(EXTRACT_DETAILED_DOM_FN);
    if (domExtract.error) throw new Error(domExtract.error);

    domExtract.payloadMeta = payloadAnalysis;

    const windows = flattenWindows(domExtract);

    const statsSection = domExtract.sectionCards?.find((s) => s.parentVisibleTitle === "מה עשינו בתקופה הזאת");
    let domTime = null;
    let domQuestions = null;
    let domAccuracy = null;
    if (statsSection) {
      const L = statsSection.exactVisibleLines;
      const ti = L.indexOf("זמן כולל");
      if (ti >= 0 && L[ti + 1]) domTime = parseInt(L[ti + 1], 10);
      const qi = L.indexOf("שאלות");
      if (qi >= 0 && L[qi + 1]) domQuestions = parseInt(L[qi + 1], 10);
      const ai = L.indexOf("דיוק כללי");
      if (ai >= 0 && L[ai + 1]) domAccuracy = parseInt(String(L[ai + 1]).replace("%", ""), 10);
    }

    const metricsComparison = {
      rows: [
        {
          metric: "totalTime (minutes)",
          detailedDom: domTime,
          detailedPayload: payloadAnalysis?.overallSnapshot?.totalTime ?? null,
          regularDisplay: regularSummary?.totalTimeMinutes ?? null,
          match:
            domTime === payloadAnalysis?.overallSnapshot?.totalTime &&
            domTime === (regularSummary?.totalTimeMinutes ?? null),
        },
        {
          metric: "totalQuestions",
          detailedDom: domQuestions,
          detailedPayload: payloadAnalysis?.overallSnapshot?.totalQuestions ?? null,
          regularDisplay: regularSummary?.totalQuestions ?? null,
          match:
            domQuestions === payloadAnalysis?.overallSnapshot?.totalQuestions &&
            domQuestions === (regularSummary?.totalQuestions ?? null),
        },
        {
          metric: "overallAccuracy %",
          detailedDom: domAccuracy,
          detailedPayload: payloadAnalysis?.overallSnapshot?.overallAccuracy ?? null,
          regularDisplay: regularSummary?.overallAccuracy ?? null,
          match:
            domAccuracy === payloadAnalysis?.overallSnapshot?.overallAccuracy &&
            domAccuracy === (regularSummary?.overallAccuracy ?? null),
        },
      ],
    };

    const engineHitsGlobal = scanEngineLanguage(domExtract.fullTextSample || "");
    const insufficientDataLines = windows
      .flatMap((w) => (w.exactVisibleLines || []).filter((l) => /אין מספיק נתונים|אין נתונים להצגה|עדיין אין מספיק/.test(l)))
      .slice(0, 15);

    const duplications = detectDuplications(windows, domExtract);

    /** @type {string[]} */
    const findingsSummary = [];
    findingsSummary.push(`Top-level section cards in DOM: ${(domExtract.sectionCards || []).map((s) => s.parentVisibleTitle).join(" → ")}`);
    findingsSummary.push(`Subjects region title: "${domExtract.subjectsRegionTitle}" (${domExtract.subjectBlocks?.length || 0} subject blocks)`);
    findingsSummary.push(`Executive summary card "סיכום לתקופה" in DOM: ${domExtract.bodyContains?.executiveSummaryTitle ? "yes" : "**no**"}`);
    if (payloadAnalysis?.subjectsWithZeroQuestionsInCoverageTable?.length) {
      findingsSummary.push(
        `Coverage table lists ${payloadAnalysis.subjectsWithZeroQuestionsInCoverageTable.length} subjects with 0 questions: ${payloadAnalysis.subjectsWithZeroQuestionsInCoverageTable.map((s) => s.label).join(", ")}`
      );
    }
    if (insufficientDataLines.length) {
      findingsSummary.push(`"אין מספיק נתונים" / empty-data lines in UI: ${insufficientDataLines.length} occurrences (see windows)`);
    }
    if (engineHitsGlobal.length) {
      findingsSummary.push(`Engine-language pattern hits in sample text: ${engineHitsGlobal.map((h) => h.patternId).join(", ")}`);
    }
    findingsSummary.push(
      `Metrics alignment detailed↔regular: time=${metricsComparison.rows[0].match ? "OK" : "MISMATCH"}, questions=${metricsComparison.rows[1].match ? "OK" : "MISMATCH"}, accuracy=${metricsComparison.rows[2].match ? "OK" : "MISMATCH"}`
    );

    const initialDecisions = [
      "האם להחזיר/להסיר 'סיכום לתקופה' (ExecutiveSummary) — קיים ב-renderable.jsx וב-payload אך חסר ב-parent-report-detailed.js production?",
      "האם מקצועות עם 0 שאלות בטבלת 'כיסוי לפי מקצוע' צריכים להופיע להורה?",
      "כמה שכבות המלצות בית לשמור: גלובלי ('מה מומלץ לעשות בבית') + per-subject + per-topic?",
      "האם SubjectTopicTierGroups + topic recommendation cards — כפילות שצריך לאחד?",
      "האם 'מצב הנתונים בדוח' / sparse subjects — מספיק ברורים או מבלבלים עם 'אין מספיק נתונים'?",
      "האם Copilot + ParentReportInsight (מחוץ להדפסה) נחשבים חלק מהדוח המפורט לצורך מיפוי?",
    ];

    const report = {
      generatedAt: new Date().toISOString(),
      purpose: "parent_report_detailed_dom_window_map",
      constraints: ["no_product_changes", "dom_truth", "full_mode_default", "do_not_mix_short_report"],
      student: { id: STUDENT_ID, label: STUDENT_LABEL, range: RANGE },
      capture: {
        url: reportUrl,
        origin: ORIGIN,
        displayMode: domExtract.displayMode,
        screenshot: screenshotPath.replace(/\\/g, "/"),
        domExtract,
      },
      apiMeta: {
        reportDataOk: api.ok,
        reportDataStatus: api.status,
        payloadBuilt: Boolean(detailed),
        payloadAnalysis,
      },
      metricsComparison,
      engineLanguageGlobal: engineHitsGlobal,
      insufficientDataLines,
      duplications,
      findingsSummary,
      initialDecisions,
      windows,
    };

    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
    writeFileSync(OUT_MD, buildMarkdown(report), "utf8");

    console.log(`Wrote ${OUT_JSON}`);
    console.log(`Wrote ${OUT_MD}`);
    console.log("Section cards:", (domExtract.sectionCards || []).map((s) => s.parentVisibleTitle));
    console.log("Subjects:", domExtract.subjectBlocks?.map((s) => s.subjectTitle));
    console.log("Metrics:", JSON.stringify(metricsComparison, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
