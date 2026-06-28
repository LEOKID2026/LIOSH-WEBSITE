/**
 * Parent-report snapshot helper — Phase C.
 *
 * Reads totals + per-subject question counts directly from the rendered
 * parent report, anchored on the same Hebrew labels Phase B already
 * verifies. Crucially, every snapshot reaches the report by clicking the
 * dashboard's "דוח הורים" affordance — never by direct URL construction —
 * so the Phase C "real UI" rule still holds for every read.
 *
 * The snapshot deliberately tolerates missing per-subject cards: a brand
 * new student or a cross-period rollover may legitimately render only the
 * subjects they have practiced. Missing values come back as `null`, never
 * as zero, so the run summary can distinguish "no card visible" from
 * "card visible with 0 questions" (which is itself a real product state).
 */

import { verifyParentDashboardAndOpenReport } from "./parent-dashboard.mjs";
import {
  extractParentReportEvidenceFromPage,
  buildParentReportEvidenceMarkdown,
  inferPhaseFromArtifactPrefix,
} from "./parent-report-evidence.mjs";
import { resolveTimestampStampingEnabled } from "./config.mjs";

const HEADING_REGEX = /דוח להורים/u;
const LOADING_TEXT = "טוען דוח...";
const NO_DATA_TEXT = "אין עדיין מספיק פעילות";
const PARENT_REPORT_PATH = "/learning/parent-report";

const SUBJECT_LABELS = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  "moledet-geography": "מולדת",
};
/** Product copy varies; try all aliases when scraping summary cards. */
const HEBREW_SUBJECT_ALIASES = {
  math: ["מתמטיקה", "חשבון"],
  geometry: ["גאומטריה"],
  english: ["אנגלית"],
  hebrew: ["עברית"],
  science: ["מדעים"],
  "moledet-geography": ["מולדת וגאוגרפיה", "גאוגרפיה", "מולדת"],
};
// Emojis MUST match what /pages/learning/parent-report.js renders inside
// each summary card label (verified by grepping the page). If a future
// product change moves the emoji, fix it here — never patch the page.
const SUBJECT_EMOJI = {
  math: "🧮",
  geometry: "📐",
  english: "📘",
  hebrew: "📚",
  science: "🔬",
  "moledet-geography": "🗺️",
};
const ALL_SUBJECTS = Object.keys(SUBJECT_LABELS);

/** First/last calendar day of the simulated month (YYYY-MM-DD). */
export function monthRangeForSimDate(simDate) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(simDate || ""));
  if (!m) throw new Error(`monthRangeForSimDate: invalid simDate=${simDate}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${m[1]}-${m[2]}-01`,
    end: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * After dashboard click, reload the same report with a custom month range so
 * backfilled May timestamps appear (default UI range is wall-clock week).
 */
async function applySimulatedReportDateRange(page, simDate, log) {
  const { start, end } = monthRangeForSimDate(simDate);
  const u = new URL(page.url());
  u.searchParams.set("period", "custom");
  u.searchParams.set("start", start);
  u.searchParams.set("end", end);
  if (!u.searchParams.get("source")) u.searchParams.set("source", "parent");
  log?.(
    `parent-report-snapshot: applying simulated month range ${start} → ${end}`
  );
  await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function readNumberFollowingLabel(page, labelText) {
  const labelLocator = page.getByText(labelText, { exact: true }).first();
  if (!(await labelLocator.count())) return null;
  const card = labelLocator.locator(
    'xpath=ancestor::*[contains(@class,"rounded-lg")][1]'
  );
  const text = await card.locator(".font-bold").first().textContent().catch(() => null);
  if (text == null) return null;
  return safeNumber(String(text).replace("%", "").trim());
}

async function readSubjectQuestionCount(page, subject) {
  const emoji = SUBJECT_EMOJI[subject];
  if (!emoji) return null;
  const labels = HEBREW_SUBJECT_ALIASES[subject] || [SUBJECT_LABELS[subject]];
  for (const label of labels) {
    if (!label) continue;
    const subjectLabel = page
      .getByText(`${emoji} ${label}`, { exact: false })
      .first();
    if (!(await subjectLabel.count())) continue;
    const card = subjectLabel.locator(
      'xpath=ancestor::*[contains(@class,"rounded-lg")][1]'
    );
    const stat = await card.locator(".font-bold").first().textContent().catch(() => null);
    if (stat == null) continue;
    const m = String(stat).match(/(\d+)\s*שאלות/);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Take a counter snapshot of the parent report. Assumes the parent is
 * already authenticated.
 *
 * Strategy:
 *   1. Navigate to /parent/dashboard (always — never re-use a stale URL).
 *   2. Click "דוח הורים" for the expected student card.
 *   3. Wait for either a populated report or the explicit empty-state
 *      branch — both are valid pre-activity baseline states.
 *   4. Scrape totals + per-subject counts, returning nulls where a card
 *      is not rendered.
 *
 * @returns {Promise<{
 *   url: string,
 *   isEmptyState: boolean,
 *   totalQuestions: number|null,
 *   overallAccuracyPct: number|null,
 *   bySubject: Record<string, {questionCount: number|null}>,
 * }>}
 */
export async function snapshotParentReportViaDashboard({
  page,
  baseUrl,
  expectedStudentName,
  log,
  artifacts,
  artifactPrefix,
  studentLabel = null,
  phase = null,
  simulatedDate = null,
}) {
  const useSimRange =
    simulatedDate &&
    resolveTimestampStampingEnabled() &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(simulatedDate));

  // After student sessions the parent tab often remains on the report opened
  // at baseline. Re-navigating to /parent/dashboard after long student work
  // can hang on auth hydration and stall the serial nightly run — re-read the
  // report in place (still real UI; baseline already proved dashboard click).
  if (phase === "after") {
    try {
      const onReport = new URL(page.url()).pathname.startsWith(PARENT_REPORT_PATH);
      if (onReport) {
        log?.(
          `parent-report-snapshot: after capture in-place on open report (${artifactPrefix})`
        );
        if (useSimRange) {
          await applySimulatedReportDateRange(page, simulatedDate, log);
        }
        return scrapePopulatedOrEmptyReport({
          page,
          log,
          artifacts,
          artifactPrefix,
          studentLabel,
          phase,
          expectedStudentName,
        });
      }
    } catch {
      // fall through to dashboard navigation
    }
  }

  log?.(
    `parent-report-snapshot: navigating dashboard to capture ${artifactPrefix}`
  );
  // Always go through the dashboard click, never construct the URL.
  await verifyParentDashboardAndOpenReport({
    page,
    baseUrl,
    expectedStudentName,
    log,
    artifacts,
    artifactPrefix,
  });

  if (useSimRange) {
    await applySimulatedReportDateRange(page, simulatedDate, log);
  }

  return scrapePopulatedOrEmptyReport({
    page,
    log,
    artifacts,
    artifactPrefix,
    studentLabel,
    phase,
    expectedStudentName,
  });
}

async function scrapePopulatedOrEmptyReport({
  page,
  log,
  artifacts,
  artifactPrefix,
  studentLabel,
  phase,
  expectedStudentName,
}) {
  // Wait for one of three terminal states: populated report, explicit
  // empty-state, or loading-disappeared (covered by populated path).
  const heading = page.getByRole("heading", { name: HEADING_REGEX }).first();
  await heading.waitFor({ state: "visible", timeout: 60_000 });

  // Wait until "טוען דוח..." is gone.
  await page
    .waitForFunction(
      (loadingText) => {
        const all = Array.from(document.querySelectorAll("body *"));
        return !all.some((el) => (el.textContent || "").includes(loadingText));
      },
      LOADING_TEXT,
      { timeout: 30_000 }
    )
    .catch(() => {});

  const emptyCount = await page.getByText(NO_DATA_TEXT).count().catch(() => 0);
  const isEmptyState = emptyCount > 0;

  if (isEmptyState) {
    if (artifacts && artifactPrefix) {
      await artifacts.saveScreenshot(page, `${artifactPrefix}-empty-state`);
    }
    log?.(
      "parent-report-snapshot: empty-state branch detected " +
        `("${NO_DATA_TEXT}") — student has no prior activity yet.`
    );
    const emptyResult = {
      url: page.url(),
      isEmptyState: true,
      totalQuestions: null,
      overallAccuracyPct: null,
      bySubject: Object.fromEntries(
        ALL_SUBJECTS.map((s) => [s, { questionCount: null }])
      ),
    };
    await writeParentReportEvidenceArtifacts({
      page,
      artifacts,
      studentLabel,
      phase,
      artifactPrefix,
      expectedStudentName,
      reportUrl: emptyResult.url,
      numericSnapshot: emptyResult,
      log,
    });
    return emptyResult;
  }

  // Populated state: wait for the totals card to mount.
  await page
    .getByText("שאלות", { exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });

  const totalQuestions = await readNumberFollowingLabel(page, "שאלות");
  const overallAccuracyPct = await readNumberFollowingLabel(page, "דיוק כללי");

  const bySubject = {};
  for (const s of ALL_SUBJECTS) {
    const qc = await readSubjectQuestionCount(page, s);
    bySubject[s] = { questionCount: qc };
  }

  if (artifacts && artifactPrefix) {
    await artifacts.saveScreenshot(page, `${artifactPrefix}-populated`);
  }

  log?.(
    `parent-report-snapshot: total=${totalQuestions} accuracy=${overallAccuracyPct}% ` +
      `subjects=${ALL_SUBJECTS.map((s) => `${s}:${bySubject[s].questionCount}`).join(",")}`
  );

  const populatedResult = {
    url: page.url(),
    isEmptyState: false,
    totalQuestions,
    overallAccuracyPct,
    bySubject,
  };

  await writeParentReportEvidenceArtifacts({
    page,
    artifacts,
    studentLabel,
    phase,
    artifactPrefix,
    expectedStudentName,
    reportUrl: populatedResult.url,
    numericSnapshot: populatedResult,
    log,
  });

  return populatedResult;
}

async function writeParentReportEvidenceArtifacts({
  page,
  artifacts,
  studentLabel,
  phase,
  artifactPrefix,
  expectedStudentName,
  reportUrl,
  numericSnapshot,
  log,
}) {
  if (!artifacts?.writeParentReportEvidence || !studentLabel) return;
  const resolvedPhase = phase || inferPhaseFromArtifactPrefix(artifactPrefix);
  if (resolvedPhase === "unknown") {
    log?.(
      `parent-report-snapshot: skip text evidence — cannot infer phase from ${artifactPrefix}`
    );
    return;
  }
  try {
    const evidence = await extractParentReportEvidenceFromPage(page, {
      studentLabel,
      phase: resolvedPhase,
      reportUrl,
      expectedStudentName,
      numericSnapshot,
    });
    artifacts.writeParentReportEvidence(evidence);
    if (artifacts.writeParentReportEvidenceMarkdown) {
      artifacts.writeParentReportEvidenceMarkdown(
        evidence,
        buildParentReportEvidenceMarkdown(evidence)
      );
    }
    log?.(
      `parent-report-snapshot: wrote parent-report-snapshots/${studentLabel}-${resolvedPhase}.{json,md}`
    );
  } catch (err) {
    log?.(
      `parent-report-snapshot: evidence capture failed (non-fatal): ${err?.message || err}`
    );
  }
}

/** Compute deltas between two snapshots. Null inputs propagate as null. */
export function snapshotDelta(beforeSnap, afterSnap) {
  function safeDelta(a, b) {
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return -a;
    return b - a;
  }
  const totalDelta = safeDelta(
    beforeSnap?.totalQuestions ?? null,
    afterSnap?.totalQuestions ?? null
  );
  const accuracyDelta = safeDelta(
    beforeSnap?.overallAccuracyPct ?? null,
    afterSnap?.overallAccuracyPct ?? null
  );
  const bySubject = {};
  for (const s of ALL_SUBJECTS) {
    const beforeCount = beforeSnap?.bySubject?.[s]?.questionCount ?? null;
    const afterCount = afterSnap?.bySubject?.[s]?.questionCount ?? null;
    bySubject[s] = {
      before: beforeCount,
      after: afterCount,
      delta: safeDelta(beforeCount, afterCount),
    };
  }
  return { totalDelta, accuracyDelta, bySubject };
}

export const PHASE_C_KNOWN_SUBJECTS = ALL_SUBJECTS;
