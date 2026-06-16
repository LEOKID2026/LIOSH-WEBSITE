#!/usr/bin/env node
/**
 * Safe migration: utils/math-animations.js text: -> ...learningStepFields(mix`...`)
 */
import fs from "fs";

const FILE = "utils/math-animations.js";
let src = fs.readFileSync(FILE, "utf8");

if (!src.includes("learningStepFields")) {
  src = src.replace(
    'from "./comparison-sign-mcq.js";',
    `from "./comparison-sign-mcq.js";
import { mix, M, learningStepFields } from "../lib/learning-book/learning-math-line-build.js";`
  );
}

/** @param {string} s */
function escStatic(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

/** @param {string} inner */
function tokenizeTemplate(inner) {
  /** @type {{ type: "static"|"expr", value: string }[]} */
  const parts = [];
  let i = 0;
  let buf = "";
  while (i < inner.length) {
    if (inner[i] === "$" && inner[i + 1] === "{") {
      if (buf) parts.push({ type: "static", value: buf });
      buf = "";
      let j = i + 2;
      let depth = 0;
      for (; j < inner.length; j += 1) {
        const ch = inner[j];
        if (ch === "{") depth += 1;
        else if (ch === "}") {
          if (depth === 0) break;
          depth -= 1;
        }
      }
      parts.push({ type: "expr", value: inner.slice(i + 2, j) });
      i = j + 1;
      continue;
    }
    buf += inner[i];
    i += 1;
  }
  if (buf) parts.push({ type: "static", value: buf });
  return parts;
}

/** @param {string} expr */
function isMathExpr(expr) {
  const s = expr.trim();
  if (/[+−\-×÷=<>→≈]|π|r²|°|\//u.test(s)) return true;
  if (/ltr\s*\(/.test(s)) return true;
  if (/BLANK/.test(s)) return true;
  return false;
}

/** @param {{ type: "static"|"expr", value: string }[]} parts @param {number} i */
function shouldStartMathGroup(parts, i) {
  const prev = parts[i - 1];
  if (prev?.type === "static" && /:\s*$/.test(prev.value)) return true;
  if (prev?.type === "static" && /=\s*$/.test(prev.value)) return true;
  if (isMathExpr(parts[i].value)) return true;
  return false;
}

/** @param {{ type: "static"|"expr", value: string }[]} parts @param {number} start */
function collectMathGroup(parts, start) {
  let mathTemplate = "";
  let i = start;
  while (i < parts.length) {
    const part = parts[i];
    if (part.type === "expr") {
      mathTemplate += `\${${part.value}}`;
      i += 1;
      const next = parts[i];
      if (next?.type === "static") {
        const m = next.value.match(/^[\d\s+−\-×÷=<>→.,/()%×\u2066\u2069]*/u);
        if (m?.[0]) {
          mathTemplate += escStatic(m[0]);
          const rest = next.value.slice(m[0].length);
          if (rest) parts[i] = { type: "static", value: rest };
          else i += 1;
          continue;
        }
        break;
      }
      continue;
    }
    if (part.type === "static" && /^[\d\s+−\-×÷=<>→.,/()%×\u2066\u2069]*$/u.test(part.value)) {
      mathTemplate += escStatic(part.value);
      i += 1;
      continue;
    }
    break;
  }
  return { mathTemplate, nextIndex: i };
}

/** @param {string} inner */
function convertInnerTemplate(inner) {
  const parts = tokenizeTemplate(inner);
  if (!parts.some((p) => p.type === "expr")) {
    return `mix\`${escStatic(inner)}\``;
  }

  let out = "mix`";
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.type === "static") {
      out += escStatic(part.value);
      i += 1;
      continue;
    }
    if (shouldStartMathGroup(parts, i)) {
      const { mathTemplate, nextIndex } = collectMathGroup(parts, i);
      out += `\${M(\`${mathTemplate}\`)}`;
      i = nextIndex;
      continue;
    }
    out += `\${${part.value}}`;
    i += 1;
  }
  out += "`";
  return out;
}

/** @param {string} chunk */
function parseTextChunk(chunk) {
  const trimmed = chunk.trim().replace(/,\s*$/, "");
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    return { kind: "plain", inner: trimmed.slice(1, end) };
  }
  if (trimmed.startsWith("`")) {
    let i = 1;
    let inner = "";
    while (i < trimmed.length) {
      if (trimmed[i] === "\\") {
        inner += trimmed[i + 1];
        i += 2;
        continue;
      }
      if (trimmed[i] === "`") break;
      if (trimmed[i] === "$" && trimmed[i + 1] === "{") {
        inner += "${";
        i += 2;
        let depth = 0;
        while (i < trimmed.length) {
          const ch = trimmed[i];
          inner += ch;
          if (ch === "{") depth += 1;
          else if (ch === "}") {
            if (depth === 0) {
              i += 1;
              break;
            }
            depth -= 1;
          }
          i += 1;
        }
        continue;
      }
      inner += trimmed[i];
      i += 1;
    }
    return { kind: "template", inner };
  }
  return null;
}

function migrateTextFields(code) {
  const lines = code.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(\s*)text:\s*(.*)$/);
    if (!m) {
      out.push(line);
      i += 1;
      continue;
    }

    const indent = m[1];
    let chunk = m[2];

    if (!chunk.trim() || chunk.trim() === "+") {
      i += 1;
      while (i < lines.length) {
        chunk += "\n" + lines[i];
        if (/[`"']\s*,?\s*$/.test(lines[i].trim())) {
          i += 1;
          break;
        }
        i += 1;
      }
    } else if (chunk.startsWith("`") && !chunk.trimEnd().endsWith("`,") && !chunk.trimEnd().endsWith("`")) {
      i += 1;
      while (i < lines.length) {
        chunk += "\n" + lines[i];
        if (lines[i].includes("`,") || lines[i].trim().endsWith("`,")) {
          i += 1;
          break;
        }
        i += 1;
      }
    } else {
      i += 1;
    }

    const parsed = parseTextChunk(chunk);
    if (!parsed) {
      out.push(line);
      continue;
    }

    const mixExpr =
      parsed.kind === "plain"
        ? `mix\`${escStatic(parsed.inner)}\``
        : convertInnerTemplate(parsed.inner);
    const comma = chunk.trimEnd().endsWith(",") ? "," : "";
    out.push(`${indent}...learningStepFields(${mixExpr})${comma}`);
  }
  return out.join("\n");
}

/** One-liner steps.push({ ..., text: `...`, ... }) */
function migrateInlineStepsPush(code) {
  return code.replace(
    /steps\.push\(\{\s*([^}]*?)\btext:\s*(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*")\s*,([^}]*)\}\s*\)/g,
    (full, before, textRaw, after) => {
      const parsed = parseTextChunk(textRaw);
      if (!parsed) return full;
      const mixExpr =
        parsed.kind === "plain"
          ? `mix\`${escStatic(parsed.inner)}\``
          : convertInnerTemplate(parsed.inner);
      return `steps.push({ ${before.trim()} ? ${before.endsWith(",") ? before : before + ","} : ""}${before ? "" : ""}...learningStepFields(${mixExpr}), ${after.trim()} })`.replace(
        /,\s*,/g,
        ","
      );
    }
  );
}

/** One-liner object literal: replace `text: \`...\`` inside steps.push({...}) */
function migrateCompactTextFields(code) {
  return code.replace(
    /(\btext:\s*)(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*")(\s*,)/g,
    (_, prefix, textRaw, suffix) => {
      const parsed = parseTextChunk(textRaw);
      if (!parsed) return `${prefix}${textRaw}${suffix}`;
      const mixExpr =
        parsed.kind === "plain"
          ? `mix\`${escStatic(parsed.inner)}\``
          : convertInnerTemplate(parsed.inner);
      return `...learningStepFields(${mixExpr})${suffix}`;
    }
  );
}

src = migrateTextFields(src);
src = migrateCompactTextFields(src);

if (src.includes("mathBuf")) {
  console.error("ERROR: migration leaked mathBuf references");
  process.exit(1);
}

fs.writeFileSync(FILE, src);
const remaining = (src.match(/\btext:\s*[`'"]/g) || []).length;
console.log(`Migrated ${FILE}; remaining text: fields: ${remaining}`);
