/**
 * Extract comparable parent-report fields from API body, UI text, or PDF text.
 */

const PARENT_ACTIVITY_FORBIDDEN = [
  /פעילות\s*מהורה/u,
  /פעילות\s*אישית\s*מהורה/u,
  /parent\s*assigned\s*activity/i,
];

/** @param {string} iso */
export function formatDateLabelHe(iso) {
  const p = String(iso || "").split("T")[0].split("-");
  if (p.length !== 3) return String(iso || "");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

/**
 * @param {Record<string, unknown>} body report-data API body
 * @param {{ from?: string, to?: string }} [rangeOverride]
 */
export function extractApiReportSnapshot(body, rangeOverride = {}) {
  const range = body?.range || {};
  const from = rangeOverride.from || range.from || "";
  const to = rangeOverride.to || range.to || "";
  const summary = body?.summary || {};
  const totalQuestions = Number(summary.totalAnswers ?? summary.totalQuestions ?? 0);
  const totalDurationSeconds = Number(summary.totalDurationSeconds ?? 0);
  const totalTimeMinutes = Math.round(totalDurationSeconds / 60);

  /** @type {Record<string, { answers: number, correct?: number }>} */
  const subjects = {};
  const subjRoot = body?.subjects || {};
  for (const [key, val] of Object.entries(subjRoot)) {
    if (!val || typeof val !== "object") continue;
    subjects[key] = {
      answers: Number(val.answers ?? 0),
      correct: Number(val.correct ?? 0),
    };
  }

  return {
    dateRangeLabelHe:
      from && to ? `${formatDateLabelHe(from)} – ${formatDateLabelHe(to)}` : "",
    totalQuestions,
    totalTimeMinutes,
    totalDurationSeconds,
    subjects,
    hasData: totalQuestions > 0,
  };
}

/**
 * @param {string} text
 */
export function extractUiLikeSnapshot(text) {
  const t = String(text || "");
  const dateMatch = t.match(/(\d{2}\/\d{2}\/\d{4})\s*[–-]\s*(\d{2}\/\d{2}\/\d{4})/u);
  const dateRangeLabelHe = dateMatch ? `${dateMatch[1]} – ${dateMatch[2]}` : "";

  const timeMatch =
    t.match(/זמן\s*כולל[\s\S]{0,40}?(\d+)/u) ||
    t.match(/סה[״"']?\s*כ\s*זמן[^\d]*(\d+)/u) ||
    t.match(/(\d+)\s*דק/u);
  const totalTimeMinutes = timeMatch ? Number(timeMatch[1]) : null;

  const qBlock =
    t.match(/שאלות[\s\S]{0,30}?(\d+)/u) ||
    t.match(/סה[״"']?\s*כ\s*שאלות[^\d]*(\d+)/u) ||
    t.match(/(\d+)\s*שאלות/u);
  const totalQuestions = qBlock ? Number(qBlock[1]) : null;

  return {
    dateRangeLabelHe,
    totalQuestions,
    totalTimeMinutes,
    rawLength: t.length,
  };
}

/**
 * @param {string} text
 */
export function assertNoParentActivitySeparateLabel(text, label = "surface") {
  for (const re of PARENT_ACTIVITY_FORBIDDEN) {
    if (re.test(text)) {
      throw new Error(`${label}: forbidden parent-activity separate label matched ${re}`);
    }
  }
}

/**
 * @param {import('playwright').Page} page
 */
export async function extractUiSummaryFromPage(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".parent-report-print-summary-card"));
    /** @type {Record<string, string>} */
    const byLabel = {};
    for (const card of cards) {
      const labels = card.querySelectorAll(".parent-report-print-summary-label");
      const stat = card.querySelector(".parent-report-print-summary-stat");
      const labelText = labels[0]?.textContent?.trim() || "";
      const statText = stat?.textContent?.trim() || "";
      if (labelText) byLabel[labelText] = statText;
    }

    const dateEl = document.querySelector('[dir="ltr"].text-white\\/60, p[dir="ltr"]');
    const dateRangeRaw = dateEl?.textContent?.trim() || "";

    const qRaw = byLabel["שאלות"];
    let totalQuestions = null;
    if (qRaw != null && String(qRaw).trim() !== "") {
      const n = Number(String(qRaw).replace(/[^\d]/g, ""));
      totalQuestions = Number.isFinite(n) ? n : null;
    }

    const timeRaw = String(byLabel["זמן כולל"] || "");
    const timeMatch = timeRaw.match(/(\d+)/);
    let totalTimeMinutes = null;
    if (timeMatch) totalTimeMinutes = Number(timeMatch[1]);

    return {
      dateRangeRaw,
      totalQuestions,
      totalTimeMinutes,
      byLabel,
    };
  });
}

/**
 * Normalize API/UI date labels — UI uses DD/MM/YYYY - DD/MM/YYYY
 * @param {string} apiLabel e.g. 16/05/2026 – 14/06/2026
 * @param {string} uiRaw e.g. 16/05/2026 - 14/06/2026
 */
export function dateRangesEquivalent(apiLabel, uiRaw) {
  const norm = (s) =>
    String(s || "")
      .replace(/\u2013/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  return norm(apiLabel) === norm(uiRaw);
}

/**
 * @param {ReturnType<typeof extractApiReportSnapshot>} api
 * @param {{ totalQuestions: number|null, totalTimeMinutes: number|null, dateRangeRaw?: string }} surface
 * @param {string} label
 */
export function assertReportSurfaceParity(api, surface, label) {
  const mismatches = [];
  if (api.dateRangeLabelHe && surface.dateRangeRaw) {
    if (!dateRangesEquivalent(api.dateRangeLabelHe, surface.dateRangeRaw)) {
      mismatches.push(
        `dateRange api=${api.dateRangeLabelHe} surface=${surface.dateRangeRaw}`
      );
    }
  }
  if (surface.totalQuestions != null && surface.totalQuestions !== api.totalQuestions) {
    mismatches.push(
      `totalQuestions api=${api.totalQuestions} surface=${surface.totalQuestions}`
    );
  } else if (api.totalQuestions > 0 && surface.totalQuestions == null) {
    mismatches.push(`totalQuestions api=${api.totalQuestions} surface=missing`);
  }
  if (surface.totalTimeMinutes != null) {
    const delta = Math.abs(surface.totalTimeMinutes - api.totalTimeMinutes);
    if (delta > 1) {
      mismatches.push(
        `totalTimeMinutes api=${api.totalTimeMinutes} surface=${surface.totalTimeMinutes}`
      );
    }
  }
  if (mismatches.length) {
    throw new Error(`${label} parity failed: ${mismatches.join("; ")}`);
  }
}
