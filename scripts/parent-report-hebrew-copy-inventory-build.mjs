/**
 * Build parent-report Hebrew copy inventory workbook (read-only scan).
 * Run: node scripts/parent-report-hebrew-copy-inventory-build.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const HEBREW_RE = /[\u0590-\u05FF]/;
const HEBREW_EXTRACT_RE = /[\u0590-\u05FF][\u0590-\u05FF\s.,;:!?'"«»()\-–—%0-9${}a-zA-Z_א-ת]*/gu;

const SCAN_ROOTS = [
  "pages/learning/parent-report.js",
  "pages/learning/parent-report-detailed.js",
  "pages/learning/parent-report-detailed.renderable.jsx",
  "components/parent-report-detailed-surface.jsx",
  "components/parent-report-topic-explain-row.jsx",
  "components/parent-report-short-contract-preview.jsx",
  "components/parent-report-contract-ui-blocks.jsx",
  "components/ParentReportImportantDisclaimer.js",
  "components/parent",
  "utils/parent-report-language",
  "utils/parent-report-ai",
  "utils/parent-report-v2.js",
  "utils/parent-report-ui-explain-he.js",
  "utils/parent-report-row-diagnostics.js",
  "utils/parent-data-presence.js",
  "utils/detailed-parent-report.js",
  "utils/detailed-report-parent-letter-he.js",
  "utils/contracts/narrative-contract-v1.js",
  "utils/learning-patterns-analysis.js",
  "utils/topic-next-step-engine.js",
  "utils/topic-next-step-phase2.js",
  "lib/parent-server/parent-report-parent-facing.server.js",
  "scripts/parent-report-hebrew-copy-guard.mjs",
];

const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
]);

const INTERNAL_ONLY_SNIPPETS = [
  "עדיין לא ברור כיוון הדיוק לאורך זמן",
  "ייתכן שהקושי קשור להבנת המשימה",
  "יש סימן לקושי, אבל הדיוק משתפר",
  "כשהמידע חלקי או ישן — כדאי לעשות בדיקה קצרה",
];

function collectFiles(relPath) {
  const abs = join(ROOT, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) {
    if (!/\.(js|jsx|mjs)$/i.test(relPath)) return [];
    return [relPath.replace(/\\/g, "/")];
  }
  if (!st.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name.startsWith(".") || SKIP_DIR_PARTS.has(name)) continue;
    out.push(...collectFiles(join(relPath, name).replace(/\\/g, "/")));
  }
  return out;
}

function enclosingFunction(lines, lineIdx) {
  for (let i = lineIdx; i >= 0 && i >= lineIdx - 80; i--) {
    const m =
      lines[i].match(/^\s*export\s+(?:async\s+)?function\s+(\w+)/) ||
      lines[i].match(/^\s*function\s+(\w+)/) ||
      lines[i].match(/^\s*export\s+const\s+(\w+)\s*=/) ||
      lines[i].match(/^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (m) return m[1];
  }
  return "";
}

function inferSurface(rel) {
  if (rel.includes("parent-report-detailed")) return "detailed_report";
  if (rel.includes("parent-report.js")) return "short_report";
  if (rel.includes("parent-facing.server")) return "server_parent_facing";
  if (rel.includes("print") || rel.includes("pdf")) return "print_pdf";
  if (rel.includes("parent-report-ai")) return "ai_explainer";
  if (rel.includes("parent-report-language")) return "language_layer";
  if (rel.includes("components/parent")) return "parent_dashboard_sections";
  return "report_builder";
}

function inferSection(rel, lineText, keyHint = "") {
  const t = `${keyHint} ${lineText}`;
  if (/empty|zero|thin|insufficient|אין מספיק|לא תורגל|דל/i.test(t)) return "data_health";
  if (/home|בית|recommendedHome|homePlan|homeRec/i.test(t)) return "home_recommendations";
  if (/insight|מה חשוב|notice/i.test(t)) return "insights";
  if (/topic|נושא/i.test(t)) return "topic_card";
  if (/subject|מקצוע/i.test(t)) return "subject_card";
  if (/executive|סיכום/i.test(t)) return "executive_summary";
  if (/details|פירוט|phase3|collapsed/i.test(t)) return "collapsed_details";
  if (/letter|מכתב/i.test(t)) return "subject_letter";
  if (/forbidden|normalize/i.test(rel)) return "guard_normalization";
  return "general";
}

function isCommentOrJSDoc(line) {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("*/")
  );
}

function classifyVisibility(rel, lineText, text, fn) {
  if (isCommentOrJSDoc(lineText)) {
    return { visibility: "internal-only", reason: "Comment/JSDoc — not rendered" };
  }
  if (/\.replace\s*\(/.test(lineText)) {
    return { visibility: "internal-only", reason: "Normalization regex — strips at render, not output as-is" };
  }
  if (rel.includes("forbidden-terms.js")) {
    return { visibility: "internal-only", reason: "Guard denylist definition — not parent output" };
  }
  if (rel.includes("parent-report-hebrew-copy-guard.mjs") && /INTERNAL_ONLY|SKIP_FILES|violations/.test(lineText)) {
    return { visibility: "internal-only", reason: "Copy guard infrastructure" };
  }
  if (rel === "utils/topic-next-step-phase2.js" && INTERNAL_ONLY_SNIPPETS.some((s) => text.includes(s))) {
    return {
      visibility: "internal-only",
      reason: "Phase2 apply() blocker detailHe — decision trace, collapsed/filtered",
    };
  }
  if (/blockers\.push|traceAdds|decisionTrace|_internal/i.test(lineText)) {
    return { visibility: "needs_review", reason: "Near engine trace/blocker — verify render path" };
  }
  if (rel.startsWith("pages/") || rel.startsWith("components/")) {
    return { visibility: "parent-visible", reason: "Page/component render layer" };
  }
  if (rel.includes("parent-report-language") || rel.includes("parent-facing") || /He["'`\]:]/.test(lineText)) {
    return { visibility: "parent-visible", reason: "Parent language/template layer (*He fields)" };
  }
  if (fn && /parent|Parent|He$|He\b|Narrative|Letter|Explain|Copy/i.test(fn)) {
    return { visibility: "parent-visible", reason: `Exported builder/UI function: ${fn}` };
  }
  return { visibility: "needs_review", reason: "Source may feed parent report — confirm render path" };
}

function problemType(text, visibility) {
  if (visibility !== "parent-visible") return "";
  const risky = [
    ["jargon", /מגמת|פער ידע|ביטחון סטטיסטי|שורות דוח|אגרסיב|מאסטרי|טקסונומיה|בטווח/],
    ["thin_data_tone", /אין מספיק|עדיין מעט|דל|חלקי|מצומצם/],
    ["progression_risk", /העברה|קידום|שחרור|ירידה|עלייה ברמה|מעבר שלב/],
    ["awkward_phrasing", /בתקופה[^ ש]|מה שנאסף|לעמיס/],
    ["over_cautious", /מוקדם מדי|לא סוגרים|זהיר/],
  ];
  for (const [type, re] of risky) {
    if (re.test(text)) return type;
  }
  return "";
}

function severity(problemType) {
  if (!problemType) return "";
  if (["jargon", "progression_risk"].includes(problemType)) return "high";
  if (["thin_data_tone", "awkward_phrasing"].includes(problemType)) return "medium";
  if (problemType === "over_cautious") return "low";
  return "medium";
}

function extractStringsFromLine(line, lineNo) {
  const results = [];
  const patterns = [
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    /`([^`\\]*(?:\\.[^`\\]*)*)`/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(line))) {
      const raw = m[1];
      if (!HEBREW_RE.test(raw)) continue;
      results.push({ text: raw, col: m.index + 1 });
    }
  }
  // JSX text nodes: >עברית<
  const jsxRe = />([^<>{}]*[\u0590-\u05FF][^<>{}]*)</g;
  let jm;
  while ((jm = jsxRe.exec(line))) {
    const raw = jm[1].trim();
    if (raw && HEBREW_RE.test(raw)) results.push({ text: raw, col: jm.index + 1 });
  }
  return results;
}

function dedupeKey(file, line, text) {
  return `${file}:${line}:${text.slice(0, 120)}`;
}

const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].sort();
const allEntries = [];
const seen = new Set();
let idSeq = 0;

for (const rel of files) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hits = extractStringsFromLine(line, i + 1);
    const fn = enclosingFunction(lines, i);
    const keyHint = line.match(/(\w+He)\s*[:=]/)?.[1] || "";
    for (const hit of hits) {
      const key = dedupeKey(rel, i + 1, hit.text);
      if (seen.has(key)) continue;
      seen.add(key);
      const { visibility, reason } = classifyVisibility(rel, line, hit.text, fn);
      const isTemplate = /\$\{/.test(hit.text) || hit.text.includes("${");
      const entry = {
        id: `PR-HE-${String(++idSeq).padStart(5, "0")}`,
        file: rel,
        function: fn,
        line: i + 1,
        surface: inferSurface(rel),
        section: inferSection(rel, line, keyHint),
        condition: line.trim().slice(0, 180),
        current_hebrew: hit.text,
        example_output: isTemplate ? hit.text.replace(/\$\{[^}]+\}/g, "…") : hit.text,
        visibility,
        visibility_reason: reason,
        problem_type: problemType(hit.text, visibility),
        severity: severity(problemType(hit.text, visibility)),
        is_template: isTemplate,
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: reason,
      };
      allEntries.push(entry);
    }
  }
}

// Forbidden terms sheet
const forbiddenMod = await import(u("utils/parent-report-language/forbidden-terms.js"));
const termUnion = new Set([
  ...forbiddenMod.PARENT_COPY_FORBIDDEN_FRAGMENTS,
  ...forbiddenMod.PARENT_READABILITY_LEAK_SUBSTRINGS,
  ...forbiddenMod.PARENT_COPY_DUPLICATE_WORD_PAIRS,
]);

const forbiddenRows = [];
for (const term of [...termUnion].sort()) {
  const found = [];
  for (const rel of files) {
    const content = readFileSync(join(ROOT, rel), "utf8");
    if (content.includes(term)) found.push(rel);
  }
  const count = found.length;
  const category = /בתקופה|שנבחרה/.test(term)
    ? "duplicate_phrase"
    : /מגמת|פער|שורות|ביטחון|אגרסיב|מאסטרי/.test(term)
      ? "engine_jargon"
      : /בטווח|נדגמו|סף/.test(term)
        ? "range_jargon"
        : "readability";
  forbiddenRows.push({
    term,
    category,
    allowed_internal_only: category === "engine_jargon" ? "yes_if_trace_only" : "no",
    forbidden_parent_visible: "yes",
    replacement_direction: "pending_owner — plain parent Hebrew",
    files_found: found.slice(0, 12).join("; ") + (found.length > 12 ? ` (+${found.length - 12} more)` : ""),
    count,
  });
}

// Scenario samples
const {
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
} = await import(u("utils/parent-report-language/subject-evidence-policy.js"));
const { buildNarrativeContractV1, narrativeSectionTextHe } = await import(
  u("utils/contracts/narrative-contract-v1.js")
);
const { normalizeParentFacingHe } = await import(
  u("utils/parent-report-language/parent-facing-normalize-he.js")
);
const {
  findParentCopyForbiddenFragmentsInString,
  findDuplicateWordPairsInString,
} = await import(u("utils/parent-report-language/forbidden-terms.js"));

function flagTerms(s) {
  const t = String(s || "");
  const a = findParentCopyForbiddenFragmentsInString(t);
  const b = findDuplicateWordPairsInString(t);
  return [...new Set([...a, ...b])].join(", ");
}

const scenarioRows = [];
const subjects = [
  ["math", "חשבון"],
  ["geometry", "גאומטריה"],
  ["hebrew", "עברית"],
  ["english", "אנגלית"],
  ["science", "מדעים"],
  ["moledet_geography", "מולדת וגאוגרפיה"],
];

function addScenario(id, desc, route, subject, grade, texts) {
  for (const txt of texts.filter(Boolean)) {
    const norm = normalizeParentFacingHe(String(txt));
    scenarioRows.push({
      scenario_id: id,
      scenario_description: desc,
      route_or_builder: route,
      subject: subject || "",
      grade: grade || "",
      generated_text: norm.slice(0, 500),
      flagged_terms: flagTerms(norm),
      notes: norm.length > 500 ? "truncated" : "",
    });
  }
}

addScenario("zero_data", "Zero questions in period", "zeroEvidenceSubjectLineHe", "חשבון", "", [
  zeroEvidenceSubjectLineHe("חשבון"),
]);
addScenario("thin_data", "Thin evidence subject", "thinEvidenceSubjectLineHe", "עברית", "", [
  thinEvidenceSubjectLineHe("עברית", 5),
]);

for (const [sid, label] of subjects) {
  for (const q of [0, 5, 20]) {
    for (const acc of [40, 75, 92]) {
      const c = buildNarrativeContractV1({
        topicKey: "sample_topic",
        subjectId: sid,
        displayName: label,
        questions: q,
        accuracy: acc,
        contractsV1: {
          readiness: { readiness: q >= 12 ? "ready" : "forming" },
          confidence: { confidenceBand: q >= 12 ? "high" : "low" },
          decision: { decisionTier: q >= 12 ? 2 : 0, cannotConcludeYet: q < 8 },
          recommendation: { eligible: q >= 12, intensity: "RI2" },
          evidence: { questionCount: q, accuracyPct: acc },
        },
      });
      const bucket =
        q === 0 ? "zero_data" : q < 8 ? "thin_data" : acc < 55 ? "weak_topic" : acc >= 85 ? "strong_topic" : "normal_data";
      addScenario(
        `${bucket}_${sid}_q${q}`,
        `${bucket} — ${label} q=${q} acc=${acc}%`,
        "buildNarrativeContractV1",
        label,
        "",
        ["summary", "finding", "recommendation", "limitations"].map((s) =>
          narrativeSectionTextHe(s, c)
        )
      );
    }
  }
}

// Partition entries into sheets
const parentVisible = allEntries.filter((e) => e.visibility === "parent-visible");
const internalOnly = allEntries.filter((e) => e.visibility === "internal-only");
const needsReview = allEntries.filter((e) => e.visibility === "needs_review");
const dynamicTemplates = allEntries.filter((e) => e.is_template);
const emptyThin = allEntries.filter((e) =>
  /data_health|אין מספיק|לא תורגל|דל|מצומצם|zero|thin|insufficient/i.test(
    `${e.section} ${e.current_hebrew} ${e.condition}`
  )
);
const recoProg = allEntries.filter((e) =>
  /home_recommendations|recommend|progress|המלצ|כיוון|שלב|RI\d/i.test(
    `${e.section} ${e.current_hebrew} ${e.file}`
  )
);
const collapsed = allEntries.filter((e) =>
  /collapsed|phase3|executive|details|SubjectPhase3|פירוט/i.test(`${e.section} ${e.file} ${e.function}`)
);
const aiCopy = allEntries.filter((e) => e.file.includes("parent-report-ai") || e.surface === "ai_explainer");

const topRisk = [...parentVisible]
  .filter((e) => e.problem_type)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 20);

const summaryRows = [
  { metric: "generated_at", value: new Date().toISOString(), notes: "Read-only inventory build" },
  { metric: "files_scanned", value: files.length, notes: files.join(", ").slice(0, 4000) },
  { metric: "hebrew_strings_templates_found", value: allEntries.length, notes: "Unique file:line:text" },
  { metric: "parent_visible", value: parentVisible.length, notes: "" },
  { metric: "internal_only", value: internalOnly.length, notes: "" },
  { metric: "needs_review", value: needsReview.length, notes: "" },
  { metric: "dynamic_templates", value: dynamicTemplates.length, notes: "" },
  { metric: "empty_thin_states", value: emptyThin.length, notes: "" },
  { metric: "forbidden_terms_tracked", value: forbiddenRows.length, notes: "" },
  { metric: "scenario_samples", value: scenarioRows.length, notes: "" },
  { metric: "code_changed", value: "no", notes: "Inventory generator only; product source untouched" },
];

function sheetFromObjects(rows, columns) {
  const header = columns.map((c) => ({ v: c, t: "s", s: { font: { bold: true } } }));
  const data = rows.map((row) => columns.map((c) => row[c] ?? ""));
  return [header.map((h) => h.v), ...data];
}

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(sheetFromObjects(summaryRows, ["metric", "value", "notes"])),
  "Summary"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(parentVisible.concat(needsReview), [
      "id",
      "file",
      "function",
      "line",
      "surface",
      "section",
      "condition",
      "current_hebrew",
      "example_output",
      "problem_type",
      "severity",
      "visibility",
      "suggested_replacement",
      "owner_approved_replacement",
      "status",
      "notes",
    ])
  ),
  "Parent Visible Strings"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      dynamicTemplates.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        template: e.current_hebrew,
        variables: (e.current_hebrew.match(/\$\{[^}]+\}/g) || []).join(", "),
        example_output_low_data: e.example_output,
        example_output_normal_data: e.example_output,
        example_output_weak_result: e.example_output,
        risk: e.problem_type || "template_variability",
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "template",
        "variables",
        "example_output_low_data",
        "example_output_normal_data",
        "example_output_weak_result",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Dynamic Templates"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      emptyThin.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        state_type: /אין|zero|לא תורגל/i.test(e.current_hebrew) ? "zero_or_empty" : "thin_data",
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        why_problematic: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "state_type",
        "current_hebrew",
        "example_output",
        "why_problematic",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Empty And Thin Data States"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      recoProg.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        condition: e.condition,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        does_it_suggest_progression: /העברה|קידום|שלב|רמה|RI/i.test(e.current_hebrew) ? "yes" : "no",
        evidence_level_required: "",
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "condition",
        "current_hebrew",
        "example_output",
        "does_it_suggest_progression",
        "evidence_level_required",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Reco And Progression Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      collapsed.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        is_parent_visible_when_opened: "yes_when_expanded",
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "current_hebrew",
        "example_output",
        "is_parent_visible_when_opened",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Collapsed Details Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      aiCopy.map((e) => ({
        id: e.id,
        file: e.file,
        function_or_prompt: e.function,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function_or_prompt",
        "current_hebrew",
        "example_output",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "AI Parent Report Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(forbiddenRows, [
      "term",
      "category",
      "allowed_internal_only",
      "forbidden_parent_visible",
      "replacement_direction",
      "files_found",
      "count",
    ])
  ),
  "Forbidden Terms"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(scenarioRows, [
      "scenario_id",
      "scenario_description",
      "route_or_builder",
      "subject",
      "grade",
      "generated_text",
      "flagged_terms",
      "notes",
    ])
  ),
  "Rendered Scenario Samples"
);

const outDir = join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
const xlsxPath = join(outDir, "parent-report-hebrew-copy-inventory.xlsx");
XLSX.writeFile(wb, xlsxPath);

const md = `# Parent Report Hebrew Copy Inventory — Summary

Generated: ${new Date().toISOString()}

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | ${files.length} |
| Hebrew strings/templates | ${allEntries.length} |
| Parent-visible | ${parentVisible.length} |
| Internal-only | ${internalOnly.length} |
| Needs review | ${needsReview.length} |
| Dynamic templates | ${dynamicTemplates.length} |
| Empty/thin data strings | ${emptyThin.length} |
| Forbidden terms tracked | ${forbiddenRows.length} |
| Scenario samples | ${scenarioRows.length} |

## Top 20 highest-risk phrases (parent-visible)

${topRisk.map((e, i) => `${i + 1}. **${e.severity || "n/a"}** — \`${e.current_hebrew.slice(0, 100)}${e.current_hebrew.length > 100 ? "…" : ""}\` (${e.file}:${e.line})`).join("\n")}

## Files scanned

${files.map((f) => `- ${f}`).join("\n")}

## Notes

- No product source code was modified.
- \`suggested_replacement\` and \`owner_approved_replacement\` columns are empty — pending owner review.
- Strings marked \`needs_review\` require manual render-path confirmation.
- Excel: \`reports/parent-report-hebrew-copy-inventory.xlsx\`
`;

const mdPath = join(outDir, "parent-report-hebrew-copy-inventory-summary.md");
writeFileSync(mdPath, md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxPath: relative(ROOT, xlsxPath),
      mdPath: relative(ROOT, mdPath),
      filesScanned: files.length,
      totalEntries: allEntries.length,
      parentVisible: parentVisible.length,
      internalOnly: internalOnly.length,
      needsReview: needsReview.length,
      topRiskCount: topRisk.length,
    },
    null,
    2
  )
);
