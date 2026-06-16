#!/usr/bin/env node
import fs from "fs";

const FILE = "utils/geometry-explanations.js";
let src = fs.readFileSync(FILE, "utf8");

if (!src.includes("learningStepDiv as toSpan")) {
  src = src.replace(
    'import GeometryStepLine from "../components/learning/geometry/GeometryStepLine.jsx";',
    `import { mix, M } from "../lib/learning-book/learning-math-line-build.js";
import { learningStepDiv as toSpan } from "./learning-math-line-render.js";`
  );
}

src = src.replace(
  /\n  const ltr = \(expr\) => `\\u2066\$\{expr\}\\u2069`;[^\n]*\n  const toSpan = \(text, key\) => <GeometryStepLine[^;]+;\n/,
  "\n"
);

src = src.replace(/\$\{ltr\(`/g, "${M(`");
src = src.replace(/\$\{iso\("/g, '${M("');
src = src.replace(/\$\{iso\(`/g, "${M(`");

src = src.replace(/toSpan\(\s*\n(\s*)`(?!mix)/g, "toSpan(\n$1mix`");
src = src.replace(/toSpan\(\s*`(?!mix)/g, "toSpan(mix`");
src = src.replace(/toSpan\(\s*\n(\s*)"(?!mix)/g, "toSpan(\n$1mix`");
src = src.replace(/toSpan\(\s*"(?!mix)/g, "toSpan(mix`");

// return `...${M(...)}...` in getErrorExplanation
src = src.replace(/return `([^`]*\$\{M\()/g, "return mix`$1");

// Unicode bidi area formula hint
src = src.replace(
  'return "בדוק שזו נוסחת שטח (ולא היקף): ריבוע \\u2066צלע²\\u2069, מלבן \\u2066אורך×רוחב\\u2069, משולש \\u2066(בסיס×גובה)/2\\u2069, עיגול \\u2066πr²\\u2069.";',
  'return mix`בדוק שזו נוסחת שטח (ולא היקף): ריבוע ${M("צלע²")}, מלבן ${M("אורך×רוחב")}, משולש ${M("(בסיס×גובה)/2")}, עיגול ${M("πr²")}.`;'
);

fs.writeFileSync(FILE, src);
console.log({
  ltr: (src.match(/\bltr\s*\(/g) || []).length,
  iso: (src.match(/\biso\s*\(/g) || []).length,
  bidi: (src.match(/\\u2066/g) || []).length,
});
