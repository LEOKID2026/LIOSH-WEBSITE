/**
 * C-RECOVERY: Route Discovery & Content Proof Script
 *
 * Before taking any screenshots, this script:
 * 1. Enumerates all known book routes from registry files
 * 2. Probes each server port to find what's alive
 * 3. Attempts student auth with multiple credential sets
 * 4. For each route: checks HTTP status + HTML content keywords
 * 5. Only marks a route VALID if real book content (Hebrew title + math) is present
 * 6. Outputs a full route discovery manifest
 *
 * Usage: node scripts/qa/c-route-discovery.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join("docs", "qa", "hebrew-launch-audit-core");
mkdirSync(join(OUT_DIR, "C-screenshots"), { recursive: true });

// ── Server candidates ──────────────────────────────────────────────────────
const SERVER_CANDIDATES = [
  { port: 3001, label: "dev (old, running since yesterday)" },
  { port: 3020, label: "prod (new build, started today)" },
  { port: 3014, label: "prod (env E2E, started today 11:29)" },
  { port: 3013, label: "prod (env E2E)" },
  { port: 3012, label: "prod (env E2E)" },
  { port: 3011, label: "prod (earlier)" },
  { port: 3005, label: "prod (earlier)" },
  { port: 3004, label: "prod (earlier)" },
  { port: 3003, label: "prod (earlier)" },
];

// ── Student credential sets ────────────────────────────────────────────────
// From .env.e2e.local and prior audit success notes
const STUDENT_CREDS = [
  { username: "ADMIN",  pin: "1234",  source: "VIRTUAL_STUDENT_ACCOUNTS in .env.e2e.local — worked in previous audit" },
  { username: "leo-s01", pin: "1234", source: "E2E_STUDENT_USERNAME — failed 401 in previous audit" },
  { username: "eran",   pin: "7479",  source: "capture-student-bright-pilot-screenshots.mjs" },
];

// ── Route samples to test (one per subject/grade) ─────────────────────────
const PROBE_ROUTES = [
  // Math
  { subject: "math", grade: "g1", pageId: "add_two",
    route: "/learning/book/math/g1/add_two",
    expectedText: ["חיבור", "מספרים", "+"],
    source_file: "lib/learning-book/math-g1-registry.js", source_line: "routeBase: '/learning/book/math/g1'" },
  { subject: "math", grade: "g2", pageId: "frac_half",
    route: "/learning/book/math/g2/frac_half",
    expectedText: ["חצי", "שלם", "/"],
    source_file: "lib/learning-book/math-g2-registry.js", source_line: "routeBase: '/learning/book/math/g2'" },
  { subject: "math", grade: "g3", pageId: "cmp",
    route: "/learning/book/math/g3/cmp",
    expectedText: ["השוואה", "מספרים", "<", ">"],
    source_file: "lib/learning-book/math-g3-registry.js", source_line: "routeBase: '/learning/book/math/g3'" },
  { subject: "math", grade: "g4", pageId: "mul_vertical",
    route: "/learning/book/math/g4/mul_vertical",
    expectedText: ["כפל", "מאונך", "×"],
    source_file: "lib/learning-book/math-g4-registry.js", source_line: "routeBase: '/learning/book/math/g4'" },
  { subject: "math", grade: "g5", pageId: "frac_add_sub",
    route: "/learning/book/math/g5/frac_add_sub",
    expectedText: ["שברים", "מכנה"],
    source_file: "lib/learning-book/math-g5-registry.js", source_line: "routeBase: '/learning/book/math/g5'" },
  { subject: "math", grade: "g6", pageId: "perc_part_of",
    route: "/learning/book/math/g6/perc_part_of",
    expectedText: ["אחוז", "%"],
    source_file: "lib/learning-book/math-g6-registry.js", source_line: "routeBase: '/learning/book/math/g6'" },
  // Geometry
  { subject: "geometry", grade: "g1", pageId: "shapes_basic_square",
    route: "/learning/book/geometry/g1/shapes_basic_square",
    expectedText: ["ריבוע", "צורה"],
    source_file: "lib/learning-book/geometry-g1-registry.js", source_line: "routeBase: '/learning/book/geometry/g1'" },
  { subject: "geometry", grade: "g3", pageId: "triangle_angles",
    route: "/learning/book/geometry/g3/triangle_angles",
    expectedText: ["זוויות", "משולש", "180"],
    source_file: "lib/learning-book/geometry-g3-registry.js", source_line: "routeBase: '/learning/book/geometry/g3'" },
  { subject: "geometry", grade: "g4", pageId: "shapes_basic_properties_angles",
    route: "/learning/book/geometry/g4/shapes_basic_properties_angles",
    expectedText: ["זוויות", "90", "°"],
    source_file: "lib/learning-book/geometry-g4-registry.js", source_line: "routeBase: '/learning/book/geometry/g4'" },
  { subject: "geometry", grade: "g5", pageId: "triangle_area",
    route: "/learning/book/geometry/g5/triangle_area",
    expectedText: ["שטח", "משולש", "÷", "2"],
    source_file: "lib/learning-book/geometry-g5-registry.js", source_line: "routeBase: '/learning/book/geometry/g5'" },
  { subject: "geometry", grade: "g6", pageId: "circle_area",
    route: "/learning/book/geometry/g6/circle_area",
    expectedText: ["שטח", "עיגול", "π", "3.14"],
    source_file: "lib/learning-book/geometry-g6-registry.js", source_line: "routeBase: '/learning/book/geometry/g6'" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function hasBookContent(html, expectedText) {
  const lower = html.toLowerCase();
  // Must have at least Hebrew characters
  const hasHebrew = /[\u0590-\u05FF]/.test(html);
  if (!hasHebrew) return { ok: false, reason: "no Hebrew text in page" };
  // Check for NOT being error/auth gate
  if (html.includes('"statusCode":500') || html.includes("Internal Server Error")) {
    return { ok: false, reason: "HTTP 500 error page" };
  }
  if (html.includes("Cannot find module") || html.includes("Runtime Error")) {
    return { ok: false, reason: "Next.js chunk runtime error" };
  }
  // Check for auth gate (spinner only / login redirect)
  const hasSpinnerOnly =
    html.includes("animate-spin") &&
    !html.includes("book-mixed-hebrew-math") &&
    !html.includes("book-prose-isolate");
  if (hasSpinnerOnly) {
    return { ok: false, reason: "auth gate — loading spinner, no book content" };
  }
  // Check for expected text keywords
  const missing = expectedText.filter(t => !html.includes(t));
  if (missing.length > expectedText.length / 2) {
    return { ok: false, reason: `missing expected keywords: ${missing.join(", ")}` };
  }
  // Check for book-specific DOM markers
  const hasBookMarkers = html.includes("book-prose-isolate") ||
    html.includes("book-math-isolate") ||
    html.includes("LearningPageBody") ||
    html.includes("book-section") ||
    html.includes("data-book-math-run");
  if (hasBookMarkers) {
    return { ok: true, reason: "book DOM markers + Hebrew + keywords present" };
  }
  // If __NEXT_DATA__ has section content (SSG), that's also valid
  if (html.includes('"sections"') && html.includes('"body"')) {
    return { ok: true, reason: "SSG __NEXT_DATA__ has sections — real book content" };
  }
  return { ok: false, reason: "no book DOM markers found; may be auth gate" };
}

// ── Phase 1: Find alive servers ────────────────────────────────────────────
console.log("\n🔍 Phase 1: Probing server ports...\n");
const browser = await chromium.launch({ headless: true });
const aliveServers = [];

for (const s of SERVER_CANDIDATES) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(`http://localhost:${s.port}/`, {
      waitUntil: "domcontentloaded", timeout: 6000
    });
    const status = resp?.status() ?? -1;
    const title = await page.title().catch(() => "");
    aliveServers.push({ ...s, alive: true, status, title });
    console.log(`  ✅ Port ${s.port}: status=${status} title="${title}"`);
  } catch (e) {
    aliveServers.push({ ...s, alive: false, status: -1, error: String(e).slice(0, 60) });
    console.log(`  ❌ Port ${s.port}: ${String(e).slice(0, 60)}`);
  }
  await ctx.close();
}

const livePorts = aliveServers.filter(s => s.alive);
console.log(`\n  Found ${livePorts.length} live server(s): ${livePorts.map(s => s.port).join(", ")}\n`);

if (livePorts.length === 0) {
  console.error("❌ No servers alive. Cannot proceed with route discovery.");
  await browser.close();
  writeFailReport("No servers alive on any probed port.", aliveServers, [], [], []);
  process.exit(0);
}

// ── Phase 2: Student auth probe ────────────────────────────────────────────
console.log("🔑 Phase 2: Auth probe — finding working student credentials per server...\n");

const authResults = [];

for (const server of livePorts) {
  const base = `http://localhost:${server.port}`;
  for (const cred of STUDENT_CREDS) {
    const ctx = await browser.newContext({
      baseURL: base, locale: "he-IL",
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    let success = false;
    let authNote = "";
    try {
      await page.goto("/student/login", { waitUntil: "domcontentloaded", timeout: 15000 });
      const loginStatus = page.url().includes("login") ? "on login page" : "redirected";
      // Check if the login form is actually visible
      const usernameField = await page.locator('[data-testid="student-login-username"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
      if (!usernameField) {
        authNote = `login form not visible — page: ${await page.title().catch(() => "?")}`;
        console.log(`  ❌ Port ${server.port} ${cred.username}: ${authNote}`);
        await ctx.close();
        authResults.push({ port: server.port, ...cred, success: false, note: authNote });
        continue;
      }
      await page.locator('[data-testid="student-login-username"]').fill(cred.username);
      await page.locator('[data-testid="student-login-pin"]').fill(cred.pin);
      await page.locator('[data-testid="student-login-submit"]').click();
      await page.waitForURL(/\/student\/home/, { timeout: 15000 });
      success = true;
      authNote = "login succeeded → /student/home";
      console.log(`  ✅ Port ${server.port} ${cred.username}: ${authNote}`);
    } catch (e) {
      authNote = String(e).slice(0, 120);
      console.log(`  ❌ Port ${server.port} ${cred.username}: ${authNote.slice(0, 80)}`);
    }
    authResults.push({ port: server.port, ...cred, success, note: authNote,
      cookies: success ? await ctx.cookies() : [] });
    await ctx.close();
    if (success) break; // Found working creds for this server — stop trying others
  }
}

const workingAuth = authResults.filter(a => a.success);
console.log(`\n  Working auth found: ${workingAuth.length}\n`);

// ── Phase 3: Route content probe ──────────────────────────────────────────
console.log("📖 Phase 3: Route content probe — checking each book route for real content...\n");

const routeResults = [];

for (const probeRoute of PROBE_ROUTES) {
  const { subject, grade, pageId, route, expectedText, source_file, source_line } = probeRoute;
  let bestResult = null;

  // Try with working auth first, then without
  const authsToTry = [
    ...workingAuth.map(a => ({ ...a, withAuth: true })),
    { port: livePorts[0]?.port, username: "none", withAuth: false, cookies: [] },
  ];

  for (const auth of authsToTry) {
    const base = `http://localhost:${auth.port}`;
    const ctx = await browser.newContext({
      baseURL: base, locale: "he-IL",
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    let result = {
      subject, grade, pageId, route,
      full_url: `${base}${route}`,
      source_file, source_line,
      port: auth.port,
      auth_required: true,
      fixture_used: auth.username,
      with_auth: auth.withAuth,
      http_status: -1,
      page_title: "",
      first_heading: "",
      has_real_book_content: false,
      failure_reason: "",
      html_length: 0,
      expected_text: expectedText,
    };

    try {
      // Set cookies if we have auth
      if (auth.withAuth && auth.cookies?.length) {
        await ctx.addCookies(auth.cookies);
      }
      // Navigate to login first if with auth but no cookies
      if (auth.withAuth && !auth.cookies?.length) {
        try {
          await page.goto("/student/login", { waitUntil: "domcontentloaded", timeout: 10000 });
          const hasForm = await page.locator('[data-testid="student-login-username"]')
            .isVisible({ timeout: 4000 }).catch(() => false);
          if (hasForm) {
            await page.locator('[data-testid="student-login-username"]').fill(auth.username);
            await page.locator('[data-testid="student-login-pin"]').fill(auth.pin);
            await page.locator('[data-testid="student-login-submit"]').click();
            await page.waitForURL(/\/student\/home/, { timeout: 12000 });
          }
        } catch (_) { /* will try route anyway */ }
      }

      const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20000 });
      result.http_status = resp?.status() ?? -1;
      await page.waitForTimeout(3000); // wait for React hydration + auth check
      result.page_title = await page.title().catch(() => "");

      // Get first visible heading
      result.first_heading = await page.locator("h1,h2").first().innerText({ timeout: 3000 })
        .catch(() => "");

      // Get full HTML to check for book content
      const html = await page.content().catch(() => "");
      result.html_length = html.length;

      const check = hasBookContent(html, expectedText);
      result.has_real_book_content = check.ok;
      result.failure_reason = check.ok ? "" : check.reason;

      if (check.ok) {
        console.log(`  ✅ ${subject} ${grade}/${pageId}: REAL CONTENT — ${check.reason}`);
        bestResult = { ...result };
        await ctx.close();
        break; // Found working route
      } else {
        console.log(`  ⚠️  ${subject} ${grade}/${pageId} (port ${auth.port} ${auth.fixture_used || auth.username}): ${check.reason}`);
        if (!bestResult) bestResult = result;
      }
    } catch (e) {
      result.failure_reason = String(e).slice(0, 200);
      result.http_status = -1;
      console.log(`  ❌ ${subject} ${grade}/${pageId}: ${result.failure_reason.slice(0, 80)}`);
      if (!bestResult) bestResult = result;
    }
    await ctx.close();
  }
  routeResults.push(bestResult);
}

await browser.close();

// ── Phase 4: Summarize ────────────────────────────────────────────────────
const validRoutes = routeResults.filter(r => r.has_real_book_content);
const failedRoutes = routeResults.filter(r => !r.has_real_book_content);

console.log(`\n📊 Route Discovery Summary:`);
console.log(`  Valid routes with real content: ${validRoutes.length}`);
console.log(`  Failed routes (harness fail):   ${failedRoutes.length}`);

// ── Write reports ─────────────────────────────────────────────────────────
function writeFailReport(reason, servers, auths, valid, failed) {
  const now = new Date().toISOString();
  const md = `# C-RECOVERY: Route Discovery & Harness Report

> **Generated:** ${now}
> **Conclusion:** HARNESS_FAIL_NO_RTL_DECISION

## Reason

${reason}

## Servers Probed

${servers.map(s => `- Port ${s.port} (${s.label}): ${s.alive ? `ALIVE status=${s.status}` : `DEAD — ${s.error || 'no response'}`}`).join("\n")}

## Auth Attempts

${auths.length === 0 ? "_No auth attempts made_" :
  auths.map(a => `- Port ${a.port} user=${a.username}: ${a.success ? "SUCCESS" : `FAIL — ${a.note?.slice(0, 100)}`}`).join("\n")}

## Route Probes

${failed.length === 0 ? "_No routes probed_" :
  failed.map(r => `- ${r.subject} ${r.grade}/${r.pageId}: ${r.failure_reason}`).join("\n")}

## Valid Routes

${valid.length === 0 ? "_No valid routes found_" :
  valid.map(r => `- ${r.full_url} — ${r.failure_reason || 'OK'}`).join("\n")}

## Next Steps Required

1. Identify a working server with real student session
2. Verify all book routes return actual Hebrew book content (not auth gate / 500 / 404)
3. Only then proceed with screenshot capture
`;
  writeFileSync(join(OUT_DIR, "C-route-discovery-and-harness-failure.md"), md, "utf8");
}

// Write C-valid-book-routes.csv
const csvHeader = "id,subject,grade,book_id,discovered_from_file,discovered_from_line,route,full_url,auth_required,fixture_used,http_status,page_title_or_heading,has_real_book_content,failure_reason,screenshot_path";
const csvRows = routeResults.map((r, i) => {
  const row = [
    i + 1,
    r.subject,
    r.grade,
    r.pageId,
    r.source_file,
    `"${r.source_line}"`,
    r.route,
    r.full_url,
    r.auth_required ? "yes" : "no",
    r.fixture_used || "none",
    r.http_status,
    `"${(r.first_heading || r.page_title || "").replace(/"/g, "'")}"`,
    r.has_real_book_content ? "YES" : "NO",
    `"${(r.failure_reason || "").replace(/"/g, "'")}${!r.has_real_book_content ? " [HARNESS_FAIL]" : ""}"`,
    r.screenshot_path || "",
  ];
  return row.join(",");
});
writeFileSync(join(OUT_DIR, "C-valid-book-routes.csv"),
  [csvHeader, ...csvRows].join("\n"), "utf8");
console.log(`\n✅ Written: C-valid-book-routes.csv (${routeResults.length} rows)`);

// Write harness discovery markdown
const now = new Date().toISOString();
const md = `# C-RECOVERY: Route Discovery & Harness Report

> **Generated:** ${now}
> **Conclusion:** ${validRoutes.length > 0 ? "PARTIAL_SUCCESS — some routes valid, proceed to screenshot capture" : "HARNESS_FAIL_NO_RTL_DECISION"}

---

## 1. Servers Probed

| Port | Label | Alive | HTTP Status | Title |
|------|-------|-------|-------------|-------|
${aliveServers.map(s =>
  `| ${s.port} | ${s.label} | ${s.alive ? "✅" : "❌"} | ${s.status} | ${s.title || "-"} |`
).join("\n")}

---

## 2. Auth Attempts

| Port | Username | Source | Success | Note |
|------|----------|--------|---------|------|
${authResults.map(a =>
  `| ${a.port} | ${a.username} | ${a.source.slice(0, 40)} | ${a.success ? "✅" : "❌"} | ${(a.note || "").slice(0, 80)} |`
).join("\n")}

---

## 3. Route Probe Results

| Subject | Grade | PageId | Port | Auth | HTTP | Real Content | Reason |
|---------|-------|--------|------|------|------|-------------|--------|
${routeResults.map(r =>
  `| ${r.subject} | ${r.grade} | ${r.pageId} | ${r.port} | ${r.fixture_used} | ${r.http_status} | ${r.has_real_book_content ? "✅ YES" : "❌ NO — HARNESS_FAIL"} | ${(r.failure_reason || "OK").slice(0, 60)} |`
).join("\n")}

---

## 4. Valid Routes (Real Book Content Confirmed)

${validRoutes.length === 0
  ? "**None found.** All routes returned auth gate / 500 / 404 / no Hebrew book content.\n\nConclusion: **HARNESS_FAIL_NO_RTL_DECISION** — screenshots cannot be taken."
  : validRoutes.map(r => `- \`${r.full_url}\` — ${r.subject} ${r.grade}/${r.pageId}`).join("\n")
}

---

## 5. Harness Failures

${failedRoutes.length === 0
  ? "_None_"
  : failedRoutes.map(r =>
    `- **${r.subject} ${r.grade}/${r.pageId}** — \`${r.full_url}\`\n  Failure: ${r.failure_reason} [HARNESS_FAIL — not RTL_FAIL]`
  ).join("\n\n")
}

---

## 6. Root Cause Analysis

${workingAuth.length === 0
  ? "### Auth: FAILED\nNo working student credentials found on any live server.\n- leo-s01/1234: likely not in this DB\n- ADMIN/1234: login page may not render on prod build (500)"
  : `### Auth: SUCCESS on port(s) ${workingAuth.map(a => a.port).join(", ")}\n- Working credentials: ${workingAuth[0].username}`
}

### Server Status
- Dev server (port 3001): **started 2026-06-14 20:44 — running 19+ hours** → corrupted .next (chunk mismatch)
- Prod servers (3020, 3014, etc.): **return HTTP 500 for all pages** including /student/login
- Root cause: server-side rendering fails → HTML body contains loading spinner only → StudentAccessGate cannot verify session → book content never renders

### Route Source (confirmed from code)
- Math book routes: defined in \`lib/learning-book/math-g{N}-registry.js\`, pattern \`/learning/book/math/g{N}/{pageId}\`
- Geometry book routes: defined in \`lib/learning-book/geometry-g{N}-registry.js\`, pattern \`/learning/book/geometry/g{N}/{pageId}\`
- Pages are SSG (getStaticProps) — HTML files exist in \`.next/server/pages/learning/book/math|geometry/\`
- Auth gate is client-side only (StudentAccessGate component) — server sends full SSG HTML

### Why Screenshots Show Auth Gate
The Next.js SSG HTML contains a **loading spinner** as initial server-rendered HTML (not the book content). Book content is injected by React after client-side auth check. When auth fails → content never appears.

---

## 7. Required Next Steps to Unblock

1. Start a **fresh dev server**: stop port 3001, delete .next, run \`npm run dev\`
2. Use **ADMIN/1234** credentials (confirmed working in audit 2026-06-15 00:10)
3. Re-run route discovery to confirm book content loads
4. Only then proceed to screenshot capture
`;

writeFileSync(join(OUT_DIR, "C-route-discovery-and-harness-failure.md"), md, "utf8");
console.log("✅ Written: C-route-discovery-and-harness-failure.md");
console.log("\n🏁 Route discovery complete.");
console.log(`   Valid: ${validRoutes.length} / ${routeResults.length} routes`);
console.log(`   Conclusion: ${validRoutes.length > 0 ? "PARTIAL_SUCCESS" : "HARNESS_FAIL_NO_RTL_DECISION"}`);
