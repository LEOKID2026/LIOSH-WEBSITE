/**
 * Export learning book pages as clean narration text for ElevenLabs.
 *
 * Run: node scripts/export-learning-book-audio-text.mjs
 * Optional: --subject hebrew --grade g1
 *
 * Output: exports/audio-text/books/<subject>-<grade>/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEARNING_BOOK_CATALOG_LIST } from "../lib/learning-book/learning-book-catalog.js";
import { getSectionDisplayTitle } from "../lib/learning-book/section-display-labels.js";
import {
  countWords,
  hasTechnicalLeak,
  prepareBookSectionExportNarrationText,
} from "./lib/prepare-book-export-narration-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "exports", "audio-text", "books");

function parseArgs(argv) {
  /** @type {{ subject?: string, grade?: string }} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--subject=")) out.subject = arg.slice("--subject=".length);
    else if (arg === "--subject") out.subject = argv[++i];
    else if (arg.startsWith("--grade=")) out.grade = arg.slice("--grade=".length);
    else if (arg === "--grade") out.grade = argv[++i];
  }
  return out;
}

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function bookSlug(subject, grade) {
  return `${subject}-${grade}`;
}

/**
 * @param {{ subject: string, grade: string, status: string, loader: { loadAllPages: () => unknown[] }, meta: Record<string, unknown> }} entry
 */
function exportBook(entry) {
  const { subject, grade } = entry;
  if (entry.status !== "authored") return null;

  const slug = bookSlug(subject, grade);
  const bookDir = path.join(OUT_ROOT, slug);
  const pagesDir = path.join(bookDir, "pages");

  fs.mkdirSync(pagesDir, { recursive: true });

  const pages = entry.loader.loadAllPages();
  /** @type {import("./lib/prepare-book-export-narration-text.js")[]} */
  const exportedPages = [];
  /** @type {{ pageNumber: number, topicId: string, sectionNumber: number, issue: string }[]} */
  const issues = [];

  let pageNumber = 0;
  /** @type {string[]} */
  const fullMdParts = [];

  const bookTitle =
    String(entry.meta?.bookTitleHe || "").trim() ||
    `ספר ${subject} — ${grade}`;

  fullMdParts.push(`# ${bookTitle}`, "");

  for (const page of pages) {
    const topicTitle = String(page.displayTitle || page.pageId || "").trim();
    const sections = Array.isArray(page.sections) ? page.sections : [];

    for (const section of sections) {
      pageNumber += 1;
      const text = prepareBookSectionExportNarrationText(section);
      const fileName = `page-${padPageNum(pageNumber)}.txt`;
      const textFile = `pages/${fileName}`;
      const sectionTitle = getSectionDisplayTitle(section.title);
      const indexTitle = sectionTitle || topicTitle || `עמוד ${pageNumber}`;

      if (!text.trim()) {
        issues.push({
          pageNumber,
          topicId: page.pageId,
          sectionNumber: section.number,
          issue: "empty",
        });
      } else if (hasTechnicalLeak(text)) {
        issues.push({
          pageNumber,
          topicId: page.pageId,
          sectionNumber: section.number,
          issue: "technical_leak",
        });
      }

      fs.writeFileSync(path.join(bookDir, textFile), `${text}\n`, "utf8");

      fullMdParts.push(
        `## Chapter ${padPageNum(pageNumber)} — עמוד ${pageNumber}`,
        "",
        text,
        ""
      );

      exportedPages.push({
        pageNumber,
        title: indexTitle,
        topicTitle,
        topicId: page.pageId,
        sectionNumber: section.number,
        textFile,
        estimatedCharacters: text.length,
        estimatedWords: countWords(text),
      });
    }
  }

  const index = {
    bookSlug: slug,
    bookTitle,
    subject,
    grade,
    pageCount: exportedPages.length,
    pages: exportedPages.map(
      ({ pageNumber, title, textFile, estimatedCharacters, estimatedWords }) => ({
        pageNumber,
        title,
        textFile,
        estimatedCharacters,
        estimatedWords,
      })
    ),
  };

  fs.writeFileSync(
    path.join(bookDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(bookDir, "book-full.md"), fullMdParts.join("\n"), "utf8");

  return { slug, bookTitle, subject, grade, pageCount: exportedPages.length, issues };
}

function validateBookExport(slug, expectedPageCount) {
  const bookDir = path.join(OUT_ROOT, slug);
  const indexPath = path.join(bookDir, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const problems = [];

  if (index.pageCount !== expectedPageCount) {
    problems.push(`index pageCount mismatch: ${index.pageCount} vs ${expectedPageCount}`);
  }

  for (let i = 1; i <= expectedPageCount; i += 1) {
    const fileName = `page-${padPageNum(i)}.txt`;
    const filePath = path.join(bookDir, "pages", fileName);
    if (!fs.existsSync(filePath)) {
      problems.push(`missing ${fileName}`);
      continue;
    }
    const text = fs.readFileSync(filePath, "utf8").trim();
    if (!text) problems.push(`empty ${fileName}`);
    if (hasTechnicalLeak(text)) problems.push(`technical leak in ${fileName}`);
  }

  const txtCount = fs
    .readdirSync(path.join(bookDir, "pages"))
    .filter((f) => f.endsWith(".txt")).length;
  if (txtCount !== expectedPageCount) {
    problems.push(`txt file count ${txtCount} vs expected ${expectedPageCount}`);
  }

  return problems;
}

const args = parseArgs(process.argv.slice(2));
const filterSubject = args.subject ? String(args.subject).toLowerCase() : null;
const filterGrade = args.grade ? String(args.grade).toLowerCase() : null;

/** @type {ReturnType<typeof exportBook>[]} */
const results = [];

for (const entry of LEARNING_BOOK_CATALOG_LIST) {
  if (filterSubject && entry.subject !== filterSubject) continue;
  if (filterGrade && entry.grade !== filterGrade) continue;
  if (entry.status !== "authored") continue;

  const result = exportBook(entry);
  if (result) results.push(result);
}

/** @type {{ slug: string, problems: string[] }[]} */
const validationFailures = [];

for (const result of results) {
  const problems = validateBookExport(result.slug, result.pageCount);
  if (problems.length) {
    validationFailures.push({ slug: result.slug, problems });
  }
}

const reportPath = path.join(ROOT, "exports", "audio-text", "export-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      outputRoot: path.relative(ROOT, OUT_ROOT),
      books: results,
      validationFailures,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Exported ${results.length} books → ${path.relative(ROOT, OUT_ROOT)}`);
for (const r of results) {
  const issueNote = r.issues.length ? ` (${r.issues.length} issues)` : "";
  console.log(`  ${r.slug}: ${r.pageCount} pages${issueNote}`);
}
if (validationFailures.length) {
  console.error("Validation failures:");
  for (const f of validationFailures) {
    console.error(`  ${f.slug}: ${f.problems.join("; ")}`);
  }
  process.exit(1);
}
