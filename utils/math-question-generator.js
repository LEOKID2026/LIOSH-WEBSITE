import { GRADES, BLANK } from './math-constants.js';
import { mergeDiagnosticContractIntoParams } from './diagnostic-question-contract.js';
import { probeMatchesSession } from './active-diagnostic-runtime/session-match.js';
import { attachProfessionalMathMetadata } from './math-question-metadata.js';
import { sanitizeQuestionForStudentDisplay } from './student-question-stem-sanitizer.js';
import {
  COMPARISON_SIGN_DISPLAY_ORDER,
  computeComparisonSign,
  finalizeComparisonSignMcq,
  isComparisonSignMcq,
} from './comparison-sign-mcq.js';
import { attachMathEquationInstructionLabel } from './student-question-display.js';
import { mcqCellValue } from './mcq-option-cell.js';
import { normalizeOptionForCompare } from './question-quality.js';

function mathLevelKeyFromConfig(levelConfig) {
  const n = String(levelConfig?.name || "").trim();
  if (n === "קשה") return "hard";
  if (n === "בינוני") return "medium";
  return "easy";
}

/**
 * הבחנה טקסטואלית בין רמות קושי (בנוסף למספרים) — לא משנה את התשובה הנכונה.
 */
function applyMathLevelPresentation(question, ctx) {
  const q0 = String(question || "");
  if (!q0.trim()) return q0;
  const { selectedOp, params, mathLevelKey, gradeKey } = ctx;
  const kind = String(params?.kind || "");
  const gNum =
    parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 0;
  const gradeHeb =
    gNum >= 1 && gNum <= 6
      ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"][gNum - 1]
      : "";
  const gradeBandSuffix = "";
  if (kind.startsWith("wp_") || selectedOp === "word_problems") return q0;

  if (kind === "ns_complement100") {
    const b = params?.b;
    const c = params?.c != null ? Number(params.c) : 100;
    const gSuf = gradeBandSuffix;
    if (b != null && Number.isFinite(c)) {
      if (mathLevelKey === "easy") {
        return `השלמה עד ${c}: מה צריך להוסיף ל-${b} כדי להגיע ל-${c}? = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return `נתון השוויון ${b} + ${BLANK} = ${c}. מה המספר החסר?${gSuf}`;
      }
      return `בעיית מילים: "ל-${b} חסר חלק עד ${c}" - כמה להוסיף? = ${BLANK}${gSuf}`;
    }
  }

  if (kind === "ns_complement10") {
    const b = params?.b;
    const c = params?.c != null ? Number(params.c) : 10;
    const gSuf = gradeBandSuffix;
    if (b != null && Number.isFinite(c)) {
      if (mathLevelKey === "easy") {
        return `עד ${c}: מה מוסיפים ל-${b} כדי לסיים ל-${c}? = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return `חסר במשוואה: ${b} + ${BLANK} = ${c}${gSuf}`;
      }
      return `בלי לחשב בטור: מה החיבור ל-${c} שמתחיל ב-${b}? = ${BLANK}${gSuf}`;
    }
  }

  if (kind === "scale_find") {
    const ml = params?.mapLength;
    const rl = params?.realLength;
    const gSuf = gradeBandSuffix;
    if (ml != null && rl != null) {
      if (mathLevelKey === "easy") {
        return `במפה מופיע קטע של ${ml} ס"מ, ובמציאות הוא ${rl} ס"מ. השלימו את קנה המידה בצורה 1:${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return `על המפה ${ml} ס"מ, ובמציאות ${rl} ס"מ. מה קנה המידה? כתבו את המספר אחרי 1: = ${BLANK}${gSuf}`;
      }
      return `נתונים שני אורכים - מפה ${ml} ס"מ ומציאות ${rl} ס"מ. קנה המידה נכתב 1:__. מה המספר החסר? = ${BLANK}${gSuf}`;
    }
  }

  if (kind === "scale_map_to_real") {
    const ml = params?.mapLength;
    const sc = params?.scale;
    const gSuf = gradeBandSuffix;
    if (ml != null && sc != null) {
      if (mathLevelKey === "easy") {
        return `בקנה מידה 1:${sc} - כמה ס"מ במציאות שווים ל-${ml} ס"מ במפה? = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return `קנה מידה 1:${sc}. מדידה של ${ml} ס"מ על המפה - מה האורך האמיתי בס"מ? = ${BLANK}${gSuf}`;
      }
      return `קנה מידה 1:${sc} ומדידת מפה ${ml} ס"מ - חשבו את האורך במציאות בס"מ = ${BLANK}${gSuf}`;
    }
  }

  if (kind === "scale_real_to_map") {
    const rl = params?.realLength;
    const sc = params?.scale;
    const gSuf = gradeBandSuffix;
    if (rl != null && sc != null) {
      if (mathLevelKey === "easy") {
        return `בקנה מידה 1:${sc}, אורך אמיתי ${rl} ס"מ - כמה ס"מ ימדדו על המפה? = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return `במציאות ${rl} ס"מ, וקנה המידה 1:${sc}. מה אורך הקטע על המפה? = ${BLANK}${gSuf}`;
      }
      return `המירו ממציאות למפה: ${rl} ס"מ במציאות ביחס 1:${sc} - כמה ס"מ על הדף? = ${BLANK}${gSuf}`;
    }
  }

  if (selectedOp === "compare" || kind === "cmp") {
    const raw = params?.exerciseText ? String(params.exerciseText) : "";
    const pv = Math.abs(Number(params?.presentationVariant) || 0) % 4;
    const gSuf = gradeBandSuffix;
    if (mathLevelKey === "easy") {
      const opts = [
        `השוו בין שני המספרים והשלימו סימן (<, =, >): ${raw}`,
        `סימן השוואה בין המספרים: ${raw}`,
        `בחרו < , = או > - השוו: ${raw}`,
        `השוו את שני הערכים והשלימו סימן: ${raw}`,
      ];
      return `${opts[pv].trim()}${gSuf}`;
    }
    if (mathLevelKey === "medium") {
      const opts = [
        `סימן השוואה מתאים בין המספרים: ${raw}`,
        `באיזה סימן משווים את הצמד? ${raw}`,
        `התאימו סימן השוואה נכון: ${raw}`,
        `השלימו סימן בין ביטויי המספרים: ${raw}`,
      ];
      return `${opts[pv].trim()}${gSuf}`;
    }
    const opts = [
      `השלימו סימן השוואה - בדקו לפני שבוחרים: ${raw}`,
      `השוואה - ודאו סדר גודל לפני בחירה: ${raw}`,
      `השוו בזהירות ובחרו סימן: ${raw}`,
      `ניתוח מהיר: איזה סימן מתאים? ${raw}`,
    ];
    return `${opts[pv].trim()}${gSuf}`;
  }

  if (selectedOp === "divisibility" || kind === "divisibility") {
    const num = params?.num;
    const div = params?.divisor;
    const pv = Math.abs(Number(params?.presentationVariant) || 0) % 2;
    if (num != null && div != null) {
      if (mathLevelKey === "easy") {
        return pv === 0
          ? `התחלקות: האם ${num} מתחלק ב-${div} בלי שארית?`
          : `בדיקת יחס: האם ${num} כפולה של ${div} (בלי שארית)?`;
      }
      if (mathLevelKey === "medium") {
        return pv === 0
          ? `סימני התחלקות - האם ${num} מתחלק ב-${div}?`
          : `חלוקה שלמה: ${num} ÷ ${div} - האם יוצא שלם?`;
      }
      return pv === 0
        ? `בדיקת התחלקות: האם ${num} יתחלק ב-${div}?`
        : `ניתוח מחלקים: האם ${div} מחלק את ${num} בדיוק?`;
    }
  }

  if (selectedOp === "prime_composite" || kind === "prime_composite") {
    const num = params?.num;
    const subKind = String(params?.subKind || "pc_classify");
    const pv = Math.abs(Number(params?.presentationVariant) || 0) % 2;
    if (subKind === "pc_factor_count" && num != null) {
      if (mathLevelKey === "easy") {
        return `מספרים ראשוניים: כמה מחלקים יש למספר ${num}?`;
      }
      if (mathLevelKey === "medium") {
        return `ספירת מחלקים: כמה מחלקים טבעיים יש ל-${num} (כולל 1 והמספר עצמו)?`;
      }
      return `מחלקים: כמה מחלקים שונים יש למספר ${num}?`;
    }
    if (subKind === "pc_smallest_prime" && num != null) {
      if (mathLevelKey === "easy") {
        return `גורם ראשוני: מה הגורם הראשוני הקטן ביותר של ${num}?`;
      }
      if (mathLevelKey === "medium") {
        return `מצאו את הגורם הראשוני הקטן ביותר של המספר ${num}.`;
      }
      return `גורמים: מה הגורם הראשוני הקטן ביותר של ${num}?`;
    }
    if (subKind === "pc_divisor_pick" && num != null && params?.divisorCandidate != null) {
      const d = params.divisorCandidate;
      if (mathLevelKey === "easy") {
        return `בדיקת מחלק: האם ${d} מחלק את ${num} בלי שארית?`;
      }
      if (mathLevelKey === "medium") {
        return `מחלקים: האם ${num} מתחלק ב-${d}?`;
      }
      return `מחלקים: האם ${d} מחלק את ${num} בדיוק?`;
    }
    if (num != null) {
      if (mathLevelKey === "easy") {
        return pv === 0
          ? `מספרים ראשוניים: האם ${num} ראשוני או פריק?`
          : `סיווג בסיסי: ${num} - ראשוני או פריק?`;
      }
      if (mathLevelKey === "medium") {
        return pv === 0
          ? `סיווג מספר: ${num} - ראשוני או פריק?`
          : `זיהוי סוג: האם ל-${num} יש בדיוק שני מחלקים טבעיים שונים?`;
      }
      return pv === 0
        ? `האם ${num} הוא מספר ראשוני או פריק? הסבירו לעצמכם לפני שבוחרים.`
        : `הוכחה קצרה בראש: האם ${num} מתפרק לשני גורמים גדולים מ-1?`;
    }
  }

  if (selectedOp === "powers" && (kind === "power_base" || kind === "power_calc")) {
    if (kind === "power_calc") {
      if (mathLevelKey === "easy") return `חזקות: ${q0}`;
      if (mathLevelKey === "medium") return `חישוב חזקה - ${q0}`;
      return `חזקות: ${q0}`;
    }
    if (kind === "power_base") {
      if (mathLevelKey === "easy") return `מצאו בסיס בחזקה: ${q0}`;
      if (mathLevelKey === "medium") return `חידת חזקה - ${q0}`;
      return `בסיס חסר בחזקה: ${q0}`;
    }
  }

  if (selectedOp === "estimation") {
    if (kind === "est_add") {
      if (mathLevelKey === "easy") return q0.replace(/^אמד/, "אומדן קירוב: אמדו");
      if (mathLevelKey === "medium")
        return q0.replace(/^אמד/, "אומדן חיבור - אמדו");
      return q0.replace(/^אמד/, "אומדן מדויק: אמדו ובדקו סדר גודל");
    }
    if (kind === "est_mul") {
      if (mathLevelKey === "easy") return q0.replace(/^אמד/, "אומדן כפל: אמדו");
      if (mathLevelKey === "medium")
        return q0.replace(/^אמד/, "אומדן מכפלה - אמדו");
      return q0.replace(/^אמד/, "אומדן כפל: אמדו לפי עיגול חכם");
    }
    if (kind === "est_quantity") {
      if (mathLevelKey === "easy") return q0.replace(/^אמד/, "כמות משוערת: אמדו");
      if (mathLevelKey === "medium")
        return q0.replace(/^אמד/, "אומדן כמות - עגלו לעשרות");
      return q0.replace(/^אמד/, "אומדן כמות: הסבירו את העיגול");
    }
  }

  if (
    /אמד את|במפה בקנה|קנה מידה|עיגול לעשרות|עיגול למאות|אורך של \d+ ס"מ במפה/i.test(
      q0
    )
  ) {
    return q0;
  }
  if (/^תרגיל\s/.test(q0)) return q0;

  if (
    kind === "frac_half" ||
    kind === "frac_half_reverse" ||
    kind === "frac_quarter" ||
    kind === "frac_quarter_reverse"
  ) {
    if (mathLevelKey === "easy") return `שברים: ${q0}`;
    if (mathLevelKey === "medium") return `חשיבה על שבר כחלק משלם: ${q0}`;
    return `שבר חלקי: ${q0}`;
  }

  if (kind === "fm_factor") {
    if (mathLevelKey === "easy") return `גורמים: ${q0}`;
    if (mathLevelKey === "medium") return `זיהוי מחלק: ${q0}`;
    return `מחלקים וגורמים: ${q0}`;
  }
  if (kind === "fm_multiple") {
    if (mathLevelKey === "easy") return `כפולות: ${q0}`;
    if (mathLevelKey === "medium") return `בדקו כפולה: ${q0}`;
    return `כפולות: ${q0}`;
  }

  // אחוזים: משאירים את ניסוח המחולל המגוון (לא דורסים לרמת קושי).
  if (selectedOp === "percentages") return q0;
  if (selectedOp === "ratio" || selectedOp === "scale") return q0;

  if (kind === "fm_gcd" && params?.a != null && params?.b != null) {
    const { a, b } = params;
    const gSuf = gradeBandSuffix;
    if (mathLevelKey === "easy") {
      return `מ.א.ח: מה המחלק המשותף הגדול ביותר של ${a} ו-${b}? = ${BLANK}${gSuf}`;
    }
    if (mathLevelKey === "medium") {
      return `גורם משותף מקסימלי (GCD) לזוג ${a}, ${b} - מהו? = ${BLANK}${gSuf}`;
    }
    return `מ.א.ח: הוכיחו בראש לפני בחירה - GCD(${a}, ${b}) = ${BLANK}${gSuf}`;
  }

  if (kind === "round" && params?.n != null && params?.toWhat != null) {
    const { n, toWhat } = params;
    const gSuf = gradeBandSuffix;
    const pv = Math.abs(Number(params?.presentationVariant) || 0) % 2;
    if (toWhat === 10) {
      if (mathLevelKey === "easy") {
        return pv === 0
          ? `עיגול לעשרות: למה מתעגלים את ${n}? = ${BLANK}${gSuf}`
          : `קירוב לעשרתיות קרובה: ${n} → ? = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return pv === 0
          ? `עגלו את ${n} לעשרות הקרובות - מה התוצאה? = ${BLANK}${gSuf}`
          : `עיגול לפי כלל עשרות: ${n} = ${BLANK}${gSuf}`;
      }
      return pv === 0
        ? `עיגול לעשרות: בחרו את המספר המתאים אחרי עיגול ${n} = ${BLANK}${gSuf}`
        : `בחירה נכונה אחרי עיגול ${n} לעשרות - ? = ${BLANK}${gSuf}`;
    }
    if (mathLevelKey === "easy") {
      return pv === 0
        ? `עיגול למאות: למה מתעגלים את ${n}? = ${BLANK}${gSuf}`
        : `קירוב למאה הקרובה: ${n} = ${BLANK}${gSuf}`;
    }
    if (mathLevelKey === "medium") {
      return pv === 0
        ? `עגלו את ${n} למאות הקרובות - מה התוצאה? = ${BLANK}${gSuf}`
        : `עיגול למאות לפי כלל: ${n} → ? = ${BLANK}${gSuf}`;
    }
    return pv === 0
      ? `עיגול למאות: ${n} → ? = ${BLANK}${gSuf}`
      : `מספר מתאים אחרי עיגול ${n} למאות = ${BLANK}${gSuf}`;
  }

  if (kind === "dec_add" || kind === "dec_sub") {
    const pv = Math.abs(Number(params?.presentationVariant) || 0) % 2;
    const gSuf = gradeBandSuffix;
    const a = params?.a;
    const b = params?.b;
    const pl = params?.places ?? 1;
    if (a != null && b != null) {
      const af = Number(a).toFixed(pl);
      const bf = Number(b).toFixed(pl);
      if (kind === "dec_add") {
        if (mathLevelKey === "easy") {
          return pv === 0
            ? `חיבור עשרוניים: ${af} + ${bf} = ${BLANK}${gSuf}`
            : `סכום ישר: ${af} + ${bf} = ${BLANK}${gSuf}`;
        }
        if (mathLevelKey === "medium") {
          return pv === 0
            ? `חיבור מיושר נקודה: ${af} + ${bf} = ${BLANK}${gSuf}`
            : `השלימו סכום: ${af} + ${bf} = ${BLANK}${gSuf}`;
        }
        return pv === 0
          ? `חיבור עשרוניים - בדקו ספרות: ${af} + ${bf} = ${BLANK}${gSuf}`
          : `ניתוח סכום: ${af} + ${bf} = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "easy") {
        return pv === 0
          ? `חיסור עשרוניים: ${af} − ${bf} = ${BLANK}${gSuf}`
          : `הפרש ישר: ${af} − ${bf} = ${BLANK}${gSuf}`;
      }
      if (mathLevelKey === "medium") {
        return pv === 0
          ? `חיסור מיושר: ${af} − ${bf} = ${BLANK}${gSuf}`
          : `השלימו הפרש: ${af} − ${bf} = ${BLANK}${gSuf}`;
      }
      return pv === 0
        ? `חיסור עשרוניים - בדקו לפני בחירה: ${af} − ${bf} = ${BLANK}${gSuf}`
        : `ניתוח הפרש: ${af} − ${bf} = ${BLANK}${gSuf}`;
    }
  }

  if (selectedOp === "sequences") {
    const gSuf = gradeBandSuffix;
    if (mathLevelKey === "easy") {
      return (
        q0.replace(/^השלם את הסדרה\b/, "המשיכו את רצף המספרים") + gSuf
      );
    }
    if (mathLevelKey === "medium") {
      return (
        q0.replace(/^השלם את הסדרה\b/, "זיהוי דפוס - השלימו את הסדרה") + gSuf
      );
    }
    return (
      q0.replace(
        /^השלם את הסדרה\b/,
        "השלימו את הסדרה (דרוש ניתוח דפוס)"
      ) + gSuf
    );
  }

  // משוואות: הניסוח "__ - # = #" לא נכנס ל-heuristic של תרגיל מספרי (החסר לא אחרי '=')
  if (
    selectedOp === "equations" ||
    /^eq_/.test(kind) ||
    (selectedOp === "order_of_operations" && /^order_/.test(kind))
  ) {
    const raw =
      params?.exerciseText != null && String(params.exerciseText).trim()
        ? String(params.exerciseText).trim()
        : q0.trim();
    const openers = {
      g1: "חידת משוואה קצרה:",
      g2: "השלימו את החסר במשוואה:",
      g3: "מצאו את הנעלם:",
      g4: "מצאו את הנעלם:",
      g5: "מצאו את הנעלם:",
      g6: "מצאו x:",
    };
    if (/^מצאו|^השלימו|^חידת/.test(raw.trim())) return raw;
    return raw;
  }

  const looksNumericExercise =
    /=\s*__|=\s*\?\?|___|\?\?=/.test(q0) ||
    (/^\d/.test(q0.trim()) && /[+\-×÷]/.test(q0));

  if (looksNumericExercise && gNum >= 1) {
    return q0;
  }

  return q0;
}

function mcqValueKey(v) {
  return normalizeOptionForCompare(String(mcqCellValue(v) ?? ""));
}

function displayValueFromMcqCell(cell) {
  const v = mcqCellValue(cell);
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return String(v).trim();
}

/**
 * Dedupe MCQ cells, ensure 4 unique options, flatten answers for student UI,
 * preserve rich cells on params.mcqOptionCells for Phase 8 engine metadata.
 * @param {Record<string, unknown>} out
 * @param {(min: number, max: number) => number} randIntFn
 */
function finalizeMathMcqAnswerBundle(out, randIntFn) {
  if (!out || typeof out !== "object" || !Array.isArray(out.answers) || out.answers.length < 2) {
    return out;
  }

  if (isComparisonSignMcq(out)) {
    return finalizeComparisonSignMcq(out);
  }

  const params =
    out.params && typeof out.params === "object" ? { .../** @type {Record<string, unknown>} */ (out.params) } : {};
  const kind = String(params.kind || "");
  const correctAnswer = out.correctAnswer;
  const correctKey = mcqValueKey(correctAnswer);
  if (!correctKey) return out;

  /** @type {ReturnType<typeof toMcqOptionCell>[]} */
  const cells = [];
  const seen = new Set();

  const pushCell = (rawVal, distractorFamily = null) => {
    const val = mcqCellValue(rawVal);
    const fam =
      distractorFamily ||
      (typeof rawVal === "object" && rawVal != null && rawVal.distractorFamily
        ? rawVal.distractorFamily
        : inferMathDistractorFamily(val, correctAnswer, kind, params));
    const cell = toMcqOptionCell(val, fam);
    const key = mcqValueKey(cell);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    cells.push(cell);
    return true;
  };

  pushCell(correctAnswer, null);

  for (const a of out.answers) {
    if (cells.length >= 4) break;
    if (mcqValueKey(a) === correctKey) continue;
    pushCell(a);
  }

  const cn = Number(correctAnswer);
  let guard = 0;
  while (cells.length < 4 && guard < 60) {
    guard += 1;
    if (Number.isFinite(cn)) {
      const delta = randIntFn(1, Math.max(2, Math.min(12, Math.abs(cn) + 4)));
      pushCell(cn + delta);
      pushCell(cn - delta);
      pushCell(cn + delta + 1);
      pushCell(Math.max(0, cn - delta - 1));
    } else if (typeof correctAnswer === "string") {
      pushCell(`${correctAnswer}1`);
      pushCell(`${correctAnswer.slice(0, Math.max(1, correctAnswer.length - 1))}x`);
    } else {
      break;
    }
  }

  if (cells.length < 4) return out;

  const shuffled = shuffleMcqList(cells);
  params.mcqOptionCells = shuffled;
  const displayAnswers = shuffled
    .map(displayValueFromMcqCell)
    .filter((v) => v != null && v !== "");

  if (displayAnswers.length < 4) return out;

  const caDisplay = displayValueFromMcqCell(toMcqOptionCell(correctAnswer));
  return {
    ...out,
    params,
    answers: displayAnswers,
    correctAnswer: caDisplay != null ? caDisplay : correctAnswer,
  };
}

function shuffleMcqList(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const GENERIC_PROXIMITY_FAMILY = "generic_proximity";

function toMcqOptionCell(value, distractorFamily = null) {
  if (value != null && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    const cell = { ...value };
    if (distractorFamily && !cell.distractorFamily) cell.distractorFamily = distractorFamily;
    return cell;
  }
  const cell = { value };
  if (distractorFamily) cell.distractorFamily = distractorFamily;
  return cell;
}

function inferMathDistractorFamily(wrongVal, correctAnswer, kind, params) {
  const n = Number(wrongVal);
  if (!Number.isFinite(n)) return GENERIC_PROXIMITY_FAMILY;
  const a = params?.a;
  const b = params?.b;
  if (
    (kind === "add_two" ||
      kind === "add_vertical" ||
      kind === "add_second_decade" ||
      kind === "add_tens_only") &&
    a != null &&
    b != null
  ) {
    if (n === a * b) return "mul_instead_of_add";
    if (n === Math.abs(a - b)) return "sub_instead_of_add";
  }
  if ((kind === "sub_two" || kind === "sub_vertical") && a != null && b != null) {
    if (n === a + b) return "add_instead_of_sub";
  }
  if (kind === "mul" || kind === "mul_vertical" || kind === "mul_tens" || kind === "mul_hundreds") {
    let mx = a;
    let my = b;
    if (kind === "mul_tens") {
      mx = params?.tens;
      my = params?.multiplier;
    } else if (kind === "mul_hundreds") {
      mx = params?.hundreds;
      my = params?.multiplier;
    } else if (kind === "mul_vertical") {
      mx = params?.twoDigit;
      my = params?.oneDigit;
    }
    if (mx != null && my != null && n === mx + my) return "add_instead_of_mul";
  }
  if (kind.startsWith("wp_") && a != null && b != null && n === a * b) {
    return "wrong_operation_wp";
  }
  void correctAnswer;
  return GENERIC_PROXIMITY_FAMILY;
}

function finalizeMcqOptions(correctAnswer, wrongValues, kind, params) {
  const correct = toMcqOptionCell(correctAnswer);
  const wrongList = Array.isArray(wrongValues) ? wrongValues : Array.from(wrongValues);
  const wrongs = wrongList.slice(0, 3).map((v) => {
    const val = typeof v === "object" && v != null && "value" in v ? v.value : v;
    const fam =
      typeof v === "object" && v != null && v.distractorFamily
        ? v.distractorFamily
        : inferMathDistractorFamily(val, correctAnswer, kind, params);
    return toMcqOptionCell(val, fam);
  });
  return shuffleMcqList([correct, ...wrongs]);
}

/**
 * מסיחים לפי סוג תרגיל — טעויות תלמידים סבירות, לא רק ±אחוז אקראי
 */
export function buildMathMcqAnswerList(correctAnswer, selectedOp, params, randInt, roundFn) {
  const kind = params?.kind || "";

  if (
    typeof correctAnswer === "string" &&
    correctAnswer.includes("/") &&
    !correctAnswer.includes("ושארית")
  ) {
    const [cnRaw, cdRaw] = String(correctAnswer).split("/");
    const cn = Number(cnRaw);
    const cd = Number(cdRaw) || 1;
    const wrong = new Set();
    const add = (s) => {
      if (s && s !== correctAnswer && !wrong.has(s)) wrong.add(s);
    };
    add(`${cd}/${Math.max(1, cn)}`);
    add(`${cn + 1}/${cd}`);
    add(`${Math.max(1, cn - 1)}/${cd}`);
    add(`${cn}/${cd + 1}`);
    add(`${Math.max(1, cn - 1)}/${Math.max(1, cd - 1)}`);
    add(`${cn + cd}/${cd}`);
    let g = 0;
    while (wrong.size < 3 && g < 40) {
      g++;
      const d = randInt(1, 3);
      const sign = Math.random() < 0.5 ? 1 : -1;
      const nn = Math.max(1, cn + sign * d);
      add(`${nn}/${cd}`);
    }
    return finalizeMcqOptions(correctAnswer, Array.from(wrong), kind, params);
  }

  if (selectedOp === "decimals" || kind.startsWith("dec_")) {
    const places =
      kind === "dec_round_whole_standard"
        ? 2
        : params?.places != null
          ? Math.max(1, Math.min(3, params.places))
          : 1;
    const cn = Number(correctAnswer);
    if (Number.isNaN(cn)) return null;
    const step = Math.pow(10, -places);
    const fmt = (x) =>
      kind === "dec_round_whole_standard"
        ? roundFn(x, 0).toFixed(places)
        : roundFn(x, places);
    const target = fmt(cn);
    const wrong = new Set();
    const addN = (x) => {
      const s = fmt(x);
      if (s !== target) wrong.add(s);
    };
    addN(cn + step);
    addN(cn - step);
    addN(cn + 2 * step);
    if (params?.a != null && params?.b != null) {
      addN(Number(params.a) + Number(params.b));
      addN(Math.abs(Number(params.a) - Number(params.b)));
    }
    addN(cn * 10);
    if (cn !== 0) addN(cn / 10);
    let guard = 0;
    while (wrong.size < 3 && guard < 35) {
      guard++;
      addN(cn + (Math.random() < 0.5 ? 1 : -1) * step * randInt(1, 4));
    }
    return finalizeMcqOptions(target, Array.from(wrong), kind, params);
  }

  if (typeof correctAnswer !== "number" || !Number.isFinite(correctAnswer)) {
    return null;
  }

  const isInt = Number.isInteger(correctAnswer);
  const wrongN = new Set();
  const decPlaces =
    params?.places != null ? Math.max(1, Math.min(4, params.places)) : 2;
  const addI = (n) => {
    if (typeof n !== "number" || !Number.isFinite(n)) return;
    const v = isInt ? Math.round(n) : roundFn(n, decPlaces);
    if (
      v !== correctAnswer &&
      v >= -200 &&
      v <= 50000 &&
      !Number.isNaN(v)
    ) {
      wrongN.add(v);
    }
  };

  if (
    kind === "add_two" ||
    kind === "add_vertical" ||
    kind === "add_second_decade" ||
    kind === "add_tens_only"
  ) {
    const x = params?.a;
    const y = params?.b;
    if (x != null && y != null) {
      const s = x + y;
      addI(x * y);
      addI(Math.abs(x - y));
      addI(x + y + 10);
      if ((x % 10) + (y % 10) >= 10) addI(s - 10);
      addI(10 * (Math.floor(x / 10) + Math.floor(y / 10)) + ((x % 10) + (y % 10)) % 10);
    }
  } else if (kind === "add_three") {
    const x = params?.a;
    const y = params?.b;
    const z = params?.c;
    if (x != null && y != null && z != null) {
      addI(x + y);
      addI(y + z);
      addI(x + z);
      addI(x + y + z + 10);
      if ((x % 10) + (y % 10) + (z % 10) >= 10) addI(x + y + z - 10);
    }
  } else if (kind === "sub_two" || kind === "sub_vertical") {
    const x = params?.a;
    const y = params?.b;
    if (x != null && y != null && Number.isFinite(x - y)) {
      const diff = Math.round(x - y);
      const wrong = new Set();
      const tryAdd = (n) => {
        const v = Math.round(n);
        if (!Number.isFinite(v) || v < 0 || v === diff || v > 50000) return;
        wrong.add(v);
      };
      const deltas =
        diff >= 10
          ? [2, 3, 5, 7, 11, 13, -2, -3, -5, -7]
          : [1, 2, 3, 5, 7, -1, -2, -3];
      for (const d of deltas) tryAdd(diff + d);
      if (x + y !== diff && x + y >= 0 && String(x + y).length <= String(diff).length + 1) {
        tryAdd(x + y);
      }
      let bump = diff >= 10 ? 15 : 4;
      while (wrong.size < 3 && bump < 30) {
        tryAdd(diff + bump);
        tryAdd(diff - bump);
        bump += 1;
      }
      return finalizeMcqOptions(diff, Array.from(wrong), kind, params);
    }
  } else if (
    kind === "mul" ||
    kind === "mul_vertical" ||
    kind === "mul_tens" ||
    kind === "mul_hundreds"
  ) {
    let x;
    let y;
    if (kind === "mul_tens") {
      x = params?.tens;
      y = params?.multiplier;
    } else if (kind === "mul_hundreds") {
      x = params?.hundreds;
      y = params?.multiplier;
    } else if (kind === "mul_vertical") {
      x = params?.twoDigit;
      y = params?.oneDigit;
    } else {
      x = params?.a;
      y = params?.b;
    }
    if (x != null && y != null) {
      addI(x + y);
      addI(x * y + x);
      addI(x * y + y);
      addI((x + 1) * y);
      addI(x * (y + 1));
      addI(Math.floor(x / 10) * y + (x % 10) * y);
    }
  } else if (
    kind === "div" ||
    kind === "div_long" ||
    kind === "div_two_digit"
  ) {
    const dividend = params?.dividend;
    const divisor = params?.divisor;
    const quot = params?.quotient ?? correctAnswer;
    if (dividend != null && divisor != null) {
      addI(divisor);
      addI(dividend - divisor);
      addI(quot + 1);
      addI(Math.max(1, quot - 1));
      addI(Math.floor(dividend / (divisor + 1)));
    }
  } else if (kind.startsWith("wp_")) {
    if (kind === "wp_simple_add" && params?.a != null && params?.b != null) {
      addI(params.a * params.b);
      addI(Math.abs(params.a - params.b));
      addI(params.a + params.b + params.a);
    } else if (kind === "wp_simple_sub" || kind === "wp_pocket_money" || kind === "wp_coins_spent") {
      const total = params.total ?? params.money;
      const sub = params.give ?? params.toy ?? params.spent;
      if (total != null && sub != null) {
        addI(total + sub);
        addI(sub);
        addI(total);
        addI(total - sub + 1);
      }
    } else if (kind === "wp_groups" && params?.per != null && params?.groups != null) {
      addI(params.per + params.groups);
      addI(params.per + params.groups + params.per);
      addI(params.per * params.groups + params.groups);
    } else if (kind === "wp_division_simple") {
      addI(params.perGroup);
      addI(params.total);
      addI(Math.floor(params.total / params.perGroup) + 1);
    } else if (kind === "wp_shop_discount") {
      addI(params.price);
      addI(params.discount);
      addI(Math.round(params.price * (1 - params.discPerc / 200)));
    } else if (kind === "wp_multi_step") {
      addI(params.money - params.totalQty);
      addI(params.totalCost);
      addI(params.money - params.price);
    } else if (kind === "wp_average") {
      addI(Math.floor((params.s1 + params.s2 + params.s3) / 3));
      addI(params.s1);
    } else if (
      kind === "wp_distance_time" &&
      params?.speed != null &&
      params?.hours != null
    ) {
      addI(params.speed + params.hours);
      addI(Math.abs(params.speed - params.hours));
    }
  } else if (kind.startsWith("est_")) {
    if (params?.exact != null) {
      addI(params.exact);
      addI(params.exact + 10);
      addI(params.exact - 10);
    }
    if (params?.estimate != null) {
      addI(params.estimate + (kind === "est_mul" ? 100 : 10));
    }
  } else if (kind.startsWith("scale_")) {
    if (params?.realLength != null && params?.scale != null) {
      addI(params.realLength + params.scale);
      addI(params.realLength - params.scale);
    }
  } else if (selectedOp === "equations" && params?.left != null) {
    addI(params.left + params.right);
  }

  let guard = 0;
  while (wrongN.size < 3 && guard < 60) {
    guard++;
    const base = Math.max(
      1,
      Math.round(Math.abs(correctAnswer) * 0.12) || 1
    );
    const delta = randInt(1, Math.min(5, base + 2));
    const sign = Math.random() < 0.5 ? 1 : -1;
    addI(correctAnswer + sign * delta * randInt(1, 2));
  }

  while (wrongN.size < 3) {
    const bump = wrongN.size + 2;
    addI(correctAnswer + bump);
    addI(correctAnswer - bump);
    if (wrongN.size >= 3) break;
    break;
  }

  return finalizeMcqOptions(correctAnswer, Array.from(wrongN), kind, params);
}

/**
 * Active diagnostic math probes (session-local; deterministic shapes).
 * @returns {null | {
 *   question: string,
 *   correctAnswer: number|string,
 *   answers?: unknown[],
 *   params: Record<string, unknown>,
 *   a: number|null,
 *   b: number|null,
 *   probeMetaPayload: { probeSnapshot: object, probeReason: string, expectedErrorTags?: string[] }
 * }}
 */
function tryMathDiagnosticProbeExercise({
  probeOpts,
  gradeKey,
  mathLevelKey,
  levelConfig,
  operation,
  densSmall,
  densBig,
  randInt,
}) {
  const pb = probeOpts?.pendingProbe;
  if (!pb || String(pb.subjectId || "") !== "math") return null;
  const levelKey = mathLevelKeyFromConfig(levelConfig);
  if (!probeMatchesSession(pb, gradeKey, levelKey, operation)) return null;

  const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
  const lcmPair = (a, b) => Math.abs((a * b) / gcd(a, b));

  const st = String(pb.suggestedQuestionType || "");

  const fracCtxOk =
    levelConfig.fractions &&
    levelConfig.fractions.maxDen != null &&
    (operation === "fractions" || st.startsWith("fraction_"));

  const dens =
    fracCtxOk &&
    Array.isArray(densSmall) &&
    Array.isArray(densBig)
      ? gradeKey === "g3" || gradeKey === "g4"
        ? densSmall.filter((d) => d <= levelConfig.fractions.maxDen)
        : densBig.filter((d) => d <= levelConfig.fractions.maxDen)
      : [];

  if (st === "fraction_common_denominator_only") {
    if (!fracCtxOk || !dens.length) return null;
    let d1 = dens[randInt(0, dens.length - 1)];
    let d2 = dens[randInt(0, dens.length - 1)];
    let guard = 0;
    while (d1 === d2 && dens.length > 1 && guard < 12) {
      d2 = dens[randInt(0, dens.length - 1)];
      guard++;
    }
    const lcd = lcmPair(d1, d2);
    const exerciseText = `מה המכנה המשותף המינימלי (LCD) של המכנים ${d1} ו-${d2}? = ${BLANK}`;
    const params = mergeDiagnosticContractIntoParams(
      {
        kind: "frac_probe_common_denominator_only",
        den1: d1,
        den2: d2,
        lcd,
        exerciseText,
        patternFamily: "fraction_probe_common_denominator",
        conceptTag: "frac_common_denominator",
        diagnosticSkillId:
          pb.diagnosticSkillId != null && String(pb.diagnosticSkillId).trim()
            ? String(pb.diagnosticSkillId).trim()
            : "math_frac_common_denominator",
        expectedErrorTags: ["wrong_lcm", "adds_denominators_directly"],
      },
      {
        patternFamily: "fraction_probe_common_denominator",
        diagnosticSkillId:
          pb.diagnosticSkillId || "math_frac_common_denominator",
        expectedErrorTags: ["wrong_lcm", "adds_denominators_directly"],
      }
    );

    const expectedTags =
      Array.isArray(params.expectedErrorTags) && params.expectedErrorTags.length > 0
        ? [...params.expectedErrorTags]
        : undefined;

    return {
      question: exerciseText,
      correctAnswer: lcd,
      params,
      a: d1,
      b: d2,
      probeMetaPayload: {
        probeSnapshot: pb,
        probeReason: "fraction_common_denominator_only",
        expectedErrorTags: expectedTags,
      },
    };
  }

  if (st === "fraction_operation_gate") {
    if (!fracCtxOk || !dens.length) return null;
    const den = dens[randInt(0, dens.length - 1)] || 4;
    const exerciseText = `בשברים עם מכנה זהה ${den}: מה צריך לעשות כדי לחבר את המונים (למשל 2/${den}+1/${den})? = בחרו תשובה`;
    const correctLabel = "לחבר את המונים כשהמכנה כבר שווה";
    const answers = shuffleMcqList([
      correctLabel,
      "להכפיל את המונים תמיד",
      "לחבר מכנים בלי לשנות מונה",
      "לאחד מכנים לפני שבודקים את המונה",
    ]);
    const params = mergeDiagnosticContractIntoParams(
      {
        kind: "math_probe_fraction_operation_gate",
        exerciseText,
        patternFamily: "fraction_operation_gate_probe",
        diagnosticSkillId: pb.diagnosticSkillId || "math_frac_operation_gate",
        expectedErrorTags: ["operation_confusion"],
        isChoiceOnly: true,
      },
      {
        patternFamily: "fraction_operation_gate_probe",
        expectedErrorTags: ["operation_confusion"],
      }
    );
    return {
      question: exerciseText,
      correctAnswer: correctLabel,
      answers,
      params,
      a: den,
      b: null,
      probeMetaPayload: {
        probeSnapshot: pb,
        probeReason: "fraction_operation_gate",
        expectedErrorTags: ["operation_confusion"],
      },
    };
  }

  if (st === "place_value_digit_value") {
    if (operation !== "number_sense" && operation !== "decimals") return null;
    let n = randInt(100, 9999);
    const s = String(n);
    const pos = randInt(0, s.length - 1);
    const digit = parseInt(s[pos], 10);
    const placeVal = digit * 10 ** (s.length - 1 - pos);
    const exerciseText = `מה ערך המקומי של הספרה ${digit} במספר ${n}? = ${BLANK}`;
    const params = mergeDiagnosticContractIntoParams(
      {
        kind: "math_probe_place_value",
        n,
        digitIndex: pos,
        placeValue: placeVal,
        exerciseText,
        patternFamily: "place_value_digit_value_probe",
        diagnosticSkillId: pb.diagnosticSkillId || "math_place_value_digit",
        expectedErrorTags: ["place_value_error"],
      },
      { patternFamily: "place_value_digit_value_probe", expectedErrorTags: ["place_value_error"] }
    );
    const pool = [
      placeVal,
      digit,
      Number(s),
      digit * 10,
      placeVal + 10,
    ].filter((x, i, arr) => arr.indexOf(x) === i);
    const answers = shuffleMcqList([placeVal, ...pool.filter((x) => x !== placeVal)].slice(0, 4));
    return {
      question: exerciseText,
      correctAnswer: placeVal,
      answers,
      params,
      a: digit,
      b: n,
      probeMetaPayload: {
        probeSnapshot: pb,
        probeReason: "place_value_digit_value",
        expectedErrorTags: ["place_value_error"],
      },
    };
  }

  if (st === "multiplication_fact_check") {
    if (operation !== "multiplication") return null;
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const prod = a * b;
    const exerciseText = `${a} × ${b} = ${BLANK}`;
    const params = mergeDiagnosticContractIntoParams(
      {
        kind: "math_probe_times_fact",
        a,
        b,
        exerciseText,
        patternFamily: "multiplication_fact_probe",
        diagnosticSkillId: pb.diagnosticSkillId || "math_times_fact",
        expectedErrorTags: ["multiplication_fact_gap"],
      },
      { patternFamily: "multiplication_fact_probe", expectedErrorTags: ["multiplication_fact_gap"] }
    );
    const answers = shuffleMcqList([
      prod,
      prod + 1,
      prod - 1,
      a + b,
    ]);
    return {
      question: exerciseText,
      correctAnswer: prod,
      answers,
      params,
      a,
      b,
      probeMetaPayload: {
        probeSnapshot: pb,
        probeReason: "multiplication_fact_check",
        expectedErrorTags: ["multiplication_fact_gap"],
      },
    };
  }

  if (st === "operation_choice_word_problem") {
    if (operation !== "word_problems") return null;
    const groups = randInt(3, 8);
    const each = randInt(2, 9);
    const sumLike = groups + each;
    const prod = groups * each;
    const exerciseText = `יש ${groups} קבוצות ו-${each} פריטים בכל קבוצה. מה הפעולה המתאימה כדי לקבל את הסך הכול?`;
    const correctLabel = "כפל";
    const answers = shuffleMcqList([correctLabel, "חיבור", "חיסור", "חילוק"]);
    const params = mergeDiagnosticContractIntoParams(
      {
        kind: "math_probe_operation_word_choice",
        groups,
        each,
        exerciseText,
        patternFamily: "operation_choice_word_problem_probe",
        diagnosticSkillId: pb.diagnosticSkillId || "math_operation_choice_wp",
        expectedErrorTags: ["operation_confusion"],
        isChoiceOnly: true,
        probeNumericDecoys: { sumLike, prod },
      },
      {
        patternFamily: "operation_choice_word_problem_probe",
        expectedErrorTags: ["operation_confusion"],
      }
    );
    return {
      question: exerciseText,
      correctAnswer: correctLabel,
      answers,
      params,
      a: groups,
      b: each,
      probeMetaPayload: {
        probeSnapshot: pb,
        probeReason: "operation_choice_word_problem",
        expectedErrorTags: ["operation_confusion"],
      },
    };
  }

  return null;
}

export function generateQuestion(levelConfig, operation, gradeKey, mixedOps = null, probeOpts = null) {
  const gradeCfg = GRADES[gradeKey] || GRADES.g3;

  let allowedOps = gradeCfg.operations.filter((op) => op !== "mixed");
  if (mixedOps) {
    allowedOps = allowedOps.filter((op) => mixedOps[op]);
  }
  /** Formal divisibility-rule stems align with programme spine from grade 3 (MoE kita3.pdf); even/odd stays under number_sense. */
  if (gradeKey === "g2") {
    allowedOps = allowedOps.filter((op) => op !== "divisibility");
  }
  if (allowedOps.length === 0) {
    allowedOps = (gradeCfg.operations || ["addition"]).filter((op) => op !== "mixed");
    if (gradeKey === "g2") {
      allowedOps = allowedOps.filter((op) => op !== "divisibility");
    }
  }
  if (allowedOps.length === 0) {
    allowedOps = ["addition"];
  }

  const isMixed = operation === "mixed";
  let selectedOp = operation;
  
  if (isMixed) {
    selectedOp = allowedOps[Math.floor(Math.random() * allowedOps.length)];
  }

  if (!allowedOps.includes(selectedOp)) {
    selectedOp = allowedOps[Math.floor(Math.random() * allowedOps.length)];
  }

  const randInt = (min, max) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  };

  const round = (n, places = 0) => {
    const factor = Math.pow(10, places);
    return Math.round(n * factor) / factor;
  };

  const allowNegatives = !!levelConfig.allowNegatives && gradeCfg.allowNegatives;
  const allowTwoStep = !!levelConfig.allowTwoStep;

  let question = "";
  let correctAnswer = 0;
  let params = { kind: selectedOp };
  let operandA = null;
  let operandB = null;
  let isStory = false;
  const mathLevelKey = mathLevelKeyFromConfig(levelConfig);
  const gNumForScope =
    parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 0;
  const gradeHebrewScope =
    gNumForScope >= 1 && gNumForScope <= 6
      ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"][gNumForScope - 1]
      : "";
  const mathForceFromOpts =
    probeOpts?.forceKind != null ? String(probeOpts.forceKind) : "";
  const mathForce =
    mathForceFromOpts ||
    (typeof globalThis !== "undefined" && globalThis.__LIOSH_MATH_FORCE
      ? String(globalThis.__LIOSH_MATH_FORCE)
      : "");

  const finalizeMathQuestionOutput = (out) =>
    sanitizeQuestionForStudentDisplay(
      attachMathEquationInstructionLabel(
        attachProfessionalMathMetadata(
          finalizeMathMcqAnswerBundle(out, randInt),
          {
            selectedOp,
            gradeKey,
            mathLevelKey,
          }
        ),
        gradeKey
      )
    );

  const densSmallProbe = [2, 4, 5, 10];
  const densBigProbe = [2, 3, 4, 5, 6, 8, 10, 12];
  const probeDiag = tryMathDiagnosticProbeExercise({
    probeOpts,
    gradeKey,
    mathLevelKey,
    levelConfig,
    operation: selectedOp,
    densSmall: densSmallProbe,
    densBig: densBigProbe,
    randInt,
  });
  if (probeDiag) {
    if (probeOpts?.probeMetaHolder && probeDiag.probeMetaPayload) {
      probeOpts.probeMetaHolder.current = probeDiag.probeMetaPayload;
    }
    const paramsP = probeDiag.params || {};
    let qText = applyMathLevelPresentation(probeDiag.question, {
      selectedOp,
      params: paramsP,
      mathLevelKey,
      gradeKey,
    });
    const exText = paramsP.exerciseText || qText;
    const ansList =
      probeDiag.answers ||
      buildMathMcqAnswerList(
        probeDiag.correctAnswer,
        selectedOp,
        paramsP,
        randInt,
        round
      );
    return finalizeMathQuestionOutput({
      question: qText && String(qText).trim() ? qText : exText,
      questionLabel: paramsP.questionLabel,
      exerciseText: exText,
      correctAnswer: probeDiag.correctAnswer,
      answers: ansList,
      operation: selectedOp,
      params: paramsP,
      a: probeDiag.a ?? null,
      b: probeDiag.b ?? null,
      isStory: false,
    });
  }

  if (gradeKey === "g1" && mathForce === "eq_add_simple") {
    const a = randInt(1, 9);
    const c = randInt(a + 1, 10);
    const b = c - a;
    correctAnswer = b;
    const exerciseText = `${a} + ${BLANK} = ${c}`;
    question = exerciseText;
    params = { kind: "eq_add_simple", a, b, c, exerciseText };
    operandA = a;
    operandB = b;
    question = applyMathLevelPresentation(question, { selectedOp: "addition", params, mathLevelKey, gradeKey });
    return finalizeMathQuestionOutput({
      question,
      exerciseText,
      correctAnswer,
      answers: buildMathMcqAnswerList(correctAnswer, "addition", params, randInt, round),
      operation: "addition",
      params,
      a,
      b,
      isStory: false,
    });
  }

  if (gradeKey === "g1" && mathForce === "eq_sub_simple") {
    const c = randInt(1, 9);
    const a = randInt(c + 1, 10);
    const b = a - c;
    correctAnswer = b;
    const exerciseText = `${a} - ${BLANK} = ${c}`;
    question = exerciseText;
    params = { kind: "eq_sub_simple", a, b, c, exerciseText };
    operandA = a;
    operandB = b;
    question = applyMathLevelPresentation(question, { selectedOp: "subtraction", params, mathLevelKey, gradeKey });
    return finalizeMathQuestionOutput({
      question,
      exerciseText,
      correctAnswer,
      answers: buildMathMcqAnswerList(correctAnswer, "subtraction", params, randInt, round),
      operation: "subtraction",
      params,
      a,
      b,
      isStory: false,
    });
  }

  // ===== חיבור =====
  if (selectedOp === "addition") {
    const maxA = levelConfig.addition.max || 20;
    const isLowGrade = gradeKey === "g1" || gradeKey === "g2"; // כיתות א' וב'

    // כיתה א' - חיבור בעשרות שלמות (30+40=70)
    let useTensOnly = gradeKey === "g1" && Math.random() < 0.2;
    // כיתה א' - חיבור בעשרת השנייה (13+4, 17-4)
    let useSecondDecade = gradeKey === "g1" && Math.random() < 0.2;
    if (mathForce === "add_tens_only") {
      useTensOnly = true;
      useSecondDecade = false;
    } else if (mathForce === "add_second_decade") {
      useSecondDecade = true;
      useTensOnly = false;
    } else if (mathForce === "add_two") {
      useTensOnly = false;
      useSecondDecade = false;
    } else if (mathForce === "add_three") {
      useTensOnly = false;
      useSecondDecade = false;
    }
    const forceVerticalAdd =
      mathForce === "add_vertical" && ["g2", "g3", "g4", "g5", "g6"].includes(gradeKey);
    // חיבור במאונך — worksheets may force vertical from grade 2+
    const useVertical =
      forceVerticalAdd ||
      (gradeKey === "g2" &&
        levelConfig.addition?.vertical &&
        mathForce !== "add_two" &&
        Math.random() < 0.4);
    // האם להשתמש בתרגיל 3 מספרים - רק מכיתה ג' ומעלה
    const useThreeTerms =
      mathForce === "add_three" ||
      (!isLowGrade && allowTwoStep && Math.random() < 0.3);

    if (useTensOnly) {
      // כיתה א': חיבור בעשרות שלמות (30+40=70)
      const tens1 = randInt(1, 9) * 10; // 10, 20, 30, ..., 90
      const tens2 = randInt(1, Math.min(9, Math.floor((100 - tens1) / 10))) * 10;
      correctAnswer = tens1 + tens2;
      const exerciseText = `${tens1} + ${tens2} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "add_tens_only",
        a: tens1,
        b: tens2,
        exerciseText,
        op: "add",
        grade: gradeKey,
      };
      operandA = tens1;
      operandB = tens2;
    } else if (useSecondDecade) {
      // כיתה א': חיבור בעשרת השנייה (13+4, 17-4)
      const base = randInt(11, 19); // 11-19
      const addend = randInt(1, Math.min(9, 20 - base));
      correctAnswer = base + addend;
      const exerciseText = `${base} + ${addend} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "add_second_decade",
        a: base,
        b: addend,
        exerciseText,
        op: "add",
        grade: gradeKey,
      };
      operandA = base;
      operandB = addend;
    } else if (useThreeTerms) {
      // חיבור של 3 מספרים - רק מכיתה ג' ומעלה
      const a = randInt(1, maxA);
      const b = randInt(1, maxA);
      const c = randInt(1, maxA);
      correctAnswer = round(a + b + c);
      const exerciseText = `${a} + ${b} + ${c} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "add_three",
        a,
        b,
        c,
        exerciseText,
        op: "add",
        grade: gradeKey,
      };
      operandA = a;
      operandB = b;
    } else {
      // ✅ וריאציות שונות של חיבור שני מספרים
      const a = randInt(1, maxA);
      const b = randInt(1, maxA);
      const c = a + b;

      // כיתה ב' - חיבור במאונך (אם מוגדר)
      if (useVertical) {
        // חיבור במאונך - נציג את התרגיל בצורה מאונכת
        correctAnswer = c;
        const exerciseText = `${a} + ${b} = ${BLANK}`;
        question = exerciseText;
        params = {
          kind: "add_vertical",
          a,
          b,
          c,
          exerciseText,
          op: "add",
          grade: gradeKey,
          vertical: true,
          presentationVariant: randInt(0, 3),
        };
        operandA = a;
        operandB = b;
      } else {
        // חיבור - רק תרגיל ישיר (ללא נעלם) - נעלמים רק במשוואות
        correctAnswer = c;
        const exerciseText = `${a} + ${b} = ${BLANK}`;
        question = exerciseText;
        params = {
          kind: "add_two",
          a,
          b,
          exerciseText,
          op: "add",
          grade: gradeKey,
          presentationVariant: randInt(0, 3),
        };

        operandA = a;
        operandB = b;
      }
    }
  } else if (selectedOp === "subtraction") {
    const maxS = levelConfig.subtraction.max || 20;
    const minS = levelConfig.subtraction.min ?? 0;
    const isLowGrade = gradeKey === "g1" || gradeKey === "g2"; // כיתות א' וב'

    // כיתה א' - חיסור בעשרות שלמות
    let useTensOnly = gradeKey === "g1" && Math.random() < 0.2;
    // כיתה א' - חיסור בעשרת השנייה
    let useSecondDecade = gradeKey === "g1" && Math.random() < 0.2;
    if (mathForce === "sub_two") {
      useTensOnly = false;
      useSecondDecade = false;
    }
    const forceVerticalSub =
      mathForce === "sub_vertical" && ["g2", "g3", "g4", "g5", "g6"].includes(gradeKey);
    // חיסור במאונך — worksheets may force vertical from grade 2+
    const useVertical =
      forceVerticalSub ||
      (gradeKey === "g2" &&
        levelConfig.subtraction?.vertical &&
        mathForce !== "sub_two" &&
        Math.random() < 0.4);

    let a;
    let b;

    if (useTensOnly) {
      // כיתה א': חיסור בעשרות שלמות (50-20=30)
      const tens1 = randInt(2, 9) * 10; // 20, 30, 40, ..., 90
      const tens2 = randInt(1, Math.floor(tens1 / 10)) * 10;
      a = tens1;
      b = tens2;
    } else if (useSecondDecade) {
      // כיתה א': חיסור בעשרת השנייה (17-4, 17-14)
      const base = randInt(11, 19); // 11-19
      const subtrahend = randInt(1, base - 10);
      a = base;
      b = subtrahend;
    } else if (allowNegatives) {
      a = randInt(minS, maxS);
      b = randInt(minS, maxS);
    } else {
      b = randInt(minS, maxS);
      a = randInt(b, maxS); // דואג ש-a ≥ b
    }

    const c = a - b;

    // כיתה ב' - חיסור במאונך
    if (useVertical) {
      // חיסור במאונך
      correctAnswer = c;
      const exerciseText = `${a} - ${b} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "sub_vertical",
        a,
        b,
        c,
        exerciseText,
        vertical: true,
        presentationVariant: randInt(0, 3),
      };
      operandA = a;
      operandB = b;
    } else {
      // חיסור - רק תרגיל ישיר (ללא נעלם) - נעלמים רק במשוואות
      correctAnswer = c;
      const exerciseText = `${a} - ${b} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "sub_two",
        a,
        b,
        c,
        exerciseText,
        presentationVariant: randInt(0, 3),
      };

      operandA = a;
      operandB = b;
    }
  } else if (selectedOp === "multiplication") {
    // כיתה א׳ — ללא כפל פורמלי (סימן ×); רק קבוצות שוות וספירה בקפיצות
    if (gradeKey === "g1") {
      const groups = randInt(2, 5);
      const perGroup = randInt(2, 4);
      const total = groups * perGroup;
      const mulG1Variant = Math.random();
      if (mulG1Variant < 0.5) {
        // קבוצות שוות — שאלה מילולית
        correctAnswer = total;
        const objects = ["כדורים", "תפוחים", "עפרונות", "כוכבים"][randInt(0, 3)];
        question = `יש ${groups} קבוצות. בכל קבוצה ${perGroup} ${objects}. כמה ${objects} יש בסך הכול?`;
        params = { kind: "mul_groups_g1", groups, perGroup, total, objects };
        isStory = true;
      } else {
        // ספירה בקפיצות — השלם את הסדרה
        const seq = [];
        for (let i = 1; i <= groups; i++) seq.push(i * perGroup);
        correctAnswer = seq[seq.length - 1];
        question = `ספרו בקפיצות של ${perGroup}: ${seq.slice(0, -1).join(", ")}, ${BLANK}`;
        params = { kind: "mul_skip_count_g1", groups, perGroup, total: seq[seq.length - 1], seq };
      }
      question = applyMathLevelPresentation(question, { selectedOp, params, mathLevelKey, gradeKey });
      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers: buildMathMcqAnswerList(correctAnswer, selectedOp, params, randInt, round),
        operation: selectedOp,
        params,
        a: groups,
        b: perGroup,
        isStory,
      });
    }

    // שימוש ב-levelConfig.multiplication.max ישירות מ-GRADE_LEVELS
    const maxM = levelConfig.multiplication?.max || 10;

    if (mathForce === "mul") {
      const a = randInt(1, maxM);
      const b = randInt(1, maxM);
      const c = a * b;
      correctAnswer = round(c);
      const exerciseText = `${a} × ${b} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "mul",
        a,
        b,
        exerciseText,
        presentationVariant: randInt(0, 3),
      };
      operandA = a;
      operandB = b;
    } else if (
      mathForce === "mul_tens" &&
      gradeKey === "g3" &&
      levelConfig.multiplication?.tensHundreds
    ) {
      const tens = randInt(1, 9) * 10;
      const multiplier = randInt(1, Math.min(10, maxM));
      const result = tens * multiplier;
      correctAnswer = result;
      const exerciseText = `${tens} × ${multiplier} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "mul_tens",
        tens,
        multiplier,
        result,
        exerciseText,
        tensHundreds: true,
      };
      operandA = tens;
      operandB = multiplier;
    } else if (
      mathForce === "mul_hundreds" &&
      gradeKey === "g3" &&
      levelConfig.multiplication?.tensHundreds
    ) {
      const hundreds = randInt(1, 9) * 100;
      const multiplier = randInt(1, Math.min(10, maxM));
      const result = hundreds * multiplier;
      correctAnswer = result;
      const exerciseText = `${hundreds} × ${multiplier} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "mul_hundreds",
        hundreds,
        multiplier,
        result,
        exerciseText,
        tensHundreds: true,
      };
      operandA = hundreds;
      operandB = multiplier;
    } else if (
      mathForce === "mul_vertical" &&
      ["g4", "g5", "g6"].includes(gradeKey)
    ) {
      // כפל ארוך (long_multiplication) — חייב להצליח בכיתות ד'-ו', ברמות רגיל/מתקדם,
      // ללא תלות בדגל multiDigit של levelConfig (מוגדר רק בחלק מתצורות כיתה ד').
      let twoDigit;
      let oneDigit;
      if (gradeKey === "g4") {
        twoDigit = randInt(10, 99);
        oneDigit = randInt(2, 9);
      } else if (gradeKey === "g5") {
        twoDigit = randInt(10, 99);
        oneDigit = randInt(10, 99);
      } else {
        // g6 — כפל ארוך מאתגר יותר: תלת-ספרתי × דו-ספרתי
        twoDigit = randInt(100, 999);
        oneDigit = randInt(10, 99);
      }
      const result = twoDigit * oneDigit;
      correctAnswer = result;
      const exerciseText = `${twoDigit} × ${oneDigit} = ${BLANK}`;
      question = exerciseText;
      params = { kind: "mul_vertical", twoDigit, oneDigit, result, exerciseText, multiDigit: true, vertical: true };
      operandA = twoDigit;
      operandB = oneDigit;
    } else if (gradeKey === "g4" && levelConfig.multiplication?.multiDigit && Math.random() < 0.4) {
      const twoDigit = randInt(10, 99);
      const oneDigit = randInt(2, 9);
      const result = twoDigit * oneDigit;
      correctAnswer = result;
      const exerciseText = `${twoDigit} × ${oneDigit} = ${BLANK}`;
      question = exerciseText;
      params = { kind: "mul_vertical", twoDigit, oneDigit, result, exerciseText, multiDigit: true, vertical: true };
      operandA = twoDigit;
      operandB = oneDigit;
    } else if (gradeKey === "g3" && levelConfig.multiplication?.tensHundreds && Math.random() < 0.4) {
      // כיתה ג' - כפל בעשרות שלמות ובמאות שלמות
      const useTens = Math.random() < 0.7; // 70% עשרות, 30% מאות
      if (useTens) {
        // כפל בעשרות שלמות: 20 × 3, 30 × 4 וכו'
        const tens = randInt(1, 9) * 10; // 10, 20, 30, ..., 90
        const multiplier = randInt(1, Math.min(10, maxM));
        const result = tens * multiplier;
        correctAnswer = result;
        const exerciseText = `${tens} × ${multiplier} = ${BLANK}`;
        question = exerciseText;
        params = { kind: "mul_tens", tens, multiplier, result, exerciseText, tensHundreds: true };
        operandA = tens;
        operandB = multiplier;
      } else {
        // כפל במאות שלמות: 200 × 3, 300 × 4 וכו'
        const hundreds = randInt(1, 9) * 100; // 100, 200, 300, ..., 900
        const multiplier = randInt(1, Math.min(10, maxM));
        const result = hundreds * multiplier;
        correctAnswer = result;
        const exerciseText = `${hundreds} × ${multiplier} = ${BLANK}`;
        question = exerciseText;
        params = { kind: "mul_hundreds", hundreds, multiplier, result, exerciseText, tensHundreds: true };
        operandA = hundreds;
        operandB = multiplier;
      }
    } else {
      // כפל רגיל - רק תרגיל ישיר (ללא נעלם) - נעלמים רק במשוואות
      const a = randInt(1, maxM);
      const b = randInt(1, maxM);
      const c = a * b;

      // צורה רגילה: a × b = __
      correctAnswer = round(c);
      const exerciseText = `${a} × ${b} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "mul",
        a,
        b,
        exerciseText,
        presentationVariant: randInt(0, 3),
      };

      operandA = a;
      operandB = b;
    }
  } else if (selectedOp === "division") {
    const maxD = levelConfig.division.max || 100;
    const maxDivisor = levelConfig.division.maxDivisor || 12;

    if (mathForce === "div") {
      // חילוק בסיסי — בכל הכיתות (כולל ד'/ה'), בלי ליפול לחילוק ארוך בגלל הסתברות.
      const divisor = randInt(2, maxDivisor);
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;
      correctAnswer = round(quotient);
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "div",
        dividend,
        divisor,
        exerciseText,
        presentationVariant: randInt(0, 3),
      };
      operandA = dividend;
      operandB = divisor;
    } else if (
      mathForce === "div_long" &&
      ["g4", "g5", "g6"].includes(gradeKey)
    ) {
      const useTens = Math.random() < 0.5;
      let divisor;
      if (useTens) {
        divisor = randInt(1, 9) * 10;
      } else {
        divisor = randInt(2, 9);
      }
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "div_long",
        dividend,
        divisor,
        quotient,
        exerciseText,
        isTens: useTens,
        longDivision: true,
      };
      operandA = dividend;
      operandB = divisor;
    } else if (
      mathForce === "div_two_digit" &&
      ["g4", "g5", "g6"].includes(gradeKey)
    ) {
      // חילוק ארוך במחלק דו-ספרתי — גם כש־forceKind נשלח (לא תלוי בדגל twoDigit של levelConfig).
      const divisor = randInt(11, 99);
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "div_two_digit",
        dividend,
        divisor,
        quotient,
        exerciseText,
        twoDigit: true,
        longDivision: true,
      };
      operandA = dividend;
      operandB = divisor;
    } else if (gradeKey === "g4" && levelConfig.division?.longDivision && Math.random() < 0.5) {
      const useTens = Math.random() < 0.5; // 50% עשרות, 50% חד-ספרתי
      let divisor;
      if (useTens) {
        divisor = randInt(1, 9) * 10; // 10, 20, 30, ..., 90
      } else {
        divisor = randInt(2, 9); // 2-9
      }
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = { kind: "div_long", dividend, divisor, quotient, exerciseText, isTens: useTens, longDivision: true };
      operandA = dividend;
      operandB = divisor;
    } else if (gradeKey === "g5" && levelConfig.division?.twoDigit && Math.random() < 0.4) {
      // כיתה ה' - חילוק במספר דו-ספרתי
      const divisor = randInt(11, 99);
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;
      correctAnswer = quotient;
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = { kind: "div_two_digit", dividend, divisor, quotient, exerciseText, twoDigit: true };
      operandA = dividend;
      operandB = divisor;
    } else {
      // חילוק רגיל - רק ללא שארית
      const divisor = randInt(2, maxDivisor);
      const quotient = randInt(2, Math.max(2, Math.floor(maxD / divisor)));
      const dividend = divisor * quotient;

      // חילוק - רק תרגיל ישיר (ללא נעלם) - נעלמים רק במשוואות
      // צורה רגילה: dividend ÷ divisor = __
      correctAnswer = round(quotient);
      const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
      question = exerciseText;
      params = {
        kind: "div",
        dividend,
        divisor,
        exerciseText,
        presentationVariant: randInt(0, 3),
      };

      operandA = dividend;
      operandB = divisor;
    }
  } else if (selectedOp === "division_with_remainder") {
    // חילוק עם שארית — בסיסי (אופקי) או ארוך (אנכי) לפי forceKind.
    const maxDBase = levelConfig.division_with_remainder?.max || 100;
    const maxDivisorBase = levelConfig.division_with_remainder?.maxDivisor || 12;
    const forceLongRemainder =
      mathForce === "div_with_remainder_long" &&
      ["g4", "g5", "g6"].includes(gradeKey);

    let divisor;
    let maxD = maxDBase;
    if (forceLongRemainder) {
      maxD = Math.max(
        maxDBase,
        Number(levelConfig.division?.max) || 0,
        gradeKey === "g6" ? 900 : gradeKey === "g5" ? 500 : 200
      );
      if (["g5", "g6"].includes(gradeKey) && Math.random() < 0.4) {
        divisor = randInt(11, Math.min(29, Math.max(11, Math.floor(maxD / 10))));
      } else if (Math.random() < 0.5) {
        divisor = randInt(1, 9) * 10;
        if (divisor < 2) divisor = 10;
      } else {
        divisor = randInt(2, 9);
      }
    } else {
      divisor = randInt(2, maxDivisorBase);
    }

    // לפחות 80% עם שארית (כמו שביקשת)
    // אם אין טווח חוקי ליצור שארית (למשל maxD קטן מדי) ניפול אוטומטית לללא שארית.
    const minQuotient = maxD >= divisor * 2 ? 2 : 1;
    const maxQuotientForRemainder = Math.floor((maxD - 1) / divisor); // כדי שיהיה מקום לשארית >= 1
    const canMakeRemainder = maxQuotientForRemainder >= minQuotient && divisor > 1;
    const hasRemainder = canMakeRemainder && Math.random() < 0.8;

    let quotient, dividend, remainder = 0;
    if (hasRemainder) {
      // חילוק עם שארית
      const quotientMax = Math.max(minQuotient, maxQuotientForRemainder);
      quotient = randInt(minQuotient, quotientMax);
      remainder = randInt(1, divisor - 1); // שארית בין 1 ל-divisor-1
      dividend = divisor * quotient + remainder;

      // בטיחות: אם יצא מעבר למקסימום (במקרה קצה), נקטין מנה עד שנכנס.
      while (dividend > maxD && quotient > 1) {
        quotient -= 1;
        dividend = divisor * quotient + remainder;
      }
    } else {
      // חילוק ללא שארית — עדיין בפורמט מנה+שארית כדי שלא ייפול ל־kind "div"
      const quotientMax = Math.max(minQuotient, Math.floor(maxD / divisor));
      quotient = randInt(minQuotient, quotientMax);
      remainder = 0;
      dividend = divisor * quotient;
    }

    // חילוק ארוך: העדפת תרגיל עם מנה/מחולק גדולים יותר כשאפשר.
    if (forceLongRemainder && dividend < 20 && quotient < 10) {
      const bump = randInt(2, 5);
      quotient = Math.max(quotient, bump);
      dividend = divisor * quotient + remainder;
      while (dividend > maxD && quotient > 2) {
        quotient -= 1;
        dividend = divisor * quotient + remainder;
      }
    }

    correctAnswer = `${quotient} ושארית ${remainder}`;
    const exerciseText = `${dividend} ÷ ${divisor} = ${BLANK}`;
    question = exerciseText;
    params = {
      kind: forceLongRemainder ? "div_with_remainder_long" : "div_with_remainder",
      dividend,
      divisor,
      quotient,
      remainder,
      exerciseText,
      ...(forceLongRemainder ? { longDivision: true } : {}),
    };

    operandA = dividend;
    operandB = divisor;

    // תשובות MCQ כמחרוזות מנה+שארית (גם כשהשארית 0)
    const wrongAnswers = new Set();
    const addRemStr = (q, r) => {
      if (q <= 0 || r < 0 || r >= divisor) return;
      const s = `${q} ושארית ${r}`;
      if (s !== correctAnswer) wrongAnswers.add(s);
    };
    addRemStr(quotient, remainder === 0 ? 1 : (remainder + 1) % divisor || divisor - 1);
    addRemStr(quotient + 1, remainder);
    addRemStr(Math.max(1, quotient - 1), remainder);
    addRemStr(quotient, Math.max(0, remainder - 1));
    addRemStr(quotient + 1, 0);
    let remGuard = 0;
    while (wrongAnswers.size < 3 && remGuard < 40) {
      remGuard += 1;
      const wq = Math.max(1, quotient + randInt(-1, 2));
      const wr = randInt(0, divisor - 1);
      addRemStr(wq, wr);
    }

    // הוספת התשובות ל-params כדי שיהיו זמינות
    const allAnswers = [correctAnswer, ...Array.from(wrongAnswers).slice(0, 3)];

    // ערבוב התשובות
    for (let i = allAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }

    // החזרת התשובות במקום standard processing
    // נצטרך לטפל בזה אחר כך בקוד - אבל בינתיים נשמור את זה ב-params
    params.answers = allAnswers;
    params.isChoiceOnly = true; // סמן שזה רק בחירה מרובה
  } else if (selectedOp === "fractions" && levelConfig.allowFractions) {
    const densSmall = [2, 4, 5, 10];
    const densBig = [2, 3, 4, 5, 6, 8, 10, 12];

    const dens =
      gradeKey === "g3" || gradeKey === "g4"
        ? densSmall.filter((d) => d <= levelConfig.fractions.maxDen)
        : densBig.filter((d) => d <= levelConfig.fractions.maxDen);

    // כיתה ה' - צמצום והרחבה, חיבור וחיסור, מספרים מעורבים
    if (gradeKey === "g5") {
      if (mathForce === "frac_to_mixed") {
        const whole = randInt(1, 3);
        const den = dens[Math.floor(Math.random() * dens.length)] || 4;
        const num = randInt(1, den - 1);
        const improperNum = whole * den + num;
        correctAnswer = `${whole} ${num}/${den}`;
        question = `המר את השבר ${improperNum}/${den} למספר מעורב: ${BLANK}`;
        params = { kind: "frac_to_mixed", improperNum, den, whole, num };
      } else {
      const fractionType = Math.random();
      if (fractionType < 0.2) {
        // מספרים מעורבים (20% מהשאלות)
        const variant = Math.random();
        if (variant < 0.5) {
          // המרה משבר למספר מעורב
          const whole = randInt(1, 3);
          const den = dens[Math.floor(Math.random() * dens.length)] || 4;
          const num = randInt(1, den - 1);
          const improperNum = whole * den + num;
          correctAnswer = `${whole} ${num}/${den}`;
          question = `המר את השבר ${improperNum}/${den} למספר מעורב: ${BLANK}`;
          params = { kind: "frac_to_mixed", improperNum, den, whole, num };
        } else {
          // המרה ממספר מעורב לשבר
          const whole = randInt(1, 3);
          const den = dens[Math.floor(Math.random() * dens.length)] || 4;
          const num = randInt(1, den - 1);
          const improperNum = whole * den + num;
          correctAnswer = `${improperNum}/${den}`;
          question = `המר את המספר המעורב ${whole} ${num}/${den} לשבר: ${BLANK}`;
          params = { kind: "mixed_to_frac", whole, num, den, improperNum };
        }
      } else if (fractionType < 0.5) {
        // צמצום והרחבה
        const den = dens[Math.floor(Math.random() * dens.length)] || 4;
        const num = randInt(1, den - 1);
        const factor = randInt(2, 3);
        const variant = Math.random();
        
        if (variant < 0.5) {
          // הרחבה: מצא שבר שווה
          const expandedNum = num * factor;
          const expandedDen = den * factor;
          correctAnswer = `${expandedNum}/${expandedDen}`;
          question = `מצא שבר שווה ל-${num}/${den} (הרחב ב-${factor}): ${BLANK}`;
          params = { kind: "frac_expand", num, den, factor, expandedNum, expandedDen };
        } else {
          // צמצום: מצא שבר שווה
          const reducedNum = num;
          const reducedDen = den;
          const expandedNum = num * factor;
          const expandedDen = den * factor;
          correctAnswer = `${reducedNum}/${reducedDen}`;
          question = `צמצם את השבר ${expandedNum}/${expandedDen}: ${BLANK}`;
          params = { kind: "frac_reduce", num: expandedNum, den: expandedDen, reducedNum, reducedDen };
        }
      } else {
        // חיבור וחיסור שברים - כיתה ה'
        const den1 = dens[Math.floor(Math.random() * dens.length)] || 4;
        let den2 = dens[Math.floor(Math.random() * dens.length)] || 6;
        if (den1 === den2 && Math.random() < 0.3) {
          den2 = dens[(dens.indexOf(den1) + 1) % dens.length] || 3;
        }
        
        const n1 = randInt(1, den1 - 1);
        const n2 = randInt(1, den2 - 1);
        
        const lcm = (a, b) => {
          const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
          return Math.abs((a * b) / gcd(a, b));
        };
        
        const commonDen = lcm(den1, den2);
        const m1 = commonDen / den1;
        const m2 = commonDen / den2;
        
        const opKind = Math.random() < 0.5 ? "add" : "sub";
        let resNum = opKind === "add" ? n1 * m1 + n2 * m2 : n1 * m1 - n2 * m2;
        
        if (opKind === "sub" && resNum < 0) {
          resNum = n2 * m2 - n1 * m1;
          question = `${n2}/${den2} - ${n1}/${den1} = ${BLANK}`;
          params = { kind: "frac_add_sub", op: "sub", n1: n2, den1: den2, n2: n1, den2: den1, commonDen, resNum };
        } else {
          question = opKind === "add" 
            ? `${n1}/${den1} + ${n2}/${den2} = ${BLANK}`
            : `${n1}/${den1} - ${n2}/${den2} = ${BLANK}`;
          params = { kind: "frac_add_sub", op: opKind, n1, den1, n2, den2, commonDen, resNum };
        }

        params = mergeDiagnosticContractIntoParams(params, {
          patternFamily: "fraction_unlike_denominators_add_sub",
          conceptTag: "frac_common_denominator",
          diagnosticSkillId: "math_frac_common_denominator",
          probePower: "high",
          expectedErrorTags: ["wrong_lcm", "adds_denominators_directly", "concept_gap"],
          explanationHe:
            "חיבור/חיסור שברים עם מכנים שונים - דורש מציאת מכנה משותף לפני חיבור המונים.",
        });
        
        // צמצום התוצאה אם אפשר
        const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
        const divisor = gcd(resNum, commonDen);
        if (divisor > 1) {
          resNum = resNum / divisor;
          const resDen = commonDen / divisor;
          correctAnswer = `${resNum}/${resDen}`;
        } else {
          correctAnswer = `${resNum}/${commonDen}`;
        }
      }
      }
    } else if (gradeKey === "g6") {
      // כיתה ו' - כפל וחילוק שברים, שבר כמנת חילוק
      const fractionType = Math.random();
      if (fractionType < 0.2) {
        // שבר כמנת חילוק (20% מהשאלות)
        const dividend = randInt(2, 20);
        const divisor = randInt(2, 10);
        const quotient = dividend / divisor;
        if (quotient % 1 !== 0) {
          // אם התוצאה היא שבר
          const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
          const divisorGcd = gcd(dividend, divisor);
          const num = dividend / divisorGcd;
          const den = divisor / divisorGcd;
          correctAnswer = `${num}/${den}`;
          const pickDivQ = () =>
            [
              `מה התוצאה של ${dividend} ÷ ${divisor}? רשמו כשבר: ${BLANK}`,
              `${dividend} חלקי ${divisor} - רשמו כשבר מצומצם: ${BLANK}`,
              `חילוק שלמים כשבר: ${dividend} ÷ ${divisor} = ${BLANK}`,
            ][Math.floor(Math.random() * 3)];
          question = pickDivQ();
          params = { kind: "frac_as_division", dividend, divisor, num, den };
        } else {
          // אם התוצאה היא מספר שלם, ננסה שוב
          const newDividend = randInt(3, 15);
          const newDivisor = randInt(2, 7);
          const newGcd = (x, y) => (y === 0 ? x : newGcd(y, x % y));
          const divisorGcd = newGcd(newDividend, newDivisor);
          const num = newDividend / divisorGcd;
          const den = newDivisor / divisorGcd;
          correctAnswer = `${num}/${den}`;
          question = [
            `מה התוצאה של ${newDividend} ÷ ${newDivisor}? רשמו כשבר: ${BLANK}`,
            `${newDividend} חלקי ${newDivisor} (כשבר): ${BLANK}`,
          ][Math.floor(Math.random() * 2)];
          params = { kind: "frac_as_division", dividend: newDividend, divisor: newDivisor, num, den };
        }
      } else if (fractionType < 0.63) {
        // כפל שברים
        const den1 = dens[Math.floor(Math.random() * dens.length)] || 4;
        const den2 = dens[Math.floor(Math.random() * dens.length)] || 6;
        const n1 = randInt(1, den1 - 1);
        const n2 = randInt(1, den2 - 1);
        
        const resNum = n1 * n2;
        const resDen = den1 * den2;
        
        // צמצום התוצאה
        const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
        const divisor = gcd(resNum, resDen);
        const finalNum = resNum / divisor;
        const finalDen = resDen / divisor;
        
        correctAnswer = `${finalNum}/${finalDen}`;
        question = [
          `${n1}/${den1} × ${n2}/${den2} = ${BLANK}`,
          `כפל שברים: ${n1}/${den1} · ${n2}/${den2} = ${BLANK}`,
          `מה תוצאת ${n1}/${den1} כפול ${n2}/${den2}? ${BLANK}`,
          `חשב את המכפלה ${n1}/${den1} × ${n2}/${den2} = ${BLANK}`,
        ][Math.floor(Math.random() * 4)];
        params = { kind: "frac_multiply", n1, den1, n2, den2, finalNum, finalDen };
      } else if (fractionType < 0.73) {
        const den = dens[Math.floor(Math.random() * dens.length)] || 8;
        let n1 = randInt(1, den - 1);
        let n2 = randInt(1, den - 1);
        let guard = 0;
        while (n1 === n2 && guard++ < 20) {
          n2 = randInt(1, den - 1);
        }
        const biggerStr = n1 > n2 ? `${n1}/${den}` : `${n2}/${den}`;
        correctAnswer = biggerStr;
        question = [
          `איזה שבר גדול יותר - ${n1}/${den} או ${n2}/${den}? רשמו את השבר הגדול: ${BLANK}`,
          `בחרו את השבר הגדול מבין ${n1}/${den} ו-${n2}/${den}: ${BLANK}`,
          `השוו בין ${n1}/${den} ל-${n2}/${den}. הגדול הוא: ${BLANK}`,
        ][Math.floor(Math.random() * 3)];
        params = { kind: "frac_compare_same_den", n1, n2, den };
      } else {
        // חילוק שברים
        const den1 = dens[Math.floor(Math.random() * dens.length)] || 4;
        const den2 = dens[Math.floor(Math.random() * dens.length)] || 6;
        const n1 = randInt(1, den1 - 1);
        const n2 = randInt(1, den2 - 1);
        
        // חילוק = כפל בהופכי
        const resNum = n1 * den2;
        const resDen = den1 * n2;
        
        // צמצום התוצאה
        const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
        const divisor = gcd(resNum, resDen);
        const finalNum = resNum / divisor;
        const finalDen = resDen / divisor;
        
        correctAnswer = `${finalNum}/${finalDen}`;
        question = [
          `${n1}/${den1} ÷ ${n2}/${den2} = ${BLANK}`,
          `חילוק שברים: ${n1}/${den1} : ${n2}/${den2} = ${BLANK}`,
          `מה תוצאת ${n1}/${den1} חלקי ${n2}/${den2}? ${BLANK}`,
          `${n1}/${den1} לחלק ב-${n2}/${den2} שווה אל ${BLANK}`,
        ][Math.floor(Math.random() * 4)];
        params = { kind: "frac_divide", n1, den1, n2, den2, finalNum, finalDen };
      }
    } else if (gradeKey === "g3" || gradeKey === "g4") {
      // כיתות ג'-ד' — מכנה זהה, השוואה, צמצום בסיסי, שקילות פשוטה
      const g4tag = gradeKey === "g4" ? "כיתה ד׳ - " : "";
      const den = dens[Math.floor(Math.random() * dens.length)] || 4;
      const branch = Math.random();

      if (branch < 0.58) {
        const opKind = Math.random() < 0.5 ? "add_frac" : "sub_frac";
        const n1 = randInt(1, den - 1);
        const n2 = randInt(1, den - 1);

        let resNum = opKind === "add_frac" ? n1 + n2 : n1 - n2;
        const resDen = den;

        if (opKind === "sub_frac" && resNum < 0) {
          resNum = n2 - n1;
          question = [
            `${g4tag}${n2}/${den} - ${n1}/${den} = ${BLANK}`,
            `${g4tag}חיסור שברים (מכנה ${den}): ${n2}/${den} − ${n1}/${den} = ${BLANK}`,
          ][Math.floor(Math.random() * 2)];
          params = {
            kind:
              gradeKey === "g4"
                ? "frac_same_den_sub_g4"
                : "frac_same_den_sub",
            op: "sub",
            n1: n2,
            n2: n1,
            den,
          };
        } else {
          question =
            opKind === "add_frac"
              ? [
                  `${g4tag}${n1}/${den} + ${n2}/${den} = ${BLANK}`,
                  `${g4tag}חיבור שברים במכנה ${den}: ${n1}/${den} + ${n2}/${den} = ${BLANK}`,
                ][Math.floor(Math.random() * 2)]
              : [
                  `${g4tag}${n1}/${den} - ${n2}/${den} = ${BLANK}`,
                  `${g4tag}חיסור במכנה זהה: ${n1}/${den} − ${n2}/${den} = ${BLANK}`,
                ][Math.floor(Math.random() * 2)];
          params = {
            kind:
              gradeKey === "g4"
                ? opKind === "add_frac"
                  ? "frac_same_den_add_g4"
                  : "frac_same_den_sub_g4"
                : opKind === "add_frac"
                  ? "frac_same_den_add"
                  : "frac_same_den_sub",
            op: opKind === "add_frac" ? "add" : "sub",
            n1,
            n2,
            den,
          };
        }

        params = mergeDiagnosticContractIntoParams(params, {
          patternFamily: "fraction_same_denominator_add_sub",
          conceptTag: "frac_same_den",
          diagnosticSkillId: "math_frac_same_den",
          probePower: "medium",
          expectedErrorTags: ["calculation_slip", "operation_confusion"],
          explanationHe:
            "חיבור/חיסור שברים עם מכנה זהה - טעויות נפוצות בחישוב המונה או בבחירת הפעולה.",
        });

        correctAnswer = `${resNum}/${resDen}`;
      } else if (branch < 0.76) {
        let n1 = randInt(1, den - 1);
        let n2 = randInt(1, den - 1);
        let guard = 0;
        while (n1 === n2 && guard++ < 25) {
          n2 = randInt(1, den - 1);
        }
        const biggerStr = n1 > n2 ? `${n1}/${den}` : `${n2}/${den}`;
        correctAnswer = biggerStr;
        question = [
          `${g4tag}איזה שבר גדול יותר - ${n1}/${den} או ${n2}/${den}? רשמו את השבר הגדול: ${BLANK}`,
          `${g4tag}השוו ${n1}/${den} ו-${n2}/${den} (מכנה ${den}). הגדול: ${BLANK}`,
        ][Math.floor(Math.random() * 2)];
        params = {
          kind: gradeKey === "g4" ? "frac_compare_like_den_g4" : "frac_compare_like_den_g3",
          n1,
          n2,
          den,
        };
      } else if (branch < 0.9) {
        const num = randInt(2, 6) * 2;
        const denBig = 8;
        const gcdS = (x, y) => (y === 0 ? x : gcdS(y, x % y));
        const g = gcdS(num, denBig);
        correctAnswer = `${num / g}/${denBig / g}`;
        question = [
          `${g4tag}צמצם את השבר ${num}/${denBig}: ${BLANK}`,
          `${g4tag}מצא שבר שקול פשוט יותר ל-${num}/${denBig}: ${BLANK}`,
        ][Math.floor(Math.random() * 2)];
        params = {
          kind: gradeKey === "g4" ? "frac_simplify_intro_g4" : "frac_simplify_intro_g3",
          num,
          den: denBig,
        };
      } else {
        const factor = randInt(2, 2);
        const smallDen = den;
        const bigDen = smallDen * factor;
        const numSmall = randInt(1, smallDen - 1);
        const numBig = numSmall * factor;
        correctAnswer = `${smallDen}`;
        question = [
          `${g4tag}${numBig}/${bigDen} = ${numSmall}/${BLANK}`,
          `${g4tag}השלים מכנה: ${numBig}/${bigDen} = ${numSmall}/${BLANK}`,
        ][Math.floor(Math.random() * 2)];
        params = {
          kind: gradeKey === "g4" ? "frac_equiv_missing_den_g4" : "frac_equiv_missing_den_g3",
          numSmall,
          smallDen,
          numBig,
          bigDen,
        };
      }
    } else if (gradeKey === "g1" || gradeKey === "g2") {
      // כיתות א׳–ב׳ — חצי ורבע בלבד; כיתה א׳ בטווחים צרים יותר
      const isG1 = gradeKey === "g1";
      const halfWholeHi = isG1 ? 12 : 20;
      const quarterWholeHi = isG1 ? 12 : 20;
      let fractionType = Math.random() < 0.5 ? "half" : "quarter";
      let fracVariant = Math.random();
      if (mathForce === "frac_half") {
        fractionType = "half";
        fracVariant = 0;
      } else if (mathForce === "frac_half_reverse") {
        fractionType = "half";
        fracVariant = 1;
      } else if (mathForce === "frac_quarter") {
        fractionType = "quarter";
        fracVariant = 0;
      } else if (mathForce === "frac_quarter_reverse") {
        fractionType = "quarter";
        fracVariant = 1;
      }
      const depthMeta = {
        fractionDepthBand: "intro_unit_fractions",
        fractionGradeBand: gradeKey,
      };
      if (fractionType === "half") {
        const whole = randInt(2, halfWholeHi);
        const variant = fracVariant;
        if (variant < 0.5) {
          correctAnswer = whole / 2;
          question = `מהו חצי מ-${whole}?`;
          params = { kind: "frac_half", whole, ...depthMeta };
        } else {
          correctAnswer = whole;
          question = `חצי מ-${BLANK} הוא ${whole / 2}. מה המספר השלם?`;
          params = { kind: "frac_half_reverse", half: whole / 2, whole, ...depthMeta };
        }
      } else {
        const whole = randInt(4, quarterWholeHi);
        const variant = fracVariant;
        if (variant < 0.5) {
          correctAnswer = whole / 4;
          question = `מהו רבע מ-${whole}?`;
          params = { kind: "frac_quarter", whole, ...depthMeta };
        } else {
          correctAnswer = whole;
          question = `רבע מ-${BLANK} הוא ${whole / 4}. מה המספר השלם?`;
          params = { kind: "frac_quarter_reverse", quarter: whole / 4, whole, ...depthMeta };
        }
      }
    }
  // ===== אחוזים (כיתות ה–ו) =====
  } else if (selectedOp === "percentages") {
    const maxBase = levelConfig.percentages?.maxBase || 400;
    const maxPercent = levelConfig.percentages?.maxPercent || 50;
    // חשוב: בשאלות אחוזים אנחנו רוצים תוצאה מדויקת ושלמה (בלי שארית ובלי אומדן),
    // לכן בוחרים base שמתאים ל-p כך ש-(base * p) / 100 יוצא מספר שלם.
    const gcd = (x, y) => {
      let a = Math.abs(x);
      let b = Math.abs(y);
      while (b !== 0) {
        const t = a % b;
        a = b;
        b = t;
      }
      return a || 1;
    };
    const chooseBaseForPercent = (pVal) => {
      // base must be multiple of step = 100 / gcd(p,100)
      const step = 100 / gcd(pVal, 100);
      const minMul = Math.ceil(40 / step);
      const maxMul = Math.floor(maxBase / step);
      const mul = randInt(Math.max(1, minMul), Math.max(1, maxMul));
      return step * mul;
    };
    const moneyHe = (n) => `${n} שקלים`;

    const percOptions = [10, 20, 25, maxPercent].filter((pp) => pp <= maxPercent);
    const p = percOptions[randInt(0, percOptions.length - 1)];
    const base = chooseBaseForPercent(p);

    let t = Math.random() < 0.5 ? "part_of" : "discount";
    if (mathForce === "perc_part_of") t = "part_of";
    if (mathForce === "perc_discount") t = "discount";

    if (t === "part_of") {
      correctAnswer = (base * p) / 100; // תמיד שלם לפי בחירת base
      const partTemplates = [
        () => `כמה הם ${p}% מתוך ${base}?`,
        () => `מצאו ${p}% מתוך ${base}.`,
        () => `מהו הערך של ${p}% מתוך ${base}?`,
        () =>
          `בקופסה יש ${base} חרוזים. ${p}% מהם כחולים. כמה חרוזים כחולים יש בקופסה?`,
        () =>
          `בכיתה יש ${base} תלמידים. ${p}% מהם משתתפים בחוג. כמה תלמידים משתתפים בחוג?`,
        () =>
          `בחנות נמכרו ${base} מחברות. ${p}% מהן היו אדומות. כמה מחברות אדומות נמכרו?`,
        () =>
          `בספרייה יש ${base} ספרים. ${p}% מהם ספרי הרפתקאות. כמה ספרי הרפתקאות יש בספרייה?`,
        () =>
          `בגן יש ${base} פרחים. ${p}% מהם צהובים. כמה פרחים צהובים יש בגן?`,
      ];
      const templateIndex = randInt(0, partTemplates.length - 1);
      question = partTemplates[templateIndex]();
      params = {
        kind: "perc_part_of",
        base,
        p,
        templateIndex,
        presentationVariant: templateIndex,
      };
    } else {
      const discount = (base * p) / 100; // תמיד שלם
      const finalPrice = base - discount;
      const items = [
        { name: "ספר", gender: "m" },
        { name: "משחק", gender: "m" },
        { name: "תיק", gender: "m" },
        { name: "כדור", gender: "m" },
        { name: "כרטיס כניסה", gender: "m" },
        { name: "מחברת", gender: "f" },
        { name: "חולצה", gender: "f" },
        { name: "ערכת יצירה", gender: "f" },
      ];
      const item = items[randInt(0, items.length - 1)];
      const askDiscount = Math.random() < 0.45;
      correctAnswer = askDiscount ? discount : finalPrice;
      const pricePhrase =
        item.gender === "f"
          ? `מחירה של ${item.name} הוא ${moneyHe(base)}`
          : `מחירו של ${item.name} הוא ${moneyHe(base)}`;
      const onPhrase = item.gender === "f" ? "עליה" : "עליו";
      const askPhrase = askDiscount
        ? "מהו סכום ההנחה?"
        : "מהו המחיר לאחר ההנחה?";
      question = `${pricePhrase}. ניתנה ${onPhrase} הנחה של ${p}%. ${askPhrase}`;
      params = {
        kind: "perc_discount",
        base,
        p,
        discount,
        finalPrice,
        ask: askDiscount ? "discount_amount" : "final_price",
        itemName: item.name,
        itemGender: item.gender,
        presentationVariant: randInt(0, 7),
      };
    }
  // ===== סדרות =====
  } else if (selectedOp === "sequences") {
    const maxStart = levelConfig.sequences?.maxStart || 20;
    const maxStep = levelConfig.sequences?.maxStep || 9;
    const start = randInt(1, maxStart);
    let step;
    if (gradeKey === "g1" || gradeKey === "g2") {
      step = randInt(1, Math.min(3, maxStep));
    } else if (gradeKey === "g3" || gradeKey === "g4") {
      step = randInt(1, maxStep);
    } else {
      step = randInt(-maxStep, maxStep) || 2;
    }

    const posOfBlank = randInt(0, 4); // אחד מחמשת המספרים
    const seq = [];
    for (let i = 0; i < 5; i++) {
      seq.push(start + i * step);
    }
    correctAnswer = seq[posOfBlank];
    // יצירת הסדרה עם פסיקים, אבל בלי פסיקים לפני ואחרי המספר החסר
    const displayParts = [];
    for (let i = 0; i < seq.length; i++) {
      if (i === posOfBlank) {
        displayParts.push(BLANK);
      } else {
        displayParts.push(seq[i]);
      }
    }
    // חיבור עם פסיקים, אבל בלי פסיקים לפני ואחרי BLANK
    const display = displayParts
      .map((item, idx) => {
        if (item === BLANK) {
          return BLANK;
        }
        // נוסיף פסיק רק אחרי המספר, אם יש משהו אחרי (ולא BLANK)
        const needsCommaAfter = idx < displayParts.length - 1 && displayParts[idx + 1] !== BLANK;
        return needsCommaAfter ? item + ", " : item;
      })
      .join(" ");
    
    const seqVariant = Math.floor(Math.random() * 4);
    let questionLabel = "השלם את הסדרה";
    let seqKind = "seq_inline";
    if (seqVariant === 1) {
      questionLabel = "מצא את החסר בדפוס";
      seqKind = "seq_pattern_gap";
    } else if (seqVariant === 2) {
      questionLabel = "בסדרה חשבונית השלם את המספר הבא";
      seqKind = "seq_arithmetic_explicit";
    } else if (seqVariant === 3) {
      questionLabel = "המשך את הרצף";
      seqKind = "seq_continue";
    }
    const exerciseText = display;
    question = `${questionLabel} ${exerciseText}`;
    params = {
      kind: seqKind,
      start,
      step,
      seq,
      posOfBlank,
      questionLabel,
      exerciseText,
      variant: seqVariant,
    };
  // ===== עשרוניים =====
  } else if (selectedOp === "decimals") {
    // Grade-band alignment: א׳–ב׳ אין פעולת עשרוניים ב GRADES — אם הגיע סימפול ידני/ארוע נדיר, נפיל לתפיסה מספרית.
    if (gradeKey === "g1" || gradeKey === "g2") {
      return generateQuestion(
        levelConfig,
        "number_sense",
        gradeKey,
        mixedOps,
        probeOpts
      );
    }

    const places = levelConfig.decimals?.places || 2;
    const maxBase = levelConfig.decimals?.maxBase || 200;

    if (mathForce === "dec_repeating" && gradeKey === "g6" && levelConfig.repeatingDecimals) {
      const den = 3;
      const num = 1;
      const repeating = num / den;
      correctAnswer = repeating.toFixed(3) + "...";
      question = `המר את השבר ${num}/${den} לשבר עשרוני (עד 3 ספרות אחרי הנקודה) = ${BLANK}`;
      params = { kind: "dec_repeating", num, den, repeating };
      operandA = num;
      operandB = den;
    } else if (mathForce === "dec_multiply" && gradeKey === "g6") {
      const a = round(Math.random() * maxBase, places);
      const b = round(Math.random() * maxBase, places);
      correctAnswer = round(a * b, places * 2);
      question = `${a.toFixed(places)} × ${b.toFixed(places)} = ${BLANK}`;
      params = { kind: "dec_multiply", a, b, places };
      operandA = a;
      operandB = b;
    } else if (
      mathForce === "dec_divide" &&
      gradeKey === "g6" &&
      levelConfig.decimals?.multiply
    ) {
      const x = round(2.1, places);
      const y = round(8.4, places);
      const big = Math.max(x, y);
      const small = Math.min(x, y);
      correctAnswer = round(big / small, places);
      question = `${big.toFixed(places)} ÷ ${small.toFixed(places)} = ${BLANK}`;
      params = { kind: "dec_divide", a: big, b: small, places };
      operandA = big;
      operandB = small;
    } else if (gradeKey === "g6" && (levelConfig.decimals?.multiply || levelConfig.decimals?.divide || levelConfig.repeatingDecimals) && Math.random() < 0.5) {
      // שבר עשרוני מחזורי - רק אם מוגדר
      if (levelConfig.repeatingDecimals && Math.random() < 0.2) {
        // שבר מחזורי: 1/3 = 0.333..., 1/6 = 0.1666...
        const den = [3, 6, 9][Math.floor(Math.random() * 3)];
        const num = 1;
        const repeating = num / den;
        correctAnswer = repeating.toFixed(3) + "...";
        question = `המר את השבר ${num}/${den} לשבר עשרוני (עד 3 ספרות אחרי הנקודה) = ${BLANK}`;
        params = { kind: "dec_repeating", num, den, repeating };
        operandA = num;
        operandB = den;
      } else if (levelConfig.decimals?.multiply || levelConfig.decimals?.divide) {
        const useMultiply = levelConfig.decimals?.multiply && (Math.random() < 0.5 || !levelConfig.decimals?.divide);
        const useDivide = levelConfig.decimals?.divide && (Math.random() >= 0.5 || !levelConfig.decimals?.multiply);
        const factor = Math.random() < 0.5 ? 10 : 100;
        const num = round(Math.random() * maxBase, places);
        
        if (useMultiply) {
          // כפל ב-10 או 100
          const result = round(num * factor, places);
          correctAnswer = result;
          question = `${num.toFixed(places)} × ${factor} = ${BLANK}`;
          params = { kind: "dec_multiply_10_100", num, factor, result, places };
          operandA = num;
          operandB = factor;
        } else if (useDivide) {
          // חילוק ב-10 או 100
          const result = round(num / factor, places);
          correctAnswer = result;
          question = `${num.toFixed(places)} ÷ ${factor} = ${BLANK}`;
          params = { kind: "dec_divide_10_100", num, factor, result, places };
          operandA = num;
          operandB = factor;
        } else {
          // כפל וחילוק עשרוניים רגילים
          const a = round(Math.random() * maxBase, places);
          const b = round(Math.random() * maxBase, places);
          if (levelConfig.decimals?.multiply) {
            correctAnswer = round(a * b, places * 2);
            question = `${a.toFixed(places)} × ${b.toFixed(places)} = ${BLANK}`;
            params = { kind: "dec_multiply", a, b, places };
          } else {
            const big = Math.max(a, b);
            const small = Math.min(a, b);
            correctAnswer = round(big / small, places);
            question = `${big.toFixed(places)} ÷ ${small.toFixed(places)} = ${BLANK}`;
            params = { kind: "dec_divide", a: big, b: small, places };
          }
          operandA = a;
          operandB = b;
        }
      }
    } else {
      // עשרוניים רגילים — השוואה / עיגול לשלם / חיבור וחיסור
      if (mathForce === "dec_add" || mathForce === "dec_sub") {
        const a = round(Math.random() * maxBase, places);
        const b = round(Math.random() * maxBase, places);
        if (mathForce === "dec_add") {
          correctAnswer = round(a + b, places);
          question = `${a.toFixed(places)} + ${b.toFixed(places)} = ${BLANK}`;
          params = {
            kind: "dec_add",
            a,
            b,
            places,
            presentationVariant: randInt(0, 3),
          };
          operandA = a;
          operandB = b;
        } else {
          const big = Math.max(a, b);
          const small = Math.min(a, b);
          correctAnswer = round(big - small, places);
          question = `${big.toFixed(places)} - ${small.toFixed(places)} = ${BLANK}`;
          params = {
            kind: "dec_sub",
            a: big,
            b: small,
            places,
            presentationVariant: randInt(0, 3),
          };
          operandA = big;
          operandB = small;
        }
      } else {
      const roll = Math.random();
      const allowDecimalVariety = gradeKey !== "g1" && gradeKey !== "g2";
      if (allowDecimalVariety && roll < 0.22) {
        let x = round(randInt(2, Math.min(95, Math.floor(maxBase))) / 10, Math.min(places, 2));
        let y = round(randInt(2, Math.min(95, Math.floor(maxBase))) / 10, Math.min(places, 2));
        let guard = 0;
        while (Math.abs(x - y) < 0.05 && guard++ < 25) {
          y = round(randInt(2, Math.min(95, Math.floor(maxBase))) / 10, Math.min(places, 2));
        }
        const bigger = x > y ? x : y;
        correctAnswer = bigger;
        question = `איזה מספר גדול יותר - ${x.toFixed(places)} או ${y.toFixed(places)}? רשמו את הגדול: ${BLANK}`;
        params = { kind: "dec_compare_max", x, y, places };
        operandA = x;
        operandB = y;
      } else if (allowDecimalVariety && roll < 0.38) {
        const n = round(randInt(12, Math.min(98, Math.floor(maxBase))) / 10, 1);
        correctAnswer = round(n, 0);
        question = `עגלו את ${n.toFixed(1)} למספר השלם הקרוב (כללי עיגול סטנדרטי): ${BLANK}`;
        params = { kind: "dec_round_whole_standard", n, places: 2 };
        operandA = n;
        operandB = null;
      } else {
        const a = round(Math.random() * maxBase, places);
        const b = round(Math.random() * maxBase, places);
        const t = Math.random() < 0.5 ? "add" : "sub";

        if (t === "add") {
          correctAnswer = round(a + b, places);
          question = `${a.toFixed(places)} + ${b.toFixed(places)} = ${BLANK}`;
          params = {
            kind: "dec_add",
            a,
            b,
            places,
            presentationVariant: randInt(0, 3),
          };
          operandA = a;
          operandB = b;
        } else {
          const big = Math.max(a, b);
          const small = Math.min(a, b);
          correctAnswer = round(big - small, places);
          question = `${big.toFixed(places)} - ${small.toFixed(places)} = ${BLANK}`;
          params = {
            kind: "dec_sub",
            a: big,
            b: small,
            places,
            presentationVariant: randInt(0, 3),
          };
          operandA = big;
          operandB = small;
        }
      }
      }
    }
  // ===== עיגול =====
  } else if (selectedOp === "rounding") {
    const roundingConfig = levelConfig.rounding || {};
    const toWhat = roundingConfig.toWhat || (Math.random() < 0.5 ? 10 : 100);
    const maxN = roundingConfig.maxN || (toWhat === 10 ? 999 : 9999);
    const n = randInt(1, maxN);
    correctAnswer =
      toWhat === 10 ? Math.round(n / 10) * 10 : Math.round(n / 100) * 100;
    question =
      toWhat === 10
        ? `עגל את ${n} לעשרות הקרובות = ${BLANK}`
        : `עגל את ${n} למאות הקרובות = ${BLANK}`;
    params = {
      kind: "round",
      n,
      toWhat,
      presentationVariant: randInt(0, 3),
    };
  } else if (selectedOp === "equations" || (selectedOp === "order_of_operations" && gradeKey === "g3")) {
    if (mathForce === "eq_add_simple" || mathForce === "eq_sub_simple") {
      const eqType = mathForce === "eq_add_simple" ? "add" : "sub";
      if (eqType === "add") {
        const a = randInt(1, 9);
        const c = randInt(a + 1, 10);
        const b = c - a;
        correctAnswer = b;
        const exerciseText = `${a} + ${BLANK} = ${c}`;
        question = exerciseText;
        params = { kind: "eq_add_simple", a, b, c, exerciseText };
        operandA = a;
        operandB = b;
      } else {
        const c = randInt(1, 9);
        const a = randInt(c + 1, 10);
        const b = a - c;
        correctAnswer = b;
        const exerciseText = `${a} - ${BLANK} = ${c}`;
        question = exerciseText;
        params = { kind: "eq_sub_simple", a, b, c, exerciseText };
        operandA = a;
        operandB = b;
      }
    } else if (mathForce === "eq_add" || mathForce === "eq_sub") {
      const maxAdd = levelConfig.addition.max || 100;
      const maxSub =
        levelConfig.subtraction?.max != null
          ? levelConfig.subtraction.max
          : 100;
      if (mathForce === "eq_add") {
        const a = randInt(1, Math.floor(maxAdd / 2));
        const b = randInt(1, Math.floor(maxAdd / 2));
        const c = a + b;
        const form = Math.random() < 0.5 ? "a_plus_x" : "x_plus_b";
        let exerciseText;
        if (form === "a_plus_x") {
          correctAnswer = b;
          exerciseText = `${a} + ${BLANK} = ${c}`;
        } else {
          correctAnswer = a;
          exerciseText = `${BLANK} + ${b} = ${c}`;
        }
        question = exerciseText;
        params = { kind: "eq_add", form, a, b, c, exerciseText };
        operandA = a;
        operandB = b;
      } else {
        const c = randInt(0, Math.floor(maxSub / 2));
        const b = randInt(0, Math.floor(maxSub / 2));
        const a = c + b;
        const form = Math.random() < 0.5 ? "a_minus_x" : "x_minus_b";
        let exerciseText;
        if (form === "a_minus_x") {
          correctAnswer = b;
          exerciseText = `${a} - ${BLANK} = ${c}`;
        } else {
          correctAnswer = a;
          exerciseText = `${BLANK} - ${b} = ${c}`;
        }
        question = exerciseText;
        params = { kind: "eq_sub", form, a, b, c, exerciseText };
        operandA = a;
        operandB = b;
      }
    } else if (
      mathForce === "order_add_mul" ||
      mathForce === "order_mul_sub" ||
      mathForce === "order_parentheses"
    ) {
      const maxVal = levelConfig.order_of_operations?.max || 200;
      const a = randInt(1, Math.min(20, maxVal));
      const b = randInt(1, Math.min(10, maxVal));
      const c = randInt(1, Math.min(10, maxVal));
      if (mathForce === "order_add_mul") {
        correctAnswer = a + b * c;
        question = `${a} + ${b} × ${c} = ${BLANK}`;
        params = { kind: "order_add_mul", a, b, c };
      } else if (mathForce === "order_mul_sub") {
        correctAnswer = a * b - c;
        question = `${a} × ${b} - ${c} = ${BLANK}`;
        params = { kind: "order_mul_sub", a, b, c };
      } else {
        correctAnswer = (a + b) * c;
        question = `(${a} + ${b}) × ${c} = ${BLANK}`;
        params = { kind: "order_parentheses", a, b, c };
      }
      operandA = a;
      operandB = b;
    } else if (gradeKey === "g3" && levelConfig.order_of_operations && selectedOp === "order_of_operations") {
      const maxVal = levelConfig.order_of_operations.max || 200;
      const a = randInt(1, Math.min(20, maxVal));
      const b = randInt(1, Math.min(10, maxVal));
      const c = randInt(1, Math.min(10, maxVal));
      
      const variant = Math.random();
      if (variant < 0.33) {
        // כפל וחיבור: a + b × c
        correctAnswer = a + b * c;
        question = `${a} + ${b} × ${c} = ${BLANK}`;
        params = { kind: "order_add_mul", a, b, c };
      } else if (variant < 0.66) {
        // כפל וחיסור: a × b - c
        correctAnswer = a * b - c;
        question = `${a} × ${b} - ${c} = ${BLANK}`;
        params = { kind: "order_mul_sub", a, b, c };
      } else {
        // עם סוגריים: (a + b) × c
        correctAnswer = (a + b) * c;
        question = `(${a} + ${b}) × ${c} = ${BLANK}`;
        params = { kind: "order_parentheses", a, b, c };
      }
      operandA = a;
      operandB = b;
    } else {
      // משוואות רגילות
      // כיתה א' - משוואות פשוטות (5 + __ = 7, 10 - __ = 6)
      if (gradeKey === "g1" && Math.random() < 0.3) {
        const eqType = Math.random() < 0.5 ? "add" : "sub";
        if (eqType === "add") {
          const a = randInt(1, 9);
          const c = randInt(a + 1, 10);
          const b = c - a;
          correctAnswer = b;
          const exerciseText = `${a} + ${BLANK} = ${c}`;
          question = exerciseText;
          params = { kind: "eq_add_simple", a, b, c, exerciseText };
          operandA = a;
          operandB = b;
        } else {
          const c = randInt(1, 9);
          const a = randInt(c + 1, 10);
          const b = a - c;
          correctAnswer = b;
          const exerciseText = `${a} - ${BLANK} = ${c}`;
          question = exerciseText;
          params = { kind: "eq_sub_simple", a, b, c, exerciseText };
          operandA = a;
          operandB = b;
        }
      } else {
        const canUseMulDiv = gradeKey === "g5" || gradeKey === "g6";
        const types = canUseMulDiv ? ["add", "sub", "mul", "div"] : ["add", "sub"];
        const t = types[Math.floor(Math.random() * types.length)];

        const maxAdd = levelConfig.addition.max || 100;
        const maxSub =
          levelConfig.subtraction?.max != null
            ? levelConfig.subtraction.max
            : 100;
        const maxMul = levelConfig.multiplication?.max ?? 10;

        const gNumEq =
          parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 0;
        const useFormalEquationKinds = gNumEq >= 4;

        if (!useFormalEquationKinds && (t === "add" || t === "sub")) {
          if (t === "add") {
            const a = randInt(1, Math.min(9, Math.floor(maxAdd / 2)));
            const c = randInt(a + 1, Math.min(maxAdd, 30));
            const b = c - a;
            correctAnswer = b;
            const exerciseText = `${a} + ${BLANK} = ${c}`;
            question = exerciseText;
            params = { kind: "eq_add_simple", a, b, c, exerciseText };
            operandA = a;
            operandB = b;
          } else {
            const c = randInt(1, Math.min(9, Math.floor(maxSub / 2)));
            const a = randInt(c + 1, Math.min(maxSub, 30));
            const b = a - c;
            correctAnswer = b;
            const exerciseText = `${a} - ${BLANK} = ${c}`;
            question = exerciseText;
            params = { kind: "eq_sub_simple", a, b, c, exerciseText };
            operandA = a;
            operandB = b;
          }
        } else if (t === "add") {
          const a = randInt(1, Math.floor(maxAdd / 2));
          const b = randInt(1, Math.floor(maxAdd / 2));
          const c = a + b;
          const form = Math.random() < 0.5 ? "a_plus_x" : "x_plus_b";

          let exerciseText;
          if (form === "a_plus_x") {
            correctAnswer = b;
            exerciseText = `${a} + ${BLANK} = ${c}`;
          } else {
            correctAnswer = a;
            exerciseText = `${BLANK} + ${b} = ${c}`;
          }
          question = exerciseText;
          params = { kind: "eq_add", form, a, b, c, exerciseText };
        } else if (t === "sub") {
          const c = randInt(0, Math.floor(maxSub / 2));
          const b = randInt(0, Math.floor(maxSub / 2));
          const a = c + b;
          const form = Math.random() < 0.5 ? "a_minus_x" : "x_minus_b";

          let exerciseText;
          if (form === "a_minus_x") {
            correctAnswer = b;
            exerciseText = `${a} - ${BLANK} = ${c}`;
          } else {
            correctAnswer = a;
            exerciseText = `${BLANK} - ${b} = ${c}`;
          }
          question = exerciseText;
          params = { kind: "eq_sub", form, a, b, c, exerciseText };
        } else if (t === "mul") {
          const a = randInt(1, maxMul);
          const b = randInt(1, maxMul);
          const c = a * b;
          const form = Math.random() < 0.5 ? "a_times_x" : "x_times_b";

          let exerciseText;
          if (form === "a_times_x") {
            correctAnswer = b;
            exerciseText = `${a} × ${BLANK} = ${c}`;
          } else {
            correctAnswer = a;
            exerciseText = `${BLANK} × ${b} = ${c}`;
          }
          question = exerciseText;
          params = { kind: "eq_mul", form, a, b, c, exerciseText };
        } else {
          const maxDiv = levelConfig.division?.max ?? 100;
          const maxDivisor = levelConfig.division?.maxDivisor ?? 12;
          const divisor = randInt(2, maxDivisor);
          const quotient = randInt(2, Math.max(2, Math.floor(maxDiv / divisor)));
          const dividend = divisor * quotient;
          const form = Math.random() < 0.5 ? "a_div_x" : "x_div_b";

          let exerciseText;
          if (form === "a_div_x") {
            correctAnswer = divisor;
            exerciseText = `${dividend} ÷ ${BLANK} = ${quotient}`;
          } else {
            correctAnswer = dividend;
            exerciseText = `${BLANK} ÷ ${divisor} = ${quotient}`;
          }
          question = exerciseText;
          params = { kind: "eq_div", form, dividend, divisor, quotient, exerciseText };
        }
      }
    }
  } else if (selectedOp === "compare") {
    const maxVal = levelConfig.compare?.max || levelConfig.addition?.max || 500;
    // מספרים שליליים רק לכיתות שמוגדרות allowNegatives=true (ה׳ ו-ו׳)
    const allowNeg = gradeCfg.allowNegatives;
    const a = allowNeg ? randInt(-20, maxVal) : randInt(0, maxVal);
    const b = allowNeg ? randInt(-20, maxVal) : randInt(0, maxVal);

    // חשוב: הסימן צריך להיות מתמטי נכון. כדי למנוע היפוך בתצוגת RTL,
    // נעטוף את התרגיל עצמו ב-LTR markers (LRI/PDI).
    const symbol = computeComparisonSign(a, b) ?? "=";

    correctAnswer = symbol;
    const questionLabel = "השלם את הסימן:";
    const rawExerciseText = `${a} ${BLANK} ${b}`;
    const exerciseText = `\u2066${rawExerciseText}\u2069`;
    question = `${questionLabel} ${exerciseText}`;
    params = {
      kind: "cmp",
      a,
      b,
      questionLabel,
      exerciseText,
      presentationVariant: randInt(0, 3),
    };

    question = applyMathLevelPresentation(question, {
      selectedOp,
      params,
      mathLevelKey,
      gradeKey,
    });

    const answers = [...COMPARISON_SIGN_DISPLAY_ORDER];

    return finalizeMathQuestionOutput({
      question,
      questionLabel,
      exerciseText,
      correctAnswer,
      answers,
      operation: selectedOp,
      params,
      a,
      b,
      isStory: false,
    });

  // ===== Number Sense – שכנים, עשרות/אחדות, זוגי/אי-זוגי, השלמה, ישר המספרים, מנייה =====
  } else if (selectedOp === "number_sense") {
    const maxNumberSense = levelConfig.number_sense?.max || levelConfig.addition?.max || 999;

    if (mathForce === "ns_counting_forward") {
      const start = randInt(1, 20);
      correctAnswer = start + 1;
      question = `ספור קדימה: ${start}, ${BLANK}`;
      params = { kind: "ns_counting_forward", start, next: start + 1 };
    } else if (mathForce === "ns_counting_backward") {
      const start = randInt(2, 20);
      correctAnswer = start - 1;
      question = `ספור אחורה: ${start}, ${BLANK}`;
      params = { kind: "ns_counting_backward", start, prev: start - 1 };
    } else if (mathForce === "ns_number_line") {
      const start = randInt(0, 15);
      const end = start + 5;
      const missing = randInt(start + 1, end - 1);
      const numbers = [];
      for (let i = start; i <= end; i++) {
        numbers.push(i === missing ? BLANK : i);
      }
      correctAnswer = missing;
      question = `השלם את המספר החסר על ישר המספרים: ${numbers.join(" - ")}`;
      params = { kind: "ns_number_line", start, end, missing, numbers };
    } else if (mathForce === "ns_neighbors") {
      const n = randInt(1, Math.min(999, maxNumberSense));
      const dir = Math.random() < 0.5 ? "after" : "before";
      if (dir === "after") {
        correctAnswer = n + 1;
        question = `מה המספר שבא אחרי ${n}? = ${BLANK}`;
      } else {
        correctAnswer = n - 1;
        question = `מה המספר שבא לפני ${n}? = ${BLANK}`;
      }
      params = { kind: "ns_neighbors", n, dir };
    } else if (mathForce === "ns_place_tens_units") {
      const n = randInt(10, 99);
      const askTens = Math.random() < 0.5;
      const tens = Math.floor(n / 10);
      const units = n % 10;
      correctAnswer = askTens ? tens : units;
      question = askTens
        ? `מהי ספרת העשרות במספר ${n}? = ${BLANK}`
        : `מהי ספרת האחדות במספר ${n}? = ${BLANK}`;
      params = { kind: "ns_place_tens_units", n, askTens, tens, units };
    } else if (mathForce === "ns_complement10") {
      const b = randInt(1, 9);
      const c = 10;
      const a = c - b;
      correctAnswer = a;
      question = `${BLANK} + ${b} = ${c}`;
      params = { kind: "ns_complement10", a, b, c };
    } else if (mathForce === "ns_place_hundreds") {
      const n = randInt(100, 999);
      const partType = ["hundreds", "tens", "units"][
        Math.floor(Math.random() * 3)
      ];
      const hundreds = Math.floor(n / 100);
      const tens = Math.floor((n % 100) / 10);
      const units = n % 10;
      if (partType === "hundreds") correctAnswer = hundreds;
      else if (partType === "tens") correctAnswer = tens;
      else correctAnswer = units;
      const label =
        partType === "hundreds"
          ? "המאות"
          : partType === "tens"
          ? "העשרות"
          : "האחדות";
      question = `מהי ספרת ${label} במספר ${n}? = ${BLANK}`;
      params = { kind: "ns_place_hundreds", n, partType, hundreds, tens, units };
    } else if (mathForce === "ns_complement100") {
      const b = randInt(1, 99);
      const c = 100;
      const a = c - b;
      correctAnswer = a;
      question = `${BLANK} + ${b} = ${c}`;
      params = { kind: "ns_complement100", a, b, c };
    } else if (mathForce === "ns_even_odd") {
      const n = randInt(0, Math.min(200, maxNumberSense));
      const isEven = n % 2 === 0;
      correctAnswer = isEven ? "זוגי" : "אי-זוגי";
      question = `האם המספר ${n} הוא זוגי?`;
      params = { kind: "ns_even_odd", n, isEven };
      let answers = ["זוגי", "אי-זוגי"];
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers,
        operation: selectedOp,
        params,
        a: n,
        b: null,
        isStory: false,
      });
    } else if (mathForce === "divisibility" && gradeKey === "g2") {
      const divisors = [2, 5, 10];
      const divisor = divisors[Math.floor(Math.random() * divisors.length)];
      const maxNum = levelConfig.compare?.max || 100;
      const num = randInt(10, maxNum);
      const isDivisible = num % divisor === 0;
      correctAnswer = isDivisible ? "כן" : "לא";
      question = `האם המספר ${num} מתחלק ב-${divisor}?`;
      params = {
        kind: "divisibility",
        num,
        divisor,
        isDivisible,
        presentationVariant: randInt(0, 3),
      };
      const wrongAnswer = isDivisible ? "לא" : "כן";
      const answers = [correctAnswer, wrongAnswer];
      if (Math.random() < 0.5) {
        answers.reverse();
      }
      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers,
        operation: selectedOp,
        params,
        a: num,
        b: divisor,
        isStory: false,
      });
    } else {
    const types =
      gradeKey === "g1"
        ? ["neighbors", "place_tens_units", "even_odd", "complement10", "number_line", "counting"]
        : gradeKey === "g2"
        ? ["neighbors", "place_tens_units", "even_odd", "complement10"]
        : gradeKey === "g3" || gradeKey === "g4"
        ? ["neighbors", "place_hundreds", "complement10", "complement100"]
        : ["neighbors", "place_hundreds", "complement10", "complement100", "even_odd"];
    const t = types[Math.floor(Math.random() * types.length)];

    if (t === "neighbors") {
      const n = randInt(1, Math.min(999, maxNumberSense));
      const dir = Math.random() < 0.5 ? "after" : "before";
      if (dir === "after") {
        correctAnswer = n + 1;
        question = `מה המספר שבא אחרי ${n}? = ${BLANK}`;
      } else {
        correctAnswer = n - 1;
        question = `מה המספר שבא לפני ${n}? = ${BLANK}`;
      }
      params = { kind: "ns_neighbors", n, dir };
    } else if (t === "place_tens_units") {
      const n = randInt(10, 99);
      const askTens = Math.random() < 0.5;
      const tens = Math.floor(n / 10);
      const units = n % 10;
      correctAnswer = askTens ? tens : units;
      question = askTens
        ? `מהי ספרת העשרות במספר ${n}? = ${BLANK}`
        : `מהי ספרת האחדות במספר ${n}? = ${BLANK}`;
      params = { kind: "ns_place_tens_units", n, askTens, tens, units };
    } else if (t === "place_hundreds") {
      const n = randInt(100, 999);
      const partType = ["hundreds", "tens", "units"][
        Math.floor(Math.random() * 3)
      ];
      const hundreds = Math.floor(n / 100);
      const tens = Math.floor((n % 100) / 10);
      const units = n % 10;
      if (partType === "hundreds") correctAnswer = hundreds;
      else if (partType === "tens") correctAnswer = tens;
      else correctAnswer = units;
      const label =
        partType === "hundreds"
          ? "המאות"
          : partType === "tens"
          ? "העשרות"
          : "האחדות";
      question = `מהי ספרת ${label} במספר ${n}? = ${BLANK}`;
      params = { kind: "ns_place_hundreds", n, partType, hundreds, tens, units };
    } else if (t === "complement10") {
      const b = randInt(1, 9);
      const c = 10;
      const a = c - b;
      correctAnswer = a;
      question = `${BLANK} + ${b} = ${c}`;
      params = { kind: "ns_complement10", a, b, c };
    } else if (t === "complement100") {
      const b = randInt(1, 99);
      const c = 100;
      const a = c - b;
      correctAnswer = a;
      question = `${BLANK} + ${b} = ${c}`;
      params = { kind: "ns_complement100", a, b, c };
    } else if (t === "number_line") {
      // כיתה א' - ישר המספרים
      const start = randInt(0, 15);
      const end = start + 5;
      const missing = randInt(start + 1, end - 1);
      const numbers = [];
      for (let i = start; i <= end; i++) {
        numbers.push(i === missing ? BLANK : i);
      }
      correctAnswer = missing;
      question = `השלם את המספר החסר על ישר המספרים: ${numbers.join(" - ")}`;
      params = { kind: "ns_number_line", start, end, missing, numbers };
    } else if (t === "counting") {
      // כיתה א' - מנייה וספירה
      const countType = Math.random() < 0.5 ? "forward" : "backward";
      const start = randInt(1, 20);
      if (countType === "forward") {
        // ספירה קדימה: מה המספר הבא?
        correctAnswer = start + 1;
        question = `ספור קדימה: ${start}, ${BLANK}`;
        params = { kind: "ns_counting_forward", start, next: start + 1 };
      } else {
        // ספירה אחורה: מה המספר הקודם?
        if (start > 1) {
          correctAnswer = start - 1;
          question = `ספור אחורה: ${start}, ${BLANK}`;
          params = { kind: "ns_counting_backward", start, prev: start - 1 };
        } else {
          // אם start = 1, נשנה לספירה קדימה
          correctAnswer = start + 1;
          question = `ספור קדימה: ${start}, ${BLANK}`;
          params = { kind: "ns_counting_forward", start, next: start + 1 };
        }
      }
    } else {
      // even_odd – תשובה טקסטואלית
      const n = randInt(0, Math.min(200, maxNumberSense));
      const isEven = n % 2 === 0;
      correctAnswer = isEven ? "זוגי" : "אי-זוגי";
      question = `האם המספר ${n} הוא זוגי?`;
      params = { kind: "ns_even_odd", n, isEven };
      // רק שני ניסוחים שונים לזוגיות — לא ניתן למלא 4 אפשרויות ייחודיות באותה מילה בלי כפילויות;
      // השכנים n−1 ו-n+1 תמיד באותה זוגיות (מנוגדים ל-n), ולכן היו יוצרים כפילויות ב-MCQ.
      let answers = ["זוגי", "אי-זוגי"];
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }

      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers,
        operation: selectedOp,
        params,
        a: n,
        b: null,
        isStory: false,
      });
    }
    }

  // ===== גורמים / כפולות / מ.כ.ק/מ.א.ח – Factors & Multiples =====
  } else if (selectedOp === "factors_multiples") {
    const types = ["factor", "multiple", "gcd"];
    const t = types[Math.floor(Math.random() * types.length)];
    const maxNumber = levelConfig.factors_multiples?.maxNumber || 100;

    if (t === "factor") {
      const n = randInt(12, Math.min(60, maxNumber));
      const factors = [];
      for (let i = 1; i <= n; i++) {
        if (n % i === 0) factors.push(i);
      }
      const correct = factors[randInt(1, factors.length - 1)]; // לא 1
      const options = new Set([correct]);
      while (options.size < 4) {
        const candidate = randInt(2, n + 5);
        if (candidate !== n && n % candidate !== 0) {
          options.add(candidate);
        }
      }
      let answers = Array.from(options);
      // ערבוב התשובות - Fisher-Yates shuffle
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      
      // ערבוב נוסף
      const shuffled = [...answers];
      for (let i = 0; i < shuffled.length; i++) {
        const randomIndex = Math.floor(Math.random() * shuffled.length);
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
      }
      answers = shuffled;

      correctAnswer = correct;
      question = `איזה מהמספרים הבאים הוא מחלק (גורם) של ${n}?`;
      params = { kind: "fm_factor", n, correct };

      question = applyMathLevelPresentation(question, {
        selectedOp,
        params,
        mathLevelKey,
        gradeKey,
      });

      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers,
        operation: selectedOp,
        params,
        a: n,
        b: null,
        isStory: false,
      });
    } else if (t === "multiple") {
      const base = randInt(3, Math.min(12, Math.floor(maxNumber / 10)));
      const correct = base * randInt(2, Math.min(10, Math.floor(maxNumber / base)));
      const options = new Set([correct]);
      while (options.size < 4) {
        const candidate = randInt(base + 1, Math.min(base * 15, maxNumber));
        if (candidate % base !== 0) options.add(candidate);
      }
      let answers = Array.from(options);
      // ערבוב התשובות - Fisher-Yates shuffle
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      
      // ערבוב נוסף
      const shuffled = [...answers];
      for (let i = 0; i < shuffled.length; i++) {
        const randomIndex = Math.floor(Math.random() * shuffled.length);
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
      }
      answers = shuffled;

      correctAnswer = correct;
      question = `איזה מהמספרים הבאים הוא כפולה של ${base}?`;
      params = { kind: "fm_multiple", base, correct };

      question = applyMathLevelPresentation(question, {
        selectedOp,
        params,
        mathLevelKey,
        gradeKey,
      });

      return finalizeMathQuestionOutput({
        question,
        correctAnswer,
        answers,
        operation: selectedOp,
        params,
        a: base,
        b: null,
        isStory: false,
      });
    } else {
      // gcd – מ.א.ח
      const base = randInt(2, 10);
      const k1 = randInt(2, 10);
      const k2 = randInt(2, 10);
      const a = base * k1;
      const b = base * k2;
      correctAnswer = base;
      question = `מהו המחלק המשותף הגדול ביותר של ${a} ו-${b}? = ${BLANK}`;
      params = { kind: "fm_gcd", a, b, gcd: base };
    }

  // ===== תרגילי מילים (רק חשבון – בלי גאומטריה) =====
  } else if (selectedOp === "word_problems") {
    // בריכות נפרדות לפי כיתה — בלי שיתוף תבניות early ↔ mid ↔ late
    const templatesEarlyG1 = [
      "simple_add",
      "simple_sub",
      "pocket_money",
      "time_days",
      "coins",
    ];
    const templatesEarlyG2 = [
      "simple_add_g2",
      "simple_sub_g2",
      "pocket_money_g2",
      "groups_g2",
      "time_days",
      "coins",
      "division_simple",
    ];
    const templatesMidG3 = [
      "groups",
      "comparison_more",
      "part_whole",
      "change_stack",
      "time_sum",
      "leftover",
    ];
    const templatesMidG4 = [
      "groups",
      "comparison_more",
      "part_whole_g4",
      "change_stack_g4",
      "time_sum",
      "leftover",
    ];
    const templatesLateG5 = [
      "multi_step",
      "groups_late",
      "leftover",
      "shop_discount",
      "unit_convert",
      "distance_time",
      "time_sum",
      "average",
    ];
    const templatesLateG6 = [
      "multi_step_g6",
      "groups_late_g6",
      "leftover",
      "shop_discount",
      "unit_convert",
      "distance_time",
      "time_sum",
      "average",
    ];
    const templates =
      gradeKey === "g1"
        ? templatesEarlyG1
        : gradeKey === "g2"
          ? templatesEarlyG2
          : gradeKey === "g3"
            ? templatesMidG3
            : gradeKey === "g4"
              ? templatesMidG4
              : gradeKey === "g5"
                ? templatesLateG5
                : templatesLateG6;

    let t = templates[Math.floor(Math.random() * templates.length)];
    if (mathForce === "wp_comparison_more" && templates.includes("comparison_more")) {
      t = "comparison_more";
    }
    if (mathForce === "wp_leftover" && templates.includes("leftover")) {
      t = "leftover";
    }
    if (mathForce === "wp_time_sum" && templates.includes("time_sum")) {
      t = "time_sum";
    }
    if (mathForce === "wp_coins" || mathForce === "wp_coins_spent") {
      t = "coins";
    }
    if (mathForce === "wp_groups_g2" && gradeKey === "g2") {
      t = "groups_g2";
    }
    if (mathForce === "wp_division_simple" && gradeKey === "g2") {
      t = "division_simple";
    }
    if (mathForce === "wp_time_days" || mathForce === "wp_time_date") {
      t = "time_days";
    }
    if (
      mathForce === "wp_unit_cm_to_m" &&
      (gradeKey === "g5" || gradeKey === "g6") &&
      templates.includes("unit_convert")
    ) {
      t = "unit_convert";
    }

    if (t === "simple_add" || t === "simple_add_g2") {
      const a = randInt(3, 9);
      const b = randInt(2, 8);
      correctAnswer = a + b;
      question =
        t === "simple_add_g2"
          ? `בכיתה היו ${a} ילדים והצטרפו עוד ${b}. כמה ילדים יש עכשיו?`
          : `לליאו יש ${a} כדורים והוא מקבל עוד ${b} כדורים. כמה כדורים יש לליאו בסך הכל?`;
      params = {
        kind: t === "simple_add_g2" ? "wp_simple_add_g2" : "wp_simple_add",
        semanticFamily: "combine_total",
        a,
        b,
      };
    } else if (t === "simple_sub" || t === "simple_sub_g2") {
      const total = randInt(8, 15);
      const give = randInt(2, total - 3);
      correctAnswer = total - give;
      question =
        t === "simple_sub_g2"
          ? `בסל יש ${total} תפוחים. ${give} נאכלו. כמה תפוחים נשארו?`
          : `לליאו יש ${total} מדבקות. הוא נותן לחבר ${give} מדבקות. כמה מדבקות נשארות לליאו?`;
      params = {
        kind: t === "simple_sub_g2" ? "wp_simple_sub_g2" : "wp_simple_sub",
        semanticFamily: "takeaway_remaining",
        total,
        give,
      };
    } else if (t === "pocket_money" || t === "pocket_money_g2") {
      // כיתה א׳: טווח מספרים לפי רמת הכיתה (addition.max) — לא ערכים קשוחים
      // כיתה ב׳: טווח גדול יותר אך גם מגוון לפי levelConfig
      const maxMoney =
        gradeKey === "g1"
          ? (levelConfig.addition?.max || 20)
          : Math.min(80, levelConfig.addition?.max || 80);
      const minMoney = gradeKey === "g1" ? 3 : 10;
      const money = randInt(minMoney, Math.max(minMoney + 2, maxMoney));
      const toy = randInt(1, Math.max(1, money - 1));
      correctAnswer = money - toy;
      question =
        t === "pocket_money_g2"
          ? `לאמה יש ${money} שקלים. היא קונה חטיף ב-${toy} שקלים. כמה כסף נשאר?`
          : `לליאו יש ${money} שקלים. הוא קונה ${toy > 5 ? "ספר" : "עיפרון"} ב-${toy} שקלים. כמה שקלים נשארו לו?`;
      params = {
        kind: t === "pocket_money_g2" ? "wp_pocket_money_g2" : "wp_pocket_money",
        semanticFamily: "money_remaining",
        money,
        toy,
      };
    } else if (t === "groups_g2") {
      const per = randInt(3, 7);
      const groups = randInt(2, 5);
      correctAnswer = per * groups;
      question = `בכל שורה יש ${per} כיסאות. יש ${groups} שורות כאלה. כמה כיסאות יש בסך הכל?`;
      params = {
        kind: "wp_groups_g2",
        semanticFamily: "equal_groups",
        per,
        groups,
      };
    } else if (
      t === "groups" ||
      t === "groups_late" ||
      t === "groups_late_g6"
    ) {
      const per = randInt(3, 8);
      const groups = randInt(2, 6);
      correctAnswer = per * groups;
      let kind = "wp_groups";
      if (gradeKey === "g3") {
        question = `בכל קופסה יש ${per} עפרונות. יש ${groups} קופסאות כאלה. כמה עפרונות יש בסך הכל?`;
        kind = "wp_groups_g3";
      } else if (gradeKey === "g4") {
        question = `בכל מדף יש ${per} ספרים. יש ${groups} מדפים כאלה. כמה ספרים יש בסך הכל?`;
        kind = "wp_groups_g4";
      } else if (gradeKey === "g6") {
        question = `בכל מיכל מסודר יש ${per} חלקים. הובאו ${groups} מיכלים. כמה חלקים בסך הכל?`;
        kind = "wp_groups_late_g6";
      } else {
        question = `בכל ארגז אספקה יש ${per} חבילות. הובאו ${groups} ארגזים. כמה חבילות בסך הכל?`;
        kind = "wp_groups_late";
      }
      params = {
        kind,
        semanticFamily: "equal_groups",
        per,
        groups,
      };
    } else if (t === "comparison_more") {
      const small = randInt(4, 22);
      const diff = randInt(3, 14);
      const big = small + diff;
      correctAnswer = diff;
      question = `לנועה יש ${big} קלפים וליובל יש ${small} קלפים. כמה קלפים יש לנועה יותר מליובל?`;
      params = {
        kind: "wp_comparison_more",
        semanticFamily: "comparison_difference",
        big,
        small,
        diff,
      };
    } else if (t === "part_whole" || t === "part_whole_g4") {
      const whole = randInt(14, 48);
      const partA = randInt(3, whole - 4);
      correctAnswer = whole - partA;
      question =
        t === "part_whole_g4"
          ? `באולם ${whole} מקומות. ${partA} תפוסים בהצגה והשאר פנויים. כמה מקומות פנויים?`
          : `בכיתה ${whole} תלמידים. ${partA} מהם בחוג כדורגל והשאר בחוג שחמט. כמה תלמידים בחוג שחמט?`;
      params = {
        kind: t === "part_whole_g4" ? "wp_part_whole_g4" : "wp_part_whole",
        semanticFamily: "part_whole_complement",
        whole,
        partA,
      };
    } else if (t === "change_stack" || t === "change_stack_g4") {
      const start = randInt(12, 48);
      const gain = randInt(2, 16);
      const loss = randInt(1, Math.min(gain + start - 2, 18));
      correctAnswer = start + gain - loss;
      question =
        t === "change_stack_g4"
          ? `במחסן היו ${start} קרטונים. הוסיפו ${gain} קרטונים חדשים, ונשלחו ${loss} לסניף אחר. כמה קרטונים נשארו במחסן?`
          : `בספרייה היו ${start} ספרים. הוסיפו ${gain} ספרים חדשים, והוצאו להשאלה ${loss} ספרים. כמה ספרים נשארו בספרייה עכשיו?`;
      params = {
        kind: t === "change_stack_g4" ? "wp_change_stack_g4" : "wp_change_stack",
        semanticFamily: "change_over_time",
        start,
        gain,
        loss,
      };
    } else if (t === "time_days") {
      // שאלות זמן - ימים בשבוע (כיתות א'-ב')
      let variant = Math.random();
      if (mathForce === "wp_time_days") variant = 0.1;
      else if (mathForce === "wp_time_date") variant = 0.9;
      if (variant < 0.5) {
        // בוחרים startDay ו-days, מחשבים endDay — כך התשובה תמיד נכונה
        const weekdays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        const startDayIdx = randInt(0, 5); // ראשון עד שישי (לא שבת כנקודת התחלה)
        const days = randInt(1, 6);
        const endDayIdx = (startDayIdx + days) % 7;
        const startDay = weekdays[startDayIdx];
        const endDay = weekdays[endDayIdx];
        correctAnswer = days;
        question = `אם היום יום ${startDay}, כמה ימים יעברו עד יום ${endDay}?`;
        params = {
          kind: "wp_time_days",
          semanticFamily: "time_calendar",
          days,
          startDayIdx,
          endDayIdx,
        };
      } else {
        const today = randInt(1, 5);
        const daysLater = randInt(1, 7 - today);
        correctAnswer = today + daysLater;
        question = `אם היום ה-${today} לחודש, איזה תאריך יהיה בעוד ${daysLater} ימים?`;
        params = {
          kind: "wp_time_date",
          semanticFamily: "time_forward",
          today,
          daysLater,
        };
      }
    } else if (t === "coins") {
      // שאלות כסף - מטבעות (כיתות א'-ב')
      let variant = Math.random();
      if (mathForce === "wp_coins") variant = 0.1;
      else if (mathForce === "wp_coins_spent") variant = 0.9;
      if (variant < 0.5) {
        const coins1 = randInt(1, 5);
        const coins2 = randInt(1, 5);
        const value1 = coins1 * 1; // שקל
        const value2 = coins2 * 2; // 2 שקלים
        correctAnswer = value1 + value2;
        question = `לליאו יש ${coins1} מטבעות של שקל ו-${coins2} מטבעות של 2 שקלים. כמה כסף יש לו בסך הכל?`;
        params = {
          kind: "wp_coins",
          semanticFamily: "money_combine",
          coins1,
          coins2,
          value1,
          value2,
        };
      } else {
        const total = randInt(5, 15);
        const spent = randInt(2, total - 2);
        correctAnswer = total - spent;
        question = `לליאו יש ${total} שקלים במטבעות. הוא קונה ממתק ב-${spent} שקלים. כמה כסף נשאר לו?`;
        params = {
          kind: "wp_coins_spent",
          semanticFamily: "money_remaining",
          total,
          spent,
        };
      }
    } else if (t === "division_simple") {
      // שאלות חילוק פשוטות (כיתה ב') - רק ללא שארית
      const perGroup = randInt(2, 5);
      const groups = randInt(2, 10);
      const total = perGroup * groups; // וודא שאין שארית
      correctAnswer = groups;
      question = `יש ${total} תפוחים. מחלקים אותם לקבוצות של ${perGroup} תפוחים בכל קבוצה. כמה קבוצות יש?`;
      params = {
        kind: "wp_division_simple",
        semanticFamily: "equal_partition",
        total,
        perGroup,
        groups,
      };
    } else if (t === "leftover") {
      const total = randInt(40, 100);
      const groupSize = randInt(4, 8);
      const groups = Math.floor(total / groupSize);
      const leftover = total - groups * groupSize;
      correctAnswer = leftover;
      question = `יש ${total} תלמידים והם מתחלקים לקבוצות של ${groupSize} תלמידים בכל קבוצה. כמה תלמידים יישארו ללא קבוצה מלאה?`;
      params = {
        kind: "wp_leftover",
        semanticFamily: "division_remainder",
        total,
        groupSize,
        groups,
        leftover,
      };
    } else if (t === "shop_discount") {
      const discPerc = [10, 20, 25, 50][randInt(0, 3)];
      // חשוב: תשובה מדויקת ושלמה (בלי שברים ובלי עיגול)
      const gcd = (x, y) => {
        let a = Math.abs(x);
        let b = Math.abs(y);
        while (b !== 0) {
          const t = a % b;
          a = b;
          b = t;
        }
        return a || 1;
      };
      const step = 100 / gcd(discPerc, 100); // המחיר חייב להיות כפולה של step כדי שההנחה תהיה שלמה
      const minMul = Math.ceil(50 / step);
      const maxMul = Math.floor(400 / step);
      const price = step * randInt(Math.max(1, minMul), Math.max(1, maxMul));
      const discount = (price * discPerc) / 100; // תמיד שלם לפי בחירת price
      const finalPrice = price - discount;
      correctAnswer = finalPrice;
      question = `חולצה עולה ${price} שקלים ויש עליה הנחה של ${discPerc}%. כמה תשלם אחרי ההנחה?`;
      params = {
        kind: "wp_shop_discount",
        semanticFamily: "percent_discount",
        price,
        discPerc,
        discount,
        finalPrice,
      };
    } else if (t === "unit_convert") {
      const mode =
        mathForce === "wp_unit_cm_to_m"
          ? "cm_to_m"
          : Math.random() < 0.5
            ? "cm_to_m"
            : "g_to_kg";
      if (mode === "cm_to_m") {
        const meters = randInt(1, 9);
        const cm = meters * 100;
        correctAnswer = meters;
        question = `כמה מטרים הם ${cm} סנטימטרים? = ${BLANK}`;
        params = {
          kind: "wp_unit_cm_to_m",
          semanticFamily: "unit_conversion",
          cm,
          meters,
        };
      } else {
        const kg = randInt(1, 9);
        const g = kg * 1000;
        correctAnswer = kg;
        question = `כמה קילוגרמים הם ${g} גרם? = ${BLANK}`;
        params = {
          kind: "wp_unit_g_to_kg",
          semanticFamily: "unit_conversion",
          g,
          kg,
        };
      }
    } else if (t === "distance_time") {
      const speed = [5, 6, 8, 10][randInt(0, 3)]; // קמ"ש
      const hours = randInt(1, 4);
      const distance = speed * hours;
      correctAnswer = distance;
      question = `ילד הולך במהירות קבועה של ${speed} ק"מ בשעה במשך ${hours} שעות. כמה קילומטרים יעבור?`;
      params = {
        kind: "wp_distance_time",
        semanticFamily: "rate_time_distance",
        speed,
        hours,
        distance,
      };
    } else if (t === "time_sum") {
      const l1 = randInt(20, 60);
      const l2 = randInt(10, 40);
      correctAnswer = l1 + l2;
      const timeSumByGrade =
        gradeKey === "g3" || gradeKey === "g4"
          ? `שני קטעי וידאו נמשכים ${l1} דקות ו-${l2} דקות. כמה דקות נמשכים שני הקטעים יחד?`
          : gradeKey === "g5"
          ? `סרטון אחד נמשך ${l1} דקות וסרטון שני נמשך ${l2} דקות. כמה דקות נמשכים שניהם יחד?`
          : `קטע ראשון נמשך ${l1} דקות. קטע שני נמשך ${l2} דקות. כמה דקות נמשכו שני הקטעים יחד?`;
      question = timeSumByGrade;
      params = {
        kind: "wp_time_sum",
        semanticFamily: "duration_sum",
        l1,
        l2,
      };
    } else if (t === "average") {
      const s1 = randInt(60, 100);
      const s2 = randInt(60, 100);
      const s3 = randInt(60, 100);
      correctAnswer = Math.round((s1 + s2 + s3) / 3);
      question =
        gradeKey === "g6"
          ? `בפרויקט קבוצתי ניתנו ציונים ${s1}, ${s2} ו-${s3} לשלושה שלבים. מה ממוצע הציון (מעוגל למספר שלם)?`
          : `לליאו ציונים ${s1}, ${s2} ו-${s3} בשלושה מבחנים. מה הממוצע שלו (מעוגל למספר שלם)?`;
      params = {
        kind: gradeKey === "g6" ? "wp_average_g6" : "wp_average",
        semanticFamily: "mean_scores",
        s1,
        s2,
        s3,
      };
    } else if (t === "multi_step" || t === "multi_step_g6") {
      const a = randInt(2, 5);
      const b = randInt(3, 7);
      const price = randInt(5, 20);
      const totalQty = a + b;
      const totalCost = totalQty * price;
      const money = randInt(totalCost + 10, totalCost + 50);
      correctAnswer = money - totalCost;
      question =
        t === "multi_step_g6"
          ? `לתקציב פעילות יש ${money} שקלים. נרכשו ${a} מחברות ו-${b} מארזי צבעים, וכל פריט עולה ${price} שקלים. כמה יתרה תישאר אחרי הרכישה?`
          : `לליאו יש ${money} שקלים. הוא קונה ${a} עטים ו-${b} עפרונות, וכל פריט עולה ${price} שקלים. כמה כסף יישאר לו אחרי הקנייה?`;
      params = {
        kind: t === "multi_step_g6" ? "wp_multi_step_g6" : "wp_multi_step",
        semanticFamily: "multi_step_money",
        a,
        b,
        price,
        totalQty,
        totalCost,
        money,
      };
    } else {
      const a = randInt(2, 5);
      const b = randInt(3, 7);
      const price = randInt(5, 20);
      const totalQty = a + b;
      const totalCost = totalQty * price;
      const money = randInt(totalCost + 10, totalCost + 50);
      correctAnswer = money - totalCost;
      question = `לליאו יש ${money} שקלים. הוא קונה ${a} עטים ו-${b} עפרונות, וכל פריט עולה ${price} שקלים. כמה כסף יישאר לו אחרי הקנייה?`;
      params = {
        kind: "wp_multi_step",
        semanticFamily: "multi_step_money",
        a,
        b,
        price,
        totalQty,
        totalCost,
        money,
      };
    }
    isStory = true;
  // ===== סימני התחלקות =====
  } else if (selectedOp === "divisibility") {
    const divisibilityConfig = levelConfig.divisibility || {};
    const divisors = divisibilityConfig.divisors || [2, 5, 10];
    const divisor = divisors[Math.floor(Math.random() * divisors.length)];
    const maxNum = levelConfig.compare?.max || 1000;
    const num = randInt(10, maxNum);
    const isDivisible = num % divisor === 0;
    
    correctAnswer = isDivisible ? "כן" : "לא";
    question = `האם המספר ${num} מתחלק ב-${divisor}?`;
    params = {
      kind: "divisibility",
      num,
      divisor,
      isDivisible,
      presentationVariant: randInt(0, 3),
    };
    operandA = num;
    operandB = divisor;
    
    // יצירת תשובות (תשובה נכונה + תשובה שגויה בלבד - 2 תשובות)
    const wrongAnswer = isDivisible ? "לא" : "כן";
    const answers = [correctAnswer, wrongAnswer];
    
    // ערבוב התשובות
    if (Math.random() < 0.5) {
      // נהפוך את הסדר ב-50% מהמקרים
      answers.reverse();
    }

    question = applyMathLevelPresentation(question, {
      selectedOp,
      params,
      mathLevelKey,
      gradeKey,
    });
    
    return finalizeMathQuestionOutput({
      question,
      correctAnswer,
      answers,
      operation: selectedOp,
      params,
      a: num,
      b: divisor,
      isStory: false,
    });

  // ===== מספרים ראשוניים ופריקים =====
  } else if (selectedOp === "prime_composite") {
    const primeConfig = levelConfig.prime_composite || {};
    const maxNum = primeConfig.maxNumber || 100;

    const isPrimeNum = (n) => {
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
      }
      return true;
    };
    const countDivisors = (n) => {
      let c = 0;
      for (let i = 1; i <= n; i += 1) {
        if (n % i === 0) c += 1;
      }
      return c;
    };
    const smallestPrimeFactor = (n) => {
      if (n < 2) return null;
      for (let i = 2; i <= n; i += 1) {
        if (n % i === 0) return i;
      }
      return n;
    };
    const buildPrimeClassifyAnswers = () =>
      shuffleMcqList(["ראשוני", "פריק", "לא ראשוני", "לא פריק"]);

    const variantPool =
      mathLevelKey === "easy"
        ? ["pc_classify", "pc_classify", "pc_factor_count"]
        : mathLevelKey === "medium"
          ? ["pc_classify", "pc_factor_count", "pc_smallest_prime", "pc_divisor_pick"]
          : ["pc_classify", "pc_factor_count", "pc_smallest_prime", "pc_divisor_pick"];
    const variant = variantPool[randInt(0, variantPool.length - 1)];
    let answers;

    if (variant === "pc_factor_count") {
      const num = randInt(8, Math.min(maxNum, mathLevelKey === "hard" ? maxNum : 72));
      const factorCount = countDivisors(num);
      correctAnswer = factorCount;
      question = `כמה מחלקים (כולל 1 והמספר עצמו) יש למספר ${num}?`;
      params = {
        kind: "prime_composite",
        subKind: "pc_factor_count",
        num,
        factorCount,
        presentationVariant: randInt(0, 3),
      };
      operandA = num;
      operandB = null;
      answers = buildMathMcqAnswerList(correctAnswer, selectedOp, params, randInt, round);
    } else if (variant === "pc_smallest_prime") {
      const compositeMin = mathLevelKey === "easy" ? 12 : 15;
      let num = randInt(compositeMin, Math.min(maxNum, mathLevelKey === "hard" ? maxNum : 120));
      while (isPrimeNum(num)) {
        num = randInt(compositeMin, Math.min(maxNum, mathLevelKey === "hard" ? maxNum : 120));
      }
      const spf = smallestPrimeFactor(num);
      correctAnswer = spf;
      question = `מה הגורם הראשוני הקטן ביותר של המספר ${num}?`;
      params = {
        kind: "prime_composite",
        subKind: "pc_smallest_prime",
        num,
        smallestPrimeFactor: spf,
        presentationVariant: randInt(0, 3),
      };
      operandA = num;
      operandB = null;
      answers = buildMathMcqAnswerList(correctAnswer, selectedOp, params, randInt, round);
    } else if (variant === "pc_divisor_pick") {
      const num = randInt(12, Math.min(maxNum, mathLevelKey === "hard" ? maxNum : 96));
      const divisors = [];
      for (let i = 2; i <= Math.min(12, num); i += 1) {
        if (num % i === 0) divisors.push(i);
      }
      const nonDivisors = [5, 7, 9, 11].filter((d) => num % d !== 0);
      const pickDivisor = divisors.length
        ? divisors[randInt(0, divisors.length - 1)]
        : null;
      const pickNon = nonDivisors.length
        ? nonDivisors[randInt(0, nonDivisors.length - 1)]
        : null;
      const useDivisible = pickDivisor != null && (pickNon == null || Math.random() < 0.55);
      const divisorCandidate = useDivisible ? pickDivisor : pickNon ?? 5;
      const divides = num % divisorCandidate === 0;
      correctAnswer = divides ? "כן" : "לא";
      question = `האם ${divisorCandidate} מחלק את ${num} בלי שארית?`;
      params = {
        kind: "prime_composite",
        subKind: "pc_divisor_pick",
        num,
        divisorCandidate,
        divides,
        presentationVariant: randInt(0, 3),
      };
      operandA = num;
      operandB = divisorCandidate;
      const wrongPool = divides
        ? ["לא", "רק לפעמים", "תלוי במספר"]
        : ["כן", "תמיד כן", "כן עם שארית"];
      answers = shuffleMcqList([correctAnswer, ...wrongPool.filter((x) => x !== correctAnswer)]);
      while (answers.length < 4) {
        const extra = ["אולי", "לא ידוע"].find((x) => !answers.includes(x));
        if (!extra) break;
        answers.push(extra);
      }
      answers = answers.slice(0, 4);
    } else {
      const num = randInt(2, maxNum);
      const isNumPrime = isPrimeNum(num);
      correctAnswer = isNumPrime ? "ראשוני" : "פריק";
      question = `האם המספר ${num} ראשוני או פריק?`;
      params = {
        kind: "prime_composite",
        subKind: "pc_classify",
        num,
        isPrime: isNumPrime,
        presentationVariant: randInt(0, 3),
      };
      operandA = num;
      operandB = null;
      answers = buildPrimeClassifyAnswers();
    }

    question = applyMathLevelPresentation(question, {
      selectedOp,
      params,
      mathLevelKey,
      gradeKey,
    });

    return finalizeMathQuestionOutput({
      question,
      correctAnswer,
      answers,
      operation: selectedOp,
      params,
      a: operandA,
      b: operandB,
      isStory: false,
    });

  // ===== חזקות =====
  } else if (selectedOp === "powers") {
    const powersConfig = levelConfig.powers || {};
    const maxBase = powersConfig.maxBase || 10;
    const maxExp = powersConfig.maxExp || 3;
    const base = randInt(2, maxBase);
    const exp = randInt(2, maxExp);
    const result = Math.pow(base, exp);
    
    const variant = Math.random();
    if (variant < 0.5) {
      // מה התוצאה?
      correctAnswer = result;
      question = `${base}^${exp} = ${BLANK}`;
      params = { kind: "power_calc", base, exp, result };
    } else {
      // מה הבסיס?
      correctAnswer = base;
      question = `${BLANK}^${exp} = ${result}`;
      params = { kind: "power_base", base, exp, result };
    }
    
    operandA = base;
    operandB = exp;

  // ===== יחס =====
  } else if (selectedOp === "ratio") {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
    const divisor = gcd(a, b);
    const simplifiedA = a / divisor;
    const simplifiedB = b / divisor;

    const simplifyRatio = (x, y) => {
      const g = gcd(x, y);
      const nx = x / g;
      const ny = y / g;
      return `${nx}:${ny}`;
    };
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    
    let ratioSlot = "find";
    if (mathForce === "ratio_find") ratioSlot = "find";
    else if (mathForce === "ratio_first") ratioSlot = "first";
    else if (mathForce === "ratio_second") ratioSlot = "second";
    else {
      const variant = Math.random();
      if (variant < 0.33) ratioSlot = "find";
      else if (variant < 0.66) ratioSlot = "first";
      else ratioSlot = "second";
    }

    if (ratioSlot === "find") {
      // מציאת היחס
      correctAnswer = `${simplifiedA}:${simplifiedB}`;
      question = `מה היחס בין ${a} ל-${b}? כתבו בצורה מצומצמת.`;
      params = { kind: "ratio_find", a, b, simplifiedA, simplifiedB };

      // ✅ יחס הוא תשובה טקסטואלית ("a:b") ולכן יצירת התשובות הכללית עלולה להחזיר אופציה אחת בלבד.
      // כאן אנחנו מייצרים מראש 4 אופציות (1 נכונה + 3 שגויות), כולן "מצומצמות".
      const wrong = new Set();
      const addWrong = (x, y) => {
        if (x <= 0 || y <= 0) return;
        const r = simplifyRatio(x, y);
        if (r !== correctAnswer) wrong.add(r);
      };

      // הצעות שגויות שכיחות (לא שקולות ליחס הנכון)
      addWrong(simplifiedB, simplifiedA); // היפוך יחס
      addWrong(simplifiedA + 1, simplifiedB); // שינוי מספר ראשון
      addWrong(simplifiedA, simplifiedB + 1); // שינוי מספר שני
      if (simplifiedA > 1) addWrong(simplifiedA - 1, simplifiedB);
      if (simplifiedB > 1) addWrong(simplifiedA, simplifiedB - 1);

      let guard = 0;
      while (wrong.size < 3 && guard < 50) {
        guard++;
        const x = randInt(1, 20);
        const y = randInt(1, 20);
        addWrong(x, y);
      }

      const answers = shuffle([correctAnswer, ...Array.from(wrong).slice(0, 3)]);
      // אם משום מה עדיין חסר, נשלים בפולבק פשוט
      while (answers.length < 4) {
        const fallback = simplifyRatio(randInt(1, 20), randInt(1, 20));
        if (!answers.includes(fallback) && fallback !== correctAnswer) answers.push(fallback);
      }
      params.answers = answers;
    } else if (ratioSlot === "first") {
      // מציאת המספר הראשון — בוחרים k כמספר שלם כך ש-first=simplifiedA*k, second=simplifiedB*k
      // בכך היחס first:second שמור בדיוק (ללא Math.round)
      const kMax = Math.max(1, Math.floor(20 / Math.max(simplifiedA, simplifiedB)));
      const k = randInt(1, kMax);
      const firstNum = simplifiedA * k;
      const secondNum = simplifiedB * k;
      correctAnswer = firstNum;
      question = `היחס בין שני מספרים הוא ${simplifiedA}:${simplifiedB}. המספר השני הוא ${secondNum}. מה המספר הראשון?`;
      params = { kind: "ratio_first", firstNum, secondNum, simplifiedA, simplifiedB, k };
    } else {
      // מציאת המספר השני — אותו עיקרון, k מספר שלם
      const kMax = Math.max(1, Math.floor(20 / Math.max(simplifiedA, simplifiedB)));
      const k = randInt(1, kMax);
      const firstNum = simplifiedA * k;
      const secondNum = simplifiedB * k;
      correctAnswer = secondNum;
      question = `היחס בין שני מספרים הוא ${simplifiedA}:${simplifiedB}. המספר הראשון הוא ${firstNum}. מה המספר השני?`;
      params = { kind: "ratio_second", firstNum, secondNum, simplifiedA, simplifiedB, k };
    }
    
    operandA = a;
    operandB = b;

  // ===== תכונות ה-0 וה-1 (כיתה ד') =====
  } else if (selectedOp === "zero_one_properties") {
    const a = randInt(1, 100);
    const slot = Math.random();
    if (slot < 0.125) {
      correctAnswer = 0;
      question = `מה התוצאה של ${a} × 0?`;
      params = { kind: "zero_mul", a };
      operandA = a;
      operandB = 0;
    } else if (slot < 0.25) {
      correctAnswer = 0;
      question = `0 × ${a} = ${BLANK} - השלם את המספר החסר`;
      params = { kind: "zero_mul_eq", a };
      operandA = 0;
      operandB = a;
    } else if (slot < 0.375) {
      correctAnswer = 0;
      question = `חשב במילים: ${a} כפול אפס שווה אל __`;
      params = { kind: "zero_mul_word", a };
      operandA = a;
      operandB = 0;
    } else if (slot < 0.5) {
      correctAnswer = a;
      question = `מה ערך הביטוי ${a} + 0?`;
      params = { kind: "zero_add_expr", a };
      operandA = a;
      operandB = 0;
    } else if (slot < 0.625) {
      correctAnswer = a;
      question = `השלם: 0 + ${a} = ${BLANK}`;
      params = { kind: "zero_add_swap", a };
      operandA = 0;
      operandB = a;
    } else if (slot < 0.75) {
      correctAnswer = a;
      question = `${a} − 0 = ${BLANK}`;
      params = { kind: "zero_sub_line", a };
      operandA = a;
      operandB = 0;
    } else if (slot < 0.875) {
      correctAnswer = a;
      question = `מספר ${a} נשאר אותו דבר כשמכפילים אותו ב 1: ${a} × 1 = ${BLANK}`;
      params = { kind: "one_mul_identity", a };
      operandA = a;
      operandB = 1;
    } else {
      correctAnswer = a;
      question = `1 × ${a} = ${BLANK}`;
      params = { kind: "one_mul_comm", a };
      operandA = 1;
      operandB = a;
    }

  // ===== אומדן (כיתות ד'-ה') =====
  } else if (selectedOp === "estimation") {
    const maxVal = levelConfig.estimation?.max || 1000;
    const variant = Math.random();
    if (variant < 0.33) {
      // אומדן חיבור
      const a = randInt(10, maxVal);
      const b = randInt(10, maxVal);
      const exact = a + b;
      const estimate = Math.round(exact / 10) * 10; // עיגול לעשרות
      correctAnswer = estimate;
      question = `אמד את התוצאה של ${a} + ${b} (עיגול לעשרות הקרובות): ${BLANK}`;
      params = { kind: "est_add", a, b, exact, estimate };
      operandA = a;
      operandB = b;
    } else if (variant < 0.66) {
      // אומדן כפל
      const a = randInt(10, Math.min(100, maxVal));
      const b = randInt(2, 10);
      const exact = a * b;
      const estimate = Math.round(exact / 100) * 100; // עיגול למאות
      correctAnswer = estimate;
      question = `אמד את התוצאה של ${a} × ${b} (עיגול למאות הקרובות): ${BLANK}`;
      params = { kind: "est_mul", a, b, exact, estimate };
      operandA = a;
      operandB = b;
    } else {
      // אומדן כמויות
      const quantity = randInt(50, maxVal);
      const estimate = Math.round(quantity / 10) * 10;
      correctAnswer = estimate;
      question = `אמד את הכמות ${quantity} (עיגול לעשרות הקרובות): ${BLANK}`;
      params = { kind: "est_quantity", quantity, estimate };
      operandA = quantity;
      operandB = null;
    }

  // ===== קנה מידה (כיתה ו') =====
  } else if (selectedOp === "scale") {
    const scaleConfig = levelConfig.scale || {};
    const maxScale = scaleConfig.max || 100;
    let scaleSlot = "map_to_real";
    if (mathForce === "scale_map_to_real") scaleSlot = "map_to_real";
    else if (mathForce === "scale_real_to_map") scaleSlot = "real_to_map";
    else if (mathForce === "scale_find") scaleSlot = "find";
    else {
      const variant = Math.random();
      if (variant < 0.33) scaleSlot = "map_to_real";
      else if (variant < 0.66) scaleSlot = "real_to_map";
      else scaleSlot = "find";
    }

    if (scaleSlot === "map_to_real") {
      // מציאת אורך במציאות לפי מפה
      const mapLength = randInt(1, 10);
      const scale = randInt(2, Math.min(10, maxScale));
      const realLength = mapLength * scale;
      correctAnswer = realLength;
      question = `בקנה מידה 1:${scale}, אורך של ${mapLength} ס"מ במפה שווה לכמה ס"מ במציאות?`;
      params = { kind: "scale_map_to_real", mapLength, scale, realLength };
      operandA = mapLength;
      operandB = scale;
    } else if (scaleSlot === "real_to_map") {
      // מציאת אורך במפה לפי מציאות — תשובה שלמה: בוחרים mapLength ו-scale ומחשבים realLength
      const mapLength = randInt(1, 10);
      const scale = randInt(2, Math.min(10, maxScale));
      const realLength = mapLength * scale;
      correctAnswer = mapLength;
      question = `בקנה מידה 1:${scale}, אורך של ${realLength} ס"מ במציאות שווה לכמה ס"מ במפה?`;
      params = { kind: "scale_real_to_map", realLength, scale, mapLength };
      operandA = realLength;
      operandB = scale;
    } else {
      // מציאת קנה מידה — scale תמיד שלם
      const mapLength = randInt(1, 5);
      const scale = randInt(2, Math.min(10, maxScale));
      const realLength = mapLength * scale;
      correctAnswer = scale;
      question = `אורך של ${mapLength} ס"מ במפה שווה ל-${realLength} ס"מ במציאות. מה קנה המידה? כתבו בצורה 1:__`;
      params = { kind: "scale_find", mapLength, realLength, scale };
      operandA = mapLength;
      operandB = realLength;
    }
  } else {
    // ברירת מחדל - חיבור פשוט
    const maxA = levelConfig.addition.max || 20;
    const a = randInt(1, maxA);
    const b = randInt(1, maxA);
    correctAnswer = round(a + b);
    const exerciseText = `${a} + ${b} = ${BLANK}`;
    question = exerciseText;
    params = {
      kind: "add_two",
      a,
      b,
      exerciseText,
      presentationVariant: randInt(0, 3),
    };
    operandA = a;
    operandB = b;
  }

  // אם יש תשובות מוכנות ב-params (למשל עבור division_with_remainder), נשתמש בהן
  if (params?.answers && Array.isArray(params.answers) && params.answers.length >= 4) {
    question = applyMathLevelPresentation(question, {
      selectedOp,
      params,
      mathLevelKey,
      gradeKey,
    });
    const finalQuestionText =
      question && question.trim().length > 0 ? question : `תרגיל ${selectedOp}`;
    const finalExerciseText = params.exerciseText || finalQuestionText;

    return finalizeMathQuestionOutput({
      question: finalQuestionText,
      questionLabel: params.questionLabel,
      exerciseText: finalExerciseText,
      correctAnswer,
      answers: params.answers,
      operation: selectedOp,
      params,
      a: operandA,
      b: operandB,
      isStory,
    });
  }

  let allAnswers = buildMathMcqAnswerList(
    correctAnswer,
    selectedOp,
    params,
    randInt,
    round
  );
  if (!allAnswers || allAnswers.length < 4) {
    const fill = new Set();
    if (typeof correctAnswer === "number" && Number.isFinite(correctAnswer)) {
      let g = 0;
      while (fill.size < 3 && g < 40) {
        g++;
        const d = randInt(1, Math.max(2, Math.round(Math.abs(correctAnswer) * 0.1) || 1));
        fill.add(correctAnswer + d);
        fill.add(correctAnswer - d);
      }
    } else if (typeof correctAnswer === "string") {
      const base = correctAnswer.replace(/\.\.\.$/, "");
      const n = Number(base);
      if (!Number.isNaN(n)) {
        fill.add(`${(n + 0.01).toFixed(3)}...`);
        fill.add(`${(n - 0.01).toFixed(3)}...`);
        fill.add(n.toFixed(2));
      }
      fill.add(`${base}1`);
    }
    allAnswers = finalizeMcqOptions(
      correctAnswer,
      Array.from(fill).filter((x) => mcqValueKey(x) !== mcqValueKey(correctAnswer)),
      params?.kind,
      params
    );
  }

  // וודא שיש טקסט לשאלה
  question = applyMathLevelPresentation(question, {
    selectedOp,
    params,
    mathLevelKey,
    gradeKey,
  });
  const finalQuestionText =
    question && question.trim().length > 0 ? question : `תרגיל ${selectedOp}`;
  const finalExerciseText = params.exerciseText || finalQuestionText;

  return finalizeMathQuestionOutput({
    question: finalQuestionText,
    questionLabel: params.questionLabel,
    exerciseText: finalExerciseText,
    correctAnswer,
    answers: allAnswers,
    operation: selectedOp,
    params,
    a: operandA,
    b: operandB,
    isStory,
  });
}

