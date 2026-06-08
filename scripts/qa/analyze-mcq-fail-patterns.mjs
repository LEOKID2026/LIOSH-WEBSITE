#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ART = join(ROOT, "docs/qa/_artifacts/mcq-obvious-answer-risk/mcq-obvious-answer-risk.json");
const data = JSON.parse(readFileSync(ART, "utf8"));

const fails = data.flaggedQuestions.filter((q) => q.maxSeverity === "FAIL");

console.log("Total FAIL:", fails.length);
console.log("");

for (const subject of [
  "moledet_geography",
  "science",
  "hebrew",
  "geometry",
  "english",
  "math",
]) {
  const sub = fails.filter((q) => q.subject === subject);
  console.log(`=== ${subject} (${sub.length}) ===`);
  const byCat = {};
  const byFile = {};
  const byPattern = {};
  for (const q of sub) {
    for (const r of q.risks.filter((x) => x.severity === "FAIL")) {
      byCat[r.category] = (byCat[r.category] || 0) + 1;
      if (r.category === "F_stem_option_clue") {
        const m = r.explanation.match(/"([^"]+)"/);
        const kw = m ? m[1] : "?";
        byPattern[kw] = (byPattern[kw] || 0) + 1;
      }
    }
    const f = q.sourceFile || q.source || "?";
    byFile[f] = (byFile[f] || 0) + 1;
  }
  console.log("  categories:", byCat);
  console.log("  top files:", Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5));
  const topKw = Object.entries(byPattern).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topKw.length) console.log("  top stem keywords:", topKw);
  console.log("");
}
