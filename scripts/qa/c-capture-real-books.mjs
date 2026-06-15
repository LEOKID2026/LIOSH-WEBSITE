/**
 * C-RECOVERY: Full Book Page Screenshot Capture
 *
 * Port: 3005, Auth: ADMIN/1234 (CONFIRMED WORKING by route-discovery.mjs)
 * Captures desktop (1280x900) + mobile (375x812) screenshots of RTL-critical pages.
 *
 * Usage: node --env-file=.env.e2e.local scripts/qa/c-capture-real-books.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

const BASE_URL = "http://localhost:3005";
const OUT_DIR = join("docs", "qa", "hebrew-launch-audit-core");
const SHOT_DIR = join(OUT_DIR, "C-screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

// ── RTL-critical page filter ──────────────────────────────────────────────
// Pages whose pageId suggests RTL-sensitive content
const RTL_KEYWORDS = [
  "frac", "cmp", "eq_", "dec_", "perc", "mul", "div", "add", "sub",
  "angle", "area", "perimeter", "circle", "triangle", "parallel",
  "height", "diagonal", "unit", "ratio", "scale", "round", "power",
  "solids", "volume", "square_area", "square_perimeter", "pythagoras",
  "wp_unit", "wp_shop", "wp_distance", "order_",
];

function isRtlCritical(pageId) {
  return RTL_KEYWORDS.some(k => pageId.includes(k));
}

// Load all pages from the registry extraction
const allPages = JSON.parse(readFileSync("scripts/qa/all-book-pages.json", "utf8"));

const CAPTURE_TARGETS = [];
for (const [key, data] of Object.entries(allPages)) {
  for (const pageId of data.pages) {
    if (isRtlCritical(pageId)) {
      CAPTURE_TARGETS.push({
        subject: data.subject,
        grade: data.grade,
        pageId,
        route: `/learning/book/${data.subject}/${data.grade}/${pageId}`,
        source_file: data.file,
      });
    }
  }
}

console.log(`\n📋 RTL-critical pages to capture: ${CAPTURE_TARGETS.length} of ${
  Object.values(allPages).reduce((s, d) => s + d.pages.length, 0)
} total pages\n`);

// ── RTL issue detection from HTML ─────────────────────────────────────────
function detectRtlIssues(html, pageId) {
  const issues = [];

  // 1. Math numbers without dir isolation
  if (/[\u0590-\u05FF].*\d+\s*[+\-×÷=<>]/.test(html) ||
      /[+\-×÷=<>]\s*\d+.*[\u0590-\u05FF]/.test(html)) {
    // Check if wrapped in BDI or LTR isolate
    const hasBdi = html.includes('dir="ltr"') || html.includes("book-math-isolate") ||
      html.includes("unicodeBidi") || html.includes("data-book-math-run");
    if (!hasBdi) {
      issues.push({ type: "MISSING_BDI", severity: "HIGH",
        desc: "Math expression in Hebrew text without BiDi isolation detected" });
    }
  }

  // 2. Comparison operators (< >) — very high risk of RTL reversal
  if (html.includes("&lt;") || html.includes("&gt;") ||
      html.match(/>\s*[0-9א-ת]/) || html.match(/[0-9א-ת]\s*</)) {
    if (!html.includes('dir="ltr"') && !html.includes("math-isolate")) {
      issues.push({ type: "CMP_OPERATOR_NO_ISOLATE", severity: "BLOCKER",
        desc: "Comparison operator < or > without LTR isolate — may flip in RTL context" });
    }
  }

  // 3. Fractions (looking for fraction markup)
  if (pageId.includes("frac") || html.includes("מונה") || html.includes("מכנה")) {
    const hasFracMarkup = html.includes("frac-") || html.includes("fraction") ||
      html.includes("book-frac") || html.includes("numerator") ||
      html.includes("class=\"num") || html.includes("class=\"den");
    if (!hasFracMarkup && !html.includes("book-math-isolate")) {
      issues.push({ type: "FRACTION_NO_MARKUP", severity: "BLOCKER",
        desc: "Fraction page without recognized fraction markup" });
    }
  }

  // 4. Hebrew followed directly by digits (no space/isolate)
  if (/[\u0590-\u05FF]\d|\d[\u0590-\u05FF]/.test(html)) {
    issues.push({ type: "HEBREW_DIGIT_ADJACENT", severity: "HIGH",
      desc: "Hebrew character adjacent to digit — BiDi boundary risk" });
  }

  // 5. Degree symbol context
  if (html.includes("°") || html.includes("&deg;")) {
    if (!html.includes('dir="ltr"') && !html.includes("math-isolate")) {
      issues.push({ type: "DEGREE_NO_ISOLATE", severity: "HIGH",
        desc: "Degree symbol without LTR isolate" });
    }
  }

  // 6. Pi symbol
  if (html.includes("π") || html.includes("&pi;") || html.includes("3.14")) {
    if (!html.includes("math-isolate") && !html.includes('dir="ltr"')) {
      issues.push({ type: "PI_NO_ISOLATE", severity: "HIGH",
        desc: "π/3.14 without LTR math isolate" });
    }
  }

  return issues;
}

// ── Login and get session ─────────────────────────────────────────────────
console.log("🔑 Logging in with ADMIN/1234 on port 3005...");
const browser = await chromium.launch({ headless: true });

const loginCtx = await browser.newContext({
  baseURL: BASE_URL, locale: "he-IL",
  viewport: { width: 1280, height: 900 },
});
const loginPage = await loginCtx.newPage();
await loginPage.goto("/student/login", { waitUntil: "domcontentloaded", timeout: 20000 });
await loginPage.locator('[data-testid="student-login-username"]').fill("ADMIN");
await loginPage.locator('[data-testid="student-login-pin"]').fill("1234");
await loginPage.locator('[data-testid="student-login-submit"]').click();
await loginPage.waitForURL(/\/student\/home/, { timeout: 20000 });
console.log("✅ Logged in. URL:", loginPage.url());
const sessionCookies = await loginCtx.cookies();
await loginCtx.close();
console.log(`   Got ${sessionCookies.length} session cookies\n`);

// ── Capture screenshots ───────────────────────────────────────────────────
const results = [];
let successCount = 0;
let failCount = 0;

for (const target of CAPTURE_TARGETS) {
  const { subject, grade, pageId, route } = target;
  const label = `${subject}-${grade}-${pageId}`;
  const desktopFile = join(SHOT_DIR, `C-${subject}-${grade}-${pageId}-desktop.png`);
  const mobileFile = join(SHOT_DIR, `C-${subject}-${grade}-${pageId}-mobile.png`);

  const result = {
    subject, grade, pageId, route,
    full_url: BASE_URL + route,
    source_file: target.source_file,
    fixture_used: "ADMIN",
    http_status: -1,
    page_title: "",
    first_heading: "",
    has_real_book_content: false,
    failure_reason: "",
    html_issues: [],
    desktop_screenshot: "",
    mobile_screenshot: "",
    severity: "OK",
  };

  // ── Desktop ──
  try {
    const ctx = await browser.newContext({
      baseURL: BASE_URL, locale: "he-IL",
      viewport: { width: 1280, height: 900 },
    });
    await ctx.addCookies(sessionCookies);
    const page = await ctx.newPage();

    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25000 });
    result.http_status = resp?.status() ?? -1;

    // Wait for real content to appear (book sections, not just spinner)
    await page.waitForFunction(() => {
      return document.querySelector(".book-prose-isolate, .book-math-isolate, [data-book-math-run], h1, h2") !== null;
    }, { timeout: 12000 }).catch(() => null);
    await page.waitForTimeout(1500);

    result.page_title = await page.title().catch(() => "");
    result.first_heading = await page.locator("h1,h2").first().innerText({ timeout: 3000 }).catch(() => "");

    const html = await page.content();
    const hasHebrew = /[\u0590-\u05FF]/.test(html);
    const hasBookMarkers = html.includes("book-prose-isolate") || html.includes("book-math-isolate") ||
      html.includes("LearningPageBody") || html.includes("data-book-math-run");
    const is404 = html.includes("This page could not be found") || html.includes("404");
    const is500 = html.includes('"statusCode":500') || html.includes("Internal Server Error");

    if (is404) {
      result.failure_reason = "HTTP 404 — page not found [HARNESS_FAIL]";
      result.http_status = 404;
      failCount++;
    } else if (is500) {
      result.failure_reason = "HTTP 500 — server error [HARNESS_FAIL]";
      result.http_status = 500;
      failCount++;
    } else if (!hasHebrew) {
      result.failure_reason = "No Hebrew text — auth gate or empty page [HARNESS_FAIL]";
      failCount++;
    } else if (!hasBookMarkers) {
      result.failure_reason = "No book DOM markers — may be auth gate spinner";
      // Could still take screenshot to verify
    }

    if (!result.failure_reason || !result.failure_reason.includes("HARNESS_FAIL")) {
      result.has_real_book_content = hasHebrew && (hasBookMarkers || html.includes('"sections"'));
      result.html_issues = detectRtlIssues(html, pageId);

      // Set severity based on issues
      const maxSeverity = result.html_issues.reduce((max, iss) => {
        const order = { BLOCKER: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
        return (order[iss.severity] || 0) > (order[max] || 0) ? iss.severity : max;
      }, "OK");
      result.severity = maxSeverity;

      if (result.has_real_book_content) {
        await page.screenshot({ path: desktopFile, fullPage: false });
        result.desktop_screenshot = desktopFile;
        successCount++;
        console.log(`  ✅ ${label}: desktop OK (${result.html_issues.length} RTL issues, severity: ${maxSeverity})`);
      } else {
        console.log(`  ⚠️  ${label}: desktop — ${result.failure_reason || "no book markers"}`);
        failCount++;
      }
    } else {
      console.log(`  ❌ ${label}: ${result.failure_reason}`);
    }
    await ctx.close();
  } catch (e) {
    result.failure_reason = `Desktop error: ${String(e).slice(0, 120)} [HARNESS_FAIL]`;
    failCount++;
    console.log(`  ❌ ${label} (desktop): ${String(e).slice(0, 60)}`);
  }

  // ── Mobile (only if desktop succeeded) ──
  if (result.has_real_book_content) {
    try {
      const mCtx = await browser.newContext({
        baseURL: BASE_URL, locale: "he-IL",
        viewport: { width: 375, height: 812 },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      await mCtx.addCookies(sessionCookies);
      const mPage = await mCtx.newPage();
      await mPage.goto(route, { waitUntil: "domcontentloaded", timeout: 25000 });
      await mPage.waitForFunction(() => {
        return document.querySelector(".book-prose-isolate, .book-math-isolate, h1, h2") !== null;
      }, { timeout: 10000 }).catch(() => null);
      await mPage.waitForTimeout(1500);

      const mHtml = await mPage.content();
      const mHasContent = /[\u0590-\u05FF]/.test(mHtml) &&
        (mHtml.includes("book-prose-isolate") || mHtml.includes("book-math-isolate"));
      if (mHasContent) {
        await mPage.screenshot({ path: mobileFile, fullPage: false });
        result.mobile_screenshot = mobileFile;
        console.log(`     📱 ${label}: mobile OK`);
      } else {
        console.log(`     📱 ${label}: mobile — content not visible`);
      }
      await mCtx.close();
    } catch (e) {
      console.log(`     📱 ${label} (mobile): ${String(e).slice(0, 60)}`);
    }
  }

  results.push(result);
}

await browser.close();

// ── Write C-valid-book-routes.csv ─────────────────────────────────────────
const csvHeader = "id,subject,grade,book_id,discovered_from_file,discovered_from_line,route,full_url,auth_required,fixture_used,http_status,page_title_or_heading,has_real_book_content,failure_reason,screenshot_path";

const csvRows = results.map((r, i) => {
  const escape = s => `"${String(s || "").replace(/"/g, "'")}"`;
  return [
    i + 1,
    r.subject,
    r.grade,
    r.pageId,
    r.source_file,
    escape("routeBase: /learning/book/" + r.subject + "/" + r.grade),
    r.route,
    r.full_url,
    "yes",
    r.fixture_used,
    r.http_status,
    escape(r.first_heading || r.page_title),
    r.has_real_book_content ? "YES" : "NO",
    escape(r.failure_reason || (r.has_real_book_content ? "" : "no book content [HARNESS_FAIL]")),
    escape(r.desktop_screenshot),
  ].join(",");
});

writeFileSync(join(OUT_DIR, "C-valid-book-routes.csv"), [csvHeader, ...csvRows].join("\n"), "utf8");
console.log(`\n✅ C-valid-book-routes.csv: ${results.length} rows`);

// ── Write C-math-geometry-books-rtl-1to1.csv ─────────────────────────────
const rtlCsvHeader = "id,subject,grade,book_id,page_id,route,exact_source_text,rendered_text,source_file,source_line,desktop_screenshot,mobile_screenshot,rtl_problem,math_meaning_risk,student_risk,severity,required_fix,owner_decision";

const rtlRows = results
  .filter(r => r.has_real_book_content)
  .flatMap((r, i) => {
    if (r.html_issues.length === 0) {
      return [{
        id: i + 1, subject: r.subject, grade: r.grade, book_id: r.pageId,
        page_id: r.pageId, route: r.route,
        exact_source_text: "", rendered_text: "",
        source_file: r.source_file, source_line: "",
        desktop_screenshot: r.desktop_screenshot,
        mobile_screenshot: r.mobile_screenshot,
        rtl_problem: "None detected by static analysis",
        math_meaning_risk: "LOW", student_risk: "LOW",
        severity: "OK", required_fix: "NONE", owner_decision: "",
      }];
    }
    return r.html_issues.map((iss, j) => ({
      id: `${i + 1}.${j + 1}`, subject: r.subject, grade: r.grade, book_id: r.pageId,
      page_id: r.pageId, route: r.route,
      exact_source_text: iss.desc, rendered_text: "",
      source_file: r.source_file, source_line: "",
      desktop_screenshot: r.desktop_screenshot,
      mobile_screenshot: r.mobile_screenshot,
      rtl_problem: iss.type,
      math_meaning_risk: iss.severity === "BLOCKER" ? "HIGH" : iss.severity === "HIGH" ? "MEDIUM" : "LOW",
      student_risk: iss.severity === "BLOCKER" ? "HIGH" : "MEDIUM",
      severity: iss.severity,
      required_fix: iss.severity === "BLOCKER" || iss.severity === "HIGH"
        ? "Add dir=ltr / unicode-bidi:isolate around math expression" : "Review",
      owner_decision: iss.severity === "BLOCKER" ? "REQUIRED before launch" : "",
    }));
  });

const rtlCsvRows = rtlRows.map(r => {
  const escape = s => `"${String(s || "").replace(/"/g, "'")}"`;
  return [
    r.id, r.subject, r.grade, r.book_id, r.page_id, r.route,
    escape(r.exact_source_text), escape(r.rendered_text),
    r.source_file, r.source_line,
    escape(r.desktop_screenshot), escape(r.mobile_screenshot),
    escape(r.rtl_problem), r.math_meaning_risk, r.student_risk,
    r.severity, escape(r.required_fix), escape(r.owner_decision),
  ].join(",");
});

writeFileSync(join(OUT_DIR, "C-math-geometry-books-rtl-1to1.csv"),
  [rtlCsvHeader, ...rtlCsvRows].join("\n"), "utf8");
console.log(`✅ C-math-geometry-books-rtl-1to1.csv: ${rtlRows.length} rows`);

// ── Write summary markdown ────────────────────────────────────────────────
const blockers = rtlRows.filter(r => r.severity === "BLOCKER");
const highs = rtlRows.filter(r => r.severity === "HIGH");
const successPages = results.filter(r => r.has_real_book_content);
const failPages = results.filter(r => !r.has_real_book_content);

const conclusion = successCount > 0 ? "VALID_RTL_AUDIT_COMPLETED" : "HARNESS_FAIL_NO_RTL_DECISION";

const md = `# C בדיקת ספרי חשבון וגאומטריה — RTL חזותי 1:1

> **תאריך:** ${new Date().toISOString()}
> **מסקנה:** ${conclusion}
> **שרת:** ${BASE_URL} | **משתמש:** ADMIN/1234 (אומת ב-route-discovery.mjs)

---

## תקציר מנהלים

| מדד | ערך |
|-----|-----|
| עמודים שנבדקו (RTL-critical) | ${results.length} |
| עמודים עם תוכן אמיתי | ${successPages.length} |
| עמודים שנכשלו (HARNESS_FAIL) | ${failPages.length} |
| screenshots שצולמו | ${successPages.filter(r=>r.desktop_screenshot).length} desktop + ${successPages.filter(r=>r.mobile_screenshot).length} mobile |
| בעיות RTL שנמצאו | ${rtlRows.filter(r=>r.rtl_problem && r.rtl_problem !== "None detected by static analysis").length} |
| BLOCKERS | ${blockers.length} |
| HIGH | ${highs.length} |

---

## מסקנת השקה

${blockers.length > 0
  ? `**⛔ NOT PASS — נמצאו ${blockers.length} BLOCKER RTL.**\nאין להשיק לפני תיקון כל ה-BLOCKER.`
  : highs.length > 0
    ? `**⚠️ NOT PASS — נמצאו ${highs.length} בעיות HIGH RTL.**\nמומלץ לתקן לפני השקה.`
    : `**✅ PASS על בסיס ניתוח סטטי HTML.**\nנדרש אימות ויזואלי ידני לפני השקה סופית.`
}

---

## ספרים וכיתות שנבדקו

| ספר | כיתה | עמודים (RTL-critical) | הצלחה |
|-----|------|----------------------|-------|
${Object.values(allPages).map(d => {
  const pages = d.pages.filter(isRtlCritical);
  const ok = results.filter(r => r.subject === d.subject && r.grade === d.grade && r.has_real_book_content).length;
  return `| ${d.subject} | ${d.grade} | ${pages.length} | ${ok}/${pages.length} |`;
}).join("\n")}

---

## חוסמי השקה (BLOCKER)

${blockers.length === 0
  ? "_לא נמצאו חוסמי השקה ב-RTL על בסיס ניתוח סטטי._"
  : blockers.map(b => `### ${b.subject} ${b.grade}/${b.page_id}\n- בעיה: ${b.rtl_problem}\n- תיאור: ${b.exact_source_text}\n- תיקון: ${b.required_fix}`).join("\n\n")
}

---

## בעיות HIGH

${highs.length === 0
  ? "_לא נמצאו בעיות HIGH._"
  : highs.map(h => `- **${h.subject} ${h.grade}/${h.page_id}**: ${h.rtl_problem} — ${h.exact_source_text}`).join("\n")
}

---

## עמודים שנכשלו (HARNESS_FAIL)

${failPages.length === 0
  ? "_כל העמודים נטענו בהצלחה._"
  : failPages.map(r => `- ${r.subject} ${r.grade}/${r.pageId}: ${r.failure_reason}`).join("\n")
}

---

## screenshots

כל הצילומים נמצאים תחת: \`docs/qa/hebrew-launch-audit-core/C-screenshots/\`

${successPages.filter(r=>r.desktop_screenshot).slice(0,20).map(r =>
  `- **${r.subject} ${r.grade}/${r.pageId}**: ` +
  `[desktop](${r.desktop_screenshot})` +
  (r.mobile_screenshot ? ` | [mobile](${r.mobile_screenshot})` : "")
).join("\n")}
${successPages.filter(r=>r.desktop_screenshot).length > 20 ? `\n_...ועוד ${successPages.filter(r=>r.desktop_screenshot).length - 20} screenshots_` : ""}

---

## מקור הנתיבים בקוד

- **Math**: \`lib/learning-book/math-g{N}-registry.js\` → \`routeBase: "/learning/book/math/g{N}"\`
- **Geometry**: \`lib/learning-book/geometry-g{N}-registry.js\` → \`routeBase: "/learning/book/geometry/g{N}"\`
- **Auth**: \`StudentAccessGate\` (client-side) — SSG HTML נטען, session נבדקת ב-client
- **Session**: ADMIN/1234 — מוגדר ב-VIRTUAL_STUDENT_ACCOUNTS ב-\`.env.e2e.local\`
`;

writeFileSync(join(OUT_DIR, "C-math-geometry-books-rtl-1to1.md"), md, "utf8");
console.log("✅ C-math-geometry-books-rtl-1to1.md written");

console.log(`\n🏁 DONE`);
console.log(`   Screenshots: ${successCount} desktop + ${results.filter(r=>r.mobile_screenshot).length} mobile`);
console.log(`   Conclusion: ${conclusion}`);
console.log(`   BLOCKERs: ${blockers.length} | HIGH: ${highs.length}`);
