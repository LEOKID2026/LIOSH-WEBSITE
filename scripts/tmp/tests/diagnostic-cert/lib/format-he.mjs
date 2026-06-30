/**
 * Hebrew summary table + JSON artifact helpers.
 */

/**
 * @param {object[]} scenarioResults
 */
export function buildHebrewTable(scenarioResults) {
  const header = "| # | תרחיש | סטטוס | למה |";
  const sep = "|---|--------|--------|-----|";
  const rows = scenarioResults.map((s, i) => {
    const statusLabel =
      s.status === "pass" ? "✅ עבר" : s.status === "partial" ? "⚠️ חלקי" : "❌ נכשל";
    const why =
      s.status === "pass"
        ? "כל הבדיקות הנדרשות עברו"
        : s.failures.length > 0
          ? s.failures.join("; ")
          : s.skips.length > 0
            ? `דילוגים: ${s.skips.join("; ")}`
            : "—";
    return `| ${i + 1} | ${s.titleHe} | ${statusLabel} | ${why} |`;
  });
  return [header, sep, ...rows].join("\n");
}

/**
 * @param {object[]} scenarioResults
 */
export function collectFailures(scenarioResults) {
  /** @type {string[]} */
  const out = [];
  for (const s of scenarioResults) {
    if (s.status === "fail") {
      out.push(`${s.id} — ${s.titleHe}: ${s.failures.join(" | ")}`);
    }
  }
  return out;
}

/**
 * @param {object[]} scenarioResults
 */
export function buildSummaryJson(scenarioResults, meta = {}) {
  const totals = scenarioResults.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      acc.checks.pass += s.checkStats.pass;
      acc.checks.fail += s.checkStats.fail;
      acc.checks.skip += s.checkStats.skipped;
      return acc;
    },
    { pass: 0, partial: 0, fail: 0, checks: { pass: 0, fail: 0, skip: 0 } },
  );

  return {
    generatedAt: new Date().toISOString(),
    certVersion: "diagnostic-cert-v1",
    purpose: "DE2+DE3+parent-report evidence cert pack (pre-V3-final)",
    meta,
    totals,
    failures: collectFailures(scenarioResults),
    scenarios: scenarioResults.map((s) => ({
      id: s.id,
      titleHe: s.titleHe,
      category: s.category,
      status: s.status,
      checkStats: s.checkStats,
      failures: s.failures,
      skips: s.skips,
      checks: s.checks,
    })),
  };
}
