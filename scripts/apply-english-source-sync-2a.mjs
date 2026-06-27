/**
 * English Source Sync — Phase 2A only.
 * Applies exact from→to replacements in markdown for mapping rows with canSync=yes.
 * Does NOT touch exports/audio-text or partial rows.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const report = JSON.parse(
  fs.readFileSync(path.join(ROOT, "exports/audio-text/english-source-sync-mapping-report.json"), "utf8")
);
const pass13 = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/pass13_exact_english_replacements.json"), "utf8")
);

/** PASS11 exact replacements */
const pass11 = [
  {
    book: "english-g2",
    page: "page-058.txt",
    from: "רואה חתול → תמונה של cat",
    to: "רואה חתול — בוחרים תמונה של cat.",
  },
  {
    book: "english-g2",
    page: "page-153.txt",
    from: "dog אחד → שניים:",
    to: "dog אחד — שניים הם dogs.",
  },
  {
    book: "english-g2",
    page: "page-177.txt",
    from: "בעברית → באנגלית, ובהפך",
    to: "מעברית לאנגלית, וגם מאנגלית לעברית",
  },
];

const yesRows = report.rows.filter((r) => r.canSync === "yes");

function parseSectionHeader(sectionBlock) {
  const m = sectionBlock.match(/^## (\d+)\.\s*(.+?)(?:\s*\(|$)/);
  if (!m) throw new Error(`Bad section block: ${sectionBlock}`);
  return { number: Number(m[1]), title: m[2].trim() };
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
  const nextStart = headers[idx + 1]?.headerStart ?? raw.length;
  return {
    bodyStart: headers[idx].bodyStart,
    bodyEnd: nextStart,
    body: raw.slice(headers[idx].bodyStart, nextStart),
  };
}

function replacementsForRow(exportTxt) {
  const m = exportTxt.match(/english-(g\d)\/pages\/(page-\d{3}\.txt)$/);
  if (!m) return [];
  const book = `english-${m[1]}`;
  const page = m[2];
  return [
    ...pass13.filter((r) => r.book === book && r.page === page),
    ...pass11.filter((r) => r.book === book && r.page === page),
  ];
}

/** @type {object[]} */
const applied = [];
/** @type {object[]} */
const skipped = [];
/** @type {Set<string>} */
const changedMdFiles = new Set();

for (const row of yesRows) {
  const { number: sectionNumber } = parseSectionHeader(row.sectionBlock);
  const mdPath = path.join(ROOT, row.sourceMarkdown);
  const reps = replacementsForRow(row.exportTxt);

  if (!fs.existsSync(mdPath)) {
    skipped.push({ exportTxt: row.exportTxt, md: row.sourceMarkdown, reason: "markdown_missing" });
    continue;
  }
  if (reps.length === 0) {
    skipped.push({ exportTxt: row.exportTxt, md: row.sourceMarkdown, reason: "no_replacement_record" });
    continue;
  }

  const raw = fs.readFileSync(mdPath, "utf8");
  const section = extractSectionRaw(raw, sectionNumber);
  if (!section) {
    skipped.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      reason: `section_${sectionNumber}_not_found`,
    });
    continue;
  }

  let sectionBody = section.body;
  let rowApplied = 0;

  for (const rep of reps) {
    const count = sectionBody.split(rep.from).length - 1;
    if (count === 0) {
      skipped.push({
        exportTxt: row.exportTxt,
        md: row.sourceMarkdown,
        section: sectionNumber,
        from: rep.from,
        reason: "from_not_found_in_section",
      });
      continue;
    }
    if (count > 1) {
      skipped.push({
        exportTxt: row.exportTxt,
        md: row.sourceMarkdown,
        section: sectionNumber,
        from: rep.from,
        reason: "from_found_multiple_times_in_section",
      });
      continue;
    }
    sectionBody = sectionBody.split(rep.from).join(rep.to);
    applied.push({
      exportTxt: row.exportTxt,
      md: row.sourceMarkdown,
      section: sectionNumber,
      from: rep.from,
      to: rep.to,
    });
    rowApplied += 1;
  }

  if (rowApplied > 0) {
    const nextRaw =
      raw.slice(0, section.bodyStart) + sectionBody + raw.slice(section.bodyEnd);
    fs.writeFileSync(mdPath, nextRaw, "utf8");
    changedMdFiles.add(row.sourceMarkdown);
  }
}

const out = {
  phase: "English Source Sync 2A",
  yesRowsInReport: yesRows.length,
  replacementsApplied: applied.length,
  yesRowsWithAtLeastOneApply: new Set(applied.map((a) => a.exportTxt)).size,
  skippedCount: skipped.length,
  changedMarkdownFiles: [...changedMdFiles].sort(),
  applied,
  skipped,
};

const outPath = path.join(ROOT, "exports/audio-text/english-source-sync-2a-report.json");
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  yesRowsInReport: out.yesRowsInReport,
  replacementsApplied: out.replacementsApplied,
  changedMarkdownFiles: out.changedMarkdownFiles.length,
  skippedCount: out.skippedCount,
  outPath,
}, null, 2));
