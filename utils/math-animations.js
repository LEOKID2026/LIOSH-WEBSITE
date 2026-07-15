import {
  coerceComparisonOperands,
  embedComparisonSignInRtlProse,
  formatCompareMathExpression,
  getCanonicalComparisonSign,
} from "./comparison-sign-mcq.js";
import { mix, M, learningStepFields, pureMathLtrDisplay, pureMathLtrBlock, flattenTemplateRuns, unwrapLearningRuns } from "../lib/learning-book/learning-math-line-build.js";

export function buildVerticalOperation(topNumber, bottomNumber, operator = "-") {
  const top = String(topNumber);
  const bottom = String(bottomNumber);
  
  // טיפול מיוחד לחילוק ארוך - המחולק משמאל עם סוגר, המחלק מימין
  if (operator === "÷") {
    // בחילוק ארוך התצוגה הנכונה היא:
    // ────┐
    // 1320│6
    // הקו המאוזן מתחבר לפינה עם הקו המאונך (┐ מעל │).
    // הפרמטרים: topNumber = divisor (מחלק), bottomNumber = dividend (מחולק)

    const divisor = String(topNumber); // המחלק (6)
    const dividend = String(bottomNumber); // המחולק (1320)
    const dividendLen = Math.max(1, dividend.length);

    const line1 = `${"─".repeat(dividendLen)}┐`;
    const line2 = `${dividend}│${divisor}`;

    const raw = `${line1}\n${line2}`;
    // עוטפים את כל הבלוק בסימון LTR כדי שלא יתבלגן בתוך טקסט עברי
    return pureMathLtrDisplay(raw);
  }
  
  // לפעולות אחרות - התצוגה המקורית
  // טיפול מיוחד בעשרוניים - יישור לפי הנקודה העשרונית
  const topHasDecimal = top.includes(".");
  const bottomHasDecimal = bottom.includes(".");
  
  if (topHasDecimal || bottomHasDecimal) {
    // יישור לפי הנקודה העשרונית
    const topParts = top.split(".");
    const bottomParts = bottom.split(".");
    const topInt = topParts[0] || "";
    const topDec = topParts[1] || "";
    const bottomInt = bottomParts[0] || "";
    const bottomDec = bottomParts[1] || "";
    
    // אורך החלק השלם והחלק העשרוני
    const maxIntLen = Math.max(topInt.length, bottomInt.length);
    const maxDecLen = Math.max(topDec.length, bottomDec.length);
    
    // יישור החלק השלם (מימין) והחלק העשרוני (משמאל)
    const topIntPadded = topInt.padStart(maxIntLen, " ");
    const bottomIntPadded = bottomInt.padStart(maxIntLen, " ");
    const topDecPadded = topDec.padEnd(maxDecLen, "0");
    const bottomDecPadded = bottomDec.padEnd(maxDecLen, "0");
    
    const topFormatted = topHasDecimal ? `${topIntPadded}.${topDecPadded}` : topIntPadded;
    const bottomFormatted = bottomHasDecimal ? `${bottomIntPadded}.${bottomDecPadded}` : bottomIntPadded;
    
    const totalWidth = maxIntLen + 1 + maxDecLen + 2; // 1 לנקודה, 2 לתו הפעולה ולרווח
    
    const line1 = " ".repeat(totalWidth - topFormatted.length) + topFormatted;
    const line2 = operator + " " + " ".repeat(maxIntLen + 1 + maxDecLen - bottomFormatted.length) + bottomFormatted;
    const line3 = "-".repeat(totalWidth);
    
    const raw = `${line1}\n${line2}\n${line3}`;
    return pureMathLtrDisplay(raw);
  }
  
  // לפעולות רגילות (ללא עשרוניים)
  const maxLen = Math.max(top.length, bottom.length);
  const width = maxLen + 2; // 2 לתו הפעולה ולרווח

  const line1 = " ".repeat(width - top.length) + top;
  const line2 = operator + " " + " ".repeat(maxLen - bottom.length) + bottom;
  const line3 = "-".repeat(width);

  const raw = `${line1}\n${line2}\n${line3}`;

  // עוטפים את כל הבלוק בסימון LTR כדי שלא יתבלגן בתוך טקסט עברי
  return pureMathLtrDisplay(raw);
}

// פונקציה כללית לטיפול בתרגילי השלמה
export function convertMissingNumberEquation(op, kind, params) {
  if (!params || !kind) return null;
  
  const { a, b, c } = params;
  
  // חיבור: __ + b = c או a + __ = c → חיסור
  if (op === "addition" && (kind === "add_missing_first" || kind === "add_missing_second")) {
    if (kind === "add_missing_first") {
      // __ + b = c  →  c - b = __
      return {
        effectiveOp: "subtraction",
        top: c,
        bottom: b,
        answer: a
      };
    } else {
      // a + __ = c  →  c - a = __
      return {
        effectiveOp: "subtraction",
        top: c,
        bottom: a,
        answer: b
      };
    }
  }
  
  // חיסור: __ - b = c או a - __ = c
  if (op === "subtraction" && (kind === "sub_missing_first" || kind === "sub_missing_second")) {
    if (kind === "sub_missing_first") {
      // __ - b = c  →  c + b = __ (חיבור)
      return {
        effectiveOp: "addition",
        top: c,
        bottom: b,
        answer: a
      };
    } else {
      // a - __ = c  →  a - c = __ (חיסור)
      return {
        effectiveOp: "subtraction",
        top: a,
        bottom: c,
        answer: b
      };
    }
  }
  
  // כפל: __ × b = c או a × __ = c → חילוק
  if (op === "multiplication" && (kind === "mul_missing_first" || kind === "mul_missing_second")) {
    if (kind === "mul_missing_first") {
      // __ × b = c  →  c ÷ b = __
      return {
        effectiveOp: "division",
        top: c,
        bottom: b,
        answer: a
      };
    } else {
      // a × __ = c  →  c ÷ a = __
      return {
        effectiveOp: "division",
        top: c,
        bottom: a,
        answer: b
      };
    }
  }
  
  // חילוק: __ ÷ divisor = quotient או dividend ÷ __ = quotient
  if (op === "division" && (kind === "div_missing_dividend" || kind === "div_missing_divisor")) {
    const { dividend, divisor, quotient } = params;
    
    if (kind === "div_missing_dividend") {
      // __ ÷ divisor = quotient  →  quotient × divisor = __ (כפל)
      return {
        effectiveOp: "multiplication",
        top: quotient,
        bottom: divisor,
        answer: dividend
      };
    } else {
      // dividend ÷ __ = quotient  →  dividend ÷ quotient = __ (חילוק)
      return {
        effectiveOp: "division",
        top: dividend,
        bottom: quotient,
        answer: divisor
      };
    }
  }
  
  return null;
}

// פונקציה לבניית צעדי אנימציה לחיבור וחיסור
export function buildAdditionOrSubtractionAnimation(a, b, answer, op) {
  const steps = [];
  const aStr = String(a);
  const bStr = String(Math.abs(b));
  const maxLen = Math.max(aStr.length, bStr.length);
  const pa = aStr.padStart(maxLen, "0");
  const pb = bStr.padStart(maxLen, "0");

  const padLeft = (s, w) => String(s).padStart(w, " ");
  const repeat = (ch, n) => Array(Math.max(0, n)).fill(ch).join("");
  const maskAnswerRight = (full, revealDigits) => {
    const s = String(full);
    let out = s.split("");
    let seenDigits = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      const ch = out[i];
      if (/\d/.test(ch)) {
        if (seenDigits < revealDigits) {
          seenDigits++;
        } else {
          out[i] = " ";
        }
      }
    }
    return out.join("");
  };
  const makeVerticalSnapshot = ({ operator, top, bottom, answerFull, revealDigits, carryRow = null }) => {
    const topS = String(top);
    const bottomS = String(bottom);
    const ansS = String(answerFull);
    const maxDigits = Math.max(topS.replace(/\D/g, "").length, bottomS.replace(/\D/g, "").length, ansS.replace(/\D/g, "").length);
    const w = Math.max(maxDigits, ansS.length, topS.length, bottomS.length) + 2;

    const line1 = padLeft(topS, w);
    const line2 = operator + " " + padLeft(bottomS, w - 2);
    const line3 = repeat("-", w);
    const masked = maskAnswerRight(padLeft(ansS, w), revealDigits);
    const lines = [];
    if (carryRow && carryRow.trim()) {
      lines.push(padLeft(carryRow, w));
    }
    lines.push(line1, line2, line3, masked);
    return lines.join("\n");
  };

  if (op === "addition") {
    const answerStr = String(answer);
    const answerLen = answerStr.length;
    const carryMarks = []; // positions in printable width where carry should appear
    
    // צעד 1: מיישרים את הספרות
    steps.push({
      id: "place-value",
      title: "מיישרים את הספרות",
      ...learningStepFields(mix`כותבים את המספרים אחד מעל השני כך שסַפְרות האחדות נמצאות באותה עמודה.`),
      highlights: ["aAll", "bAll"],
      revealDigits: 0, // עדיין לא מראים כלום
      pre: makeVerticalSnapshot({
        operator: "+",
        top: a,
        bottom: Math.abs(b),
        answerFull: answer,
        revealDigits: 0,
        carryRow: "",
      }),
    });

    // חישוב ספרה ספרה
    let carry = 0;
    let stepIndex = 2;
    let revealedCount = 0; // כמה ספרות כבר נחשפו

    // הכנה: רוחב הציור (כדי שנוכל למקם נשיאות)
    const topS = String(a);
    const bottomS = String(Math.abs(b));
    const ansS = String(answer);
    const maxDigits = Math.max(topS.length, bottomS.length, ansS.length);
    const w = maxDigits + 2;
    const digitsStart = w - maxLen; // איפה מתחילים הספרות (ימין-מיושר)
    const carryRowArr = Array(w).fill(" ");

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

      const highlightKey = i === maxLen - 1 ? "Units" : i === maxLen - 2 ? "Tens" : "Hundreds";
      const columnFromRight = maxLen - 1 - i;

      revealedCount++; // חושפים ספרה נוספת

      // עדכון שורת נשיאות: הנשיאה עוברת לעמודה שמשמאל (i-1)
      if (newCarry) {
        const targetDigitIndex = i - 1;
        const pos = targetDigitIndex >= 0 ? digitsStart + targetDigitIndex : digitsStart - 1;
        if (pos >= 0 && pos < carryRowArr.length) {
          carryRowArr[pos] = "1";
        }
      }

      const carryRowStr = carryRowArr.join("");
      steps.push({
        id: `step-${stepIndex}`,
        title: `ספרת ה${placeName}`,
        ...learningStepFields(mix`מחברים את ספרת ה${placeName}: ${M(`${da} + ${db}${carry ? " + " + carry : ""} = ${sum}`)}. כותבים ${ones} בעמודת ה${placeName}${newCarry ? " ומעבירים 1 לעמודה הבאה" : ""}.`),
        highlights: [
          `aCol${columnFromRight}`,
          `bCol${columnFromRight}`,
          `resultCol${columnFromRight}`,
        ],
        carry: newCarry,
        revealDigits: revealedCount, // כמה ספרות מימין חשופות
        pre: makeVerticalSnapshot({
          operator: "+",
          top: a,
          bottom: Math.abs(b),
          answerFull: answer,
          revealDigits: revealedCount,
          carryRow: carryRowStr,
        }),
      });

      carry = newCarry;
      stepIndex++;
    }

    if (carry) {
      revealedCount++; // אם יש carry, יש ספרה נוספת
      steps.push({
        id: "final-carry",
        title: "העברה נוספת",
        ...learningStepFields(mix`בסוף החיבור נשאר לנו 1 נוסף, כותבים אותו משמאל כמספר חדש בעמודת המאות/אלפים.`),
        highlights: ["resultAll"],
        revealDigits: revealedCount,
        pre: makeVerticalSnapshot({
          operator: "+",
          top: a,
          bottom: Math.abs(b),
          answerFull: answer,
          revealDigits: revealedCount,
          carryRow: carryRowArr.join(""),
        }),
      });
    }

    // צעד אחרון: התוצאה הסופית
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`המספר שנוצר הוא ${answer}. זהו התשובה הסופית לתרגיל.`),
      highlights: ["resultAll"],
      revealDigits: answerLen, // מראים את כל הספרות
      pre: makeVerticalSnapshot({
        operator: "+",
        top: a,
        bottom: Math.abs(b),
        answerFull: answer,
        revealDigits: answerStr.replace(/\D/g, "").length,
        carryRow: carryRowArr.join(""),
      }),
    });
  } else if (op === "subtraction") {
    const answerStr = String(answer);
    const answerLen = answerStr.length;
    
    // צעד 1: מיישרים את הספרות
    steps.push({
      id: "place-value",
      title: "מיישרים את הספרות",
      ...learningStepFields(mix`כותבים את המספרים אחד מעל השני כך שסַפְרות האחדות, העשרות וכו' נמצאות באותו טור.`),
      highlights: ["aAll", "bAll"],
      revealDigits: 0, // עדיין לא מראים כלום
      pre: makeVerticalSnapshot({
        operator: "−",
        top: a,
        bottom: Math.abs(b),
        answerFull: answer,
        revealDigits: 0,
      }),
    });

    // חישוב ספרה ספרה
    let borrow = 0;
    let stepIndex = 2;
    let revealedCount = 0; // כמה ספרות כבר נחשפו

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

      const highlightKey = i === maxLen - 1 ? "Units" : i === maxLen - 2 ? "Tens" : "Hundreds";
      const columnFromRight = maxLen - 1 - i;

      if (da < db) {
        steps.push({
          id: `borrow-${stepIndex}`,
          title: `השאלה מעמודת ה${placeName}`,
          ...learningStepFields(mix`בעמודת ה${placeName} ${da} קטן מ-${db}, לכן לוקחים "השאלה" מהעמודה הבאה (מוסיפים 10 לספרה הזו ומפחיתים 1 בעמודה הבאה).`),
          highlights: [`aCol${columnFromRight}`, `bCol${columnFromRight}`],
          revealDigits: revealedCount, // לא חושפים ספרה חדשה בשלב ההשאלה
          pre: makeVerticalSnapshot({
            operator: "−",
            top: a,
            bottom: Math.abs(b),
            answerFull: answer,
            revealDigits: revealedCount,
          }),
        });
        da += 10;
        borrow = 1;
        stepIndex++;
      } else {
        borrow = 0;
      }

      const diff = da - db;
      revealedCount++; // חושפים ספרה נוספת
      steps.push({
        id: `step-${stepIndex}`,
        title: `ספרת ה${placeName}`,
        ...learningStepFields(mix`כעת מחשבים בעמודת ה${placeName}: ${M(`${da} - ${db} = ${diff}`)} וכותבים ${diff} בעמודה זו.`),
        highlights: [
          `aCol${columnFromRight}`,
          `bCol${columnFromRight}`,
          `resultCol${columnFromRight}`,
        ],
        revealDigits: revealedCount, // כמה ספרות מימין חשופות
        pre: makeVerticalSnapshot({
          operator: "−",
          top: a,
          bottom: Math.abs(b),
          answerFull: answer,
          revealDigits: revealedCount,
        }),
      });

      stepIndex++;
    }

    // צעד אחרון: התוצאה הסופית
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`המספר שקיבלנו בסוף הוא ${answer}. זו התוצאה של החיסור.`),
      highlights: ["resultAll"],
      revealDigits: answerLen, // מראים את כל הספרות
      pre: makeVerticalSnapshot({
        operator: "−",
        top: a,
        bottom: Math.abs(b),
        answerFull: answer,
        revealDigits: answerStr.replace(/\D/g, "").length,
      }),
    });
  }

  return steps;
}

// פונקציה לבניית צעדי אנימציה לכפל (עם תרגיל מאונך)
export function buildMultiplicationAnimation(a, b, answer) {
  const steps = [];

  const toInt = (x) => (typeof x === "number" ? x : Number(x));
  const A = Math.abs(toInt(a));
  const B = Math.abs(toInt(b));
  const ansNum = typeof answer === "number" ? answer : Number(answer);
  const answerStr = String(answer);

  // helpers
  const digitsRev = (n) => String(n).split("").reverse().map((d) => Number(d));
  const padLeft = (s, w) => String(s).padStart(w, " ");
  const repeat = (ch, n) => Array(Math.max(0, n)).fill(ch).join("");

  const makeSnapshot = ({ partialRows = [], inProgressRow = null, sumRow = null }) => {
    const aStr = String(A);
    const bStr = String(B);
    // width: result width or max of rows
    const baseWidth = Math.max(
      aStr.length,
      bStr.length + 2,
      String(ansNum || answerStr).length,
      ...partialRows.map((r) => String(r).length),
      inProgressRow ? String(inProgressRow).length : 0
    );
    const w = Math.max(baseWidth, 6);

    const lines = [];
    lines.push(padLeft(aStr, w));
    lines.push("× " + padLeft(bStr, w - 2));
    lines.push(repeat("-", w));
    if (partialRows.length === 0) {
      // show blank area
    } else {
      partialRows.forEach((row) => lines.push(padLeft(row, w)));
    }
    if (inProgressRow) {
      lines.push(padLeft(inProgressRow, w));
    }
    if (sumRow != null) {
      lines.push(repeat("-", w));
      lines.push(padLeft(sumRow, w));
    }
    return lines.join("\n");
  };

  const formatInProgressRow = (digitsSoFarRev, totalDigitsNoCarry, shiftZeros) => {
    const known = digitsSoFarRev.slice().reverse().join("");
    const blanks = repeat(" ", Math.max(0, totalDigitsNoCarry - digitsSoFarRev.length));
    return `${blanks}${known}${repeat("0", shiftZeros)}`;
  };

  // צעד 1: סידור בעמודות
  steps.push({
    id: "place-value",
    title: "מיישרים את הספרות",
    ...learningStepFields(mix`כותבים את שני המספרים אחד מתחת לשני, כך שסַפְרות האחדות נמצאות באותה עמודה.`),
    highlights: ["aAll", "bAll"],
    revealDigits: 0,
    pre: makeSnapshot({ partialRows: [] }),
  });

  // אם זה חד-ספרתי×חד-ספרתי: עדיין נפרט אבל קצר
  if (A < 10 && B < 10) {
    steps.push({
      id: "single-digit",
      title: "כפל חד-ספרתי",
      ...learningStepFields(mix`מכפילים: ${M(`${A} × ${B} = ${ansNum}`)}.`),
      highlights: ["aAll", "bAll", "resultAll"],
      revealDigits: answerStr.length,
      pre: makeSnapshot({ partialRows: [], sumRow: String(ansNum) }),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${ansNum}.`),
      highlights: ["resultAll"],
      revealDigits: answerStr.length,
      pre: makeSnapshot({ partialRows: [], sumRow: String(ansNum) }),
    });
    return steps;
  }

  steps.push({
    id: "explain",
    title: "מה עושים בכפל ארוך?",
    ...learningStepFields(mix`נכפיל קודם את המספר העליון בכל ספרה של המספר התחתון (מימין לשמאל). כל שורה היא 'מכפלה חלקית'. אחר כך נחבר את כל המכפלות החלקיות.`),
    highlights: ["aAll", "bAll"],
    revealDigits: 0,
    pre: makeSnapshot({ partialRows: [] }),
  });

  const aDigits = digitsRev(A); // אחדות קודם
  const bDigits = digitsRev(B);

  const partials = []; // numbers as strings already shifted
  const rawPartials = []; // numeric partials without shift (for explanation)

  let globalStep = 1;

  for (let j = 0; j < bDigits.length; j++) {
    const bd = bDigits[j];
    let carry = 0;
    const rowDigits = [];

  steps.push({
      id: `row-${j}-start`,
      title: flattenTemplateRuns(
      unwrapLearningRuns(
        mix`שורה ${M(String(j + 1))}: כופלים ב-${M(String(bd))}${j === 0 ? " (אחדות)" : j === 1 ? " (עשרות)" : " (מקום גבוה)"}`
      )
    ),
      ...learningStepFields(mix`כופלים את ${A} בספרה ${bd} של ${B}. מתחילים מימין (אחדות).`),
      highlights: ["aAll", "bAll"],
      revealDigits: 0,
      pre: makeSnapshot({ partialRows: partials.map((p) => p) }),
    });

    for (let i = 0; i < aDigits.length; i++) {
      const ad = aDigits[i];
      const prod = ad * bd + carry;
      const digit = prod % 10;
      const nextCarry = Math.floor(prod / 10);
      const place =
        i === 0 ? "ספרת האחדות" : i === 1 ? "ספרת העשרות" : i === 2 ? "ספרת המאות" : `ספרה במקום ${i + 1} מימין`;

      rowDigits.push(digit);

      const carryText = carry ? ` + נשיאה ${carry}` : "";
      const inProgressRow = formatInProgressRow(rowDigits, aDigits.length + 1, j);
      steps.push({
        id: `row-${j}-mul-${i}`,
        title: `כפל ${place}`,
        ...learningStepFields(mix`מכפילים ${ad} × ${bd}${carryText} = ${prod}. כותבים ${digit} במקום הזה${nextCarry ? ` ונושאים ${nextCarry} לשלב הבא.` : " (אין נשיאה)."
          }`),
        highlights: ["aAll", "bAll"],
        revealDigits: 0,
        pre: makeSnapshot({ partialRows: partials.map((p) => p), inProgressRow }),
      });

      carry = nextCarry;
      globalStep++;
    }

    if (carry) {
      rowDigits.push(carry);
      const inProgressRow = formatInProgressRow(rowDigits, aDigits.length + 1, j);
      steps.push({
        id: `row-${j}-carry-end`,
        title: "נשיאה אחרונה",
        ...learningStepFields(mix`בסוף השורה נשארה נשיאה ${carry}. כותבים אותה משמאל לשורה.`),
        highlights: ["aAll", "bAll"],
        revealDigits: 0,
        pre: makeSnapshot({ partialRows: partials.map((p) => p), inProgressRow }),
      });
    }

    const rowValue = Number(rowDigits.slice().reverse().join("") || "0");
    rawPartials.push(rowValue);

    const shifted = String(rowValue) + repeat("0", j);
    partials.push(shifted);

    steps.push({
      id: `row-${j}-done`,
      title: `מכפלה חלקית ${j + 1}`,
      ...(j === 0 ? learningStepFields(mix`קיבלנו מכפלה חלקית: \${rowValue}.`) : learningStepFields(mix`קיבלנו \${rowValue}. כי כפלנו בספרת מקום גבוה (×\${repeat("10", j).replace(/10/g, "10") || 10}), מוסיפים \${j} אפסים בסוף ⇒ \${shifted}.`)),
      highlights: ["aAll", "bAll"],
      revealDigits: 0,
      pre: makeSnapshot({ partialRows: partials.map((p) => p) }),
    });
  }

  // חיבור מכפלות חלקיות
  steps.push({
    id: "sum-start",
    title: "מחברים את המכפלות החלקיות",
    ...learningStepFields(mix`עכשיו מחברים את כל השורות שקיבלנו כדי לקבל את התוצאה הסופית.`),
    highlights: ["resultAll"],
    revealDigits: 0,
    pre: makeSnapshot({ partialRows: partials.map((p) => p) }),
  });

  // פירוט חיבור עמודות (כמו חיבור ארוך), על בסיס מספרים מיושרים
  const maxW = Math.max(...partials.map((p) => p.length), String(ansNum || answerStr).length);
  const padded = partials.map((p) => p.padStart(maxW, "0").split("").reverse().map((d) => Number(d)));
  const resDigits = [];
  let carryAdd = 0;
  for (let col = 0; col < maxW; col++) {
    const colSum = padded.reduce((s, row) => s + (row[col] || 0), 0) + carryAdd;
    const digit = colSum % 10;
    const nextCarry = Math.floor(colSum / 10);
    resDigits[col] = digit;

    const place =
      col === 0 ? "אחדות" : col === 1 ? "עשרות" : col === 2 ? "מאות" : `מקום ${col + 1} מימין`;
    steps.push({
      id: `sum-col-${col}`,
      title: `חיבור בעמודת ה${place}`,
      ...learningStepFields(mix`מחברים בעמודת ה${place}: סכום הספרות בעמודה${carryAdd ? ` + נשיאה ${carryAdd}` : ""} = ${colSum}. כותבים ${digit}${nextCarry ? ` ונושאים ${nextCarry}.` : "."}`),
      highlights: ["resultAll"],
      revealDigits: 0,
      pre: makeSnapshot({ partialRows: partials.map((p) => p), sumRow: padLeft(String(resDigits.slice().reverse().join("")).replace(/^0+/, "") || "0", maxW) }),
    });

    carryAdd = nextCarry;
  }
  if (carryAdd) {
    resDigits.push(carryAdd);
    steps.push({
      id: "sum-carry-end",
      title: "נשיאה אחרונה בחיבור",
      ...learningStepFields(mix`נשארה נשיאה ${carryAdd} בסוף, כותבים אותה משמאל.`),
      highlights: ["resultAll"],
      revealDigits: 0,
      pre: makeSnapshot({ partialRows: partials.map((p) => p), sumRow: String(resDigits.slice().reverse().join("")).replace(/^0+/, "") || "0" }),
    });
  }

  const sumStr = String(resDigits.slice().reverse().join("")).replace(/^0+/, "") || "0";

  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`אחרי שחיברנו את כל המכפלות החלקיות קיבלנו: ${M(`${A} × ${B} = ${sumStr}.`)}`),
    highlights: ["resultAll"],
    revealDigits: answerStr.length,
    pre: makeSnapshot({ partialRows: partials.map((p) => p), sumRow: sumStr }),
  });

  // בדיקה קצרה (אם יש תשובה צפויה)
  if (!Number.isNaN(ansNum) && sumStr !== String(ansNum)) {
    steps.push({
      id: "note",
      title: "בדיקה",
      ...learningStepFields(mix`שימו לב: לפי השלבים יצא ${sumStr} אבל התשובה השמורה לשאלה היא ${ansNum}. אם זה קורה, כנראה שיש פרמטרים מיוחדים בשאלה (למשל מספרים עם סימן/המרה).`),
      highlights: ["resultAll"],
      revealDigits: answerStr.length,
      pre: makeSnapshot({ partialRows: partials.map((p) => p), sumRow: sumStr }),
    });
  }
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לחילוק ארוך (עם תרגיל מאונך)
export function buildDivisionAnimation(dividend, divisor, quotient) {
  const steps = [];
  const dividendStr = String(dividend);
  const divisorStr = String(divisor);
  const quotientStr = String(quotient);
  const dividendLen = dividendStr.length;
  const repeat = (ch, n) => Array(Math.max(0, n)).fill(ch).join("");

  // בניית ASCII של חילוק ארוך (LTR) כשהמחולק משמאל כמו שהיה אצלך:
  //    31
  //   ____
  // 94│3
  //  9
  // --
  // 04
  //  3
  // --
  //  1
  // שימו לב: יש קו אנכי (│) רק בשורת הבסיס "מחולק│מחלק" — בלי קווים מיותרים בשאר השורות.
  // כדי שהמנה והקו יהיו בדיוק מעל המחולק (גם כשמיישרים למרכז), כל השורות חייבות להיות באותו רוחב:
  // רוחב = אורך המחולק + "│" + אורך המחלק
  const totalWidth = dividendLen + 1 + divisorStr.length;
  const padToWidth = (s, width = totalWidth) => String(s).padEnd(width, " ");

  const makeWorkLineAt = (position, text) => {
    const t = String(text);
    const line = Array(dividendLen).fill(" ");
    const end = Math.min(position, dividendLen - 1);
    const start = Math.max(0, end - t.length + 1);
    for (let i = 0; i < t.length; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < dividendLen) line[idx] = t[i];
    }
    return padToWidth(line.join(""));
  };

  const quotientLineArr = Array(dividendLen).fill(" ");
  const workLines = [];
  const makePre = (opts = {}) => {
    const remainderSuffix = opts.remainderSuffix || "";
    // אם מוסיפים "(שארית)" ליד המנה, נרחיב את הרוחב כדי שכל השורות יישארו מיושרות
    const width = totalWidth + (remainderSuffix ? remainderSuffix.length : 0);
    // מנה מעל המחולק (רק מעל אזור המחולק) + שארית בסוגריים ליד הספרה האחרונה במנה
    const line1 = padToWidth(quotientLineArr.join("") + remainderSuffix, width);
    // קו המנה - אותו אורך כמו המחולק, ומרופד לרוחב מלא כדי שלא "יזוז" במרכז
    const line2 = padToWidth(repeat("_", dividendLen), width);
    const line3 = padToWidth(dividendStr + "│" + divisorStr, width);
    const paddedWork = workLines.map((l) => padToWidth(l, width));
    // עוטפים ב-LTR markers כדי שלא יתבלגן בתוך טקסט עברי
    return pureMathLtrBlock([line1, line2, line3, ...paddedWork]);
  };
  
  // חישוב חילוק ארוך צעד אחר צעד
  const divisionSteps = [];
  let workingNumber = 0;
  let quotientPos = 0;
  let startPos = 0; // מיקום ההתחלה של workingNumber
  
  for (let i = 0; i < dividendStr.length; i++) {
    // אם workingNumber הוא 0, זה תחילת מספר חדש
    if (workingNumber === 0) {
      startPos = i;
    }
    
    workingNumber = workingNumber * 10 + parseInt(dividendStr[i]);
    
    if (workingNumber >= divisor) {
      const qDigit = Math.floor(workingNumber / divisor);
      const product = qDigit * divisor;
      const remainder = workingNumber - product;
      const wNumLen = String(workingNumber).length;
      
      divisionSteps.push({
        position: i, // מיקום הספרה האחרונה (הימנית ביותר)
        startPosition: startPos, // מיקום הספרה הראשונה (השמאלית ביותר)
        workingNumber,
        quotientDigit: qDigit,
        product,
        remainder,
        quotientPosition: quotientPos,
        workingNumberLength: wNumLen,
      });
      
      quotientPos++;
      workingNumber = remainder;
      // אם יש שארית, המיקום הבא יתחיל מהמיקום הנוכחי + 1
      startPos = remainder > 0 ? i : i + 1;
    }
  }
  
  // צעד 1: הצגת השאלה
  steps.push({
    id: "place-value",
    title: "הצגת השאלה",
    ...learningStepFields(mix`נחלק ${dividend} ב-${divisor}. נכתוב את המחולק והמחלק בצורת חילוק ארוך.`),
    highlights: ["aAll", "bAll"],
    revealDigits: 0,
    type: "division",
    dividend,
    divisor,
    quotient,
    pre: makePre(),
  });
  
  // יצירת צעדים מפורטים לכל שלב בחילוק
  for (let stepIndex = 0; stepIndex < divisionSteps.length; stepIndex++) {
    const step = divisionSteps[stepIndex];
    const { position, workingNumber: wNum, quotientDigit: qDigit, product, remainder, quotientPosition } = step;
    
    // צעד: כתיבה במנה
    quotientLineArr[position] = String(qDigit);
    steps.push({
      id: `step-${stepIndex + 1}-write`,
      title: `צעד ${stepIndex + 1}: כתיבה במנה`,
      ...learningStepFields(mix`${divisor} נכנס ב-${wNum} בדיוק ${qDigit} פעמים. כותבים ${qDigit} במנה מעל הספרה ${dividendStr[position]}.`),
      highlights: [`result${quotientPosition}`, `a${position}`],
      revealDigits: quotientPosition + 1,
      type: "division",
      dividend,
      divisor,
      quotient,
      stepIndex,
      quotientDigit: qDigit,
      workingNumber: wNum,
      pre: makePre(),
    });
    
    // צעד: כפל וחיסור
    // מוסיפים שורות עבודה: מכפלה, קו, שארית (מיושר מתחת לחלק הרלוונטי במחולק)
    workLines.push(makeWorkLineAt(position, product));
    workLines.push(makeWorkLineAt(position, repeat("-", String(product).length)));
    workLines.push(makeWorkLineAt(position, remainder));
    steps.push({
      id: `step-${stepIndex + 1}-subtract`,
      title: `צעד ${stepIndex + 1}: כפל וחיסור`,
      ...learningStepFields(mix`מכפילים: ${qDigit} × ${divisor} = ${product}. מחסרים: ${wNum} - ${product} = ${remainder}. ${remainder === 0 ? 'אין שארית.' : `השארית היא ${remainder}.`}`),
      highlights: [`a${position}`, "bAll", `result${quotientPosition}`, `product${stepIndex}`, `remainder${stepIndex}`],
      revealDigits: quotientPosition + 1,
      type: "division",
      dividend,
      divisor,
      quotient,
      stepIndex,
      product,
      remainder,
      workingNumber: wNum,
      pre: makePre(),
    });
    
    // אם לא זה הצעד האחרון, מורידים את הספרה הבאה
    if (stepIndex < divisionSteps.length - 1 && position < dividendStr.length - 1) {
      const nextStep = divisionSteps[stepIndex + 1];
      const nextDigitPos = nextStep.position;
      // שורת עבודה: המספר החדש לחלוקה (השארית + הספרה שהורדנו) — מציגים גם 0 מוביל כשצריך (למשל 04)
      const bringDownStr = `${remainder}${dividendStr[nextDigitPos]}`;
      workLines.push(makeWorkLineAt(nextDigitPos, bringDownStr));
      steps.push({
        id: `step-${stepIndex + 1}-bring-down`,
        title: `צעד ${stepIndex + 1}: הורדת ספרה`,
        ...learningStepFields(mix`מורידים את הספרה הבאה (${dividendStr[nextDigitPos]}). המספר החדש לחלוקה הוא ${bringDownStr}.`),
        highlights: [`a${nextDigitPos}`],
        revealDigits: quotientPosition + 1,
        type: "division",
        dividend,
        divisor,
        quotient,
        stepIndex,
        nextDigit: parseInt(dividendStr[nextDigitPos]),
        newNum: nextStep.workingNumber,
        pre: makePre(),
      });
    }
  }
  
  // צעד אחרון: התוצאה הסופית
  const finalRemainder = divisionSteps.length > 0 ? divisionSteps[divisionSteps.length - 1].remainder : 0;
  const remainderSuffix = finalRemainder > 0 ? `(${finalRemainder})` : "";
  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...(finalRemainder > 0
        ? learningStepFields(mix`סיימנו! התשובה היא ${M(`${quotient}${remainderSuffix}`)}.`)
        : learningStepFields(mix`סיימנו! המנה היא ${quotient} בלי שארית.`)),
    highlights: ["resultAll"],
    revealDigits: quotientStr.length,
    type: "division",
    dividend,
    divisor,
    quotient,
    remainder: finalRemainder,
    // מוסיפים את השארית ליד המנה (ליד הספרה האחרונה), כמו בתמונה
    pre: makePre({ remainderSuffix }),
  });
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לשברים
export function buildFractionsAnimation(params, answer) {
  const steps = [];
  const gcd = (a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  };
  const simplifyFraction = (n, d) => {
    const g = gcd(n, d);
    return { n: n / g, d: d / g, g };
  };
  const toMixed = (n, d) => {
    const whole = Math.floor(n / d);
    const rem = n % d;
    return { whole, rem };
  };
  if (params.kind === "frac_same_den") {
    const { n1, n2, den, op } = params;
    const isAdd = op === "add";
    const rawNum = isAdd ? n1 + n2 : n1 - n2;
    const simplified = simplifyFraction(rawNum, den);
    const canSimplify = simplified.g > 1;
    const improper = simplified.n >= simplified.d;
    const mixed = improper ? toMixed(simplified.n, simplified.d) : null;
    
    // צעד 1: הצגת השברים
    steps.push({
      id: "show-fractions",
      title: "הצגת השברים",
      ...learningStepFields(mix`יש לנו שני שברים עם אותו מכנה: ${M(`${n1}/${den} ${isAdd ? "+" : "-"} ${n2}/${den}`)}`),
      highlights: ["fraction1", "fraction2"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den} ${isAdd ? "+" : "−"} ${n2}/${den}`,
      ]),
    });
    
    // צעד 2: הסבר על מכנה משותף
    steps.push({
      id: "same-denominator",
      title: "מכנה משותף",
      ...learningStepFields(mix`יש לנו אותו מכנה (${den}). במכנה לא נוגעים – עובדים רק על המונים.`),
      highlights: ["denominator"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den} ${isAdd ? "+" : "−"} ${n2}/${den}`,
        `= (${n1} ${isAdd ? "+" : "−"} ${n2}) / ${den}`,
      ]),
    });
    
    // צעד 3: חיבור/חיסור המונים
    const resNum = rawNum;
    steps.push({
      id: "calculate-numerators",
      title: "חישוב המונים",
      ...learningStepFields(mix`${isAdd ? "מחברים" : "מחסרים"} את המונים: ${M(`${n1} ${isAdd ? "+" : "-"} ${n2} = ${resNum}`)}`),
      highlights: ["numerators"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den} ${isAdd ? "+" : "−"} ${n2}/${den}`,
        `= (${n1} ${isAdd ? "+" : "−"} ${n2}) / ${den}`,
        `= ${resNum}/${den}`,
      ]),
    });

    // צעד 4: פישוט (אם אפשר)
    if (canSimplify) {
      steps.push({
        id: "simplify",
        title: "פישוט השבר",
        ...learningStepFields(mix`אפשר לפשט כי גם ${resNum} וגם ${den} מתחלקים ב-${simplified.g}. נחלק את המונה והמכנה ב-${simplified.g}.`),
        highlights: ["simplify"],
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${resNum}/${den}`,
          `= (${resNum} ÷ ${simplified.g}) / (${den} ÷ ${simplified.g})`,
          `= ${simplified.n}/${simplified.d}`,
        ]),
      });
    }

    // צעד 5: מספר מעורב (אם זה שבר גדול מ-1)
    if (mixed && mixed.rem !== 0) {
      steps.push({
        id: "mixed",
        title: "המרה למספר מעורב",
        ...learningStepFields(mix`אם המונה גדול מהמכנה, אפשר לכתוב כמספר מעורב: ${M(`${simplified.n} ÷ ${simplified.d} = ${mixed.whole} `)}ושארית ${mixed.rem}.`),
        highlights: ["mixed"],
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${simplified.n}/${simplified.d}`,
          `= ${mixed.whole} ${mixed.rem}/${simplified.d}`,
        ]),
      });
    }
    
    // צעד אחרון: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`המכנה נשאר ${den} (ואם פישטנו/המרנו – משתמשים בצורה הפשוטה). התשובה היא ${answer}`),
      highlights: ["result"],
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_diff_den" || params.kind === "frac_add_sub") {
    const { n1, den1, n2, den2, commonDen, op } = params;
    const isAdd = op === "add";
    const m1 = commonDen / den1;
    const m2 = commonDen / den2;
    const nn1 = n1 * m1;
    const nn2 = n2 * m2;
    const rawNum = isAdd ? nn1 + nn2 : nn1 - nn2;
    const simplified = simplifyFraction(rawNum, commonDen);
    const canSimplify = simplified.g > 1;
    const improper = simplified.n >= simplified.d;
    const mixed = improper ? toMixed(simplified.n, simplified.d) : null;
    
    // צעד 1: הצגת השברים
    steps.push({
      id: "show-fractions",
      title: "הצגת השברים",
      ...learningStepFields(mix`יש לנו שני שברים עם מכנים שונים: ${M(`${n1}/${den1} ${isAdd ? "+" : "-"} ${n2}/${den2}`)}`),
      highlights: ["fraction1", "fraction2"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den1} ${isAdd ? "+" : "−"} ${n2}/${den2}`,
      ]),
    });
    
    // צעד 2: מציאת מכנה משותף
    steps.push({
      id: "find-common",
      title: "מציאת מכנה משותף",
      ...learningStepFields(mix`מוצאים מכנה משותף – כאן ${commonDen}`),
      highlights: ["commonDen"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        flattenTemplateRuns(
        unwrapLearningRuns(
          mix`מכנה משותף ל-${M(String(den1))} ו-${M(String(den2))} הוא ${M(String(commonDen))}`
        )
      ),
      ]),
    });
    
    // צעד 3: המרה למכנה משותף
    steps.push({
      id: "convert",
      title: "המרה למכנה משותף",
      ...learningStepFields(mix`כדי להגיע למכנה ${commonDen} נכפיל מונה ומכנה באותו מספר:`),
      highlights: ["convert1", "convert2"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den1} = (${n1}×${m1})/(${den1}×${m1}) = ${nn1}/${commonDen}`,
        `${n2}/${den2} = (${n2}×${m2})/(${den2}×${m2}) = ${nn2}/${commonDen}`,
      ]),
    });
    
    // צעד 4: חיבור/חיסור
    const resNum = rawNum;
    steps.push({
      id: "calculate",
      title: "חישוב",
      ...learningStepFields(mix`עכשיו שהמכנים זהים – עובדים רק על המונים: ${M(`${nn1} ${isAdd ? "+" : "-"} ${nn2} = ${resNum}`)}`),
      highlights: ["calculation"],
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${nn1}/${commonDen} ${isAdd ? "+" : "−"} ${nn2}/${commonDen}`,
        `= (${nn1} ${isAdd ? "+" : "−"} ${nn2}) / ${commonDen}`,
        `= ${resNum}/${commonDen}`,
      ]),
    });

    // צעד 5: פישוט (אם אפשר)
    if (canSimplify) {
      steps.push({
        id: "simplify",
        title: "פישוט השבר",
        ...learningStepFields(mix`אפשר לפשט כי גם ${resNum} וגם ${commonDen} מתחלקים ב-${simplified.g}.`),
        highlights: ["simplify"],
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${resNum}/${commonDen}`,
          `= (${resNum} ÷ ${simplified.g}) / (${commonDen} ÷ ${simplified.g})`,
          `= ${simplified.n}/${simplified.d}`,
        ]),
      });
    }

    // צעד 6: מספר מעורב (אם צריך)
    if (mixed && mixed.rem !== 0) {
      steps.push({
        id: "mixed",
        title: "המרה למספר מעורב",
        ...learningStepFields(mix`אם יצא שבר גדול מ-1, אפשר לכתוב כמספר מעורב.`),
        highlights: ["mixed"],
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${simplified.n}/${simplified.d}`,
          `= ${mixed.whole} ${mixed.rem}/${simplified.d}`,
        ]),
      });
    }
    
    // צעד אחרון: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_to_mixed") {
    const { improperNum, den, whole, num } = params;
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`נמיר את השבר ${improperNum}/${den} למספר מעורב.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${improperNum}/${den}`]),
    });
    steps.push({
      id: "divide",
      title: "מחלקים כדי למצוא את השלם",
      ...learningStepFields(mix`מחלקים: ${M(`${improperNum} ÷ ${den} = ${whole} `)}ושארית ${num}.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${improperNum} ÷ ${den} = ${whole} שארית ${num}`,
        `${improperNum}/${den} = ${whole} ${num}/${den}`,
      ]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "mixed_to_frac") {
    const { whole, num, den, improperNum } = params;
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`נמיר את המספר המעורב ${whole} ${num}/${den} לשבר.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${whole} ${num}/${den}`]),
    });
    steps.push({
      id: "rule",
      title: "כלל ההמרה",
      ...learningStepFields(mix`מכפילים את השלם במכנה ומוסיפים את המונה: (${whole}×${den}) + ${num}.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${whole} ${num}/${den}`,
        `= (${whole}×${den} + ${num}) / ${den}`,
      ]),
    });
    steps.push({
      id: "calc",
      title: "מחשבים",
      ...learningStepFields(mix`${whole}×${den} = ${M(`${whole * den}, `)}ואז ${whole * den} + ${num} = ${M(`${improperNum}.`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `(${whole}×${den} + ${num}) / ${den}`,
        `= (${whole * den} + ${num}) / ${den}`,
        `= ${improperNum}/${den}`,
      ]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_expand") {
    const { num, den, factor, expandedNum, expandedDen } = params;
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`נרחיב את ${num}/${den} ב-${factor} (כלומר נכפיל מונה ומכנה באותו מספר).`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${num}/${den}`]),
    });
    steps.push({
      id: "multiply",
      title: "מכפילים מונה ומכנה",
      ...learningStepFields(mix`מונה: ${M(`${num}×${factor} = ${expandedNum}. `)}מכנה: ${M(`${den}×${factor} = ${expandedDen}.`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${num}/${den} = (${num}×${factor})/(${den}×${factor})`,
        `= ${expandedNum}/${expandedDen}`,
      ]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`השבר השווה הוא ${answer}.`),
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_reduce") {
    const { num, den, reducedNum, reducedDen } = params;
    const simp = simplifyFraction(num, den);
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`נצמצם את השבר ${num}/${den}.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${num}/${den}`]),
    });
    steps.push({
      id: "gcd",
      title: "מחלק משותף גדול",
      ...learningStepFields(mix`מחפשים מספר שמחלק גם את ${num} וגם את ${den}. כאן המחלק הוא ${simp.g}.`),
      type: "fractions",
      params,
      answer,
    });
    steps.push({
      id: "divide",
      title: "מחלקים מונה ומכנה",
      ...learningStepFields(mix`מונה: ${M(`${num}÷${simp.g} = ${reducedNum}. `)}מכנה: ${M(`${den}÷${simp.g} = ${reducedDen}.`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${num}/${den}`,
        `= (${num}÷${simp.g})/(${den}÷${simp.g})`,
        `= ${reducedNum}/${reducedDen}`,
      ]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`השבר המצומצם הוא ${answer}.`),
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_as_division") {
    const { dividend, divisor, num, den } = params;
    steps.push({
      id: "show",
      title: "שבר כמנת חילוק",
      ...learningStepFields(mix`חילוק אפשר לכתוב כשבר: ${M(`${dividend} ÷ ${divisor} = ${dividend}/${divisor}`)}.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${dividend} ÷ ${divisor}`, `${dividend}/${divisor}`]),
    });
    const simp = simplifyFraction(dividend, divisor);
    if (simp.g > 1) {
      steps.push({
        id: "simplify",
        title: "מצמצמים",
        ...learningStepFields(mix`מצמצמים את ${dividend}/${divisor} ב-${simp.g}.`),
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${dividend}/${divisor}`,
          `= (${dividend}÷${simp.g})/(${divisor}÷${simp.g})`,
          `= ${num}/${den}`,
        ]),
      });
    }
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`לכן התשובה היא ${answer}.`),
      type: "fractions",
      params,
      answer,
    });
  } else if (params.kind === "frac_multiply") {
    const { n1, den1, n2, den2, finalNum, finalDen } = params;
    const rawNum = n1 * n2;
    const rawDen = den1 * den2;
    const simp = simplifyFraction(rawNum, rawDen);
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`כפל שברים: מכפילים מונה במונה ומכנה במכנה.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${n1}/${den1} × ${n2}/${den2}`]),
    });
    steps.push({
      id: "mul",
      title: "כפל מונים ומכנים",
      ...learningStepFields(mix`מונה: ${M(`${n1}×${n2} = ${rawNum}. `)}מכנה: ${M(`${den1}×${den2} = ${rawDen}.`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den1} × ${n2}/${den2}`,
        `= (${n1}×${n2}) / (${den1}×${den2})`,
        `= ${rawNum}/${rawDen}`,
      ]),
    });
    if (simp.g > 1) {
      steps.push({
        id: "simplify",
        title: "מצמצמים",
        ...learningStepFields(mix`מצמצמים ב-${simp.g}: ${M(`${rawNum}/${rawDen} = ${finalNum}/${finalDen}.`)}`),
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${rawNum}/${rawDen}`,
          `= (${rawNum}÷${simp.g})/(${rawDen}÷${simp.g})`,
          `= ${finalNum}/${finalDen}`,
        ]),
      });
    }
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  } else if (params.kind === "frac_divide") {
    const { n1, den1, n2, den2, finalNum, finalDen } = params;
    const rawNum = n1 * den2;
    const rawDen = den1 * n2;
    const simp = simplifyFraction(rawNum, rawDen);
    steps.push({
      id: "show",
      title: "הצגת השאלה",
      ...learningStepFields(mix`חילוק שברים: הופכים את המחלק וכופלים.`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([`${n1}/${den1} ÷ ${n2}/${den2}`]),
    });
    steps.push({
      id: "flip",
      title: "הופכים וכופלים",
      ...learningStepFields(mix`${M(`${n1}/${den1} ÷ ${n2}/${den2} = ${n1}/${den1} × ${den2}/${n2}`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den1} ÷ ${n2}/${den2}`,
        `= ${n1}/${den1} × ${den2}/${n2}`,
      ]),
    });
    steps.push({
      id: "mul",
      title: "כפל מונים ומכנים",
      ...learningStepFields(mix`מונה: ${M(`${n1}×${den2} = ${rawNum}. `)}מכנה: ${M(`${den1}×${n2} = ${rawDen}.`)}`),
      type: "fractions",
      params,
      answer,
      pre: pureMathLtrBlock([
        `${n1}/${den1} × ${den2}/${n2}`,
        `= (${n1}×${den2}) / (${den1}×${n2})`,
        `= ${rawNum}/${rawDen}`,
      ]),
    });
    if (simp.g > 1) {
      steps.push({
        id: "simplify",
        title: "מצמצמים",
        ...learningStepFields(mix`מצמצמים ב-${simp.g}: ${M(`${rawNum}/${rawDen} = ${finalNum}/${finalDen}.`)}`),
        type: "fractions",
        params,
        answer,
        pre: pureMathLtrBlock([
          `${rawNum}/${rawDen}`,
          `= (${rawNum}÷${simp.g})/(${rawDen}÷${simp.g})`,
          `= ${finalNum}/${finalDen}`,
        ]),
      });
    }
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  } else if (params.kind === "frac_half") {
    const { whole } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`מהו חצי מ-${whole}?`), type: "fractions", params, answer, pre: pureMathLtrBlock([`1/2 של ${whole}`]) });
    steps.push({ id: "rule", title: "חצי = לחלק ב-2", ...learningStepFields(mix`חצי ממספר זה המספר ÷ 2.`), type: "fractions", params, answer });
    const res = whole / 2;
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${whole} ÷ 2 = ${res}`)}`), type: "fractions", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  } else if (params.kind === "frac_half_reverse") {
    const { half, whole } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`חצי מ-__ הוא ${half}. מה המספר השלם?`), type: "fractions", params, answer });
    steps.push({ id: "rule", title: "הפוך מחצי", ...learningStepFields(mix`אם חצי מהמספר הוא ${half}, אז המספר השלם הוא פי 2.`), type: "fractions", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${half} × 2 = ${whole}`)}`), type: "fractions", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  } else if (params.kind === "frac_quarter") {
    const { whole } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`מהו רבע מ-${whole}?`), type: "fractions", params, answer, pre: pureMathLtrBlock([`1/4 של ${whole}`]) });
    steps.push({ id: "rule", title: "רבע = לחלק ב-4", ...learningStepFields(mix`רבע ממספר זה המספר ÷ 4.`), type: "fractions", params, answer });
    const res = whole / 4;
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${whole} ÷ 4 = ${res}`)}`), type: "fractions", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  } else if (params.kind === "frac_quarter_reverse") {
    const { quarter, whole } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`רבע מ-__ הוא ${quarter}. מה המספר השלם?`), type: "fractions", params, answer });
    steps.push({ id: "rule", title: "הפוך מרבע", ...learningStepFields(mix`אם רבע מהמספר הוא ${quarter}, אז המספר השלם הוא פי 4.`), type: "fractions", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${quarter} × 4 = ${whole}`)}`), type: "fractions", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "fractions", params, answer });
  }
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לעשרוניים (עם תרגיל מאונך)
export function buildDecimalsAnimation(params, answer) {
  const steps = [];
  const { a, b, kind } = params;
  const places = params.places ?? 2;
  const opSymbol = kind === "dec_add" ? "+" : "−";

  const aStr = Number(a).toFixed(places);
  const bStr = Number(b).toFixed(places);
  const answerStr = Number(answer).toFixed(places);

  const stripDot = (s) => s.replace(".", "");
  const intA = parseInt(stripDot(aStr), 10);
  const intB = parseInt(stripDot(bStr), 10);
  const intAnswer = parseInt(stripDot(answerStr), 10);

  const aIntStr = String(intA);
  const bIntStr = String(intB);
  const ansIntStr = String(intAnswer);
  const maxLen = Math.max(aIntStr.length, bIntStr.length, ansIntStr.length);
  const pa = aIntStr.padStart(maxLen, "0");
  const pb = bIntStr.padStart(maxLen, "0");

  const answerDigitsCount = answerStr.replace(/\D/g, "").length;

  
  const padLeft = (s, w) => String(s).padStart(w, " ");
  const maskAnswerRight = (full, revealDigits) => {
    const s = String(full);
    const out = s.split("");
    let seen = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      if (/\d/.test(out[i])) {
        if (seen < revealDigits) {
          seen++;
        } else {
          out[i] = " ";
        }
      }
    }
    return out.join("");
  };

  const makePre = (revealDigits) => {
    const base = buildVerticalOperation(aStr, bStr, opSymbol);
    const baseRaw = String(base).replace(/\u2066|\u2069/g, "");
    const baseLines = baseRaw.split("\n");
    const width = Math.max(
      ...baseLines.map((l) => l.length),
      answerStr.length + 2
    );
    const maskedAns = maskAnswerRight(padLeft(answerStr, width), revealDigits);
    const out = [...baseLines.map((l) => padLeft(l, width)), maskedAns].join("\n");
    return pureMathLtrDisplay(out);
  };

  const placeName = (idxFromRight) => {
    // idxFromRight=0 הוא המקום הקטן ביותר (למשל מאיות כשיש 2 ספרות אחרי נקודה)
    if (idxFromRight < places) {
      if (places === 1) return "עשיריות";
      if (places === 2) return idxFromRight === 0 ? "מאיות" : "עשיריות";
      // כללי
      return `מקום ${idxFromRight + 1} אחרי הנקודה`;
    }
    const k = idxFromRight - places; // 0=אחדות, 1=עשרות...
    if (k === 0) return "אחדות";
    if (k === 1) return "עשרות";
    if (k === 2) return "מאות";
    return `מקום ${k + 1} משמאל לנקודה`;
  };

  // צעד 1: יישור נקודות
  steps.push({
    id: "place-value",
    title: "מיישרים את הנקודות העשרוניות",
    ...learningStepFields(mix`כותבים את המספרים אחד מעל השני כך שהנקודות העשרוניות נמצאות באותה עמודה.`),
    highlights: ["aAll", "bAll"],
    revealDigits: 0,
    pre: makePre(0),
  });
  
  // צעד 2: מסבירים מה עושים עם הנקודה
  const mul = Math.pow(10, places);
  steps.push({
    id: "dot-note",
    title: "מה עושים עם הנקודה?",
    ...learningStepFields(mix`כדי שיהיה קל לחשב בעמודות, מדמיינים שמזיזים את הנקודה ${places} מקומות ימינה (כופלים ב-${mul}). מחשבים עם מספרים שלמים, ובסוף מחזירים את הנקודה ${places} מקומות שמאלה.`),
    highlights: ["aAll", "bAll"],
    revealDigits: 0,
    pre: makePre(0),
  });

  // צעד 3+: חישוב ספרה-ספרה (כמו חיבור/חיסור)
  let revealedCount = 0;
  let stepIndex = 3;

  if (kind === "dec_add") {
    let carry = 0;
    for (let i = maxLen - 1; i >= 0; i--) {
      const da = Number(pa[i]);
      const db = Number(pb[i]);
      const sum = da + db + carry;
      const digit = sum % 10;
      const newCarry = sum >= 10 ? 1 : 0;

      const idxFromRight = maxLen - 1 - i;
      const place = placeName(idxFromRight);

      revealedCount++;
  steps.push({
        id: `step-${stepIndex}`,
        title: `עמודת ה${place}`,
        ...learningStepFields(mix`מחברים בעמודת ה${place}: ${M(`${da} + ${db}${carry ? " + " + carry : ""} = ${sum}`)}. כותבים ${digit}${newCarry ? " ונושאים 1 לעמודה הבאה." : "."}`),
    highlights: ["aAll", "bAll", "resultAll"],
        revealDigits: revealedCount,
        pre: makePre(revealedCount),
      });

      carry = newCarry;
      stepIndex++;
    }

    if (carry) {
      revealedCount++;
      steps.push({
        id: "final-carry",
        title: "נשיאה אחרונה",
        ...learningStepFields(mix`נשארה נשיאה 1 בסוף, כותבים אותה משמאל.`),
        highlights: ["resultAll"],
        revealDigits: revealedCount,
        pre: makePre(revealedCount),
      });
    }
  } else {
    // dec_sub
    let borrow = 0;
    for (let i = maxLen - 1; i >= 0; i--) {
      let da = Number(pa[i]);
      const db = Number(pb[i]);
      da -= borrow;

      const idxFromRight = maxLen - 1 - i;
      const place = placeName(idxFromRight);

      if (da < db) {
        steps.push({
          id: `borrow-${stepIndex}`,
          title: `השאלה בעמודת ה${place}`,
          ...learningStepFields(mix`בעמודת ה${place} ${da} קטן מ-${db}, לכן מוסיפים 10 לעמודה הזו ולוקחים 1 מהעמודה הבאה (השאלה).`),
          highlights: ["aAll", "bAll"],
          revealDigits: revealedCount,
          pre: makePre(revealedCount),
        });
        da += 10;
        borrow = 1;
        stepIndex++;
      } else {
        borrow = 0;
      }

      const diff = da - db;
      revealedCount++;
      steps.push({
        id: `step-${stepIndex}`,
        title: `עמודת ה${place}`,
        ...learningStepFields(mix`מחסרים בעמודת ה${place}: ${M(`${da} − ${db} = ${diff}. `)}כותבים ${diff}.`),
        highlights: ["aAll", "bAll", "resultAll"],
        revealDigits: revealedCount,
        pre: makePre(revealedCount),
      });
      stepIndex++;
    }
  }

  steps.push({
    id: "final",
    title: "מחזירים את הנקודה למקום",
    ...learningStepFields(mix`זוכרים: מחזירים את הנקודה לאותה עמודה. התוצאה הסופית היא ${answerStr}.`),
    highlights: ["resultAll"],
    revealDigits: answerDigitsCount,
    pre: makePre(answerDigitsCount),
  });
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לאחוזים
export function buildPercentagesAnimation(params, answer) {
  const steps = [];
  const { base, p, kind } = params;
  const gcd = (a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  };

  const buildPartOfSteps = (baseVal, perc, resultVal, idPrefix) => {
    const local = [];
    const g = gcd(perc, 100);
    const num = perc / g;
    const den = 100 / g;
    local.push({
      id: `${idPrefix}-show`,
      title: "מה מבקשים?",
      ...learningStepFields(mix`מחשבים ${perc}% מתוך ${baseVal}.`),
      type: "percentages",
      params,
      answer,
      pre: pureMathLtrBlock([`${perc}% of ${baseVal}`]),
    });
    local.push({
      id: `${idPrefix}-fraction`,
      title: "אחוז כשבר",
      ...learningStepFields(mix`${perc}% = ${perc}/100. אפשר לצמצם: ${M(`${perc}/100 = ${num}/${den}`)}.`),
      type: "percentages",
      params,
      answer,
      pre: pureMathLtrBlock([`${perc}% = ${perc}/100 = ${num}/${den}`]),
    });
    local.push({
      id: `${idPrefix}-formula`,
      title: "כותבים תרגיל",
      ...learningStepFields(mix`חלק = מספר × השבר ⇒ ${M(`${baseVal} × ${num}/${den}`)}.`),
      type: "percentages",
      params,
      answer,
      pre: pureMathLtrBlock([`${baseVal} × ${num}/${den}`]),
    });

    // מעדיפים לחלק קודם כדי לשמור על מספרים שלמים (כמו שביקשת)
    const divisibleFirst = baseVal % den === 0;
    if (divisibleFirst) {
      const reducedBase = baseVal / den;
      local.push({
        id: `${idPrefix}-divide-first`,
        title: "מחלקים קודם (נוח יותר)",
        ...learningStepFields(mix`נחלק קודם את ${baseVal} ב-${den}: ${M(`${baseVal} ÷ ${den} = ${reducedBase}`)}.`),
      type: "percentages",
      params,
      answer,
        pre: pureMathLtrBlock([`${baseVal} × ${num}/${den}`, `= (${baseVal} ÷ ${den}) × ${num}`, `= ${reducedBase} × ${num}`]),
      });
      local.push({
        id: `${idPrefix}-multiply`,
        title: "כופלים",
        ...learningStepFields(mix`${M(`${reducedBase} × ${num} = ${resultVal}`)}.`),
        type: "percentages",
        params,
        answer,
      });
    } else {
      local.push({
        id: `${idPrefix}-multiply-first`,
        title: "כופלים ואז מחלקים",
        ...learningStepFields(mix`מחשבים: ${M(`${baseVal} × ${num} ÷ ${den} = ${resultVal}`)}.`),
        type: "percentages",
        params,
        answer,
      });
    }

    local.push({
      id: `${idPrefix}-final`,
      title: "תוצאה",
      ...learningStepFields(mix`לכן ${perc}% מתוך ${baseVal} הוא ${resultVal}.`),
      type: "percentages",
      params,
      answer,
    });
    return local;
  };

  if (kind === "perc_part_of") {
    const result = Number(answer);
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`כמה זה ${p}% מתוך ${base}?`),
      type: "percentages",
      params,
      answer,
    });
    steps.push(...buildPartOfSteps(base, p, result, "part"));
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "percentages",
      params,
      answer,
    });
  } else if (kind === "perc_discount") {
    const { discount, finalPrice } = params;
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`מחיר מוצר הוא ${base}₪ ויש הנחה של ${p}%. מה המחיר אחרי ההנחה?`),
      type: "percentages",
      params,
      answer,
    });
    steps.push({
      id: "idea",
      title: "מה עושים?",
      ...learningStepFields(mix`שלב 1: מחשבים כמה שווה ההנחה. שלב 2: מחסרים אותה מהמחיר.`),
      type: "percentages",
      params,
      answer,
    });
    steps.push(...buildPartOfSteps(base, p, discount, "disc"));
    steps.push({
      id: "subtract",
      title: "מחיר אחרי הנחה",
      ...learningStepFields(mix`מורידים את ההנחה: ${M(`${base} − ${discount} = ${finalPrice}`)}.`),
      type: "percentages",
      params,
      answer,
    });
    // חישוב מאונך כמו בחיסור
    steps.push(
      ...buildAdditionOrSubtractionAnimation(base, discount, finalPrice, "subtraction").map((s) => ({
        ...s,
        id: `sub-${s.id}`,
        type: "percentages",
        params,
        answer,
      }))
    );
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`המחיר אחרי ההנחה הוא ${answer}₪.`),
      type: "percentages",
      params,
      answer,
    });
  }
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לסדרות
export function buildSequencesAnimation(params, answer) {
  const steps = [];
  const { seq, step, posOfBlank } = params;
  // צעד 1: הצגת הסדרה
  const display = seq.map((v, idx) => (idx === posOfBlank ? "__" : v)).join(", ");
  steps.push({
    id: "show-sequence",
    title: "הצגת הסדרה",
    ...learningStepFields(mix`הסדרה היא: ${M(`${display}`)}`),
    highlights: ["sequence"],
    type: "sequences",
    params,
    answer,
  });
  
  // צעד 2: מציאת ההפרש (בודקים כמה זוגות כדי לוודא שזה קבוע)
  const firstDiff = seq[1] - seq[0];
  steps.push({
    id: "find-difference",
    title: "מציאת ההפרש",
    ...learningStepFields(mix`נסתכל על ההפרש בין שני מספרים סמוכים: ${M(`${seq[1]} - ${seq[0]} = ${firstDiff}`)}`),
    highlights: ["difference"],
    type: "sequences",
    params,
    answer,
  });
  if (seq.length >= 3) {
    const secondDiff = seq[2] - seq[1];
    steps.push({
      id: "confirm",
      title: "מאשרים שזה קבוע",
      ...learningStepFields(mix`בודקים עוד פעם: ${M(`${seq[2]} - ${seq[1]} = ${secondDiff}`)}. זה אותו הפרש ⇒ הצעד קבוע.`),
      highlights: ["difference"],
      type: "sequences",
      params,
      answer,
    });
  }
  
  // צעד 3: הסבר על הצעד הקבוע
  steps.push({
    id: "explain-step",
    title: "הצעד הקבוע",
    ...learningStepFields(mix`זה הצעד הקבוע של הסדרה: ${M(`${step > 0 ? "מוסיפים" : "מחסרים"} ${Math.abs(step)} `)}בכל צעד`),
    highlights: ["step"],
    type: "sequences",
    params,
    answer,
  });
  
  // צעד 4: חישוב המספר החסר
  const beforeBlank = posOfBlank > 0 ? seq[posOfBlank - 1] : null;
  const afterBlank = posOfBlank < seq.length - 1 ? seq[posOfBlank + 1] : null;
  
  if (beforeBlank !== null) {
    const opKind = step >= 0 ? "addition" : "subtraction";
    const amt = Math.abs(step);
    const res = beforeBlank + step;
    steps.push({
      id: "calculate",
      title: "חישוב המספר החסר",
      ...learningStepFields(mix`המספר שאחרי ${beforeBlank} מתקבל ע״י ${step >= 0 ? "הוספת" : "החסרת"} ${amt}: ${M(`${beforeBlank} ${step >= 0 ? "+" : "−"} ${amt} = ${res}`)}`),
      highlights: ["calculation"],
      type: "sequences",
      params,
      answer,
    });
    // צעדים מאונכים כמו בחיבור/חיסור
    steps.push(
      ...buildAdditionOrSubtractionAnimation(beforeBlank, amt, res, opKind).map((s) => ({
        ...s,
        id: `math-${s.id}`,
        type: "sequences",
        params,
        answer,
      }))
    );
  } else if (afterBlank !== null) {
    const opKind = step >= 0 ? "subtraction" : "addition";
    const amt = Math.abs(step);
    const res = afterBlank - step;
    steps.push({
      id: "calculate",
      title: "חישוב המספר החסר",
      ...learningStepFields(mix`המספר שלפני ${afterBlank} מתקבל ע״י ${step >= 0 ? "החסרת" : "הוספת"} ${amt}: ${M(`${afterBlank} ${step >= 0 ? "−" : "+"} ${amt} = ${res}`)}`),
      highlights: ["calculation"],
      type: "sequences",
      params,
      answer,
    });
    steps.push(
      ...buildAdditionOrSubtractionAnimation(afterBlank, amt, res, opKind).map((s) => ({
        ...s,
        id: `math-${s.id}`,
        type: "sequences",
        params,
        answer,
      }))
    );
  }
  
  // צעד 5: התוצאה
  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`המספר החסר הוא ${answer}`),
    highlights: ["result"],
    type: "sequences",
    params,
    answer,
  });
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה למשוואות
export function buildEquationsAnimation(params, answer) {
  const steps = [];
  const { kind, form, a, b, c, exerciseText } = params;
  const pushMathSteps = (mathSteps, prefixId) => {
    if (!Array.isArray(mathSteps)) return;
    mathSteps.forEach((s, idx) => {
      steps.push({
        ...s,
        id: `${prefixId}-${s.id || idx}`,
        type: "equations",
        params,
        answer,
      });
    });
  };
  
  // צעד 1: הצגת המשוואה
  steps.push({
    id: "show-equation",
    title: "הצגת המשוואה",
    ...learningStepFields(mix`המשוואה היא: ${M(`${exerciseText}`)}`),
    type: "equations",
    params,
    answer,
  });
  
  // כיתה א' - משוואות פשוטות
  if (kind === "eq_add_simple") {
    steps.push({
      id: "idea",
      title: "איך פותרים?",
      ...learningStepFields(mix`אם ${M(`${a} + __ = ${c}`)} אז המספר החסר הוא ${M(`${c} − ${a}`)}.`),
      type: "equations",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(c, a, Number(answer), "subtraction"), "math");
  } else if (kind === "eq_sub_simple") {
    steps.push({
      id: "idea",
      title: "איך פותרים?",
      ...learningStepFields(mix`אם ${M(`${a} − __ = ${c}`)} אז המספר החסר הוא ${M(`${a} − ${c}`)}.`),
      type: "equations",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(a, c, Number(answer), "subtraction"), "math");
  } else if (kind === "eq_add") {
    steps.push({
      id: "inverse",
      title: "פעולה הפוכה",
      ...learningStepFields(mix`בחיבור הפעולה ההפוכה היא חיסור.`),
      type: "equations",
      params,
      answer,
    });
    const missing = Number(answer);
    const subA = form === "a_plus_x" ? c : c;
    const subB = form === "a_plus_x" ? a : b;
    steps.push({
      id: "calc",
      title: "מחשבים את החסר",
      ...learningStepFields(mix`נחשב: ${M(`${subA} − ${subB} = ${missing}`)}.`),
      type: "equations",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(subA, subB, missing, "subtraction"), "math");
  } else if (kind === "eq_sub") {
    steps.push({
      id: "inverse",
      title: "פעולה הפוכה",
      ...learningStepFields(mix`בחיסור – לפעמים משתמשים בחיסור ולפעמים בחיבור, תלוי איפה החסר.`),
      type: "equations",
      params,
      answer,
    });
    const missing = Number(answer);
    if (form === "a_minus_x") {
    steps.push({
        id: "calc",
        title: "מחשבים את החסר",
        ...learningStepFields(mix`אם ${M(`${a} − __ = ${c}`)} אז ${M(`${a} − ${c} = ${missing}`)}.`),
      type: "equations",
      params,
      answer,
    });
      pushMathSteps(buildAdditionOrSubtractionAnimation(a, c, missing, "subtraction"), "math");
    } else {
      steps.push({
        id: "calc",
        title: "מחשבים את החסר",
        ...learningStepFields(mix`אם ${M(`__ − ${b} = ${c}`)} אז ${M(`${c} + ${b} = ${missing}`)}.`),
        type: "equations",
        params,
        answer,
      });
      pushMathSteps(buildAdditionOrSubtractionAnimation(c, b, missing, "addition"), "math");
    }
  } else if (kind === "eq_mul") {
    steps.push({
      id: "inverse",
      title: "פעולה הפוכה",
      ...learningStepFields(mix`בכפל הפעולה ההפוכה היא חילוק.`),
      type: "equations",
      params,
      answer,
    });
    const missing = Number(answer);
    const known = form === "a_times_x" ? a : b;
    steps.push({
      id: "calc",
      title: "מחשבים את החסר",
      ...learningStepFields(mix`נחשב: ${M(`${c} ÷ ${known} = ${missing}`)}.`),
      type: "equations",
      params,
      answer,
    });
    pushMathSteps(buildDivisionAnimation(c, known, missing), "math");
  } else if (kind === "eq_div") {
    const { dividend, divisor, quotient } = params;
    steps.push({
      id: "inverse",
      title: "רעיון",
      ...learningStepFields(mix`בחילוק משתמשים בכפל/חילוק כדי למצוא את המספר החסר.`),
      type: "equations",
      params,
      answer,
    });
    const missing = Number(answer);
    if (form === "a_div_x") {
      // dividend ÷ __ = quotient  => __ = dividend ÷ quotient
    steps.push({
        id: "calc",
        title: "מחשבים את המחלק החסר",
        ...learningStepFields(mix`אם ${M(`${dividend} ÷ __ = ${quotient}`)} אז ${M(`${dividend} ÷ ${quotient} = ${missing}`)}.`),
      type: "equations",
      params,
      answer,
    });
      pushMathSteps(buildDivisionAnimation(dividend, quotient, missing), "math");
    } else {
      // __ ÷ divisor = quotient => __ = quotient × divisor
      steps.push({
        id: "calc",
        title: "מחשבים את המחולק החסר",
        ...learningStepFields(mix`אם ${M(`__ ÷ ${divisor} = ${quotient}`)} אז ${M(`${quotient} × ${divisor} = ${missing}`)}.`),
        type: "equations",
        params,
        answer,
      });
      pushMathSteps(buildMultiplicationAnimation(quotient, divisor, missing), "math");
    }
  }

  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`התשובה היא ${answer}.`),
    type: "equations",
    params,
    answer,
  });
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה להשוואה
export function buildCompareAnimation(params, _answerIgnored) {
  const steps = [];
  const { a: numA, b: numB } = coerceComparisonOperands(params?.a, params?.b);
  const sign = getCanonicalComparisonSign(numA, numB);
  if (!sign || numA == null || numB == null) {
    return steps;
  }

  const aLabel = String(numA);
  const bLabel = String(numB);
  const signInProse = embedComparisonSignInRtlProse(sign);

  steps.push({
    id: "show-question",
    title: "הצגת השאלה",
    ...learningStepFields(mix`השלם את הסימן: ${M(`${aLabel} `)}__ ${bLabel}`),
    highlights: ["question"],
    type: "compare",
    params,
    answer: sign,
  });
  
  // צעד 2: הסבר על השוואה
  steps.push({
    id: "explain",
    title: "איך משווים?",
    ...learningStepFields(mix`נסתכל על שני המספרים: ${M(`${aLabel} `)}ו-${bLabel}.`),
    highlights: ["explanation"],
    type: "compare",
    params,
    answer: sign,
  });
  
  // צעד 3: החישוב
  const mathExpr = formatCompareMathExpression(numA, numB, sign);
  let comparison = "";
  if (sign === "<") {
    comparison = `${mathExpr} כי ${numA} קטן מ-${numB}.`;
  } else if (sign === ">") {
    comparison = `${mathExpr} כי ${numA} גדול מ-${numB}.`;
  } else {
    comparison = `${mathExpr} כי המספרים שווים.`;
  }

  steps.push({
    id: "calculate",
    title: "החישוב",
    ...learningStepFields(mix`${comparison} לכן בוחרים את הסימן ${signInProse}.`),
    highlights: ["calculation"],
    type: "compare",
    params,
    answer: sign,
  });
  
  // צעד 4: התוצאה
  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`הסימן הנכון הוא ${signInProse}`),
    highlights: ["result"],
    type: "compare",
    params,
    answer: sign,
  });
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לחוש מספרים
export function buildNumberSenseAnimation(params, answer) {
  const steps = [];
  const { kind } = params;
  if (kind === "ns_neighbors") {
    const { n, dir } = params;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...(dir === "after"
        ? learningStepFields(mix`מה המספר שבא אחרי ${n}?`)
        : learningStepFields(mix`מה המספר שבא לפני ${n}?`)),
      highlights: ["question"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "איך מוצאים שכן?",
      ...learningStepFields(dir === "after" ? mix`מספר אחד אחרי – מוסיפים 1: ${n} + 1 = ${answer}` : mix`מספר אחד לפני – מחסרים 1: ${n} - 1 = ${answer}`),
      highlights: ["explanation"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 3: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_place_tens_units" || kind === "ns_place_hundreds") {
    const { n, askTens, tens, units, hundreds } = params;
    
    // צעד 1: הצגת השאלה
    let questionText = "";
    if (kind === "ns_place_tens_units") {
      questionText = askTens 
        ? `מהי ספרת העשרות במספר ${n}?`
        : `מהי ספרת האחדות במספר ${n}?`;
    } else {
      const partType = params.partType;
      const label = partType === "hundreds" ? "המאות" : partType === "tens" ? "העשרות" : "האחדות";
      questionText = `מהי ספרת ${label} במספר ${n}?`;
    }
    
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`${questionText}`),
      highlights: ["question"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 2: פירוק המספר
    if (kind === "ns_place_tens_units") {
      steps.push({
        id: "breakdown",
        title: "פירוק המספר",
        ...learningStepFields(mix`${M(`${tens * 10} + ${units} = ${n}`)} (${tens} עשרות + ${units} אחדות)`),
        highlights: ["breakdown"],
        type: "number_sense",
        params,
        answer,
      });
    } else {
      steps.push({
        id: "breakdown",
        title: "פירוק המספר",
        ...learningStepFields(mix`${M(`${hundreds * 100} + ${tens * 10} + ${units} = ${n}`)} (${hundreds} מאות + ${tens} עשרות + ${units} אחדות)`),
        highlights: ["breakdown"],
        type: "number_sense",
        params,
        answer,
      });
    }
    
    // צעד 3: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_complement10" || kind === "ns_complement100") {
    const { b, c } = params;
    const target = c;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`__ + ${b} = ${M(`${target}`)}`),
      highlights: ["question"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "השלמה",
      ...learningStepFields(mix`מחפשים כמה חסר מ-${b} כדי להגיע ל-${target}`),
      highlights: ["explanation"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 3: החישוב
    steps.push({
      id: "calculate",
      title: "החישוב",
      ...learningStepFields(mix`נחשב: ${M(`${target} - ${b} = ${answer}`)}`),
      highlights: ["calculation"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 4: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_even_odd") {
    const { n, isEven } = params;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`האם המספר ${n} הוא זוגי או אי-זוגי?`),
      highlights: ["question"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "איך בודקים?",
      ...learningStepFields(mix`מסתכלים על ספרת האחדות של ${n}. אם הספרה היא 0,2,4,6,8 – המספר זוגי. אם 1,3,5,7,9 – אי-זוגי.`),
      highlights: ["explanation"],
      type: "number_sense",
      params,
      answer,
    });
    
    // צעד 3: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`המספר ${n} הוא ${answer}`),
      highlights: ["result"],
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_counting_forward") {
    const { start, next } = params;
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`מה המספר הבא אחרי ${start}?`),
      type: "number_sense",
      params,
      answer,
    });
    steps.push({
      id: "rule",
      title: "כלל",
      ...learningStepFields(mix`כדי למצוא את המספר הבא – מוסיפים 1.`),
      type: "number_sense",
      params,
      answer,
    });
    steps.push({
      id: "calc",
      title: "מחשבים",
      ...learningStepFields(mix`${M(`${start} + 1 = ${next}`)}.`),
      type: "number_sense",
      params,
      answer,
      pre: pureMathLtrBlock([`${start} + 1 = ${next}`]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_counting_backward") {
    const { start, prev } = params;
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`מה המספר שלפני ${start}?`),
      type: "number_sense",
      params,
      answer,
    });
    steps.push({
      id: "rule",
      title: "כלל",
      ...learningStepFields(mix`כדי למצוא את המספר שלפני – מחסרים 1.`),
      type: "number_sense",
      params,
      answer,
    });
    steps.push({
      id: "calc",
      title: "מחשבים",
      ...learningStepFields(mix`${M(`${start} − 1 = ${prev}`)}.`),
      type: "number_sense",
      params,
      answer,
      pre: pureMathLtrBlock([`${start} − 1 = ${prev}`]),
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "number_sense",
      params,
      answer,
    });
  } else if (kind === "ns_number_line") {
    const { start, end, missing, numbers } = params;
    const arr = Array.isArray(numbers) ? numbers : [];
    const display = arr.map((v) => (v === missing ? "__" : String(v))).join("  ");
    const step = arr.length >= 2 ? arr[1] - arr[0] : 1;
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`מה המספר החסר על קו המספרים?`),
      type: "number_sense",
      params,
      answer,
      pre: pureMathLtrBlock([display]),
    });
    steps.push({
      id: "range",
      title: "טווח וקפיצה קבועה",
      ...learningStepFields(mix`הקו מ-${start} עד ${end}. ההפרש בין נקודות סמוכות הוא ${step}.`),
      type: "number_sense",
      params,
      answer,
    });
    // מוצאים את הקודם למקום החסר אם אפשר
    const idx = arr.findIndex((v) => v === missing);
    const prevVal = idx > 0 ? arr[idx - 1] : null;
    if (prevVal != null) {
      steps.push({
        id: "calc",
        title: "מחשבים את החסר",
        ...learningStepFields(mix`מוסיפים קפיצה אחת: ${M(`${prevVal} + ${step} = ${missing}`)}.`),
        type: "number_sense",
        params,
        answer,
        pre: pureMathLtrBlock([`${prevVal} + ${step} = ${missing}`]),
      });
    }
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}.`),
      type: "number_sense",
      params,
      answer,
    });
  }
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לגורמים/כפולות
export function buildFactorsMultiplesAnimation(params, answer) {
  const steps = [];
  const { kind } = params;
  
  if (kind === "fm_factor") {
    const { n, correct } = params;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`איזה מהמספרים הבאים הוא מחלק (גורם) של ${n}?`),
      highlights: ["question"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "מה זה גורם?",
      ...learningStepFields(mix`גורם הוא מספר שמתחלק במספר בלי שארית. נבדוק אילו מספרים מתחלקים ב-${n} בלי שארית.`),
      highlights: ["explanation"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 3: בדיקה
    steps.push({
      id: "check",
      title: "בדיקה",
      ...learningStepFields(mix`נחלק את ${n} ב-${correct}: ${M(`${n} ÷ ${correct} = ${n / correct}. `)}זה מספר שלם, לכן ${correct} הוא גורם של ${n}`),
      highlights: ["check"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 4: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "factors_multiples",
      params,
      answer,
    });
  } else if (kind === "fm_multiple") {
    const { base, correct } = params;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`איזה מהמספרים הבאים הוא כפולה של ${base}?`),
      highlights: ["question"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "מה זה כפולה?",
      ...learningStepFields(mix`כפולה מתקבלת כשמכפילים את המספר במספר שלם. כפולות של ${base} הן: ${M(`${base} × 1, ${base} × 2, ${base} × 3, ...`)}`),
      highlights: ["explanation"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 3: בדיקה
    steps.push({
      id: "check",
      title: "בדיקה",
      ...learningStepFields(mix`נבדוק: ${M(`${correct} ÷ ${base} = ${correct / base}. `)}זה מספר שלם, לכן ${correct} הוא כפולה של ${base}`),
      highlights: ["check"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 4: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "factors_multiples",
      params,
      answer,
    });
  } else if (kind === "fm_gcd") {
    const { a, b, gcd } = params;
    
    // צעד 1: הצגת השאלה
    steps.push({
      id: "show-question",
      title: "הצגת השאלה",
      ...learningStepFields(mix`מהו המחלק המשותף הגדול ביותר של ${a} ו-${b}?`),
      highlights: ["question"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 2: הסבר
    steps.push({
      id: "explain",
      title: "מה זה מ.א.ח?",
      ...learningStepFields(mix`מחלק משותף גדול ביותר (מ.א.ח) הוא המספר הגדול ביותר שמחלק את שני המספרים בלי שארית.`),
      highlights: ["explanation"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 3: חישוב
    steps.push({
      id: "calculate",
      title: "חישוב",
      ...learningStepFields(mix`נפרק את ${a} ו-${b} לגורמים ונראה מי הגדול ביותר – כאן ${gcd}`),
      highlights: ["calculation"],
      type: "factors_multiples",
      params,
      answer,
    });
    
    // צעד 4: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "factors_multiples",
      params,
      answer,
    });
  }
  
  return steps;
}

// פונקציה לבניית צעדי אנימציה לתרגילי מילים
export function buildWordProblemsAnimation(params, answer) {
  const steps = [];
  const { kind } = params;

  const pushMathSteps = (mathSteps, prefixId) => {
    if (!Array.isArray(mathSteps)) return;
    mathSteps.forEach((s, idx) => {
      steps.push({
        ...s,
        id: `${prefixId}-${s.id || idx}`,
        // כדי שהמודל הכללי ידע שזה עדיין "שאלת מילים"
        type: s.type || "word_problems",
        params,
        answer,
      });
    });
  };
  
  if (kind === "wp_simple_add") {
    const { a, b } = params;
    const sum = a + b;
    
    // צעד 1: קריאת הסיפור
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${a} כדורים והוא מקבל עוד ${b} כדורים. כמה כדורים יש לליאו בסך הכל?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעד 2: זיהוי הפעולה
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`מזהים שהשאלה מבקשת כמה יש בסך הכל – פעולה של חיבור.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעד 3: כתיבת התרגיל
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`כותבים תרגיל: ${M(`${a} + ${b}`)}`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעדי החישוב בפירוט (כמו בחיבור)
    pushMathSteps(buildAdditionOrSubtractionAnimation(a, b, sum, "addition"), "math");
    
    // צעד 5: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה: לליאו יש ${answer} כדורים.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_simple_sub") {
    const { total, give } = params;
    const left = total - give;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${total} מדבקות. הוא נותן לחבר ${give} מדבקות. כמה מדבקות נשארות לליאו?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`נותנים/מורידים → חיסור.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`כותבים תרגיל: ${M(`${total} − ${give}`)}`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(total, give, left, "subtraction"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`נשארות לליאו ${answer} מדבקות.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_pocket_money") {
    const { money, toy } = params;
    const left = money - toy;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${money}₪ דמי כיס. הוא קונה משחק ב-${toy}₪. כמה כסף נשאר לו?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`קנייה מורידה כסף → חיסור.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`כותבים תרגיל: ${M(`${money} − ${toy}`)}`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(money, toy, left, "subtraction"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`יישאר לליאו ${answer}₪.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_time_days") {
    const { days } = params;
    steps.push({
      id: "read-story",
      title: "קריאת השאלה",
      ...learningStepFields(mix`שאלה על ימים בשבוע: כמה ימים יעברו עד יום מסוים?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "method",
      title: "איך פותרים?",
      ...learningStepFields(mix`סופרים יום-יום קדימה בלוח השנה. כל מעבר ליום הבא הוא +1.`),
      highlights: ["explanation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "count",
      title: "סופרים ימים",
      ...learningStepFields(mix`ספרנו ${days} ימים עד היום המבוקש.`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer} ימים.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_time_date") {
    const { today, daysLater } = params;
    const res = today + daysLater;
    steps.push({
      id: "read-story",
      title: "קריאת השאלה",
      ...learningStepFields(mix`אם היום ה-${today} לחודש, איזה תאריך יהיה בעוד ${daysLater} ימים?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "equation",
      title: "כותבים תרגיל",
      ...learningStepFields(mix`תאריך עתידי = תאריך היום + מספר ימים ⇒ ${M(`${today} + ${daysLater}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(today, daysLater, res, "addition"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התאריך יהיה ה-${answer} לחודש.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_groups") {
    const { per, groups } = params;
    const prod = per * groups;
    
    // צעד 1: קריאת הסיפור
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`בכל קופסה יש ${per} עפרונות. יש ${groups} קופסאות כאלה. כמה עפרונות יש בסך הכל?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעד 2: זיהוי הפעולה
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`בכל קופסה יש ${per} עפרונות ויש ${groups} קופסאות – מדובר בחיבור חוזר, כלומר כפל.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעד 3: כתיבת התרגיל
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`נרשום תרגיל כפל: ${M(`${per} × ${groups}`)}`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    
    // צעדי החישוב בפירוט (כמו בכפל)
    pushMathSteps(buildMultiplicationAnimation(per, groups, prod), "math");
    
    // צעד 5: התוצאה
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה: ${M(`${answer} `)}עפרונות.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_division_simple") {
    const { total, perGroup, groups } = params;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`יש ${total} תפוחים. מחלקים אותם לקבוצות של ${perGroup} תפוחים בכל קבוצה. כמה קבוצות יש?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`מחלקים לכמה קבוצות שוות → חילוק.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`נכתוב תרגיל: ${M(`${total} ÷ ${perGroup}`)}`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    // צעדי החישוב בפירוט (כמו חילוק ארוך)
    pushMathSteps(buildDivisionAnimation(total, perGroup, groups), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`יש ${answer} קבוצות.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_leftover") {
    const { total, groupSize, groups, leftover } = params;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`יש ${total} תלמידים והם מתחלקים לקבוצות של ${groupSize} תלמידים בכל קבוצה. כמה תלמידים יישארו בלי קבוצה מלאה?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`זה חילוק עם שארית: השארית היא כמה נשאר בלי קבוצה.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`נכתוב תרגיל: ${M(`${total} ÷ ${groupSize}`)} ונחפש את השארית.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildDivisionAnimation(total, groupSize, groups), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`השארית היא ${leftover}, לכן ${answer} תלמידים יישארו בלי קבוצה מלאה.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_coins") {
    const { coins1, coins2, value1, value2 } = params;
    const sum = value1 + value2;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${coins1} מטבעות של שקל ו-${coins2} מטבעות של 2 שקלים. כמה כסף יש לו בסך הכל?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "find-values",
      title: "מחשבים כל חלק",
      ...learningStepFields(mix`שווי המטבעות: ${M(`${coins1}×1=${value1}`)} וגם ${M(`${coins2}×2=${value2}`)}.`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(value1, value2, sum, "addition"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`בסך הכול יש לליאו ${answer}₪.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_coins_spent") {
    const { total, spent } = params;
    const left = total - spent;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${total}₪. הוא קונה ממתק ב-${spent}₪. כמה כסף נשאר לו?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`אם קונים משהו - מורידים מהסכום, כלומר חיסור.`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(total, spent, left, "subtraction"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`נשאר לליאו ${answer}₪.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_shop_discount") {
    const { price, discPerc, discount, finalPrice } = params;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`חולצה עולה ${price}₪ ויש עליה הנחה של ${discPerc}%. כמה תשלם אחרי ההנחה?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "find-discount",
      title: "מחשבים כמה ההנחה",
      ...learningStepFields(mix`מחשבים ${discPerc}% מתוך ${price}: ${M(`${price} × ${discPerc} ÷ 100 = ${discount}`)}.`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "write-equation",
      title: "מחשבים מחיר אחרי הנחה",
      ...learningStepFields(mix`מורידים את ההנחה מהמחיר: ${M(`${price} − ${discount} = ${finalPrice}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(price, discount, finalPrice, "subtraction"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`אחרי ההנחה משלמים ${answer}₪.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_distance_time") {
    const { speed, hours, distance } = params;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`ילד הולך במהירות קבועה של ${speed} ק"מ בשעה במשך ${hours} שעות. כמה קילומטרים יעבור?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "equation",
      title: "כותבים תרגיל",
      ...learningStepFields(mix`מרחק = מהירות × זמן ⇒ ${M(`${speed} × ${hours}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildMultiplicationAnimation(speed, hours, distance), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`הוא יעבור ${answer} ק"מ.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_time_sum") {
    const { l1, l2 } = params;
    const sum = l1 + l2;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`סרט ראשון נמשך ${l1} דקות וסרטון נוסף נמשך ${l2} דקות. כמה דקות נמשך הצפייה ביחד?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "equation",
      title: "כותבים תרגיל",
      ...learningStepFields(mix`ביחד זה חיבור: ${M(`${l1} + ${l2}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(l1, l2, sum, "addition"), "math");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`ביחד זה ${answer} דקות.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_unit_cm_to_m") {
    const { cm, meters } = params;
    steps.push({
      id: "read-story",
      title: "קריאת השאלה",
      ...learningStepFields(mix`כמה מטרים הם ${cm} סנטימטרים?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "rule",
      title: "כלל המרה",
      ...learningStepFields(mix`1 מטר = 100 ס״מ. כדי להמיר מס״מ למטרים מחלקים ב-100.`),
      highlights: ["explanation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "calc",
      title: "מחשבים",
      ...learningStepFields(mix`${M(`${cm} ÷ 100 = ${meters}`)}`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer} מטרים.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_unit_g_to_kg") {
    const { g, kg } = params;
    steps.push({
      id: "read-story",
      title: "קריאת השאלה",
      ...learningStepFields(mix`כמה קילוגרמים הם ${g} גרם?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "rule",
      title: "כלל המרה",
      ...learningStepFields(mix`1 ק״ג = 1000 גרם. כדי להמיר מגרם לק״ג מחלקים ב-1000.`),
      highlights: ["explanation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "calc",
      title: "מחשבים",
      ...learningStepFields(mix`${M(`${g} ÷ 1000 = ${kg}`)}`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer} קילוגרמים.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_average") {
    const { s1, s2, s3 } = params;
    const sum = s1 + s2 + s3;
    const exact = sum / 3;
    const rounded = Number(answer);
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו ציונים ${s1}, ${s2} ו-${s3}. מה הממוצע (מעוגל למספר שלם)?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "step1",
      title: "שלב 1: מחברים ציונים",
      ...learningStepFields(mix`מחשבים סכום: ${M(`${s1} + ${s2} + ${s3} = ${sum}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "step2",
      title: "שלב 2: מחלקים במספר הציונים",
      ...learningStepFields(mix`ממוצע = סכום ÷ 3 ⇒ ${M(`${sum} ÷ 3 = ${exact}`)}.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "step3",
      title: "שלב 3: מעגלים",
      ...learningStepFields(mix`מעגלים למספר שלם: ${M(`${exact} ≈ ${rounded}`)}.`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`הממוצע המעוגל הוא ${answer}.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else if (kind === "wp_multi_step") {
    const { a, b, price, totalQty, totalCost, money } = params;
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`לליאו יש ${money}₪. הוא קונה ${a} עטים ו-${b} עפרונות, וכל פריט עולה ${price}₪. כמה כסף יישאר לו אחרי הקנייה?`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    steps.push({
      id: "step1",
      title: "שלב 1: כמה פריטים קונים?",
      ...learningStepFields(mix`מחברים כמויות: ${M(`${a} + ${b} = ${totalQty}`)} פריטים.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(a, b, totalQty, "addition"), "math1");
    steps.push({
      id: "step2",
      title: "שלב 2: כמה זה עולה ביחד?",
      ...learningStepFields(mix`כפול מחיר לפריט: ${M(`${totalQty} × ${price} = ${totalCost}`)}₪.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildMultiplicationAnimation(totalQty, price, totalCost), "math2");
    steps.push({
      id: "step3",
      title: "שלב 3: כמה כסף נשאר?",
      ...learningStepFields(mix`מחסרים מהכסף שיש: ${M(`${money} − ${totalCost} = ${answer}`)}₪.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    pushMathSteps(buildAdditionOrSubtractionAnimation(money, totalCost, Number(answer), "subtraction"), "math3");
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`יישאר לליאו ${answer}₪.`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  } else {
    // תרגילי מילים כלליים (fallback)
    steps.push({
      id: "read-story",
      title: "קריאת הסיפור",
      ...learningStepFields(mix`קוראים את הסיפור בקפידה ומזהים את המספרים והפעולה הנדרשת.`),
      highlights: ["story"],
      type: "word_problems",
      params,
      answer,
    });
    
    steps.push({
      id: "identify-operation",
      title: "זיהוי הפעולה",
      ...learningStepFields(mix`מזהים מה שואלים – כמה ביחד? כמה נשאר? כמה בכל קבוצה?`),
      highlights: ["operation"],
      type: "word_problems",
      params,
      answer,
    });
    
    steps.push({
      id: "write-equation",
      title: "כתיבת התרגיל",
      ...learningStepFields(mix`כותבים תרגיל מתמטיקה שמתאים לסיפור.`),
      highlights: ["equation"],
      type: "word_problems",
      params,
      answer,
    });
    
    steps.push({
      id: "calculate",
      title: "החישוב",
      ...learningStepFields(mix`פותרים את התרגיל.`),
      highlights: ["calculation"],
      type: "word_problems",
      params,
      answer,
    });
    
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`התשובה היא ${answer}`),
      highlights: ["result"],
      type: "word_problems",
      params,
      answer,
    });
  }
  
  return steps;
}

// ===== נושאים נוספים: אנימציות מפורטות (כמו בחיבור/כפל) =====

export function buildRoundingAnimation(params, answer) {
  const steps = [];
  const { n, toWhat } = params;
  const targetLabel = toWhat === "tens" ? "עשרות" : "מאות";
  const digitToCheck = toWhat === "tens" ? Math.floor((n % 10) / 1) : Math.floor((n % 100) / 10);
  const checkLabel = toWhat === "tens" ? "ספרת האחדות" : "ספרת העשרות";

  steps.push({
    id: "show",
    title: "מה מעגלים?",
    ...learningStepFields(mix`מעגלים את ${n} ל-${targetLabel}.`),
    type: "rounding",
    params,
    answer,
  });
  steps.push({
    id: "find-digit",
    title: "איזו ספרה קובעת?",
    ...learningStepFields(mix`כדי לעגל ל-${targetLabel} מסתכלים על ${checkLabel}. כאן היא ${digitToCheck}.`),
    type: "rounding",
    params,
    answer,
  });
  steps.push({
    id: "rule",
    title: "כלל העיגול",
    ...learningStepFields(mix`אם הספרה הקובעת היא 0–4 מעגלים למטה. אם 5–9 מעגלים למעלה.`),
    type: "rounding",
    params,
    answer,
  });
  const rounded = Number(answer);
  steps.push({
    id: "calc",
    title: "מחשבים",
    ...learningStepFields(mix`${digitToCheck >= 5 ? "מעגלים למעלה" : "מעגלים למטה"} ⇒ ${M(`${n} ≈ ${rounded}`)}.`),
    type: "rounding",
    params,
    answer,
  });
  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`התשובה היא ${answer}.`),
    type: "rounding",
    params,
    answer,
  });
  return steps;
}

export function buildDivisibilityAnimation(params, answer) {
  const steps = [];
  const { num, divisor } = params;
  steps.push({
    id: "show",
    title: "הצגת השאלה",
    ...learningStepFields(mix`האם ${num} מתחלק ב-${divisor}?`),
    type: "divisibility",
    params,
    answer,
  });

  const lastDigit = num % 10;
  const sumDigits = String(num)
    .split("")
    .reduce((s, d) => s + Number(d), 0);

  if (divisor === 2) {
    steps.push({
      id: "rule",
      title: "כלל התחלקות ב-2",
      ...learningStepFields(mix`מספר מתחלק ב-2 אם ספרת האחדות זוגית (0,2,4,6,8).`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check",
      title: "בודקים",
      ...learningStepFields(mix`ספרת האחדות היא ${lastDigit}. לכן ${M(`${answer === "כן" ? "כן" : "לא"}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
  } else if (divisor === 5) {
    steps.push({
      id: "rule",
      title: "כלל התחלקות ב-5",
      ...learningStepFields(mix`מספר מתחלק ב-5 אם ספרת האחדות היא 0 או 5.`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check",
      title: "בודקים",
      ...learningStepFields(mix`ספרת האחדות היא ${lastDigit}. לכן ${M(`${answer === "כן" ? "כן" : "לא"}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
  } else if (divisor === 10) {
    steps.push({
      id: "rule",
      title: "כלל התחלקות ב-10",
      ...learningStepFields(mix`מספר מתחלק ב-10 אם ספרת האחדות היא 0.`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check",
      title: "בודקים",
      ...learningStepFields(mix`ספרת האחדות היא ${lastDigit}. לכן ${M(`${answer === "כן" ? "כן" : "לא"}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
  } else if (divisor === 3 || divisor === 9) {
    steps.push({
      id: "rule",
      title: `כלל התחלקות ב-${divisor}`,
      ...learningStepFields(mix`מספר מתחלק ב-${divisor} אם סכום ספרותיו מתחלק ב-${divisor}.`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "sum",
      title: "סכום הספרות",
      ...learningStepFields(mix`סכום הספרות: ${M(`${String(num).split("").join(" + ")} = ${sumDigits}`)}.`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check",
      title: "בודקים",
      ...learningStepFields(mix`${sumDigits} ${M(`${sumDigits % divisor === 0 ? "מתחלק" : "לא מתחלק"} `)}ב-${divisor} ⇒ התשובה: ${M(`${answer}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
  } else if (divisor === 6) {
    steps.push({
      id: "rule",
      title: "כלל התחלקות ב-6",
      ...learningStepFields(mix`מספר מתחלק ב-6 אם הוא מתחלק גם ב-2 וגם ב-3.`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check2",
      title: "בודקים התחלקות ב-2",
      ...learningStepFields(mix`ספרת האחדות היא ${lastDigit} ⇒ ${M(`${lastDigit % 2 === 0 ? "מתחלק ב-2" : "לא מתחלק ב-2"}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "check3",
      title: "בודקים התחלקות ב-3",
      ...learningStepFields(mix`סכום הספרות הוא ${sumDigits} ⇒ ${M(`${sumDigits % 3 === 0 ? "מתחלק ב-3" : "לא מתחלק ב-3"}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "מסקנה",
      ...learningStepFields(mix`רק אם שני התנאים נכונים ⇒ מתחלק ב-6. התשובה: ${M(`${answer}.`)}`),
      type: "divisibility",
      params,
      answer,
    });
  } else {
    // fallback: בדיקה בחלוקה (מסביר עדיין)
    const q = Math.floor(num / divisor);
    const r = num % divisor;
    steps.push({
      id: "fallback",
      title: "בדיקה בחלוקה",
      ...learningStepFields(mix`בודקים בחלוקה: ${M(`${num} = ${divisor}×${q} + ${r}`)}. אם השארית 0 אז מתחלק.`),
      type: "divisibility",
      params,
      answer,
    });
  }

  steps.push({
    id: "final-answer",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`התשובה היא ${answer}.`),
    type: "divisibility",
    params,
    answer,
  });
  return steps;
}

export function buildPrimeCompositeAnimation(params, answer) {
  const steps = [];
  const { num, isPrime } = params;
  steps.push({
    id: "show",
    title: "מה שואלים?",
    ...learningStepFields(mix`האם ${num} הוא ראשוני או פריק?`),
    type: "prime_composite",
    params,
    answer,
  });
  steps.push({
    id: "define",
    title: "הגדרה",
    ...learningStepFields(mix`מספר ראשוני מתחלק רק ב-1 ובעצמו. מספר פריק מתחלק גם במספר נוסף.`),
    type: "prime_composite",
    params,
    answer,
  });
  steps.push({
    id: "check-small",
    title: "מה בודקים?",
    ...learningStepFields(mix`מספיק לבדוק מחלקים עד u221A${num} (כי אם יש מחלק גדול, יש גם מחלק קטן).`),
    type: "prime_composite",
    params,
    answer,
  });

  if (num === 2) {
    steps.push({
      id: "two",
      title: "מקרה מיוחד",
      ...learningStepFields(mix`2 הוא מספר ראשוני.`),
      type: "prime_composite",
      params,
      answer,
    });
  } else {
    let found = null;
    const limit = Math.floor(Math.sqrt(num));
    let explainedTries = 0;
    for (let d = 2; d <= limit; d++) {
      if (num % d === 0) {
        found = d;
        break;
      }
      if (explainedTries < 6) {
        steps.push({
          id: `try-${d}`,
          title: `בודקים חלוקה ב-${d}`,
          ...learningStepFields(mix`${M(`${num} ÷ ${d}`)} לא יוצא מספר שלם ⇒ ממשיכים.`),
          type: "prime_composite",
          params,
          answer,
        });
        explainedTries++;
      }
    }
    if (found != null) {
      steps.push({
        id: "found",
        title: "מצאנו מחלק",
        ...learningStepFields(mix`${M(`${num} ÷ ${found} = ${num / found}`)} (מספר שלם) ⇒ ${num} פריק.`),
        type: "prime_composite",
        params,
        answer,
      });
    } else {
      steps.push({
        id: "none",
        title: "לא מצאנו מחלקים",
        ...learningStepFields(mix`לא מצאנו מחלק עד u221A${num} ⇒ ${num} ראשוני.`),
        type: "prime_composite",
        params,
        answer,
      });
    }
  }

  steps.push({
    id: "final",
    title: "התוצאה הסופית",
    ...learningStepFields(mix`התשובה היא ${answer}.`),
    type: "prime_composite",
    params,
    answer,
  });
  return steps;
}

export function buildPowersAnimation(params, answer) {
  const steps = [];
  const { kind, base, exp, result } = params;
  steps.push({
    id: "show",
    title: "מה זו חזקה?",
    ...learningStepFields(mix`חזקה היא כפל חוזר: ${M(`${base}^${exp} = ${base} × ${base} × ...`)} (${exp} פעמים).`),
    type: "powers",
    params,
    answer,
  });

  if (kind === "power_calc") {
    steps.push({
      id: "expand",
      title: "פותחים את החזקה",
      ...learningStepFields(mix`נרשום ככפל חוזר: ${M(`${base}^${exp} = ${Array(exp).fill(base).join(" × ")}`)}.`),
      type: "powers",
      params,
      answer,
    });

    let acc = base;
    for (let i = 2; i <= exp; i++) {
      const next = acc * base;
      steps.push({
        id: `mul-${i}`,
        title: `כפל מספר ${i}`,
        ...learningStepFields(mix`מחשבים: ${M(`${acc} × ${base} = ${next}`)}.`),
        type: "powers",
        params,
        answer,
      });
      acc = next;
    }

    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`לכן ${M(`${base}^${exp} = ${result}`)}.`),
      type: "powers",
      params,
      answer,
    });
  } else if (kind === "power_base") {
    steps.push({
      id: "goal",
      title: "מה מחפשים?",
      ...learningStepFields(mix`מחפשים את הבסיס כך ש-${M(`(בסיס)^${exp} = ${result}`)}.`),
      type: "powers",
      params,
      answer,
    });
    steps.push({
      id: "trial",
      title: "בודקים אפשרויות",
      ...learningStepFields(mix`בודקים מספרים קטנים: למשל 2^${exp}, 3^${exp}, 4^${exp}... עד שמקבלים ${result}.`),
      type: "powers",
      params,
      answer,
    });
    steps.push({
      id: "final",
      title: "התוצאה הסופית",
      ...learningStepFields(mix`מצאנו ש-${M(`${answer}^${exp} = ${result}`)}, לכן הבסיס הוא ${answer}.`),
      type: "powers",
      params,
      answer,
    });
  }
  return steps;
}

export function buildRatioAnimation(params, answer) {
  const steps = [];
  const { kind } = params;
  const gcd = (a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  };

  if (kind === "ratio_find") {
    const { a, b, simplifiedA, simplifiedB } = params;
    const g = gcd(a, b);
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`מה היחס בין ${a} ל-${b}?`), type: "ratio", params, answer });
    steps.push({ id: "gcd", title: "מצמצמים את היחס", ...learningStepFields(mix`מחלקים את שני המספרים באותו מחלק משותף. כאן המחלק הוא ${g}.`), type: "ratio", params, answer });
    steps.push({ id: "calc", title: "חישוב", ...learningStepFields(mix`${M(`${a} ÷ ${g} = ${simplifiedA}`)} וגם ${M(`${b} ÷ ${g} = ${simplifiedB}`)}.`), type: "ratio", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`לכן היחס המצומצם הוא ${simplifiedA}:${M(`${simplifiedB}.`)}`), type: "ratio", params, answer });
  } else if (kind === "ratio_first") {
    const { firstNum, secondNum, simplifiedA, simplifiedB } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`היחס הוא ${simplifiedA}:${M(`${simplifiedB}. `)}המספר השני הוא ${secondNum}. מה המספר הראשון?`), type: "ratio", params, answer });
    steps.push({ id: "scale", title: "מוצאים מקדם", ...learningStepFields(mix`אם ${simplifiedB} מתאימים ל-${secondNum}, אז המקדם הוא ${M(`${secondNum} ÷ ${simplifiedB}`)}.`), type: "ratio", params, answer });
    const k = secondNum / simplifiedB;
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`המספר הראשון: ${M(`${simplifiedA} × ${k} = ${firstNum}`)}.`), type: "ratio", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "ratio", params, answer });
  } else if (kind === "ratio_second") {
    const { firstNum, secondNum, simplifiedA, simplifiedB } = params;
    steps.push({ id: "show", title: "הצגת השאלה", ...learningStepFields(mix`היחס הוא ${simplifiedA}:${M(`${simplifiedB}. `)}המספר הראשון הוא ${firstNum}. מה המספר השני?`), type: "ratio", params, answer });
    steps.push({ id: "scale", title: "מוצאים מקדם", ...learningStepFields(mix`אם ${simplifiedA} מתאימים ל-${firstNum}, אז המקדם הוא ${M(`${firstNum} ÷ ${simplifiedA}`)}.`), type: "ratio", params, answer });
    const k = firstNum / simplifiedA;
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`המספר השני: ${M(`${simplifiedB} × ${k} = ${secondNum}`)}.`), type: "ratio", params, answer });
    steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "ratio", params, answer });
  }
  return steps;
}

export function buildOrderOfOperationsAnimation(params, answer) {
  const steps = [];
  const { kind, a, b, c } = params;
  steps.push({
    id: "rule",
    title: "סדר פעולות",
    ...learningStepFields(mix`סדר פעולות: סוגריים → כפל/חילוק → חיבור/חיסור.`),
    type: "order_of_operations",
    params,
    answer,
  });

  if (kind === "order_parentheses") {
    steps.push({ id: "show", title: "התרגיל", ...learningStepFields(mix`${M(`${a} × (${b} + ${c})`)}`), type: "order_of_operations", params, answer });
    const inside = b + c;
    steps.push({ id: "par", title: "סוגריים קודם", ...learningStepFields(mix`${M(`${b} + ${c} = ${inside}`)}`), type: "order_of_operations", params, answer });
    const res = a * inside;
    steps.push({ id: "mul", title: "אחר כך כפל", ...learningStepFields(mix`${M(`${a} × ${inside} = ${res}`)}`), type: "order_of_operations", params, answer });
  } else if (kind === "order_add_mul") {
    steps.push({ id: "show", title: "התרגיל", ...learningStepFields(mix`${M(`${a} + ${b} × ${c}`)}`), type: "order_of_operations", params, answer });
    const mul = b * c;
    steps.push({ id: "mul", title: "כפל קודם", ...learningStepFields(mix`${M(`${b} × ${c} = ${mul}`)}`), type: "order_of_operations", params, answer });
    const res = a + mul;
    steps.push({ id: "add", title: "אחר כך חיבור", ...learningStepFields(mix`${M(`${a} + ${mul} = ${res}`)}`), type: "order_of_operations", params, answer });
  } else if (kind === "order_mul_sub") {
    steps.push({ id: "show", title: "התרגיל", ...learningStepFields(mix`${M(`${a} × ${b} − ${c}`)}`), type: "order_of_operations", params, answer });
    const mul = a * b;
    steps.push({ id: "mul", title: "כפל קודם", ...learningStepFields(mix`${M(`${a} × ${b} = ${mul}`)}`), type: "order_of_operations", params, answer });
    const res = mul - c;
    steps.push({ id: "sub", title: "אחר כך חיסור", ...learningStepFields(mix`${M(`${mul} − ${c} = ${res}`)}`), type: "order_of_operations", params, answer });
  }

  steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "order_of_operations", params, answer });
  return steps;
}

export function buildZeroOnePropertiesAnimation(params, answer) {
  const steps = [];
  const { kind, a } = params;
  const expr =
    kind === "zero_mul"
      ? `${a} × 0`
      : kind === "zero_add"
        ? `${a} + 0`
        : kind === "zero_sub"
          ? `${a} − 0`
          : `${a} × 1`;
  steps.push({
    id: "show",
    title: "הצגת השאלה",
    ...learningStepFields(mix`נחשב: ${M(`${pureMathLtrDisplay(expr)}`)}`),
    type: "zero_one_properties",
    params,
    answer,
  });

  if (kind === "zero_mul") {
    steps.push({ id: "rule", title: "כלל כפל ב-0", ...learningStepFields(mix`כל מספר כפול 0 שווה 0.`), type: "zero_one_properties", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${a} × 0 = 0`)}`), type: "zero_one_properties", params, answer });
  } else if (kind === "zero_add") {
    steps.push({ id: "rule", title: "כלל חיבור עם 0", ...learningStepFields(mix`חיבור 0 לא משנה את המספר.`), type: "zero_one_properties", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${a} + 0 = ${a}`)}`), type: "zero_one_properties", params, answer });
  } else if (kind === "zero_sub") {
    steps.push({ id: "rule", title: "כלל חיסור 0", ...learningStepFields(mix`חיסור 0 לא משנה את המספר.`), type: "zero_one_properties", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${a} − 0 = ${a}`)}`), type: "zero_one_properties", params, answer });
  } else if (kind === "one_mul") {
    steps.push({ id: "rule", title: "כלל כפל ב-1", ...learningStepFields(mix`כל מספר כפול 1 שווה לעצמו.`), type: "zero_one_properties", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${a} × 1 = ${a}`)}`), type: "zero_one_properties", params, answer });
  }
  steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "zero_one_properties", params, answer });
  return steps;
}

export function buildEstimationAnimation(params, answer) {
  const steps = [];
  const { kind } = params;
  steps.push({ id: "show", title: "מה זה אומדן?", ...learningStepFields(mix`אומדן הוא תשובה קרובה (לא מדויקת), כדי לחשב מהר.`), type: "estimation", params, answer });

  if (kind === "est_add") {
    const { a, b, exact, estimate } = params;
    steps.push({ id: "round", title: "מעגלים", ...learningStepFields(mix`מעגלים את התוצאה לעשרות הקרובות.`), type: "estimation", params, answer });
    steps.push({ id: "calc", title: "חישוב מדויק", ...learningStepFields(mix`${M(`${a} + ${b} = ${exact}`)}`), type: "estimation", params, answer });
    steps.push({ id: "est", title: "אומדן", ...learningStepFields(mix`מעגלים: ${M(`${exact} ≈ ${estimate}`)}`), type: "estimation", params, answer });
  } else if (kind === "est_mul") {
    const { a, b, exact, estimate } = params;
    steps.push({ id: "round", title: "מעגלים", ...learningStepFields(mix`מעגלים את התוצאה למאות הקרובות.`), type: "estimation", params, answer });
    steps.push({ id: "calc", title: "חישוב מדויק", ...learningStepFields(mix`${M(`${a} × ${b} = ${exact}`)}`), type: "estimation", params, answer });
    steps.push({ id: "est", title: "אומדן", ...learningStepFields(mix`מעגלים: ${M(`${exact} ≈ ${estimate}`)}`), type: "estimation", params, answer });
  } else if (kind === "est_quantity") {
    const { quantity, estimate } = params;
    steps.push({ id: "round", title: "מעגלים לעשרות", ...learningStepFields(mix`${M(`${quantity} ≈ ${estimate}`)}`), type: "estimation", params, answer });
  }

  steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`האומדן הוא ${answer}.`), type: "estimation", params, answer });
  return steps;
}

export function buildScaleAnimation(params, answer) {
  const steps = [];
  const { kind } = params;
  steps.push({ id: "show", title: "קנה מידה", ...learningStepFields(mix`בקנה מידה 1:${M(`${params.scale || "?"} `)}– כל 1 ס״מ במפה מייצג ${params.scale || "?"} ס״מ במציאות.`), type: "scale", params, answer });

  if (kind === "scale_map_to_real") {
    const { mapLength, scale, realLength } = params;
    steps.push({ id: "eq", title: "כותבים תרגיל", ...learningStepFields(mix`מציאות = מפה × קנה מידה`), type: "scale", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${mapLength} × ${scale} = ${realLength}`)}`), type: "scale", params, answer });
  } else if (kind === "scale_real_to_map") {
    const { realLength, scale, mapLength } = params;
    steps.push({ id: "eq", title: "כותבים תרגיל", ...learningStepFields(mix`מפה = מציאות ÷ קנה מידה`), type: "scale", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${realLength} ÷ ${scale} = ${mapLength}`)}`), type: "scale", params, answer });
  } else if (kind === "scale_find") {
    const { mapLength, realLength, scale } = params;
    steps.push({ id: "eq", title: "כותבים תרגיל", ...learningStepFields(mix`קנה מידה = מציאות ÷ מפה`), type: "scale", params, answer });
    steps.push({ id: "calc", title: "מחשבים", ...learningStepFields(mix`${M(`${realLength} ÷ ${mapLength} = ${scale}`)}`), type: "scale", params, answer });
    steps.push({ id: "format", title: "כותבים בצורה 1:X", ...learningStepFields(mix`לכן קנה המידה הוא 1:${M(`${scale}.`)}`), type: "scale", params, answer });
  }

  steps.push({ id: "final", title: "התוצאה הסופית", ...learningStepFields(mix`התשובה היא ${answer}.`), type: "scale", params, answer });
  return steps;
}

// פונקציה כללית לבניית אנימציה לפי נושא
export function buildAnimationForOperation(question, operation, gradeKey) {
  if (!question || !question.params) return null;
  
  const params = question.params;
  const answer = question.correctAnswer !== undefined 
    ? question.correctAnswer 
    : question.answer;
  
  switch (operation) {
    case "multiplication":
      if (params.a && params.b) {
        return buildMultiplicationAnimation(params.a, params.b, answer);
      }
      break;
      
    case "division":
    case "division_with_remainder":
      // בחלק מהתרגילים אין params.quotient (הוא פשוט התשובה). עדיין נרצה אנימציה.
      if (params.dividend != null && params.divisor != null) {
        const q =
          params.quotient != null
            ? params.quotient
            : (typeof answer === "number" ? answer : null);
        if (q != null) {
          return buildDivisionAnimation(params.dividend, params.divisor, q);
        }
      }
      break;
      
    case "decimals":
      if (params.a && params.b) {
        return buildDecimalsAnimation(params, answer);
      }
      break;
      
    case "fractions":
      return buildFractionsAnimation(params, answer);
      
    case "percentages":
      return buildPercentagesAnimation(params, answer);
      
    case "sequences":
      return buildSequencesAnimation(params, answer);
      
    case "equations":
      return buildEquationsAnimation(params, answer);
      
    case "compare":
      return buildCompareAnimation(params, null);
      
    case "number_sense":
      return buildNumberSenseAnimation(params, answer);
      
    case "factors_multiples":
      return buildFactorsMultiplesAnimation(params, answer);
      
    case "word_problems":
      return buildWordProblemsAnimation(params, answer);

    case "rounding":
      return buildRoundingAnimation(params, answer);

    case "divisibility":
      return buildDivisibilityAnimation(params, answer);

    case "prime_composite":
      return buildPrimeCompositeAnimation(params, answer);

    case "powers":
      return buildPowersAnimation(params, answer);

    case "ratio":
      return buildRatioAnimation(params, answer);

    case "order_of_operations":
      return buildOrderOfOperationsAnimation(params, answer);

    case "zero_one_properties":
      return buildZeroOnePropertiesAnimation(params, answer);

    case "estimation":
      return buildEstimationAnimation(params, answer);

    case "scale":
      return buildScaleAnimation(params, answer);
      
    default:
      return null;
  }
  
  return null;
}

