#!/usr/bin/env node
/**
 * Sync data/hebrew-questions/g3.js reading arrays from canonical bank.
 * Run: npx tsx scripts/sync-hebrew-g3-reading-archive.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const G3_PATH = join(ROOT, "data/hebrew-questions/g3.js");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  G3_READING_EASY,
  G3_READING_MEDIUM,
  G3_READING_HARD,
} = await import(href("data/hebrew-g3-reading-bank.js"));

const { finalizeHebrewMcq } = await import(href("utils/hebrew-question-generator.js"));

const GENRE_MEDIUM = [
  {
    question:
      "כיתה ג׳ — טקסט מידעי מול סיפור (1): 'בטבלה: 12 ימים עם גשם, 18 בלי גשם.' לעומת סיפור: 'הגשם דפק על החלון.' מה ההבדל בז׳אנר?",
    answers: [
      "במידע יש עובדות ובסיפור יש עלילה ותיאור חווייתי",
      "אין הבדל",
      "שניהם רק שירים",
      "במידע חייבת להיות עלילה",
    ],
    correct: 0,
    skillId: "hebrew_archive_reading",
    subtype: "g3",
    difficulty: "standard",
    cognitiveLevel: "understanding",
    expectedErrorTypes: ["reading_comprehension_error", "detail_recall_error"],
    subtopicId: "g3.genre_tag_info_vs_story",
    patternFamily: "phase717_p0_genre",
    subtype: "n1",
  },
  {
    question:
      "כיתה ג׳ — טקסט מידעי מול סיפור (2): 'המים רותחים ב-100°C (בלחץ אטמוספרי רגיל).' לעומת: 'הקומקום שרק כועס.' מה נכון?",
    answers: [
      "במשפט המידעי יש ניסוח עובדתי; בסיפור יש דימוי",
      "בשניהם רק מספרים",
      "במידע אסור להשתמש במילים",
      "בסיפור חייבים רק טבלאות",
    ],
    correct: 0,
    skillId: "hebrew_archive_reading",
    difficulty: "standard",
    subtopicId: "g3.genre_tag_info_vs_story",
    patternFamily: "phase717_p0_genre",
  },
  {
    question:
      "כיתה ג׳ — טקסט מידעי מול סיפור (3): 'מחקר מצא ששתיית מים מסייעת בריכוז.' לעומת: 'דני שתה והרגיש גיבור.' מה מאפיין את המידע?",
    answers: [
      "מקור/ממצא מנוסח בזהירות; בסיפור דגש על דמות ורגש",
      "רק שמות",
      "רק צחוק",
      "אין הבדל",
    ],
    correct: 0,
    skillId: "hebrew_archive_reading",
    difficulty: "standard",
    subtopicId: "g3.genre_tag_info_vs_story",
    patternFamily: "phase717_p0_genre",
  },
  {
    question:
      "כיתה ג׳ — טקסט מידעי מול סיפור (4): 'לוח שנה: 365 ימים.' לעומת: 'השנה רצה מהר כמו סוס.' מה ההבדל?",
    answers: [
      "במידע עובדות; במטפורה בסיפור יש השוואה דימוית",
      "שניהם טבלאות",
      "במידע חייבת מטפורה",
      "בסיפור אין משפטים",
    ],
    correct: 0,
    skillId: "hebrew_archive_reading",
    difficulty: "standard",
    subtopicId: "g3.genre_tag_info_vs_story",
    patternFamily: "phase717_p0_genre",
  },
];

function enrich(items, level) {
  return items.map((raw) => {
    const fq = finalizeHebrewMcq({ ...raw }, "reading", level, "g3");
    return {
      question: fq.question,
      answers: fq.answers,
      correct: fq.correct,
      skillId: raw.skillId || "hebrew_archive_reading",
      subtype: "g3",
      difficulty: raw.difficulty || (level === "easy" ? "basic" : level === "medium" ? "standard" : "advanced"),
      cognitiveLevel: raw.cognitiveLevel || "understanding",
      expectedErrorTypes: raw.expectedErrorTypes || [
        "vocabulary_confusion",
        "careless_error",
        "reading_comprehension_error",
        "detail_recall_error",
      ],
      ...(raw.subtopicId ? { subtopicId: raw.subtopicId } : {}),
      ...(raw.patternFamily ? { patternFamily: raw.patternFamily } : {}),
    };
  });
}

const easyReading = enrich(G3_READING_EASY, "easy");
const mediumReading = enrich([...G3_READING_MEDIUM, ...GENRE_MEDIUM], "medium");
const hardReading = enrich(G3_READING_HARD, "hard");

let src = readFileSync(G3_PATH, "utf8");
if (!src.includes("hebrew-g3-reading-bank")) {
  src =
    `import {\n  G3_READING_EASY,\n  G3_READING_MEDIUM,\n  G3_READING_HARD,\n} from "../hebrew-g3-reading-bank.js";\n\n` +
    src.replace(/^\/\/ Metadata enrichment.*\n\/\/ Metadata enrichment.*\n/, "");
}

function replaceReadingBlock(text, exportName, newArrayLiteral) {
  const re = new RegExp(
    `(export const ${exportName} = \\{[\\s\\S]*?"reading": )\\[[\\s\\S]*?\\](,?\\s*\\n\\s*"comprehension")`,
    "m"
  );
  const json = JSON.stringify(newArrayLiteral, null, 2).replace(/\n/g, "\n  ");
  const next = text.replace(re, `$1${json}$2`);
  if (next === text) throw new Error(`Failed to replace reading in ${exportName}`);
  return next;
}

src = replaceReadingBlock(src, "G3_EASY_QUESTIONS", easyReading);
src = replaceReadingBlock(src, "G3_MEDIUM_QUESTIONS", mediumReading);
src = replaceReadingBlock(src, "G3_HARD_QUESTIONS", hardReading);

writeFileSync(G3_PATH, src, "utf8");
console.log("Synced g3.js reading:", {
  easy: easyReading.length,
  medium: mediumReading.length,
  hard: hardReading.length,
});
