#!/usr/bin/env node
/** Fix remaining text: fields and broken ternaries in math-animations.js */
import fs from "fs";
import { execSync } from "child_process";

const FILE = "utils/math-animations.js";
let src = fs.readFileSync(FILE, "utf8");
const orig = execSync(`git show HEAD:${FILE}`, { encoding: "utf8" });

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

// Fix broken ternaries by restoring from git and converting
const rowDoneOrig = orig.match(
  /steps\.push\(\{\s*id: `row-\$\{j\}-done`,[\s\S]*?pre: makeSnapshot\(\{ partialRows: partials\.map\(\(p\) => p\) \}\),\s*\}\);/
)?.[0];
if (rowDoneOrig) {
  const converted = rowDoneOrig
    .replace(
      /text:\s*j === 0\s*\?\s*`([^`]*)`\s*:\s*`([^`]*)`,/,
      (_, a, b) =>
        `...(j === 0 ? learningStepFields(mix\`${esc(a)}\`) : learningStepFields(mix\`${esc(b)}\`)),`
    )
    .replace(/\$\{rowValue\}/g, "${rowValue}")
    .replace(/\$\{shifted\}/g, "${shifted}");
  src = src.replace(
    /steps\.push\(\{\s*id: `row-\$\{j\}-done`,[\s\S]*?pre: makeSnapshot\(\{ partialRows: partials\.map\(\(p\) => p\) \}\),\s*\}\);/,
    converted.includes("learningStepFields") ? converted : rowDoneOrig.replace(
      /text:\s*j === 0[\s\S]*?,/,
      `...(j === 0 ? learningStepFields(mix\`קיבלנו מכפלה חלקית: \${rowValue}.\`) : learningStepFields(mix\`קיבלנו \${rowValue}. כי כפלנו בספרת מקום גבוה (×\${repeat("10", j).replace(/10/g, "10") || 10}), מוסיפים \${j} אפסים בסוף ⇒ \${shifted}.\`)),`
    )
  );
}

src = src.replace(
  /text:\s*\n\s*: `סיימנו! המנה היא \$\{quotient\} בלי שארית\.`,/,
  `...(finalRemainder > 0
        ? learningStepFields(mix\`סיימנו! התשובה היא \${M(\`\${quotient}\${remainderSuffix}\`)}.\`)
        : learningStepFields(mix\`סיימנו! המנה היא \${quotient} בלי שארית.\`)),`
);

// Fix math boundary leaks (. inside M before Hebrew)
src = src.replace(
  /\$\{M\(`\$\{da\} \+ \$\{db\}\$\{carry \? " \+ " \+ carry : ""\} = \$\{sum\}\. `\)\}כותבים/g,
  "${M(`${da} + ${db}${carry ? \" + \" + carry : \"\"} = ${sum}`)}. כותבים"
);
src = src.replace(
  /\$\{M\(`\$\{da\} - \$\{db\} = \$\{diff\} `\)\}וכותבים/g,
  "${M(`${da} - ${db} = ${diff}`)} וכותבים"
);
src = src.replace(
  /mix`מכפילים: \$\{M\(`\$\{A\} × \$\{B\} = \$\{ansNum\}\.`\)\}`/g,
  "mix`מכפילים: ${M(`${A} × ${B} = ${ansNum}`)}.`"
);

// ltr-wrapped text fields -> learningStepFields(mix`${M(...)}`)
src = src.replace(
  /\btext:\s*`\$\{ltr\(`([^`]*?)`\)\}`/g,
  "...learningStepFields(mix`${M(`$1`)}`)"
);

// inline steps.push calc lines with ltr
src = src.replace(
  /steps\.push\(\{([^}]*?)\btext:\s*`\$\{ltr\(`([^`]*?)`\)\}`([^}]*)\}\)/g,
  "steps.push({$1...learningStepFields(mix`${M(`$2`)}`),$3})"
);

// multiline multiplication step (carry ternary)
src = src.replace(
  /text: `מכפילים \$\{ad\} × \$\{bd\}\$\{carryText\} = \$\{prod\}\. כותבים \$\{digit\} במקום הזה\$\{nextCarry \? ` ונושאים \$\{nextCarry\} לשלב הבא\.` : " \(אין נשיאה\."\)\s*\n\s*\}\`,/s,
  "...learningStepFields(mix`מכפילים ${M(`${ad} × ${bd}${carryText} = ${prod}`)}. כותבים ${digit} במקום הזה${nextCarry ? ` ונושאים ${nextCarry} לשלב הבא.` : \" (אין נשיאה).\"}`),"
);

// Remaining single-line text: `...`,
src = src.replace(
  /^(\s*)text: (`(?:\\.|[^`\\])*`),\s*$/gm,
  (_, indent, tpl) => {
    const inner = tpl.slice(1, -1);
    if (inner.includes("${ltr(")) return `${indent}text: ${tpl},`;
    if (/[+−\-×÷=<>→]/.test(inner) && inner.includes("${")) {
      return `${indent}...learningStepFields(mix${tpl}),`;
    }
    if (!inner.includes("${")) {
      return `${indent}...learningStepFields(mix${tpl}),`;
    }
    return `${indent}...learningStepFields(mix${tpl}),`;
  }
);

fs.writeFileSync(FILE, src);
const remaining = (src.match(/\btext:\s*[`'"]/g) || []).length;
console.log(`Fixed remaining; text: fields left: ${remaining}`);
