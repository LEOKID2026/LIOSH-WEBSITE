#!/usr/bin/env node
/**
 * Extract all user-facing learning-book text for manual language review.
 * Run: node scripts/extract-book-language-review.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  extractAllBooksWithParser,
  flattenTextBlocks,
  renderBookReviewMarkdown,
  SUBJECT_REVIEW_LABEL,
} from "../lib/learning-book/book-language-review-extract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REVIEW_DIR = path.join(ROOT, "docs/language-review/books");
const JSON_OUT = path.join(ROOT, "data/language-review/book-text-extract.json");
const INDEX_OUT = path.join(REVIEW_DIR, "BOOK_LANGUAGE_REVIEW_INDEX.md");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function countUniqueSubjects(books) {
  return new Set(books.map((b) => b.subject)).size;
}

function countPages(books) {
  return books.reduce((sum, b) => sum + b.pages.length, 0);
}

function renderIndex({
  generatedAt,
  books,
  textBlocks,
  globalWarnings,
  blockWarnings,
  generatedFiles,
}) {
  const subjects = countUniqueSubjects(books);
  const grades = new Set(books.map((b) => b.grade)).size;
  const pages = countPages(books);
  const flaggedBlocks = textBlocks.filter((b) => b.review_flags.length > 0).length;
  const warnedBlocks = textBlocks.filter((b) => b.extraction_warning).length;

  /** @type {string[]} */
  const lines = [];
  lines.push("# Book Language Review — Index");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");
  lines.push("Extraction-only package for owner/assistant manual language review. Book source content was not modified.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Subjects | ${subjects} |`);
  lines.push(`| Grades (distinct) | ${grades} |`);
  lines.push(`| Books | ${books.length} |`);
  lines.push(`| Pages | ${pages} |`);
  lines.push(`| Text blocks | ${textBlocks.length} |`);
  lines.push(`| Blocks with review flags | ${flaggedBlocks} |`);
  lines.push(`| Blocks with extraction warnings | ${warnedBlocks} |`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("- Math G1–G6");
  lines.push("- Geometry G1–G6");
  lines.push("- Science G1–G6");
  lines.push("- Hebrew G1–G6");
  lines.push("- English G1–G6");
  lines.push("- Moledet G2–G4");
  lines.push("- Geography G5–G6");
  lines.push("- Moledet/Geography G1 excluded (out of scope)");
  lines.push("");
  lines.push("## Generated files");
  lines.push("");
  for (const file of generatedFiles) {
    lines.push(`- [\`${file}\`](./${file})`);
  }
  lines.push(`- Machine-readable: [\`data/language-review/book-text-extract.json\`](../../data/language-review/book-text-extract.json)`);
  lines.push("");
  lines.push("## Books included");
  lines.push("");
  lines.push("| Subject | Grade | Pages | Book title |");
  lines.push("|---------|-------|------:|------------|");
  for (const book of books) {
    const label = SUBJECT_REVIEW_LABEL[book.subject] || book.subject;
    lines.push(
      `| ${label} | ${book.grade.toUpperCase()} | ${book.pages.length} | ${book.bookTitleHe} |`
    );
  }
  lines.push("");
  lines.push("## Extraction warnings");
  lines.push("");
  if (!globalWarnings.length && !blockWarnings.length) {
    lines.push("_None._");
  } else {
    if (globalWarnings.length) {
      lines.push("### Book-level");
      lines.push("");
      for (const w of globalWarnings) {
        lines.push(`- ${w}`);
      }
      lines.push("");
    }
    if (blockWarnings.length) {
      lines.push("### Block-level");
      lines.push("");
      for (const w of blockWarnings) {
        lines.push(`- ${w}`);
      }
      lines.push("");
    }
  }
  lines.push("");
  lines.push("## Review flags (automatic, not edits)");
  lines.push("");
  lines.push("Each text block may include zero or more flags:");
  lines.push("");
  lines.push("- `too_long_for_grade`");
  lines.push("- `possible_adult_language`");
  lines.push("- `mixed_language`");
  lines.push("- `contains_formula_or_symbols`");
  lines.push("- `contains_directional_rtl_ltr_mix`");
  lines.push("- `possible_factual_claim`");
  lines.push("- `possible_instruction`");
  lines.push("- `possible_placeholder`");
  lines.push("- `draft_marker_found`");
  lines.push("- `verify_marker_found`");
  lines.push("");

  return lines.join("\n");
}

function main() {
  ensureDir(REVIEW_DIR);
  ensureDir(path.dirname(JSON_OUT));

  const { books, globalWarnings } = extractAllBooksWithParser(
    ROOT,
    parseLearningPageMarkdown
  );

  /** @type {string[]} */
  const generatedFiles = [];

  for (const book of books) {
    const filename = `${book.subject}-${book.grade}-book-text.md`;
    const outPath = path.join(REVIEW_DIR, filename);
    fs.writeFileSync(outPath, renderBookReviewMarkdown(book), "utf8");
    generatedFiles.push(filename);
  }

  const textBlocks = flattenTextBlocks(books);
  const generatedAt = new Date().toISOString();
  const blockWarnings = textBlocks
    .filter((b) => b.extraction_warning)
    .map(
      (b) =>
        `${b.book_id}/${b.page_id} §${b.section_number ?? "-"} (${b.text_type}): ${b.extraction_warning}`
    );

  const jsonPayload = {
    generated_at: generatedAt,
    extraction_version: 1,
    summary: {
      subjects: countUniqueSubjects(books),
      books: books.length,
      pages: countPages(books),
      text_blocks: textBlocks.length,
      extraction_warnings: globalWarnings.length,
    },
    extraction_warnings: globalWarnings,
    text_blocks: textBlocks,
  };

  fs.writeFileSync(JSON_OUT, `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf8");

  fs.writeFileSync(
    INDEX_OUT,
    renderIndex({
      generatedAt,
      books,
      textBlocks,
      globalWarnings,
      blockWarnings,
      generatedFiles,
    }),
    "utf8"
  );

  console.log("Book language review extraction complete.");
  console.log(`  Subjects: ${countUniqueSubjects(books)}`);
  console.log(`  Books: ${books.length}`);
  console.log(`  Pages: ${countPages(books)}`);
  console.log(`  Text blocks: ${textBlocks.length}`);
  console.log(`  Markdown files: ${generatedFiles.length + 1} (incl. index)`);
  console.log(`  JSON: ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`  Warnings: ${globalWarnings.length}`);
}

main();
