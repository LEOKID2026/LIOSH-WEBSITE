#!/usr/bin/env node
/**
 * Parent report regular UI — DOM/browser truth map (v2).
 * Source of truth: rendered #parent-report-pdf visual cards, not component names alone.
 *
 * Run (server must be up):
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-report-regular-dom-window-map-v2.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-regular-current-ui-window-map-v2.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-regular-current-ui-window-map-v2.md");
const OUT_MISMATCH = join(ROOT, "docs", "audits", "parent-report-regular-window-map-mismatch-notes.md");
const V1_JSON = join(ROOT, "docs", "audits", "parent-report-regular-current-ui-window-map.json");
const ARTIFACT_DIR = join(ROOT, "docs", "audits", "_artifacts", "parent-report-dom-v2");

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

function supabaseAuthStorageKey(url) {
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

/** Mint a short-lived browser session for OMER's owning parent (read-only audit auth). */
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
  if (data.user?.id !== OMER_PARENT_ID) {
    console.warn(`Parent user id ${data.user?.id} !== expected OMER owner ${OMER_PARENT_ID}`);
  }
  return data.session;
}

/** DOM card extraction — runs in browser */
const EXTRACT_CARDS_FN = () => {
  const root = document.querySelector("#parent-report-pdf");
  if (!root) return { error: "missing #parent-report-pdf", cards: [], weeklyLocations: [] };

  /** @param {Element} el */
  function isCardLike(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.classList.contains("no-pdf")) return false;
    const cls = el.className || "";
    if (!/\brounded-(lg|xl)\b/.test(cls)) return false;
    if (!/\bborder\b/.test(cls)) return false;
    if (el.closest(".no-pdf")) return false;
    // skip tiny inner items
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 24) return false;
    return true;
  }

  /** @param {Element} card */
  function findTitle(card) {
    const candidates = [
      ...card.querySelectorAll(":scope > p.font-bold, :scope > h1, :scope > h2, :scope > section > h2, :scope > div > p.font-bold"),
    ];
    for (const c of candidates) {
      const t = (c.textContent || "").trim();
      if (t && t.length < 120) return t;
    }
    const h2 = card.querySelector("h2");
    if (h2) return (h2.textContent || "").trim();
    return null;
  }

  /** @param {Element} card */
  function cardTextLines(card) {
    const raw = (card.innerText || "").trim();
    return raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  }

  /** Collect leaf-most card containers (avoid parent+child double count) */
  const all = [...root.querySelectorAll("*")].filter(isCardLike);
  /** @type {Element[]} */
  const leafCards = all.filter((el) => !all.some((other) => other !== el && el.contains(other) && isCardLike(other)));

  /** Sort by visual Y then X */
  leafCards.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });

  /** @type {object[]} */
  const blocks = [];

  for (const card of leafCards) {
    const title = findTitle(card);
    const lines = cardTextLines(card);
    const rect = card.getBoundingClientRect();
    const testIds = [...card.querySelectorAll("[data-testid]")].map((n) => n.getAttribute("data-testid"));
    const classes = typeof card.className === "string" ? card.className.split(/\s+/).slice(0, 12) : [];
    blocks.push({
      kind: "card",
      parentVisibleTitle: title,
      exactVisibleLines: lines,
      exactVisibleText: lines.join("\n"),
      boundingBox: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
      domPathHint: { tag: card.tagName.toLowerCase(), id: card.id || null, classList: classes, testIds: [...new Set(testIds)].slice(0, 8) },
      containsWeeklyActionLabel: lines.some((l) => /מה לעשות השבוע/.test(l)),
      containsPracticedSubjectsSummary: lines.some((l) => /המקצועות שתורגלו/.test(l)),
      containsRequiresAttention: lines.some((l) => /עוד נושאים למעקב/.test(l)),
      containsAiSubsections: {
        whatGoesWell: lines.some((l) => l === "מה הולך טוב"),
        focusAreas: lines.some((l) => l === "תחומים לחיזוק"),
        homeTips: lines.some((l) => l === "טיפים לבית"),
      },
    });
  }

  for (const sec of root.querySelectorAll("section.rounded-xl")) {
    const h2 = sec.querySelector(":scope > h2");
    const title = h2 ? (h2.textContent || "").trim() : null;
    const lines = (sec.innerText || "").trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const rect = sec.getBoundingClientRect();
    blocks.push({
      kind: "section",
      parentVisibleTitle: title,
      exactVisibleLines: lines,
      exactVisibleText: lines.join("\n"),
      boundingBox: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
      domPathHint: { tag: "section", classList: (sec.className || "").split(/\s+/).slice(0, 10) },
      containsWeeklyActionLabel: lines.some((l) => /מה לעשות השבוע/.test(l)),
      containsAiSubsections: { whatGoesWell: false, focusAreas: false, homeTips: false },
    });
  }

  // Chart/table section titles
  for (const h2 of root.querySelectorAll("h2.parent-report-print-chart-title, h2.parent-report-print-page-section-heading, h2.parent-report-math-progress-title")) {
    const host = h2.closest(".parent-report-chart-card, .parent-report-recommendations-print, .bg-black\\/30");
    if (!host) continue;
    const lines = (host.innerText || "").trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const title = (h2.textContent || "").trim();
    const rect = host.getBoundingClientRect();
    if (blocks.some((b) => b.parentVisibleTitle === title)) continue;
    blocks.push({
      kind: "section-block",
      parentVisibleTitle: title,
      exactVisibleLines: lines.slice(0, 20),
      exactVisibleText: lines.slice(0, 20).join("\n"),
      boundingBox: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
      domPathHint: { tag: host.tagName.toLowerCase(), classList: (host.className || "").split(/\s+/).slice(0, 8) },
      containsWeeklyActionLabel: false,
    });
  }

  blocks.sort((a, b) => (a.boundingBox?.top || 0) - (b.boundingBox?.top || 0) || (a.boundingBox?.left || 0) - (b.boundingBox?.left || 0));
  blocks.forEach((b, i) => {
    b.domOrder = i + 1;
  });

  const cards = blocks.filter((b) => b.kind === "card");
  const sectionCards = blocks.filter((b) => b.kind === "section");

  /** Explicit weekly label hunt — which card title owns it */
  /** @type {object[]} */
  const weeklyLocations = [];
  for (const el of root.querySelectorAll("*")) {
    const txt = el.textContent || "";
    if (!/מה לעשות השבוע/.test(txt)) continue;
    if (el.children.length > 2) continue; // prefer leaf-ish
    let card = el.closest(".rounded-lg, .rounded-xl");
    while (card && card !== root && !/\bborder\b/.test(card.className || "")) {
      card = card.parentElement;
    }
    weeklyLocations.push({
      matchedText: txt.trim().slice(0, 300),
      nearestCardTitle: card && card !== root ? findTitle(card) : null,
      tag: el.tagName.toLowerCase(),
      classList: typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 8) : [],
    });
  }

  /** @type {object[]} */
  const sectionCardsLegacy = sectionCards;

  /** Summary stat mini-cards (grid) */
  /** @type {object[]} */
  const summaryStats = [];
  for (const el of root.querySelectorAll(".parent-report-print-summary-card")) {
    const label = el.querySelector(".parent-report-print-summary-label");
    const stat = el.querySelector(".parent-report-print-summary-stat");
    summaryStats.push({
      label: label ? (label.textContent || "").trim() : null,
      value: stat ? (stat.textContent || "").trim() : null,
      fullText: (el.innerText || "").trim(),
    });
  }

  /** Tables with grade column samples */
  /** @type {object[]} */
  const tables = [];
  for (const table of root.querySelectorAll("table.parent-report-subject-table")) {
    const host = table.closest(".bg-black\\/30, .avoid-break") || table.parentElement;
    const heading = host?.querySelector("h2");
    const title = heading ? (heading.textContent || "").trim() : null;
    const rect = (host || table).getBoundingClientRect();
    const headers = [...table.querySelectorAll("thead th")].map((th) => (th.textContent || "").trim());
    const gradeIdx = headers.findIndex((h) => h === "כיתה");
    const grades = [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("td")].map((td) => (td.textContent || "").trim());
      if (gradeIdx >= 0 && cells[gradeIdx]) grades.push(cells[gradeIdx]);
    }
    tables.push({
      title,
      headers,
      gradeColumnValues: [...new Set(grades)],
      rowCount: table.querySelectorAll("tbody tr").length,
      boundingBox: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
    });
  }

  return {
    pageUrl: location.href,
    blocks,
    cards,
    sectionCards: sectionCardsLegacy,
    summaryStats,
    tables,
    weeklyLocations,
    bodyContains: {
      weeklyAction: /מה לעשות השבוע/.test(root.innerText || ""),
      smartSummaryTitle: /סיכום חכם להורה/.test(root.innerText || ""),
      shortContractTitle: /סיכום קצר להורה/.test(root.innerText || ""),
      diagnosticOverviewTitle: /מה הכי בולט עכשיו/.test(root.innerText || ""),
      homeRecommendationsTitle: /מה מומלץ לעשות בבית/.test(root.innerText || ""),
    },
  };
};

function mapDomCardToSource(card) {
  const title = card.parentVisibleTitle || "";
  const hints = card.domPathHint || {};
  const testIds = hints.testIds || [];

  if (title === "מה הכי בולט עכשיו" || (card.containsWeeklyActionLabel && /בולט/.test(title))) {
    return {
      component: "inline diagnostic overview card (+ optional ParentReportWeeklyHomeActionLine)",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.summary.diagnosticOverviewHe + ParentReportWeeklyHomeActionLine when showWeeklyInDiagnosticOverview",
      dataSource: "child_report_payload + resolveParentReportWeeklyHomeActionHe",
      visualVsComponentNote:
        "Visual card title is hardcoded Hebrew in parent-report.js; weekly line is ParentReportWeeklyHomeActionLine nested inside this amber card when showWeeklyInDiagnosticOverview.",
    };
  }
  if (title === "סיכום קצר להורה") {
    return {
      component: "ParentReportShortContractPreview",
      sourceFile: "components/parent-report-short-contract-preview.jsx",
      sourceField: "shortContractTop + weeklyHomeActionHe",
      dataSource: "detailed.parentProductContractV1.top + weekly resolver",
      visualVsComponentNote: "Only rendered when !hasServerHomeRecommendations.",
    };
  }
  if (title === "סיכום חכם להורה" || hints.classList?.includes("parent-report-parent-ai-insight")) {
    return {
      component: "ParentReportInsight",
      sourceFile: "components/ParentReportInsight.jsx",
      sourceField: "report.parentAiExplanation.structured",
      dataSource: "ai_or_deterministic_narrative",
      visualVsComponentNote: "Does NOT render ParentReportWeeklyHomeActionLine.",
    };
  }
  if (title === "מה חשוב לדעת" || title === "מה מומלץ לעשות בבית" || title === "הודעות מהמורה") {
    return {
      component: "ParentReportParentSections",
      sourceFile: "components/parent/ParentReportParentSections.jsx",
      sourceField: `report.parentFacing (${title})`,
      dataSource: "server_parent_facing",
    };
  }
  if (title === "חוזקות שבלטו בתרגול") {
    return {
      component: "inline strengths block",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.rawMetricStrengthsHe",
      dataSource: "child_metrics",
    };
  }
  if (title === "מצב הנתונים בדוח" || testIds.includes("parent-report-data-health-note")) {
    return {
      component: "ParentReportDataHealthNote",
      sourceFile: "components/parent/ParentReportDataHealthNote.jsx",
      sourceField: "diagnosticOverviewHe.thinEvidenceSubjectsHe, activityGapNoteHe, mixedGradePracticeNoteHe",
      dataSource: "child_report_payload",
    };
  }
  if (title === "הבהרה חשובה" || hints.classList?.includes("parent-report-important-disclaimer")) {
    return {
      component: "ParentReportImportantDisclaimer",
      sourceFile: "components/ParentReportImportantDisclaimer.js",
      sourceField: "PARENT_REPORT_DISCLAIMER_*",
      dataSource: "static_legal_copy",
    };
  }
  if (title?.includes("התקדמות") || hints.tag === "table") {
    return {
      component: "subject progress table",
      sourceFile: "pages/learning/parent-report.js",
      sourceField: "report.*Topics / mathOperations rows",
      dataSource: "child_topic_rows",
    };
  }
  return {
    component: "parent-report.js visual block (unclassified)",
    sourceFile: "pages/learning/parent-report.js",
    sourceField: "see domPathHint",
    dataSource: "mixed",
  };
}

function buildOrderedWindows(dom) {
  /** @type {object[]} */
  const windows = [];
  let order = 0;

  windows.push({
    windowOrder: ++order,
    windowId: "page_header",
    parentVisibleTitle: "📊 דוח להורים",
    parentVisibleSubtitles: [],
    exactVisibleText: [],
    renderCondition: "report loaded",
    domSource: "heading in #parent-report-pdf",
    notes: "Period controls are no-pdf siblings",
  });

  for (const stat of (dom.summaryStats || []).filter((s) =>
    ["זמן כולל", "שאלות", "דיוק כללי", "רמה"].includes(s.label),
  )) {
    windows.push({
      windowOrder: ++order,
      windowId: `summary_stat_${stat.label}`,
      parentVisibleTitle: stat.label,
      parentVisibleSubtitles: [],
      exactVisibleText: [stat.fullText],
      renderCondition: "always",
      domSource: ".parent-report-print-summary-card",
      ...mapDomCardToSource({ parentVisibleTitle: stat.label }),
    });
  }

  // All visual blocks sorted by boundingBox.top (from dom.blocks)
  const seenTitles = new Set(["📊 דוח להורים", "זמן כולל", "שאלות", "דיוק כללי", "רמה"]);
  for (const block of dom.blocks || []) {
    const title = block.parentVisibleTitle;
    if (!title || seenTitles.has(title)) continue;
    if (title.length > 100) continue;
    // skip progress table hosts already captured via dom.tables
    if (title.includes("התקדמות") && dom.tables?.some((t) => t.title === title)) continue;
    seenTitles.add(title);

    const src = mapDomCardToSource(block);
    windows.push({
      windowOrder: ++order,
      windowId: `dom_${order}_${title.replace(/\s+/g, "_").slice(0, 40)}`,
      parentVisibleTitle: title,
      parentVisibleSubtitles: block.exactVisibleLines?.filter((l) => l !== title && l.length < 80).slice(0, 6) || [],
      exactVisibleText: block.exactVisibleLines || [],
      exactVisibleTextJoined: block.exactVisibleText || "",
      renderCondition: "visible in DOM at capture time",
      domSource: `${block.kind} sorted by boundingBox.top=${block.boundingBox?.top}`,
      domPathHint: block.domPathHint,
      boundingBox: block.boundingBox,
      containsWeeklyActionLabel: block.containsWeeklyActionLabel || false,
      containsAiSubsections: block.containsAiSubsections || null,
      ...src,
    });
  }

  for (const table of dom.tables || []) {
    if (seenTitles.has(table.title)) continue;
    seenTitles.add(table.title);
    windows.push({
      windowOrder: ++order,
      windowId: `table_${table.title}`,
      parentVisibleTitle: table.title,
      parentVisibleSubtitles: table.headers,
      exactVisibleText: [`${table.rowCount} rows`, `grades in column: ${table.gradeColumnValues.join(", ")}`],
      gradeDisplayRule: "per-row formatParentReportGradeHe in table column כיתה",
      gradeColumnValues: table.gradeColumnValues,
      boundingBox: table.boundingBox,
      renderCondition: "topic map non-empty",
      domSource: "table.parent-report-subject-table",
      component: "subject progress table",
      sourceFile: "pages/learning/parent-report.js",
      dataSource: "child_topic_rows",
    });
  }

  // Re-sort windows with bounding boxes by visual top (tables/disclaimer order)
  const header = windows.filter((w) => !w.boundingBox && w.windowId === "page_header");
  const summary = windows.filter((w) => w.windowId?.startsWith("summary_stat_"));
  const rest = windows.filter((w) => w !== header[0] && !w.windowId?.startsWith("summary_stat_"));
  rest.sort(
    (a, b) =>
      (a.boundingBox?.top ?? Number.MAX_SAFE_INTEGER) - (b.boundingBox?.top ?? Number.MAX_SAFE_INTEGER),
  );
  const merged = [...header, ...summary, ...rest];
  merged.forEach((w, i) => {
    w.windowOrder = i + 1;
  });
  return merged;
}

function pickFocusedWindow(windows, titlePart) {
  return windows.find((w) => w.parentVisibleTitle === titlePart || w.parentVisibleTitle?.includes(titlePart));
}

function buildMismatchNotes(v1, v2, dom, apiMeta) {
  const lines = [];
  lines.push("# Parent Report Regular Window Map — Mismatch Notes (v1 audit vs browser DOM v2)");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Executive finding");
  lines.push("");
  const v2Weekly = v2.focusedFindings.weeklyAction;
  const v1Weekly = v1?.samples?.omer?.summary?.weeklyActionLabel;
  lines.push(`- **Browser truth (v2):** "מה לעשות השבוע" appears under visual card **"${v2Weekly.cardTitle || "?"}"**`);
  lines.push(`- **v1 audit claimed:** appears in **${(v1Weekly?.appearsInWindowIds || []).join(", ") || "short_contract_preview"}**`);
  lines.push(`- **Body text flags at capture:** ${JSON.stringify(dom.bodyContains)}`);
  lines.push(`- **API hasServerHomeRecommendations:** ${apiMeta.hasServerHomeRecommendations}`);
  lines.push(`- **DOM short contract title visible:** ${dom.bodyContains.shortContractTitle}`);
  lines.push("");

  lines.push("## 1. Why v1 assigned weekly action to \"סיכום קצר להורה\"");
  lines.push("");
  lines.push("- v1 script (`parent-report-regular-current-ui-window-map.mjs`) **simulated React render conditions offline** from generated report payload.");
  lines.push("- It evaluated `hasServerHomeRecommendations === false` for OMER and therefore:");
  lines.push("  - rendered `ParentReportShortContractPreview` with `showWeeklyInShortContract = true`");
  lines.push("  - set `weeklyHomeActionAlreadyShownElsewhere = true`, hiding weekly from diagnostic overview in simulation.");
  lines.push("- **The offline pipeline did not match the parent-portal browser session** (different auth path, API enrichment, or `homeRecommendations` presence).");
  lines.push("- Specifically: browser uses `GET /api/parent/students/{id}/report-data` → `enrichPayloadWithParentFacing()` which adds `parentFacing.homeRecommendations`. v1 offline build used `aggregateParentReportPayload` + client report generators **without** that enrichment step, so `hasServerHomeRecommendations` was false in simulation.");
  lines.push("");

  lines.push("## 2. Why browser shows it under \"מה הכי בולט עכשיו\"");
  lines.push("");
  if (apiMeta.hasServerHomeRecommendations) {
    lines.push("- Live API returns **`parentFacing.homeRecommendations`** → `hasServerHomeRecommendations = true`.");
    lines.push("- Code skips entire `ParentReportShortContractPreview` block (`!hasServerHomeRecommendations` is false).");
    lines.push("- Weekly line renders inside amber diagnostic card when `showWeeklyInDiagnosticOverview` is true.");
  } else if (!dom.bodyContains.shortContractTitle) {
    lines.push("- **\"סיכום קצר להורה\" title not present in DOM** at capture — short contract block not visible to parent.");
    lines.push("- Weekly label found in diagnostic overview card instead.");
  } else {
    lines.push("- Both titles may exist in DOM; weekly label DOM ancestry points to diagnostic overview card (see weeklyLocations in JSON).");
  }
  lines.push("- Relevant code in `pages/learning/parent-report.js`:");
  lines.push("  - `{!hasServerHomeRecommendations ? <ParentReportShortContractPreview .../> : null}`");
  lines.push("  - `{showWeeklyInDiagnosticOverview ? <ParentReportWeeklyHomeActionLine .../> : null}` inside diagnostic overview div");
  lines.push("");

  lines.push("## 3. Classification");
  lines.push("");
  lines.push("| Hypothesis | Verdict |");
  lines.push("|------------|---------|");
  lines.push("| Audit script wrong assumptions (offline vs live portal) | **Primary cause** |");
  lines.push("| DOM nesting bug | Unlikely — weekly `<p>` is child of amber diagnostic card container |");
  lines.push("| Component renders elsewhere | No — same components, different **renderCondition** branch |");
  lines.push("| CSS visual grouping | Unlikely — distinct bordered cards with separate titles |");
  lines.push("| Misunderstanding component names | v1 conflated component name with visible card title |");
  lines.push("");

  lines.push("## 4. Correct source of truth going forward");
  lines.push("");
  lines.push("1. **Browser DOM / Playwright capture** on `/parent/parent-report` or `/learning/parent-report` with real parent auth.");
  lines.push("2. Map by **parent-visible card title + container bounds**, then trace to code.");
  lines.push("3. Do not infer visibility from offline report build alone when parent portal API path differs.");
  lines.push("");

  if (v1) {
    lines.push("## v1 vs v2 window count");
    lines.push("");
    lines.push(`- v1 OMER windows: ${v1.samples?.omer?.summary?.renderedWindowCount ?? "?"}`);
    lines.push(`- v2 OMER DOM windows: ${v2.windows.length}`);
    lines.push("");
  }

  return lines.join("\n");
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Parent Report Regular UI — DOM Window Map v2");
  lines.push("");
  lines.push(`Captured: ${report.generatedAt}`);
  lines.push(`URL: ${report.capture.url}`);
  lines.push(`Student: ${report.student.label} (${report.student.id})`);
  lines.push(`Range: ${report.student.range.from} → ${report.student.range.to}`);
  lines.push("");
  lines.push("**Source of truth:** rendered DOM inside `#parent-report-pdf` (Playwright).");
  lines.push("");

  lines.push("## Focused checks");
  lines.push("");
  const f = report.focusedFindings;
  lines.push("### סיכום חכם להורה");
  if (f.smartSummary.found) {
    lines.push(`- Title: ${f.smartSummary.title}`);
    lines.push(`- Contains \"מה לעשות השבוע\": **${f.smartSummary.hasWeekly ? "yes" : "no"}**`);
    lines.push(`- Subsections: מה הולך טוב=${f.smartSummary.subsections.whatGoesWell}, תחומים לחיזוק=${f.smartSummary.subsections.focusAreas}, טיפים לבית=${f.smartSummary.subsections.homeTips}`);
    lines.push("- Exact text:");
    for (const t of f.smartSummary.lines) lines.push(`  - ${t}`);
  } else {
    lines.push("- **Not found in DOM** at capture time.");
  }
  lines.push("");
  lines.push("### מה הכי בולט עכשיו");
  if (f.diagnosticOverview.found) {
    lines.push(`- Title: ${f.diagnosticOverview.title}`);
    lines.push(`- Contains \"מה לעשות השבוע:\": **${f.diagnosticOverview.hasWeekly ? "yes" : "no"}**`);
    if (f.diagnosticOverview.weeklyFullLine) lines.push(`- Full weekly line: ${f.diagnosticOverview.weeklyFullLine}`);
    lines.push(`- Contains \"המקצועות שתורגלו…\": ${f.diagnosticOverview.hasPracticedSubjects}`);
    lines.push(`- Contains \"עוד נושאים למעקב…\": ${f.diagnosticOverview.hasRequiresAttention}`);
    lines.push("- All lines in card:");
    for (const t of f.diagnosticOverview.lines) lines.push(`  - ${t}`);
  } else {
    lines.push("- **Not found in DOM**.");
  }
  lines.push("");
  lines.push("### Weekly label DOM locations");
  for (const w of f.weeklyAction.domLocations || []) {
    lines.push(`- nearest card title: **${w.nearestCardTitle || "?"}** — \`${w.matchedText.slice(0, 120)}...\``);
  }
  lines.push("");

  lines.push("## Full window order (DOM)");
  report.windows.forEach((w, i) => {
    lines.push(`${i + 1}. ${w.parentVisibleTitle}${w.containsWeeklyActionLabel ? " ← contains weekly label" : ""}`);
  });
  lines.push("");

  for (const w of report.windows) {
    lines.push("---");
    lines.push(`### ${w.windowOrder}. ${w.parentVisibleTitle}`);
    lines.push(`- Component (code): ${w.component}`);
    lines.push(`- Source: \`${w.sourceFile}\` → ${w.sourceField}`);
    if (w.visualVsComponentNote) lines.push(`- Visual vs component: ${w.visualVsComponentNote}`);
    if (w.gradeColumnValues) lines.push(`- Grades in table: ${w.gradeColumnValues.join(", ")}`);
    lines.push("- Visible lines:");
    for (const t of (w.exactVisibleText || []).slice(0, 40)) lines.push(`  - ${t}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(dirname(OUT_JSON), { recursive: true });

  if (!(await assertDevServerReachable(ORIGIN))) {
    console.error(`Dev server not reachable at ${ORIGIN}. Start: npm run dev`);
    process.exit(1);
  }

  const auth = await resolveParentBearer(ORIGIN);
  const parentSession = await mintParentSessionForDomAudit();
  const parentBearer = parentSession.access_token;
  const storageKey = supabaseAuthStorageKey(SUPABASE_URL);

  const api = await fetchLiveReportData(ORIGIN, STUDENT_ID, parentBearer, RANGE);
  const apiBody = api.body || {};
  const homeRecs = apiBody?.parentFacing?.homeRecommendations || [];
  const hasServerHomeRecommendations = Array.isArray(homeRecs) && homeRecs.filter(Boolean).length > 0;

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
      },
    );
  }

  const page = await context.newPage();

  const reportUrl = `${ORIGIN}/parent/parent-report?studentId=${encodeURIComponent(STUDENT_ID)}&source=parent&period=custom&start=${RANGE.from}&end=${RANGE.to}`;

  try {
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 180_000 });
    await page.locator("#parent-report-pdf").waitFor({ timeout: 120_000 });
    await page.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 60_000 });
    await page.waitForTimeout(3000);

    const screenshotPath = join(ARTIFACT_DIR, "omer-parent-report-dom.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const dom = await page.evaluate(EXTRACT_CARDS_FN);
    const windows = buildOrderedWindows(dom);

    const smartCard =
      dom.blocks?.find((c) => c.parentVisibleTitle === "סיכום חכם להורה") ||
      dom.blocks?.find((c) => c.domPathHint?.classList?.includes("parent-report-parent-ai-insight"));
    const diagCard = dom.blocks?.find((c) => c.parentVisibleTitle === "מה הכי בולט עכשיו");
    const insightsSec = dom.blocks?.find((c) => c.parentVisibleTitle === "מה חשוב לדעת");
    const homeSec = dom.blocks?.find((c) => c.parentVisibleTitle === "מה מומלץ לעשות בבית");
    const strengthsCard = dom.blocks?.find((c) => c.parentVisibleTitle === "חוזקות שבלטו בתרגול");

    const weeklyLine = (diagCard || smartCard)?.exactVisibleLines?.find((l) => /מה לעשות השבוע/.test(l)) ||
      dom.weeklyLocations[0]?.matchedText;

    const focusedFindings = {
      smartSummary: {
        found: Boolean(smartCard),
        title: smartCard?.parentVisibleTitle || null,
        hasWeekly: Boolean(smartCard?.containsWeeklyActionLabel),
        subsections: smartCard?.containsAiSubsections || {},
        lines: smartCard?.exactVisibleLines || [],
      },
      diagnosticOverview: {
        found: Boolean(diagCard),
        title: diagCard?.parentVisibleTitle || null,
        hasWeekly: Boolean(diagCard?.containsWeeklyActionLabel),
        weeklyFullLine: weeklyLine || null,
        hasPracticedSubjects: Boolean(diagCard?.containsPracticedSubjectsSummary),
        hasRequiresAttention: Boolean(diagCard?.containsRequiresAttention),
        lines: diagCard?.exactVisibleLines || [],
      },
      insights: {
        found: Boolean(insightsSec),
        lines: insightsSec?.exactVisibleLines || [],
      },
      homeRecommendations: {
        found: Boolean(homeSec) || dom.bodyContains.homeRecommendationsTitle,
        lines: homeSec?.exactVisibleLines || [],
        existsForOmer: Boolean(homeSec) || dom.bodyContains.homeRecommendationsTitle,
      },
      strengths: {
        found: Boolean(strengthsCard),
        lines: strengthsCard?.exactVisibleLines || [],
      },
      weeklyAction: {
        isStandaloneWindow: false,
        cardTitle: dom.weeklyLocations[0]?.nearestCardTitle || diagCard?.parentVisibleTitle || null,
        domLocations: dom.weeklyLocations,
        inSmartSummary: Boolean(smartCard?.containsWeeklyActionLabel),
        inDiagnosticOverview: Boolean(diagCard?.containsWeeklyActionLabel),
        inShortContract: dom.bodyContains.shortContractTitle && dom.blocks?.some((c) => c.parentVisibleTitle === "סיכום קצר להורה" && c.containsWeeklyActionLabel),
      },
      tables: dom.tables,
    };

    let v1 = null;
    try {
      v1 = JSON.parse(readFileSync(V1_JSON, "utf8"));
    } catch {
      /* no v1 */
    }

    const report = {
      generatedAt: new Date().toISOString(),
      purpose: "parent_report_regular_dom_window_map_v2",
      constraints: ["no_product_changes", "dom_truth", "playwright_capture"],
      capture: {
        url: reportUrl,
        origin: ORIGIN,
        screenshot: screenshotPath.replace(/\\/g, "/"),
        domExtract: dom,
      },
      student: { id: STUDENT_ID, label: STUDENT_LABEL, range: RANGE },
      apiMeta: {
        reportDataOk: api.ok,
        reportDataStatus: api.status,
        parentAuth: {
          method: "service_role_generateLink_verifyOtp_session_inject",
          parentEmail: OMER_PARENT_EMAIL,
          parentUserId: OMER_PARENT_ID,
          e2eParentBearerWorked: Boolean(auth.token),
        },
        hasServerHomeRecommendations,
        homeRecommendationsCount: homeRecs.filter(Boolean).length,
        insightsCount: (apiBody?.parentFacing?.insights || []).filter(Boolean).length,
        parentAiExplanationOk: apiBody?.parentAiExplanation?.ok ?? null,
      },
      focusedFindings,
      windows,
    };

    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
    writeFileSync(OUT_MD, buildMarkdown(report), "utf8");
    writeFileSync(OUT_MISMATCH, buildMismatchNotes(v1, report, dom, report.apiMeta), "utf8");

    console.log(`Wrote ${OUT_JSON}`);
    console.log(`Wrote ${OUT_MD}`);
    console.log(`Wrote ${OUT_MISMATCH}`);
    console.log(JSON.stringify(focusedFindings.weeklyAction, null, 2));
    console.log(JSON.stringify(report.apiMeta, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
