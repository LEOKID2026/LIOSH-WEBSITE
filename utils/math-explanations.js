import { BLANK } from './math-constants.js';
import { convertMissingNumberEquation, buildVerticalOperation } from './math-animations.js';
import {
  buildComparisonSignWrongAnswerLine,
  getCanonicalComparisonSign,
  isComparisonSignToken,
  shouldUseComparisonSignErrorExplanation,
} from './comparison-sign-mcq.js';
import { mix, M, pureMathLtrDisplay } from '../lib/learning-book/learning-math-line-build.js';
import React from 'react';
import { buildComparisonConclusionRuns } from '../lib/learning-book/learning-math-line-templates.js';
import { learningStepDiv as toSpan } from './learning-math-line-render.js';

export function getHint(question, operation, gradeKey) {
  if (!question || !question.params) return "";
  const M = (expr) => `\u2066${expr}\u2069`;

  const p = question.params;

  switch (operation) {
    case "addition":
      if (p.kind === "add_three") {
        return `חבר שני מספרים ואז הוסף את השלישי: ${M("(a + b) + c")}.`;
      }
      if (p.kind === "add_complement10" || p.kind === "add_complement_round10") {
        return "חפש כמה חסר כדי להגיע לעשר/מספר עגול – לא צריך לחשב את כל החיבור הארוך.";
      }
      if (p.kind === "add_missing_first" || p.kind === "add_missing_second") {
        return `אם יש לך __ + b = c, אז המספר החסר הוא ${M("c - b")}. אם יש לך a + __ = c, אז המספר החסר הוא ${M("c - a")}.`;
      }
      return "השתמש בשיטת \"עמודות\" או בקפיצות על ציר המספרים: חיבור = הוספה.";
    case "subtraction":
      if (p.kind === "sub_missing_first" || p.kind === "sub_missing_second") {
        return `אם יש לך __ - b = c, אז המספר החסר הוא ${M("c + b")}. אם יש לך a - __ = c, אז המספר החסר הוא ${M("a - c")}.`;
      }
      return "בדוק מי המספר הגדול יותר. חיסור = כמה חסר מהקטן לגדול או כמה מורידים מהגדול.";
    case "multiplication":
      return `מחשבים כפל כמו חיבור חוזר: ${M("a × b")} זה כמו לחבר את ${M("a")} לעצמו ${M("b")} פעמים.`;
    case "division":
      return "חילוק = כמה פעמים המספר הקטן נכנס בגדול, או כמה יש בכל קבוצה כשמחלקים שווה בשווה.";
    case "fractions":
      if (p.kind === "frac_same_den") {
        return "כשיש אותו מכנה – המכנה נשאר אותו דבר, עובדים רק על המונים.";
      }
      return "כשיש מכנים שונים – מוצאים מכנה משותף, מעבירים את השברים ואז מחברים או מחסרים.";
    case "percentages":
      return `אחוזים הם חלק מ-${M("100")}. ${M("10%")} זה עשירית, ${M("25%")} זה רבע, ${M("50%")} זה חצי. נסה לתרגם לחלק פשוט.`;
    case "sequences":
      return "בדוק מה קורה בין כל שני מספרים סמוכים – מה מוסיפים או מחסרים בכל צעד.";
    case "decimals":
      return "יישר את הנקודות העשרוניות וחשב כאילו היו מספרים רגילים, ואז החזר את הנקודה למקום הנכון.";
    case "rounding":
      return `חפש את הספרה שמקיפים (עשרות/מאות) והסתכל על הספרה שאחריה: ${M("0–4")} עיגול למטה, ${M("5–9")} למעלה.`;
    case "equations":
      return "במשוואות עם מספר חסר משתמשים בפעולה ההפוכה: בחיבור נעזרים בחיסור, בכפל – בחילוק וכדומה.";
    case "compare":
      return "דמיין את המספרים על ציר מספרים: מי שמימין גדול יותר. במספרים עשרוניים משווים קודם את החלק השלם.";
    case "number_sense":
      if (p.kind?.startsWith("ns_place")) {
        return `פרק את המספר לעשרות/מאות/אחדות: למשל ${M("57")} זה ${M("5")} עשרות ו-${M("7")} אחדות.`;
      }
      if (p.kind === "ns_neighbors") {
        return `מספר אחד לפני – מורידים ${M("1")}. מספר אחד אחרי – מוסיפים ${M("1")}.`;
      }
      if (p.kind === "ns_complement10" || p.kind === "ns_complement100") {
        return "חפש כמה חסר כדי להשלים לעשר/מאה – זה ההפרש בין שני המספרים.";
      }
      if (p.kind === "ns_even_odd") {
        return `הסתכל על ספרת האחדות: ${M("0,2,4,6,8")} – זוגי. ${M("1,3,5,7,9")} – אי-זוגי.`;
      }
      return "נסה לחשוב על \"תחושת מספר\" – עשרות, אחדות, שכנים, זוגי/אי-זוגי.";
    case "factors_multiples":
      return "מחלק (גורם) מתחלק במספר בלי שארית. כפולה מתקבלת כשמכפילים את המספר במספר שלם.";
    case "word_problems":
      return "קרא לאט, סמן את המספרים ותרגם את הסיפור לתרגיל פשוט (חיבור, חיסור, כפל או חילוק).";
    case "ratio":
      return "מחפשים בכמה להכפיל את שני חלקי היחס כדי לקבל את המספרים בשאלה.";
    case "scale":
      return `קנה מידה 1:X אומר שכל ס"מ במפה = X ס"מ במציאות. כפל/חלק בהתאם.`;
    case "divisibility":
      return "נסה לחלק את המספר במחלק ולבדוק אם יוצא שלם (ללא שארית).";
    case "powers":
      return "חזקה = כפל חוזר של הבסיס בעצמו. לדוגמה: 3² = 3 × 3 = 9, 2³ = 2 × 2 × 2 = 8.";
    case "order_of_operations":
      return "זכור סדר פעולות: סוגריים קודם, כפל/חילוק לפני חיבור/חיסור.";
    case "estimation":
      return "עגל כל מספר לעשרות/מאות הקרובות, ואז חשב בקירוב.";
    case "zero_one_properties":
      return "מספר × 0 = 0. מספר × 1 = אותו מספר. מספר + 0 = אותו מספר.";
    case "division_with_remainder":
      return "חשב כמה פעמים המחלק נכנס - ומה נשאר. בדיקה: מחלק × מנה + שארית = מחולק.";
    default:
      return "נסה לפתור את השאלה לפי הנושא המתאים.";
  }
}

// פונקציה עזר: הסבר חיבור בעמודה עם העברה
export function getAdditionStepsColumn(a, b) {
  const sum = a + b;
  const aStr = String(a);
  const bStr = String(b);
  const resultStr = String(sum);
  const maxLen = Math.max(aStr.length, bStr.length, resultStr.length);
  const pad = (s) => s.toString().padStart(maxLen, " ");
  const line1 = pad(aStr);
  const line2 = "+" + pad(bStr).slice(1);  // לשים +
  const line3 = "-".repeat(maxLen);
  const digitsA = pad(aStr).split("").map((d) => (d === " " ? 0 : Number(d)));
  const digitsB = pad(bStr).split("").map((d) => (d === " " ? 0 : Number(d)));

  const ltr = M;

  // פונקציה שנותנת שם מקום (אחדות/עשרות/מאות...)
  const placeName = (idxFromRight) => {
    if (idxFromRight === 0) return "ספרת האחדות";
    if (idxFromRight === 1) return "ספרת העשרות";
    if (idxFromRight === 2) return "ספרת המאות";
    return `המקום ה-${idxFromRight + 1} מימין`;
  };

  let carry = 0;
  const steps = [];

  // שלב 1 – מציגים את החיבור בעמודה
  steps.push(
    React.createElement(
      "div",
      { key: "col", className: "font-mono text-lg text-center mb-2", dir: "ltr" },
      React.createElement("div", null, line1),
      React.createElement("div", null, line2),
      React.createElement("div", null, line3)
    )
  );

  // שלב 2 – מסבירים חיבור ספרות מימין לשמאל
  const len = digitsA.length;
  for (let i = len - 1; i >= 0; i--) {
    const idxFromRight = len - 1 - i;
    const da = digitsA[i];
    const db = digitsB[i];

    // אם שתי הספרות 0 וגם אין העברה – אין מה להסביר כאן
    if (da === 0 && db === 0 && carry === 0) continue;

    const raw = da + db + carry;
    const digit = raw % 10;
    const nextCarry = Math.floor(raw / 10);
    const place = placeName(idxFromRight);

    // הביטוי המתמטי כולו בתוך בלוק LTR אחד
    const parts = [da, "+", db];
    if (carry > 0) {
      parts.push("+", carry);
    }
    const expr = `${parts.join(" ")} = ${raw}`;

    const carryNote =
      nextCarry > 0
        ? ` ומעבירים ${nextCarry} לעמודה הבאה.`
        : `. אין העברה לעמודה הבאה.`;

    steps.push(
      toSpan(
        mix`ב${place}: ${M(expr)}. כותבים ${digit}${carryNote}`,
        `step-${i}`
      )
    );

    carry = nextCarry;
  }

  // שלב אחרון – מסכמים
  steps.push(
    toSpan(mix`בסוף מקבלים את המספר המלא: ${M(String(sum))}.`, "final")
  );

  return steps;
}

// הסבר מפורט צעד-אחר-צעד לפי סוג תרגיל וכיתה
export function getSolutionSteps(question, operation, gradeKey) {
  if (!question || !question.params) return [];
  const p = question.params;
  const ans = question.correctAnswer;
  const isStory = !!question.isStory;
  // Structured math embed (use inside mix`...` templates — not free strings).
  const ltr = M;

  // אם יש params.op, נשתמש בו; אחרת נשתמש ב-operation
  const op = p.op || operation;

  // אם זה חיבור רגיל עם שני מספרים - נשתמש בהסבר בעמודה
  if (op === "add" && typeof p.a === "number" && typeof p.b === "number" && p.kind === "add_two") {
    return getAdditionStepsColumn(p.a, p.b);
  }

  switch (operation) {
    case "addition": {
      if (p.kind === "add_three") {
        const s1 = p.a + p.b;
        return [
          toSpan(mix`1. נכתוב את התרגיל: ${M(`${p.a} + ${p.b} + ${p.c}`)}.`, "1"),
          toSpan(mix`2. נחבר את שני הראשונים: ${M(`${p.a} + ${p.b} = ${s1}`)}.`, "2"),
          toSpan(mix`3. נוסיף את האחרון: ${M(`${s1} + ${p.c} = ${ans}`)}.`, "3"),
          toSpan(mix`4. התשובה: ${ans}.`, "4"),
        ];
      }
      if (p.kind === "add_complement10" || p.kind === "add_complement_round10") {
      return [
          toSpan(
            mix`1. זה תרגיל השלמה: מחפשים כמה חסר כדי להגיע ל-${p.c ?? p.tens}.`,
            "1"
          ),
          toSpan(
            mix`2. נחשב: ${M(`${p.c ?? p.tens} - ${p.b ?? p.base} = ${ans}`)}.`,
            "2"
          ),
          toSpan(mix`3. נבדוק שחיבור התוצאה נותן את המספר העגול.`, "3"),
        ];
      }
      if (p.kind === "add_missing_first") {
        // __ + b = c
        return [
          toSpan(mix`1. נבין: מחפשים מספר שכשמוסיפים לו ${p.b}, מקבלים ${p.c}.`, "1"),
          toSpan(mix`2. נחשב: ${M(`${p.c} - ${p.b} = ${ans}`)}.`, "2"),
          toSpan(mix`3. נבדוק: ${M(`${ans} + ${p.b} = ${p.c}`)}? כן!`, "3"),
          toSpan(mix`4. התשובה: ${ans}.`, "4"),
        ];
      }
      if (p.kind === "add_missing_second") {
        // a + __ = c
        return [
          toSpan(mix`1. נבין: מחפשים מספר שכשמוסיפים ל-${p.a}, מקבלים ${p.c}.`, "1"),
          toSpan(mix`2. נחשב: ${M(`${p.c} - ${p.a} = ${ans}`)}.`, "2"),
          toSpan(mix`3. נבדוק: ${M(`${p.a} + ${ans} = ${p.c}`)}? כן!`, "3"),
          toSpan(mix`4. התשובה: ${ans}.`, "4"),
        ];
      }
      // אם זה חיבור רגיל עם שני מספרים - נשתמש בהסבר בעמודה
      if (typeof p.a === "number" && typeof p.b === "number") {
        return getAdditionStepsColumn(p.a, p.b);
      }
      const sum = p.a + p.b;
      return [
        toSpan(mix`1. נכתוב את התרגיל: ${M(`${p.a} + ${p.b}`)}.`, "1"),
        toSpan(mix`2. נחבר: ${M(`${p.a} + ${p.b} = ${sum}`)}.`, "2"),
        toSpan(mix`3. התוצאה: ${ans}.`, "3"),
      ];
    }

    case "subtraction":
      if (p.kind === "sub_missing_first") {
        // __ - b = c
        return [
          toSpan(mix`1. נבין: מחפשים מספר שכשמחסרים ממנו ${p.b}, מקבלים ${p.c}.`, "1"),
          toSpan(mix`2. נחשב: ${M(`${p.c} + ${p.b} = ${ans}`)}.`, "2"),
          toSpan(mix`3. נבדוק: ${M(`${ans} - ${p.b} = ${p.c}`)}? כן!`, "3"),
          toSpan(mix`4. התשובה: ${ans}.`, "4"),
        ];
      }
      if (p.kind === "sub_missing_second") {
        // a - __ = c
      return [
          toSpan(mix`1. נבין: מחפשים מספר שכשמחסרים אותו מ-${p.a}, מקבלים ${p.c}.`, "1"),
          toSpan(mix`2. נחשב: ${M(`${p.a} - ${p.c} = ${ans}`)}.`, "2"),
          toSpan(mix`3. נבדוק: ${M(`${p.a} - ${ans} = ${p.c}`)}? כן!`, "3"),
          toSpan(mix`4. התשובה: ${ans}.`, "4"),
        ];
      }
      return [
        toSpan(mix`1. נכתוב את התרגיל: ${M(`${p.a} - ${p.b}`)}.`, "1"),
        toSpan(mix`2. נבדוק מי המספר הגדול ומי הקטן (משפיע על הסימן).`, "2"),
        toSpan(mix`3. נחשב: ${M(`${p.a} - ${p.b} = ${ans}`)}.`, "3"),
        toSpan(mix`4. נעשה בדיקה מהירה: ${M(`${ans} + ${p.b} = ${p.a}`)}?`, "4"),
      ];

    case "multiplication":
      if (typeof p.a === "number" && typeof p.b === "number") {
        const A = p.a;
        const B = p.b;
        const aStr = String(A);
        const bStr = String(B);
        const isSmall = Math.abs(A) < 10 && Math.abs(B) < 10;
        if (isSmall) {
          return [
            toSpan(mix`1. זה כפל חד-ספרתי: ${M(`${A} × ${B}`)}.`, "1"),
            toSpan(mix`2. מחשבים: ${M(`${A} × ${B} = ${ans}`)}.`, "2"),
            toSpan(mix`3. התשובה: ${ans}.`, "3"),
          ];
        }
        return [
          toSpan(mix`1. בכפל ארוך כופלים את ${A} בכל ספרה של ${B} מימין לשמאל.`, "1"),
          toSpan(mix`2. כל שורה היא מכפלה חלקית (ולפעמים מוסיפים 0 בסוף בגלל עשרות/מאות).`, "2"),
          toSpan(mix`3. בסוף מחברים את כל המכפלות החלקיות.`, "3"),
          toSpan(mix`4. התוצאה הסופית: ${M(`${A} × ${B} = ${ans}`)}.`, "4"),
        ];
      }
      return [
        toSpan(mix`1. בכפל ארוך: כפל ספרה-ספרה + נשיאות, אחר כך חיבור מכפלות חלקיות.`, "1"),
        toSpan(mix`2. התשובה: ${ans}.`, "2"),
      ];

    case "division":
      return [
        toSpan(
          mix`1. נכתוב: ${M(`${p.dividend} ÷ ${p.divisor}`)} – כמה קבוצות של ${p.divisor} נכנסות בתוך ${p.dividend}?`,
          "1"
        ),
        toSpan(
          mix`2. נבדוק: ${M(`${p.divisor} × ${ans} = ${p.dividend}`)}. אם כן – זה המספר הנכון.`,
          "2"
        ),
        toSpan(mix`3. לכן התשובה: ${ans}.`, "3"),
      ];

    case "fractions":
      if (p.kind === "frac_same_den") {
        return [
          toSpan(
            mix`1. יש לנו אותו מכנה (${p.den}). במכנה לא נוגעים – עובדים רק על המונים.`,
            "1"
          ),
          toSpan(
            mix`2. ${p.op === "add" ? "מחברים" : "מחסרים"} את המונים: ${M(
              `${p.n1} ${p.op === "add" ? "+" : "-"} ${p.n2}`)}.`,
            "2"
          ),
          toSpan(mix`3. התוצאה במונה: ${ans.split("/")[0]}.`, "3"),
          toSpan(mix`4. המכנה נשאר ${p.den} – לכן התשובה: ${ans}.`, "4"),
        ];
      }

      if (p.kind === "frac_diff_den") {
      return [
          toSpan(
            mix`1. יש מכנים שונים (${p.den1} ו-${p.den2}). נמצא מכנה משותף – כאן ${p.commonDen}.`,
            "1"
          ),
          toSpan(mix`2. נעביר כל שבר למכנה המשותף.`, "2"),
          toSpan(mix`3. אחרי שהמכנים זהים – עובדים על המונים בלבד.`, "3"),
          toSpan(mix`4. כך נקבל את ${ans}.`, "4"),
        ];
      }

      return [
        toSpan(mix`1. מוצאים מכנה משותף.`, "1"),
        toSpan(mix`2. מעבירים את השברים למכנה הזה.`, "2"),
        toSpan(mix`3. מחברים או מחסרים את המונים.`, "3"),
        toSpan(mix`4. מצמצמים אם אפשר ומקבלים ${ans}.`, "4"),
      ];

    case "percentages":
      if (p.kind === "perc_discount") {
        return [
          toSpan(
            mix`1. מחשבים את גובה ההנחה: ${M(`${p.base} × ${p.p}/100 = ${p.discount}`)}.`,
            "1"
          ),
          toSpan(
            mix`2. מפחיתים מהמחיר: ${M(`${p.base} - ${p.discount} = ${ans}`)}.`,
            "2"
          ),
        ];
      }
      return [
        toSpan(
          mix`1. ${p.p}% מתוך ${p.base} זה ${p.base} כפול ${p.p}/100.`,
          "1"
        ),
        toSpan(
          mix`2. נחשב: ${M(`${p.base} × ${p.p}/100 = ${ans}`)}.`,
          "2"
        ),
      ];

    case "sequences":
      return [
        toSpan(
          mix`1. נסתכל על ההפרש בין שני מספרים סמוכים: למשל ${M(
            `${p.seq[1]} - ${p.seq[0]} = ${p.step}`)}.`,
          "1"
        ),
        toSpan(mix`2. זה הצעד הקבוע של הסדרה.`, "2"),
        toSpan(
          mix`3. נשתמש באותו צעד כדי להשלים את המקום הריק.`,
          "3"
        ),
      ];

    case "decimals":
      return [
        toSpan(mix`1. ניישר את הנקודות העשרוניות אחת מתחת לשנייה.`, "1"),
        toSpan(mix`2. נחשב כאילו זה מספרים שלמים.`, "2"),
        toSpan(
          "3. נחזיר את הנקודה למקום לפי מספר הספרות אחרי הנקודה.",
          "3"
        ),
      ];

    case "rounding":
      return [
        toSpan(
          mix`1. נזהה אם מעגלים לעשרות או למאות ומסתכלים על הספרה שאחרי.`,
          "1"
        ),
        toSpan(
          "2. אם הספרה שאחרי היא 0–4 – מעגלים למטה. אם 5–9 – למעלה.",
          "2"
        ),
        toSpan(mix`3. כך נקבל את ${ans}.`, "3"),
      ];

    case "equations": {
      if (p.kind === "eq_add") {
        return [
          toSpan(
            mix`1. זוכרים שבחיבור הפעולה ההפוכה היא חיסור.`,
            "1"
          ),
          toSpan(
            mix`2. במקום לנחש את המספר ב-${BLANK}, נחשב ${M(`${p.c} - ${p.a}`)} או ${M(`${p.c} - ${p.b}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. קבלת התוצאה: ${ans}.`,
            "3"
          ),
        ];
      }

      if (p.kind === "eq_sub") {
      return [
          toSpan(
            mix`1. בחיסור הפעולה ההפוכה היא חיבור.`,
            "1"
          ),
          toSpan(
            mix`2. אם יש ${M(`${p.a} - ${BLANK} = ${p.c}`)}, נחשב ${M(`${p.a} - ${p.c}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. התוצאה היא ${ans} – נבדוק: ${M(`${p.a} - ${ans} = ${p.c}`)}.`,
            "3"
          ),
        ];
      }

      if (p.kind === "eq_mul") {
      return [
          toSpan(
            mix`1. בכפל הפעולה ההפוכה היא חילוק.`,
            "1"
          ),
          toSpan(
            mix`2. נחשב ${M(`${p.c} ÷ ${p.a}`)} או ${M(`${p.c} ÷ ${p.b}`)} לפי המקום של ${BLANK}.`,
            "2"
          ),
          toSpan(
            mix`3. מקבלים ${ans} ובודקים: ${M(`${p.a} × ${ans} = ${p.c}`)} או ${M(`${ans} × ${p.b} = ${p.c}`)}.`,
            "3"
          ),
        ];
      }

      if (p.kind === "eq_div") {
        return [
          toSpan(
            mix`1. בחילוק הפעולה ההפוכה היא כפל.`,
            "1"
          ),
          toSpan(
            mix`2. אם ${M(`${BLANK} ÷ ${p.divisor} = ${p.quotient}`)}, נכפול ${M(`${p.quotient} × ${p.divisor}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. מקבלים ${ans} ובודקים חזרה בחילוק.`,
            "3"
          ),
        ];
      }

      return [];
    }

    case "compare": {
      const sign = getCanonicalComparisonSign(p.a, p.b);
      const steps = [
        toSpan(mix`1. נסתכל על שני המספרים: ${M(String(p.a))} ו-${M(String(p.b))}.`, "1"),
        toSpan(mix`2. נבדוק מי גדול יותר (או אם שווים).`, "2"),
      ];
      if (sign === ">") {
        steps.push(
          toSpan(
            { __learningRuns: buildComparisonConclusionRuns({ left: p.a, right: p.b, relation: "gt" }) },
            "3"
          )
        );
      } else if (sign === "<") {
        steps.push(
          toSpan(
            { __learningRuns: buildComparisonConclusionRuns({ left: p.a, right: p.b, relation: "lt" }) },
            "3"
          )
        );
      } else {
        steps.push(
          toSpan(mix`3. ${M(String(p.a))} = ${M(String(p.b))} - המספרים שווים.`, "3")
        );
      }
      return steps;
    }

    case "number_sense": {
      if (p.kind === "ns_place_tens_units" || p.kind === "ns_place_hundreds") {
        return [
          toSpan(
            mix`1. מפרקים את המספר לעשרות/מאות/אחדות.`,
            "1"
          ),
          toSpan(
            mix`2. לדוגמה ${M(String(p.n))} = ${p.hundreds ?? ""}${p.hundreds != null ? " מאות," : ""} ${p.tens ?? ""}${p.tens != null ? " עשרות," : ""} ${p.units ?? ""}${p.units != null ? " אחדות" : ""}.`,
            "2"
          ),
          toSpan(
            mix`3. בוחרים את הספרה לפי מה ששאלו.`,
            "3"
          ),
        ];
      }

      if (p.kind === "ns_neighbors") {
        return [
          toSpan(
            mix`1. מספר אחד אחרי – מוסיפים 1. מספר אחד לפני – מחסרים 1.`,
            "1"
          ),
          toSpan(
            mix`2. למשל אחרי ${p.n} מגיע ${p.n + 1}, ולפניו ${p.n - 1}.`,
            "2"
          ),
        ];
      }

      if (p.kind === "ns_complement10" || p.kind === "ns_complement100") {
        const target = p.c;
        return [
          toSpan(
            mix`1. מחפשים כמה חסר מ-${p.b} כדי להגיע ל-${target}.`,
            "1"
          ),
          toSpan(
            mix`2. נחשב: ${M(`${target} - ${p.b} = ${ans}`)}.`,
            "2"
          ),
        ];
      }

      if (p.kind === "ns_even_odd") {
        return [
          toSpan(
            mix`1. מסתכלים על ספרת האחדות של ${p.n}.`,
            "1"
          ),
          toSpan(
            mix`2. אם הספרה היא 0,2,4,6,8 – המספר זוגי. אם 1,3,5,7,9 – אי-זוגי.`,
            "2"
          ),
        ];
      }

      if (p.kind === "ns_counting_forward") {
        return [
          toSpan(mix`1. בספירה קדימה מוסיפים 1 למספר שמופיע.`, "1"),
          toSpan(mix`2. ${M(String(p.start))} ועוד 1 הוא ${M(String(ans))}.`, "2"),
          toSpan(mix`3. לכן המספר הבא הוא ${ans}.`, "3"),
        ];
      }

      if (p.kind === "ns_counting_backward") {
        return [
          toSpan(mix`1. בספירה אחורה מחסרים 1 מהמספר שמופיע.`, "1"),
          toSpan(mix`2. ${M(String(p.start))} פחות 1 הוא ${M(String(ans))}.`, "2"),
          toSpan(mix`3. לכן המספר הקודם הוא ${ans}.`, "3"),
        ];
      }

      if (p.kind === "ns_number_line") {
        return [
          toSpan(mix`1. על ישר המספרים המספרים עולים ב-1 בכל צעד.`, "1"),
          toSpan(mix`2. מסתכלים בין ${M(String(p.start))} ל-${M(String(p.end))} ומאתרים את המקום החסר.`, "2"),
          toSpan(mix`3. המספר החסר הוא ${ans}.`, "3"),
        ];
      }

      return [];
    }

    case "factors_multiples": {
      if (p.kind === "fm_factor") {
        return [
          toSpan(
            mix`1. נבדוק אילו מספרים מתחלקים ב-${p.n} בלי שארית.`,
            "1"
          ),
          toSpan(
            mix`2. נחלק את ${p.n} במספרים האפשריים עד שנמצא מי שמתחלק בדיוק.`,
            "2"
          ),
        ];
      }
      if (p.kind === "fm_multiple") {
        return [
          toSpan(
            mix`1. כפולות של ${p.base} מתקבלות כשמכפילים את המספר ב-1,2,3,...`,
            "1"
          ),
          toSpan(
            mix`2. נבדוק מי מהרשימה מתאים לצורה ${p.base} × מספר שלם.`,
            "2"
          ),
        ];
      }
      if (p.kind === "fm_gcd") {
        return [
          toSpan(
            mix`1. נפרק את ${p.a} ו-${p.b} לגורמים.`,
            "1"
          ),
          toSpan(
            mix`2. נמצא גורמים משותפים ונראה מי הגדול ביותר – כאן ${ans}.`,
            "2"
          ),
        ];
      }
      return [];
    }

    case "prime_composite": {
      const divisors = [];
      if (typeof p.num === "number") {
        for (let i = 1; i <= p.num; i += 1) {
          if (p.num % i === 0) divisors.push(i);
        }
      }
      if (p.subKind === "pc_factor_count") {
        return [
          toSpan(mix`1. מחלקים הם מספרים שמחלקים את ${M(String(p.num))} בלי שארית.`, "1"),
          toSpan(mix`2. סופרים את כל המחלקים, כולל 1 והמספר עצמו.`, "2"),
          toSpan(mix`3. מתקבלים ${ans} מחלקים.`, "3"),
        ];
      }
      if (p.subKind === "pc_smallest_prime") {
        return [
          toSpan(mix`1. מחפשים גורם ראשוני שמחלק את ${M(String(p.num))}.`, "1"),
          toSpan(mix`2. בודקים מהקטן לגדול: 2, 3, 5, 7 וכן הלאה.`, "2"),
          toSpan(mix`3. הגורם הראשוני הקטן ביותר הוא ${ans}.`, "3"),
        ];
      }
      if (p.subKind === "pc_divisor_pick") {
        return [
          toSpan(mix`1. בודקים אם ${M(String(p.divisorCandidate))} מחלק את ${M(String(p.num))} בלי שארית.`, "1"),
          toSpan(mix`2. אם אין שארית התשובה היא כן; אם יש שארית התשובה היא לא.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      const divisorsText = divisors.length ? `: ${divisors.join(", ")}` : "";
      return [
        toSpan(mix`1. מספר ראשוני מתחלק רק ב-1 ובעצמו.`, "1"),
        toSpan(mix`2. בודקים את המחלקים של ${M(String(p.num))}${divisorsText}.`, "2"),
        toSpan(mix`3. לכן המספר הוא ${ans}.`, "3"),
      ];
    }

    case "word_problems":
      if (p.kind === "wp_simple_add") {
        const sum = p.a + p.b;
        return [
          toSpan(mix`1. מזהים שהשאלה מבקשת כמה יש בסך הכל – פעולה של חיבור.`, "1"),
          toSpan(mix`2. כותבים תרגיל: ${M(`${p.a} + ${p.b}`)}.`, "2"),
          toSpan(mix`3. מחשבים: ${M(`${p.a} + ${p.b} = ${sum}`)}.`, "3"),
          toSpan(mix`4. התשובה: לליאו יש ${ans} כדורים.`, "4"),
        ];
      }

      if (p.kind === "wp_simple_sub") {
        return [
          toSpan(mix`1. מזהים שהשאלה מבקשת כמה נשאר – פעולה של חיסור.`, "1"),
          toSpan(mix`2. כותבים תרגיל: ${M(`${p.total} - ${p.give}`)}.`, "2"),
          toSpan(mix`3. מחשבים: ${M(`${p.total} - ${p.give} = ${ans}`)}.`, "3"),
          toSpan(mix`4. התשובה: נשארו לליאו ${ans} מדבקות.`, "4"),
        ];
      }

      if (p.kind === "wp_pocket_money") {
        return [
          toSpan(mix`1. מזהים שהשאלה מבקשת כמה כסף נשאר אחרי קנייה – פעולה של חיסור.`, "1"),
          toSpan(mix`2. כותבים תרגיל: ${M(`${p.money} - ${p.toy}`)}.`, "2"),
          toSpan(mix`3. מחשבים: ${M(`${p.money} - ${p.toy} = ${ans}`)}.`, "3"),
          toSpan(mix`4. התשובה: נשאר לליאו ${ans}₪.`, "4"),
        ];
      }

      if (p.kind === "wp_time_sum") {
        const sum = p.l1 + p.l2;
        return [
          toSpan(mix`1. מזהים שהשאלה מבקשת כמה זמן נמשך ביחד – פעולה של חיבור.`, "1"),
          toSpan(mix`2. כותבים תרגיל: ${M(`${p.l1} + ${p.l2}`)}.`, "2"),
          toSpan(mix`3. מחשבים: ${M(`${p.l1} + ${p.l2} = ${sum}`)}.`, "3"),
          toSpan(mix`4. התשובה: הצפייה נמשכה ${ans} דקות.`, "4"),
        ];
      }

      if (p.kind === "wp_average") {
        const sum = p.s1 + p.s2 + p.s3;
        return [
          toSpan(mix`1. ממוצע מחושב על ידי חיבור כל הציונים וחילוק במספר המבחנים.`, "1"),
          toSpan(mix`2. נחבר את הציונים: ${M(`${p.s1} + ${p.s2} + ${p.s3} = ${sum}`)}.`, "2"),
          toSpan(mix`3. נחלק ב-3: ${M(`${sum} ÷ 3 = ${ans}`)}.`, "3"),
          toSpan(mix`4. התשובה: הממוצע הוא ${ans}.`, "4"),
        ];
      }

      if (p.kind === "wp_groups") {
        const prod = p.per * p.groups;
        return [
          toSpan(
            mix`1. בכל קופסה יש ${p.per} עפרונות ויש ${p.groups} קופסאות – מדובר בחיבור חוזר.`,
            "1"
          ),
          toSpan(mix`2. נרשום תרגיל כפל: ${M(`${p.per} × ${p.groups}`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`${p.per} × ${p.groups} = ${prod}`)}.`, "3"),
          toSpan(mix`4. התשובה: ${ans} עפרונות.`, "4"),
        ];
      }

      if (p.kind === "wp_leftover") {
        return [
          toSpan(
            mix`1. יש ${p.total} תלמידים ומחלקים לקבוצות של ${p.groupSize}.`,
            "1"
          ),
          toSpan(
            mix`2. נחשב כמה קבוצות שלמות: ${M(`${p.total} ÷ ${p.groupSize} = ${p.groups}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. נבדוק כמה נשארו: ${M(`${p.total} - (${p.groups} × ${p.groupSize}) = ${p.leftover}`)}.`,
            "3"
          ),
          toSpan(mix`4. לכן ${ans} תלמידים נשארים בלי קבוצה מלאה.`, "4"),
        ];
      }

      if (p.kind === "wp_multi_step") {
        return [
          toSpan(
            mix`1. נחשב כמה פריטים קונים בסך הכל: ${p.a} + ${p.b} = ${p.totalQty}.`,
            "1"
          ),
          toSpan(
            mix`2. נמצא את עלות הקנייה: ${M(`${p.price} × ${p.totalQty} = ${p.totalCost}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. נחסר מהסכום שהיה לליאו: ${M(`${p.money} - ${p.totalCost} = ${ans}`)}.`,
            "3"
          ),
        ];
      }

      if (p.kind === "wp_shop_discount") {
        return [
          toSpan(
            mix`1. נחשב את ההנחה: ${M(`${p.price} × ${p.discPerc}/100 = ${p.discount}`)}.`,
            "1"
          ),
          toSpan(
            mix`2. נפחית מהמחיר: ${M(`${p.price} - ${p.discount} = ${ans}`)}.`,
            "2"
          ),
        ];
      }

      if (p.kind === "wp_unit_cm_to_m") {
        return [
          toSpan(
            mix`1. יודעים ש-1 מ' = 100 ס"מ.`,
            "1"
          ),
          toSpan(
            mix`2. לכן מחלקים ב-100: ${M(`${p.cm} ÷ 100 = ${ans}`)}.`,
            "2"
          ),
        ];
      }

      if (p.kind === "wp_unit_g_to_kg") {
        return [
          toSpan(
            mix`1. יודעים ש-1 ק\"ג = 1000 גרם.`,
            "1"
          ),
          toSpan(
            mix`2. לכן מחלקים ב-1000: ${M(`${p.g} ÷ 1000 = ${ans}`)}.`,
            "2"
          ),
        ];
      }

      if (p.kind === "wp_distance_time") {
        return [
          toSpan(
            mix`1. נוסחת הדרך: דרך = מהירות × זמן.`,
            "1"
          ),
          toSpan(
            mix`2. נחשב: ${M(`${p.speed} × ${p.hours} = ${ans}`)} ק\"מ.`,
            "2"
          ),
        ];
      }

      return [
        toSpan(mix`1. לזהות מה שואלים – כמה ביחד? כמה נשאר? כמה בכל קבוצה?`, "1"),
        toSpan(mix`2. לכתוב תרגיל מתמטיקה שמתאים לסיפור.`, "2"),
        toSpan(mix`3. לפתור את התרגיל ולקשר אותו למילים.`, "3"),
      ];

    case "ratio": {
      if (p.kind === "ratio_find") {
        return [
          toSpan(mix`1. נמצא את המחלק המשותף הגדול (מ.מ.ג) של ${M(String(p.a))} ו-${M(String(p.b))}.`, "1"),
          toSpan(mix`2. נחלק שניהם במ.מ.ג: ${M(`${p.a}÷${p.a/p.simplifiedA}`)} ו-${M(`${p.b}÷${p.b/p.simplifiedB}`)}.`, "2"),
          toSpan(mix`3. היחס המצומצם: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "ratio_first") {
        return [
          toSpan(mix`1. היחס ${M(`${p.simplifiedA}:${p.simplifiedB}`)} אומר: ראשון = ${M(String(p.simplifiedA))} חלקים, שני = ${M(String(p.simplifiedB))} חלקים.`, "1"),
          toSpan(mix`2. השני הוא ${M(String(p.secondNum))} = ${M(`${p.k} × ${p.simplifiedB}`)}, לכן k=${M(String(p.k))}.`, "2"),
          toSpan(mix`3. הראשון: ${M(`${p.k} × ${p.simplifiedA} = ${ans}`)}.`, "3"),
        ];
      }
      if (p.kind === "ratio_second") {
        return [
          toSpan(mix`1. היחס ${M(`${p.simplifiedA}:${p.simplifiedB}`)} אומר: ראשון = ${M(String(p.simplifiedA))} חלקים, שני = ${M(String(p.simplifiedB))} חלקים.`, "1"),
          toSpan(mix`2. הראשון הוא ${M(String(p.firstNum))} = ${M(`${p.k} × ${p.simplifiedA}`)}, לכן k=${M(String(p.k))}.`, "2"),
          toSpan(mix`3. השני: ${M(`${p.k} × ${p.simplifiedB} = ${ans}`)}.`, "3"),
        ];
      }
      return [
        toSpan(mix`1. מזהים את שני הכמויות ומחשבים יחס.`, "1"),
        toSpan(mix`2. מצמצמים על ידי חלוקה במ.מ.ג.`, "2"),
        toSpan(mix`3. התשובה: ${ans}.`, "3"),
      ];
    }

    case "scale": {
      if (p.kind === "scale_map_to_real") {
        return [
          toSpan(mix`1. קנה מידה 1:${M(String(p.scale))} - כל ס"מ במפה = ${M(String(p.scale))} ס"מ במציאות.`, "1"),
          toSpan(mix`2. נכפול: ${M(`${p.mapLength} × ${p.scale} = ${ans}`)}.`, "2"),
          toSpan(mix`3. המרחק במציאות: ${ans} ס"מ.`, "3"),
        ];
      }
      if (p.kind === "scale_find") {
        return [
          toSpan(mix`1. מחפשים בכמה לכפול כדי לעבור מהמפה למציאות.`, "1"),
          toSpan(mix`2. נחלק: ${M(`${p.realLength} ÷ ${p.mapLength} = ${ans}`)}.`, "2"),
          toSpan(mix`3. קנה המידה: 1:${ans}.`, "3"),
        ];
      }
      return [
        toSpan(mix`1. קנה מידה 1:X - כל יחידה במפה = X יחידות במציאות.`, "1"),
        toSpan(mix`2. מציאות = מפה × X. מפה = מציאות ÷ X.`, "2"),
        toSpan(mix`3. התשובה: ${ans}.`, "3"),
      ];
    }

    case "divisibility": {
      return [
        toSpan(mix`1. בודקים: האם ${M(String(p.num))} מתחלק ב-${M(String(p.divisor))} בלי שארית?`, "1"),
        toSpan(mix`2. מחשבים: ${M(`${p.num} ÷ ${p.divisor}`)}.`, "2"),
        toSpan(
          p.isDivisible
            ? mix`3. יוצא שלם - ${M(String(p.num))} כן מתחלק ב-${M(String(p.divisor))}.`
            : mix`3. לא יוצא שלם - ${M(String(p.num))} לא מתחלק ב-${M(String(p.divisor))}.`,
          "3"
        ),
      ];
    }

    case "powers": {
      if (p.kind === "power_calc") {
        const factors = Array.from({ length: p.exp }, () => p.base);
        return [
          toSpan(mix`1. חזקה: ${M(`${p.base}^${p.exp}`)} = ${M(String(p.base))} כפול עצמו ${M(String(p.exp))} פעמים.`, "1"),
          toSpan(mix`2. נחשב: ${M(factors.join(" × "))} = ${M(String(p.result))}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "power_base") {
        return [
          toSpan(mix`1. מחפשים בסיס: איזה מספר בחזקת ${M(String(p.exp))} נותן ${M(String(p.result))}?`, "1"),
          toSpan(mix`2. נסה: ${M(String(p.base))}^${M(String(p.exp))} = ${M(String(p.result))}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      return [
        toSpan(mix`1. חזקה = כפל חוזר של הבסיס בעצמו.`, "1"),
        toSpan(mix`2. לדוגמה: 3² = 3 × 3 = 9.`, "2"),
        toSpan(mix`3. התשובה: ${ans}.`, "3"),
      ];
    }

    case "order_of_operations": {
      if (p.kind === "order_add_mul") {
        const prod = p.b * p.c;
        return [
          toSpan(mix`1. כפל לפני חיבור: ${M(`${p.a} + ${p.b} × ${p.c}`)} - כופלים קודם.`, "1"),
          toSpan(mix`2. ${M(`${p.b} × ${p.c} = ${prod}`)}, ואז ${M(`${p.a} + ${prod} = ${ans}`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "order_mul_sub") {
        const prod = p.a * p.b;
        return [
          toSpan(mix`1. כפל לפני חיסור: ${M(`${p.a} × ${p.b} - ${p.c}`)} - כופלים קודם.`, "1"),
          toSpan(mix`2. ${M(`${p.a} × ${p.b} = ${prod}`)}, ואז ${M(`${prod} - ${p.c} = ${ans}`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "order_parentheses") {
        const sum = p.a + p.b;
        return [
          toSpan(mix`1. סוגריים קודם: ${M(`(${p.a} + ${p.b}) × ${p.c}`)} - חישוב הסוגריים תחילה.`, "1"),
          toSpan(mix`2. ${M(`${p.a} + ${p.b} = ${sum}`)}, ואז ${M(`${sum} × ${p.c} = ${ans}`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      return [
        toSpan(mix`1. הסדר: סוגריים → כפל/חילוק → חיבור/חיסור.`, "1"),
        toSpan(mix`2. מחשבים לפי הסדר הנכון.`, "2"),
        toSpan(mix`3. התשובה: ${ans}.`, "3"),
      ];
    }

    case "estimation": {
      if (p.kind === "est_add") {
        const roundA = Math.round(p.a / 10) * 10;
        const roundB = Math.round(p.b / 10) * 10;
        return [
          toSpan(mix`1. מעגלים לעשרות: ${M(String(p.a))} ≈ ${M(String(roundA))}, ${M(String(p.b))} ≈ ${M(String(roundB))}.`, "1"),
          toSpan(mix`2. מחברים בקירוב: ${M(`${roundA} + ${roundB} = ${roundA + roundB}`)}.`, "2"),
          toSpan(mix`3. האומדן: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "est_mul") {
        const roundA = Math.round(p.a / 10) * 10;
        const roundB = Math.round(p.b / 10) * 10;
        return [
          toSpan(mix`1. מעגלים לעשרות: ${M(String(p.a))} ≈ ${M(String(roundA))}, ${M(String(p.b))} ≈ ${M(String(roundB))}.`, "1"),
          toSpan(mix`2. כופלים בקירוב: ${M(`${roundA} × ${roundB} = ${roundA * roundB}`)}.`, "2"),
          toSpan(mix`3. האומדן: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "est_quantity") {
        const rounded = Math.round(p.quantity / 10) * 10;
        return [
          toSpan(mix`1. מעגלים ${M(String(p.quantity))} לעשרות הקרובות: ${M(String(rounded))}.`, "1"),
          toSpan(mix`2. האומדן: ${ans}.`, "2"),
        ];
      }
      return [
        toSpan(mix`1. מעגלים את המספרים לעשרות/מאות הקרובות.`, "1"),
        toSpan(mix`2. מחשבים בקירוב.`, "2"),
        toSpan(mix`3. האומדן: ${ans}.`, "3"),
      ];
    }

    case "zero_one_properties": {
      if (p.kind === "zero_mul" || p.kind === "zero_mul_eq" || p.kind === "zero_mul_word") {
        return [
          toSpan(mix`1. תכונה: כל מספר × 0 = 0.`, "1"),
          toSpan(mix`2. ${M(`${p.a} × 0 = 0`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "zero_add_expr" || p.kind === "zero_add_swap" || p.kind === "zero_sub_line") {
        return [
          toSpan(mix`1. תכונה: חיבור/חיסור 0 לא משנה את המספר.`, "1"),
          toSpan(mix`2. ${M(`${p.a} + 0 = ${p.a}`)} ו-${M(`${p.a} - 0 = ${p.a}`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      if (p.kind === "one_mul_identity" || p.kind === "one_mul_comm") {
        return [
          toSpan(mix`1. תכונה: כל מספר × 1 = אותו המספר.`, "1"),
          toSpan(mix`2. ${M(`${p.a} × 1 = ${p.a}`)}.`, "2"),
          toSpan(mix`3. התשובה: ${ans}.`, "3"),
        ];
      }
      return [
        toSpan(mix`1. מספר × 0 = 0. מספר × 1 = אותו מספר. מספר ± 0 = אותו מספר.`, "1"),
        toSpan(mix`2. התשובה: ${ans}.`, "2"),
      ];
    }

    case "division_with_remainder": {
      const remainder = p.remainder ?? 0;
      return [
        toSpan(mix`1. נחלק: ${M(`${p.dividend} ÷ ${p.divisor}`)}.`, "1"),
        toSpan(mix`2. כמה פעמים ${M(String(p.divisor))} נכנס? ${M(String(p.quotient))} פעמים.`, "2"),
        toSpan(mix`3. שארית: ${M(`${p.dividend} − (${p.quotient} × ${p.divisor}) = ${remainder}`)}.`, "3"),
        toSpan(mix`4. בדיקה: ${M(`${p.divisor} × ${p.quotient} + ${remainder} = ${p.dividend}`)} ✓`, "4"),
      ];
    }

    default:
      return [];
  }
}

// "למה טעיתי?" – הסבר קצר לטעות נפוצה
// פונקציה להסבר מותאם לגיל - הסברים פשוטים יותר לכיתות נמוכות
function getAgeAppropriateExplanation(operation, gradeKey, question, correctAnswer) {
  if (shouldUseComparisonSignErrorExplanation(question, operation)) {
    return buildComparisonSignWrongAnswerLine(question);
  }

  const displayCorrectAnswer = Number.isNaN(correctAnswer)
    ? question?.correctAnswer
    : correctAnswer;

  if (gradeKey === "g1" || gradeKey === "g2") {
    const a = question.a || question.params?.a;
    const b = question.b || question.params?.b;

    switch (operation) {
      case "addition":
        return mix`💡 נסה לחשוב על זה כך: יש לך ${M(String(a))} עיגולים, ואתה מוסיף ${M(String(b))} עיגולים נוספים. כמה עיגולים יש לך עכשיו? נסה לספור: ${M(`${a}... ${a + 1}... ${a + 2}...`)} עד ${M(String(correctAnswer))}!`;
      case "subtraction":
        return mix`💡 נסה לחשוב על זה כך: יש לך ${M(String(a))} עיגולים, ואתה לוקח ${M(String(b))} עיגולים. כמה עיגולים נשארו? נסה לספור לאחור: ${M(`${a}... ${a - 1}... ${a - 2}...`)} עד ${M(String(correctAnswer))}!`;
      case "multiplication":
        return mix`💡 כפל זה כמו חיבור חוזר! ${M(`${a} × ${b}`)} זה כמו ${M(`${a} + ${a} + ${a}`)}... (${M(String(b))} פעמים). נסה לספור: ${M(`${a}, ${a * 2}, ${a * 3}...`)} עד ${M(String(correctAnswer))}!`;
      case "division":
        return mix`💡 חילוק זה כמו חלוקה לקבוצות! ${M(`${a} ÷ ${b}`)} זה כמו לקחת ${M(String(a))} עיגולים ולחלק אותם ל-${M(String(b))} קבוצות שוות. כמה עיגולים בכל קבוצה? ${M(String(correctAnswer))}!`;
      default:
        return mix`💡 נסה לחשוב על התרגיל בצורה פשוטה. התשובה הנכונה היא ${M(String(displayCorrectAnswer))}.`;
    }
  }

  if (gradeKey === "g3" || gradeKey === "g4") {
    const a = question.a || question.params?.a;
    const b = question.b || question.params?.b;

    switch (operation) {
      case "addition":
        if (a && b) {
          const tens = Math.floor(b / 10) * 10;
          const ones = b % 10;
          return mix`💡 נסה לחשוב על חיבור: ${M(`${a} + ${b} = ${correctAnswer}`)}. אם קשה, נסה לפרק: ${M(`${a} + ${b} = ${a} + ${tens} + ${ones} = ${a + tens} + ${ones} = ${correctAnswer}`)}`;
        }
        return mix`💡 נסה לחשוב על התרגיל בצורה שיטתית. התשובה הנכונה היא ${M(String(displayCorrectAnswer))}.`;
      case "subtraction":
        if (a && b) {
          const tens = Math.floor(b / 10) * 10;
          const ones = b % 10;
          return mix`💡 נסה לחשוב על חיסור: ${M(`${a} - ${b} = ${displayCorrectAnswer}`)}. אם קשה, נסה לפרק: ${M(`${a} - ${b} = ${a} - ${tens} - ${ones} = ${a - tens} - ${ones} = ${displayCorrectAnswer}`)}`;
        }
        return mix`💡 נסה לחשוב על התרגיל בצורה שיטתית. התשובה הנכונה היא ${M(String(displayCorrectAnswer))}.`;
      default:
        return mix`💡 נסה לחשוב על התרגיל בצורה שיטתית. התשובה הנכונה היא ${M(String(displayCorrectAnswer))}.`;
    }
  }

  return null;
}

export function getErrorExplanation(question, operation, wrongAnswer, gradeKey, opts = {}) {
  if (!question) return "";
  if (shouldUseComparisonSignErrorExplanation(question, operation)) {
    return buildComparisonSignWrongAnswerLine(question);
  }
  const userAnsNum = Number(wrongAnswer);
  const correctAnswerRaw = question.correctAnswer;
  if (isComparisonSignToken(correctAnswerRaw)) {
    return buildComparisonSignWrongAnswerLine(question);
  }
  const correctNum =
    typeof correctAnswerRaw === "string" && correctAnswerRaw.includes("/")
      ? Number(
          correctAnswerRaw.split("/")[0] /
            (correctAnswerRaw.split("/")[1] || 1)
        )
      : Number(correctAnswerRaw);

  if (opts.mode === "learning") {
    const ageAppropriate = getAgeAppropriateExplanation(
      operation,
      gradeKey,
      question,
      correctNum
    );
    if (ageAppropriate) {
      return ageAppropriate;
    }
  }

  switch (operation) {
    case "addition":
      if (!Number.isNaN(userAnsNum) && userAnsNum < correctNum) {
        return "נראה שלא חיברת את כל החלקים או פספסת מספר אחד בדרך.";
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum > correctNum) {
        return "נראה שחיברת משהו פעמיים או טעית בחיבור ביניים.";
      }
      return "כדאי לבדוק שוב את החיבור לפי שלבים - אפשר לפרק לעשרות ויחידות ולחבר חלק-חלק.";
    case "subtraction":
      return "בחיסור קל להתבלבל בסדר המספרים. בדוק שוב שהקטנת את המספר הגדול ולא להפך.";
    case "multiplication":
      return "בכפל לפעמים מערבבים בין כפל לחיבור. ודא שחזרת על המספר הנכון מספר הפעמים הנכון.";
    case "division":
      return "בחילוק בדוק שהתוצאה כפול המחלק מחזירה את המספר המקורי.";
    case "fractions":
      return "בשברים לרוב שוכחים מכנה משותף או עובדים גם על המכנה במקום רק על המונה.";
    case "percentages":
      return mix`באחוזים טעות נפוצה היא להתבלבל בין חלק מתוך 100 לבין חיבור/חיסור רגיל. נסה לכתוב קודם את השבר (למשל ${M("25% = 1/4")}).`;
    case "sequences":
      return "בסדרות רבים מפספסים את ההפרש הקבוע. בדוק שוב מה קורה בין שני איברים סמוכים.";
    case "decimals":
      return "בעשרוניים באגים קורים כשלא מיישרים את הנקודות או שוכחים את מספר הספרות אחרי הנקודה.";
    case "rounding":
      return mix`בעיגול קל להתבלבל בספרה שאחריה. בדוק אם היא ${M("0–4")} (למטה) או ${M("5–9")} (למעלה).`;
    case "equations":
      return "במשוואות מספר חסר רבים מנסים לנחש. כדאי להשתמש בפעולה ההפוכה ולהחזיר את שני הצדדים לאותו מספר.";
    case "compare":
      return "בהשוואת מספרים הטעות הנפוצה היא להתבלבל מי גדול יותר, במיוחד בעשרוניים. נסה להשוות קודם את החלק השלם.";
    case "number_sense":
      return "בדוק שוב את פירוק המספר לעשרות/מאות/אחדות או אם המספר זוגי/אי-זוגי. אלה דברים שקל להתבלבל בהם כשממהרים.";
    case "factors_multiples":
      return "בגורמים וכפולות קל להתבלבל בין \"מה מחלק את המספר\" לבין \"מה מתקבל כשמכפילים\". נסה לכתוב את כל הגורמים או הכפולות בצד.";
    case "word_problems":
      return "בתרגילי מילים הטעות הנפוצה היא לבחור פעולה לא נכונה (חיבור במקום חיסור וכו'). נסה לכתוב תרגיל פשוט שמתאים לסיפור.";
    default:
      return "";
  }
}

// Build detailed step-by-step explanation for the current question
function pushMixStep(steps, line) {
  steps.push(toSpan(line, String(steps.length)));
}

export function buildStepExplanation(question) {
  if (!question) return null;

  const p = question.params || {};

  const op = question.operation;
  const a = p.a ?? question.a;
  const b = p.b ?? question.b;
  const answer =
    question.correctAnswer !== undefined
      ? question.correctAnswer
      : question.answer;

  let exercise = "";
  let vertical = "";
  const steps = [];

  // נריץ את ההסבר על פעולה "אפקטיבית" – למשל:
  // 53 + (-3) → פעולה אפקטיבית: חיסור 53 - 3
  let effectiveOp = op;
  let aEff = a;
  let bEff = b;

  // אם זה חיבור עם מספר שני שלילי – נמיר לחיסור רגיל
  if (op === "addition" && typeof b === "number" && b < 0) {
    effectiveOp = "subtraction";
    bEff = Math.abs(b);

    pushMixStep(steps,
      mix`0. שמים לב שתרגיל החיבור ${M(`${a} + (${b})`)} הוא בעצם כמו חיסור: ${M(`${a} - ${Math.abs(b)}`)}.`
    );
  }

  // טיפול בתרגילי השלמה - משתמש בפונקציה הכללית
  const missingConversion = convertMissingNumberEquation(op, p.kind, p);
  if (missingConversion) {
    effectiveOp = missingConversion.effectiveOp;
    aEff = missingConversion.top;
    bEff = missingConversion.bottom;
  }

  // טיפול בתרגילי השלמה בחיבור - הופכים לחיסור (להסבר מפורט)
  if (
    op === "addition" &&
    (p.kind === "add_missing_first" || p.kind === "add_missing_second")
  ) {
    const c = p.c; // התוצאה הסופית
    let leftNum, rightNum;

    if (p.kind === "add_missing_first") {
      // __ + b = c  →  c - b = __
      leftNum = c;
      rightNum = p.b;
      exercise = pureMathLtrDisplay(`${BLANK} + ${p.b} = ${c}`);
    } else {
      // a + __ = c  →  c - a = __
      leftNum = c;
      rightNum = p.a;
      exercise = pureMathLtrDisplay(`${p.a} + ${BLANK} = ${c}`);
    }

    const missing = answer;
    vertical = buildVerticalOperation(leftNum, rightNum, "-");

    pushMixStep(steps,
      mix`1. הופכים את התרגיל לחיסור: במקום ${exercise} כותבים ${M(`${c} - ${rightNum} = ${BLANK}`)}.`
    );
    pushMixStep(steps,
      mix`2. כותבים את המספרים זה מתחת לזה בעמודות: עשרות מעל עשרות ואחדות מעל אחדות.`);

    // חישוב ספרה ספרה
    const topStr = String(leftNum);
    const bottomStr = String(rightNum);
    const maxLen = Math.max(topStr.length, bottomStr.length);
    const topPadded = topStr.padStart(maxLen, "0");
    const bottomPadded = bottomStr.padStart(maxLen, "0");

    let borrow = 0;
    let stepIndex = 3;
    const resultDigits = [];

    for (let i = maxLen - 1; i >= 0; i--) {
      let topDigit = Number(topPadded[i]);
      const bottomDigit = Number(bottomPadded[i]);
      topDigit -= borrow;

      const placeName =
        i === maxLen - 1
          ? "אחדות"
          : i === maxLen - 2
          ? "עשרות"
          : "מאות";

      if (topDigit < bottomDigit) {
        pushMixStep(steps,
          mix`${stepIndex}. בעמודת ה${placeName} ${topDigit} קטן מ-${bottomDigit}, לכן לוקחים "השאלה" מהעמודה הבאה (מוסיפים 10 לספרה הזו ומפחיתים 1 בעמודה הבאה).`
        );
        topDigit += 10;
        borrow = 1;
        stepIndex++;
      } else {
        borrow = 0;
      }

      const diff = topDigit - bottomDigit;
      resultDigits.unshift(diff);
      pushMixStep(steps,
        mix`${stepIndex}. כעת מחשבים בעמודת ה${placeName}: ${M(`${topDigit} - ${bottomDigit} = ${diff}`)} וכותבים ${diff} בעמודה זו.`
      );
      stepIndex++;
    }

    pushMixStep(steps,
      mix`5. המספר שנוצר הוא ${missing}. זה המספר שחסר בתרגיל: ${
        p.kind === "add_missing_first"
          ? pureMathLtrDisplay(`${missing} + ${p.b} = ${c}`)
          : pureMathLtrDisplay(`${p.a} + ${missing} = ${c}`)
      }.`
    );

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // טיפול בתרגילי השלמה בכפל - הופכים לחילוק (להסבר מפורט)
  if (
    op === "multiplication" &&
    (p.kind === "mul_missing_first" || p.kind === "mul_missing_second")
  ) {
    const c = p.c; // התוצאה הסופית
    let leftNum, rightNum;

    if (p.kind === "mul_missing_first") {
      // __ × b = c  →  c ÷ b = __
      leftNum = c;
      rightNum = p.b;
      exercise = pureMathLtrDisplay(`${BLANK} × ${p.b} = ${c}`);
    } else {
      // a × __ = c  →  c ÷ a = __
      leftNum = c;
      rightNum = p.a;
      exercise = pureMathLtrDisplay(`${p.a} × ${BLANK} = ${c}`);
    }

    const missing = answer;
    vertical = buildVerticalOperation(leftNum, rightNum, "÷");

    pushMixStep(steps,
      mix`1. הופכים את התרגיל לחילוק: במקום ${exercise} כותבים ${M(`${c} ÷ ${rightNum} = ${BLANK}`)}.`
    );
    pushMixStep(steps,
      mix`2. חילוק הוא בעצם הפוך מהכפל: כמה פעמים המספר ${rightNum} נכנס ב-${c}?`
    );
    
    if (typeof answer === "number") {
      pushMixStep(steps,
        mix`3. בודקים: ${M(`${rightNum} × ${answer} = ${rightNum * answer}`)}. זה נותן לנו ${rightNum * answer}, שזה בדיוק ${c}.`
      );
      pushMixStep(steps,
        mix`4. לכן המספר החסר הוא ${missing}. זה המספר שחסר בתרגיל: ${
          p.kind === "mul_missing_first"
            ? pureMathLtrDisplay(`${missing} × ${p.b} = ${c}`)
            : pureMathLtrDisplay(`${p.a} × ${missing} = ${c}`)
        }.`
      );
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // טיפול בתרגילי השלמה בחילוק (להסבר מפורט)
  if (
    op === "division" &&
    (p.kind === "div_missing_dividend" || p.kind === "div_missing_divisor")
  ) {
    const { dividend, divisor, quotient } = p;
    let leftNum, rightNum, opSymbol;

    if (p.kind === "div_missing_dividend") {
      // __ ÷ divisor = quotient  →  quotient × divisor = __ (כפל)
      leftNum = quotient;
      rightNum = divisor;
      opSymbol = "×";
      exercise = pureMathLtrDisplay(`${BLANK} ÷ ${divisor} = ${quotient}`);
      pushMixStep(steps,
        mix`1. הופכים את התרגיל לכפל: במקום ${exercise} כותבים ${M(`${quotient} × ${divisor} = ${BLANK}`)}.`
      );
    } else {
      // dividend ÷ __ = quotient  →  dividend ÷ quotient = __ (חילוק)
      leftNum = dividend;
      rightNum = quotient;
      opSymbol = "÷";
      exercise = pureMathLtrDisplay(`${dividend} ÷ ${BLANK} = ${quotient}`);
      pushMixStep(steps,
        mix`1. הופכים את התרגיל לחילוק: במקום ${exercise} כותבים ${M(`${dividend} ÷ ${quotient} = ${BLANK}`)}.`
      );
    }

    const missing = answer;
    vertical = buildVerticalOperation(leftNum, rightNum, opSymbol);

    if (p.kind === "div_missing_dividend") {
      pushMixStep(steps,
        mix`2. כפל הוא בעצם חיבור חוזר: ${M(`${quotient} × ${divisor} = ${Array(quotient).fill(divisor).join(" + ")} = ${dividend}`)}.`
      );
      pushMixStep(steps,
        mix`3. לכן המספר החסר הוא ${missing}. זה המספר שחסר בתרגיל: ${M(`${missing} ÷ ${divisor} = ${quotient}`)}.`
      );
    } else {
      pushMixStep(steps,
        mix`2. חילוק הוא בעצם הפוך מהכפל: כמה פעמים המספר ${quotient} נכנס ב-${dividend}?`
      );
      if (typeof answer === "number") {
        pushMixStep(steps,
          mix`3. בודקים: ${M(`${quotient} × ${answer} = ${quotient * answer}`)}. זה נותן לנו ${quotient * answer}, שזה בדיוק ${dividend}.`
        );
        pushMixStep(steps,
          mix`4. לכן המספר החסר הוא ${missing}. זה המספר שחסר בתרגיל: ${M(`${dividend} ÷ ${missing} = ${quotient}`)}.`
        );
      }
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // תצוגת תרגיל בסיסית (אופקית) – רק חשבון
  if (aEff != null && bEff != null && typeof aEff === "number" && typeof bEff === "number") {
    let symbol = "";
    if (effectiveOp === "addition") symbol = "+";
    else if (effectiveOp === "subtraction") symbol = "−";
    else if (effectiveOp === "multiplication") symbol = "×";
    else if (effectiveOp === "division") symbol = "÷";

    exercise = pureMathLtrDisplay(`${aEff} ${symbol} ${bEff} = ${BLANK}`);
  } else {
    const raw = question.params?.exerciseText || question.question || "";
    exercise = raw ? pureMathLtrDisplay(raw) : "";
  }

  // טיפוסי הסבר לפי פעולה

  // חיבור
  if (effectiveOp === "addition" && typeof aEff === "number" && typeof bEff === "number") {
    vertical = buildVerticalOperation(aEff, bEff, "+");
    const aStr = String(aEff);
    const bStr = String(bEff);
    const maxLen = Math.max(aStr.length, bStr.length);
    const pa = aStr.padStart(maxLen, "0");
    const pb = bStr.padStart(maxLen, "0");

    pushMixStep(steps,
      mix`1. כותבים את המספרים אחד מעל השני, כך שסַפְרות האחדות נמצאות באותה עמודה: ${M(`${aEff}\n+ ${bEff}`)}.`
    );

    let carry = 0;
    let stepIndex = 2;

    for (let i = maxLen - 1; i >= 0; i--) {
      const da = Number(pa[i]);
      const db = Number(pb[i]);
      const sum = da + db + carry;
      const ones = sum % 10;
      const newCarry = sum >= 10 ? 1 : 0;

      const placeName =
        i === maxLen - 1
          ? "אחדות"
          : i === maxLen - 2
          ? "עשרות"
          : "מאות";

      pushMixStep(steps, mix`${stepIndex}. מחברים את ספרת ה${placeName}: ${M(`${da} + ${db}${carry ? " + " + carry : ""} = ${sum}`)}. כותבים ${ones} בעמודת ה${placeName}${newCarry ? ` ומעבירים 1 לעמודת ה${placeName} הבאה.` : ""}`);

      carry = newCarry;
      stepIndex++;
    }

    if (carry) {
      pushMixStep(steps,
        mix`${stepIndex}. בסוף החיבור נשאר לנו 1 נוסף, כותבים אותו משמאל כמספר חדש בעמודת המאות/אלפים.`
      );
      stepIndex++;
    }

    if (typeof answer === "number") {
      pushMixStep(steps,
        mix`${stepIndex}. המספר שנוצר בסוף הוא ${answer}. זהו התשובה הסופית לתרגיל.`
      );
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // חיסור
  if (effectiveOp === "subtraction" && typeof aEff === "number" && typeof bEff === "number") {
    vertical = buildVerticalOperation(aEff, bEff, "-");
    const aStr = String(aEff);
    const bStr = String(bEff);
    const maxLen = Math.max(aStr.length, bStr.length);
    const pa = aStr.padStart(maxLen, "0");
    const pb = bStr.padStart(maxLen, "0");

    pushMixStep(steps,
      mix`1. כותבים את המספרים אחד מעל השני, כך שסַפְרות האחדות, העשרות וכו' נמצאות באותו טור: ${M(`${aEff}\n- ${bEff}`)}.`
    );

    let borrow = 0;
    let stepIndex = 2;

    for (let i = maxLen - 1; i >= 0; i--) {
      let da = Number(pa[i]);
      const db = Number(pb[i]);
      da -= borrow;

      const placeName =
        i === maxLen - 1
          ? "אחדות"
          : i === maxLen - 2
          ? "עשרות"
          : "מאות";

      if (da < db) {
        pushMixStep(steps,
          mix`${stepIndex}. בעמודת ה${placeName} ${da} קטן מ-${db}, לכן לוקחים "השאלה" מהעמודה הבאה (מוסיפים 10 לספרה הזו ומפחיתים 1 בעמודה הבאה).`
        );
        da += 10;
        borrow = 1;
      } else {
        borrow = 0;
      }

      const diff = da - db;
      stepIndex++;

      pushMixStep(steps,
        mix`${stepIndex}. כעת מחשבים בעמודת ה${placeName}: ${M(`${da} - ${db} = ${diff}`)} וכותבים ${diff} בעמודה זו.`
      );
      stepIndex++;
    }

    if (typeof answer === "number") {
      pushMixStep(steps,
        mix`${stepIndex}. המספר שקיבלנו בסוף הוא ${answer}. זו התוצאה של החיסור.`
      );
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // כפל
  if (
    effectiveOp === "multiplication" &&
    typeof aEff === "number" &&
    typeof bEff === "number"
  ) {
    vertical = pureMathLtrDisplay(`${aEff}\n× ${bEff}`);

    pushMixStep(steps,
      mix`1. מבינים שהכפל הוא חיבור חוזר: למשל 3 × 4 זה כמו 4 + 4 + 4.`);
    pushMixStep(steps,
      mix`2. במקרה שלנו מחשבים: ${M(`${aEff} × ${bEff}`)}. אפשר לחשב כ-${aEff} פעמים המספר ${bEff} או ${bEff} פעמים המספר ${aEff}.`
    );

    if (aEff <= 12 && bEff <= 12) {
      const smaller = Math.min(aEff, bEff);
      const bigger = Math.max(aEff, bEff);
      pushMixStep(steps,
        mix`3. למשל: ${M(`${smaller} × ${bigger} = ${Array(smaller)
            .fill(bigger)
            .join(" + ")} = ${answer}`)}.`
      );
    } else if (typeof answer === "number") {
      pushMixStep(steps,
        mix`3. משתמשים בטבלת כפל או פירוק לגורמים כדי להגיע לתוצאה ${answer}.`
      );
    }

    if (typeof answer === "number") {
      pushMixStep(steps, mix`4. לכן ${M(`${aEff} × ${bEff} = ${answer}`)}.`);
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // חילוק ארוך - צעד אחר צעד כמו בחיבור וחיסור
  if (effectiveOp === "division" && typeof aEff === "number" && typeof bEff === "number") {
    // שימוש בפרמטרים של השאלה לחילוק (dividend, divisor, quotient)
    const dividend = p.dividend || aEff;
    const divisor = p.divisor || bEff;
    const quotient = p.quotient || answer;
    
    vertical = buildVerticalOperation(divisor, dividend, "÷");
    
    const dividendStr = String(dividend);
    const divisorNum = divisor;
    
    pushMixStep(steps,
      mix`1. כותבים את המחולק (${dividend}) והמחלק (${divisor}) בצורת חילוק ארוך.`
    );
    
    // ביצוע חילוק ארוך צעד אחר צעד
    let workingNumber = 0;
    let stepIndex = 2;
    let quotientDigits = [];
    let divisionSteps = [];
    
    for (let i = 0; i < dividendStr.length; i++) {
      workingNumber = workingNumber * 10 + parseInt(dividendStr[i]);
      
      if (workingNumber >= divisorNum) {
        const qDigit = Math.floor(workingNumber / divisorNum);
        const product = qDigit * divisorNum;
        const remainder = workingNumber - product;
        
        quotientDigits.push(qDigit);
        divisionSteps.push({
          position: i,
          workingNumber,
          quotientDigit: qDigit,
          product,
          remainder,
        });
        
        workingNumber = remainder;
      }
    }
    
    // יצירת צעדים מפורטים
    for (let idx = 0; idx < divisionSteps.length; idx++) {
      const step = divisionSteps[idx];
      const { position, workingNumber: wNum, quotientDigit: qDigit, product, remainder } = step;
      
      // צעד: כתיבה במנה
      pushMixStep(steps,
        mix`${stepIndex}. ${divisorNum} נכנס ב-${wNum} בדיוק ${qDigit} פעמים. כותבים ${qDigit} במנה מעל הספרה ${dividendStr[position]}.`
      );
      stepIndex++;
      
      // צעד: כפל וחיסור
      pushMixStep(steps,
        mix`${stepIndex}. מכפילים: ${M(`${qDigit} × ${divisorNum} = ${product}`)}. מחסרים: ${M(`${wNum} - ${product} = ${remainder}`)}. ${remainder === 0 ? 'אין שארית.' : `השארית היא ${remainder}.`}`
      );
      stepIndex++;
      
      // אם לא זה הצעד האחרון, מורידים את הספרה הבאה
      if (idx < divisionSteps.length - 1 && position < dividendStr.length - 1) {
        const nextPos = divisionSteps[idx + 1].position;
        const nextDigit = parseInt(dividendStr[nextPos]);
        pushMixStep(steps,
          mix`${stepIndex}. מורידים את הספרה הבאה (${nextDigit}). המספר החדש לחלוקה הוא ${remainder * 10 + nextDigit}.`
        );
        stepIndex++;
      }
    }
    
    // צעד אחרון
    const finalRemainder = divisionSteps.length > 0 ? divisionSteps[divisionSteps.length - 1].remainder : 0;
    if (typeof quotient === "number") {
      if (finalRemainder > 0) {
        pushMixStep(steps,
          mix`${stepIndex}. סיימנו! המנה היא ${quotient} והשארית היא ${finalRemainder}.`
        );
      } else {
        pushMixStep(steps,
          mix`${stepIndex}. סיימנו! המנה היא ${quotient} בלי שארית.`
        );
      }
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // תרגיל מילים – הסבר כללי
  if (op === "word_problems") {
    pushMixStep(steps, mix`1. קוראים את שאלת המילים לאט ומסמנים את הנתונים החשובים.`);
    pushMixStep(steps,
      mix`2. מחליטים אם צריך לחבר, לחסר, לכפול או לחלק לפי הסיפור (האם הכמות גדלה, קטנה, חוזרת על עצמה או מתחלקת?).`);
    pushMixStep(steps,
      mix`3. כותבים תרגיל חשבוני שמתאים לסיפור, פותרים אותו ואז עונים במשפט מלא.`);
    if (typeof answer === "number") {
      pushMixStep(steps, mix`4. החישוב נותן לנו ${answer}, ולכן זו התשובה לשאלה.`);
    }

    return {
      exercise,
      vertical,
      steps,
    };
  }

  // כל השאר (שברים, אחוזים וכו') – הסבר כללי
  pushMixStep(steps,
    mix`1. בודקים איזה סוג פעולה זו (חיבור, חיסור, כפל או חילוק) ומסדרים את המספרים בצורה נוחה על הדף.`);
  pushMixStep(steps, mix`2. פותרים שלבאחר שלב, בלי לדלג, ומסמנים כל שלב בדרך.`);
  if (typeof answer === "number") {
    pushMixStep(steps, mix`3. בסוף מקבלים את התוצאה ${answer}.`);
  }

  return {
    exercise,
    vertical,
    steps,
  };
}
