/**
 * Virtual Student QA Runner — parent report DOM assertions.
 *
 * Phase B assertions on the visible parent report (no API mocks, no
 * localStorage truth):
 *   - heading "דוח להורים" visible (populated state, not empty/loading/error)
 *   - no loading text ("טוען דוח...")
 *   - no parent-report load error
 *   - practiced subject ("🧮 חשבון") appears with non-zero question count
 *   - total questions across the report >= scenario answered count
 *   - accuracy is a number 0..100 and broadly plausible vs profile
 *   - no raw topic / bucket keys leak into the visible body
 *   - the report container preserves dir="rtl"
 */

const SUBJECT_LABELS = {
  math: "חשבון",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  "moledet-geography": "מולדת",
};

const SUBJECT_EMOJI = {
  math: "🧮",
  geometry: "📐",
  english: "📘",
  hebrew: "📚",
  science: "🔬",
  "moledet-geography": "🗺️",
};

/**
 * Raw bucket keys that must never be visible inside the user-facing report
 * body. The product is supposed to render Hebrew labels (e.g. "חיבור" for
 * the math addition bucket). If any of these strings appear we treat it as
 * a leak.
 *
 * Sourced statically from the product's canonical bucket set so this module
 * stays decoupled from product imports. Keep aligned with
 * utils/dev-student-simulator/canonical-topic-keys.js if buckets are added.
 */
const RAW_BUCKET_KEY_LEAK_TOKENS = [
  // math (utils/math-constants.js OPERATIONS)
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "fractions",
  "decimals",
  "percentages",
  "ratio",
  "scale",
  "powers",
  "equations",
  "factors_multiples",
  "division_with_remainder",
  "sequences",
  "mixed",
  "word_problems",
  "order_of_operations",
  "absolute_value",
  // english/science nested bucket ids that look most like raw keys
  "vocabulary",
  "grammar",
  "translation",
  "sentences",
  "writing",
  "earth_space",
  "experiments",
  "materials",
  "animals",
  "plants",
  // generic raw-key giveaways
  "topic_key",
  "bucketKey",
  "operation_id",
];

const RTL_CONTAINER_SELECTOR = '[dir="rtl"]';
const LOADING_TEXT = "טוען דוח...";
const HEADING_REGEX = /דוח להורים/u;
const REPORT_LOAD_ERROR_REGEX = /שגיאת רשת בטעינת הדוח|שגיאה בעת טעינת הדוח/u;
const AUTH_REQUIRED_REGEX = /נדרשת התחברות כהורה/u;
const NO_DATA_TEXT = "אין עדיין מספיק פעילות";

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function findFirstVisibleNumberFollowing(page, labelText) {
  // Each summary card has a label div followed by a sibling stat div with
  // the numeric value. We locate by the label and read the .font-bold
  // sibling text inside the same card.
  const labelLocator = page.getByText(labelText, { exact: true }).first();
  const card = labelLocator.locator(
    'xpath=ancestor::*[contains(@class,"rounded-lg")][1]'
  );
  const text = await card.locator(".font-bold").first().textContent();
  return text ? text.trim() : "";
}

/** Scrape report counters and subject card values directly from the DOM. */
async function scrapeReportCounters(page, subject) {
  const counters = {
    totalQuestions: null,
    totalCorrectText: "",
    overallAccuracyPct: null,
    subjectQuestionCount: null,
    subjectSecondaryLine: "",
  };

  // Total questions card.
  const questionsRaw = await findFirstVisibleNumberFollowing(page, "שאלות");
  counters.totalQuestions = safeNumber(questionsRaw);

  // Accuracy card (text ends with %).
  const accuracyRaw = await findFirstVisibleNumberFollowing(page, "דיוק כללי");
  counters.overallAccuracyPct = safeNumber(
    String(accuracyRaw || "").replace("%", "").trim()
  );

  // Per-subject cards: locate by the emoji+label combo, then read the
  // "<N> שאלות" stat from inside the same card.
  const emoji = SUBJECT_EMOJI[subject];
  const label = SUBJECT_LABELS[subject];
  if (emoji && label) {
    const subjectLabel = page
      .getByText(`${emoji} ${label}`, { exact: false })
      .first();
    const subjectCard = subjectLabel.locator(
      'xpath=ancestor::*[contains(@class,"rounded-lg")][1]'
    );
    const stat = await subjectCard.locator(".font-bold").first().textContent();
    const match = String(stat || "").match(/(\d+)\s*שאלות/);
    counters.subjectQuestionCount = match ? Number(match[1]) : null;
    const secondaryLineEl = subjectCard.locator(".text-xs").last();
    counters.subjectSecondaryLine = (
      await secondaryLineEl.textContent().catch(() => "")
    )?.trim();
  }

  return counters;
}

/** Look for raw bucket-key strings inside the visible main content. */
function findRawKeyLeaks(visibleText) {
  const text = String(visibleText || "");
  const found = [];
  for (const key of RAW_BUCKET_KEY_LEAK_TOKENS) {
    // Word boundary around lowercase identifiers; avoid Hebrew false-positives.
    const re = new RegExp(`(^|[^a-z_])${key}([^a-z_]|$)`, "u");
    if (re.test(text)) found.push(key);
  }
  return Array.from(new Set(found));
}

/** Run the full Phase-B parent report assertion suite. */
export async function verifyParentReport({
  page,
  scenarioContext,
  log,
}) {
  const subject = String(scenarioContext?.subject || "math").toLowerCase();
  const minActivityCount = Number(scenarioContext?.expectedAnsweredCount) || 0;
  const profile = String(scenarioContext?.profile || "").toLowerCase();

  const findings = {
    headingVisible: false,
    loadingTextHidden: false,
    errorTextHidden: false,
    authRequiredHidden: false,
    notEmptyState: false,
    subjectVisible: false,
    subjectLabel: SUBJECT_LABELS[subject] || subject,
    subjectQuestionCount: null,
    totalQuestions: null,
    overallAccuracyPct: null,
    accuracyDirectionOk: false,
    accuracyDirectionNote: "",
    rawKeyLeaks: [],
    rtlOk: false,
    studentNameVisible: null,
  };

  // Heading visible.
  const heading = page.getByRole("heading", { name: HEADING_REGEX }).first();
  await heading.waitFor({ state: "visible", timeout: 60_000 });
  findings.headingVisible = true;
  log?.("parent-report: heading 'דוח להורים' visible");

  // Error / auth-required must NOT be present.
  const errorCount = await page.getByText(REPORT_LOAD_ERROR_REGEX).count();
  if (errorCount > 0) {
    throw new Error(
      `parent-report: load error visible (${errorCount} matches for /שגיאת.../u)`
    );
  }
  findings.errorTextHidden = true;

  const authRequiredCount = await page.getByText(AUTH_REQUIRED_REGEX).count();
  if (authRequiredCount > 0) {
    throw new Error(
      `parent-report: parent-auth-required gate is visible (${authRequiredCount} matches)`
    );
  }
  findings.authRequiredHidden = true;

  // Loading text must be gone (it disappears once the report fetch resolves).
  const loadingCount = await page.getByText(LOADING_TEXT).count();
  if (loadingCount > 0) {
    throw new Error(
      `parent-report: loading placeholder still visible (${loadingCount} matches for "${LOADING_TEXT}")`
    );
  }
  findings.loadingTextHidden = true;

  // Reject the explicit empty-state branch.
  const emptyCount = await page.getByText(NO_DATA_TEXT).count();
  if (emptyCount > 0) {
    throw new Error(
      `parent-report: empty-state branch detected ("${NO_DATA_TEXT}") — student activity did not surface`
    );
  }
  findings.notEmptyState = true;

  // Wait for the populated summary cards to be present.
  await page
    .getByText("שאלות", { exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });

  // Subject card visible with > 0 questions.
  const subjectEmoji = SUBJECT_EMOJI[subject];
  const subjectLabel = SUBJECT_LABELS[subject];
  if (subjectEmoji && subjectLabel) {
    const labelLoc = page
      .getByText(`${subjectEmoji} ${subjectLabel}`, { exact: false })
      .first();
    const labelCount = await labelLoc.count();
    if (labelCount === 0) {
      throw new Error(
        `parent-report: subject card "${subjectEmoji} ${subjectLabel}" not visible`
      );
    }
    findings.subjectVisible = true;
  } else {
    findings.subjectVisible = false;
  }

  // Scrape numeric counters.
  const counters = await scrapeReportCounters(page, subject);
  findings.totalQuestions = counters.totalQuestions;
  findings.overallAccuracyPct = counters.overallAccuracyPct;
  findings.subjectQuestionCount = counters.subjectQuestionCount;

  if (findings.totalQuestions == null || findings.totalQuestions < 1) {
    throw new Error(
      `parent-report: total question count is not >=1 (got ${findings.totalQuestions})`
    );
  }
  if (minActivityCount > 0 && findings.totalQuestions < minActivityCount) {
    throw new Error(
      `parent-report: total question count ${findings.totalQuestions} is below scenario minimum ${minActivityCount}`
    );
  }
  if (findings.subjectVisible) {
    if (
      findings.subjectQuestionCount == null ||
      findings.subjectQuestionCount < 1
    ) {
      throw new Error(
        `parent-report: subject "${subjectLabel}" question count is not >=1 (got ${findings.subjectQuestionCount})`
      );
    }
    if (
      minActivityCount > 0 &&
      findings.subjectQuestionCount < minActivityCount
    ) {
      log?.(
        `parent-report: WARNING subject question count ${findings.subjectQuestionCount} < scenario minimum ${minActivityCount} (acceptable if cross-period activity diluted; total=${findings.totalQuestions})`
      );
    }
  }

  // Accuracy direction guard. We don't have a baseline snapshot in Phase B,
  // so we just assert the value is plausible and broadly consistent with
  // the run profile. Phase A's "average" smoke run can score 0..100; we
  // accept anything in-range and record the value for the report.
  if (
    findings.overallAccuracyPct == null ||
    findings.overallAccuracyPct < 0 ||
    findings.overallAccuracyPct > 100
  ) {
    throw new Error(
      `parent-report: overall accuracy out of range: ${findings.overallAccuracyPct}`
    );
  }
  // For "strong"/"average" profiles we expect >0% accuracy after a real
  // session that included at least some correct answers.
  if (
    minActivityCount > 0 &&
    findings.overallAccuracyPct === 0 &&
    (profile === "strong" || profile === "average")
  ) {
    findings.accuracyDirectionOk = false;
    findings.accuracyDirectionNote = `expected >0% accuracy for profile=${profile}, got 0%`;
  } else {
    findings.accuracyDirectionOk = true;
    findings.accuracyDirectionNote = `accuracy=${findings.overallAccuracyPct}% within expected range for profile=${profile || "unknown"}`;
  }

  // Raw-key leak guard: scan the visible main container text only.
  const mainText = await page.locator("main, body").first().innerText();
  const leaks = findRawKeyLeaks(mainText);
  findings.rawKeyLeaks = leaks;
  if (leaks.length > 0) {
    throw new Error(
      `parent-report: raw bucket keys leaked into UI: ${leaks.join(", ")}`
    );
  }

  // RTL guard: there must be at least one ancestor element with dir="rtl"
  // wrapping the report body.
  const rtlCount = await page.locator(RTL_CONTAINER_SELECTOR).count();
  findings.rtlOk = rtlCount > 0;
  if (!findings.rtlOk) {
    throw new Error("parent-report: no [dir=\"rtl\"] container found");
  }

  // Capture the visible student name from the report header (rendered
  // beneath the heading as report.playerName) for the run summary.
  try {
    const headingHandle = await heading.elementHandle();
    if (headingHandle) {
      const playerLine = await headingHandle.evaluate((el) => {
        const next = el.parentElement?.querySelector("p");
        return next ? next.textContent : "";
      });
      findings.studentNameVisible = (playerLine || "").trim();
    }
  } catch {
    // best-effort
  }

  log?.(
    `parent-report: assertions ok (totalQuestions=${findings.totalQuestions}, accuracy=${findings.overallAccuracyPct}%, subject=${subjectLabel}=${findings.subjectQuestionCount} questions)`
  );

  return findings;
}
