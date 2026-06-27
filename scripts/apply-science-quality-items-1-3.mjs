#!/usr/bin/env node
/**
 * Science quality items 1–3 (thin buckets via grade extension, length-bias hand fixes).
 * Does NOT invent new question stems — reuses existing rows with grade[] expansion.
 */
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

import { SCIENCE_GRADE_ORDER } from "../data/science-curriculum.js";
import { buildQuestionFingerprint } from "../utils/question-quality.js";

const THIN = [
  ["g1", "materials", "medium", 5],
  ["g1", "materials", "hard", 5],
  ["g1", "earth_space", "medium", 5],
  ["g1", "earth_space", "hard", 5],
  ["g1", "environment", "medium", 5],
  ["g1", "environment", "hard", 5],
  ["g2", "materials", "medium", 6],
  ["g2", "materials", "hard", 5],
  ["g2", "earth_space", "medium", 5],
  ["g2", "earth_space", "hard", 5],
  ["g2", "environment", "medium", 5],
  ["g2", "environment", "hard", 5],
  ["g3", "materials", "easy", 6],
  ["g3", "materials", "hard", 6],
  ["g3", "earth_space", "easy", 6],
  ["g3", "earth_space", "hard", 6],
  ["g3", "environment", "easy", 6],
  ["g3", "environment", "hard", 6],
  ["g4", "materials", "easy", 6],
  ["g4", "materials", "hard", 5],
  ["g4", "earth_space", "easy", 6],
  ["g4", "environment", "easy", 6],
  ["g5", "materials", "easy", 5],
  ["g5", "materials", "medium", 5],
  ["g5", "materials", "hard", 7],
  ["g5", "earth_space", "easy", 5],
  ["g5", "environment", "easy", 5],
  ["g6", "materials", "easy", 5],
  ["g6", "materials", "medium", 5],
  ["g6", "earth_space", "easy", 5],
  ["g6", "environment", "easy", 6],
];

const GRADE_IDX = Object.fromEntries(SCIENCE_GRADE_ORDER.map((g, i) => [g, i]));
const ADV = /מולקול|פוטוסינתז|DNA|אקולוג|מטבול|מערכת\s+עצבים|חומצ|מעגל חשמלי/i;

/** Hand-tuned option fixes: shorten correct or balance distractors (no template padding). */
const LENGTH_BIAS_FIXES = {
  body_4: {
    options: [
      "השרירים מושכים עצמות וכך נוצרת תנועה",
      "רק העצמות זזות בלי השרירים",
      "הגוף זז בלי קשר לשרירים ולשלד",
      "התנועה נוצרת רק מהנשימה",
    ],
    correctIndex: 0,
  },
  body_6: {
    options: [
      "לתאם ולהעביר מידע בין חלקי הגוף",
      "רק לאגור אנרגיה בלי קשר למידע",
      "להפריד בין מערכות הגוף בלבד",
      "לשמור על חום הגוף בלבד",
    ],
    correctIndex: 0,
  },
  animals_2: {
    options: [
      "סנפירים וגוף בצורת טורפדו",
      "רגליים ארוכות וזנב שטוח",
      "כנפיים רחבות ומקור דק",
      "קשקשים וגוף ארוך ודק",
    ],
    correctIndex: 0,
  },
  animals_5: {
    options: [
      "שינויי התנהגות שעוזרים לשרוד, כמו נדידה",
      "רק שינוי צבע בלי קשר לשרוד",
      "התנהגות קבועה בכל עונות השנה",
      "התנהגות אקראית בלי קשר לסביבה",
    ],
    correctIndex: 0,
  },
  materials_3: {
    options: [
      "פלסטיק נוצר בתעשייה ולא נמצא בטבע",
      "פלסטיק נמצא בטבע כמו אבן",
      "פלסטיק הוא סוג של עץ",
      "פלסטיק נוצר רק מחול",
    ],
    correctIndex: 0,
  },
  earth_3: {
    options: [
      "הירח מחזיר אור שמש — הוא לא מאיר מעצמו",
      "הירח הוא כוכב שמאיר כמו השמש",
      "הירח יוצר אור משלו בלילה",
      "הירח לא קשור לאור השמש",
    ],
    correctIndex: 0,
  },
  earth_8: {
    options: [
      "השמש מאירה תמיד — ביום רואים אותה כשאין עננים",
      "השמש מאירה רק בלילה",
      "השמש נדלקת ונכבית כל יום",
      "השמש לא קשורה ליום וללילה",
    ],
    correctIndex: 0,
  },
  env_7: {
    options: [
      "בפח אשפה או במיכל מיחזור מתאים",
      "לזרוק לכל מקום בחוץ",
      "להטמין בכל מקום באדמה",
      "לשים רק במים",
    ],
    correctIndex: 0,
  },
  animals_gapfix_hard_g12: {
    options: [
      "דולפין נושם אוויר; דג נושם במים בזימים",
      "גם דולפין וגם דג נושמים רק בזימים",
      "שניהם נושמים רק אוויר מחוץ למים",
      "אין הבדל בין דולפין לדג בנשימה",
    ],
    correctIndex: 0,
  },
  animals_gapfix_easy_g456: {
    options: [
      "בעלי חיים צריכים מזון, מים ומקום מתאים",
      "בעלי חיים צריכים רק מזון",
      "בעלי חיים לא צריכים מים",
      "בעלי חיים חיים בלי תנאים מיוחדים",
    ],
    correctIndex: 0,
  },
};

function levelAllowed(q, l) {
  const o = { easy: 1, medium: 2, hard: 3 };
  return o[l] >= (o[q.minLevel] || 1) && o[l] <= (o[q.maxLevel] || 3);
}

function okForGrade(q, g) {
  const stem = String(q.stem || "");
  if ((g === "g1" || g === "g2") && ADV.test(stem)) return false;
  if ((g === "g1" || g === "g2") && stem.length > 100) return false;
  const cog = String(q.params?.cognitiveLevel || "").toLowerCase();
  if ((g === "g1" || g === "g2") && ["analysis", "evaluation", "synthesis"].includes(cog))
    return false;
  return true;
}

function buildExtensionPlan(questions) {
  const extensions = new Map();
  const rows = [];

  for (const [g, t, l, before] of THIN) {
    const need = 8 - before;
    const gi = GRADE_IDX[g];
    const neighbors = SCIENCE_GRADE_ORDER.filter((gg, i) => Math.abs(i - gi) === 1);
    const existingFps = new Set(
      questions
        .filter((q) => q.topic === t && q.grades.includes(g) && levelAllowed(q, l))
        .map((q) => buildQuestionFingerprint(q, { subject: "science", topic: t }))
    );
    const picks = [];
    for (const ng of neighbors) {
      for (const q of questions) {
        if (q.topic !== t || q.grades.includes(g) || !q.grades.includes(ng) || !levelAllowed(q, l))
          continue;
        if (!okForGrade(q, g)) continue;
        const fp = buildQuestionFingerprint(q, { subject: "science", topic: t });
        if (existingFps.has(fp) || picks.some((p) => p.fp === fp)) continue;
        picks.push({ id: q.id, fp, from: ng });
        if (picks.length >= need) break;
      }
      if (picks.length >= need) break;
    }
    for (const p of picks) {
      if (!extensions.has(p.id)) extensions.set(p.id, new Set());
      extensions.get(p.id).add(g);
    }
    rows.push({
      grade: g,
      topic: t,
      level: l,
      before,
      after: before + picks.length,
      added: picks.length,
      note: picks.length < need ? "לא נמצא מילוי איכותי בטוח" : "",
    });
  }
  return { extensions, rows };
}

function patchGradesInText(text, id, gradesToAdd) {
  const idRe = new RegExp(`"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  const m = idRe.exec(text);
  if (!m) return { text, changed: false };
  const start = m.index;
  const gradesRe = /"grades"\s*:\s*\[([^\]]*)\]/;
  const slice = text.slice(start, start + 2500);
  const gm = gradesRe.exec(slice);
  if (!gm) return { text, changed: false };
  const absStart = start + gm.index;
  const absEnd = start + gm.index + gm[0].length;
  const inner = gm[1];
  const existing = [...inner.matchAll(/"(g[1-6])"/g)].map((x) => x[1]);
  const merged = [...new Set([...existing, ...gradesToAdd])].sort(
    (a, b) => GRADE_IDX[a] - GRADE_IDX[b]
  );
  if (merged.length === existing.length) return { text, changed: false };
  const newGrades = `"grades": [\n      ${merged.map((g) => `"${g}"`).join(",\n      ")}\n    ]`;
  return {
    text: text.slice(0, absStart) + newGrades + text.slice(absEnd),
    changed: true,
  };
}

function patchOptionsInText(text, id, fix) {
  const idRe = new RegExp(`"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  const m = idRe.exec(text);
  if (!m) return { text, changed: false };
  const start = m.index;
  const block = text.slice(start, start + 4000);
  const optsRe = /"options"\s*:\s*\[([\s\S]*?)\n    \]/;
  const om = optsRe.exec(block);
  if (!om) return { text, changed: false };
  const optsJson = fix.options.map((o) => `      ${JSON.stringify(o)}`).join(",\n");
  const newOpts = `"options": [\n${optsJson}\n    ]`;
  const absStart = start + om.index;
  const absEnd = start + om.index + om[0].length;
  let out = text.slice(0, absStart) + newOpts + text.slice(absEnd);
  const ciRe = new RegExp(
    `"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]{0,800}?"correctIndex"\\s*:\\s*\\d+`
  );
  out = out.replace(ciRe, (full) =>
    full.replace(/"correctIndex"\s*:\s*\d+/, `"correctIndex": ${fix.correctIndex}`)
  );
  return { text: out, changed: true };
}

async function loadRawQuestions() {
  const { SCIENCE_QUESTIONS_RAW } = await import(
    join(ROOT, "data", "science-questions.js").replace(/\\/g, "/") + "?t=" + Date.now()
  ).catch(() => ({ SCIENCE_QUESTIONS_RAW: null }));
  if (SCIENCE_QUESTIONS_RAW) return SCIENCE_QUESTIONS_RAW;
  const { SCIENCE_QUESTIONS } = await import("../data/science-questions.js");
  return SCIENCE_QUESTIONS;
}

async function main() {
  const { SCIENCE_QUESTIONS } = await import("../data/science-questions.js");
  const { extensions, rows } = buildExtensionPlan(SCIENCE_QUESTIONS);

  const files = readdirSync(join(ROOT, "data"))
    .filter((f) => f.startsWith("science-questions") && f.endsWith(".js"))
    .map((f) => join(ROOT, "data", f));
  let gradePatches = 0;
  let optionPatches = 0;
  const touchedFiles = new Set();

  for (const file of files) {
    let text = await readFile(file, "utf8");
    let fileChanged = false;

    for (const [id, gradesSet] of extensions) {
      const r = patchGradesInText(text, id, [...gradesSet]);
      if (r.changed) {
        text = r.text;
        fileChanged = true;
        gradePatches += 1;
      }
    }

    for (const [id, fix] of Object.entries(LENGTH_BIAS_FIXES)) {
      const r = patchOptionsInText(text, id, fix);
      if (r.changed) {
        text = r.text;
        fileChanged = true;
        optionPatches += 1;
      }
    }

    if (fileChanged) {
      await writeFile(file, text, "utf8");
      touchedFiles.add(file.replace(/\\/g, "/").replace(ROOT.replace(/\\/g, "/") + "/", ""));
    }
  }

  console.log(
    JSON.stringify(
      {
        gradeExtensionRows: rows,
        uniqueGradeExtensions: extensions.size,
        gradePatches,
        optionPatches,
        lengthBiasFixIds: Object.keys(LENGTH_BIAS_FIXES),
        touchedFiles: [...touchedFiles],
        stillThin: rows.filter((r) => r.after < 8),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
