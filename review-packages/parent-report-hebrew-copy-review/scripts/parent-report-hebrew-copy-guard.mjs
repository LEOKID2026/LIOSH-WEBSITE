/**
 * Parent report Hebrew copy guard — scans parent-facing source strings for forbidden jargon.
 * Run: node scripts/parent-report-hebrew-copy-guard.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  PARENT_COPY_FORBIDDEN_FRAGMENTS,
  findParentCopyForbiddenFragmentsInString,
  findReadabilityLeakSubstringsInString,
} = await import(u("utils/parent-report-language/forbidden-terms.js"));
const { normalizeParentFacingHe } = await import(u("utils/parent-report-language/parent-facing-normalize-he.js"));
const { buildNarrativeContractV1, narrativeSectionTextHe } = await import(u("utils/contracts/narrative-contract-v1.js"));
const {
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
} = await import(u("utils/parent-report-language/subject-evidence-policy.js"));

const SKIP_FILES = new Set([
  "utils/parent-report-language/forbidden-terms.js",
  "utils/parent-report-language/parent-facing-normalize-he.js",
]);

const SCAN_ROOTS = [
  "utils/parent-report-language",
  "utils/parent-data-presence.js",
  "utils/detailed-parent-report.js",
  "utils/detailed-report-parent-letter-he.js",
  "utils/parent-report-ui-explain-he.js",
  "utils/parent-report-v2.js",
  "utils/parent-report-row-diagnostics.js",
  "utils/contracts/narrative-contract-v1.js",
  "pages/learning/parent-report.js",
  "pages/learning/parent-report-detailed.js",
  "pages/learning/parent-report-detailed.renderable.jsx",
  "components/parent-report-detailed-surface.jsx",
  "components/parent",
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
    if (/\.(js|jsx|mjs)$/i.test(relPath)) return [relPath.replace(/\\/g, "/")];
    return [];
  }
  if (!st.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    out.push(...collectFiles(join(relPath, name).replace(/\\/g, "/")));
  }
  return out;
}

const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].filter((f) => !SKIP_FILES.has(f));
const violations = [];

for (const rel of files) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  for (const frag of PARENT_COPY_FORBIDDEN_FRAGMENTS) {
    let idx = 0;
    while (idx < text.length) {
      const at = text.indexOf(frag, idx);
      if (at < 0) break;
      const line = text.slice(0, at).split("\n").length;
      violations.push({ file: rel, line, fragment: frag });
      idx = at + frag.length;
    }
  }
}

assert.equal(
  violations.length,
  0,
  `forbidden parent-copy fragments in sources:\n${violations
    .slice(0, 20)
    .map((v) => `  ${v.file}:${v.line} — ${v.fragment}`)
    .join("\n")}${violations.length > 20 ? `\n  …and ${violations.length - 20} more` : ""}`
);

const narrativeSamples = [];
for (const q of [0, 3, 12, 40]) {
  for (const acc of [45, 72, 88]) {
    const c = buildNarrativeContractV1({
      topicKey: "fractions",
      subjectId: "math",
      displayName: "שברים",
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
    for (const section of ["summary", "finding", "recommendation", "limitations"]) {
      narrativeSamples.push(narrativeSectionTextHe(section, c));
    }
  }
}

const renderedSamples = [
  zeroEvidenceSubjectLineHe("חשבון"),
  thinEvidenceSubjectLineHe("עברית", 5),
  ...narrativeSamples,
].map((s) => normalizeParentFacingHe(String(s || "")));

for (const [i, sample] of renderedSamples.entries()) {
  const copyHits = findParentCopyForbiddenFragmentsInString(sample);
  assert.equal(copyHits.length, 0, `rendered sample[${i}] forbidden: [${copyHits.join(", ")}]\n${sample.slice(0, 200)}`);
  const leakHits = findReadabilityLeakSubstringsInString(sample);
  assert.equal(leakHits.length, 0, `rendered sample[${i}] readability leak: [${leakHits.join(", ")}]\n${sample.slice(0, 200)}`);
}

console.log(
  "parent-report-hebrew-copy-guard: OK",
  files.length,
  "files scanned,",
  renderedSamples.length,
  "rendered samples checked"
);
