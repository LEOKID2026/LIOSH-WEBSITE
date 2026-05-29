/**
 * Analyze Hebrew copy delta noise — bucket root causes on initial 352-delta dry-run.
 * Run: node scripts/hebrew-copy-delta-noise-analysis.mjs [--after-version v1.0.1]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDeltaGate } from "./hebrew-copy-delta-gate.mjs";
import {
  buildBaselineHashIndex,
  collectScanFiles,
  computeDeltas,
  computeTextHash,
  isDeltaScanExcludedFile,
  isInternalOnlySourceFile,
  isInventoryNoiseHit,
  normalizeTextForHash,
  readJsonl,
  scanWorkspace,
} from "./lib/hebrew-copy-scan-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORTS = join(ROOT, "reports");

const INITIAL_SNAPSHOT_CANDIDATES = [
  join(ROOT, "review-packages", "hebrew-copy-delta-gate-review", "reports", "hebrew-copy-delta-summary.json"),
  join(REPORTS, "hebrew-copy-delta-summary.initial-352.json"),
];

const BUCKET_META = {
  moved_only_line_shift: {
    label: "Moved-only / line shift",
    category: "scanner_alignment_noise",
    fix: "Suppress moved deltas when text_hash matches baseline (suppressMovedOnly default true).",
    auto_safe: true,
  },
  escaping_quote_normalization: {
    label: "Escaping / quote normalization",
    category: "scanner_alignment_noise",
    fix: "Apply decodeJsStringLiteral in scan + baseline ingest; align hashes via normalizeTextForHash.",
    auto_safe: true,
  },
  whitespace_bidi_unicode: {
    label: "Whitespace / unicode / bidi normalization",
    category: "scanner_alignment_noise",
    fix: "NFC normalize, strip ZW chars, collapse whitespace in normalizeTextForHash.",
    auto_safe: true,
  },
  template_skeleton_mismatch: {
    label: "Template literal / template skeleton mismatch",
    category: "scanner_alignment_noise",
    fix: "Align is_template detection between inventory sheets and scanner; compare skeleton hashes.",
    auto_safe: false,
  },
  multi_string_line_extraction: {
    label: "Multi-string line extraction mismatch",
    category: "scanner_alignment_noise",
    fix: "Improve per-line extraction to match inventory row granularity; suppress partial replace-rule fragments.",
    auto_safe: false,
  },
  scan_root_mismatch: {
    label: "Scan-root mismatch versus baseline inventory",
    category: "scanner_alignment_noise",
    fix: "Use baseline-aligned file scan; exclude inventory-denied paths (help-center parent-report, student worksheet).",
    auto_safe: true,
  },
  archive_internal_test_log: {
    label: "Archive/internal/test/log strings (internal_only)",
    category: "scanner_alignment_noise",
    fix: "Classify forbidden-terms, guard, selftest, scripts/tests as internal; suppress orphan unmatched.",
    auto_safe: true,
  },
  missing_source_line_anchor: {
    label: "Missing source_line / source anchor from inventory",
    category: "scanner_alignment_noise",
    fix: "Prefer text_hash match over file:line anchor; rebuild baseline with corrected line metadata.",
    auto_safe: false,
  },
  true_new_hebrew: {
    label: "True new Hebrew",
    category: "true_hebrew_change",
    fix: "No auto-suppress — route to owner/expert review.",
    auto_safe: false,
  },
  true_changed_hebrew: {
    label: "True changed Hebrew",
    category: "true_hebrew_change",
    fix: "No auto-suppress — route to owner/expert review.",
    auto_safe: false,
  },
  unclear_needs_review: {
    label: "Unclear / needs review",
    category: "unclear",
    fix: "Manual triage; extend classifier rules after review.",
    auto_safe: false,
  },
};

function summarizeDeltas(deltas) {
  const byType = {};
  const byRisk = {};
  for (const d of deltas) {
    byType[d.detected_change_type] = (byType[d.detected_change_type] || 0) + 1;
    byRisk[d.risk_level] = (byRisk[d.risk_level] || 0) + 1;
  }
  return {
    delta_count: deltas.length,
    by_type: byType,
    new: (byType.new || 0) + (byType.new_template || 0) + (byType.new_api_message || 0),
    changed: byType.changed || 0,
    moved: byType.moved || 0,
    removed: byType.removed || 0,
    critical: byRisk.critical || 0,
    internal: byRisk.internal || 0,
  };
}

function classifyDeltaDetailed(delta, baseline, baselineByHash, baselineFiles, lineCache) {
  const type = delta.detected_change_type;
  const file = String(delta.source_file || delta.old_source_file || "").replace(/\\/g, "/");
  const lineNo = Number(delta.source_line || delta.old_source_line) || 0;
  const text = delta.new_text || delta.old_text_if_changed || "";
  const hash = computeTextHash(text, delta.is_template);

  if (type === "moved") return "moved_only_line_shift";
  if (type === "changed") return "true_changed_hebrew";
  if (type === "new_template") return "template_skeleton_mismatch";

  const normText = normalizeTextForHash(text);
  const normHash = computeTextHash(normText, delta.is_template);
  const hashInBaseline = baselineByHash.has(hash) || baselineByHash.has(normHash);

  if (type === "new" && hashInBaseline) return "missing_source_line_anchor";

  if (type === "new" && (isDeltaScanExcludedFile(file) || !baselineFiles.has(file))) {
    return "scan_root_mismatch";
  }

  if (type === "new" && isInternalOnlySourceFile(file)) return "archive_internal_test_log";

  if (type === "new" && /data\/help-center\/content\/parent-report/i.test(file)) {
    return "scan_root_mismatch";
  }

  if (type === "new" && /forbidden-terms|parent-report-hebrew-copy-guard|selftest|scripts\/tests\//i.test(file)) {
    return "archive_internal_test_log";
  }

  const lineText = lineCache.get(`${file}:${lineNo}`) || "";
  if (type === "new" && lineText && isInventoryNoiseHit({ line_text: lineText, raw_text: text })) {
    if (/\.replace\s*\(/.test(lineText)) return "multi_string_line_extraction";
    if (/^\s*["'][\u0590-\u05FF]/.test(lineText.trim())) return "archive_internal_test_log";
    return "multi_string_line_extraction";
  }

  if (type === "new") {
    const sameFileBaseline = baseline.filter((b) => b.source_file === file);
    if (sameFileBaseline.length > 0 && !hashInBaseline) {
      const lineNear = sameFileBaseline.some((b) => Math.abs(Number(b.source_line) - lineNo) <= 5);
      const substringOfBaseline = sameFileBaseline.some((b) => {
        const base = normalizeTextForHash(b.raw_text || "");
        return base.includes(normText) || normText.includes(base);
      });
      if (lineNear || substringOfBaseline) return "multi_string_line_extraction";
    }
    if (/\\n|\\t|\\"/.test(text)) return "escaping_quote_normalization";
    if (/[\u200B-\u200D\uFEFF]/.test(text)) return "whitespace_bidi_unicode";
    if (delta.is_template) return "template_skeleton_mismatch";
    return "true_new_hebrew";
  }

  if (type === "removed") return "unclear_needs_review";
  return "unclear_needs_review";
}

function buildLineCache(root, deltas) {
  const cache = new Map();
  const files = new Set(deltas.map((d) => d.source_file || d.old_source_file).filter(Boolean));
  for (const rel of files) {
    try {
      const lines = readFileSync(join(root, rel), "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) cache.set(`${rel}:${i + 1}`, lines[i]);
    } catch {
      /* skip */
    }
  }
  return cache;
}

function bucketExamples(deltas, baseline, baselineByHash, baselineFiles, lineCache, limit = 3) {
  const buckets = {};
  for (const d of deltas) {
    const b = classifyDeltaDetailed(d, baseline, baselineByHash, baselineFiles, lineCache);
    if (!buckets[b]) buckets[b] = [];
    if (buckets[b].length < limit) {
      buckets[b].push({
        detected_change_type: d.detected_change_type,
        source_file: d.source_file || d.old_source_file,
        source_line: d.source_line || d.old_source_line,
        text_preview: String(d.new_text || d.old_text_if_changed || "").slice(0, 120),
        suggested_classification: d.suggested_classification,
        risk_level: d.risk_level,
      });
    }
  }
  return buckets;
}

function topNoisyFiles(deltas, n = 15) {
  const counts = {};
  for (const d of deltas) {
    const f = String(d.source_file || d.old_source_file || "unknown").replace(/\\/g, "/");
    counts[f] = (counts[f] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([file, count]) => ({ file, count }));
}

function loadInitial352(root) {
  for (const path of INITIAL_SNAPSHOT_CANDIDATES) {
    if (!existsSync(path)) continue;
    const summary = JSON.parse(readFileSync(path, "utf8"));
    if (summary.delta_count === 352 && Array.isArray(summary.deltas)) {
      return {
        source: path,
        deltas: summary.deltas,
        metrics: summarizeDeltas(summary.deltas),
        mode: "initial_v1.0.0_broad_scan_snapshot",
      };
    }
  }

  const baselinePath = join(root, "data", "hebrew-copy-baseline", "v1.0.0", "baseline.jsonl");
  const baseline = readJsonl(baselinePath);
  const files = collectScanFiles(root, null);
  const current = scanWorkspace(root, files);
  const deltas = computeDeltas(baseline, current, {
    scannedFiles: files,
    root,
    suppressMovedOnly: false,
    suppressInternalOrphan: false,
    suppressInventoryNoise: false,
  });
  return {
    source: "live_replay",
    deltas,
    metrics: summarizeDeltas(deltas),
    mode: "initial_v1.0.0_broad_scan_replay",
    baseline,
  };
}

function runAfterDeltas(root, version) {
  const result = runDeltaGate({
    root,
    baselineVersion: version,
    dryRun: true,
    warnOnly: true,
    scanMode: "hybrid",
    suppressMovedOnly: true,
    suppressInternalOrphan: true,
    suppressInventoryNoise: true,
  });
  return {
    mode: `aligned_${version}`,
    deltas: result.deltas,
    metrics: summarizeDeltas(result.deltas),
    summary: result,
  };
}

function buildReport(initial, after, baseline) {
  const baselineByHash = buildBaselineHashIndex(baseline);
  const baselineFiles = new Set(baseline.map((b) => b.source_file));
  const lineCache = buildLineCache(ROOT, initial.deltas);

  const bucketCounts = {};
  for (const d of initial.deltas) {
    const b = classifyDeltaDetailed(d, baseline, baselineByHash, baselineFiles, lineCache);
    bucketCounts[b] = (bucketCounts[b] || 0) + 1;
  }

  const examples = bucketExamples(initial.deltas, baseline, baselineByHash, baselineFiles, lineCache);

  const byCategory = {
    scanner_alignment_noise: 0,
    true_hebrew_change: 0,
    unclear: 0,
  };
  for (const [bucket, count] of Object.entries(bucketCounts)) {
    const cat = BUCKET_META[bucket]?.category || "unclear";
    byCategory[cat] = (byCategory[cat] || 0) + count;
  }

  const recommendations = Object.entries(BUCKET_META).map(([id, meta]) => ({
    bucket: id,
    label: meta.label,
    category: meta.category,
    count: bucketCounts[id] || 0,
    recommended_fix: meta.fix,
    safe_to_auto_reduce: meta.auto_safe,
  }));

  const remainingUnexplained = after
    ? after.deltas.filter((d) => {
        const b = classifyDeltaDetailed(d, baseline, baselineByHash, baselineFiles, lineCache);
        return b === "true_new_hebrew" || b === "true_changed_hebrew" || b === "unclear_needs_review";
      })
    : [];

  return {
    generated_at: new Date().toISOString(),
    initial_snapshot_source: initial.source,
    before: {
      mode: initial.mode,
      ...initial.metrics,
      top_noisy_files: topNoisyFiles(initial.deltas),
      bucket_counts: bucketCounts,
      bucket_examples: examples,
      by_category: byCategory,
    },
    after: after
      ? {
          mode: after.mode,
          ...after.metrics,
          top_noisy_files: topNoisyFiles(after.deltas),
          remaining_unexplained: remainingUnexplained.map((d) => ({
            detected_change_type: d.detected_change_type,
            source_file: d.source_file,
            source_line: d.source_line,
            text_preview: String(d.new_text || "").slice(0, 120),
          })),
        }
      : null,
    recommendations,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Hebrew Copy Delta Noise Analysis",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `Initial snapshot source: \`${report.initial_snapshot_source}\``,
    "",
    "## Initial 352-delta dry-run (before noise reduction)",
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total deltas | ${report.before.delta_count} |`,
    `| new (+ template) | ${report.before.new} |`,
    `| changed | ${report.before.changed} |`,
    `| moved | ${report.before.moved} |`,
    `| removed | ${report.before.removed} |`,
    `| critical | ${report.before.critical} |`,
    `| internal | ${report.before.internal} |`,
    "",
    "### Category summary",
    "",
    "| Category | Count | Meaning |",
    "|----------|------:|---------|",
    `| Scanner / alignment noise | ${report.before.by_category.scanner_alignment_noise || 0} | Safe to reduce automatically with documented scanner rules |`,
    `| True new/changed Hebrew | ${report.before.by_category.true_hebrew_change || 0} | Must not be auto-suppressed |`,
    `| Unclear / needs review | ${report.before.by_category.unclear || 0} | Manual triage |`,
    "",
    "### Bucket breakdown (all root-cause buckets)",
    "",
    "| Bucket | Count | Auto-safe | Category | Recommended fix |",
    "|--------|------:|:---------:|----------|-----------------|",
  ];

  for (const r of report.recommendations.sort((a, b) => b.count - a.count)) {
    lines.push(
      `| ${r.label} | ${r.count} | ${r.safe_to_auto_reduce ? "yes" : "no"} | ${r.category} | ${r.recommended_fix} |`
    );
  }

  lines.push("", "### Top noisy source files (initial 352)", "");
  for (const { file, count } of report.before.top_noisy_files) {
    lines.push(`- \`${file}\` — ${count}`);
  }

  lines.push("", "### Examples by bucket", "");
  for (const bucketId of Object.keys(BUCKET_META)) {
    const exs = report.before.bucket_examples[bucketId] || [];
    if (!exs.length) continue;
    const meta = BUCKET_META[bucketId];
    lines.push(`#### ${meta.label} (${report.before.bucket_counts[bucketId] || 0})`, "");
    for (const ex of exs) {
      lines.push(
        `- **${ex.detected_change_type}** \`${ex.source_file}:${ex.source_line}\` — "${ex.text_preview}" (${ex.suggested_classification || "n/a"})`
      );
    }
    lines.push("");
  }

  if (report.after) {
    lines.push("## After noise reduction (v1.0.1 aligned scan)", "");
    lines.push("| Metric | Before | After |", "|--------|-------:|------:|");
    for (const k of ["delta_count", "new", "changed", "moved", "removed", "critical", "internal"]) {
      lines.push(`| ${k} | ${report.before[k]} | ${report.after[k]} |`);
    }
    lines.push("");
    if (report.after.delta_count === 0) {
      lines.push("_No remaining deltas on unchanged workspace._", "");
    } else {
      lines.push("### Remaining deltas (after)", "");
      for (const { file, count } of report.after.top_noisy_files) {
        lines.push(`- \`${file}\` — ${count}`);
      }
      if (report.after.remaining_unexplained?.length) {
        lines.push("", "### Remaining unexplained", "");
        for (const r of report.after.remaining_unexplained) {
          lines.push(`- **${r.detected_change_type}** \`${r.source_file}:${r.source_line}\` — "${r.text_preview}"`);
        }
      }
    }
  }

  return lines.join("\n");
}

function main() {
  const afterVersion = process.argv.includes("--after-version")
    ? process.argv[process.argv.indexOf("--after-version") + 1]
    : "v1.0.1";

  mkdirSync(REPORTS, { recursive: true });

  const initial = loadInitial352(ROOT);
  const baseline =
    initial.baseline || readJsonl(join(ROOT, "data", "hebrew-copy-baseline", "v1.0.0", "baseline.jsonl"));

  let after = null;
  try {
    after = runAfterDeltas(ROOT, afterVersion);
  } catch (e) {
    console.warn(`After-metrics skipped: ${e.message}`);
  }

  const report = buildReport(initial, after, baseline);
  writeFileSync(join(REPORTS, "hebrew-copy-delta-noise-analysis.json"), JSON.stringify(report, null, 2), "utf8");
  writeFileSync(join(REPORTS, "hebrew-copy-delta-noise-analysis.md"), renderMarkdown(report), "utf8");

  console.log(`Noise analysis written (${report.before.delta_count} initial deltas)`);
  if (report.after) console.log(`After deltas: ${report.after.delta_count}`);
}

main();
