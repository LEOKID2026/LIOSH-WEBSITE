// Metadata enrichment (safe pass): difficulty, cognitiveLevel, expectedErrorTypes, skillId (when no diagnostic), subtype (pool bucket when taxonomy-valid), prerequisiteSkillIds (gated). See reports/question-metadata-qa/english-metadata-apply-report.json.
import { TRANSLATION_POOLS_PHASE_B } from "./translation-pools-phase-b.js";

export const TRANSLATION_POOLS = {
  "classroom": [
    {
      "en": "Please sit down",
      "he": "בבקשה שבו",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1",
      "difficulty": "basic"
    },
    {
      "en": "Open your notebook",
      "he": "פתחו את המחברת",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1",
      "difficulty": "basic"
    },
    {
      "en": "Thank you, teacher",
      "he": "תודה, מורה",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28a",
      "difficulty": "basic"
    },
    {
      "en": "Good morning, class",
      "he": "בוקר טוב, כיתה",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28b",
      "difficulty": "basic"
    },
    {
      "en": "I have a pencil",
      "he": "יש לי עפרון",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28c",
      "difficulty": "basic"
    },
    {
      "en": "This is my bag",
      "he": "זה התיק שלי",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28d",
      "difficulty": "basic"
    },
    {
      "en": "Look at the board",
      "he": "הסתכלו על הלוח",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28e",
      "difficulty": "basic"
    },
    {
      "en": "We like our school",
      "he": "אנחנו אוהבים את בית הספר שלנו",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "translation_classroom_g1_p28f",
      "difficulty": "basic"
    },
    {
      "en": "Raise your hand",
      "he": "הרימו את היד",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_classroom_g2",
      "difficulty": "basic"
    },
    {
      "en": "Listen carefully",
      "he": "הקשיבו היטב",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_classroom_g2",
      "difficulty": "basic"
    },
    {
      "en": "Please open your book",
      "he": "בבקשה פתחו את הספר",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_classroom_g2_p28a",
      "difficulty": "basic"
    },
    {
      "en": "Work with a partner",
      "he": "עבדו עם בן זוג",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_classroom_g2_p28b",
      "difficulty": "basic"
    },
    {
      "en": "Put your things away",
      "he": "סידרו את הדברים",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_classroom_g2_p28c",
      "difficulty": "basic"
    },
    {
      "en": "Write the date",
      "he": "כתבו את התאריך",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_classroom_g3",
      "difficulty": "standard"
    },
    {
      "en": "Close the door softly",
      "he": "סגרו את הדלת בעדינות",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_classroom_g3",
      "difficulty": "standard"
    }
  ],
  "routines": [
    {
      "en": "I brush my teeth at night",
      "he": "אני מצחצח שיניים בלילה",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_routines_g2",
      "difficulty": "basic"
    },
    {
      "en": "She drinks milk every morning",
      "he": "היא שותה חלב בכל בוקר",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_routines_g2",
      "difficulty": "basic"
    },
    {
      "en": "I wash my hands before lunch",
      "he": "אני שוטף ידיים לפני ארוחת צהריים",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_routines_g2_p28d",
      "difficulty": "basic"
    },
    {
      "en": "We turn off the lights at night",
      "he": "אנחנו מכבים את האורות בלילה",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_routines_g2_p28e",
      "difficulty": "basic"
    },
    {
      "en": "We walk the dog after school",
      "he": "אנחנו מטיילים עם הכלב אחרי בית הספר",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_routines_g3",
      "difficulty": "standard"
    },
    {
      "en": "My brother cleans his room on Friday",
      "he": "אחי מנקה את החדר שלו ביום שישי",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_routines_g3",
      "difficulty": "standard"
    },
    {
      "en": "They read a story before bed",
      "he": "הם קוראים סיפור לפני השינה",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_routines_g4",
      "difficulty": "standard"
    },
    {
      "en": "Dad cooks dinner on Sundays",
      "he": "אבא מבשל ארוחת ערב בימי ראשון",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_routines_g4",
      "difficulty": "standard"
    }
  ],
  "hobbies": [
    {
      "en": "We play basketball after school",
      "he": "אנחנו משחקים כדורסל אחרי בית הספר",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_hobbies_g3",
      "difficulty": "standard"
    },
    {
      "en": "My sister paints colorful pictures",
      "he": "אחותי מציירת ציורים צבעוניים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_hobbies_g3",
      "difficulty": "standard"
    },
    {
      "en": "It is windy, so we fly a kite",
      "he": "יש רוח, אז אנחנו מעיפים עפיפון",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_hobbies_g4",
      "difficulty": "standard"
    },
    {
      "en": "He collects stickers of animals",
      "he": "הוא אוסף מדבקות של חיות",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_hobbies_g5",
      "difficulty": "advanced"
    },
    {
      "en": "They practice piano every Tuesday",
      "he": "הם מתרגלים פסנתר בכל יום שלישי",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_hobbies_g5",
      "difficulty": "advanced"
    },
    {
      "en": "I like to build Lego cities",
      "he": "אני אוהב לבנות ערי לגו",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_hobbies_g6",
      "difficulty": "advanced"
    }
  ],
  "community": [
    {
      "en": "The library is next to the park",
      "he": "הספרייה נמצאת ליד הפארק",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_community_g3",
      "difficulty": "standard"
    },
    {
      "en": "We visited the science museum",
      "he": "ביקרנו במוזיאון המדע",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_community_g3",
      "difficulty": "standard"
    },
    {
      "en": "Please recycle the bottles in the bin",
      "he": "בבקשה ממחזרו את הבקבוקים בפח",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_community_g4",
      "difficulty": "standard"
    },
    {
      "en": "The market is crowded on Fridays",
      "he": "השוק עמוס בימי שישי",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_community_g4",
      "difficulty": "standard"
    },
    {
      "en": "Our town celebrates a music festival",
      "he": "העיר שלנו חוגגת פסטיבל מוזיקה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_community_g5",
      "difficulty": "advanced"
    },
    {
      "en": "The nurse helps people feel better",
      "he": "האחות עוזרת לאנשים להרגיש טוב יותר",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_community_g5",
      "difficulty": "advanced"
    }
  ],
  "technology": [
    {
      "en": "She is coding a friendly robot",
      "he": "היא כותבת קוד לרובוט ידידותי",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_technology_g4",
      "difficulty": "standard"
    },
    {
      "en": "We use tablets for digital art",
      "he": "אנחנו משתמשים בטאבלטים לאמנות דיגיטלית",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_technology_g4",
      "difficulty": "standard"
    },
    {
      "en": "The drone takes photos of the field",
      "he": "הרחפן מצלם את השדה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_technology_g5",
      "difficulty": "advanced"
    },
    {
      "en": "He uploads a podcast every week",
      "he": "הוא מעלה פודקאסט בכל שבוע",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_technology_g5",
      "difficulty": "advanced"
    },
    {
      "en": "Our class designs a smart garden",
      "he": "הכיתה שלנו מתכננת גינה חכמה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_technology_g6",
      "difficulty": "advanced"
    },
    {
      "en": "They research clean energy online",
      "he": "הם חוקרים אנרגיה נקייה באינטרנט",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_technology_g6",
      "difficulty": "advanced"
    }
  ],
  "global": [
    {
      "en": "If we save water, rivers stay clean",
      "he": "אם אנחנו חוסכים במים, הנהרות נשארים נקיים",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_global_g5",
      "difficulty": "advanced"
    },
    {
      "en": "Planting trees helps our planet breathe",
      "he": "נטיעת עצים עוזרת לכדור הארץ לנשום",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_global_g5",
      "difficulty": "advanced"
    },
    {
      "en": "We write about cultures around the world",
      "he": "אנחנו כותבים על תרבויות ברחבי העולם",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_global_g6",
      "difficulty": "advanced"
    },
    {
      "en": "She reads news about space missions",
      "he": "היא קוראת חדשות על משימות חלל",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_global_g6",
      "difficulty": "advanced"
    },
    {
      "en": "They discuss how communities share water",
      "he": "הם דנים כיצד קהילות חולקות מים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_global_g6b",
      "difficulty": "advanced"
    },
    {
      "en": "Working together keeps the ocean blue",
      "he": "עבודה משותפת שומרת על האוקיינוס כחול",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_global_g6c",
      "difficulty": "advanced"
    }
  ],
  "production_completion_translation_bands": [
    {
      "en": "This is my blue pencil case",
      "he": "זה קלמר כחול שלי",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_01",
      "difficulty": "standard"
    },
    {
      "en": "We sing a short English song",
      "he": "אנחנו שרים שיר אנגלי קצר",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_02",
      "difficulty": "standard"
    },
    {
      "en": "Please point to the door",
      "he": "בבקשה הצבעו על הדלת",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_03",
      "difficulty": "standard"
    },
    {
      "en": "My friend shares crayons",
      "he": "החבר שלי משתף צבעים",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_04",
      "difficulty": "standard"
    },
    {
      "en": "We draw shapes on paper",
      "he": "אנחנו מציירים צורות על נייר",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_05",
      "difficulty": "standard"
    },
    {
      "en": "This flower smells sweet",
      "he": "הפרח הזה מריח מתוק",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_06",
      "difficulty": "standard"
    },
    {
      "en": "Please count to twelve slowly",
      "he": "בבקשה ספרו לאט עד שניים עשר",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_07",
      "difficulty": "standard"
    },
    {
      "en": "We wash hands before snack time",
      "he": "אנחנו שוטפים ידיים לפני ארוחת ביניים",
      "minGrade": 1,
      "maxGrade": 1,
      "patternFamily": "pcb_trans_g1_std_08",
      "difficulty": "standard"
    },
    {
      "en": "Our classroom has big windows",
      "he": "בכיתה שלנו יש חלונות גדולים",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_01",
      "difficulty": "standard"
    },
    {
      "en": "Please bring a healthy sandwich",
      "he": "בבקשה הביאו כריך בריא",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_02",
      "difficulty": "standard"
    },
    {
      "en": "We practice letters on the board",
      "he": "אנחנו מתרגלים אותיות על הלוח",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_03",
      "difficulty": "standard"
    },
    {
      "en": "She ties her shoes carefully",
      "he": "היא קושרת את הנעליים בזהירות",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_04",
      "difficulty": "standard"
    },
    {
      "en": "We pack our bags after school",
      "he": "אנחנו אורזים את התיקים אחרי בית הספר",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_05",
      "difficulty": "standard"
    },
    {
      "en": "Please copy the date with neat letters",
      "he": "בבקשה העתיקו את התאריך באותיות מסודרות",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_06",
      "difficulty": "standard"
    },
    {
      "en": "They share scissors during art class",
      "he": "הם משתפים מספריים בשיעור אמנות",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_07",
      "difficulty": "standard"
    },
    {
      "en": "We spell new words with the teacher",
      "he": "אנחנו מאייתים מילים חדשות עם המורה",
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "pcb_trans_g2_std_08",
      "difficulty": "standard"
    },
    {
      "en": "I see a yellow sun",
      "he": "אני רואה שמש צהובה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_01",
      "difficulty": "basic"
    },
    {
      "en": "We drink water every day",
      "he": "אנחנו שותים מים בכל יום",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_02",
      "difficulty": "basic"
    },
    {
      "en": "My shoes are under the chair",
      "he": "הנעליים שלי מתחת לכיסא",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_03",
      "difficulty": "basic"
    },
    {
      "en": "She draws a big tree",
      "he": "היא מציירת עץ גדול",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_04",
      "difficulty": "basic"
    },
    {
      "en": "They play football after school",
      "he": "הם משחקים כדורגל אחרי בית הספר",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_05",
      "difficulty": "basic"
    },
    {
      "en": "It is hot and sunny today",
      "he": "היום חם ושמשי",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_06",
      "difficulty": "basic"
    },
    {
      "en": "Please close your English book",
      "he": "בבקשה סגרו את ספר האנגלית",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_07",
      "difficulty": "basic"
    },
    {
      "en": "I like apples and bananas",
      "he": "אני אוהב תפוחים ובננות",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_08",
      "difficulty": "basic"
    },
    {
      "en": "We listen to the teacher",
      "he": "אנחנו מקשיבים למורה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_09",
      "difficulty": "basic"
    },
    {
      "en": "The cat sleeps on the sofa",
      "he": "החתול ישן על הספה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_10",
      "difficulty": "basic"
    },
    {
      "en": "He washes his hands before lunch",
      "he": "הוא שוטף ידיים לפני ארוחת צהריים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_11",
      "difficulty": "basic"
    },
    {
      "en": "They count from one to twenty",
      "he": "הם סופרים מאחד עד עשרים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_basic_12",
      "difficulty": "basic"
    },
    {
      "en": "Yesterday we visited a small farm",
      "he": "אתמול ביקרנו בחווה קטנה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_01",
      "difficulty": "advanced"
    },
    {
      "en": "Tomorrow our class will plant trees",
      "he": "מחר הכיתה שלנו תטע עצים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_02",
      "difficulty": "advanced"
    },
    {
      "en": "Because it rained, we stayed indoors",
      "he": "כי ירד גשם, נשארנו בפנים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_03",
      "difficulty": "advanced"
    },
    {
      "en": "She forgot her umbrella at home",
      "he": "היא שכחה את המטרייה בבית",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_04",
      "difficulty": "advanced"
    },
    {
      "en": "If you hurry, you will catch the bus",
      "he": "אם תמהרו, תספיקו לאוטובוס",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_05",
      "difficulty": "advanced"
    },
    {
      "en": "We measured the plant with a ruler",
      "he": "מדדנו את הצמח עם סרגל",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_06",
      "difficulty": "advanced"
    },
    {
      "en": "The river looks cleaner after the rain",
      "he": "הנהר נראה נקי יותר אחרי הגשם",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_07",
      "difficulty": "advanced"
    },
    {
      "en": "They explained the experiment in simple words",
      "he": "הם הסבירו את הניסוי במילים פשוטות",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_08",
      "difficulty": "advanced"
    },
    {
      "en": "I prefer quiet reading to loud games",
      "he": "אני מעדיף קריאה שקטה על משחקים רועשים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_09",
      "difficulty": "advanced"
    },
    {
      "en": "The wind pushed our kite higher",
      "he": "הרוח דחפה את העפיפון שלנו למעלה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_10",
      "difficulty": "advanced"
    },
    {
      "en": "Before bedtime, we pack our schoolbags",
      "he": "לפני השינה, אנחנו סוגרים את התיקים לבית הספר",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_11",
      "difficulty": "advanced"
    },
    {
      "en": "Science class taught us about recycling",
      "he": "שיעור המדע לימד אותנו על מיחזור",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_adv_12",
      "difficulty": "advanced"
    },
    {
      "en": "Our city park has fresh air",
      "he": "לפארק העירוני שלנו יש אוויר צח",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_01",
      "difficulty": "basic"
    },
    {
      "en": "We carried bottles to the recycling bin",
      "he": "העברנו בקבוקים לפח המיחזור",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_02",
      "difficulty": "basic"
    },
    {
      "en": "The horse runs faster than the sheep",
      "he": "הסוס רץ מהר יותר מהכבשים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_03",
      "difficulty": "basic"
    },
    {
      "en": "Ice melts when the sun shines",
      "he": "קרח נמס כשהשמש זורחת",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_04",
      "difficulty": "basic"
    },
    {
      "en": "Please compare the two shadows",
      "he": "בבקשה השוו בין שני הצללים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_05",
      "difficulty": "basic"
    },
    {
      "en": "Clouds sometimes hide the mountains",
      "he": "עננים לפעמים מסתירים את ההרים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_06",
      "difficulty": "basic"
    },
    {
      "en": "They collected seeds for next spring",
      "he": "הם אספו זרעים לאביב הבא",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_07",
      "difficulty": "basic"
    },
    {
      "en": "My cousin lives near the sea",
      "he": "בן דודי גר ליד הים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_08",
      "difficulty": "basic"
    },
    {
      "en": "We noticed dew on the grass",
      "he": "שמנו טל על הדשא",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_09",
      "difficulty": "basic"
    },
    {
      "en": "The bicycle bell sounds friendly",
      "he": "פעמון האופניים נשמע ידידותי",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_10",
      "difficulty": "basic"
    },
    {
      "en": "Students sorted rocks by colour",
      "he": "תלמידים מיינו סלעים לפי צבע",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_11",
      "difficulty": "basic"
    },
    {
      "en": "Healthy snacks give us energy",
      "he": "חטיפים בריאים נותנים לנו אנרגיה",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_basic_12",
      "difficulty": "basic"
    },
    {
      "en": "Although the trail was slippery, we walked carefully",
      "he": "למרות שהשביל היה חלקלק, הלכנו בזהירות",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_01",
      "difficulty": "advanced"
    },
    {
      "en": "While the soup cooled, we set the table",
      "he": "בזמן שהמרק התקרר, ערכנו את השולחן",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_02",
      "difficulty": "advanced"
    },
    {
      "en": "Since morning, the wind has blown harder",
      "he": "מהבוקר הרוח נושבת חזק יותר",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_03",
      "difficulty": "advanced"
    },
    {
      "en": "We compared soil samples from two gardens",
      "he": "השווינו דוגמאות קרקע משתי גינות",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_04",
      "difficulty": "advanced"
    },
    {
      "en": "The engineer checked the bridge drawings twice",
      "he": "המהנדס בדק את שרטוטי הגשר פעמיים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_05",
      "difficulty": "advanced"
    },
    {
      "en": "Plastic litter harms birds near the shore",
      "he": "זבל פלסטיק פוגע בציפורים ליד החוף",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_06",
      "difficulty": "advanced"
    },
    {
      "en": "They predicted rain using a simple chart",
      "he": "הם חזו גשם בעזרת טבלה פשוטה",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_07",
      "difficulty": "advanced"
    },
    {
      "en": "Our group explained how compost helps plants",
      "he": "הקבוצה שלנו הסבירה איך קומפוסט עוזר לצמחים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_08",
      "difficulty": "advanced"
    },
    {
      "en": "She labeled each mineral with neat handwriting",
      "he": "היא תייגה כל מינרל בכתב יד מסודר",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_09",
      "difficulty": "advanced"
    },
    {
      "en": "We summarized the field trip in four sentences",
      "he": "סיכמנו את הטיול בשטח בארבע משפטים",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_10",
      "difficulty": "advanced"
    },
    {
      "en": "The museum guide answered curious questions",
      "he": "מדריך המוזיאון ענה על שאלות סקרניות",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_11",
      "difficulty": "advanced"
    },
    {
      "en": "Friendly neighbours shared tools after the storm",
      "he": "שכנים טובים חלקו כלים אחרי הסופה",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_adv_12",
      "difficulty": "advanced"
    },
    {
      "en": "Please tie your shoes tightly before PE",
      "he": "בבקשה קשרו את הנעליים לפני חינוך גופני",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_01",
      "difficulty": "basic"
    },
    {
      "en": "We recycle paper in the blue bin",
      "he": "אנחנו ממחזרים נייר בפח הכחול",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_02",
      "difficulty": "basic"
    },
    {
      "en": "The thermometer shows thirty degrees",
      "he": "מד החום מראה שלושים מעלות",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_03",
      "difficulty": "basic"
    },
    {
      "en": "Healthy teeth need brushing twice a day",
      "he": "שיניים בריאות צריכות צחצוח פעמיים ביום",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_04",
      "difficulty": "basic"
    },
    {
      "en": "Our team wrote clear safety rules",
      "he": "הקבוצה שלנו כתבה כללי בטיחות ברורים",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_05",
      "difficulty": "basic"
    },
    {
      "en": "Clouds moved quickly across the sky",
      "he": "עננים זזו במהירות על פני השמיים",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_06",
      "difficulty": "basic"
    },
    {
      "en": "She drew a careful map of the river",
      "he": "היא ציירה מפה זהירה של הנהר",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_07",
      "difficulty": "basic"
    },
    {
      "en": "We measured rainfall with a plastic bottle",
      "he": "מדדנו משקעים עם בקבוק פלסטיק",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_08",
      "difficulty": "basic"
    },
    {
      "en": "The forest trail felt quieter at dawn",
      "he": "שביל היער הרגיש שקט יותר בזריחה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_09",
      "difficulty": "basic"
    },
    {
      "en": "They sorted waste into three labelled bags",
      "he": "הם מיינו פסולת לשלוש שקיות מתויגות",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_10",
      "difficulty": "basic"
    },
    {
      "en": "Fresh vegetables arrived from local farms",
      "he": "ירקות טריים הגיעו מחוות מקומיות",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_11",
      "difficulty": "basic"
    },
    {
      "en": "Please wash fruit before you eat it",
      "he": "בבקשה שטפו פרי לפני שאוכלים אותו",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_basic_12",
      "difficulty": "basic"
    },
    {
      "en": "We compared two brands of reusable bottles",
      "he": "השווינו שני מותגים של בקבוקים לשימוש חוזר",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_01",
      "difficulty": "standard"
    },
    {
      "en": "The coach reminded us to stretch slowly",
      "he": "המאמן הזכיר לנו למתוח לאט",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_02",
      "difficulty": "standard"
    },
    {
      "en": "Students debated how to save electricity",
      "he": "תלמידים התווכחו איך לחסוך בחשמל",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_03",
      "difficulty": "standard"
    },
    {
      "en": "Our poster explained the water cycle clearly",
      "he": "הפוסטר שלנו הסביר את מחזור המים בבירור",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_04",
      "difficulty": "standard"
    },
    {
      "en": "They tested whether seeds grow faster in light",
      "he": "הם בדקו האם זרעים צומחים מהר יותר באור",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_05",
      "difficulty": "standard"
    },
    {
      "en": "The nurse showed how germs spread on hands",
      "he": "האחות הראתה איך חיידקים מתפשטים על ידיים",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_06",
      "difficulty": "standard"
    },
    {
      "en": "We summarized yesterday's lab in two paragraphs",
      "he": "סיכמנו את מעבדת אתמול בשני פסקאות",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_07",
      "difficulty": "standard"
    },
    {
      "en": "Wind turbines convert motion into electricity",
      "he": "טורבינות רוח הופכות תנועה לחשמל",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_08",
      "difficulty": "standard"
    },
    {
      "en": "Neighbours organized a weekend river cleanup",
      "he": "שכנים ארגנו ניקוי נהר בסוף השבוע",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_09",
      "difficulty": "standard"
    },
    {
      "en": "The librarian recommended a bilingual atlas",
      "he": "הספרנית המליצה על אטלס דולשוני",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_10",
      "difficulty": "standard"
    },
    {
      "en": "We estimated distance using map scale practice",
      "he": "הערכנו מרחק בעזרת תרגול קנה מידה במפה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_11",
      "difficulty": "standard"
    },
    {
      "en": "Our journal tracked moon phases for two weeks",
      "he": "היומן שלנו עקב אחרי שלבי הירח במשך שבועיים",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_std_12",
      "difficulty": "standard"
    },
    {
      "en": "Turn off lights when the classroom is empty",
      "he": "כבו אורות כשהכיתה ריקה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_01",
      "difficulty": "basic"
    },
    {
      "en": "We labeled each rock with its scratch test",
      "he": "תייגנו כל סלע עם מבחן השריטה שלו",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_02",
      "difficulty": "basic"
    },
    {
      "en": "Plants lose water through tiny leaf pores",
      "he": "צמחים מאבדים מים דרך נקבוביות עלים זעירות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_03",
      "difficulty": "basic"
    },
    {
      "en": "The digital scale showed grams precisely",
      "he": "מאזן דיגיטלי הראה גרמים בדיוק",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_04",
      "difficulty": "basic"
    },
    {
      "en": "Please rinse the beaker before the next trial",
      "he": "בבקשה שטפו את הביקר לפני הניסוי הבא",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_05",
      "difficulty": "basic"
    },
    {
      "en": "We summarized evidence from three reliable sites",
      "he": "סיכמנו ראיות משלושה אתרים אמינים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_06",
      "difficulty": "basic"
    },
    {
      "en": "Solar panels warm water on the roof",
      "he": "לוחות סולאריים מחממים מים על הגג",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_07",
      "difficulty": "basic"
    },
    {
      "en": "City planners study traffic near schools",
      "he": "מתכני ערים חוקרים תנועה ליד בתי ספר",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_08",
      "difficulty": "basic"
    },
    {
      "en": "Coastal waves shaped the cliffs slowly",
      "he": "גלים חופיים עיצבו את הצוקים לאט",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_09",
      "difficulty": "basic"
    },
    {
      "en": "Volunteers counted birds before sunrise",
      "he": "מתנדבים ספרו ציפורים לפני הזריחה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_10",
      "difficulty": "basic"
    },
    {
      "en": "Our sensor recorded temperature every minute",
      "he": "החיישן שלנו רישם טמפרטורה כל דקה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_11",
      "difficulty": "basic"
    },
    {
      "en": "They translated safety warnings for visitors",
      "he": "הם תרגמו אזהרות בטיחות למבקרים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_basic_12",
      "difficulty": "basic"
    },
    {
      "en": "Although budgets were tight, the council funded filters",
      "he": "למרות תקציבים צמודים, המועצה מימנה מסננים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_01",
      "difficulty": "standard"
    },
    {
      "en": "Researchers compared soil drainage after rainfall",
      "he": "חוקרים השוו ניקוז קרקע אחרי משקעים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_02",
      "difficulty": "standard"
    },
    {
      "en": "We debated whether drones could survey reefs safely",
      "he": "התווכחנו האם רחפנים יכולים לסקור שוניות בבטיחות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_03",
      "difficulty": "standard"
    },
    {
      "en": "The engineer justified wider sidewalks near clinics",
      "he": "המהנדס הצדיק מדרכות רחבות יותר ליד מרפאות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_04",
      "difficulty": "standard"
    },
    {
      "en": "Citizens proposed shading nets for playgrounds",
      "he": "אזרחים הציעו רשתות הצללה למגרשי משחקים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_05",
      "difficulty": "standard"
    },
    {
      "en": "Students modeled erosion with sand and water trays",
      "he": "תלמידים דימו סחיפה עם מגשי חול ומים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_06",
      "difficulty": "standard"
    },
    {
      "en": "Our podcast episode explained renewable incentives",
      "he": "פרק הפודקאסט שלנו הסביר תמריצים לאנרגיה מתחדשת",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_07",
      "difficulty": "standard"
    },
    {
      "en": "Meteorologists tracked humidity during the heatwave",
      "he": "מטאורולוגים עקבו אחרי לחות במהלך גל החום",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_08",
      "difficulty": "standard"
    },
    {
      "en": "We analyzed graphs showing seasonal storm counts",
      "he": "ניתחנו גרפים המראים ספירות סופות עונתיות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_09",
      "difficulty": "standard"
    },
    {
      "en": "Biologists tagged turtles to study migration routes",
      "he": "ביולוגים סימנו צבים כדי לחקור מסלולי נדידה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_10",
      "difficulty": "standard"
    },
    {
      "en": "Technicians calibrated probes before stream sampling",
      "he": "טכנאים כיילו חיישנים לפני דגימת הנחל",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_11",
      "difficulty": "standard"
    },
    {
      "en": "Neighbourhood councils compared flood simulations online",
      "he": "מועצות שכונה השוו סימולציות הצפה מקוונות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_std_12",
      "difficulty": "standard"
    },
    {
      "en": "We record weather symbols in a small chart",
      "he": "אנחנו רושמים סמלי מזג אוויר בטבלה קטנה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_std_x1",
      "difficulty": "standard"
    },
    {
      "en": "Please compare the length of two shadows at noon",
      "he": "בבקשה השוו את אורך שני צללים בצהריים",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_std_x2",
      "difficulty": "standard"
    },
    {
      "en": "They weigh seeds before planting them in soil",
      "he": "הם שוקלים זרעים לפני שזורעים אותם באדמה",
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "pcb_trans_g3_std_x3",
      "difficulty": "standard"
    },
    {
      "en": "Our science diary explains every step clearly",
      "he": "יומן המדע שלנו מסביר כל שלב בבירור",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_std_x1",
      "difficulty": "standard"
    },
    {
      "en": "We summarize observations without guessing results",
      "he": "אנחנו מסכמים תצפיות בלי לנחש תוצאות",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_std_x2",
      "difficulty": "standard"
    },
    {
      "en": "Please rinse tools before the next measurement",
      "he": "בבקשה שטפו כלים לפני המדידה הבאה",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_std_x3",
      "difficulty": "standard"
    },
    {
      "en": "Citizens discussed quieter buses near schools",
      "he": "אזרחים דנו על אוטובוסים שקטים יותר ליד בתי ספר",
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "pcb_trans_g4_std_x4",
      "difficulty": "standard"
    },
    {
      "en": "Engineers tested safer crossings after traffic counts",
      "he": "מהנדסים בדקו מעברים בטוחים יותר אחרי ספירות תנועה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_adv_x1",
      "difficulty": "advanced"
    },
    {
      "en": "Volunteers mapped flooding risks before winter rains",
      "he": "מתנדבים מיפו סיכוני הצפה לפני גשמי חורף",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_adv_x2",
      "difficulty": "advanced"
    },
    {
      "en": "Students debated fair rules for sharing lab laptops",
      "he": "תלמידים התווכחו על כללים הוגנים לחלוקת מחשבי מעבדה",
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "pcb_trans_g5_adv_x3",
      "difficulty": "advanced"
    },
    {
      "en": "Urban planners compared flood simulations across districts",
      "he": "מתכני ערים השוו סימולציות הצפה בין רובעים",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_adv_x1",
      "difficulty": "advanced"
    },
    {
      "en": "Researchers calibrated probes minutes before high tide",
      "he": "חוקרים כיילו חיישנים דקות לפני גאות גבוהה",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_adv_x2",
      "difficulty": "advanced"
    },
    {
      "en": "Citizen scientists verified algae alerts using handheld kits",
      "he": "מדעני אזרחים אמתו התראות אצות בעזרת ערכות ידניות",
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "pcb_trans_g6_adv_x3",
      "difficulty": "advanced"
    }
  ],
  "simulator_translation_mcq": [
    {
      "minGrade": 2,
      "maxGrade": 2,
      "patternFamily": "translation_mcq_g2_matrix",
      "question": "מה התרגום הנכון למשפט: \"She has a red bag\"?",
      "options": [
        "יש לה תיק אדום",
        "יש לה תיק כחול",
        "היא רואה תיק ירוק",
        "היא שוכחת את התיק"
      ],
      "correct": "יש לה תיק אדום",
      "explanation": "She has - יש לה; red bag - תיק אדום.",
      "difficulty": "basic",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "translation_error",
        "vocabulary_confusion",
        "reading_comprehension_error"
      ],
      "skillId": "translation_mcq_g2_matrix",
      "subtype": "simulator_translation_mcq"
    },
    {
      "minGrade": 3,
      "maxGrade": 3,
      "patternFamily": "translation_mcq_g3_matrix",
      "question": "מה התרגום הנכון למשפט: \"We eat lunch at school every day\"?",
      "options": [
        "אנחנו אוכלים ארוחת צהריים בבית הספר כל יום",
        "אנחנו שוכחים ארוחת צהריים בבית הספר",
        "אנחנו קונים ארוחת צהריים רק בסופי שבוע",
        "אנחנו לא אוכלים בבית הספר מעולם"
      ],
      "correct": "אנחנו אוכלים ארוחת צהריים בבית הספר כל יום",
      "explanation": "משפט שגרתי בהווה - כל יום מציין תדירות.",
      "difficulty": "standard",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "translation_error",
        "vocabulary_confusion",
        "reading_comprehension_error"
      ],
      "skillId": "translation_mcq_g3_matrix",
      "subtype": "simulator_translation_mcq"
    },
    {
      "minGrade": 4,
      "maxGrade": 4,
      "patternFamily": "translation_mcq_g4_matrix",
      "question": "מה התרגום הנכון למשפט: \"Turn off the light when you leave the room\"?",
      "options": [
        "כבו את האור כשאתם יוצאים מהחדר",
        "הדליקו את האור כשאתם נכנסים לחדר",
        "השאירו את האור דולק תמיד",
        "סגרו את החלון כשאתם יוצאים מהחדר"
      ],
      "correct": "כבו את האור כשאתם יוצאים מהחדר",
      "explanation": "משפט הוראה - לכבות את האור בעת יציאה מהחדר.",
      "difficulty": "standard",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "translation_error",
        "vocabulary_confusion",
        "reading_comprehension_error"
      ],
      "skillId": "translation_mcq_g4_matrix",
      "subtype": "simulator_translation_mcq"
    },
    {
      "minGrade": 5,
      "maxGrade": 5,
      "patternFamily": "translation_mcq_g5_matrix",
      "question": "מה התרגום הנכון למשפט: \"The teacher explained the new topic slowly\"?",
      "options": [
        "המורה הסבירה את הנושא החדש לאט",
        "המורה שכחה את הנושא החדש",
        "המורה רצה מהר בלי להסביר",
        "התלמידים הסבירו למורה את הנושא"
      ],
      "correct": "המורה הסבירה את הנושא החדש לאט",
      "explanation": "explained - הסבירה; slowly - לאט.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "translation_error",
        "vocabulary_confusion",
        "reading_comprehension_error"
      ],
      "skillId": "translation_mcq_g5_matrix",
      "subtype": "simulator_translation_mcq"
    },
    {
      "minGrade": 6,
      "maxGrade": 6,
      "patternFamily": "translation_mcq_g6_matrix",
      "question": "מה התרגום הנכון למשפט: \"Clean energy can help protect our planet\"?",
      "options": [
        "אנרגיה נקייה יכולה לעזור להגן על כדור הארץ שלנו",
        "אנרגיה נקייה תמיד מזיקה לכדור הארץ",
        "כדור הארץ לא צריך הגנה כלל",
        "אנחנו לא יכולים להגן על הסביבה בעתיד"
      ],
      "correct": "אנרגיה נקייה יכולה לעזור להגן על כדור הארץ שלנו",
      "explanation": "clean energy - אנרגיה נקייה; protect our planet - להגן על כדור הארץ.",
      "difficulty": "advanced",
      "cognitiveLevel": "application",
      "expectedErrorTypes": [
        "translation_error",
        "vocabulary_confusion",
        "reading_comprehension_error"
      ],
      "skillId": "translation_mcq_g6_matrix",
      "subtype": "simulator_translation_mcq"
    }
  ]
};

for (const [poolKey, rows] of Object.entries(TRANSLATION_POOLS_PHASE_B)) {
  if (!TRANSLATION_POOLS[poolKey]) TRANSLATION_POOLS[poolKey] = [];
  TRANSLATION_POOLS[poolKey].push(...rows);
}
