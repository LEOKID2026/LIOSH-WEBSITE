/**
 * Launch Readiness — Mobile + RTL audit (E9A MVP).
 *
 * Playwright probes at mobile viewport. Read-only navigation only.
 */

export const SCHEMA_VERSION = "mobile-rtl-audit/v1";

export const DEFAULT_VIEWPORT = { width: 390, height: 844, label: "iPhone 12" };

const HEBREW_RE = /[\u0590-\u05FF]/;

function issue(severity, detail, action) {
  return { severity, detail, action };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {{ waitForParentReport?: boolean }} [options]
 */
export async function probePageMetrics(page, url, options = {}) {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (options.waitForParentReport) {
    const heading = page.getByRole("heading", { name: /דוח להורים/u }).first();
    await heading.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
    await page
      .waitForFunction(
        (loadingText) => {
          const all = Array.from(document.querySelectorAll("body *"));
          return !all.some((el) => (el.textContent || "").includes(loadingText));
        },
        "טוען דוח...",
        { timeout: 30_000 }
      )
      .catch(() => {});
  } else {
    await page.waitForTimeout(1500);
  }

  const httpStatus = response?.status() ?? null;
  const finalUrl = page.url();

  const metrics = await page.evaluate(() => {
    const htmlDir = document.documentElement.getAttribute("dir");
    const bodyDir = document.body?.getAttribute("dir") || null;
    const htmlComputed = getComputedStyle(document.documentElement).direction;
    const bodyComputed = document.body ? getComputedStyle(document.body).direction : null;
    const rtlRoots = Array.from(document.querySelectorAll('[dir="rtl"]'));
    const rtlSubtreeCount = rtlRoots.length;
    const rtlComputedOnSubtree =
      rtlRoots[0] && rtlRoots[0] instanceof Element
        ? getComputedStyle(rtlRoots[0]).direction
        : null;
    const docEl = document.documentElement;
    const body = document.body;
    const docOverflow = docEl.scrollWidth > docEl.clientWidth + 2;
    const bodyOverflow = body ? body.scrollWidth > body.clientWidth + 2 : false;
    const overflowPx = Math.max(0, docEl.scrollWidth - docEl.clientWidth);

    const selectors =
      'button, a[href], [role="button"], input[type="submit"], input[type="button"]';
    const elements = Array.from(document.querySelectorAll(selectors));
    let smallControls = 0;
    let totalControls = 0;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 && rect.height < 2) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      totalControls += 1;
      if (rect.width < 44 || rect.height < 44) smallControls += 1;
    }

    const main =
      document.querySelector("main") ||
      document.querySelector('[class*="parent-report"]') ||
      document.querySelector('[dir="rtl"]');
    let clippedMain = false;
    if (main) {
      const r = main.getBoundingClientRect();
      clippedMain = r.right > window.innerWidth + 8 || r.left < -8;
    }

    const visibleText = (document.body?.innerText || "").slice(0, 4000);
    return {
      htmlDir,
      bodyDir,
      htmlComputed,
      bodyComputed,
      rtlSubtreeCount,
      rtlComputedOnSubtree,
      overflow: {
        document: docOverflow,
        body: bodyOverflow,
        overflowPx,
        scrollWidth: docEl.scrollWidth,
        clientWidth: docEl.clientWidth,
      },
      controls: {
        total: totalControls,
        smallerThan44px: smallControls,
      },
      clippedMain,
      visibleTextSample: visibleText,
    };
  });

  return {
    httpStatus,
    finalUrl,
    ...metrics,
  };
}

function directionSummary(metrics) {
  return {
    htmlDir: metrics.htmlDir,
    bodyDir: metrics.bodyDir,
    computedHtml: metrics.htmlComputed,
    computedBody: metrics.bodyComputed,
    rtlSubtreeCount: metrics.rtlSubtreeCount ?? 0,
    rtlComputedOnSubtree: metrics.rtlComputedOnSubtree ?? null,
  };
}

function hasRtl(direction) {
  const d = direction || {};
  return (
    d.htmlDir === "rtl" ||
    d.bodyDir === "rtl" ||
    d.computedHtml === "rtl" ||
    d.computedBody === "rtl" ||
    (d.rtlSubtreeCount ?? 0) > 0 ||
    d.rtlComputedOnSubtree === "rtl"
  );
}

function evaluatePageResult({ name, metrics, consoleErrors, authRequired, loadFailed }) {
  const blockers = [];
  const warnings = [];
  let status = "pass";

  const direction = directionSummary(metrics);
  const overflow = metrics?.overflow || {};
  const controls = metrics?.controls || { total: 0, smallerThan44px: 0 };
  const text = metrics?.visibleTextSample || "";
  const hebrewPage = HEBREW_RE.test(text);

  if (authRequired) {
    return {
      status: "not_checked",
      direction,
      overflow,
      controls,
      consoleErrors,
      blockers,
      warnings: [
        issue(
          "P1",
          `${name}: auth_required — page not checked in this MVP run.`,
          "הרץ עם credentials ב-.env.local או בדוק ידנית."
        ),
      ],
    };
  }

  if (loadFailed || metrics?.httpStatus >= 400 || !metrics) {
    status = "fail";
    blockers.push(
      issue(
        "P0",
        `${name}: page failed to load (http=${metrics?.httpStatus ?? "n/a"}).`,
        "בדוק baseUrl, deploy, או נתיב."
      )
    );
    return { status, direction, overflow, controls, consoleErrors, blockers, warnings };
  }

  if (hebrewPage && !hasRtl(direction)) {
    status = "warn";
    warnings.push(
      issue(
        "P1",
        `${name}: no document-level RTL — verify nested dir=rtl containers on Hebrew UI.`,
        "אם יש [dir=rtl] פנימי זה acceptable ב-MVP."
      )
    );
  } else if (hebrewPage && hasRtl(direction) && direction.computedHtml !== "rtl") {
    warnings.push(
      issue(
        "P1",
        `${name}: RTL via nested subtree (${direction.rtlSubtreeCount} node(s)), not html/body dir.`,
        "MVP: acceptable if Hebrew layout renders correctly."
      )
    );
  }

  const severeOverflow =
    overflow.document && (overflow.overflowPx > 24 || overflow.scrollWidth - overflow.clientWidth > 24);
  if (severeOverflow && ["home", "student_login", "parent_login", "parent_report"].includes(name)) {
    status = "fail";
    blockers.push(
      issue(
        "P0",
        `${name}: severe horizontal overflow on mobile (scrollWidth=${overflow.scrollWidth}, client=${overflow.clientWidth}).`,
        "תקן overflow-x / רוחב קונטיינר במובייל."
      )
    );
  } else if (overflow.document || overflow.body) {
    if (status === "pass") status = "warn";
    warnings.push(
      issue(
        "P1",
        `${name}: minor horizontal overflow detected on mobile.`,
        "בדוק margins/padding ברוחב 390px."
      )
    );
  }

  if (controls.smallerThan44px > 0) {
    if (status === "pass") status = "warn";
    warnings.push(
      issue(
        "P1",
        `${name}: ${controls.smallerThan44px}/${controls.total} tap targets smaller than 44×44px.`,
        "הגדל כפתורים/קישורים לנגישות מגע."
      )
    );
  }

  if (metrics.clippedMain) {
    if (status === "pass") status = "warn";
    warnings.push(
      issue(
        "P1",
        `${name}: main content area may be clipped on mobile viewport.`,
        "בדוק layout של main/report container."
      )
    );
  }

  if (name === "parent_report" && hebrewPage) {
    const readable =
      /דוח להורים|דוח מקיף|סיכום/u.test(text) || text.length > 200;
    if (!readable) {
      status = "fail";
      blockers.push(
        issue(
          "P0",
          `${name}: parent report page appears unreadable or empty on mobile.`,
          "בדוק parent-report responsive layout."
        )
      );
    }
  }

  if (consoleErrors.length > 0) {
    if (status === "pass") status = "warn";
    warnings.push(
      issue(
        "P1",
        `${name}: ${consoleErrors.length} console/page error(s) during load.`,
        "בדוק DevTools console על מובייל."
      )
    );
  }

  return { status, direction, overflow, controls, consoleErrors, blockers, warnings };
}

/**
 * Build audit report object from probed pages.
 */
export function buildMobileRtlAudit({
  date,
  baseUrl,
  viewport,
  pages,
  authNotes = [],
}) {
  const blockers = [];
  const warnings = [
    {
      severity: "P1",
      detail:
        "Mobile + RTL MVP — viewport יחיד (iPhone 12 390×844); לא נבדקו sessions מלאות, persistence, או recovery.",
      action: "E9B/E9C יוסיפו persistence ו-failure recovery.",
    },
  ];

  for (const note of authNotes) {
    warnings.push({
      severity: "P1",
      detail: note,
      action: "הגדר credentials ב-.env.local לבדיקות מלאות יותר.",
    });
  }

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let notCheckedCount = 0;

  for (const p of pages) {
    for (const b of p.blockers || []) blockers.push({ ...b, source: p.url });
    for (const w of p.warnings || []) warnings.push({ ...w, source: p.url });

    if (p.status === "pass") passCount += 1;
    else if (p.status === "warn") warnCount += 1;
    else if (p.status === "fail") failCount += 1;
    else notCheckedCount += 1;
  }

  let overallStatus = "pass";
  if (pages.length === 0) overallStatus = "not_run";
  else if (blockers.length > 0) overallStatus = "fail";
  else if (failCount > 0) overallStatus = "fail";
  else if (warnCount > 0 || notCheckedCount > 0) overallStatus = "warn";

  const checked = pages.filter((p) => p.checked).map((p) => p.name).join(", ");
  const summary =
    `Mobile RTL MVP (${viewport.label} ${viewport.width}×${viewport.height}): ` +
    `${pages.length} pages, checked=[${checked || "—"}], ` +
    `pass=${passCount} warn=${warnCount} fail=${failCount} not_checked=${notCheckedCount} — overallStatus=${overallStatus}.`;

  return {
    date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    baseUrl,
    viewport,
    overallStatus,
    blockers,
    warnings,
    pages,
    summary,
  };
}

export function buildMobileRtlMarkdown(report) {
  const lines = [];
  lines.push(`# Mobile + RTL Audit (E9A MVP) — ${report.date}`);
  lines.push("");
  lines.push(`- **overallStatus:** ${report.overallStatus}`);
  lines.push(`- **baseUrl:** ${report.baseUrl}`);
  lines.push(
    `- **viewport:** ${report.viewport?.label} (${report.viewport?.width}×${report.viewport?.height})`
  );
  lines.push(`- **pages:** ${report.pages?.length ?? 0}`);
  lines.push(`- **blockers:** ${report.blockers?.length ?? 0}`);
  lines.push(`- **warnings:** ${report.warnings?.length ?? 0}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(report.summary || "—");
  lines.push("");

  if (report.blockers?.length) {
    lines.push("## Blockers (P0)");
    for (const b of report.blockers) {
      lines.push(`- ${b.detail}`);
    }
    lines.push("");
  }

  lines.push("## Pages");
  for (const p of report.pages || []) {
    lines.push(`### ${p.name} — ${p.status}`);
    lines.push(`- url: ${p.url}`);
    lines.push(`- checked: ${p.checked}`);
    if (p.httpStatus != null) lines.push(`- http: ${p.httpStatus}`);
    lines.push(`- direction: ${JSON.stringify(p.direction)}`);
    lines.push(`- overflow: ${JSON.stringify(p.overflow)}`);
    lines.push(`- controls: ${JSON.stringify(p.controls)}`);
    lines.push(`- consoleErrors: ${p.consoleErrors?.length ?? 0}`);
    if (p.screenshotPath) lines.push(`- screenshot: ${p.screenshotPath}`);
    lines.push("");
  }

  lines.push("## Limitations (MVP)");
  lines.push("- viewport יחיד; לא Android/tablet מלא");
  lines.push("- לא נבדקו learning sessions / typing במובייל");
  lines.push("- דפים שדורשים auth מסומנים not_checked אם אין credentials");

  return lines.join("\n");
}

export { evaluatePageResult, directionSummary, hasRtl };
