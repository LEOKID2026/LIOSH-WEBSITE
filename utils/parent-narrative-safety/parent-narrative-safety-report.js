/**
 * Serializes parent narrative safety selftest output to JSON / Markdown.
 */

/**
 * @param {object} params
 * @param {string} params.generatedAtIso
 * @param {Array<{ id: string, pass: boolean, result: object, error?: string }>} params.cases
 * @param {boolean} params.allPassed
 */
export function buildNarrativeSafetySummaryJson(params) {
  const { generatedAtIso, cases, allPassed } = params;
  return {
    version: 1,
    generatedAt: generatedAtIso,
    allPassed,
    caseCount: cases.length,
    passCount: cases.filter((c) => c.pass).length,
    failCount: cases.filter((c) => !c.pass).length,
    cases: cases.map((c) => ({
      id: c.id,
      pass: c.pass,
      status: c.result?.status,
      ok: c.result?.ok,
      severity: c.result?.severity,
      issueCodes: (c.result?.issues || []).map((i) => i.code),
      infoCount: typeof c.result?.infoCount === "number" ? c.result.infoCount : 0,
      error: c.error || null,
    })),
  };
}

/**
 * @param {object} params
 * @param {string} params.generatedAtIso
 * @param {Array<{ id: string, pass: boolean, result: object, error?: string, description?: string }>} params.cases
 * @param {boolean} params.allPassed
 */
export function buildNarrativeSafetySummaryMd(params) {
  const { generatedAtIso, cases, allPassed } = params;
  const lines = [
    "# Parent narrative safety - selftest summary",
    "",
    `- **Generated:** ${generatedAtIso}`,
    `- **Overall:** ${allPassed ? "**PASS**" : "**FAIL**"}`,
    "",
    "| Fixture | Expected | Actual | OK |",
    "|---------|----------|--------|-----|",
  ];

  for (const c of cases) {
    const exp = c.expectedStatus ?? "?";
    const act = c.result?.status ?? "-";
    const ok = c.pass ? "yes" : "**no**";
    lines.push(`| ${c.id} | ${exp} | ${act} | ${ok} |`);
  }

  lines.push("", "## Failures", "");

  const failures = cases.filter((c) => !c.pass);
  if (!failures.length) lines.push("_None._");
  else {
    for (const f of failures) {
      lines.push(`### ${f.id}`, "");
      lines.push(`- ${f.description || ""}`, "");
      if (f.error) lines.push(`- Error: \`${f.error}\``, "");
      if (f.result?.issues?.length) {
        lines.push("Issues:", "```json", JSON.stringify(f.result.issues, null, 2), "```", "");
      }
    }
  }

  return lines.join("\n");
}
