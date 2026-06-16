#!/usr/bin/env node
/**
 * Carefully migrate buildStepExplanation steps to pushMixStep + mix/M.
 * Keeps LTR() for exercise/vertical display strings only.
 */
import fs from "fs";

const FILE = "utils/math-explanations.js";
let src = fs.readFileSync(FILE, "utf8");

if (!src.includes("function pushMixStep")) {
  src = src.replace(
    "export function buildStepExplanation(question) {",
    `function pushMixStep(steps, line) {
  steps.push(toSpan(line, String(steps.length)));
}

export function buildStepExplanation(question) {`
  );
}

const fnStart = src.indexOf("export function buildStepExplanation");
const fnEnd = src.indexOf("\nexport function", fnStart + 1);
let fn = src.slice(fnStart, fnEnd);

// steps.push string literals -> pushMixStep(steps, mix`...`)
fn = fn.replace(/steps\.push\(\s*\n(\s*)"/g, "pushMixStep(steps,\n$1mix`");
fn = fn.replace(/steps\.push\(\s*"/g, "pushMixStep(steps, mix`");
fn = fn.replace(/steps\.push\(\s*\n(\s*)`/g, "pushMixStep(steps,\n$1mix`");
fn = fn.replace(/steps\.push\(\s*`/g, "pushMixStep(steps, mix`");

// Close pushMixStep: `); -> `);
fn = fn.replace(/pushMixStep\(steps, mix`([\s\S]*?)`\s*\);/g, (m, body) => {
  const converted = body.replace(/\$\{LTR\(\s*`/g, "${M(`");
  return `pushMixStep(steps, mix\`${converted}\`);`;
});

// let text pattern in addition loop
fn = fn.replace(
  /let text = `\$\{stepIndex\}\. מחברים[\s\S]*?steps\.push\(text\);/,
  `pushMixStep(steps, mix\`\${stepIndex}. מחברים את ספרת ה\${placeName}: \${M(\`\${da} + \${db}\${carry ? " + " + carry : ""} = \${sum}\`)}\. כותבים \${ones} בעמודת ה\${placeName}\${newCarry ? \` ומעבירים 1 לעמודת ה\${placeName} הבאה.\` : ""}\`);`
);

src = src.slice(0, fnStart) + fn + src.slice(fnEnd);
fs.writeFileSync(FILE, src);
console.log("buildStepExplanation migrated");
