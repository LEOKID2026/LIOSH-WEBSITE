/**
 * Apply content fixes from cursor_book_content_fix_pack to exports/audio-text/books.
 * Only modifies page-*.txt files under exports/audio-text/books.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");
const CSV_PATH = path.join(ROOT, "cursor_book_content_fix_pack", "cursor_content_fix_findings.csv");

/** @type {string[]} */
const changedFiles = [];

function parseCSV(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      if (c === '"') {
        inQ = false;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === '"') {
      inQ = true;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && n === "\n") i += 1;
      if (cur || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function pagePath(book, page) {
  return path.join(BOOKS_ROOT, book, "pages", page);
}

function readPage(book, page) {
  const p = pagePath(book, page);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function writePage(book, page, text) {
  const p = pagePath(book, page);
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  fs.writeFileSync(p, normalized, "utf8");
  if (!changedFiles.includes(p)) changedFiles.push(p);
}

function replacePage(book, page, text) {
  writePage(book, page, text);
}

function replaceInPage(book, page, replacements) {
  let text = readPage(book, page);
  if (text == null) return false;
  let changed = false;
  for (const [from, to] of replacements) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed = true;
    }
  }
  if (changed) writePage(book, page, text);
  return changed;
}

function removeAdjacentDuplicates(text) {
  const lines = text.split(/\r?\n/);
  /** @type {string[]} */
  const out = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (out.length && trimmed.trim() === out[out.length - 1].trim() && trimmed.trim().length > 1) {
      continue;
    }
    out.push(trimmed);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function walkPageFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walkPageFiles(p));
    else if (/^page-\d+\.txt$/.test(name)) out.push(p);
  }
  return out;
}

// --- Exact full-page replacements from prompt ---
const FULL_PAGE = [
  [
    "math-g1",
    "page-073.txt",
    `9 גולות + 12 גולות:
נחשב בשלבים נוחים.
קודם נוסיף 10:
9 + 10 = 19
נשאר להוסיף עוד 2:
19 + 2 = 21
לכן:
9 + 12 = 21`,
  ],
  [
    "math-g1",
    "page-080.txt",
    `היו 8 מדבקות.
לקחו 3 מדבקות.
נחשב כמה נשאר:
8 − 3 = 5
לכן נשארו 5 מדבקות.
אפשר לבדוק:
5 + 3 = 8`,
  ],
  [
    "hebrew-g1",
    "page-200.txt",
    `שׁוֹתִים ממנה — מה זה?
חושבים — ממה שותים?
כּוֹס.`,
  ],
  [
    "moledet-g3",
    "page-025.txt",
    `מה ההבדל בין ים לנחל?
ים — גוף מים גדול ורחב, ויש בו גלים וזרמים.
נחל — מים שזורמים באפיק, בדרך כלל במסלול צר יותר.
ים גדול ורחב; נחל זורם בדרך מוגדרת.`,
  ],
  [
    "english-g5",
    "page-111.txt",
    `תרגיל: "היו הרבה מים בבקבוק."
water — שם עצם לא ספיר.
במשפט רגעי וטבעי משתמשים הרבה פעמים ב-a lot of.
היו הרבה מים בבקבוק.
There was a lot of water in the bottle.`,
  ],
  [
    "english-g5",
    "page-125.txt",
    `תרגיל: "בשנה שעברה כיתתנו עבדה על פרויקט בנושא הסביבה."
Last year = בשנה שעברה → פועל בעבר.
work on a project = לעבוד על פרויקט.
בשנה שעברה כיתתנו עבדה על פרויקט בנושא הסביבה.
Last year our class worked on a project about the environment.`,
  ],
];

for (const [book, page, content] of FULL_PAGE) {
  replacePage(book, page, content);
}

// Fix typo in english-g5 page-111 - user said "רגיל" not "רגעי"
replaceInPage("english-g5", "page-111.txt", [["במשפט רגעי", "במשפט רגיל"]]);

// --- Exact in-page replacements from prompt ---
const EXACT_REPLACEMENTS = [
  ["hebrew-g1", "page-096.txt", "הַסֵּפֶר עָמֹד", "הַסֵּפֶר מוּנָח"],
  ["hebrew-g4", "page-078.txt", "שלוש אותיות שממנן נבנות מילים", "שלוש אותיות שמהן נבנות מילים"],
  ["hebrew-g5", "page-155.txt", "מוצאים את הזר — המוזרה.", "מוצאים את המילה היוצאת דופן."],
  ["hebrew-g6", "page-001.txt", "מה מצפים ממנו", "מה מצופה מהטקסט"],
  ["science-g1", "page-022.txt", "חומרים — דברים שממנו עשויים חפצים", "חומרים — דברים שמהם עשויים חפצים"],
  ["hebrew-g1", "page-065.txt", "מַיִם — שותים ממנו.", "מַיִם — שותים אותם."],
  [
    "science-g5",
    "page-023.txt",
    null,
    null,
  ],
  [
    "science-g5",
    "page-027.txt",
    null,
    null,
  ],
  [
    "science-g6",
    "page-016.txt",
    "צפיפות — כמה משקל בנפח נתון:",
    "צפיפות — כמה חומר או מסה יש בנפח מסוים:",
  ],
  [
    "english-g5",
    "page-106.txt",
    "much/many — כמות בעבר ועתיד",
    "much/many — כמות עם שמות עצם ספירים ולא ספירים",
  ],
  [
    "english-g5",
    "page-110.txt",
    "There was much water in the bottle.",
    "There was a lot of water in the bottle.",
  ],
  [
    "english-g5",
    "page-112.txt",
    "עכשיו אתם משתמשים ב-much/many בעבר ועתיד.",
    "עכשיו אתם יודעים לבחור בין much ל-many לפי סוג שם העצם.",
  ],
  ["english-g5", "page-124.txt", "made a project", "worked on a project"],
  ["english-g2", "page-060.txt", "playground — מגרש.", "playground — מגרש משחקים."],
];

for (const [book, page, from, to] of EXACT_REPLACEMENTS) {
  if (from && to) replaceInPage(book, page, [[from, to]]);
}

// Science earthquake pages
{
  const s523 = readPage("science-g5", "page-023.txt");
  if (s523 && /מעטפת|מנטל|עמוק בתוך/i.test(s523)) {
    replacePage(
      "science-g5",
      "page-023.txt",
      "רעידת אדמה — תזוזה פתאומית של סלעים או לוחות בקרום כדור הארץ, שמשחררת אנרגיה וגורמת לרעידות שמורגשות בפני השטח."
    );
  }
  const s527 = readPage("science-g5", "page-027.txt");
  if (s527) {
    const patched = s527
      .split(/\r?\n/)
      .map((line) => {
        if (/רעידת אדמה|רעידות/i.test(line) && /מעטפת|מנטל|עמוק/i.test(line)) {
          return "רעידת אדמה קורית כאשר סלעים או לוחות בקרום כדור הארץ נעים בפתאומיות ומשחררים אנרגיה — והרעד מגיע לפני השטח.";
        }
        return line;
      })
      .join("\n");
    if (patched !== s527) writePage("science-g5", "page-027.txt", patched);
  }
}

// Geography safety page
{
  const g518 = readPage("geography-g5", "page-018.txt");
  if (g518 && /חירום|רעיד/i.test(g518)) {
    replacePage(
      "geography-g5",
      "page-018.txt",
      `במצב חירום פועלים לפי הוראות המבוגר האחראי והגורמים המוסמכים.
שומרים מרחק מחלונות ומחפצים שעלולים ליפול, ונשארים רגועים ככל האפשר.`
    );
  }
}

// --- Global systemic fixes on all page txt files ---
const pageFiles = walkPageFiles(BOOKS_ROOT);
for (const file of pageFiles) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  text = text.split("שאלה מסעיף 5:").join("בואו נבדוק יחד:");
  text = text.split("שאלה מסעיף 5").join("בואו נבדוק יחד");
  text = removeAdjacentDuplicates(text);

  if (text !== original) {
    fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
    if (!changedFiles.includes(file)) changedFiles.push(file);
  }
}

// --- Grade/meta wording replacements (global safe patterns) ---
const GRADE_META_GLOBAL = [
  [/בכיתה א׳ נשתמש/gu, "כאן נשתמש"],
  [/בכיתה א׳ נלמד/gu, "כאן נלמד"],
  [/בכיתה א׳ לא לומדים/gu, "כאן לא מתרגלים"],
  [/בכיתה א׳ לא נלמד/gu, "כאן לא מתרגלים"],
  [/בכיתה ב׳ נלמד/gu, "כאן נלמד"],
  [/בכיתה ב׳ לא נלמד/gu, "כאן לא מתרגלים"],
  [/בכיתה ב׳ מתמקדים/gu, "כאן מתמקדים"],
  [/בכיתה ג׳ נלמד/gu, "כאן נלמד"],
  [/בכיתה ג׳ מתרגלים/gu, "כאן מתרגלים"],
  [/בכיתה ד׳ קוראים/gu, "כאן קוראים"],
  [/בכיתה ד׳ המשפטים/gu, "בטקסטים האלה המשפטים"],
  [/בכיתה ה׳ לא מספיק/gu, "לא מספיק"],
  [/בכיתה ו׳ קוראים/gu, "כאן קוראים"],
  [/בכיתה ו׳ לא אומר/gu, "לא צריך"],
  [/בכיתה ו׳ הקטעים/gu, "הקטעים"],
  [/בכיתה ו׳ השגיאות/gu, "השגיאות"],
  [/בכיתה ו׳:/gu, "כאן:"],
  [/בכיתה ה׳:/gu, "כאן:"],
  [/בכיתה ד׳:/gu, "כאן:"],
  [/בכיתה ג׳:/gu, "כאן:"],
  [/בכיתה ב׳:/gu, "כאן:"],
  [/בכיתה א׳:/gu, "כאן:"],
  [/ברמת כיתה ב׳/gu, "בתרגול הזה"],
  [/ברמת כיתה ג׳/gu, "בתרגול הזה"],
  [/ברמת כיתה ד׳/gu, "בתרגול הזה"],
  [/ברמת כיתה ה׳/gu, "בתרגול הזה"],
  [/ברמת כיתה ו׳/gu, "בתרגול הזה"],
  [/מניחים שעברתם על יסודות כיתה א׳/gu, "נמשיך מהיסודות שכבר הכרנו"],
  [/מניחים שעברתם על יסודות כיתה ב׳/gu, "נמשיך מהיסודות שכבר הכרנו"],
  [/ממה שלמדנו בכיתה/gu, "ממה שכבר למדנו"],
  [/זו מיומנות מרכזית בכיתה ב׳\./gu, "זו מיומנות מרכזית בקריאה."],
  [/סיימתם את יסודות הקריאה וההאזנה בכיתה ב׳\./gu, "סיימתם את יסודות הקריאה וההאזנה."],
  [
    /סיימתם את יסודות האותיות, הצלילים, המילים וההאזנה בכיתה א׳\./gu,
    "סיימתם את יסודות האותיות, הצלילים, המילים וההאזנה.",
  ],
  [/תלמידי כיתה/gu, "תלמידים"],
  [/קשר לכיתה/gu, "קשר לנושא"],
  [/כיתה אחת:/gu, "במקום אחד:"],
  [/ילד בכיתה ו'2/gu, "ילד בגיל בית הספר"],
  [/הנגדה בכיתה ו׳:/gu, "הנגדה:"],
  [/הערכה ביקורתית בכיתה ו׳:/gu, "הערכה ביקורתית:"],
  [/ניתוח טקסט בכיתה ו׳/gu, "ניתוח טקסט"],
  [/התלמידים אשר בכיתה ו׳/gu, "התלמידים"],
];

for (const file of pageFiles) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;
  for (const [re, rep] of GRADE_META_GLOBAL) {
    text = text.replace(re, rep);
  }
  if (text !== original) {
    fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
    if (!changedFiles.includes(file)) changedFiles.push(file);
  }
}

// --- Parse CSV for per-file recommendations ---
const csvRows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
const header = csvRows[0];
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

/** @type {Map<string, { category: string, recommendation: string, issue: string }[]>} */
const byFile = new Map();

for (const row of csvRows.slice(1)) {
  if (!row.length || !row[idx.book]) continue;
  const book = row[idx.book];
  const page = row[idx.page];
  const key = `${book}/${page}`;
  if (!byFile.has(key)) byFile.set(key, []);
  byFile.get(key).push({
    category: row[idx.category] || "",
    recommendation: row[idx.recommendation] || "",
    issue: row[idx.issue] || "",
  });
}

// Apply CSV recommendations that contain explicit replace patterns
for (const [key, items] of byFile) {
  const [book, page] = key.split("/");
  let text = readPage(book, page);
  if (text == null) continue;
  const original = text;

  for (const item of items) {
    const rec = item.recommendation;
    // Pattern: להחליף `X` ב-`Y` or Replace `X` with `Y`
    const m1 = rec.match(/להחליף(?: את)?(?: כל)?(?: המופע)?(?:ים)?:?\s*[`""'](.+?)[`""']\s*(?:ב|ל)[-:]?\s*[`""'](.+?)[`""']/u);
    const m2 = rec.match(/Replace(?:\s+the page with)?:?\s*[`""'](.+?)[`""']\s*with:?\s*[`""'](.+?)[`""']/iu);
    const m3 = rec.match(/Replace:\s*[`""'](.+?)[`""']\s*With:\s*[`""'](.+?)[`""']/iu);
    const match = m1 || m2 || m3;
    if (match) {
      const [, from, to] = match;
      if (from && to && text.includes(from)) text = text.split(from).join(to);
    }

    if (/להסיר את השורה הכפולה/i.test(rec)) {
      text = removeAdjacentDuplicates(text);
    }

    if (/להחליף את כל העמוד/i.test(rec) && item.category === "Content correctness") {
      // handled by FULL_PAGE above
    }
  }

  if (text !== original) writePage(book, page, text);
}

// --- Cross-book / near-duplicate adaptations from CSV ---
/** @type {Record<string, string>} */
const DUPLICATE_ADAPTATIONS = {
  // math-g2 pages that duplicate math-g1 - add variation in numbers/context
  "math-g2/page-073.txt": null,
};

// Read cross-book duplicate entries and lightly vary higher-grade copies
for (const row of csvRows.slice(1)) {
  const cat = row[idx.category];
  if (cat !== "Cross-book duplicate" && cat !== "Near duplicate lesson") continue;
  const book = row[idx.book];
  const page = row[idx.page];
  const rec = row[idx.recommendation] || "";
  let text = readPage(book, page);
  if (!text) continue;

  // If recommendation suggests changing numbers/examples, apply simple suffix note only when identical to lower grade
  const issue = row[idx.issue] || "";
  if (/זהה|identical|מועתק|duplicate/i.test(issue + rec)) {
    // For near-duplicates: prepend contextual opener if page starts identically to a pattern
    if (/^היום נלמד/u.test(text) && !/^בפרק הזה/u.test(text)) {
      text = text.replace(/^היום נלמד/u, "בפרק הזה נלמד");
    }
    if (/^נלמד/u.test(text) && !/^כאן נלמד/u.test(text) && book.includes("-g") && parseInt(book.split("-g")[1], 10) >= 3) {
      text = text.replace(/^נלמד/u, "כאן נלמד");
    }
  }

  // Specific adaptations noted in CSV evidence for math spiral
  if (book === "math-g2" && page === "page-073.txt") {
    text = `12 גולות + 15 גולות:
נחשב בשלבים נוחים.
קודם נוסיף 10:
12 + 10 = 22
נשאר להוסיף עוד 5:
22 + 5 = 27
לכן:
12 + 15 = 27`;
  }
  if (book === "math-g2" && page === "page-080.txt") {
    text = `היו 13 מדבקות.
לקחו 4 מדבקות.
נחשב כמה נשאר:
13 − 4 = 9
לכן נשארו 9 מדבקות.
אפשר לבדוק:
9 + 4 = 13`;
  }
  if (book === "math-g3" && page === "page-073.txt") {
    text = `24 + 17:
נחשב בשלבים.
24 + 10 = 34
34 + 7 = 41
לכן 24 + 17 = 41`;
  }
  if (book === "math-g3" && page === "page-080.txt") {
    text = `היו 35 תפוחים.
מכרו 18 תפוחים.
35 − 18 = 17
נשארו 17 תפוחים.
בדיקה: 17 + 18 = 35`;
  }

  writePage(book, page, text);
}

const report = {
  changedFileCount: changedFiles.length,
  changedFiles: changedFiles.map((f) => path.relative(ROOT, f).replaceAll("\\", "/")),
};
fs.writeFileSync(
  path.join(ROOT, "exports", "audio-text", "content-fix-applied.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify(report, null, 2));
