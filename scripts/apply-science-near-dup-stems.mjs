#!/usr/bin/env node
/**
 * Rewrite near-duplicate science stems (keep canonical id per group, vary others).
 */
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");

/** @type {Record<string, string>} id -> new stem */
const STEM_REWRITES = {
  sci_p0_g1_animals_medium_06: "איזו חיה מיניקה את הצאצאים שלה?",
  sci_p0_g3_animals_easy_03: "איזה בעל חיים חי במים ונושם בזימים?",
  "plants_15__v2": "מה צמח צריך כדי לגדול ולהתפתח?",
  sci_p0_g3_body_hard_02: "מה התפקיד העיקרי של הכליות בגוף?",
  sci_g3_body_028: "לאיזה תפקיד משמשות הכליות במערכת הגוף?",
  sci_p0_g1_animals_medium_02: "איזה בעל חיים חי במים ויש לו סנפירים לשחייה?",
  sci_p0_g1_plants_medium_01: "מה צמחים צריכים כדי לגדול בבריאות?",
  sci_p0_g3_body_hard_05: "מה תפקיד מערכת העצבים בגוף האדם?",
  sci_p0_g2_plants_medium_02: "מה התפקיד של הגבעול בצמח?",
  sci_p0_g2_animals_medium_03: "מה שלבי מחזור החיים של פרפר?",
  sci_p0_g2_experiments_easy_03: "למה חשוב לרשום תוצאות בטבלה בניסוי?",
  sci_p0_g1_body_medium_08: "מדוע חשוב לשתות מים לאורך היום?",
  sci_g3_body_011: "למה הגוף זקוק לשתיית מים במהלך היום?",
  sci_p0_g2_animals_medium_01: "מה מאפיין דג לעומת בעלי חיים אחרים?",
  sci_p0_g3_animals_easy_02: "מה פרה אוכלת בדרך כלל?",
  p4b1_g4_materials_004: "מה ההבדל בין חומר מוליך לחומר מבודד בחשמל?",
  p4b1_g4_materials_005: "מה דוגמה לשינוי פיזיקלי במים?",
  p4b1_g4_materials_006: "איזה תיאור מתאים למצבי צבירה של חומר?",
  sci_p0_g3_experiments_hard_06: "מה תפקיד קבוצת הביקורת בניסוי?",
  sci_p0_g2_experiments_medium_02: "למה חוזרים על מדידה בניסוי מדעי?",
  sci_p0_g3_experiments_hard_05: "מהי מסקנה המבוססת על נתונים?",
  sci_phb_g6_materials_med_01: "מה דוגמה לשינוי פיזיקלי שקורה במים?",
  sci_p0_g1_body_hard_09: "מה תפקיד השרירים בזרוע?",
  sci_p0_g2_body_hard_06: "איך השרירים בזרוע עוזרים לתנועה?",
  sci_p0_g2_body_medium_02: "מדוע חשוב לאכול ירקות ופירות?",
  sci_g3_body_046: "למה תזונה עם ירקות ופירות חשובה לגוף?",
  sci_p0_g2_body_hard_03: "מה תפקיד הדם במערכת הגוף?",
  sci_g3_body_015: "מה התפקיד של הדם בגוף האדם?",
  sci_p0_g2_experiments_medium_03: "מה תפקיד השערה בניסוי מדעי?",
  sci_p0_g3_experiments_easy_05: "מה תפקידה של השערה בתחילת ניסוי?",
  sci_phb_g4_earth_space_eas_01: "מה גורם לסירוגין של יום ולילה על כדור הארץ?",
  sci_closure_g4mat_031: "מה דוגמה לשינוי פיזיקלי שמתרחש במים?",
  sci_vol_g3_experiments_hard_02: "מה תפקידה של קבוצת ביקורת בניסוי מדעי?",
  p4b1_g4_body_005: "מדוע חשוב לשתות מים במהלך היום?",
  body_18: "מה התפקיד של הכליות בגוף האדם?",
};

const FILES = readdirSync(DATA_DIR).filter(
  (f) => f.startsWith("science-questions") && f.endsWith(".js") && f !== "science-questions.js"
);

async function patchFile(relPath) {
  const path = join(DATA_DIR, relPath);
  let text = await readFile(path, "utf8");
  let changed = 0;
  for (const [id, stem] of Object.entries(STEM_REWRITES)) {
    const re = new RegExp(
      `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"stem": )"[^"]*"`,
      "m"
    );
    if (re.test(text)) {
      text = text.replace(re, `$1${JSON.stringify(stem)}`);
      changed++;
    }
  }
  if (changed > 0) await writeFile(path, text, "utf8");
  return changed;
}

async function patchMain() {
  const path = join(DATA_DIR, "science-questions.js");
  let text = await readFile(path, "utf8");
  let changed = 0;
  for (const [id, stem] of Object.entries(STEM_REWRITES)) {
    const re = new RegExp(
      `("id": "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?"stem": )"[^"]*"`,
      "m"
    );
    if (re.test(text)) {
      text = text.replace(re, `$1${JSON.stringify(stem)}`);
      changed++;
    }
  }
  if (changed > 0) await writeFile(path, text, "utf8");
  return changed;
}

let total = 0;
for (const f of FILES) total += await patchFile(f);
total += await patchMain();
console.log(JSON.stringify({ stemRewritesApplied: total, ids: Object.keys(STEM_REWRITES).length }, null, 2));
