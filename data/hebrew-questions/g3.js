import {
  G3_READING_EASY,
  G3_READING_MEDIUM,
  G3_READING_HARD,
} from "../hebrew-g3-reading-bank.js";

﻿// Metadata enrichment (safe pass): skillId, subtype (grade subskill), difficulty, cognitiveLevel, expectedErrorTypes. Inline // comments inside arrays may be normalized when this file is rewritten from structured data. See reports/question-metadata-qa/hebrew-archive-metadata-apply-report.json.
// Metadata enrichment (safe pass): skillId, subtype (grade subskill), difficulty, cognitiveLevel, expectedErrorTypes. Inline // comments inside arrays may be normalized when this file is rewritten from structured data. See reports/question-metadata-qa/hebrew-archive-metadata-apply-report.json.
export const G3_EASY_QUESTIONS = {
  "reading": [
    {
      "question": "קרא את הטקסט: 'מיה קוראת ספר על חיות בגן החיות. היא לומדת על האוכל של כל חיה.' מה הנושא העיקרי?",
      "answers": [
        "למידה על חיות בגן החיות",
        "משחק בכדורגל",
        "ציור בכיתה",
        "אוכל בחדר האוכל"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_main_idea"
    },
    {
      "question": "קרא את המשפט: 'הילדים קוראים ספרים ומתכוננים למבחן'. על מה מדבר המשפט?",
      "answers": [
        "קריאה והכנה למבחן",
        "משחק בחצר",
        "ציור על הלוח",
        "אוכל בצהריים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_sentence_topic"
    },
    {
      "question": "קרא את הטקסט: 'השמש זורחת בבוקר. הציפורים שרות. הכל יפה.' כמה משפטים יש בטקסט?",
      "answers": [
        "3",
        "2",
        "4",
        "1"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_count_sentences"
    },
    {
      "question": "קרא את הטקסט: 'אמא אפתה עוגה ליום ההולדת. הריח ממלא את הבית. כולם מחכים לטעום.' מה קורה בבית?",
      "answers": [
        "מכינים עוגה ומחכים לטעום",
        "יוצאים לטיול ביער",
        "קונים נעליים חדשות",
        "כותבים מכתב לסבתא"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_main_idea"
    },
    {
      "question": "קרא את הטקסט: 'נועם שמר על הצמח בחלון. הוא השקה אותו בכל יום. העלים נשארו ירוקים.' מה עשה נועם?",
      "answers": [
        "השקה את הצמח בקביעות",
        "שבר את האגרטל",
        "שכח להדליק אור",
        "מכר את הצמח"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_detail"
    },
    {
      "question": "קרא את הטקסט: 'בכיתה יש מפה על הקיר. התלמידים מוצאים עליה את העיר שלהם.' למה המפה בכיתה?",
      "answers": [
        "לעזור למצוא מקומות",
        "לצייר פנים של חיות",
        "להחליף ספרים",
        "לשמור על השקט"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_purpose_lite"
    },
    {
      "question": "קרא את הטקסט: 'גשם ירד בבוקר. התלמידים נכנסו עם מעילים. המורה פתחה את החלון מעט.' מה מספר הטקסט על מזג האוויר?",
      "answers": [
        "יום גשום בבית הספר",
        "יום חם בחופש",
        "לילה שלם בים",
        "סופת שלג בקיץ"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_main_idea"
    },
    {
      "question": "קרא את הטקסט: 'הכלב של דנה רץ בגינה. הוא מצא עציץ ושיחק איתו. אחר כך שתה מים מהקערה.' מה עשה הכלב אחרי המשחק?",
      "answers": [
        "שתה מים מהקערה",
        "כתב סיפור בכיתה",
        "נסע באוטובוס",
        "קנה כובע חדש"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_sequence"
    },
    {
      "question": "קרא את הטקסט: 'המורה קראה סיפור על ידידות. התלמידים הקשיבו בשקט. בסוף דיברו על הדמויות.' מה עשו התלמידים בסוף?",
      "answers": [
        "דיברו על הדמויות בסיפור",
        "יצאו לחצר מיד",
        "כתבו מבחן מתמטיקה",
        "אכלו ארוחת בוקר"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_detail"
    },
    {
      "question": "קרא את הטקסט: 'ליאו אסף פחיתים למיחזור. הוא מיין אותן לשקית נפרדת. הכיתה קיבלה תג מצטיינים.' למה אסף ליאו פחיות?",
      "answers": [
        "למחזר ולשמור על הסביבה",
        "לבנות בית מניווט",
        "למכור צעצועים",
        "לצבוע את הקירות"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_inference_lite"
    },
    {
      "question": "קרא את הטקסט: 'שרה שמרה סימניה בין עמודי הספר. היא חזרה לקרוא באותו מקום למחרת.' למה שרה השתמשה בסימניה?",
      "answers": [
        "כדי לזכור היכן הפסיקה לקרוא",
        "כדי למחוק את הספר",
        "כדי לצבוע את העמודים",
        "כדי להחליף כריכה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_inference_lite"
    },
    {
      "question": "קרא את הטקסט: 'בספרייה שקט. ילדים יושבים וקוראים. הספרנית עוזרת למצוא ספר.' איך מתנהגים הילדים?",
      "answers": [
        "בשקט וקוראים",
        "צועקים ורצים",
        "רוקדים בין המדפים",
        "מבשלים אוכל"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_detail"
    },
    {
      "question": "קרא את הטקסט: 'אביב נתן לחבר מחברת צבעים. החבר חייך והודה לו. שניהם חזרו לצייר.' מה למדנו על אביב?",
      "answers": [
        "הוא נתן מתנה לחברו",
        "הוא מחק את הציור",
        "הוא איבד את התיק",
        "הוא ישן בכיתה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_character"
    },
    {
      "question": "קרא את הטקסט: 'הרוח נשפה. העלה עף מהעץ. התלמידים תפסו אותו בחצר.' מה קרה לעלה?",
      "answers": [
        "עף בגלל הרוח",
        "נשרף באש",
        "הפך לעוגה",
        "נבלע במים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_cause_effect"
    },
    {
      "question": "קרא את הטקסט: 'הילדים כתבו ברכה לחג. כל אחד קרא בקול. המורה אספה את הדפים לקיר.' מה עשתה המורה?",
      "answers": [
        "הציגה את הברכות על הקיר",
        "מכרה את הדפים",
        "זרקה את הדפים",
        "שכחה את השיעור"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_detail"
    },
    {
      "question": "קרא את הטקסט: 'תמר אהבה את הסיפור כי הגיבור סייע לחבר. היא אמרה שהלב חשוב.' מה חשוב לתמר בסיפור?",
      "answers": [
        "עזרה לחברים וטוב לב",
        "ניצחון במירוץ בלבד",
        "קניית צעצועים",
        "אכילת ממתקים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_message"
    },
    {
      "question": "קרא את הטקסט: 'בבוקר הכיתה מדדה אורך השולחן. אחר כך רשמה את המספר בטבלה.' למה מדדו את השולחן?",
      "answers": [
        "כדי לרשום מדידה בטבלה",
        "כדי לצבוע את הקיר",
        "כדי לשיר שיר",
        "כדי לפתוח חלון"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_detail"
    },
    {
      "question": "קרא את הטקסט: 'האח הגדול עזר לאחותו לקשור שרוכים. היא חייכה והצליחה לבד.' מה תפקיד האח?",
      "answers": [
        "עזר לאחותו עד שהצליחה",
        "לקח את השרוכים",
        "כתב את שיעורי הבית",
        "שיחק בטלפון"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_character"
    },
    {
      "question": "מ_בחן?",
      "answers": [
        "מבחן",
        "מבחנה",
        "מבחני",
        "מבחנת"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_spelling"
    },
    {
      "question": "קרא את הטקסט: 'הדגים בכסא נראו כחולים. הילדים ספרו כמה דגים ראו.' על מה מדבר הטקסט?",
      "answers": [
        "ספירת דגים בכסא",
        "בישול עוגה",
        "טיול בחלל",
        "כתיבת שיר אופרה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_main_idea"
    },
    {
      "question": "קרא את הטקסט: 'לפני הצגה הכיתה תרגלה. כולם זכרו את התפקיד. ההצגה עברה בהצלחה.' מה עשתה הכיתה לפני ההצגה?",
      "answers": [
        "תרגלה את התפקידים",
        "אכלה פיצה",
        "נעצרה בבית חולים",
        "מכרה כרטיסים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_sequence"
    }
  ],
  "comprehension": [
    {
      "question": "מה המשמעות של 'ילדים קוראים ספרים ומתכוננים למבחן'?",
      "answers": [
        "ילדים קוראים ספרים ומתכוננים למבחן",
        "ילדים משחקים",
        "ילדים אוכלים",
        "ילדים ישנים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    },
    {
      "question": "מה ההשוואה בין 'בוקר' ל-'ערב'?",
      "answers": [
        "בוקר - התחלת היום, ערב - סוף היום",
        "בוקר - ערב",
        "אין הבדל",
        "בוקר - לילה"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    },
    {
      "question": "מה המשמעות של 'ספר מעניין'?",
      "answers": [
        "ספר מעניין",
        "ספר משעמם",
        "ספר קטן",
        "ספר גדול"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    }
  ],
  "writing": [
    {
      "question": "איזה פתיחה טובה לפסקה על 'יום כיף'?",
      "answers": [
        "היה לי יום כיף היום",
        "היום יום",
        "כיף",
        "אני"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    },
    {
      "question": "איך מסיימים פסקה?",
      "answers": [
        "בסימן נקודה",
        "בסימן שאלה",
        "בסימן קריאה",
        "בלי סימן"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    },
    {
      "question": "איזה משפט נכון?",
      "answers": [
        "אני קורא ספר ומתכונן למבחן",
        "אני קוראת ספר ומתכוננת למבחן",
        "אני קוראים ספר ומתכוננים למבחן",
        "אני קוראות ספר ומתכוננות למבחן"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    }
  ],
  "grammar": [
    {
      "question": "מה הזמן של המילה 'קורא'?",
      "answers": [
        "הווה",
        "עבר",
        "עתיד",
        "לא ידוע"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    },
    {
      "question": "מה הזמן של המילה 'קראתי'?",
      "answers": [
        "עבר",
        "הווה",
        "עתיד",
        "לא ידוע"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    },
    {
      "question": "מה מילת הקישור במשפט: 'אני קורא ספר וגם כותב מכתב'?",
      "answers": [
        "וגם",
        "אני",
        "קורא",
        "מכתב"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    }
  ],
  "vocabulary": [
    {
      "question": "מה המשמעות של המילה 'הרפתקאות'?",
      "answers": [
        "הרפתקאות",
        "משעמם",
        "רגיל",
        "פשוט"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_vocabulary",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    },
    {
      "question": "מה המשמעות של המילה 'מבחן'?",
      "answers": [
        "מבחן",
        "שיעור",
        "ספר",
        "כיתה"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_vocabulary",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ],
  "speaking": [
    {
      "question": "איך אומרים 'אני מתכונן למבחן'?",
      "answers": [
        "אני מתכונן למבחן",
        "אני מתכוננת למבחן",
        "אני מתכוננים למבחן",
        "אני מתכוננות למבחן"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_speaking",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    },
    {
      "question": "איך מתארים חוויה?",
      "answers": [
        "אני מספר מה קרה",
        "אני שותק",
        "אני בוכה",
        "אני צוחק"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_speaking",
      "subtype": "g3",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ]
};

export const G3_MEDIUM_QUESTIONS = {
  "reading": [
    {
      "question": "קרא את הטקסט: 'רוני הגיע מוקדם לספרייה. הוא חיפש ספר על כוכבים. הספרנית הראתה לו מדף מיוחד.' מה רצה רוני לקרוא?",
      "answers": [
        "ספר על כוכבים",
        "ספר בישול",
        "ספר על בגדים",
        "ספר בלי תמונות"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_detail"
    },
    {
      "question": "קרא את הטקסט: 'בשדה התלמידים ראו פרפרים צבעוניים. הם רשמו בחוברת כמה צבעים מצאו. אחר כך שיתפו ממצאים.' מה עשו התלמידים אחרי הספירה?",
      "answers": [
        "שיתפו את הממצאים עם הכיתה",
        "מחקו את החוברת",
        "יצאו מהבית ספר",
        "החליפו מורה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_sequence"
    },
    {
      "question": "קרא את הטקסט: 'נעמה שמרה על כלב במשך שבוע. היא האכילה אותו בזמן והוליכה לטיול. הבעלים הודו לה בכתב.' למה כתבו הבעלים תודה?",
      "answers": [
        "כי נעמה דאגה לכלב היטב",
        "כי נעמה איבדה את הכלב",
        "כי הכלב לא אכל",
        "כי נעמה לא הגיעה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_inference"
    },
    {
      "question": "קרא את הטקסט: 'במקראה קראו על גיבורה שעזרה לקהילה. הילדים דנו אם היו מעיזים לעשות כמוה.' מה נושא השיחה בכיתה?",
      "answers": [
        "האם היו מעיזים לעזור כמו הגיבורה",
        "איך לקנות מחברות",
        "מתי מתחיל החופש",
        "למה יש שיעורי בית"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_message"
    },
    {
      "question": "קרא את הטקסט: 'איתי שכח מטריה ונרטב בדרך. המורה נתנה לו חולצה יבשה ודיברה איתו על תכנון.' מה הלקח של איתי?",
      "answers": [
        "לתכנן לקחת מטריה בגשם",
        "לא ללכת לבית ספר",
        "למחוק את התיק",
        "לצייר על הקיר"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_inference"
    },
    {
      "question": "קרא את הטקסט: 'הכיתה ביקרה במוזיאון טבע. מדריך הסביר על שלד דינוזאור. התלמידים רשמו שאלה אחת.' מה עשו התלמידים במוזיאון?",
      "answers": [
        "האזינו להסבר ורשמו שאלה",
        "שיחקו כדורגל",
        "קנו גלידה",
        "ישנו באולם"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_detail"
    },
    {
      "question": "קרא את הטקסט: 'שתי דמויות בסיפור לא הסכימו בתחילה. בסוף מצאו פתרון ושיתפו פעולה.' מה השתנה בסוף הסיפור?",
      "answers": [
        "הן שיתפו פעולה",
        "הן נעלמו",
        "הן הפסיקו לדבר לנצח",
        "הן עזבו את בית הספר"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_plot"
    },
    {
      "question": "קרא את הטקסט: 'בעיתון בית הספר פורסם כתבה על מיחזור. התלמידים הוסיפו ציור וטיפ לקוראים.' למי מיועה הטיפ בכתבה?",
      "answers": [
        "לתלמידי בית הספר",
        "לחייזרים בחלל",
        "לדינוזאורים",
        "לדגים בים בלבד"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_audience"
    },
    {
      "question": "קרא את הטקסט: 'הסבתא סיפרה על בית ילדותה בכפר. הנכדים שאלו על החיות והגינה.' מה רצו הנכדים לדעת?",
      "answers": [
        "איך היה החיים בכפר",
        "כמה עולה מכונית",
        "איך מפעילים טלוויזיה",
        "מתי מתחיל מבחן"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_detail"
    },
    {
      "question": "קרא את הטקסט: 'לפני המשחק התלמידים קראו חוקים. כולם הסכימו לכבד אחד את השני.' למה קראו חוקים?",
      "answers": [
        "כדי לשחק בצורה הוגנת",
        "כדי לא לשחק בכלל",
        "כדי לישון",
        "כדי לצבוע קירות"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_purpose"
    },
    {
      "question": "קרא את הטקסט: 'הגיבור בחר להגיד את האמת, גם כשהיה קשה. חבריו סלחו לו בסוף.' מה עשה הגיבור?",
      "answers": [
        "אמר את האמת",
        "גנב צעצוע",
        "הסתיר ספר",
        "ברח מהכיתה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_character"
    },
    {
      "question": "קרא את הטקסט: 'בטיול הכיתה מצאה נוצה על שביל. המורה ביקשה לא לקחת מטבעות טבע.' מה ביקשה המורה?",
      "answers": [
        "לשמור על הטבע ולא לאסוף הכל",
        "לאכול את הנוצה",
        "לזרוק אשפה בשביל",
        "לרוץ לבד"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_message"
    },
    {
      "question": "קרא את הטקסט: 'הילדה כתבה יומן על יום גשום. היא תיארה ריח של אדמה וצליל טיפות.' מה סוג הטקסט?",
      "answers": [
        "תיאור אישי של יום גשום",
        "טבלת מספרים",
        "רשימת קניות",
        "הוראות מבחן"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_genre"
    },
    {
      "question": "קרא את הטקסט: 'בסוף הסיפור הגיבור החזיר חפץ שמצא. הבעלים שמח והזמין אותו לתה.' למה שמח הבעלים?",
      "answers": [
        "כי החזירו לו חפץ שאבד",
        "כי הגיבור עזב את העיר",
        "כי לא היה סיפור",
        "כי ירד שלג"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_inference"
    },
    {
      "question": "קרא את הטקסט: 'התלמידים השוו בין שני סיפורים: באחד הגיבור עזר, בשני הוא ויתר. הם דנו מה עדיף.' מה נושא הדיון?",
      "answers": [
        "השוואה בין עזרה לוויתור",
        "ספירת כיסאות",
        "צבעי עפרונות",
        "זמני ארוחה"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_medium_compare"
    },
    {
      "question": "טקסט מידעי מול סיפור (1): 'בטבלה: 12 ימים עם גשם, 18 בלי גשם.' לעומת סיפור: 'הגשם דפק על החלון.' מה ההבדל בז׳אנר?",
      "answers": [
        "במידע יש עובדות ובסיפור יש עלילה ותיאור חווייתי",
        "אין הבדל",
        "שניהם רק שירים",
        "במידע חייבת להיות עלילה"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_reading",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error"
      ],
      "subtopicId": "g3.genre_tag_info_vs_story",
      "patternFamily": "phase717_p0_genre"
    },
    {
      "question": "'המים רותחים ב - 100°C ( בלחץ אטמוספרי רגיל ) .' לעומת: 'הקומקום שרק כועס.' מה נכון?",
      "answers": [
        "במשפט המידעי יש ניסוח עובדתי; בסיפור יש דימוי",
        "בשניהם רק מספרים",
        "במידע אסור להשתמש במילים",
        "בסיפור חייבים רק טבלאות"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_reading",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error",
        "reading_comprehension_error",
        "detail_recall_error"
      ],
      "subtopicId": "g3.genre_tag_info_vs_story",
      "patternFamily": "phase717_p0_genre"
    },
    {
      "question": "טקסט מידעי מול סיפור (3): 'מחקר מצא ששתיית מים מסייעת בריכוז.' לעומת: 'דני שתה והרגיש גיבור.' מה מאפיין את המידע?",
      "answers": [
        "מקור/ממצא מנוסח בזהירות; בסיפור דגש על דמות ורגש",
        "רק שמות",
        "רק צחוק",
        "אין הבדל"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_reading",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error",
        "reading_comprehension_error",
        "detail_recall_error"
      ],
      "subtopicId": "g3.genre_tag_info_vs_story",
      "patternFamily": "phase717_p0_genre"
    },
    {
      "question": "טקסט מידעי מול סיפור (4): 'לוח שנה: 365 ימים.' לעומת: 'השנה רצה מהר כמו סוס.' מה ההבדל?",
      "answers": [
        "במידע עובדות; במטפורה בסיפור יש השוואה דימוית",
        "שניהם טבלאות",
        "במידע חייבת מטפורה",
        "בסיפור אין משפטים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_reading",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error",
        "reading_comprehension_error",
        "detail_recall_error"
      ],
      "subtopicId": "g3.genre_tag_info_vs_story",
      "patternFamily": "phase717_p0_genre"
    }
  ],
  "comprehension": [
    {
      "question": "מה ההשוואה בין 'ספר מעניין' ל-'ספר משעמם'?",
      "answers": [
        "ספר מעניין - משמח, ספר משעמם - לא משמח",
        "אין הבדל",
        "זה אותו דבר",
        "לא יודע"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    },
    {
      "question": "מה המסקנה מהטקסט: 'הילד קורא הרבה ספרים. הוא מצליח במבחנים.'?",
      "answers": [
        "קריאה עוזרת להצלחה",
        "קריאה לא חשובה",
        "אין קשר",
        "לא יודע"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    }
  ],
  "writing": [
    {
      "question": "איזה מבנה נכון לטקסט?",
      "answers": [
        "פתיחה - אמצע - סיום",
        "רק פתיחה",
        "רק סיום",
        "ללא מבנה"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    },
    {
      "question": "איך כותבים טקסט יצירתי?",
      "answers": [
        "משתמש בדמיון ויוצר סיפור",
        "רק עובדות",
        "רק מספרים",
        "ללא מילים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    }
  ],
  "grammar": [
    {
      "question": "מה שורש המילה 'קורא'?",
      "answers": [
        "ק-ר-א",
        "ק-ר",
        "ר-א",
        "ק-א"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    },
    {
      "question": "מה נטיית הפועל 'קורא' בגוף ראשון יחיד?",
      "answers": [
        "אני קורא",
        "אתה קורא",
        "הוא קורא",
        "אנחנו קוראים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    }
  ],
  "vocabulary": [
    {
      "question": "מה המשפחה של המילה 'קריאה'?",
      "answers": [
        "קריאה, קורא, קרא",
        "ספר, ספרייה",
        "כתיבה, כותב",
        "שמיעה, שומע"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_vocabulary",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    },
    {
      "question": "מה המשמעות של המילה 'נהנה'?",
      "answers": [
        "נהנה",
        "משעמם",
        "עצוב",
        "כעס"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_vocabulary",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ],
  "speaking": [
    {
      "question": "איך מציגים נושא בפני הכיתה?",
      "answers": [
        "מסבירים בבירור ומציגים את הנושא",
        "שותקים",
        "בוכים",
        "צוחקים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_speaking",
      "subtype": "g3",
      "difficulty": "standard",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ]
};

export const G3_HARD_QUESTIONS = {
  "reading": [
    {
      "question": "קרא את הטקסט: 'מיכל קראה סיפור על ילדה שעברה לעיר חדשה. בתחילה היא התביישה, אחר כך מצאה חברה לשחק איתה בחצר.' מה השתנה אצל מיכל בקריאה?",
      "answers": [
        "הבינה שהתביישות יכולה לעבור",
        "למדה שאין חברים בעולם",
        "גילתה שאסור לקרוא",
        "החליטה שלא ללכת לבית ספר"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_inference"
    },
    {
      "question": "קרא את הטקסט: 'במסע הקריאה הכיתה קראה על מדען שטעה ותיקן את הטעות. המורה אמרה שגם טעויות עוזרות ללמוד.' מה המסר?",
      "answers": [
        "טעויות יכולות לעזור ללמידה",
        "אסור לטעות לעולם",
        "מדענים לא לומדים",
        "ספרים מיותרים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_message"
    },
    {
      "question": "קרא את הטקסט: 'הדמות סירבה לרמות בחברים, אך בסוף הסבירה למה כנות חשובה. החברים התנצלו.' למה התנצלו החברים?",
      "answers": [
        "הבינו שכנות חשובה",
        "שכחו את השיעור",
        "מחקו את הספר",
        "עזבו את העיר"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_plot"
    },
    {
      "question": "קרא את הטקסט: 'בטקסט מידע כתוב: לדגים צריך מים נקיים. בסיפור לידו דג מדבר על חלום לשחות בנהר.' מה ההבדל בין הטקסטים?",
      "answers": [
        "מידע נותן עובדה, סיפור מוסיף דמיון",
        "אין הבדל ביניהם",
        "שניהם רק שירים",
        "מידע תמיד בלי מילים"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_genre"
    },
    {
      "question": "קרא את הטקסט: 'הילד שמר סוד על מתנה לסבתא. הוא לא סיפר, כדי שלא יתקלקל ההפתעה.' למה שמר על סוד?",
      "answers": [
        "כדי לשמור על הפתעה",
        "כי שכח את המתנה",
        "כי לא אהב את סבתא",
        "כי לא יצא מבית"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_inference"
    },
    {
      "question": "קרא את הטקסט: 'בסיפור מסע הגיבור חזר הביתה עייף אך גאה. הוא למד שהדרך הקשה שווה את הסוף.' איך הרגיש הגיבור בסוף?",
      "answers": [
        "עייף אבל גאה",
        "שמח לשכוח הכל",
        "כועס על חברים",
        "לא אכפת לו בכלל"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_feeling"
    },
    {
      "question": "קרא את הטקסט: 'הכיתה קראה מכתב מכפר בגליל. התלמידים סימנו על מפה את הכפר וכתבו שאלה למחבר.' מה עשו אחרי הקריאה?",
      "answers": [
        "סימנו מפה וכתבו שאלה",
        "מחקו את המפה",
        "שברו את המכתב",
        "לא קראו כלל"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_detail"
    },
    {
      "question": "קרא את הטקסט: 'בסיפור עם שני קולות, ילד אחד חשב שהשני כועס, אבל הוא רק היה עייף.' מה הייתה הטעות?",
      "answers": [
        "חשבו שכעס במקום עייף",
        "חשבו שמדובר במתמטיקה",
        "חשבו שאין סיפור",
        "חשבו שזה ספר בישול"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_misunderstanding"
    },
    {
      "question": "קרא את הטקסט: 'המחבר כתב: אני כותב כדי לשתף חוויה, לא רק עובדות.' איזו מילה מבטאת כוונה?",
      "answers": [
        "לשתף חוויה",
        "רק עובדות",
        "אני כותב",
        "לא רק"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_author"
    },
    {
      "question": "קרא את הטקסט: 'בסוף הספר הגיבור מחליט לסלוח. הקורא מבין שהסליחה מאפשרת להמשיך הלאה.' מה מאפשרת הסליחה?",
      "answers": [
        "להמשיך הלאה בלי להישאר כועס",
        "למחוק את הספר",
        "לא לדבר לעולם",
        "לברוח מהבית"
      ],
      "correct": 0,
      "skillId": "hebrew_reading_g3",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "detail_recall_error",
        "vocabulary_confusion",
        "careless_error"
      ],
      "patternFamily": "g3_read_hard_message"
    }
  ],
  "comprehension": [
    {
      "question": "מה הניתוח של הטקסט הספרותי?",
      "answers": [
        "ניתוח עומק של התוכן והמסר",
        "רק קריאה",
        "רק כתיבה",
        "רק האזנה"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_comprehension",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "reading_comprehension_error",
        "inference_error",
        "detail_recall_error",
        "comprehension_gap"
      ]
    }
  ],
  "writing": [
    {
      "question": "איך כותבים חיבור ספרותי?",
      "answers": [
        "כתיבה יצירתית עם עלילה ומסר",
        "רק עובדות",
        "רק מספרים",
        "ללא מילים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_writing",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error",
        "incomplete_answer"
      ]
    }
  ],
  "grammar": [
    {
      "question": "מה דקדוק מורכב?",
      "answers": [
        "תחביר ומבנים מורכבים",
        "רק מילים פשוטות",
        "רק אותיות",
        "ללא דקדוק"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_grammar",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "grammar_error",
        "careless_error"
      ]
    }
  ],
  "vocabulary": [
    {
      "question": "מה אוצר מילים ספרותי?",
      "answers": [
        "מילים עשירות ומתאימות לספרות",
        "רק מילים פשוטות",
        "רק אותיות",
        "ללא מילים"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_vocabulary",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ],
  "speaking": [
    {
      "question": "איך מתנהלים דיון ספרותי?",
      "answers": [
        "דיון על הטקסט, דמויות ומסרים",
        "רק שתיקה",
        "רק צחוק",
        "ללא דיון"
      ],
      "correct": 0,
      "skillId": "hebrew_archive_speaking",
      "subtype": "g3",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "vocabulary_confusion",
        "careless_error"
      ]
    }
  ]
};



// ========== כיתה ד' ==========
