import { enrichGeometryAnimationSteps } from "./geometry-animations.js";
import React from "react";
import { mix, M } from "../lib/learning-book/learning-math-line-build.js";
import { learningStepDiv as toSpan } from "./learning-math-line-render.js";
import {
  resultPhraseArea,
  resultPhraseLength,
  resultPhraseVolume,
  resultPhraseVolumeRounded,
  geometryVolumeSuffix,
  geometryLengthSuffix,
} from "./geometry-units.js";

// פונקציות הסבר ורמזים לדף הגאומטריה

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/** רמזים: אסטרטגיה בלי צבירת מספרים מלאה ובלי חשיפת תשובת MCQ */
export function getHint(question, topic, gradeKey) {
  if (!question || !question.params) return "";
  const M = (expr) => `\u2066${expr}\u2069`;
  const p = question.params;
  const sh = question.shape;

  switch (topic) {
    case "area":
      if (sh === "square") {
        return "שטח ריבוע = צלע × צלע. קח את אורך הצלע מהשאלה והכפל בערך שלו - זה גודל השטח, לא היקף.";
      }
      if (sh === "rectangle") {
        return "שטח מלבן = אורך × רוחב. ודא שאתה מכפיל שני ממדים שונים של אותה צורה, ולא מחבר (זה דומה יותר להיקף).";
      }
      if (sh === "circle") {
        return mix`שטח מעגל = ${M("π × רדיוס²")} (כאן ${M("π ≈ 3.14")}). קודם רדיוס בריבוע, ואז הכפלה ב‑π - לא לבלבל עם ${M("2πr")} שהוא היקף.`;
      }
      if (sh === "triangle") {
        return "שטח משולש = (בסיס × גובה לבסיס) ÷ 2. אחרי המכפלה חלק ב‑2 - טעות נפוצה: לשכוח את החילוק.";
      }
      if (sh === "parallelogram") {
        return "שטח מקבילית = בסיס × הגובה האנך אליו (לא אלכסון).";
      }
      if (sh === "trapezoid") {
        return "שטח טרפז = ((בסיס 1 + בסיס 2) × גובה) ÷ 2. קודם חבר את שני הבסיסים המקבילים, כפול גובה, ואז חלקי 2.";
      }
      break;

    case "perimeter":
      if (sh === "square") {
        return "היקף ריבוע = צלע × 4 (סכום ארבע הצלעות השוות). אם חישבת צלע² - זו נוסחת שטח.";
      }
      if (sh === "rectangle") {
        return "היקף מלבן = (אורך + רוחב) × 2 - סכום כל הצלעות. אל תכפול אורך × רוחב; זה שטח.";
      }
      if (sh === "circle") {
        return mix`היקף מעגל = ${M("2 × π × רדיוס")}. זה סיבוב שלם סביב - לא ${M("πr²")}.`;
      }
      if (sh === "triangle") {
        return "היקף משולש = סכום שלוש הצלעות. בלי חלוקה ב‑2.";
      }
      break;

    case "volume": {
      if (p.kind === "pyramid_volume_square" || p.kind === "pyramid_volume_rectangular") {
        return "נפח פירמידה = (1/3) × שטח בסיס × גובה. קודם שטח הבסיס, ואז כפול גובה ושליש - לא לשכוח הגורם 1/3.";
      }
      if (p.kind === "cone_volume") {
        return "נפח חרוט = (1/3) × π × רדיוס² × גובה - כמו פירמידה עם בסיס עגול; שוב: שליש מנפח הגליל עם אותו בסיס.";
      }
      if (p.kind === "prism_volume_triangle" || p.kind === "prism_volume_rectangular") {
        return "נפח מנסרה = שטח החתך (בסיס) × גובה המנסרה. אם הבסיס משולש - חשב קודם שטח המשולש.";
      }
      if (sh === "cube") {
        return "נפח קובייה = צלע³ (אותה צלע שלוש פעמים).";
      }
      if (sh === "rectangular_prism") {
        return "נפח תיבה = אורך × רוחב × גובה - שלושת הממדים, בלי גורם 1/3.";
      }
      if (sh === "cylinder") {
        return "נפח גליל = π × רדיוס² × גובה. שטח מעגל הבסיס כפול גובה הגליל.";
      }
      if (sh === "sphere") {
        return "נפח כדור = (4/3) × π × רדיוס³ - הרדיוס מועלה לחזקה שלוש, לא רק בריבוע.";
      }
      break;
    }

    case "angles":
      return mix`בכל משולש סכום זוויות פנימיות = ${M("180°")}. חברי את שתי הזוויות הנתונות, ואז הפחיתי מהתוצאה מ‑${M("180°")}.`;

    case "pythagoras":
      return mix`במשולש ישר זווית: ${M("a² + b² = c²")}. זהה מי היתר (הצלע מול הזווית הישרה) ומה מבקשים - ניצב או יתר - ואז פעולה הפוכה (שורש או הפרש ריבועים).`;

    case "shapes_basic":
      if (p.kind === "shapes_basic_square" || p.kind === "shapes_basic_rectangle") {
        return "השוו אורכי צלעות: כשכל ארבע השוות - ריבוע; כשיש שני אורכים שונים לזוגות - מלבן.";
      }
      if (p.kind === "shapes_basic_properties_square") {
        return "שואלים על מספר צלעות שוות בריבוע. חשבו: כמה צלעות יש במצולע סגור, ומה ייחודי בריבוע לגבי אורכן?";
      }
      if (p.kind === "shapes_basic_properties_rectangle") {
        return "שואלים כמה זוגות של צלעות שוות יש במלבן - לא כמה צלעות בסך הכל.";
      }
      if (p.kind === "shapes_basic_properties_angles") {
        return "ריבוע ומלבן הם מרובעים עם זוויות פנימיות ישרות. כמה פינות כאלה יש במצולע עם ארבע צלעות?";
      }
      return "התמקדו בתכונות צלעות וזוויות של הריבוע לעומת המלבן.";

    case "parallel_perpendicular":
      return mix`מקבילים: לא נפגשים ומרחק קבוע ביניהם. מאונחים: נפגשים בזווית ישרה (${M("90°")}). איזה תיאור מתאים לשם שבשאלה?`;

    case "triangles":
      return "מיינו לפי שוויון אורכי צלעות: שלוש שוות / שתיים שוות / כולן שונות - והתאימו לשם שבשאלה.";

    case "quadrilaterals":
      return "התאימו את השם לכללי הצלעות והזוויות: כל הצלעות שוות? זוגות מקבילים? בסיס אחד בלבד מקביל?";

    case "transformations":
      return "הזזה מזיזה בלי לשנות כיוון קריאה של הצורה; שיקוף יוצר 'תמונת מראה' לציר. איזה תיאור מתאים לפעולה בשאלה?";

    case "rotation":
      return mix`סיבוב נמדד במעלות סביב נקודה. חשבו אם מדובר ברבע, חצי או שלושת רבעי סיבוב מלא (${M("360°")}).`;

    case "symmetry":
      return "ציר סימטרייה מחלק את הצורה לשני חצאים משקפים. חשבו כמה קווים כאלה עוברים דרך הצורה לפי סוגה (ריבוע / מלבן / משולש שווה צלעות).";

    case "diagonal":
      if (p.kind === "diagonal_square") {
        return mix`בריבוע האלכסון יוצר משולש ישר זווית עם שתי צלעות שוות - אפשר ${M("√2 × צלע")}.`;
      }
      if (p.kind === "diagonal_rectangle" || p.kind === "diagonal_parallelogram") {
        return "אלכסון הוא יתר במשולש ישר זווית שצלעותיו שני הצלעות הנתונות - השתמשו בפיתגרור.";
      }
      return "חשבו אלכסון כיתר במשולש ישר זווית שנבנה משני הצלעות הנתונות.";

    case "heights":
      if (p.shape === "triangle") {
        return mix`מהנוסחה לשטח משולש הפכו גובה: גובה = ${M("(שטח × 2) ÷ בסיס")}.`;
      }
      if (p.shape === "parallelogram") {
        return mix`במקבילית שטח = ${M("בסיס × גובה")}; לכן גובה = ${M("שטח ÷ בסיס")}.`;
      }
      if (p.shape === "trapezoid") {
        return mix`בטרפז קודם ${M("(בסיס 1 + בסיס 2)")}, אחר כך קשרו לשטח וחלקו - גובה = ${M("(שטח × 2) ÷ (סכום הבסיסים)")}.`;
      }
      return "בודדים גובה מהנוסחה לשטח של אותה צורה.";

    case "tiling":
      return mix`בריצוף סביב נקודה סכום הזוויות החוצות חייב להסתדר ל‑${M("360°")}. מה הזווית הפנימית הבולטת של הצורה בשאלה?`;

    case "circles":
      return p.askArea
        ? `שואלים שטח: ${M("π × רדיוס²")}. שואלים היקף: ${M("2 × π × רדיוס")}. בדקו מה המילה בשאלה.`
        : `שואלים היקף (ליניארי ברדיוס): ${M("2πr")}. שטח משתמש ברדיוס בריבוע: ${M("πr²")}.`;

    case "solids":
      return "קשרו את התיאור (פאות, בסיס עגול, קודקוד) לרשימת הגופים - לא לפי שם אחד בלבד.";

    default:
      return "נסה לזהות איזו נוסחה או תכונה מתאימה לניסוח השאלה.";
  }
  return "נסה לזהות איזו נוסחה או תכונה מתאימה לניסוח השאלה.";
}

// הסבר מפורט צעד-אחר-צעד לפי נושא וכיתה
export function getSolutionSteps(question, topic, gradeKey) {
  if (!question || !question.params) return [];
  const p = question.params;
  const shape = question.shape;
  const { correctAnswer } = question;

  switch (topic) {
    case "area": {
      if (shape === "square") {
        return [
          toSpan(
            mix`1. זיהוי: ריבוע - כל הצלעות באותו אורך. שטח = כמה מרחב בפנים (לא היקף סביב). נוסחה: שטח = צלע × צלע.`,
            "1"
          ),
          toSpan(mix`2. נציב: ${M(`שטח = ${p.side} × ${p.side}`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`${p.side} × ${p.side} = ${correctAnswer}`)}.`, "3"),
          toSpan(mix`4. ${resultPhraseArea(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "rectangle") {
        return [
          toSpan(
            mix`1. זיהוי: מלבן - שני זוגות צלעות שוות. השטח תלוי בשני הממדים השונים (אורך ורוחב), לא בסכום צלעות.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: שטח מלבן = אורך × רוחב.`, "2"),
          toSpan(mix`3. נציב ונחשב: ${M(`${p.length} × ${p.width} = ${correctAnswer}`)}.`, "3"),
          toSpan(mix`4. ${resultPhraseArea(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "triangle") {
        return [
          toSpan(
            mix`1. זיהוי: גובה לבסיס הוא קטע ניצב מהקודקוד אל הבסיס (או המשכו). בלי גובה אנך - לא מחליפים בצלע אחרת.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: שטח משולש = (בסיס × גובה לבסיס) ÷ 2.`, "2"),
          toSpan(mix`3. נציב: ${M(`(${p.base} × ${p.height}) ÷ 2`)}.`, "3"),
          toSpan(
            mix`4. נחשב: ${M(`${p.base} × ${p.height} = ${p.base * p.height}`)}, ואז ${M(`${p.base * p.height} ÷ 2 = ${correctAnswer}`)}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseArea(question, correctAnswer)}`, "5"),
        ];
      }
      if (shape === "parallelogram") {
        return [
          toSpan(
            mix`1. זיהוי: הגובה במקבילית הוא המרחק האנך בין הבסיס לצלע הנגדית - לא אורך הצלע המוסטת.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: שטח מקבילית = בסיס × גובה (אנך).`, "2"),
          toSpan(mix`3. נציב: ${M(`${p.base} × ${p.height}`)}.`, "3"),
          toSpan(mix`4. נחשב: ${M(`${p.base} × ${p.height} = ${correctAnswer}`)}.`, "4"),
          toSpan(mix`5. ${resultPhraseArea(question, correctAnswer)}`, "5"),
        ];
      }
      if (shape === "trapezoid") {
        const sumBases = p.base1 + p.base2;
        return [
          toSpan(
            mix`1. זיהוי: בטרפז שני בסיסים מקבילים; הגובה הוא המרחק האנך ביניהם. קודם ממוצע של הבסיסים, כפול גובה, חלקי 2.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: שטח טרפז = ((בסיס 1 + בסיס 2) × גובה) ÷ 2.`, "2"),
          toSpan(mix`3. נציב: ${M(`((${p.base1} + ${p.base2}) × ${p.height}) ÷ 2`)}.`, "3"),
          toSpan(
            mix`4. נחשב: ${M(`${p.base1} + ${p.base2} = ${sumBases}`)}, ואז ${M(`(${sumBases} × ${p.height}) ÷ 2 = ${correctAnswer}`)}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseArea(question, correctAnswer)}`, "5"),
        ];
      }
      if (shape === "circle") {
        const r2 = p.radius * p.radius;
        return [
          toSpan(
            mix`1. זיהוי: רדיוס מהמרכז לשפה. שטח משתמש ב r² (ריבוע), היקף ב r בלי ריבוע - לא לבלבל ביניהם.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: שטח עיגול = π × רדיוס² (כאן π ≈ 3.14).`, "2"),
          toSpan(mix`3. נציב: ${M(`שטח = 3.14 × ${p.radius}²`)}.`, "3"),
          toSpan(
            mix`4. נחשב: ${M(`${p.radius}² = ${r2}`)}, ואז ${M(`3.14 × ${r2} = ${correctAnswer}`)}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseArea(question, correctAnswer)}`, "5"),
        ];
      }
      break;
    }

    case "perimeter": {
      if (shape === "square") {
        return [
          toSpan(mix`1. נוסחה: היקף ריבוע = צלע × 4.`, "1"),
          toSpan(mix`2. נציב: ${M(`${p.side} × 4`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`${p.side} × 4 = ${correctAnswer}`)}.`, "3"),
          toSpan(mix`4. ${resultPhraseLength(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "rectangle") {
        const sum = p.length + p.width;
        return [
          toSpan(mix`1. נוסחה: היקף מלבן = (אורך + רוחב) × 2.`, "1"),
          toSpan(mix`2. נציב: ${M(`(${p.length} + ${p.width}) × 2`)}.`, "2"),
          toSpan(
            mix`3. נחשב: ${M(`${p.length} + ${p.width} = ${sum}`)}, ואז ${M(`${sum} × 2 = ${correctAnswer}`)}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseLength(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "triangle") {
        return [
          toSpan(mix`1. נוסחה: היקף משולש = צלע 1 + צלע 2 + צלע 3.`, "1"),
          toSpan(
            mix`2. נציב: ${M(`${p.side1} + ${p.side2} + ${p.side3}`)}.`,
            "2"
          ),
          toSpan(
            mix`3. נחשב: ${M(`${p.side1} + ${p.side2} + ${p.side3} = ${correctAnswer}`)}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseLength(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "circle") {
        return [
          toSpan(mix`1. נוסחה: היקף עיגול = 2 × π × רדיוס.`, "1"),
          toSpan(mix`2. נציב: ${M(`2 × 3.14 × ${p.radius}`)}.`, "2"),
          toSpan(
            mix`3. נחשב: ${M(`2 × 3.14 = 6.28`)}, ואז ${M(`6.28 × ${p.radius} = ${correctAnswer}`)}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseLength(question, correctAnswer)}`, "4"),
        ];
      }
      break;
    }

    case "volume": {
      if (p.kind === "pyramid_volume_square") {
        const bs = p.baseSide;
        const h = p.height;
        const baseArea = bs * bs;
        const volRaw = (baseArea * h) / 3;
        return [
          toSpan(mix`1. נוסחה: נפח פירמידה = (1/3) × שטח בסיס × גובה.`, "1"),
          toSpan(mix`2. בסיס ריבועי: שטח בסיס = צלע × צלע.`, "2"),
          toSpan(
            mix`3. נציב: ${M(`שטח בסיס = ${bs} × ${bs} = ${baseArea}`)}, גובה ${M(String(h))}.`,
            "3"
          ),
          toSpan(
            mix`4. נחשב: ${M(`(1/3) × ${baseArea} × ${h} = ${volRaw}`)} → מעוגל לפי השאלה: ${M(String(correctAnswer))}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseVolume(question, correctAnswer)}`, "5"),
        ];
      }
      if (p.kind === "pyramid_volume_rectangular") {
        const b1 = p.baseSide;
        const b2 = p.baseWidth;
        const h = p.height;
        const baseArea = b1 * b2;
        const volRaw = (baseArea * h) / 3;
        return [
          toSpan(mix`1. נוסחה: נפח פירמידה = (1/3) × שטח בסיס × גובה.`, "1"),
          toSpan(mix`2. בסיס מלבני: שטח בסיס = אורך × רוחב.`, "2"),
          toSpan(
            mix`3. נציב: ${M(`${b1} × ${b2} = ${baseArea}`)}, גובה ${M(String(h))}.`,
            "3"
          ),
          toSpan(
            mix`4. נחשב: ${M(`(1/3) × ${baseArea} × ${h} = ${volRaw}`)} → ${M(String(correctAnswer))}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseVolume(question, correctAnswer)}`, "5"),
        ];
      }
      if (p.kind === "cone_volume") {
        const r = p.radius;
        const h = p.height;
        const r2 = r * r;
        const volRaw = (3.14 * r2 * h) / 3;
        return [
          toSpan(mix`1. נוסחה: נפח חרוט = (1/3) × π × רדיוס² × גובה (π ≈ 3.14).`, "1"),
          toSpan(mix`2. נציב: ${M(`(1/3) × 3.14 × ${r}² × ${h}`)}.`, "2"),
          toSpan(
            mix`3. נחשב: ${M(`${r}² = ${r2}`)}, ${M(`3.14 × ${r2} × ${h} = ${3.14 * r2 * h}`)}, חלקי 3 ≈ ${M(String(volRaw))}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseVolumeRounded(question, correctAnswer)}`, "4"),
        ];
      }
      if (p.kind === "prism_volume_triangle") {
        const b = p.base;
        const bh = p.baseHeight;
        const h = p.height;
        const baseArea = (b * bh) / 2;
        const prod = baseArea * h;
        return [
          toSpan(mix`1. נוסחה: נפח מנסרה = שטח בסיס × גובה המנסרה.`, "1"),
          toSpan(mix`2. בסיס משולש: שטח = (בסיס × גובה לבסיס) ÷ 2.`, "2"),
          toSpan(
            mix`3. שטח בסיס: ${M(`(${b} × ${bh}) ÷ 2 = ${baseArea}`)}.`,
            "3"
          ),
          toSpan(
            mix`4. נפח: ${M(`${baseArea} × ${h} = ${prod}`)} → ${correctAnswer}${geometryVolumeSuffix(question)}.`,
            "4"
          ),
        ];
      }
      if (p.kind === "prism_volume_rectangular") {
        const L = p.baseLength;
        const W = p.baseWidth;
        const h = p.height;
        const baseArea = L * W;
        const prod = baseArea * h;
        return [
          toSpan(mix`1. נוסחה: נפח מנסרה = שטח בסיס × גובה.`, "1"),
          toSpan(mix`2. בסיס מלבני: ${M(`${L} × ${W} = ${baseArea}`)}.`, "2"),
          toSpan(mix`3. נפח: ${M(`${baseArea} × ${h} = ${prod}`)}.`, "3"),
          toSpan(mix`4. ${resultPhraseVolume(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "cube") {
        return [
          toSpan(
            mix`1. זיהוי: קובייה - שלושה ממדים זהים. נפח = כמה 'קוביות יחידה' נכנסות בפנים; לא שטח של פאה ולא היקף.`,
            "1"
          ),
          toSpan(mix`2. נוסחה: נפח קובייה = צלע × צלע × צלע = צלע³.`, "2"),
          toSpan(mix`3. נציב: ${M(`${p.side}³`)}.`, "3"),
          toSpan(
            mix`4. נחשב: ${M(`${p.side} × ${p.side} × ${p.side} = ${correctAnswer}`)}.`,
            "4"
          ),
          toSpan(mix`5. ${resultPhraseVolume(question, correctAnswer)}`, "5"),
        ];
      }
      if (shape === "rectangular_prism") {
        const product = p.length * p.width * p.height;
        return [
          toSpan(mix`1. נוסחה: נפח תיבה = אורך × רוחב × גובה.`, "1"),
          toSpan(mix`2. נציב: ${M(`${p.length} × ${p.width} × ${p.height}`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`${p.length} × ${p.width} × ${p.height} = ${product}`)}.`, "3"),
          toSpan(mix`4. ${resultPhraseVolume(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "cylinder") {
        const r2 = p.radius * p.radius;
        return [
          toSpan(mix`1. נוסחה: נפח גליל = π × רדיוס² × גובה.`, "1"),
          toSpan(mix`2. נציב: ${M(`3.14 × ${p.radius}² × ${p.height}`)}.`, "2"),
          toSpan(
            mix`3. נחשב: ${M(`${p.radius}² = ${r2}`)}, ואז ${M(`3.14 × ${r2} × ${p.height} = ${correctAnswer}`)}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseVolume(question, correctAnswer)}`, "4"),
        ];
      }
      if (shape === "sphere") {
        const r3 = p.radius * p.radius * p.radius;
        return [
          toSpan(mix`1. נוסחה: נפח כדור = (4/3) × π × רדיוס³.`, "1"),
          toSpan(mix`2. נציב: ${M(`(4/3) × 3.14 × ${p.radius}³`)}.`, "2"),
          toSpan(
            mix`3. נחשב: ${M(`${p.radius}³ = ${r3}`)}, ואז ${M(`(4/3) × 3.14 × ${r3} = ${correctAnswer}`)}.`,
            "3"
          ),
          toSpan(mix`4. ${resultPhraseVolume(question, correctAnswer)}`, "4"),
        ];
      }
      break;
    }

    case "angles": {
      const angle1 = p.angle1 || 0;
      const angle2 = p.angle2 || 0;
      const sum = angle1 + angle2;
      return [
        toSpan(
          mix`1. נזכור: סכום שלוש הזוויות הפנימיות במשולש תמיד 180° - לא לבלבל עם זווית ישרה בודדת (90°).`,
          "1"
        ),
        toSpan(
          mix`2. מה מצוין בשאלה: ${M(`זווית 1 = ${angle1}°`)} ו-${M(`זווית 2 = ${angle2}°`)} - מחפשים את הזווית השלישית.`,
          "2"
        ),
        toSpan(
          mix`3. נחשב: ${M(`180° - (${angle1}° + ${angle2}°) = 180° - ${sum}° = ${correctAnswer}°`)}.`,
          "3"
        ),
        toSpan(mix`4. הזווית החסרה היא ${correctAnswer}°.`, "4"),
      ];
    }

    case "pythagoras": {
      const a = p.a || 0;
      const b = p.b || 0;
      const c = p.c || 0;
      const kind = p.kind || (p.which ? "pythagoras_leg" : "pythagoras_hyp");

      // מצב 1 – מוצאים יתר (קלאסי)
      if (kind === "pythagoras_hyp" || !p.which) {
        const a2 = a * a;
        const b2 = b * b;
        const sum = a2 + b2;
        return [
          toSpan(
            mix`1. במשולש ישר זווית: שתי הצלעות שליד הזווית הישרה הן ניצבים; היתר נגד הזווית הישרה והוא הצלע הארוכה ביותר. נוסחה: a² + b² = c².`,
            "1"
          ),
          toSpan(mix`2. נציב את הניצבים: ${M(`${a}² + ${b}² = c²`)}.`, "2"),
          toSpan(mix`3. נחשב ריבועים: ${M(`${a}² = ${a2}`)} ו-${M(`${b}² = ${b2}`)}.`, "3"),
          toSpan(mix`4. נחבר: ${M(`${a2} + ${b2} = ${sum}`)}.`, "4"),
          toSpan(
            mix`5. נוציא שורש ליתר: ${M(`c = √${sum} = ${correctAnswer}`)}${geometryLengthSuffix(question)}.`,
            "5"
          ),
        ];
      }

      // מצב 2 – מוצאים ניצב חסר (מתקדם יותר)
      const c2 = c * c;
      const missingLeg = p.which === "leg_a" ? "a" : "b";
      const knownLegValue = p.which === "leg_a" ? b : a;
      const known2 = knownLegValue * knownLegValue;
      const diff = c2 - known2;

      return [
        toSpan(
          mix`1. אותה נוסחה a² + b² = c² - כשמחפשים ניצב, מבודדים את הריבוע שלו: ריבוע היתר מינוס ריבוע הניצב הידוע.`,
          "1"
        ),
        toSpan(
          mix`2. כאן מחפשים את ${missingLeg}, לכן ${M(`${missingLeg}² = c² - ${knownLegValue}²`)} (לא לחבר את הניצבים אם חסר צלע אחת).`,
          "2"
        ),
        toSpan(mix`3. נחשב ריבועים: ${M(`${c}² = ${c2}`)} ו-${M(`${knownLegValue}² = ${known2}`)}.`, "3"),
        toSpan(mix`4. נחסיר: ${M(`${c2} - ${known2} = ${diff}`)}.`, "4"),
        toSpan(
          mix`5. ניצב חסר: ${M(`${missingLeg} = √${diff} = ${correctAnswer}`)}${geometryLengthSuffix(question)}.`,
          "5"
        ),
      ];
    }

    case "shapes_basic": {
      if (p.kind === "shapes_basic_square" || p.kind === "shapes_basic_rectangle") {
        const shapeName = p.shape || "ריבוע";
        return [
          toSpan(mix`1. בודקים את אורכי הצלעות מהנתונים - מופיעה הצורה "${shapeName}".`, "1"),
          toSpan(
            shapeName === "ריבוע"
              ? "2. בריבוע ארבע הצלעות באותו אורך."
              : "2. במלבן יש שני אורכים שונים, כל אחד מופיע בזוג נגדי.",
            "2"
          ),
          toSpan(mix`3. בוחרים את שם הצורה המתאים - "${shapeName}".`, "3"),
          toSpan(mix`4. לכן התשובה הנכונה היא "${shapeName}".`, "4"),
        ];
      }
      if (p.kind === "shapes_basic_properties_square") {
        return [
          toSpan(mix`1. שואלים כמה צלעות שוות יש בריבוע - לא היקף ולא שטח.`, "1"),
          toSpan(mix`2. בריבוע כל ארבע הצלעות באותו אורך.`, "2"),
          toSpan(
            mix`3. מספר הצלעות השוות הוא ${correctAnswer} - בוחרים את ערך התשובה הזה מבין האפשרויות.`,
            "3"
          ),
        ];
      }
      if (p.kind === "shapes_basic_properties_rectangle") {
        return [
          toSpan(mix`1. שואלים כמה זוגות של צלעות שוות יש במלבן.`, "1"),
          toSpan(mix`2. במלבן שני אורכים שונים; כל אורך מופיע בדיוק בזוג נגדי.`, "2"),
          toSpan(
            mix`3. נוצרים בדיוק שני זוגות שווים - התשובה המספרית היא ${correctAnswer}.`,
            "3"
          ),
        ];
      }
      if (p.kind === "shapes_basic_properties_angles") {
        const shapeName = p.shape || "ריבוע";
        return [
          toSpan(mix`1. ${shapeName} מרובע עם ארבע זוויות פנימיות.`, "1"),
          toSpan(mix`2. בריבוע ובמלבן כל ארבע הזוויות ישרות (90°).`, "2"),
          toSpan(
            mix`3. מספר הזוויות הישרות: ${correctAnswer} - בוחרים ערך זה בתשובות.`,
            "3"
          ),
        ];
      }
      return [];
    }

    case "parallel_perpendicular": {
      const type = p.type || "מקבילות";
      const opt = type === "מקבילות" ? "1 (מקבילות)" : "2 (מאונכות)";
      return [
        toSpan(mix`1. בשאלה מופיע השם: "${type}".`, "1"),
        toSpan(
          type === "מקבילות"
            ? "2. קווים מקבילים באותו מישור לא נחתכים ומרחקם קבוע."
            : "2. קווים מאונכים נחתכים בזווית ישרה (90°).",
          "2"
        ),
        toSpan(
          mix`3. לפי מפתח התשובות בשאלה: 1 = מקבילות, 2 = מאונכות.`,
          "3"
        ),
        toSpan(mix`4. התאמה: ${opt}.`, "4"),
      ];
    }

    case "triangles": {
      const type = p.type || "שווה צלעות";
      const idx =
        type === "שווה צלעות" ? 1 : type === "שווה שוקיים" ? 2 : 3;
      return [
        toSpan(mix`1. מסווגים את המשולש לפי שוויון אורכי צלעות - השם בשאלה: "${type}".`, "1"),
        toSpan(
          type === "שווה צלעות"
            ? "2. בשווהצלעות כל שלוש הצלעות באותו אורך."
            : type === "שווה שוקיים"
            ? "2. בשווהשוקיים בדיוק שתי צלעות שוות."
            : "2. בשונהצלעות כל שלושת האורכים שונים.",
          "2"
        ),
        toSpan(
          mix`3. מפתח בשאלה: 1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות.`,
          "3"
        ),
        toSpan(mix`4. לכן האפשרות הנכונה היא ${idx}.`, "4"),
      ];
    }

    case "quadrilaterals": {
      const type = p.type || "ריבוע";
      const types = ["ריבוע", "מלבן", "מקבילית", "טרפז"];
      const idx = Math.max(1, types.indexOf(type) + 1);
      return [
        toSpan(mix`1. מזהים מרובע לפי צלעות וזוויות - כאן: "${type}".`, "1"),
        toSpan(
          type === "ריבוע"
            ? "2. ריבוע: ארבע צלעות שוות וארבע זוויות ישרות."
            : type === "מלבן"
            ? "2. מלבן: שני זוגות צלעות שוות וארבע זוויות ישרות."
            : type === "מקבילית"
            ? "2. מקבילית: כל צלע מקבילה לצלע נגדית (לא בהכרח ישרות בפינות)."
            : "2. טרפז: זוג אחד של צלעות מקבילות (הבסיסים).",
          "2"
        ),
        toSpan(
          mix`3. מפתח: 1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז.`,
          "3"
        ),
        toSpan(mix`4. המספר שמתאים אל "${type}" הוא ${idx}.`, "4"),
      ];
    }

    case "transformations": {
      const type = p.type || "הזזה";
      const opt = type === "הזזה" ? "1 (הזזה)" : "2 (שיקוף)";
      return [
        toSpan(mix`1. סוג הטרנספורמציה בשאלה: "${type}".`, "1"),
        toSpan(
          type === "הזזה"
            ? "2. הזזה: כל נקודה זזה באותו וקטור - הצורה לא מתהפכת."
            : "2. שיקוף: צורה 'מתהפכת' ביחס לקו - כמו מראה.",
          "2"
        ),
        toSpan(mix`3. במפתח: 1 = הזזה, 2 = שיקוף.`, "3"),
        toSpan(mix`4. לכן בוחרים ${opt}.`, "4"),
      ];
    }

    case "rotation": {
      const angle = p.angle || 90;
      return [
        toSpan(mix`1. סיבוב נמדד במעלות סביב נקודת מרכז.`, "1"),
        toSpan(mix`2. בשאלה מבקשים את זווית הסיבוב - כאן ${angle}°.`, "2"),
        toSpan(
          angle === 90
            ? "3. 90° = רבע סיבוב מלא."
            : angle === 180
            ? "3. 180° = חצי סיבוב."
            : "3. 270° = שלושת רבעי סיבוב.",
          "3"
        ),
        toSpan(mix`4. התשובה במעלות: ${angle}.`, "4"),
      ];
    }

    case "symmetry": {
      const shapeName = p.shape || "ריבוע";
      const axes = p.axes ?? 4;
      return [
        toSpan(mix`1. ציר סימטרייה: קו שמחלק את הצורה לשני חצאים מתאימים (כמו מראה).`, "1"),
        toSpan(
          shapeName === "ריבוע"
            ? "2. בריבוע: 4 צירים - 2 דרך אמצעי צלעות נגדיות ו-2 אלכסונים."
            : shapeName === "מלבן"
            ? "2. במלבן שאינו ריבוע: 2 צירים דרך אמצעי צלעות נגדיות."
            : "2. במשולש שווהצלעות: 3 צירים - מכל קודקוד לאמצע הצלע הנגדית.",
          "2"
        ),
        toSpan(mix`3. ספירה זהירה לפי סוג הצורה "${shapeName}".`, "3"),
        toSpan(mix`4. מספר צירי הסימטרייה: ${axes}.`, "4"),
      ];
    }

    case "diagonal": {
      if (p.kind === "diagonal_square") {
        const side = p.side || 1;
        return [
          toSpan(mix`1. אלכסון הוא קטע המחבר שני קדקודים שאינם על אותה צלע.`, "1"),
          toSpan(mix`2. בריבוע עם צלע ${side}, האלכסון מחושב לפי משפט פיתגורס.`, "2"),
          toSpan(mix`3. נחשב: ${M(`אלכסון = √(${side}² + ${side}²) = √(${side * side * 2}) = ${correctAnswer}`)}.`, "3"),
        ];
      } else if (p.kind === "diagonal_rectangle") {
        const side = p.side || 1;
        const width = p.width || 1;
        return [
          toSpan(mix`1. אלכסון הוא קטע המחבר שני קדקודים שאינם על אותה צלע.`, "1"),
          toSpan(mix`2. במלבן עם אורך ${side} ורוחב ${width}, האלכסון מחושב לפי משפט פיתגורס.`, "2"),
          toSpan(mix`3. נחשב: ${M(`אלכסון = √(${side}² + ${width}²) = √(${side * side + width * width}) = ${correctAnswer}`)}.`, "3"),
        ];
      } else if (p.kind === "diagonal_parallelogram") {
        const side = p.side || 1;
        const width = p.width || 1;
        return [
          toSpan(mix`1. אלכסון הוא קטע המחבר שני קדקודים שאינם על אותה צלע.`, "1"),
          toSpan(mix`2. במקבילית עם צלעות ${side} ו-${width}, האלכסון מחושב לפי משפט פיתגורס.`, "2"),
          toSpan(mix`3. נחשב: ${M(`אלכסון = √(${side}² + ${width}²) = √(${side * side + width * width}) = ${correctAnswer}`)}.`, "3"),
        ];
      }
      return [];
    }

    case "heights": {
      if (p.shape === "triangle") {
        const base = p.base || 1;
        const area = p.area || 1;
        return [
          toSpan(mix`1. גובה במשולש הוא המרחק מהקדקוד לבסיס.`, "1"),
          toSpan(mix`2. נוסחה: שטח = (בסיס × גובה) ÷ 2.`, "2"),
          toSpan(mix`3. נציב: ${M(`${area} = (${base} × גובה) ÷ 2`)}.`, "3"),
          toSpan(mix`4. נחשב: ${M(`גובה = (${area} × 2) ÷ ${base} = ${correctAnswer}`)}.`, "4"),
        ];
      } else if (p.shape === "parallelogram") {
        const base = p.base || 1;
        const area = p.area || 1;
        return [
          toSpan(mix`1. גובה במקבילית הוא המרחק בין שתי הצלעות המקבילות.`, "1"),
          toSpan(mix`2. נוסחה: שטח = בסיס × גובה.`, "2"),
          toSpan(mix`3. נציב: ${M(`${area} = ${base} × גובה`)}.`, "3"),
          toSpan(mix`4. נחשב: ${M(`גובה = ${area} ÷ ${base} = ${correctAnswer}`)}.`, "4"),
        ];
      } else if (p.shape === "trapezoid") {
        const base1 = p.base1 || 1;
        const base2 = p.base2 || 1;
        const area = p.area || 1;
        const sumBases = base1 + base2;
        return [
          toSpan(mix`1. גובה בטרפז הוא המרחק בין שתי הבסיסים המקבילים.`, "1"),
          toSpan(mix`2. נוסחה: שטח = ((בסיס 1 + בסיס 2) × גובה) ÷ 2.`, "2"),
          toSpan(mix`3. נציב: ${M(`${area} = ((${base1} + ${base2}) × גובה) ÷ 2`)}.`, "3"),
          toSpan(mix`4. נחשב: ${M(`${base1} + ${base2} = ${sumBases}`)}, ואז ${M(`גובה = (${area} × 2) ÷ ${sumBases} = ${correctAnswer}`)}.`, "4"),
        ];
      }
      return [];
    }

    case "tiling": {
      // tiling_count: כמה אריחים מכסים שטח נתון
      if (p.kind === "tiling_count") {
        const tileSide = p.tileSide || 1;
        const floorL = p.floorL || 1;
        const floorW = p.floorW || 1;
        const tileArea = p.tileArea || tileSide * tileSide;
        const floorArea = p.floorArea || floorL * floorW;
        return [
          toSpan(mix`1. שטח הרצפה: ${M(`${floorL} × ${floorW} = ${floorArea}`)}.`, "1"),
          toSpan(mix`2. שטח אריח אחד: ${M(`${tileSide} × ${tileSide} = ${tileArea}`)}.`, "2"),
          toSpan(mix`3. מספר אריחים: ${M(`${floorArea} ÷ ${tileArea} = ${correctAnswer}`)}.`, "3"),
        ];
      }
      const shape = p.shape || "ריבוע";
      const angle = p.angle || 90;
      return [
        toSpan(mix`1. בריצוף סביב כל קודקוד סכום הזוויות חייב להיות בדיוק 360°.`, "1"),
        toSpan(
          shape === "ריבוע" || shape === "מלבן"
            ? "2. לריבוע ולמלבן זווית פנימית 90° - 4 × 90° = 360°."
            : shape === "משולש שווה צלעות"
            ? "2. במשולש שווה-צלעות זווית פנימית 60° - 6 × 60° = 360°."
            : "2. במשושה זווית פנימית 120° - 3 × 120° = 360°.",
          "2"
        ),
        toSpan(mix`3. בצורה "${shape}" הזווית הפנימית היא ${angle}°.`, "3"),
        toSpan(mix`4. לכן התשובה: ${angle}°.`, "4"),
      ];
    }

    case "circles": {
      const radius = p.radius || 1;
      const askArea = p.askArea;
      if (askArea) {
        const r2 = radius * radius;
        return [
          toSpan(mix`1. נוסחה: שטח עיגול = π × רדיוס².`, "1"),
          toSpan(mix`2. נציב: ${M(`שטח = 3.14 × ${radius}²`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`${radius}² = ${r2}`)}, ואז ${M(`3.14 × ${r2} = ${correctAnswer}`)}.`, "3"),
        ];
      } else {
        return [
          toSpan(mix`1. נוסחה: היקף מעגל = 2 × π × רדיוס.`, "1"),
          toSpan(mix`2. נציב: ${M(`2 × 3.14 × ${radius}`)}.`, "2"),
          toSpan(mix`3. נחשב: ${M(`2 × 3.14 = 6.28`)}, ואז ${M(`6.28 × ${radius} = ${correctAnswer}`)}.`, "3"),
        ];
      }
    }

    case "solids": {
      const solid = p.solid || "קובייה";
      const kind = p.kind || "solids";

      if (kind === "solids_faces") {
        const faces = p.faces ?? correctAnswer;
        return [
          toSpan(mix`1. שאלה: כמה פאות יש ל${solid}?`, "1"),
          toSpan(mix`2. סופרים כל משטח שטוח או מעוגל של הגוף.`, "2"),
          toSpan(mix`3. ל${solid} יש ${faces} פאות.`, "3"),
        ];
      }

      if (kind === "solids_vertices") {
        const vertices = p.vertices ?? correctAnswer;
        return [
          toSpan(mix`1. שאלה: כמה קודקודים יש ל${solid}?`, "1"),
          toSpan(mix`2. קודקוד = נקודה שבה נפגשות לפחות שתי צלעות.`, "2"),
          toSpan(mix`3. ל${solid} יש ${vertices} קודקודים.`, "3"),
        ];
      }

      if (kind === "solids_edges") {
        const edges = p.edges ?? correctAnswer;
        return [
          toSpan(mix`1. שאלה: כמה צלעות יש ל${solid}?`, "1"),
          toSpan(mix`2. צלע = קו שבו נפגשות שתי פאות.`, "2"),
          toSpan(mix`3. ל${solid} יש ${edges} צלעות.`, "3"),
        ];
      }

      // זיהוי גוף לפי תיאור (kind: "solids")
      const desc = p.desc || "";
      const key =
        solid === "קובייה"
          ? "6 פאות ריבוע זהות - מפתח 1."
          : solid === "תיבה"
          ? "6 פאות מלבן (לא בהכרח ריבועים) - מפתח 2."
          : solid === "גליל"
          ? "2 בסיסים עגולים ומעטפת מעוקמת - מפתח 3."
          : solid === "פירמידה"
          ? "בסיס מצולע ופאות משולשות הפוגשות קודקוד - מפתח 4."
          : solid === "חרוט"
          ? "בסיס עגול וקודקוד יחיד - מפתח 5."
          : solid === "כדור"
          ? "כל הנקודות על פני השטח במרחק קבוע מהמרכז - מפתח 6."
          : "התאימו תיאור לגוף.";
      return [
        toSpan(mix`1. בתיאור: "${desc}".`, "1"),
        toSpan(mix`2. מזהים לפי מאפיינים: ${key}`, "2"),
        toSpan(mix`3. שם הגוף התואם: ${solid}.`, "3"),
      ];
    }

    default:
      return [];
  }

  return [];
}

// "למה טעיתי?" – טעויות נפוצות לפי נושא / צורה / פרמטרים
export function getErrorExplanation(question, topic, wrongAnswer, gradeKey) {
  if (!question) return "";
  const userAnsNum = Number(wrongAnswer);
  const correctNum = Number(question.correctAnswer);
  const sh = question.shape;
  const p = question.params || {};

  switch (topic) {
    case "area": {
      const side = toNum(p.side);
      const L = toNum(p.length);
      const W = toNum(p.width);
      const base = toNum(p.base);
      const ht = toNum(p.height);
      const r = toNum(p.radius);
      if (sh === "square" && side > 0 && userAnsNum === 4 * side) {
        return mix`נראה שחישבת היקף (${M("4 ×")}צלע) במקום שטח (${M("צלע × צלע")}).`;
      }
      if (sh === "rectangle" && L > 0 && W > 0 && userAnsNum === 2 * (L + W)) {
        return mix`נראה שחישבת היקף במקום שטח - כפל ${M("אורך × רוחב")}, לא סכום כפול.`;
      }
      if (sh === "triangle" && base > 0 && ht > 0 && userAnsNum === base * ht) {
        return mix`נראה שכפלת ${M("בסיס × גובה")} אבל שכחת לחלק ב ${M("2")} (נוסחת שטח משולש).`;
      }
      if (sh === "parallelogram" && base > 0 && ht > 0 && userAnsNum === (base * ht) / 2) {
        return mix`במקבילית שטח הבסיס הוא ${M("בסיס × גובה")} - בלי חלוקה ב ${M("2")} (זה נוהג במשולש).`;
      }
      if (sh === "circle" && r > 0 && !Number.isNaN(userAnsNum)) {
        const circ = Math.round(2 * 3.14 * r);
        if (userAnsNum === circ) {
          return mix`נראה שחישבת היקף (${M("2πr")}) במקום שטח (${M("π × רדיוס²")}).`;
        }
        if (userAnsNum === Math.round(3.14 * r)) {
          return mix`בשטח צריך רדיוס בריבוע (${M("πr²")}), לא רק ${M("π × r")}.`;
        }
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum < correctNum) {
        return "תוצאה קטנה מדי: אולי חיסרת כפל, חילקת יותר מדי, או השתמשת בנוסחת היקף.";
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum > correctNum) {
        return "תוצאה גדולה מדי: אולי שכחת לחלק ב 2 במשולש/טרפז, או כפלת פעמיים במקום פעם אחת.";
      }
      return mix`בדוק שזו נוסחת שטח (ולא היקף): ריבוע ${M("צלע²")}, מלבן ${M("אורך×רוחב")}, משולש ${M("(בסיס×גובה)/2")}, עיגול ${M("πr²")}.`;
    }

    case "perimeter": {
      const side = toNum(p.side);
      const L = toNum(p.length);
      const W = toNum(p.width);
      const r = toNum(p.radius);
      if (sh === "square" && side > 0 && userAnsNum === side * side) {
        return mix`נראה שחישבת שטח (${M("צלע²")}) במקום היקף (${M("4 ×")}צלע).`;
      }
      if (sh === "rectangle" && L > 0 && W > 0 && userAnsNum === L * W) {
        return mix`נראה שחישבת שטח (${M("אורך × רוחב")}) במקום היקף (${M("סכום הצלעות × 2")}).`;
      }
      if (sh === "circle" && r > 0) {
        const ar = Math.round(3.14 * r * r);
        if (userAnsNum === ar) {
          return mix`נראה שחישבת שטח מעגל במקום היקף (${M("2πr")}).`;
        }
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum < correctNum) {
        return "היקף קטן מדי: אולי שכחת לכפול ב 2 במלבן או ב 4 בריבוע, או צלע אחת בסכום.";
      }
      return mix`היקף = סכום כל הצלעות (או ${M("2πr")} במעגל) - לא כפל כמו בשטח.`;
    }

    case "volume": {
      const k = p.kind || "";
      if (
        (k === "pyramid_volume_square" || k === "pyramid_volume_rectangular" || k === "cone_volume") &&
        !Number.isNaN(userAnsNum) &&
        !Number.isNaN(correctNum) &&
        correctNum > 0 &&
        Math.abs(userAnsNum - 3 * correctNum) <= 1
      ) {
        return "נראה ששכחת את הגורם ⅓ בפירמידה או בחרוט - הנפח הוא שליש מנפח \"העמוד\" עם אותו בסיס וגובה.";
      }
      if (k === "prism_volume_triangle" || k === "prism_volume_rectangular") {
        const baseA = toNum(p.baseArea);
        const h = toNum(p.height);
        if (baseA > 0 && h > 0 && userAnsNum === Math.round(baseA + h)) {
          return mix`נפח מנסרה = ${M("שטח בסיס × גובה")}, לא סכום שטח + גובה.`;
        }
      }
      if (sh === "cube" && toNum(p.side) > 0 && userAnsNum === toNum(p.side) * toNum(p.side)) {
        return mix`נראה שחישבת ${M("צלע²")} (שטח פאה) במקום ${M("צלע³")} לנפח.`;
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum < correctNum) {
        return "נפח קטן מדי: אולי שכחת ממד אחד בכפל, או יישמת ⅓ כשלא היה צריך (תיבה/מנסרה).";
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum > correctNum) {
        return "נפח גדול מדי: אולי שכחת ⅓ בפירמידה/חרוט, או כפלת ממד פעמיים שלא לצורך.";
      }
      return mix`נפח תיבה/מנסרה: שלושה ממדים בכפל. פירמידה/חרוט: ${M("(⅓)×שטח בסיס×גובה")} (ועם ${M("π")} בחרוט).`;
    }

    case "angles": {
      const a1 = toNum(p.angle1);
      const a2 = toNum(p.angle2);
      if (!Number.isNaN(userAnsNum) && !Number.isNaN(a1) && !Number.isNaN(a2)) {
        if (userAnsNum === a1 + a2) {
          return mix`חיברת את שתי הזוויות - צריך לחסר את הסכום מ ${M("180°")}.`;
        }
        if (userAnsNum === 180 - Math.abs(a1 - a2)) {
          return mix`בדוק: הזווית השלישית היא ${M("180°")} מינוס סכום שתי הזוויות הנתונות.`;
        }
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum > correctNum) {
        return mix`תוצאה גדולה מדי: אולי חיברת במקום לחסר מ ${M("180°")}.`;
      }
      return mix`במשולש סכום זוויות = ${M("180°")}. הזווית החסרה = ${M("180° − (זווית 1 + זווית 2)")}.`;
    }

    case "pythagoras": {
      const a = toNum(p.a);
      const b = toNum(p.b);
      const c = toNum(p.c);
      if (!Number.isNaN(userAnsNum) && userAnsNum === a + b && p.kind !== "pythagoras_leg") {
        return mix`לא מחברים ניצבים לקבל יתר - צריך ${M("a² + b²")} ואז שורש.`;
      }
      if (p.kind === "pythagoras_leg" && !Number.isNaN(userAnsNum) && userAnsNum === c) {
        return mix`מבקשים ניצב חסר - לרוב ${M("√(c² − ניצב²)")}, לא את אורך היתר עצמו.`;
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum < correctNum) {
        return "תשובה קטנה מדי: אולי שכחת שורש אחרי סכום הריבועים, או שכחת להעלות לריבוע.";
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum > correctNum) {
        return mix`תשובה גדולה מדי: אולי שכפת ריבוע במקום שורש, או חיברת ${M("a+b")} במקום ${M("√(a²+b²)")}.`;
      }
      return mix`משולש ישר זווית: ${M("a² + b² = c²")}. יתר מול הזווית הישרה, ניצבים כותפיים.`;
    }

    case "shapes_basic": {
      if (p.kind === "shapes_basic_square" || p.kind === "shapes_basic_rectangle") {
        const userAns = String(wrongAnswer ?? "").trim();
        if (userAns === "מלבן" && p.shape === "ריבוע") {
          return "כל ארבע הצלעות בריבוע שוות - לא מלבן עם שני אורכים שונים.";
        }
        if (userAns === "ריבוע" && p.shape === "מלבן") {
          return "מלבן נקבע כשיש שני אורכי צלע שונים (שני זוגות) - לא ריבוע.";
        }
        return "השוו בין כל הצלעות: ארבע שוות ⇒ ריבוע; שני אורכים שונים לזוגות ⇒ מלבן.";
      }
      if (p.kind === "shapes_basic_properties_square") {
        return "שואלים כמה צלעות שוות - בריבוע ארבע. אל תערבב עם מספר זוגות או זוויות.";
      }
      if (p.kind === "shapes_basic_properties_rectangle") {
        return "שואלים כמה זוגות צלעות שוות - במלבן יש שני זוגות (ארוך/קצר), לא ארבע צלעות נפרדות.";
      }
      if (p.kind === "shapes_basic_properties_angles") {
        return "בריבוע ומלבן יש ארבע זוויות ישרות - לא שתיים או שלוש.";
      }
      return "הבחנו בין תכונות צלעות לבין זוויות, ובין ריבוע למלבן.";
    }

    case "parallel_perpendicular": {
      if (p.isParallel === true && userAnsNum === 2) {
        return "בשאלה מדובר במקבילים - קווים שלא נפגשים; 2 מסמן כאן מאונכים.";
      }
      if (p.isParallel === false && userAnsNum === 1) {
        return "בשאלה מדובר במאונחים - חיתוך בזווית ישרה; 1 מסמן כאן מקבילים.";
      }
      return mix`מקבילים: לא נפגשים באותו מישור. מאונחים: חיתוך ב ${M("90°")}.`;
    }

    case "triangles":
      return mix`המספר בשאלה חייב להתאים לשם המשפחה: ${M("1 שווהצלעות (כולן שוות), 2 שווהשוקיים (שתיים שוות), 3 שונהצלעות")}.`;

    case "quadrilaterals":
      return "בדקו זוגות צלעות מקבילות וזוויות: ריבוע/מלבן - ארבע ישרות; מקבילית - שני זוגות מקבילים; טרפז - זוג בסיסים מקבילים אחד.";

    case "transformations":
      if (!Number.isNaN(userAnsNum) && userAnsNum === 2 && p.isTranslation) {
        return "הזזה היא אפשרות 1 בשאלה - לא שיקוף.";
      }
      if (!Number.isNaN(userAnsNum) && userAnsNum === 1 && p.isTranslation === false) {
        return "שיקוף הוא אפשרות 2 - לא הזזה.";
      }
      return "הזזה שומרת כיוון קריאת צורה; שיקוף יוצר תמונת מראה.";

    case "rotation":
      if (!Number.isNaN(userAnsNum) && [90, 180, 270].includes(userAnsNum) && userAnsNum !== correctNum) {
        return mix`בדקו אם נדרש רבע סיבוב (${M("90°")}), חצי (${M("180°")}) או שלושת רבעים (${M("270°")}).`;
      }
      return "סיבוב נמדד במעלות מלאות סביב נקודה - התאימו לניסוח השאלה.";

    case "symmetry": {
      const ax = toNum(p.axes);
      if (!Number.isNaN(userAnsNum) && !Number.isNaN(ax) && userAnsNum === ax + 1) {
        return "אולי ספרת ציר אחד כפול - ספרו רק צירי סימטרייה אמיתיים לצורה.";
      }
      return mix`ריבוע ${M("4")}, מלבן (לא ריבוע) ${M("2")}, משולש שווהצלעות ${M("3")} - לפי צורת השאלה.`;
    }

    case "diagonal":
      if (p.kind === "diagonal_square") {
        const s = toNum(p.side);
        if (s > 0 && userAnsNum === 2 * s) {
          return mix`אולי הכפלת צלע ב ${M("2")} - באלכסון ריבוע משתמשים ב ${M("√2 × צלע")}.`;
        }
        if (s > 0 && userAnsNum === s * s) {
          return mix`אלכסון אינו שטח הצלע - נסו ${M("√(צלע²+צלע²)")} או ${M("צלע×√2")}.`;
        }
        return mix`אלכסון בריבוע: ${M("צלע × √2")} (משולש ישר זווית עם שני ניצבים שווים).`;
      }
      if (p.kind === "diagonal_rectangle" || p.kind === "diagonal_parallelogram") {
        return mix`השתמשו בפיתגורס עם שני הניצבים מהשאלה - ${M("√(אורך² + רוחב²)")}.`;
      }
      return "אלכסון כיתר במשולש ישר זווית שנבנה מהצלעות.";

    case "heights": {
      if (p.shape === "triangle") {
        const ba = toNum(p.base);
        const ar = toNum(p.area);
        if (ba > 0 && ar > 0 && userAnsNum === Math.round(ar / ba)) {
          return "אולי חילקת שטח בבסיס בלי להכפיל קודם את השטח ב 2 (נוסחת המשולש).";
        }
        return mix`גובה במשולש: ${M("(שטח × 2) ÷ בסיס")}.`;
      }
      if (p.shape === "parallelogram") {
        const ba = toNum(p.base);
        const ar = toNum(p.area);
        if (ba > 0 && ar > 0 && userAnsNum === Math.round((ar * 2) / ba)) {
          return mix`במקבילית אין חלוקה ב ${M("2")} בשטח - גובה = ${M("שטח ÷ בסיס")}.`;
        }
        return mix`גובה במקבילית: ${M("שטח ÷ בסיס")}.`;
      }
      if (p.shape === "trapezoid") {
        return "בטרפז חייבים לחבר תחילה את שני הבסיסים בשטח לפני שמבודדים גובה.";
      }
      return "בודדים גובה מהיפוך נוסחת השטח של אותה צורה.";
    }

    case "tiling": {
      if (!Number.isNaN(userAnsNum) && userAnsNum === 360) {
        return mix`${M("360°")} הוא סכום סביב נקודה - לא גודל זווית הבסיס של צורת הריצוף.`;
      }
      return mix`זווית הריצוף היא הזווית הפנימית של צורת האריח (ריבוע ${M("90°")}, משולש שווהצלעות ${M("60°")}, משושה ${M("120°")}).`;
    }

    case "circles": {
      if (p.askArea) {
        const r = toNum(p.radius);
        const circ = Math.round(2 * 3.14 * r);
        if (userAnsNum === circ) {
          return mix`נתון שטח אך חישבת כמו היקף - השתמשו ב ${M("π × רדיוס²")}.`;
        }
        return mix`שטח: ${M("πr²")}. אם קיבלתם קטן מדי - אולי שכחתם להעלות את ${M("r")} בריבוע.`;
      }
      const r = toNum(p.radius);
      const ar = Math.round(3.14 * r * r);
      if (userAnsNum === ar) {
        return mix`נתון היקף אך חישבת כמו שטח - השתמשו ב ${M("2πr")}.`;
      }
      return mix`הבחנה: ${M("שטח ∝ r², היקף ∝ r")} - אל תבלבלו בין הנוסחאות.`;
    }

    case "solids":
      return "התאימו את תיאור הפאות והבסיס בשאלה לגוף ברשימה - קובייה (6 ריבועים זהים), תיבה (מלבנים), גליל (2 עיגולים), פירמידה (בסיס+משולשים), חרוט (עיגול+קודקוד), כדור.";

    default:
      return "";
  }
}

/**
 * שלבים אל UI של נגן ההסבר (כמו math animationSteps): כל פריט = צעד אחד עם כותרת ותוכן.
 */
export function buildGeometryAnimationSteps(question, topic, gradeKey) {
  const slides = getSolutionSteps(question, topic, gradeKey);
  if (!Array.isArray(slides) || slides.length === 0) return [];
  return enrichGeometryAnimationSteps(question, topic, gradeKey, slides);
}

// תקציר תיאורטי קצר לפי נושא וכיתה – מוצג לפני השאלה במצב Learning
export function getTheorySummary(question, topic, gradeKey) {
  if (!question) return null;

  const lines = [];

  switch (topic) {
    case "area": {
      lines.push("שטח מודד כמה מקום תופסת צורה על המשטח.");
      if (gradeKey === "g2" || gradeKey === "g3") {
        lines.push("ריבוע: שטח = צלע × צלע.");
        lines.push("מלבן: שטח = אורך × רוחב.");
      } else if (gradeKey === "g4") {
        lines.push("ריבוע: שטח = צלע × צלע.");
        lines.push("מלבן: שטח = אורך × רוחב.");
        lines.push("משולש: שטח = (בסיס × גובה) ÷ 2.");
      } else if (gradeKey === "g5") {
        lines.push("ריבוע: שטח = צלע × צלע.");
        lines.push("מלבן: שטח = אורך × רוחב.");
        lines.push("משולש: שטח = (בסיס × גובה) ÷ 2.");
        lines.push("מקבילית: שטח = בסיס × גובה.");
        lines.push("טרפז: שטח = ((בסיס 1 + בסיס 2) × גובה) ÷ 2.");
      } else {
        // g6
        lines.push("ריבוע: שטח = צלע².");
        lines.push("מלבן: שטח = אורך × רוחב.");
        lines.push("משולש: שטח = (בסיס × גובה) ÷ 2.");
        lines.push("מקבילית: שטח = בסיס × גובה.");
        lines.push("טרפז: שטח = ((בסיס 1 + בסיס 2) × גובה) ÷ 2.");
        lines.push("עיגול: שטח = π × רדיוס².");
      }
      break;
    }

    case "perimeter": {
      lines.push("היקף מודד את אורך המסלול שמקיף את הצורה.");
      lines.push("תמיד מחברים את כל הצלעות.");
      if (gradeKey === "g2" || gradeKey === "g3") {
        lines.push("ריבוע: היקף = צלע × 4.");
        lines.push("מלבן: היקף = (אורך + רוחב) × 2.");
      } else {
        lines.push("בכל צורה: היקף = סכום אורכי כל הצלעות.");
        if (gradeKey === "g4" || gradeKey === "g5" || gradeKey === "g6") {
          lines.push("עיגול: היקף = 2 × π × רדיוס.");
        }
      }
      break;
    }

    case "volume": {
      lines.push("נפח מודד כמה מקום תופס גוף במרחב (תלת-מימד).");
      if (gradeKey === "g5") {
        lines.push("קובייה: נפח = צלע³.");
        lines.push("תיבה (מלבנית): נפח = אורך × רוחב × גובה.");
      } else {
        // g6
        lines.push("קובייה: נפח = צלע³.");
        lines.push("תיבה: נפח = אורך × רוחב × גובה.");
        lines.push("גליל: נפח = π × רדיוס² × גובה.");
        lines.push("כדור: נפח = (4/3) × π × רדיוס³.");
      }
      break;
    }

    case "angles": {
      lines.push("בכל משולש: סכום הזוויות הפנימיות הוא 180°.");
      lines.push("אם שתי זוויות ידועות – מוצאים את השלישית בעזרת 180° פחות הסכום שלהן.");
      break;
    }

    case "pythagoras": {
      lines.push("במשולש ישר-זווית: a² + b² = c² (c הוא היתר).");
      lines.push("אם יודעים את שני הניצבים – מוצאים יתר: c = √(a² + b²).");
      lines.push("אם יודעים יתר וניצב – מוצאים ניצב חסר: √(c² - ניצב²).");
      break;
    }

    case "shapes_basic": {
      if (gradeKey === "g1") {
        lines.push("ריבוע: 4 צלעות שוות, 4 זוויות ישרות.");
        lines.push("מלבן: 2 זוגות של צלעות שוות, 4 זוויות ישרות.");
      } else {
        // כיתה ד' - תכונות
        lines.push("ריבוע: 4 צלעות שוות, 4 זוויות ישרות (90°).");
        lines.push("מלבן: 2 זוגות של צלעות שוות, 4 זוויות ישרות (90°).");
        lines.push("ריבוע: כל 4 הצלעות שוות באורכן.");
        lines.push("מלבן: יש 2 זוגות של צלעות שוות (זוג אחד ארוך וזוג אחד קצר).");
      }
      break;
    }

    case "parallel_perpendicular": {
      lines.push("קווים מקבילים: לא נפגשים לעולם.");
      lines.push("קווים מאונכים: יוצרים זווית ישרה (90°).");
      break;
    }

    case "triangles": {
      lines.push("משולש שווה צלעות: כל 3 הצלעות שוות.");
      lines.push("משולש שווה שוקיים: 2 צלעות שוות.");
      lines.push("משולש שונה צלעות: כל הצלעות שונות.");
      break;
    }

    case "quadrilaterals": {
      lines.push("ריבוע: 4 צלעות שוות, 4 זוויות ישרות.");
      lines.push("מלבן: 2 זוגות של צלעות שוות, 4 זוויות ישרות.");
      lines.push("מקבילית: 2 זוגות של צלעות מקבילות.");
      lines.push("טרפז: זוג אחד של צלעות מקבילות.");
      break;
    }

    case "transformations": {
      lines.push("הזזה: מעתיקה את הצורה באותו כיוון ובאותו מרחק.");
      lines.push("שיקוף: הופך את הצורה סביב קו (ציר).");
      break;
    }

    case "rotation": {
      lines.push("סיבוב: מעביר את הצורה סביב נקודה.");
      lines.push("סיבוב של 90° = רבע סיבוב, 180° = חצי סיבוב, 360° = סיבוב שלם.");
      break;
    }

    case "symmetry": {
      lines.push("סימטרייה: צורה שיש לה ציר סימטרייה.");
      lines.push("ריבוע: 4 צירי סימטרייה, מלבן: 2 צירי סימטרייה.");
      break;
    }

    case "diagonal": {
      lines.push("אלכסון: קטע המחבר שני קדקודים שאינם על אותה צלע.");
      lines.push("ריבוע: אלכסון = צלע × √2.");
      lines.push("מלבן: אלכסון = √(אורך² + רוחב²).");
      lines.push("מקבילית: אלכסון = √(צלע 1² + צלע 2²).");
      break;
    }

    case "heights": {
      lines.push("גובה: המרחק מהקדקוד לבסיס (במשולש) או המרחק בין צלעות מקבילות (במקבילית/טרפז).");
      lines.push("משולש: שטח = (בסיס × גובה) ÷ 2, אז גובה = (שטח × 2) ÷ בסיס.");
      lines.push("מקבילית: שטח = בסיס × גובה, אז גובה = שטח ÷ בסיס.");
      lines.push("טרפז: שטח = ((בסיס 1 + בסיס 2) × גובה) ÷ 2, אז גובה = (שטח × 2) ÷ (בסיס 1 + בסיס 2).");
      break;
    }

    case "tiling": {
      lines.push("ריצוף: כיסוי משטח ללא רווחים.");
      lines.push("ריבוע: זווית 90°, משולש שווה צלעות: זווית 60°.");
      break;
    }

    case "circles": {
      lines.push("מעגל: כל הנקודות במרחק שווה מהמרכז.");
      lines.push("שטח עיגול = π × רדיוס².");
      lines.push("היקף מעגל = 2 × π × רדיוס.");
      break;
    }

    case "solids": {
      lines.push("קובייה: 6 פאות ריבועיות שוות.");
      lines.push("תיבה: 6 פאות מלבניות.");
      lines.push("גליל: 2 בסיסים עגולים.");
      lines.push("כדור: כל הנקודות במרחק שווה מהמרכז.");
      break;
    }

    default: {
      lines.push("חשוב לזכור את הנוסחה המתאימה לנושא ולצורה.");
    }
  }

  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { className: "font-bold mb-1 text-[11px]" },
      "📘 מה חשוב לזכור?"
    ),
    React.createElement(
      "ul",
      { className: "list-disc pr-4 text-[11px] space-y-0.5 text-right" },
      lines.map((line, idx) => React.createElement("li", { key: idx }, line))
    )
  );
}

