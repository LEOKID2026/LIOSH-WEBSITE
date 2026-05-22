/**
 * Phase D2 — Daily preflight (lightweight runtime guard).
 *
 * Purpose:
 *   Before a nightly Phase D2 run does anything destructive (i.e. drives
 *   real persisted learning sessions), confirm that the four
 *   prerequisites the daily run depends on are satisfied. If any of the
 *   four checks fails, the daily run aborts BEFORE driving any UI and
 *   BEFORE advancing the longitudinal state — the operator can fix the
 *   underlying issue and rerun safely with --force.
 *
 * The four checks (per plan §2):
 *   1. Parent (admin@admin.com) can log in via real /parent/login UI.
 *   2. /api/parent/list-students returns AT LEAST the 12 expected
 *      AAA students. Extras are allowed and must NOT fail the run.
 *   3. Each AAA1..AAA12 has a non-empty `full_name` AND `grade_level`
 *      in the list-students payload.
 *   4. Each AAA1..AAA12 can log in via real /student/login UI (one
 *      sequential login per student, fresh browser context each, then
 *      context closed).
 *
 * Reuse contract — this module is INTENTIONALLY thin:
 *   - Parent UI login: reuses authenticateParent() from parent-auth.mjs.
 *   - list-students fetch: same pattern Phase D's
 *     readParentLinkedStudents() uses (navigate to /parent/dashboard,
 *     wait for the page's own real-fetch response).
 *   - Per-student UI login: reuses authenticateStudent() from
 *     student-auth.mjs.
 *
 * What this module DOES NOT do:
 *   - No DOM assertions on the parent dashboard beyond the
 *     list-students response.
 *   - No report navigation, no report DOM checks.
 *   - No cross-student bleed checks.
 *   - No /api/learning/* calls.
 *   - No state advancement (the orchestrator decides that, and it
 *     never advances on a FAIL).
 *
 * Sequential, fresh-context-per-student execution by design — concurrent
 * students would tangle dashboard sessions and would also generate burst
 * Vercel traffic that the project explicitly forbids.
 */
import {
  launchBrowser,
  newStudentContext,
} from "./browser.mjs";
import { authenticateParent } from "./parent-auth.mjs";
import { authenticateStudent } from "./student-auth.mjs";

const PARENT_DASHBOARD_PATH = "/parent/dashboard";
const PARENT_LIST_STUDENTS_PATH = "/api/parent/list-students";

/**
 * Run all four preflight checks. Returns a structured report.
 *
 * @param {object} args
 * @param {import("playwright").Browser} args.browser
 * @param {string} args.baseUrl
 * @param {{label, email, password}} args.parentAccount
 * @param {"ui"|"token"} args.parentAuthMode
 * @param {"ui"|"api"} args.studentAuthMode
 * @param {string[]} args.expectedStudentLabels  - e.g. ['AAA1', .., 'AAA12']
 * @param {Map<string, {label, username, code, pin}>} args.accountsByLabel
 * @param {(line: string) => void} args.log
 * @returns {Promise<PreflightReport>}
 */
export async function runDailyPreflight({
  browser,
  baseUrl,
  parentAccount,
  parentAuthMode = "ui",
  studentAuthMode = "ui",
  expectedStudentLabels,
  accountsByLabel,
  log,
}) {
  const startedAt = Date.now();
  const report = {
    passed: false,
    parent: null,
    listStudents: null,
    students: [],
    errors: [],
    durationMs: 0,
  };

  // ---- Check 1: parent UI login ----------------------------------------
  // Reuse the existing parent-auth helper. It throws on any failure
  // (form not rendered, dashboard URL never reached, etc.). We catch
  // and translate the throw into a structured failure record so the
  // orchestrator can surface the message in the daily artifact.
  let parentContext = null;
  let parentPage = null;
  try {
    parentContext = await newStudentContext(browser);
    parentPage = await parentContext.newPage();
    const parentStartedAt = Date.now();
    const authResult = await authenticateParent({
      context: parentContext,
      page: parentPage,
      account: parentAccount,
      baseUrl,
      mode: parentAuthMode,
      log,
    });
    report.parent = {
      ok: true,
      mode: authResult.mode,
      partial: !!authResult.partial,
      alreadyAuthenticated: !!authResult.alreadyAuthenticated,
      durationMs: Date.now() - parentStartedAt,
    };
    log?.(
      `preflight: parent OK (mode=${authResult.mode}` +
        `${authResult.partial ? ", partial" : ""}, ` +
        `${report.parent.durationMs}ms)`
    );
  } catch (error) {
    report.parent = {
      ok: false,
      mode: parentAuthMode,
      error: String(error?.message || error).slice(0, 400),
      durationMs: Date.now() - startedAt,
    };
    report.errors.push(`parent-login: ${report.parent.error}`);
    log?.(`preflight: parent FAIL — ${report.parent.error}`);
    // No point doing list-students or per-student logins if the parent
    // cannot even log in. Close context and bail out early.
    await safeClose(parentContext);
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  // ---- Checks 2 + 3: list-students returns ≥ expected, with metadata --
  let parentLinkedStudents = [];
  try {
    const lsStartedAt = Date.now();
    parentLinkedStudents = await readListStudentsFromDashboard({
      page: parentPage,
      baseUrl,
      log,
    });
    // Match Phase D's existing case-insensitive lookup (login_username
    // values can be stored either capitalized or lowercased depending on
    // how the operator created the row — Phase D / Phase D2 orchestrators
    // already normalize, so we do the same here for consistency).
    const labelsInListNormalized = new Set(
      parentLinkedStudents
        .map((s) => String(s?.login_username || "").toLowerCase().trim())
        .filter(Boolean)
    );
    const labelsInListRaw = parentLinkedStudents
      .map((s) => String(s?.login_username || "").trim())
      .filter(Boolean);
    const missingLabels = expectedStudentLabels.filter(
      (label) => !labelsInListNormalized.has(String(label).toLowerCase().trim())
    );
    const missingMetadata = [];
    for (const expected of expectedStudentLabels) {
      const want = String(expected).toLowerCase().trim();
      const row = parentLinkedStudents.find(
        (s) => String(s?.login_username || "").toLowerCase().trim() === want
      );
      if (!row) continue;
      if (!String(row.full_name || "").trim()) {
        missingMetadata.push({ label: expected, missing: "full_name" });
      }
      if (!String(row.grade_level || "").trim()) {
        missingMetadata.push({ label: expected, missing: "grade_level" });
      }
    }
    const ok = missingLabels.length === 0 && missingMetadata.length === 0;
    report.listStudents = {
      ok,
      totalCount: parentLinkedStudents.length,
      expectedCount: expectedStudentLabels.length,
      // Extra students in the parent's roster are explicitly allowed.
      extras: Math.max(0, parentLinkedStudents.length - expectedStudentLabels.length),
      missingLabels,
      missingMetadata,
      durationMs: Date.now() - lsStartedAt,
    };
    if (!ok) {
      const issues = [];
      if (missingLabels.length > 0) {
        issues.push(`missing labels: ${missingLabels.join(", ")}`);
      }
      if (missingMetadata.length > 0) {
        issues.push(
          "missing metadata: " +
            missingMetadata
              .map((m) => `${m.label}.${m.missing}`)
              .join(", ")
        );
      }
      const dashboardLabelsForDiag =
        labelsInListRaw.length > 0
          ? labelsInListRaw.slice(0, 24).join(", ") +
            (labelsInListRaw.length > 24 ? `, +${labelsInListRaw.length - 24} more` : "")
          : "(none)";
      const msg =
        `list-students: ${issues.join("; ")} ` +
        `(dashboard returned login_usernames=[${dashboardLabelsForDiag}])`;
      report.errors.push(msg);
      log?.(`preflight: list-students FAIL — ${msg}`);
    } else {
      log?.(
        `preflight: list-students OK (parent owns ${report.listStudents.totalCount} ` +
          `student(s), ${report.listStudents.extras} extra beyond AAA1..AAA12, ` +
          `${report.listStudents.durationMs}ms)`
      );
    }
  } catch (error) {
    const msg = String(error?.message || error).slice(0, 400);
    report.listStudents = {
      ok: false,
      totalCount: 0,
      expectedCount: expectedStudentLabels.length,
      extras: 0,
      missingLabels: expectedStudentLabels.slice(),
      missingMetadata: [],
      error: msg,
      durationMs: Date.now() - startedAt,
    };
    report.errors.push(`list-students: ${msg}`);
    log?.(`preflight: list-students FAIL — ${msg}`);
  } finally {
    await safeClose(parentContext);
    parentContext = null;
    parentPage = null;
  }

  // If parent login or list-students failed, skip the per-student login
  // probe — the operator already has enough information to fix the
  // underlying issue, and there's no point burning ~12x context launches
  // when the dashboard contract is broken.
  if (!report.parent.ok || !report.listStudents.ok) {
    report.passed = false;
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  // ---- Check 4: per-student login probe --------------------------------
  // Sequential, fresh-context-per-student. No /learning/* navigation, no
  // /api/student/me — authenticateStudent() throws if the student fails
  // to reach /student/home, which is exactly the "can the AAA student
  // log in?" signal the preflight needs.
  for (const label of expectedStudentLabels) {
    const account = accountsByLabel.get(label);
    if (!account) {
      const msg = `no credentials loaded for label=${label}`;
      report.students.push({
        label,
        ok: false,
        error: msg,
        durationMs: 0,
      });
      report.errors.push(`student-login(${label}): ${msg}`);
      log?.(`preflight: student ${label} FAIL — ${msg}`);
      continue;
    }
    let ctx = null;
    const stStartedAt = Date.now();
    try {
      ctx = await newStudentContext(browser);
      const page = await ctx.newPage();
      await authenticateStudent({
        context: ctx,
        page,
        account,
        baseUrl,
        mode: studentAuthMode,
        log: () => {
          // Silence per-student inner logs; the helper prints navigation
          // detail that's noise during preflight. We still want top-level
          // preflight log lines, so we use the outer `log` for those.
        },
      });
      report.students.push({
        label,
        ok: true,
        mode: studentAuthMode,
        durationMs: Date.now() - stStartedAt,
      });
      log?.(
        `preflight: student ${label} OK (${Date.now() - stStartedAt}ms)`
      );
    } catch (error) {
      const msg = String(error?.message || error).slice(0, 400);
      report.students.push({
        label,
        ok: false,
        error: msg,
        durationMs: Date.now() - stStartedAt,
      });
      report.errors.push(`student-login(${label}): ${msg}`);
      log?.(`preflight: student ${label} FAIL — ${msg}`);
    } finally {
      await safeClose(ctx);
    }
  }

  // ---- Final pass/fail verdict -----------------------------------------
  const allStudentsOk =
    report.students.length === expectedStudentLabels.length &&
    report.students.every((s) => s.ok === true);
  report.passed =
    report.parent.ok && report.listStudents.ok && allStudentsOk;
  report.durationMs = Date.now() - startedAt;
  return report;
}

/**
 * Convenience wrapper: launches a browser, runs preflight, closes the
 * browser. Used by run.mjs's --preflight-only path. Callers that
 * already have a browser (e.g. the D2.3+ orchestrator's full-run path)
 * should call runDailyPreflight() directly instead.
 */
export async function runStandaloneDailyPreflight({
  baseUrl,
  parentAccount,
  parentAuthMode = "ui",
  studentAuthMode = "ui",
  expectedStudentLabels,
  accountsByLabel,
  headed = false,
  log,
}) {
  const browser = await launchBrowser({ headed });
  try {
    return await runDailyPreflight({
      browser,
      baseUrl,
      parentAccount,
      parentAuthMode,
      studentAuthMode,
      expectedStudentLabels,
      accountsByLabel,
      log,
    });
  } finally {
    try {
      await browser.close();
    } catch {
      // best-effort
    }
  }
}

/**
 * Read /api/parent/list-students by navigating the (already-authed)
 * parent page to /parent/dashboard and capturing the page's own real
 * fetch response. Same pattern phase-d-orchestrator.mjs uses, copied
 * here to avoid creating a new cross-orchestrator dependency.
 */
async function readListStudentsFromDashboard({ page, baseUrl, log }) {
  const target = new URL(PARENT_DASHBOARD_PATH, baseUrl).toString();
  const respPromise = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      r.url().includes(PARENT_LIST_STUDENTS_PATH),
    { timeout: 30_000 }
  );
  log?.(
    `preflight: navigating parent to ${target} to trigger list-students fetch`
  );
  await page.goto(target, { waitUntil: "domcontentloaded" });

  let resp;
  try {
    resp = await respPromise;
  } catch (error) {
    throw new Error(
      `${PARENT_LIST_STUDENTS_PATH} response wait timed out — ${
        error?.message || error
      }`
    );
  }
  const status = resp.status();
  if (status !== 200) {
    let bodyText = "";
    try {
      bodyText = await resp.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${PARENT_LIST_STUDENTS_PATH} returned status=${status}` +
        (bodyText ? ` body=${bodyText.slice(0, 200)}` : "")
    );
  }
  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  return Array.isArray(body?.students) ? body.students : [];
}

async function safeClose(ctx) {
  if (!ctx) return;
  try {
    await ctx.close();
  } catch {
    // best-effort
  }
}

/**
 * Render a one-screen Markdown summary of a preflight report. Used by
 * the daily artifact writer.
 */
export function renderPreflightMarkdown(report, { expectedStudentLabels } = {}) {
  const lines = [];
  lines.push(`## Preflight (${report.durationMs} ms total)`);
  lines.push("");
  lines.push(
    `- overall: \`${report.passed ? "PASS" : "FAIL"}\``
  );
  if (report.parent) {
    lines.push(
      `- parent login: \`${report.parent.ok ? "OK" : "FAIL"}\` ` +
        `(mode=\`${report.parent.mode}\`` +
        `${report.parent.partial ? ", partial" : ""}, ` +
        `${report.parent.durationMs ?? "?"} ms)` +
        (report.parent.error ? ` — ${report.parent.error}` : "")
    );
  }
  if (report.listStudents) {
    const ls = report.listStudents;
    lines.push(
      `- /api/parent/list-students: \`${ls.ok ? "OK" : "FAIL"}\` ` +
        `(total=${ls.totalCount}, expected≥${ls.expectedCount}, ` +
        `extras=${ls.extras}, ${ls.durationMs ?? "?"} ms)`
    );
    if (ls.missingLabels?.length > 0) {
      lines.push(`  - missing labels: \`${ls.missingLabels.join(", ")}\``);
    }
    if (ls.missingMetadata?.length > 0) {
      lines.push(
        `  - missing metadata: ` +
          ls.missingMetadata
            .map((m) => `\`${m.label}.${m.missing}\``)
            .join(", ")
      );
    }
    if (ls.error) {
      lines.push(`  - error: ${ls.error}`);
    }
  }
  lines.push("");
  lines.push("### Per-student UI login probe");
  lines.push("");
  lines.push("| student | ok | duration | note |");
  lines.push("|---|---|---|---|");
  const expected = Array.isArray(expectedStudentLabels)
    ? expectedStudentLabels
    : report.students.map((s) => s.label);
  for (const label of expected) {
    const r = report.students.find((s) => s.label === label);
    if (!r) {
      lines.push(`| ${label} | n/a | n/a | not run |`);
      continue;
    }
    const dur = r.durationMs ?? "?";
    const note = r.ok ? "—" : (r.error || "fail").replace(/\|/g, "/");
    lines.push(`| ${label} | ${r.ok ? "yes" : "NO"} | ${dur} ms | ${note} |`);
  }
  if (!report.passed && report.errors.length > 0) {
    lines.push("");
    lines.push("### Errors");
    for (const e of report.errors) lines.push(`- ${e}`);
  }
  return lines.join("\n");
}
