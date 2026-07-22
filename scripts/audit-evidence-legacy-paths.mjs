#!/usr/bin/env node
/**
 * Full runtime audit — legacy evidence paths (topic-only, wrong-count-only, ungated parent copy).
 * Run: node scripts/audit-evidence-legacy-paths.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SCAN_DIRS = [
  "utils",
  "lib",
  "pages/learning",
  "pages/parent",
  "components",
  "data",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  "tmp",
  "tests",
]);

const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs"]);

const LEGACY_PATTERNS = [
  {
    id: "wrong_count_only_fallback",
    re: /wrongs\.length === 0\s*&&\s*wrongCountForRules >= trow\.minWrong/,
    severity: "blocker",
  },
  {
    id: "passesRecurrenceRules_without_evidence",
    re: /passesRecurrenceRules\s*\(\s*wrongs/,
    severity: "blocker",
  },
  {
    id: "topic_only_pattern_inference",
    re: /inferPatternFromTopic|patternFromTopic|topicInference/,
    severity: "blocker",
  },
  {
    id: "parent_copy_without_evidence_gate",
    re: /subskillCandidate.*confidence:\s*0\.78/,
    severity: "warn",
  },
  {
    id: "direct_patternHe_conclusion",
    re: /detectedPattern\s*=.*patternHe/,
    severity: "warn",
  },
  {
    id: "wrong_count_only_diagnosis",
    re: /wrongCount\s*>=\s*.*minWrong(?!.*evidence|.*tag|.*misconception)/,
    severity: "warn",
  },
];

/** @param {string} dir */
function walkFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkFiles(abs, out);
    } else if (EXT.has(name.slice(name.lastIndexOf(".")))) {
      out.push(abs);
    }
  }
  return out;
}

/** @param {string} absPath */
function scanFile(absPath) {
  const relPath = relative(ROOT, absPath).replace(/\\/g, "/");
  let text;
  try {
    text = readFileSync(absPath, "utf8");
  } catch {
    return { file: relPath, hits: [] };
  }
  /** @type {Array<{ id: string, severity: string, line: number }>} */
  const hits = [];
  const lines = text.split("\n");
  for (const pat of LEGACY_PATTERNS) {
    lines.forEach((line, i) => {
      if (pat.re.test(line)) {
        hits.push({ id: pat.id, severity: pat.severity, line: i + 1 });
      }
    });
  }
  return { file: relPath, hits };
}

function main() {
  const files = SCAN_DIRS.flatMap((d) => walkFiles(join(ROOT, d)));
  const results = files.map(scanFile);
  const allHits = results.flatMap((r) => r.hits.map((h) => ({ ...h, file: r.file })));
  const blockers = allHits.filter((h) => h.severity === "blocker");
  const warns = allHits.filter((h) => h.severity === "warn");

  console.log("=== Full Legacy Evidence Path Audit ===\n");
  console.log(`Scanned ${files.length} files in ${SCAN_DIRS.join(", ")}\n`);

  const dirty = results.filter((r) => r.hits.length > 0);
  if (dirty.length === 0) {
    console.log("All scanned files clean.");
  } else {
    for (const r of dirty) {
      console.log(`${r.file}:`);
      for (const h of r.hits) {
        console.log(`  [${h.severity}] ${h.id} line ${h.line}`);
      }
    }
  }

  console.log(`\nBlockers: ${blockers.length}`);
  console.log(`Warnings: ${warns.length}`);
  process.exit(blockers.length > 0 ? 1 : 0);
}

main();
