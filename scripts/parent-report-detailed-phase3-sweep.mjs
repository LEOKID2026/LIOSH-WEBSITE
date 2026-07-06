#!/usr/bin/env node
/**
 * Phase 3 sweep — "מקצועות הלימוד" region only (detailed parent report, full mode).
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { assertDevServerReachable } from "./truth-gates/lib/live-parent-report.mjs";

loadEnvFiles();

const STUDENT_ID = process.env.PARENT_REPORT_DOM_STUDENT_ID || "74c30e48-895b-4f4c-a65a-888f656f54f6";
const RANGE = {
  from: process.env.PARENT_REPORT_DOM_FROM || "2025-09-01",
  to: process.env.PARENT_REPORT_DOM_TO || "2026-07-04",
};
const ORIGIN = (process.env.TRUTH_GATES_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";
const OMER_PARENT_EMAIL = process.env.PARENT_REPORT_DOM_PARENT_EMAIL || "18eran@gmail.com";

const FORBIDDEN = [
  "מה זוהה:",
  "דפוס הטעות:",
  "משמעות:",
  "מה כדאי לעשות ביחד:",
  "נקודת המיקוד",
  "נקודת מיקוד",
  "מצביע על דפוס",
  "המערכת זיהתה",
  "דוגמה כללית",
  "13 - 5",
  "האם זה נשמר בשאלה חדשה",
  "מתחילה",
  "לא עכשיו",
  "מוגבלת",
  "מה לא לעשות",
  "איך כדאי לעבוד על זה",
  "מה כדאי לעשות במקצוע הזה",
  "הפרדה בין פער יסוד לבעיית נושא",
  "התמונה עדיין חלקית — עוד קצת תרגול יבהיר את הכיוון",
  "יש בסיס תרגול במקצוע, אך העדות עדיין מצומצמת",
  "זה כיוון ראשוני בלבד",
  "תצפית זהירה בלבד",
  "לפני שמעלים רמת קושי",
  "לנושאים מתקדמים יותר",
  "הילד/ה",
  "כדאי לטפל בו בצורה ממוקדת",
  "1 שאלות",
];

const REQUIRED_TOPIC_CARD = [
  "מה רואים:",
  "הנתונים:",
  "מה זה אומר:",
  "מה כדאי לעשות בבית:",
];
const REQUIRED_PHASE3 = [
  "מה כדאי לשים לב אליו",
  "ממה כדאי להימנע עכשיו",
  "האם אפשר להתקדם",
];

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
  function t(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").replace(/\r\n/g, "\n").trim();
  }

  const root = document.querySelector("#parent-report-detailed-print");
  const region = root?.querySelector(".pr-detailed-subjects-region");
  const regionText = region ? t(region) : "";
  const fullText = root ? t(root) : "";

  const subjects = [...(region?.querySelectorAll(".pr-detailed-subject-block") || [])].map((block) => {
    const title = t(block.querySelector(".pr-detailed-subject-title"));
    const metrics = t(block.querySelector(".pr-detailed-subject-metrics"));
    const phase3 = t(block.querySelector(".pr-detailed-phase3-dl"));
    const letter = t(block.querySelector(".pr-detailed-subject-letter"));
    const tiers = t(block.querySelector(".pr-detailed-topic-overview-block"));
    const cards = [...block.querySelectorAll(".pr-detailed-topic-rec-item, .pr-detailed-topic-nextstep-card")].map((c) => t(c));
    return { title, metrics, phase3, letter, tiers, cardsText: cards.join("\n"), blockText: t(block) };
  });

  const math = subjects.find((s) => /מתמטיקה/i.test(s.title));
  const english = subjects.find((s) => /אנגלית/i.test(s.title));

  const headerSummary = t(root?.querySelector(".pr-detailed-smart-summary, [data-testid='parent-report-smart-summary']"));
  const homeRecSection = [...(root?.querySelectorAll("h2, .pr-detailed-section-title, .pr-detailed-subjects-region-title") || [])]
    .map((el) => t(el))
    .filter((x) => x.includes("מה מומלץ לעשות בבית"));

  return {
    pageLoaded: Boolean(root),
    regionPresent: Boolean(region),
    regionText,
    fullTextSample: fullText.slice(0, 6000),
    subjects: subjects.map((s) => ({ title: s.title, metrics: s.metrics, hasPhase3: !!s.phase3, hasLetter: !!s.letter, hasTiers: !!s.tiers, cardCount: (s.cardsText.match(/---/g) || []).length + (s.cardsText ? 1 : 0) })),
    mathMetrics: math?.metrics || "",
    englishInRegion: !!english,
    englishTitle: english?.title || null,
    hasOutOfGrade: /תרגול מחוץ לכיתה הרשומה/.test(fullText),
    homeRecWindow: homeRecSection.length > 0,
    subjectsRegionTitle: t(region?.querySelector(".pr-detailed-subjects-region-title")),
    phase3AllText: subjects.map((s) => s.phase3).join("\n"),
    cardsAllText: subjects.map((s) => s.cardsText).join("\n---\n"),
    structure: {
      hasSmartSummary: !!headerSummary || /סיכום חכם/.test(fullText.slice(0, 4000)),
      subjectsRegionTitle: t(region?.querySelector(".pr-detailed-subjects-region-title")),
      subjectCount: subjects.length,
      anyPhase3: subjects.some((s) => s.phase3),
      anyLetter: subjects.some((s) => s.letter),
      anyTiers: subjects.some((s) => s.tiers),
      anyCards: subjects.some((s) => s.cardsText),
    },
  };
};

async function main() {
  await assertDevServerReachable(ORIGIN);
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
      { key: storageKey, sessionPayload: { access_token: parentSession.access_token, refresh_token: parentSession.refresh_token, expires_at: parentSession.expires_at, expires_in: parentSession.expires_in, token_type: parentSession.token_type, user: parentSession.user } }
    );
  }

  const page = await context.newPage();
  const qs = new URLSearchParams({ studentId: STUDENT_ID, source: "parent", period: "custom", start: RANGE.from, end: RANGE.to, mode: "full" });
  const reportUrl = `${ORIGIN}/learning/parent-report-detailed?${qs}`;

  try {
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 180_000 });
    await page.locator("#parent-report-detailed-print").waitFor({ timeout: 120_000 });
    await page.locator(".pr-detailed-subjects-region").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(EXTRACT_FN);
    const regionText = data.regionText || "";

    const forbiddenHits = FORBIDDEN.filter((phrase) => regionText.includes(phrase)).map((phrase) => ({
      phrase,
      inSubjectsRegion: true,
      note: "DOM sweep — מקצועות הלימוד",
    }));

    const requiredTopicHits = REQUIRED_TOPIC_CARD.map((p) => ({ phrase: p, found: (data.cardsAllText || "").includes(p) }));
    const requiredPhase3Hits = REQUIRED_PHASE3.map((p) => ({ phrase: p, found: (data.phase3AllText || "").includes(p) }));

    const report = {
      url: reportUrl,
      sweepClean: forbiddenHits.length === 0,
      forbiddenHits,
      requiredTopicCard: requiredTopicHits,
      requiredPhase3: requiredPhase3Hits,
      dataChecks: {
        mathNot808: !/שאלות:\s*808/.test(data.mathMetrics),
        mathMetrics: data.mathMetrics,
        englishInSubjectsRegion: data.englishInRegion,
        outOfGradeWindow: data.hasOutOfGrade,
        homeRecWindowReturned: data.homeRecWindow,
      },
      structure: data.structure,
      subjects: data.subjects,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.sweepClean) process.exit(2);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
