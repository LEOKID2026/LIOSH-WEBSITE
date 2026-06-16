#!/usr/bin/env node
/** Convert remaining text: fields — replace ltr() with M() and wrap in learningStepFields */
import fs from "fs";

const FILE = "utils/math-animations.js";
let src = fs.readFileSync(FILE, "utf8");

function convertTextLine(line) {
  const m = line.match(/^(\s*)text:\s*(.+?),?\s*$/);
  if (!m) return line;
  const [, indent, rest] = m;
  if (rest.startsWith("...learningStepFields")) return line;

  // ternary text: dir === ... — convert branches
  if (/^\w+\s*===/.test(rest.trim()) || rest.includes("? `")) {
    const converted = rest
      .replace(/\$\{ltr\(`((?:\\.|[^`\\])*)`\)\}/g, "${M(`$1`)}")
      .replace(/`\s*:\s*`/g, "` : mix`")
      .replace(/^\s*(\w+\s*===\s*[^?]+\?)\s*`/g, "$1 learningStepFields(mix`")
      .replace(/`\s*:\s*`/g, "`) : learningStepFields(mix`")
      .replace(/`\s*$/, "`)");
    if (converted.includes("learningStepFields")) {
      return `${indent}...(${converted}),`;
    }
  }

  if (rest.startsWith("`")) {
    let tpl = rest.replace(/,\s*$/, "");
    tpl = tpl.replace(/\$\{ltr\(`((?:\\.|[^`\\])*)`\)\}/g, "${M(`$1`)}");
    if (tpl.startsWith("`") && tpl.endsWith("`")) {
      return `${indent}...learningStepFields(mix${tpl}),`;
    }
  }

  if (rest.startsWith('"') || /^questionText|dir ===/.test(rest)) {
    // prose-only variable
    if (rest.includes("questionText") || rest.includes("dir ===")) {
      return line; // keep dynamic prose assignment for now — migrate below
    }
  }

  return line;
}

// multiline text with closing on next line
const lines = src.split("\n");
const out = [];
for (let i = 0; i < lines.length; i += 1) {
  let line = lines[i];
  if (/^\s*text:\s*`/.test(line) && !line.trimEnd().endsWith("`,") && !line.trimEnd().endsWith("`")) {
    let chunk = line;
    while (i + 1 < lines.length && !lines[i].trimEnd().endsWith("`,")) {
      i += 1;
      chunk += "\n" + lines[i];
    }
    const converted = chunk.replace(/\$\{ltr\(`((?:\\.|[^`\\])*)`\)\}/g, "${M(`$1`)}");
    const indent = converted.match(/^(\s*)/)?.[1] || "";
    const inner = converted.replace(/^\s*text:\s*/, "").replace(/,\s*$/, "");
    if (inner.startsWith("`")) {
      out.push(`${indent}...learningStepFields(mix${inner}),`);
      continue;
    }
    out.push(chunk);
    continue;
  }

  if (/^\s*text:\s*/.test(line) && !line.includes("learningStepFields")) {
    line = convertTextLine(line.replace(/,\s*$/, "")) + (line.trimEnd().endsWith(",") ? "" : "");
    if (!line.endsWith(",") && line.includes("learningStepFields")) line += ",";
  }
  out.push(line);
}

src = out.join("\n");

// questionText assignments — wrap at use site in render pipeline; keep as prose var
// dir ternary blocks
src = src.replace(
  /text:\s*dir === "after"\s*\?\s*`([^`]*)`\s*:\s*`([^`]*)`,/g,
  "...learningStepFields(dir === \"after\" ? mix`$1` : mix`$2`),"
);

src = src.replace(
  /text:\s*dir === "after"\s*\n\s*\?\s*`([^`]*)`\s*\n\s*:\s*`([^`]*)`,/g,
  "...learningStepFields(dir === \"after\" ? mix`$1` : mix`$2`),"
);

fs.writeFileSync(FILE, src);
console.log("remaining text:", (src.match(/\btext:\s*[`'"]/g) || []).length);
