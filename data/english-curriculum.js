export const ENGLISH_GRADE_ORDER = ["g1", "g2", "g3", "g4", "g5", "g6"];

export const ENGLISH_GENERAL_GOALS = [
  "תרגול אוצר מילים, דקדוק, תרגום והרכבת משפטים - בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  "התאמת רמת התרגול (רגיל / מתקדם) לכל תלמיד לפי כיתה, הצלחות ואתגרים יומיים.",
  "חיזוק כתיבה באנגלית באמצעות תרגילי הקלדה ממוקדים ומעבר הדרגתי ממשפטים קצרים למשפטים מורחבים.",
];

export const ENGLISH_GRADES = {
  g1: {
    key: "g1",
    name: "כיתה א׳",
    stage: "שלב חשיפה",
    topics: ["phonics", "vocabulary", "mixed"],
    wordLists: ["colors", "numbers", "family", "animals", "emotions", "actions", "school"],
    curriculum: {
      summary: "היכרות חווייתית עם מילים בסיסיות באנגלית באמצעות כרטיסי אוצר מילים דו-כיווניים.",
      focus: [
        "זיהוי מילים באנגלית מתוך מילה בעברית והפוך לבניית ביטחון בסיסי.",
        "שילוב צבעים, מספרים וחפצי כיתה כחלק מתרגול חזותי מהיר."
      ],
      skills: [
        "בחירה נכונה של פירוש המילה באנגלית או בעברית.",
        "זיהוי תרגום נכון בזמן קצוב ובדגש על ריכוז."
      ],
      grammar: ["חשיפה ל-I am / You are ולכינויי גוף בסיסיים בתוך תבניות קבועות."],
      vocabulary: [
        "צבעים, מספרים 0–20, בני משפחה וחפצי כיתה.",
        "חיות בסיסיות, רגשות ראשוניים ופעלים פשוטים של פעולות יומיומיות."
      ],
      benchmark: [
        "דיוק של ‎80%‎ לפחות בתרגול 20 מילים בסיסיות.",
        "שליטה בהחלפת כיוון תרגום (אנגלית→עברית / עברית→אנגלית) במצב למידה."
      ]
    }
  },
  g2: {
    key: "g2",
    name: "כיתה ב׳",
    stage: "שלב יסוד",
    topics: ["phonics", "vocabulary", "translation", "writing", "mixed"],
    wordLists: [
      "colors",
      "numbers",
      "family",
      "animals",
      "emotions",
      "school",
      "food",
      "actions",
      "house"
    ],
    curriculum: {
      summary: "מעבר מזיהוי מילים לכתיבה קצרה והרחבת אוצר מילים לפי תחומי חיי היום-יום.",
      focus: [
        "תרגול כתיבה של מילים באנגלית מתוך מילה בעברית (הקלדה).",
        "התחלה של תרגום משפטים קצרים לפי טמפלטים קבועים."
      ],
      skills: [
        "הקלדת מילים קלאסיות של מזון, לבוש וחדרי הבית ללא טעויות כתיב.",
        "תרגום משפטים דו-כיווני באורך 3–4 מילים."
      ],
      grammar: [
        "חיזוק to be (am/is/are) וכינויי גוף.",
        "ריבוי שמות עצם והיכרות עם מבני שאלות פשוטים."
      ],
      vocabulary: [
        "מזון ושתייה, בגדים, מקומות בקהילה וחיי יום-יום בכיתה.",
        "פעולות (run, jump, read) וחדרי הבית."
      ],
      benchmark: [
        "דיוק כתיבה של ‎75%‎ ומעלה במצב כתיבה.",
        "10 תרגילי תרגום דו-כיווני מוצלחים ברצף בכל שבוע."
      ]
    }
  },
  g3: {
    key: "g3",
    name: "כיתה ג׳",
    stage: "שלב ראשית אוריינות",
    topics: ["vocabulary", "grammar", "translation", "sentences", "writing", "mixed"],
    wordLists: [
      "animals",
      "colors",
      "numbers",
      "family",
      "body",
      "food",
      "school",
      "weather",
      "sports",
      "actions",
      "house"
    ],
    curriculum: {
      summary: "חיבור בין אוצר מילים, דקדוק ותרגום כדי להתחיל לבנות משפטים אקטיביים.",
      focus: [
        "תרגום משפטים קצרים עם סימני פיסוק נכונים.",
        "השלמת משפטים לפי גוף הפועל והרמזים בהקשר."
      ],
      skills: [
        "הרכבת משפטים Present Simple מתוך תבניות מוכרות.",
        "מעקב אחרי רמזים (נושא, זמן) כדי לבחור את המילה הנכונה."
      ],
      grammar: [
        "Present Simple בחיובי/שלילי/שאלה.",
        "תארים בסיסיים, יידוע (a/an/the) ומילות יחס מקום (in/on/under)."
      ],
      vocabulary: [
        "שגרת יום, בית הספר, תחביבים, ספורט ומזג אוויר.",
        "חלקי גוף וחדרי בית מורחבים."
      ],
      benchmark: [
        "דיוק ‎80%‎ ומעלה במצב דקדוק או משפטים.",
        "כתיבת לפחות 5 משפטים קצרים באנגלית במצב כתיבה מורחב."
      ]
    }
  },
  g4: {
    key: "g4",
    name: "כיתה ד׳",
    stage: "שלב אוריינות מתפתחת",
    topics: ["vocabulary", "grammar", "translation", "sentences", "writing", "mixed"],
    wordLists: [
      "animals",
      "family",
      "body",
      "food",
      "school",
      "weather",
      "sports",
      "travel",
      "community",
      "environment",
      "emotions"
    ],
    curriculum: {
      summary: "חיזוק הבנת זמנים (Present Simple / Continuous) והרחבת הנושאים לקהילה, טבע ונסיעות.",
      focus: [
        "בחירה בין Present Simple לבין Present Continuous לפי מילת הזמן.",
        "תרגול כתיבה של פסקה קצרה (3–4 משפטים) במצב הקלדה."
      ],
      skills: [
        "תרגול תרגום דו-כיווני למשפטים עם 2 פעולות.",
        "התמודדות עם שאלות רב-ברירה מורכבות משילוב מילים."
      ],
      grammar: [
        "Present Simple לעומת Present Continuous.",
        "some/any, much/many, כינויי שייכות ותוארי פועל (slowly/quickly)."
      ],
      vocabulary: [
        "מקומות בעיר, נסיעות, חגים ופעילויות קהילה.",
        "רגשות מורחבים, סביבה וטבע."
      ],
      benchmark: [
        "דיוק דקדוק של ‎85%‎ לפחות במצב דקדוק.",
        "עמידה באתגר יומי (20 שאלות) לפחות פעמיים בשבוע."
      ]
    }
  },
  g5: {
    key: "g5",
    name: "כיתה ה׳",
    stage: "שלב אוריינות מורחבת",
    topics: ["vocabulary", "grammar", "translation", "sentences", "writing", "mixed"],
    wordLists: [
      "animals",
      "family",
      "food",
      "school",
      "sports",
      "travel",
      "environment",
      "health",
      "technology",
      "emotions"
    ],
    curriculum: {
      summary: "העמקת השימוש בזמני עבר והווה מתקדם, לצד הרחבת נושאים לעולמות טכנולוגיה ובריאות.",
      focus: [
        "תרגום והשלמה של משפטים Past Simple ו Future (will / going to).",
        "תרגול כתיבה חופשית של 2 פסקאות קצרות במצטבר."
      ],
      skills: [
        "הצלבת מילים בתחום טכנולוגיה, בריאות וטיולים.",
        "קבלת החלטה מהירה לגבי מודאלי can / must / have to בשאלות בחירה."
      ],
      grammar: [
        "Past Simple (סדירים + חריגים נפוצים).",
        "מודאליים בסיסיים, Future (will / going to) והשוואתיים."
      ],
      vocabulary: [
        "מסעות ותחבורה, בריאות וגוף האדם, טכנולוגיה ורשת.",
        "סביבה ורגשות מתקדמים."
      ],
      benchmark: [
        "שמירה על דיוק ‎85%‎ לפחות במצב מעורב.",
        "עצירת 3 טעויות חוזרות באמצעות תרגול ממוקד."
      ]
    }
  },
  g6: {
    key: "g6",
    name: "כיתה ו׳",
    stage: "שלב מתקדם",
    topics: ["vocabulary", "grammar", "translation", "sentences", "writing", "mixed"],
    wordLists: [
      "animals",
      "travel",
      "environment",
      "health",
      "technology",
      "global_issues",
      "culture",
      "history",
      "community",
      "emotions"
    ],
    curriculum: {
      summary: "יישור קו לחטיבת הביניים: משפטים מורכבים, זמנים משולבים ודיוק בתרגום נושאים גלובליים.",
      focus: [
        "התאמת זמן נכון (Past Continuous, Present Perfect בסיסי, Future).",
        "שימוש באוצר מילים מתקדם בנושא קיימות, תרבות וטכנולוגיה."
      ],
      skills: [
        "תרגום דו-כיווני של משפטים בני 8–10 מילים.",
        "כתיבת טענות קצרות (דעה) במצב הקלדה עם רמזים."
      ],
      grammar: [
        "Past Continuous לצד Past Simple, היכרות עם Present Perfect.",
        "Conditionals type 0/1 ומודאליים should / might / could."
      ],
      vocabulary: [
        "סוגיות גלובליות, סביבה וקיימות, תרבות וזהות דיגיטלית.",
        "טכנולוגיה, היסטוריה, קהילה ורגשות מורכבים."
      ],
      benchmark: [
        "דיוק ‎90%‎ ומעלה במצב דקדוק או משפטים במשך 3 תרגולים ברצף.",
      ]
    }
  }
};

