#!/usr/bin/env node
/**
 * Static audit: label helpers must not leak raw English keys to UI.
 * Also scans school/admin UI source for obvious raw-key fallbacks.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import {
  RAW_VISIBLE_KEY_DENYLIST,
  subjectLabelHe,
  activityModeLabelHe,
  activityStatusLabelHe,
  roleLabelHe,
  auditActionLabelHe,
  apiErrorMessageHe,
} from "../../lib/platform-ui/hebrew-display-labels.js";

const ROOT = process.cwd();
const SCAN_DIRS = [
  "pages/school",
  "components/reporting",
  "components/teacher-portal",
  "lib/school-portal",
  "pages/admin/schools",
  "components/admin",
  "lib/admin-portal",
  "lib/platform-ui",
  "lib/classroom-activities/classroom-activities-labels.client.js",
];

const BAD_FALLBACK_RE = /\|\|\s*(k|key|mode|status|tier|code|action|role|subject|mode|status)\b/;
const RAW_KEY_IN_JSX_RE =
  />\s*(math|geometry|english|hebrew|science|moledet_geography|guided_practice|quiz|homework|school_admin)\s*</gi;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(extname(name))) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles() {
  const files = new Set();
  for (const rel of SCAN_DIRS) {
    const full = join(ROOT, rel);
    try {
      const st = statSync(full);
      if (st.isFile()) files.add(full);
      else walk(full).forEach((f) => files.add(f));
    } catch {
      /* skip */
    }
  }
  return [...files];
}

function testLabelHelpers() {
  const failures = [];
  for (const key of RAW_VISIBLE_KEY_DENYLIST) {
    const checks = [
      ["subject", subjectLabelHe(key)],
      ["mode", activityModeLabelHe(key)],
      ["status", activityStatusLabelHe(key)],
      ["role", roleLabelHe(key)],
      ["audit", auditActionLabelHe(key)],
      ["api", apiErrorMessageHe(key)],
    ];
    for (const [kind, label] of checks) {
      if (label === key || RAW_VISIBLE_KEY_DENYLIST.includes(String(label).toLowerCase())) {
        failures.push(`helper ${kind} leaked raw key "${key}" -> "${label}"`);
      }
    }
  }
  return failures;
}

function scanSources(files) {
  const issues = [];
  for (const file of files) {
    const rel = file.replace(ROOT + "\\", "").replace(ROOT + "/", "");
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (line.includes("hebrew-display-labels") && line.includes("||")) return;
      if (BAD_FALLBACK_RE.test(line) && /LabelHe|labelHe|StatusHe|ModeHe/.test(line)) {
        issues.push(`${rel}:${i + 1} suspicious raw-key fallback: ${line.trim()}`);
      }
      if (RAW_KEY_IN_JSX_RE.test(line)) {
        issues.push(`${rel}:${i + 1} raw key in JSX text: ${line.trim()}`);
      }
    });
  }
  return issues;
}

const helperFails = testLabelHelpers();
const sourceIssues = scanSources(collectFiles());

if (helperFails.length || sourceIssues.length) {
  console.error("audit-hebrew-visible-text: FAIL\n");
  for (const f of helperFails) console.error("  [helper]", f);
  for (const s of sourceIssues.slice(0, 40)) console.error("  [source]", s);
  if (sourceIssues.length > 40) console.error(`  ... and ${sourceIssues.length - 40} more`);
  process.exit(1);
}

console.log("audit-hebrew-visible-text: PASS");
console.log(`  label helpers: ${RAW_VISIBLE_KEY_DENYLIST.length} denylist keys checked`);
console.log(`  source files scanned: ${collectFiles().length}`);
