/**
 * Grade-aware parent recommendation templates (Phase 1–4 math/geometry/Hebrew/English; Phase 5-B1/B2 Science; Phase 5-C1/C3 moledet-geography MG-01–MG-08 bucketOverrides).
 * Slot-specific Hebrew is editorially approved; do not change without sign-off.
 */

/** @typedef {{ actionTextHe: string | null; goalTextHe: string | null; intentDescriptionEn: string }} GradeAwareBandCopy */

/** @typedef {{ g1_g2: GradeAwareBandCopy; g3_g4: GradeAwareBandCopy; g5_g6: GradeAwareBandCopy }} GradeAwareTaxonomyTemplate */

/**
 * Math and geometry extended entries: `defaultBands` + optional `bucketOverrides` - M-01 (compare, number_sense, estimation); M-03 (multiplication, factors_multiples, powers); M-10 (division, division_with_remainder, ratio, multiplication); M-07 (word_problems); M-08 (word_problems, sequences, equations, order_of_operations); geometry G-01/G-02/G-03/G-04/G-05/G-06/G-07/G-08 (see bucketOverrides).
 * Legacy flat taxonomies remain a flat {@link GradeAwareTaxonomyTemplate}.
 * @typedef {{
 *   defaultBands: GradeAwareTaxonomyTemplate;
 *   bucketOverrides?: Partial<Record<string, GradeAwareTaxonomyTemplate>>;
 * }} GradeAwareMathM01Template
 */

/**
 * @type {Record<string, Record<string, GradeAwareTaxonomyTemplate | GradeAwareMathM01Template>>}
 */
export const GRADE_AWARE_RECOMMENDATION_TEMPLATES = {
  math: {
    "M-09": {
      g1_g2: {
        actionTextHe:
          "כדאי לתרגל חיסור במספרים קטנים בעזרת חפצים, ציור או קו מספרים קצר, ואז לכתוב את אותו רעיון גם כתרגיל מספרי.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיסור במספרים קטנים, עם מעבר הדרגתי מעזרים מוחשיים לכתיבה מספרית.",
        intentDescriptionEn:
          "Early subtraction with concrete objects, drawing, or a short number line, then connecting to symbolic notation.",
      },
      g3_g4: {
        actionTextHe:
          "כדאי לתרגל חיסור במאונך עם פריטה, תוך הקפדה על ערך הספרות בכל עמודה. אחרי כל תרגיל בקשו מהילד לבדוק את התשובה בעזרת חיבור הפוך.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיסור רב ספרתי במאונך, בפריטה נכונה ובבדיקת התשובה בעזרת חיבור הפוך.",
        intentDescriptionEn:
          "Multi-digit vertical subtraction with regrouping, place-value attention, and inverse addition check.",
      },
      g5_g6: {
        actionTextHe:
          "כדאי לתרגל חיסור במספרים גדולים או בהקשר רב שלבי, עם אומדן לפני הפתרון ובדיקת סבירות בסיום. בקשו מהילד להסביר את דרך החישוב ולא רק לכתוב תשובה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיסור כחלק מפתרון בעיות, כולל אומדן, בדיקת סבירות והסבר קצר של דרך הפתרון.",
        intentDescriptionEn:
          "Upper-grade subtraction with larger numbers or multi-step contexts, estimation before solving, reasonableness check, and explanation of strategy.",
      },
    },
    "M-02": {
      g1_g2: {
        actionTextHe:
          "כדאי לתרגל חיבור במספרים קטנים בעזרת חפצים, ציור או מסגרת עשר, ואז לכתוב את אותו רעיון גם כתרגיל מספרי.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיבור במספרים קטנים, עם מעבר הדרגתי מעזרים מוחשיים לכתיבה מספרית.",
        intentDescriptionEn:
          "Early addition with concrete objects, drawing, or ten-frame support, then connecting to symbolic notation.",
      },
      g3_g4: {
        actionTextHe:
          "כדאי לתרגל חיבור במאונך עם נשיאה, תוך הקפדה על ערך הספרות בכל עמודה. אחרי כל תרגיל בקשו מהילד להסביר היכן הייתה נשיאה ולבדוק אם התשובה הגיונית.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיבור רב ספרתי במאונך, בנשיאה נכונה ובבדיקת הסבירות של התשובה.",
        intentDescriptionEn:
          "Multi-digit vertical addition with carrying, place-value attention, and reasonableness check.",
      },
      g5_g6: {
        actionTextHe:
          "כדאי לתרגל חיבור במספרים גדולים או בהקשר רב שלבי, עם אומדן לפני הפתרון ובדיקת סבירות בסיום. בקשו מהילד להסביר את דרך החישוב ולא רק לכתוב תשובה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיבור כחלק מפתרון בעיות, כולל אומדן, בדיקת סבירות והסבר קצר של דרך הפתרון.",
        intentDescriptionEn:
          "Upper-grade addition with larger numbers or multi-step contexts, estimation before solving, reasonableness check, and explanation of strategy.",
      },
    },
    "M-06": {
      g1_g2: {
        actionTextHe:
          "כדאי לתרגל אומדן ועיגול במספרים שלמים קטנים, בעזרת קו מספרים או סימון העשרת הקרובה. בכל תרגיל בקשו מהילד להסביר אם המספר קרוב יותר למספר הקטן או הגדול.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בהבנה של קירוב מספרים: לאן המספר קרוב יותר, ולמה.",
        intentDescriptionEn:
          "Early estimation and simple rounding with whole numbers, using number-line distance and nearest ten reasoning.",
      },
      g3_g4: {
        actionTextHe:
          "כדאי לתרגל עיגול והשוואת מספרים לפי ערך הספרות, במיוחד עשרות, מאות ואלפים. לפני החישוב בקשו מהילד לומר לאיזה מספר התשובה בערך צריכה להיות קרובה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בעיגול לפי ערך מקום ובבדיקת סבירות של תשובות במספרים שלמים.",
        intentDescriptionEn:
          "Rounding and comparing whole numbers by place value, with estimation before calculating and reasonableness checks.",
      },
      g5_g6: {
        actionTextHe:
          "כדאי לתרגל עיגול והשוואה במספרים עשרוניים, אחוזים או תרגילים עם אומדן. בקשו מהילד להסביר לפי איזו ספרה הוא מעגל, ואז לבדוק אם התוצאה הסופית סבירה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בעיגול, השוואה ואומדן במספרים עשרוניים או באחוזים, עם בדיקת סבירות בסיום.",
        intentDescriptionEn:
          "Upper-grade rounding, comparison, and estimation with decimals or percentages, including place-value explanation and final reasonableness check.",
      },
    },
    "M-04": {
      g1_g2: {
        actionTextHe: null,
        goalTextHe: null,
        intentDescriptionEn:
          "Do not provide formal fraction comparison recommendations for grades 1–2 unless product evidence explicitly supports it.",
      },
      g3_g4: {
        actionTextHe:
          "כדאי לתרגל השוואת שברים בעזרת ציור מדויק או סרגל שברים, ואז להסביר מה מייצג המונה ומה מייצג המכנה. בשברים בעלי אותו מכנה, בקשו מהילד להסביר מדוע משווים לפי מספר החלקים שנלקחו.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בהשוואת שברים ובהבנת תפקיד המונה והמכנה, במיוחד בשברים בעלי אותו מכנה או בייצוגים פשוטים וברורים.",
        intentDescriptionEn:
          "Grade 3–4 fraction comparison through visual representation, numerator/denominator meaning, and same-denominator comparison reasoning.",
      },
      g5_g6: {
        actionTextHe:
          "כדאי לתרגל השוואת שברים בעזרת שברים שקולים, מכנה משותף או אומדן ביחס אל 0, חצי ו 1. בקשו מהילד להסביר מדוע שבר אחד גדול מאחר, ולא להסתמך רק על גודל המונה או המכנה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בהשוואת שברים בעזרת שברים שקולים, מכנה משותף ואומדן, עם נימוק ברור לכל השוואה.",
        intentDescriptionEn:
          "Grade 5–6 fraction comparison using equivalent fractions, common denominators, benchmark fractions, and explicit reasoning.",
      },
    },
    "M-05": {
      g1_g2: {
        actionTextHe: null,
        goalTextHe: null,
        intentDescriptionEn:
          "Do not provide formal fraction operation recommendations for grades 1–2 unless product evidence explicitly supports it.",
      },
      g3_g4: {
        actionTextHe:
          "כדאי לתרגל חיבור וחיסור שברים בעלי אותו מכנה. בקשו מהילד להסביר שהמכנה מתאר את גודל החלקים, ולכן מחברים או מחסרים את המונים ובודקים שהתוצאה מתאימה לשלם.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בחיבור וחיסור שברים בעלי אותו מכנה, תוך שמירה על משמעות המכנה ובדיקת סבירות התוצאה.",
        intentDescriptionEn:
          "Grade 3–4 fraction addition/subtraction with same denominators, focusing on denominator meaning, numerator operation, and reasonableness.",
      },
      g5_g6: {
        actionTextHe:
          "כדאי לתרגל חיבור וחיסור שברים עם מכנים שונים בעזרת מציאת מכנה משותף, יצירת שברים שקולים ובדיקת התוצאה לאחר הפעולה. בקשו מהילד להסביר כל שלב לפני שהוא מפשט את התשובה.",
        goalTextHe:
          "בשבוע הקרוב התמקדו בפעולות חיבור וחיסור בשברים עם מכנים שונים: מכנה משותף, שברים שקולים, ביצוע הפעולה ובדיקת סבירות.",
        intentDescriptionEn:
          "Grade 5–6 fraction addition/subtraction with unlike denominators, using common denominators, equivalent fractions, step explanation, and reasonableness checks.",
      },
    },
    "M-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-03 default: no approved parent copy; use bucketOverrides (multiplication, factors_multiples, powers) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-03 default: no approved parent copy; use bucketOverrides (multiplication, factors_multiples, powers) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-03 default: no approved parent copy; use bucketOverrides (multiplication, factors_multiples, powers) or engine fallback.",
        },
      },
      bucketOverrides: {
        multiplication: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal multiplication recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל כפל דרך קבוצות שוות, מערכים ופירוק תרגילים לעובדות מוכרות. בקשו מהילד להסביר איזו עובדת כפל הוא מזהה ואיך היא עוזרת לו לפתור את התרגיל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחיזוק עובדות כפל ובהבנת כפל כקבוצות שוות או מערך, עם הסבר קצר של דרך הפתרון.",
            intentDescriptionEn:
              "Grade 3–4 multiplication through equal groups, arrays, known facts, and explaining the chosen strategy.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל כפל במספרים גדולים יותר בעזרת פירוק מספרים, אומדן ובדיקת סבירות. בקשו מהילד להסביר את שלבי החישוב ולבדוק אם התוצאה מתאימה לגודל המספרים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בכפל עם פירוק מספרים, אומדן ובדיקת סבירות של התוצאה.",
            intentDescriptionEn:
              "Grade 5–6 multiplication with decomposition, estimation, multi-step calculation, and reasonableness checks.",
          },
        },
        factors_multiples: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Do not provide formal factors/multiples recommendations for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל כפולות וגורמים דרך סדרות כפל, לוחות כפל וחיפוש דפוסים. בקשו מהילד להסביר מדוע מספר מסוים הוא כפולה או גורם, ולא רק לסמן תשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי כפולות וגורמים בעזרת דפוסי כפל והסבר מילולי.",
            intentDescriptionEn:
              "Grade 3–4 factors and multiples through multiplication patterns, times tables, and verbal explanation.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל גורמים וכפולות בהקשרים רחבים יותר, כמו פירוק מספר לגורמים, מציאת כפולות משותפות ובדיקת קשרים בין מספרים. בקשו מהילד לנמק את הבחירה שלו לפי תכונות המספרים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בגורמים, כפולות וקשרים בין מספרים, כולל נימוק לפי תכונות המספר.",
            intentDescriptionEn:
              "Grade 5–6 factors and multiples using factorization, common multiples, number properties, and explicit justification.",
          },
        },
        powers: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Do not provide powers/exponents recommendations for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep powers/exponents null for grades 3–4 unless product evidence explicitly supports formal exponent work.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חזקות כהכפלה חוזרת, למשל להבין ש 3 בחזקת 4 פירושו 3 כפול עצמו ארבע פעמים. בקשו מהילד לפרק את החזקה לכפל ולבדוק את סדר הפעולות בתרגיל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת חזקות כהכפלה חוזרת ובשימוש נכון בהן בתוך תרגילים.",
            intentDescriptionEn:
              "Grade 5–6 powers as repeated multiplication, unpacking exponent notation and applying order of operations.",
          },
        },
      },
    },
    "M-10": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-10 default: no approved parent copy; use bucketOverrides (multiplication, division, division_with_remainder, ratio) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-10 default: no approved parent copy; use bucketOverrides (multiplication, division, division_with_remainder, ratio) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-10 default: no approved parent copy; use bucketOverrides (multiplication, division, division_with_remainder, ratio) or engine fallback.",
        },
      },
      bucketOverrides: {
        multiplication: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide inverse multiplication/division recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל את הקשר בין כפל לחילוק בעזרת משפחות תרגילים. אחרי פתרון תרגיל, בקשו מהילד לכתוב תרגיל הפוך ולבדוק אם הוא מחזיר לאותו מספר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשר בין כפל לחילוק ובבדיקת תשובות בעזרת פעולה הפוכה.",
            intentDescriptionEn:
              "Grade 3–4 inverse relationship between multiplication and division using fact families and inverse checks.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל בחירה בין כפל לחילוק בבעיות שבהן יש יחס או קשר כפלי בין כמויות. בקשו מהילד להסביר מדוע הפעולה שבחר מתאימה, ולבדוק את התשובה בעזרת הפעולה ההפוכה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מתי מתאים להשתמש בכפל ומתי בחילוק, במיוחד בקשרים כפליים ובבדיקה בעזרת פעולה הפוכה.",
            intentDescriptionEn:
              "Grade 5–6 choosing multiplication vs division in multiplicative relationships, explaining operation choice, and checking with inverse operation.",
          },
        },
        division: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal division recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל חילוק דרך חלוקה שווה וקבוצות שוות. בקשו מהילד להסביר מה מייצג כל מספר בתרגיל, ואז לבדוק את התשובה בעזרת כפל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחילוק כחלוקה שווה או לקבוצות שוות, ובבדיקת התשובה בעזרת כפל.",
            intentDescriptionEn:
              "Grade 3–4 division as equal sharing or equal groups, with multiplication as an inverse check.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חילוק במספרים גדולים יותר או בתוך בעיות מילוליות, עם אומדן לפני הפתרון ובדיקת התשובה בעזרת כפל. בקשו מהילד להסביר מהי הכמות שמחלקים, לכמה חלקים מחלקים, ומה משמעות המנה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחילוק עם אומדן, פירוש משמעות המנה ובדיקת התשובה בעזרת כפל.",
            intentDescriptionEn:
              "Grade 5–6 division with larger numbers or word problems, estimation, quotient meaning, and multiplication check.",
          },
        },
        division_with_remainder: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Do not provide division-with-remainder recommendations for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל חילוק עם שארית בעזרת סיפור קצר או ציור של קבוצות שוות. בקשו מהילד להסביר מה חולק באופן שווה ומה נשאר כשארית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת שארית: מה מתחלק לקבוצות שוות ומה נשאר מחוץ לקבוצות.",
            intentDescriptionEn:
              "Grade 3–4 division with remainder using equal groups and explaining what is shared and what remains.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חילוק עם שארית בתוך בעיות מילוליות, ולבדוק מה משמעות השארית לפי ההקשר. בקשו מהילד להחליט אם צריך להשאיר שארית, לעגל, או לפרש אותה כחלק מהתשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בפירוש השארית לפי ההקשר ובבדיקת התאמת התשובה לבעיה.",
            intentDescriptionEn:
              "Grade 5–6 division with remainder in context, interpreting whether to keep, round, or explain the remainder.",
          },
        },
        ratio: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Do not provide ratio recommendations for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep ratio null for grades 3–4 unless product evidence explicitly supports ratio/proportion work.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל יחס דרך השוואה בין שתי כמויות ושמירה על אותו קשר כפלי. בקשו מהילד להסביר מה משווים, מה נשאר קבוע ביחס, ואיך אפשר לבדוק שהתשובה שומרת על אותו קשר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת יחס כקשר בין שתי כמויות ובבדיקה שהקשר נשמר לאורך הפתרון.",
            intentDescriptionEn:
              "Grade 5–6 ratio as a multiplicative relationship between two quantities, preserving the relationship and checking consistency.",
          },
        },
      },
    },
    "M-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-07 default: no approved parent copy; use bucketOverrides (word_problems) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-07 default: no approved parent copy; use bucketOverrides (word_problems) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-07 default: no approved parent copy; use bucketOverrides (word_problems) or engine fallback.",
        },
      },
      bucketOverrides: {
        word_problems: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal word-problem unit recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל בעיות מילוליות שבהן צריך לכתוב תשובה מלאה עם יחידה מתאימה. לפני הפתרון בקשו מהילד לסמן מה בדיוק שואלים, ובסיום לבדוק שהמספר והיחידה בתשובה מתאימים לשאלה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מה נשאל בבעיה מילולית ובכתיבת תשובה מלאה עם יחידה מתאימה.",
            intentDescriptionEn:
              "Grade 3–4 word-problem answer labeling: identify what is asked, solve, and write a complete answer with the correct unit.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל בעיות מילוליות שבהן מופיעות כמה כמויות או יחידות. לפני החישוב בקשו מהילד להגדיר מה מייצג כל מספר ובאיזו יחידה צריכה להיכתב התשובה, ואז לבדוק שהפתרון מתאים להקשר של הבעיה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמת התשובה להקשר הבעיה: מה מייצג כל מספר, מהי היחידה הנכונה, והאם התשובה הסופית עונה בדיוק על מה שנשאל.",
            intentDescriptionEn:
              "Grade 5–6 word-problem unit/context alignment: track quantities, units, and whether the final answer matches the question.",
          },
        },
      },
    },
    "M-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-08 default: no approved parent copy; use bucketOverrides (word_problems, sequences, equations, order_of_operations) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-08 default: no approved parent copy; use bucketOverrides (word_problems, sequences, equations, order_of_operations) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-08 default: no approved parent copy; use bucketOverrides (word_problems, sequences, equations, order_of_operations) or engine fallback.",
        },
      },
      bucketOverrides: {
        word_problems: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal multi-step word-problem recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל בעיות מילוליות בשלב אחד או שניים בעזרת תכנון קצר לפני החישוב. בקשו מהילד לכתוב מה ידוע, מה צריך למצוא, איזו פעולה מתאימה לכל שלב, ורק אז לפתור.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתכנון פתרון לבעיה מילולית: מה ידוע, מה מחפשים, ואיזו פעולה מתאימה לכל שלב.",
            intentDescriptionEn:
              "Grade 3–4 word-problem planning: identify known information, target question, and operation choice for one- or two-step problems.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל בעיות מילוליות רב שלביות בעזרת טבלה, תרשים או משוואה פשוטה. בקשו מהילד להסביר את סדר השלבים, מדוע בחר בכל פעולה, ולבדוק בסיום אם התשובה סבירה ביחס לנתוני הבעיה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בפתרון בעיות רב שלביות: תכנון דרך, בחירת פעולות, הסבר סדר השלבים ובדיקת סבירות התשובה.",
            intentDescriptionEn:
              "Grade 5–6 multi-step word-problem modeling with tables, diagrams, simple equations, operation choice, and reasonableness checks.",
          },
        },
        sequences: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal sequence recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל סדרות מספרים על ידי זיהוי החוקיות בין איברים סמוכים. בקשו מהילד להסביר במילים מה משתנה בכל צעד, ואז להשתמש בכלל שמצא כדי להשלים את האיבר הבא.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי חוקיות בסדרות ובהסבר מילולי של הכלל שמוביל מאיבר לאיבר.",
            intentDescriptionEn:
              "Grade 3–4 sequences through identifying the change between neighboring terms and explaining the rule.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל סדרות שבהן צריך לנסח כלל ברור, לבדוק אותו על כמה איברים, ולהשתמש בו כדי למצוא איבר חסר או איבר בהמשך הסדרה. בקשו מהילד להסביר האם הכלל קבוע ולמה הוא מתאים לכל הסדרה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בניסוח כלל לסדרה, בדיקתו על כמה איברים ושימוש בו למציאת איברים חסרים או מתקדמים.",
            intentDescriptionEn:
              "Grade 5–6 sequence reasoning: formulate and test a rule, then use it to find missing or later terms.",
          },
        },
        equations: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Do not provide formal equation recommendations for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל תרגילי נעלם פשוטים בעזרת פעולה הפוכה. בקשו מהילד להסביר מה חסר בתרגיל, איזו פעולה תעזור למצוא אותו, ואז להציב את התשובה בחזרה כדי לבדוק.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתרגילי נעלם פשוטים, שימוש בפעולה הפוכה ובדיקת התשובה בתוך התרגיל המקורי.",
            intentDescriptionEn:
              "Grade 3–4 simple missing-number equations using inverse operations and substitution check.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל משוואות פשוטות על ידי שמירה על שוויון בין שני האגפים. בקשו מהילד להסביר איזו פעולה הוא מבצע על שני הצדדים, ולבדוק את הפתרון באמצעות הצבה במשוואה המקורית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בפתרון משוואות פשוטות: שמירה על שוויון, ביצוע פעולות על שני האגפים ובדיקת הפתרון בהצבה.",
            intentDescriptionEn:
              "Grade 5–6 simple equation solving by preserving equality, applying operations to both sides, and checking by substitution.",
          },
        },
        order_of_operations: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Do not provide order-of-operations recommendations for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל סדר פעולות בתרגילים קצרים, במיוחד כאשר מופיעים סוגריים או שילוב של פעולות. בקשו מהילד לסמן מה פותרים קודם, להסביר למה, ואז לחשב שלב אחר שלב.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בסדר פעולות בתרגילים קצרים: זיהוי מה פותרים קודם וחישוב מסודר שלב אחר שלב.",
            intentDescriptionEn:
              "Grade 3–4 order of operations in short expressions, especially parentheses and mixed operations, with step-by-step reasoning.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל תרגילים עם כמה פעולות, סוגריים ולעיתים גם חזקות, תוך כתיבת שלבי פתרון מסודרים. בקשו מהילד להצדיק את סדר הפעולות ולבדוק שהתוצאה לא השתנתה בגלל דילוג על שלב.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בסדר פעולות בתרגילים מורכבים יותר, כולל כתיבת שלבים, הצדקת הסדר ובדיקת התוצאה.",
            intentDescriptionEn:
              "Grade 5–6 order of operations in more complex expressions, including parentheses and sometimes powers, with written steps and justification.",
          },
        },
      },
    },
    "M-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-01 default parent copy not approved yet; use bucketOverrides (compare, number_sense, estimation) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-01 default parent copy not approved yet; use bucketOverrides (compare, number_sense, estimation) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "M-01 default parent copy not approved yet; use bucketOverrides (compare, number_sense, estimation) or engine fallback.",
        },
      },
      bucketOverrides: {
        compare: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל השוואת מספרים קטנים בעזרת חפצים, ציור או טבלת עשרות ואחדות. בכל פעם בקשו מהילד להסביר איזה מספר גדול יותר ולמה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת מספרים קטנים ובהסבר פשוט של גדול, קטן ושווה.",
            intentDescriptionEn:
              "Early number comparison with concrete supports, tens/ones representation, and simple greater-than/less-than reasoning.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל השוואת מספרים רב ספרתיים לפי ערך הספרות. בקשו מהילד להתחיל מהספרה בעלת הערך הגבוה ביותר ולהסביר באיזו עמודה נקבע ההבדל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת מספרים לפי ערך מקום, מהספרה הגדולה ביותר ועד העמודה שבה מופיע ההבדל.",
            intentDescriptionEn:
              "Multi-digit comparison by place value, starting from the highest place and identifying the first differing place.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואת מספרים גדולים או ייצוגים מספריים שונים בעזרת ערך מקום ואומדן. בקשו מהילד להסביר מה הופך מספר אחד לגדול או קטן יותר, ולא להסתמך רק על ספירת ספרות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואה מדויקת של מספרים גדולים או ייצוגים שונים, עם נימוק לפי ערך מקום ואומדן.",
            intentDescriptionEn:
              "Upper-grade comparison of larger numbers or different numeric representations using place value, estimation, and explicit reasoning.",
          },
        },
        number_sense: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל בניית מספרים ופירוקם בעזרת חפצים, ציור או עשרות ואחדות. בקשו מהילד להראות למשל שמספר יכול להיות מורכב מעשרת ועוד אחדות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מבנה המספר: עשרות, אחדות ופירוק מספרים קטנים לחלקים.",
            intentDescriptionEn:
              "Early number sense through composing and decomposing numbers with objects, drawings, tens, and ones.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל פירוק מספרים לפי ערך מקום: אחדות, עשרות, מאות ואלפים. בקשו מהילד לכתוב את המספר גם בצורה רגילה וגם כפירוק לפי הערך של כל ספרה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בערך מקום ובפירוק מספרים רב ספרתיים לפי הספרות שלהם.",
            intentDescriptionEn:
              "Multi-digit number sense through place-value decomposition across ones, tens, hundreds, and thousands.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מעבר בין ייצוגים של אותו מספר, כמו כתיבה רגילה, פירוק לפי ערך מקום ואומדן גודל. בקשו מהילד להסביר איך כל ייצוג מתאר את אותו מספר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשר בין ייצוגים שונים של מספרים ובבדיקת משמעות כל ספרה בתוך המספר.",
            intentDescriptionEn:
              "Upper-grade number sense through translating between standard notation, place-value decomposition, and magnitude reasoning.",
          },
        },
        estimation: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל אומדן בכמויות ובמספרים קטנים: לפני הספירה או החישוב בקשו מהילד לומר בערך כמה יש, ואז לבדוק יחד אם ההשערה הייתה קרובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באומדן פשוט: האם המספר או התשובה נראים בערך מתאימים.",
            intentDescriptionEn:
              "Early estimation with small quantities and numbers, making an approximate guess before counting or calculating and checking closeness.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל אומדן לפני חישוב במספרים רב ספרתיים. בקשו מהילד לעגל את המספרים בקירוב, לשער מה גודל התשובה, ואז לבדוק אם החישוב הסופי סביר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באומדן לפני חישוב ובבדיקת סבירות של תשובות במספרים רב ספרתיים.",
            intentDescriptionEn:
              "Multi-digit estimation before calculation, using rounded numbers to predict approximate answer size and check reasonableness.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל אומדן בתרגילים מורכבים יותר, כולל מספרים גדולים, שברים פשוטים, עשרוניים או אחוזים. לפני הפתרון בקשו מהילד לשער את גודל התשובה ולבדוק בסוף אם היא הגיונית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באומדן ובבדיקת סבירות בתרגילים מורכבים, לפני הפתרון ולאחריו.",
            intentDescriptionEn:
              "Upper-grade estimation across larger numbers and more complex contexts, including simple fractions, decimals, or percentages, with before-and-after reasonableness checks.",
          },
        },
        scale: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep scale/magnitude recommendations null for grades 1–2 until early-number copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הבנת גודל מספרים בעזרת השוואה לכמויות מוכרות: עשרות, מאות או אלפים. בקשו מהילד להסביר האם מספר נראה קטן, בינוני או גדול יחסית לדוגמה שמכירים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהערכת גודל מספרים רב ספרתיים ובהשוואה לכמויות מוכרות מהחיים.",
            intentDescriptionEn:
              "Grade 3–4 number magnitude through comparison to familiar quantities (tens, hundreds, thousands).",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל קריאת מספרים גדולים, עשרוניים או אחוזים תוך שימת לב לסדר הגודל. בקשו מהילד לומר בערך כמה גדול המספר, ולבדוק אם התשובה הסופית מתאימה לסדר גודל זה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת סדר גודל, בקריאה נכונה של מספרים גדולים ובבדיקת סבירות התוצאה.",
            intentDescriptionEn:
              "Grade 5–6 order-of-magnitude reasoning with large numbers, decimals, or percentages and answer-size checks.",
          },
        },
        prime_composite: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep prime/composite recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי מספרים ראשוניים ופריקים במספרים קטנים: לבדוק אם למספר יש בדיוק שני גורמים (1 והמספר עצמו) או יותר. בקשו מהילד להסביר איך יודעים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין מספר ראשוני לפריק במספרים קטנים, עם הסבר לפי גורמים.",
            intentDescriptionEn:
              "Grade 3–4 prime vs composite in a small range using factor-count reasoning.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל פירוק לגורמים ראשוניים וזיהוי מספרים ראשוניים במספרים גדולים יותר. בקשו מהילד לכתוב את הפירוק ולהסביר למה מספר הוא ראשוני או פריק.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בפירוק לגורמים ראשוניים ובהסבר מדוע מספר הוא ראשוני או פריק.",
            intentDescriptionEn:
              "Grade 5–6 prime factorization and prime/composite classification with written justification.",
          },
        },
        zero_one_properties: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep zero/one properties recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מה קורה כשמחברים, מחסירים, מכפילים או מחלקים ב-0 או ב-1. בקשו מהילד לומר את הכלל בכל פעם: \"כפל ב-1 לא משנה\", \"חיבור עם 0 לא משנה\", \"אי אפשר לחלק ב-0\".",
            goalTextHe:
              "בשבוע הקרוב התמקדו בכללי 0 ו-1 בפעולות בסיסיות ובהסבר מילולי של כל כלל.",
            intentDescriptionEn:
              "Grade 3–4 special properties of 0 and 1 in basic operations with verbal rules.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל תכונות מיוחדות של 0 ו-1 גם בהקשרים מורכבים יותר, כמו שברים, עשרוניים או ביטויים ארוכים. בקשו מהילד לזהות מתי 0 או 1 משנים את התוצאה ומתי לא.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי השפעת 0 ו-1 על תוצאות בתרגילים מורכבים יותר.",
            intentDescriptionEn:
              "Grade 5–6 zero/one identity and annihilator properties in richer numeric contexts.",
          },
        },
      },
    },
  },
  geometry: {
    "G-02": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-02 default: no approved parent copy; use bucketOverrides (angles, circles) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-02 default: no approved parent copy; use bucketOverrides (angles, circles) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-02 default: no approved parent copy; use bucketOverrides (angles, circles) or engine fallback.",
        },
      },
      bucketOverrides: {
        angles: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal angle recommendations null for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי והשוואת זוויות בעזרת ציור ברור או פינה ישרה. בקשו מהילד להסביר אם הזווית קטנה, שווה או גדולה מזווית ישרה, ולסמן את הזווית שעליה הוא מסתכל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי זוויות ובהשוואה שלהן לזווית ישרה, תוך סימון ברור של הזווית בציור.",
            intentDescriptionEn:
              "Grade 3–4 angle recognition and comparison using a clear drawing and right-angle benchmark.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מדידה והערכת גודל של זוויות, כולל שימוש נכון במד זווית כאשר הוא נדרש. בקשו מהילד להסביר מאיפה מתחילים למדוד, איזה קו הוא קו הבסיס, והאם התוצאה הגיונית לפי סוג הזווית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במדידת זוויות, באומדן גודל הזווית ובבדיקת סבירות המדידה לפי סוג הזווית.",
            intentDescriptionEn:
              "Grade 5–6 angle measurement and estimation, including correct protractor use and reasonableness checks.",
          },
        },
        circles: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep circle recommendations null for grades 1–2 unless product evidence explicitly supports circle properties.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי חלקי המעגל בעזרת ציור ברור: מרכז, רדיוס וקוטר. בקשו מהילד לסמן כל חלק בציור ולהסביר מה הקשר שלו למעגל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מרכז, רדיוס וקוטר במעגל ובהסבר התפקיד של כל חלק בציור.",
            intentDescriptionEn:
              "Grade 3–4 circle parts: center, radius, diameter, and explaining their role in a clear diagram.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל קשרים בין רדיוס, קוטר ומדידות במעגל. בקשו מהילד לסמן את הנתונים בציור, להסביר איזה גודל חסר, ולבדוק שהתשובה מתאימה לקשר בין רדיוס לקוטר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשרים בין רדיוס, קוטר ומדידות במעגל, עם סימון נתונים ובדיקת סבירות.",
            intentDescriptionEn:
              "Grade 5–6 circle relationships involving radius, diameter, measurements, diagram marking, and reasonableness checks.",
          },
        },
      },
    },
    "G-04": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-04 default: no approved parent copy; use bucketOverrides (transformations, rotation) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-04 default: no approved parent copy; use bucketOverrides (transformations, rotation) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-04 default: no approved parent copy; use bucketOverrides (transformations, rotation) or engine fallback.",
        },
      },
      bucketOverrides: {
        transformations: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל הזזה, שיקוף או סיבוב של צורה בעזרת חפץ, ציור או משבצות. בקשו מהילד לבדוק שהצורה עצמה לא השתנתה, אלא רק המקום או הכיוון שלה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי שינוי מקום או כיוון של צורה, בלי לשנות את הצורה עצמה.",
            intentDescriptionEn:
              "Grade 1–2 concrete transformations: slide, flip, or turn a shape while preserving the shape.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הזזה, שיקוף וסיבוב על רשת משבצות. בקשו מהילד לתאר מה קרה לצורה: לאן זזה, סביב מה הסתובבה, או ביחס לאיזה קו השתקפה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתיאור טרנספורמציות של צורות על רשת: הזזה, שיקוף וסיבוב.",
            intentDescriptionEn:
              "Grade 3–4 transformations on a grid: translation, reflection, rotation, and describing what changed.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל תיאור מדויק של טרנספורמציות, כולל כיוון, מרחק, קו שיקוף או מרכז סיבוב. בקשו מהילד להשוות בין הצורה המקורית לתמונה שלה ולנמק מה נשמר ומה השתנה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתיאור מדויק של טרנספורמציות ובהשוואה בין הצורה המקורית לתמונה שלה.",
            intentDescriptionEn:
              "Grade 5–6 precise transformation descriptions including direction, distance, reflection line, rotation center, and invariants.",
          },
        },
        rotation: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל סיבוב של צורה בעזרת חפץ או ציור. בקשו מהילד להראות איך הצורה נראית אחרי סיבוב קטן או חצי סיבוב, ולבדוק שהצורה עצמה נשארה אותה צורה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי צורה לפני ואחרי סיבוב, תוך שמירה על אותה צורה.",
            intentDescriptionEn:
              "Grade 1–2 concrete rotation using objects or drawings, recognizing the same shape after turning.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל סיבוב של צורה סביב נקודה, למשל רבע סיבוב או חצי סיבוב. בקשו מהילד לסמן את נקודת הסיבוב ולתאר לאיזה כיוון הצורה הסתובבה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בסיבוב צורות סביב נקודה ובתיאור כיוון וגודל הסיבוב.",
            intentDescriptionEn:
              "Grade 3–4 rotation around a point, including quarter-turn/half-turn language and direction.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל סיבובים מדויקים יותר בעזרת מרכז סיבוב, כיוון וזווית סיבוב. בקשו מהילד לבדוק שכל נקודה בתמונה נמצאת במרחק מתאים ממרכז הסיבוב.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בסיבוב מדויק של צורות לפי מרכז, כיוון וזווית.",
            intentDescriptionEn:
              "Grade 5–6 precise rotation using center, direction, angle, and point-image consistency.",
          },
        },
      },
    },
    "G-05": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-05 default: no approved parent copy; use bucketOverrides (solids, volume) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-05 default: no approved parent copy; use bucketOverrides (solids, volume) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-05 default: no approved parent copy; use bucketOverrides (solids, volume) or engine fallback.",
        },
      },
      bucketOverrides: {
        solids: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל זיהוי גופים בעזרת חפצים מהבית, כמו קובייה, תיבה, גליל או כדור. בקשו מהילד לתאר מה רואים: פאות, קצוות, צורה עגולה או צורה שטוחה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי גופים ובהבחנה בין צורות שטוחות לגופים במרחב.",
            intentDescriptionEn:
              "Grade 1–2 solid recognition using everyday objects and simple spatial language.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי גופים ותיאור התכונות שלהם: פאות, קודקודים, מקצועות וצורת הפאות. בקשו מהילד להסביר לפי אילו סימנים הוא מזהה את הגוף.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתיאור גופים לפי פאות, קודקודים, מקצועות וצורת הפאות.",
            intentDescriptionEn:
              "Grade 3–4 solid properties: faces, vertices, edges, face shapes, and justification of identification.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל קשר בין גוף, פריסה ומידות. בקשו מהילד לזהות אילו פאות מרכיבות את הגוף, איך הן מתחברות, ואיך הנתונים בציור קשורים למבנה התלת ממדי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשר בין גוף, פריסה ומידות, ובהבנת המבנה התלת ממדי מתוך ציור או נתונים.",
            intentDescriptionEn:
              "Grade 5–6 solids, nets, measurements, and connecting 2D representations to 3D structure.",
          },
        },
        volume: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal volume recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal volume recommendations null for grades 3–4 unless product evidence explicitly supports volume at this level.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל נפח של תיבה או גוף פשוט בעזרת פירוק למידות: אורך, רוחב וגובה. בקשו מהילד להסביר מה מייצגת כל מידה, לבחור יחידות מתאימות, ולבדוק שהתשובה היא ביחידות נפח.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחישוב נפח בעזרת אורך, רוחב וגובה, עם הקפדה על יחידות נפח ובדיקת סבירות.",
            intentDescriptionEn:
              "Grade 5–6 volume of simple solids using length, width, height, units, and reasonableness checks.",
          },
        },
      },
    },
    "G-06": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-06 default: no approved parent copy; use bucketOverrides (perimeter) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-06 default: no approved parent copy; use bucketOverrides (perimeter) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-06 default: no approved parent copy; use bucketOverrides (perimeter) or engine fallback.",
        },
      },
      bucketOverrides: {
        perimeter: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal perimeter recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל היקף על ידי סימון כל צלע בציור וחיבור אורכי הצלעות. בקשו מהילד לוודא שלא דילג על צלע, שלא ספר צלע פעמיים, ושכתב יחידת אורך מתאימה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחישוב היקף על ידי חיבור כל הצלעות ושמירה על יחידות אורך.",
            intentDescriptionEn:
              "Grade 3–4 perimeter as sum of side lengths, marking each side and using correct length units.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל היקף של צורות מורכבות יותר, כולל מציאת צלעות חסרות לפי הנתונים בציור. בקשו מהילד לסמן את כל הצלעות הדרושות, לבדוק יחידות, ולהסביר מדוע כל אורך נכלל בהיקף.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהיקף של צורות מורכבות, מציאת צלעות חסרות ובדיקת יחידות.",
            intentDescriptionEn:
              "Grade 5–6 perimeter of composite or more complex shapes, missing sides, units, and justification.",
          },
        },
      },
    },
    "G-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-07 default: no approved parent copy; use bucketOverrides (symmetry) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-07 default: no approved parent copy; use bucketOverrides (symmetry) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-07 default: no approved parent copy; use bucketOverrides (symmetry) or engine fallback.",
        },
      },
      bucketOverrides: {
        symmetry: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל סימטריה בעזרת קיפול נייר או ציור פשוט. בקשו מהילד לבדוק אם שני הצדדים נראים כמו תמונת מראה זה של זה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי סימטריה בעזרת קיפול או השוואה בין שני צדדים של צורה.",
            intentDescriptionEn:
              "Grade 1–2 symmetry through folding, mirror-like matching, and simple visual comparison.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי קו סימטריה והשלמת חצי חסר של צורה. בקשו מהילד לבדוק שכל נקודה בצד אחד מתאימה לנקודה בצד השני באותו מרחק מקו הסימטריה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי קווי סימטריה ובהשלמת צורות לפי מרחק שווה מקו הסימטריה.",
            intentDescriptionEn:
              "Grade 3–4 symmetry lines and completing shapes using equal distance from the line of symmetry.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל סימטריה בצורות מורכבות יותר, כולל בדיקה אם יש יותר מקו סימטריה אחד. בקשו מהילד לנמק מדוע קו מסוים הוא קו סימטריה או מדוע הוא אינו מתאים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בנימוק קווי סימטריה בצורות מורכבות ובבדיקה אם קיימים כמה קווי סימטריה.",
            intentDescriptionEn:
              "Grade 5–6 symmetry in more complex shapes, multiple symmetry lines, and justification.",
          },
        },
      },
    },
    "G-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-01 default: no approved parent copy; use bucketOverrides (shapes_basic, quadrilaterals, parallel_perpendicular, diagonal, tiling) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-01 default: no approved parent copy; use bucketOverrides (shapes_basic, quadrilaterals, parallel_perpendicular, diagonal, tiling) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-01 default: no approved parent copy; use bucketOverrides (shapes_basic, quadrilaterals, parallel_perpendicular, diagonal, tiling) or engine fallback.",
        },
      },
      bucketOverrides: {
        shapes_basic: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל זיהוי צורות בסיסיות בעזרת ציור או חפצים מוכרים. בקשו מהילד לומר את שם הצורה ולהסביר לפי סימן אחד ברור, למשל מספר צלעות או פינות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי צורות בסיסיות ובהסבר פשוט לפי צלעות, פינות וצורה כללית.",
            intentDescriptionEn:
              "Grade 1–2 basic shape recognition using familiar objects or drawings, with simple properties such as sides and corners.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מיון צורות לפי תכונות ברורות: מספר צלעות, מספר קודקודים, צלעות שוות או זוויות ישרות. בקשו מהילד להסביר לפי איזו תכונה הוא שייך כל צורה לקבוצה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון צורות לפי תכונות גאומטריות ברורות ובהסבר הבחירה.",
            intentDescriptionEn:
              "Grade 3–4 shape classification by clear geometric properties such as sides, vertices, equal sides, and right angles.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל ניתוח תכונות של צורות והשוואה בין משפחות של צורות. בקשו מהילד לנמק אילו תכונות משותפות לצורות ואילו תכונות מבדילות ביניהן.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת צורות לפי תכונות ובנימוק הקשר בין משפחות של צורות.",
            intentDescriptionEn:
              "Grade 5–6 analysis and comparison of shape properties and relationships between shape families.",
          },
        },
        quadrilaterals: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal quadrilateral property recommendations null for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי מרובעים לפי תכונות: ארבע צלעות, צלעות נגדיות, זוויות ישרות וצלעות שוות. בקשו מהילד להסביר איזו תכונה עזרה לו לזהות את סוג המרובע.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מרובעים לפי תכונות ולא רק לפי המראה הכללי של הצורה.",
            intentDescriptionEn:
              "Grade 3–4 quadrilateral identification using properties such as four sides, opposite sides, right angles, and equal sides.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין סוגי מרובעים לפי תכונות מדויקות, כמו מקבילות, שוויון צלעות, זוויות ואלכסונים. בקשו מהילד לנמק מדוע צורה שייכת למשפחה מסוימת של מרובעים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשרים בין משפחות מרובעים ובהוכחת הסיווג לפי תכונות מדויקות.",
            intentDescriptionEn:
              "Grade 5–6 quadrilateral classification and relationships using parallelism, equal sides, angles, diagonals, and justification.",
          },
        },
        parallel_perpendicular: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal parallel/perpendicular recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי ישרים מקבילים ומאונכים בעזרת ציור ברור. בקשו מהילד להסביר אם הקווים נפגשים, אם הם יוצרים זווית ישרה, או אם הם שומרים על אותו מרחק.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מקבילים ומאונכים בעזרת ציור והסבר של הקשר בין הקווים.",
            intentDescriptionEn:
              "Grade 3–4 identifying parallel and perpendicular lines using drawings, right angles, intersection, and equal distance.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שימוש במקבילים ומאונכים בתוך צורות, במיוחד במרובעים ובשרטוטים מורכבים יותר. בקשו מהילד לנמק איך היחסים בין הקווים עוזרים לזהות את תכונות הצורה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשימוש במקבילים ומאונכים כדי להסביר תכונות של צורות.",
            intentDescriptionEn:
              "Grade 5–6 using parallel and perpendicular relationships inside shapes to justify geometric properties.",
          },
        },
        diagonal: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep diagonal recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי אלכסון במצולע: קו שמחבר בין שני קודקודים שאינם סמוכים. בקשו מהילד לסמן אלכסון אחד ולהסביר מדוע הוא אינו צלע.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי אלכסונים ובהבחנה בינם לבין צלעות.",
            intentDescriptionEn:
              "Grade 3–4 identifying diagonals as segments between non-adjacent vertices and distinguishing them from sides.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שימוש באלכסונים כדי להבין תכונות של מרובעים, כמו חלוקה למשולשים, שוויון או חצייה. בקשו מהילד להסביר מה האלכסון מגלה על הצורה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקשר בין אלכסונים לתכונות של מרובעים.",
            intentDescriptionEn:
              "Grade 5–6 using diagonals to reason about quadrilateral properties, triangle decomposition, equality, and bisection.",
          },
        },
        tiling: {
          g1_g2: {
            actionTextHe:
              "כדאי לתרגל ריצוף בעזרת צורות פשוטות: לבדוק אילו צורות מכסות שטח בלי רווחים ובלי חפיפה. בקשו מהילד להסביר מה קרה כשניסו לסדר את הצורות זו ליד זו.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בריצוף פשוט של שטח בעזרת צורות, בלי רווחים ובלי חפיפות.",
            intentDescriptionEn:
              "Grade 1–2 simple tiling with shapes, covering space without gaps or overlaps.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל ריצוף בעזרת מצולעים ולבדוק אילו תכונות מאפשרות לצורות לכסות שטח בלי רווחים. בקשו מהילד להסביר את הדפוס שנוצר ואת הסיבה שהוא עובד.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בריצוף, בדפוסים ובבדיקה מדוע צורות מסוימות מכסות שטח באופן מלא.",
            intentDescriptionEn:
              "Grade 3–4 tiling with polygons, patterns, and explaining why shapes cover a region without gaps.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל ניתוח ריצופים ודפוסים גאומטריים לפי זוויות, צלעות וחזרות. בקשו מהילד לנמק מדוע הדפוס ממשיך לכסות את השטח בלי רווחים או חפיפות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בניתוח ריצופים לפי תכונות גאומטריות ובנימוק הדפוס החוזר.",
            intentDescriptionEn:
              "Grade 5–6 analyzing tessellations and geometric patterns using angles, sides, repetition, and justification.",
          },
        },
      },
    },
    "G-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-03 default: no approved parent copy; use bucketOverrides (quadrilaterals, heights, area) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-03 default: no approved parent copy; use bucketOverrides (quadrilaterals, heights, area) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-03 default: no approved parent copy; use bucketOverrides (quadrilaterals, heights, area) or engine fallback.",
        },
      },
      bucketOverrides: {
        quadrilaterals: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep advanced quadrilateral area/height recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מרובעים דרך בסיס, גובה ושרטוט מסודר. בקשו מהילד לסמן את הצלע שאליה מתייחסים ואת הגובה המתאים, ולהסביר מדוע הגובה חייב להיות מאונך לבסיס.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי בסיס וגובה במרובעים ובהבנה שהגובה מאונך לבסיס.",
            intentDescriptionEn:
              "Grade 3–4 quadrilateral reasoning with base, height, and the perpendicular relationship between them.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חישובי שטח במרובעים תוך התאמת הנוסחה לצורה ולנתונים. בקשו מהילד לסמן בסיס וגובה, לבדוק שהם מתאימים זה לזה, ולהסביר למה הנוסחה שבחר מתאימה לצורה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשטחי מרובעים, בהתאמת בסיס וגובה ובבחירת נוסחה מתאימה לפי הצורה.",
            intentDescriptionEn:
              "Grade 5–6 quadrilateral area reasoning using matched base-height pairs and selecting the appropriate formula.",
          },
        },
        heights: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal height recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי גובה בצורות בעזרת סימון בסיס וגובה בציור. בקשו מהילד לבדוק שהגובה יורד אל הבסיס בזווית ישרה ולא סתם מחבר שתי נקודות בציור.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי גובה כקטע מאונך לבסיס בתוך שרטוט גאומטרי.",
            intentDescriptionEn:
              "Grade 3–4 identifying height as a perpendicular segment to a base, not just any segment in the diagram.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שימוש בגובה בחישובי שטח, במיוחד כאשר הצורה משורטטת בצורה לא רגילה. בקשו מהילד לסמן בסיס וגובה מתאימים ולבדוק שהנתונים שבחר באמת שייכים לאותה נוסחה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמת גובה לבסיס ובשימוש נכון בהם בחישובי שטח.",
            intentDescriptionEn:
              "Grade 5–6 using height correctly in area calculations, matching base and height even in non-standard diagrams.",
          },
        },
        area: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal area recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל שטח בעזרת כיסוי משבצות או פירוק הצורה לחלקים פשוטים. בקשו מהילד להסביר מה בדיוק סופרים או מודדים, ולבדוק שלא בלבל בין שטח להיקף.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת שטח ככיסוי של אזור ובהבחנה בין שטח להיקף.",
            intentDescriptionEn:
              "Grade 3–4 area as covering a region, using grid squares or decomposition, and distinguishing area from perimeter.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חישובי שטח בצורות מורכבות בעזרת פירוק והרכבה. בקשו מהילד להסביר אילו חלקים חישב, באיזו נוסחה השתמש לכל חלק, ואיך חיבר את התוצאות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחישוב שטחים בצורות מורכבות בעזרת פירוק, נוסחאות מתאימות ובדיקת סבירות.",
            intentDescriptionEn:
              "Grade 5–6 area of composite shapes using decomposition, appropriate formulas, and reasonableness checks.",
          },
        },
      },
    },
    "G-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-08 default: no approved parent copy; use bucketOverrides (area, triangles, pythagoras) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-08 default: no approved parent copy; use bucketOverrides (area, triangles, pythagoras) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "G-08 default: no approved parent copy; use bucketOverrides (area, triangles, pythagoras) or engine fallback.",
        },
      },
      bucketOverrides: {
        area: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formula-based area recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formula-based advanced area recommendations null for grades 3–4 unless item evidence explicitly supports it.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שימוש בנוסחאות שטח תוך התאמת הנוסחה לצורה ולנתונים. בקשו מהילד לסמן את הנתונים בציור, להציב אותם בנוסחה בצורה מסודרת, ולבדוק שהיחידות הן יחידות שטח.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בבחירת נוסחת שטח מתאימה, הצבת נתונים מסודרת ובדיקת יחידות שטח.",
            intentDescriptionEn:
              "Grade 5–6 formula-based area reasoning: choose the correct formula, substitute values, and check square units.",
          },
        },
        triangles: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal triangle area/property recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי תכונות של משולשים, כמו מספר צלעות, קודקודים וזוויות, והשוואה בין סוגי משולשים פשוטים. בקשו מהילד לנמק לפי איזו תכונה הוא מזהה את המשולש.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי משולשים והשוואה ביניהם לפי תכונות ברורות.",
            intentDescriptionEn:
              "Grade 3–4 triangle identification and comparison using clear properties such as sides, vertices, and angles.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שטח משולש בעזרת בסיס וגובה, ולהבין מדוע מחלקים את מכפלת הבסיס והגובה ב 2. בקשו מהילד לסמן בסיס וגובה מתאימים ולבדוק שהגובה מאונך לבסיס.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשטח משולש, התאמת בסיס וגובה והבנת הקשר לשטח מלבן או מקבילית.",
            intentDescriptionEn:
              "Grade 5–6 triangle area using base and height, understanding the divide-by-two relationship to rectangles/parallelograms.",
          },
        },
        pythagoras: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep Pythagoras recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep Pythagoras recommendations null for grades 3–4.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל את משפט פיתגורס רק במשולשים ישרי זווית. בקשו מהילד לזהות קודם את הזווית הישרה, לסמן את היתר ואת הניצבים, ואז להציב בזהירות בנוסחה ולבדוק שהתוצאה הגיונית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי משולש ישר זווית, סימון היתר והניצבים, ושימוש מסודר במשפט פיתגורס.",
            intentDescriptionEn:
              "Grade 5–6 Pythagoras only in right triangles: identify right angle, hypotenuse, legs, substitute carefully, and check reasonableness.",
          },
        },
      },
    },
  },
  hebrew: {
    "H-04": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-04 default: no approved flat copy; use bucketOverrides (reading, comprehension) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-04 default: no approved flat copy; use bucketOverrides (reading, comprehension) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-04 default: no approved flat copy; use bucketOverrides (reading, comprehension) or engine fallback.",
        },
      },
      bucketOverrides: {
        reading: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep reading-order/fact-location recommendations null for grades 1–2 until concrete early-reading copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל איתור מידע מפורש בטקסט בעזרת כותרת, פסקה או מילת מפתח. בקשו מהילד לסמן את המשפט שבו מצא את התשובה ולהסביר איך ידע שזה המקום הנכון.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באיתור תשובות מפורשות בטקסט ובסימון המקום המדויק שממנו נלקחה התשובה.",
            intentDescriptionEn:
              "Grade 3–4 locating explicit information in a text using title, paragraph, or keyword cues, and pointing to the exact sentence.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל איתור מידע בטקסט תוך שימוש בראיות מתוך הכתוב. בקשו מהילד להראות באיזה משפט או פסקה נמצאת התשובה, ולהסביר האם זו עובדה שמופיעה בטקסט או מסקנה שהוא הסיק.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במציאת ראיות מתוך הטקסט ובהבחנה בין מידע שמופיע במפורש לבין מסקנה מתוך הכתוב.",
            intentDescriptionEn:
              "Grade 5–6 locating textual evidence and distinguishing explicit information from an inference.",
          },
        },
        comprehension: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep comprehension strategy recommendations null for grades 1–2 until concrete early-reading copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הבנת קטע קצר על ידי קריאה לפי סדר האירועים או הרעיונות. אחרי הקריאה בקשו מהילד לומר מה קרה קודם, מה קרה אחר כך, ואיפה בטקסט הוא מצא את זה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת רצף הדברים בטקסט ובחזרה אל המשפטים שמוכיחים את התשובה.",
            intentDescriptionEn:
              "Grade 3–4 comprehension through sequence of events/ideas and returning to the text for support.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הבנת טקסט בעזרת חיבור בין פרטים ממקומות שונים בקטע. בקשו מהילד להסביר אילו פרטים בטקסט תומכים בתשובה שלו, ולא להסתפק בתחושה כללית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בחיבור בין פרטים בטקסט ובהסבר תשובה בעזרת ראיות מהכתוב.",
            intentDescriptionEn:
              "Grade 5–6 comprehension by connecting details across the text and supporting answers with textual evidence.",
          },
        },
      },
    },
    "H-05": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-05 default: no approved flat copy; use bucketOverrides (homophones) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-05 default: no approved flat copy; use bucketOverrides (homophones) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-05 default: no approved flat copy; use bucketOverrides (homophones) or engine fallback.",
        },
      },
      bucketOverrides: {
        homophones: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep homophone/context recommendations null for grades 1–2 until early Hebrew copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זוגות מילים שנשמעות דומה או זהות, אבל נכתבות אחרת או בעלות משמעות שונה. בקשו מהילד לקרוא שני משפטים קצרים, לבחור את המילה הנכונה לפי ההקשר, ולהסביר למה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין מילים דומות לפי משמעות המשפט, לא רק לפי הצליל.",
            intentDescriptionEn:
              "Grade 3–4 homophone disambiguation using minimal sentence pairs and context-based word choice.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הומופונים ומילים שנשמעות דומה בטקסטים קצרים. בקשו מהילד לזהות את המילה המתאימה לפי ההקשר, לכתוב את המילה הנכונה, ולהסביר מה היה עלול לבלבל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בבחירת המילה הנכונה לפי הקשר, גם כשמילים נשמעות דומה.",
            intentDescriptionEn:
              "Grade 5–6 homophone/context discrimination in short texts with written justification.",
          },
        },
      },
    },
    "H-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-01 default: use bucketOverrides (vocabulary, mixed) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-01 default: use bucketOverrides (vocabulary, mixed) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-01 default: use bucketOverrides (vocabulary, mixed) or engine fallback.",
        },
      },
      bucketOverrides: {
        vocabulary: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep Hebrew vocabulary recommendations null for grades 1–2 until early-reading copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל אוצר מילים בעברית דרך קריאת משפטים קצרים והסבר משמעות של מילים מתוך ההקשר. בקשו מהילד לבחור מילה אחת מהטקסט, להסביר אותה במילים שלו, ולכתוב משפט קצר עם אותה מילה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהרחבת אוצר מילים בעברית ובהבנת משמעות מילים מתוך משפט או קטע קצר.",
            intentDescriptionEn:
              "Grade 3–4 Hebrew vocabulary through short texts, explaining word meaning from context, and using the word in a sentence.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל אוצר מילים בעברית מתוך טקסטים מגוונים. בקשו מהילד לזהות מילים מרכזיות, להסביר את משמעותן לפי ההקשר, ולבדוק אם אותה מילה יכולה לקבל משמעות שונה במשפט אחר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באוצר מילים מתוך הקשר, בדיוק משמעות ובהבחנה בין משמעויות אפשריות של אותה מילה.",
            intentDescriptionEn:
              "Grade 5–6 Hebrew vocabulary in context, key words, nuanced meaning, and possible shifts in meaning across contexts.",
          },
        },
        mixed: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep mixed Hebrew vocabulary recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מילים וביטויים מתוך קטעים קצרים, ולחבר בין משמעות המילה לבין המשפט שבו היא מופיעה. בקשו מהילד להסביר איך הבין את המילה ולא רק לתת תרגום או מילה דומה.",
            goalTextHe: "בשבוע הקרוב התמקדו בהבנת מילים וביטויים מתוך ההקשר שבו הם מופיעים.",
            intentDescriptionEn:
              "Grade 3–4 mixed Hebrew vocabulary and expressions through sentence context and explanation.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מילים, ביטויים וצירופים מתוך טקסט, תוך הבחנה בין משמעות מילולית למשמעות לפי ההקשר. בקשו מהילד לנמק מה בטקסט עזר לו להבין את הביטוי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מילים וביטויים בתוך טקסט ובהסבר לפי ראיות מההקשר.",
            intentDescriptionEn:
              "Grade 5–6 mixed vocabulary/expressions in text, including literal vs contextual meaning and evidence from context.",
          },
        },
      },
    },
    "H-02": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
      },
      bucketOverrides: {
        grammar: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal Hebrew grammar recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל דקדוק בסיסי בעברית בתוך משפטים קצרים: התאמה בין שם עצם, פועל ותיאור מתאים. בקשו מהילד לקרוא את כל המשפט ולבדוק אם הצורה שבחר מתאימה למי או למה שמופיע במשפט.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמה בסיסית בתוך משפט בעברית: מין, מספר וצורת המילה המתאימה להקשר.",
            intentDescriptionEn:
              "Grade 3–4 basic Hebrew grammar agreement in short sentences: gender, number, and matching the word form to context.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל דקדוק בעברית דרך משפטים מלאים: התאמה במין ובמספר, צורת פועל מתאימה, ושימוש נכון במילות יחס או קישור. בקשו מהילד להסביר לפי מה בחר את הצורה ולבדוק שהמשפט נשמע תקין וברור.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בדיוק דקדוקי במשפטים בעברית, כולל התאמה, צורת פועל וקשר תקין בין חלקי המשפט.",
            intentDescriptionEn:
              "Grade 5–6 Hebrew grammar accuracy in full sentences: agreement, verb form, function words, and sentence clarity.",
          },
        },
      },
    },
    "H-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-03 default: use bucketOverrides (writing) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-03 default: use bucketOverrides (writing) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-03 default: use bucketOverrides (writing) or engine fallback.",
        },
      },
      bucketOverrides: {
        writing: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep Hebrew writing recommendations null for grades 1–2 until early-writing copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל כתיבת תשובה קצרה וברורה בעברית. בקשו מהילד לפתוח במשפט שמענה בדיוק על השאלה, להוסיף פרט אחד תומך, ולקרוא שוב כדי לבדוק שהמשפט מובן.",
            goalTextHe: "בשבוע הקרוב התמקדו בכתיבת תשובה קצרה, ברורה ומדויקת לשאלה.",
            intentDescriptionEn:
              "Grade 3–4 Hebrew writing: short clear answer, direct response to the question, one supporting detail, and rereading for clarity.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל כתיבה בעברית עם מבנה ברור: משפט פתיחה, הסבר או דוגמה, וסיום שמחזיר לשאלה. בקשו מהילד לבדוק שהרעיונות מסודרים ושכל משפט מוסיף מידע חדש.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בארגון כתיבה בעברית: פתיחה, פיתוח רעיון, דוגמה או הסבר, וסיום ברור.",
            intentDescriptionEn:
              "Grade 5–6 Hebrew writing with clear structure: opening, explanation/example, organized ideas, and a clear closing.",
          },
        },
      },
    },
    "H-06": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-06 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-06 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-06 default: use bucketOverrides (grammar) or engine fallback.",
        },
      },
      bucketOverrides: {
        grammar: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep advanced Hebrew grammar/syntax recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל ניתוח של משפטים בעברית לפי חלקי המשפט והקשר ביניהם. בקשו מהילד לזהות מי מבצע את הפעולה, מה נאמר עליו, ואיזו מילה מחברת בין הרעיונות במשפט.",
            goalTextHe: "בשבוע הקרוב התמקדו בהבנת מבנה המשפט בעברית ובקשר בין חלקי המשפט.",
            intentDescriptionEn:
              "Grade 3–4 Hebrew sentence structure: identify the doer/action and how sentence parts connect.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מבנים דקדוקיים מורכבים יותר בעברית, כמו קשר בין שורש, תבנית, צורת פועל ומבנה משפט. בקשו מהילד להסביר מה תפקיד כל חלק במשפט ואיך המבנה משפיע על המשמעות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בניתוח מבנה משפטים בעברית ובקשר בין צורות מילים, תפקידים ומשמעות.",
            intentDescriptionEn:
              "Grade 5–6 advanced Hebrew grammar/syntax: root-pattern awareness, verb forms, sentence roles, and meaning.",
          },
        },
      },
    },
    "H-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-07 default: use bucketOverrides (writing) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-07 default: use bucketOverrides (writing) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "H-07 default: use bucketOverrides (writing) or engine fallback.",
        },
      },
      bucketOverrides: {
        writing: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep higher-level Hebrew writing recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הרחבת תשובה כתובה בעברית בעזרת הסבר, דוגמה או נימוק קצר. בקשו מהילד לבדוק שכל משפט קשור לרעיון המרכזי ושאין קפיצה בין רעיונות.",
            goalTextHe: "בשבוע הקרוב התמקדו בפיתוח תשובה כתובה: רעיון מרכזי, הסבר ודוגמה קצרה.",
            intentDescriptionEn:
              "Grade 3–4 developed Hebrew writing: main idea, explanation, example, and keeping sentences connected.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל כתיבה של פסקה מסודרת בעברית: רעיון מרכזי, נימוק, דוגמה וקישור בין המשפטים. בקשו מהילד לערוך את הכתיבה בסיום ולבדוק שהרצף ברור ומשכנע.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בכתיבת פסקה מאורגנת בעברית, עם נימוק, דוגמה, קשר בין משפטים ועריכה עצמית.",
            intentDescriptionEn:
              "Grade 5–6 higher Hebrew writing: organized paragraph, reasoning, examples, cohesion, and revision.",
          },
        },
      },
    },
    "H-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-08 default: no approved flat copy; use bucketOverrides (speaking) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-08 default: no approved flat copy; use bucketOverrides (speaking) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "H-08 default: no approved flat copy; use bucketOverrides (speaking) or engine fallback.",
        },
      },
      bucketOverrides: {
        speaking: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal register/speaking recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep context-appropriate register recommendations null for grades 3–4 until diagnosis-line jargon cleanup and editorial copy are approved.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל התאמת ניסוח למצב התקשורת: שיחה יומיומית, הצגה בכיתה, תשובה למורה או כתיבה רשמית. בקשו מהילד לבחור ניסוח מתאים יותר להקשר ולהסביר למה הוא מתאים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמת ניסוח להקשר: מתי מתאים ניסוח יומיומי ומתי מתאים ניסוח רשמי או מדויק יותר.",
            intentDescriptionEn:
              "Grade 5–6 context-appropriate speaking/register: choosing wording that fits the situation and explaining why.",
          },
        },
      },
    },
  },
  english: {
    "E-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-01 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-01 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-01 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
      },
      bucketOverrides: {
        vocabulary: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep early English vocabulary recommendations null for grades 1–2 until early-English copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל אוצר מילים באנגלית דרך התאמה בין מילה, תמונה או משמעות קצרה. בקשו מהילד לומר את המילה בקול, להסביר את המשמעות בעברית, ולזהות אותה שוב בתוך תרגיל קצר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מילים מוכרות באנגלית ובהבנת המשמעות שלהן בהקשר פשוט.",
            intentDescriptionEn:
              "Grade 3–4 English vocabulary recognition through word-picture/meaning matching and simple reuse.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל אוצר מילים באנגלית לפי נושאים ולפי הופעה בטקסט. בקשו מהילד לכתוב לכל מילה משמעות בעברית ודוגמה קצרה באנגלית, ואז לבדוק אם הוא מזהה את אותה מילה גם במשפט חדש.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהרחבת אוצר מילים באנגלית ובהבנת מילים חדשות גם כשהן מופיעות במשפט או קטע קצר.",
            intentDescriptionEn:
              "Grade 5–6 English vocabulary expansion by topic and text use, with example sentences and recognition in new contexts.",
          },
        },
      },
    },
    "E-02": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-02 default: use bucketOverrides (grammar) or engine fallback.",
        },
      },
      bucketOverrides: {
        grammar: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep formal English grammar recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מבנים בסיסיים באנגלית בתוך משפטים קצרים, כמו התאמה בין מי שעושה את הפעולה לבין צורת הפועל. בקשו מהילד לקרוא את כל המשפט ולבדוק אם המילה שבחר מתאימה לנושא המשפט.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמה בסיסית בתוך משפט באנגלית: מי מבצע את הפעולה ואיזו צורה מתאימה לו.",
            intentDescriptionEn:
              "Grade 3–4 basic English grammar agreement inside short sentences, matching the subject with the correct verb/form.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל דקדוק באנגלית דרך משפטים מלאים: זמן הפעולה, מי מבצע אותה, ואיזו צורת פועל מתאימה. בקשו מהילד להסביר לפי מה בחר את הצורה, ואז לקרוא את המשפט שוב ולבדוק שהוא נשמע נכון ומשמעותי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתאמת זמן, נושא וצורת פועל במשפטים באנגלית, עם בדיקה חוזרת של משמעות המשפט.",
            intentDescriptionEn:
              "Grade 5–6 English grammar with tense, subject, and verb-form agreement in full sentences.",
          },
        },
      },
    },
    "E-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-03 default: no approved flat copy; use bucketOverrides (translation) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-03 default: no approved flat copy; use bucketOverrides (translation) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-03 default: no approved flat copy; use bucketOverrides (translation) or engine fallback.",
        },
      },
      bucketOverrides: {
        translation: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep line-tracking/layout recommendations null for grades 1–2 until early English reading evidence and copy are approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאה מדויקת של טקסט באנגלית על ידי מעקב מסודר אחרי שורה אחת בכל פעם. בקשו מהילד לסמן באצבע או בעיפרון את השורה שהוא קורא, ואז לבדוק שלא דילג לשורה אחרת לפני שענה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במעקב מסודר אחרי שורות בטקסט באנגלית ובבדיקה שהתשובה נלקחה מהמקום הנכון.",
            intentDescriptionEn:
              "Grade 3–4 English reading layout support: track one line at a time and avoid jumping between lines.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל קריאה של קטעים באנגלית תוך מעקב מדויק אחרי שורות, פסקאות או טורים. בקשו מהילד לעצור לפני תשובה, להראות מאיזו שורה או פסקה לקח את המידע, ולוודא שלא ערבב בין חלקים שונים בטקסט.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאה מדויקת של טקסטים באנגלית ובקישור כל תשובה לשורה או פסקה מתאימה.",
            intentDescriptionEn:
              "Grade 5–6 English reading layout and evidence tracking across lines, paragraphs, or columns.",
          },
        },
      },
    },
    "E-04": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-04 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-04 default: use bucketOverrides (grammar) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-04 default: use bucketOverrides (grammar) or engine fallback.",
        },
      },
      bucketOverrides: {
        grammar: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep sentence-structure grammar recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל בניית משפטים קצרים באנגלית לפי סדר מילים ברור. בקשו מהילד לזהות מי או מה מופיע במשפט, מה הפעולה, ואיזו מילה מחברת או משלימה את המשמעות.",
            goalTextHe: "בשבוע הקרוב התמקדו בסדר מילים בסיסי באנגלית ובבניית משפט קצר וברור.",
            intentDescriptionEn:
              "Grade 3–4 English sentence structure: basic word order, subject/action, and meaning completion.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מבנה משפט באנגלית בעזרת סדר מילים, מילות קישור ומילות יחס. בקשו מהילד להסביר איך כל חלק במשפט תורם למשמעות, ולבדוק שהמשפט ברור ולא רק מתורגם מילה במילה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במבנה משפט באנגלית: סדר מילים, מילות קישור, מילות יחס ובהירות המשמעות.",
            intentDescriptionEn:
              "Grade 5–6 English sentence structure with word order, connectors, prepositions, and meaning clarity.",
          },
        },
      },
    },
    "E-05": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-05 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-05 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-05 default: use bucketOverrides (vocabulary) or engine fallback.",
        },
      },
      bucketOverrides: {
        vocabulary: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep vocabulary-in-context recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל בחירת מילה באנגלית לפי משמעות המשפט, ולא רק לפי תרגום בודד. בקשו מהילד לקרוא את כל המשפט, לזהות מילים שעוזרות להבין את ההקשר, ורק אז לבחור את המילה המתאימה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מילה לפי המשפט שבו היא מופיעה ובבחירה שמתאימה להקשר.",
            intentDescriptionEn:
              "Grade 3–4 vocabulary in context: choose a word by reading the whole sentence and using context clues.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מילים באנגלית שהמשמעות שלהן משתנה לפי ההקשר או לפי המילים שמופיעות לידן. בקשו מהילד להסביר למה מילה מסוימת מתאימה למשפט הזה, ולא לבחור רק לפי משמעות מוכרת אחת.",
            goalTextHe:
              "בשבוע הקרוב התמקדו באוצר מילים לפי הקשר: משמעות במשפט, צירופי מילים טבעיים ובחירה שמתאימה לטקסט.",
            intentDescriptionEn:
              "Grade 5–6 vocabulary in context, natural word combinations, and choosing meaning based on sentence/text context.",
          },
        },
      },
    },
    "E-06": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-06 default: use bucketOverrides (sentences/sentence) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-06 default: use bucketOverrides (sentences/sentence) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "E-06 default: use bucketOverrides (sentences/sentence) or engine fallback.",
        },
      },
      bucketOverrides: {
        sentences: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep English sentence inference/comprehension recommendations null for grades 1–2 until approved early-English copy exists.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הבנת משפטים באנגלית לפי כל המשפט, ולא לפי מילה בודדת. בקשו מהילד לזהות מי עושה את הפעולה, מה קורה במשפט, ואיזו מילה עוזרת להבין את המשמעות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת משפטים באנגלית לפי משמעות המשפט כולו וזיהוי הרמזים שעוזרים להבין אותו.",
            intentDescriptionEn:
              "Grade 3–4 English sentence comprehension: understand the whole sentence, identify who does the action, what happens, and context clues.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הבנת משפטים באנגלית מתוך הקשר, כולל הסקת משמעות ממילים סמוכות, כינויים או מילות קישור. בקשו מהילד להסביר מה במשפט עזר לו להגיע לתשובה, ולא להסתפק בתרגום מילה במילה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהסקת משמעות מתוך משפטים באנגלית בעזרת הקשר, רמזים לשוניים והסבר של דרך החשיבה.",
            intentDescriptionEn:
              "Grade 5–6 English sentence inference from context, nearby words, pronouns, connectors, and explaining the reasoning.",
          },
        },
        sentence: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Alias of sentences. Keep null for grades 1–2 until approved early-English copy exists.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הבנת משפטים באנגלית לפי כל המשפט, ולא לפי מילה בודדת. בקשו מהילד לזהות מי עושה את הפעולה, מה קורה במשפט, ואיזו מילה עוזרת להבין את המשמעות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת משפטים באנגלית לפי משמעות המשפט כולו וזיהוי הרמזים שעוזרים להבין אותו.",
            intentDescriptionEn:
              "Alias of sentences. Grade 3–4 English sentence comprehension: understand the whole sentence, identify who does the action, what happens, and context clues.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הבנת משפטים באנגלית מתוך הקשר, כולל הסקת משמעות ממילים סמוכות, כינויים או מילות קישור. בקשו מהילד להסביר מה במשפט עזר לו להגיע לתשובה, ולא להסתפק בתרגום מילה במילה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהסקת משמעות מתוך משפטים באנגלית בעזרת הקשר, רמזים לשוניים והסבר של דרך החשיבה.",
            intentDescriptionEn:
              "Alias of sentences. Grade 5–6 English sentence inference from context, nearby words, pronouns, connectors, and explaining the reasoning.",
          },
        },
      },
    },
    "E-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-07 default: no approved flat copy; use bucketOverrides (writing) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-07 default: no approved flat copy; use bucketOverrides (writing) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-07 default: no approved flat copy; use bucketOverrides (writing) or engine fallback.",
        },
      },
      bucketOverrides: {
        writing: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep early English spelling recommendations null for grades 1–2 until age-appropriate spelling copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל איות באנגלית דרך מילים שיש להן דפוס חוזר, למשל אותיות שנשמעות דומה או סיומות שחוזרות בכמה מילים. בקשו מהילד לכתוב כמה מילים מאותה קבוצה ולהסביר מה הדפוס המשותף.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי דפוסי איות חוזרים באנגלית ובכתיבה מדויקת של מילים מאותה משפחה.",
            intentDescriptionEn:
              "Grade 3–4 recurring English spelling patterns through word groups and repeated endings or letter patterns.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל דיוק באיות באנגלית בתוך משפטים קצרים או תשובות כתובות. בקשו מהילד לבדוק מילים שחוזרות אצלו עם אותה טעות, לזהות את הדפוס, ולתקן באופן עקבי לפני שמגיש תשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בעקביות באיות באנגלית בתוך כתיבה, בזיהוי טעויות שחוזרות ובתיקון מסודר שלהן.",
            intentDescriptionEn:
              "Grade 5–6 spelling consistency in English writing, identifying repeated error patterns and correcting them systematically.",
          },
        },
      },
    },
    "E-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-08 default: no approved flat copy; use bucketOverrides (listening) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-08 default: no approved flat copy; use bucketOverrides (listening) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "E-08 default: no approved flat copy; use bucketOverrides (listening) or engine fallback.",
        },
      },
      bucketOverrides: {
        listening: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep listening/minimal-pair recommendations null for grades 1–2 until early-English listening copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל הבחנה בין צלילים דומים באנגלית: להקריא לאט שתי מילים, לבקש מהילד לומר מה שונה ביניהן, ואז לחזור על אותו זוג צלילים במילים אחרות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהאזנה לזוגות צלילים דומים באנגלית ובהבחנה ביניהם במילים שונות.",
            intentDescriptionEn:
              "Grade 3–4 English minimal-pair listening through slow reading and repeated sound pairs in different words.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל האזנה לזוגות צלילים באנגלית גם כשהמילים מופיעות במשפט קצר. בקשו מהילד לזהות איזו מילה שמע, להסביר מה שונה בצליל, ולחזור על ההבחנה בזוג מילים חדש.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהאזנה מדויקת לצלילים דומים באנגלית, גם בתוך משפטים קצרים.",
            intentDescriptionEn:
              "Grade 5–6 minimal-pair listening in short English sentences with explicit sound-difference explanation.",
          },
        },
      },
    },
  },
  science: {
    "S-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-01 default: no approved parent copy; use bucketOverrides (animals, plants, earth_space, mixed) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-01 default: no approved parent copy; use bucketOverrides (animals, plants, earth_space, mixed) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-01 default: no approved parent copy; use bucketOverrides (animals, plants, earth_space, mixed) or engine fallback.",
        },
      },
      bucketOverrides: {
        animals: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep animal classification recommendations null for grades 1–2 until concrete early-science copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מיון בעלי חיים לפי סימנים שאפשר לראות או להסביר, כמו מבנה גוף, סביבת חיים, תזונה או דרך תנועה. בקשו מהילד לומר לפי איזה סימן הוא מיין ולא רק לבחור קבוצה לפי זיכרון.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון בעלי חיים לפי סימנים ברורים ובהסבר הסיבה לשיוך לקבוצה.",
            intentDescriptionEn:
              "Grade 3–4 animal classification using observable traits such as body structure, habitat, food, or movement.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין קבוצות של בעלי חיים לפי כמה מאפיינים יחד. בקשו מהילד להבחין בין מאפיין של בעל החיים לבין תהליך שהוא עובר, ולהסביר אילו ראיות תומכות במיון שלו.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון והשוואה של בעלי חיים לפי כמה מאפיינים, תוך נימוק בעזרת ראיות.",
            intentDescriptionEn:
              "Grade 5–6 animal classification across multiple traits, distinguishing traits from processes and justifying with evidence.",
          },
        },
        plants: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep plant classification recommendations null for grades 1–2 until concrete early-science copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מיון צמחים לפי חלקי הצמח ותפקידיהם, כמו שורש, גבעול, עלים, פרח או פרי. בקשו מהילד להסביר איזה חלק הוא מזהה ומה התפקיד שלו בצמח.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי חלקי הצמח, תפקידיהם ומיון צמחים לפי מאפיינים ברורים.",
            intentDescriptionEn:
              "Grade 3–4 plant classification using plant parts and their roles.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין צמחים לפי מבנה, תנאי חיים ותהליכים כמו גדילה או רבייה. בקשו מהילד להפריד בין תכונה של הצמח לבין תהליך שמתרחש בו, ולנמק לפי מידע מהמשימה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת צמחים לפי מבנה, תנאי חיים ותהליכים, עם נימוק מתוך הנתונים.",
            intentDescriptionEn:
              "Grade 5–6 plant comparison by structure, living conditions, and processes, separating traits from processes.",
          },
        },
        earth_space: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep earth/space classification recommendations null for grades 1–2 until concrete early-science copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מיון תופעות טבע לפי מה שמתארים: גוף שמימי, מזג אוויר, סלעים, מים או שינוי שמתרחש בסביבה. בקשו מהילד להסביר לפי איזה סימן הוא זיהה את הקבוצה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון תופעות טבע לפי סימנים ברורים ובהסבר הבחירה.",
            intentDescriptionEn:
              "Grade 3–4 earth/space classification by observable categories such as celestial bodies, weather, rocks, water, or environmental changes.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הבחנה בין מושגים ותהליכים במדעי כדור הארץ והחלל. בקשו מהילד להסביר אם מדובר בעצם, בתופעה או בתהליך, ולהשתמש בנתונים מהשאלה כדי לנמק.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין עצמים, תופעות ותהליכים במדעי כדור הארץ והחלל, עם נימוק לפי נתונים.",
            intentDescriptionEn:
              "Grade 5–6 earth/space reasoning by distinguishing objects, phenomena, and processes using task evidence.",
          },
        },
        mixed: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep mixed science classification recommendations null for grades 1–2 until concrete early-science copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מיון מושגים במדעים לפי סימן ברור: מה זה, למה הוא שייך, ומה מאפיין אותו. בקשו מהילד להסביר את המיון במילים שלו ולבדוק אם יש פרט בשאלה שתומך בתשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון מושגים במדעים לפי מאפיינים ברורים ובהסבר הבחירה.",
            intentDescriptionEn:
              "Grade 3–4 mixed science classification by clear traits and explanation using evidence from the question.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין מושגים ותהליכים במדעים מתחומים שונים. בקשו מהילד לזהות מה המאפיין המרכזי של כל מושג, מה התהליך אם יש כזה, ואילו נתונים עוזרים להחליט.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין מושגים, מאפיינים ותהליכים במדעים, תוך שימוש בנתונים מהמשימה.",
            intentDescriptionEn:
              "Grade 5–6 mixed science concept classification across domains, distinguishing concepts, traits, and processes using evidence.",
          },
        },
      },
    },
    "S-02": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-02 default: no approved parent copy; use bucketOverrides (experiments) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-02 default: no approved parent copy; use bucketOverrides (experiments) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "S-02 default: no approved parent copy; use bucketOverrides (experiments) or engine fallback.",
        },
      },
      bucketOverrides: {
        experiments: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal experiment-variable recommendations null for grades 1–2 until concrete early-science copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל ניסוי פשוט שבו משנים רק דבר אחד בכל פעם. בקשו מהילד לומר מה משנים, מה משאירים קבוע, ומה בודקים בסוף הניסוי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת ניסוי הוגן: שינוי גורם אחד, שמירה על שאר התנאים ובדיקת התוצאה.",
            intentDescriptionEn:
              "Grade 3–4 fair-test reasoning: change one variable, keep other conditions the same, and observe the result.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל תכנון ניסוי בעזרת טבלה: מה המשתנה שמשנים, מה מודדים, ומה חייב להישאר קבוע כדי שהבדיקה תהיה הוגנת. בקשו מהילד להסביר למה שינוי של כמה דברים יחד מקשה לדעת מה גרם לתוצאה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתכנון ניסוי הוגן: בידוד משתנה, מדידה מסודרת והסבר הקשר בין השינוי לתוצאה.",
            intentDescriptionEn:
              "Grade 5–6 experiment planning with isolated variables, controlled conditions, measurement, and causal explanation.",
          },
        },
      },
    },
    "S-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-03 default: use bucketOverrides (body) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-03 default: use bucketOverrides (body) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-03 default: use bucketOverrides (body) or engine fallback.",
        },
      },
      bucketOverrides: {
        body: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep body-system diagram recommendations null for grades 1–2 unless product evidence explicitly supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת תרשים פשוט של גוף או מערכת בעזרת סימון חלקים וכיוונים. בקשו מהילד להצביע על כל חלק, לומר מה התפקיד שלו, ולהסביר לאן משהו עובר או זורם בתרשים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת תרשימי גוף פשוטים: זיהוי חלקים, תפקידים וכיוון מעבר או זרימה.",
            intentDescriptionEn:
              "Grade 3–4 reading simple body/system diagrams: identify parts, roles, and direction of flow without medical conclusions.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל תרשימי מערכות בגוף דרך הקשר בין מבנה לתפקיד. בקשו מהילד להסביר מה כל חלק עושה, איך החלקים קשורים זה לזה, ואיך התרשים עוזר להבין את פעולת המערכת.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מערכות בגוף דרך תרשים: מבנה, תפקיד וקשר בין חלקים.",
            intentDescriptionEn:
              "Grade 5–6 body systems: connect structure to function and explain relationships between parts in a diagram.",
          },
        },
      },
    },
    "S-04": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-04 default: use bucketOverrides (materials) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-04 default: use bucketOverrides (materials) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-04 default: use bucketOverrides (materials) or engine fallback.",
        },
      },
      bucketOverrides: {
        materials: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep formal matter/conservation recommendations null for grades 1–2 unless concrete product evidence supports it.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מצבי צבירה בעזרת ציור או תרשים שמראה מה משתנה ומה נשאר. בקשו מהילד לתאר את החומר לפני ואחרי השינוי, ולבדוק אם מדובר בשינוי מצב ולא בהיעלמות של החומר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מצבי צבירה ובמעקב אחרי החומר לפני ואחרי שינוי.",
            intentDescriptionEn:
              "Grade 3–4 states of matter: track what changes and what remains using diagrams and observations.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שינויי מצב בחומר בעזרת תרשים חלקיקים או טבלת לפני אחרי. בקשו מהילד להסביר מה השתנה במצב החומר, מה נשמר, ואיך יודעים שהחומר לא נעלם אלא עבר שינוי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשינויי מצב ובשימור החומר, תוך שימוש בתרשים או טבלת נתונים.",
            intentDescriptionEn:
              "Grade 5–6 matter changes and conservation reasoning using particle diagrams or before/after tables.",
          },
        },
      },
    },
    "S-05": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-05 default: use bucketOverrides (materials) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-05 default: use bucketOverrides (materials) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-05 default: use bucketOverrides (materials) or engine fallback.",
        },
      },
      bucketOverrides: {
        materials: {
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל המרת יחידות פשוטות - למשל גרם לקילוגרם או מ\"ל לליטר - בעזרת טבלת המרה. בקשו מהילד להסביר איזו יחידה מתאימה למדידה ולמה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהמרת יחידות בסיסיות ובהסבר הבחירה ביחידה הנכונה.",
            intentDescriptionEn: "Grade 3–4 unit conversion with reference table and unit choice justification.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל המרות יחידות במספר שלבים - כתיבה, חישוב והשוואה - ולבקש מהילד לבדוק אם התוצאה הגיונית לפי סדרי הגודל.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהמרת יחידות, בדיקת הגיון התוצאה ובהסבר השלבים.",
            intentDescriptionEn: "Grade 5–6 multi-step unit conversion with reasonableness checks.",
          },
        },
      },
    },
    "S-06": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-06 default: use bucketOverrides (earth_space, experiments) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-06 default: use bucketOverrides (earth_space, experiments) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-06 default: use bucketOverrides (earth_space, experiments) or engine fallback.",
        },
      },
      bucketOverrides: {
        earth_space: {
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת ערך מגרף פשוט: מה מסמל כל ציר, איזו נקודה מתאימה לשאלה, ומה הערך שקוראים ממנה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת ערכים מגרף - זיהוי הצירים, הנקודה והערך.",
            intentDescriptionEn: "Grade 3–4 graph reading: axes, point location, value extraction.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין שני גרפים או בין נקודות על אותו גרף. בקשו מהילד להסביר מה כל ציר מייצג ואיך יודעים איזו נקודה עונה על השאלה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת והשוואת נתונים מגרפים עם נימוק לפי הצירים.",
            intentDescriptionEn: "Grade 5–6 graph comparison and axis-based reasoning.",
          },
        },
        experiments: {
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת טבלה או גרף של תוצאות ניסוי. בקשו מהילד לומר מה כל ציר או עמודה מייצגים ואיזה ערך מתאים לשאלה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת נתונים מטבלה או גרף של ניסוי.",
            intentDescriptionEn: "Grade 3–4 experiment data table/graph reading.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל ניתוח גרף של תוצאות ניסוי: מגמה, נקודות חריגות והסבר הקשר בין המשתנה לתוצאה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בניתוח גרף ניסוי והסבר הקשר בין משתנה לתוצאה.",
            intentDescriptionEn: "Grade 5–6 experiment graph analysis and variable-result link.",
          },
        },
      },
    },
    "S-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-08 default: use bucketOverrides (animals, experiments) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-08 default: use bucketOverrides (animals, experiments) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-08 default: use bucketOverrides (animals, experiments) or engine fallback.",
        },
      },
      bucketOverrides: {
        animals: {
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל שאלות שבהן צריך להצביע על מקור מידע - טקסט, תצפית או תרשים. בקשו מהילד לומר \"לפי מה יודעים?\" לפני התשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בביסוס תשובות על מקור מידע ברור.",
            intentDescriptionEn: "Grade 3–4 evidence/source grounding for animal-science claims.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הבחנה בין טענה שמבוססת על נתונים לבין ניחוש. בקשו מהילד לצטט את המשפט או הנתון שתומך בתשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בביסוס טענות על ראיות מהטקסט או מהנתונים.",
            intentDescriptionEn: "Grade 5–6 claim-evidence distinction in science texts.",
          },
        },
        experiments: {
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל שאלות \"מאין יודעים?\" בניסוי - מה נמדד, מה נצפה, ומה כתוב ביומן הניסוי.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בביסוס מסקנות על תצפית או רישום בניסוי.",
            intentDescriptionEn: "Grade 3–4 experiment evidence sourcing from observation/logs.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל כתיבת מסקנה שמציינת במפורש את הנתון שעליו היא מבוססת. בקשו מהילד להפריד בין \"חושבים\" לבין \"יודעים לפי הנתונים\".",
            goalTextHe:
              "בשבוע הקרוב התמקדו במסקנות מבוססות נתונים בניסוי.",
            intentDescriptionEn: "Grade 5–6 data-backed conclusions vs speculation.",
          },
        },
      },
    },
    "S-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-07 default: use bucketOverrides (environment) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-07 default: use bucketOverrides (environment) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn: "S-07 default: use bucketOverrides (environment) or engine fallback.",
        },
      },
      bucketOverrides: {
        environment: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep ecosystem/food-web recommendations null for grades 1–2 unless product evidence explicitly supports simple food-chain work.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קשרים בסביבה בעזרת שרשרת מזון פשוטה. בקשו מהילד להסביר מי ניזון ממי, מה מראה כל חץ, ואיך יודעים את התשובה לפי התרשים.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת קשרים בסביבה דרך שרשרת מזון פשוטה ושימוש בראיות מהתרשים.",
            intentDescriptionEn:
              "Grade 3–4 simple food-chain reasoning: who eats whom, what arrows show, and using diagram evidence.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל רשת מזון או מערכת אקולוגית בעזרת תרשים. בקשו מהילד לזהות יצרנים, צרכנים וקשרים בין יצורים, ולהסביר איך שינוי באחד החלקים יכול להשפיע על חלקים אחרים במערכת.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת מערכות אקולוגיות: קשרים ברשת מזון, זרימת אנרגיה והשפעה של שינוי במערכת.",
            intentDescriptionEn:
              "Grade 5–6 ecosystem reasoning with food webs, producers/consumers, energy flow, and system effects.",
          },
        },
      },
    },
  },
  "moledet-geography": {
    "MG-01": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-01 default: no approved parent copy; use bucketOverrides (maps, geography, mixed) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-01 default: no approved parent copy; use bucketOverrides (maps, geography, mixed) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-01 default: no approved parent copy; use bucketOverrides (maps, geography, mixed) or engine fallback.",
        },
      },
      bucketOverrides: {
        maps: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep map scale recommendations null for grades 1–2 until concrete early-map copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת קנה מידה במפה בעזרת סרגל או קו קנה מידה. בקשו מהילד להסביר מה מייצג המרחק במפה, להשוות בין שני מרחקים, ולבדוק שהתשובה מתאימה ליחידות במפה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת קנה מידה במפה ובהשוואת מרחקים בעזרת יחידות המפה.",
            intentDescriptionEn:
              "Grade 3–4 map scale and distance comparison using scale bars, map units, and simple measurement.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל חישוב והשוואת מרחקים במפות שונות בעזרת קנה מידה. בקשו מהילד לזהות את היחידות, להסביר איך המיר מרחק במפה למרחק במציאות, ולבדוק אם התוצאה סבירה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשימוש בקנה מידה לחישוב מרחקים ובהסבר הקשר בין המפה למציאות.",
            intentDescriptionEn:
              "Grade 5–6 map scale reasoning: convert and compare distances, track units, and check reasonableness.",
          },
        },
        geography: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep geography scale/distance recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל השוואת מרחקים בין מקומות במפה, תוך שימוש בקנה מידה או ביחידות שמופיעות במפה. בקשו מהילד להסביר איזה מקום קרוב יותר או רחוק יותר ולפי מה הוא קבע.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת מרחקים בין מקומות במפה בעזרת סימנים ויחידות מתאימות.",
            intentDescriptionEn:
              "Grade 3–4 geography distance comparison between places on a map using scale or map units.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל ניתוח מרחקים ואזורים במפה תוך שילוב קנה מידה, יחידות ונתונים נוספים. בקשו מהילד לנמק את ההשוואה בין מקומות ולהראות באיזה נתון במפה השתמש.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בניתוח מרחקים במפה ובהצגת ראיה מתוך המפה שמסבירה את התשובה.",
            intentDescriptionEn:
              "Grade 5–6 geography map-distance reasoning using scale, units, and evidence from the map.",
          },
        },
        mixed: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep mixed map-scale recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל שאלות מפה מעורבות שבהן צריך לזהות מרחק, יחידה או סימן במפה. בקשו מהילד לעצור לפני החישוב, לומר איזה נתון במפה חשוב, ורק אז לענות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי הנתון המתאים במפה לפני פתרון שאלת מרחק או השוואה.",
            intentDescriptionEn:
              "Grade 3–4 mixed map questions: identify the relevant map data before solving distance or comparison tasks.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל משימות מפה מעורבות שבהן משלבים קנה מידה, מרחקים ונתונים חזותיים. בקשו מהילד להסביר אילו נתונים בחר ולמה הם מספיקים כדי לענות.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בבחירת נתוני מפה מתאימים ובנימוק הדרך לפתרון.",
            intentDescriptionEn:
              "Grade 5–6 mixed map reasoning using scale, distances, visual data, and justification.",
          },
        },
      },
    },
    "MG-02": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-02 default: no approved parent copy; use bucketOverrides (maps, geography) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-02 default: no approved parent copy; use bucketOverrides (maps, geography) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-02 default: no approved parent copy; use bucketOverrides (maps, geography) or engine fallback.",
        },
      },
      bucketOverrides: {
        maps: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep map orientation recommendations null for grades 1–2 until concrete orientation copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל כיוונים במפה בעזרת חץ צפון ומפה פשוטה. בקשו מהילד לסמן איפה הצפון, להסביר לאיזה כיוון צריך ללכת, ולבדוק שהמפה לא סובבה את הכיוונים שהוא רגיל אליהם.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשימוש בחץ צפון ובזיהוי כיוונים במפה גם כשהמפה מסובבת.",
            intentDescriptionEn:
              "Grade 3–4 map orientation using north arrow, direction choice, and rotated map checks.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל התמצאות במפות שבהן הכיוונים אינם מוצגים בצורה רגילה. בקשו מהילד לזהות את חץ הצפון, להשוות בין כיוון במפה לכיוון במציאות, ולהסביר למה הבחירה שלו נכונה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהתמצאות במפה לפי צפון, כיוונים וייחוס מרחבי ברור.",
            intentDescriptionEn:
              "Grade 5–6 map orientation with north reference, rotated maps, and spatial justification.",
          },
        },
        geography: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep geography orientation recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל זיהוי כיוונים בין מקומות במפה בעזרת חץ צפון. בקשו מהילד להסביר אם מקום נמצא צפונה, דרומה, מזרחה או מערבה ביחס למקום אחר.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי כיוונים בין מקומות במפה בעזרת חץ צפון.",
            intentDescriptionEn:
              "Grade 3–4 geography orientation: describe relative directions between places using north reference.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואת מיקום וכיוון בין אזורים במפה. בקשו מהילד להשתמש בצפון כנקודת ייחוס, להסביר את היחס בין המקומות, ולבדוק שלא הסתמך רק על ימין ושמאל בדף.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בתיאור כיוונים ומיקומים במפה בעזרת נקודת ייחוס קבועה.",
            intentDescriptionEn:
              "Grade 5–6 geographic orientation using north as a stable reference, not page-left/page-right.",
          },
        },
      },
    },
    "MG-03": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-03 default: no approved parent copy; use bucketOverrides (citizenship) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-03 default: no approved parent copy; use bucketOverrides (citizenship) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-03 default: no approved parent copy; use bucketOverrides (citizenship) or engine fallback.",
        },
      },
      bucketOverrides: {
        citizenship: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep citizenship rights/responsibilities recommendations null for grades 1–2 until concrete early-civics copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מצבים מחיי היום יום שבהם צריך להבחין בין זכות, חובה או כלל. בקשו מהילד להסביר מה קרה במצב, מי מעורב, ואיזה סימן בטקסט עוזר לו למיין נכון.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין זכויות, חובות וכללים בעזרת דוגמאות קצרות ונימוק מתוך המצב המתואר.",
            intentDescriptionEn:
              "Grade 3–4 citizenship reasoning: sort short scenarios into rights, responsibilities, or rules using evidence from the situation.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל מושגים באזרחות דרך תרחישים קצרים והשוואה בין אפשרויות. בקשו מהילד לנמק האם מדובר בזכות, חובה, כלל או אחריות, ולהצביע על פרט מתוך הטקסט שתומך בתשובה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו במיון ונימוק של מצבים אזרחיים: זכות, חובה, כלל או אחריות, תוך שימוש בראיות מהטקסט.",
            intentDescriptionEn:
              "Grade 5–6 civic concepts through scenario classification, justification, and evidence from text.",
          },
        },
      },
    },
    "MG-04": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-04 default: no approved parent copy; use bucketOverrides (homeland) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-04 default: no approved parent copy; use bucketOverrides (homeland) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-04 default: no approved parent copy; use bucketOverrides (homeland) or engine fallback.",
        },
      },
      bucketOverrides: {
        homeland: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep timeline/order recommendations null for grades 1–2 until early sequence copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל סידור אירועים לפי סדר זמן בעזרת תאריכים, מילים כמו לפני ואחרי, או כרטיסיות אירועים. בקשו מהילד להסביר איזה אירוע קרה קודם ומה הראיה לכך.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בסידור אירועים לפי רצף זמן ובהסבר לפי תאריכים או רמזים בטקסט.",
            intentDescriptionEn:
              "Grade 3–4 timeline and event order using dates, before/after clues, and evidence.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל בניית ציר זמן של אירועים ולנמק את הסדר שלהם לפי תאריכים, מקורות או רמזים בטקסט. בקשו מהילד לבדוק אם שינוי בסדר משנה את ההבנה של הסיפור או התהליך.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בבניית ציר זמן, נימוק סדר האירועים ובדיקת הקשר בין האירועים.",
            intentDescriptionEn:
              "Grade 5–6 timeline construction, chronological justification, and understanding event relationships.",
          },
        },
      },
    },
    "MG-05": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-05 default: no approved parent copy; use bucketOverrides (geography) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-05 default: no approved parent copy; use bucketOverrides (geography) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-05 default: no approved parent copy; use bucketOverrides (geography) or engine fallback.",
        },
      },
      bucketOverrides: {
        geography: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep climate/region map recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת מפת אקלים או אזורים בעזרת מקרא המפה. בקשו מהילד לזהות צבע או סימן במפה, לבדוק מה הוא אומר במקרא, ולהסביר לפי זה לאיזה אזור המקום שייך.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בשימוש במקרא מפה לזיהוי אזורים, צבעים וסימנים גאוגרפיים.",
            intentDescriptionEn:
              "Grade 3–4 climate/region map reading using map key colors and symbols.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל השוואה בין אזורים גאוגרפיים בעזרת מפת אקלים, מקרא ונתונים מהטקסט. בקשו מהילד להסביר מה מאפיין כל אזור ולתמוך בתשובה בעזרת סימן או צבע מהמפה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהשוואת אזורים גאוגרפיים בעזרת מקרא, צבעים, סימנים וראיות מהמפה.",
            intentDescriptionEn:
              "Grade 5–6 comparing geographic or climate regions using legend, colors, symbols, and evidence from maps/text.",
          },
        },
      },
    },
    "MG-06": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-06 default: no approved parent copy; use bucketOverrides (homeland, values) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-06 default: no approved parent copy; use bucketOverrides (homeland, values) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-06 default: no approved parent copy; use bucketOverrides (homeland, values) or engine fallback.",
        },
      },
      bucketOverrides: {
        homeland: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep homeland cause/effect recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל שאלות של סיבה ותוצאה בעזרת שני הסברים אפשריים. בקשו מהילד לומר מה קרה, מה יכול היה לגרום לכך, ואיזה פרט בטקסט או במפה תומך בהסבר שלו.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקישור בין סיבה לתוצאה ובהבאת ראיה מתוך טקסט או מפה.",
            intentDescriptionEn:
              "Grade 3–4 homeland cause-effect reasoning using two explanations and evidence from text or map.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל הסבר של תהליכים באוכלוסייה או בהתיישבות בעזרת ראיות. בקשו מהילד להשוות בין שני הסברים, לבחור את ההסבר שמתאים יותר לנתונים, ולנמק בלי להסתמך על דעה כללית.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהסבר סיבה ותוצאה בנושאי אוכלוסייה והתיישבות, תוך שימוש בראיות מהנתונים.",
            intentDescriptionEn:
              "Grade 5–6 population/settlement cause-effect reasoning using evidence and avoiding unsupported generalizations.",
          },
        },
        values: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn: "Keep values/social explanation recommendations null for grades 1–2.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל מצבים חברתיים או קהילתיים שבהם צריך להסביר למה משהו קרה. בקשו מהילד להפריד בין עובדה שמופיעה בטקסט לבין דעה, ולמצוא פרט שתומך בהסבר שלו.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבחנה בין עובדה לדעה ובהסבר מצבים בעזרת ראיות.",
            intentDescriptionEn:
              "Grade 3–4 values/community reasoning: distinguish fact from opinion and support explanations with evidence.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל דיון במצבים חברתיים בעזרת ראיות ולא לפי הכללות. בקשו מהילד להסביר מה העובדות הידועות, מה המסקנה שלו, ואיזה פרט תומך בה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהסקת מסקנות זהירה במצבים חברתיים, תוך שימוש בעובדות וראיות.",
            intentDescriptionEn:
              "Grade 5–6 values/social reasoning: use evidence carefully and avoid unsupported generalizations.",
          },
        },
      },
    },
    "MG-07": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-07 default: no approved parent copy; use bucketOverrides (community) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-07 default: no approved parent copy; use bucketOverrides (community) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-07 default: no approved parent copy; use bucketOverrides (community) or engine fallback.",
        },
      },
      bucketOverrides: {
        community: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep community-institution recommendations null for grades 1–2 until concrete community copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל התאמה בין מוסדות בקהילה לבין התפקיד שלהם, כמו בית ספר, מרפאה, עירייה או ספרייה. בקשו מהילד להסביר מי נעזר במוסד, מה השירות שהוא נותן, ולמה זה מתאים לתפקיד שלו.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בזיהוי מוסדות בקהילה ובהבנת התפקיד של כל מוסד לפי דוגמאות מוכרות.",
            intentDescriptionEn:
              "Grade 3–4 community institutions: match institutions to roles and explain who uses them and what service they provide.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל ניתוח של מוסדות בקהילה לפי תפקיד, אחריות והשפעה על התושבים. בקשו מהילד להסביר איזה צורך המוסד נותן לו מענה, מי אחראי עליו, ואיך הוא קשור לחיי הקהילה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בהבנת תפקידי מוסדות בקהילה, האחריות שלהם וההשפעה שלהם על התושבים.",
            intentDescriptionEn:
              "Grade 5–6 community institutions: roles, responsibilities, services, and impact on residents.",
          },
        },
      },
    },
    "MG-08": {
      defaultBands: {
        g1_g2: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-08 default: no approved parent copy; use bucketOverrides (maps) or engine fallback.",
        },
        g3_g4: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-08 default: no approved parent copy; use bucketOverrides (maps) or engine fallback.",
        },
        g5_g6: {
          actionTextHe: null,
          goalTextHe: null,
          intentDescriptionEn:
            "MG-08 default: no approved parent copy; use bucketOverrides (maps) or engine fallback.",
        },
      },
      bucketOverrides: {
        maps: {
          g1_g2: {
            actionTextHe: null,
            goalTextHe: null,
            intentDescriptionEn:
              "Keep map-symbol recommendations null for grades 1–2 until concrete legend copy is approved.",
          },
          g3_g4: {
            actionTextHe:
              "כדאי לתרגל קריאת סימנים במפה בעזרת המקרא. בקשו מהילד לבחור סימן אחד, לבדוק מה הוא מייצג במקרא, ולהסביר איך הסימן עוזר להבין את המפה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בקריאת סימנים ומקרא במפה ובהסבר המשמעות של כל סימן.",
            intentDescriptionEn:
              "Grade 3–4 map symbols and legend reading: match symbols to meanings and explain their role.",
          },
          g5_g6: {
            actionTextHe:
              "כדאי לתרגל שימוש במקרא מפה כדי לפרש נוף, אזורים וסימנים שונים. בקשו מהילד לזהות כמה סימנים, להסביר מה כל אחד מייצג, ולבדוק איך הם יחד עוזרים להבין את המפה.",
            goalTextHe:
              "בשבוע הקרוב התמקדו בפירוש סימנים במפה ובהבנת הקשר ביניהם לבין הנוף או האזור.",
            intentDescriptionEn:
              "Grade 5–6 map-symbol interpretation using legends, multiple symbols, and landscape/region reasoning.",
          },
        },
      },
    },
  },
  history: {
    "H-01": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-01: G6-only history; lower bands null." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-01: G6-only history; lower bands null." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-01 default: use bucketOverrides or engine fallback." },
      },
      bucketOverrides: {
        what_is_history: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבחנה בין מושגים היסטוריים בסיסיים, כמו מקור ראשוני ומקור משני, ולהסביר בפשטות מה כל מושג אומר.",
            goalTextHe: "בשבוע הקרוב התמקדו בהגדרת מושגים היסטוריים ובהסבר ההבדל ביניהם.",
            intentDescriptionEn: "Grade 6 historical concepts and source terminology.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי מושגים היסטוריים במגוון נושאים, ולבקש מהילד להסביר כל מושג במילים שלו.",
            goalTextHe: "בשבוע הקרוב התמקדו במושגים היסטוריים מתוך תרגול מעורב.",
            intentDescriptionEn: "Grade 6 mixed historical concept identification.",
          },
        },
      },
    },
    "H-02": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-02: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-02: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-02 default: use bucketOverrides." },
      },
      bucketOverrides: {
        hasmonaeans: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל סידור אירועים בציר זמן של תקופת החשמונאים. בקשו מהילד לסדר כרטיסיות אירועים ולהסביר מה קרה לפני ואחרי.",
            goalTextHe: "בשבוע הקרוב התמקדו ברצף אירועים וציר זמן בתקופת החשמונאים.",
            intentDescriptionEn: "Grade 6 Hasmonaean timeline sequencing.",
          },
        },
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל סידור אירועים מרכזיים בתקופת רומא והיהודים, כמו עליית רומא, חורבן ויבנה, לפי סדר כרונולוגי.",
            goalTextHe: "בשבוע הקרוב התמקדו בציר זמן של רומא והיהודים.",
            intentDescriptionEn: "Grade 6 Rome/Judea timeline sequencing.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל סידור אירועים היסטוריים על ציר זמן, תוך שימוש בתאריכים או שלבים ברורים מהשיעור.",
            goalTextHe: "בשבוע הקרוב התמקדו ברצף אירועים וציר זמן.",
            intentDescriptionEn: "Grade 6 mixed timeline sequencing.",
          },
        },
      },
    },
    "H-03": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-03: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-03: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-03 default: use bucketOverrides." },
      },
      bucketOverrides: {
        hellenism_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל קשרי סיבה ותוצאה במפגש בין ההלניזם ליהדות. בקשו מהילד להסביר מה גרם למה ומה היו התוצאות.",
            goalTextHe: "בשבוע הקרוב התמקדו בסיבה ותוצאה בתקופת ההלניזם והיהודים.",
            intentDescriptionEn: "Grade 6 Hellenism/Judaism cause-effect.",
          },
        },
        hasmonaeans: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבנת הקשר בין גזרות, מרד ותוצאות בתקופת החשמונאים, עם הסבר מילולי.",
            goalTextHe: "בשבוע הקרוב התמקדו בסיבה ותוצאה בתקופת החשמונאים.",
            intentDescriptionEn: "Grade 6 Hasmonaean cause-effect.",
          },
        },
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל ניתוח סיבות ותוצאות של אירועים מרכזיים, כמו המרד הגדול וחורבן בית המקדש.",
            goalTextHe: "בשבוע הקרוב התמקדו בסיבה ותוצאה בתקופת רומא והיהודים.",
            intentDescriptionEn: "Grade 6 Rome/Judea cause-effect.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי סיבה ותוצאה באירועים היסטוריים, ולבקש מהילד להסביר את הקשר בין שני אירועים.",
            goalTextHe: "בשבוע הקרוב התמקדו בסיבה ותוצאה בתרגול מעורב.",
            intentDescriptionEn: "Grade 6 mixed cause-effect.",
          },
        },
      },
    },
    "H-04": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-04: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-04: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-04 default: use bucketOverrides." },
      },
      bucketOverrides: {
        classical_greece: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל השוואה בין אתונה לספרטה לפי קריטריונים ברורים, כמו שלטון, חיים יומיומיים וערכים.",
            goalTextHe: "בשבוע הקרוב התמקדו בהשוואה בין אתונה לספרטה.",
            intentDescriptionEn: "Grade 6 Athens/Sparta comparison.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל השוואה בין שני מוסדות, דמויות או תרבויות, תוך הצגת דמיון והבדל.",
            goalTextHe: "בשבוע הקרוב התמקדו בהשוואה היסטורית מבוססת קריטריונים.",
            intentDescriptionEn: "Grade 6 mixed historical comparison.",
          },
        },
      },
    },
    "H-05": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-05: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-05: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-05 default: use bucketOverrides." },
      },
      bucketOverrides: {
        hellenism_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי דמויות מרכזיות והתפקיד שלהן, כמו אלכסנדר מוקדון, ולהסביר מה עשתה כל דמות.",
            goalTextHe: "בשבוע הקרוב התמקדו בדמויות ותפקידן בתקופת ההלניזם.",
            intentDescriptionEn: "Grade 6 Hellenism figures and roles.",
          },
        },
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל התאמת דמויות כמו הורדוס או מנהיגי המרד לתפקידם ההיסטורי, עם הסבר קצר.",
            goalTextHe: "בשבוע הקרוב התמקדו בדמויות ותפקידן בתקופת רומא והיהודים.",
            intentDescriptionEn: "Grade 6 Rome/Judea figures and roles.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי דמויות היסטוריות והסבר תפקידן, בלי לבלבל בין דמויות דומות.",
            goalTextHe: "בשבוע הקרוב התמקדו בדמויות ותפקידן.",
            intentDescriptionEn: "Grade 6 mixed figures and roles.",
          },
        },
      },
    },
    "H-06": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-06: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-06: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-06 default: use bucketOverrides." },
      },
      bucketOverrides: {
        classical_greece: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבנת מוסדות שלטון, כמו דמוקרטיה באתונה, והסבר איך הם פעלו.",
            goalTextHe: "בשבוע הקרוב התמקדו בשלטון ומוסדות ביוון הקלאסית.",
            intentDescriptionEn: "Grade 6 classical Greece governance.",
          },
        },
        hasmonaeans: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבנת מבנה ממלכת החשמונאים ותפקידי השלטון בה.",
            goalTextHe: "בשבוע הקרוב התמקדו בשלטון ומוסדות בתקופת החשמונאים.",
            intentDescriptionEn: "Grade 6 Hasmonaean governance.",
          },
        },
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבנת שלטון רומי ומעמד יהודה כפרובינציה, כולל תפקידי שלטון מקומי.",
            goalTextHe: "בשבוע הקרוב התמקדו בשלטון ומוסדות בתקופת רומא והיהודים.",
            intentDescriptionEn: "Grade 6 Roman/Judean governance.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל התאמת מוסדות שלטון לתפקידם, ולהימנע מבלבול בין מערכות שונות.",
            goalTextHe: "בשבוע הקרוב התמקדו בשלטון ומוסדות.",
            intentDescriptionEn: "Grade 6 mixed governance institutions.",
          },
        },
      },
    },
    "H-07": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-07: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-07: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-07 default: use bucketOverrides." },
      },
      bucketOverrides: {
        classical_greece: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי מרכיבי תרבות יוונית והשפעתם על העולם, עם דוגמאות מהשיעור.",
            goalTextHe: "בשבוע הקרוב התמקדו בתרבות ומורשת יוון הקלאסית.",
            intentDescriptionEn: "Grade 6 Greek culture and legacy.",
          },
        },
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הבנת תרבות ומורשת רומית, וכיצד היא השפיעה על ארץ ישראל.",
            goalTextHe: "בשבוע הקרוב התמקדו בתרבות ומורשת רומית.",
            intentDescriptionEn: "Grade 6 Roman culture and legacy.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי השפעות תרבותיות ומורשת מהעבר, עם דוגמאות קונקרטיות.",
            goalTextHe: "בשבוע הקרוב התמקדו בתרבות ומורשת.",
            intentDescriptionEn: "Grade 6 mixed culture and heritage.",
          },
        },
      },
    },
    "H-08": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-08: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-08: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-08 default: use bucketOverrides." },
      },
      bucketOverrides: {
        what_is_history: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל קריאת מקור היסטורי פשוט ולהסביר מה אפשר ללמוד ממנו. בקשו מהילד לציין פרט אחד מהמקור שתומך בתשובה.",
            goalTextHe: "בשבוע הקרוב התמקדו בהבנת מקור היסטורי פשוט.",
            intentDescriptionEn: "Grade 6 simple historical source reading.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל זיהוי מה המקור אומר ומה אפשר להסיק ממנו, בלי להוסיף מידע שלא מופיע.",
            goalTextHe: "בשבוע הקרוב התמקדו בהבנת מקורות היסטוריים.",
            intentDescriptionEn: "Grade 6 mixed source comprehension.",
          },
        },
      },
    },
    "H-09": {
      defaultBands: {
        g1_g2: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-09: G6-only." },
        g3_g4: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-09: G6-only." },
        g5_g6: { actionTextHe: null, goalTextHe: null, intentDescriptionEn: "H-09 default: use bucketOverrides." },
      },
      bucketOverrides: {
        rome_jews: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל קישור בין אירועים מהעבר, כמו יבנה ומרכז יהודי בבבל, לבין השפעתם על היום.",
            goalTextHe: "בשבוע הקרוב התמקדו בקשר בין עבר להווה בתקופת רומא והיהודים.",
            intentDescriptionEn: "Grade 6 past-present link in Rome/Judea period.",
          },
        },
        mixed: {
          g5_g6: {
            actionTextHe: "כדאי לתרגל הסבר איך אירוע היסטורי משפיע על ההווה, עם דוגמה מהשיעור.",
            goalTextHe: "בשבוע הקרוב התמקדו בקשר בין עבר להווה.",
            intentDescriptionEn: "Grade 6 mixed past-present link.",
          },
        },
      },
    },
  },
};
