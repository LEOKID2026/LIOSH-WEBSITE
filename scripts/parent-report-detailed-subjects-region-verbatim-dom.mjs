#!/usr/bin/env node
/**
 * Verbatim DOM extract — "מקצועות הלימוד" region only (detailed parent report, full mode).
 * No product changes. Run: node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-report-detailed-subjects-region-verbatim-dom.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { assertDevServerReachable } from "./truth-gates/lib/live-parent-report.mjs";

loadEnvFiles();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-detailed-subjects-region-verbatim-dom.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-detailed-subjects-region-verbatim-dom.md");

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
const OMER_PARENT_EMAIL = process.env.PARENT_REPORT_DOM_PARENT_EMAIL || "18eran@gmail.com";

function supabaseAuthStorageKey(url) {
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

async function mintParentSessionForDomAudit() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: OMER_PARENT_EMAIL,
  });
  if (linkErr) throw linkErr;
  const otp = linkData?.properties?.email_otp;
  if (!otp) throw new Error("generateLink did not return email_otp");
  const { data, error } = await anon.auth.verifyOtp({ email: OMER_PARENT_EMAIL, token: otp, type: "email" });
  if (error || !data?.session) throw error || new Error("verifyOtp failed");
  return data.session;
}

const EXTRACT_FN = () => {
  /** @param {Element|null} el */
  function t(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").replace(/\r\n/g, "\n").trim();
  }

  const region = document.querySelector("#parent-report-detailed-print .pr-detailed-subjects-region");
  if (!region) return { error: "missing .pr-detailed-subjects-region" };

  /** @type {object[]} */
  const rows = [];
  let order = 0;

  const push = (subject, innerArea, verbatimText, technicalNote = "") => {
    const text = String(verbatimText ?? "").replace(/\r\n/g, "\n").trim();
    if (!text) return;
    order += 1;
    rows.push({ order, subject, innerArea, verbatimText: text, technicalNote });
  };

  push(
    "—",
    "כותרת אזור",
    t(region.querySelector(".pr-detailed-subjects-region-title")),
    ".pr-detailed-subjects-region-title"
  );

  const blocks = [...region.querySelectorAll(".pr-detailed-subject-block")];
  for (const block of blocks) {
    const subject = t(block.querySelector(".pr-detailed-subject-title")) || "?";

    push(subject, "כותרת מקצוע", subject, ".pr-detailed-subject-title");
    push(subject, "שורת מדדים (שאלות|דיוק)", t(block.querySelector(".pr-detailed-subject-metrics")), ".pr-detailed-subject-metrics");

    const phase3 = block.querySelector(".pr-detailed-phase3-dl");
    if (phase3) {
      for (const row of phase3.querySelectorAll(":scope > div")) {
        const label = t(row.querySelector(".font-bold, .text-white\\/50"));
        const val = t(row.querySelector(".text-white\\/\\[0\\.88\\], .leading-relaxed"));
        if (label) push(subject, `Phase3 — כותרת: ${label}`, label, "SubjectPhase3Insights label");
        if (val && val !== label) push(subject, `Phase3 — תוכן (${label || "?"})`, val, "SubjectPhase3Insights value");
      }
    }

    const letter = block.querySelector(".pr-detailed-subject-letter");
    if (letter) {
      for (const el of letter.querySelectorAll("p, li, .pr-detailed-mini-heading, [class*='diagnostic']")) {
        const txt = t(el);
        if (!txt) continue;
        const isHeading = el.classList.contains("pr-detailed-mini-heading") || el.tagName === "H4";
        const inDiag = Boolean(el.closest(".pr-detailed-diagnostic-explanation, [class*='diagnostic']"));
        const inHome = Boolean(el.closest(".rounded-lg.border-amber-400\\/28"));
        let area = "מכתב להורה — פסקה";
        if (isHeading) area = "מכתב — כותרת ביניים";
        else if (inHome && !isHeading) area = "מכתב — איך כדאי לעבוד על זה";
        else if (inDiag) area = "מכתב — הסבר אבחוני / דוגמה";
        push(subject, area, txt, "SubjectParentLetter / ParentDiagnosticExplanationBlock");
      }
    }

    for (const tierGroup of block.querySelectorAll(".pr-detailed-topic-tier-group")) {
      const tierTitle = t(tierGroup.querySelector(".pr-detailed-topic-rec-head"));
      if (tierTitle) push(subject, "קבוצת tier — כותרת", tierTitle, "SubjectTopicTierGroups tier title");
      for (const item of tierGroup.querySelectorAll(".pr-detailed-topic-overview-item")) {
        const title = t(item.querySelector(".font-bold"));
        const sub = t(item.querySelector(".pr-detailed-muted"));
        const status = t(item.querySelector("p.pr-detailed-body-text"));
        if (title) push(subject, `tier — כותרת נושא (${tierTitle})`, title, "topicGroupsByTier row narrativeTitleHe");
        if (sub) push(subject, `tier — שורת כיתה (${title})`, sub, "gradeRelationSublineHe");
        if (status) push(subject, `tier — מדדים/סטטוס (${title})`, status, "overviewStatusHe + questions + accuracy");
      }
    }

    for (const action of block.querySelectorAll(".parent-surface-only.rounded-lg.border-amber-400\\/28")) {
      if (letter && letter.contains(action)) continue;
      const head = t(action.querySelector(".pr-detailed-mini-heading"));
      const body = t(action.querySelector(".pr-detailed-body-text"));
      if (head) push(subject, "פעולה מקצועית — כותרת", head, "SubjectPrimaryActionBlock heading");
      if (body) push(subject, "פעולה מקצועית — תוכן", body, "sp.primaryParentActionHe");
    }

    const examples = block.querySelector(".pr-detailed-tier-examples");
    if (examples) {
      push(subject, "דוגמאות — הקדמה", t(examples.querySelector("p.pr-detailed-body-text")), "evidenceExamples intro");
      for (const li of examples.querySelectorAll("li")) {
        push(subject, "דוגמה מהתרגול", t(li), "sp.evidenceExamples[]");
      }
    }

    const recBlock = block.querySelector(".pr-detailed-topic-rec-block");
    if (recBlock) {
      push(subject, "המלצות לפי נושא — כותרת אזור", t(recBlock.querySelector(".pr-detailed-topic-rec-head")), "topicRecommendations section head");
      for (const card of recBlock.querySelectorAll(".pr-detailed-topic-nextstep-card")) {
        const topicTitle = t(card.querySelector(".font-bold"));
        const gradeLine = t(card.querySelector(".pr-detailed-muted"));
        const badge = t(card.querySelector(".pr-detailed-topic-badge"));
        if (topicTitle) push(subject, "כרטיס נושא — כותרת", topicTitle, "tr.narrativeTitleHe / labelHe");
        if (gradeLine) push(subject, `כרטיס נושא — כיתה (${topicTitle})`, gradeLine, "tr.gradeRelationSublineHe");
        if (badge) push(subject, `כרטיס נושא — תג (${topicTitle})`, badge, "tr.recommendedStepLabelHe");

        const bodyPs = [...card.querySelectorAll(":scope > p.pr-detailed-body-text, :scope > div > p.pr-detailed-body-text")].filter(
          (p) => !p.closest('[data-testid="parent-report-lpd-topic-explain"]')
        );
        for (const p of bodyPs) {
          const txt = t(p);
          const isAmber = /amber/i.test(p.className || "");
          push(
            subject,
            isAmber ? `כרטיס נושא — מה כדאי לעשות ביחד (${topicTitle})` : `כרטיס נושא — תמצית (${topicTitle})`,
            txt,
            isAmber ? "nar.homeLine" : "nar.snapshot / buildTopicRecommendationNarrative"
          );
        }

        const explain = card.querySelector('[data-testid="parent-report-lpd-topic-explain"]');
        if (explain) {
          for (const p of explain.querySelectorAll("p")) {
            const txt = t(p);
            let area = "כרטיס נושא — explain strip";
            if (/^מה זוהה:/.test(txt)) area = "כרטיס נושא — מה זוהה";
            else if (/^הנתונים:/.test(txt)) area = "כרטיס נושא — הנתונים (מה רואים)";
            else if (/^דפוס הטעות:/.test(txt)) area = "כרטיס נושא — דפוס";
            else if (/^משמעות:/.test(txt)) area = "כרטיס נושא — מה זה אומר (משמעות)";
            else if (/^מה כדאי לעשות/.test(txt)) area = "כרטיס נושא — מה כדאי לעשות";
            push(subject, `${area} (${topicTitle})`, txt, "TopicRecommendationExplainStrip / topicExplain");
          }
        }
      }
    }
  }

  return {
    regionTitle: t(region.querySelector(".pr-detailed-subjects-region-title")),
    subjectCount: blocks.length,
    subjects: blocks.map((b) => t(b.querySelector(".pr-detailed-subject-title"))),
    rows,
    fullRegionText: t(region),
  };
};

function escapeMdCell(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function buildMd(data, meta) {
  const lines = [];
  lines.push("# דוח הורים מפורט — מיפוי מילה במילה: מקצועות הלימוד");
  lines.push("");
  lines.push(`Generated: ${meta.generatedAt}`);
  lines.push(`Student: ${meta.student.label} (${meta.student.id})`);
  lines.push(`Range: ${meta.range.from} → ${meta.range.to}`);
  lines.push(`URL: ${meta.url}`);
  lines.push(`Display mode: full`);
  lines.push("");
  lines.push("> העתקה מ-DOM בלבד. ללא תיקון, ללא סיכום, ללא הצעות.");
  lines.push("");
  lines.push("## מקצועות הלימוד");
  lines.push("");
  lines.push("| # | מקצוע | אזור פנימי | טקסט מילה במילה | הערה טכנית קצרה |");
  lines.push("|---|-------|------------|------------------|------------------|");
  for (const r of data.rows) {
    lines.push(`| ${r.order} | ${escapeMdCell(r.subject)} | ${escapeMdCell(r.innerArea)} | ${escapeMdCell(r.verbatimText)} | ${escapeMdCell(r.technicalNote)} |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## ניתוח קצר (ללא הצעות ניסוח)");
  lines.push("");
  lines.push("### ביטויים שחוזרים על עצמם");
  for (const x of meta.analysis.repeatedPhrases) lines.push(`- ${x}`);
  lines.push("");
  lines.push("### שפת מנוע / טכני");
  for (const x of meta.analysis.engineLanguage) lines.push(`- ${x}`);
  lines.push("");
  lines.push("### טקסט כללי מדי");
  for (const x of meta.analysis.tooGeneric) lines.push(`- ${x}`);
  return lines.join("\n");
}

function analyzeRows(rows) {
  const texts = rows.map((r) => r.verbatimText);
  const counts = new Map();
  for (const tx of texts) {
    const n = tx.replace(/\s+/g, " ").trim();
    if (n.length < 12) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const repeatedPhrases = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([tx, c]) => `"${tx}" (${c}×)`);

  const enginePatterns = [
    /הפרדה בין פער יסוד לבעיית נושא/,
    /מתחילה|לא עכשיו|not_ready|advance_level|maintain_and_strengthen/,
    /Phase3|phase3|pf:|k:|to:/,
    /נקודת המיקוד היא/,
    /כיוון ראשוני בלבד/,
    /subjectTransferReadiness|dominantLearningRisk/,
  ];
  /** @type {string[]} */
  const engineLanguage = [];
  for (const r of rows) {
    for (const re of enginePatterns) {
      if (re.test(r.verbatimText)) {
        engineLanguage.push(`[${r.subject} / ${r.innerArea}] ${r.verbatimText.slice(0, 120)}${r.verbatimText.length > 120 ? "…" : ""}`);
        break;
      }
    }
  }

  const genericPatterns = [
    /עוד קצת תרגול יבהיר את הכיוון/,
    /התמונה עדיין חלקית/,
    /יש בסיס תרגול במקצוע/,
    /כדאי להמשיך לאסוף תרגול/,
    /עדיף לעבוד קצר וממוקד/,
    /בקצב רגוע/,
    /לפני שמעלים רמת קושי/,
  ];
  /** @type {string[]} */
  const tooGeneric = [];
  for (const r of rows) {
    for (const re of genericPatterns) {
      if (re.test(r.verbatimText)) {
        tooGeneric.push(`[${r.subject} / ${r.innerArea}] ${r.verbatimText.slice(0, 140)}${r.verbatimText.length > 140 ? "…" : ""}`);
        break;
      }
    }
  }

  return { repeatedPhrases, engineLanguage: [...new Set(engineLanguage)], tooGeneric: [...new Set(tooGeneric)] };
}

async function main() {
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  if (!(await assertDevServerReachable(ORIGIN))) {
    console.error(`Dev server not reachable at ${ORIGIN}`);
    process.exit(1);
  }

  const parentSession = await mintParentSessionForDomAudit();
  const storageKey = supabaseAuthStorageKey(SUPABASE_URL);
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
    await page.locator(".pr-detailed-subjects-region").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(4000);

    const data = await page.evaluate(EXTRACT_FN);
    if (data.error) throw new Error(data.error);

    const analysis = analyzeRows(data.rows);
    const meta = {
      generatedAt: new Date().toISOString(),
      student: { id: STUDENT_ID, label: STUDENT_LABEL },
      range: RANGE,
      url: reportUrl,
      analysis,
    };

    writeFileSync(OUT_JSON, JSON.stringify({ ...meta, data }, null, 2), "utf8");
    writeFileSync(OUT_MD, buildMd(data, meta), "utf8");
    console.log(`Wrote ${OUT_MD}`);
    console.log(`Rows: ${data.rows.length}, subjects: ${data.subjects.join(", ")}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
