// grades[] must list only grades where topic appears in SCIENCE_GRADES[g].topics (data/science-curriculum.js).
// Maintainer realignment: node scripts/fix-science-grades-metadata.mjs
// Metadata enrichment (safe pass): subskill via params.subtype when no patternFamily/conceptTag; params.cognitiveLevel; params.expectedErrorTypes; params.difficulty (canonical); prerequisiteSkillIds only for explicit high-confidence respiration link (no sequential-topic guesses).
import { SCIENCE_QUESTIONS_PHASE3 } from "./science-questions-phase3.js";
import { SCIENCE_QUESTIONS_PHASE4B1 } from "./science-questions-phase4b1.js";
import { SCIENCE_QUESTIONS_CLOSURE_FILL } from "./science-questions-closure-fill.js";
import { SCIENCE_QUESTIONS_PRODUCTION_BATCH1 } from "./science-questions-production-batch1.js";
import { SCIENCE_QUESTIONS_P0_G123_FILL } from "./science-questions-p0-g123-fill.js";
import { SCIENCE_QUESTIONS_P1_G456_FILL } from "./science-questions-p1-g456-fill.js";
import { SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME } from "./science-questions-needs-more-volume.js";
import { SCIENCE_G3_BODY_BANK } from "./science-questions-g3-body-bank.js";
import { SCIENCE_QUESTIONS_PHASE_B } from "./science-questions-phase-b.js";
import { applyPass1ScienceMetadata } from "./science-questions-metadata-pass1-enrich.js";
import { enrichScienceBankRowWithCanonicalMetadata } from "../lib/learning/science-canonical-metadata.js";
import { rebalanceObviousMcqDistractors } from "../utils/mcq-distractor-rebalance.js";
import { repairMcqObviousAnswerContent } from "../utils/mcq-fail-content-repair.js";
import { auditMcqQuality } from "../utils/question-quality.js";

const SCIENCE_QUESTIONS_RAW = [
  {
    "id": "body_1",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איפה נמצא הלב בגוף האדם?",
    "options": [
      "בחזה, בצד ימין של הגוף",
      "בחזה, מעט משמאל למרכז",
      "בבטן העליונה, באזור הכבד",
      "בגובה הצוואר, מאחורי קנה הנשימה"
    ],
    "correctIndex": 1,
    "explanation": "הלב נמצא בחזה, מעט שמאלה מקו האמצע, ומזרים דם לכל הגוף.",
    "params": {
      "patternFamily": "science_body_heart_location",
      "subtype": "sci_body_general",
      "conceptTag": "body_heart_place",
      "diagnosticSkillId": "sci_body_fact_recall",
      "probePower": "medium",
      "expectedErrorTags": [
        "fact_recall_gap",
        "concept_confusion"
      ],
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "concept_confusion"
      ],
      "difficulty": "basic"
    },
    "theoryLines": [
      "הלב הוא איבר שרירי שפועל ללא הפסקה.",
      "תפקידו להזרים דם המכיל חמצן וחומרי מזון לכל חלקי הגוף."
    ]
  },
  {
    "id": "body_2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "באיזה איבר אנחנו משתמשים כדי לראות?",
    "options": [
      "אוזניים",
      "עיניים",
      "אף",
      "לשון"
    ],
    "correctIndex": 1,
    "explanation": "העיניים הן איבר הראייה. דרכן נכנס האור למוח שמפרש את התמונה.",
    "params": {
      "patternFamily": "science_body_sense_organs",
      "subtype": "sci_body_general",
      "conceptTag": "sense_vision",
      "diagnosticSkillId": "sci_body_fact_recall",
      "probePower": "medium",
      "expectedErrorTags": [
        "fact_recall_gap",
        "classification_error"
      ],
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "fact_recall_gap",
        "classification_error"
      ],
      "difficulty": "basic"
    },
    "theoryLines": [
      "חמשת החושים: ראייה, שמיעה, ריח, טעם ומישוש.",
      "העיניים קשורות למוח בעזרת עצב הראייה."
    ]
  },
  {
    "id": "body_3",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקידה העיקרי של מערכת הנשימה?",
    "options": [
      "להוביל דם לרקמות עם חמצן ומזון",
      "להחליף חמצן ופחמן דוחמצני מול האוויר",
      "לפרק מזון לחומרים קטנים במעיים",
      "לתת שלד, להגין על איברים ולסייע בתנועה"
    ],
    "correctIndex": 1,
    "explanation": "מערכת הנשימה אחראית על חילוף הגזים: הכנסת חמצן הדרוש לתאים והוצאת פחמן דוחמצני מהגוף.",
    "params": {
      "patternFamily": "science_respiratory_gas_exchange",
      "subtype": "sci_body_general",
      "conceptTag": "resp_o2_co2_exchange",
      "diagnosticSkillId": "sci_respiration_concept",
      "probePower": "high",
      "expectedErrorTags": [
        "concept_confusion",
        "cause_effect_gap"
      ],
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "concept_confusion",
        "cause_effect_gap"
      ],
      "difficulty": "standard",
      "prerequisiteSkillIds": [
        "sci_body_fact_recall"
      ]
    },
    "theoryLines": [
      "איברי מערכת הנשימה כוללים אף, קנה הנשימה וריאות.",
      "בתוך הריאות מתבצע חילוף הגזים בין האוויר לדם."
    ]
  },
  {
    "id": "body_4",
    "topic": "body",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "איך השרירים והשלד תורמים לתנועה בגוף?",
    "options": [
      "השרירים מושכים עצמות וכך נוצרת תנועה",
      "רק העצמות זזות בלי השרירים",
      "הגוף זז בלי קשר לשרירים ולשלד",
      "התנועה נוצרת רק מהנשימה"
    ],
    "correctIndex": 0,
    "explanation": "השלד נותן מסגרת לגוף, והשרירים מחוברים לעצמות ומושכים אותן כדי לייצר תנועה.",
    "theoryLines": [
      "ללא שלד הגוף היה רפוי ולא יציב.",
      "ללא שרירים לא היינו יכולים להזיז את העצמות והגוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_5",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איזה משפט מתאר בצורה הטובה ביותר את תפקיד מערכת הדם?",
    "options": [
      "המערכת שמעכלת מזון ומפרקת אותו לחומרים פשוטים.",
      "המערכת שמובילה אותות עצביים בין המוח לשרירים.",
      "המערכת שמזרימה דם עם חמצן ומזון ומפנה פסולת.",
      "המערכת שמגינה בעיקר דרך העור ולא דרך מחזור הדם."
    ],
    "correctIndex": 2,
    "explanation": "מערכת הדם מורכבת מהלב, כלי הדם והדם עצמו, ותפקידה להוביל חומרים חיוניים ולפנות פסולת.",
    "theoryLines": [
      "הדם זורם בעורקים, ורידים ונימים.",
      "הלב משמש משאבה שמניעה את הדם בכל הגוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "body_6",
    "topic": "body",
    "grades": [
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו תפקידה העיקרי של מערכת העצבים?",
    "options": [
      "לתאם ולהעביר מידע בין חלקי הגוף",
      "רק לאגור אנרגיה בלי קשר למידע",
      "להפריד בין מערכות הגוף בלבד",
      "לשמור על חום הגוף בלבד"
    ],
    "correctIndex": 0,
    "explanation": "מערכת העצבים אחראית על קבלת מידע מהחושים, עיבודו במוח ושליחת הוראות לשרירים ולאיברים.",
    "theoryLines": [
      "מערכת העצבים כוללת מוח, חוט שדרה ועצבים רבים.",
      "עצבים מעבירים אותות חשמליים במהירות רבה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_1",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים הוא יונק?",
    "options": [
      "צפרדע",
      "תנין",
      "חתול",
      "תרנגול"
    ],
    "correctIndex": 2,
    "explanation": "יונקים ממליטים צאצאים חיים ומניקים אותם בחלב. חתול הוא יונק, בעוד שצפרדע היא דוחיים ותרנגול הוא עוף.",
    "theoryLines": [
      "ליונקים יש פרווה או שיער, ריאות לנשימה וחלבונים להנקה.",
      "עופות מכוסים נוצות ומטילים ביצים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהי תכונה שמתאימה דג לחיים במים?",
    "options": [
      "סנפירים וגוף בצורת טורפדו",
      "רגליים ארוכות וזנב שטוח",
      "כנפיים רחבות ומקור דק",
      "קשקשים וגוף ארוך ודק"
    ],
    "correctIndex": 0,
    "explanation": "הסנפירים והגוף הצר והמאורך מאפשרים לדג לשחות ביעילות במים.",
    "theoryLines": [
      "בעלי חיים מותאמים לסביבת החיים שלהם.",
      "צורת הגוף משפיעה על יכולת התנועה במים, באוויר או ביבשה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_3",
    "topic": "animals",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי זוחלים?",
    "options": [
        "לרוב מכוסים בקשקשים ומטילים ביצים",
        "הם יונקים שמיניקים גורים",
        "אין להם עור או קשקשים",
        "כולם חיים במים בלבד"
    ],
    "correctIndex": 0,
    "explanation": "רוב הזוחלים מכוסים קשקשים, והם מטילים ביצים או ממליטים, אך אינם יונקים חלב.",
    "theoryLines": [
      "זוחלים כוללים נחשים, לטאות, צבים ותנינים.",
      "הם בעלי דם קר, כלומר טמפרטורת גופם מושפעת מהסביבה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_4",
    "topic": "animals",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהי 'שרשרת מזון'?",
    "options": [
      "כל היצורים באזור שאוכלים מאותו מקור מים בלי יחס טורף-טרף",
      "רצף של יצורים חיים שבו כל יצור משמש מזון ליצור הבא אחריו",
      "רצף שלבים שבו כל יצור מייצר את מזונו מפוטוסינתזה בלבד",
      "קבוצה שבה כל בעל חיים נמצא באותה רמת אנרגיה לאורך זמן"
    ],
    "correctIndex": 1,
    "explanation": "שרשרת מזון מתארת את זרימת האנרגיה מהיצרנים (צמחים) לצרכנים (בעלי חיים).",
    "theoryLines": [
      "הצמחים הם בדרך כלל היצרנים, כי הם מייצרים מזון בפוטוסינתזה.",
      "טורפים ואוכלי עשב הם חלק משרשראות ומארגי מזון."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_5",
    "topic": "animals",
    "grades": [
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון לגבי התאמות התנהגותיות אצל בעלי חיים?",
    "options": [
      "שינויי התנהגות שעוזרים לשרוד, כמו נדידה",
      "רק שינוי צבע בלי קשר לשרוד",
      "התנהגות קבועה בכל עונות השנה",
      "התנהגות אקראית בלי קשר לסביבה"
    ],
    "correctIndex": 0,
    "explanation": "התאמות התנהגותיות הן דרכי פעולה שעוזרות לבעל החיים לשרוד בסביבתו, כמו נדידה או פעילות לילה.",
    "theoryLines": [
      "יש התאמות מבניות (צורת גוף) והתאמות התנהגותיות.",
      "התאמות נוצרות לאורך דורות בתהליך של אבולוציה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_gapfix_hard_g12",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון בהשוואה בין דג לדולפין?",
    "options": [
      "דולפין נושם אוויר; דג נושם במים בזימים",
      "גם דולפין וגם דג נושמים רק בזימים",
      "שניהם נושמים רק אוויר מחוץ למים",
      "אין הבדל בין דולפין לדג בנשימה"
    ],
    "correctIndex": 0,
    "explanation": "דולפינים הם יונקים ונושמים אוויר דרך ריאות כמו יונקים אחרים; דגים נושמים במים בעזרת זימים ואינם יונקים.",
    "theoryLines": [
      "בעלי חיים יכולים להיראות דומים כשחיים במים, אך השיוך הביולוגי נקבע מתכונות כמו דרך הנשימה וההולדה.",
      "דגים הם בעלי חיים עם זימים לנשימה במים; דולפינים הם יונקים עם ריאות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_gapfix_easy_g456",
    "topic": "animals",
    "grades": [
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה משפט נכון לגבי צרכים בסיסיים של בעלי חיים?",
    "options": [
      "בעלי חיים צריכים מזון, מים ומקום מתאים",
      "בעלי חיים צריכים רק מזון",
      "בעלי חיים לא צריכים מים",
      "בעלי חיים חיים בלי תנאים מיוחדים"
    ],
    "correctIndex": 0,
    "explanation": "כל בעל חיים צריך מזון, מים ותנאים סביבתיים מתאימים (כמו חום, מקום להימצא בו) כדי לשרוד ולהתפתח.",
    "theoryLines": [
      "צרכים בסיסיים כוללים מזון לאנרגיה, מים לתפקוד הגוף, וסביבה שמתאימה לסוג החיה.",
      "היעדר אחד מהגורמים יכול לפגוע בבריאות וברווחה של בעל החיים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_1",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה הצמח צריך כדי לגדול?",
    "options": [
      "מים בלבד, בלי אור שמש וקרקע",
      "אור שמש, מים ואדמה",
      "אור שמש בלבד, בלי מים מהקרקע",
      "קרקע יבשה בלי מים ואור"
    ],
    "correctIndex": 1,
    "explanation": "צמח זקוק לאור, מים, מינרלים מהאדמה ואוויר כדי לגדול ולהתפתח.",
    "theoryLines": [
      "העלים קולטים אור, השורשים קולטים מים ומינרלים.",
      "ללא אור או מים הצמח נחלש ועלול למות."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חלק בצמח אחראי על הכנסת מים מהאדמה?",
    "options": [
      "העלים, שסופגים את רוב המים מגשם ומהאוויר",
      "הגבעול, שמעביר מים מהשורש אך לא בולע אותם ישירות מהאדמה",
      "השורשים, שסופגים מים ומינרלים מהאדמה",
      "הגבעול שבולט באדמה, שסופג מים ישירות דרך קליפתו"
    ],
    "correctIndex": 2,
    "explanation": "השורשים סופגים מים ומינרלים מהאדמה ומעבירים אותם דרך הגבעול לשאר חלקי הצמח.",
    "theoryLines": [
      "הצמח בנוי משורשים, גבעול, עלים ופרחים (ברוב המקרים).",
      "השורשים מעגנים את הצמח בקרקע."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_3",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהי פוטוסינתזה?",
    "options": [
      "תהליך שבו הצמח מפרק סוכר לקבלת אנרגיה מחמצן",
      "תהליך שבו הצמח מייצר מזון מאור, מים ופחמן דוחמצני",
      "תהליך שבו הצמח מאבד מים דרך פיוניות ביום בהיר",
      "תהליך שבו רוב הפוטוסינתזה מתבצעת בגזע מתחת לאדמה"
    ],
    "correctIndex": 1,
    "explanation": "בפוטוסינתזה הצמח משתמש באור, מים ופחמן דוחמצני כדי לייצר סוכר (גלוקוז) ולשחרר חמצן.",
    "theoryLines": [
      "התהליך מתרחש בכלורופלסטים שנמצאים בעלים.",
      "פוטוסינתזה היא בסיס שרשרת המזון ברוב המערכות האקולוגיות."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_4",
    "topic": "plants",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מתי צמחים מבצעים חילוף גזים (נשימה)?",
    "options": [
        "צמחים נושמים גם בלילה, לא רק ביום",
        "צמחים נושמים רק ביום כשיש אור שמש",
        "צמחים לא נושמים כלל",
        "רק השורשים נושמים, לא העלים"
    ],
    "correctIndex": 0,
    "explanation": "צמח מבצע נשימה תאית כל הזמן, ביום ובלילה. פוטוסינתזה מתרחשת רק כאשר יש אור.",
    "theoryLines": [
      "נשימה תאית היא תהליך הפקת אנרגיה מסוכר.",
      "פוטוסינתזה מייצרת סוכר; נשימה צורכת אותו כדי להפיק אנרגיה."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_5",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד פיוניות בעלה?",
    "options": [
      "הובלת מים ומינרלים מהשורש אל קצה העלה",
      "סגירה מוחלטת של פני העלה מכל מגע עם האוויר בכל שעות היממה",
      "ויסות כניסת פחמן דוחמצני ויציאת גזים ואדים",
      "אגירת עמילן לטווח ארוך בעיקר בפקעות השורש"
    ],
    "correctIndex": 2,
    "explanation": "פיוניות הן פתחים זעירים בעלה המאפשרים חילוף גזים: כניסת פחמן דוחמצני ויציאת חמצן ואדי מים.",
    "theoryLines": [
      "פתיחת וסגירת פיוניות מושפעת מאור וממצב המים בצמח.",
      "דרך פיוניות אובדים גם מים באידוי (דיות)."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_1",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו מצב הצבירה של קרח?",
    "options": [
      "מוצק",
      "נוזל",
      "גז",
      "תערובת"
    ],
    "correctIndex": 0,
    "explanation": "קרח הוא מים במצב מוצק. חימום הקרח יהפוך אותו לנוזל, וקירור מים יכול להפוך אותם לקרח.",
    "theoryLines": [
      "למים יש שלושה מצבי צבירה: מוצק (קרח), נוזל (מים), גז (אדי מים).",
      "שינוי טמפרטורה יכול לגרום לשינוי מצב הצבירה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי חומרים מתכתיים?",
    "options": [
      "הם מבודדים חשמל טוב יותר מפלסטיק ומעץ",
      "הם מוליכים חום וחשמל יחסית טוב",
      "הם שקופים לאור בדומה לזכוכית דקה",
      "הם נשברים בקלות בלי כפיפה או ריקוע"
    ],
    "correctIndex": 1,
    "explanation": "למתכות יש תכונה חשובה של הולכת חום וחשמל, ולכן משתמשים בהן בכבלים, סירים ועוד.",
    "theoryLines": [
      "מתכות רבות גם מבריקות וניתנות לריקוע (יצירת יריעות) ולמתיחה.",
      "לא כל חומר מתכתי חזק, אבל רבים מהם חזקים ועמידים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_3",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי פלסטיק?",
    "options": [
      "פלסטיק נוצר בתעשייה ולא נמצא בטבע",
      "פלסטיק נמצא בטבע כמו אבן",
      "פלסטיק הוא סוג של עץ",
      "פלסטיק נוצר רק מחול"
    ],
    "correctIndex": 0,
    "explanation": "פלסטיק מיוצר במפעלים מחומרי גלם, בעיקר מנפט, ואינו חומר טבעי כמו עץ או אבן.",
    "theoryLines": [
      "חומרים טבעיים מקורם בעולם החי, הצומח או הדומם.",
      "חומרים סינתטיים מיוצרים בתהליכים תעשייתיים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_4",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "תמיסה של מלח ומים היא דוגמה ל...",
    "options": [
      "תערובת הטרוגנית",
      "תערובת הומוגנית",
      "תרכובת כימית טהורה",
      "גז דליק"
    ],
    "correctIndex": 1,
    "explanation": "כאשר המלח מתמוסס במים, מתקבלת תמיסה אחידה בכל חלקיה – זו תערובת הומוגנית.",
    "theoryLines": [
      "תערובת הומוגנית נראית אחידה, ואין בה גבולות ברורים בין החומרים.",
      "תמיסה היא סוג של תערובת שבה חומר אחד מומס באחר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_5",
    "topic": "materials",
    "grades": [
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו שינוי פיזיקלי?",
    "options": [
      "שינוי שבו נוצרת זהות חומר חדשה לגמרי",
      "שינוי שבו החומר משנה מצב צבירה אך נשאר אותו חומר",
      "שינוי שיכול לקרות רק בחימום חזק",
      "שינוי שקורה רק למתכות"
    ],
    "correctIndex": 1,
    "explanation": "בשינוי פיזיקלי החומר משנה צורה או מצב צבירה, אך הרכבו הכימי נשאר זהה.",
    "theoryLines": [
      "התכת קרח למים היא שינוי פיזיקלי – עדיין מדובר במים.",
      "שרפת נייר היא שינוי כימי – נוצר חומר חדש (אפר וגזים)."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_1",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מדוע יש יום ולילה?",
    "options": [
      "כי כדור הארץ מסתובב סביב השמש פעם ביום",
      "כי כדור הארץ מסתובב סביב צירו ביחס לשמש",
      "כי הירח מאיר בעצמו בחצי כדור וכיבוי בחצי השני",
      "כי כדור הארץ מתרחק ומתקרב מהשמש פעמיים ביום"
    ],
    "correctIndex": 1,
    "explanation": "יום ולילה נוצרים בגלל שכדור הארץ מסתובב סביב צירו. החלק שפונה לשמש חווה יום, והחלק הרחוק ממנה לילה.",
    "theoryLines": [
      "סיבוב כדור הארץ סביב צירו נמשך כ 24 שעות.",
      "בכל רגע חצי מכדור הארץ מואר וחצי אחר חשוך."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_2",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי מסלול כדור הארץ?",
    "options": [
      "כדור הארץ מקיף את הירח פעם בשנה",
      "כדור הארץ מקיף את השמש פעם בשנה (מסלול השנה)",
      "מסלול השנה הוא סיבוב כדור הארץ סביב צירו אחת לשנה",
      "מסלול השנה נמשך כמו יום לילה אחד - כ 24 שעות"
    ],
    "correctIndex": 1,
    "explanation": "כדור הארץ נע במסלול סביב השמש והקפה מלאה נמשכת כשנה אחת.",
    "theoryLines": [
      "לכדור הארץ יש שני סוגי תנועה: סיבוב סביב צירו והקפה סביב השמש.",
      "ההקפה סביב השמש קשורה לעונות השנה."
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
    "id": "earth_3",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי הירח?",
    "options": [
      "הירח מחזיר אור שמש - הוא לא מאיר מעצמו",
      "הירח הוא כוכב שמאיר כמו השמש",
      "הירח יוצר אור משלו בלילה",
      "הירח לא קשור לאור השמש"
    ],
    "correctIndex": 0,
    "explanation": "הירח אינו כוכב ואינו מייצר אור. הוא מחזיר את אור השמש שמאיר עליו.",
    "theoryLines": [
      "כוכבים מפיקים אור ואנרגיה בעצמם.",
      "ירח הוא לוויין טבעי הסובב סביב כוכב לכת."
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
    "id": "earth_4",
    "topic": "earth_space",
    "grades": [
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון לגבי שכבות כדור הארץ?",
    "options": [
      "כדור הארץ בנוי רק מקרום דק מעל חלל ריק",
      "כדור הארץ בנוי מקרום, מעטפת וליבה",
      "כדור הארץ בנוי משכבה אחת אחידה",
      "אין לנו כל מידע על פנים כדור הארץ"
    ],
    "correctIndex": 1,
    "explanation": "כדור הארץ בנוי משכבות: קרום חיצוני דק, מעטפת עבה וליבה חמה מאוד.",
    "theoryLines": [
      "רוב הידע על פנים כדור הארץ מגיע מרעידות אדמה וממחקר גיאולוגי.",
      "הליבה הפנימית צפופה וחמה מאוד."
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
    "id": "env_1",
    "topic": "environment",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהי פעולה שעוזרת לשמור על הסביבה?",
    "options": [
      "למיין בבית אבל לשפוך הכל לאותו מכל ציבורי",
      "לצמצם נייר אבל לזרוק כל הפלסטיק לפח אשפה רגיל בלי מיחזור",
      "למחזר נייר, פלסטיק וזכוכית במיכלים המתאימים",
      "לדחוס בקבוקים כדי לחסוך מקום בלי לשלוח אותם למיחזור"
    ],
    "correctIndex": 2,
    "explanation": "מיחזור מפחית כמות פסולת, חוסך בחומרי גלם ותורם לשמירה על הסביבה.",
    "theoryLines": [
      "שמירה על הסביבה כוללת צמצום פסולת, מיחזור וחיסכון במשאבים.",
      "מיחזור מאפשר שימוש מחדש בחומרים קיימים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהי מערכת אקולוגית (מערכת סביבתית)?",
    "options": [
      "אוסף מבנים בני אדם בלבד בלי טבע פתוח",
      "יצורים חיים יחד עם סביבתם והקשרים ביניהם (מזון, מחיה וכו')",
      "רק אוסף דגימות במוזיאון ללא סביבה חיה",
      "תרשים בניינים בעיר בלי תיאור של צמחים, בעלי חיים ומזון"
    ],
    "correctIndex": 1,
    "explanation": "מערכת אקולוגית כוללת יצורים חיים, סביבת החיים שלהם והקשרים ביניהם.",
    "theoryLines": [
      "דוגמאות: יער, בריכה, שונית אלמוגים.",
      "שינויים בסביבה משפיעים על כל המרכיבים במערכת."
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
    "id": "env_3",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי זיהום אוויר?",
    "options": [
        "זיהום אוויר יכול להשפיע גם על בריאות בני האדם",
        "זיהום אוויר משפיע רק על צמחים",
        "זיהום אוויר אינו קשור לבריאות",
        "רק מים מזוהמים מזיקים לאדם"
    ],
    "correctIndex": 0,
    "explanation": "זיהום אוויר פוגע במערכת הנשימה, עלול לגרום למחלות ריאה ולבעיות בריאות שונות.",
    "theoryLines": [
      "מקורות לזיהום: תחבורה, תעשייה, שריפת דלקים.",
      "צמצום זיהום אוויר חשוב לבריאות האדם והטבע."
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
    "id": "env_4",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון לגבי גזי חממה?",
    "options": [
      "הם נדירים בטבע ולא משפיעים כלל על חום כדור הארץ",
      "הם לוכדים חום באטמוספרה, וכמותם משפיעה על האקלים",
      "הם מצטברים רק מעל מדינות עם הרים גבוהים",
      "הם נוצרים בעיקר מפעילות געשית בלי קשר לבני אדם"
    ],
    "correctIndex": 1,
    "explanation": "גזי חממה כמו פחמן דוחמצני ומתאן לוכדים חום; כמות גבוהה מדי שלהם גורמת להתחממות גלובלית.",
    "theoryLines": [
      "אפקט החממה הטבעי חיוני לשמירה על טמפרטורה מתאימה לחיים.",
      "פעילות אנושית הוסיפה כמות גדולה של גזי חממה לאטמוספרה."
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
    "id": "exp_1",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "ביצעת ניסוי עם שני כוסות מים: אחת בשמש ואחת בצל. באיזו כוס המים יתחממו יותר?",
    "options": [
      "בכוס שבצל, כי שם פחות קרני שמש מגיעות ישירות למים",
      "בשתי הכוסות בערך באותה מידה כשהכמות זהה",
      "בכוס שבשמש, כי השמש מעבירה חום",
      "בכוס קטנה יותר באותה שמש, בלי קשר למוצל או מואר"
    ],
    "correctIndex": 2,
    "explanation": "בשמש המים מקבלים יותר אנרגיית חום ולכן מתחממים יותר מאשר בצל.",
    "theoryLines": [
      "חום הוא מעבר אנרגיה מגוף חם לגוף קר.",
      "קל לראות ניסויים פשוטים של חימום וקירור בעזרת השמש."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_2",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה חשוב לעשות בתחילת כל ניסוי מדעי?",
    "options": [
      "להחליט מראש מה התוצאה הנכונה כדי לכוון את הניסוי",
      "לנסח שאלה או בעיה שרוצים לבדוק",
      "לשנות בוזמנית כמה משתנים כדי לקבל תוצאה גבוהה",
      "לדלג על תכנון ולהתחיל ישר מדידה"
    ],
    "correctIndex": 1,
    "explanation": "ניסוי מדעי מתחיל משאלה או בעיה ברורה שרוצים לבדוק. לאחר מכן מתכננים את הצעדים.",
    "theoryLines": [
      "מדע מבוסס על שאלות, תצפיות וניסויים.",
      "רישום מסודר עוזר להשוות בין תוצאות."
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
    "id": "exp_3",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה נכון לגבי שינוי משתנים בניסוי מדעי?",
    "options": [
        "משנים משתנה אחד בכל פעם ושומרים על השאר",
        "חייבים תמיד להחליף כמה משתנים בו-זמנית",
        "אין צורך בקבוצת ביקורת",
        "תוצאה אחת מספיקה בלי חזרה"
    ],
    "correctIndex": 0,
    "explanation": "בניסוי טוב משתדלים לשנות משתנה אחד בלבד ולשמור אחרים קבועים, כדי להבין מה בדיוק גרם לתוצאה.",
    "theoryLines": [
      "משתנה בלתי תלוי – מה שאנחנו משנים.",
      "משתנה תלוי – מה שאנחנו מודדים כתוצאה."
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
    "id": "exp_4",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "סדר את שלבי מחזור המים מהראשון לאחרון:",
    "options": [
      "אידוי → עיבוי → ירידת משקעים → איסוף במקורות מים",
      "עיבוי → איסוף → אידוי → ירידת משקעים",
      "איסוף → ירידת משקעים → עיבוי → אידוי",
      "ירידת משקעים → אידוי → עיבוי → איסוף"
    ],
    "correctIndex": 0,
    "explanation": "ראשית המים מתאדים, אחר כך מתעבים לעננים, לאחר מכן יורדים כגשם/שלג ולבסוף נאספים בים, אגמים ומי תהום.",
    "theoryLines": [
      "מחזור המים הוא תהליך מתמשך בין הים, היבשה והאטמוספרה.",
      "הוא מושפע מהשמש, מהרוח ומהטופוגרפיה של פני השטח."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
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
    "id": "body_7",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "באיזה איבר אנחנו משתמשים כדי לשמוע?",
    "options": [
      "עיניים",
      "אוזניים",
      "אף",
      "לשון"
    ],
    "correctIndex": 1,
    "explanation": "האוזניים הן איבר השמיעה. דרכן קול נכנס לאוזן ומגיע למוח.",
    "theoryLines": [
      "לאוזן יש חלק חיצוני (תנוך), חלק אמצעי (עצמות קטנות) וחלק פנימי (שבלול).",
      "גלי קול גורמים לרטט של עור התוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_8",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הפה?",
    "options": [
      "לעכל לחלוטין את המזון כמו הקיבה",
      "לאכול, לשתות ולדבר",
      "להעביר מזון מוכן מספיגה ישירות לדם",
      "להחליף חמצן בדם מול האוויר בכל נשימה"
    ],
    "correctIndex": 1,
    "explanation": "הפה משמש לאכילה, שתייה ודיבור. יש בו שיניים ללעיסה ולשון לטעימה.",
    "theoryLines": [
      "הפה הוא תחילת מערכת העיכול.",
      "הלשון עוזרת לטעום מזון ולדבר."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_9",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הידיים?",
    "options": [
      "לספק חמצן לשרירי היד דרך עור הכפות בלבד",
      "לאחוז, לגעת ולבצע פעולות מדויקות",
      "להניע את אותם מפרקים שמפעילים בעיקר את הרגליים",
      "להוביל דם מסונן מהכליות אל המוח"
    ],
    "correctIndex": 1,
    "explanation": "הידיים משמשות לאחיזת חפצים, מגע ותחושה. יש בהן אצבעות שונות.",
    "theoryLines": [
      "הידיים עוזרות לנו לעבוד, לשחק ולטפל בעצמנו.",
      "יש לנו חוש מישוש באצבעות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_10",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הרגליים?",
    "options": [
      "לקלוט ריחות ולהעביר למוח כמו האף",
      "ללכת, לרוץ ולקפוץ",
      "להחליף גזים בין דם לאוויר כמו הריאות",
      "להניע בעיקר את הזרועות דרך מפרקי הכתף"
    ],
    "correctIndex": 1,
    "explanation": "הרגליים משמשות לתנועה: הליכה, ריצה וקפיצה.",
    "theoryLines": [
      "הרגליים חזקות כדי לשאת את משקל הגוף.",
      "יש לנו שתי רגליים שמאפשרות לנו ללכת ולעמוד."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_11",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "כמה חושים יש לנו?",
    "options": [
        "חמישה: ראייה, שמיעה, ריח, טעם ומישוש",
        "שלושה: ראייה, שמיעה וטעם בלבד",
        "שניים: ראייה ושמיעה",
        "שבעה חושים כמו אצל כל בעלי החיים"
    ],
    "correctIndex": 0,
    "explanation": "כן, יש לנו חמישה חושים עיקריים שעוזרים לנו להבין את העולם סביבנו.",
    "theoryLines": [
      "כל חוש עובד עם איבר אחר בגוף.",
      "החושים עוזרים לנו להיות בטוחים וללמוד על העולם."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_12",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו איבר העיכול הראשון בגוף?",
    "options": [
      "הקיבה",
      "הפה",
      "המעי הדק",
      "ושט"
    ],
    "correctIndex": 1,
    "explanation": "הפה הוא תחילת מערכת העיכול. שם המזון נכנס, נלעס ומתערבב עם רוק.",
    "theoryLines": [
      "מערכת העיכול מתחילה בפה ומסתיימת בפי הטבעת.",
      "הרוק עוזר לפרק את המזון ולהקל על הבליעה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "conceptTag": "digestion_first_organ",
      "diagnosticSkillId": "sci_g3_body_systems_basic",
      "probePower": "medium",
      "expectedErrorTags": [
        "digestion_first_organ",
        "organ_system_confusion",
        "fact_recall_gap"
      ],
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "digestion_first_organ",
        "organ_system_confusion",
        "fact_recall_gap"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_13",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הריאות?",
    "options": [
      "לפרק מזון לחומרים קטנים שנספגים במעי",
      "לנשום – להכניס חמצן ולהוציא פחמן דוחמצני",
      "להניע דם בגוף כמו משאבה מרכזית",
      "לסנן פסולת ולשמור על איזון מים ומלחים בדם"
    ],
    "correctIndex": 1,
    "explanation": "הריאות מקבלות אוויר דרך האף והפה, לוקחות חמצן מהאוויר ומעבירות אותו לדם, ופולטות פחמן דוחמצני.",
    "theoryLines": [
      "יש לנו שתי ריאות – אחת ימין ואחת שמאל.",
      "הריאות מוגנות על ידי כלוב הצלעות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "conceptTag": "lungs_gas_exchange",
      "diagnosticSkillId": "sci_respiration_concept",
      "probePower": "high",
      "expectedErrorTags": [
        "lungs_gas_exchange",
        "respiration_system_confusion",
        "cause_effect_gap"
      ],
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "lungs_gas_exchange",
        "respiration_system_confusion",
        "cause_effect_gap"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_14",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד העצמות?",
    "options": [
      "לפרק מזון ולייצר אנזימי עיכול",
      "לתת מסגרת לגוף ולהגן על איברים",
      "להניע דם בלחץ אחיד בכל הגוף",
      "לקלוט גלי קול ולהפוך אותם לשמיעה"
    ],
    "correctIndex": 1,
    "explanation": "העצמות יוצרות את השלד, נותנות צורה לגוף, מגנות על איברים חשובים (כמו המוח והלב) ועוזרות בתנועה.",
    "theoryLines": [
      "למבוגר יש כ-206 עצמות.",
      "העצמות מחוברות זו לזו במפרקים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "conceptTag": "bones_support_protect",
      "diagnosticSkillId": "sci_g3_body_skeleton_muscles",
      "probePower": "medium",
      "expectedErrorTags": [
        "bones_support_protect",
        "structure_function_confusion",
        "fact_recall_gap"
      ],
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "bones_support_protect",
        "structure_function_confusion",
        "fact_recall_gap"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_15",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד מערכת העיכול?",
    "options": [
      "לבצע חילוף גזים בין דם לאוויר בריאות",
      "לפרק מזון לחומרים קטנים שהגוף יכול להשתמש בהם",
      "להוביל חמצן ומזון בכלי דם לכל הרקמות",
      "לקלוט מידע מהחושים ולהעביר אותות מהירים"
    ],
    "correctIndex": 1,
    "explanation": "מערכת העיכול מפרקת את המזון שאנחנו אוכלים לחומרים קטנים (חומרי מזון) שהגוף יכול לספוג ולהשתמש בהם לאנרגיה.",
    "theoryLines": [
      "מערכת העיכול כוללת: פה, ושט, קיבה, מעיים דקים וגסים.",
      "הקיבה מפרקת את המזון בעזרת חומצות ואנזימים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_16",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד השרירים?",
    "options": [
      "לפרק מזון בעזרת אנזימים במעי הדק",
      "להזיז חלקים בגוף – לצבור כוח ולאפשר תנועה",
      "לקלוט גלי קול ולהפוך אותם לאותות עצביים",
      "למקד קרני אור ולשלוח מידע חזותי למוח"
    ],
    "correctIndex": 1,
    "explanation": "השרירים מחוברים לעצמות. כאשר השריר מתכווץ, הוא מושך את העצם וגורם לתנועה.",
    "theoryLines": [
      "יש לנו שלושה סוגי שרירים: שלד, חלק ושריר הלב.",
      "שרירים עובדים בזוגות – אחד מכווץ והשני מתרחב."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_6",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים מטיל ביצים?",
    "options": [
      "כלב",
      "תרנגול",
      "פרה",
      "ארנב"
    ],
    "correctIndex": 1,
    "explanation": "תרנגול הוא עוף ומטיל ביצים. כלבים, חתולים ופרות הם יונקים וממליטים צאצאים חיים.",
    "theoryLines": [
      "עופות מטילים ביצים ודוגרים עליהן.",
      "יונקים ממליטים צאצאים חיים ומניקים אותם."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_7",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים חי במים?",
    "options": [
      "ארנב",
      "דג",
      "חתול",
      "תרנגול"
    ],
    "correctIndex": 1,
    "explanation": "דגים חיים במים ויש להם סנפירים כדי לשחות. יש להם זימים לנשימה.",
    "theoryLines": [
      "דגים מותאמים לחיים במים.",
      "הם נושמים דרך זימים שמסוגלים לקחת חמצן מהמים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_8",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה בעלי החיים צריכים כדי לחיות?",
    "options": [
      "מים בלבד בלי מזון וללא אוויר לנשימה",
      "מזון, מים ואוויר",
      "מזון בלבד בלי מים",
      "אוויר בלבד בלי מזון ומים"
    ],
    "correctIndex": 1,
    "explanation": "כמו בני האדם, בעלי החיים צריכים מזון לאנרגיה, מים ומקום מחיה מתאים.",
    "theoryLines": [
      "בעלי חיים שונים אוכלים סוגי מזון שונים.",
      "חלקם טורפים (אוכלים בשר), חלקם אוכלי עשב (אוכלים צמחים)."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_9",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יכול לעוף?",
    "options": [
      "דג",
      "ציפור",
      "נחש",
      "צפרדע"
    ],
    "correctIndex": 1,
    "explanation": "לציפורים יש כנפיים שמאפשרות להן לעוף באוויר. יש להן נוצות קלות ועצמות חלולות.",
    "theoryLines": [
      "כנפיים עוזרות לציפורים לעוף.",
      "לחלק מהציפורים יש כנפיים גדולות וחזקות יותר."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_10",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נכון לגבי מזון של בעלי חיים?",
    "options": [
        "בעלי חיים שונים אוכלים סוגי מזון שונים",
        "כל בעלי החיים אוכלים את אותו סוג מזון",
        "רק צמחים צריכים מזון",
        "בעלי חיים לא צריכים מים"
    ],
    "correctIndex": 0,
    "explanation": "לא נכון. בעלי חיים שונים אוכלים מזון שונה: יש טורפים (אוכלים בשר), אוכלי עשב (אוכלים צמחים) ואוכלי כל (אוכלים גם בשר וגם צמחים).",
    "theoryLines": [
      "בעלי חיים מותאמים למזון שלהם.",
      "שיניים וצורת הפה משתנים לפי סוג המזון."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_6",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נמצא למעלה בצמח?",
    "options": [
      "שורשים",
      "עלים",
      "פרחים",
      "פירות"
    ],
    "correctIndex": 1,
    "explanation": "העלים נמצאים בחלק העליון של הצמח, מעל הגבעול. הם קולטים אור שמש.",
    "theoryLines": [
      "הצמח בנוי מחלקים: שורשים למטה, גבעול באמצע, ועלים ופרחים למעלה.",
      "העלים ירוקים כי יש בהם כלורופיל."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_7",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נמצא למטה בצמח?",
    "options": [
      "עלים",
      "שורשים",
      "פרחים",
      "פירות"
    ],
    "correctIndex": 1,
    "explanation": "השורשים נמצאים בקרקע, למטה. הם מעגנים את הצמח וקולטים מים ומינרלים.",
    "theoryLines": [
      "השורשים גדלים בקרקע.",
      "הם עוזרים לצמח לעמוד יציב."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_8",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה לצמח אם אין לו מים?",
    "options": [
      "הוא ממשיך לגדול זמן רב אם יש לו הרבה אור",
      "הוא נובל ונחלש",
      "העלים נשארים זקופים וירוקים גם בלי מים זמן רב",
      "הצמח מפסיק נשימה עד שמגיעים מים מחדש"
    ],
    "correctIndex": 1,
    "explanation": "מים חיוניים לצמח. ללא מים הצמח נובל, העלים מתייבשים והצמח עלול למות.",
    "theoryLines": [
      "מים עוזרים לצמח להישאר חי וחזק.",
      "השורשים קולטים מים מהקרקע."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_9",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צמח צריך כדי לגדול?",
    "options": [
        "מים, אור, אוויר וחומרים מהאדמה",
        "צמח יכול לגדול גם בלי אור שמש לגמרי",
        "רק מים, בלי אור",
        "רק אדמה, בלי מים"
    ],
    "correctIndex": 0,
    "explanation": "לא נכון. צמחים זקוקים לאור שמש כדי לבצע פוטוסינתזה ולייצר מזון. ללא אור הצמח לא יכול לגדול כראוי.",
    "theoryLines": [
      "אור שמש עוזר לצמח לייצר מזון.",
      "צמח בלי אור יהיה חלש וצהוב."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_10",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צבע העלים של רוב הצמחים?",
    "options": [
      "אדום",
      "כחול",
      "ירוק",
      "צהוב"
    ],
    "correctIndex": 2,
    "explanation": "רוב העלים ירוקים כי יש בהם כלורופיל – חומר שצבעו ירוק וקולט אור שמש.",
    "theoryLines": [
      "כלורופיל עוזר לצמח לייצר מזון מאור.",
      "בסתיו העלים משנים צבע כי הכלורופיל מתפרק."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_6",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו מצב הצבירה של מים בברז?",
    "options": [
      "מוצק",
      "נוזל",
      "גז",
      "אבקה יבשה שלא זורמת"
    ],
    "correctIndex": 1,
    "explanation": "מים בברז הם במצב נוזל. אפשר לשתות אותם, לשפוך אותם ולשטוף איתם.",
    "theoryLines": [
      "מים יכולים להיות בשלושה מצבי צבירה: מוצק (קרח), נוזל (מים), גז (אדי מים).",
      "כאשר מחממים או מקררים מים, הם יכולים לשנות מצב."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_7",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר הוא קשה וחזק?",
    "options": [
      "ספוג יבש",
      "שעווה רכה",
      "אבן",
      "גומי רך"
    ],
    "correctIndex": 2,
    "explanation": "אבן היא חומר קשה וחזק. אפשר לבנות ממנה ולשאת דברים כבדים.",
    "theoryLines": [
      "חומרים שונים יש להם תכונות שונות: קשיות, רכות, קלילות.",
      "אבן היא חומר טבעי מהאדמה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_8",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר הוא רך?",
    "options": [
      "אבן",
      "מתכת",
      "כותנה",
      "זכוכית דקה"
    ],
    "correctIndex": 2,
    "explanation": "כותנה היא חומר רך. אפשר ליצור ממנה בגדים נוחים.",
    "theoryLines": [
      "חומרים רכים נוחים למגע.",
      "כותנה מגיעה מצמח הכותנה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_9",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו קרח?",
    "options": [
        "מים במצב מוצק",
        "מים במצב גז",
        "חומר שונה לגמרי ממים",
        "מתכת קרה"
    ],
    "correctIndex": 0,
    "explanation": "נכון. כאשר מים מתקררים מאוד, הם הופכים לקרח שהוא במצב מוצק.",
    "theoryLines": [
      "שינוי טמפרטורה יכול לשנות את מצב הצבירה של חומרים.",
      "קרח הוא קשה ואפשר להחזיק אותו ביד."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_5",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בשמיים ביום?",
    "options": [
      "בעיקר ירח וכוכבים בוהקים, בדומה ללילה",
      "בעיקר השמש, לפעמים גם ירח או עננים",
      "רק עננים, בלי שמש שמאחוריהם",
      "רק גלקסיות רחוקות בלי השמש הקרובה"
    ],
    "correctIndex": 1,
    "explanation": "ביום רואים בעיקר את השמש שמאירה ומחממת. לפעמים יש גם עננים.",
    "theoryLines": [
      "השמש היא כוכב שמאיר ומחמם את כדור הארץ.",
      "ביום השמש מאירה, בלילה יש ירח וכוכבים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_6",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בשמיים בלילה?",
    "options": [
      "השמש נראית כמו ביום גם בלילה",
      "ירח וכוכבים",
      "ירח ללא כוכבים אחרים",
      "כוכבים בלי ירח"
    ],
    "correctIndex": 1,
    "explanation": "בלילה רואים את הירח והכוכבים. השמש לא נראית כי אנחנו בצד הרחוק של כדור הארץ.",
    "theoryLines": [
      "בלילה השמיים חשוכים ורואים ירח וכוכבים.",
      "הירח מחזיר את אור השמש."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_7",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איך מזג האוויר משתנה?",
    "options": [
      "נשאר זהה לאורך כל השנה",
      "משתנה: חם, קר, גשום או שמשי",
      "חם קבוע בכל אזור באותו יום",
      "קר קבוע בלי ימים חמים"
    ],
    "correctIndex": 1,
    "explanation": "מזג האוויר משתנה: יש ימים חמים, ימים קרים, גשם, שמש, רוח ועוד.",
    "theoryLines": [
      "מזג האוויר יכול להשתנות מיום ליום.",
      "יש עונות שונות: קיץ, חורף, סתיו ואביב."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_8",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מתי השמש מאירה?",
    "options": [
      "השמש מאירה תמיד - ביום רואים אותה כשאין עננים",
      "השמש מאירה רק בלילה",
      "השמש נדלקת ונכבית כל יום",
      "השמש לא קשורה ליום וללילה"
    ],
    "correctIndex": 0,
    "explanation": "לא נכון. השמש מאירה כל יום, אבל לפעמים עננים מכסים אותה ואז נראית שמש פחות.",
    "theoryLines": [
      "השמש תמיד מאירה, גם כשיש עננים.",
      "עננים יכולים להסתיר את השמש."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_5",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איפה צריך לזרוק פסולת?",
    "options": [
      "בשקית ליד הבית עד שמישהו אחר יזרוק למקום הנכון",
      "בפח הרחוב בלבד אם הפח בבית מלא",
      "בפח אשפה או במכל המיועד למיחזור",
      "באותה שקית אחת לכל סוגי הפסולת כדי לחסוך שקיות"
    ],
    "correctIndex": 2,
    "explanation": "פסולת צריכה להיזרק לפח אשפה, כדי לשמור על הסביבה נקייה.",
    "theoryLines": [
      "שמירה על הסביבה כוללת זריקת פסולת למקום הנכון.",
      "פחי אשפה עוזרים לשמור על מקומות נקיים."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_6",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה עוזר לשמור על הסביבה נקייה?",
    "options": [
      "לנקות רק את הבית ולהשאיר רחוב משותף כפי שהוא",
      "להשליך פסולת לפח ולא לזרוק ברחוב",
      "לאסוף בקבוקים בחצר ולדחות פינוי לאביב",
      "לדחוס אשפה בשקית עד שהיא קורעת לפני זריקה לפח"
    ],
    "correctIndex": 1,
    "explanation": "זריקת פסולת לפח ולא ברחוב עוזרת לשמור על הסביבה נקייה ויפה.",
    "theoryLines": [
      "כל אחד יכול לעזור לשמור על הסביבה.",
      "סביבה נקייה יותר נעימה ומבריאה."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_7",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איפה כדאי לזרוק פסולת?",
    "options": [
      "בפח אשפה או במיכל מיחזור מתאים",
      "לזרוק לכל מקום בחוץ",
      "להטמין בכל מקום באדמה",
      "לשים רק במים"
    ],
    "correctIndex": 0,
    "explanation": "נכון. זריקת פסולת לפח עוזרת לשמור על הסביבה נקייה.",
    "theoryLines": [
      "פחי אשפה מיועדים לאסוף פסולת.",
      "זה עוזר לשמור על מקומות נקיים ויפים."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_5",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צריך לעשות לפני שמתחילים ניסוי?",
    "options": [
      "להתחיל לערבב חומרים בלי לקרוא תווית",
      "לחשוב מה רוצים לבדוק, לתכנן צעדים ולהיות זהירים",
      "לבצע את השלבים המעשיים בלי לנסח קודם מה בודקים",
      "לקבוע מראש מהי התוצאה הצפויה מבלי למדוד קודם"
    ],
    "correctIndex": 1,
    "explanation": "לפני ניסוי צריך לחשוב מה רוצים לבדוק ולהיות זהירים. מבוגר צריך לעזור.",
    "theoryLines": [
      "ניסויים צריכים להיות בטוחים.",
      "תמיד צריך מבוגר שיעזור בניסויים."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_6",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צריך לעשות אחרי ניסוי?",
    "options": [
      "להשאיר כלים עם שאריות חומר בלי שטיפה",
      "לנקות, לייבש ולסדר חומרים במקומם",
      "לשפוך נוזלים שונים יחד לשקית אחת לנוחות",
      "לדלג על רישום אם התוצאה דומה לניסוי הקודם"
    ],
    "correctIndex": 1,
    "explanation": "אחרי ניסוי צריך לנקות ולסדר את הכל, כדי שהכל יהיה מוכן לשימוש הבא.",
    "theoryLines": [
      "ניקיון אחרי ניסוי חשוב.",
      "זה עוזר לשמור על מקום עבודה מסודר."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_17",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד המוח?",
    "options": [
      "לייצר חומצה ואנזימים שמפרקים מזון בקיבה",
      "מרכז חשיבה, זיכרון ושליטה בפעולות הגוף",
      "להניע דם אל כל האיברים בריתמוס קבוע",
      "להחליף חמצן בפחמן דוחמצני בין אוויר לדם"
    ],
    "correctIndex": 1,
    "explanation": "המוח הוא מרכז הבקרה של הגוף. הוא מחשב, זוכר, שולט על תנועות ומעבד מידע מהחושים.",
    "theoryLines": [
      "המוח נמצא בגולגולת ומוגן על ידי עצמות.",
      "יש לו חלקים שונים לתפקודים שונים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_18",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה התפקיד של הכליות בגוף האדם?",
    "options": [
      "לפרק מזון והפקת מיצי מרה",
      "לסנן פסולת מהדם ולהוציא בשתן",
      "להניע דם כמו משאבת לב",
      "להחליף חמצן מול פחמן דוחמצני"
    ],
    "correctIndex": 1,
    "explanation": "הכליות מסננות את הדם, מוציאות פסולת ומים עודפים ויוצרות שתן שנפלט מהגוף.",
    "theoryLines": [
      "יש לנו שתי כליות.",
      "הן עוזרות לשמור על איזון נוזלים בגוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_19",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו האיבר הגדול ביותר בגוף האדם?",
    "options": [
        "העור",
        "הלב",
        "המוח",
        "הכבד"
    ],
    "correctIndex": 0,
    "explanation": "נכון. העור הוא האיבר הגדול ביותר בגוף. הוא מכסה את כל הגוף ומגן עליו.",
    "theoryLines": [
      "העור משמש כמגן מפני חיידקים ונזקים.",
      "הוא עוזר לשמור על טמפרטורת גוף קבועה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_20",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד מערכת החיסון?",
    "options": [
      "לפרק שומנים וסוכרים לחומרי בנייה במעיים",
      "להילחם בחיידקים ווירוסים ולהגן על הגוף ממחלות",
      "להוביל דם עם חמצן מבלי לזהות נגיפים",
      "להגיב לעקיצת חרק בלבד מבלי לייצר זיכרון חיסוני"
    ],
    "correctIndex": 1,
    "explanation": "מערכת החיסון מזהה ומשמידה חיידקים, וירוסים וגורמי מחלה אחרים שפולשים לגוף.",
    "theoryLines": [
      "תאי דם לבנים הם חלק ממערכת החיסון.",
      "כאשר אנחנו חולים, מערכת החיסון עובדת חזק יותר."
    ],
    "params": {
      "patternFamily": "sci_body_health",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_11",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין בעלי חיים עם דם חם לבעלי חיים עם דם קר?",
    "options": [
      "שניהם שומרים תמיד על טמפרטורה פנימית קבועה בלי קשר לסביבה",
      "בעלי דם חם: טמפרטורת גוף יציבה; בעלי דם קר: מושפעים מסביבה",
      "בעלי דם קר מייצרים חום פנימי גבוה וקבוע כמו יונק בוגר",
      "בעלי דם חם משנים טמפרטורה רק כשגופם טובל במים קרים"
    ],
    "correctIndex": 1,
    "explanation": "בעלי דם חם (יונקים ועופות) שומרים על טמפרטורת גוף קבועה. בעלי דם קר (זוחלים, דגים) מושפעים מטמפרטורת הסביבה.",
    "theoryLines": [
      "יונקים ועופות הם בעלי דם חם.",
      "זוחלים ודגים הם בעלי דם קר."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_12",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו בית גידול?",
    "options": [
      "בית שנבנה על ידי בני אדם",
      "הסביבה הטבעית שבה בעל חיים חי ומוצא את צרכיו",
      "יער כמקום יחיד בלי ים ומישורים",
      "ים עמוק בלי חוף, יערות ושוניות"
    ],
    "correctIndex": 1,
    "explanation": "בית גידול הוא המקום הטבעי שבו בעל החיים חי, מוצא מזון, מים ומקום מסתור.",
    "theoryLines": [
      "בית גידול כולל את כל מה שבעל החיים צריך כדי לחיות.",
      "בעלי חיים שונים חיים בבתי גידול שונים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_13",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מחזור חיים?",
    "options": [
      "לידה כשלב בודד בלא גדילה או רבייה",
      "לידה, גדילה, רבייה ומוות - רצף שלבי חיים",
      "מוות כסיום פתאומי בלי שלבי התפתחות",
      "גדילה לאורך זמן בלי לידה ורבייה"
    ],
    "correctIndex": 1,
    "explanation": "מחזור חיים כולל את כל השלבים: לידה, גדילה, התבגרות, רבייה ומוות.",
    "theoryLines": [
      "לכל בעל חיים יש מחזור חיים ייחודי.",
      "חלק בעלי חיים עוברים מטמורפוזה (שינוי צורה)."
    ],
    "params": {
      "patternFamily": "sci_animals_life_processes",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_11",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו כלורופיל?",
    "options": [
      "חלבון מבני בדופן התא שמעביר מים בלבד",
      "פיגמנט ירוק בעלים לקליטת אור ולמזון",
      "שכבת שעווה על העלה שסותמת לחלוטין את פיוניות העלה",
      "נוזל המילוי בין התאים שאינו מכיל פיגמנט"
    ],
    "correctIndex": 1,
    "explanation": "כלורופיל הוא החומר הירוק בעלים שקולט אור שמש ומשתמש בו בפוטוסינתזה לייצור מזון.",
    "theoryLines": [
      "כלורופיל נותן לעלים את הצבע הירוק.",
      "הוא נמצא בכלורופלסטים בעלים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_12",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד הפרחים?",
    "options": [
      "צבע וניחוח בלי קישור לזרעים או להאבקה",
      "משיכת חרקים, האבקה ויצירת זרעים",
      "קליטת מים מהאדמה ישירות דרך הכותרת",
      "הצצת צל קבועה על הגבעול בלי תרומה לרבייה"
    ],
    "correctIndex": 1,
    "explanation": "פרחים מושכים חרקים (דבורים, פרפרים) שמעבירים אבקה. לאחר מכן נוצרים זרעים שמהם יכולים לצמוח צמחים חדשים.",
    "theoryLines": [
      "הפרחים צבעוניים כדי למשוך חרקים.",
      "חרקים עוזרים להעברת אבקה בין פרחים."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_13",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו נביטה?",
    "options": [
      "מות הצמח",
      "תחילת הגדילה של זרע לצמח צעיר",
      "שרפת הצמח",
      "פריחה מלאה לפני הופעת זרע"
    ],
    "correctIndex": 1,
    "explanation": "נביטה היא השלב שבו זרע מתחיל לגדול והופך לצמח צעיר. זה מתחיל כאשר הזרע מקבל מים, חום ואור.",
    "theoryLines": [
      "נביטה מתחילה כאשר הזרע מקבל תנאים מתאימים.",
      "השורש יוצא ראשון מהזרע."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_10",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה קורה למים כאשר הם מתחממים מאוד?",
    "options": [
      "הם הופכים לקרח",
      "הם הופכים לאדי מים (גז)",
      "הם נשארים נוזל",
      "הם נעלמים"
    ],
    "correctIndex": 1,
    "explanation": "כאשר מים מתחממים מאוד, הם מתאדים והופכים לאדי מים – גז שקוף.",
    "theoryLines": [
      "אדי מים הם מים במצב גז.",
      "זה קורה בחימום – כמו כאשר מים רותחים בסיר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_11",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו חומר מוליך?",
    "options": [
      "חומר שלא מעביר חשמל",
      "חומר שמעביר חום או חשמל טוב",
      "חומר שקשה מאוד",
      "חומר שקוף"
    ],
    "correctIndex": 1,
    "explanation": "חומר מוליך הוא חומר שמעביר חום או חשמל בקלות. מתכות הן מוליכות טובות.",
    "theoryLines": [
      "מתכות כמו נחושת וברזל הן מוליכות טובות.",
      "חומרים מבודדים, כמו עץ או פלסטיק, לא מעבירים חשמל."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_12",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר מבודד?",
    "options": [
      "חומר שמעביר חשמל טוב",
      "חומר שלא מעביר חום או חשמל טוב",
      "חומר שקשה מאוד",
      "חומר שקוף"
    ],
    "correctIndex": 1,
    "explanation": "חומר מבודד הוא חומר שלא מעביר חום או חשמל טוב. זה עוזר לשמור על חום או למנוע התחשמלות.",
    "theoryLines": [
      "עץ, פלסטיק וזכוכית הם מבודדים.",
      "מבודדים חשובים לבטיחות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_9",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה גורם לעונות השנה?",
    "options": [
      "מרחק כדור הארץ מהשמש כגורם יחיד",
      "נטיית כדור הארץ והמסלול סביב השמש",
      "קור וחום יומיומיים כגורם עיקרי",
      "מהירות הרוח סביב כדור הארץ"
    ],
    "correctIndex": 1,
    "explanation": "עונות השנה נוצרות בגלל שכדור הארץ נטוי על צירו ונע במסלול סביב השמש. חלקים שונים מקבלים אור שונה בכל תקופה.",
    "theoryLines": [
      "כאשר חצי כדור הארץ נוטה לשמש, יש קיץ שם.",
      "כאשר הוא רחוק יותר, יש חורף."
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
    "id": "earth_10",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו מחזור המים?",
    "options": [
      "גשם לים בלי אידוי חוזר מהמשטחים",
      "תנועת מים חוזרת בין ים, יבשה ואוויר",
      "אידוי מהים בלי ירידת משקעים חזרה",
      "עננים קבועים בגובה אחד כל הזמן"
    ],
    "correctIndex": 1,
    "explanation": "מחזור המים הוא תהליך מתמשך: מים מתאדים מהים והיבשה, מתעבים לעננים, יורדים כגשם ושוב חוזרים לים.",
    "theoryLines": [
      "השמש מחממת מים וגורמת לאידוי.",
      "מים תמיד נעים במחזור."
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
    "id": "earth_11",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה ההבדל בין מזג אוויר לאקלים?",
    "options": [
      "מזג אוויר: ממוצע עשורי; אקלים: תצפית בשעת בוקר אחת",
      "מזג אוויר: יום אחד; אקלים: ממוצע שנים באזור",
      "אקלים: רק סופת חורף בודדת במקום אחד",
      "מזג אוויר: רק הקיץ על פני מיליוני שנים"
    ],
    "correctIndex": 1,
    "explanation": "מזג אוויר מתאר את התנאים ביום מסוים (חם, קר, גשום). אקלים מתאר את הממוצע של תנאים באזור לאורך שנים.",
    "theoryLines": [
      "ישראל יש אקלים ים תיכוני – בדרך כלל חם בקיץ וגשום בחורף.",
      "מזג האוויר יכול להשתנות מדי יום."
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
    "id": "env_8",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו מיחזור?",
    "options": [
      "להטמין הכל באדמה ביתית בלי מיון או הפרדת חומרים",
      "שימוש מחדש בחומרים ישנים ליצירת מוצרים חדשים",
      "לצבור פסולת במקום אחד לצמיתות בלי שליחה למיחזור",
      "לגרוס חומרים שונים יחד בלי הכנה לעיבוד משני"
    ],
    "correctIndex": 1,
    "explanation": "מיחזור הוא לקיחת חומרים ישנים (כמו פלסטיק, נייר, זכוכית) ושימוש בהם ליצירת מוצרים חדשים במקום לזרוק אותם.",
    "theoryLines": [
      "מיחזור עוזר לשמור על הסביבה.",
      "זה מפחית פסולת וחוסך משאבים."
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
    "id": "env_9",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו זיהום?",
    "options": [
      "סביבה נקייה מכל מזהם",
      "הוספת חומרים מזיקים לסביבה שגורמים נזק",
      "גשם שמדלל תמיד כל מזהם באוויר",
      "אור שמש שמונע לחלוטין כניסת גזים לאטמוספרה"
    ],
    "correctIndex": 1,
    "explanation": "זיהום הוא הוספת חומרים מזיקים לסביבה – באוויר, במים או בקרקע – שגורמים נזק לבעלי חיים, צמחים ולבני האדם.",
    "theoryLines": [
      "זיהום יכול להיות מארובות, מכוניות או פסולת.",
      "זה פוגע בטבע ובבריאות."
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
    "id": "env_10",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו שימור סביבה?",
    "options": [
      "לפתח שטח פראי בלא בחינת השפעה על מינים מקומיים",
      "שמירה והגנה על הטבע, החיות והצמחים",
      "לאסוף אשפה בטבע רק לתצוגה בלי הובלה למיחזור",
      "להסתמך על כך שהטבע יתאושש תמיד מעצמו תוך ימים ספורים"
    ],
    "correctIndex": 1,
    "explanation": "שימור סביבה הוא פעולות להגנה על הטבע, בעלי החיים והצמחים, כדי שהדורות הבאים יוכלו ליהנות מהם גם כן.",
    "theoryLines": [
      "פארקים ושמורות טבע עוזרים לשמר סביבה.",
      "כל אחד יכול לעזור בשימור סביבה."
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
    "id": "exp_7",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו משתנה בלתי תלוי בניסוי?",
    "options": [
      "התוצאה שאנחנו מודדים",
      "הדבר שאנחנו משנים בכוונה בניסוי",
      "כל המשתנים נשארים קבועים בלי בחירה",
      "משך הזמן כשלא משנים דבר אחר במכוון"
    ],
    "correctIndex": 1,
    "explanation": "משתנה בלתי תלוי הוא הדבר שאנחנו משנים בכוונה כדי לראות איך זה משפיע. למשל, אם בודקים השפעת מים על צמח, כמות המים היא המשתנה הבלתי תלוי.",
    "theoryLines": [
      "בניסוי טוב משנים רק דבר אחד.",
      "זה עוזר להבין מה בדיוק גורם לתוצאה."
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
    "id": "exp_8",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו משתנה תלוי בניסוי?",
    "options": [
      "הדבר שאנחנו משנים",
      "התוצאה שאנחנו מודדים כדי לראות את ההשפעה",
      "הדבר שנשמר קבוע לאורך הניסוי",
      "שעון המדידה בלי קשר לתוצאה"
    ],
    "correctIndex": 1,
    "explanation": "משתנה תלוי הוא מה שאנחנו מודדים כדי לראות איך המשתנה הבלתי תלוי השפיע. למשל, אם בודקים מים וצמח, הגובה של הצמח הוא המשתנה התלוי.",
    "theoryLines": [
      "המשתנה התלוי תלוי במה ששינינו.",
      "אנחנו מודדים אותו כדי לראות את התוצאה."
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
    "id": "exp_9",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה השערה בניסוי מדעי?",
    "options": [
      "התוצאה הסופית",
      "ניחוש מנומק של מה שאנחנו חושבים שיקרה בניסוי",
      "ניסוח השאלה המדעית בלי ניבוי תוצאה",
      "תשובה סופית אחרי סיכום כל הניסויים"
    ],
    "correctIndex": 1,
    "explanation": "השערה היא ניחוש מנומק – מה שאנחנו חושבים שיקרה בניסוי על בסיס מה שאנחנו כבר יודעים. אחר כך אנחנו בודקים אם ההשערה נכונה.",
    "theoryLines": [
      "השערה צריכה להיות מבוססת על ידע קיים.",
      "אחר כך אנחנו בודקים אותה בניסוי."
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
    "id": "body_21",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "איך עובדת מערכת העיכול?",
    "options": [
      "עיכול בפה בלבד בלי המשך בקיבה או במעיים",
      "מזון עובר פה, קיבה ומעיים; פירוק וספיגה לדם",
      "פירוק בקיבה בלי המשך של מעיים",
      "ספיגה במעיים בלי שלב בפה ובקיבה"
    ],
    "correctIndex": 1,
    "explanation": "מזון נכנס בפה (לעיסה), עובר דרך הוושט לקיבה (פירוק), ואז למעיים (ספיגה). חומרי מזון נספגים לדם, פסולת נפלטת.",
    "theoryLines": [
      "מערכת העיכול היא ארוכה ומסובכת.",
      "כל חלק יש לו תפקיד חשוב."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "body_22",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד ההורמונים?",
    "options": [
      "להעביר מזון מכלי לכלי על ידי כיווצי שריר חלק",
      "מסרים בין איברים; שליטה בגדילה, אנרגיה ורגשות",
      "לנפח נוזלים דרך הריאות אל חוץ מהגוף",
      "לייצר נוגדנים ישירות על פני קנה הנשימה"
    ],
    "correctIndex": 1,
    "explanation": "הורמונים הם חומרים כימיים שמופרשים מבלוטות ומעבירים מסרים בין חלקי הגוף. הם שולטים בגדילה, חילוף חומרים, מצב רוח ועוד.",
    "theoryLines": [
      "בלוטות יוצרות הורמונים.",
      "הורמונים עובדים לאט אבל להשפעה ארוכת טווח."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_14",
    "topic": "animals",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מארג מזון?",
    "options": [
      "שרשרת מזון אחת בלי חיבורים נוספים",
      "רשת מורכבת של שרשראות מזון המחוברות זו לזו",
      "טורפים בלי צמחים ומפירים",
      "צמחים בלי צרכנים או מפירי רקב"
    ],
    "correctIndex": 1,
    "explanation": "מארג מזון הוא רשת מורכבת של שרשראות מזון המחוברות. זה מראה איך כל היצורים במערכת אקולוגית קשורים זה לזה במזון.",
    "theoryLines": [
      "מארג מזון יותר מורכב משרשרת מזון אחת.",
      "זה עוזר להבין איך הטבע עובד."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_15",
    "topic": "animals",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו הסתגלות (אדפטציה)?",
    "options": [
      "שינוי שצמח עושה",
      "תכונה או התנהגות שעוזרת לבעל חיים לשרוד בסביבה שלו",
      "צבע גוף בלי קשר לסביבה",
      "גודל גוף כמאפיין בודד"
    ],
    "correctIndex": 1,
    "explanation": "הסתגלות היא תכונה או התנהגות שפיתח בעל חיים במהלך דורות ושעוזרת לו לשרוד ולחיות טוב בסביבתו.",
    "theoryLines": [
      "הסתגלות יכולה להיות מבנית (צורת גוף) או התנהגותית.",
      "זה קורה לאורך דורות רבים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_14",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו נשימה תאית?",
    "options": [
      "נשימה דרך האף והפה בלבד",
      "תהליך שבו תאים מפרקים סוכר כדי להפיק אנרגיה",
      "ייצור סוכר באור ללא שימוש בחמצן",
      "ספיגת מים בשורש בלי חילוץ אנרגיה מסוכר"
    ],
    "correctIndex": 1,
    "explanation": "נשימה תאית היא תהליך שבו תאי הצמח (וגם תאי בעלי חיים) מפרקים סוכר בעזרת חמצן כדי להפיק אנרגיה. זה קורה כל הזמן, יום ולילה.",
    "theoryLines": [
      "פוטוסינתזה יוצרת סוכר, נשימה תאית משתמשת בו לאנרגיה.",
      "זה קורה בכל התאים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_15",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו פוטוסינתזה?",
    "options": [
      "פירוק סוכר בחמצן כדי להפיק אנרגיה",
      "שימוש באור, מים ופחמן דוחמצני לייצור סוכר ושחרור חמצן",
      "משיכת מים מהקרקע בלי קשירת אור",
      "הארכת הגבעול בלילה בלי כלורופיל"
    ],
    "correctIndex": 1,
    "explanation": "פוטוסינתזה היא התהליך שבו צמח משתמש באור שמש, מים ופחמן דו-חמצני כדי לייצר גלוקוז (סוכר) ולשחרר חמצן. זה קורה בעלים.",
    "theoryLines": [
      "זה התהליך הבסיסי ביותר בטבע.",
      "בלעדיו לא היה חיים על כדור הארץ."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_13",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו שינוי כימי?",
    "options": [
      "שינוי צורה בלבד",
      "שינוי שבו נוצר חומר חדש עם תכונות שונות מהחומר המקורי",
      "שינוי גוון בלי הופעת חומר חדש",
      "הגדלה או הקטנה של גוש בלי תגובה כימית"
    ],
    "correctIndex": 1,
    "explanation": "בשינוי כימי נוצר חומר חדש עם תכונות שונות מהחומר המקורי. למשל, שרפת נייר יוצרת אפר וגזים – חומרים חדשים.",
    "theoryLines": [
      "שרפה היא דוגמה לשינוי כימי.",
      "בשינוי כימי לא ניתן להחזיר את החומר למצב המקורי."
    ],
    "params": {
      "patternFamily": "sci_materials_changes",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_14",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה ההבדל בין תערובת לתרכובת?",
    "options": [
      "בתערובת נוצרים תמיד קשרים כימיים חדשים בין כל הרכיבים",
      "תערובת היא ערבוב חומרים שניתן להפריד, תרכובת היא חומר חדש שנוצר מחיבור אטומים",
      "תרכובת היא תמיד תערובת אחידה שאפשר להפריד בלי תגובה כימית",
      "תערובת תמיד נשארת מוצק טהור אחד גם אחרי חימום חזק"
    ],
    "correctIndex": 1,
    "explanation": "תערובת היא ערבוב של חומרים שאפשר להפריד (כמו חול ומים). תרכובת היא חומר חדש שנוצר מחיבור כימי של אטומים (כמו מים - H2O).",
    "theoryLines": [
      "בתרכובת אטומים מחוברים כימית.",
      "בתערובת החומרים נשארים נפרדים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_12",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה גורם לליקוי חמה?",
    "options": [
      "הירח עובר בין השמש לכדור הארץ ומסתיר חלק או את כל השמש",
      "כדור הארץ עובר בין השמש לירח - גרסה של ליקוי ירח",
      "כשהירח מלא והאור שלו חוסם את השמש מהארץ",
      "כשעננים עבים מכסים את השמש לשעות ארוכות"
    ],
    "correctIndex": 0,
    "explanation": "ליקוי חמה קורה כאשר הירח עובר בדיוק בין השמש לכדור הארץ ומסתיר את אור השמש. זה קורה רק כאשר יש ירח חדש.",
    "theoryLines": [
      "ליקוי חמה הוא אירוע נדיר.",
      "זה קורה רק כאשר הירח, השמש וכדור הארץ מיושרים."
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
    "id": "earth_13",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה גורם לליקוי ירח?",
    "options": [
      "הירח עובר בין השמש לכדור הארץ ומסתיר את השמש",
      "כדור הארץ עובר בין השמש לירח ומטיל צל על הירח",
      "הירח נעלם בשחור החלל ללא צל",
      "תופעת לילה מלא בלי צל של כדור הארץ על הירח"
    ],
    "correctIndex": 1,
    "explanation": "ליקוי ירח קורה כאשר כדור הארץ עובר בין השמש לירח ומטיל צל על הירח. הירח נראה אדום או כהה יותר.",
    "theoryLines": [
      "זה קורה רק כאשר יש ירח מלא.",
      "הירח יכול להיראות אדום כי אור השמש עובר דרך האטמוספרה של כדור הארץ."
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
    "id": "body_23",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד האף?",
    "options": [
      "לבצע את רוב חילוף הגזים כמו בריאות",
      "להריח ולהכניס אוויר לנשימה",
      "להחליף חמצן בדם בכל נשיפה",
      "להניע דם מהלב אל המוח"
    ],
    "correctIndex": 1,
    "explanation": "האף משמש להרחה ולנשימה. דרכו נכנס אוויר לגוף ומריחים ריחות.",
    "theoryLines": [
      "האף הוא חלק ממערכת הנשימה.",
      "יש בו שערות קטנות שמסננות את האוויר."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_24",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בפה?",
    "options": [
      "רק בלוטות רוק בלי עצם הלסת",
      "שיניים, לשון ורוק",
      "רק שיניים קשיחות בלי לשון",
      "מסת שריר בלבד ללא רוק"
    ],
    "correctIndex": 1,
    "explanation": "בפה יש שיניים ללעיסה, לשון לטעימה ורוק שמתחיל את עיכול המזון.",
    "theoryLines": [
      "השיניים עוזרות לחתוך וללעוס מזון.",
      "הלשון עוזרת לטעום ולבלוע."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_25",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "כמה עיניים יש לרוב האנשים?",
    "options": [
        "שתיים",
        "אחת",
        "שלוש",
        "ארבע"
    ],
    "correctIndex": 0,
    "explanation": "נכון. יש לנו שתי עיניים שעוזרות לנו לראות מרחק ועומק.",
    "theoryLines": [
      "שתי עיניים עוזרות לראות תלת מימד.",
      "העיניים עובדות יחד."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_26",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בתוך הגוף?",
    "options": [
      "שלד מעצמות בלי איברים רכים",
      "איברים פנימיים: לב, ריאות, קיבה ועוד",
      "לב בלבד בלי ריאות ושאר איברים",
      "ריאות בלבד בלי לב וכליות"
    ],
    "correctIndex": 1,
    "explanation": "בתוך הגוף יש איברים פנימיים רבים: לב, ריאות, קיבה, מעיים, כבד, כליות ועוד. כל אחד עושה עבודה חשובה.",
    "theoryLines": [
      "הגוף בנוי מאיברים שפועלים יחד.",
      "כל איבר יש לו תפקיד מיוחד."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_27",
    "topic": "body",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד השלד?",
    "options": [
      "תמיכה בעמידה בלי הגנה על איברים פנימיים",
      "מסגרת לגוף, הגנה על איברים ותנועה עם שרירים",
      "קשיחות העצמות בלי שיתוף פעולה עם שרירים",
      "הגנה מפני חבטות בלי תפקיד במפרקים"
    ],
    "correctIndex": 1,
    "explanation": "השלד תומך בגוף, מגן על איברים חשובים (כמו מוח ולב) ומאפשר תנועה יחד עם השרירים.",
    "theoryLines": [
      "השלד בנוי מעצמות רבות.",
      "בלי שלד הגוף היה רך ולא יציב."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "conceptTag": "skeleton_support_protect",
      "diagnosticSkillId": "sci_g3_body_skeleton_muscles",
      "probePower": "medium",
      "expectedErrorTags": [
        "skeleton_support_protect",
        "structure_function_confusion",
        "fact_recall_gap"
      ],
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "skeleton_support_protect",
        "structure_function_confusion",
        "fact_recall_gap"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_29",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד הקיבה?",
    "options": [
      "להחליף חמצן מול פחמן דוחמצני בנימים בריאתיים",
      "לקבל מזון מהוושט, לפרק בקיבה ולהעביר למעיים",
      "להניע דם מהלב אל כלי הדם הגדולים",
      "לאגד מידע חושי מהגפיים למוח בזמן אמת"
    ],
    "correctIndex": 1,
    "explanation": "הקיבה היא איבר דמוי שק שקולט מזון, מפרק אותו בעזרת חומצות ואנזימים ומערבב אותו לפני שהוא עובר למעיים.",
    "theoryLines": [
      "הקיבה יכולה להתרחב כשאנחנו אוכלים.",
      "היא מפרקת את המזון לחתיכות קטנות יותר."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_30",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד המעיים?",
    "options": [
      "נשימה דרך דופן המעי",
      "ספיגת מזון ומים לדם והוצאת פסולת החוצה",
      "הובלת דם לכל הגוף כמו הערוץ הראשי",
      "תנועת קיפול בקיבה בלבד"
    ],
    "correctIndex": 1,
    "explanation": "המעיים (דקים וגסים) סופגים חומרי מזון מהמזון המפורק לדם, סופגים מים ומעבירים פסולת להפרשה מהגוף.",
    "theoryLines": [
      "המעיים ארוכים מאוד – כמה מטרים!",
      "הם בעלי שטח פנים גדול לספיגה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_31",
    "topic": "body",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד הכבד?",
    "options": [
      "לפרק מזון רק במעי הדק",
      "לסנן דם, לייצר מיצי עיכול ולאחסן אנרגיה",
      "להזרים דם ללא סינון",
      "להחליף גזים עם האוויר החיצון"
    ],
    "correctIndex": 1,
    "explanation": "הכבד הוא האיבר הפנימי הגדול ביותר. הוא מסנן דם, מייצר מיצי עיכול, מאחסן אנרגיה ועוזר בפירוק רעלים.",
    "theoryLines": [
      "הכבד עושה הרבה תפקידים חשובים.",
      "הוא נמצא בצד ימין של הבטן העליונה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_32",
    "topic": "body",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד מערכת הלימפה?",
    "options": [
      "לפרק שומן במעיים באנזימים",
      "להילחם בזיהומים ולנקז נוזלים מהרקמות",
      "להניע דם בקצב הלב בלבד",
      "להחליף אוויר בריאות בכל שאיפה"
    ],
    "correctIndex": 1,
    "explanation": "מערכת הלימפה כוללת בלוטות לימפה, כלי לימפה ונוזל לימפה. היא עוזרת להילחם בזיהומים ולנקז נוזלים.",
    "theoryLines": [
      "בלוטות לימפה נמצאות במקומות שונים בגוף.",
      "הן עוזרות לעצור זיהומים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "body_33",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד בלוטת התריס?",
    "options": [
      "לסנן רעלים ולייצר מיצי מרה לעיכול שומנים",
      "לייצר הורמונים השולטים בחילוף חומרים, גדילה ואנרגיה",
      "להזרים דם חמצני מאזור העורקים לעורקי הריאה",
      "להפריש אינסולין שמווסת בעיקר סוכר בתאי שריר"
    ],
    "correctIndex": 1,
    "explanation": "בלוטת התריס מייצרת הורמונים ששולטים בקצב חילוף החומרים, גדילה, התפתחות וצריכת אנרגיה בגוף.",
    "theoryLines": [
      "הבלוטה נמצאת בצוואר.",
      "היא חשובה מאוד לגדילה ולפיתוח."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "body_34",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד הלבלב?",
    "options": [
      "הזרמת דם מזין כמו הלב",
      "לייצר אינסולין (הורמון) ומיצי עיכול",
      "נשימה תאית כמו בריאות",
      "ייצוב שלד ללא הורמונים"
    ],
    "correctIndex": 1,
    "explanation": "הלבלב מייצר אינסולין (הורמון ששולט ברמת הסוכר בדם) ומיצי עיכול שעוזרים בפירוק מזון במעיים.",
    "theoryLines": [
      "הלבלב נמצא ליד הקיבה.",
      "אינסולין חשוב מאוד לרמת הסוכר בדם."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_16",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יכול לשחות?",
    "options": [
      "תרנגול",
      "דג",
      "נמר",
      "ארנב"
    ],
    "correctIndex": 1,
    "explanation": "דגים יכולים לשחות במים. יש להם סנפירים שעוזרים להם לנוע במים.",
    "theoryLines": [
      "דגים חיים במים.",
      "הם מותאמים לחיים במים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_17",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים מכוסה פרווה?",
    "options": [
      "דג",
      "כלב",
      "נחש",
      "ציפור"
    ],
    "correctIndex": 1,
    "explanation": "כלב הוא יונק ויש לו פרווה. פרווה עוזרת לשמור על חום הגוף.",
    "theoryLines": [
      "יונקים יש להם פרווה או שיער.",
      "פרווה עוזרת לשמור על חום."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_18",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים מכוסה נוצות?",
    "options": [
      "כלב מבית",
      "חתול פרוותי",
      "תרנגול",
      "דג במים"
    ],
    "correctIndex": 2,
    "explanation": "תרנגול הוא עוף ויש לו נוצות. נוצות עוזרות לעופות לעוף ולשמור על חום.",
    "theoryLines": [
      "עופות יש להם נוצות.",
      "נוצות עוזרות לעוף ולשמור על חום."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_19",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נכון לגבי כלב וחתול?",
    "options": [
        "הם יונקים - מיניקים גורים ויש להם פרווה",
        "הם זוחלים שמטילים ביצים",
        "הם דגים שחיים במים",
        "הם ציפורים עם נוצות"
    ],
    "correctIndex": 0,
    "explanation": "נכון. כלבים וחתולים הם יונקים. הם ממליטים צאצאים חיים ומניקים אותם.",
    "theoryLines": [
      "יונקים ממליטים צאצאים חיים.",
      "הם מניקים את הצאצאים בחלב."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_20",
    "topic": "animals",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה בעלי החיים עושים בחורף?",
    "options": [
      "כמעט כל המינים נודדים לאותו אזור",
      "חלקם נודדים, חלקם בתרדמת חורף, חלקם פעילים",
      "כולם נרדמים באותו אופן ובאותו עומק",
      "כולם עוברים דפוס דומה של עפיפה"
    ],
    "correctIndex": 1,
    "explanation": "בעלי חיים שונים מתמודדים עם חורף בדרכים שונות: חלק נודדים למקום חם, חלק נכנסים לתרדמת חורף, וחלק נשארים פעילים.",
    "theoryLines": [
      "בעלי חיים מתאימים את עצמם לעונות השנה.",
      "כל בעל חיים יש לו דרך משלו לשרוד."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_21",
    "topic": "animals",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין טורף לטרף?",
    "options": [
      "שניהם מתארים יצור המקבל אנרגיה ישירות מצמחים בלבד",
      "טורף הוא בעל חיים שטורף ואוכל בעלי חיים אחרים, טרף הוא בעל חיים שנטרף",
      "הטורף הוא תמיד בעל החיים שנאכל ולא זה שצד",
      "הטרף הוא תמיד בעל החיים שצד אחרים בשרשרת המזון"
    ],
    "correctIndex": 1,
    "explanation": "טורף הוא בעל חיים שצד ואוכל בעלי חיים אחרים (טרף). טרף הוא בעל החיים שנטרף ונאכל.",
    "theoryLines": [
      "זה חלק משרשרת המזון.",
      "טורפים צדים, טרף נצוד."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_22",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו אוכל עשב?",
    "options": [
      "בעל חיים שאוכל בשר",
      "בעל חיים שאוכל צמחים",
      "בעל חיים שאוכל הכל",
      "בעל חיים שלא אוכל כלום"
    ],
    "correctIndex": 1,
    "explanation": "אוכל עשב הוא בעל חיים שאוכל רק צמחים – עשב, עלים, פירות וכו'. דוגמאות: פרה, ארנב, צבי.",
    "theoryLines": [
      "אוכלי עשב הם חלק חשוב בשרשרת המזון.",
      "הם אוכלים צמחים שמשמשים כיצרנים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_23",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו אוכל כל?",
    "options": [
      "בעל חיים שאוכל רק בשר",
      "בעל חיים שאוכל גם צמחים וגם בשר",
      "בעל חיים שאוכל רק צמחים",
      "בעל חיים שלא אוכל כלום"
    ],
    "correctIndex": 1,
    "explanation": "אוכל כל הוא בעל חיים שאוכל גם צמחים וגם בעלי חיים. דוגמאות: אדם, דב, חזיר.",
    "theoryLines": [
      "אוכלי כל גמישים יותר במזון שלהם.",
      "הם יכולים לאכול מגוון מזונות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_24",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מטבוליזם?",
    "options": [
      "נשימת אוויר בלבד",
      "כל התהליכים הכימיים בגוף שבהם בעל החיים מפרק מזון לאנרגיה",
      "תנועת שרירים בלי שינויי כימיה",
      "גדילה בגובה בלי פירוק מזון"
    ],
    "correctIndex": 1,
    "explanation": "מטבוליזם (חילוף חומרים) הוא כל התהליכים הכימיים בגוף שבהם מזון מפורק והופך לאנרגיה שהגוף משתמש בה.",
    "theoryLines": [
      "זה קורה בכל התאים.",
      "זה מאפשר לבעל החיים לחיות ולפעול."
    ],
    "params": {
      "patternFamily": "sci_animals_life_processes",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_25",
    "topic": "animals",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו דפוס הסוואה?",
    "options": [
      "צבע אחיד בלי תבנית על העור",
      "צבעים ותבניות שעוזרים לבעל חיים להתמזג עם הסביבה ולהתחבא",
      "תנועה מהירה בלי שינוי מראה",
      "קולות חיקוי בלי שינוי צורה"
    ],
    "correctIndex": 1,
    "explanation": "דפוס הסוואה (קמופלאז') הוא צבעים ותבניות שעוזרים לבעל החיים להיראות כמו הסביבה שלו ולהתחבא מטורפים או מטרף.",
    "theoryLines": [
      "זה עוזר לשרוד.",
      "דוגמאות: ארנב בחורף, צפרדע על עלים ירוקים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_26",
    "topic": "animals",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מין נכחד?",
    "options": [
      "מין שמתרבה היום בכל יבשת",
      "מין שכל הפרטים שלו מתו ואין עוד פרטים חיים",
      "מין שגודל גופו הכפיל את עצמו בשנה",
      "מין שהתגלה לאחרונה בלבד"
    ],
    "correctIndex": 1,
    "explanation": "מין נכחד הוא מין בעל חיים שכל הפרטים שלו מתו ולא נותרו פרטים חיים. דוגמאות: דודו, עוף המואה.",
    "theoryLines": [
      "הכחדה קורית מסיבות שונות.",
      "חשוב להגן על מינים כדי למנוע הכחדה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_16",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איפה גדלים צמחים?",
    "options": [
      "מים מתוקים בלבד בלי מצע יבש",
      "באדמה, במים או במקומות אחרים",
      "אוויר פתוח בלי מים או מצע",
      "אדמה יבשה בלי טיפת מים"
    ],
    "correctIndex": 1,
    "explanation": "צמחים יכולים לגדול באדמה, במים (כמו אצות) או במקומות אחרים. רוב הצמחים גדלים באדמה.",
    "theoryLines": [
      "צמחים שונים גדלים במקומות שונים.",
      "אדמה מספקת מים וחומרי מזון."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_17",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צבע הצמחים הירוקים?",
    "options": [
      "אדום",
      "כחול",
      "ירוק",
      "צהוב"
    ],
    "correctIndex": 2,
    "explanation": "צמחים ירוקים כי יש בהם כלורופיל – חומר ירוק שקולט אור שמש.",
    "theoryLines": [
      "כלורופיל עוזר לצמח לייצר מזון.",
      "זה נותן לצמח את הצבע הירוק."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_18",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה צמחים צריכים מים?",
    "options": [
        "העלים",
        "השורשים",
        "הגבעול",
        "הפרחים"
    ],
    "correctIndex": 0,
    "explanation": "נכון. צמחים צריכים מים כדי לחיות. ללא מים הם נובלים.",
    "theoryLines": [
      "מים עוזרים לצמח להישאר חזק.",
      "השורשים קולטים מים מהאדמה."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_19",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה לעלים בסתיו?",
    "options": [
      "הם נהיים יותר ירוקים",
      "הם משנים צבע ונושרים",
      "הם גדלים יותר",
      "הם נעלמים"
    ],
    "correctIndex": 1,
    "explanation": "בסתיו העלים משנים צבע (צהוב, אדום, כתום) ונושרים מהעצים. זה קורה כי יש פחות אור והטמפרטורה יורדת.",
    "theoryLines": [
      "זה חלק ממחזור החיים של העצים.",
      "באביב העלים החדשים צומחים שוב."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_20",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו זרע?",
    "options": [
      "קליפה חיצונית של פרי בלי עובר צמח",
      "חלק של צמח שמכיל עובר צמח ויכול לגדול לצמח חדש",
      "פרח צבעוני בלי שלב הזרע",
      "עלה שמאחסן עמילן בלי עובר צמח"
    ],
    "correctIndex": 1,
    "explanation": "זרע הוא חלק של הצמח שמכיל עובר צמח קטן. כשיש תנאים מתאימים, הזרע יכול לנבוט ולצמוח לצמח חדש.",
    "theoryLines": [
      "זרעים מגיעים מפרחים.",
      "הם מכילים את כל המידע לגדול לצמח."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_21",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו פרי?",
    "options": [
      "פרח לפני הפריה בלי זרעים פנימיים",
      "חלק של הצמח שמכיל זרעים ומגן עליהם",
      "עלה שמתפתח אחרי נשירה",
      "שורש שמעביר זרעים לקרקע"
    ],
    "correctIndex": 1,
    "explanation": "פרי הוא החלק של הצמח שמכיל זרעים ומגן עליהם. הוא גם עוזר להפיץ את הזרעים.",
    "theoryLines": [
      "פירות הם מתוקים כדי למשוך בעלי חיים.",
      "בעלי חיים אוכלים פירות ומפיצים את הזרעים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_22",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו שורש?",
    "options": [
      "ענף למעלה שקולט אור בלבד",
      "חלק של הצמח שנמצא בקרקע, קולט מים ומינרלים ומעגן את הצמח",
      "פרח בראש הגבעול בלבד",
      "עלה שמחלחל לתוך האדמה"
    ],
    "correctIndex": 1,
    "explanation": "השורש הוא החלק של הצמח שנמצא בקרקע. הוא קולט מים ומינרלים, מעגן את הצמח בקרקע ולפעמים אוגר מזון.",
    "theoryLines": [
      "שורשים גדלים למטה, לתוך האדמה.",
      "הם עוזרים לצמח לעמוד יציב."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_23",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו כלורופלסט?",
    "options": [
      "פיגמנט צבע בלי מבנה נפרד בתא",
      "איבר קטן בתא הצמח שמכיל כלורופיל ובו מתבצעת פוטוסינתזה",
      "מגבת מים סביב התא ללא כלורופיל",
      "גרגרי אדמה שצמים לתא"
    ],
    "correctIndex": 1,
    "explanation": "כלורופלסט הוא איבר קטן (אורגנל) בתא הצמח שמכיל כלורופיל. כאן מתבצעת פוטוסינתזה.",
    "theoryLines": [
      "כלורופלסטים נמצאים בעיקר בעלים.",
      "הם נראים ירוקים כי יש בהם כלורופיל."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_24",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו האבקה?",
    "options": [
      "שלב הפריחה לפני יצירת אבקה",
      "אבקה צהובה שנוצרת בפרחים וצריכה להגיע לפרח אחר כדי ליצור זרעים",
      "פיזור עלים יבשים בין פרחים",
      "שורש שמעביר גרגרי אבקה"
    ],
    "correctIndex": 1,
    "explanation": "אבקה היא אבקה צהובה שנוצרת בפרח הזכרי. היא צריכה להגיע לפרח הנקבי כדי שתיווצר הפריה וזרעים.",
    "theoryLines": [
      "חרקים, רוח או מים מעבירים אבקה.",
      "זה חלק מתהליך הרביה של צמחים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_25",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו דיות (טרנספירציה)?",
    "options": [
      "קליטת מים בשורש בלי אובדן מהעלה",
      "תהליך שבו צמחים מאבדים מים דרך העלים (אדי מים)",
      "ייצור סוכר בעזרת אור בלי אידוי",
      "הארכת הגבעול בלי יציאת אדים"
    ],
    "correctIndex": 1,
    "explanation": "דיות (טרנספירציה) הוא תהליך שבו צמחים מאבדים מים כאדי מים דרך פיוניות בעלים. זה עוזר למשוך מים מהשורשים למעלה.",
    "theoryLines": [
      "זה חלק ממחזור המים.",
      "זה עוזר לצמח לקלוט מים מהשורשים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_26",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו זבל אורגני?",
    "options": [
      "אדמה עקרה בלי שארית חומר צמחי",
      "חומר שמגיע מבעלי חיים או צמחים שמתפרק והופך לדשן שעוזר לצמחים לגדול",
      "מי השקיה נקיים בלי חומרים מתפרקים",
      "סלעים שמוחצים לגריס אך לא לדשן"
    ],
    "correctIndex": 1,
    "explanation": "זבל אורגני הוא חומר שמגיע מבעלי חיים או צמחים (כמו קומפוסט) שמתפרק ומשחרר חומרי מזון לאדמה שעוזרים לצמחים לגדול.",
    "theoryLines": [
      "זה דשן טבעי.",
      "זה עוזר לשמור על אדמה בריאה."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_15",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהו מצב הצבירה של מים?",
    "options": [
      "תמיד מוצק בטמפרטורת החדר",
      "תמיד נוזל בלי יוצא מן הכלל",
      "רק גז בטבע בכל עונה",
      "מוצק, נוזל או גז לפי טמפרטורה"
    ],
    "correctIndex": 3,
    "explanation": "מים יכולים להיות בשלושה מצבי צבירה: מוצק (קרח), נוזל (מים רגילים), או גז (אדי מים).",
    "theoryLines": [
      "טמפרטורה משנה את מצב הצבירה.",
      "בטמפרטורה רגילה מים הם נוזל."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_16",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה לקרח כשהוא מתחמם?",
    "options": [
      "נשאר קרח אם לא מחממים מעל נקודת ההקפאה",
      "הופך למים (נוזל)",
      "הופך ישירות לאדים בלי שלב נוזל",
      "מתרכב חזק יותר ונשאר מוצק"
    ],
    "correctIndex": 1,
    "explanation": "כאשר קרח מתחמם, הוא נמס והופך למים נוזליים. זה שינוי מצב צבירה ממוצק לנוזל.",
    "theoryLines": [
      "זה נקרא התכה.",
      "זה קורה כאשר הטמפרטורה עולה מעל 0 מעלות צלזיוס."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_17",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "באילו מצבי צבירה יכולים להימצא מים?",
    "options": [
        "מוצק, נוזל וגז",
        "רק נוזל",
        "רק מוצק",
        "רק גז"
    ],
    "correctIndex": 0,
    "explanation": "נכון. מים יכולים להיות בשלושה מצבי צבירה: קרח (מוצק), מים (נוזל), או אדי מים (גז).",
    "theoryLines": [
      "טמפרטורה משנה את מצב הצבירה.",
      "זה קורה עם הרבה חומרים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_18",
    "topic": "materials",
    "grades": [
      "g2",
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר הוא קשה?",
    "options": [
      "מים",
      "אוויר",
      "ברזל",
      "קרח נמס"
    ],
    "correctIndex": 2,
    "explanation": "ברזל הוא מתכת קשה. אפשר להשתמש בו לבנייה ולעשיית כלים.",
    "theoryLines": [
      "מתכות רבות קשות וחזקות.",
      "הן מוליכות חום וחשמל."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_19",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו חומר שקוף?",
    "options": [
      "חומר שבולע אור ורואים כהה",
      "חומר שאור עובר דרכו ורואים דרכו",
      "חומר שמשקף בלי שקיפות",
      "חומר קשה בלי כל מעבר אור"
    ],
    "correctIndex": 1,
    "explanation": "חומר שקוף הוא חומר שאור יכול לעבור דרכו ואנחנו יכולים לראות דרכו. דוגמאות: זכוכית, מים נקיים, פלסטיק שקוף.",
    "theoryLines": [
      "שקיפות מאפשרת לראות דרכו.",
      "זה שימושי לחלונות ולמשקפיים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_20",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו חומר אורגני?",
    "options": [
      "פלסטיק מלאכותי שמקורו במאגרי נפט בלבד",
      "חומר שמקורו ביצורים חיים (צמחים או בעלי חיים)",
      "מתכת מחצבים ללא שארי יצורים חיים",
      "אבן גיר טהורה בלי תרכובות אורגניות"
    ],
    "correctIndex": 1,
    "explanation": "חומר אורגני הוא חומר שמקורו ביצורים חיים – צמחים או בעלי חיים. דוגמאות: עץ, כותנה, צמר.",
    "theoryLines": [
      "חומרים אורגניים מתפרקים בקלות יותר.",
      "חלקם ידידותיים לסביבה יותר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_21",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו חומר אי-אורגני?",
    "options": [
      "חומר שמקורו ביצורים חיים",
      "חומר שמקורו בדומם (סלעים, מתכות, מינרלים)",
      "פולימר סינתטי בלי גרעין מינרלי",
      "עץ מעובד שמכיל תאים צמחיים"
    ],
    "correctIndex": 1,
    "explanation": "חומר אי-אורגני הוא חומר שמקורו בדומם – לא ביצורים חיים. דוגמאות: סלעים, מתכות, זכוכית, חימר.",
    "theoryLines": [
      "אלה חומרים טבעיים או מעשה ידי אדם.",
      "הם בדרך כלל לא מתפרקים בקלות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_22",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר מגנטי?",
    "options": [
      "עץ יבש שלא נמשך למגנט",
      "חומר שנמשך למגנט (למשל ברזל)",
      "אלומיניום שלא נמשך בדרך כלל למגנט ביתי",
      "זכוכית עבה שאינה נמשכת למגנט"
    ],
    "correctIndex": 1,
    "explanation": "חומר מגנטי הוא חומר שנמשך למגנט. דוגמאות: ברזל, ניקל, קובלט. לא כל המתכות מגנטיות.",
    "theoryLines": [
      "מגנטים מושכים חומרים מגנטיים.",
      "זה קשור לתכונות פנימיות של החומר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_23",
    "topic": "materials",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר אלסטי?",
    "options": [
      "חומר שמתכופף ונשבר בלי חזרה לצורה",
      "חומר שמתמתח ואז חוזר לצורתו המקורית",
      "חומר שנשאר דביק לצמיתות אחרי לחיצה",
      "חומר שנסדק בקור ולא משתנה שוב"
    ],
    "correctIndex": 1,
    "explanation": "חומר אלסטי הוא חומר שיכול להתמתח או להתכופף ולחזור לצורתו המקורית כשמפסיקים למתוח. דוגמאות: גומי, קפיצים.",
    "theoryLines": [
      "אלסטיות היא תכונה חשובה.",
      "זה עוזר למוצרים רבים לעבוד."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_24",
    "topic": "materials",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר רב-פעמי לעומת חד-פעמי?",
    "options": [
      "שניהם מוגדרים לפי משקל בלבד, לא לפי מספר שימושים",
      "חומר רב-פעמי אפשר להשתמש בו שוב, חומר חד-פעמי משתמשים בו פעם אחת",
      "חומר חד-פעמי תמיד עמיד יותר ומתאים לשימוש ממושך מאשר רב-פעמי",
      "חומר רב-פעמי חייב להיות תמיד חומר מלאכותי מסוכן מהר יותר"
    ],
    "correctIndex": 1,
    "explanation": "חומר רב-פעמי אפשר להשתמש בו שוב ושוב (כמו בקבוק זכוכית). חומר חד-פעמי משתמשים בו פעם אחת ואז זורקים (כמו שקית פלסטיק חד-פעמית).",
    "theoryLines": [
      "שימוש בחומרים רב-פעמיים עוזר לשמור על הסביבה.",
      "זה מפחית פסולת."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_14",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש ביקום?",
    "options": [
      "כדור הארץ כגוף בודד ביקום",
      "כוכבים, כוכבי לכת, ירחים וגלקסיות רבות",
      "מערכת השמש בלי גלקסיות אחרות",
      "ירחים שמקיפים את כדור הארץ בלבד"
    ],
    "correctIndex": 1,
    "explanation": "ביקום יש הרבה דברים: כוכבים, כוכבי לכת (כמו כדור הארץ), ירחים, וגלקסיות רבות. זה מקום גדול מאוד!",
    "theoryLines": [
      "היקום גדול מאוד ובלתי נתפס.",
      "כדור הארץ הוא רק חלק קטן ממנו."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_15",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "כמה ירחים יש לכדור הארץ?",
    "options": [
      "אפס",
      "אחד",
      "שניים",
      "שלושה"
    ],
    "correctIndex": 1,
    "explanation": "לכדור הארץ יש ירח אחד. הוא נקרא 'הירח' והוא מסתובב סביב כדור הארץ.",
    "theoryLines": [
      "הירח הוא הלוויין הטבעי של כדור הארץ.",
      "הוא מחזיר את אור השמש."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_16",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מהי השמש?",
    "options": [
        "כוכב שמפיץ אור וחום",
        "כוכב לכת כמו כדור הארץ",
        "לוויין של כדור הארץ",
        "אסטרואיד גדול"
    ],
    "correctIndex": 0,
    "explanation": "נכון. השמש היא כוכב – הכוכב הקרוב ביותר לכדור הארץ. היא מפיקה אור וחום.",
    "theoryLines": [
      "השמש היא כוכב בינוני.",
      "יש הרבה כוכבים אחרים ביקום."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_17",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה הן עונות השנה?",
    "options": [
      "קיץ חם בכל ימות השנה בכל מקום",
      "קיץ, חורף, סתיו ואביב – תקופות שונות בשנה עם מזג אוויר שונה",
      "חורף קר שמכסה את כל השנה",
      "אביב בלי מעבר לקיץ או לחורף"
    ],
    "correctIndex": 1,
    "explanation": "יש ארבע עונות: קיץ (חם), חורף (קר), סתיו ואביב (מעבר). כל עונה יש מזג אוויר שונה.",
    "theoryLines": [
      "עונות נוצרות בגלל נטיית כדור הארץ.",
      "הן חוזרות כל שנה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_18",
    "topic": "earth_space",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו כוכב לכת?",
    "options": [
      "גוף שמפיק אור וחום כמו השמש",
      "גוף שמקיף כוכב, לדוגמה הארץ סביב השמש",
      "לוויין שמקיף כוכב לכת",
      "כוכב בשמיים עם זנב זוהר"
    ],
    "correctIndex": 1,
    "explanation": "כוכב לכת הוא גוף גדול שמסתובב סביב כוכב. כדור הארץ הוא כוכב לכת שמסתובב סביב השמש.",
    "theoryLines": [
      "יש שמונה כוכבי לכת במערכת השמש.",
      "כל אחד יש לו תכונות שונות."
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
    "id": "earth_19",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו כוכב?",
    "options": [
      "כוכב לכת",
      "גוף גדול ביקום שמפיק אור וחום בעצמו",
      "ירח",
      "אסטרואיד קטן שאין לו זנב"
    ],
    "correctIndex": 1,
    "explanation": "כוכב הוא גוף גדול ביקום שמפיק אור ואנרגיה בעצמו דרך תגובות גרעיניות. השמש היא כוכב.",
    "theoryLines": [
      "כוכבים נמצאים רחוק מאוד.",
      "הם נראים כנקודות אור בשמיים בלילה."
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
    "id": "earth_20",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו אסטרואיד?",
    "options": [
      "גוף מאסיבי שמפיק אור עצמי",
      "אבן גדולה בחלל שמסתובבת סביב השמש",
      "גוף כבד המקיף שמש כמו ארץ",
      "לוויין שמקיף ארץ בלבד"
    ],
    "correctIndex": 1,
    "explanation": "אסטרואיד הוא אבן גדולה בחלל שמסתובבת סביב השמש. יש הרבה אסטרואידים בין כוכבי הלכת.",
    "theoryLines": [
      "אסטרואידים הם שרידים מהמערכת השמש הקדומה.",
      "חלקם קטנים מאוד, חלקם גדולים."
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
    "id": "earth_21",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו כוכב שביט?",
    "options": [
      "גוף כבד המקיף שמש בנתיב עגול כדורי",
      "גוף קרח ואבק עם זנב ליד השמש",
      "אבן יבשה קטנה בחגורת סלעים",
      "לוויין טבעי של כדור הארץ"
    ],
    "correctIndex": 1,
    "explanation": "כוכב שביט הוא גוף עשוי קרח, אבק וסלעים שמסתובב סביב השמש. כשהוא מתקרב לשמש, הקרח מתאדה ויוצר זנב אור.",
    "theoryLines": [
      "שביטים נראים כצורה עם זנב.",
      "הם מגיעים ממקומות רחוקים במערכת השמש."
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
    "id": "earth_22",
    "topic": "earth_space",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו גלקסיה?",
    "options": [
      "כוכב יחיד במערכת השמש",
      "קבוצה ענקית של כוכבים, כוכבי לכת וגזים שמחוברים בכוח המשיכה",
      "ירח שמסתובב סביב כדור הארץ",
      "שביט בודד עם זנב קצר בלבד"
    ],
    "correctIndex": 1,
    "explanation": "גלקסיה היא קבוצה ענקית של מיליוני או מיליארדי כוכבים, כוכבי לכת, גזים ואבק שמחוברים בכוח המשיכה.",
    "theoryLines": [
      "יש הרבה גלקסיות ביקום.",
      "הגלקסיה שלנו נקראת שביל החלב."
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
    "id": "earth_23",
    "topic": "earth_space",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חור שחור?",
    "options": [
      "מקום חשוך בחלל",
      "אזור בחלל עם כוח משיכה כל כך חזק שאפילו אור לא יכול לברוח ממנו",
      "כוכב מת שאין לו כלל כבידה",
      "ירח מאסיבי שבולע אור בגלל צל"
    ],
    "correctIndex": 1,
    "explanation": "חור שחור הוא אזור בחלל עם כוח משיכה כל כך חזק שאפילו אור לא יכול לברוח ממנו. זה נוצר כשכוכב גדול מאוד קורס.",
    "theoryLines": [
      "חורים שחורים מאוד מסתוריים.",
      "מדענים עדיין לומדים עליהם."
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
    "id": "env_11",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צריך לעשות עם פסולת?",
    "options": [
      "להשאיר ליד הפח אם הפח המלא בתחנת מיחזור",
      "לזרוק בפח אשפה או במיכל מיחזור מתאים",
      "לדחוס הכל לשקית אחת בלי מיון כדי לחסוך מקום",
      "לאסוף רק נייר בבית ולזרוק שאר הפסולת לאותו פח ברחוב"
    ],
    "correctIndex": 1,
    "explanation": "צריך לזרוק פסולת בפח אשפה. זה עוזר לשמור על הסביבה נקייה, יפה ובריאה.",
    "theoryLines": [
      "כל אחד יכול לעזור לשמור על הסביבה.",
      "פחי אשפה מיועדים לאיסוף פסולת."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_12",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איך עוזרים לשמור על הטבע?",
    "options": [
      "להאכיל חיות בר במזון מבושל כדי לקרבן למבקרים",
      "לא לזרוק פסולת בטבע, לשמור על מקומות נקיים",
      "לקטוף צמחי בר נדירים הביתה לזיכרון מטיול",
      "לבנות שבילים בלא תיאום עם שמירה על בתי גידול רגישים"
    ],
    "correctIndex": 1,
    "explanation": "עוזרים לשמור על הטבע על ידי לא לזרוק פסולת, לשמור על מקומות נקיים ולכבד את הצמחים והחיות.",
    "theoryLines": [
      "הטבע חשוב לנו ולכל היצורים.",
      "כל אחד יכול לעזור לשמור עליו."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_14",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו זיהום אוויר?",
    "options": [
      "אוויר נקי לחלוטין בלי כל מזהם",
      "חומרים מזיקים באוויר שגורמים נזק לבריאות ולסביבה",
      "גשם שמדלל ומעיף כל מזהם מהאוויר",
      "קרינת שמש שמונעת כניסת גזים למערכת"
    ],
    "correctIndex": 1,
    "explanation": "זיהום אוויר הוא חומרים מזיקים שנמצאים באוויר (ממכוניות, מפעלים וכו') שגורמים נזק לבריאות ולסביבה.",
    "theoryLines": [
      "זה נוצר מפעילות אנושית.",
      "זה יכול לגרום למחלות."
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
    "id": "env_15",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו זיהום מים?",
    "options": [
      "מים ערוציים תמיד טהורים מכל חומר",
      "הוספת חומרים מזיקים למים שגורמים נזק",
      "אגם שקוף לגמרי בלי חיידקים",
      "נחל מתוק שאינו סוחף משקעים"
    ],
    "correctIndex": 1,
    "explanation": "זיהום מים הוא הוספת חומרים מזיקים למים (כמו פסולת, כימיקלים) שגורמים נזק לבעלי החיים והצמחים שצריכים מים נקיים.",
    "theoryLines": [
      "זה פוגע בטבע ובבני אדם.",
      "חשוב לשמור על מים נקיים."
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
    "id": "env_16",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו זיהום קרקע?",
    "options": [
      "אדמה שאין בה שום שארית חומר",
      "הוספת חומרים מזיקים לאדמה שגורמים נזק",
      "שדה מלא צמחים בלי כל שארית פסולת",
      "חצר בית בלי שימוש בדשנים כלל"
    ],
    "correctIndex": 1,
    "explanation": "זיהום קרקע הוא הוספת חומרים מזיקים לאדמה (כמו פסולת, כימיקלים) שגורמים נזק לצמחים ולבעלי חיים.",
    "theoryLines": [
      "זה פוגע באדמה ובמה שגדל בה.",
      "חשוב לשמור על אדמה נקייה."
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
    "id": "env_17",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו אפקט החממה?",
    "options": [
      "מבנה זכוכית שגודל ירקות בתוכו",
      "תהליך שבו גזים באטמוספרה לוכדים חום ושמורים על טמפרטורה מתאימה לחיים",
      "קיפאון גלובלי שנגרם בלי גזי חממה",
      "חימום אספלט מקומי בלי השפעה על אטמוספרה"
    ],
    "correctIndex": 1,
    "explanation": "אפקט החממה הוא תהליך שבו גזים באטמוספרה (כמו פחמן דו-חמצני) לוכדים חום מהשמש ושומרים על טמפרטורה מתאימה לחיים על כדור הארץ.",
    "theoryLines": [
      "זה חשוב מאוד לחיים על כדור הארץ.",
      "אבל יותר מדי גזי חממה יכול לגרום להתחממות יתר."
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
    "id": "env_18",
    "topic": "environment",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו שינוי אקלים?",
    "options": [
      "מזג אוויר משתנה מיום ליום",
      "שינוי ארוך טווח בדפוסי מזג האוויר והטמפרטורה בעולם",
      "עונה אחת שחוזרת בלי שאר העונות",
      "קיץ בוזמנית בכל קווי הרוחב"
    ],
    "correctIndex": 1,
    "explanation": "שינוי אקלים הוא שינוי ארוך טווח בדפוסי מזג האוויר והטמפרטורה בעולם. זה קורה בגלל פעילות אנושית שמגבירה אפקט החממה.",
    "theoryLines": [
      "זה משפיע על כל העולם.",
      "חשוב לפעול כדי להפחית את זה."
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
    "id": "env_19",
    "topic": "environment",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו שמורה טבעית?",
    "options": [
      "שטח ייעודי לבנייה עירונית רציפה",
      "אזור מוגן לטבע, חיות וצמחים",
      "שכונה צפופה בלי פארקים",
      "מתחם תעשייה ומרכזי פסולת פתוחה"
    ],
    "correctIndex": 1,
    "explanation": "שמורה טבעית היא אזור מוגן שבו הטבע, החיות והצמחים מוגנים ושומרים עליהם. אנשים יכולים לבקר אבל לא לפגוע.",
    "theoryLines": [
      "זה עוזר לשמור על מינים של בעלי חיים וצמחים.",
      "זה חשוב לדורות הבאים."
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
    "id": "env_20",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו קיימות (sustainability)?",
    "options": [
      "ניצל מרבי של משאבים בלי תכנון",
      "שימוש במשאבים שלא מייבש את הדור הבא",
      "הימנעות מוחלטת מכל צריכה",
      "פעולה שממחצת סביבה בלי שיקום"
    ],
    "correctIndex": 1,
    "explanation": "קיימות היא שימוש במשאבים (מים, אנרגיה, חומרים) בצורה חכמה שלא תפגע בדורות הבאים ותאפשר להם גם ליהנות מהמשאבים.",
    "theoryLines": [
      "זה חשוב מאוד לעתיד.",
      "זה כולל מיחזור, חיסכון באנרגיה ועוד."
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
    "id": "exp_10",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צריך לעשות לפני ניסוי?",
    "options": [
      "להניח שחומר נקי מראה אומר שהוא בטוח לגמרי",
      "להיות זהירים, לקרוא הוראות ולהיעזר במבוגר",
      "להתחיל מהחומר הכי מרוכז בלי לקרוא סדר שלבים",
      "לדלג על ארגון ציוד אם יש מעט זמן"
    ],
    "correctIndex": 1,
    "explanation": "לפני ניסוי צריך להיות זהירים ולהיעזר במבוגר שיעזור. חשוב לחשוב מה רוצים לבדוק.",
    "theoryLines": [
      "בטיחות חשובה מאוד בניסויים.",
      "מבוגר צריך לעזור ולפקח."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_12",
    "topic": "experiments",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה זה תצפית?",
    "options": [
      "הסתכלות חטופה בלי תיעוד",
      "להסתכל בקפידה ולראות מה קורה, ולכתוב או לצייר את מה שרואים",
      "להתעלם ממה שנראה בניסוי",
      "ניחוש תוצאה בלי רישום תצפית"
    ],
    "correctIndex": 1,
    "explanation": "תצפית היא להסתכל בקפידה ולראות מה קורה, ולכתוב או לצייר את מה שרואים. זה חלק חשוב בניסוי.",
    "theoryLines": [
      "תצפיות מדויקות עוזרות להבין מה קורה.",
      "זה חשוב לכתוב מה רואים."
    ],
    "params": {
      "patternFamily": "sci_experiments_observation_inference",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_13",
    "topic": "experiments",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מדידה?",
    "options": [
      "הבחנה בעינית בלי מספרים",
      "להשתמש בכלים כדי לבדוק כמה גדול, כמה כבד או כמה חם משהו",
      "לא לאסוף נתונים כלל",
      "הערכת גודל בלי סרגל או משקל"
    ],
    "correctIndex": 1,
    "explanation": "מדידה היא להשתמש בכלים (כמו סרגל, משקל, מדחום) כדי לבדוק כמה גדול, כמה כבד או כמה חם משהו. זה נותן מספרים מדויקים.",
    "theoryLines": [
      "מדידות עוזרות להיות מדויקים.",
      "יש כלים שונים למדידות שונות."
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
    "id": "exp_14",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה תהליך מדעי?",
    "options": [
      "ניסוי בודד בלי שאלה מקדימה",
      "סדרה של צעדים: שאלה, השערה, ניסוי, תצפיות, מסקנות",
      "שאלה בלי ניסוי ולאיסוף נתונים",
      "ניחוש סופי בלי תצפיות ביניים"
    ],
    "correctIndex": 1,
    "explanation": "תהליך מדעי הוא סדרה של צעדים: שאלה (מה רוצים לבדוק), השערה (מה חושבים שיקרה), ניסוי (בודקים), תצפיות (רואים מה קורה), מסקנות (מה למדנו).",
    "theoryLines": [
      "זה תהליך מסודר.",
      "כל שלב חשוב."
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
    "id": "exp_15",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה קבוצת ביקורת בניסוי?",
    "options": [
      "קבוצה שלא משתנה",
      "קבוצה בניסוי שלא משנים בה כלום, כדי להשוות לקבוצה שמשנים בה דבר",
      "קבוצה שתמיד משתנה",
      "ניסוי עם קבוצה יחידה בלי השוואה"
    ],
    "correctIndex": 1,
    "explanation": "קבוצת ביקורת היא קבוצה בניסוי שלא משנים בה כלום. זה עוזר להשוות ולראות מה באמת השפיע על התוצאה.",
    "theoryLines": [
      "זה חלק חשוב בניסוי טוב.",
      "זה עוזר להבין מה גרם לתוצאה."
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
    "id": "exp_16",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה נתונים?",
    "options": [
      "מספרים בלי הקשר לניסוי",
      "מידע שאספנו בניסוי – מספרים, תצפיות ותוצאות",
      "משפטים תיאוריים בלי מדידות",
      "רעיונות מוקדמים בלי איסוף במעבדה"
    ],
    "correctIndex": 1,
    "explanation": "נתונים הם כל המידע שאספנו בניסוי – מספרים (מדידות), תצפיות (מה ראינו), ותוצאות (מה קרה).",
    "theoryLines": [
      "נתונים עוזרים להבין מה קרה.",
      "חשוב לאסוף נתונים בקפידה."
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
    "id": "exp_17",
    "topic": "experiments",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה גרף?",
    "options": [
      "איור דקורטיבי בלי צירים",
      "תרשים שמציג נתונים בצורה ויזואלית כדי לראות מגמות ודפוסים",
      "רשימת מילים בלי קנה מידה",
      "טור מספרים בלי מגמה ברורה"
    ],
    "correctIndex": 1,
    "explanation": "גרף הוא תרשים שמציג נתונים בצורה ויזואלית (קווים, עמודות וכו') כדי לראות מגמות ודפוסים בקלות.",
    "theoryLines": [
      "גרפים עוזרים להבין נתונים.",
      "יש סוגים שונים של גרפים."
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
    "id": "exp_18",
    "topic": "experiments",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה מסקנה בניסוי?",
    "options": [
      "פתיחת הדוח לפני הניסוי",
      "מה שלמדנו מהניסוי – מה הנתונים אומרים לנו",
      "שאלה חדשה בלי התייחסות לנתונים",
      "ניחוש לפני בדיקת הגרף"
    ],
    "correctIndex": 1,
    "explanation": "מסקנה היא מה שלמדנו מהניסוי – מה הנתונים אומרים לנו, האם ההשערה שלנו הייתה נכונה, ומה זה אומר.",
    "theoryLines": [
      "מסקנות חשובות מאוד.",
      "הן מסבירות מה למדנו."
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
    "id": "exp_19",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה תיאוריה מדעית?",
    "options": [
      "ניחוש בלי חזרות ניסוי",
      "הסבר מבוסס ניסויים ותצפיות לתופעה בטבע",
      "שאלה פילוסופית בלי בדיקה",
      "מילה סופית אחת בלי תמיכה בנתונים"
    ],
    "correctIndex": 1,
    "explanation": "תיאוריה מדעית היא הסבר מבוסס על הרבה ניסויים ותצפיות שמסביר תופעה בטבע. זה לא רק ניחוש – זה מבוסס על הוכחות.",
    "theoryLines": [
      "תיאוריות יכולות להשתנות עם ידע חדש.",
      "זה חלק מהתהליך המדעי."
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
    "id": "exp_20",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה זה חוק מדעי?",
    "options": [
      "הנחת עבודה יומיומית בלי מדידה",
      "תיאור של תופעה בטבע שקורה תמיד בצורה מסוימת",
      "שאילת תלמידים בלי צפייה",
      "משפט סיכום חד פעמי בלי חזרה"
    ],
    "correctIndex": 1,
    "explanation": "חוק מדעי הוא תיאור של תופעה בטבע שקורה תמיד בצורה מסוימת. למשל, חוק הכבידה מתאר איך דברים נופלים.",
    "theoryLines": [
      "חוקים מתארים מה קורה.",
      "הם מבוססים על תצפיות חוזרות."
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
    "id": "body_35",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה תפקיד בלוטת האדרנל?",
    "options": [
      "לייצר אינסולין ראשי שמווסת סוכר אחרי ארוחה",
      "לייצר הורמונים כמו אדרנלין במצבי לחץ וחירום",
      "לבצע עיבוד ראשוני של חלבונים בקיבה",
      "לווסת ייצור כדוריות דם אדומות כאיבר ראשי ללא מעורבות כליה"
    ],
    "correctIndex": 1,
    "explanation": "בלוטת האדרנל מייצרת הורמונים כמו אדרנלין שעזר לגוף להתמודד עם לחץ, פחד ומצבי חירום.",
    "theoryLines": [
      "היא נמצאת מעל הכליות.",
      "אדרנלין עוזר בגיוס אנרגיה במהירות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_27",
    "topic": "animals",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מין?",
    "options": [
      "פרט יחיד בלי יכולת רבייה עם אחרים",
      "קבוצה של בעלי חיים שיכולים להתרבות ביניהם וליצור צאצאים פוריים",
      "קבוצת צמחים ללא הגדרת רבייה משותפת",
      "שתי חיות זרות שאינן מייצרות צאצאים"
    ],
    "correctIndex": 1,
    "explanation": "מין הוא קבוצה של בעלי חיים (או צמחים) שיכולים להתרבות ביניהם וליצור צאצאים פוריים. כלבים הם מין, חתולים הם מין אחר.",
    "theoryLines": [
      "זה דרך לסווג בעלי חיים.",
      "זה עוזר להבין את הקשרים בין יצורים חיים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "animals_28",
    "topic": "animals",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו ביות?",
    "options": [
      "הכלאה של שני מינים פראיים ללא טיפוח דורות",
      "תהליך של טיפוח דורות כדי שבעלי חיים יעזרו לאדם ויתאימו לו",
      "נדידה עונתית של אוכלוסייה ללא שינוי גנטי",
      "הסתגלות בודדת בטבע בלי מגע אנושי"
    ],
    "correctIndex": 1,
    "explanation": "ביות הוא תהליך שבו בני אדם לוקחים בעלי חיים פראיים ומגדלים אותם במשך דורות כדי שיתאימו לחיות עם בני אדם ולשמש אותם (כמו כלבים, חתולים, פרות).",
    "theoryLines": [
      "זה קרה לאורך אלפי שנים.",
      "בעלי חיים מבויתים שונים מהפראיים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_27",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו דשן?",
    "options": [
      "מי השקיה בלי תוספת מינרלים",
      "חומר שמוסיפים לאדמה כדי לספק חומרי מזון לצמחים ולעזור להם לגדול טוב יותר",
      "חמרה יבשה בלי חנקן או זרחן",
      "אור שמש בלי חומרי הזנה בקרקע"
    ],
    "correctIndex": 1,
    "explanation": "דשן הוא חומר שמוסיפים לאדמה כדי לספק חומרי מזון נוספים לצמחים (כמו חנקן, זרחן) ולעזור להם לגדול טוב יותר.",
    "theoryLines": [
      "יש דשנים טבעיים וסינתטיים.",
      "זה עוזר לצמחים לגדול יותר חזק."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "plants_28",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו קומפוסט?",
    "options": [
      "אדמה שאינה עברה פירוק חומרים",
      "דשן טבעי שנוצר מפירוק של פסולת אורגנית - שאריות מזון, עלים וכו'",
      "שקע מים עומד בלי חומר צמחי",
      "שברי סלע קלים שאינם מתפרקים"
    ],
    "correctIndex": 1,
    "explanation": "קומפוסט הוא דשן טבעי שנוצר מפירוק של פסולת אורגנית (שאריות מזון, עלים, דשא וכו') עם הזמן. זה משפר את האדמה.",
    "theoryLines": [
      "זה דרך מצוינת למחזר פסולת אורגנית.",
      "זה עוזר לאדמה להיות בריאה יותר."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_25",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר ביו-מתכלה?",
    "options": [
      "חומר שנשאר באדמה שנים רבות בלי להיעלם, כמו פלסטיק רבשימוש",
      "חומר שמתפרק בטבע בעזרת חיידקים ומיקרואורגניזמים",
      "חומר שמתכלה מהר רק אם שורפים אותו בבית",
      "חומר שמתמוסס במים קרים תוך דקות בלי חיידקים"
    ],
    "correctIndex": 1,
    "explanation": "חומר ביו-מתכלה הוא חומר שמתפרק בטבע על ידי חיידקים ומיקרואורגניזמים עם הזמן. זה עוזר להפחית פסולת.",
    "theoryLines": [
      "זה ידידותי יותר לסביבה.",
      "דוגמאות: קומפוסט, פלסטיק ביו-מתכלה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "materials_26",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו חומר סינתטי?",
    "options": [
      "חומר מאבן או עץ בלי שינוי כימי",
      "חומר שאדם מייצר במפעל, לא כמו בטבע",
      "עץ גזע שנכרת כפי שהוא בישראל",
      "סלע בזלת טהור ללא עיבוד"
    ],
    "correctIndex": 1,
    "explanation": "חומר סינתטי הוא חומר שנוצר על ידי בני אדם בתהליכים תעשייתיים, לא נמצא בטבע כפי שהוא. דוגמאות: פלסטיק, סיבים סינתטיים.",
    "theoryLines": [
      "חומרים סינתטיים יכולים להיות חזקים ועמידים.",
      "חלקם לא מתפרקים בקלות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "earth_24",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו כוכב לכת ננסי?",
    "options": [
      "גוף כבד המפיק אור כמו השמש",
      "גוף סביב כוכב, בין כוכב לכת לאסטרואיד",
      "לוויין טבעי של כוכב לכת",
      "גוף עם זנב קרח בקרבת השמש"
    ],
    "correctIndex": 1,
    "explanation": "כוכב לכת ננסי הוא גוף שמסתובב סביב כוכב, קטן יותר מכוכב לכת רגיל אבל גדול יותר מאסטרואיד. דוגמה: פלוטו.",
    "theoryLines": [
      "יש כמה כוכבי לכת ננסיים במערכת השמש.",
      "זה סיווג חדש יחסית."
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
    "id": "earth_25",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו כוכב נולד?",
    "options": [
      "כוכב בשלב סופי לפני כיבוי",
      "כוכב בתהליך יצירה מענן גז ואבק",
      "גוף המקיף שמש במסלול יציב סטנדרטי",
      "לוויין המקיף כדור ארץ"
    ],
    "correctIndex": 1,
    "explanation": "כוכב נולד הוא כוכב שנמצא בתהליך של יצירה מענני גז ואבק בחלל. זה תהליך ארוך שיכול לקחת מיליוני שנים.",
    "theoryLines": [
      "זה קורה בענני גז ואבק ענקיים.",
      "כוח המשיכה גורם לגז להתכווץ וליצור כוכב."
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
    "id": "env_21",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו אנרגיה מתחדשת?",
    "options": [
      "אנרגיה ממקור מתכלה במאגר מוגבל",
      "אנרגיה משמש, רוח או מים שחוזרים בטבע",
      "אנרגיה מחילוף נפט מתכלה",
      "אנרגיה שחמה משרפת פחם"
    ],
    "correctIndex": 1,
    "explanation": "אנרגיה מתחדשת היא אנרגיה שמגיעה ממקורות שלא נגמרים, כמו שמש, רוח, מים, גיאות. זה יותר טוב לסביבה מנפט ופחם.",
    "theoryLines": [
      "זה עוזר לשמור על הסביבה.",
      "זה חלק מקיימות."
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
    "id": "env_22",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו פסולת אלקטרונית?",
    "options": [
      "ערימת נייר ממוחזר ממשרד",
      "פסולת ממכשירים אלקטרוניים ישנים כמו מחשבים, טלפונים וטלוויזיות",
      "בקבוקי פלסטיק ריקים מהמטבח",
      "צנצנות זכוכית ממחזור נייר"
    ],
    "correctIndex": 1,
    "explanation": "פסולת אלקטרונית היא פסולת ממכשירים אלקטרוניים ישנים כמו מחשבים, טלפונים, טלוויזיות. חשוב למחזר אותה כי יש בה חומרים מסוכנים וגם יקרים.",
    "theoryLines": [
      "זה בעיה גדולה בעולם המודרני.",
      "מיחזור חשוב מאוד."
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
    "id": "exp_21",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו ניסוי כפול סמיות?",
    "options": [
      "ניסוי עם קבוצה אחת בלבד",
      "ניסוי: גם נבדק וגם חוקר לא יודעים איזה טיפול אמיתי",
      "סדרת ניסויים שכולם יודעים על הטיפול",
      "תצפית בלי השוואה למצב מבוקר"
    ],
    "correctIndex": 1,
    "explanation": "ניסוי כפול סמיות הוא ניסוי שבו גם הנבדק וגם החוקר לא יודעים מי קיבל את הטיפול האמיתי ומי את הפלצבו. זה עוזר לוודא שהתוצאות אובייקטיביות.",
    "theoryLines": [
      "זה דרך מדעית חשובה.",
      "זה עוזר להימנע מהטיה."
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
    "id": "exp_22",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מהו מדגם בניסוי?",
    "options": [
      "כל האוכלוסייה בלי סינון",
      "קבוצה קטנה שאנחנו בודקים כדי להבין על קבוצה גדולה יותר",
      "נבדק יחיד ללא הכללה",
      "ניסוח שאלה בלי איסוף נתונים"
    ],
    "correctIndex": 1,
    "explanation": "מדגם הוא קבוצה קטנה שאנחנו בודקים בניסוי כדי להבין על קבוצה גדולה יותר. למשל, אם בודקים 100 צמחים כדי להבין על כל הצמחים.",
    "theoryLines": [
      "מדגם צריך להיות מייצג.",
      "זה עוזר לחסוך זמן ומשאבים."
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
    "id": "body_37",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד העור?",
    "options": [
      "מראה חיצוני בלי פונקציית הגנה",
      "להגן על הגוף, לשמור על חום ולחוש מגע",
      "נשימה ראשית דרך הנקבוביות בלבד",
      "ייצוב שלד בלי עצבים תחתיים"
    ],
    "correctIndex": 1,
    "explanation": "העור הוא האיבר הגדול ביותר. הוא מגן על הגוף, שומר על חום גוף, מאפשר לחוש מגע ומפריש זיעה.",
    "theoryLines": [
      "העור מכסה את כל הגוף.",
      "הוא מחסום חשוב מפני חיידקים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_29",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה עושים בעלי חיים כדי לשרוד?",
    "options": [
      "לא עושים כלום",
      "אוכלים, שותים, מחפשים מקלט ומתרבים",
      "שינה כל היום בלי ציד מזון",
      "ריצה מהירה בלי שתייה"
    ],
    "correctIndex": 1,
    "explanation": "בעלי חיים צריכים לשרוד: למצוא מזון ומים, לחפש מקום בטוח לחיות בו, להתרבות ולהתגונן מטורפים.",
    "theoryLines": [
      "כל בעל חיים יש לו צרכים בסיסיים.",
      "הם משתדלים לשרוד ולחיות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_30",
    "topic": "animals",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין חיה פראית לחיית מחמד?",
    "options": [
      "שתיהן חיות אך ורק בטבע פתוח בלי כל קשר לאדם או לבית",
      "חיה פראית חיה בטבע, חיית מחמד גרה עם בני אדם ומותאמת לחיות איתם",
      "חיית מחמד מוגדרת כחיה שחייה רק בטבע בלי כל היסטוריה של ביות",
      "חיה פראית היא תמיד בעל חיים שמגודל בבית מאז לידה בלבד"
    ],
    "correctIndex": 1,
    "explanation": "חיה פראית חיה בטבע בעצמה. חיית מחמד גרה עם בני אדם, מותאמת לחיות איתם ומטופלת על ידם.",
    "theoryLines": [
      "חיות מחמד מבויתות.",
      "חיות פראיות עצמאיות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_29",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה קורה לצמח כשאין לו מספיק אור?",
    "options": [
      "הוא מגביר פוטוסינתזה עד ללא צורך במים",
      "הוא נחלש, נהיה צהוב ולא גדל טוב",
      "הוא עובר לשלב פריחה מואץ בלי עלים",
      "הוא עובר התעבות מיידית של דופן התא בלי איבוד מים"
    ],
    "correctIndex": 1,
    "explanation": "כשאין מספיק אור, הצמח לא יכול לעשות פוטוסינתזה טוב, נהיה חלש, צהוב ולא גדל כמו שצריך.",
    "theoryLines": [
      "אור חשוב מאוד לצמחים.",
      "בלי אור הצמח לא יכול לייצר מזון."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_30",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה צמחים חשובים?",
    "options": [
      "קישוט נוף בלי תרומה לאקולוגיה",
      "מייצרים חמצן שאנחנו נושמים, מספקים מזון ומספקים בית לבעלי חיים",
      "גדילה לגובה בלי פוטוסינתזה",
      "תפיסת שטח קרקע בלי יצירת מזון"
    ],
    "correctIndex": 1,
    "explanation": "צמחים חשובים מאוד: הם מייצרים חמצן שאנחנו נושמים, מספקים מזון (פירות, ירקות), מספקים בית לבעלי חיים ועוזרים בשמירה על הסביבה.",
    "theoryLines": [
      "בלי צמחים לא יהיה חיים על כדור הארץ.",
      "הם בסיס של שרשרת המזון."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_27",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין חומר קשה לחומר רך?",
    "options": [
      "קשיחות נקבעת רק לפי צבע ולא לפי התנגדות לשריטה",
      "חומר קשה קשה ללחיצה וחתיכה, חומר רך קל ללחיצה ולעיוות",
      "חומר רך נדפק תמיד בקלות רבה יותר ממתכת ואינו חוזר לצורה",
      "חומר קשה נדפק תמיד בלי לספוג אנרגיה כשמפעילים עליו כוח"
    ],
    "correctIndex": 1,
    "explanation": "חומר קשה קשה ללחיצה, חיתוך ושבירה (כמו אבן). חומר רך קל ללחיצה ולעיוות (כמו כותנה).",
    "theoryLines": [
      "לכל חומר יש תכונות שונות.",
      "קשיות היא אחת התכונות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_28",
    "topic": "materials",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מהו חומר שקוף לעומת אטום?",
    "options": [
      "לשניהם אותה יכולת בהכרח להעביר אור מלא באותו עובי",
      "חומר שקוף אור עובר דרכו, חומר אטום אור לא עובר דרכו",
      "חומר אטום שבו אור פוגע תמיד מוחזר החוצה כמו במראה מושלמת",
      "חומר שקוף שבו אסור שיראו דרכו שום צללית של עצם"
    ],
    "correctIndex": 1,
    "explanation": "חומר שקוף אור עובר דרכו ואפשר לראות דרכו (כמו זכוכית). חומר אטום אור לא עובר דרכו ולא רואים דרכו (כמו קיר).",
    "theoryLines": [
      "זה תכונה חשובה של חומרים.",
      "יש גם חומרים שקופים למחצה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_26",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה כוכבים בשמיים?",
    "options": [
      "נקודות קטנות ללא מקור אנרגיה",
      "כוכבים גדולים ורחוקים מאוד שמפיקים אור, נראים כנקודות קטנות כי הם רחוקים",
      "ירחים שמחזירות אור כמו השמש",
      "כוכבי לכת זוהרים כמו הכוכבים בלילה"
    ],
    "correctIndex": 1,
    "explanation": "כוכבים בשמיים הם כוכבים גדולים שמפיקים אור בעצמם, אבל הם רחוקים מאוד אז נראים כנקודות קטנות.",
    "theoryLines": [
      "הם חלק מהגלקסיה שלנו.",
      "יש מיליוני כוכבים."
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
    "id": "earth_27",
    "topic": "earth_space",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה כוכב נופל?",
    "options": [
      "כוכב אמיתי שנפל ממסלולו",
      "חלקיק שמתאדה באטמוספרה ויוצר פס אור",
      "הלוויין הטבעי של הארץ",
      "גוף כבד המקיף את השמש"
    ],
    "correctIndex": 1,
    "explanation": "כוכב נופל (מטאור) הוא אסטרואיד קטן או חלקיק אבק שמתאדה כשנכנס לאטמוספרה של כדור הארץ ויוצר פס אור בשמיים.",
    "theoryLines": [
      "זה נראה יפה מאוד.",
      "זה קורה כל הזמן, אבל רואים רק בלילה."
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
    "id": "env_23",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה חשוב לשמור על הסביבה?",
    "options": [
      "משום שזיהום נעלם תמיד מעצמו תוך שעות בלי פעולה",
      "כדי שהטבע, החיות והצמחים יישארו בריאים ונוכל להמשיך לחיות בעולם יפה ונקי",
      "רק כדי לנקות רחובות עירוניים בלי קשר לאקוולוגיה",
      "רק כדי לצלם נוף יפה בלי שימור בתי גידול לאורך זמן"
    ],
    "correctIndex": 1,
    "explanation": "חשוב לשמור על הסביבה כדי שהטבע, החיות והצמחים יישארו בריאים, נוכל לנשום אוויר נקי, לשתות מים נקיים ולחיות בעולם יפה ונקי.",
    "theoryLines": [
      "זה חשוב לכולנו.",
      "זה חשוב לדורות הבאים."
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
    "id": "env_24",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה כל אחד יכול לעשות כדי לשמור על הסביבה?",
    "options": [
      "להשאיר אורות ומזגנים במצב המתנה גם כשיוצאים מבית הספר",
      "למחזר, לחסוך במים ובחשמל, לא לזרוק פסולת בטבע",
      "לקנות בעיקר חד-פעמי כדי לחסוך שטיפת כלים",
      "להניח שהמיחזור פותר גם זיהום מים בלי צמצום שימוש"
    ],
    "correctIndex": 1,
    "explanation": "כל אחד יכול לעזור: למחזר, לחסוך במים ובחשמל, לא לזרוק פסולת בטבע, לשתול עצים וצמחים.",
    "theoryLines": [
      "כל פעולה קטנה עוזרת.",
      "ביחד נוכל לעשות שינוי גדול."
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
    "id": "exp_23",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה חשוב לעשות ניסויים?",
    "options": [
      "משום שדעה מילולית מספיקה בלי לבדוק במקרה אמיתי",
      "ללמוד על העולם, לבדוק רעיונות ולהבין איך דברים עובדים",
      "רק כדי להעביר זמן בלי שאלת ניסוי מוגדרת",
      "כדי לצפות ולהסתפק בזיכרון בלי רישום או חזרה"
    ],
    "correctIndex": 1,
    "explanation": "ניסויים עוזרים לנו ללמוד על העולם, לבדוק דברים, להבין איך דברים עובדים ולגלות דברים חדשים.",
    "theoryLines": [
      "זה דרך מדעית ללמוד.",
      "ניסויים עוזרים לנו להיות מדענים קטנים."
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
    "id": "exp_24",
    "topic": "experiments",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה צריך כשרואים משהו מעניין בניסוי?",
    "options": [
      "לשנות מיד את כל המשתנים כדי 'לראות עוד סיבות'",
      "לצפות בזהירות, לרשום מה רואים ולחשוב מה זה אומר",
      "להמשיך בלי תיעוד כדי לא להאט את קצב הניסוי",
      "להסיק מסקנה סופית בלי להשוות לתיאום הקודם"
    ],
    "correctIndex": 1,
    "explanation": "כשרואים משהו מעניין, צריך לצפות בזהירות, לרשום מה רואים, לצייר אם צריך ולחשוב מה זה אומר.",
    "theoryLines": [
      "תצפיות חשובות מאוד.",
      "זה עוזר להבין מה קורה."
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
    "id": "body_25__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד העין?",
    "options": [
      "לראות",
      "לשמוע",
      "לריח",
      "לטעום"
    ],
    "correctIndex": 0,
    "explanation": "העין מאפשרת לנו לראות את העולם סביבנו.",
    "theoryLines": [
      "העין היא האיבר שאחראי על הראייה.",
      "יש לנו שתי עיניים כדי לראות טוב יותר."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_26__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איך חתול משמיע קול?",
    "options": [
      "מיאו",
      "נביחה",
      "געייה",
      "ציוץ"
    ],
    "correctIndex": 0,
    "explanation": "חתול אומר 'מיאו'.",
    "theoryLines": [
      "כל חיה משמיעה קול אחר.",
      "זה עוזר לזהות אותה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_15__v2",
    "topic": "plants",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה צמח צריך כדי לגדול ולהתפתח?",
    "options": [
      "מים ואדמה בלי אור שמש",
      "מים, אור שמש ואדמה",
      "אור ואדמה בלי מים מהשורש",
      "מים ואור בלי קרקע עשירה"
    ],
    "correctIndex": 1,
    "explanation": "צמח צריך מים, אור שמש ואדמה כדי לגדול ולהיות בריא.",
    "theoryLines": [
      "בלי מים הצמח מתייבש.",
      "בלי אור שמש הצמח לא יכול לעשות פוטוסינתזה."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_12__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין מתכת לזכוכית?",
    "options": [
      "מתכת חזקה יותר, זכוכית שקופה",
      "שתיהן מוליכות חשמל זהה בכל עובי וטמפרטורה",
      "מתכת שקופה תמיד לאור כמו זכוכית, זכוכית גמישה כמתכת",
      "אין הבדל מהותי בין שבירות זכוכית לגמישות סגסוגת"
    ],
    "correctIndex": 0,
    "explanation": "מתכת בדרך כלל חזקה ומוליכה חשמל, ואילו זכוכית שקופה ושבירה.",
    "theoryLines": [
      "חומרים שונים יש להם תכונות שונות.",
      "זה קובע איך משתמשים בכל חומר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_space_20",
    "topic": "earth_space",
    "grades": [
      "g4",
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה עונות השנה?",
    "options": [
      "קיץ, חורף, סתיו, אביב",
      "שתי עונות בלבד בשנה",
      "חילוף יום ולילה לאורך השנה",
      "מחזור מצב הרוח בלבד בלי קשר לטמפרטורה או משקעים"
    ],
    "correctIndex": 0,
    "explanation": "יש ארבע עונות: קיץ (חם), חורף (קר), סתיו (גשום) ואביב (פורח).",
    "theoryLines": [
      "העונות משתנות בגלל נטיית כדור הארץ.",
      "כל עונה יש לה מזג אוויר אחר."
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
    "id": "environment_25",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "למה חשוב לשתול עצים?",
    "options": [
      "חמצן, צל, בית לחיות והגנה על הקרקע",
      "הצללה זמנית בלבד בלי תמיכה בחומר אורגני בקרקע",
      "שיפור נראות שטח בלי השפעה על לחות אוויר או בסיס לחיים",
      "הנחה שהיער יתחדש תמיד מאליו בטווח קצר בלי שתילה מתוכננת"
    ],
    "correctIndex": 0,
    "explanation": "עצים נותנים חמצן לנשימה, מצלים, שומרים על הקרקע ומהווים בית לחיות.",
    "theoryLines": [
      "עצים חשובים מאוד לסביבה.",
      "כל עץ עוזר לעולם."
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
    "id": "body_31__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "כמה אצבעות יש לנו בכל יד?",
    "options": [
      "חמש",
      "ארבע",
      "שש",
      "שלוש"
    ],
    "correctIndex": 0,
    "explanation": "יש לנו חמש אצבעות בכל יד: אגודל, אצבע, אמצעית, קמיצה וזרת.",
    "theoryLines": [
      "האצבעות עוזרות לנו לאחוז חפצים.",
      "האגודל עוזר לאחוז טוב יותר."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_32__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש לנו על הראש?",
    "options": [
      "שיניים",
      "שיער",
      "ציפורניים",
      "עצמות"
    ],
    "correctIndex": 1,
    "explanation": "על הראש יש לנו שיער שמגן על הראש ומחמם אותו.",
    "theoryLines": [
      "שיער יכול להיות בצבעים שונים.",
      "שיער גדל כל הזמן."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_33__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד השיניים?",
    "options": [
      "לראות בעיניים",
      "לשמוע באוזניים",
      "לעיסה וחיתוך מזון",
      "לרוץ במגרש"
    ],
    "correctIndex": 2,
    "explanation": "השיניים עוזרות לנו לחתוך וללעוס מזון כדי שנוכל לבלוע אותו.",
    "theoryLines": [
      "יש לנו שיניים חותכות, ניבים ושיניים טוחנות.",
      "ילדים יש להם שיניים חלביות שמתחלפות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_34__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איפה נמצא המוח?",
    "options": [
      "בבטן",
      "בראש",
      "ברגליים",
      "בידיים"
    ],
    "correctIndex": 1,
    "explanation": "המוח נמצא בראש, בתוך הגולגולת שמגנה עליו.",
    "theoryLines": [
      "המוח הוא האיבר הכי חשוב בגוף.",
      "הוא שולט על כל הפעולות שלנו."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_35__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "כמה ידיים ורגליים יש לרוב האנשים?",
    "options": [
        "שתי ידיים ושתי רגליים",
        "יד אחת ורגל אחת",
        "ארבע ידיים",
        "שלוש רגליים"
    ],
    "correctIndex": 0,
    "explanation": "נכון. יש לנו שתי ידיים ושתי רגליים שמאפשרות לנו לזוז ולעבוד.",
    "theoryLines": [
      "הידיים עוזרות לנו לאחוז ולעבוד.",
      "הרגליים עוזרות לנו ללכת ולרוץ."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_37__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה כשאנחנו נושמים?",
    "options": [
      "אוויר נכנס לריאות בלי יציאה",
      "נכנס אוויר ויוצא אוויר",
      "אוויר יוצא מהגוף בלי כניסה",
      "לא קורה חילוף גזים"
    ],
    "correctIndex": 1,
    "explanation": "כשאנחנו נושמים, נכנס אוויר דרך האף והפה, ויוצא אוויר החוצה.",
    "theoryLines": [
      "נשימה היא תהליך חשוב מאוד.",
      "בלי נשימה אנחנו לא יכולים לחיות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_38__v2",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הלב?",
    "options": [
      "לחשוב בראש",
      "להזרים דם בגוף",
      "לראות בעיניים",
      "לשמוע באוזניים"
    ],
    "correctIndex": 1,
    "explanation": "הלב מזרים דם בכל הגוף. הדם מביא חמצן וחומרי מזון לכל חלקי הגוף.",
    "theoryLines": [
      "הלב פועם כל הזמן.",
      "זה קול הדופק שאנחנו שומעים."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_39",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה תפקיד הלשון?",
    "options": [
      "לראות בעיניים",
      "לטעום ולדבר",
      "לשמוע באוזניים",
      "לרוץ במגרש"
    ],
    "correctIndex": 1,
    "explanation": "הלשון עוזרת לנו לטעום מזון ולדבר. היא גם עוזרת לבלוע.",
    "theoryLines": [
      "הלשון יכולה לזוז לכיוונים שונים.",
      "יש עליה בליטות קטנות שטועמות."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_40",
    "topic": "body",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה לגוף של ילדים בגיל הצמיחה?",
    "options": [
        "הגוף גדל בהדרגה",
        "הגוף לא משתנה עד גיל 18",
        "הגוף קטן עם הזמן",
        "רק הראש גדל, לא השאר"
    ],
    "correctIndex": 0,
    "explanation": "נכון. כשאנחנו ילדים הגוף גדל כל הזמן. זה קורה כי התאים בגוף מתרבים.",
    "theoryLines": [
      "גדילה היא תהליך טבעי.",
      "אכילה בריאה עוזרת לגדול טוב."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_11__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים נובח?",
    "options": [
      "חתול",
      "כלב",
      "ציפור",
      "דג"
    ],
    "correctIndex": 1,
    "explanation": "כלב נובח. זה הקול שהוא משמיע כדי לתקשר.",
    "theoryLines": [
      "כל בעל חיים משמיע קולות שונים.",
      "זה עוזר להם לתקשר."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_12__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים אומר 'מיאו'?",
    "options": [
      "כלב",
      "חתול",
      "ציפור",
      "דג"
    ],
    "correctIndex": 1,
    "explanation": "חתול אומר 'מיאו'. זה הקול שהוא משמיע.",
    "theoryLines": [
      "חתולים הם חיות מחמד פופולריות.",
      "הם יכולים להיות מאוד ידידותיים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_13__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יש לו כנפיים?",
    "options": [
      "כלב",
      "חתול",
      "ציפור",
      "דג"
    ],
    "correctIndex": 2,
    "explanation": "לציפורים יש כנפיים שמאפשרות להן לעוף באוויר.",
    "theoryLines": [
      "כנפיים עוזרות לציפורים לעוף.",
      "יש הרבה סוגים שונים של ציפורים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_14__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים חי במים ויש לו סנפירים?",
    "options": [
      "כלב",
      "חתול",
      "דג",
      "ציפור"
    ],
    "correctIndex": 2,
    "explanation": "דגים חיים במים ויש להם סנפירים שמאפשרים להם לשחות.",
    "theoryLines": [
      "דגים נושמים דרך זימים.",
      "יש הרבה סוגים שונים של דגים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_15__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יש לו פרווה?",
    "options": [
      "דג",
      "ציפור",
      "כלב",
      "נחש"
    ],
    "correctIndex": 2,
    "explanation": "לכלבים יש פרווה שמחממת אותם ומגנה עליהם.",
    "theoryLines": [
      "יונקים יש להם פרווה או שיער.",
      "פרווה עוזרת לשמור על חום הגוף."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_17__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יש לו ארבע רגליים?",
    "options": [
      "דג",
      "ציפור",
      "כלב",
      "נחש"
    ],
    "correctIndex": 2,
    "explanation": "לכלבים יש ארבע רגליים שמאפשרות להם לרוץ ולקפוץ.",
    "theoryLines": [
      "רוב היונקים יש להם ארבע רגליים.",
      "זה עוזר להם לזוז מהר."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_19__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה בעל חיים יכול לרוץ מהר?",
    "options": [
      "דג",
      "ציפור",
      "סוס",
      "תרנגולת"
    ],
    "correctIndex": 2,
    "explanation": "סוסים יכולים לרוץ מהר מאוד. יש להם רגליים חזקות וארוכות.",
    "theoryLines": [
      "סוסים הם בעלי חיים חזקים ומהירים.",
      "הם משמשים לנסיעה ולעבודה."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "animals_20__v2",
    "topic": "animals",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה מהבאים הוא בעל חיים?",
    "options": [
      "כלב",
      "עץ",
      "סלע",
      "ענן"
    ],
    "correctIndex": 0,
    "explanation": "הרבה בעלי חיים יש להם זנב: כלבים, חתולים, ציפורים ודגים.",
    "theoryLines": [
      "זנב עוזר לבעלי חיים לשמור על שיווי משקל.",
      "יש לו שימושים שונים אצל בעלי חיים שונים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_14__v2",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נמצא בחלק העליון של הצמח?",
    "options": [
      "שורשים",
      "עלים ופרחים",
      "גזע בלבד בלי עלים",
      "אדמה ערובה בלי גבעול ועלה"
    ],
    "correctIndex": 1,
    "explanation": "בחלק העליון של הצמח יש עלים ופרחים. הם קולטים אור שמש.",
    "theoryLines": [
      "העלים קולטים אור שמש.",
      "הפרחים יפים ומושכים חרקים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_15__v3",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נמצא בחלק התחתון של הצמח?",
    "options": [
      "עלים",
      "שורשים",
      "פרחים",
      "פירות"
    ],
    "correctIndex": 1,
    "explanation": "בחלק התחתון של הצמח יש שורשים שגדלים בקרקע.",
    "theoryLines": [
      "השורשים מעגנים את הצמח.",
      "הם קולטים מים ומינרלים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_16__v2",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צמחים צריכים כדי לגדול?",
    "options": [
        "אור שמש, מים, אוויר וחומרים מהאדמה",
        "רק מים בלי אור",
        "רק אדמה בלי מים",
        "צמחים גדלים בחושך מלא ללא מים"
    ],
    "correctIndex": 0,
    "explanation": "נכון. צמחים צריכים אור שמש כדי לייצר מזון ולגדול.",
    "theoryLines": [
      "אור שמש עוזר לצמח לייצר מזון.",
      "בלי אור הצמח לא יכול לגדול טוב."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_19__v2",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בפרח?",
    "options": [
      "עלים בלבד בלי כותרת וצוף",
      "עלים, עלי כותרת וצוף",
      "שורשים בלבד בלי פרח",
      "אדמה עקרה בלי גבעול או פרח"
    ],
    "correctIndex": 1,
    "explanation": "בפרח יש עלי כותרת יפים, אבקנים וצוף שמושך חרקים.",
    "theoryLines": [
      "פרחים יפים וצבעוניים.",
      "הם מושכים חרקים שעזרים להאבקה."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "plants_20__v2",
    "topic": "plants",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יוצא מהזרע?",
    "options": [
      "שורש בוגר בלי נבט",
      "שורש וגבעול קטן",
      "עלה יבש בלי נקודת גידול",
      "פרח פורח בלי זרע"
    ],
    "correctIndex": 1,
    "explanation": "כשזרע נובט, יוצא ממנו שורש קטן וגבעול קטן שגדל למעלה.",
    "theoryLines": [
      "נביטה היא תחילת החיים של צמח חדש.",
      "הזרע צריך מים ואור כדי לנבוט."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_16__v2",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר הוא שקוף?",
    "options": [
      "אבן אטומה",
      "מתכת כבדה",
      "זכוכית",
      "עץ מוצק"
    ],
    "correctIndex": 2,
    "explanation": "זכוכית היא חומר שקוף. אפשר לראות דרכה.",
    "theoryLines": [
      "שקיפות מאפשרת לראות דרכו.",
      "זה שימושי לחלונות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_17__v2",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר הוא מבריק?",
    "options": [
      "עץ",
      "מתכת",
      "כותנה",
      "אדמה"
    ],
    "correctIndex": 1,
    "explanation": "מתכות רבות מבריקות. הן מחזירות אור.",
    "theoryLines": [
      "מתכות יכולות להיות מבריקות.",
      "זה עושה אותן יפות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_18__v2",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה למים כשהוא מתקרר מאוד?",
    "options": [
      "נשאר נוזל",
      "הופך לקרח",
      "הופך לגז",
      "נעלם"
    ],
    "correctIndex": 1,
    "explanation": "כשמים מתקררים מאוד, הם הופכים לקרח שהוא במצב מוצק.",
    "theoryLines": [
      "זה נקרא הקפאה.",
      "זה קורה כשהטמפרטורה יורדת מתחת לאפס."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "materials_19__v2",
    "topic": "materials",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "איזה חומר מגיע מעץ?",
    "options": [
      "מתכת",
      "אבן",
      "עץ",
      "זכוכית"
    ],
    "correctIndex": 2,
    "explanation": "עץ מגיע מעצים. זה חומר טבעי.",
    "theoryLines": [
      "עץ הוא חומר טבעי.",
      "אפשר להשתמש בו לבנייה ולרהיטים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_16__v2",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה כשהשמש זורחת?",
    "options": [
      "זה לילה",
      "זה יום",
      "זה ערב",
      "זה בוקר"
    ],
    "correctIndex": 1,
    "explanation": "כשהשמש זורחת, זה יום. השמש מאירה ומחממת.",
    "theoryLines": [
      "יום מתחיל כשהשמש זורחת.",
      "זה הזמן שבו אנחנו ערים ופעילים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_17__v2",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה כשהשמש שוקעת?",
    "options": [
      "זה יום",
      "זה לילה",
      "זה בוקר",
      "זה צהריים"
    ],
    "correctIndex": 1,
    "explanation": "כשהשמש שוקעת, זה לילה. השמיים חשוכים ורואים ירח וכוכבים.",
    "theoryLines": [
      "לילה מתחיל כשהשמש שוקעת.",
      "זה הזמן שבו אנחנו ישנים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_18__v2",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה יש בעננים?",
    "options": [
      "אוויר יבש לגמרי בלי מים",
      "טיפות מים קטנות",
      "אבק בלי מימד מים נוזלי",
      "רוח חזקה בלי לחות"
    ],
    "correctIndex": 1,
    "explanation": "עננים עשויים מטיפות מים קטנות או גבישי קרח. כשהם כבדים, יורד גשם.",
    "theoryLines": [
      "עננים נוצרים כשאדי מים מתעבים.",
      "כשהם כבדים, יורד גשם או שלג."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_14__v2",
    "topic": "environment",
    "grades": [
      "g1",
      "g2",
      "g3"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה עוזר לשמור על מים נקיים?",
    "options": [
      "לשפוך שאריות מטבח ישירות לנחל קטן ליד הבית",
      "לא לזרוק פסולת למים, לא לבזבז מים",
      "להשאיר ברז דולף קלות כי 'זה לא הרבה'",
      "להניח שגשם ידלל תמיד כל מזהם ללא הגבלה"
    ],
    "correctIndex": 1,
    "explanation": "לא לזרוק פסולת למים ולא לבזבז מים עוזר לשמור על מים נקיים.",
    "theoryLines": [
      "מים נקיים חשובים לנו ולכל היצורים.",
      "חשוב לא לבזבז מים."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_15__v2",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה זה מיחזור?",
    "options": [
      "לשים גם נייר וגם שמן שחור באותה שקית אשפה בלי מיון",
      "שימוש מחדש בחומרים ישנים ליצירת דברים חדשים",
      "להשאיר פסולת בחצר ללא הפרדה במשך זמן ארוך",
      "לשרוף בגינה פסולת מעורבת בלי שליטה בעשן"
    ],
    "correctIndex": 1,
    "explanation": "מיחזור הוא לקיחת חומרים ישנים ושימוש בהם ליצירת דברים חדשים במקום לזרוק אותם.",
    "theoryLines": [
      "מיחזור עוזר לשמור על הסביבה.",
      "זה מפחית פסולת וחוסך משאבים."
    ],
    "params": {
      "patternFamily": "sci_environment_sustainability",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_16__v2",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה עוזר לשמור על האוויר נקי?",
    "options": [
      "להשאיר מנוע דולק בחניה גם כשלא נוסעים",
      "להשתמש פחות במכוניות, לשתול עצים",
      "לשרוף פסולת גינה בעשן סמיף ליד בתים",
      "להניח שרוח חזקה מפזרת תמיד כל זיהום ולא נשאר באוויר"
    ],
    "correctIndex": 1,
    "explanation": "להשתמש פחות במכוניות ולשתול עצים עוזר לשמור על האוויר נקי.",
    "theoryLines": [
      "אוויר נקי חשוב לבריאות.",
      "עצים עוזרים לנקות את האוויר."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "env_17__v2",
    "topic": "environment",
    "grades": [
      "g1",
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה חשוב לעשות כדי לשמור על הסביבה?",
    "options": [
      "למזג פסולת מגוונת לאותו שקית כדי לחסוך זמן",
      "לזרוק פסולת לפח, למחזר, לא לבזבז מים",
      "לחסוך נייר אך להשאיר מכשירים דולקים כל הלילה",
      "לטעון שמיחזור פותר גם זיהום אוויר בלי צמצום נסיעות"
    ],
    "correctIndex": 1,
    "explanation": "לזרוק פסולת לפח, למחזר ולא לבזבז מים עוזר לשמור על הסביבה.",
    "theoryLines": [
      "כל אחד יכול לעזור לשמור על הסביבה.",
      "פעולות קטנות יכולות לעשות הבדל גדול."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_11__v2",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה צריך לעשות כשעושים ניסוי?",
    "options": [
      "לבצע את כל הצעדים בבת אחת כדי לחסוך זמן",
      "להיות זהירים, לצפות ולרשום מה רואים",
      "להניח שהציוד בטוח בלי לבדוק לפי ההוראות",
      "להימנע מרישום כדי לא להסיח את הדעת מהפעולה"
    ],
    "correctIndex": 1,
    "explanation": "כשעושים ניסוי צריך להיות זהירים, לצפות בזהירות ולרשום מה רואים.",
    "theoryLines": [
      "זהירות חשובה מאוד בניסויים.",
      "רישום עוזר לזכור מה קרה."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_12__v2",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מי צריך לעזור בניסויים?",
    "options": [
      "אף אחד",
      "מבוגר שצריך לעזור ולוודא שהכל בטוח",
      "ילדים קטנים בלי מבוגר מפקח",
      "מבוגר שלא מכיר את הניסוי או את הסיכון"
    ],
    "correctIndex": 1,
    "explanation": "מבוגר צריך לעזור בניסויים ולוודא שהכל בטוח. זה חשוב מאוד.",
    "theoryLines": [
      "בטיחות היא הדבר הכי חשוב.",
      "מבוגר יכול לעזור ולוודא שהכל בטוח."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "exp_14__v2",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה קורה כשעושים ניסוי?",
    "options": [
      "אין שינוי אם לא מתעדים",
      "לומדים, רואים תוצאות ומבינים איך זה עובד",
      "פעילות חופשית בלי שאלת ניסוי",
      "פעולות מהירות בלי סדר או השוואה"
    ],
    "correctIndex": 1,
    "explanation": "כשעושים ניסוי לומדים דברים חדשים, רואים מה קורה ומבינים איך דברים עובדים.",
    "theoryLines": [
      "ניסויים עוזרים לנו ללמוד.",
      "זה דרך מצוינת להבין את העולם."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "body_41",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד מערכת העצבים?",
    "options": [
      "לפרק חלבונים לחומצות אמינו במעי הצר",
      "לתאם ולהעביר מידע בין חלקי הגוף והסביבה",
      "להוביל תאי דם אדומים ממורד הגוף אל הראש",
      "לספוג חמצן ישירות מהעור בלי מעורבות הריאות"
    ],
    "correctIndex": 1,
    "explanation": "מערכת העצבים אחראית על קבלת מידע מהחושים, עיבודו במוח ושליחת הוראות לשרירים ולאיברים.",
    "theoryLines": [
      "מערכת העצבים כוללת מוח, חוט שדרה ועצבים רבים.",
      "עצבים מעבירים אותות חשמליים במהירות רבה."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "body_43",
    "topic": "body",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד הטחול?",
    "options": [
      "לפרק מזון ראשוני בפה ובוושט",
      "לסייע בחיסון ולאחסן תאי דם",
      "להעביר חמצן מן האוויר אל הדם",
      "לקלוט אור וצבע מהסביבה"
    ],
    "correctIndex": 1,
    "explanation": "הטחול עוזר במערכת החיסון, מסנן דם ואחסן תאי דם אדומים וטסיות דם.",
    "theoryLines": [
      "הטחול נמצא ליד הקיבה.",
      "הוא חלק ממערכת החיסון."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_21__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה ההבדל בין יונק לעוף?",
    "options": [
      "שניהם מטילים ביצים על הקרקע ולא מניקים כלל",
      "יונק ממליט צאצאים חיים ומניק, עוף מטיל ביצים",
      "עוף ממליט תמיד גורים חיים, יונק מטיל ביצים בקן",
      "ההבדל הוא רק בצבע הנוצות בלי קשר לרבייה"
    ],
    "correctIndex": 1,
    "explanation": "יונקים ממליטים צאצאים חיים ומניקים אותם בחלב, בעוד שעופות מטילים ביצים ודוגרים עליהן.",
    "theoryLines": [
      "יונקים יש להם פרווה או שיער.",
      "עופות מכוסים נוצות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_22__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה בית גידול?",
    "options": [
      "בניין מגורים של בני אדם בלי קשר לטבע",
      "הסביבה הטבעית שבה בעל חיים חי",
      "כלוב מבודד בלי צמחייה וליום-לילה",
      "גן חיות כחלופה מלאה לסביבה בריאה"
    ],
    "correctIndex": 1,
    "explanation": "בית גידול הוא הסביבה הטבעית שבה בעל חיים חי, כולל מזון, מים ומקום מחיה.",
    "theoryLines": [
      "בעלי חיים שונים חיים בבתי גידול שונים.",
      "בית גידול מספק את כל מה שבעל החיים צריך."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_23__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה טורף?",
    "options": [
      "בעל חיים שאוכל צמחים בלבד",
      "בעל חיים שצד ואוכל בעלי חיים אחרים",
      "צמח שמייצר מזון בלי להיות טורף",
      "דג שאוכל בעיקר אצות ופלנקטון"
    ],
    "correctIndex": 1,
    "explanation": "טורף הוא בעל חיים שצד ואוכל בעלי חיים אחרים. דוגמאות: אריה, נשר, כריש.",
    "theoryLines": [
      "טורפים יש להם שיניים חדות.",
      "הם מותאמים לציד."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_24__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה אוכל עשב?",
    "options": [
      "בעל חיים שמתמחה בציד טרף חי",
      "בעל חיים שאוכל בעיקר צמחים",
      "צמח שאינו צורך מזון מבעלי חיים",
      "דג טורף שאוכל בעיקר דגים אחרים"
    ],
    "correctIndex": 1,
    "explanation": "אוכל עשב הוא בעל חיים שאוכל רק צמחים. דוגמאות: פרה, ארנב, זברה.",
    "theoryLines": [
      "אוכלי עשב יש להם שיניים שמותאמות ללעיסת צמחים.",
      "הם לא אוכלים בשר."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_25__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה אוכל כל?",
    "options": [
      "בעל חיים שאוכל בשר כמעט בלי צמחים",
      "בעל חיים שאוכל גם צמחים וגם בשר",
      "בעל חיים שאוכל צמחים בלבד כמו פרה",
      "בעל חיים שמתמחה באצות ובפלנקטון"
    ],
    "correctIndex": 1,
    "explanation": "אוכל כל הוא בעל חיים שאוכל גם צמחים וגם בשר. דוגמאות: דוב, חזיר, אדם.",
    "theoryLines": [
      "אוכלי כל יכולים לאכול מגוון מזונות.",
      "זה עוזר להם לשרוד במקומות שונים."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_26__v3",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה הסוואה?",
    "options": [
      "צבע בולט בלי קשר להסתרה",
      "התמזגות עם הסביבה כדי להיעלם מהעין",
      "תנועה מהירה בלי התאמה לרקע",
      "חיקוי קול בלי דמיון חזותי לסביבה"
    ],
    "correctIndex": 1,
    "explanation": "הסוואה היא יכולת של בעל חיים להסתתר על ידי התאמת הצבע או הצורה לסביבה.",
    "theoryLines": [
      "הסוואה עוזרת לבעלי חיים להימנע מטורפים או לצוד טרף.",
      "דוגמאות: זברה, נמר, תמנון."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_27__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה נדידה?",
    "options": [
      "נסיעות יומיומיות בלי קשר לעונה",
      "מעבר עונתי של בעלי חיים בין אזורים",
      "עמידה בנקודה קבועה לאורך חודשים",
      "ריצות קצרות במעגל בלי מטרת הישרדות"
    ],
    "correctIndex": 1,
    "explanation": "נדידה היא תנועה עונתית של בעלי חיים ממקום אחד למשנהו כדי למצוא מזון או מזג אוויר טוב יותר.",
    "theoryLines": [
      "ציפורים נודדות למרחקים ארוכים.",
      "זה קורה בעונות מסוימות."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_28__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה תרדמת חורף?",
    "options": [
      "שינה קצרה ורדודה בקיץ החם",
      "שינה עמוקה בחורף לחיסכון באנרגיה",
      "עמידה בלי מנוחה כל החורף",
      "ריצה מואצת בחורף כדי להתחמם"
    ],
    "correctIndex": 1,
    "explanation": "תרדמת חורף היא מצב שבו בעל חיים ישן עמוק בחורף כדי לחסוך אנרגיה כשאין הרבה מזון.",
    "theoryLines": [
      "דוב, דורבן וחיות אחרות עושים תרדמת חורף.",
      "זה עוזר להם לשרוד את החורף."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_29__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מחזור חיים?",
    "options": [
      "חיים בלי גדילה או התבגרות",
      "שלבים מלידה דרך גדילה ועד סוף החיים",
      "מוות פתאומי בלי שלבים מוקדמים",
      "לידה בלי המשך התפתחות בגוף"
    ],
    "correctIndex": 1,
    "explanation": "מחזור חיים הוא השלבים השונים בחייו של בעל חיים מהלידה, דרך גדילה, רבייה ועד המוות.",
    "theoryLines": [
      "כל בעל חיים יש לו מחזור חיים שונה.",
      "זה כולל לידה, גדילה, רבייה ומוות."
    ],
    "params": {
      "patternFamily": "sci_animals_life_processes",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "animals_30__v2",
    "topic": "animals",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה התאמה לסביבה?",
    "options": [
      "צבע דקורטיבי בלי עזרה לשרידות",
      "תכונות שמקלות חיים בסביבה מסוימת",
      "תנועה בלי קשר לתנאים במקום",
      "הפקת קולות בלי משמעות אקולוגית"
    ],
    "correctIndex": 1,
    "explanation": "התאמה לסביבה היא תכונות שמאפשרות לבעל חיים לחיות בסביבה מסוימת. דוגמאות: פרווה עבה לקור, סנפירים למים.",
    "theoryLines": [
      "התאמות יכולות להיות מבניות או התנהגותיות.",
      "הן עוזרות לבעלי חיים לשרוד."
    ],
    "params": {
      "patternFamily": "sci_animals_classification",
      "subtype": "sci_animals_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_21__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה פוטוסינתזה?",
    "options": [
      "גדילה בלי שימוש באור ובפיגמנט ירוק",
      "ייצור מזון מהאור עם מים ופחמן דו-חמצני",
      "נשימה תאית כמו בבעלי חיים בלבד",
      "שתיית מים בלי המרת אנרגיית אור למזון"
    ],
    "correctIndex": 1,
    "explanation": "פוטוסינתזה הוא תהליך שבו הצמח משתמש באור שמש, מים ופחמן דו-חמצני כדי לייצר סוכר ולשחרר חמצן.",
    "theoryLines": [
      "התהליך מתרחש בכלורופלסטים שנמצאים בעלים.",
      "זה הבסיס של שרשרת המזון."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_22__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה כלורופיל?",
    "options": [
      "צבע דקורטיבי בלי קליטת אור",
      "פיגמנט ירוק בעלים שקולט אור ומאפשר פוטוסינתזה",
      "מים לבד המחזיקים את כל האנרגיה לצמח",
      "מינרלים מהאדמה בלי תרומה מפיגמנטים"
    ],
    "correctIndex": 1,
    "explanation": "כלורופיל הוא חומר ירוק שנמצא בעלים, קולט אור שמש ומאפשר לצמח לבצע פוטוסינתזה.",
    "theoryLines": [
      "כלורופיל נותן לעלים את הצבע הירוק.",
      "הוא נמצא בכלורופלסטים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_23__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד השורשים?",
    "options": [
      "קליטת אור ישירה מספיקה לכל הצמח",
      "לקלוט מים ומינרלים, לעגן ולפעמים לאגור מזון",
      "הבחנה חזותית בסביבה כמו בעלי חיים",
      "נשימה ראשית דרך העלים בלבד ללא שורש"
    ],
    "correctIndex": 1,
    "explanation": "השורשים קולטים מים ומינרלים מהאדמה, מעגנים את הצמח בקרקע ולפעמים אוגרים מזון.",
    "theoryLines": [
      "שורשים גדלים למטה, לתוך האדמה.",
      "הם עוזרים לצמח לעמוד יציב."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_24__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד הגבעול?",
    "options": [
      "תמיכה גבוהה בלי הובלת נוזלים בפנים",
      "תמיכה, והובלת מים ומינרלים מהשורש לעלים",
      "הבחנה בסביבה כמו איבר חישה",
      "נשימה בלי תמיכה בעלים או בפרחים"
    ],
    "correctIndex": 1,
    "explanation": "הגבעול תומך בעלים ופרחים, מוביל מים ומינרלים מהשורשים לעלים וסוכרים מהעלים לשאר חלקי הצמח.",
    "theoryLines": [
      "גבעול מחבר בין השורשים לעלים.",
      "הוא עוזר לצמח לעמוד ישר."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_25__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה תפקיד העלים?",
    "options": [
      "ראייה והבחנה כמו בעלי חיים מתקדמים",
      "קליטת אור, פוטוסינתזה ושחרור חמצן",
      "נשימה כמו ריאות בעלי חיים בלבד",
      "שתיית מים דרך העלה בלי פוטוסינתזה"
    ],
    "correctIndex": 1,
    "explanation": "העלים קולטים אור שמש, מבצעים פוטוסינתזה לייצור מזון, ומשחררים חמצן לאטמוספרה.",
    "theoryLines": [
      "עלים הם המפעל של הצמח.",
      "הם מייצרים מזון עבור הצמח."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_27__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה זרע?",
    "options": [
      "רקמות פרי בלי עובר שיכול לצמוח",
      "חלק מצמח עם עובר שיכול לגדול לצמח חדש",
      "מבנה פרח שאינו מכיל עובר לנביטה",
      "עלה יבש שאינו נותן התחלה לצמיחה"
    ],
    "correctIndex": 1,
    "explanation": "זרע הוא חלק של הצמח שמכיל עובר צמח קטן. כשיש תנאים מתאימים, הזרע יכול לנבוט ולצמוח לצמח חדש.",
    "theoryLines": [
      "זרעים מגיעים מפרחים.",
      "הם מכילים את כל המידע לגדול לצמח."
    ],
    "params": {
      "patternFamily": "sci_plants_parts",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_28__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה פרי?",
    "options": [
      "פרח בפתיחה בלי עטיפה לזרעים",
      "מכיל זרעים ומגן עליהם, לעיתים עם עסיס",
      "עלה שאוגר מים בלי חלק המגן על זרעים",
      "שורש שמפריש זרעים ישירות לאוויר"
    ],
    "correctIndex": 1,
    "explanation": "פרי הוא החלק של הצמח שמכיל זרעים ומגן עליהם. הוא גם עוזר להפיץ את הזרעים.",
    "theoryLines": [
      "פירות הם מתוקים כדי למשוך בעלי חיים.",
      "בעלי חיים אוכלים פירות ומפיצים את הזרעים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_29__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה נביטה?",
    "options": [
      "כל צמיחה בצמח בוגר בלי קשר לזרע",
      "תחילת צמיחת זרע לצמח חדש",
      "קליטת מים בלי שינוי בזרע",
      "נשימה של שורש קיים בלי נבט"
    ],
    "correctIndex": 1,
    "explanation": "נביטה הוא תהליך שבו זרע מתחיל לגדול ולצמוח לצמח חדש. זה קורה כשהזרע מקבל מים ואור.",
    "theoryLines": [
      "נביטה היא תחילת החיים של צמח חדש.",
      "הזרע צריך מים, אור וחום כדי לנבוט."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "plants_30__v2",
    "topic": "plants",
    "grades": [
      "g3"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה האבקה?",
    "options": [
      "תנועת עלים ברוח בלי גרעין זרע",
      "העברת אבקה בין פרחים ליצירת זרעים",
      "נשימה בעלה בלבד",
      "שתיית מים מהאדמה דרך השורש"
    ],
    "correctIndex": 1,
    "explanation": "האבקה היא תהליך שבו אבקה מועברת מפרח אחד למשנהו. זה עוזר ליצור זרעים.",
    "theoryLines": [
      "חרקים, רוח ובעלי חיים עוזרים בהאבקה.",
      "זה חשוב מאוד ליצירת זרעים חדשים."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_21__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5",
      "g6"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מצבי צבירה?",
    "options": [
      "שם למצב מוצק בלי נוזלים או גזים",
      "מוצק, נוזל וגז - צורות קיום שונות של חומר",
      "תיאור של נוזלים ללא מוצק או גז",
      "מצב של גז בלבד בכל הטמפרטורות"
    ],
    "correctIndex": 1,
    "explanation": "מצבי צבירה הם הצורות השונות שבהן חומר יכול להיות: מוצק (קשה), נוזל (זורם) או גז (נדיף).",
    "theoryLines": [
      "מים יכולים להיות בשלושה מצבי צבירה.",
      "טמפרטורה משנה את מצב הצבירה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_22__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה התכה?",
    "options": [
      "חימום בלי שינוי מצב צבירה",
      "שינוי ממוצק לנוזל",
      "קירור שגורם לקרח במקום למים",
      "הקפאה של נוזל למוצק"
    ],
    "correctIndex": 1,
    "explanation": "התכה הוא שינוי ממוצק לנוזל. דוגמה: קרח הופך למים כשמחממים אותו.",
    "theoryLines": [
      "זה קורה כשהטמפרטורה עולה.",
      "כל חומר יש לו נקודת התכה שונה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_23__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה הקפאה?",
    "options": [
      "קירור בלי מעבר למוצק",
      "שינוי מנוזל למוצק",
      "חימום שממיס קרח למים",
      "התכה של גז לנוזל"
    ],
    "correctIndex": 1,
    "explanation": "הקפאה הוא שינוי מנוזל למוצק. דוגמה: מים הופכים לקרח כשמקררים אותם.",
    "theoryLines": [
      "זה קורה כשהטמפרטורה יורדת.",
      "כל חומר יש לו נקודת הקפאה שונה."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_24__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה אידוי?",
    "options": [
      "חימום בלי איבוד נוזל לאוויר",
      "שינוי מנוזל לגז",
      "קירור שמרכז אדי מים לנוזל",
      "התכה של מוצק לנוזל בלבד"
    ],
    "correctIndex": 1,
    "explanation": "אידוי הוא שינוי מנוזל לגז. דוגמה: מים הופכים לאדי מים כשמחממים אותם.",
    "theoryLines": [
      "זה קורה כשהטמפרטורה עולה.",
      "אפשר לראות את זה כשמים רותחים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_25__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה עיבוי?",
    "options": [
      "קירור בלי הופעת טיפות נוזל",
      "שינוי מגז לנוזל",
      "חימום שמפזר אדי מים לגמרי",
      "התכה של קרח למים בלבד"
    ],
    "correctIndex": 1,
    "explanation": "עיבוי הוא שינוי מגז לנוזל. דוגמה: אדי מים הופכים למים כשמקררים אותם.",
    "theoryLines": [
      "זה קורה כשהטמפרטורה יורדת.",
      "אפשר לראות את זה על חלונות כשאדי מים מתעבים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_26__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה חומר מוליך?",
    "options": [
      "חומר שסופג חום בלי להעבירו הלאה",
      "חומר שמעביר חום או חשמל טוב",
      "עץ יבש בדרך כלל כמבודד חשמלי",
      "פלסטיק מבודד שאינו מוליך טוב"
    ],
    "correctIndex": 1,
    "explanation": "חומר מוליך הוא חומר שמעביר חום או חשמל טוב. דוגמאות: מתכות, מים.",
    "theoryLines": [
      "מתכות מוליכות חום וחשמל טוב.",
      "זה עושה אותן שימושיות מאוד."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_27__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה חומר מבודד?",
    "options": [
      "עץ לח שעדיין מוליך היטב חשמל",
      "חומר שלא מעביר חום או חשמל טוב",
      "מתכת טהורה עם אלקטרונים חופשיים",
      "זכוכית דקה כמוליך חזק של חשמל"
    ],
    "correctIndex": 1,
    "explanation": "חומר מבודד הוא חומר שלא מעביר חום או חשמל טוב. דוגמאות: עץ, פלסטיק, גומי.",
    "theoryLines": [
      "מבודדים עוזרים לשמור על חום או קור.",
      "זה חשוב לבטיחות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_28__v2",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה חומר מגנטי?",
    "options": [
      "ברזל מזוקק תמיד בלי תגובה למגנט",
      "חומר שנמשך למגנט",
      "נחושת שמגיבה למגנט כמו ברזל",
      "זהב טהור שנדבק חזק למגנט קבוע"
    ],
    "correctIndex": 1,
    "explanation": "חומר מגנטי הוא חומר שנמשך למגנט. דוגמאות: ברזל, ניקל, קובלט.",
    "theoryLines": [
      "מגנטים מושכים חומרים מגנטיים.",
      "לא כל המתכות מגנטיות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_29",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה חומר שקוף?",
    "options": [
      "זכוכית אטומה שאין דרכה לראות",
      "חומר שאור עובר דרכו ורואים דרכו",
      "פלסטיק מעושן שאינו משדר אור",
      "מים מלוכלכות שחוסמות לחלוטין ראייה"
    ],
    "correctIndex": 1,
    "explanation": "חומר שקוף הוא חומר שאור יכול לעבור דרכו ואנחנו יכולים לראות דרכו. דוגמאות: זכוכית, מים נקיים, פלסטיק שקוף.",
    "theoryLines": [
      "שקיפות מאפשרת לראות דרכו.",
      "זה שימושי לחלונות ולמשקפיים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "materials_30",
    "topic": "materials",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה חומר אורגני?",
    "options": [
      "פולימר סינתטי בלי קשר לצמחים",
      "חומר שמקורו ביצורים חיים (צמחים או בעלי חיים)",
      "מלח מינרלי בלי קשר ישיר לשרידי חיים",
      "אבן חול טהורה ללא שאריות חיים"
    ],
    "correctIndex": 1,
    "explanation": "חומר אורגני הוא חומר שמקורו ביצורים חיים – צמחים או בעלי חיים. דוגמאות: עץ, כותנה, צמר.",
    "theoryLines": [
      "חומרים אורגניים מתפרקים בקלות יותר.",
      "חלקם ידידותיים לסביבה יותר."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "understanding",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "standard"
    }
  },
  {
    "id": "earth_19__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה כוכב לכת?",
    "options": [
      "כוכב רגיל",
      "גוף גדול שמקיף כוכב (כמו הארץ סביב השמש)",
      "ירח המקיף כוכב לכת",
      "כוכב שמייצר אור כמו השמש"
    ],
    "correctIndex": 1,
    "explanation": "כוכב לכת הוא גוף גדול שמסתובב סביב כוכב. כדור הארץ הוא כוכב לכת שמסתובב סביב השמש.",
    "theoryLines": [
      "יש שמונה כוכבי לכת במערכת השמש.",
      "כל אחד יש לו תכונות שונות."
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
    "id": "earth_20__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה כוכב?",
    "options": [
      "כוכב לכת",
      "גוף גדול ביקום שמפיק אור וחום בעצמו",
      "ירח",
      "אסטרואיד קטן בחגורת אבנים"
    ],
    "correctIndex": 1,
    "explanation": "כוכב הוא גוף גדול ביקום שמפיק אור ואנרגיה בעצמו דרך תגובות גרעיניות. השמש היא כוכב.",
    "theoryLines": [
      "כוכבים נמצאים רחוק מאוד.",
      "הם נראים כנקודות אור בשמיים בלילה."
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
    "id": "earth_21__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה ירח?",
    "options": [
      "כוכב לכת גדול שמאיר מעצמו",
      "גוף טבעי שמקיף את כדור הארץ ומואר על ידי השמש",
      "אסטרואיד קטן בין מרקורי לשמש",
      "ענן גשם בלבד"
    ],
    "correctIndex": 1,
    "explanation": "ירח הוא גוף שמסתובב סביב כוכב לכת. הירח שלנו מסתובב סביב כדור הארץ.",
    "theoryLines": [
      "הירח הוא הלוויין הטבעי של כדור הארץ.",
      "הוא מחזיר את אור השמש."
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
    "id": "earth_22__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה אסטרואיד?",
    "options": [
      "גוף מנצנץ שמפיק אור עצמי",
      "אבן בחלל המקיפה את השמש",
      "גוף כבד כמו כדור הארץ במסלול",
      "לוויין המקיף את הירח"
    ],
    "correctIndex": 1,
    "explanation": "אסטרואיד הוא אבן גדולה בחלל שמסתובבת סביב השמש. יש הרבה אסטרואידים בין כוכבי הלכת.",
    "theoryLines": [
      "אסטרואידים הם שרידים מהמערכת השמש הקדומה.",
      "חלקם קטנים מאוד, חלקם גדולים."
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
    "id": "earth_24__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מחזור המים?",
    "options": [
      "ירידת משקעים בלי אידוי או זרימה לים",
      "תהליך שבו מים נעים בין ים, אדמה ואטמוספרה",
      "שלג במקום קבוע בלי המסה או התאדות",
      "עננים קבועים בלי משקעים לאדמה"
    ],
    "correctIndex": 1,
    "explanation": "מחזור המים הוא תהליך שבו מים נעים בין הים, האדמה והאטמוספרה דרך אידוי, עיבוי ומשקעים.",
    "theoryLines": [
      "זה תהליך מתמשך.",
      "מים מתאדים, מתעבים לעננים ויורדים כגשם או שלג."
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
    "id": "earth_25__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה עננים?",
    "options": [
      "אוויר יבש בלי טיפות נראות לעין",
      "טיפות מים קטנות או גבישי קרח באטמוספרה",
      "אבק לבד בלי לחות נלווית",
      "רוח מהירה בלי טיפות מרוכזות"
    ],
    "correctIndex": 1,
    "explanation": "עננים הם טיפות מים קטנות או גבישי קרח שנמצאים באטמוספרה. כשהם כבדים, יורד גשם או שלג.",
    "theoryLines": [
      "עננים נוצרים כשאדי מים מתעבים.",
      "יש סוגים שונים של עננים."
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
    "id": "earth_26__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה גשם?",
    "options": [
      "לחות באוויר בלי נפילה לאדמה",
      "טיפות מים שנופלות מהעננים לאדמה",
      "שלג שעומד על הקרקע בלי המסה",
      "ברד בלבד בלי טיפות מים נפרדות"
    ],
    "correctIndex": 1,
    "explanation": "גשם הוא טיפות מים שנופלות מהעננים לאדמה. זה חלק ממחזור המים.",
    "theoryLines": [
      "גשם חשוב מאוד לחיים על כדור הארץ.",
      "הוא מספק מים לצמחים ולבעלי חיים."
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
    "id": "earth_27__v2",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה שלג?",
    "options": [
      "קרח עבה על הדשא בלי נפילה מהשמיים",
      "גבישי קרח שנופלים מהעננים כשקר מאוד",
      "גשם חם בלי קרח בכלל",
      "גרגירי ברד כבדים תמיד על הקרקע"
    ],
    "correctIndex": 1,
    "explanation": "שלג הוא גבישי קרח שנופלים מהעננים כשהטמפרטורה נמוכה מאוד. כל פתית שלג הוא ייחודי.",
    "theoryLines": [
      "שלג נופל כשהטמפרטורה מתחת לאפס.",
      "הוא חשוב מאוד לאקלים ולמים."
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
    "id": "earth_28",
    "topic": "earth_space",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה רוח?",
    "options": [
      "ניע אוויר מקומי בלי הבדלי חום",
      "תנועת אוויר ממקום חם לקר",
      "עננים סטטיים בלי זרימה אופקית",
      "גשם יורד אנכית בלבד בלי דחיפת אוויר"
    ],
    "correctIndex": 1,
    "explanation": "רוח היא תנועה של אוויר מפני שטח חם לאזור קר. זה קורה בגלל הבדלי לחץ אוויר.",
    "theoryLines": [
      "רוח יכולה להיות חזקה או חלשה.",
      "היא משפיעה על מזג האוויר."
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
    "id": "env_19__v2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה זיהום אוויר?",
    "options": [
      "אוויר ללא כל חלקיקים או גזים",
      "חומרים מזיקים באוויר הפוגעים בבריאות ובסביבה",
      "גשם שמדלל לכלוך ללא שארית",
      "קרינת שמש שמונעת כניסת גזים"
    ],
    "correctIndex": 1,
    "explanation": "זיהום אוויר הוא חומרים מזיקים שנמצאים באוויר (ממכוניות, מפעלים וכו') שגורמים נזק לבריאות ולסביבה.",
    "theoryLines": [
      "זה נוצר מפעילות אנושית.",
      "זה יכול לגרום למחלות."
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
    "id": "env_20__v2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה זיהום מים?",
    "options": [
      "מים נקיים",
      "הוספת חומרים מזיקים למים שגורמים נזק",
      "מים ראויים לשתייה בלי שינוי כלל",
      "זרם טהור שלא נוגע בקרקע"
    ],
    "correctIndex": 1,
    "explanation": "זיהום מים הוא הוספת חומרים מזיקים למים (כמו פסולת, כימיקלים) שגורמים נזק לבעלי החיים והצמחים שצריכים מים נקיים.",
    "theoryLines": [
      "זה פוגע בטבע ובבני אדם.",
      "חשוב לשמור על מים נקיים."
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
    "id": "env_21__v2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה זיהום קרקע?",
    "options": [
      "אדמה נקייה",
      "הוספת חומרים מזיקים לאדמה שגורמים נזק",
      "אדמה פורייה בלא חומרים זרים",
      "שדה מלא צמחים בריאים בלבד"
    ],
    "correctIndex": 1,
    "explanation": "זיהום קרקע הוא הוספת חומרים מזיקים לאדמה (כמו פסולת, כימיקלים) שגורמים נזק לצמחים ולבעלי חיים.",
    "theoryLines": [
      "זה פוגע באדמה ובמה שגדל בה.",
      "חשוב לשמור על אדמה נקייה."
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
    "id": "env_22__v2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מערכת אקולוגית?",
    "options": [
      "עיר גדולה",
      "אוסף יצורים חיים וסביבת החיים שלהם והקשרים ביניהם",
      "יער של צמחים בלי בעלי חיים או מים",
      "חיות בר בלי צמחייה או מחזורי מזון"
    ],
    "correctIndex": 1,
    "explanation": "מערכת אקולוגית כוללת יצורים חיים, סביבת החיים שלהם והקשרים ביניהם.",
    "theoryLines": [
      "דוגמאות: יער, בריכה, שונית אלמוגים.",
      "שינויים בסביבה משפיעים על כל המרכיבים במערכת."
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
    "id": "env_23__v2",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה שרשרת מזון?",
    "options": [
      "רשימת קניות של מזון אנושי",
      "סדרה של יצורים שבה כל אחד נטרף על ידי הבא אחריו",
      "צמחים ללא אוכלי עשב או טורפים",
      "טורפים בלי יצרנים או מקור אנרגיה"
    ],
    "correctIndex": 1,
    "explanation": "שרשרת מזון מתארת את זרימת האנרגיה מהיצרנים (צמחים) לצרכנים (בעלי חיים).",
    "theoryLines": [
      "הצמחים הם בדרך כלל היצרנים.",
      "טורפים ואוכלי עשב הם חלק משרשראות מזון."
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
    "id": "env_25",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה קיימות?",
    "options": [
      "הרחבת צריכה בלי דאגה לעתיד",
      "שימוש במשאבים בצורה שלא תפגע בדורות הבאים",
      "ניצול מהיר עד גמר המלאי",
      "הרס מכוון של סביבה לא פעילה"
    ],
    "correctIndex": 1,
    "explanation": "קיימות היא שימוש במשאבים בצורה שלא תפגע בדורות הבאים. זה כולל שמירה על הסביבה.",
    "theoryLines": [
      "זה חשוב מאוד לעתיד.",
      "כל אחד יכול לעזור בקיימות."
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
    "id": "env_26",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה אנרגיה מתחדשת?",
    "options": [
      "אנרגיה ממקור מתכלה במאגר מוגבל",
      "אנרגיה משמש, רוח או מים שחוזרים בטבע",
      "אנרגיה מחילוף נפט מתכלה",
      "אנרגיה שחמה משרפת פחם"
    ],
    "correctIndex": 1,
    "explanation": "אנרגיה מתחדשת היא אנרגיה שמגיעה ממקורות שלא נגמרים, כמו שמש, רוח, מים, גיאות. זה יותר טוב לסביבה מנפט ופחם.",
    "theoryLines": [
      "זה עוזר לשמור על הסביבה.",
      "זה חלק מקיימות."
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
    "id": "env_27",
    "topic": "environment",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה פסולת?",
    "options": [
      "כל אשפה ללא צורך בטיפול או הפרדה",
      "חומרים שלא צריך יותר ושצריך לזרוק או למחזר",
      "מים זורמים בנהר בלי חומרים זרים",
      "אוויר עם רק פחמן דו-חמצני טבעי"
    ],
    "correctIndex": 1,
    "explanation": "פסולת היא חומרים שלא צריך יותר ושצריך לזרוק או למחזר. חשוב לזרוק פסולת למקום הנכון.",
    "theoryLines": [
      "פסולת יכולה להיות מסוכנת לסביבה.",
      "מיחזור עוזר להפחית פסולת."
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
    "id": "exp_18__v2",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה משתנה בלתי תלוי?",
    "options": [
      "התוצאה שאותה מודדים לאחר השינוי שתכננו",
      "מה שמשנים בניסוי",
      "גורמים שמוסכם להשאיר קבועים בין כל הקבוצות",
      "המשתנים שרושמים רק לבסוף בלי קשר לשאלה"
    ],
    "correctIndex": 1,
    "explanation": "משתנה בלתי תלוי הוא מה שמשנים בניסוי כדי לראות איך זה משפיע על התוצאה.",
    "theoryLines": [
      "בניסוי טוב משנים רק משתנה אחד.",
      "זה עוזר להבין מה גרם לתוצאה."
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
    "id": "exp_19__v2",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה משתנה תלוי?",
    "options": [
      "המשתנה שהחוקר מייעד לשינוי בשלב התכנון",
      "מה שמודדים כתוצאה מהשינוי",
      "גודל המדגם בלבד בלי קשר לערך שמתעדים בכל מדידה",
      "נתונים שמתעלמים מהם כדי לקצר זמן מדידה"
    ],
    "correctIndex": 1,
    "explanation": "משתנה תלוי הוא מה שמודדים כתוצאה מהשינוי במשתנה הבלתי תלוי.",
    "theoryLines": [
      "זה מה שאנחנו רוצים לגלות.",
      "זה התוצאה של הניסוי."
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
    "id": "exp_20__v2",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה קבוצת ביקורת?",
    "options": [
      "קבוצה שבה משנים בוזמנית את כל הגורמים בלי קו בסיס להשוואה",
      "קבוצה שמשווים אליה את התוצאות",
      "קבוצה שבה מודדים רק בסוף בלי טיפול התחלתי כלשהו",
      "קבוצה שנועדה לשכפל את התוצאה העיקרית בלי קו בסיס"
    ],
    "correctIndex": 1,
    "explanation": "קבוצת ביקורת היא קבוצה שלא משנים בה כלום, כדי להשוות את התוצאות ולראות מה ההבדל.",
    "theoryLines": [
      "זה עוזר להבין מה גרם לתוצאה.",
      "זה חלק חשוב מניסוי מדעי."
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
    "id": "exp_22__v2",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה מסקנה?",
    "options": [
      "סיום הניסוי בלי הסבר לתוצאות",
      "מה שלמדנו מהניסוי ומה זה אומר",
      "פתיחה בלי ניתוח נתונים",
      "שלב אמצע בלי קישור לשאלה"
    ],
    "correctIndex": 1,
    "explanation": "מסקנה היא מה שלמדנו מהניסוי ומה זה אומר. זה החלק שבו אנחנו מסבירים את התוצאות.",
    "theoryLines": [
      "מסקנות עוזרות להבין מה למדנו.",
      "זה חלק חשוב מניסוי מדעי."
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
    "id": "exp_26",
    "topic": "experiments",
    "grades": [
      "g3",
      "g4"
    ],
    "minLevel": "medium",
    "maxLevel": "medium",
    "type": "mcq",
    "stem": "מה זה בטיחות בניסויים?",
    "options": [
      "זהירות חלקית בלי הכנה מוקדמת",
      "להיות זהירים ולוודא שהכל בטוח לפני, במהלך ואחרי הניסוי",
      "מהירות בביצוע בלי בדיקת ציוד",
      "כיף בלבד בלי כללי מגן"
    ],
    "correctIndex": 1,
    "explanation": "בטיחות בניסויים היא להיות זהירים ולוודא שהכל בטוח לפני, במהלך ואחרי הניסוי. זה הדבר הכי חשוב.",
    "theoryLines": [
      "בטיחות היא הדבר הכי חשוב.",
      "תמיד צריך מבוגר שיעזור."
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
    "id": "earth_space_phase717_g2_1",
    "topic": "earth_space",
    "grades": [
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה ביום שמשי רואים את השמים בהירים יותר מאשר בלילה?",
    "options": [
      "כי אור השמש מפזר באטמוספרה ומאיר את השמים",
      "כי הירח מאיר כמו השמש ביום",
      "כי בלילה אין כוכבים",
      "כי השמים נצבעים תמיד באותו צבע"
    ],
    "correctIndex": 0,
    "explanation": "בשעות היום אור השמש מואר את האטמוספרה ולכן רואים שמיים בהירים; בלילה חשוך יותר.",
    "theoryLines": [
      "השמש היא מקור אור עיקרי ביום.",
      "בלילה רואים בעיקר אור מהירח ומכוכבים."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_space_phase717_g2_2",
    "topic": "earth_space",
    "grades": [
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה נכון לגבי כדור הארץ והשמש ביחסים פשוטים?",
    "options": [
      "כדור הארץ סובב סביב עצמו וגם סובב סביב השמש",
      "כדור הארץ נשאר במקום והשמש סובבת סביבו פעמיים ביום",
      "השמש סובבת סביב הירח",
      "אין תנועה בכלל בין גרמי השמים"
    ],
    "correctIndex": 0,
    "explanation": "כדור הארץ מבצע סיבוב עצמי (יום ולילה) וגם נע במסלול סביב השמש (שנה).",
    "theoryLines": [
      "סיבוב כדור הארץ יוצר חילוף יום ולילה.",
      "מסלול סביב השמש קשור לעונות השנה."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "earth_space_phase717_g2_3",
    "topic": "earth_space",
    "grades": [
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה ההבדל העיקרי בין כוכב לכוכב לכת (פלנета) כמו כדור הארץ?",
    "options": [
      "כוכב לכת הוא גוף שסובב כוכב; כוכב מאיר באור עצמו כמו השמש",
      "אין שום הבדל ביניהם",
      "כוכב לכת תמיד גדול יותר מהשמש",
      "כוכבים נמצאים רק על הירח"
    ],
    "correctIndex": 0,
    "explanation": "כוכב כמו השמש הוא כדור פלזמה חם שמקרין אור; כוכב לכת הוא גוף קריר יחסית שסובב כוכב.",
    "theoryLines": [
      "במערכת השמש, כדור הארץ הוא כוכב לכת.",
      "השמש היא כוכב במרכז המערכת."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g1_hard_body",
    "topic": "body",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה מתאר נכון את התפקידים של הלב ושל הריאות?",
    "options": [
      "הלב מזרים דם ברחבי הגוף והריאות מחליפות גזים עם האוויר",
      "הריאות מזרימות דם והלב נושם אוויר",
      "שניהם מסננים את המזון מהקיבה",
      "שניהם מאחסנים זיכרון בלבד"
    ],
    "correctIndex": 0,
    "explanation": "הלב הוא משאבה שמזרימה דם; בהריאות מתבצעת החלפת חמצן ופחמן דוחמצני עם האוויר.",
    "theoryLines": [
      "הלב והמערכת הנשימתית עובדים יחד לספק חמצן לגוף.",
      "לכל איבר יש תפקיד ייעודי במערכות הגוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "science_remaining_g1_hard_earth_space",
    "topic": "earth_space",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה הסיבה העיקרית לכך שיש יום ולילה אצלנו בכדור הארץ?",
    "options": [
      "כדור הארץ מסתובב סביב צירו",
      "השמש כבויה בלילה",
      "הירח מפסיק את אור השמש כל לילה",
      "רק השמיים זזים בלי שינוי בכדור הארץ"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב כדור הארץ סביב צירו גורם לאזורים שונים להיות פונים אל השמש או הרחק ממנה - יום ולילה.",
    "theoryLines": [
      "סיבוב כדור הארץ יוצר את מחזור היום והלילה.",
      "השמש נותנת אור; כדור הארץ מסתובב ולכן רואים שינוי."
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
    "id": "science_remaining_g1_hard_environment",
    "topic": "environment",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה דוגמה לפעולה שעוזרת לשמור על הסביבה בגינה או בפארק?",
    "options": [
      "לאסוף אשפה לפח ולא להשאיר פסולת על הדשא",
      "לשבור ענפים מכל עץ",
      "להשאיר ברז מים פתוח כל הזמן",
      "לצבוע על סלעים בלי לשאול מבוגר"
    ],
    "correctIndex": 0,
    "explanation": "איסוף פסולת ושימוש בפח מפחית זיהום ומגן על צמחים ובעלי חיים בסביבה.",
    "theoryLines": [
      "כל אחד יכול לפעול בצורה אחראית כדי לשמור על מקומות טבעיים.",
      "פסולת עלולה לזהם מים ואדמה."
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
    "id": "science_remaining_g1_hard_materials",
    "topic": "materials",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה ההבדל הפשוט בין חומר קשיח לחומר רך כשנוגעים ומנסים לכופף אותו?",
    "options": [
      "חומר קשיח קשה יותר לכיפוף בלי שבירה; חומר רך מתכופף בקלות יותר",
      "תמיד אין שום הבדל",
      "רק הגודל של החתיכה קובע",
      "חומר קשיח תמיד נוזלי"
    ],
    "correctIndex": 0,
    "explanation": "קשיחות וגמישות הן תכונות שניתן להרגיש: חומר רך נוטה להתכופף, חומר קשיח נוטה להישבר או להתנגד לכיפוף.",
    "theoryLines": [
      "תכונות חומר נבדקות בתצפית ובמגע.",
      "יש חומרים קשיחים, רכים, גמישים ושבירים."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "science_remaining_g1_hard_plants",
    "topic": "plants",
    "grades": [
      "g1"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה ההבדל העיקרי בין צמח לאבן?",
    "options": [
      "לצמח יש צמיחה והוא צריך מים ואור; לאבן אין צמיחה כמו לצמח",
      "שניהם גדלים באותה צורה",
      "אבן גדלה כמו עץ אם שופכים עליה מים",
      "אין הבדל בין חי לדומם"
    ],
    "correctIndex": 0,
    "explanation": "צמח הוא יצור חי שגדל ומגיב לתנאים; אבן היא דומם ללא צמיחה כמו לצמח.",
    "theoryLines": [
      "מבדילים בין חי לדומם לפי צמיחה, תנועה והגדרה ותגובה לסביבה.",
      "צמחים זקוקים למים, אור ואוויר לצמיחה."
    ],
    "params": {
      "patternFamily": "sci_plants_growth",
      "subtype": "sci_plants_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "science_remaining_g2_hard_body",
    "topic": "body",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה הקשר בין פעילות גופנית סדירה לבריאות הלב?",
    "options": [
      "פעילות גופנית תומכת בלב חזק ויעיל יותר",
      "אין שום קשר בין פעילות ללב",
      "הלב לא משתנה לעולם בלי קשר לפעילות",
      "רק הרגליים משפיעות על קצב הנשימה בלי קשר ללב"
    ],
    "correctIndex": 0,
    "explanation": "פעילות גופנית מאמנת את שריר הלב ואת מערכת ההולכה ותורמת לבריאות כלי הדם.",
    "theoryLines": [
      "הלב הוא שריר שצריך אימון מתון כמו שאר השרירים.",
      "בריאות כללית קשורה לפעילות גופנית סדירה."
    ],
    "params": {
      "patternFamily": "sci_body_health",
      "subtype": "sci_body_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "science_remaining_g2_earth_space_easy_hard",
    "topic": "earth_space",
    "grades": [
      "g1",
      "g2",
      "g3",
      "g4"
    ],
    "minLevel": "easy",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה נכון על השמש, כדור הארץ והירח במערכת השמש שלנו?",
    "options": [
      "השמש גדולה וחמה מאוד; כדור הארץ נע במסלול סביב השמש; הירח סובב סביב כדור הארץ",
      "הירח הוא מקור האור העיקרי ביום",
      "כדור הארץ ניצב במרכז והכל סובב סביבו בלבד",
      "במערכת השמש אין כבידה כלל"
    ],
    "correctIndex": 0,
    "explanation": "השמש נמצאת במרכז המערכת שבה כדור הארץ נע במסלול סביבה; הירח הוא לוויין של כדור הארץ.",
    "theoryLines": [
      "השמש מספקת אור וחום לכדור הארץ.",
      "כדור הארץ והירח נעים במסלולים שונים ביחס לשמש."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g2_hard_environment",
    "topic": "environment",
    "grades": [
      "g2",
      "g3"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "למה זה מזיק לזרוק פלסטיק לים או להשאירו על החוף?",
    "options": [
      "פלסטיק עלול לפגוע בבעלי חיים ולזהם את המים",
      "פלסטיק נעלם מאליו תוך דקות בים",
      "הים מסנן תמיד את כל הפלסטיק לבד בלי נזק",
      "דגים זקוקים לפלסטיק כמזון עיקרי"
    ],
    "correctIndex": 0,
    "explanation": "פלסטיק נשאר זמן רב בסביבה, עלול להיחנק בבעלי חיים ולהפריע למערכות אקולוגיות במים.",
    "theoryLines": [
      "זיהום פלסטיק משפיע על ים, חופים ובעלי חיים.",
      "צמצום פלסטיק ומיחזור עוזרים להגן על הסביבה."
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
    "id": "science_remaining_g2_hard_experiments",
    "topic": "experiments",
    "grades": [
      "g2"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה סדר פעולות מתאים לפני ובמהלך ניסוי מדעי פשוט?",
    "options": [
      "שאלת חקר, הנחה, בדיקה ורישום תוצאות",
      "לסיים מיד בלי לרשום כלום",
      "לשנות את כל התנאים באמצע בלי תכנון",
      "רק לנחש בלי לבדוק במציאות"
    ],
    "correctIndex": 0,
    "explanation": "תהליך מדעי מתחיל בשאלה והנחה, ממשיך בבדיקה מבוקרת ומתעד תוצאות כדי ללמוד מהן.",
    "theoryLines": [
      "ניסוי טוב כולל תכנון קצר ורישום מה ראינו.",
      "מסקנות מבוססות על ראיות מהניסוי."
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
    "id": "science_remaining_g2_hard_materials",
    "topic": "materials",
    "grades": [
      "g2",
      "g3",
      "g4",
      "g5"
    ],
    "minLevel": "hard",
    "maxLevel": "hard",
    "type": "mcq",
    "stem": "מה דוגמה לשינוי פיזיקלי בלבד, ללא יצירת חומר חדש?",
    "options": [
      "כיפוף דף נייר בלי לשרוף אותו",
      "שריפת נייר לאפר",
      "אפיית בצק שהיה נוזלי",
      "חלודה על ברזל"
    ],
    "correctIndex": 0,
    "explanation": "כיפוף נייר משנה צורה אך נשאר נייר; שריפה, חלודה ואפייה כוללות לעיתים תגובות כימיות וחומרים חדשים.",
    "theoryLines": [
      "שינוי פיזיקלי משמר את סוג החומר בעיקרו ומשנה צורה או מצב צבירה לפעמים.",
      "שינוי כימי יוצר חומרים חדשים."
    ],
    "params": {
      "patternFamily": "sci_materials_changes",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "analysis",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "advanced"
    }
  },
  {
    "id": "science_remaining_g56_easy_body",
    "topic": "body",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה מתאר במילים פשוטות תפקיד מרכזי של הדם בגוף?",
    "options": [
      "להוביל חמצן וחומרי מזון ולסייע בהוצאת פסולת מהתאים",
      "לייצר את כל האנרגיה ישירות מהאוויר בלי עזרת איברים אחרים",
      "להחליף לגמרי את תפקיד המוח והעצבים",
      "לעצור את הנשימה כשצריך מזון"
    ],
    "correctIndex": 0,
    "explanation": "הדם מפעיל הובלה של חמצן, חומרי מזון והורמונים ומסייע להסרת פסולת מתאית.",
    "theoryLines": [
      "מערכת הדם מחוברת לנשימה ולעיכול.",
      "לב מזרים דם דרך כלי דם לכל הגוף."
    ],
    "params": {
      "patternFamily": "sci_body_systems",
      "subtype": "sci_body_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g56_easy_earth_space",
    "topic": "earth_space",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה גורם בעיקר לחילוף יום ולילה במקום מסוים על כדור הארץ?",
    "options": [
      "סיבוב כדור הארץ סביב צירו",
      "כיבוי השמש בלילה",
      "סיבוב הירח סביב השמש פעמיים ביום",
      "תנועת העננים בלבד בלי קשר לכדור הארץ"
    ],
    "correctIndex": 0,
    "explanation": "סיבוב כדור הארץ גורם לאזורים להיפגע מאור השמש או להיות בצל - יום ולילה.",
    "theoryLines": [
      "סיבוב כדור הארץ הוא תנועה יומית.",
      "מסלול סביב השמש קשור לעונות, לא ליום לילה היומי."
    ],
    "params": {
      "patternFamily": "sci_earth_space_cycles",
      "subtype": "sci_earth_space_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g56_easy_environment",
    "topic": "environment",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "למה חשוב לחסוך במים בבית ובקהילה?",
    "options": [
      "מים מתוקים מוגבלים ויש לשמרם לכל השימושים ולסביבה",
      "יש תמיד עודף מים בלי הגבלה בעולם",
      "מים לא משמשים כלל לשתייה וצמיחה",
      "רק תעשייה צריכה מים והבית לא"
    ],
    "correctIndex": 0,
    "explanation": "משאבי מים מתוקים דורשים ניהול אחראי כדי להספיק לאנשים, לחקלאות ולטבע.",
    "theoryLines": [
      "מים הם משאב בסיסי לחיים.",
      "חיסכון במים מפחית עומס על סביבות מים ומקורות."
    ],
    "params": {
      "patternFamily": "sci_environment_ecosystems",
      "subtype": "sci_environment_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "concept_confusion",
        "vocabulary_confusion",
        "misconception"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g56_easy_experiments",
    "topic": "experiments",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה חשוב לתעד בזמן ניסוי מדעי?",
    "options": [
      "מה נבדק, מה ראינו ומה למדנו מהתוצאות",
      "רק את המספר הסופי בלי הסבר",
      "כלום - זיכרון מספיק בלי רישום",
      "רק ציורים בלי מילים או תאריכים"
    ],
    "correctIndex": 0,
    "explanation": "תיעוד עוזר להשוות תוצאות, לשחזר את הניסוי ולנסח מסקנות מבוססות ראיות.",
    "theoryLines": [
      "יומן ניסוי כולל צעדים, מדידות ותצפיות.",
      "מדע מתבסס על רישום וניתוח נתונים."
    ],
    "params": {
      "patternFamily": "sci_experiments_scientific_method",
      "subtype": "sci_experiments_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "strategy_error",
        "reading_comprehension_error",
        "concept_confusion"
      ],
      "difficulty": "basic"
    }
  },
  {
    "id": "science_remaining_g56_easy_materials",
    "topic": "materials",
    "grades": [
      "g5",
      "g6"
    ],
    "minLevel": "easy",
    "maxLevel": "easy",
    "type": "mcq",
    "stem": "מה ההבדל הפשוט בין חומר טבעי לחומר סינתטי רבים?",
    "options": [
      "חומר טבעי מגיע מהטבע; חומר סינתטי מיוצר לרוב בתהליכי תעשייה",
      "אין שום הבדל ביניהם",
      "שניהם תמיד זהים לחלוטין בכל תכונה",
      "רק הצבע החיצוני קובע את הסוג"
    ],
    "correctIndex": 0,
    "explanation": "חומרים טבעיים כמו עץ גולמי מגיעים מהטבע; פלסטיק רבים הוא דוגמה לחומר סינתטי מבוקר תהליך ייצור.",
    "theoryLines": [
      "מבחינים בין חומר שמקורו בטבע לבין חומר מעבדה או מפעל.",
      "תכונות החומר משפיעות על שימוש ובטיחות."
    ],
    "params": {
      "patternFamily": "sci_materials_properties",
      "subtype": "sci_materials_general",
      "cognitiveLevel": "recall",
      "expectedErrorTypes": [
        "misconception",
        "concept_confusion",
        "careless_error"
      ],
      "difficulty": "basic"
    }
  }
]
  .concat(SCIENCE_QUESTIONS_PHASE3)
  .concat(SCIENCE_QUESTIONS_PHASE4B1)
  .concat(SCIENCE_QUESTIONS_CLOSURE_FILL)
  .concat(SCIENCE_QUESTIONS_PRODUCTION_BATCH1)
  .concat(SCIENCE_QUESTIONS_P0_G123_FILL)
  .concat(SCIENCE_QUESTIONS_P1_G456_FILL)
  .concat(SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME)
  .concat(SCIENCE_G3_BODY_BANK)
  .concat(SCIENCE_QUESTIONS_PHASE_B);

export const SCIENCE_QUESTIONS = SCIENCE_QUESTIONS_RAW.map(applyPass1ScienceMetadata)
  .map(enrichScienceBankRowWithCanonicalMetadata)
  .map((row) => {
    let current = row;
    for (let pass = 0; pass < 8; pass++) {
      const balanced = rebalanceObviousMcqDistractors({
        options: current.options,
        correctIndex: current.correctIndex,
      });
      const next = repairMcqObviousAnswerContent(
        balanced.options === current.options ? current : { ...current, options: balanced.options },
        { subject: "science", stem: current.stem }
      );
      const audit = auditMcqQuality(next, { subject: "science", topic: next.topic });
      current = next;
      if (audit.failures.length === 0 && audit.warnings.length === 0) break;
    }
    return current;
  });
