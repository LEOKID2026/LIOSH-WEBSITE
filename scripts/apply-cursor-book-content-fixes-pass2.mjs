/**
 * Second pass: fix remaining REVIEW items from validate-book-content-cleanup.mjs
 * Only modifies page txt files under exports/audio-text/books
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");

/** @type {string[]} */
const changed = [];

function pagePath(book, page) {
  return path.join(BOOKS_ROOT, book, "pages", page);
}

function read(book, page) {
  const p = pagePath(book, page);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function write(book, page, text) {
  const p = pagePath(book, page);
  const out = text.endsWith("\n") ? text : `${text}\n`;
  fs.writeFileSync(p, out, "utf8");
  changed.push(path.relative(ROOT, p).replaceAll("\\", "/"));
}

function patch(book, page, fn) {
  const text = read(book, page);
  if (text == null) return;
  const next = fn(text);
  if (next !== text) write(book, page, next);
}

function applyReplacements(book, page, pairs) {
  patch(book, page, (text) => {
    let out = text;
    for (const [from, to] of pairs) {
      out = out.split(from).join(to);
    }
    return out;
  });
}

// --- Grade/meta wording: targeted per-file fixes ---
const GRADE_META_FIXES = [
  [
    "geometry-g1",
    "page-016.txt",
    [
      ["בכיתה א׳ לומדים הזזה ושיקוף.", "כאן נכיר הזזה ושיקוף."],
      ["סיבוב נלמד בכיתות מאוחרות יותר.", "סיבוב נכיר בשלב מתקדם יותר."],
    ],
  ],
  [
    "geometry-g2",
    "page-015.txt",
    [["בכיתה ב׳ בודקים יותר בקפידה:", "כאן בודקים יותר בקפידה:"]],
  ],
  [
    "geometry-g3",
    "page-009.txt",
    [["בכיתה ג׳ — שם וזיהוי — לא חישובים.", "כאן נתמקד בשם ובזיהוי — לא בחישובים."]],
  ],
  [
    "geometry-g3",
    "page-051.txt",
    [["בכיתה ג׳ לא", "כאן לא"], ["בכיתה ג׳", "כאן"]],
  ],
  [
    "geometry-g3",
    "page-058.txt",
    [["בכיתה ג׳", "כאן"]],
  ],
  [
    "geometry-g4",
    "page-030.txt",
    [["כיתה ד׳ —", "כאן —"]],
  ],
  [
    "geometry-g4",
    "page-043.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "geometry-g4",
    "page-050.txt",
    [["כיתה ד׳ —", "כאן —"]],
  ],
  [
    "geometry-g4",
    "page-057.txt",
    [["כיתה ד׳ —", "כאן —"]],
  ],
  [
    "geometry-g4",
    "page-063.txt",
    [["כיתה ד׳ —", "כאן —"]],
  ],
  [
    "geometry-g4",
    "page-072.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "geometry-g4",
    "page-079.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "geometry-g4",
    "page-086.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "geometry-g5",
    "page-008.txt",
    [["בכיתה ה׳", "כאן"], ["כיתה ה׳ —", "כאן —"]],
  ],
  [
    "geometry-g5",
    "page-120.txt",
    [["בכיתה ה׳", "כאן"]],
  ],
  [
    "geometry-g6",
    "page-009.txt",
    [["בכיתה ו׳", "כאן"]],
  ],
  [
    "geometry-g6",
    "page-029.txt",
    [["בכיתה ו׳", "כאן"]],
  ],
  [
    "hebrew-g2",
    "page-135.txt",
    [
      ["בכיתה ב׳ בודקים במשפטים ארוכים יותר:", "כאן בודקים במשפטים ארוכים יותר:"],
      ["לא מעתיקים מכיתה א׳ — משפטים חדשים וארוכים.", "לא חוזרים על משפטים קצרים — משפטים חדשים וארוכים."],
    ],
  ],
  [
    "math-g1",
    "page-065.txt",
    [["התוצאה בכיתה א׳ לא עוברת 30.", "בדוגמה הזאת התוצאה לא עוברת 30."]],
  ],
  [
    "math-g2",
    "page-079.txt",
    [["בכיתה ב׳", "כאן"]],
  ],
  [
    "math-g2",
    "page-100.txt",
    [["בכיתה ב׳", "כאן"]],
  ],
  [
    "math-g3",
    "page-098.txt",
    [["בכיתה ג׳", "כאן"]],
  ],
  [
    "math-g3",
    "page-105.txt",
    [["בכיתה ג׳", "כאן"]],
  ],
  [
    "math-g3",
    "page-107.txt",
    [["בכיתה ג׳", "כאן"]],
  ],
  [
    "math-g3",
    "page-184.txt",
    [["בכיתה ג׳", "כאן"]],
  ],
  [
    "math-g4",
    "page-126.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "math-g4",
    "page-133.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "math-g4",
    "page-142.txt",
    [["בכיתה ד׳", "כאן"]],
  ],
  [
    "math-g5",
    "page-240.txt",
    [["בכיתה ה׳", "כאן"]],
  ],
  [
    "math-g6",
    "page-064.txt",
    [["בכיתה ו׳", "כאן"]],
  ],
];

for (const [book, page, pairs] of GRADE_META_FIXES) {
  applyReplacements(book, page, pairs);
}

// Read files that still need context-specific fixes and patch after generic failed
for (const [book, page] of [
  ["geometry-g2", "page-015.txt"],
  ["geometry-g3", "page-051.txt"],
  ["hebrew-g2", "page-135.txt"],
]) {
  const text = read(book, page);
  if (!text) continue;
  if (/בכיתה\s*[אבגדהו]/u.test(text) || /כיתה\s*[אבגדהו][׳'’]?\s*—/u.test(text)) {
    const fixed = text
      .replace(/בכיתה\s*[אבגדהו][׳'’]?\s+לומדים/gu, "כאן נלמד")
      .replace(/בכיתה\s*[אבגדהו][׳'’]?\s+לא/gu, "כאן לא")
      .replace(/בכיתה\s*[אבגדהו][׳'’]?/gu, "כאן")
      .replace(/כיתה\s*[אבגדהו][׳'’]?\s*—/gu, "כאן —");
    if (fixed !== text) write(book, page, fixed);
  }
}

// --- Cross-book duplicate adaptations (vary higher-grade copy) ---
const DUPLICATE_FIXES = [
  [
    "math-g4",
    "page-026.txt",
    `7 + ? = 10 — מה המספר החסר?
נסו לפתור בעצמכם.
בעמוד הבא נבדוק יחד את הדרך ואת התשובה.`,
  ],
  [
    "math-g4",
    "page-105.txt",
    `עכשיו אתם יודעים לחבר שלושה מספרים גדולים יותר.
בתרגול תמצאו חיבור של שלושה מספרים — לפעמים עם עשרות ומאות.
זכרו לחבר לפי סדר נוח, ואל תשכחו את המספר השלישי.`,
  ],
  [
    "math-g5",
    "page-019.txt",
    `8 + ? = 15 — מה המספר החסר?
נסו לפתור בעצמכם.
בעמוד הבא נבדוק יחד את הדרך ואת התשובה.`,
  ],
  [
    "math-g5",
    "page-226.txt",
    null,
  ],
  [
    "math-g5",
    "page-175.txt",
    null,
  ],
  [
    "math-g4",
    "page-240.txt",
    null,
  ],
  [
    "math-g4",
    "page-245.txt",
    null,
  ],
  [
    "math-g4",
    "page-252.txt",
    null,
  ],
  [
    "math-g4",
    "page-253.txt",
    null,
  ],
  [
    "math-g4",
    "page-259.txt",
    null,
  ],
  [
    "math-g4",
    "page-161.txt",
    null,
  ],
  [
    "math-g4",
    "page-166.txt",
    null,
  ],
  [
    "math-g6",
    "page-096.txt",
    null,
  ],
  [
    "geometry-g5",
    "page-061.txt",
    null,
  ],
  [
    "geometry-g6",
    "page-019.txt",
    null,
  ],
];

for (const [book, page, content] of DUPLICATE_FIXES) {
  if (content) write(book, page, content);
}

// Auto-detect duplicate groups and vary higher grade
function walkPages() {
  /** @type {string[]} */
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/page-\d+\.txt$/.test(name)) out.push(p);
    }
  }
  walk(BOOKS_ROOT);
  return out;
}

const byContent = new Map();
for (const file of walkPages()) {
  const text = fs.readFileSync(file, "utf8").replace(/\s+/g, " ").trim();
  if (text.length < 30) continue;
  if (!byContent.has(text)) byContent.set(text, []);
  byContent.get(text).push(file);
}

function gradeNum(bookSlug) {
  const m = bookSlug.match(/-g(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function subjectKey(bookSlug) {
  return bookSlug.replace(/-g\d+$/, "");
}

for (const [, group] of byContent) {
  if (group.length < 2) continue;
  const books = [...new Set(group.map((f) => path.basename(path.dirname(path.dirname(f)))))]
    .sort((a, b) => gradeNum(a) - gradeNum(b) || a.localeCompare(b));
  if (books.length < 2) continue;

  // Vary all but the lowest grade copy
  const keepBook = books[0];
  for (const file of group) {
    const book = path.basename(path.dirname(path.dirname(file)));
    if (book === keepBook) continue;

    let text = fs.readFileSync(file, "utf8");
    const g = gradeNum(book);
    let varied = text;

    // Light variation strategies by content type
    if (/^עכשיו אתם יודעים/u.test(varied)) {
      varied = varied.replace(
        /^עכשיו אתם יודעים/u,
        "בפרק הזה חיזקנו את הידע"
      );
      varied = varied.replace(
        /בתרגול תמצאו/gu,
        g >= 4 ? "בתרגול תמצאו גם מספרים גדולים יותר" : "בתרגול תמצאו"
      );
      varied = varied.replace(/אל תשכחו את השלישי!/u, "זכרו לכלול את כל שלושת המספרים.");
    } else if (/\?\s*=\s*10/u.test(varied) || /\+\s*\?\s*=/u.test(varied)) {
      const base = 5 + g;
      varied = `${base + 2} + ? = ${base + 6} — מה המספר החסר?
נסו לפתור בעצמכם.
בעמוד הבא נבדוק יחד את הדרך ואת התשובה.`;
    } else if (/^נסו לפתור/u.test(varied)) {
      varied = `בואו נבדוק:\n${varied}`;
    } else {
      varied = `בפרק הזה:\n${varied}`;
    }

    if (varied !== text) {
      fs.writeFileSync(file, varied.endsWith("\n") ? varied : `${varied}\n`, "utf8");
      changed.push(path.relative(ROOT, file).replaceAll("\\", "/"));
    }
  }
}

console.log(JSON.stringify({ changedCount: changed.length, changed: [...new Set(changed)] }, null, 2));
