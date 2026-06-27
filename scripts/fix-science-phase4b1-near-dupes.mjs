#!/usr/bin/env node
/**
 * Rewrite exact duplicate stems in science-questions-phase4b1.js (template clones).
 * Keeps canonical IDs; replaces duplicate rows with distinct science MCQs.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "data/science-questions-phase4b1.js");

const REWRITES = {
  p4b1_g6_materials_003: {
    stem: "מה דוגמה לשינוי פיזיקלי שלא יוצר חומר חדש?",
    options: [
      "אידוי מים והפיכתם לקיטור",
      "שריפת נייר שיוצרת אפר",
      "המלחה של ברזל שיוצרת חלודה",
      "התגובה בין חומצה לבסיס שיוצרת מלח",
    ],
    correctIndex: 0,
    explanation: "באידוי המים נשארים מים — רק מצב הצבירה משתנה.",
  },
  p4b1_g6_materials_004: {
    stem: "איך ערבוב המים משפיע על התמוססות מלח?",
    options: [
      "מגביר מגע בין חלקיקי המלח לבין המים",
      "משנה את סוג המלח לחומר אחר",
      "מבטל את הצורך בטמפרטורה לגמרי",
      "גורם למלח לא להימס בכלל",
    ],
    correctIndex: 0,
    explanation: "ערבוב מפיץ את החלקיקים ומאיץ את התמוססות.",
  },
  p4b1_g6_materials_005: {
    stem: "איזה מהבאים הוא שינוי כימי?",
    options: [
      "שריפת עץ שיוצרת אפר וגזים חדשים",
      "התכת קרח למים נוזלים",
      "שבירת זכוכית לחתיכות",
      "אידוי מים מכוס",
    ],
    correctIndex: 0,
    explanation: "בשינוי כימי נוצרים חומרים חדשים שלא ניתן להחזיר בקלות.",
  },
  p4b1_g6_materials_006: {
    stem: "למה מלח בגרגרים גדולים נמס לאט יותר ממלח טחון?",
    options: [
      "פחות פני שטח חשופים לאותה כמות חומר",
      "גרגרים גדולים הם חומר שונה לגמרי",
      "מים לא יכולים לגעת בגרגרים גדולים",
      "טמפרטורה לא משפיעה על גרגרים גדולים",
    ],
    correctIndex: 0,
    explanation: "פני שטח קטנים יותר מאטים את קצב ההתמוססות.",
  },
  p4b1_g6_materials_007: {
    stem: "כשמים מתאדים — מה סוג השינוי?",
    options: [
      "שינוי פיזיקלי — המים נשארים מים",
      "שינוי כימי — נוצר חומר חדש",
      "המים נעלמים לגמרי מהיקום",
      "המים הופכים לאוויר מסוג אחר",
    ],
    correctIndex: 0,
    explanation: "אידוי הוא מעבר בין מצבי צבירה בלי שינוי זהות החומר.",
  },
  p4b1_g6_materials_008: {
    stem: "מה יקרה לקצב התמוססות אם מחממים את המים?",
    options: [
      "התמוססות מהירה יותר כי החלקיקים זזים מהר יותר",
      "התמוססות נעצרת לגמרי",
      "המים הופכים לחומר שאינו נמס",
      "רק צבע המים קובע את המהירות",
    ],
    correctIndex: 0,
    explanation: "חום מגביר תנועת חלקיקים ומאיץ תהליכים כמו התמוססות.",
  },
  p4b1_g6_earth_004: {
    stem: "מדוע גשם חשוב במחזור המים?",
    options: [
      "הוא מחזיר מים לאדמה ולנחלים אחרי אידוי והתעבות",
      "הוא יוצר מים חדשים שלא היו קודם",
      "הוא קורה רק פעם בשנה בלי קשר לאידוי",
      "הוא מונע לחלוטין את אידוי הים",
    ],
    correctIndex: 0,
    explanation: "גשם הוא שלב במחזור שמחזיר מים מהאוויר ליבשה.",
  },
  p4b1_g6_earth_005: {
    stem: "מה קורה לאורך היום בין קיץ לחורף בישראל?",
    options: [
      "בקיץ הימים ארוכים יותר ובחורף קצרים יותר",
      "אורך היום זהה בכל העונות",
      "בחורף הימים תמיד ארוכים יותר מהקיץ",
      "השמש לא קשורה לאורך היום",
    ],
    correctIndex: 0,
    explanation: "זווית השמש ומסלולה משפיעים על אורך היום והלילה.",
  },
  p4b1_g6_earth_006: {
    stem: "למה פני כדור הארץ מתחממים ביום?",
    options: [
      "אנרגיית אור מהשמש נקלטת בקרקע ובאוויר",
      "כדור הארץ מייצר אור משלו ביום",
      "הירח מחמם את היבשה ביום",
      "החום מגיע רק מהרוחות בלי קשר לשמש",
    ],
    correctIndex: 0,
    explanation: "קרינת השמש היא מקור העיקרי לחימום פני כדור הארץ ביום.",
  },
  p4b1_g6_earth_007: {
    stem: "לאן מגיעים מים שזורמים בנחל לים?",
    options: [
      "הם נכנסים לים ויכולים לחזור לאוויר באידוי",
      "הם נעלמים לגמרי ולא חוזרים למחזור",
      "הם נשארים רק בתוך הים בלי תנועה",
      "הם הופכים לאבן ולא זורמים יותר",
    ],
    correctIndex: 0,
    explanation: "מים בים ממשיכים במחזור — כולל אידוי והתעבות.",
  },
  p4b1_g6_earth_008: {
    stem: "מה מסביר רוחות חזקות יותר ליד הים בקיץ?",
    options: [
      "הבדלי חום בין יבשה לים יוצרים תנועת אוויר",
      "הים לא משפיע על הרוח בכלל",
      "רק גובה ההרים קובע את הרוח ליד הים",
      "הרוח נוצרת רק בחורף ולא בקיץ",
    ],
    correctIndex: 0,
    explanation: "הבדלי טמפרטורה בין יבשה לים מניעים רוחות עונתיות.",
  },
  p4b1_g6_env_003: {
    stem: "מה עלול לקרות אם מין אחד נעלם משרשרת מזון?",
    options: [
      "מינים שתלויים בו עלולים להיפגע או להיעלם",
      "שום דבר לא משתנה בשרשרת",
      "מגוון ביולוגי תמיד גדל אחרי היעלמות מין",
      "רק הצמחים מושפעים, לא בעלי חיים",
    ],
    correctIndex: 0,
    explanation: "כל מין קשור לאחרים — היעלמות מין אחד משבשת את המערכת.",
  },
  p4b1_g6_env_004: {
    stem: "מה מקור נפוץ לזיהום אוויר בערים?",
    options: [
      "פליטות מכוניות, תעשייה ושריפת דלקים",
      "רק עצים שגדלים בפארק",
      "גשם בלבד בלי קשר לפעילות אנושית",
      "רוח מהים שמנקה תמיד את האוויר",
    ],
    correctIndex: 0,
    explanation: "פעילות אנושית מוסיפה חומרים מזהמים לאוויר.",
  },
  p4b1_g6_env_005: {
    stem: "מה דוגמה לשמירה על מגוון ביולוגי בפארק?",
    options: [
      "שמירה על ביצות, יערות ושטחים פתוחים יחד",
      "נטיעת מין אחד בלבד בכל השטח",
      "הרס כל הצמחייה כדי לבנות",
      "מניעת כניסת כל בעל חיים לפארק",
    ],
    correctIndex: 0,
    explanation: "מגוון בתי גידול תומך במגוון מינים.",
  },
  p4b1_g6_env_006: {
    stem: "איך אפשר להפחית זיהום אוויר ביום-יום?",
    options: [
      "נסיעה בתחבורה ציבורית, הליכה או שימוש באופניים",
      "להדליק יותר מדורות בחוץ",
      "להשאיר מכונית דולקת בלי נסיעה",
      "לשרוף פסולת בחצר",
    ],
    correctIndex: 0,
    explanation: "פחות פליטות מרכבים מצמצמות זיהום אוויר.",
  },
  p4b1_g6_env_007: {
    stem: "למה כריתת יערות פוגעת במגוון ביולוגי?",
    options: [
      "היא מסירה בתי גידול ומינים רבים מאבדים מקום לחיות",
      "היא תמיד מגדילה את מספר המינים",
      "עצים לא קשורים לבעלי חיים",
      "יערות נוצרים מחדש תוך יום אחד",
    ],
    correctIndex: 0,
    explanation: "יערות מספקים מקום מחיה לרבים — כריתה מצמצמת מגוון.",
  },
  p4b1_g4_earth_space_003: {
    stem: "מה אופייני למזג האוויר בחורף בישראל?",
    options: [
      "ימים קצרים יותר, גשמים וטמפרטורות נמוכות יחסית",
      "חום קיצוני בלי גשם בכלל",
      "רק שלג בכל הארץ",
      "לילה ארוך בלי שינוי ביום",
    ],
    correctIndex: 0,
    explanation: "בחורף בישראל יורד גשם ויש ימים קצרים יותר.",
  },
  p4b1_g4_earth_space_004: {
    stem: "מה עוזר למנוע סחף קרקע במדרון?",
    options: [
      "צמחייה שמחזיקה את האדמה בשורשים",
      "הסרת כל הצמחים מהמדרון",
      "שפיכת שמן על הקרקע",
      "בנייה על המדרון בלי תכנון",
    ],
    correctIndex: 0,
    explanation: "שורשים מייצבים קרקע ומפחיתים זרימת בוץ בגשם.",
  },
  p4b1_g4_earth_space_005: {
    stem: "מתי יורד בדרך כלל הכי הרבה גשם באזור הים התיכון?",
    options: [
      "בחורף, כשמזג האוויר קריר ולח יותר",
      "רק באמצע הקיץ היבש",
      "רק בלילה בלי קשר לעונה",
      "רק בחודש אחד קבוע בלי שינוי",
    ],
    correctIndex: 0,
    explanation: "עונת הגשמים בישראל מרוכזת בחורף.",
  },
  p4b1_g4_earth_space_006: {
    stem: "מה עלול לקרות לנחל אחרי גשם חזק באזור מגובש?",
    options: [
      "עלייה בזרימת המים וסחף של אדמה ועצים",
      "הנחל נעלם לגמרי",
      "המים קופאים מיד",
      "אין שום שינוי בזרימה",
    ],
    correctIndex: 0,
    explanation: "גשם חזק מגביר זרימה ועלול לגרור חומרים.",
  },
  p4b1_g4_environment_003: {
    stem: "מה עלול לקרות לבעלי חיים בטבע אם משאירים אשפה?",
    options: [
      "הם עלולים להיבלע או להתבלבל ולחשוב שזה מזון",
      "האשפה נעלמת תוך שעה",
      "אשפה תמיד מועילה לחיות",
      "רק הצמחים נפגעים, לא בעלי חיים",
    ],
    correctIndex: 0,
    explanation: "פסולת בטבע מסכנת בעלי חיים ומזהמת את הסביבה.",
  },
  p4b1_g4_environment_005: {
    stem: "איזו פעולה שומרת על נקיון יער אחרי ביקור?",
    options: [
      "לאסוף את כל הפסולת ולהוציא אותה מהיער",
      "להטמין פסולת מתחת לעץ",
      "לזרוק שאריות אוכל לעצים",
      "לשרוף פסולת בתוך היער",
    ],
    correctIndex: 0,
    explanation: "לוקחים איתנו את כל האשפה כדי לא לפגוע בטבע.",
  },
};

function patchField(block, field, value, isArray = false) {
  if (field === "stem") {
    const re = /"stem"\s*:\s*"[^"]*"/;
    return block.replace(re, `"stem": ${JSON.stringify(value)}`);
  }
  if (field === "options") {
    const re = /"options"\s*:\s*\[[\s\S]*?\]/;
    const formatted = `"options": [\n      ${value.map((o) => JSON.stringify(o)).join(",\n      ")}\n    ]`;
    return block.replace(re, formatted);
  }
  if (field === "correctIndex") {
    return block.replace(/"correctIndex"\s*:\s*\d+/, `"correctIndex": ${value}`);
  }
  if (field === "explanation") {
    const re = /"explanation"\s*:\s*"[^"]*"/;
    if (re.test(block)) {
      return block.replace(re, `"explanation": ${JSON.stringify(value)}`);
    }
  }
  return block;
}

let text = await readFile(FILE, "utf8");
let count = 0;

for (const [id, fix] of Object.entries(REWRITES)) {
  const idRe = new RegExp(`"id"\\s*:\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  const m = idRe.exec(text);
  if (!m) {
    console.warn("missing", id);
    continue;
  }
  const start = m.index;
  const nextId = text.indexOf('"id":', start + 10);
  const end = nextId > start ? nextId : text.length;
  let block = text.slice(start, end);
  block = patchField(block, "stem", fix.stem);
  block = patchField(block, "options", fix.options);
  block = patchField(block, "correctIndex", fix.correctIndex);
  if (fix.explanation) block = patchField(block, "explanation", fix.explanation);
  text = text.slice(0, start) + block + text.slice(end);
  count++;
}

await writeFile(FILE, text);
console.log(`fix-science-phase4b1-near-dupes: patched ${count} questions`);
