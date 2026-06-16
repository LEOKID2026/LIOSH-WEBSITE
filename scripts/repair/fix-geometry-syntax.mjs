#!/usr/bin/env node
import fs from "fs";

const FILE = "utils/geometry-explanations.js";
let src = fs.readFileSync(FILE, "utf8");

// Fix toSpan(mix`...`." -> toSpan(mix`...`.`,
src = src.replace(/toSpan\(mix`([^`]*)\.", "(\d+)"\)/g, "toSpan(mix`$1.`, \"$2\")");

// Remaining ltr/iso in scoped functions (not getHint)
src = src.replace(/\n  const ltr = \(expr\) => `\\u2066\$\{expr\}\\u2069`;[^\n]*\n/g, "\n");
src = src.replace(/\n  const iso = \(expr\) => `\\u2066\$\{expr\}\\u2069`;\n/g, "\n");
src = src.replace(/\$\{ltr\(/g, "${M(");
src = src.replace(/\$\{ltr\(`/g, "${M(`");

// pythagoras error string
src = src.replace(
  'return "משולש ישר זווית: \\u2066a² + b² = c²\\u2069. יתר מול הזווית הישרה, ניצבים כותפיים.";',
  'return mix`משולש ישר זווית: ${M("a² + b² = c²")}. יתר מול הזווית הישרה, ניצבים כותפיים.`;'
);

// Fix multiline toSpan: mix`...`." -> mix`...`.`,
src = src.replace(/mix`([^`]+)\.",/g, "mix`$1.`,");

fs.writeFileSync(FILE, src);
console.log({
  brokenQuote: (src.match(/mix`[^`]*\.", "/g) || []).length,
  ltr: (src.match(/\bltr\s*\(/g) || []).length,
  iso: (src.match(/\biso\s*\(/g) || []).length,
  bidiInScope: (src.match(/\\u2066/g) || []).length,
});
