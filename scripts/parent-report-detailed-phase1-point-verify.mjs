#!/usr/bin/env node
/**
 * Point verification — שלב ביצוע 1 (detailed parent report, subjects region top).
 * Run: node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-report-detailed-phase1-point-verify.mjs
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

const PHASE3_NEW_TITLES = ["מה כדאי לשים לב אליו", "ממה כדאי להימנע עכשיו", "האם אפשר להתקדם"];
const PHASE3_OLD_TITLES = ["מה חוזר בטעויות", "מה לא לעשות", "האם זה נשמר בשאלה חדשה"];
const FORBIDDEN = ["איך כדאי לעבוד על זה", "מה כדאי לעשות במקצוע הזה", "מה מומלץ לעשות בבית"];

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

const CHECK_FN = () => {
  function t(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").replace(/\r\n/g, "\n").trim();
  }

  const root = document.querySelector("#parent-report-detailed-print");
  const region = root?.querySelector(".pr-detailed-subjects-region");
  const fullText = root ? t(root) : "";

  const subjects = [...(region?.querySelectorAll(".pr-detailed-subject-block") || [])].map((block) => {
    const title = t(block.querySelector(".pr-detailed-subject-title"));
    const metrics = t(block.querySelector(".pr-detailed-subject-metrics"));
    const phase3Labels = [...(block.querySelectorAll(".pr-detailed-phase3-dl .font-bold") || [])].map((el) => t(el));
    const letterText = t(block.querySelector(".pr-detailed-subject-letter"));
    const tierGroups = block.querySelectorAll(".pr-detailed-topic-tier-group").length;
    const topicCards = block.querySelectorAll(".pr-detailed-topic-rec-block .pr-detailed-topic-rec-card, .pr-detailed-topic-rec-item").length;
    const qMatch = metrics.match(/שאלות:\s*(\d+)/);
    return {
      title,
      metrics,
      questionCount: qMatch ? Number(qMatch[1]) : null,
      phase3Labels,
      letterText,
      tierGroups,
      topicCards,
    };
  });

  const math = subjects.find((s) => /מתמטיקה/i.test(s.title));

  return {
    pageLoaded: Boolean(root),
    subjectsRegion: Boolean(region),
    subjects,
    mathQuestionCount: math?.questionCount ?? null,
    mathMetrics: math?.metrics ?? "",
    hasOutOfGrade: /תרגול מחוץ לכיתה הרשומה/.test(fullText),
    fullTextSample: fullText.slice(0, 8000),
    phase3LabelsAll: subjects.flatMap((s) => s.phase3Labels),
    tierGroupCount: subjects.reduce((n, s) => n + s.tierGroups, 0),
    topicCardCount: subjects.reduce((n, s) => n + s.topicCards, 0),
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
    await page.waitForTimeout(3000);

    const data = await page.evaluate(CHECK_FN);
    const text = data.fullTextSample || "";

    const checks = [
      { id: 1, name: "הדף נטען", pass: data.pageLoaded && data.subjectsRegion },
      {
        id: 2,
        name: "כותרת מקצוע + מדדים",
        pass: data.subjects.some((s) => s.title && /שאלות:\s*\d+.*דיוק:/.test(s.metrics)),
      },
      {
        id: 3,
        name: "Phase3 עם כותרות חדשות",
        pass:
          data.phase3LabelsAll.some((l) => PHASE3_NEW_TITLES.includes(l)) &&
          !data.phase3LabelsAll.some((l) => PHASE3_OLD_TITLES.includes(l)),
      },
      {
        id: 4,
        name: 'אין "איך כדאי לעבוד על זה"',
        pass: !text.includes("איך כדאי לעבוד על זה"),
      },
      {
        id: 5,
        name: 'אין "מה כדאי לעשות במקצוע הזה"',
        pass: !text.includes("מה כדאי לעשות במקצוע הזה"),
      },
      { id: 6, name: "קבוצות נושאים", pass: data.tierGroupCount > 0 },
      { id: 7, name: "כרטיסי נושא", pass: data.topicCardCount > 0 },
      {
        id: 8,
        name: "מתמטיקה לא 808 שאלות",
        pass: data.mathQuestionCount == null || data.mathQuestionCount !== 808,
        detail: data.mathMetrics,
      },
      { id: 9, name: 'חלון "תרגול מחוץ לכיתה הרשומה"', pass: data.hasOutOfGrade },
      {
        id: 10,
        name: '"מה מומלץ לעשות בבית" לא חזר',
        pass: !text.includes("מה מומלץ לעשות בבית"),
      },
    ];

    const report = {
      url: reportUrl,
      range: RANGE,
      checks,
      allPass: checks.every((c) => c.pass),
      subjects: data.subjects.map((s) => ({
        title: s.title,
        metrics: s.metrics,
        phase3Labels: s.phase3Labels,
        letterPreview: s.letterText.slice(0, 220),
        tierGroups: s.tierGroups,
        topicCards: s.topicCards,
      })),
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.allPass) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
