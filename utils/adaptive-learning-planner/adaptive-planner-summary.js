/**
 * Serialize planner selftest / batch results for reports.
 */

/**
 * @param {object} params
 * @param {string} params.generatedAt
 * @param {{ name: string, pass: boolean, detail?: string, input?: object, output?: object }[]} params.cases
 */
export function buildPlannerSummaryPayload({ generatedAt, cases }) {
  const passed = cases.filter((c) => c.pass).length;
  const failed = cases.length - passed;
  return {
    version: 1,
    generatedAt,
    totals: { cases: cases.length, passed, failed },
    cases,
  };
}

/**
 * @param {object} payload from buildPlannerSummaryPayload
 */
export function buildPlannerSummaryMarkdown(payload) {
  const lines = [
    "# Adaptive Learning Planner - selftest summary",
    "",
    `- **Generated:** ${payload.generatedAt}`,
    `- **Cases:** ${payload.totals.cases} | **Passed:** ${payload.totals.passed} | **Failed:** ${payload.totals.failed}`,
    "",
    "## Results",
    "",
    "| Case | Pass | plannerStatus | nextAction |",
    "| --- | --- | --- | --- |",
  ];
  for (const c of payload.cases || []) {
    const st = c.output?.plannerStatus ?? "-";
    const na = c.output?.nextAction ?? "-";
    lines.push(`| ${String(c.name).replace(/\|/g, "\\|")} | ${c.pass ? "yes" : "no"} | ${st} | ${na} |`);
  }
  lines.push("");
  const fails = (payload.cases || []).filter((c) => !c.pass);
  if (fails.length) {
    lines.push("## Failures", "");
    for (const f of fails) {
      lines.push(`- **${f.name}:** ${f.detail || "assertion mismatch"}`);
    }
    lines.push("");
  }
  lines.push("See `docs/adaptive-learning-planner.md` for contract and safety rules.", "");
  return lines.join("\n");
}
