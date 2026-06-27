#!/usr/bin/env node
/**
 * One-shot science launch-blocker fixes (stages 2–5 audit).
 * Does NOT touch thin buckets, length bias, or non-blocker content.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} stem */
export function cleanSciVolStem(stem) {
  const s = String(stem || "").trim();
  const m = s.match(
    /^כיתה\s*[א-ו]׳\s*·\s*רמה\s*(?:בינונית|מתקדמת)\s*—\s*(.+?)\s*·\s*מוקד\s+[a-z0-9_]+$/u
  );
  if (m) return m[1].trim();
  return s
    .replace(/^כיתה\s*[א-ו]׳\s*·\s*רמה\s\S+\s*—\s*/u, "")
    .replace(/\s*·\s*מוקד\s+[a-z0-9_]+$/iu, "")
    .trim();
}

/** @param {Record<string, unknown>} params */
function expectedErrorTypesForPhb(params) {
  const cog = String(params?.cognitiveLevel || "recall").toLowerCase();
  if (cog === "analysis" || cog === "application") {
    return ["concept_confusion", "misconception", "careless_error"];
  }
  if (cog === "understanding") {
    return ["misconception", "concept_confusion", "fact_recall_gap"];
  }
  return ["fact_recall_gap", "concept_confusion", "careless_error"];
}

/** id -> { stem?, options, correctIndex } */
const TRUE_FALSE_TO_MCQ = {
  body_4: {
    stem: "איך השרירים והשלד תורמים לתנועה בגוף?",
    options: [
      "השרירים והשלד פועלים יחד — השרירים מושכים עצמות וכך נוצרת תנועה",
      "רק השלד זז בלי שרירים",
      "רק השרירים פועלים בלי עצמות",
      "העור אחראי לכל התנועות בגוף",
    ],
    correctIndex: 0,
  },
  animals_3: {
    stem: "מה נכון לגבי זוחלים?",
    options: [
      "לרוב מכוסים בקשקשים ומטילים ביצים",
      "הם יונקים שמיניקים גורים",
      "אין להם עור או קשקשים",
      "כולם חיים במים בלבד",
    ],
    correctIndex: 0,
  },
  plants_4: {
    stem: "מתי צמחים מבצעים חילוף גזים (נשימה)?",
    options: [
      "צמחים נושמים גם בלילה, לא רק ביום",
      "צמחים נושמים רק ביום כשיש אור שמש",
      "צמחים לא נושמים כלל",
      "רק השורשים נושמים, לא העלים",
    ],
    correctIndex: 0,
  },
  materials_3: {
    stem: "מה נכון לגבי פלסטיק?",
    options: [
      "פלסטיק נוצר בתעשייה ולא נמצא בטבע כפי שהוא",
      "פלסטיק גדל על עצים ביער",
      "פלסטיק הוא סוג של עץ",
      "כל חומר בטבע הוא פלסטיק",
    ],
    correctIndex: 0,
  },
  earth_3: {
    stem: "מה נכון לגבי הירח?",
    options: [
      "הירח הוא לוויין שמחזיר אור שמש — הוא לא כוכב שמאיר מעצמו",
      "הירח הוא כוכב שמאיר מעצמו",
      "הירח הוא כוכב לכת כמו כדור הארץ",
      "הירח נוצר מאש ולכן הוא זוהר",
    ],
    correctIndex: 0,
  },
  env_3: {
    stem: "מה נכון לגבי זיהום אוויר?",
    options: [
      "זיהום אוויר יכול להשפיע גם על בריאות בני האדם",
      "זיהום אוויר משפיע רק על צמחים",
      "זיהום אוויר אינו קשור לבריאות",
      "רק מים מזוהמים מזיקים לאדם",
    ],
    correctIndex: 0,
  },
  exp_3: {
    stem: "מה נכון לגבי שינוי משתנים בניסוי מדעי?",
    options: [
      "משנים משתנה אחד בכל פעם ושומרים על השאר",
      "חייבים תמיד להחליף כמה משתנים בו-זמנית",
      "אין צורך בקבוצת ביקורת",
      "תוצאה אחת מספיקה בלי חזרה",
    ],
    correctIndex: 0,
  },
  body_11: {
    stem: "כמה חושים יש לנו?",
    options: [
      "חמישה: ראייה, שמיעה, ריח, טעם ומישוש",
      "שלושה: ראייה, שמיעה וטעם בלבד",
      "שניים: ראייה ושמיעה",
      "שבעה חושים כמו אצל כל בעלי החיים",
    ],
    correctIndex: 0,
  },
  animals_10: {
    stem: "מה נכון לגבי מזון של בעלי חיים?",
    options: [
      "בעלי חיים שונים אוכלים סוגי מזון שונים",
      "כל בעלי החיים אוכלים את אותו סוג מזון",
      "רק צמחים צריכים מזון",
      "בעלי חיים לא צריכים מים",
    ],
    correctIndex: 0,
  },
  plants_9: {
    stem: "מה צמח צריך כדי לגדול?",
    options: [
      "מים, אור, אוויר וחומרים מהאדמה",
      "צמח יכול לגדול גם בלי אור שמש לגמרי",
      "רק מים, בלי אור",
      "רק אדמה, בלי מים",
    ],
    correctIndex: 0,
  },
  materials_9: {
    stem: "מהו קרח?",
    options: [
      "מים במצב מוצק",
      "מים במצב גז",
      "חומר שונה לגמרי ממים",
      "מתכת קרה",
    ],
    correctIndex: 0,
  },
  earth_8: {
    stem: "מתי השמש מאירה?",
    options: [
      "השמש מאירה כל הזמן — ביום אנחנו רואים אותה כשאין עננים",
      "השמש מאירה רק בחלק מהימים",
      "השמש מאירה רק בלילה",
      "השמש נדלקת ונכבית כל יום",
    ],
    correctIndex: 0,
  },
  env_7: {
    stem: "איפה כדאי לזרוק פסולת?",
    options: [
      "בפח אשפה או במיכל מיחזור מתאים",
      "על הרצפה בכיתה",
      "בגינה בלי פח",
      "בנחל או בים",
    ],
    correctIndex: 0,
  },
  body_19: {
    stem: "מהו האיבר הגדול ביותר בגוף האדם?",
    options: [
      "העור",
      "הלב",
      "המוח",
      "הכבד",
    ],
    correctIndex: 0,
  },
  body_25: {
    stem: "כמה עיניים יש לרוב האנשים?",
    options: [
      "שתיים",
      "אחת",
      "שלוש",
      "ארבע",
    ],
    correctIndex: 0,
  },
  animals_19: {
    stem: "מה נכון לגבי כלב וחתול?",
    options: [
      "הם יונקים — מיניקים גורים ויש להם פרווה",
      "הם זוחלים שמטילים ביצים",
      "הם דגים שחיים במים",
      "הם ציפורים עם נוצות",
    ],
    correctIndex: 0,
  },
  plants_18: {
    stem: "למה צמחים צריכים מים?",
    options: [
      "מים נחוצים לחיים ולתהליכים בצמח",
      "צמחים לא צריכים מים כלל",
      "מים מזיקים לכל צמח",
      "רק בעלי חיים צריכים מים",
    ],
    correctIndex: 0,
  },
  materials_17: {
    stem: "באילו מצבי צבירה יכולים להימצא מים?",
    options: [
      "מוצק, נוזל וגז",
      "רק נוזל",
      "רק מוצק",
      "רק גז",
    ],
    correctIndex: 0,
  },
  earth_16: {
    stem: "מהי השמש?",
    options: [
      "כוכב שמפיץ אור וחום",
      "כוכב לכת כמו כדור הארץ",
      "לוויין של כדור הארץ",
      "אסטרואיד גדול",
    ],
    correctIndex: 0,
  },
  body_35__v2: {
    stem: "כמה ידיים ורגליים יש לרוב האנשים?",
    options: [
      "שתי ידיים ושתי רגליים",
      "יד אחת ורגל אחת",
      "ארבע ידיים",
      "שלוש רגליים",
    ],
    correctIndex: 0,
  },
  body_40: {
    stem: "מה קורה לגוף של ילדים בגיל הצמיחה?",
    options: [
      "הגוף גדל בהדרגה",
      "הגוף לא משתנה עד גיל 18",
      "הגוף קטן עם הזמן",
      "רק הראש גדל, לא השאר",
    ],
    correctIndex: 0,
  },
  plants_16__v2: {
    stem: "מה צמחים צריכים כדי לגדול?",
    options: [
      "אור שמש, מים, אוויר וחומרים מהאדמה",
      "רק מים בלי אור",
      "רק אדמה בלי מים",
      "צמחים גדלים בחושך מלא ללא מים",
    ],
    correctIndex: 0,
  },
  env_51: {
    stem: "מה נכון לגבי שיפור איכות מים במפרץ אחרי סערה?",
    options: [
      "צריך מדידות וזמן — לא בהכרח שיפור מיידי",
      "איכות המים תשתפר מיד בלי מדידות נוספות",
      "סערה תמיד מזהמת ללא יוצא מן הכלל",
      "אין קשר בין ניקוז לבין איכות מים",
    ],
    correctIndex: 0,
  },
};

/** @param {string} text */
function patchTrueFalseInFile(text) {
  let out = text;
  for (const [id, conv] of Object.entries(TRUE_FALSE_TO_MCQ)) {
    if (!out.includes(`"id": "${id}"`)) continue;
    const blockRe = new RegExp(
      `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"type": )"true_false"`,
      "m"
    );
    if (!blockRe.test(out)) continue;
    out = out.replace(blockRe, `$1"mcq"`);
    if (conv.stem) {
      const stemRe = new RegExp(
        `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"stem": )"[^"]*"`,
        "m"
      );
      out = out.replace(stemRe, `$1${JSON.stringify(conv.stem)}`);
    }
    const optsRe = new RegExp(
      `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"options": )\\[[\\s\\S]*?\\]`,
      "m"
    );
    out = out.replace(optsRe, `$1${JSON.stringify(conv.options, null, 4).replace(/\n/g, "\n    ")}`);
    const ciRe = new RegExp(
      `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"correctIndex": )\\d+`,
      "m"
    );
    out = out.replace(ciRe, `$1${conv.correctIndex}`);
  }
  return out;
}

async function fixNeedsMoreVolume() {
  const path = join(ROOT, "data/science-questions-needs-more-volume.js");
  const mod = await import(new URL("../data/science-questions-needs-more-volume.js", import.meta.url).href);
  const arr = mod.SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME.map((q) => ({
    ...q,
    stem: cleanSciVolStem(q.stem),
  }));
  const header = `/**
 * Science NEEDS_MORE volume fill. Generated by scripts/gen-science-needs-more-volume.mjs
 * Do not hand-edit; regenerate after deficit changes.
 * Stems sanitized for student display (launch-blocker fix).
 */
`;
  await writeFile(path, `${header}export const SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME = ${JSON.stringify(arr, null, 2)};\n`, "utf8");
  return arr.filter((q, i) => q.stem !== mod.SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME[i].stem).length;
}

async function fixPhaseB() {
  const path = join(ROOT, "data/science-questions-phase-b.js");
  const mod = await import(new URL("../data/science-questions-phase-b.js", import.meta.url).href);
  const arr = mod.SCIENCE_QUESTIONS_PHASE_B.map((q) => {
    const params = { ...q.params };
    const types = expectedErrorTypesForPhb(params);
    params.expectedErrorTypes = types;
    params.expectedErrorTags = types;
    return { ...q, params };
  });
  const header = `/**
 * Phase B Science expansion — materials, earth_space, environment (g1–g6).
 * Generated by scripts/gen-science-phase-b.mjs
 * expectedErrorTypes added for parent-report metadata (launch-blocker fix).
 */
`;
  await writeFile(path, `${header}export const SCIENCE_QUESTIONS_PHASE_B = ${JSON.stringify(arr, null, 2)};\n`, "utf8");
  return arr.length;
}

async function fixMcqHardFailsInText(text) {
  let out = text;
  // materials_6 — replace near-duplicate 4th option
  out = out.replace(
    `"מוצק, רק כשהמים קפואים בצינור בחורף קר מאוד"`,
    `"אבקה יבשה שלא זורמת"`
  );
  // plants_14__v2
  out = out.replace(
    `"שורשים בלי עלים בחלק העליון"`,
    `"גזע בלבד בלי עלים"`
  );
  // earth_21__v2 — fix all confusing options
  out = out.replace(
    /("id": "earth_21__v2"[\s\S]*?"options": )\[\s*"כוכב",\s*"גוף שמסתובב סביב כוכב לכת",\s*"כוכב לכת",\s*"אסטרואיד חוצה מסלולים"\s*\]/m,
    `$1[
      "כוכב לכת גדול שמאיר מעצמו",
      "גוף טבעי שמקיף את כדור הארץ ומואר על ידי השמש",
      "אסטרואיד קטן בין מרcury לשמש",
      "ענן גשם בלבד"
    ]`
  );
  // animals_20__v2 — remove banned phrase
  out = out.replace(
    `"stem": "איזה בעל חיים יש לו זנב?"`,
    `"stem": "איזה מהבאים הוא בעל חיים?"`
  );
  out = out.replace(
    /("id": "animals_20__v2"[\s\S]*?"options": )\[\s*"דג",\s*"ציפור",\s*"כלב",\s*"כל התשובות נכונות"\s*\]/m,
    `$1[
      "כלב",
      "עץ",
      "סלע",
      "ענן"
    ]`
  );
  out = out.replace(
    /("id": "animals_20__v2"[\s\S]*?"correctIndex": )3/m,
    `$10`
  );
  // sci_p1_g6_experiments_easy_06 — in p1 file only usually
  out = out.replace(
    /("id": "sci_p1_g6_experiments_easy_06"[\s\S]*?"options": )\[\s*"השוואה ללא שינוי",\s*"מחיקה",\s*"שינוי",\s*"לא"\s*\]/m,
    `$1[
      "קבוצה שנשארת ללא שינוי להשוואה",
      "מחיקת כל הנתונים מהיומן",
      "שינוי כל המשתנים יחד",
      "דילוג על רישום תוצאות"
    ]`
  );
  return out;
}

async function main() {
  const volFixed = await fixNeedsMoreVolume();
  const phbFixed = await fixPhaseB();

  let sciMain = await readFile(join(ROOT, "data/science-questions.js"), "utf8");
  sciMain = patchTrueFalseInFile(sciMain);
  sciMain = await fixMcqHardFailsInText(sciMain);
  await writeFile(join(ROOT, "data/science-questions.js"), sciMain, "utf8");

  let phase3 = await readFile(join(ROOT, "data/science-questions-phase3.js"), "utf8");
  phase3 = patchTrueFalseInFile(phase3);
  await writeFile(join(ROOT, "data/science-questions-phase3.js"), phase3, "utf8");

  let p1 = await readFile(join(ROOT, "data/science-questions-p1-g456-fill.js"), "utf8");
  p1 = await fixMcqHardFailsInText(p1);
  await writeFile(join(ROOT, "data/science-questions-p1-g456-fill.js"), p1, "utf8");

  console.log(JSON.stringify({ volFixed, phbFixed, trueFalseIds: Object.keys(TRUE_FALSE_TO_MCQ).length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
