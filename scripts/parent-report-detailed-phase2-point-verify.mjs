#!/usr/bin/env node
/**
 * Point verification — שלב ביצוע 2 (topic cards in detailed parent report).
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

const FORBIDDEN_IN_CARDS = [
  "נקודת המיקוד",
  "משמעות:",
  "מה זוהה:",
  "מה כדאי לעשות ביחד:",
  "מה מומלץ לעשות בבית",
];
const REQUIRED_IN_CARDS = ["מה רואים:", "מה זה אומר:", "מה כדאי לעשות בבית:"];

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

  const cards = [...(region?.querySelectorAll(".pr-detailed-topic-rec-item, .pr-detailed-topic-nextstep-card") || [])];
  const cardTexts = cards.map((c) => t(c)).filter(Boolean);
  const cardsText = cardTexts.join("\n---\n");

  const mathBlock = region?.querySelector(".pr-detailed-subject-block");
  const mathMetrics = t(mathBlock?.querySelector(".pr-detailed-subject-metrics"));

  return {
    pageLoaded: Boolean(root),
    cardCount: cards.length,
    cardsText: cardsText.slice(0, 12000),
    fullTextSample: fullText.slice(0, 4000),
    mathMetrics,
    hasOutOfGrade: /תרגול מחוץ לכיתה הרשומה/.test(fullText),
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
    await page.locator(".pr-detailed-topic-rec-block").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(CHECK_FN);
    const cardsText = data.cardsText || "";
    const fullText = data.fullTextSample || "";

    const checks = [
      { id: 1, name: "הדף נטען", pass: data.pageLoaded },
      { id: 2, name: "כרטיסי נושא מופיעים", pass: data.cardCount > 0, detail: `${data.cardCount} cards` },
      ...FORBIDDEN_IN_CARDS.map((phrase, i) => ({
        id: 3 + i,
        name: `אין "${phrase}" בכרטיסים`,
        pass: !cardsText.includes(phrase),
        foundInCards: cardsText.includes(phrase),
      })),
      ...REQUIRED_IN_CARDS.map((phrase, i) => ({
        id: 7 + i,
        name: `יש "${phrase}"`,
        pass: cardsText.includes(phrase),
      })),
      {
        id: 10,
        name: "מתמטיקה לא 808 שאלות",
        pass: !/שאלות:\s*808/.test(data.mathMetrics || ""),
        detail: data.mathMetrics,
      },
      { id: 11, name: 'חלון "תרגול מחוץ לכיתה הרשומה"', pass: data.hasOutOfGrade },
      {
        id: 12,
        name: '"מה מומלץ לעשות בבית" לא חזר',
        pass: !fullText.includes("מה מומלץ לעשות בבית"),
      },
    ];

    const report = { url: reportUrl, checks, allPass: checks.every((c) => c.pass), cardPreview: cardsText.slice(0, 600) };
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
