#!/usr/bin/env node
/**
 * Point verification — reorder detailed + summary structure.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { assertDevServerReachable } from "./truth-gates/lib/live-parent-report.mjs";

loadEnvFiles();

const STUDENT_ID = process.env.PARENT_REPORT_DOM_STUDENT_ID || "74c30e48-895b-4f4c-a65a-888f656f54f6";
const ORIGIN = (process.env.TRUTH_GATES_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";
const EMAIL = process.env.PARENT_REPORT_DOM_PARENT_EMAIL || "18eran@gmail.com";

function storageKey(url) {
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

async function mintSession() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
  });
  if (linkErr) throw linkErr;
  const otp = linkData?.properties?.email_otp;
  if (!otp) throw new Error("generateLink did not return email_otp");
  const { data, error } = await anon.auth.verifyOtp({ email: EMAIL, token: otp, type: "email" });
  if (error || !data?.session) throw error || new Error("verifyOtp failed");
  return data.session;
}

const ORDER_FN = () => {
  function pos(el) {
    return el ? el.getBoundingClientRect().top : null;
  }
  function idx(inner, label) {
    const heads = [...inner.querySelectorAll(".pr-detailed-topic-rec-head")];
    const el = heads.find((h) => (h.textContent || "").includes(label));
    return el ? pos(el) : null;
  }
  const blocks = [...document.querySelectorAll(".pr-detailed-subject-block")].map((block) => {
    const inner = block.querySelector(".pr-detailed-subject-inner");
    if (!inner) return { title: "", ok: true };
    const rec = idx(inner, "המלצות מפורטות לפי נושא");
    const monitor = idx(inner, "נושאים שכדאי לעקוב אחריהם");
    const low = idx(inner, "נושאים עם מעט שאלות");
    let ok = true;
    if (rec != null && monitor != null && !(rec < monitor)) ok = false;
    if (monitor != null && low != null && !(monitor < low)) ok = false;
    if (rec != null && low != null && monitor == null && !(rec < low)) ok = false;
    return {
      title: (block.querySelector(".pr-detailed-subject-title")?.textContent || "").trim(),
      ok,
    };
  });
  const root = document.querySelector("#parent-report-detailed-print");
  const text = root ? root.innerText || "" : "";
  return { pageLoaded: Boolean(root), hasDisclaimer: text.includes("הבהרה חשובה"), blocks };
};

const SUMMARY_FN = () => {
  const root = document.querySelector("#parent-report-detailed-print");
  const text = root ? root.innerText || "" : "";
  const forbidden = [
    "מצב הנתונים בדוח",
    "מה חשוב לדעת",
    "מה מומלץ לעשות בבית",
    "תרגול מחוץ לכיתה הרשומה",
    "מקוצר: מילה לכל מקצוע",
    "הודעות מהמורה",
  ];
  const allowed = ["סיכום חכם להורה", "מה עשינו בתקופה הזאת", "מקצועות הלימוד", "הבהרה חשובה"];
  const copilotVisible = Boolean(document.querySelector(".no-pdf .rounded-lg.border.border-cyan-500\\/20"));
  const activitySection = [...root.querySelectorAll(".pr-detailed-section-title, .pr-detailed-section-head")].find((el) =>
    (el.textContent || "").includes("מה עשינו בתקופה הזאת")
  )?.closest(".pr-detailed-section, section, [class*='SectionCard']") || root;
  const activityText = activitySection ? activitySection.innerText || "" : text;
  return {
    pageLoaded: Boolean(root),
    forbiddenHits: forbidden.filter((f) => text.includes(f)),
    allowedPresent: allowed.filter((a) => text.includes(a)),
    copilotVisible,
    hasDisclaimer: text.includes("הבהרה חשובה"),
    activityHasTimeCard: activityText.includes("זמן כולל"),
    activityHasQuestionsCard: activityText.includes("שאלות") && /\d+/.test(activityText),
    activityHasAccuracyCard: activityText.includes("דיוק כללי"),
    activityHasCoverageTable: activityText.includes("כיסוי לפי מקצוע"),
    activityHasNotable: activityText.includes("מקצועות בולטים"),
  };
};

async function main() {
  await assertDevServerReachable(ORIGIN);
  const parentSession = await mintSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL", viewport: { width: 1400, height: 900 } });
  const key = storageKey(SUPABASE_URL);
  if (key) {
    await context.addInitScript(
      ({ storageKeyName, sessionPayload }) => {
        try {
          window.localStorage.setItem(storageKeyName, JSON.stringify(sessionPayload));
        } catch {
          /* ignore */
        }
      },
      {
        storageKeyName: key,
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
  const baseQs = {
    studentId: STUDENT_ID,
    source: "parent",
    period: "custom",
    start: "2025-09-01",
    end: "2026-07-04",
  };

  const fullQs = new URLSearchParams({ ...baseQs, mode: "full" });
  await page.goto(`${ORIGIN}/learning/parent-report-detailed?${fullQs}`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.locator("#parent-report-detailed-print").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(2000);
  const full = await page.evaluate(ORDER_FN);

  const summaryQs = new URLSearchParams({ ...baseQs, mode: "summary" });
  await page.goto(`${ORIGIN}/learning/parent-report-detailed?${summaryQs}`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.locator("#parent-report-detailed-print").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(2000);
  const summaryMeta = await page.evaluate(SUMMARY_FN);
  const summaryOrder = await page.evaluate(ORDER_FN);

  await browser.close();

  const fullChecks = [
    { name: "הדף נטען (מלא)", pass: full.pageLoaded },
    { name: "סדר נושאים (מלא)", pass: full.blocks.every((b) => b.ok) },
    { name: "הבהרה חשובה (מלא)", pass: full.hasDisclaimer },
  ];
  const summaryChecks = [
    { name: "הדף נטען (מקוצר)", pass: summaryMeta.pageLoaded },
    {
      name: "רק חלונות מותרים (מקוצר)",
      pass:
        summaryMeta.allowedPresent.length === 4 &&
        summaryMeta.forbiddenHits.length === 0,
    },
    { name: "אין copilot (מקוצר)", pass: !summaryMeta.copilotVisible },
    {
      name: "כל חלון מה עשינו (מקוצר)",
      pass:
        summaryMeta.activityHasTimeCard &&
        summaryMeta.activityHasQuestionsCard &&
        summaryMeta.activityHasAccuracyCard &&
        summaryMeta.activityHasCoverageTable &&
        summaryMeta.activityHasNotable,
    },
    { name: "סדר נושאים (מקוצר)", pass: summaryOrder.blocks.every((b) => b.ok) },
    { name: "הבהרה חשובה (מקוצר)", pass: summaryMeta.hasDisclaimer },
  ];

  console.log(JSON.stringify({ full: fullChecks, summary: summaryChecks, fullSubjects: full.blocks, summarySubjects: summaryOrder.blocks }, null, 2));
  const allPass = [...fullChecks, ...summaryChecks].every((c) => c.pass);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
