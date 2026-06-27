/**
 * Rebuild book-full.md + index.json from existing page txt files.
 * Does NOT regenerate txt from source markdown.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_ROOT = path.join(__dirname, "..", "exports", "audio-text", "books");

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** @type {string[]} */
const rebuilt = [];

function listBookDirs(booksRoot) {
  /** @type {string[]} */
  const dirs = [];
  for (const name of fs.readdirSync(booksRoot)) {
    const entry = path.join(booksRoot, name);
    if (!fs.statSync(entry).isDirectory()) continue;

    const indexPath = path.join(entry, "index.json");
    const pagesDir = path.join(entry, "pages");
    if (fs.existsSync(indexPath) && fs.existsSync(pagesDir)) {
      dirs.push(entry);
      continue;
    }

    for (const sub of fs.readdirSync(entry)) {
      const bookDir = path.join(entry, sub);
      if (!fs.statSync(bookDir).isDirectory()) continue;
      if (
        fs.existsSync(path.join(bookDir, "index.json")) &&
        fs.existsSync(path.join(bookDir, "pages"))
      ) {
        dirs.push(bookDir);
      }
    }
  }
  return dirs;
}

for (const bookDir of listBookDirs(BOOKS_ROOT)) {
  const slug = path.basename(bookDir);
  const indexPath = path.join(bookDir, "index.json");

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const bookTitle = index.bookTitle || slug;
  /** @type {string[]} */
  const fullParts = [`# ${bookTitle}`, ""];

  for (const page of index.pages) {
    const txtRel = page.textFile || `pages/page-${padPageNum(page.pageNumber)}.txt`;
    const txtPath = path.join(bookDir, txtRel.replace(/\//g, path.sep));
    if (!fs.existsSync(txtPath)) {
      throw new Error(`Missing txt for ${slug} page ${page.pageNumber}: ${txtRel}`);
    }
    const text = fs.readFileSync(txtPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
    page.estimatedCharacters = text.length;
    page.estimatedWords = countWords(text);
    fullParts.push(
      `## Chapter ${padPageNum(page.pageNumber)} — עמוד ${page.pageNumber}`,
      "",
      text,
      ""
    );
  }

  fs.writeFileSync(path.join(bookDir, "book-full.md"), `${fullParts.join("\n")}\n`, "utf8");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  rebuilt.push(slug);
}

console.log(JSON.stringify({ rebuiltBookCount: rebuilt.length, books: rebuilt }, null, 2));
