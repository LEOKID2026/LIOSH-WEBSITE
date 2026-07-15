/**
 * Phase 3 expansion: deeper items for environment, experiments, earth_space
 * (emphasis g5/g6, mostly hard band). Concatenated in science-questions.js.
 * Metadata enrichment applied in same pass as science-questions.js (safe fields only).
 */
export const SCIENCE_QUESTIONS_PHASE3 = [
  {
    "id": "env_28",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בעיר גדולה הוגדלו שטחי בטון וכבישים, ופחתו שטחי גינות ועצים. מה הסיכוי הגבוה ביותר לתוצאה מיידית ביום חם?",
    "options": [
      "ירידה בלחות היחסית במרכז העיר לעומת סביבה ירוקה",
      "עלייה במהירות הרוח בלבד בלי שינוי טמפרטורה",
      "הגברת מידת המלח בים התיכון ליד החוף",
      "הפסקת פעילות מערכת הנשימה בכל הצמחים באזור"
    ],
    "correctIndex": 0,
    "explanation": "בטון ואספלט חמים נוטים לחמם את הסביבה ולפחית אידוי מים מצמחים; ביום חם זה מגביר לעיתים אפקט חום ומרגיש 'לחץ חום' בעיר. לחות יחסית לעיתים יורדת כי פחות אידוי מצמחים ופחות קירור מקומי מצל וממים.",
    "theoryLines": [
      "אי הפרדות עירוניות ('איי חום') קשורות לכיסוי קרקע ולצל.",
      "צמחים משפיעים על אידוי ועל קירור מקומי דרך צל ומים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_29",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "חקלאי השקה יתר על שדה בקרקע כבדה. מה ההיגיון המדעי הסביר ביותר לכך שבסופו של דבר עלול לצאת פחות מזון מהשדה למרות יותר מים?",
    "options": [
      "רוויה ארוכת טווח יוצרת תנאי ללא חמצן בקרקע, פגיעה בשורשים ושחרור גזים המזיקים לצמיחה",
      "מים מדללים את הכלורופיל בצמח עד שהוא נעלם לחלוטין ביום אחד",
      "הצמחים עוברים לנשימה לא נרצפת ומפסיקים לספוג CO₂ לתמיד",
      "המים גורמים לצמחים 'להתנוון' כי הם מזוהמים תמיד בניטרטים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "השקיית יתר עלולה לדכא חמצן בנרהיזוספירה, לפגוע בקליטת מזון ושורשים ולהפחית יעילות - לעיתים מופיעים גם בצקות או ריקבון שורש. לא 'דילול כלורופיל' ולא עצירת CO₂ לנצח הם ההסבר המרכזי.",
    "theoryLines": [
      "שורשים צריכים חמצן לנשיפה תאית.",
      "מים עודפים משנים מצבי חמצן בקרקע ואת קשרי הגומלין עם חיידקים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_30",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מין מסוים צמח מגיב לטיפול חקלאי חדש וגדל מהר מאוד. למה זה עלול להיות רמז לסיכון אקולוגי ולא רק להצלחה?",
    "options": [
      "יתכן שכיסוי חקלאי גובר יצמצם מינים אחרים ופגיעה בגיוון ובביוסטביליות",
      "צמחים איטיים נחשבים ליחידים המזיקים לסביבה, ולכן צמיחה מהירה תמיד מסמנת הצלחה",
      "גדילה מהירה מוכיחה שאין צורך בניטור קרקע או מים",
      "מגוון מינים גדול תמיד עולה בלי קשר לשטח או למשאבים"
    ],
    "correctIndex": 0,
    "explanation": "יתרון תחרותי חד פעמי עלול ללחוץ על מינים אחרים, לפגוע במאגרים גנטיים ובשירותים אקולוגיים. לכן נדרשת חשיבה מערכתית, לא רק תשואה לשדה בודד.",
    "theoryLines": [
      "גיוון ביולוגי תומך ביציבות מול מחלות ובתי גידול.",
      "שינוי יחסי גומלין יכול לשנות את שרשרת המזון."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_31",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "אם נשבר קטע מרשת המזון באגם (למשל היעלם טורף עליון), מה התשובה הזהירה ביותר?",
    "options": [
      "ההשפעה תלויה במהירות ובמבנה הרשת; לעיתים יש חליפות תפקידים ולעיתים צניחת יציבות",
      "תמיד תתרחש התאוששות מלאה תוך יומיים בלי תלות במין",
      "תמיד ייעלמו כל הצמחים קודם כי הטורף הוא המגדל",
      "שרשרת המזון אינה משתנה אם רק חסר טורף אחד משלושה עשר"
    ],
    "correctIndex": 0,
    "explanation": "רשתות אקולוגיות מורכבות; איבוד טורף עליון עשוי לשנות אוכלוסיות של טורפים/נטרפים אחרים בדרכים שונות. אין כלל אחד פשוט לכל האגמים.",
    "theoryLines": [
      "רשת מזון היא מערכת יחסים רבת שכבות.",
      "שינוי בולט עלול ליצור אפקטים מדורגים (במדרגות)."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_32",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל העיקרי בין מיחזור נייר לבין הפחתת צריכת נייר מלכתחילה?",
    "options": [
      "הפחתה מקטינה ביקוש למשאבים ופסולת מראש; מיחזור מטפל בפסולת שכבר נוצרה",
      "אין הבדל: שניהם אומרים את אותה פעולה בדיוק",
      "מיחזור תמיד נפחים יותר אנרגיה מאשר הפקת נייר חדש ולכן מיותר",
      "הפחתה משמעה רק לזרוק פחות בלי לשנות ייצור"
    ],
    "correctIndex": 0,
    "explanation": "היררכיית 3R שמה 'הפחתה' לפני 'מיחזור'. הפחתת שימוש יורדת היקף גזירה/ייצור; מיחזור עוסק במוצרים לאחר שימוש כדי לצמצם הטמנה ולחסוך חומר גלם.",
    "theoryLines": [
      "\"צמצם\" לפני \"השתמש מחדש\" לפני \"מחזר\".",
      "כל שלב חוסך משאבים בשלב אחר במחזור החיים."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_33",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה עלייה אמיתית ומתמשכת בגזי חממה באטמוספרה קשורה לעליית ממוצע טמפרטורות, ולא רק לתרגום ישיר 'יותר חום מהשמש'?",
    "options": [
      "כי הגזים מחזקים לכידת קרינה חוזרת בתוך מערכת כדור הארץ אטמוספרה ומשנים איזון אנרגטי",
      "כי השמש משנה בהירות בכל שנה בדיוק כמו שנת הלימודים",
      "כי גזי חממה בולעים את כל קרינת השמש שמגיעה כך שאין יום ולילה",
      "כי רק האוקיינוס קובע טמפרטורה וגזי חממה משפיעים על הכבידה"
    ],
    "correctIndex": 0,
    "explanation": "מנגנון החממה: קרינה קצרת גל קולטת, פליטה ארוכת גל חזקה יותר, ונבנית שיווי משקל חם יותר. זה לא 'פחות שמש' בהכרח אלא שינוי בחוזק הלכידה.",
    "theoryLines": [
      "איזון אנרגטי קובע טמפרטורה ממוצעת.",
      "פחמן דוחמצני ומתאן גורמים לחיזוק אפקט חממה."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_34",
    "topic": "environment",
    "grades": [
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מדוע הוספת מדביר ללא הדרכה מקצועית עלולה לפגוע גם במינים שאינם המטרה (דגים, חרקים מועילים)?",
    "options": [
      "כי חומרים פעילים עשויים לעבור בשרשרת המזון או לפגוע בלא ממוקדים",
      "כי מדבירים פועלים רק על צמחים ולא נכנסים לבעלי חיים",
      "כי כל חומר טבעי לא נשאר בכלל בסביבה אחרי דקה",
      "כי רק טמפרטורה גבוהה פוגעת בחרקים"
    ],
    "correctIndex": 0,
    "explanation": "אי דיוק ביישום, נשיאה במים, או רגישות שונה בין מינים יוצרים דליפה אקולוגית. לכן חשוב ייעוץ, מינון, ומניעת חשיפה מיותרת.",
    "theoryLines": [
      "סביבה ובריאות קשורים לשימוש נכון בכימיקלים.",
      "מינים שונים רגישים לרמות שונות של רעל."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_35",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "במצב שבו אוכלוסיית דגי טורף באגם גדלה מהר לאחר כניסת דג טורף חדש, מהי הבעיה המרכזית לגוף המים אם אין טורף עליון שיאזן?",
    "options": [
      "הטורף החדש עלול לסיים פריטי מזון ולייצר קריסת אוכלוסיות או שרשרת מזון מקוצרת",
      "הטורף תמיד יגדל בלי הגבלה כי אין מגבלת מזון בעולם",
      "כל הדגים האחרים יגדלו אותו דבר כי יש פחות תחרות",
      "האגם יהפוך מי מלח דרך הטורף בלבד"
    ],
    "correctIndex": 0,
    "explanation": "בלי ויסות, טורף חדש יכול לדכא נטרפים עד לנקודת מנוסה או להכחיד מינים; זה מסכן יציבות. המקרה מדגים חדירת מינים פולשים.",
    "theoryLines": [
      "מין פולש עלול לשנות שיווי משקל שיצרב שנים.",
      "אוכלוסייה יציבה תלויה בזרימת אנרגיה וחומר."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_36",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה 'אנרגיה מתחדשת' לא פותרת אוטומטית את כל נזקי הסביבה?",
    "options": [
      "כי גם טורבינות, סוללות וכריית מתכות ללוחות שמש דורשים קרקע, משאבים ופסולת",
      "כי אנרגיה מתחדשת אינה מייצרת חשמל מעולם",
      "כי רוח ושמש פועלים רק בלילה",
      "כי אין צורך בתכנון אתרים כשהכל טבעי"
    ],
    "correctIndex": 0,
    "explanation": "מתחדשות מפחיתה פליטות דלקים פוסיליים אך עם שטחי תשתית, לוגיסטיקה ופירוק. צריך ניתוח מחזור חיים ולא סיסמה.",
    "theoryLines": [
      "שקילות סביבתית בודקת ייצור, תפעול וסוף חיים.",
      "סתירה אקולוגית: יצירת שטחים לתשתית עשויה לפגוע בטבע."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_37",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "תלמיד בנה הצהרה: 'אם הכניסו יותר דגים לאגם, יהיה יותר מזון לכל הטורפים'. איפה הטעות ההיגיונית?",
    "options": [
      "מזון בשרשרת אינו גדל ללא מקור אנרגיה וצמחים/מזון בסיס; ייתכן דווקא דלון",
      "יותר דגים תמיד יוצרים יותר צמחי מים",
      "טורפים ניזונים רק מהשמש ולא מחומר אורגני",
      "מספר בעלי חיים לא יכול להשפיע על ריכוז חמצן במים"
    ],
    "correctIndex": 0,
    "explanation": "בשרשרת מזון דרושה בסיס פרימרי (צמחים/ פלנקטון). עומס דגים עלול לערער יציבות, להגדיל דלקון או לדכא נטרפים אחרים - לא להגדיל אוטומטית 'מלאי מזון'.",
    "theoryLines": [
      "אנרגיה נכנסת בעיקר דרך פוטוסינתזה.",
      "יכולת נשיאה של מערכת מוגבלת בקרקע ובמזון."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_38",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מדוע שטפונות קיצוניות עלולות להעצים סחיפה של אדמה מעורבת בכימיקלים חקלאיים שימושיים?",
    "options": [
      "כי שטף מים חזק סוחף שכבת טיפוח ומוביל את החומרים לערוצי ניקוז ולמים פנימיים",
      "כי מים לא נוגעים מעולם בקרקע חקלאית",
      "כי כימיקלים נדבקים רק לאוויר ולא זזים",
      "כי סחיפה נדירה מדי כדי לשנות משהו במים"
    ],
    "correctIndex": 0,
    "explanation": "גשם חזק על שטח חשוף או מהודק עלול להדיח דשן וחומרים אל תוך מי נגר, נחלים ומאגרים. זה מדגיש חיבור בין מזג אקסטרימלי, קרקע וזיהום.",
    "theoryLines": [
      "זרימת מים מזיזה חומרים פיזיקליים וכימיים.",
      "ניהול קרקע מפחית סחיפה."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_39",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "ילד שואל: למה בעונת הקיץ בחוף עירוני פחות גשם אבל יותר אי נוחות? איזה עיקרון מדעי עוזר לנמק את שני הצדדים בעדינות?",
    "options": [
      "שילוב בין תבניות אקלים עונתיות לבין אדים ימיים וחום עירוני מקומי",
      "מזג האוויר זהה בכל שכונה של העיר בכל רגע נתון",
      "ים משחרר רק מלח ולכן לא משפיע על לחות",
      "קיץ משמעו בוודאות אפס אידוי בעולם"
    ],
    "correctIndex": 0,
    "explanation": "בקיץ לעיתים 'עונה יבשה' אזורית, אך ליד הים עשויים להיות אדים, ובריבוי בטון וחום עירוני עלולה להיות תחושת חום מעיקה. נדרש הבחנה בין מעט משקעים לבין תנאי נוחות תרמית.",
    "theoryLines": [
      "לחות וטמפרטורה משפיעות על תחושת החום.",
      "אקלים עונתי ומקומי משולבים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_40",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו קשר הגיוני בין צמחייה לאורך נחל לבין יכולת הסינון הטבעי של מים זורמים?",
    "options": [
      "שורשים ומבנה קרקע תומכים בסינון מכני ובקליטת מזהמים כימיים חלקיים",
      "צמחים בונים מחסום בטון שחוסם זרימת מים לחלוטין",
      "אין קשר: רק מסננות תעשייתיות מסננות",
      "מים זורמים נקיים תמיד בלי קשר לצמחייה"
    ],
    "correctIndex": 0,
    "explanation": "צמחי גדות משפרים מבנה קרקע, מפחיתים סחיפה ותומכים במיקרואורגניזמים המפרקים. זה לא תחליף מלא לטיפול אבל חשוב במערכת.",
    "theoryLines": [
      "שירותי מערכות אקולוגיות כוללים סינון טבעי.",
      "סחיפה קשורה לכיסוי קרקע."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_41",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "במחשבה 'מה קורה אם…': אם יורדים כמות הדייגים הלגיטימיים באזור דגה שנשחק, אך הברחות גדלות, מה התוצאה הסבירה?",
    "options": [
      "האוכלוסייה עלולה להמשיך לרדת כי ההסרה בפועל נשארת גבוהה",
      "הדגים תמיד ישתכפלו פי שלושה בלי קשר ללחץ",
      "דייגים חוקיים הם הגורם היחיד למגמת גודל האוכלוסייה",
      "בריחה מחמירה אוטומטית מעלה את גודל הזכר מיד"
    ],
    "correctIndex": 0,
    "explanation": "השפעה אקולוגית נובעת מכלל ההסרה בפועל. אכיפה חלשה יכולה לבטל הפחתה 'על הנייר'.",
    "theoryLines": [
      "ניהול משאבים משלב חוק, ניטור וקהילה.",
      "לחץ דיג הוא גורם דינמי."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_42",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה יצירת מאגרי מים מלאכותיים ללא חישוב איזון מים עלולה לפגוע במעיינות במורד הזרימה?",
    "options": [
      "כי שאיבת מים תת קרקעית או שינוי זרימה יכולים להקטין הזנה של אקוויפרים ולפגוע בבסיס המעיין",
      "מעיינות תמיד ממלאים את עצמם בלי קשר למים באגם",
      "מאגירים מלאכותיים מגבירים רק את כמות הגשם באזור בלי צנרת",
      "מים במעיין מגיעים רק ממי גשם ישיר מעל הפיה ולא מזרימה תת קרקעית"
    ],
    "correctIndex": 0,
    "explanation": "מעיינות רבים תלויים בתמיכה של מי תהום ושבילי זרימה. חישוב הידרולוגי חסר עלול להפחית האכלות או לשנות לחץ מים אזורי.",
    "theoryLines": [
      "מחזור המים כולל משטחים, ניקוז ותהום.",
      "אגמים והספקות משנים משטר זרימה מקומי."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_43",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל העיקרי בין חממה טבעית (אקלים) לבין 'אפקט חממה' כשמדברים על שינוי אקלים?",
    "options": [
      "האפקט הטבעי קיים ונחוץ לחיים; ההתייחסות בעייתית כשהוא מתחזק יתר על המידה בגלל פעילות אנושית",
      "אין הבדל - שני המונחים תמיד מתארים אותה תקלה",
      "חממה טבעית פירושה שאין קרינה מהשמש לכדור הארץ",
      "אפקט חממה מתרחש רק במדבר ולא באוקיינוס"
    ],
    "correctIndex": 0,
    "explanation": "בלי גזי חממה טבעיים הטמפרטורה הייתה קרירה מדי לחיים רבים; הבעיה היא חיזוק יתר. גורמים לבלבול במונחים ולדיון לא מדויק.",
    "theoryLines": [
      "שפה מדעית מדויקת עוזרת להבין בעיה ופתרון.",
      "כדור הארץ מקבל ומפלט קרינה במאזן דינמי."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_44",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה הפחתת קוטג' חקלאי בסמוך לבית גידול טבעי עלולה לשפר דווקא עמידות של מין נדיר - ולא רק 'לפחות בנייה'?",
    "options": [
      "כי מרווח מנותק יפתח מסדרונות אקולוגיים, יקטין פיצול בתי גידול ויוריד סיכון לתאונות/הפרעות אנושיות",
      "כי כל בנייה תמיד מגדילה גיוון מיד ללא תלות במיקום",
      "כי מין נדיר ניזון רק מבטון לכן צריך יותר כבישים",
      "כי בית גידול טבעי לא תלוי בשטח רציף"
    ],
    "correctIndex": 0,
    "explanation": "מסדרונות ורציפות שטח תומכים בהגירה, בגנים ובגיוון. פיצול בתי גידול מגביר סיכון לקריסה דמוגרפית.",
    "theoryLines": [
      "ניהול נוף משלב ביולוגיה ומתכננים.",
      "אי רציפות היא אחד הגורמים לאובדן מינים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_45",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "אם דו״ח טוען 'המגמה בנתוני טמפרטורה תואמת שינוי אקלים אנושי', למה השוואה לעשורים הרחוקים (למשל מדידות מוקדמות) דורשת זהירות?",
    "options": [
      "כי רשת המדידות, הכלים והכיסוי הגאוגרפי השתנו - אי אחידות עלולה להטות מגמות מקומיות",
      "כי לעולם לא היו שינויים בעבר גאולוגי",
      "כי טמפרטורה לא נמדדת מעולם לפני המצאת המדחום",
      "כי כל נתוני העבר הם מזויפים"
    ],
    "correctIndex": 0,
    "explanation": "מדענים מתקנים הטיות (באיאסים) ומשווים רשתות שונות. זהירות מתודולוגית היא לא 'ספוט' אלא דיוק.",
    "theoryLines": [
      "סדר נתונים ומטא דאטה חשובים בניתוח סדרות זמן.",
      "הבנת אי ודאות היא חלק מלמידה מדעית."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_46",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהי הסיבה המדעית להעדפת צמחייה מקומית בגינון ציבורי לעומת מינים 'תצוגתיים' שאינם מותאמים לאקלים?",
    "options": [
      "צמחים מקומיים נוטים לדרוש פחות השקיה/טיפול, לתמוך בחרקים ובעופות מקומיים ולייצב מערכת",
      "מינים מקומיים תמיד דורשים יותר דשנים חיצוניים",
      "מקומיים לעולם לא פרחים ולכן פחות יפים",
      "אין הבדל אקולוגי בין מקומי לזר"
    ],
    "correctIndex": 0,
    "explanation": "התאמה לאקלים מפחיתה לחץ על משאבים ומחזקת קשרים עם מזהמי אבקה וטורפים טבעיים; מינים זרים עלולים להפוך לפולשים.",
    "theoryLines": [
      "התאמות אבולוציוניות קשורות לתנאי סביבה.",
      "גינון אחראי תומך בשירותים אקולוגיים עירוניים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_47",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "במערכת אגם, עלייה חדה בריכוז מתכות כבדות במי שתייה של חיות. מה התסמין המערכתי הסביר ביותר לפני בדיקת מעבדה?",
    "options": [
      "הפסקת שרשרת מזון: ערעור בבסיס הפלנקטון/אצות שהועלו ממשקעים",
      "עלייה מיידית וקבועה בגודל האגם בלי מקור מים",
      "הפיכת כל המים למתכת מוצקה בבת אחת",
      "היעדר כל חמצן במים גם אם אין שינוי בטמפרטורה"
    ],
    "correctIndex": 0,
    "explanation": "מתכות כבדות נוטות להצטבר במשקעים ובביומסה; פגיעה בתחתית שרשרת המזון מסמנת סכנה רחבה. צריך ניטור ומקור זיהום.",
    "theoryLines": [
      "ביומגנום והצטברות רעלנים בשרשרת המזון.",
      "משקעים הם מאגרים פוטנציאליים של מזהמים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_48",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה 'שינוי שימוש קרקע' (למשל יער → שדה) מדווח לעיתים כגורם חזק לאובדן פחמן מהאדמה?",
    "options": [
      "כי צומח ושורשים מחזיקים פחמן אורגני; עקירה, שריפה או עיבוד קרקע מהירים משחררים פחמן או מקטינים קליטה",
      "כי שדות תמיד קולטים יותר CO₂ מיער גם ביום הראשון",
      "כי עצים לא מכילים פחמן כלל",
      "כי שימוש קרקע משפיע רק על צבע המפה ולא על פחמן"
    ],
    "correctIndex": 0,
    "explanation": "ביומסה וקרקע אוגרים פחמן; שינוי מהיר משחרר לאטמוספרה או מקטין קליטה עתידית. זה חלק מחשבון מקורות שקע.",
    "theoryLines": [
      "יערות הם מאגרי פחמן.",
      "ניהול קרקע ויער משפיעים על מאזן פחמן."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_49",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההיגיון בכך שנזקי שמירת טבע לתיירות 'רכה' עדיין דורשים תכנון?",
    "options": [
      "כי עומס מבקרים עלול לדחוף שבילים, להטריד בעלי חיים ולהביא פסולת ומזהמים אף בלי כוונה",
      "תיירות רכה אומרת שאין כלל נזק אפשרי",
      "בעלי חיים לא מרגישים הפרעה קולית",
      "פסולת תמיד נעלמת באופן קוסמי ביער"
    ],
    "correctIndex": 0,
    "explanation": "ניהול מבקרים, נתיבים, עונות רגישות וחינוך מפחיתים דחיפה אקולוגית. תיירות ברת קיימא היא איזון.",
    "theoryLines": [
      "הפרעה אנתרופוגנית היא גורם שימור.",
      "למידה חיצונית מחייבת אחריות התנהגותית."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_50",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה אזור חקלאי המפריד בין שני יערות קטנים עלול להפחית את סיכוי ההישרדות של מין פרפר הדורש שטח גדול?",
    "options": [
      "כי פיצול יוצר אוכלוסיות מבודדות עם גנים מצומצמים ומעט חוצים בין קטעים",
      "כי פרפרים נדדו תמיד בלי גבולות ללא קשר לפיתוח",
      "כי חקלאי תמיד מגדיל רק פרחי בר מתאימים",
      "כי גודל אוכלוסייה לא משפיע על סיכון הכחדה"
    ],
    "correctIndex": 0,
    "explanation": "אפקט מסדרון/פיצול (habitat fragmentation) מגביר דריפט גנטי, מקריס סיכויי הישרדות מפני אירועים אקראיים ומקטין שטח מזון הולם.",
    "theoryLines": [
      "אקולוגיה של נוף חוקרת קישוריות בתי גידול.",
      "גודל אוכלוסייה קטן מגביר פגיעות."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_51",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון לגבי שיפור איכות מים במפרץ אחרי סערה?",
    "options": [
        "צריך מדידות וזמן - לא בהכרח שיפור מיידי",
        "איכות המים תשתפר מיד בלי מדידות נוספות",
        "סערה תמיד מזהמת ללא יוצא מן הכלל",
        "אין קשר בין ניקוז לבין איכות מים"
    ],
    "correctIndex": 0,
    "explanation": "פתיחת ניקוזים עלולה להזרים במי גשם שטחים מזוהמים, לא רק 'לשטוף' זיהום החוצה; יש צורך בניטור לזמן ולמקום ולסיכון אקולוגי.",
    "theoryLines": [
      "ניהול מי נגר דורש תכנון הידרולוגי.",
      "מדידות מאפשרות השוואה לפני/אחרי."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "env_52",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "באילו מצבים תמיכה בקומפוסט ביתי תורמת גם להפחתת פליטות מטמנה וגם לשיפור קרקע מקומית?",
    "options": [
      "כאשר פסולת אורגנית מתפרקת אירובית/דומה בבית וחוזרת לקרקע בתנאים בטוחים",
      "כאשר כל הפסולת נזרקת לאותה שקית פלסטיק ללא מיון",
      "כשמייבאים קומפוסט מחו״ל בלבד ואין פירוק מקומי",
      "כשאין אף צמח בגינה ולכן אין צורך בחומרה אורגנית"
    ],
    "correctIndex": 0,
    "explanation": "פירוק אורגני מקומי מקטין נפח להטמנה (פחות מתאן מהירקות) ומחזיר חומר למחזור הקרקע אם הבטיחות הביולוגית נשמרת.",
    "theoryLines": [
      "פסולת אורגנית היא חלק ממחזור התאים.",
      "בטיחות: הימנעות מבשר/שומן בקומפוסט ביתי פשוט."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "env_53",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בהסכם סביבתי בין שתי מדינות שכנות לגבי זיהום אוויר גובלי, מה נושא חייב להישמר כדי שהנתונים יהיו משווים?",
    "options": [
      "אחידות בשיטות מדידה, גבהים, מיקומי תחנות ויחידות דיווח לכל הצדדים",
      "כל צד יכול להמציא יחידות משלו בלי תיאום",
      "די לדווח פעם בשנה בלי קשר לרוח",
      "טמפרטורה היא המדד היחיד שקובע איכות אוויר"
    ],
    "correctIndex": 0,
    "explanation": "ניטור אוויר רגיש לפרוטוקול: גובה דגימה, זמן, כיול ושקיפות. השוואה ללא סטנדרט פוגעת באמון ובמדיניות.",
    "theoryLines": [
      "נתונים טובים תומכים בהחלטות ציבוריות.",
      "זיהום גובלי מחייב שיתוף פעולה."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_27",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "קבוצת בקר קיבלה השקיה ואור אחידים; קבוצת הניסוי קיבלה דשן נוסף אבל הוצבה במסדרון מואר יותר. למה קשה לקבוע אם השינוי בגובה נובע מהדשן?",
    "options": [
      "כי השתנו שני גורמים בוזמנית (אור והדשן) ולכן לא ברור מה גרם להבדל",
      "כי דשן לעולם לא משפיע על צמיחה",
      "כי קבוצת הבקר תמיד שווה לניסוי אם יש מים",
      "כי אור לא משפיע על פוטוסינתזה"
    ],
    "correctIndex": 0,
    "explanation": "במבחן הוגן משנים רק משתנה אחד ממוקד. כאן האור הוא 'מפריע' (confounder) שמונע מסקנה נקייה.",
    "theoryLines": [
      "משתנה מבוקר מאפשר לשייך סיבה לתוצאה.",
      "שינוי מרובי גורמים דורש תכנון מחדש של הניסוי."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_28",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה חוקרים חוזרים על ניסוי באותה שאלה במקומות או בזמנים שונים לפני שמסיקים בביטחון?",
    "options": [
      "כי תוצאה חד פעמית עלולה להיגרם ממזל, טעות מדידה או נסיבות מקומיות ולא לשקף כלל",
      "כי חזרה תמיד מוחקת את תוצאות הניסוי הראשון",
      "כי ניסוי מדעי מותר להסיק ממנו מסקנה אחרי ניסיון יחיד בלבד",
      "כי שכפול תמיד משנה את השאלה המקורית"
    ],
    "correctIndex": 0,
    "explanation": "שחזור (replication) מחזק אמון: אם דפוס חוזר, הסיכוי שהוא 'קולע במקרה' קטן. זה חלק מתרבות האימות במדע.",
    "theoryLines": [
      "אמינות נבנית מנתונים חוזרים ומאיזון שגיאות.",
      "מדע מתבסס על בדיקה חוצת מעבדות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_29",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה התפקיד של קבוצת בקרה בניסוי השוואתי על צמחים?",
    "options": [
      "לספק בסיס בלי הטיפול הנבדק, כדי להשוות אליו כששאר התנאים זהים ככל האפשר",
      "לגרום לתוצאות להיראות יותר גרועות בכוונה",
      "להחליף את השערה במסקנה הסופית",
      "למדוד רק את המים ולא את הצמח"
    ],
    "correctIndex": 0,
    "explanation": "בקרה מאפשרת להבדיל בין 'מה היה קורה בלי הטיפול' לבין 'מה שקרה אחרי הטיפול'. בלי זה קשה לפרש הבדלים.",
    "theoryLines": [
      "השוואה מבוקרת היא לב לוגיקה של ניסוי.",
      "קבוצת בקרה מקלה לבודד השפעה של טיפול."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_30",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "חוקר שאל רק אנשים שנכנסים למתחם קניות בשעות הערב על דעתם בנושא איכות אוויר. איזה סיכון מתודולוגי מרכזי כאן?",
    "options": [
        "כדי לעקוב אחרי השינוי לאורך זמן",
        "כדי לשנות את תוצאת הניסוי",
        "כדי לבטל את קבוצת הביקורת",
        "כדי לא לרשום טעויות"
    ],
    "correctIndex": 0,
    "explanation": "דגימה במקום/זמן מאפיין מערך מצומצם של אנשים. מסקנות 'לכולם' דורשות אסטרטגיית דגימה רחבה או הצהרה מפורשת על ההגבלה.",
    "theoryLines": [
      "איכות מסקנה תלויה באיך נאספו הנתונים.",
      "הטיות דגימה נפוצות בהחלטות אינטואיטיביות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_31",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "גוף מדיד השתמש במד סרט שכבר התכווץ מעט אחרי שימוש ממושך. באופן עקבי, איך זה עלול לעוות תוצאות אורך?",
    "options": [
      "מדידות אורך יצאו בדרך כלל גדולות מהאמת כי המרווחים בין הסימונים 'צפופים' מדי",
      "המד תמיד יודע לתקן את עצמו אוטומטית",
      "זה משפיע רק על מסה ולא על אורך",
      "זה יוצר רק שגיאות אקראיות בלי כיוון קבוע"
    ],
    "correctIndex": 0,
    "explanation": "שגיאת כיול/מכשיר שיטתית נוטה לכיוון קבוע. לעומת 'רעש' אקראי, כאן חוזרת אותה הטיה בכל מדידה - חשוב לזהות ולמתקן.",
    "theoryLines": [
      "דיוק (קרוב לאמת) שונה מדיוק חוזר (עקביות).",
      "כיול מכשירים הוא חלק מעבודה מדעית אחראית."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_32",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בניסוי חימום מים, חוקר הוסיף בוזמנית יותר מלח וגם הגביר את להבה. מה הבעיה בניסוח מסקנה 'המלח האיך את החימום'?",
    "options": [
      "לא ניתן לבודד את תפקיד המלח כי גם עוצמת החימום השתנתה",
      "זה תקין תמיד לשנות שני דברים יחד",
      "להבה לא משפיעה על טמפרטורה",
      "מלח תמיד מבטל חימום"
    ],
    "correctIndex": 0,
    "explanation": "כשני גורמים משתנים, ההבדל בתוצאה הוא 'תערובת השפעות'. צריך ניסויים נפרדים או טבלת גורמים מתוכננת.",
    "theoryLines": [
      "בקרת משתנים מאפשרת הסקה לוגית.",
      "תכנון ניסוי הוא לא פחות חשוב מביצוע."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_33",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "במחקר פשוט על תרופה חדשה הדווחת להקל בכאב, למה חשוב להשוות גם לקבוצה שמקבלת חיקוי בלי החומר הפעיל (פלצבו), כשהמדידה היא דיווח חווייה?",
    "options": [
      "כי ציפייה והמלצת מבחן יכולות לשנות דיווח בלי שינוי ביולוגי אמיתי",
      "כי פלצבו מבטיח תמיד שהתרופה עובדת",
      "כי כאב לא נמדד מעולם במדע",
      "כי חיקוי תמיד גורם לנזק ולכן אסור"
    ],
    "correctIndex": 0,
    "explanation": "אפקט פלצבו/המלצה מדגים שדיווח אנושי אינו רק 'מדידה נקייה'. בקרה מאפשרת להעריך עודף אמיתי מעבר לציפייה.",
    "theoryLines": [
      "מחקר טוב בודד את עוצמת הטיפול מהקונטקסט הפסיכולוגי.",
      "שקיפות מתודולוגית חשובה לפרשנות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_34",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה מדענים מתעדים בדיוק איך הכינו חומרים, טמפרטורה וזמנים גם אם הניסוי 'עבד'?",
    "options": [
      "כדי שאחרים יוכלו לשחזר ולאמת או לגלות טעויות נסתרות",
      "כדי שלא יידעו איך לחזור על הניסוי",
      "כי תיעוד נדרש רק כשהניסוי נכשל",
      "כי בדיוק לא חשוב אם התוצאה ברורה"
    ],
    "correctIndex": 0,
    "explanation": "שחזור הוא אבן יסוד: בלי פרוטוקול, ממצאים נשארים סיפור אישי. תיעוד תומך בלמידה קולקטיבית.",
    "theoryLines": [
      "ידע מדעי הוא ציבורי ובדיק.",
      "פרוטוקול מפחית אי הבנות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_35",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "תלמיד מדד אורך פריסה חמש פעמים קיבל 10.0, 10.1, 9.9, 10.0, 10.2 ס״מ אך המד סרט היה קצר בסנטימטר מכל התוויות. מה נכון לגבי השגיאה כאן?",
    "options": [
      "הפיזור קטן אבל כל ערך מוסט שיטתית מהאמת בגלל כשל כיול במד",
      "אם הפיזור קטן אין שום שגיאה כלל",
      "זה רק שגיאה אקראית כי המספרים קרובים",
      "ממוצע של חמישה תמיד מתקן אוטומטית שגיאת כיול"
    ],
    "correctIndex": 0,
    "explanation": "עקביות (פיזור קטן) לא מבטיחה דיוק: מכשיר מוסט יכול לתת ערכים חוזרים אך שגויים באותו כיוון. צריך כיול והשוואה למוערך אמת.",
    "theoryLines": [
      "שגיאה שיטתית שונה מרעש אקראי.",
      "ממוצע לא מסיר הטיה קבועה של מכשיר."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_36",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "בודקים אם זרע נדיר נובט ב 50% מהמקרים. למה דגימה של שלושה זרעים בלבד לא נותנת בסיס טוב למסקנה כללית?",
    "options": [
        "מדידה חוזרת מגדילה אמינות",
        "מדידה אחת מספיקה תמיד",
        "אין צורך ביומן ניסוי",
        "תוצאה אקראית מספיקה"
    ],
    "correctIndex": 0,
    "explanation": "רעש סטטיסטי גדול כשהמונה קטן: חוסר נביטה יחיד עלול להטעות. חזרות ודגימה גדולה יותר מייצבות הערכת שיעור.",
    "theoryLines": [
      "גודל דגימה משפיע על ביטחון במסקנות.",
      "תוצאה במדגם היא הערכה, לא בהכרח 'החוק האמיתי'."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_37",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בניסוי התנהגות בכיתה, התלמידים ידעו שהם מצולמים. למה זה עלול לשנות את הממצא לעומת מצב לא צפוי?",
    "options": [
      "כי מודעות לצפייה משנה התנהגות (אפקט צפייה/הוות'ורן) ולכן התוצאה פחות מייצגת 'מצב רגיל'",
      "כי צילום תמיד מבטל פיזיקה של הכיתה",
      "כי תלמידים לא מגיבים לסביבה חברתית",
      "כי ניסוי חייב להיעשות רק בלי הסכמה"
    ],
    "correctIndex": 0,
    "explanation": "ניסויים עם בני אדם דורשים חשיבה אתית וגם של מודעות לשינוי התנהגותי. לפעמים צריך תכנון חלופי או דיווח מפורש על המגבלה.",
    "theoryLines": [
      "מדידה יכולה להשפיע על המישנה שנמדדה.",
      "אתיקה במחקר ובכיתה חשובה כמו דיוק."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_38",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איזה ניסוח מתאר נכון את ההבדל בין השערה למסקנה אחרי ניסוי?",
    "options": [
      "השערה היא חיזוי לפני הבדיקה; המסקנה מבוססת על ראיות שנאספו בפועל",
      "מסקנה והשערה הם אותו דבר בשלבים שונים של כתיבה בלבד",
      "השערה נכתבת רק אחרי שרואים תוצאה",
      "מסקנה אסורה אם היא לא תואמת את הציפייה הראשונית"
    ],
    "correctIndex": 0,
    "explanation": "השערה מנחה את הבדיקה; המסקנה משקפת מה הנתונים תומכים בהן. אפשר לדחות השערה - זה תקין ומעיד על כנות מחקרית.",
    "theoryLines": [
      "מחזור חקר: שאלה → השערה → ניסוי → ניתוח → מסקנה.",
      "חוסר איסוף ראיות מספק מחליש מסקנה."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_39",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה המשמעות של 'בדיקה הוגנת' (fair test) כשמשווים שתי שיטות לניקוי שמן ממים?",
    "options": [
      "שכל מה שלא בוחנים נשאר זהה (כמות מים, טמפרטורה, זמן ערבוב) ומשתנה רק שיטת הניקוי",
      "שמשנים את כל התנאים יחד כדי לראות 'מי הכי חזק'",
      "שמשתמשים במים שונים לחלוטין בכל צד בלי מדידה",
      "שלא מודדים כלום בסוף"
    ],
    "correctIndex": 0,
    "explanation": "הוגנות פירושה בידוד גורם אחד: אחרת ההבדל יכול לנבוע ממזל או מתנאי נסתר, לא מהשיטה.",
    "theoryLines": [
      "בדיקה הוגנת מבודדת משתנה עצמאי אחד.",
      "שליטה במשתנים מצמצמת פרשנויות מקושרות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_40",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "אם פעמיים דשן תמיד לא נותן פי שניים יבול, למה זה שובר מודל 'קשר ישר' פשוט בין כמות דשן לתוצאה?",
    "options": [
      "כי מערכות ביולוגיות מגיבות בלמות, במחסור במזינים ובפיזור אופטימלי - לעיתים יש נקודת תואם מיטבית",
      "כי דשן אף פעם לא משפיע",
      "כי יבול תמיד גדל ליניארית לנצח",
      "כי קשר ישר מתאר רק פיזיקה ולא ביולוגיה"
    ],
    "correctIndex": 0,
    "explanation": "מגבלות משאבים, רעילות בכמות גבוהה ושימוש יעיל משתנים לפי רמה - לכן עקומות צמיחה אינן קו ישר פשוט.",
    "theoryLines": [
      "מודלים פשוטים מתאימים לטווח מצומצם.",
      "יישום יתר של קלט עלול לפגוע במקום לעזור."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_41",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה לא מערבבים ברישות בכיתה נוזלים מסומנים 'לא ידוע' כדי 'לראות מה יקרה'?",
    "options": [
      "כי תגובות בלתי צפויות עלולות לשחרר גזים או חום, לפגוע בעור או בדרכי נשימה בלי ציוד הגנה",
      "כי נוזלים לא מגיבים זה עם זה מעולם",
      "כי אסור לכל תלמיד להשתמש בכפפות",
      "כי 'לא ידוע' תמיד אומר שהנוזל מים בטוח"
    ],
    "correctIndex": 0,
    "explanation": "בטיחות במעבדה כוללת זיהוי חומרים, הוראות מורה וציוד. סקרנות טובה מתכננת מראש, לא מסתכנת 'על העיוור'.",
    "theoryLines": [
      "ניסויים כימיים דורשים ידע על מסוכנות חומרים.",
      "נהלי בטיחות מגנים על קהילת הלומדים."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_42",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בנתוני הדרכה מראים שככל ילדים קונים יותר גלידה ביום קיץ יש יותר טביעות בבריכה. מה המסקנה הסבירה ביותר?",
    "options": [
        "השערה היא ניחוש שניתן לבדוק",
        "השערה היא תוצאה סופית",
        "השערה מחליפה מדידה",
        "השערה אינה קשורה לניסוי"
    ],
    "correctIndex": 0,
    "explanation": "מתאמה (קורלציה) אינה סיבה: נתון 'זז יחד' לא מוכיח מנגנון; צריך הסבר, ניסוי או שליטה בגורמים.",
    "theoryLines": [
      "הסקת סיבה דורשת מעבר לשכנות בנתונים.",
      "בניית מודל הסבר כולל בדיקת אלטרנטיבות."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_43",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בניסוי טעם משקה, מעריך המבחן לא יודע איזו כוס היא המקורית. למה זה עוזר?",
    "options": [
      "מפחית הטיית מצפה: המעריך לא ינסה 'להתאים' את תוצאתו לציפייה",
      "מבטיח שהמשקה ישתנה כימית בין הכוסות",
      "מונע מהמשתתפים לשתות",
      "מבטל את צורך בקבוצת בקרה"
    ],
    "correctIndex": 0,
    "explanation": "כשהמודד אינו יודע איזו כוס היא המקורית, פחות סיכוי שהפרשנות תהיה מושפעת מדעה מוקדמת. זה כלי מתודולוגי בסיסי במחקרי חושים.",
    "theoryLines": [
      "מדידה אובייקטיבית מצמצמת הטיות אנושיות.",
      "שקיפות פרוטוקול תומכת באמון."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_44",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "בסדרת זמנים של טמפרטורה יומית יש נקודה אחת חריגה מאוד בלי הסבר מזג אוויר. מה צעד חקר סביר לפני מחיקה?",
    "options": [
      "לבדוק רישום, כיול מכשיר או טעות הקלדה; אם מתאמת טעות - לתעד תיקון ואם לא - לחקור נסיבה מקומית",
      "תמיד למחוק את הנקודה הגבוהה ביותר אוטומטית",
      "תמיד להתעלם כי חריגים לא חשובים",
      "להמציא ערך חדש בלי להסביר"
    ],
    "correctIndex": 0,
    "explanation": "טיפול בחריגים דורש בקרה: זה יכול להיות כיווץ אמת או טעות. מדענים מתעדים החלטות כדי לשמור על שקיפות.",
    "theoryLines": [
      "ניקיון נתונים הוא תהליך ביקורתי, לא 'מחיקה אמנותית'.",
      "יומן מעבדה תומך במעקב אחרי שינויים."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_45",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מכשיר מודד עד עשירית אחידה אבל מכוון בקבועים שגויים. איזה תיאור נכון?",
    "options": [
      "רזולוציה גבוהה לא מתקנת שגיאת מערכת; המספר נראה 'מדויק' אך רחוק מהאמת",
      "אם הרזולוציה גבוהה המכשיר בהכרח מדויק",
      "מכשיר חסר כיול נותן רק מספרים שלמים",
      "שגיאת קבועים נעלמת אם מודדים מהר"
    ],
    "correctIndex": 0,
    "explanation": "ריבוי ספרות אחרי הנקודה לא אומר שהמספר נכון לעולם. כיול מתקן ספי מידה; רזולוציה רק מתארת רגישות לשינוי קטן.",
    "theoryLines": [
      "רזולוציה ודיוק הם ממדים שונים.",
      "נתון צריך להיות נתון מהימן, לא רק עמוק."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_46",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה רושמים תצפית גולמית לפני 'לתרגם' אותה למסקנה מסודרת ביומן מעבדה?",
    "options": [
        "מסקנה מבוססת על הנתונים שנאספו",
        "מסקנה לפני שמודדים",
        "מסקנה בלי קשר לתוצאות",
        "מסקנה שמבטלת את הניסוי"
    ],
    "correctIndex": 0,
    "explanation": "תיעוד גולמי מאפשר לבדוק אם הפרשנות עקבית עם העובדות. זה גם לומדים מאחרים - ומשפרים יכולת ביקורת עצמית.",
    "theoryLines": [
      "נתונים גולמיים הם בסיס לשקיפות.",
      "פרשנות טובה נבדקת מול הרישום המקורי."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "exp_47",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "אם בכל יום מודדים את אורך צל אחרי השיעור באותה שיטה, ותמיד שוכחים לכוון את המד מחדש, איך השגיאה מתנהגת לאורך השבוע?",
    "options": [
      "אותה הטיה שיטתית חוזרת - לא מפוזרת 'באקראי' סביב האמת",
      "השגיאה נעלמת כי חזרה יוצרת ממוצע מושלם",
      "כל יום השגיאה משתנה כיוון באקראי מוחלט",
      "בלי כיול אין משמעות למדידת צל"
    ],
    "correctIndex": 0,
    "explanation": "שגיאת פרוצדורה/מכשיר קבועה יוצרת דפוס שיטתי. חזרה מחזקת את הסיכון הזה אם לא מתקנים מקור.",
    "theoryLines": [
      "פרוטוקולים קבועים ותחזוקת ציוד מפחיתים שגיאות דביקות.",
      "זיהוי דפוס בשגיאה הוא רמז לכיול או מתודולוגיה."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_48",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "חוקר לא פרסם פרטים חסרי רגישות אבל קריטיים לשחזור (ריכוזים, זמני חימום). מה הסיכון לקהילה המדעית?",
    "options": [
      "אחרים לא יכולים לבדוק את הממצא - והידע נשאר לא יציב או תלוי באמון עיוור",
      "זה משפר תמיד את המחקר כי נשמר סוד",
      "שחזור לא נחוץ אם כותבים את המסקנה בלבד",
      "פרטים מספריים מסוכנים לפרסום תמיד"
    ],
    "correctIndex": 0,
    "explanation": "שקיפות מתודולוגית היא חלק מאחריות: בלי פרוטוקול ברור, קשה להפריד בין תגלית לבין טעות או מזל.",
    "theoryLines": [
      "מדע מתבסס על ביקורת חוזרת.",
      "תיעוד מלא מגן גם על חוקרים - פחות אי הבנות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_49",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בניסוי 'כמה מים נשארים בכוס אחרי יום', מה הוגדר בדרך כלל כתוצאה תלויה (dependent) לעומת תנאי שמשנים בכוונה?",
    "options": [
      "כמות המים שנשארה היא התוצאה התלויה; חום/מיקום/כיסוי הם גורמים מניפולטיביים",
      "זמן היום הוא התוצאה התלויה; כמות המים נשארת תמיד קבועה",
      "צבע הכוס הוא התוצאה; המים הם משתנה מניפולטיבי",
      "אין הבדל בין משתנים בניסוי פשוט"
    ],
    "correctIndex": 0,
    "explanation": "משתנה עצמאי הוא מה שבוחרים לשנות; תלוי הוא מה שמודדים כתגובה. דיוק בשפה עוזר לתכנן טבלאות וגרפים.",
    "theoryLines": [
      "סיווג משתנים מארגן חשיבה ניסיונית.",
      "גרפים טובים מציגים תלוי מול עצמאי."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_50",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בנתונים מבית ספר, ממוצע הציון בענף א' גבוה מבענף ב' למרות שבכל כיתה בנפרד ממוצע א' נמוך. איך זה ייתכן?",
    "options": [
      "פרדוקס סימפסון: חלוקת גודל כיתות/רמות שונה בין הענפים יוצרת ממוצע כללי מטעה כשלא מפצלים לפי קבוצה",
      "זה בלתי אפשרי מתמטית",
      "ממוצע תמיד שווה לממוצע החלקי הקטן ביותר",
      "זה קורה רק אם בוחרים תלמידים לפי מזל"
    ],
    "correctIndex": 0,
    "explanation": "ממצא מצטבר יכול להתהפך כשמבחינים בקבוצות משנה - לכן חשוב לשאול 'על איזה חתך מדברים'.",
    "theoryLines": [
      "ניתוח לפי שכבות מגלה דפוסים נסתרים.",
      "נתון מצטבר 'גלובלי' לא תמיד משקף כל קבוצת משנה."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_51",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בודקים אם חומץ מפחית קילוף שמדליק מקל גפרור. למה חשוב שכל הקבוצות יעבדו באותה טמפרטורת סביבה דומה?",
    "options": [
      "כי קצב תגובות כימיות/התפשטות גז תלוי בטמפרטורה ועלול להסוות השפעת החומץ",
      "טמפרטורה משפיעה רק על צבע הקילוף",
      "בניסוי כימי אין משתנים מפריעים",
      "קור בחדר מבטל את הצורך בבקרה"
    ],
    "correctIndex": 0,
    "explanation": "טמפרטורה היא משתנה מפתח לקצב וללחץ אדי; אם היא שונה בין קבוצות, קשה לייחס שינוי לחומץ.",
    "theoryLines": [
      "משתני סביבה משפיעים על קינטיקה.",
      "בקרה מפחיתה הטיות חבויות."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "exp_52",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה התפקיד של ביקורת עמיתים (peer review) בתהליך פרסום מדעי?",
    "options": [
      "בודקים מתודולוגיה, עקביות ורלוונטיות לפני שמקבלים לפרסום רבים - לא 'חותמת אמת סופית'",
      "מוודאים שכל מסקנה נכונה ב 100% לפני כל ניסוי",
      "מחליפים ניסויים בשדה",
      "מונעים מכל חוקר לפרסם לנצח"
    ],
    "correctIndex": 0,
    "explanation": "ביקורת עמיתים היא סינון ושיפור, לא אורקל: ממצאים יכולים להשתנות אחרי שחזורים. עם זה היא מפחיתה טעויות גסות.",
    "theoryLines": [
      "ידע מדעי הוא תהליך חברתי ביקורתי.",
      "לקרוא מקור מקורי עדיין דורש חשיבה ביקורתית."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_29",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "באזור קו המשווה, אנרגיית השמש 'מתפזרת' על שטח גדול יותר של פני כדור הארץ מאשר בקטבים (לאותה שעה מקומית). מה ההסבר הכללי לכך שאקלים קו המשווה חם יותר בממוצע?",
    "options": [
      "זווית שמש גבוהה יחסית מרכזת יותר אנרגיה ליחידת שטח, לעומת קרניים 'שטוחות' שמפזרות את אותה אנרגיה על שטח גדול יותר בקווי רוחב גבוהים",
      "השמש נמצאת תמיד קרובה יותר פיזית לקו המשווה מכל נקודה אחרת בכדור",
      "בקטבים אין קרינת שמש בכלל",
      "קו המשווה חם רק בגלל שממים נוסים"
    ],
    "correctIndex": 0,
    "explanation": "גיאומטריית קרינה ויום שנה קובעים כמה אנרגיה מגיעה ליחידת שטח לאורך זמן - זה בסיס להבנת חגורות אקלים.",
    "theoryLines": [
      "זווית השפעה של קרינה קשורה ליום שנה וקו רוחב.",
      "אקלים הוא ממוצע לטווח ארוך; מזג אוויר הוא לטווח קצר."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_30",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "ביום שמש קטע חוף מתחמם; בלילה הים נשאר חמים יחסית. איזו תמונה תיאורית נכונה לרוח חוף נוחה ביום?",
    "options": [
      "אוויר חם יחסית מעל היבשה עולה; אוויר יחסית קר מעל המים 'ממלא' - רוח מהים ליבשה",
      "רוח תמיד נושבת מההרים לים בצוהריים",
      "הים תמיד קר יותר מהיבשה בצוהריים",
      "אין קשר בין הבדלי חימום לניעת אוויר"
    ],
    "correctIndex": 0,
    "explanation": "הבדלי חימום סגולי בין מים ליבשה יוצרים הבדלי לחץ מקומיים ורוחות ים יבשה משתנות במחזור יומי.",
    "theoryLines": [
      "חום סגולי שונה לחומרים שונים.",
      "רוח היא תנועת אוויר מלחץ גבוה לנמוך."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_31",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה שלב הירח בלילה מסוים לא נגרם בעיקר מעננות כמו 'וילון' שמסתיר חלקים מהירח?",
    "options": [
      "כי בשלבים שונים רואים שונה את חלק מכדור הירח המואר - תלות בגאומטריה ירח ארץ שמש, לא בענן מקומי",
      "כי עננים יוצרים ירח מלא בכל לילה",
      "כי הירח מאיר את עצמו ללא קשר לשמש",
      "כי מיקום הירח לא משתנה לעולם"
    ],
    "correctIndex": 0,
    "explanation": "פאזות הירח נובעות מהאור הנראה המוחזר והצל שמטיל כדור הארץ/זווית השפעה - ענן יכול להסתיר אבל לא 'ליצור' פאזה.",
    "theoryLines": [
      "שמש מקור האור; הירח משקף חלק הנראה לפי מיקום.",
      "תצפית תלויה גם בהירות שמים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_32",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איך מסדרת גזי חממה כמו CO₂ מחממת את הקרקע בהשוואה לכוכב ללא אטמוספרה עבה דומה?",
    "options": [
      "אור נראה נכנס; חלק מהקרינה בתת אדום נבלע/מוחזק ומאט יציאת אנרגיה לחלל - מאזן אנרגטי שמקושר לטמפרטורה ממוצעת גבוהה יותר",
      "CO₂ יוצר אור חדש בתוך האטמוספרה",
      "הם חוסמים את כל קרינת השמש לחלוטין",
      "הם מקררים ישירות על ידי יצירת קרח באטמוספרה"
    ],
    "correctIndex": 0,
    "explanation": "אטמוספירה פעילה אינה חממה זכוכית פשוטה, אבל הרעיון המרכזי: כשחלק מהאנרגיה הנפלטת חוזר פנימה, המאזן הקרינתי מתחמם בממוצע.",
    "theoryLines": [
      "אנרגיה מהשמש מוזנת ומוחזרת לחלל.",
      "הרכב אטמוספרה משפיע על מאזן קרינתי."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_33",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "באיזה סוג סלעים נוטים למצוא לרוב מאובנים טובים יחסית, ולמה?",
    "options": [
      "במשקעים, כי שכבות נדחסו עם הזמן ושמרו הדפסות/שלדים רכים יחסית בלי התכה",
      "בסלעים מגמטיים (מותכים), כי חום גבוה משמר DNA",
      "במסה מותכת, כי היא קופאת סביב המאובנים בלי חיכוך",
      "בכל סלע בלי קשר להיווצרות"
    ],
    "correctIndex": 0,
    "explanation": "משקעים נוצרים מהצטברות והלחמה; הם מייצגים שלבים סביבתיים בהם נותרו עקבות חיים. סלעים מותכים 'מחקו' לעיתים מבנים עדינים.",
    "theoryLines": [
      "מחזור סלעים כולל לדוגמה התגבשות, התכה וסחיפה/השקעה - לא תמיד באותו סדר.",
      "מאובנים הם ראיות לחיים בעבר גאולוגי."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_34",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה מערכות סופתיות גדולות בחצי הכדור הצפוני נוטות לסובב בכיוון עקבי (ברמת עקרון לימודי)?",
    "options": [
      "הסטייה של אפקט קוריוליס ביחס לציר סיבוב כדור הארץ מטה את מסלולי הסיבוב של מערכות גדולות לאורך זמן",
      "כי השמש דוחפת סופות בכיוון אחד קבוע יומי",
      "כי הכבידה גדולה יותר בקטבים ולכן הסיבוב הפוך במיידי",
      "כי רוח תמיד זורמת ממזרח למערב בלי עקממיות"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב כדור הארץ מוסיף הסטה לתנועה גדולה בזמן; זה לא מסביר קומפס יומי בכוס מים, אבל כן דפוסים גלובליים במודלים פשוטים.",
    "theoryLines": [
      "מסה גדולה ואורך זמן חשובים להבחין באפקטים כיווניים.",
      "מודלים מפשטים עוזרים וגם מגבילים-חשוב הקשר קנה מידה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_weather",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_35",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה שימור 'אגני ניקוז' (נחלים ושטחי ספיגה בראשיתם) תורם להגנה על מים במורד?",
    "options": [
      "כי מעכבים/מסננים זרימה חזקה, מפחיתים סחיפה ומאפשרים חלחול במקום הצפות מהירות עם משקעים מזהמים",
      "כי בראשית הנחל תמיד אין שום זיהום ולכן אין קשר למורד",
      "כי סחיפה לא קיימת בנחלים",
      "כי מים לא רוצים לזרום למטה"
    ],
    "correctIndex": 0,
    "explanation": "ניהול נוף משפיע על מהירות המים והעומס אצל המשקעים. הגנה במקור מפחיתה עלויות בקהילות במורד הזרימה.",
    "theoryLines": [
      "מחזור המים מחבר ראשית למישור.",
      "מניעת סחיפה שומרת על איכות מים וקרקע."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_36",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה אפר געשי עלול להשפיע גם על טיסה מעל אזורים רחוקים מההתפרצות, ולפעמים גם על טמפרטורה זמנית באקלים?",
    "options": [
      "כי חלקיקים וגזים מגיעים לגבהים גדולים, משנים איכות אוויר והתפלגות קרינה - ובקנה מידע רלוונטי גם לבטיחות טיסה",
      "כי אפר געשי נשאר תמיד רק מעל לוע הר הגעש ולא יכול לזוז ברוח",
      "כי התפרצות משנה את מרחק ארץ שמש",
      "כי מטוסים ניזונים מאפר ולכן עוצרים"
    ],
    "correctIndex": 0,
    "explanation": "ענן אפר געשי חזק יכול להישא לאלפי קילומטרים; השפעה על ראות/מנועים ועל איזון קרינתי לטווח קצר - נושא שקשור גם לאקלים וגם לבטיחות טיסה.",
    "theoryLines": [
      "אטמוספרה היא מערכת מקושרת כדורית.",
      "תופעות געשיות יכולות להיות מקומיות וגם גלובליות לפי העוצמה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_37",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איפה בעיקרון ממוקמת שכבת האוזון שחוסמת חלק מה UV, ולמה חשיבותה לחיים בפני השטח?",
    "options": [
      "בסטרטוספרה; צמצום קרינת מעלסגול קשיחה מפחית נזקים ל-DNA בעור, בצמחים ולמערכות אקולוגיות רגישות",
      "בליבה; שם מתחממים אוקיינוסים",
      "על פני הירח בלבד",
      "בתוך האוקיינוס בלבד"
    ],
    "correctIndex": 0,
    "explanation": "אוזון הוא חלק מרכיבי אטמוספירה מורכבת; פגיעה בו מחברת חשיפת קרינה לבריאות ולמערכות ייצור מזון.",
    "theoryLines": [
      "אטמוספרה בנויה שכבות עם תפקידים שונים.",
      "קרינה מהשמש מעצבת סביבה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_38",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה הגורם העיקרי לגאות ושפל בים סמוך לחוף בקנה מידה יומי?",
    "options": [
      "משיכה גרביטציונית של הירח ושל השמש (ומיקום יחסי), לא רק טמפרטורת המים",
      "אך ורק רוחות סוחפות בלי השפעת ירח",
      "התפשטות חום ממדבר בלי השפעת ירח ושמש",
      "צבע המים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "גאות קשורות לשדות משיכה ומומנט דוחה של שמש/ירח; רוח משפיעה אבל לא מסבירה לבד את המחזור הכפול היומי במקומות רבים.",
    "theoryLines": [
      "כוח משיכה פועל על מאסות גדולות ומים נוטים להגיב.",
      "תופעות ימיות יכולות לשלב כמה גורמי עזר."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_39",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה הקשר האמיתי בין רעידות אדמה חזקות לבין לוחות טקטוניים בקנה לימודי?",
    "options": [
        "כוכב לכת קרוב לשמש",
        "כוכב רחוק מהגלקסיה",
        "לוויין של ירח",
        "ענן גז בלבד"
    ],
    "correctIndex": 0,
    "explanation": "דינמיקת לוחות מסבירה מיקומי רעידות/חזיתות וטווח סיכון; זה בסיס להבנת סיכונים ולבנייה מותאמת.",
    "theoryLines": [
      "קרום כדור הארץ אינו אחיד ונייח.",
      "גלים סייסמיים נוצרים מתנועה והתפרצות לחץ."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_40",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איך צמצום שטח קרח והחלפתו במי ים כהים יחסית עלולים, ברעיון, להאיץ חימום אזורי בלי צורך במספרים מדויקים?",
    "options": [
      "פחות אלבדו: פני מים כהים בולעים יותר קרינה מהקרח המחזיר; לולאת משוב חיובית מחמירה מגמה מקומית",
      "קרח תמיד כהה ממים ולכן מחמם יותר",
      "אין קשר בין צבע פני כדור הארץ לגריעת אנרגיה",
      "מים לא סופגים קרינת שמש כלל"
    ],
    "correctIndex": 0,
    "explanation": "אלבדו - מידת ההחזר - משפיע על כמה אנרגיה נבלעת; שינוי מקרח למים משנה מאזן אנרגיה מקומי ויכול לתמוך במשובים.",
    "theoryLines": [
      "משובים באקלים מסבירים שינויים מהירים מקומיים.",
      "אוקיינוס וקרח עוגנים אקלים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_41",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה נטיפים וזקיפים (סטלאקטיטים וסטלאגמיטים) בתוך מערות נוצרים לאט מאוד - לרוב לאורך אלפי שנים?",
    "options": [
      "כי המים ממיסים סידן ומצטברים מחדש בהדרגה; המסה והשקיעה הם תהליכי טיפהטיפה",
      "כי הם נוצרים בהתפרצות געשית מהירה בכל מערה",
      "כי מערה חמה מדי לכל מסה",
      "כי מים לא יכולים להמיס סלע"
    ],
    "correctIndex": 0,
    "explanation": "קארסט הוא דינמיקה כימית הידרולוגית; קצב איטי אבל מתמשך יוצר מבנים חדים.",
    "theoryLines": [
      "סלעים משתנים גם בקנה מידה גאולוגי לאט.",
      "מים הם סוכן מסה ומוגה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_42",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה הקשר בין טבעת האש (פס געשי רעידות סביב האוקיינוס השקט) לבין ריכוז רעידות והתפרצויות?",
    "options": [
      "גבולות לוחות במפגשים יוצרים תנועה טקטונית ומהלכי מאגמה - ולכן פעילות גבוהה בקשת המסומנת",
      "זה קו שרק מציין מיקום דגים ולא קשור ללוחות",
      "לוחות נפרדים לעולם אינם יכולים לפגוע בגבול משותף",
      "טבעת האש היא רק מרכז תרבותי"
    ],
    "correctIndex": 0,
    "explanation": "מפת גבולות לוחות מסייעת לחזות איפה אנרגיה גאולוגית משוחררת; זה כלי חשיבה גאוגרפי מדעי.",
    "theoryLines": [
      "מבנה כדור הארץ כולל גבולות בין לוחות טקטוניים.",
      "געש ורעידות משתפים הקשרים טקטוניים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_43",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "איזה תנאי ים תומך בלידה וחיזוק של סופה טרופית חזקה - ברמת ידע בית ספרית?",
    "options": [
      "מי ים חמים העליונים שמזרימים אנרגיה ולחות לאטמוספרה ומאפשרים סיבוב מאורגן יותר",
      "מי ים קרים מאוד בלבד",
      "עונת חורף יבשה לחלוטין ללא אדי מים",
      "לחץ אוויר גבוה מאוד בלבד בלי סיבוב"
    ],
    "correctIndex": 0,
    "explanation": "אנרגיה לטנטית מחומם האוקיינוס היא 'דלק' למערכות; לכן שינויי טמפרטורת ים קשורים לסיכון אזורי.",
    "theoryLines": [
      "אוקיינוס ואטמוספרה מחליפים אנרגיה ולחות.",
      "התפתחות סופה היא תהליך רבשלבי."
    ],
    "params": {
      "patternFamily": "sci_earth_space_weather",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_44",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה 'מחזור סלעים' אינו רצף אחיד קבוע של ארבעה שלבים שתמיד חוזרים באותו סדר מהיר?",
    "options": [
      "כי דרכים שונות (טמפרטורה, לחץ, מסה, הובלה) יוצרות מסלולים שונים; סלע יכול לדלג/לחזור לפי נסיבות",
      "כי סלע תמיד נשאר מאובן לנצח בלי שינוי",
      "כי יש רק שלב אחד: התגבשות",
      "כי מחזור קורה פעם אחת בכל כדור ארץ ונעצר"
    ],
    "correctIndex": 0,
    "explanation": "המחזור הוא מודל מחשבתי המקשר תהליכים; בפועל היסטוריה גאולוגית יכולה להיות מורכבת ולכלול 'קפיצות' לסוג אחר.",
    "theoryLines": [
      "מודלים מפשטים את המציאות ולא מחליפים אותה.",
      "סלעים 'מספרים' היסטוריה של תהליכים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_45",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה אקלים ליד קו המשווה נבדל בדרך כלל מאקלים ליד קטבים מעבר להבדלי שמש בלבד?",
    "options": [
        "סיבוב כדור הארץ סביב צירה",
        "השמש נעלמת בלילה",
        "הירח מסתיר את השמש",
        "העננים כבים את האור"
    ],
    "correctIndex": 0,
    "explanation": "מערכת אקלים היא רבת משתנים: אוקיינוס, ירח, אלבדו, זרימות. קו רוחב הוא נקודת התחלה, לא הסוף.",
    "theoryLines": [
      "אקלים הוא תוצאה של אנרגיה ומים על פני כדור.",
      "מפות אקלים מסכמות ממוצעים לאורך זמן."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_46",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "בשנה יבשה, למה קידוח באקוויפר מקומי עלול להעמיק יובש בשטחים מרוחקים מהבור?",
    "options": [
      "כי מי התהום כפופים למשטר הידרולוגי; שאיבה משנה לחצים/מפלים, מאטה התחדשות ועלולה לייבש יובלים נסתרים במורד",
      "מי תהום לא זזים מעולם בין נקודות",
      "קידוח מוסיף מים ללא הגבלה בלי השפעה על שכנים",
      "יבש נמדד רק במדחום בור"
    ],
    "correctIndex": 0,
    "explanation": "משאבי מים תת קרקעיים משותפים לעיתים; ניצול חריף פוגע בזמינות לחיים, חקלאות ונחלים.",
    "theoryLines": [
      "מחזור המים כולל חלחול וזרימה תת קרקעית.",
      "ניהול משאב דורש הכרת אקוויפר משותף."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_47",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה גובה צל במרכז ישראל משתנה במהלך היום בהנחת יום בהיר?",
    "options": [
      "כי זווית קרני השמש משתנה עם סיבוב כדור הארץ - הצל נטה ומתקצר/מתארך",
      "כי השמש סובבת סביב כדור הארץ בגובה קבוע לעיל",
      "כי צל תלוי רק בעננים ולא בשעה",
      "כי כדור הארץ שטוח לכן אין שינוי זווית"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב יומי משנה קו אופק השמש ולכן צל; זה קשור לשעות, עונות וקו רוחב.",
    "theoryLines": [
      "תנועה יום לילה נובעת מסיבוב כדור הארץ.",
      "מודל גיאומטרי של צל ואור מסביר במעבדה פשוטה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_48",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה מזג אוויר בודד ליומיים יכול להיות קריר בעוד שמגמת שנה שלמה מתחממת - ברמת הבדל מושגים?",
    "options": [
      "מזג אוויר הוא שינויים קצרי טווח; אקלים הוא ממוצע/שכיחות לאורך זמן - השקיעה ביום קר לא מבטלת מגמה שנתית",
      "אין הבדל בין יום לעשור",
      "אם יום אחד קר, השנה בהכרח קרה יותר מהממוצע",
      "מדידת טמפרטורה לא משפיעה על כלום"
    ],
    "correctIndex": 0,
    "explanation": "ניסוח מדעי מדויק מונע 'הסקות קופצניות' ממקרה בודד. זה חשוב בדיון על הקצה אקלימי.",
    "theoryLines": [
      "שונות טבעית קיימת בתוך מגמות.",
      "סטטיסטיקה בולטת רק אחרי מספיק זמן."
    ],
    "params": {
      "patternFamily": "sci_earth_space_weather",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "standard"
    }
  }
];
