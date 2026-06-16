#!/usr/bin/env node
/**
 * Scan for REAL free mixed Hebrew+math string generators in learning scope.
 * Run: node scripts/repair/scan-free-mixed-math-generators.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const TARGETS = [
  "utils/math-explanations.js",
  "utils/math-animations.js",
  "utils/comparison-sign-mcq.js",
  "utils/geometry-explanations.js",
  "utils/learning-step-animation-pipeline.js",
  "lib/learning-book",
  "components/learning-book",
  "components/learning",
];

const STRUCTURED_MARKERS = [
  "mix`",
  "M(",
  "learningStepFields",
  "learningAnimStep",
  "learningAnimProse",
  "pushMixStep",
  "pushLearningAnimStep",
  "withLearningRuns",
  "buildComparisonConclusionRuns",
  "buildComparisonSignWrongAnswerRuns",
  "learningStepDiv",
  "toSpan(mix",
  "parseTemplateRuns",
  "flattenTemplateRuns",
  "unwrapLearningRuns",
  "__learningRuns",
  "__mathEmbed",
  "pureMathLtrDisplay",
  "pureMathLtrBlock",
  "buildVerticalOperation",
];

const OUT_OF_SCOPE_MARKERS = [
  "export function getHint",
  "function getHint(",
  "// hints out of scope",
];

/** @param {string} dir */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith("_")) continue;
      walk(full, out);
    } else if (/\.(js|jsx|mjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** @param {string} line */
function isStructuredLine(line) {
  return STRUCTURED_MARKERS.some((m) => line.includes(m));
}

/** @param {string} line */
function isInfrastructureLine(line, lines, idx) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/**")) return true;
  if (/\.replace\([^)]*\\u2066\|\\u2069/.test(line)) return true;
  if (/parseLegacyLtrMarkedString/.test(line)) return true;
  if (/Detect text that should render LTR/.test(line)) return true;
  if (/const re = \/\\u2066/.test(line)) return true;
  const chunk = lines.slice(Math.max(0, idx - 5), idx + 1).join("\n");
  if (/function pureMathLtr(Display|Block)/.test(chunk)) return true;
  return false;
}

/** @param {string[]} lines @param {number} idx */
function isOutOfScopeContext(lines, idx) {
  const windowStart = Math.max(0, idx - 80);
  const chunk = lines.slice(windowStart, idx + 1).join("\n");
  if (/export function getHint\b/.test(chunk) && !chunk.includes("export function getSolutionSteps")) {
    const afterHint = chunk.lastIndexOf("export function getHint");
    const afterSolution = chunk.lastIndexOf("export function getSolutionSteps");
    if (afterHint > afterSolution || afterSolution < 0) return true;
  }
  if (/export function getHint\b/.test(lines.slice(Math.max(0, idx - 120), idx + 1).join("\n"))) {
    const slice = lines.slice(Math.max(0, idx - 120), idx + 1).join("\n");
    const hintIdx = slice.lastIndexOf("export function getHint");
    const solutionIdx = slice.lastIndexOf("export function getSolutionSteps");
    const errorIdx = slice.lastIndexOf("export function getErrorExplanation");
    const buildIdx = slice.lastIndexOf("export function buildStepExplanation");
    const nextFn = Math.max(solutionIdx, errorIdx, buildIdx);
    if (hintIdx >= 0 && (nextFn < 0 || hintIdx > nextFn)) return true;
  }
  return false;
}

const PATTERNS = [
  { id: "ltr-bidi-markers", re: /\\u2066|\\u2067|\\u2068|\\u2069/g },
  { id: "legacy-ltr-helper", re: /\bltr\s*\(|const LTR\s*=|\bLTR\s*\(/g },
  { id: "text-field-animation", re: /\btext:\s*`[^`]*[\d][^`]*[=+−\-×÷<>]/g },
  {
    id: "mixed-template-literal",
    re: /`[^`]*[\u0590-\u05FF][^`]*[\d][^`]*[=+−\-×÷<>°]/g,
  },
];

/** @type {Record<string, unknown[]>} */
const findings = { real: {}, allowed: {}, outOfScope: {} };

for (const target of TARGETS) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) continue;
  const files = fs.statSync(full).isDirectory() ? walk(full) : [full];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

    let inGetHint = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^export function getHint\b/.test(line.trim())) inGetHint = true;
      if (/^export function (getSolutionSteps|getErrorExplanation|buildStepExplanation|buildGeometry)/.test(line.trim())) {
        inGetHint = false;
      }

      if (line.includes("parseLegacyLtrMarkedString")) continue;

      for (const { id, re } of PATTERNS) {
        re.lastIndex = 0;
        if (!re.test(line)) continue;

        const entry = {
          file: rel,
          line: i + 1,
          pattern: id,
          snippet: line.trim().slice(0, 120),
        };

        if (inGetHint || isOutOfScopeContext(lines, i)) {
          if (!findings.outOfScope[rel]) findings.outOfScope[rel] = [];
          findings.outOfScope[rel].push(entry);
        } else if (isInfrastructureLine(line, lines, i) || isStructuredLine(line)) {
          if (!findings.allowed[rel]) findings.allowed[rel] = [];
          findings.allowed[rel].push(entry);
        } else {
          if (!findings.real[rel]) findings.real[rel] = [];
          findings.real[rel].push(entry);
        }
      }
    }
  }
}

const realTotal = Object.values(findings.real).reduce((a, b) => a + b.length, 0);
const allowedTotal = Object.values(findings.allowed).reduce((a, b) => a + b.length, 0);
const oosTotal = Object.values(findings.outOfScope).reduce((a, b) => a + b.length, 0);

const outPath = path.join("docs", "repair", "free-mixed-math-generator-scan.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: {
        realHitsInScope: realTotal,
        allowedStructuredFalsePositives: allowedTotal,
        outOfScopeHits: oosTotal,
        filesWithRealFindings: Object.keys(findings.real).length,
      },
      realFindings: findings.real,
      allowedFalsePositives: findings.allowed,
      outOfScopeFindings: findings.outOfScope,
      note: "PASS requires realHitsInScope === 0. getHint bodies are out-of-scope. pureMathLtrDisplay/Block and mix/M() are allowed structured usage.",
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    { outPath, realHitsInScope: realTotal, allowedFalsePositives: allowedTotal, outOfScopeHits: oosTotal },
    null,
    2
  )
);

process.exit(realTotal === 0 ? 0 : 1);
