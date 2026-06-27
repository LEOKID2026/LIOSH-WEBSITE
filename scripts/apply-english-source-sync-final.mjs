#!/usr/bin/env node
/**
 * English Source Sync FINAL — docs/learning-book/english only.
 * Part 1: global technical symbol cleanup
 * Part 2: G1/G2 manual-export alignment (point fixes, no full-page copy)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENGLISH_ROOT = path.join(ROOT, "docs/learning-book/english");

/** @type {[string, string][]} longest-first for slash patterns */
const GLOBAL_REPLACEMENTS = [
  ["the most / the best", "the most או the best"],
  ["must / have to", "must ו-have to"],
  ["כדאי / מומלץ", "כדאי או מומלץ"],
  ["she/he/it", "she, he או it"],
  ["was/were", "was או were"],
  ["יכול/מותר", "יכול או מותר"],
  ["חבר/ה", "חבר או חברה"],
  ["שמח/ה", "שמח או שמחה"],
  ["עייף/ה", "עייף או עייפה"],
  ["גאה/ים", "גאה או גאים"],
  ["≈", "בערך"],
  ["↔", "—"],
  ["→", "—"],
  ["✓", ""],
];

/** @type {[string, string][]} */
const G12_EXACT = [
  // letters_upper
  [
    'אות גדולה היא כמו "ראש גדול" של האות.',
    "אות גדולה היא צורה מיוחדת של האות. באנגלית משתמשים באותיות גדולות בתחילת משפטים ובשמות, וכאן קודם נכיר את הצורה שלהן.",
  ],
  [
    "שלב 1: מסתכלים על הצורה — קו מעוקל כפול, כמו עקלתון.",
    "שלב 1: ל-S יש צורה מתפתלת, כמו קו שמתעגל לשני צדדים.",
  ],
  // letters_lower
  [
    'האות **a** קטנה — נראית כמו "ראש קטן".',
    "האות **a** קטנה — הצורה שרואים הרבה בתוך מילים.",
  ],
  [
    'שלב 1: יש "בטן" למטה — כך נראית האות p.',
    "שלב 1: ל-p יש קו שיורד מתחת לשורה, ועיגול קטן בצד ימין של הקו.",
  ],
  [
    'שלב 1: יש "בטן" — אבל מאיזה צד? הבטן מצד ימין.',
    "שלב 1: ל-b יש קו ישר בצד שמאל, ועיגול קטן בצד ימין.",
  ],
  ["שלב 2: אות שיש לה בטן ימינה — זו", "שלב 2: כך נראית האות b — זו"],
  // listening_commands
  ["משמע — הסתכלו.", "פירוש המילה הוא: הסתכלו."],
  ["**Look. = הסתכלו**", "**Look. פירושו: הסתכלו**"],
  // first_words_cvc
  ["# מילים עם שלוש אותיות (CVC)", "# מילים עם שלוש אותיות"],
  ["| **title_hebrew** | מילים עם שלוש אותיות (CVC) |", "| **title_hebrew** | מילים עם שלוש אותיות |"],
  [
    "**Content scope:** CVC מוגבל: cat, hat, sit, sun, pen, bed; audio_required: yes — blend איטי",
    "**Content scope:** מילים מוגבלות: cat, hat, sit, sun, pen, bed; audio_required: yes — blend איטי",
  ],
  [
    "היום נלמד מילים **קצרות** — שלוש אותיות: עיצור, תנועה, עיצור.",
    "היום נלמד מילים **קצרות** — שלוש אותיות.",
  ],
  ["למשל: c + a + t — cat.", "למשל, במילה cat יש שלוש אותיות."],
  ["**cat** — שומעים לאט: c … a … t — cat.", "**cat** — מחברים את הצלילים לפי הסדר, ואז אומרים cat."],
  ["**sit** — שומעים לאט: s … i … t — sit.", "**sit** — מחברים את הצלילים לפי הסדר, ואז אומרים sit."],
  ["**cat** — c + a + t  ", "**cat**  "],
  ["**hat** — h + a + t  ", "**hat**  "],
  ["**sit** — s + i + t  ", "**sit**  "],
  ["**sun** — s + u + n  ", "**sun**  "],
  ["**pen** — p + e + n  ", "**pen**  "],
  ["**bed** — b + e + d  ", "**bed**  "],
  ["איזו מילה — b + e + d?", "איזו מילה מקבלים מהאותיות b, e, d?"],
  ["**איזו מילה — b + e + d?**", "**איזו מילה מקבלים מהאותיות b, e, d?**"],
  ["**bed = מיטה**", "**bed פירושו: מיטה**"],
  ["עכשיו שמעתם מילים CVC קצרות.", "עכשיו שמעתם מילים קצרות של שלוש אותיות."],
  ["בעמוד הבא — מילים קצרות עם שלוש אותיות (CVC).", "בעמוד הבא — מילים קצרות עם שלוש אותיות."],
  // phonics_sounds
  [
    "**Content scope:** צלילי עיצורים + תנועות קצרות a,e,i; audio_required: yes — כל צליל בנפרד",
    "**Content scope:** צלילי a,e,i וצלילי b,m,s; audio_required: yes — כל צליל בנפרד",
  ],
  ["צלילי עיצורים (דוגמאות):", "דוגמאות לצלילים במילים:"],
  ["תנועות קצרות:", "צלילים קצרים במילים:"],
  // phonics_first_sound content scope
  [
    "**Content scope:** צליל ראשון במילים cat, dog, sun; audio_required: yes — מילה + צליל מבודד",
    "**Content scope:** צליל ראשון במילים cat, dog, sun; audio_required: yes — מילה וצליל מבודד",
  ],
  // classroom_words / listening
  [
    "**Content scope:** book, pen, desk, chair, door, teacher, hello, bye; audio_required: yes — כל מילה + ביטוי קצר",
    "**Content scope:** book, pen, desk, chair, door, teacher, hello, bye; audio_required: yes — כל מילה וביטוי קצר",
  ],
  [
    "**Content scope:** Point to the door, Show me your pen; audio_required: yes — פקודות + בחירת תמונה",
    "**Content scope:** Point to the door, Show me your pen; audio_required: yes — פקודות ובחירת תמונה",
  ],
  ["שלב 1: open = פתיחה.", "שלב 1: Open פירושו לפתוח."],
  ["שלב 2: book = ספר.", "שלב 2: Book פירושו ספר."],
  ["שלב 1: close = סגירה.", "שלב 1: Close פירושו לסגור."],
  ["**Close your book = סוגרים את הספר**", "**Close your book פירושו: סגרו את הספר**"],
  // grammar_be g1
  [
    "**Content scope:** תבניות קבועות I am / You are + כינויי גוף בסיסיים; ללא טבלת am/is/are",
    "**Content scope:** תבניות קבועות I am / You are וכינויי גוף בסיסיים; ללא טבלת am/is/are",
  ],
  // g2 first_word_reading
  [
    "**Content scope:** CVC + sight: the, I, a, is; audio_required: yes — קריאת מילה",
    "**Content scope:** cat, sit, run, the, I, a, is; audio_required: yes — קריאת מילה",
  ],
  [
    "היום **קוראים** מילים — CVC ומילים קצרות מיוחדות.",
    "היום **קוראים** מילים — מילים קצרות ומילים מיוחדות.",
  ],
  ["CVC: **cat**, **sit**, **run**", "מילים קצרות: **cat**, **sit**, **run**"],
  ["מילים קצרות (sight):", "מילים מיוחדות:"],
  // g2 phonics
  [
    "**Content scope:** blend CVC: cat, hat, sit, run, big, red, hot, sun; audio_required: yes — segmented + blended",
    "**Content scope:** blend: cat, hat, sit, run, big, red, hot, sun; audio_required: yes — segmented and blended",
  ],
  [
    "**Content scope:** חזרה A–Z גדולות+קטנות+שמות; audio_required: yes",
    "**Content scope:** חזרה A–Z גדולות, קטנות ושמות; audio_required: yes",
  ],
  [
    "**Content scope:** חזרה עיצורים+תנועות; b/p, d/t; audio_required: yes",
    "**Content scope:** חזרה צלילים; b/p, d/t; audio_required: yes",
  ],
  [
    "היום **חוזרים** על צלילי אותיות — עיצורים ותנועות קצרות.",
    "היום **חוזרים** על צלילי אותיות — צלילים קצרים במילים.",
  ],
  // g2 picture_audio
  ["שלב 2: תמונה של עט + **pen**.", "שלב 2: תמונה של עט ו-**pen**."],
  ["תשובה: pen + תמונת pen", "תשובה: pen ותמונת pen"],
  // g2 vocab content scopes
  [
    "**Content scope:** חזרה + מילים במשפט קצר; כתיבה ראשונית",
    "**Content scope:** חזרה ומילים במשפט קצר; כתיבה ראשונית",
  ],
  [
    "**Content scope:** apple, bread, milk, water — מילים + כתיבה",
    "**Content scope:** apple, bread, milk, water — מילים וכתיבה",
  ],
  // README merge notes
  ["Merged be line + be_basic pool", "Merged be line ו-be_basic pool"],
  ["Merged חיזוק line + be_basic", "Merged חיזוק line ו-be_basic"],
  ["Merged plural line + question_frames", "Merged plural line ו-question_frames"],
  ["## Batch D — sentences + translation (4)", "## Batch D — sentences ו-translation (4)"],
  // grammar / sentence patterns
  ["ילד = He, עצוב = sad.", "He פירושו הוא. sad פירושו עצוב."],
  ["He is + sad.", "He is sad."],
  ["I + run.", "I run."],
  ["I am + happy.", "I am happy."],
  ["I am + twelve.", "I am twelve."],
  ["I see a + cat.", "I see a cat."],
  ["I + go to school.", "I go to school."],
  ["This is my + book — אותה תבנית.", "This is my book — אותה תבנית."],
  ["We = אנחנו.", "We פירושו אנחנו."],
  ["The book = הספר, is red = אדום.", "The book פירושו הספר. is red פירושו אדום."],
  ["I = אני, have = יש לי, a book = ספר.", "I פירושו אני. have פירושו יש לי. a book פירושו ספר."],
  ["I = אני, have = יש לי, a pen = עט.", "I פירושו אני. have פירושו יש לי. a pen פירושו עט."],
  ["seven = 7.", "seven פירושו 7."],
  ["המספר 12 = twelve.", "המספר 12 פירושו twelve."],
  ["go to school = הולך לבית ספר.", "go to school פירושו ללכת לבית ספר."],
  ["הולך לבית ספר = go to school.", "go to school פירושו ללכת לבית ספר."],
  ["ביטוי פגישה = Hello.", "Hello פירושו שלום."],
  ["חתולים = cats.", "cats פירושו חתולים."],
  ["write = לכתוב.", "write פירושו לכתוב."],
];

function walkMd(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function applyOrdered(text, pairs) {
  let n = 0;
  for (const [from, to] of pairs) {
    const parts = text.split(from);
    if (parts.length > 1) {
      n += parts.length - 1;
      text = parts.join(to);
    }
  }
  return { text, n };
}

function fixG12Regex(text) {
  let n = 0;
  const applyRe = (re, repl) => {
    const next = text.replace(re, (...args) => {
      n += 1;
      return typeof repl === "function" ? repl(...args) : repl;
    });
    text = next;
  };

  applyRe(/\*\*([^*\n]+?) = ([^*\n]+?)\*\*/g, "**$1 פירושו: $2**");
  applyRe(/^([A-Za-z][^\n=]*?) = ([^\n]+?)\.$/gm, "$1 פירושו: $2.");
  applyRe(/^([א-ת][^\n=]*?) = ([^\n]+?)\.$/gm, "$1 פירושו: $2.");

  return { text, n };
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function isG12(file) {
  const r = rel(file);
  return r.includes("/english/g1/") || r.includes("/english/g2/");
}

const counts = {
  filesChanged: new Set(),
  global: {},
  g12Exact: 0,
  g12Regex: 0,
};

for (const [from] of GLOBAL_REPLACEMENTS) {
  counts.global[from] = 0;
}

const files = walkMd(ENGLISH_ROOT);
const changedFiles = [];

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  let text = original;

  for (const [from, to] of GLOBAL_REPLACEMENTS) {
    const parts = text.split(from);
    if (parts.length > 1) {
      counts.global[from] += parts.length - 1;
      text = parts.join(to);
    }
  }

  if (isG12(file)) {
    const ex = applyOrdered(text, G12_EXACT);
    text = ex.text;
    counts.g12Exact += ex.n;
    const rx = fixG12Regex(text);
    text = rx.text;
    counts.g12Regex += rx.n;
  }

  if (text !== original) {
    fs.writeFileSync(file, text, "utf8");
    changedFiles.push(rel(file));
    counts.filesChanged.add(rel(file));
  }
}

const report = {
  filesChanged: changedFiles.length,
  files: changedFiles.sort(),
  replacementCounts: {
    ...counts.global,
    g12Exact: counts.g12Exact,
    g12Regex: counts.g12Regex,
  },
};

console.log(JSON.stringify(report, null, 2));
