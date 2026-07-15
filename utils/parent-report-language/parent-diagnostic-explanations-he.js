/**
 * Owner-approved parent diagnostic explanations (parent report only).
 * Renders only when status === "approved" and the engine diagnosed the finding.
 *
 * Do not invent Hebrew at runtime. Add entries only after explicit owner approval.
 */

/**
 * @typedef {"approved" | "waived" | "review"} ParentDiagnosticExplanationStatus
 */

/**
 * @typedef {{
 *   lookupKey: string;
 *   explanationHe: string;
 *   exampleHe?: string | null;
 *   status: ParentDiagnosticExplanationStatus;
 *   approvalSource?: string;
 * }} ParentDiagnosticExplanationEntry
 */

/**
 * @typedef {{
 *   lookupKey: string;
 *   explanationHe: string;
 *   exampleHe: string | null;
 * }} ParentDiagnosticExplanationV1
 */

/** Mathematics taxonomy M-01 … M-10 — owner_math_batch_approved only. */
/** @type {ParentDiagnosticExplanationEntry[]} */
const PARENT_DIAGNOSTIC_EXPLANATION_CATALOG = [
  {
    lookupKey: "finding:taxonomy:M-01",
    explanationHe:
      "המערכת זיהתה קושי בפירוק מספר לעשרות ואחדות. הכוונה היא להבין שמספר מורכב מעשרות ואחדות, כדי להשתמש בזה בחישוב.",
    exampleHe: "14 = 10 + 4",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-02",
    explanationHe:
      "המערכת זיהתה קושי בחיבור שבו צריך להעביר עשרת לעמודה הבאה. זה קורה כשמחברים ספרות ומתקבל מספר גדול מ 9.",
    exampleHe: "27 + 18",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-03",
    explanationHe:
      "המערכת זיהתה קושי בשליפה של תרגילי כפל בסיסיים. הכוונה היא לזוגות מספרים בכפל שכדאי לדעת במהירות ובדיוק, בלי לחשב מההתחלה בכל פעם.",
    exampleHe: "7 × 8",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-04",
    explanationHe:
      "המערכת זיהתה קושי בהבנה ששבר מייצג חלק מתוך שלם. חשוב להבין שהמספר התחתון אומר לכמה חלקים השלם חולק, והמספר העליון אומר כמה חלקים נלקחו.",
    exampleHe: "2/3",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-05",
    explanationHe:
      "המערכת זיהתה קושי בחיבור או חיסור שברים כשצריך להביא אותם לאותו מכנה לפני החישוב. כלומר, לא מחברים מיד את המונים והמכנים, אלא קודם כותבים את השברים באותו סוג חלקים.",
    exampleHe: "1/2 + 1/3",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-06",
    explanationHe:
      "המערכת זיהתה קושי בעיגול או בהשוואה של מספרים עשרוניים. הכוונה היא להבין את הספרות שאחרי הנקודה ולדעת לפי איזו ספרה מחליטים אם לעגל למעלה או להשאיר.",
    exampleHe: "4.67 → 4.7",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-07",
    explanationHe:
      "המערכת זיהתה קושי בהתאמת יחידת המידה לתשובה. ייתכן שהחישוב המספרי נכון, אבל צריך לבדוק אם התשובה צריכה להיות בקילוגרמים, מטרים, שקלים, דקות וכדומה.",
    exampleHe: "5 ק״מ / 5 ק״ג",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-08",
    explanationHe:
      "המערכת זיהתה קושי בפתרון בעיות מילוליות שיש בהן יותר משלב אחד. הכוונה היא לזהות מה צריך לעשות קודם, להשתמש בתוצאה, ואז להמשיך לשלב הבא.",
    exampleHe: "קנייה + עודף",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-09",
    explanationHe:
      "המערכת זיהתה קושי בשימוש בעשר הקרובה כדי לחשב חיסור. הכוונה היא לפרק את החיסור לצעדים קטנים, קודם להגיע לעשר ואז להמשיך לחסר.",
    exampleHe: "13 - 5",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:M-10",
    explanationHe:
      "המערכת זיהתה קושי בהבנת הקשר בין חילוק לכפל. כלומר, להשתמש בכפל כדי לבדוק תרגיל חילוק או לבחור את הפעולה המתאימה.",
    exampleHe: "12 ÷ 3 = 4; 4 × 3 = 12",
    status: "approved",
    approvalSource: "owner_math_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-01",
    explanationHe:
      "המערכת זיהתה קושי בהבחנה בין תכונות של מרובעים. הכוונה היא לדעת אילו צלעות מקבילות, אילו זוויות ישרות, ומה ההבדל בין מלבן, ריבוע ומקבילית.",
    exampleHe: "מלבן / מקבילית",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-02",
    explanationHe:
      "המערכת זיהתה קושי בקריאת זווית בעזרת משקף. הכוונה היא להצמיד נכון את מרכז המשקף ואת קו האפס, ואז לקרוא את המספר מהסולם המתאים.",
    exampleHe: "40°",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-03",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי הגובה המתאים לחישוב שטח. בגאומטריה גובה הוא קו שניצב לבסיס, ולא תמיד הצלע שנראית הכי ארוכה או אלכסונית.",
    exampleHe: "גובה ⟂ בסיס",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-04",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי כיוון הסיבוב או גודל הסיבוב. הכוונה היא להבין אם הצורה מסתובבת עם כיוון השעון או נגדו, ובכמה מעלות.",
    exampleHe: "90° ימינה",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-05",
    explanationHe:
      "המערכת זיהתה קושי בהבנת גוף תלת ממדי. הכוונה היא לראות שלא מדובר רק בציור שטוח, אלא בצורה שיש לה אורך, רוחב וגובה.",
    exampleHe: "קובייה",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-06",
    explanationHe:
      "המערכת זיהתה קושי בהמרת יחידות לפני חישוב היקף או אורך. הכוונה היא לוודא שכל המידות באותה יחידה לפני שמחברים או משווים.",
    exampleHe: "120 ס״מ = 1.2 מ׳",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-07",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי ציר סימטריה. הכוונה היא למצוא קו שמחלק את הצורה לשני חלקים זהים, כך שאפשר לקפל לאורך הקו ושני הצדדים יתאימו.",
    exampleHe: "קו קיפול באמצע צורה",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:G-08",
    explanationHe:
      "המערכת זיהתה קושי בחישוב שטח משולש. כדי למצוא שטח משולש משתמשים בבסיס ובגובה המתאים, ואז מחלקים את התוצאה ב 2.",
    exampleHe: "בסיס 6, גובה 4: 6 × 4 ÷ 2",
    status: "approved",
    approvalSource: "owner_geometry_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-01",
    explanationHe:
      "המערכת זיהתה קושי בבחירת מילה נרדפת שמתאימה להקשר. הכוונה היא לא רק למצוא מילה דומה, אלא לוודא שהיא מתאימה למשמעות המשפט.",
    exampleHe: "שמח / עליז",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-02",
    explanationHe:
      "המערכת זיהתה קושי בהתאמה בין מילים במשפט לפי מין ומספר. הכוונה היא לוודא שהשם, התואר או הכינוי מתאימים לזכר או נקבה, וליחיד או רבים.",
    exampleHe: "ילדה קטנה / ילדים קטנים",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-03",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי משפחת מילים או תבנית כתיב שחוזרת במילים קשורות. הכוונה היא לשים לב לאותיות ולמבנה שחוזרים באותה משפחת מילים.",
    exampleHe: "כתב / מכתב / כתיבה",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-04",
    explanationHe:
      "המערכת זיהתה קושי באיתור מידע בתוך טקסט. הכוונה היא למצוא פרט מסוים לפי מילות מפתח, כותרות או רמזים שמופיעים בשאלה ובטקסט.",
    exampleHe: "מתי קרה? / מי עשה?",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-05",
    explanationHe:
      "המערכת זיהתה קושי בהבחנה בין מילים שנשמעות דומה או זהה, אבל נכתבות אחרת או בעלות משמעות אחרת. הכוונה היא לבחור את המילה הנכונה לפי ההקשר במשפט.",
    exampleHe: "אם / עם",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-06",
    explanationHe:
      "המערכת זיהתה קושי בסידור מילים במשפט שאלה. הכוונה היא לבנות שאלה ברורה, עם מילת השאלה, הנושא והפועל במקום מתאים.",
    exampleHe: "מתי הילד הגיע?",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-07",
    explanationHe:
      "המערכת זיהתה קושי בחיבור משפטים לרצף ברור. הכוונה היא להשתמש במילות קישור כדי להסביר קשר של הוספה, ניגוד, סיבה או תוצאה.",
    exampleHe: "אבל / לכן / בנוסף",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:H-08",
    explanationHe:
      "המערכת זיהתה קושי בהתאמת רמת הלשון למצב. הכוונה היא לבחור ניסוח שמתאים למטרה: שיחה יומיומית, תשובה לימודית או פנייה רשמית.",
    exampleHe: "אפשר לקבל עזרה? / תביא לי",
    status: "approved",
    approvalSource: "owner_hebrew_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-01",
    explanationHe:
      "המערכת זיהתה קושי בשימוש בצירופי מילים טבעיים באנגלית. הכוונה היא שיש מילים שבאנגלית רגילים לומר יחד, ולא תמיד אפשר לתרגם מילה במילה מעברית.",
    exampleHe: "make a decision",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-02",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי רמזים שמראים באיזה זמן המשפט כתוב. הכוונה היא לשים לב למילים שמראות אם מדובר בעבר, בהווה או בעתיד, ואז לבחור את צורת הפועל המתאימה.",
    exampleHe: "yesterday / now / tomorrow",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-03",
    explanationHe:
      "המערכת זיהתה קושי במעקב אחרי המקום הנכון בטקסט באנגלית. הכוונה היא לקרוא לפי הסדר, לא לדלג שורה, ולחזור לשורה המתאימה כשמחפשים תשובה.",
    exampleHe: "line 3",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-04",
    explanationHe:
      "המערכת זיהתה קושי בבחירת כינוי הגוף המתאים לנושא המשפט באנגלית. הכוונה היא לבחור נכון בין כינויים כמו הוא, היא או זה לפי מי או מה שמדברים עליו.",
    exampleHe: "he / she / it",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-05",
    explanationHe:
      "המערכת זיהתה קושי בשימוש במילות יחס באנגלית. אלו מילים קצרות שמראות קשר של מקום, זמן או כיוון, ולעיתים הן לא מתורגמות ישירות מעברית.",
    exampleHe: "in / on / at",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-06",
    explanationHe:
      "המערכת זיהתה קושי בהבנת מסקנה מתוך טקסט באנגלית. הכוונה היא להבין דבר שלא כתוב במפורש, אלא משתמע מתוך המשפטים והרמזים בטקסט.",
    exampleHe: "The room is dark, so she turns on the light.",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-07",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי אותיות או תבניות כתיב באנגלית שלא תמיד שומעים בהגייה. הכוונה היא לשים לב לכך שלא כל אות במילה נשמעת כמו שהיא נכתבת.",
    exampleHe: "knight / night",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:E-08",
    explanationHe:
      "המערכת זיהתה קושי בהבחנה בין מילים באנגלית שנשמעות כמעט אותו דבר, אבל שונות בצליל קטן ובמשמעות. הכוונה היא להקשיב להבדל המדויק בין הצלילים.",
    exampleHe: "ship / sheep",
    status: "approved",
    approvalSource: "owner_english_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-01",
    explanationHe:
      "המערכת זיהתה קושי בהבחנה בין תכונה של דבר לבין תהליך שקורה לו. תכונה מתארת מה מאפיין חומר, גוף או יצור, ותהליך מתאר שינוי או פעולה שמתרחשים לאורך זמן.",
    exampleHe: "צבע הוא תכונה; התכה היא תהליך",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-02",
    explanationHe:
      "המערכת זיהתה קושי בהבנת ניסוי שבו משנים רק גורם אחד בכל פעם. הכוונה היא להשאיר את שאר התנאים קבועים, כדי לדעת מה באמת השפיע על התוצאה.",
    exampleHe: "משנים רק את כמות האור",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-03",
    explanationHe:
      "המערכת זיהתה קושי בהבנת מיקום או סדר זרימה בתוך מערכת. הכוונה היא לדעת איפה נמצא כל חלק ומה הסדר שבו חומר, מידע או פעולה עוברים ממקום למקום.",
    exampleHe: "לב → כלי דם",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-04",
    explanationHe:
      "המערכת זיהתה קושי בהבנה שחומר לא נעלם כאשר הוא משתנה. במקרים רבים החומר משנה צורה, מצב או מקום, אבל הכמות הכוללת שלו נשמרת.",
    exampleHe: "קרח → מים",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-05",
    explanationHe:
      "המערכת זיהתה קושי בשימוש נכון ביחידות מדידה ובהמרה ביניהן. הכוונה היא לבדוק אם מודדים אורך, מסה, זמן או נפח, ולהשתמש ביחידה המתאימה.",
    exampleHe: "1000 גרם = 1 ק״ג",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-06",
    explanationHe:
      "המערכת זיהתה קושי בקריאת ערכים מתוך גרף. הכוונה היא להבין מה כל ציר מייצג, למצוא את הנקודה המתאימה, ולקרוא ממנה את הערך הנכון.",
    exampleHe: "ציר X / ציר Y",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-07",
    explanationHe:
      "המערכת זיהתה קושי בהבנת קשרי אכילה והעברת אנרגיה בטבע. הכוונה היא לזהות מי אוכל את מי, ומה התפקיד של כל יצור במערכת.",
    exampleHe: "צמח → ארנב → שועל",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:S-08",
    explanationHe:
      "המערכת זיהתה קושי בביסוס תשובה על מקור מידע. הכוונה היא לא להסתפק בתחושה או ניחוש, אלא למצוא בטקסט, בתצפית או בנתונים מה תומך בטענה.",
    exampleHe: "לפי הטקסט / לפי התצפית",
    status: "approved",
    approvalSource: "owner_science_subject_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-01",
    explanationHe:
      "המערכת זיהתה קושי בהבנת סולם במפה. הכוונה היא להבין איך מרחק קטן במפה מייצג מרחק גדול יותר במציאות.",
    exampleHe: "1 ס״מ במפה = 1 ק״מ במציאות",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-02",
    explanationHe:
      "המערכת זיהתה קושי בזיהוי כיוון צפון במפה. הכוונה היא להשתמש בחץ הצפון או בסימון הכיוונים, גם כשהמפה מסובבת או לא מוצגת כמו שרגילים לראות.",
    exampleHe: "חץ צפון במפה",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-03",
    explanationHe:
      "המערכת זיהתה קושי בהבחנה בין זכות לבין חובה. זכות היא דבר שמגיע לאדם או לאזרח, וחובה היא דבר שמצופה ממנו לעשות או לקיים.",
    exampleHe: "זכות לחינוך / חובה לשמור על הכללים",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-04",
    explanationHe:
      "המערכת זיהתה קושי בסידור אירועים לפי רצף זמן. הכוונה היא להבין מה קרה קודם, מה קרה אחר כך, ואיך האירועים קשורים זה לזה.",
    exampleHe: "לפני / אחרי",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-05",
    explanationHe:
      "המערכת זיהתה קושי בקריאת מפת אקלים. הכוונה היא להשתמש בצבעים, בסימנים ובמקרא כדי להבין איזה סוג אקלים מופיע בכל אזור.",
    exampleHe: "מדברי / ים תיכוני",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-06",
    explanationHe:
      "המערכת זיהתה קושי בהבנת קשר של סיבה ותוצאה. הכוונה היא לזהות למה משהו קרה, ומה קרה בעקבותיו.",
    exampleHe: "הגירה בגלל עבודה",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-07",
    explanationHe:
      "המערכת זיהתה קושי בהבנת התפקיד של מוסדות ציבור. הכוונה היא לדעת מה עושה כל מוסד ומה האחריות שלו בחברה.",
    exampleHe: "כנסת - חקיקה / בית משפט - שיפוט",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
  {
    lookupKey: "finding:taxonomy:MG-08",
    explanationHe:
      "המערכת זיהתה קושי בהבנת סימנים במפה. הכוונה היא להשתמש במקרא המפה כדי להבין מה מסמנים כביש, נהר, יישוב, גבול או מקום חשוב.",
    exampleHe: "מקרא מפה",
    status: "approved",
    approvalSource: "owner_moledet_geography_batch_approved",
  },
];

function taxonomyIdFromLookupKey(lookupKey) {
  return String(lookupKey || "").replace("finding:taxonomy:", "").trim();
}

const MATH_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:M-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const GEOMETRY_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:G-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const HEBREW_SUBJECT_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:H-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const ENGLISH_SUBJECT_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:E-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const SCIENCE_SUBJECT_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:S-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const MOLEDET_GEOGRAPHY_TAXONOMY_IDS = new Set(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => /^finding:taxonomy:MG-/.test(e.lookupKey)).map((e) =>
    taxonomyIdFromLookupKey(e.lookupKey),
  ),
);

const APPROVED_BY_LOOKUP_KEY = new Map(
  PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.filter((e) => e.status === "approved").map((e) => [e.lookupKey, e]),
);

/**
 * @param {string|null|undefined} taxonomyId
 * @returns {string}
 */
export function taxonomyDiagnosticExplanationLookupKey(taxonomyId) {
  const id = String(taxonomyId || "").trim();
  return id ? `finding:taxonomy:${id}` : "";
}

/**
 * @param {unknown} unit
 * @returns {string}
 */
export function v2UnitTaxonomyId(unit) {
  if (!unit || typeof unit !== "object") return "";
  const u = /** @type {Record<string, unknown>} */ (unit);
  const tax = u.taxonomy;
  const fromTax =
    tax && typeof tax === "object" ? String(/** @type {Record<string, unknown>} */ (tax).id || "").trim() : "";
  if (fromTax) return fromTax;
  const diag = u.diagnosis;
  return diag && typeof diag === "object"
    ? String(/** @type {Record<string, unknown>} */ (diag).taxonomyId || "").trim()
    : "";
}

/**
 * @param {unknown} unit
 * @returns {string}
 */
export function resolveLookupKeyFromV2Unit(unit) {
  return taxonomyDiagnosticExplanationLookupKey(v2UnitTaxonomyId(unit));
}

/**
 * @param {{ lookupKey?: string | null; taxonomyId?: string | null }} input
 * @returns {ParentDiagnosticExplanationEntry | null}
 */
export function getParentDiagnosticExplanationEntry(input) {
  const lookupKey =
    String(input?.lookupKey || "").trim() ||
    taxonomyDiagnosticExplanationLookupKey(input?.taxonomyId);
  if (!lookupKey) return null;
  return APPROVED_BY_LOOKUP_KEY.get(lookupKey) || null;
}

/**
 * Approved explanation payload for UI, or null when unmapped / not approved.
 *
 * @param {{ lookupKey?: string | null; taxonomyId?: string | null }} input
 * @returns {ParentDiagnosticExplanationV1 | null}
 */
export function resolveApprovedParentDiagnosticExplanationV1(input) {
  const entry = getParentDiagnosticExplanationEntry(input);
  if (!entry || entry.status !== "approved") return null;
  const explanationHe = String(entry.explanationHe || "").trim();
  if (!explanationHe) return null;
  const exampleRaw = entry.exampleHe != null ? String(entry.exampleHe).trim() : "";
  return {
    lookupKey: entry.lookupKey,
    explanationHe,
    exampleHe: exampleRaw || null,
  };
}

/**
 * @param {unknown} unit — diagnosticEngineV2 unit when diagnosed
 * @returns {ParentDiagnosticExplanationV1 | null}
 */
export function buildParentDiagnosticExplanationV1FromV2Unit(unit) {
  if (!unit || typeof unit !== "object") return null;
  const lookupKey = resolveLookupKeyFromV2Unit(unit);
  if (!lookupKey) return null;
  return resolveApprovedParentDiagnosticExplanationV1({ lookupKey });
}

/** Test / audit hook: full approved catalog (all subject batches including Moledet/Geography in this module). */
export function parentDiagnosticExplanationCatalogForTests() {
  return PARENT_DIAGNOSTIC_EXPLANATION_CATALOG.map((e) => ({ ...e }));
}

/** Test hook: math taxonomy ids with approved explanations in this module. */
export function mathTaxonomyExplanationIdsForTests() {
  return [...MATH_TAXONOMY_IDS].sort();
}

/** Test hook: geometry taxonomy ids with approved explanations in this module. */
export function geometryTaxonomyExplanationIdsForTests() {
  return [...GEOMETRY_TAXONOMY_IDS].sort();
}

/** Test hook: Hebrew-subject taxonomy ids with approved explanations in this module. */
export function hebrewSubjectTaxonomyExplanationIdsForTests() {
  return [...HEBREW_SUBJECT_TAXONOMY_IDS].sort();
}

/** Test hook: English-subject taxonomy ids with approved explanations in this module. */
export function englishSubjectTaxonomyExplanationIdsForTests() {
  return [...ENGLISH_SUBJECT_TAXONOMY_IDS].sort();
}

/** Test hook: Science-subject taxonomy ids with approved explanations in this module. */
export function scienceSubjectTaxonomyExplanationIdsForTests() {
  return [...SCIENCE_SUBJECT_TAXONOMY_IDS].sort();
}

/** Test hook: Moledet/Geography taxonomy ids with approved explanations in this module. */
export function moledetGeographyTaxonomyExplanationIdsForTests() {
  return [...MOLEDET_GEOGRAPHY_TAXONOMY_IDS].sort();
}
