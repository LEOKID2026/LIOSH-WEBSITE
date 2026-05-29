/**
 * Shared Hebrew copy scan / hash / classify helpers for baseline + delta gate.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

export const HEBREW_RE = /[\u0590-\u05FF]/;

export const DOMAINS = [
  "parent_report",
  "teacher_school_report",
  "site_decision_ai",
  "site_general",
  "learning_content",
];

export const STATUSES = [
  "approved",
  "pending_owner_review",
  "pending_expert_review",
  "looks_ok_pending",
  "internal_only",
  "temporary_qa_only",
  "blocked",
  "deprecated",
];

export const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "games",
  "arcade",
  "_qa-transfer",
]);

export const DOMAIN_SCAN_ROOTS = {
  parent_report: [
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
    "lib/parent-server/parent-report-parent-facing.server.js",
  ],
  teacher_school_report: [
    "lib/teacher-server/teacher-class-report.server.js",
    "lib/teacher-server/teacher-report.server.js",
    "lib/teacher-server/school-reports.server.js",
    "lib/teacher-server/school-report-view-model.js",
    "lib/teacher-server/school-physical-class-report.js",
    "components/teacher-portal/TeacherClassReportModal.jsx",
    "components/teacher-portal/SchoolReportModal.jsx",
    "components/teacher-portal/TeacherReportPageStates.jsx",
    "utils/teacher-ui.he.js",
    "utils/school-ui.he.js",
    "utils/teacher-activity-report-export.js",
    "pages/teacher/class",
    "pages/api/teacher",
    "pages/api/school",
  ],
  site_decision_ai: [
    "utils/parent-copilot",
    "utils/parent-report-ai",
    "components/parent-copilot",
    "lib/parent-copilot",
    "pages/api/parent",
    "utils/fast-diagnostic-engine",
    "utils/diagnostic-labels-he.js",
    "utils/diagnostic-mistake-metadata.js",
    "utils/diagnostic-question-contract.js",
    "utils/topic-next-step-engine.js",
    "utils/topic-next-step-phase2.js",
    "utils/learning-patterns-analysis.js",
    "lib/classroom-activities",
    "lib/guardian-server",
    "lib/teacher-server/teacher-guidance-v2.server.js",
    "lib/teacher-server/teacher-recommendations.server.js",
    "lib/platform-ui/hebrew-display-labels.js",
  ],
  site_general: [
    "pages/student/home.js",
    "pages/student/worksheet",
    "pages/learning/index.js",
    "components/student/StudentAccessGate.js",
    "data/help-center/content",
    "data/legal/sitePolicies.he.js",
    "lib/platform-ui",
  ],
  learning_content: [
    "pages/learning/hebrew-master.js",
    "pages/learning/math-master.js",
    "pages/learning/geometry-master.js",
    "pages/learning/english-master.js",
    "pages/learning/science-master.js",
    "pages/learning/moledet-geography-master.js",
    "pages/learning/curriculum.js",
    "pages/learning/geometry-curriculum.js",
    "pages/student/activity",
    "components/learning",
    "components/student",
    "lib/classroom-activities",
    "lib/learning",
    "utils/hebrew-question-generator.js",
    "utils/hebrew-rich-question-bank.js",
    "utils/hebrew-constants.js",
    "utils/hebrew-explanations.js",
    "utils/math-question-generator.js",
    "utils/math-constants.js",
    "utils/math-explanations.js",
    "utils/geometry-question-generator.js",
    "utils/geometry-constants.js",
    "utils/geometry-explanations.js",
    "utils/geometry-conceptual-bank.js",
    "utils/english-question-generator.js",
    "utils/moledet-geography-question-generator.js",
    "utils/moledet-geography-constants.js",
    "utils/student-question-display.js",
    "data/hebrew-curriculum.js",
    "data/hebrew-g3-reading-bank.js",
    "data/science-questions.js",
    "data/science-curriculum.js",
    "data/english-curriculum.js",
    "data/english-questions",
    "data/geography-questions",
    "data/moledet-geography-curriculum.js",
  ],
};

export const INTERNAL_ONLY_FILE_RE = [
  /utils\/parent-report-language\/forbidden-terms\.js$/,
  /parent-report-hebrew-copy-guard\.mjs$/,
  /parent-report-hebrew-language-selftest\.mjs$/,
  /scripts\/tests\//,
  /selftest\.mjs$/,
  /smoke\.mjs$/,
];

/** Paths scanned by delta gate but excluded from baseline inventories — do not scan in alignment mode. */
export const DELTA_SCAN_EXCLUDE_RE = [
  /data\/help-center\/content\/parent-report/i,
  /^pages\/student\/worksheet\//,
  /review-packages\//,
  /\.cursor\//,
  /docs\//,
];

/** @param {string} raw */
export function decodeJsStringLiteral(raw) {
  return String(raw || "")
    .replace(/\\\\/g, "\u0000")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\u0000/g, "\\");
}

/** @param {string} rel */
export function isInternalOnlySourceFile(rel) {
  const r = String(rel || "").replace(/\\/g, "/");
  return INTERNAL_ONLY_FILE_RE.some((re) => re.test(r));
}

/** @param {string} rel */
export function isDeltaScanExcludedFile(rel) {
  const r = String(rel || "").replace(/\\/g, "/");
  return DELTA_SCAN_EXCLUDE_RE.some((re) => re.test(r));
}
const CRITICAL_KEYWORDS =
  /מומלץ|קידום|העברה|אבחון|המלצ|RI\d|cannotConclude|progression|decision|diagnostic|parent.?report|copilot|next.?step|מגמת|פער ידע|שלב הבא|מעבר רמה/i;

const NEUTRAL_UI_RE =
  /^(סגור|חזור|ביטול|אישור|טוען\.?\.?\.?|שמור|המשך|הבא|קודם|רענן|נסה שוב|אוקיי|כן|לא)$/u;

const LEARNING_EXPERT_RE =
  /question_stem|explanation|science|geography|curriculum|grammar|מדעים|גאוגרפיה|מולדת|דקדוק|הסבר|שאלה/i;

/** @param {string} text */
export function normalizeTextForHash(text) {
  let t = decodeJsStringLiteral(String(text || ""));
  try {
    t = t.normalize("NFC");
  } catch {
    /* ignore */
  }
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/** @param {string} text */
export function normalizeTemplateForHash(text) {
  return normalizeTextForHash(String(text || "").replace(/\$\{[^}]+\}/g, "${*}"));
}

/** @param {string} text @param {boolean} isTemplate */
export function computeTextHash(text, isTemplate = false) {
  const norm = isTemplate ? normalizeTemplateForHash(text) : normalizeTextForHash(text);
  return createHash("sha256").update(norm, "utf8").digest("hex").slice(0, 40);
}

/** @param {object} record */
export function computeBaselineKey(record) {
  const payload = [
    record.domain || "",
    record.inventory_id || "",
    record.text_hash || "",
    record.source_file || "",
    String(record.source_line || ""),
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 40);
}

/** @param {string} text */
export function hebrewGraphemeCount(text) {
  return [...String(text || "")].filter((c) => /\p{Script=Hebrew}/u.test(c)).length;
}

/** @param {string} line @param {string} text */
export function shouldSkipExtractedHit(line, text) {
  const t = String(line || "");
  const raw = String(text || "");
  if (isCommentOrJSDoc(t)) return true;
  if (/\.replace\s*\(/.test(t)) return true;
  if (/\.join\s*\(\s*["']/.test(t)) return true;
  if (/\.includes\s*\(\s*["']/.test(t)) return true;
  if (/(?:one|tok)\s*===\s*["']/.test(t)) return true;
  if (/\$\d/.test(raw) && !/\$\{/.test(raw)) return true;
  if (/^\s*["'][\u0590-\u05FF][^"']*["'],?\s*$/.test(t.trim())) return true;
  const tmpl = detectTemplate(raw);
  if (!tmpl.is_template && hebrewGraphemeCount(raw) < 4) {
    if (
      /^\s*["'`]/.test(t.trim()) ||
      /,\s*["'`]/.test(t) ||
      /\[\s*["'`]/.test(t) ||
      /new Set\s*\(/.test(t) ||
      /\w+\s*:\s*\[/.test(t)
    ) {
      return true;
    }
  }
  return false;
}

/** @param {string} line */
export function isCommentOrJSDoc(line) {
  const t = String(line || "").trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("*/");
}

/** @param {string} text */
export function detectTemplate(text) {
  const t = String(text || "");
  const vars = [...t.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
  return { is_template: vars.length > 0, template_variables: vars };
}

/** @param {string} line */
export function extractStringsFromLine(line) {
  const results = [];
  for (const re of [/"([^"\\]*(?:\\.[^"\\]*)*)"/g, /'([^'\\]*(?:\\.[^'\\]*)*)'/g, /`([^`\\]*(?:\\.[^`\\]*)*)`/g]) {
    let m;
    while ((m = re.exec(line))) {
      if (!HEBREW_RE.test(m[1])) continue;
      const decoded = decodeJsStringLiteral(m[1]);
      if (!HEBREW_RE.test(decoded)) continue;
      results.push({ text: decoded, col: m.index + 1 });
    }
  }
  const jsxRe = />([^<>{}]*[\u0590-\u05FF][^<>{}]*)</g;
  let jm;
  while ((jm = jsxRe.exec(line))) {
    const raw = jm[1].trim();
    if (raw && HEBREW_RE.test(raw)) results.push({ text: raw, col: jm.index + 1 });
  }
  return results;
}

/** @param {string[]} lines @param {number} lineIdx */
export function enclosingFunction(lines, lineIdx) {
  for (let i = lineIdx; i >= Math.max(0, lineIdx - 80); i--) {
    const m =
      lines[i].match(/^\s*export\s+(?:async\s+)?function\s+(\w+)/) ||
      lines[i].match(/^\s*function\s+(\w+)/) ||
      lines[i].match(/^\s*export\s+const\s+(\w+)\s*=/) ||
      lines[i].match(/^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (m) return m[1];
  }
  return "";
}

/** @param {string} rel @param {object} opts @param {string} opts.root */
export function collectFiles(relPath, opts = {}) {
  const root = opts.root || process.cwd();
  const abs = join(root, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) {
    if (!/\.(js|jsx|mjs|json)$/i.test(relPath)) return [];
    return [relPath.replace(/\\/g, "/")];
  }
  if (!st.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name.startsWith(".") || SKIP_DIR_PARTS.has(name)) continue;
    out.push(...collectFiles(join(relPath, name).replace(/\\/g, "/"), opts));
  }
  return out;
}

/** @param {string} rel @param {string} content @param {object} ctx */
export function extractHitsFromFile(rel, content, ctx = {}) {
  const lines = content.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fn = enclosingFunction(lines, i);
    for (const hit of extractStringsFromLine(line)) {
      if (!HEBREW_RE.test(hit.text)) continue;
      const tmpl = detectTemplate(hit.text);
      hits.push({
        source_file: rel,
        source_line: i + 1,
        source_function: fn,
        raw_text: hit.text,
        text_hash: computeTextHash(hit.text, tmpl.is_template),
        is_template: tmpl.is_template,
        template_variables: tmpl.template_variables,
        is_comment: isCommentOrJSDoc(line),
        line_text: line,
        domain_hint: ctx.domain || classifyDomainFromPath(rel),
      });
    }
  }
  return hits;
}

/** @param {string} rel */
export function classifyDomainFromPath(rel) {
  const r = rel.replace(/\\/g, "/");
  if (/parent-report|detailed-parent-report|parent-report-language|parent-facing|components\/parent\b/.test(r)) {
    return "parent_report";
  }
  if (/teacher.*report|school.*report|teacher-ui\.he|school-ui\.he|TeacherClassReport|SchoolReport/.test(r)) {
    return "teacher_school_report";
  }
  if (
    /parent-copilot|parent-report-ai|topic-next-step|fast-diagnostic|diagnostic-labels|learning-patterns-analysis|teacher-guidance|teacher-recommendations/.test(
      r
    )
  ) {
    return "site_decision_ai";
  }
  if (
    /-master\.js$|question-generator|question-bank|science-questions|geography-questions|english-questions|hebrew-explanations|math-explanations|geometry-explanations|classroom-activit/.test(
      r
    )
  ) {
    return "learning_content";
  }
  return "site_general";
}

/** @param {string} rel @param {string} line @param {string} text @param {object} opts */
export function classifyDomain(rel, line, text, opts = {}) {
  if (opts.domain_hint && DOMAINS.includes(opts.domain_hint)) return opts.domain_hint;
  if (opts.visibility === "internal_only" || opts.is_comment) return "internal_only";
  const fromPath = classifyDomainFromPath(rel);
  const domains = [fromPath];
  if (CRITICAL_KEYWORDS.test(`${line} ${text}`) && fromPath === "site_general") domains.unshift("site_decision_ai");
  if (/parent-report|parent-facing|narrative-contract|detailed-report-parent/.test(rel)) return "parent_report";
  return domains[0];
}

/** @param {string} rel @param {string} domain */
export function classifyAudience(rel, domain) {
  if (domain === "parent_report") return "parent";
  if (domain === "teacher_school_report") return "teacher";
  if (domain === "learning_content") return "student";
  if (/pages\/api\/school|school-ui/.test(rel)) return "school";
  if (/guardian|parent-copilot|pages\/api\/parent/.test(rel)) return "parent";
  if (/teacher|pages\/api\/teacher/.test(rel)) return "teacher";
  if (/student|classroom-activit/.test(rel)) return "student";
  return "mixed";
}

/** @param {string} rel @param {string} fn @param {string} line */
export function classifySurface(rel, fn = "", line = "") {
  if (/pages\/api\//.test(rel)) return "api_response";
  if (/-master\.js$/.test(rel)) return "learning_master";
  if (/question-generator|question-bank/.test(rel)) return "generator";
  if (/report/.test(rel)) return "report_builder";
  if (/copilot|parent-report-ai/.test(rel)) return "ai_explainer";
  if (/components\//.test(rel)) return "component";
  if (/data\//.test(rel)) return "data_bank";
  if (fn) return `function:${fn}`;
  return "source";
}

/** @param {string} rel @param {string} line @param {string} text @param {string} domain @param {object} opts */
export function classifyRisk(rel, line, text, domain, opts = {}) {
  if (opts.is_comment || opts.visibility === "internal_only" || domain === "internal_only") {
    return { risk_level: "internal", why_flagged: "Comment/internal-only visibility" };
  }
  if (domain === "parent_report" || /parent-report-ai|parent-copilot|topic-next-step|narrative-contract/.test(rel)) {
    return { risk_level: "critical", why_flagged: "Parent report / AI / decision path" };
  }
  if (domain === "site_decision_ai" || CRITICAL_KEYWORDS.test(`${line} ${text}`)) {
    return { risk_level: "critical", why_flagged: "Decision/diagnostic/recommendation keyword or path" };
  }
  if (domain === "teacher_school_report") {
    return { risk_level: "medium", why_flagged: "Teacher/school report surface" };
  }
  if (domain === "learning_content") {
    return { risk_level: "medium", why_flagged: "Learning content surface" };
  }
  if (NEUTRAL_UI_RE.test(normalizeTextForHash(text))) {
    return { risk_level: "low", why_flagged: "Neutral UI label pattern" };
  }
  if (/pages\/api\//.test(rel)) {
    return { risk_level: "medium", why_flagged: "API response message" };
  }
  return { risk_level: "low", why_flagged: "General site UI" };
}

/** @param {object} row @param {string} domain @param {string} visibility @param {string} contentType */
export function mapBaselineStatus(row, domain, visibility, contentType = "") {
  const invStatus = String(row.status || row.owner_status || "").trim().toLowerCase();
  if (invStatus === "approved") return "approved";
  if (invStatus === "blocked") return "blocked";
  if (invStatus === "internal_only" || visibility === "internal_only" || visibility === "internal-only") {
    return "internal_only";
  }
  if (invStatus === "temporary_qa_only") return "temporary_qa_only";
  if (domain === "learning_content" && LEARNING_EXPERT_RE.test(`${contentType} ${row.raw_text || row.current_hebrew || ""}`)) {
    return "pending_expert_review";
  }
  const text = normalizeTextForHash(row.raw_text || row.current_hebrew || row.template || row.current_text || "");
  if (NEUTRAL_UI_RE.test(text) && domain === "site_general") return "looks_ok_pending";
  return "pending_owner_review";
}

/** @param {string} path */
export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** @param {string} path @param {object[]} records @param {boolean} dryRun */
export function writeJsonl(path, records, dryRun = false) {
  const body = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
  if (dryRun) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

/** @param {unknown} value */
export function csvCell(value) {
  const s = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @param {object[]} rows @param {string[]} columns */
export function sheetFromObjects(rows, columns) {
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))];
}

/** @param {string} root @param {string|null} domainFilter */
export function collectScanFiles(root, domainFilter = null) {
  const roots = domainFilter ? DOMAIN_SCAN_ROOTS[domainFilter] || [] : Object.values(DOMAIN_SCAN_ROOTS).flat();
  const files = [...new Set(roots.flatMap((r) => collectFiles(r, { root })))].sort();
  return files.filter((f) => {
    if (isDeltaScanExcludedFile(f)) return false;
    try {
      return statSync(join(root, f)).isFile();
    } catch {
      return false;
    }
  });
}

/** @param {object[]} baseline @param {string} root */
export function collectScanFilesFromBaseline(baseline, root) {
  const files = new Set();
  for (const b of baseline) {
    const f = String(b.source_file || "").replace(/\\/g, "/");
    if (!f || isDeltaScanExcludedFile(f)) continue;
    try {
      if (statSync(join(root, f)).isFile()) files.add(f);
    } catch {
      /* skip missing */
    }
  }
  return [...files].sort();
}

/** @param {object[]} baseline @param {string} root @param {string|null} domainFilter */
export function collectHybridScanFiles(baseline, root, domainFilter = null) {
  const baselineFiles = collectScanFilesFromBaseline(baseline, root);
  const baselineSet = new Set(baselineFiles);
  const rootFiles = collectScanFiles(root, domainFilter);
  const newFiles = rootFiles.filter((f) => !baselineSet.has(f));
  const files = [...new Set([...baselineFiles, ...newFiles])].sort();
  return {
    files,
    baselineFiles: baselineSet,
    newFiles: new Set(newFiles),
  };
}

/** @param {string} root @param {string[]} files */
export function scanWorkspace(root, files) {
  const snapshot = [];
  const seen = new Set();
  for (const rel of files) {
    let content;
    try {
      content = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    for (const hit of extractHitsFromFile(rel, content)) {
      const key = `${hit.source_file}:${hit.source_line}:${hit.text_hash}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const domain = classifyDomain(rel, hit.line_text, hit.raw_text, {
        domain_hint: hit.domain_hint,
        is_comment: hit.is_comment,
      });
      const vis = hit.is_comment ? "internal_only" : "student_visible";
      const risk = classifyRisk(rel, hit.line_text, hit.raw_text, domain, {
        is_comment: hit.is_comment,
        visibility: vis,
      });
      snapshot.push({
        ...hit,
        domain,
        audience: classifyAudience(rel, domain),
        surface: classifySurface(rel, hit.source_function, hit.line_text),
        visibility: vis,
        risk_level: risk.risk_level,
        why_flagged: risk.why_flagged,
        anchor_key: `${hit.source_file}:${hit.source_line}:${hit.text_hash}`,
      });
    }
  }
  return snapshot;
}

/** @param {object} hit */
export function isInventoryNoiseHit(hit) {
  return shouldSkipExtractedHit(hit.line_text || "", hit.raw_text || "");
}

/** @param {object} baselineRow @param {Map<string, string>} lineCache */
export function isBaselineInventoryNoise(baselineRow, lineCache) {
  const file = String(baselineRow.source_file || "");
  const lineNo = Number(baselineRow.source_line) || 0;
  if (!file || !lineNo) return false;
  const key = `${file}:${lineNo}`;
  if (!lineCache.has(key)) return false;
  return shouldSkipExtractedHit(lineCache.get(key), baselineRow.raw_text || "");
}

/** @param {string|null} root @param {object[]} baseline @param {object[]} current */
export function buildLineTextCache(root, baseline, current) {
  const cache = new Map();
  if (!root) return cache;
  const files = new Set([
    ...baseline.map((b) => b.source_file).filter(Boolean),
    ...current.map((c) => c.source_file).filter(Boolean),
  ]);
  for (const rel of files) {
    let lines;
    try {
      lines = readFileSync(join(root, rel), "utf8").split("\n");
    } catch {
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      cache.set(`${rel}:${i + 1}`, lines[i]);
    }
  }
  return cache;
}

/** @param {object[]} baseline @param {object[]} current @param {object} opts */
export function computeDeltas(baseline, current, opts = {}) {
  const lineCache = opts.lineTextCache || buildLineTextCache(opts.root, baseline, current);
  const suppressNoise = opts.suppressInventoryNoise !== false;
  const scannedFiles = opts.scannedFiles ? new Set(opts.scannedFiles) : null;
  const newScanFiles = opts.newScanFiles || new Set();
  const baselineByHash = new Map();
  const baselineByExactAnchor = new Map();
  const baselineByFileLine = new Map();
  const currentHashSet = new Set(current.map((c) => c.text_hash));

  for (const b of baseline) {
    if (b.status === "deprecated") continue;
    if (!baselineByHash.has(b.text_hash)) baselineByHash.set(b.text_hash, []);
    baselineByHash.get(b.text_hash).push(b);
    if (b.source_file && b.source_line) {
      const exactAnchor = `${b.source_file}:${b.source_line}:${b.text_hash}`;
      baselineByExactAnchor.set(exactAnchor, b);
      const fl = `${b.source_file}:${b.source_line}`;
      if (!baselineByFileLine.has(fl)) baselineByFileLine.set(fl, []);
      baselineByFileLine.get(fl).push(b);
    }
  }

  const matchedBaselineKeys = new Set();
  const deltas = [];
  let seq = 0;

  for (const cur of current) {
    const exactAnchor = cur.anchor_key;
    const exactHit = baselineByExactAnchor.get(exactAnchor);
    if (exactHit) {
      matchedBaselineKeys.add(exactHit.baseline_key);
      continue;
    }

    const hashHits = (baselineByHash.get(cur.text_hash) || []).filter((h) => !matchedBaselineKeys.has(h.baseline_key));
    if (hashHits.length > 0) {
      const ref = hashHits[0];
      matchedBaselineKeys.add(ref.baseline_key);
      const locationDrift =
        ref.source_file !== cur.source_file || Number(ref.source_line) !== Number(cur.source_line);
      if (locationDrift && opts.suppressMovedOnly === false) {
        deltas.push(makeDeltaRow(++seq, "moved", ref, cur));
      }
      continue;
    }

    const fl = `${cur.source_file}:${cur.source_line}`;
    const lineCandidates = (baselineByFileLine.get(fl) || []).filter((h) => !matchedBaselineKeys.has(h.baseline_key));
    if (lineCandidates.length === 1 && lineCandidates[0].text_hash !== cur.text_hash) {
      const ref = lineCandidates[0];
      matchedBaselineKeys.add(ref.baseline_key);
      if (!(suppressNoise && !newScanFiles.has(cur.source_file) && isInventoryNoiseHit(cur))) {
        deltas.push(makeDeltaRow(++seq, "changed", ref, cur));
      }
      continue;
    }

    if (suppressNoise && !newScanFiles.has(cur.source_file) && isInventoryNoiseHit(cur)) continue;

    if (
      opts.suppressInternalOrphan !== false &&
      (isInternalOnlySourceFile(cur.source_file) || cur.is_comment || cur.risk_level === "internal")
    ) {
      continue;
    }

    let changeType = "new";
    if (cur.is_template) changeType = "new_template";
    if (cur.surface === "api_response" || /pages\/api\//.test(cur.source_file)) changeType = "new_api_message";
    deltas.push(makeDeltaRow(++seq, changeType, null, cur));
  }

  for (const b of baseline) {
    if (b.status === "deprecated" || b.status === "internal_only") continue;
    if (matchedBaselineKeys.has(b.baseline_key)) continue;
    if (!b.source_file || !b.source_line) continue;
    if (scannedFiles && !scannedFiles.has(b.source_file)) continue;
    if (currentHashSet.has(b.text_hash)) {
      matchedBaselineKeys.add(b.baseline_key);
      continue;
    }
    if (suppressNoise && isBaselineInventoryNoise(b, lineCache)) {
      matchedBaselineKeys.add(b.baseline_key);
      continue;
    }
    deltas.push(makeDeltaRow(++seq, "removed", b, null));
  }

  return deltas;
}

/** @param {string} rel @param {string} line @param {string} text @param {string} domain @param {object} opts */
export function suggestGovernanceStatus(rel, line, text, domain, opts = {}) {
  const normalized = normalizeTextForHash(text);
  const isInternal =
    opts.is_comment ||
    opts.risk_level === "internal" ||
    domain === "internal_only" ||
    /parent-report-hebrew-copy-guard|forbidden-terms|INTERNAL_ONLY|console\.(log|warn|error)/i.test(`${rel} ${line}`);

  if (isInternal) {
    return {
      suggested_domain: "internal_only",
      suggested_status: "internal_only",
      suggested_classification: "internal_only/internal_only",
    };
  }

  const suggested_domain =
    domain && domain !== "internal_only" ? domain : classifyDomainFromPath(rel) || "site_general";
  let suggested_status = "pending_owner_review";

  if (suggested_domain === "learning_content") {
    suggested_status =
      opts.risk_level === "low" && NEUTRAL_UI_RE.test(normalized)
        ? "looks_ok_pending"
        : "pending_expert_review";
  } else if (
    suggested_domain === "site_general" &&
    opts.risk_level === "low" &&
    NEUTRAL_UI_RE.test(normalized)
  ) {
    suggested_status = "looks_ok_pending";
  }

  return {
    suggested_domain,
    suggested_status,
    suggested_classification: `${suggested_domain}/${suggested_status}`,
  };
}

/** @param {number} seq @param {string} type @param {object|null} oldR @param {object|null} newR */
function makeDeltaRow(seq, type, oldR, newR) {
  const domain = newR?.domain || oldR?.domain || "site_general";
  const risk = newR
    ? { risk_level: newR.risk_level, why_flagged: newR.why_flagged }
    : { risk_level: oldR?.risk_at_baseline || "medium", why_flagged: "Removed from scanned source" };
  const rel = newR?.source_file || oldR?.source_file || "";
  const text = newR?.raw_text || oldR?.raw_text || "";
  const governance =
    oldR?.status && ["changed", "removed", "moved"].includes(type)
      ? {
          suggested_domain: oldR.domain || domain,
          suggested_status: oldR.status,
          suggested_classification: `${oldR.domain || domain}/${oldR.status}`,
        }
      : suggestGovernanceStatus(rel, newR?.line_text || "", text, domain, {
          is_comment: newR?.is_comment,
          risk_level: risk.risk_level,
          surface: newR?.surface || oldR?.surface,
          content_type: oldR?.content_type,
        });
  return {
    id: `DL-HE-${String(seq).padStart(5, "0")}`,
    domain,
    audience: newR?.audience || oldR?.audience || "",
    surface: newR?.surface || oldR?.surface || "",
    source_file: rel,
    source_line: newR?.source_line || oldR?.source_line || "",
    old_text_if_changed: type === "changed" || type === "removed" ? oldR?.raw_text || "" : "",
    new_text: newR?.raw_text || "",
    detected_change_type: type,
    risk_level: risk.risk_level,
    suggested_domain: governance.suggested_domain,
    suggested_status: governance.suggested_status,
    suggested_classification: governance.suggested_classification,
    why_flagged: risk.why_flagged,
    suggested_replacement: "",
    owner_status: "",
    owner_replacement: "",
    notes: oldR?.inventory_id ? `baseline_id=${oldR.inventory_id}` : "",
    baseline_key: oldR?.baseline_key || "",
    text_hash: newR?.text_hash || oldR?.text_hash || "",
    is_template: Boolean(newR?.is_template),
  };
}

/** @param {object[]} deltas @param {object} opts */
export function evaluateGate(deltas, opts = {}) {
  const strict = Boolean(opts.strict);
  const warnOnly = Boolean(opts.warnOnly);
  const criticalNewChanged = deltas.filter(
    (d) =>
      (d.detected_change_type === "new" ||
        d.detected_change_type === "changed" ||
        d.detected_change_type === "new_template" ||
        d.detected_change_type === "new_api_message") &&
      d.risk_level === "critical"
  );
  const mediumNewChanged = deltas.filter(
    (d) =>
      ["new", "changed", "new_template", "new_api_message"].includes(d.detected_change_type) &&
      d.risk_level === "medium"
  );

  let pass = true;
  let exitCode = 0;
  if (criticalNewChanged.length > 0 && !warnOnly) {
    pass = false;
    exitCode = 1;
  }
  if (strict && mediumNewChanged.length > 0 && !warnOnly) {
    pass = false;
    exitCode = 1;
  }

  return {
    pass,
    exitCode: warnOnly ? 0 : exitCode,
    criticalNewChanged: criticalNewChanged.length,
    mediumNewChanged: mediumNewChanged.length,
    totalDeltas: deltas.length,
  };
}

export function classifyDeltaNoiseBucket(delta, baselineByHash, opts = {}) {
  const text = delta.new_text || delta.old_text_if_changed || "";
  const hash = computeTextHash(text, delta.is_template);
  const type = delta.detected_change_type;

  if (type === "moved") return "moved_only_line_shift";
  if (baselineByHash.has(hash)) return "escaping_quote_normalization";

  if (type === "new" && isDeltaScanExcludedFile(delta.source_file)) {
    return "scan_root_mismatch";
  }
  if (type === "new" && isInternalOnlySourceFile(delta.source_file)) {
    return "archive_internal_test_log";
  }
  if (delta.is_template || type === "new_template") return "template_skeleton_mismatch";

  const baseHits = baselineByHash.get(hash) || [];
  if (baseHits.length && type === "new") return "missing_source_line_anchor";

  if (type === "changed") return "true_changed_hebrew";
  if (type === "new" && /parent-copilot|learning-patterns|help-center/.test(delta.source_file || "")) {
    return "scan_root_mismatch";
  }
  if (type === "new") return "true_new_hebrew";
  if (type === "removed") return "unclear_needs_review";
  return "unclear_needs_review";
}

export function buildBaselineHashIndex(baseline) {
  const map = new Map();
  for (const b of baseline) {
    if (!map.has(b.text_hash)) map.set(b.text_hash, []);
    map.get(b.text_hash).push(b);
  }
  return map;
}

export const INVENTORY_SOURCES = [
  {
    domain: "parent_report",
    path: "reports/parent-report-hebrew-copy-inventory.xlsx",
    sheets: [
      { name: "Parent Visible Strings", textFields: ["current_hebrew"] },
      { name: "Dynamic Templates", textFields: ["template"], isTemplate: true },
      { name: "Empty And Thin Data States", textFields: ["current_hebrew"] },
      { name: "Reco And Progression Copy", textFields: ["current_hebrew"] },
      { name: "Collapsed Details Copy", textFields: ["current_hebrew"] },
      { name: "AI Parent Report Copy", textFields: ["current_hebrew"] },
    ],
  },
  {
    domain: "teacher_school_report",
    path: "reports/teacher-school-report-hebrew-copy-inventory.xlsx",
    sheets: [
      { name: "Teacher School Visible", textFields: ["current_hebrew"] },
      { name: "Dynamic Templates", textFields: ["template"], isTemplate: true },
      { name: "Empty And Thin Data States", textFields: ["current_hebrew"] },
      { name: "Diagnostic Guidance Copy", textFields: ["current_hebrew"] },
      { name: "Professional Terms", textFields: ["current_hebrew", "term"] },
      { name: "Export Copy", textFields: ["current_hebrew"] },
    ],
  },
  {
    domain: "site_decision_ai",
    path: "reports/site-decision-hebrew-copy-inventory.xlsx",
    sheets: [
      { name: "Decision Visible Strings", textFields: ["current_hebrew"] },
      { name: "AI Prompt Copy", textFields: ["current_text"] },
      { name: "Diagnostic Decision Labels", textFields: ["current_hebrew"] },
      { name: "Recommendation Progression", textFields: ["current_hebrew"] },
      { name: "Empty Thin Data Messages", textFields: ["current_hebrew"] },
      { name: "Permission Blocking Messages", textFields: ["current_hebrew"] },
      { name: "Student Learning Feedback", textFields: ["current_hebrew"] },
    ],
  },
  {
    domain: "site_general",
    path: "reports/site-general-hebrew-copy-inventory.xlsx",
    sheets: [
      { name: "General Visible Strings", textFields: ["current_hebrew"] },
      { name: "Help Onboarding Policy Copy", textFields: ["current_hebrew"] },
      { name: "Navigation CTA Button Copy", textFields: ["current_hebrew"] },
      { name: "Empty Error Success Info", textFields: ["current_hebrew"] },
      { name: "General Learning UI Copy", textFields: ["current_hebrew"] },
    ],
  },
  {
    domain: "learning_content",
    path: "reports/learning-content-hebrew-inventory.xlsx",
    sheets: [{ name: "Learning Content Strings", textFields: ["current_hebrew"] }],
  },
];
