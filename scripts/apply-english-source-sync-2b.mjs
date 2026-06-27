/**
 * English Source Sync — Phase 2B (PASS14 only).
 * In mapped markdown sections only:
 * - remove single ✓ (skip if 0 or 2+)
 * - replace יכול/מותר → יכול או מותר (skip if 0 or 2+)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const report = JSON.parse(
  fs.readFileSync(path.join(ROOT, "exports/audio-text/english-source-sync-mapping-report.json"), "utf8")
);

const pass14Rows = report.rows.filter((r) => /\bPASS14\b/.test(r.note));

function parseSectionHeader(sectionBlock) {
  const m = sectionBlock.match(/^## (\d+)\.\s*(.+?)(?:\s*\(|$)/);
  if (!m) throw new Error(`Bad section block: ${sectionBlock}`);
  return Number(m[1]);
}

function extractSectionRaw(raw, sectionNumber) {
  const headerRe = /^## (\d+)\.\s*(.+)$/gm;
  /** @type {{ number: number, headerStart: number, bodyStart: number }[]} */
  const headers = [];
  let match;
  while ((match = headerRe.exec(raw)) !== null) {
    const number = Number(match[1]);
    if (number < 1 || number > 7) continue;
    headers.push({ number, headerStart: match.index, bodyStart: headerRe.lastIndex });
  }
  const idx = headers.findIndex((h) => h.number === sectionNumber);
  if (idx === -1) return null;
  const bodyStart = headers[idx].bodyStart;
  const bodyEnd = headers[idx + 1]?.headerStart ?? raw.length;
  return { bodyStart, bodyEnd, body: raw.slice(bodyStart, bodyEnd) };
}

function countChar(text, ch) {
  return [...text].filter((c) => c === ch).length;
}

/** @type {object[]} */
const applied = [];
/** @type {object[]} */
const skipped = [];
/** @type {Set<string>} */
const changedFiles = new Set();

for (const row of pass14Rows) {
  const sectionNumber = parseSectionHeader(row.sectionBlock);
  const mdPath = path.join(ROOT, row.sourceMarkdown);

  if (!fs.existsSync(mdPath)) {
    skipped.push({ ...row, reason: "markdown_missing" });
    continue;
  }

  const raw = fs.readFileSync(mdPath, "utf8");
  const section = extractSectionRaw(raw, sectionNumber);
  if (!section) {
    skipped.push({ ...row, reason: `section_${sectionNumber}_not_found` });
    continue;
  }

  let body = section.body;
  let changed = false;
  const rowSkipped = [];

  const slashCount = (body.match(/יכול\/מותר/g) || []).length;
  if (slashCount === 1) {
    body = body.replace("יכול/מותר", "יכול או מותר");
    applied.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      section: sectionNumber,
      change: "יכול/מותר → יכול או מותר",
    });
    changed = true;
  } else if (slashCount > 1) {
    rowSkipped.push("multiple_יכול/מותר_in_section");
  }

  const checkCount = countChar(body, "✓");
  if (checkCount === 1) {
    body = body.replace("✓", "");
    applied.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      section: sectionNumber,
      change: "removed ✓",
    });
    changed = true;
  } else if (checkCount > 1) {
    rowSkipped.push("multiple_✓_in_section");
  }

  if (!changed) {
    skipped.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      section: sectionNumber,
      reason: rowSkipped.length ? rowSkipped.join("; ") : "no_pass14_markers_in_section",
    });
  } else if (rowSkipped.length) {
    skipped.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      section: sectionNumber,
      reason: `partial_apply; ${rowSkipped.join("; ")}`,
    });
  }

  if (changed) {
    const nextRaw = raw.slice(0, section.bodyStart) + body + raw.slice(section.bodyEnd);
    fs.writeFileSync(mdPath, nextRaw, "utf8");
    changedFiles.add(row.sourceMarkdown);
  }
}

const out = {
  phase: "English Source Sync 2B (PASS14 only)",
  pass14RowsInMapping: pass14Rows.length,
  changedMarkdownFiles: [...changedFiles].sort(),
  appliedCount: applied.length,
  skippedCount: skipped.length,
  applied,
  skipped,
};

fs.writeFileSync(
  path.join(ROOT, "exports/audio-text/english-source-sync-2b-report.json"),
  `${JSON.stringify(out, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      pass14RowsInMapping: out.pass14RowsInMapping,
      changedMarkdownFiles: out.changedMarkdownFiles.length,
      appliedCount: out.appliedCount,
      skippedCount: out.skippedCount,
    },
    null,
    2
  )
);
