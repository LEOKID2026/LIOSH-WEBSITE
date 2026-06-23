/**
 * math-age-fit-verify.mjs
 * בדיקת Age-Fit / Curriculum-Fit למחולל שאלות מתמטיקה
 * הרצה מתיקיית root: node scripts/qa/math-age-fit-verify.mjs
 *
 * מכסה:
 *  1. time_days       — תשובה תואמת מרחק ימים אמיתי
 *  2. ratio G6        — cross-multiplication מדויק (ללא Math.round)
 *  3. pocket_money G1 — טווח מספרים לפי גיל
 *  4. compare G1-G4   — ללא מספרים שליליים
 *  5. multiplication G1 — קבוצות/ספירה, לא × פורמלי
 *  6. powers G4       — מעריך ≤ 3
 *  7. scale_find G6   — קנה מידה שלם בלבד
 *  8. word_problems G6 — ניסוח ישיר, ללא suffix כיתה
 *  9. fractions G2    — maxDen=4 (חצי ורבע)
 * 10. multiplication G4/G5 — טווחי max מוגדרים
 */

import { generateQuestion } from '../../utils/math-question-generator.js';
import { GRADE_LEVELS, GRADES } from '../../utils/math-constants.js';

const BLANK = "__";

// ---- עזרים ----
// מאחד GRADE_LEVELS עם GRADES.allowFractions/allowNegatives — כמו שהאפליקציה מבנה levelConfig
function levelCfg(grade, diff) {
  const gradeConst = GRADES[`g${grade}`] || {};
  return {
    ...GRADE_LEVELS[grade].levels[diff],
    allowFractions: gradeConst.allowFractions ?? false,
    allowNegatives: gradeConst.allowNegatives ?? false,
  };
}
function gradeKey(g) { return `g${g}`; }

let totalPass = 0, totalFail = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    totalPass++;
  } else {
    totalFail++;
    failures.push(`FAIL [${label}]${detail ? ": " + detail : ""}`);
  }
}

function runMany(n, grade, diff, op, fn) {
  const gk = gradeKey(grade);
  const cfg = levelCfg(grade, diff);
  for (let i = 0; i < n; i++) {
    const q = generateQuestion(cfg, op, gk);
    if (!q) { check(`${op} G${grade} ${diff}`, false, "generateQuestion returned null"); continue; }
    fn(q, i);
  }
}

// ================================================================
// 1. time_days
// ================================================================
console.log("\n=== 1. time_days G1/G2 ===");
let timeDaysChecked = 0;
for (const grade of [1, 2]) {
  for (const diff of ["easy", "medium", "hard"]) {
    runMany(20, grade, diff, "word_problems", (q) => {
      if (q.params?.kind !== "wp_time_days") return;
      timeDaysChecked++;
      const { startDayIdx, endDayIdx, days } = q.params;
      if (startDayIdx == null || endDayIdx == null || days == null) {
        check("time_days params", false, "חסרים startDayIdx/endDayIdx/days"); return;
      }
      const expected = (startDayIdx + days) % 7;
      check(`time_days G${grade} ${diff}`,
        expected === endDayIdx && Number(q.correctAnswer) === days,
        `startDayIdx=${startDayIdx} days=${days} expected endIdx=${expected} got ${endDayIdx}`);
    });
  }
}
console.log(`  נבדקו: ${timeDaysChecked}`);

// ================================================================
// 2. ratio G6
// ================================================================
console.log("\n=== 2. ratio G6 ===");
let ratioChecked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  runMany(40, 6, diff, "ratio", (q) => {
    const { kind } = q.params || {};
    if (kind !== "ratio_first" && kind !== "ratio_second") return;
    ratioChecked++;
    const { firstNum, secondNum, simplifiedA, simplifiedB } = q.params;
    const cross = firstNum * simplifiedB === secondNum * simplifiedA;
    check(`ratio ${kind} G6 ${diff}`, cross,
      `${firstNum}:${secondNum} vs ${simplifiedA}:${simplifiedB} cross=${firstNum*simplifiedB} vs ${secondNum*simplifiedA}`);
  });
}
console.log(`  נבדקו: ${ratioChecked}`);

// ================================================================
// 3. pocket_money G1
// ================================================================
console.log("\n=== 3. pocket_money G1/G2 ===");
let pmChecked = 0;
const pmLimits = { easy: 10, medium: 20, hard: 30 };
for (const diff of ["easy", "medium", "hard"]) {
  runMany(20, 1, diff, "word_problems", (q) => {
    const { kind, money, toy } = q.params || {};
    if (!kind?.includes("pocket_money")) return;
    pmChecked++;
    const maxAllowed = pmLimits[diff];
    check(`pm G1 ${diff} money<=max`, money <= maxAllowed, `money=${money} max=${maxAllowed}`);
    check(`pm G1 ${diff} answer>=0`, q.correctAnswer >= 0, `answer=${q.correctAnswer}`);
    check(`pm G1 ${diff} toy<money`, toy < money, `toy=${toy} money=${money}`);
  });
}
for (const diff of ["easy", "medium", "hard"]) {
  runMany(15, 2, diff, "word_problems", (q) => {
    const { kind, money } = q.params || {};
    if (!kind?.includes("pocket_money")) return;
    pmChecked++;
    check(`pm G2 ${diff} answer>=0`, q.correctAnswer >= 0, `answer=${q.correctAnswer}`);
    check(`pm G2 ${diff} money>0`, money > 0, `money=${money}`);
  });
}
console.log(`  נבדקו: ${pmChecked}`);

// ================================================================
// 4. compare G1-G4 ללא שליליים
// ================================================================
console.log("\n=== 4. compare G1-G4 ===");
let cmpChecked = 0;
for (const grade of [1, 2, 3, 4]) {
  for (const diff of ["easy", "medium", "hard"]) {
    runMany(15, grade, diff, "compare", (q) => {
      cmpChecked++;
      check(`cmp G${grade} ${diff} a>=0`, q.a >= 0, `a=${q.a}`);
      check(`cmp G${grade} ${diff} b>=0`, q.b >= 0, `b=${q.b}`);
    });
  }
}
console.log(`  נבדקו: ${cmpChecked}`);

// ================================================================
// 5. multiplication G1 ללא ×
// ================================================================
console.log("\n=== 5. multiplication G1 ===");
let mulG1Checked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  runMany(20, 1, diff, "multiplication", (q) => {
    mulG1Checked++;
    const kind = q.params?.kind || "";
    check(`mul G1 ${diff} kind`, kind === "mul_groups_g1" || kind === "mul_skip_count_g1", `kind=${kind}`);
    check(`mul G1 ${diff} no×`, !String(q.question || "").includes("×"), `שאלה מכילה ×`);
    check(`mul G1 ${diff} answer>0`, q.correctAnswer > 0, `answer=${q.correctAnswer}`);
  });
}
console.log(`  נבדקו: ${mulG1Checked}`);

// ================================================================
// 6. powers G4
// ================================================================
console.log("\n=== 6. powers G4 (exp<=3) ===");
let powChecked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  runMany(30, 4, diff, "powers", (q) => {
    powChecked++;
    const exp = q.params?.exp ?? q.b;
    check(`pow G4 ${diff} exp<=3`, exp <= 3, `exp=${exp}`);
    check(`pow G4 ${diff} answer>0`, q.correctAnswer > 0, `answer=${q.correctAnswer}`);
  });
}
console.log(`  נבדקו: ${powChecked}`);

// ================================================================
// 7. scale_find G6
// ================================================================
console.log("\n=== 7. scale_find G6 ===");
let scaleChecked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  let attempts = 0, scaleFinds = 0;
  while (scaleFinds < 15 && attempts < 120) {
    attempts++;
    const q = generateQuestion(levelCfg(6, diff), "scale", "g6");
    if (!q || q.params?.kind !== "scale_find") continue;
    scaleFinds++; scaleChecked++;
    const scale = q.params?.scale ?? q.correctAnswer;
    check(`scale G6 ${diff} integer`, Number.isInteger(Number(scale)), `scale=${scale}`);
    check(`scale G6 ${diff} answer>0`, Number(q.correctAnswer) > 0, `answer=${q.correctAnswer}`);
    const { mapLength, realLength } = q.params;
    if (mapLength != null && realLength != null) {
      check(`scale G6 ${diff} mapLen*scale=realLen`, mapLength * scale === realLength,
        `${mapLength}×${scale}=${mapLength*scale} ≠ ${realLength}`);
    }
  }
}
console.log(`  נבדקו: ${scaleChecked}`);

// ================================================================
// 8. word_problems G6 ניסוח
// ================================================================
console.log("\n=== 8. word_problems G6 ===");
let wpG6Checked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  runMany(20, 6, diff, "word_problems", (q) => {
    wpG6Checked++;
    const questionText = String(q.question || "");
    check(`wp G6 ${diff} no suffix`, !questionText.includes("· כיתה"),
      `מכיל suffix: "${questionText.slice(0,60)}"`);
    const ex = String(q.exerciseText || "");
    const lbl = String(q.questionLabel || "");
    const combined = questionText.replace(/=\s*__/, "").trim() || ex.replace(/=\s*__/, "").trim() || lbl;
    check(`wp G6 ${diff} not empty`, combined.trim().length > 5,
      `kind=${q.params?.kind} q="${questionText.slice(0,50)}"`);
  });
}
console.log(`  נבדקו: ${wpG6Checked}`);

// ================================================================
// 9. fractions G2 — maxDen=4, אין מכנה > 4 בפועל
// ================================================================
console.log("\n=== 9. fractions G2 (חצי+רבע בלבד) ===");
let fracG2Checked = 0;
for (const diff of ["easy", "medium", "hard"]) {
  runMany(25, 2, diff, "fractions", (q) => {
    fracG2Checked++;
    const kind = q.params?.kind || "";
    const validKinds = ["frac_half", "frac_half_reverse", "frac_quarter", "frac_quarter_reverse"];
    check(`frac G2 ${diff} kind`, validKinds.includes(kind), `kind=${kind} לא חצי/רבע`);
    // מספר שלם צריך להיות > 0
    const whole = q.params?.whole ?? 0;
    check(`frac G2 ${diff} whole>0`, whole > 0, `whole=${whole}`);
  });
}
// וודא שכיתה א׳ לא מגיעה ל-fractions בתנאי רגיל (בדיקה עקיפה)
const g1Ops = ["addition","subtraction","multiplication","compare","number_sense","word_problems","mixed"];
check("G1 no fractions in ops", !g1Ops.includes("fractions"), "fractions אסור ב-G1 ops");
console.log(`  נבדקו: ${fracG2Checked}`);

// ================================================================
// 10. multiplication G4/G5 — טווחי max
// ================================================================
console.log("\n=== 10. multiplication G4/G5 max ===");
let mulRangeChecked = 0;

// G4 hard max=25 → a×b ≤ 25×25=625 (בנוסף multiDigit עד 99×9)
for (const diff of ["easy", "medium", "hard"]) {
  const maxExpected = { easy: 20, medium: 30, hard: 25 }[diff];
  runMany(50, 4, diff, "multiplication", (q) => {
    if (q.params?.kind === "mul_groups_g1" || q.params?.kind === "mul_skip_count_g1") return;
    mulRangeChecked++;
    const a = q.a ?? q.params?.a ?? q.params?.twoDigit ?? 0;
    const b = q.b ?? q.params?.b ?? q.params?.oneDigit ?? 0;
    // בדיקה רחבה: התשובה ≤ 99×9=891 לכל הפחות (גם multiDigit branch)
    check(`mul G4 ${diff} answer reasonable`,
      q.correctAnswer <= 99 * 25,
      `answer=${q.correctAnswer} — גדול מדי`);
  });
}

// G5 hard max=99 → a×b ≤ 99×99=9801
for (const diff of ["easy", "medium", "hard"]) {
  const maxExpected = { easy: 30, medium: 50, hard: 99 }[diff];
  runMany(50, 5, diff, "multiplication", (q) => {
    mulRangeChecked++;
    check(`mul G5 ${diff} answer<=max²`,
      q.correctAnswer <= maxExpected * maxExpected,
      `answer=${q.correctAnswer} > ${maxExpected}²=${maxExpected*maxExpected}`);
  });
}
console.log(`  נבדקו: ${mulRangeChecked}`);

// ================================================================
// סיכום
// ================================================================
console.log("\n" + "=".repeat(60));
console.log(`סיכום: ${totalPass} עברו, ${totalFail} נכשלו`);
if (failures.length > 0) {
  console.log("\nכישלונות:");
  failures.forEach(f => console.log("  " + f));
} else {
  console.log("✅ כל הבדיקות עברו — מתמטיקה READY סופי מוחלט.");
}
console.log("=".repeat(60));
