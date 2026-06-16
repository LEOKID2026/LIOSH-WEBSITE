#!/usr/bin/env node
import fs from "fs";

const path = "utils/math-animations.js";
let src = fs.readFileSync(path, "utf8");

src = src.replace(/return `\\u2066\$\{raw\}\\u2069`;/g, "return pureMathLtrDisplay(raw);");
src = src.replace(
  /return `\\u2066\$\{\[line1, line2, line3, \.\.\.paddedWork\]\.join\("\\n"\)\}\\u2069`;/g,
  "return pureMathLtrBlock([line1, line2, line3, ...paddedWork]);"
);
src = src.replace(/const ltrWrap = \(raw\) => `\\u2066\$\{raw\}\\u2069`;/g, "");
src = src.replace(/\bltrWrap\(/g, "pureMathLtrDisplay(");
src = src.replace(/const ltr = \(expr\) => `\\u2066\$\{expr\}\\u2069`;\n/g, "");
src = src.replace(/const preBlock = \(lines\) => `\\u2066\$\{lines\.join\("\\n"\)\}\\u2069`;\n/g, "");
src = src.replace(/\bltr\(/g, "pureMathLtrDisplay(");
src = src.replace(/\bpreBlock\(/g, "pureMathLtrBlock(");

src = src.replace(
  /title: `שורה \$\{j \+ 1\}: כופלים ב-\$\{bd\}\$\{j === 0 \? " \(אחדות\)" : j === 1 \? " \(עשרות\)" : " \(מקום גבוה\)"\}`,/,
  `title: flattenTemplateRuns(
      unwrapLearningRuns(
        mix\`שורה \${M(String(j + 1))}: כופלים ב-\${M(String(bd))}\${j === 0 ? " (אחדות)" : j === 1 ? " (עשרות)" : " (מקום גבוה)"}\`
      )
    ),`
);

src = src.replace(
  /`מכנה משותף ל-\$\{den1\} ו-\$\{den2\} הוא \$\{commonDen\}`,/,
  `flattenTemplateRuns(
        unwrapLearningRuns(
          mix\`מכנה משותף ל-\${M(String(den1))} ו-\${M(String(den2))} הוא \${M(String(commonDen))}\`
        )
      ),`
);

fs.writeFileSync(path, src);
console.log("math-animations ltr migration done");
