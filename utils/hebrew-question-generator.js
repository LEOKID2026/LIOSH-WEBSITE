import { GRADES, BLANK, TOPICS, GRADE_LEVELS } from './hebrew-constants.js';
import { filterRichHebrewPool } from './hebrew-rich-question-bank.js';
import { filterHebrewPoolByBookPage } from './hebrew-book-practice-filter.js';
import {
  inferHebrewLegacyMeta,
  scopeHebrewStemForGrade,
  stripHebrewQuestionPedagogicalLeadIn,
} from './hebrew-legacy-metadata.js';
import { sanitizeQuestionForStudentDisplay } from './student-question-stem-sanitizer.js';
import {
  withG1SubtopicPreference,
  attachG1SubtopicParams,
  resolveG1ItemSubtopicId,
} from './hebrew-g1-subtopic.js';
import {
  withG2SubtopicPreference,
  attachG2SubtopicParams,
  resolveG2ItemSubtopicId,
} from './hebrew-g2-subtopic.js';
import {
  withUpperGradeSubtopicPreference,
  attachUpperGradeSubtopicParams,
} from './hebrew-g3456-subtopic.js';
import { pickDiagnosticContractFields } from './diagnostic-question-contract.js';
import { attachCanonicalMetadataToHebrewQuestion } from '../lib/learning/hebrew-canonical-metadata.js';
import { repairMcqObviousAnswerContent } from './mcq-fail-content-repair.js';
import { ensureMcqFourOptions } from './mcq-four-options.js';
import {
  isHebrewReadAloudCopyLeakRaw,
  isLowerGradeG1G2Key,
} from './lower-grade-practice-runtime-quality.js';
import {
  dedupeMcqOptionsInPlace,
  rebalanceGenericHebrewReadingDistractors,
} from './question-quality.js';
import { hebrewStemNorm, hebrewQuestionFingerprint } from './hebrew-learning-intel.js';
import * as g3ReadingBankMod from '../data/hebrew-g3-reading-bank.js';
import { resolveModuleExport } from './resolve-module-export.js';

const G3_READING_EASY = resolveModuleExport(g3ReadingBankMod, 'G3_READING_EASY');
const G3_READING_MEDIUM_BANK = resolveModuleExport(g3ReadingBankMod, 'G3_READING_MEDIUM');
const G3_READING_HARD = resolveModuleExport(g3ReadingBankMod, 'G3_READING_HARD');

/** Layer 3: typing רק לפריטים עם preferredAnswerMode + תת נושא מאושר (א׳–ב׳). */
const G12_ALLOWED_TYPING_SUBTOPICS = new Set([
  "g1.spell_word_choice",
  "g1.copy_word",
  "g2.sentence_wellformed",
  "g2.punctuation_choice",
]);

// ========== מאגר שאלות לפי כיתה ורמה ==========
// הקובץ כולל מאות שאלות מותאמות לכל כיתה (א'-ו'), רמה (קל/בינוני/קשה) ונושא

// ========== כיתה א' ==========
const G1_EASY_QUESTIONS = {
  reading: [
    { question: "מה האות הראשונה במילה 'בית'?", answers: ["ב", "ת", "י", "ה"], correct: 0 },
    { question: "מה האות האחרונה במילה 'כלב'?", answers: ["כ", "ל", "ב", "ה"], correct: 2 },
    {
      question: "במילה 'שמש' - איזה צליל (אות) חוזר פעמיים?",
      answers: ["ש", "מ", "ס", "ה"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    { question: "מה המילה הנכונה: ב___ת?", answers: ["בית", "בת", "בתת", "בבית"], correct: 0 },
    { question: "מה המילה הנכונה: כ___ב?", answers: ["כלב", "כבל", "כלוב", "קלב"], correct: 0 },
    { question: "איזה אות חסרה: ש_ש?", answers: ["מ", "ב", "ת", "כ"], correct: 0 },
    { question: "מה האות הראשונה במילה 'אמא'?", answers: ["א", "מ", "ב", "ה"], correct: 0 },
    { question: "מה המילה הנכונה: י_ד?", answers: ["ילד", "יילד", "ילת", "ילג"], correct: 0 },
    { question: "קרא את המילה: 'ספר'", answers: ["ספר", "ספור", "סבר", "ספיר"], correct: 0 },
    { question: "מה המילה הנכונה: ת_פוח?", answers: ["תפוח", "טפוח", "תבוח", "תיפוח"], correct: 0 },
    { question: "מה האות הראשונה במילה 'אבא'?", answers: ["א", "ב", "מ", "ה"], correct: 0 },
    { question: "מה המילה הנכונה: כ_סה?", answers: ["כיסא", "כיסע", "קיסא", "כיסאי"], correct: 0 },
    { question: "קרא את המילה: 'מים'", answers: ["מים", "ממים", "מיים", "מימ"], correct: 0 },
    { question: "מה המילה הנכונה: ש_לחן?", answers: ["שולחן", "שלחן", "שולחנ", "שלחנ"], correct: 0 },
    { question: "איזה אות חסרה: א_ת?", answers: ["מ", "ב", "ת", "כ"], correct: 0 },
    { question: "מה האות האחרונה במילה 'עץ'?", answers: ["ע", "ץ", "י", "ה"], correct: 1 },
    { question: "קרא את המילה: 'יונה'", answers: ["יונה", "יונא", "יונע", "יונב"], correct: 0 },
    { question: "מה המילה הנכונה: כ_תב?", answers: ["כתב", "כטב", "קתב", "חתב"], correct: 0 },
    { question: "מה האות הראשונה במילה 'גן'?", answers: ["ג", "ן", "י", "ה"], correct: 0 },
    { question: "קרא את המילה: 'דג'", answers: ["דג", "דגג", "דק", "דב"], correct: 0 },
    {
      question: "במילה 'מים' - איזה צליל חוזר פעמיים?",
      answers: ["מ", "י", "ם", "ה"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'אבא' - ההברה הראשונה (א-) היא פתוחה או סגורה?",
      answers: ["פתוחה", "סגורה", "אין הברות", "לא יודעים"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'אבא'?",
      answers: ["סבא", "ספר", "בית", "ילד"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'כיתה'?",
      answers: ["2", "1", "3", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'בַּיִת'",
      answers: ["בית", "בת", "בני", "ביש"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'דג' - באיזה צליל המילה מתחילה?",
      answers: ["ד", "ג", "דג", "גד"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'ארנב'",
      answers: ["ארנב", "ערנב", "ארנף", "אורנב"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'פרח'",
      answers: ["פרח", "פרך", "פראח", "פחר"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "במילה 'שלום' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ם", "ש", "ל", "ו"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "במילה 'כן' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ן", "כ", "נ", "ה"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "במילה 'יום' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ם", "י", "ו", "מ"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "מה האות השנייה במילה 'שמש'?",
      answers: ["מ", "ש", "ס", "ה"],
      correct: 0,
      subtopicId: "g1.letters",
    },
    {
      question: "מה האות האמצעית במילה 'אמא'?",
      answers: ["מ", "א", "ה", "ב"],
      correct: 0,
      subtopicId: "g1.letters",
    },
    {
      question: "במילה 'תות' - איזה צליל חוזר פעמיים?",
      answers: ["ת", "ו", "ס", "ה"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'בובה' - איזה צליל חוזר פעמיים?",
      answers: ["ב", "ו", "ה", "א"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'כיתה' - ההברה הראשונה 'כי' היא פתוחה או סגורה?",
      answers: ["פתוחה", "סגורה", "אין הברות", "לא יודעים"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "במילה 'אבא' - ההברה השנייה (בא-) היא פתוחה או סגורה?",
      answers: ["סגורה", "פתוחה", "אין הברות", "לא יודעים"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'גן'?",
      answers: ["חן", "בית", "סוס", "עץ"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "איזו מילה חורזת עם 'בית'?",
      answers: ["דלת", "חלון", "ספר", "ילד"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'מורה'?",
      answers: ["2", "1", "3", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "כמה הברות יש במילה 'פרח'?",
      answers: ["2", "1", "3", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'חָלוֹם'",
      answers: ["חלום", "חלמון", "חול", "חליל"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "קרא את המילה המנוקדת: 'שָׁמַיִם'",
      answers: ["שמיים", "שמים", "שמיין", "שימיים"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'צבע' - באיזה צליל המילה מתחילה?",
      answers: ["צ", "ב", "ע", "צב"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "במילה 'פרח' - באיזה צליל המילה מתחילה?",
      answers: ["פ", "ר", "ח", "פר"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'מפתח'",
      answers: ["מפתח", "מפטח", "מפתיח", "טפתח"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'חלון'",
      answers: ["חלון", "חלונ", "חילון", "חלאון"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'מעיל'",
      answers: ["מעיל", "מאיל", "מעילל", "מעייל"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "בחרו מילה שמתארת בעל חיים שחי במים:",
      answers: ["דג", "עץ", "שולחן", "ענן"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
      patternFamily: "g1_read_category_animal",
      subtype: "water_animal",
    },
    {
      question: "במילה 'אָרוֹן' - איזו אות סופית מופיעה בסוף המילה?",
      answers: ["ן", "נ", "ם", "ך"],
      correct: 0,
      subtopicId: "g1.final_letters",
      patternFamily: "g1_final_in_vocalized_word",
      subtype: "final_nun",
    },
    {
      question: "במילה 'יָד' - איזו אות סופית כותבים בסוף?",
      answers: ["ד", "י", "ה", "ת"],
      correct: 0,
      subtopicId: "g1.final_letters",
      patternFamily: "g1_final_letter_context",
      subtype: "not_final_form",
    },
    {
      question: "איזו מילה חורזת עם 'שֶׁמֶשׁ'?",
      answers: ["קֶרֶשׁ", "בית", "גן", "עץ"],
      correct: 0,
      subtopicId: "g1.rhyme",
      patternFamily: "g1_rhyme_stress_pattern",
      subtype: "eh_esh",
    },
    {
      question: "איזו מילה חורזת עם 'חַלּוֹן'?",
      answers: ["כַּרְטוֹן", "ספר", "מים", "בוקר"],
      correct: 0,
      subtopicId: "g1.rhyme",
      patternFamily: "g1_rhyme_on_suffix",
      subtype: "on_rhyme",
    },
    {
      question: "במילה 'פִּנָה' - ההברה הראשונה פתוחה או סגורה?",
      answers: ["סגורה", "פתוחה", "שתיהן", "אין הברות"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
      patternFamily: "g1_syllable_first_closed",
      subtype: "closed_pi",
    },
    {
      question: "קרא את המילה המנוקדת: 'גָּן'",
      answers: ["גן", "גנן", "גאן", "גין"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
      patternFamily: "g1_niqqud_short_word",
      subtype: "kamatz_gan",
    },
    {
      question: "קרא את המילה המנוקדת: 'עֵץ'",
      answers: ["עץ", "אץ", "עת", "עצץ"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
      patternFamily: "g1_niqqud_short_word",
      subtype: "tzere_etz",
    },
    {
      question: "כמה הברות יש במילה 'מַחְבֵּרֶת'?",
      answers: ["3", "2", "4", "1"],
      correct: 0,
      subtopicId: "g1.syllables",
      patternFamily: "g1_syllable_count_longer",
      subtype: "three_syllables",
    },
    {
      question: "במילה 'כּוֹבַע' - באיזה צליל המילה מתחילה?",
      answers: ["כ", "ב", "ע", "כב"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
      patternFamily: "g1_onset_kova",
      subtype: "initial_kaf",
    },
  ],
  comprehension: [
    { question: "איפה בדרך כלל ישנים בלילה?", answers: ["בבית", "על גג בית הספר", "בתוך הספר", "במים"], correct: 0 },
    { question: "איזו חיה נוהמת לפעמים ורצה בחוץ?", answers: ["כלב", "שולחן", "ענן", "עפרון"], correct: 0 },
    { question: "מה ההפך של 'גדול'?", answers: ["קטן", "צבעוני", "יפה", "חכם"], correct: 0 },
    { question: "מי דואגת לנו הרבה בבית ואפשר לקרוא לה 'אמא'?", answers: ["אמא", "אבא", "אח", "סבא"], correct: 0 },
    {
      question: "במשפט ׳המכונית אדומה׳ - מה המילה ׳אדום׳ מתארת?",
      answers: ["צבע של המכונית", "מספר המכונית", "שם הרחוב", "גודל המנוע"],
      correct: 0,
      subtopicId: "g1.word_meaning_concrete",
    },
    { question: "מה ההפך של 'חם'?", answers: ["קר", "רך", "יבש", "צל"], correct: 0 },
    { question: "מי הולך לבית הספר ולומד שם?", answers: ["ילד או ילדה", "מורה בלבד", "שולחן", "ספר"], correct: 0 },
    { question: "מה ההפך של 'שמח'?", answers: ["עצוב", "שמח", "יפה", "גדול"], correct: 0 },
    { question: "מה קוראים לדבר שקוראים ממנו סיפורים?", answers: ["ספר", "עפרון", "שולחן", "כיסא"], correct: 0 },
    { question: "מה ההפך של 'יום'?", answers: ["לילה", "בוקר", "ערב", "צהריים"], correct: 0 },
    { question: "מה טוב לשתות כשצמאים?", answers: ["מים", "אש", "רוח", "אדמה"], correct: 0 },
    { question: "מה ההפך של 'למעלה'?", answers: ["למטה", "ימינה", "שמאלה", "קדימה"], correct: 0 },
    { question: "איפה לעיתים רואים ענפים ועלים גבוהים?", answers: ["על עץ", "במחברת", "בסיר", "בנעליים"], correct: 0 },
    { question: "מה ההפך של 'פתוח'?", answers: ["סגור", "גדול", "קטן", "גבוה"], correct: 0 },
    { question: "מה מאיר לנו ביום בהיר בשמיים?", answers: ["השמש", "הירח המלא", "כוכב בלבד ביום", "ענן סופה"], correct: 0 },
    { question: "מה ההפך של 'חושך'?", answers: ["אור", "צל", "ערפל", "ענן"], correct: 0 },
    { question: "איזו חיה יכולה לעוף ולרדת לחלון?", answers: ["יונה", "חתול", "כלב", "דג"], correct: 0 },
    { question: "מה ההפך של 'ראשון'?", answers: ["אחרון", "שני", "שלישי", "רביעי"], correct: 0 },
    {
      question: "מי אוהב לאכול גזר בדרך כלל?",
      answers: ["ארנב", "ספר", "שולחן", "עץ"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "סמנו לפי ההוראה: איזו מילה מתארת משהו שקורה כשמתחיל לרדת גשם?",
      answers: ["טיפות", "שמש", "שלג יבש", "קיץ חם"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
      patternFamily: "g1_instruction_weather_lex",
      subtype: "raindrops",
    },
    {
      question: "מדוע כדאי לחבוש כובע כשקר בחוץ?",
      answers: ["כדי לשמור על חום בראש", "כדי שהכובע יישן", "כדי שהשמיים ייעלמו", "כדי שהספר יישבר"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
      patternFamily: "g1_why_hat",
      subtype: "cause_warmth",
    },
    {
      question: "מה רואים בשמים ביום בהיר?",
      answers: ["שמש", "ירח מלא", "כוכבים בלבד", "ענן סופה"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "סמנו לפי ההוראה: איזו מילה מתארת מזג חם?",
      answers: ["שמש", "שלג", "גשם קר", "רוח סערה"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "ענו לפי ההוראה: סמנו את המילה שמתאימה ללילה.",
      answers: ["ירח", "שמש", "בוקר", "צהריים"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "למה חשוב לסגור את הדלת כשיוצאים מהכיתה בחורף?",
      answers: ["כדי שלא יכנס קור", "כדי שהשמש תיכנס יותר", "כדי שהספר יישן", "כדי שהמורה תיעלם"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "מי בדרך כלל מסדר את השיעור בכיתה?",
      answers: ["המורה", "השולחן", "המחק", "החלון"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "סמנו לפי ההוראה: איזו מילה מתארת משהו מתוק לאכול?",
      answers: ["עוגה", "מלח", "פלסטיק", "אבן"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "ענו לפי ההוראה: סמנו את החיה שחיה מתחת למים.",
      answers: ["דג", "חתול", "ציפור", "ארנב"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "מה קורה לפרח אם לא משקים אותו זמן רב?",
      answers: ["הוא נובל", "הוא גדל מאוד מהר", "הוא הופך לספר", "הוא נהיה כיסא"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
  ],
  writing: [
    {
      question: "יש לנו מקום לגור בו עם דלת וחלונות - במילה אחת, איך נכתוב את שם המקום?",
      answers: ["בית", "באת", "ביית", "ביט"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_home",
      subtype: "context_not_shown",
    },
    {
      question: "השלימו במשפט: ׳א___ ואמא באים לאסוף אותי.׳",
      answers: ["אבא", "אבבא", "אבה", "אב"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_cloze_family",
      subtype: "aba",
    },
    {
      question: "מי מבשלת לפעמים, מנחמת ואוהבת מאוד? בחרו איות למילה שמתארת את התפקיד המשפחתי:",
      answers: ["אמא", "אמה", "אימא", "אמאה"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_mother",
      subtype: "family_role",
    },
    {
      question: "לפני בית הספר, ילדים קטנים משחקים לפעמים ב___ .",
      answers: ["גן", "גנ", "גין", "גגן"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_cloze_gan",
      subtype: "place_school",
    },
    {
      question: "חיה שמנבחת לפעמים ויש לה זנב - במילה אחת, איך נכתוב את שם החיה?",
      answers: ["כלב", "כבל", "כלוב", "קלב"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_riddle_animal",
      subtype: "dog",
    },
    {
      question: "מה מאיר לנו ביום בהיר בשמיים? בחרו את האיות הנכון למילה שמתארת את זה:",
      answers: ["שמש", "שמס", "שימש", "שמיש"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_sun",
      subtype: "concept_then_spell",
    },
    {
      question: "יש בו עופרת וכותבים איתו על הדף - בחרו איות נכון לשם החפץ:",
      answers: ["עפרון", "אפרון", "עפורון", "עפרנ"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_riddle_object",
      subtype: "pencil",
    },
    {
      question: "ישבתי בכיתה על ___ יציב.",
      answers: ["כיסא", "כיסע", "קיסא", "כיסאי"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_cloze_chair",
      subtype: "furniture",
    },
    {
      question: "מי מסבירה ליד הלוח ועוזרת לנו ללמוד? בחרו איות למילה שמתארת את התפקיד:",
      answers: ["מורה", "מורא", "מוורה", "מורי"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_teacher",
      subtype: "role",
    },
    {
      question: "אוכלים עליו לפעמים או כותבים עליו בכיתה - בחרו איות למילה שמתארת את הרהיט הארוך:",
      answers: ["שולחן", "שלחן", "שולחנ", "שלחנ"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_table",
      subtype: "furniture",
    },
    {
      question: "פרי עגול ואדום לפעמים - בחרו איות נכון לשם הפרי:",
      answers: ["תפוח", "טפוח", "תבוח", "תיפוח"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_riddle_food",
      subtype: "apple",
    },
    {
      question: "בכיתה רואים דרכו החוצה - בחרו איות למילה שמתארת את הפתח המואר:",
      answers: ["חלון", "חלונ", "חילון", "חלאון"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_window",
      subtype: "classroom",
    },
    {
      question: "קוראים ממנו סיפורים - בחרו איות למילה שמתארת את החפץ:",
      answers: ["ספר", "ספור", "סבר", "ספיר"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_book",
      subtype: "object",
    },
    {
      question: "בחרו איות נכון למילה (רק צורת כתיב):",
      answers: ["מחברת", "מחברט", "מחבורת", "מחבת"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_writing_spell_notebook",
      subtype: "machberet",
    },
    {
      question: "המילה מופיעה כאן: ׳ספר׳ - הקלידו בדיוק את המילה (בלי רווחים מיותרים):",
      answers: ["ספר", "ספור", "סבר", "ספיר"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_copy_typing_book",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["ספר"],
      maxTypingChars: 8,
    },
    {
      question: "המילה מופיעה כאן: ׳בית׳ - הקלידו בדיוק את המילה:",
      answers: ["בית", "באת", "ביית", "ביט"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_copy_typing_home",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["בית"],
      maxTypingChars: 8,
    },
    {
      question: "המילה מופיעה כאן: ׳אמא׳ - הקלידו בדיוק את המילה:",
      answers: ["אמא", "אמה", "אימא", "אמאה"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_copy_typing_ima",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["אמא", "אימא"],
      maxTypingChars: 8,
    },
    {
      question: "מי משחק איתי ואוהב אותי? בחרו איות למילה שמתארת את הקשר:",
      answers: ["חבר", "חביר", "חברר", "חבור"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_friend",
      subtype: "social",
    },
    {
      question: "השלימו איות: אני או_ה מים.",
      answers: ["אוהב", "אוהבב", "אוהוב", "אוהבא"],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_cloze_ahav",
      subtype: "ohev_water",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["אוהב"],
      maxTypingChars: 8,
    },
  ],
  grammar: [
    { question: "מה חלק הדיבר של המילה 'בית'?", answers: ["שם עצם", "פועל", "תואר", "מספר"], correct: 0, patternFamily: "g1_grammar_pos_label", subtopicId: "g1.grammar_pos_roles" },
    { question: "במשפט ׳הילד אוכל תפוח׳ - איזו מילה היא הפועל?", answers: ["אוכל", "הילד", "תפוח", "המשפט"], correct: 0, patternFamily: "g1_grammar_pick_verb", subtopicId: "g1.grammar_pos_roles" },
    { question: "במשפט ׳הפרחים צבעוניים׳ - איזו מילה היא התואר?", answers: ["צבעוניים", "הפרחים", "פרחים", "הפרח"], correct: 0, patternFamily: "g1_grammar_pick_adj", subtopicId: "g1.grammar_pos_roles" },
    { question: "במשפט ׳הוא רץ מהר׳ - איך נקראת המילה 'מהר'?", answers: ["תואר (איך)", "שם עצם", "פועל", "מילת שאלה"], correct: 0, patternFamily: "g1_grammar_pos_manner", subtopicId: "g1.grammar_pos_roles" },
    { question: "בחרו משפט תקין על הכלב ופועל ׳רץ׳:", answers: ["הכלב רץ", "הכלב רצים", "הכלב רצה", "כלבים רץ"], correct: 0, patternFamily: "g1_grammar_subject_verb_animal", subtopicId: "g1.grammar_agreement_light" },
    { question: "איזה ניסוח מתאים לגוף ולמין (ילד/ילדה)?", answers: ["הילד רץ", "הילד רצים", "הילדה רץ", "הילדים רץ"], correct: 0, patternFamily: "g1_grammar_gender_agreement_short", subtopicId: "g1.grammar_agreement_light" },
    { question: "בחרו משפט תקין - חתול ופועל ׳ישן׳:", answers: ["החתול ישן", "החתול ישנה", "חתולים ישן", "החתול ישנים"], correct: 0, patternFamily: "g1_grammar_subject_verb_cat", subtopicId: "g1.grammar_agreement_light" },
    { question: "מה המשפט התקין לגבי דג ופועל ׳שוחה׳?", answers: ["הדג שוחה", "הדג שוחים", "דגים שוחה", "הדג שוחות"], correct: 0, patternFamily: "g1_grammar_subject_verb_fish", subtopicId: "g1.grammar_agreement_light" },
    { question: "איזה משפט לא תקין?", answers: ["אני קורא ספר", "אוכל הילד תפוח", "אמא מבשלת מרק", "הכלב רץ בחצר"], correct: 1, patternFamily: "g1_grammar_illformed_pick", subtopicId: "g1.grammar_wellformed" },
    { question: "בחרו מילה שמשלימה: בבוקר אני ___ קורא.", answers: ["תמיד", "שולחן", "רץ", "במים"], correct: 0, patternFamily: "g1_grammar_cloze_adverb", subtopicId: "g1.grammar_cloze_deixis" },
    { question: "איזו מילה לא שייכת לקבוצה?", answers: ["כיסא", "תפוח", "בננה", "אבטיח"], correct: 0, patternFamily: "g1_grammar_odd_one_out", subtopicId: "g1.grammar_odd_category" },
    { question: "איזה משפט עם סדר מילים תקין?", answers: ["אני אוהב בית ספר", "ספר בית אני אוהב", "אוהב ספר אני בית", "בית אוהב אני ספר"], correct: 0, patternFamily: "g1_grammar_word_order", subtopicId: "g1.grammar_word_order" },
    { question: "איזה משפט מסתיים בסימן הנכון בסוף?", answers: ["היום חם.", "היום חם?", "היום חם", "היום .חם"], correct: 0, patternFamily: "g1_grammar_sentence_punct_end", subtopicId: "g1.grammar_punctuation" },
    { question: "איזה משפט שאלה נכון?", answers: ["איפה הספר?", "איפה הספר.", "איפה הספר", "איפה ?הספר"], correct: 0, patternFamily: "g1_grammar_question_mark", subtopicId: "g1.grammar_punctuation" },
    { question: "איזה משפט לא מתאים לרבים?", answers: ["שני ילדים ישן", "שני ילדים ישנים", "הילד ישן", "הילדים ישנים"], correct: 0, patternFamily: "g1_grammar_plural_agreement_bad", subtopicId: "g1.grammar_agreement_light" },
    { question: "בחרו צמד מילים מתאים:", answers: ["ילד קטן", "ילד רץ לאט", "ילד שולחן", "ילד במים"], correct: 0, patternFamily: "g1_grammar_noun_adj_pair", subtopicId: "g1.grammar_agreement_light" },
    { question: "בחרו משפט תקין:", answers: ["הילדים משחקים בחצר", "הילדים משחק בחצר", "הילד משחקים בחצר", "הילדים משחקים חצר"], correct: 0, patternFamily: "g1_grammar_plural_verb_play", subtopicId: "g1.grammar_agreement_light" },
    { question: "מי מתאים לשאלה: ׳מי בא לכיתה?׳", answers: ["המורה", "מהר", "בשקט", "למה"], correct: 0, patternFamily: "g1_grammar_wh_answer_fit", subtopicId: "g1.grammar_connectors_time" },
    { question: "במשפט ׳אמא מבשלת מרק׳ - איזו מילה היא הפועל?", answers: ["מבשלת", "אמא", "מרק", "המשפט"], correct: 0, patternFamily: "g1_grammar_pick_verb_cook", subtopicId: "g1.grammar_pos_roles" },
    { question: "בחרו משפט עם ׳ו׳ חיבור נכון:", answers: ["אמא ואבא", "אמא אבא", "אמא עם ואבא", "ואמא אבא"], correct: 0, patternFamily: "g1_grammar_conjunction_and", subtopicId: "g1.grammar_connectors_time" },
    { question: "בחרו משפט תקין לנקבה:", answers: ["הילדה קוראת", "הילדה קוראים", "הילד קוראת", "הילדות קורא"], correct: 0, patternFamily: "g1_grammar_fem_singular_verb", subtopicId: "g1.grammar_agreement_light" },
    { question: "בחרו משפט תקין לעתיד:", answers: ["מחר אני אלך לגן", "מחר אני הלכתי לגן", "מחר אני הולך אתמול", "מחר אני לגן אתמול"], correct: 0, patternFamily: "g1_grammar_future_basic", subtopicId: "g1.grammar_connectors_time" },
    { question: "בחרו משפט עם שלילה נכונה:", answers: ["אני לא רוצה לשתות", "אני לא רוצה שתות", "אני לא רוצה שותה", "אני לא רוצה שתייה לא"], correct: 0, patternFamily: "g1_grammar_negation_want", subtopicId: "g1.grammar_wellformed" },
    { question: "בחרו משפט תקין אחרי שינה:", answers: ["בבוקר אני מתעורר מהשינה", "בבוקר אני מתעוררים מהשינה", "בבוקר אני מתעוררת מהשינה לשולחן", "בבוקר מתעורר אני שינה"], correct: 0, patternFamily: "g1_grammar_morning_wake", subtopicId: "g1.grammar_agreement_light" },
    { question: "בחרו משפט תקין:", answers: ["בכיתה ישבנו בשקט", "בכיתה ישבנו הספר בשקט", "בכיתה שולחן בשקט", "בשקט ישבנו בכיתה הספר"], correct: 0, patternFamily: "g1_grammar_classroom_sentence", subtopicId: "g1.grammar_wellformed" },
    { question: "דני ויוסי ___ בגן.", answers: ["משחקים", "משחק", "משחקת", "משחקות"], correct: 0, patternFamily: "g1_grammar_dual_subject_plural", subtopicId: "g1.grammar_agreement_light" },
    { question: "המילה ׳ילדים׳ מציינת:", answers: ["רבים", "יחיד", "תואר", "זמן"], correct: 0, patternFamily: "g1_grammar_plural_meaning", subtopicId: "g1.grammar_pos_roles" },
    { question: "בחרו משפט תקין:", answers: ["אני שותה מים", "אני שותים מים", "אני שותה המים שולחן", "אני שותים אתמול מים"], correct: 0, patternFamily: "g1_grammar_drink_agreement", subtopicId: "g1.grammar_agreement_light" },
    { question: "איזה משפט מתאר היום (לא אתמול ולא מחר)?", answers: ["עכשיו אני כותב", "אתמול אני כותב", "מחר אני כותב", "לעולם לא אני כותב"], correct: 0, patternFamily: "g1_grammar_present_time", subtopicId: "g1.grammar_connectors_time" },
  ],
  vocabulary: [
    { question: "איפה שמים לפעמים צלחת או ספר בשיעור הבית?", answers: ["על השולחן", "במים", "בשמיים", "בנעל"], correct: 0 },
    { question: "על מה יושבים בכיתה?", answers: ["על כיסא", "על ענן", "על מים", "על כובע"], correct: 0 },
    { question: "איפה רואים לפעמים שמיים ועצים מבעד?", answers: ["בחלון", "במחברת", "במקרר", "בנעליים"], correct: 0 },
    { question: "מה פותחים כשנכנסים לחדר?", answers: ["דלת", "ענן", "מחברת", "סיר"], correct: 0 },
    { question: "במה קוראים סיפורים?", answers: ["בספר", "בעפרון", "במחק", "במדפסת"], correct: 0 },
    { question: "במה כותבים על הדף?", answers: ["בעיפרון", "במים", "בשולחן", "בענן"], correct: 0 },
    { question: "איפה לומדים עם המורה והחברים?", answers: ["בכיתה", "במקרר", "בארון נעליים", "בכיס"], correct: 0 },
    { question: "איפה רואים לעיתים גזע וענפים?", answers: ["על עץ", "במחברת", "במקרר", "בנעליים"], correct: 0 },
    { question: "מה פורח לעיתים בגן ויש לו ריח נעים?", answers: ["פרח", "כיסא", "מחק", "ספר"], correct: 0 },
    { question: "מה שותים כשצמאים?", answers: ["מים", "אש", "רוח", "אדמה"], correct: 0 },
    { question: "מה מאיר בשמיים ביום?", answers: ["שמש", "ירח", "כוכב", "ענן"], correct: 0 },
    { question: "מה רואים בשמיים בלילה בהיר?", answers: ["ירח", "שמש בלבד", "ענן סופה", "מטוס קטן"], correct: 0 },
    { question: "מה נוצץ בשמיים רחוקים בלילה?", answers: ["כוכב", "שמש", "שולחן", "מחברת"], correct: 0 },
    { question: "איזו חיה מייללת לפעמים ואוהבת חלב?", answers: ["חתול", "שולחן", "ענן", "עץ"], correct: 0 },
    { question: "איזו ציפור קטנה יכולה לעוף?", answers: ["יונה", "חתול", "כלב", "דג"], correct: 0 },
    { question: "בחרו מילה שקשורה לגן משחקים:", answers: ["נדנדה", "ספר", "מספר", "שמש"], correct: 0 },
    {
      question: "לפי הרמז: דבר לבן שיורד מהשמיים בחורף ואפשר לעשות ממנו כדור.",
      answers: ["שלג", "גשם", "ענן", "שמש"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: חיה קטנה שמצייצת ולפעמים בונה קן.",
      answers: ["ציפור", "דג", "פיל", "נחש"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: משהו שמאיר בלילה בשמיים ולפעמים נראה כמו חצי עיגול.",
      answers: ["ירח", "שמש", "כיסא", "מחברת"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: משקה שקור ומתאים כשחם בחוץ.",
      answers: ["מים קרים", "מרק חם", "שמן", "דבש"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: מקום בבית שבו שוטפים ידיים ופנים.",
      answers: ["כיור", "מקרר", "ארון", "חלון"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: דבר שמחברים איתו בין שני קצוות של נייר.",
      answers: ["מהדק", "מחק", "מדף", "מפתח"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: משהו שמנקים איתו טעות בעיפרון.",
      answers: ["מחק", "מספריים", "מברשת", "מגבת"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: בגד ששמים על הידיים כשקר בחוץ.",
      answers: ["כפפות", "כובע קיץ", "מגפי גומי לים", "חגורה"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: מקום שבו שומרים ספרים רבים וקוראים בשקט.",
      answers: ["ספרייה", "מגרש כדורגל", "מטבח", "מקלחת"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: כלי שמסתובבים איתו בגן ומתנשאים קצת מהקרקע.",
      answers: ["נדנדה", "ספסל", "לוח", "דלת"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: משהו רך שמניחים מתחת לראש כשישנים במיטה.",
      answers: ["כרית", "סרגל", "מפתח", "מחברת"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_sleep",
      subtype: "pillow",
    },
    {
      question: "לפי הרמז: דבר שמחברים איתו דפים במחברת.",
      answers: ["מהדק", "מברשת", "כובע", "נעל"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_school",
      subtype: "stapler_clip",
    },
    {
      question: "לפי הרמז: משקה חם שפעמים שותים בבוקר בבית.",
      answers: ["תה", "מים קרים", "שלג", "מלח"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_morning",
      subtype: "tea",
    },
    {
      question: "לפי הרמז: מקום בבית שבו מבשלים לפעמים אוכל.",
      answers: ["מטבח", "מיטה", "מקלחת", "מרפסת"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_home",
      subtype: "kitchen",
    },
    {
      question: "לפי הרמז: דבר שמאירים איתו כשחשוך בחדר.",
      answers: ["מנורה", "ארון", "כרית", "מגבת"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_light",
      subtype: "lamp",
    },
    {
      question: "לפי הרמז: משהו שמחברים בין שני ספרים על המדף.",
      answers: ["מעמד ספרים", "כפפה", "כובע", "מטבע"],
      correct: 0,
      subtopicId: "g1.word_picture",
      patternFamily: "g1_word_picture_bookshelf",
      subtype: "bookend",
    },
  ],
  speaking: [
    {
      question: "מה התשובה הנכונה לשאלה 'מה שלומך?'?",
      answers: ["טוב, תודה", "שלום", "להתראות", "בבקשה"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים בוקר טוב?",
      answers: ["בוקר טוב", "לילה טוב", "ערב טוב", "צהריים טובים"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה אומרים כשנכנסים לבית?",
      answers: ["שלום", "להתראות", "תודה", "בבקשה"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים תודה?",
      answers: ["תודה", "בבקשה", "סליחה", "שלום"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה אומרים כשיוצאים מבית?",
      answers: ["להתראות", "שלום", "תודה", "בבקשה"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים 'אני רעב'?",
      answers: ["אני רעב", "אני שמח", "אני עייף", "אני עצוב"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה אומרים כשמבקשים משהו?",
      answers: ["בבקשה", "תודה", "סליחה", "שלום"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים 'אני עייף'?",
      answers: ["אני עייף", "אני רעב", "אני שמח", "אני עצוב"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה נאמר כשטעינו או פגענו במישהו בטעות?",
      answers: ["סליחה", "תודה", "בבקשה", "שלום"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים 'אני שמח'?",
      answers: ["אני שמח", "אני עצוב", "אני רעב", "אני עייף"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה אומרים כשמקבלים משהו?",
      answers: ["תודה", "בבקשה", "סליחה", "שלום"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים 'אני אוהב'?",
      answers: ["אני אוהב", "אני שונא", "אני בוכה", "אני צוחק"],
      correct: 0,
      subtopicId: "g1.phrase_appropriateness",
      authenticity_pattern: "situational_phrase_register",
    },
  ],
};

const G1_MEDIUM_QUESTIONS = {
  reading: [
    { question: "מה המילה הנכונה: א_מא?", answers: ["אמא", "אמה", "אמאא", "אימא"], correct: 0 },
    { question: "איזה אות חסרה: כ_תב?", answers: ["ת", "ב", "כ", "ל"], correct: 0 },
    { question: "מה המילה הנכונה: ש_ש?", answers: ["שמש", "שמס", "שימש", "שמיש"], correct: 0 },
    { question: "קרא את המילה: 'ילד'", answers: ["ילד", "יילד", "ילת", "ילג"], correct: 0 },
    { question: "מה האות הראשונה והאחרונה במילה 'שמים'?", answers: ["ש...ים", "ש...ש", "ש...מ", "מ...ש"], correct: 0 },
    {
      question: "קרא את המשפט: 'אמא קוראת ספר'",
      answers: ["אמא קוראת ספר", "אמה קוראת ספר", "אמא קורות ספר", "אמא קראת ספר"],
      correct: 0,
    },
    { question: "השלימו את המילה: הילדה הקטנה י_דה.", answers: ["ילדה", "יילדה", "ילתה", "ילגה"], correct: 0 },
    { question: "קרא את המילה: 'מורה'", answers: ["מורה", "מורא", "מוורה", "מורי"], correct: 0 },
    {
      question: "במילה 'בובה' - איזה צליל חוזר בתחילת המילה?",
      answers: ["ב", "ה", "בו", "בה"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'כלב' - ההברה האחרונה 'לב' היא פתוחה או סגורה?",
      answers: ["סגורה", "פתוחה", "אין הברה", "לא בטוחים"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'ליל'?",
      answers: ["חיל", "יום", "בוקר", "ספר"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'אבטיח'?",
      answers: ["3", "2", "1", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'סֵפֶר'",
      answers: ["ספר", "ספור", "סבר", "ספיר"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'סוס' - באיזה צליל המילה מתחילה?",
      answers: ["ס", "ו", "סו", "סוס"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'חתול'",
      answers: ["חתול", "חטול", "חתאול", "חותול"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'נעליים'",
      answers: ["נעליים", "נהליים", "נעלייים", "ניעליים"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "במילה 'רץ' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ץ", "ר", "צ", "ז"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "במילה 'לך' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ך", "ל", "כ", "ה"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "מה האות האחרונה הרגילה (לא סופית) במילה 'בית'?",
      answers: ["ת", "ב", "י", "ה"],
      correct: 0,
      subtopicId: "g1.letters",
    },
    {
      question: "במילה 'בננה' - איזה צליל חוזר בתוך המילה?",
      answers: ["נ", "ב", "ה", "ל"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'מורה' - ההברה הראשונה 'מו' היא פתוחה או סגורה?",
      answers: ["פתוחה", "סגורה", "אין הברות", "לא יודעים"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'ים'?",
      answers: ["חיים", "בית", "גן", "עץ"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'תלמיד'?",
      answers: ["3", "2", "1", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'קָר'",
      answers: ["קר", "קאר", "קיר", "קרר"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'נחש' - באיזה צליל המילה מסתיימת?",
      answers: ["ש", "ח", "נ", "ה"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'מדף'",
      answers: ["מדף", "מדפ", "מדוף", "מהדף"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'מברשת'",
      answers: ["מברשת", "מברשט", "מבירשת", "מחרשת"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "המשפט המלא והנכון לקריאה בקול:",
      answers: ["היום יום יפה בחוץ", "היום יפה בחוץ היום יפה", "היום בחוץ יום", "יום היום בחוץ"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
      patternFamily: "g1_read_aloud_full_sentence_alt",
      subtype: "weather_sentence",
    },
    {
      question: "במילה 'חֲלוֹן' - ההברה השנייה פתוחה או סגורה?",
      answers: ["סגורה", "פתוחה", "שתיהן", "אין הברה"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
      patternFamily: "g1_syllable_halon_second",
      subtype: "lon_closed",
    },
    {
      question: "איזו מילה חורזת עם 'קַיִץ'?",
      answers: ["מיץ", "חורף", "סתיו", "בוקר"],
      correct: 0,
      subtopicId: "g1.rhyme",
      patternFamily: "g1_rhyme_kayitz",
      subtype: "itz_rhyme",
    },
    {
      question: "קרא את המילה המנוקדת: 'שֶׁמֶשׁ'",
      answers: ["שמש", "שמח", "שמן", "שמיים"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
      patternFamily: "g1_niqqud_shemesh_repeat",
      subtype: "segol_shein",
    },
    {
      question: "במילה 'פַּרְחֵי' (רבים) - כמה הברות יש?",
      answers: ["2", "1", "3", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
      patternFamily: "g1_syllable_perachim",
      subtype: "two_syllables",
    },
  ],
  comprehension: [
    { question: "במשפט 'ילד קורא' - מה הוא כנראה עושה?", answers: ["קורא טקסט", "ישן עכשיו", "מבשל מרק", "רץ במסלול"], correct: 0 },
    { question: "מה קול של כלב לפעמים אומר לנו?", answers: ["שהוא נובח", "שהוא ספר", "שהוא שולחן", "שהוא ענן"], correct: 0 },
    { question: "מה ההפך של 'שמח'?", answers: ["עצוב", "צבעוני", "יפה", "חכם"], correct: 0 },
    { question: "כשהשמש זורחת - איך מרגיש בדרך כלל בחוץ?", answers: ["מאיר ובהיר", "חשוך לגמרי", "קרח מלא", "שקט לגמרי בלי אור"], correct: 0 },
    { question: "כשכותבים 'ילד משחק' - מה הוא כנראה עושה?", answers: ["משחק", "ישן בכיתה", "כותב מחברת", "אוכל ארוחת ערב"], correct: 0 },
    { question: "סמנו את התשובה הנכונה לפי ההוראה: אם המשפט נכון לחצו על ׳כן׳.", answers: ["כן", "לא", "אולי", "לא יודע"], correct: 0 },
    {
      question: "מי שותה מים כשצמא?",
      answers: ["אנחנו", "השולחן", "הספר", "העיפרון"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "מה קורה לבגד שנשאר בגשם בלי מעיל?",
      answers: ["נרטב", "נשאר יבש", "נעלם", "נהיה קטן"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "הקפו לפי ההוראה: סמנו את החיה שחיה במים.",
      answers: ["דג", "חתול", "כלב", "ארנב"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "למה כדאי לנקות את השולחן אחרי יצירה עם דבק?",
      answers: ["כדי שלא יידבקו דברים", "כדי שהשולחן יישן", "כדי שהמורה תיעלם", "כדי שהספר ייעלם"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "סמנו לפי ההוראה: איזו מילה מתארת משהו שקורה כשמתעייפים?",
      answers: ["עייפות", "רעב", "צמא", "שמחה"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "למה חשוב להקשיב כשמסבירים הוראות במשחק קבוצתי?",
      answers: ["כדי שכולם יבינו את הכללים", "כדי שהכדור ייעלם", "כדי שהשמש תיכבה", "כדי שהמחברת תישן"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
      patternFamily: "g1_why_listen_rules",
      subtype: "group_game",
    },
    {
      question: "הקפו לפי ההוראה: סמנו את המילה שמתארת משהו מתוק לאכול.",
      answers: ["דבש", "מלח", "פלסטיק", "אבן"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
      patternFamily: "g1_instruction_sweet",
      subtype: "honey",
    },
  ],
  writing: [
    {
      question: "בכיתה יש לפעמים ילד וגם ___ - בחרו איות למילה שמתארת ילדה:",
      answers: ["ילדה", "יילדה", "ילדא", "ילדהה"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_context_girl",
      subtype: "classroom_contrast",
    },
    {
      question: "כותבים בה שיעורים ומדביקים לפעמים מדבקות - בחרו איות למילה שמתארת את החפץ:",
      answers: ["מחברת", "מחברט", "מחבורת", "מחבת"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_notebook",
      subtype: "school_object",
    },
    {
      question: "השלימו את המשפט בכתיב תקין: ׳אני ה_כתי׳.",
      answers: ["אני כתבתי", "אני כתבתיי", "אני התכתבתי", "אני כתבי"],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_sentence_completion_past",
      subtype: "first_person_wrote",
    },
    {
      question: "השלימו איות: אני ק_א ספר (רק צורת הכתיב הנכונה).",
      answers: ["קורא", "קרוא", "קרא", "קורע"],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_cloze_kore",
      subtype: "orthographic_slot",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["קורא"],
      maxTypingChars: 8,
    },
    {
      question: "משתמשים בו כדי לצבוע או להדגיש - בחרו איות למילה שמתארת חומר צבע:",
      answers: ["צבע", "צביח", "צביע", "צבעע"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_color",
      subtype: "material_hint",
    },
    {
      question: "אבא, אמא והילדים ביחד - בחרו איות למילה שמתארת את הקבוצה:",
      answers: ["משפחה", "משפחא", "משפחהה", "מושפחה"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_family_group",
      subtype: "concept_then_spell",
    },
  ],
  grammar: [
    { question: "מה חלק הדיבר של המילה 'יפה'?", answers: ["תואר", "שם עצם", "פועל", "מספר"], correct: 0 },
    { question: "מה חלק הדיבר של המילה 'רץ'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0 },
    { question: "איזה ניסוח מתאים לגוף ולמין (ילד/ילדה)?", answers: ["הילד רץ", "הילד רצים", "הילדה רץ", "הילדים רץ"], correct: 0 },
    { question: "מה חלק הדיבר של המילה 'קורא'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0 },
    {
      question: "איזה משפט לא תקין?",
      answers: ["אבא קורא עיתון", "קורא אבא עיתון בבית", "אמא מכינה ארוחה", "הילדה מציירת"],
      correct: 1,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_medium_illformed_word_order",
      subtype: "subject_verb_scramble",
    },
    {
      question: "איזה משפט לא תקין?",
      answers: ["החתול ישן על הספה", "ישן החתול על הספה בלי", "הכלב שיחק בחצר", "אני שותה מים"],
      correct: 1,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_medium_illformed_cat_sleep",
      subtype: "verb_front",
    },
    {
      question: "בחרו משפט תקין:",
      answers: ["אני אוכל תפוח במטבח", "אוכל אני במטבח תפוח", "תפוח אוכל אני במטבח לא", "במטבח תפוח אוכל"],
      correct: 0,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_medium_wellformed_apple_kitchen",
      subtype: "svo",
    },
    {
      question: "איזה משפט לא תקין?",
      answers: ["הילדים משחקים יפה", "משחקים הילדים יפה בלי", "המורה מדברת בשקט", "אנחנו יושבים בשורה"],
      correct: 1,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_medium_illformed_play_nice",
      subtype: "verb_initial",
    },
    {
      question: "בחרו משפט תקין:",
      answers: ["בגן ראינו פרחים אדומים", "בגן פרחים ראינו אדומים לא", "ראינו בגן אדומים פרחים", "פרחים בגן ראינו"],
      correct: 0,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_medium_wellformed_garden_flowers",
      subtype: "place_first",
    },
    {
      question: "בחרו מילה שמשלימה: עכשיו אני ___ על השולחן.",
      answers: ["כותב", "כתבתי", "אכתוב", "כתבנו"],
      correct: 0,
      subtopicId: "g1.grammar_cloze_deixis",
      patternFamily: "g1_grammar_medium_cloze_now_write",
      subtype: "present_now",
    },
    {
      question: "בחרו מילה שמשלימה: מחר בבוקר אנחנו ___ את השיעור.",
      answers: ["נחזור", "חזרנו", "חוזרים", "חזרתי"],
      correct: 0,
      subtopicId: "g1.grammar_cloze_deixis",
      patternFamily: "g1_grammar_medium_cloze_tomorrow_review",
      subtype: "future_morning",
    },
    {
      question: "בחרו מילה שמשלימה: אתמול בערב אני ___ סיפור קצר.",
      answers: ["שמעתי", "שומע", "אשמע", "שמענו עכשיו"],
      correct: 0,
      subtopicId: "g1.grammar_cloze_deixis",
      patternFamily: "g1_grammar_medium_cloze_yesterday_story",
      subtype: "past_evening",
    },
    {
      question: "בחרו מילה שמשלימה: אחרי הצהריים אני ___ קצת במחברת.",
      answers: ["מתרגל", "תרגלתי", "אתרגל", "תרגלנו כבר"],
      correct: 0,
      subtopicId: "g1.grammar_cloze_deixis",
      patternFamily: "g1_grammar_medium_cloze_afternoon_practice",
      subtype: "afternoon_habit",
    },
    {
      question: "בחרו מילה שמשלימה: לפני השיעור אנחנו ___ את החומר על השולחן.",
      answers: ["מסדרים", "סידרנו", "נסדר", "סידרתי לבד"],
      correct: 0,
      subtopicId: "g1.grammar_cloze_deixis",
      patternFamily: "g1_grammar_medium_cloze_before_lesson_arrange",
      subtype: "prep_sequence",
    },
    {
      question: "בחרו משפט עם סדר מילים הגיוני:",
      answers: ["המורה נותנת לנו משימה", "נותנת המורה משימה לנו", "משימה לנו המורה נותנת", "לנו משימה נותנת המורה"],
      correct: 0,
      subtopicId: "g1.grammar_word_order",
      patternFamily: "g1_grammar_medium_word_order_teacher_task",
      subtype: "svo_classroom",
    },
    {
      question: "בחרו משפט עם סדר מילים הגיוני:",
      answers: ["אני מחזיק את התיק בשתי ידיים", "את התיק בשתי ידיים מחזיק אני", "מחזיק אני בשתי ידיים את התיק לא", "בשתי ידיים אני את התיק"],
      correct: 0,
      subtopicId: "g1.grammar_word_order",
      patternFamily: "g1_grammar_medium_word_order_hold_bag",
      subtype: "hold_object",
    },
    {
      question: "בחרו משפט עם סדר מילים הגיוני:",
      answers: ["בחצר רצים הילדים בשקט", "רצים בחצר בשקט הילדים לא", "הילדים בשקט בחצר רצים", "בשקט הילדים רצים בחצר לא"],
      correct: 0,
      subtopicId: "g1.grammar_word_order",
      patternFamily: "g1_grammar_medium_word_order_yard_run",
      subtype: "place_adverb",
    },
    {
      question: "בחרו משפט עם סדר מילים הגיוני:",
      answers: ["אמא שמה את האוכל על השולחן", "על השולחן שמה אמא את האוכל לא", "את האוכל אמא על השולחן שמה", "שמה על האוכל אמא השולחן"],
      correct: 0,
      subtopicId: "g1.grammar_word_order",
      patternFamily: "g1_grammar_medium_word_order_mom_table",
      subtype: "meal_setup",
    },
    {
      question: "לפני השינה אני ___ שיניים.",
      answers: ["מצחצח", "צחצחתי", "אצחצח", "צחצחנו אתמול"],
      correct: 0,
      subtopicId: "g1.grammar_connectors_time",
      patternFamily: "g1_grammar_medium_time_before_sleep_teeth",
      subtype: "routine_before",
    },
    {
      question: "אחרי המשחק אנחנו ___ מים.",
      answers: ["שותים", "שתיתי", "נשתה", "שתינו אתמול"],
      correct: 0,
      subtopicId: "g1.grammar_connectors_time",
      patternFamily: "g1_grammar_medium_time_after_play_drink",
      subtype: "after_activity",
    },
    {
      question: "בבוקר אני ___ את הפנים.",
      answers: ["רוחץ", "רחצתי", "ארחץ", "רחצנו בערב"],
      correct: 0,
      subtopicId: "g1.grammar_connectors_time",
      patternFamily: "g1_grammar_medium_time_morning_wash_face",
      subtype: "morning_hygiene",
    },
    {
      question: "כשמסיימים ארוחה אני לפעמים ___ את השולחן.",
      answers: ["מנקה", "ניקיתי", "אנקה", "ניקינו מחר"],
      correct: 0,
      subtopicId: "g1.grammar_connectors_time",
      patternFamily: "g1_grammar_medium_time_after_meal_clean",
      subtype: "after_meal",
    },
    {
      question: "איזו מילה לא שייכת לקבוצת ׳חיות מחמד בבית׳?",
      answers: ["דג זהב", "חתול", "כלב", "ארון"],
      correct: 3,
      subtopicId: "g1.grammar_odd_category",
      patternFamily: "g1_grammar_medium_odd_pets_home",
      subtype: "furniture_vs_pet",
    },
    {
      question: "איזו מילה לא שייכת לקבוצת ׳דברים שצומחים בגינה׳?",
      answers: ["עשב", "שושן", "עץ קטן", "אופניים"],
      correct: 3,
      subtopicId: "g1.grammar_odd_category",
      patternFamily: "g1_grammar_medium_odd_garden_grows",
      subtype: "object_vs_plant",
    },
    {
      question: "איזה משפט מסתיים בסימן פיסוק נכון אחרי מילת פלא?",
      answers: ["וואו, איזה יום יפה!", "וואו איזה יום יפה.", "וואו איזה יום יפה", "וואו! איזה יום יפה לא"],
      correct: 0,
      subtopicId: "g1.grammar_punctuation",
      patternFamily: "g1_grammar_medium_punct_wow_comma",
      subtype: "interjection_comma",
    },
    {
      question: "איזה משפט עם סימן שאלה בסוף נכון?",
      answers: ["איפה הנעליים שלי?", "איפה הנעליים שלי.", "איפה הנעליים שלי", "?איפה הנעליים שלי"],
      correct: 0,
      subtopicId: "g1.grammar_punctuation",
      patternFamily: "g1_grammar_medium_punct_where_shoes",
      subtype: "where_question",
    },
    {
      question: "איזה משפט נכון ליחיד מול רבים?",
      answers: ["הילדים משחקים בחוץ", "הילדים משחק בחוץ", "הילד משחקים בחוץ", "הילד משחקים בחוץ לא"],
      correct: 0,
      subtopicId: "g1.grammar_agreement_light",
      patternFamily: "g1_grammar_medium_agreement_kids_play_outside",
      subtype: "plural_subject",
    },
    {
      question: "איזה משפט נכון לגבי המורה בכיתה?",
      answers: ["המורה כותבת על הלוח", "המורה כותבים על הלוח", "המורה כותב על הלוח", "המורות כותב על הלוח"],
      correct: 0,
      subtopicId: "g1.grammar_agreement_light",
      patternFamily: "g1_grammar_medium_agreement_teacher_writes",
      subtype: "fem_singular",
    },
  ],
  vocabulary: [
    { question: "מה רוכבים לפעמים בחוץ ויש לזה גלגלים?", answers: ["אופניים", "מחברת", "ענן", "כיסא"], correct: 0 },
    { question: "במה כותבים על הדף?", answers: ["בעיפרון", "במים", "בשולחן", "בענן"], correct: 0 },
    { question: "במה כותבים שיעורים בדרך כלל?", answers: ["במחברת", "במקרר", "בנעליים", "בכובע"], correct: 0 },
    {
      question: "לפי הרמז: דבר שמנקים איתו את הלוח אחרי שיעור.",
      answers: ["ספוג", "מחברת", "כיסא", "חלון"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: משהו שמסמנים איתו קו ישר על הדף.",
      answers: ["סרגל", "כובע", "נעל", "כרית"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: מקום בכיתה שבו מציגים לפעמים כתובת או תאריך.",
      answers: ["לוח", "מקרר", "ארון", "חלון"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
  ],
  speaking: [
    { question: "איך אומרים כשמתחילים שיחה בבוקר בכיתה?", answers: ["בוקר טוב", "לילה טוב", "להתראות", "סליחה"], correct: 0 },
    { question: "מה אומרים כשמבקשים עזרה בנימוס?", answers: ["בבקשה", "תודה", "סליחה", "שלום"], correct: 0 },
    { question: "איך אומרים כשמסיימים יום בבית הספר?", answers: ["להתראות", "בוקר טוב", "סליחה", "בבקשה"], correct: 0 },
  ],
};

const G1_HARD_QUESTIONS = {
  reading: [
    {
      question: "קרא את המשפט: 'הילד קורא ספר'",
      answers: ["הילד קורא ספר", "הילד קרא ספר", "הילד כורא ספר", "הילד קורא סבר"],
      correct: 0,
    },
    { question: "מה המילה הנכונה: י_ד?", answers: ["ילד", "יילד", "ילת", "ילג"], correct: 0 },
    {
      question: "קרא את המשפט: 'אמא קוראת ספר לילד'",
      answers: ["אמא קוראת ספר לילד", "אמה קוראת ספר לילד", "אמא קורות ספר לילד", "אמא קראת ספר לילד"],
      correct: 0,
    },
    { question: "מה המילה הנכונה: ת_למיד?", answers: ["תלמיד", "תלמידד", "טלמיד", "תלמידי"], correct: 0 },
    {
      question: "כיתה א׳ - קרא את המשפט: 'הילדים משחקים בחצר'",
      answers: ["הילדים משחקים בחצר", "ילידים משחקים בחצר", "הילדים משחקים בחצה", "הילדים משחקים בצר"],
      correct: 0,
    },
    { question: "מה המילה הנכונה: מ_רה?", answers: ["מורה", "מורא", "מוורה", "מורי"], correct: 0 },
    {
      question: "קרא את המשפט: 'הכלב רץ בחצר'",
      answers: ["הכלב רץ בחצר", "הכלב רצה בחצר", "הכלב רץ בחצה", "הכלב רץ בצר"],
      correct: 0,
    },
    {
      question: "קרא את המשפט: 'השמש זורחת בבוקר'",
      answers: ["השמש זורחת בבוקר", "השמש זרחת בבוקר", "השמס זורחת בבוקר", "השמש צורחת בבוקר"],
      correct: 0,
    },
    {
      question: "במילה 'אבא' - איזה אות חוזר פעמיים?",
      answers: ["א", "ב", "אין חזרה", "ב וא"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'מורה' - ההברה האחרונה היא פתוחה או סגורה?",
      answers: ["פתוחה", "סגורה", "שתיהן", "אין הברה"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'אם'?",
      answers: ["גם", "בת", "סוס", "עץ"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'שולחן'?",
      answers: ["2", "1", "3", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'חַם'",
      answers: ["חם", "חאם", "חים", "חימ"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'צפרדע' - באיזה צליל המילה מתחילה?",
      answers: ["צ", "פ", "ציפור", "דע"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'קרקע'",
      answers: ["קרקע", "קרקעת", "קרקא", "קראקע"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "במילה 'ארץ' - איזו אות סופית כתובים בסוף המילה?",
      answers: ["ץ", "ר", "צ", "ת"],
      correct: 0,
      subtopicId: "g1.final_letters",
    },
    {
      question: "במילה 'מחשב' - מה האות השנייה?",
      answers: ["ח", "מ", "ש", "ב"],
      correct: 0,
      subtopicId: "g1.letters",
    },
    {
      question: "במילה 'אמא' - איזה צליל חוזר פעמיים?",
      answers: ["מ", "א", "ה", "ב"],
      correct: 0,
      subtopicId: "g1.phoneme_awareness",
    },
    {
      question: "במילה 'שולחן' - ההברה האחרונה היא פתוחה או סגורה?",
      answers: ["סגורה", "פתוחה", "שתיהן", "אין הברה"],
      correct: 0,
      subtopicId: "g1.open_close_syllable",
    },
    {
      question: "איזו מילה חורזת עם 'חדר'?",
      answers: ["גדר", "חלון", "ספר", "עץ"],
      correct: 0,
      subtopicId: "g1.rhyme",
    },
    {
      question: "כמה הברות יש במילה 'מחברת'?",
      answers: ["3", "2", "1", "4"],
      correct: 0,
      subtopicId: "g1.syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'קָרִיר'",
      answers: ["קריר", "קאריר", "קרייר", "קיריר"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
    },
    {
      question: "במילה 'שבת' - באיזה צליל המילה מסתיימת?",
      answers: ["ת", "ב", "ש", "ה"],
      correct: 0,
      subtopicId: "g1.sound_letter_match",
    },
    {
      question: "קרא את המילה: 'מדבקה'",
      answers: ["מדבקה", "מדבקא", "מדבקע", "מדבקוה"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "קרא את המילה: 'מספריים'",
      answers: ["מספריים", "מספוריים", "נספריים", "משפריים"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
    },
    {
      question: "ניסוח נכון לקריאה: בחרו את המשפט שלם:",
      answers: ["אחרי המבחן שיחקנו בחצר", "אחרי המבחן שיחק בחצר הם", "שיחקנו אחרי המבחן בלי חצר", "אחרי המבחן חצר"],
      correct: 0,
      subtopicId: "g1.simple_words_read",
      patternFamily: "g1_read_sentence_integrity",
      subtype: "after_test",
    },
    {
      question: "כמה הברות יש במילה 'מַחְרוֹזֶת'?",
      answers: ["3", "2", "4", "1"],
      correct: 0,
      subtopicId: "g1.syllables",
      patternFamily: "g1_syllable_machroz_et",
      subtype: "three_syllables",
    },
    {
      question: "קרא את המילה המנוקדת: 'שָׁקִיעָה'",
      answers: ["שקיעה", "שקשקה", "שקטה", "שקייה"],
      correct: 0,
      subtopicId: "g1.basic_niqqud",
      patternFamily: "g1_niqqud_shekiyya",
      subtype: "sunset_word",
    },
  ],
  comprehension: [
    { question: "במשפט 'ילד קורא ספר' - מה הפעולה העיקרית?", answers: ["קורא", "כותב", "מצייר", "ישן"], correct: 0 },
    { question: "כשהשמש זורחת בבוקר - מה קורה בדרך כלל?", answers: ["יש אור וחום", "הכל חשוך", "יורד שלג תמיד", "הלילה מתחיל"], correct: 0 },
    {
      question: "בכיתה א׳: כשכותבים 'ילדים משחקים בחצר' - מה הם עושים?",
      answers: ["משחקים", "קוראים שיעור", "ישנים", "אוכלים ארוחת צהריים בכיתה"],
      correct: 0,
    },
    { question: "במשפט 'הכלב רץ' - מה הכלב עושה?", answers: ["רץ", "ישן", "אוכל", "שוחה במים"], correct: 0 },
    { question: "במשפט 'אמא קוראת ספר לילד' - מה אמא עושה?", answers: ["קוראת ספר", "כותבת ספר", "מציירת ספר", "שרה בלי ספר"], correct: 0 },
    {
      question: "איפה אפשר לקרוא ספר בשקט?",
      answers: ["בספרייה", "במגרש כדורגל", "במטבח בזמן בישול", "במקלחת"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "למה חשוב לשתות מים אחרי ריצה?",
      answers: ["כדי לא להתייבש", "כדי לצבוע", "כדי לישון", "כדי לשבור את הספר"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "עקבו אחרי ההוראה: סמנו את המילה שמתארת משהו קר.",
      answers: ["קרח", "שמש", "אש", "חול"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
    {
      question: "למה חשוב לסגור מחברת אחרי כתיבה?",
      answers: ["כדי שלא ייקרעו הדפים", "כדי שהמחברת תישן", "כדי שהעיפרון ייעלם", "כדי שהשולחן ייעלם"],
      correct: 0,
      subtopicId: "g1.one_sentence_who_what",
    },
    {
      question: "סמנו לפי ההוראה: איזו מילה מתארת משהו שקורה כשמתרגשים לפני הצגה?",
      answers: ["התרגשות", "שעמום", "רעב", "צמא"],
      correct: 0,
      subtopicId: "g1.simple_instruction",
    },
  ],
  writing: [
    {
      question: "מי לומד בכיתה ומקשיב לשיעור? בחרו איות למילה שמתארת את התפקיד:",
      answers: ["תלמיד", "תלמידד", "טלמיד", "תלמידי"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_pupil",
      subtype: "role_school",
    },
    {
      question: "דביקה קטנה שמדביקים על דף או על כיסא - בחרו איות למילה שמתארת את החפץ:",
      answers: ["מדבקה", "מדבקא", "מדבקע", "מדבקוה"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_sticker",
      subtype: "object_school",
    },
    {
      question: "כלי עם שני חלקים שחותכים איתו נייר - בחרו איות למילה שמתארת את הכלי:",
      answers: ["מספריים", "מספוריים", "נספריים", "משפריים"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_meaning_scissors",
      subtype: "object_tool",
    },
    {
      question: "השלימו איות: מ_חברת חדשה לכיתה.",
      answers: ["מחברת", "מחברט", "מחבורת", "מחברתת"],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_cloze_machberet",
      subtype: "orthographic_slot",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["מחברת"],
      maxTypingChars: 10,
    },
    {
      question:
        "בחרו משפט מלא לכותרת ביומן: ׳אחרי בית הספר׳ - משפט אחד, כתיב תקין וניסוח של כתיבה:",
      answers: [
        "אחרי בית הספר שיחקתי עם החברים בחצר.",
        "אחרי בית ספר שיחקתי עם החברים בחצר.",
        "אחרי בית הספר שיחקתי חברים בחצר.",
        "אחרי בית הספר שיחקתי עם חבר.",
      ],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_micro_paragraph_title",
      subtype: "after_school",
    },
    {
      question: "בדיווח קצר ביומן: ׳אתמול ___ ספר בבית.׳ - בחרו רק את האיות הנכון של המילה החסרה:",
      answers: ["קראתי", "קרתי", "קראתיי", "כראתי"],
      correct: 0,
      subtopicId: "g1.spell_word_choice",
      patternFamily: "g1_writing_past_first",
      subtype: "qraati",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["קראתי"],
      maxTypingChars: 10,
    },
    {
      question:
        "בבית הספר נכנסים לחלק מהיום שנקרא לפעמים בשם של ___ - בחרו איות (בלי ניקוד בשאלה):",
      answers: ["שיעור", "שייעור", "שיעורר", "טיעור"],
      correct: 0,
      subtopicId: "g1.copy_word",
      patternFamily: "g1_spelling_context_lesson_plain",
      subtype: "shiur_no_niqqud_stem",
    },
  ],
  grammar: [
    { question: "מה חלק הדיבר של המילה 'רץ' במשפט 'הילד רץ'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0, subtopicId: "g1.grammar_pos_roles" },
    { question: "איזה משפט נכון?", answers: ["הילדים קוראים", "הילדים קורא", "הילד קוראים", "הילדה קוראים"], correct: 0, subtopicId: "g1.grammar_agreement_light" },
    { question: "מה חלק הדיבר של המילה 'קורא' במשפט 'הילד קורא'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0, subtopicId: "g1.grammar_pos_roles" },
    { question: "איזה משפט נכון?", answers: ["המורה מלמדת", "המורה מלמד", "המורה מלמדים", "המורה מלמדות"], correct: 0, subtopicId: "g1.grammar_agreement_light" },
    { question: "מה חלק הדיבר של המילה 'יפה' במשפט 'הפרח יפה'?", answers: ["תואר", "שם עצם", "פועל", "מספר"], correct: 0, subtopicId: "g1.grammar_pos_roles" },
    { question: "איזה משפט לא תקין?", answers: ["הכלב רץ", "רץ הכלב מהר", "החתול ישן", "אמא מבשלת"], correct: 1, subtopicId: "g1.grammar_wellformed" },
    { question: "בחרו מילה שמשלימה: אתמול אני ___ ספר.", answers: ["קראתי", "קורא", "קרא", "קוראתי"], correct: 0, subtopicId: "g1.grammar_cloze_deixis" },
    { question: "איזה משפט מסתיים בסימן שאלה נכון?", answers: ["מה זה?", "מה זה.", "מה זה", "?מה זה"], correct: 0, subtopicId: "g1.grammar_punctuation" },
    { question: "איזו מילה לא שייכת לכלי כתיבה?", answers: ["מחק", "עיפרון", "סרגל", "נדנדה"], correct: 3, subtopicId: "g1.grammar_odd_category" },
    { question: "בחרו משפט עם סדר מילים הגיוני:", answers: ["אני שותה מים בבית", "מים אני בבית שותה", "בבית שותה מים אני", "שותה בבית אני"], correct: 0, subtopicId: "g1.grammar_word_order" },
    { question: "מחר אני ___ לגן.", answers: ["אלך", "הלכתי", "הולך", "הלכנו"], correct: 0, subtopicId: "g1.grammar_connectors_time" },
    {
      question: "איזה משפט לא תקין כי חסר נושא ברור?",
      answers: ["רץ מהר בחצר", "הילד רץ מהר בחצר", "הכלב רץ בחצר", "אמא מדברת בשקט"],
      correct: 0,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_illformed_missing_subject",
      subtype: "subject_required",
    },
    {
      question: "בחרו משפט תקין:",
      answers: ["הספר נמצא על השולחן", "הספר על השולחן נמצא", "על השולחן הספר נמצא", "נמצא על שולחן הספר"],
      correct: 0,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_wellformed_book_table",
      subtype: "svo_basic",
    },
    {
      question: "איזה משפט לא תקין?",
      answers: ["אני שותה מים", "שותה אני מים", "אמא מבשלת מרק", "הילד קורא ספר"],
      correct: 1,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_illformed_word_order_light",
      subtype: "drink_water",
    },
    {
      question: "בחרו משפט שמתאר פעולה בסדר הגיוני:",
      answers: ["קודם נכנסנו לכיתה ואז ישבנו", "ישבנו קודם ואז לא נכנסנו", "נכנסנו לכיתה ואז לא ישבנו", "קודם ישבנו ואז לא כיתה"],
      correct: 0,
      subtopicId: "g1.grammar_wellformed",
      patternFamily: "g1_grammar_sequence_classroom",
      subtype: "two_step_order",
    },
  ],
  vocabulary: [
    { question: "במה משתמשים לפעמים כדי לשחק או ללמוד במחשב?", answers: ["מחשב", "מחבת", "מטאטא", "כפפה"], correct: 0 },
    { question: "איפה יש הרבה ספרים לבחירה?", answers: ["בספרייה", "במקרר", "בארון נעליים", "בכיס"], correct: 0 },
    { question: "איפה משחקים לפעמים בין הבניינים בבית הספר?", answers: ["בחצר", "במחברת", "בתוך הספר בלבד", "במים"], correct: 0 },
    { question: "איפה ילדים קטנים משחקים לפעמים לפני בית הספר?", answers: ["בגן", "במחשב", "במעלית", "בסיר"], correct: 0 },
    { question: "מתי מתחיל היום אחרי הלילה?", answers: ["בבוקר", "בחצות", "בחורף בלבד", "בשבת בלבד"], correct: 0 },
    {
      question: "לפי הרמז: דבר דק שמקפלים איתו דף לצורות בכיתת יצירה.",
      answers: ["נייר", "אבן", "מים", "מברשת"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: כלי שמודדים איתו אורך קו על הדף.",
      answers: ["סרגל", "מגבת", "כפפה", "מפתח"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
    {
      question: "לפי הרמז: מקום שבו שומרים ספרים בכיתה ולפעמים יש בו מגירות.",
      answers: ["כוננית", "מקרר", "מקלחת", "מגרש"],
      correct: 0,
      subtopicId: "g1.word_picture",
    },
  ],
  speaking: [
    { question: "איך אומרים 'אני אוהב לקרוא'?", answers: ["אני אוהב לקרוא", "אני אוהבת לקרוא", "אני אוהבים לקרוא", "אני אוהבות לקרוא"], correct: 0 },
    { question: "מה נאמר כשרוצים לבקש עזרה בשיעור?", answers: ["אפשר עזרה?", "תן לי עכשיו", "אני לא צריך כלום", "ביי"], correct: 0 },
    { question: "איך אומרים 'אני רוצה לשחק'?", answers: ["אני רוצה לשחק", "אני רוצה לקרוא", "אני רוצה לאכול", "אני רוצה לישון"], correct: 0 },
    { question: "איך מתארים משהו שאני רואה?", answers: ["אני אומר מה אני רואה", "אני שותק", "אני בוכה", "אני צוחק"], correct: 0 },
  ],
};

// ========== כיתה ב' ==========
const G2_EASY_QUESTIONS = {
  reading: [
    {
      question: "קרא את המשפט: 'הילד קורא ספר בכיתה'",
      answers: ["הילד קורא ספר בכיתה", "הילד קרא ספר בכיתה", "הילד קורא ספר בכתה", "הילד כורא ספר בכיתה"],
      correct: 0,
    },
    { question: "השלימו את המילה במשפט: בחצר משחקים י_דים.", answers: ["ילדים", "ילנדים", "ילאדים", "יילדים"], correct: 0 },
    { question: "קרא את המילה: 'כיתה'", answers: ["כיתה", "כית", "כיתא", "כיחה"], correct: 0 },
    {
      question: "קרא את המשפט: 'המורה קוראה בכיתה'",
      answers: ["המורה קוראה בכיתה", "המורה קראה בכיתה", "המורה קוראה בכתה", "המורה כוראה בכיתה"],
      correct: 0,
    },
    { question: "מה המילה הנכונה: ס_פר?", answers: ["ספר", "סבר", "סברי", "סברת"], correct: 0 },
    {
      question: "כיתה ב׳ - קרא את המשפט: 'הילדים משחקים בחצר'",
      answers: ["הילדים משחקים בחצר", "ילידים משחקים בחצר", "הילדים משחקים בחצה", "הילדים משחקים בצר"],
      correct: 0,
    },
    {
      question: "בקראית: איזה סימן פיסוק מתאים אחרי שאלה קצרה כמו ׳מה זה׳?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'מחברת'",
      answers: ["מחברת", "מחבת", "מברת", "מכתבת"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המילה: 'משחק'",
      answers: ["משחק", "משייח", "משויח", "מחק"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'הילדות שרות שיר קצר'",
      answers: ["הילדות שרות שיר קצר", "ילדות שרות שיר קצר", "הילדות שרות שיר קצה", "הילדות שורות שיר קצר"],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "בקריאה: אחרי משפט שמספרים בו סיפור מצחיק - איזה סימן פיסוק מתאים בסוף?",
      answers: ["!", "?", ".", ","],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'הצגה'",
      answers: ["הצגה", "הצגא", "הצבה", "הדגה"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המילה: 'תרגיל'",
      answers: ["תרגיל", "תרגייל", "טרגיל", "תרגיול"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'אחרי הצהריים אנחנו מתאמנים בחצר'",
      answers: [
        "אחרי הצהריים אנחנו מתאמנים בחצר",
        "אחרי הצהריים אנחנו מתאמנים בחצה",
        "אחרי הצהריים אנחנו מתאמינים בחצר",
        "אחרי הצהריים אנחנו מתאמנים בצר",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "בחרו את המשפט הקצר והנכון:",
      answers: ["נכנסנו לכיתה בשקט", "נכנסנו בשקט לכיתה בשקט", "נכנסנו כיתה בשקט", "שקט כיתה נכנסנו"],
      correct: 0,
      subtopicId: "g2.short_sentence",
      patternFamily: "g2_read_trim_redundancy",
      subtype: "quiet_enter",
    },
    {
      question: "קרא את המילה: 'הַכְנָה'",
      answers: ["הכנה", "הכנא", "הכניה", "יכנה"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_fluent_hachana",
      subtype: "prep_word",
    },
    {
      question: "בקריאה: אחרי רשימה (׳עיפרון, מחק, סרגל׳) - איזה סימן מתאים בין פריט לפריט?",
      answers: [",", ".", "?", "!"],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
      patternFamily: "g2_punct_list_commas_alt",
      subtype: "inline_list",
    },
    {
      question: "משפט מלא לקריאה: מה נשמע טבעי?",
      answers: ["המורה הסבירה את הנושא בשקט", "המורה הסביר בשקט את המורה", "המורה שקטה הסבירה", "שקט מורה נושא"],
      correct: 0,
      subtopicId: "g2.short_sentence",
      patternFamily: "g2_sentence_teacher_explains",
      subtype: "natural_order",
    },
  ],
  comprehension: [
    { question: "במשפט 'ילד קורא ספר בכיתה' - מה קורה בכיתה?", answers: ["קוראים ספר", "מבשלים מרק", "ישנים", "רצים במסלול"], correct: 0 },
    { question: "ניגוד (הפוך במשמעות) ל׳גדול׳ - איזו מילה מתאימה?", answers: ["קטן", "צבעוני", "יפה", "חכם"], correct: 0 },
    { question: "כשהשמש זורחת בבוקר - מה נכון?", answers: ["יש אור בחוץ", "הכל חשוך", "יורד שלג תמיד", "הלילה מתחיל"], correct: 0 },
    {
      question: "בכיתה ב׳: כשכותבים 'ילדים משחקים בחצר' - מה הם עושים?",
      answers: ["משחקים", "קוראים שיעור", "כותבים מבחן", "אוכלים ארוחת ערב"],
      correct: 0,
    },
    { question: "אם מישהו לא ׳שמח׳ אלא במצב רגשי הפוך - איך קוראים לזה?", answers: ["עצוב", "שמח", "יפה", "גדול"], correct: 0 },
    {
      question: "מה יבוא קודם לפי הסדר: ׳בוקר׳ ואז ׳ערב׳?",
      answers: ["בוקר קודם", "ערב קודם", "שניהם יחד", "אי אפשר לדעת"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי הסדר: ׳קודם שוטפים ידיים ואז יושבים לאכול׳ - מה קורה ראשון?",
      answers: ["שוטפים ידיים", "יושבים לאכול", "אוכלים ואז שוטפים", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי המשפט ׳הילד שכח את המעיל בבית׳ - מה כנראה קרה לו בחוץ?",
      answers: ["הוא עלול להרגיש קר", "הוא שכח גם את הכובע", "המעיל נהיה ספר", "השמיים נסגרו"],
      correct: 0,
      subtopicId: "g2.light_inference",
    },
    {
      question: "לפי המשפט ׳המורה ביקשה שקט כדי להסביר׳ - מה היא רצתה מהכיתה?",
      answers: ["להקשיב בלי רעש", "לרוץ מהר", "לשיר חזק", "לסגור את החלונות"],
      correct: 0,
      subtopicId: "g2.light_inference",
    },
    {
      question: "לפי המשפט ׳הילדים הכינו ערכת עזרה ראשונה לפרויקט׳ - מה כנראה היה חשוב בפרויקט?",
      answers: ["בטיחות וזהירות", "בישול מתכון", "בחירת צבע לקיר", "מספר מילים באנגלית"],
      correct: 0,
      subtopicId: "g2.light_inference",
      patternFamily: "g2_infer_first_aid_kit",
      subtype: "project_goal",
    },
    {
      question: "לפי המשפט ׳נשארנו בפנים כי ירד גשם חזק׳ - למה נשארו?",
      answers: ["בגלל מזג אוויר רע בחוץ", "כי חסרו כיסאות", "כי ביקשו להישאר ערים כל הלילה", "כי בוטל השיעור לתמיד"],
      correct: 0,
      subtopicId: "g2.light_inference",
      patternFamily: "g2_infer_stay_inside_rain",
      subtype: "weather_cause",
    },
    {
      question: "לפי הסדר: ׳קודם פותחים מחברת ואז כותבים כותרת׳ - מה קורה אחרי הפתיחה?",
      answers: ["כותבים כותרת", "פותחים מחברת", "סוגרים מחברת", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question:
        "שני משפטים: ׳הילדים נכנסו לחדר המוסיקה. המורה הדליקה אור.׳ - מה הרעיון המרכזי?",
      answers: [
        "מתחילים פעילות/שיעור בחדר",
        "הילדים ישנים בבית",
        "קונים ממתקים בסופר",
        "יורד שלג בחוץ",
      ],
      correct: 0,
      subtopicId: "g2.detail_main_idea",
      patternFamily: "g2_comp_main_idea_music_room",
      subtype: "two_sentence_gist",
      authenticity_pattern: "micro_passage_main_idea",
    },
    {
      question:
        "שני משפטים: ׳אמא שמה מרק על האש. אבא מכין סלט.׳ - מה המשותף לשני המשפטים?",
      answers: ["הכנת אוכל בבית", "טיול ביער", "משחק כדורגל", "קניית ספרים"],
      correct: 0,
      subtopicId: "g2.detail_main_idea",
      patternFamily: "g2_comp_shared_theme_cooking",
      subtype: "two_sentence_link",
      authenticity_pattern: "micro_passage_link_theme",
    },
    {
      question:
        "משפט אחד: ׳הדלת נטרקה בגלל הרוח׳ - מה הסיבה הסבירה ביותר?",
      answers: ["רוח חזקה", "הדלת נשברה לתמיד", "מישהו שכח את המפתח בבית", "המורה ביקשה שקט"],
      correct: 0,
      subtopicId: "g2.light_inference",
      patternFamily: "g2_infer_door_slams_wind",
      subtype: "cause_single_sentence",
      authenticity_pattern: "single_sentence_cause_choice",
    },
  ],
  writing: [
    {
      question:
        "לפני שיעור עושים לעיתים ___ קצרה: בחרו איות למילה שמתארת את הפעולה או השלב (באותיות בלבד, בלי ניקוד בשאלה).",
      answers: ["הכנה", "הכנא", "הכניה", "יכנה"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_writing_spell_hachana",
      subtype: "prep_noun_cloze",
    },
    {
      question: "השלימו איות: אני מ_דר את המחברת.",
      answers: ["מסדר", "מסדרר", "מסדור", "מסדרד"],
      correct: 0,
      subtopicId: "g2.sentence_wellformed",
      patternFamily: "g2_writing_cloze_mesader",
      subtype: "orthography_slot",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["מסדר"],
      maxTypingChars: 10,
    },
    {
      question: "בשיעור עוסקים לפעמים ב___ טקסט (מילה אחת) - בחרו איות נכון:",
      answers: ["קריאה", "קריאהה", "קרייה", "קריאא"],
      correct: 0,
      subtopicId: "g2.sentence_wellformed",
      patternFamily: "g2_writing_spell_kriah",
      subtype: "activity_noun",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["קריאה"],
      maxTypingChars: 10,
    },
    {
      question: "כותבים בה שיעורים ומסדרים דפים - בחרו איות למילה שמתארת את החפץ:",
      answers: ["מחברת", "מחברט", "מחבת", "מהברת"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_writing_spell_machberet",
      subtype: "object_context",
    },
    {
      question: "בשיעור לפעמים פותרים ___ בכיתה או בבית - בחרו איות למילה שמתארת את המטלה:",
      answers: ["תרגיל", "תרגייל", "טרגיל", "תרגיול"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_writing_spell_targil",
      subtype: "task_cloze",
    },
    {
      question: "בחרו פסקה קצרה (שני משפטים) שמתאימה לכותרת ׳יום כיף בגן׳:",
      answers: [
        "היינו בגן. שיחקנו וצחקנו.",
        "חיכינו לאוטובוס. לא נכנסנו לגן.",
        "ישבנו בבית. לא שיחקנו בחוץ.",
        "אכלנו בלבד. לא שיחקנו בכלל.",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳עזרה לחבר בכיתה׳:",
      answers: [
        "חברה לא הבינה. הסברתי בשקט. המורה אמרה תודה.",
        "חבר",
        "כיתה",
        "עזרה",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳טיול בטבע׳:",
      answers: [
        "ראינו עץ גבוה. שמענו ציפורים. חזרנו עם חיוך.",
        "טבע",
        "עץ",
        "חיוך",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
      patternFamily: "g2_para_nature_trip",
      subtype: "two_sentences",
    },
    {
      question:
        "ניסוח נכון ליומן: כתבו משפט פתיחה קצר אחד ותקין (משפט אחד בלבד, בלי נקודות בסוף):",
      answers: ["היום היה מעניין בבית הספר", "היום בית הספר מעניין היום", "היום היה בית ספר", "מעניין היום בלי היום"],
      correct: 0,
      subtopicId: "g2.sentence_wellformed",
      patternFamily: "g2_journal_opening",
      subtype: "diary_style",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["היום היה מעניין בבית הספר"],
      maxTypingChars: 48,
    },
    {
      question:
        "בכתיבה: בסוף משפט הודעה רגילה כמו ׳היום למדנו משהו חדש׳ - כתבו מילה אחת: איך קוראים לסימן הפיסוק המתאים? (אחת מארבע: נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["נקודה", "סימן שאלה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_period_fact",
      subtype: "end_declarative",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["נקודה"],
      maxTypingChars: 16,
    },
    {
      question:
        "בכתיבה: המשפט ׳איפה המחק׳ הוא שאלה - כתבו מילה אחת: איך קוראים לסימן הנכון בסוף? (אחת מארבע: נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["סימן שאלה", "נקודה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_question_where",
      subtype: "question_mark",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["סימן שאלה"],
      maxTypingChars: 16,
    },
    {
      question: "בכתיבה: המשפט ׳וואו כמה זה גבוה׳ מביע הפתעה - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["!", ".", "?", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_exclaim",
      subtype: "surprise",
    },
    {
      question: "בכתיבה: המשפט ׳ניפגש אחרי ההפסקה׳ הוא הודעה רגילה - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", "..."],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_meet_after_break",
      subtype: "statement",
    },
    {
      question: "בכתיבה: המשפט ׳מתי מתחיל השיעור׳ - איזה סימן פיסוק נכון בסוף המשפט?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_when_lesson",
      subtype: "wh_question",
    },
    {
      question: "בכתיבה: המשפט ׳אל תרוצו במסדרון׳ הוא הוראה חזקה - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["!", ".", "?", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_imperative_hall",
      subtype: "command",
    },
    {
      question: "בכתיבה: המשפט ׳הבאתי עפרון ומחק׳ ממשיך ברשימה - איזה סימן פיסוק מתאים בין ׳עפרון׳ ל׳מחק׳ בתוך המשפט?",
      answers: [",", ".", "?", "!"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_list_comma",
      subtype: "inline_pair",
    },
    {
      question: "בכתיבה: המשפט ׳תודה על העזרה׳ הוא משפט מנומס - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_thanks",
      subtype: "courtesy",
    },
  ],
  grammar: [
    { question: "במשפט ׳הילד קורא ספר׳ - איזו מילה היא הפועל?", answers: ["קורא", "הילד", "ספר", "המשפט"], correct: 0, subtopicId: "g2.pos_basic", patternFamily: "g2_grammar_pick_verb_read" },
    { question: "במשפט ׳הפרח יפה מאוד׳ - איזו מילה היא התואר?", answers: ["יפה", "הפרח", "מאוד", "המשפט"], correct: 0, subtopicId: "g2.pos_basic", patternFamily: "g2_grammar_pick_adj_flower" },
    {
      question: "איזה משפט נכון?",
      answers: ["הילדים קוראים", "הילדים קורא", "הילד קוראים", "הילדה קוראים"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
      patternFamily: "g2_grammar_plural_read",
    },
    {
      question: "במשפט ׳אתמול קראתי ספר׳ - באיזה זמן הפועל העיקרי?",
      answers: ["עבר", "הווה", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
      patternFamily: "g2_grammar_tense_yesterday_read",
    },
    { question: "במשפט ׳אני לומד בכיתה׳ - איזו מילה היא שם העצם?", answers: ["כיתה", "לומד", "אני", "ב"], correct: 0, subtopicId: "g2.pos_basic", patternFamily: "g2_grammar_pick_noun_classroom" },
    {
      question: "במשפט ׳עכשיו אני כותב במחברת׳ - באיזה זמן הפועל ׳כותב׳?",
      answers: ["הווה", "עבר", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
      patternFamily: "g2_grammar_tense_now_write",
    },
    {
      question: "במשפט ׳הילדות עייפות אחרי הטיול׳ - איזה ניסוח מתאים לרבים נקבה?",
      answers: ["הן עייפות", "הוא עייפות", "אתם עייפות", "את עייפות"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
      patternFamily: "g2_grammar_fem_plural_tired",
    },
    {
      question: "במשפט ׳מחר נכתוב תרגיל׳ - באיזה זמן הפועל ׳נכתוב׳?",
      answers: ["עתיד", "עבר", "הווה", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
      patternFamily: "g2_grammar_tense_tomorrow_write",
    },
    {
      question: "במשפט ׳הם שרים שיר ביחד׳ - איזה ניסוח מתאים לרבים זכר?",
      answers: ["הם שרים", "הוא שרים", "היא שרים", "אני שרים"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
      patternFamily: "g2_agreement_they_sing",
      subtype: "plural_masc",
    },
    {
      question: "במשפט ׳אמש ציירנו ציור גדול׳ - באיזה זמן הפועל ׳ציירנו׳?",
      answers: ["עבר", "הווה", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
      patternFamily: "g2_tense_emesh",
      subtype: "past_emesh",
    },
    { question: "איזה משפט לא תקין?", answers: ["אנחנו משחקים בחצר", "משחקים אנחנו בחצר בלי", "המורה מדברת בשקט", "הכלב רץ מהר"], correct: 1, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_illformed_scramble" },
    { question: "בחרו מילה שמשלימה: אחרי הטיול אנחנו ___ עייפים.", answers: ["היינו", "נהיה", "הולכים", "שולחן"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_cloze_after_trip" },
    { question: "איזו מילה לא שייכת לקבוצה?", answers: ["מחברת", "עיפרון", "מחק", "כיסא"], correct: 3, subtopicId: "g2.pos_basic", patternFamily: "g2_grammar_odd_school_objects" },
    { question: "איזה משפט עם סימן שאלה נכון?", answers: ["מה הביאו לפיקניק?", "מה הביאו לפיקניק.", "מה הביאו לפיקניק", "?מה הביאו לפיקניק"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_question_picnic" },
    { question: "בחרו משפט תקין:", answers: ["הן רצות בגן", "הן רץ בגן", "הוא רצות בגן", "אתם רצות בגן"], correct: 0, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_fem_plural_run" },
    { question: "במשפט ׳המורה הסבירה את השיעור׳ - באיזה זמן הפועל?", answers: ["עבר", "הווה", "עתיד", "לא ידוע"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_tense_teacher_explained" },
    { question: "בחרו משפט תקין לעתיד:", answers: ["בשבוע הבא נבקר במוזיאון", "בשבוע הבא ביקרנו במוזיאון", "בשבוע הבא ביקר במוזיאון", "בשבוע הבא נבקר אתמול"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_future_museum" },
    { question: "בחרו משפט עם חיבור נכון:", answers: ["נעליים וגרביים", "נעליים גרביים", "נעליים עם וגרביים", "ונעליים גרביים"], correct: 0, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_and_clothes" },
    { question: "במשפט ׳הילדים אכלו פירות׳ - באיזה זמן הפועל?", answers: ["עבר", "הווה", "עתיד", "לא ידוע"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_tense_ate_fruit" },
    { question: "איזה משפט מתאר הווה?", answers: ["היום אני לומד חדש", "אתמול למדתי חדש", "מחר אלמד חדש", "אתמול מחר אני לומד"], correct: 0, subtopicId: "g2.simple_tense", patternFamily: "g2_grammar_present_today" },
    { question: "בחרו משפט תקין:", answers: ["אתם מציירים תמונה", "אתם מציירת תמונה", "את מציירים תמונה", "אני מציירים תמונה"], correct: 0, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_you_masc_draw" },
    { question: "בחרו ניסוח מתאים ל׳אנחנו שמחים׳:", answers: ["אנחנו שמחים", "אנחנו שמחה", "אני שמחים", "הם שמחים אנחנו"], correct: 0, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_we_happy" },
    { question: "בחרו משפט תקין:", answers: ["הספרות על הלוח ברורות", "הספרות על הלוח ברור", "הספרות על הלוח ברורים", "הספרות ברורות על הלוח לא"], correct: 0, subtopicId: "g2.number_gender_light", patternFamily: "g2_grammar_fem_plural_board" },
  ],
  vocabulary: [
    { question: "איפה בוחרים ספרים להשאלה?", answers: ["בספרייה", "במקרר", "בארון נעליים", "בכיס"], correct: 0 },
    { question: "במה כותבים שיעורים בכיתה?", answers: ["במחברת", "במים", "בשמיים", "בכובע"], correct: 0 },
    { question: "מי מלמדת או מלמד בכיתה?", answers: ["מורה", "תלמיד", "שולחן", "ספר"], correct: 0 },
    { question: "מי לומד בכיתה?", answers: ["תלמיד או תלמידה", "מורה בלבד", "שולחן", "ספר"], correct: 0 },
    {
      question: "בחרו מילה נרדפת ל׳מהיר׳:",
      answers: ["זריז", "איטי", "קטן", "כבד"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳יפה׳:",
      answers: ["נאה", "גדול", "ארוך", "כבד"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳שמח׳ (מילה בסגנון דומה):",
      answers: ["עליז", "עצוב", "עייף", "כועס"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳ברור׳:",
      answers: ["בהיר", "מבולבל", "חשוך", "כבד"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳קטן׳ (כשמתארים גודל):",
      answers: ["זעיר", "ענק", "רחב", "כבד"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
      patternFamily: "g2_syn_small",
      subtype: "size_adj",
    },
    {
      question: "בחרו מילה נרדפת ל׳עייף׳:",
      answers: ["יָגֵעַ", "שמח", "מהיר", "צעיר"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
      patternFamily: "g2_syn_tired",
      subtype: "adjective",
    },
    {
      question: "לפי המשפט ׳אחרי הספורט היינו צמאים מאוד׳ - למה כנראה שתו מים?",
      answers: ["כי שיחקו והתאמצו", "כי ישנו", "כי ציירו", "כי קראו בשקט"],
      correct: 0,
      subtopicId: "g2.context_clue_easy",
    },
    {
      question: "לפי המשפט ׳המורה דיברה לאט כדי שכולם יבינו׳ - מה ׳לאט׳ אומר כאן?",
      answers: ["בקצב איטי", "בקול חזק", "בלי מילים", "בלי הסבר"],
      correct: 0,
      subtopicId: "g2.context_clue_easy",
    },
  ],
  speaking: [
    {
      question: "איך אומרים 'אני אוהב לקרוא ספרים'?",
      answers: ["אני אוהב לקרוא ספרים", "אני אוהבת לקרוא ספרים", "אני אוהבים לקרוא ספרים", "אני אוהבות לקרוא ספרים"],
      correct: 0,
      subtopicId: "g2.situation_register",
      patternFamily: "g2_speak_register_reading_like",
      subtype: "phrase_choice",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "מה אומרים כשמבקשים סליחה?",
      answers: ["סליחה", "תודה", "בבקשה", "שלום"],
      correct: 0,
      subtopicId: "g2.situation_register",
      patternFamily: "g2_speak_register_apology",
      subtype: "politeness",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "איך אומרים כשלא הבנו את ההוראות?",
      answers: ["אפשר להסביר שוב?", "אני צריך ספר", "אני צריך כלב", "אני צריך בית"],
      correct: 0,
      subtopicId: "g2.situation_register",
      patternFamily: "g2_speak_register_clarify",
      subtype: "classroom_help",
      authenticity_pattern: "situational_phrase_register",
    },
    {
      question: "בחרו משפט קצר שמתאר גן עם פרחים:",
      answers: ["בגן יש פרחים צבעוניים", "אני אוהב ספרים", "המורה קוראת", "לילה טוב"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_garden_flowers",
      subtype: "garden",
      authenticity_pattern: "guided_description_sentence_choice",
    },
    {
      question: "בחרו משפט קצר שמתאר יום גשום בבית הספר:",
      answers: ["ירד גשם ונכנסנו מהר לכיתה", "השמש זרחה ולא היה ענן", "אכלנו גלידה על הגג", "ישנו בחצר כל הלילה"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_rain_day",
      subtype: "weather_school",
      authenticity_pattern: "guided_description_sentence_choice",
    },
    {
      question: "בחרו משפט קצר שמתאר חברות שמשחקות בחצר בהפסקה:",
      answers: ["שתי חברות קופצות בחבל בחצר", "כולם ישנים בשקט בכיתה", "המורה כותבת על הלוח לבד", "אין אף אחד בבית הספר"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_recess_rope",
      subtype: "playground",
    },
    {
      question: "בחרו משפט קצר שמתאר ארוחת צהריים חמה בבית:",
      answers: ["אמא הגישה מרק חם ולחם", "אכלנו רק קרח בבוקר", "שיחקנו כדורסל בלי לאכול", "ישנו במסדרון בלי אוכל"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_lunch_home",
      subtype: "meal",
    },
    {
      question: "בחרו משפט קצר שמתאר כלב קטן ושמח בפארק:",
      answers: ["הכלב הקטן רץ עם זנב מרוצה", "הכלב ישן על הספה כל היום", "אין כלב רק חתול עצוב", "הכלב קורא ספר בעצמו"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_happy_puppy",
      subtype: "animal",
    },
    {
      question: "בחרו משפט קצר שמתאר הכנות לפני הצגה בכיתה:",
      answers: ["תרגלנו את השורות וסידרנו תחפושות", "שכחנו את ההצגה וביקשנו לבטל", "לא דיברנו אחד עם השני", "ישבנו בלי לזוז בחוץ"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_play_prep",
      subtype: "class_play",
    },
    {
      question: "בחרו משפט קצר שמתאר לילה עם ירח מלא ושמיים בהירים:",
      answers: ["הירח זרח והכוכבים נראו בבירור", "היה חושך מוחלט בלי ירח", "ירד שלג כבד בלי רוח", "השמש זרחה בחצות"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_moon_night",
      subtype: "night_sky",
    },
  ],
};

const G2_MEDIUM_QUESTIONS = {
  reading: [
    {
      question: "קרא את המשפט: 'הילדים קוראים ספרים בכיתה'",
      answers: [
        "הילדים קוראים ספרים בכיתה",
        "ילידים קוראים ספרים בכיתה",
        "הילדים קוראים ספרים בכתה",
        "הילדים קוראים ספים בכיתה",
      ],
      correct: 0,
    },
    {
      question: "קרא את המשפט: 'המורה מלמדת את הילדים'",
      answers: [
        "המורה מלמדת את הילדים",
        "המורה מלמדת את הילידים",
        "המורה מלמת את הילדים",
        "המורה מלמדת את ילדים",
      ],
      correct: 0,
    },
    { question: "השלימו את המילה במשפט: בכיתה יושבים ת_למידים.", answers: ["תלמידים", "תלמידין", "תלמידיים", "טלמידים"], correct: 0 },
    {
      question: "קרא את המשפט: 'הילדים שרים שירים'",
      answers: ["הילדים שרים שירים", "ילידים שרים שירים", "הילדים שרים שיריים", "הילדים שרין שירים"],
      correct: 0,
    },
    {
      question: "בקריאה: איזה סימן פיסוק מתאים בסוף משפט מפתיע - ׳אוי׳?",
      answers: ["!", "?", ".", ","],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'תלמידים'",
      answers: ["תלמידים", "תלמידין", "תלמידיים", "טלמידים"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'אחר הצהריים אנחנו קוראים בכיתה'",
      answers: [
        "אחר הצהריים אנחנו קוראים בכיתה",
        "אחר הצהריים אנחנו קראים בכיתה",
        "אחר הצהריים אנחנו קוראים בכתה",
        "אחר הצהריים אנחנו קורין בכיתה",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "בקריאה: בסוף משפט שמספרים בו עובדה רגילה - איזה סימן פיסוק מתאים?",
      answers: [".", "?", "!", "..."],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'הכנה'",
      answers: ["הכנה", "הכנא", "הכניה", "יכנה"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'לפני המבחן חזרנו על החומר בשקט'",
      answers: [
        "לפני המבחן חזרנו על החומר בשקט",
        "לפני המבחן חזרנו על החומר בשקד",
        "לפני המבחן חזנו על החומר בשקט",
        "לפני המבחקן חזרנו על החומר בשקט",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "איזו גרסה נכונה לקריאה בקול (ללא כפילות מילים)?",
      answers: ["ניסינו שוב עד שהצלחנו", "ניסינו שוב שוב עד שהצלחנו", "ניסינו עד הצלחנו בלי ניסיון", "שוב ניסינו ניסינו"],
      correct: 0,
      subtopicId: "g2.short_sentence",
      patternFamily: "g2_read_no_dup",
      subtype: "try_again",
    },
    {
      question: "קרא את המילה: 'תַזְכִּירִית'",
      answers: ["תזכירית", "תזכיריית", "תיזכירית", "טזכירית"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_fluent_tazkir",
      subtype: "longer_word",
    },
  ],
  comprehension: [
    { question: "במשפט 'ילדים קוראים ספרים בכיתה' - מה קורה?", answers: ["קוראים ספרים", "מבשלים", "ישנים", "רצים במסלול"], correct: 0 },
    { question: "כשהשמש זורחת בבוקר ומאירה - מה זה אומר?", answers: ["יש אור וחום", "הכל חשוך", "יורד גשם תמיד", "הלילה מתחיל"], correct: 0 },
    { question: "מה ההפך של 'עצוב'?", answers: ["שמח", "עצוב", "יפה", "גדול"], correct: 0 },
    {
      question: "לפי הסדר: ׳קודם נכנסים לאולם ואז יושבים׳ - מה קורה ראשון?",
      answers: ["נכנסים לאולם", "יושבים", "שניהם יחד", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי הסדר: ׳קודם פותחים ספר ואז קוראים את השורה הראשונה׳ - מה קורה אחרי הפתיחה?",
      answers: ["קוראים את השורה הראשונה", "פותחים ספר", "סוגרים ספר", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי המשפט ׳הילדים הכינו פוסטר לכיתה והדביקו תמונות׳ - מה הם כנראה הכינו?",
      answers: ["עבודה ויזואלית לקיר", "ארוחת בוקר", "רשימת קניות", "מפת דרכים"],
      correct: 0,
      subtopicId: "g2.light_inference",
    },
    {
      question: "לפי הסדר: ׳קודם קוראים את השאלה ואז בוחרים תשובה׳ - מה קורה ראשון?",
      answers: ["קוראים את השאלה", "בוחרים תשובה", "שניהם יחד", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
  ],
  writing: [
    {
      question: "דף קטן או פתק שעוזר לזכור מילים לבחינה - בחרו איות למילה שמתארת את החפץ:",
      answers: ["תזכירית", "תזכיריית", "תיזכירית", "טזכירית"],
      correct: 0,
      subtopicId: "g2.fluent_words",
      patternFamily: "g2_writing_spell_tazkir",
      subtype: "object_meaning",
    },
    {
      question: "השלימו איות: ניסינו ש_ עד שהצלחנו.",
      answers: ["שוב", "שובב", "שובש", "שובא"],
      correct: 0,
      subtopicId: "g2.sentence_wellformed",
      patternFamily: "g2_writing_cloze_shuv",
      subtype: "orthography_slot",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["שוב"],
      maxTypingChars: 8,
    },
    {
      question:
        "כתבו משפט קצר אחד בכתיב תקין (אותיות ורווחים), לפי המשמעות: ילדים משחקים בחצר בבית הספר.",
      answers: ["הילדים משחקים בחצר", "ילידים משחקים בחצר", "הילדים משחקים בחצה", "הילדים משחקים בצר"],
      correct: 0,
      subtopicId: "g2.sentence_wellformed",
      patternFamily: "g2_spelling_sentence_wellformed_yard",
      subtype: "pick_correct_sentence",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["הילדים משחקים בחצר"],
      maxTypingChars: 40,
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳המורה בכיתה׳:",
      answers: [
        "המורה מסבירה. הילדים מקשיבים.",
        "מורה",
        "כיתה",
        "ספר",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳טיול בשביל׳:",
      answers: [
        "הלכנו לאט. עצרנו לשתות מים. חזרנו שמחים.",
        "שביל",
        "טיול",
        "מים",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳ביקור בספרייה׳:",
      answers: [
        "נכנסנו בשקט. בחרנו ספר. ישבנו לקרוא.",
        "ספרייה",
        "ספר",
        "שקט",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question:
        "בכתיבה: המשפט ׳המורה ביקשה שקט כדי להסביר את הניסוי׳ מסתיים כהודעה - כתבו מילה אחת: איך קוראים לסימן המתאים בסוף? (נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["נקודה", "סימן שאלה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_teacher_quiet",
      subtype: "complex_declarative",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["נקודה"],
      maxTypingChars: 16,
    },
    {
      question:
        "בכתיבה: המשפט ׳למה לא הבאת את המחברת׳ - כתבו מילה אחת: איך קוראים לסימן הנכון בסוף? (נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["סימן שאלה", "נקודה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_why_notebook",
      subtype: "why_question",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["סימן שאלה"],
      maxTypingChars: 16,
    },
    {
      question: "בכתיבה: המשפט ׳זהירות הרצפה רטובה׳ הוא אזהרה קצרה - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["!", ".", "?", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_wet_floor",
      subtype: "warning_sign",
    },
    {
      question: "בכתיבה: המשפט ׳אחר הצהריים יש מפגש עם ההורים׳ - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_parents_meeting",
      subtype: "schedule_note",
    },
    {
      question: "בכתיבה: המשפט ׳מי אחראי על לוח המודעות השבוע׳ - איזה סימן פיסוק נכון בסוף המשפט?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_who_board",
      subtype: "who_question",
    },
    {
      question: "בכתיבה: המשפט ׳הכנו חומרים נייר צבעים ודבק׳ מפרט רשימה - איזה סימן פיסוק מתאים אחרי ׳נייר׳ בתוך המשפט?",
      answers: [",", ".", "?", "!"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_supply_list",
      subtype: "serial_comma",
    },
    {
      question: "בכתיבה: המשפט ׳האם כולם הבינו את ההוראות׳ - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_haim_understood",
      subtype: "yes_no_question_style",
    },
    {
      question: "בכתיבה: המשפט ׳נתראה מחר בבוקר׳ הוא משלום קצר - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_see_tomorrow",
      subtype: "closing_line",
    },
  ],
  grammar: [
    { question: "מה חלק הדיבר של המילה 'קוראים'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0 },
    { question: "מה חלק הדיבר של המילה 'מורה'?", answers: ["שם עצם", "פועל", "תואר", "מספר"], correct: 0 },
    {
      question: "איזה משפט נכון?",
      answers: ["המורה מלמדת", "המורה מלמד", "המורה מלמדים", "המורה מלמדות"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
    },
    {
      question: "במשפט ׳מחר נלך לטיול׳ - באיזה זמן הפועל ׳נלך׳?",
      answers: ["עתיד", "עבר", "הווה", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
    },
    {
      question: "במשפט ׳בשבוע הבא נבקר במוזיאון׳ - באיזה זמן הפועל ׳נבקר׳?",
      answers: ["עתיד", "עבר", "הווה", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
    },
    {
      question: "במשפט ׳אתמול ציירנו שלט לכיתה׳ - באיזה זמן הפועל ׳ציירנו׳?",
      answers: ["עבר", "הווה", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
    },
  ],
  vocabulary: [
    { question: "מי מסבירה לעיתים שיעור בכיתה?", answers: ["מורה", "תלמיד", "שולחן", "ספר"], correct: 0 },
    { question: "איפה משחקים לפעמים בין המבנים?", answers: ["בחצר", "במחברת", "במקרר", "בכובע"], correct: 0 },
    {
      question: "בחרו מילה נרדפת ל׳קטן׳:",
      answers: ["זעיר", "גדול", "ארוך", "כבד"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳רעש׳:",
      answers: ["קול חזק", "שקט", "שינה", "אוכל"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳מסודר׳:",
      answers: ["מאורגן", "מבולגן", "רועש", "עייף"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "לפי המשפט ׳הרוח נשבה חזק והענפים זזו׳ - מה כנראה קרה בחוץ?",
      answers: ["הייתה רוח", "היה שלג", "היה שקט מוחלט", "היה חושך"],
      correct: 0,
      subtopicId: "g2.context_clue_easy",
    },
  ],
  speaking: [
    { question: "איך מבקשים עזרה בנימוס אחרי שניסו לבד?", answers: ["אפשר עזרה?", "תן לי עכשיו", "אל תדבר אליי", "אני לא צריך"], correct: 0 },
    { question: "איך אומרים כשהבנו את ההסבר?", answers: ["הבנתי", "לא הבנתי", "ביי", "רגע"], correct: 0 },
    {
      question: "בחרו משפט קצר שמתאר עבודה בקבוצה שמתקדמת בצורה מסודרת:",
      answers: ["חילקנו תפקידים וכל אחד עשה את חלקו בזמן", "רבנו ולא סיימנו כלום", "עזבנו את החומרים על הרצפה", "דיברנו רק על משחקים בלי לעבוד"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_group_work",
      subtype: "teamwork",
    },
    {
      question: "בחרו משפט קצר שמתאר טיול בטבע עם שביל ועצים גבוהים:",
      answers: ["הלכנו בשביל הצל ושמענו ציפורים בין הענפים", "ישבנו במרתף בלי חלונות", "שחינו בבריכה מלאה קרח", "לא יצאנו מהאוטובוס בכלל"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_nature_trail",
      subtype: "forest_path",
    },
    {
      question: "בחרו משפט קצר שמתאר ילד שמתאמן בסבלנות עד שהצליח:",
      answers: ["נפל פעמיים אבל קם שוב עד שהצליח", "ויתר אחרי ניסיון אחד ועזב", "לא ניסה כי פחד מכל דבר", "ביקש שיעשו לו את העבודה"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_persist_practice",
      subtype: "effort",
    },
    {
      question: "בחרו משפט קצר שמתאר כיתה אחרי ניקיון: הכל מסודר וריח נעים:",
      answers: ["סידרנו שולחנות ושטפנו את הלוח והאוויר נקי", "השארנו פסולת בכל פינה", "שברנו כיסאות בכוונה", "פתחנו חלונות וזרקנו ספרים"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_clean_class",
      subtype: "classroom_cleanup",
    },
    {
      question: "בחרו משפט קצר שמתאר מפגש עם סבא שמספר סיפור ישן:",
      answers: ["סבא ישב בכורסה וסיפר על ילדותו בקול רגוע", "סבא שתק ולא אמר מילה", "סבא רץ במסלול במהירות", "סבא ביקש שנלמד אנגלית בלבד"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_grandpa_story",
      subtype: "family_scene",
    },
    {
      question: "בחרו משפט קצר שמתאר שוק רועש עם הרבה ריחות ואנשים:",
      answers: ["המקום היה רועש וריח תבלין עלה מאחת הדוכנים", "לא היה אף אדם ולא נשמע קול", "ישבנו בשקט בספרייה", "היה רק שלג בלי דוכנים"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_busy_market",
      subtype: "sensory_place",
    },
  ],
};

const G2_HARD_QUESTIONS = {
  reading: [
    {
      question: "קרא את המשפט: 'הילדים קוראים ספרים ומכינים שיעורי בית'",
      answers: [
        "הילדים קוראים ספרים ומכינים שיעורי בית",
        "ילידים קוראים ספרים ומכינים שיעורי בית",
        "הילדים קראים ספרים ומכינים שיעורי בית",
        "הילדים קוראים ספרים ומכינים שיעורי ביית",
      ],
      correct: 0,
    },
    {
      question: "קרא את המשפט: 'המורה מסבירה לילדים על הטבע'",
      answers: [
        "המורה מסבירה לילדים על הטבע",
        "המורה מסבירה לילידים על הטבע",
        "המורה מסביירה לילדים על הטבע",
        "המורה מסבירה לילדים על טבע",
      ],
      correct: 0,
    },
    {
      question: "בקריאה: אחרי סיפור קצר ומפתיע - איזה סימן פיסוק מתאים אחרי המילה ׳פתאום׳?",
      answers: ["!", ".", "?", ","],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'הכנות'",
      answers: ["הכנות", "היכנות", "הכנוט", "הכנותת"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'בערב המורה סוגרת את הכיתה בזהירות'",
      answers: [
        "בערב המורה סוגרת את הכיתה בזהירות",
        "בערב המורה סגרת את הכיתה בזהירות",
        "בערב המורה סוגרת את הכתה בזהירות",
        "בערב המורס סוגרת את הכיתה בזהירות",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "קרא את המשפט: 'הילדים מכינים מצגת קצרה על הטבע'",
      answers: [
        "הילדים מכינים מצגת קצרה על הטבע",
        "ילידים מכינים מצגת קצרה על הטבע",
        "הילדים מכינים מצגת קצרא על הטבע",
        "הילדים מכינים מצגת קצרה על טבע",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
    {
      question: "בקריאה: אחרי רשימה קצרה של פריטים (׳עיפרון, מחק, סרגל׳) - איזה סימן פיסוק מתאים בין פריט לפריט?",
      answers: [",", ".", "?", "!"],
      correct: 0,
      subtopicId: "g2.simple_punctuation_read",
    },
    {
      question: "קרא את המילה: 'תזכורת'",
      answers: ["תזכורת", "תזכורט", "תיזכורת", "טזכורת"],
      correct: 0,
      subtopicId: "g2.fluent_words",
    },
    {
      question: "קרא את המשפט: 'אחרי ההפסקה נכנסנו בשקט לכיתה'",
      answers: [
        "אחרי ההפסקה נכנסנו בשקט לכיתה",
        "אחרי ההפסקה נכנסנו בשקט לכתה",
        "אחרי ההפסקה נכנסנו בשקד לכיתה",
        "אחרי ההפסקה נכסנו בשקט לכיתה",
      ],
      correct: 0,
      subtopicId: "g2.short_sentence",
    },
  ],
  comprehension: [
    { question: "במשפט 'ילדים קוראים ספרים ומכינים שיעורי בית' - מה הם עושים?", answers: ["קוראים ומתכוננים", "רק משחקים", "רק ישנים", "רק מציירים"], correct: 0 },
    {
      question: "כשהשמש זורחת בבוקר ומאירה את העולם - מה נכון לומר על האור בחוץ?",
      answers: ["יש הרבה אור מהשמש", "השמש נעלמת", "הכל חשוך", "רק עננים"],
      correct: 0,
      subtopicId: "g2.light_inference",
    },
    {
      question: "לפי הסדר: ׳קודם אוכלים ארוחת בוקר ואז יוצאים לדרך׳ - מה קורה אחרי הארוחה?",
      answers: ["יוצאים לדרך", "אוכלים ארוחת בוקר", "שניהם יחד", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי הסדר: ׳קודם כותבים טיוטה ואז מתקנים שגיאות׳ - מה עושים אחרי הטיוטה?",
      answers: ["מתקנים שגיאות", "כותבים טיוטה", "קוראים בלבד", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
    {
      question: "לפי המשפט ׳הילדים הכינו חומרים לשבוע המדעים ושאלו שאלות׳ - מה כנראה היה המטרה?",
      answers: ["להבין ולחקור נושא", "לבשל ארוחת צהריים", "לישון מוקדם", "לסגור את בית הספר"],
      correct: 0,
      subtopicId: "g2.light_inference",
    },
    {
      question: "לפי הסדר: ׳קודם מסדרים חומרים ואז מתחילים לעבוד בקבוצה׳ - מה קורה ראשון?",
      answers: ["מסדרים חומרים", "מתחילים לעבוד בקבוצה", "שניהם יחד", "לא כתוב"],
      correct: 0,
      subtopicId: "g2.simple_sequence",
    },
  ],
  writing: [
    { question: "איזה משפט נכון?", answers: ["אני קורא ספר ומכין שיעורי בית", "אני קוראת ספר ומכינה שיעורי בית", "אני קוראים ספר ומכינים שיעורי בית", "אני קוראות ספר ומכינות שיעורי בית"], correct: 0 },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳עבודה בקבוצה׳:",
      answers: [
        "תכננו יחד. חילקו תפקידים. הצליחו.",
        "קבוצה",
        "עבודה",
        "מורה",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳יום חורף בבית הספר׳:",
      answers: [
        "ירד גשם. לבשנו מעילים. למדנו בשקט.",
        "חורף",
        "גשם",
        "מעיל",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question: "בחרו פסקה קצרה שמתאימה לנושא ׳הכנות ליום הורים׳:",
      answers: [
        "ניקינו את הכיתה. תלינו עבודות. הכנו כיסאות.",
        "יום הורים",
        "כיתה",
        "כיסא",
      ],
      correct: 0,
      subtopicId: "g2.short_paragraph_choice",
    },
    {
      question:
        "בכתיבה: המשפט ׳הילדים הציגו פרויקט והקהל מחא כפיים׳ מסתיים כעובדה מלאה - כתבו מילה אחת: איך קוראים לסימן המתאים בסוף? (נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["נקודה", "סימן שאלה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_project_applause",
      subtype: "compound_sentence_end",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["נקודה"],
      maxTypingChars: 16,
    },
    {
      question:
        "בכתיבה: המשפט ׳איך בחרתם את הנושא לעבודה המשותפת׳ - כתבו מילה אחת: איך קוראים לסימן הנכון בסוף? (נקודה / סימן שאלה / סימן קריאה / פסיק)",
      answers: ["סימן שאלה", "נקודה", "סימן קריאה", "פסיק"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_how_topic",
      subtype: "how_question",
      preferredAnswerMode: "typing",
      typingAcceptedAnswers: ["סימן שאלה"],
      maxTypingChars: 16,
    },
    {
      question: "בכתיבה: המשפט ׳שימו לב השער נסגר בעוד חמש דקות׳ הוא אזהרה דחופה - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["!", ".", "?", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_gate_closing",
      subtype: "urgent_notice",
    },
    {
      question: "בכתיבה: המשפט ׳הנחיות הבטיחות חלות על כולם בלי יוצא מן הכלל׳ - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_safety_rules",
      subtype: "formal_rule",
    },
    {
      question: "בכתיבה: המשפט ׳מי חתם על רשימת הנוכחים לטיול׳ - איזה סימן פיסוק נכון בסוף המשפט?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_trip_attendance",
      subtype: "admin_question",
    },
    {
      question: "בכתיבה: המשפט ׳נבדוק שוב את התוצאות לפני שמדפיסים׳ - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: [".", "?", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_check_before_print",
      subtype: "planning_sentence",
    },
    {
      question: "בכתיבה: המשפט ׳האם מותר להשתמש במחשב בשלב זה של העבודה׳ - איזה סימן פיסוק מתאים בסוף המשפט?",
      answers: ["?", ".", "!", ","],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_computer_allowed",
      subtype: "permission_question",
    },
    {
      question: "בכתיבה: המשפט ׳ספרים מחברות ומחקים מסודרים על המדף׳ - איזה סימן פיסוק מתאים אחרי ׳מחברות׳ בתוך המשפט?",
      answers: [",", ".", "?", "!"],
      correct: 0,
      subtopicId: "g2.punctuation_choice",
      patternFamily: "g2_writing_punct_shelf_series",
      subtype: "three_item_list",
    },
  ],
  grammar: [
    { question: "מה חלק הדיבר של המילה 'מכינים'?", answers: ["פועל", "שם עצם", "תואר", "מספר"], correct: 0 },
    {
      question: "איזה משפט נכון?",
      answers: ["הילדים קוראים ומכינים", "הילדים קורא ומכין", "הילד קוראים ומכינים", "הילדה קוראים ומכינים"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
    },
    {
      question: "במשפט ׳אתמול למדנו שיעור מעניין׳ - באיזה זמן הפועל העיקרי ׳למדנו׳?",
      answers: ["עבר", "הווה", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
    },
    {
      question: "במשפט ׳היום אנחנו לומדים שיעור חדש׳ - באיזה זמן הפועל ׳לומדים׳?",
      answers: ["הווה", "עבר", "עתיד", "לא ידוע"],
      correct: 0,
      subtopicId: "g2.simple_tense",
    },
    {
      question: "במשפט ׳המורות הסבירו את הניסוי בזהירות׳ - איזה ניסוח מתאים לרבים נקבה?",
      answers: ["הן הסבירו", "הוא הסבירו", "הם הסבירו", "אתה הסבירו"],
      correct: 0,
      subtopicId: "g2.number_gender_light",
    },
  ],
  vocabulary: [
    { question: "מה כוללים עצים, בעלי חיים ואוויר בחוץ?", answers: ["טבע", "מחברת", "מחק", "שולחן"], correct: 0 },
    {
      question: "בחרו מילה נרדפת ל׳חכם׳:",
      answers: ["נבון", "איטי", "קטן", "עצוב"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳עצוב׳ (מילה בסגנון דומה):",
      answers: ["מדוכא", "שמח", "מהיר", "גבוה"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "בחרו מילה נרדפת ל׳עייף׳:",
      answers: ["תשוש", "מהיר", "גבוה", "צר"],
      correct: 0,
      subtopicId: "g2.synonyms_basic",
    },
    {
      question: "לפי המשפט ׳הילדים לבשו חליפות ויצאו לבמה׳ - איפה הם כנראה היו?",
      answers: ["בהצגה או מופע", "במקרר", "במחסן כלים", "בבריכה"],
      correct: 0,
      subtopicId: "g2.context_clue_easy",
    },
  ],
  speaking: [
    { question: "איך אומרים 'אני מבין את השיעור'?", answers: ["אני מבין את השיעור", "אני מבינה את השיעור", "אני מבינים את השיעור", "אני מבינות את השיעור"], correct: 0 },
    {
      question: "בחרו משפט קצר שמתאר רגע לפני מבחן: מתח שקט והכנה אחרונה:",
      answers: ["הכנסנו עיפרונות בדקנו שעון ונשמנו נשימה עמוקה", "צחקנו בקול עד שהמורה עזבה", "זרקנו את המחברות לפח", "ישנו על השולחן בלי להתכונן"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_before_exam",
      subtype: "exam_moment",
    },
    {
      question: "בחרו משפט קצר שמתאר פרויקט מדעים שבו בודקים השערה בזהירות:",
      answers: ["כתבנו ניבוי מדדנו פעמיים ורשמנו תוצאות בטבלה", "ניחשנו בלי לקרוא הוראות", "שברנו את כל הציוד בכוונה", "דילגנו על השלב של הבדיקה"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_science_fair",
      subtype: "hypothesis",
    },
    {
      question: "בחרו משפט קצר שמתאר חזרה הביתה אחרי יום ארוך: עייפות ושקט בדרך:",
      answers: ["הלכתי לאט עם התיק והרחוב היה שקט יחסית", "רצתי כל הדרך בלי לנשום", "שכחתי איפה הבית", "נשארתי בבית הספר עד בוקר"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_walk_home_tired",
      subtype: "after_school",
    },
    {
      question: "בחרו משפט קצר שמתאר שיחה קשה שנפתרה בכבוד הדדי:",
      answers: ["הקשבנו אחד לשני ומצאנו פשרה בלי לצעוק", "העלמנו את הבעיה ולא דיברנו יותר", "האשמנו אחד את השני בלי להקשיב", "עזבנו באמצע בלי לומר שלום"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_conflict_resolve",
      subtype: "social_resolution",
    },
    {
      question: "בחרו משפט קצר שמתאר ביקור במוזיאון עם הסבר מודרך מעניין:",
      answers: ["המדריכה עצרה ליד התצוגה והסבירה על החפץ בקצרה", "לא שמענו כלום ורצנו בין הקירות", "המוזיאון היה סגור והתעלמנו", "ישבנו בחוץ בלי להיכנס"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_museum_guide",
      subtype: "cultural_visit",
    },
    {
      question: "בחרו משפט קצר שמתאר תחושת הצלחה אחרי מאמץ מתמשך:",
      answers: ["אחרי תרגול ארוך הצלחתי סוף סוף והרגשתי גאווה שקטה", "ויתרתי לפני שבאמת ניסיתי", "הצלחתי בלי לעשות כלום", "התביישתי כשכולם צחקו"],
      correct: 0,
      subtopicId: "g2.describe_prompt_choice",
      patternFamily: "g2_speak_describe_pride_after_work",
      subtype: "achievement",
    },
  ],
};

// ========== כיתה ג' ==========
const G3_EASY_QUESTIONS = {
  reading: G3_READING_EASY,
  comprehension: [
    { question: "מה המשמעות של 'ילדים קוראים ספרים ומתכוננים למבחן'?", answers: ["ילדים קוראים ספרים ומתכוננים למבחן", "ילדים משחקים", "ילדים אוכלים", "ילדים ישנים"], correct: 0 },
    { question: "מה ההשוואה בין 'בוקר' ל-'ערב'?", answers: ["בוקר - התחלת היום, ערב - סוף היום", "בוקר - ערב", "אין הבדל", "בוקר - לילה"], correct: 0 },
    { question: "מה המשמעות של 'ספר מעניין'?", answers: ["ספר מעניין", "ספר משעמם", "ספר קטן", "ספר גדול"], correct: 0 },
    {
      question: "למה נרטבים מסלול החצר אחרי גשם?",
      answers: ["כי הגשם שוטף את האדמה", "כי השמש חמה מאוד", "כי הילדים ישנים", "כי הספר נסגר"],
      correct: 0,
      subtopicId: "g3.cause_effect",
    },
    {
      question: "במה דומים 'חלון' ו'פתח' בטקסט שמתאר כיתה?",
      answers: ["שניהם מאפשרים להביט החוצה", "שניהם פירות", "שניהם חיות מחמד", "שניהם משחקים"],
      correct: 0,
      subtopicId: "g3.compare_light",
    },
    {
      question: "למה לפעמים נסגרים חלונות כשמתחיל סופת רוח חזקה?",
      answers: ["כדי למנוע נזק או כניסת חפצים", "כדי שהשמש תיכנס יותר", "כדי שהספר יישן", "כדי שהמורה תיעלם"],
      correct: 0,
      subtopicId: "g3.cause_effect",
      patternFamily: "g3_cause_window_storm",
      subtype: "safety",
    },
    {
      question: "השווּ: מה ההבדל העיקרי בין 'תכנון' ל'התרשמות' בדיון על טיול?",
      answers: ["תכנון הוא לפני; התרשמות היא אחרי החוויה", "אין שום הבדל", "שניהם אותו דבר תמיד", "שניהם רק מספרים"],
      correct: 0,
      subtopicId: "g3.compare_light",
      patternFamily: "g3_compare_plan_vs_impression",
      subtype: "temporal_contrast",
    },
  ],
  writing: [
    { question: "איזה פתיחה טובה לפסקה על 'יום כיף'?", answers: ["היה לי יום כיף היום", "היום יום", "כיף", "אני"], correct: 0 },
    { question: "איך מסיימים פסקה?", answers: ["בסימן נקודה", "בסימן שאלה", "בסימן קריאה", "בלי סימן"], correct: 0 },
    { question: "איזה משפט נכון?", answers: ["אני קורא ספר ומתכונן למבחן", "אני קוראת ספר ומתכוננת למבחן", "אני קוראים ספר ומתכוננים למבחן", "אני קוראות ספר ומתכוננות למבחן"], correct: 0 },
    {
      question: "בחרו מילת חיבור מתאימה: 'התכוננו למבחן' ____ 'יצאנו לחצר להירגע.'",
      answers: ["ואז", "בגלל", "למרות", "אם"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
    },
    {
      question: "בחרו מילת חיבור: 'רצינו לשחק בחוץ' ____ 'ירד גשם.'",
      answers: ["אבל", "לכן", "וגם", "אזי"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
      patternFamily: "g3_connector_contrast_weather",
      subtype: "aval",
    },
    {
      question: "השלימו: 'סיימנו את המטלה' ____ 'הגשנו אותה במועד.'",
      answers: ["ולכן", "אבל", "למרות", "אולי"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
      patternFamily: "g3_connector_result_task",
      subtype: "velachen",
    },
  ],
  grammar: [
    { question: "מה הזמן של המילה 'קורא'?", answers: ["הווה", "עבר", "עתיד", "לא ידוע"], correct: 0 },
    { question: "מה הזמן של המילה 'קראתי'?", answers: ["עבר", "הווה", "עתיד", "לא ידוע"], correct: 0 },
    { question: "מה מילת הקישור במשפט: 'אני קורא ספר וגם כותב מכתב'?", answers: ["וגם", "אני", "קורא", "מכתב"], correct: 0 },
  ],
  vocabulary: [
    { question: "מה המשמעות של המילה 'הרפתקאות'?", answers: ["הרפתקאות", "משעמם", "רגיל", "פשוט"], correct: 0 },
    { question: "מה המשמעות של המילה 'מבחן'?", answers: ["מבחן", "שיעור", "ספר", "כיתה"], correct: 0 },
    {
      question: "איזו מילה משלימה את המשפחה: קריאה, קורא, ____?",
      answers: ["קרא", "ספר", "כיתה", "מורה"],
      correct: 0,
      subtopicId: "g3.word_families",
    },
    {
      question: "במשפט 'הילד עייף אחרי המשחק' - מה המשמעות של 'עייף' כאן?",
      answers: ["מותש ורוצה מנוחה", "שמח מאוד", "רעב בלבד", "קורא בקול"],
      correct: 0,
      subtopicId: "g3.context_meaning",
    },
    {
      question: "איזו מילה משלימה את המשפחה: למידה, לומד, ____?",
      answers: ["למד", "ספר", "חלון", "שולחן"],
      correct: 0,
      subtopicId: "g3.word_families",
      patternFamily: "g3_family_lamad",
      subtype: "lamad_root",
    },
    {
      question: "במשפט 'היא דיברה בלחש כדי לא להפריע' - מה המשמעות של 'בלחש' בהקשר?",
      answers: ["בקול שקט מאוד", "בקול רם", "בלי מילים בכלל", "רק בשירה"],
      correct: 0,
      subtopicId: "g3.context_meaning",
      patternFamily: "g3_context_whisper",
      subtype: "volume",
    },
  ],
  speaking: [
    { question: "איך אומרים 'אני מתכונן למבחן'?", answers: ["אני מתכונן למבחן", "אני מתכוננת למבחן", "אני מתכוננים למבחן", "אני מתכוננות למבחן"], correct: 0 },
    { question: "איך מתארים חוויה?", answers: ["אני מספר מה קרה", "אני שותק", "אני בוכה", "אני צוחק"], correct: 0 },
  ],
};

const G3_MEDIUM_QUESTIONS = {
  reading: [
    ...G3_READING_MEDIUM_BANK,
    {
      question:
        "כיתה ג׳ - טקסט מידעי מול סיפור (1): 'בטבלה: 12 ימים עם גשם, 18 בלי גשם.' לעומת סיפור: 'הגשם דפק על החלון.' מה ההבדל בז׳אנר?",
      answers: ["במידע יש עובדות ובסיפור יש עלילה ותיאור חווייתי", "אין הבדל", "שניהם רק שירים", "במידע חייבת להיות עלילה"],
      correct: 0,
      subtopicId: "g3.genre_tag_info_vs_story",
      patternFamily: "phase717_p0_genre",
      subtype: "n1",
    },
    {
      question:
        "כיתה ג׳ - טקסט מידעי מול סיפור (2): 'המים רותחים ב-100°C (בלחץ אטמוספרי רגיל).' לעומת: 'הקומקום שרק כועס.' מה נכון?",
      answers: ["במשפט המידעי יש ניסוח עובדתי; בסיפור יש דימוי", "בשניהם רק מספרים", "במידע אסור להשתמש במילים", "בסיפור חייבים רק טבלאות"],
      correct: 0,
      subtopicId: "g3.genre_tag_info_vs_story",
      patternFamily: "phase717_p0_genre",
      subtype: "n2",
    },
    {
      question:
        "כיתה ג׳ - טקסט מידעי מול סיפור (3): 'מחקר מצא ששתיית מים מסייעת בריכוז.' לעומת: 'דני שתה והרגיש גיבור.' מה מאפיין את המידע?",
      answers: ["מקור/ממצא מנוסח בזהירות; בסיפור דגש על דמות ורגש", "רק שמות", "רק צחוק", "אין הבדל"],
      correct: 0,
      subtopicId: "g3.genre_tag_info_vs_story",
      patternFamily: "phase717_p0_genre",
      subtype: "n3",
    },
    {
      question:
        "כיתה ג׳ - טקסט מידעי מול סיפור (4): 'לוח שנה: 365 ימים.' לעומת: 'השנה רצה מהר כמו סוס.' מה ההבדל?",
      answers: ["במידע עובדות; במטפורה בסיפור יש השוואה דימוית", "שניהם טבלאות", "במידע חייבת מטפורה", "בסיפור אין משפטים"],
      correct: 0,
      subtopicId: "g3.genre_tag_info_vs_story",
      patternFamily: "phase717_p0_genre",
      subtype: "n4",
    },
  ],
  comprehension: [
    { question: "מה ההשוואה בין 'ספר מעניין' ל-'ספר משעמם'?", answers: ["ספר מעניין - משמח, ספר משעמם - לא משמח", "אין הבדל", "זה אותו דבר", "לא יודע"], correct: 0 },
    { question: "מה המסקנה מהטקסט: 'הילד קורא הרבה ספרים. הוא מצליח במבחנים.'?", answers: ["קריאה עוזרת להצלחה", "קריאה לא חשובה", "אין קשר", "לא יודע"], correct: 0 },
    {
      question: "מה התוצאה כשמשמיטים ארוחת בוקר לפני בית הספר?",
      answers: ["קשה להתרכז בשיעורים", "הכול נשאר זהה תמיד", "המורה מבטלת שיעור", "הספר נעלם"],
      correct: 0,
      subtopicId: "g3.cause_effect",
    },
    {
      question: "השווּ בין 'סיפור' ל'טקסט מידעי' לפי מה שנלמד בכיתה ג׳:",
      answers: ["בסיפור יש עלילה, במידע יש עובדות", "אין שום הבדל", "שניהם רק שירים", "שניהם בלי מילים"],
      correct: 0,
      subtopicId: "g3.compare_light",
    },
    {
      question: "למה כשמדליקים אור בחדר חשוך קל יותר לקרוא?",
      answers: ["כי האור מאפשר לעין לראות את האותיות", "כי האור מוחק את המילים", "כי בחושך תמיד יש יותר זמן", "כי הספר נפתח לבד"],
      correct: 0,
      subtopicId: "g3.cause_effect",
      patternFamily: "g3_cause_light_reading",
      subtype: "perception",
    },
    {
      question: "בטקסט כתוב: 'היא חיכתה בשקט ליד הדלת.' מה ההבדל העיקרי בין 'חיכתה' ל'דיברה' כאן מבחינת פעולה?",
      answers: ["חיכתה = המתנה; דיברה = הוצאת מילים לקול", "אין הבדל", "שתיהן אותה פעולה", "רק סדר אותיות"],
      correct: 0,
      subtopicId: "g3.compare_light",
      patternFamily: "g3_compare_wait_vs_speak",
      subtype: "verb_contrast",
    },
  ],
  writing: [
    { question: "איזה מבנה נכון לטקסט?", answers: ["פתיחה - אמצע - סיום", "רק פתיחה", "רק סיום", "ללא מבנה"], correct: 0 },
    { question: "איך כותבים טקסט יצירתי?", answers: ["משתמש בדמיון ויוצר סיפור", "רק עובדות", "רק מספרים", "ללא מילים"], correct: 0 },
    {
      question: "בחרו מילת קישור: 'התאמנו הרבה' ____ 'הצלחנו במבחן.'",
      answers: ["לכן", "אבל", "אולי", "למרות"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
    },
    {
      question: "בחרו מילת קישור: 'הכנו חומרים מראש' ____ 'לא נבהלנו בבוקר.'",
      answers: ["ולכן", "אבל", "אולי", "למרות ש"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
      patternFamily: "g3_connector_prep_calm",
      subtype: "result_chain",
    },
  ],
  grammar: [
    { question: "מה שורש המילה 'קורא'?", answers: ["ק-ר-א", "ק-ר", "ר-א", "ק-א"], correct: 0 },
    { question: "מה נטיית הפועל 'קורא' בגוף ראשון יחיד?", answers: ["אני קורא", "אתה קורא", "הוא קורא", "אנחנו קוראים"], correct: 0 },
    {
      question: "איזה משפט מתאר נכון שורש, ביניין וגזרה של הפועל 'הִתְכַּנְּסוּ'?",
      answers: ["שורש כנ ס בבניין התפעל", "שורש כנ ס בבניין קל", "אין שורש משותף", "רק ניקוד בלי משמעות"],
      correct: 0,
      subtopicId: "g3.binyan_light",
      patternFamily: "phase717_p0_binyan",
      subtype: "n1",
    },
    {
      question: "מה משותף ל'כָּתַב' ו'יִכְתֹּב' מבחינת שורש וביניין?",
      answers: ["שורש כת ב ובניינים שונים (עבר/עתיד)", "אין שורש משותף", "רק אות ראשונה", "רק ארוך המילה"],
      correct: 0,
      subtopicId: "g3.binyan_light",
      patternFamily: "phase717_p0_binyan",
      subtype: "n2",
    },
    {
      question: "באיזה משפט מופיעים שורש וגזרה בצורה ברורה?",
      answers: ["'הִתְפַּלְּלוּ' מראה שורש פ לל בבניין התפעל", "'שולחן' הוא פועל בבניין התפעל", "'ספר' הוא רק שם תואר", "'אני' הוא שורש"],
      correct: 0,
      subtopicId: "g3.binyan_light",
      patternFamily: "phase717_p0_binyan",
      subtype: "n3",
    },
    {
      question: "מה נכון לגבי ביניין התפעל בהשוואה לבניין קל?",
      answers: ["בהתפעל הפועל מתאר פעולה שחוזרת על עצמה או נעשית לעצמה", "בניין התפעל תמיד זהה לבניין קל", "בניין קל לא משתנה לפי גוף", "אין הבדל בין בניינים"],
      correct: 0,
      subtopicId: "g3.binyan_light",
      patternFamily: "phase717_p0_binyan",
      subtype: "n4",
    },
    {
      question: "כיתה ג׳ - מילת קישור 1: השלימו: 'התכוננו למבחן' ____ 'ענינו בביטחון.'",
      answers: ["ולכן", "אולם", "רק אם", "בלי"],
      correct: 0,
      subtopicId: "g3.connectors",
      patternFamily: "phase717_p0_connectors",
      subtype: "n1",
    },
    {
      question: "כיתה ג׳ - מילת קישור 2: 'רצינו לשחק בחוץ' ____ 'ירד גשם.'",
      answers: ["אבל", "לכן", "וגם", "כי"],
      correct: 0,
      subtopicId: "g3.connectors",
      patternFamily: "phase717_p0_connectors",
      subtype: "n2",
    },
    {
      question: "כיתה ג׳ - מילת קישור 3: 'קראנו את ההוראות' ____ 'התחלנו לעבוד.'",
      answers: ["ורק אז", "אבל", "למרות", "אולי"],
      correct: 0,
      subtopicId: "g3.connectors",
      patternFamily: "phase717_p0_connectors",
      subtype: "n3",
    },
    {
      question: "כיתה ג׳ - מילת קישור 4: 'היינה עייפים' ____ 'המשכנו לנסות.'",
      answers: ["אבל", "לכן", "כי", "וגם"],
      correct: 0,
      subtopicId: "g3.connectors",
      patternFamily: "phase717_p0_connectors",
      subtype: "n4",
    },
  ],
  vocabulary: [
    { question: "מה המשפחה של המילה 'קריאה'?", answers: ["קריאה, קורא, קרא", "ספר, ספרייה", "כתיבה, כותב", "שמיעה, שומע"], correct: 0 },
    { question: "מה המשמעות של המילה 'נהנה'?", answers: ["נהנה", "משעמם", "עצוב", "כעס"], correct: 0 },
    {
      question: "איזו מילה שייכת למשפחה של 'כתיבה, כותב'?",
      answers: ["כתב", "קורא", "שומע", "רץ"],
      correct: 0,
      subtopicId: "g3.word_families",
    },
    {
      question: "במשפט 'הרוח נשבה חזק' - מה המשמעות של 'נשבה' כאן?",
      answers: ["נעה באוויר", "ישנה", "אוכלת", "צובעת"],
      correct: 0,
      subtopicId: "g3.context_meaning",
    },
    {
      question: "איזו מילה שייכת למשפחה של 'שמיעה, שומע'?",
      answers: ["שמע", "רץ", "ירח", "כיסא"],
      correct: 0,
      subtopicId: "g3.word_families",
      patternFamily: "g3_family_shama",
      subtype: "shama_root",
    },
    {
      question: "במשפט 'הם דחפו את השולחן בזהירות' - מה המשמעות של 'בזהירות' בהקשר?",
      answers: ["בלי למהר ובלי לגרום נזק", "מהר מאוד", "בקול רם", "בלי לגעת בכלל"],
      correct: 0,
      subtopicId: "g3.context_meaning",
      patternFamily: "g3_context_carefully",
      subtype: "manner_adverb",
    },
  ],
  speaking: [
    { question: "איך מציגים נושא בפני הכיתה?", answers: ["מסבירים בבירור ומציגים את הנושא", "שותקים", "בוכים", "צוחקים"], correct: 0 },
  ],
};

const G3_HARD_QUESTIONS = {
  reading: G3_READING_HARD,
  comprehension: [
    { question: "מה הניתוח של הטקסט הספרותי?", answers: ["ניתוח עומק של התוכן והמסר", "רק קריאה", "רק כתיבה", "רק האזנה"], correct: 0 },
    {
      question: "מה הסיבה שבגללה הדמות מפסיקה לרוץ בסוף הסיפור?",
      answers: ["כי הגיעה ליעד", "כי התעוררה בבוקר", "כי נפתח הספר", "כי ירד שלג בקיץ"],
      correct: 0,
      subtopicId: "g3.cause_effect",
    },
    {
      question: "השווּ: מה דומה בין 'יער' ל'גן' בתיאור טבע?",
      answers: ["שניהם מקומות עם צמחים", "שניהם בתוך הכיתה", "שניהם כלי כתיבה", "שניהם מספרים"],
      correct: 0,
      subtopicId: "g3.compare_light",
    },
    {
      question: "הדמות מפסיקה לאמץ כשהיא מרגישה כאב בברך. מה הקשר הסיבתי הסביר?",
      answers: ["הכאב עלול להחמיר אם ממשיכים באותה עוצמה", "הכאב תמיד אומר שהתחרות נגמרה לתמיד", "אין קשר בין כאב לפעולה", "כאב תמיד ממציאים בסיפור"],
      correct: 0,
      subtopicId: "g3.cause_effect",
      patternFamily: "g3_cause_pain_stop",
      subtype: "body_state",
    },
  ],
  writing: [
    { question: "איך כותבים חיבור ספרותי?", answers: ["כתיבה יצירתית עם עלילה ומסר", "רק עובדות", "רק מספרים", "ללא מילים"], correct: 0 },
    {
      question: "בחרו מילת קישור מתאימה: 'התבלבלתי במבחן' ____ 'עניתי בכל זאת בנחות.'",
      answers: ["אבל", "לכן", "כי", "וגם"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
    },
    {
      question: "בחרו מילת קישור: 'ניסינו להבין את הנושא' ____ 'קראנו מקורות נוספים.'",
      answers: ["ולכן", "אולם", "רק אם", "למרות ש"],
      correct: 0,
      subtopicId: "g3.connector_use_choice",
      patternFamily: "g3_connector_research_chain",
      subtype: "additive_result",
    },
  ],
  grammar: [
    { question: "מה דקדוק מורכב?", answers: ["תחביר ומבנים מורכבים", "רק מילים פשוטות", "רק אותיות", "ללא דקדוק"], correct: 0 },
  ],
  vocabulary: [
    {
      question: "בכיתה ג׳ - מה המשמעות של ״אוצר מילים ספרותי״ בקריאה?",
      answers: ["מילים עשירות ומתאימות לספרות", "רק מילים פשוטות", "רק אותיות", "ללא מילים"],
      correct: 0,
    },
    {
      question: "איזו מילה שייכת למשפחה של 'למידה, לומד'?",
      answers: ["למד", "ספר", "שולחן", "חלון"],
      correct: 0,
      subtopicId: "g3.word_families",
    },
    {
      question: "במשפט 'הלב דופק מהר אחרי ריצה' - מה המשמעות של 'דופק' כאן?",
      answers: ["פועם בקצב", "כותב", "ישן", "אוכל"],
      correct: 0,
      subtopicId: "g3.context_meaning",
    },
    {
      question: "השווּ: מה ההבדל העיקרי בין 'הסבר' ל'תיאור' בחיבור?",
      answers: ["הסבר מבהיר למה/איך; תיאור מצייר איך משהו נראה או מרגיש", "אין הבדל", "תיאור תמיד ארוך יותר בלי קשר", "הסבר תמיד בלי משפטים"],
      correct: 0,
      subtopicId: "g3.compare_light",
      patternFamily: "g3_compare_explain_vs_describe",
      subtype: "genre_micro",
    },
    {
      question: "איזו מילה שייכת למשפחה של 'הליכה, הולך'?",
      answers: ["הלך", "שתה", "ישן", "צייר"],
      correct: 0,
      subtopicId: "g3.word_families",
      patternFamily: "g3_family_halach",
      subtype: "halach_root",
    },
  ],
  speaking: [
    {
      question: "בכיתה ג׳ - מה נכון לגבי דיון ספרותי?",
      answers: ["דיון על הטקסט, דמויות ומסרים", "רק שתיקה", "רק צחוק", "ללא דיון"],
      correct: 0,
    },
  ],
};

// ========== כיתה ד' ==========
const G4_EASY_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט המידעי: 'השמש היא כוכב. היא נותנת אור וחום. בלי השמש לא יהיה חיים על כדור הארץ.' מה הרעיון המרכזי?", answers: ["השמש חשובה לחיים", "השמש לא חשובה", "לילה", "עננים"], correct: 0 },
    { question: "קרא את הסיפור: 'ילד יצא לטיול. הוא ראה פרחים יפים. הוא נהנה מהטיול.' מה העלילה?", answers: ["ילד יוצא לטיול ונהנה", "ילד ישן", "ילד אוכל", "ילד כותב"], correct: 0 },
  ],
  comprehension: [
    { question: "איך מסכמים טקסט?", answers: ["למצוא את הרעיון המרכזי ולהציגו בקצרה", "להעתיק הכל", "לא לסכם", "לשכוח הכל"], correct: 0, subtopicId: "g4.summary_intro" },
    { question: "מה ההבדל בין טקסט מידע לסיפור?", answers: ["מידע - עובדות, סיפור - עלילה", "אין הבדל", "זה אותו דבר", "לא יודע"], correct: 0, subtopicId: "g4.text_structure" },
    {
      question: "קראו: 'השמש נותנת אור. לכן הצמחים יכולים לגדול.' מהו המשפט שמתאים לסיכום קצר?",
      answers: ["השמש עוזרת לצמחים לגדול", "השמש היא כוכב לכת", "הצמחים אוהבים מוזיקה", "הלילה זהה ליום"],
      correct: 0,
      subtopicId: "g4.summary_intro",
    },
    {
      question: "בטקסט מידעי על חתולים - איפה נכון לשים פסקה חדשה אחרי נושא חדש?",
      answers: ["אחרי שסיימנו לדבר על מאכל ועוברים לשינה", "רק בסוף הספר", "לפני הכותרת הראשונה בלבד", "אין צורך בפסקאות"],
      correct: 0,
      subtopicId: "g4.text_structure",
    },
    {
      question: "פסקה על חורף מסתיימת במשפט על שלג; הפסקה הבאה פותחת בדיון על בגדים חמים. מה תפקיד המעבר?",
      answers: ["להפריד בין רעיון מזג אוויר לרעיון התנהגות/לבוש", "למחוק את כותרת הטקסט", "להחליף את שפת הטקסט בלי סיבה", "לכפות סוף סיפור"],
      correct: 0,
      subtopicId: "g4.text_structure",
      patternFamily: "g4_para_shift_weather_clothes",
      subtype: "topic_boundary",
    },
    {
      question: "בחיבור קצר - איזה משפט מתאים לפתיחת סיכום של טקסט על מיחזור?",
      answers: ["לסיכום, מיחזור עוזר להפחית פסולת", "פתאום הופיע דינוזאור", "אין צורך במשפט פתיחה", "רק לכתוב שם המחבר"],
      correct: 0,
      subtopicId: "g4.summary_intro",
      patternFamily: "g4_summary_recycle_open",
      subtype: "closing_frame",
    },
  ],
  writing: [
    { question: "מה המבנה הנכון של טקסט מובנה?", answers: ["פתיחה - אמצע (גוף) - סיום", "רק פתיחה", "רק סיום", "ללא מבנה"], correct: 0 },
    { question: "איך כותבים תיאור?", answers: ["תיאור מפורט של מה שרואים", "רק מילה אחת", "רק אות", "ללא תיאור"], correct: 0, subtopicId: "g4.genre_appropriate_language" },
    { question: "איך כותבים הסבר?", answers: ["הסבר ברור ומסודר", "רק מילה אחת", "רק אות", "ללא הסבר"], correct: 0 },
    {
      question: "בטקסט הסבר מדעי לכיתה ד׳ - איזו שפה מתאימה יותר?",
      answers: ["מדויקת וברורה, עם מילים מהנושא", "סלנג חברים בלבד", "שירים בלי קשר", "משפטים בלי נושא"],
      correct: 0,
      subtopicId: "g4.genre_appropriate_language",
    },
  ],
  grammar: [
    { question: "מה הכתבה?", answers: ["כתיבה לפי שמיעה", "רק קריאה", "רק דיבור", "ללא כלום"], correct: 0 },
    { question: "מה שורש המילה 'כותב'?", answers: ["כ-ת-ב", "כ-ת", "ת-ב", "כ-ב"], correct: 0, subtopicId: "g4.root_pattern_intro" },
    { question: "מה נטיית הפועל 'כותב' בגוף ראשון רבים?", answers: ["אנחנו כותבים", "אני כותב", "אתה כותב", "הוא כותב"], correct: 0 },
    {
      question: "במילה 'הִתְכּוֹנְנוּ' - מה הבניין והשורש לפי מה שלמדנו?",
      answers: ["התפעל + כונ", "פיעל + כתב", "קל + רוץ", "נפעל + אכל"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
    },
    {
      question: "במילה 'כותבים' - מה השורש והבניין הנפוצים בדומה ל'לכתוב'?",
      answers: ["שורש כת ב ובניין פעל (צורת רבים)", "שורש ר וץ בלבד", "אין שורש", "בניין התפעל תמיד"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
      patternFamily: "g4_root_ktb_plural",
      subtype: "pattern_spot",
    },
  ],
  vocabulary: [
    { question: "מה משפחת המילה 'כתיבה'?", answers: ["כתיבה, כותב, כתב", "קריאה, קורא", "שמיעה, שומע", "ראייה, רואה"], correct: 0 },
    { question: "מה משמעות המילה 'חיים'?", answers: ["חיים", "מוות", "ללא כלום", "רק חלום"], correct: 0 },
    {
      question: "בסיפור - מה המשמעות של 'דמות' (מילה ספרותית)?",
      answers: ["אדם או בעל חיים בטקסט", "רק שם של פרק", "סוג של נקודה", "צבע הדף"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
    },
    {
      question: "מה המשמעות של הביטוי 'לשבור את הראש' (בשפה יומיומית)?",
      answers: ["לחשוב הרבה עד להבנה", "לישון מוקדם", "לרוץ מהר", "לכתוב בלי טעויות"],
      correct: 0,
      subtopicId: "g4.idiom_light",
    },
    {
      question: "מה המשמעות של 'עלילה' בסיפור?",
      answers: ["שרשרת אירועים שמקדמת את הסיפור", "רק שם של מחבר", "סוג של טבלה במתמטיקה", "רשימת צבעים"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
      patternFamily: "g4_lex_plot",
      subtype: "plot_term",
    },
  ],
  speaking: [
    { question: "איך מציגים ניתוח טקסט?", answers: ["מציגים את הנושא, דמויות ומסר", "רק שותקים", "רק צוחקים", "ללא הצגה"], correct: 0 },
  ],
};

const G4_MEDIUM_QUESTIONS = {
  reading: [
    { question: "קרא את השיר: 'השמש זורחת / הכל מתעורר / יום חדש מתחיל / הכל מתמלא אור.' מה המסר?", answers: ["בוקר חדש מלא תקווה", "לילה", "עננים", "גשם"], correct: 0 },
    { question: "קרא את הסיפור: 'ילד יצא לטיול ביער. הוא ראה פרחים יפים וציפורים שרות. הוא נהנה מהטבע ונזכר כמה העולם יפה.' מה הנושא?", answers: ["הנאה מהטבע ויופיו", "ילד ישן", "ילד אוכל", "ילד כותב"], correct: 0 },
    {
      question:
        "כיתה ד׳ - טקסט מידעי (1): 'לפי הטבלה, 40% מהתלמידים אכלו ארוחת בוקר לפני בית הספר.' מה מאפיין טקסט מידעי?",
      answers: ["מציג עובדות ונתונים שניתן לבדוק", "רק דמיון בלי עובדות", "רק שיחה בין חברים", "רק שיר ללא משמעות"],
      correct: 0,
      subtopicId: "g4.info_lit_intro",
      patternFamily: "phase717_p0_info_lit",
      subtype: "n1",
    },
    {
      question:
        "כיתה ד׳ - טקסט מידעי (2): 'מקור: אתר משרד הבריאות - שתיית מים חשובה בימים חמים.' למה חשוב לציין מקור?",
      answers: ["כדי לדעת מאיפה העובדה ולבדוק אמינות", "כדי להחביא מידע", "כדי שלא יהיו משפטים", "זה לא חשוב לעולם"],
      correct: 0,
      subtopicId: "g4.info_lit_intro",
      patternFamily: "phase717_p0_info_lit",
      subtype: "n2",
    },
    {
      question:
        "כיתה ד׳ - טקסט מידעי (3): 'ניסוי: שתי קבוצות; קבוצה א' קיבלה מים נוספים.' מה סוג המידע כאן?",
      answers: ["תיאור תהליך/ניסוי עם משתנים", "סיפור על דרקון", "שיר חג", "רשימת קניות בלבד"],
      correct: 0,
      subtopicId: "g4.info_lit_intro",
      patternFamily: "phase717_p0_info_lit",
      subtype: "n3",
    },
    {
      question:
        "כיתה ד׳ - טקסט מידעי (4): 'הגדרה: אקלים הוא ממוצע מזג אוויר לאורך שנים רבות.' מה ההבדל בין מזג אוויר לאקלים?",
      answers: ["מזג אוויר לטווח קצר; אקלים לטווח ארוך", "אין הבדל", "אקלים זה רק גשם", "מזג אוויר זה רק קיץ"],
      correct: 0,
      subtopicId: "g4.info_lit_intro",
      patternFamily: "phase717_p0_info_lit",
      subtype: "n4",
    },
  ],
  comprehension: [
    { question: "מה ניתוח ספרותי?", answers: ["ניתוח של נושא, דמויות ומסר", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה תמה?", answers: ["רעיון מרכזי בטקסט", "רק מילה", "רק אות", "ללא כלום"], correct: 0 },
    { question: "מה דמות?", answers: ["דמות בספר", "רק מילה", "רק אות", "ללא כלום"], correct: 0 },
    {
      question: "קראו פסקה על שמירה על חיות. מה משפט אחד שמתאים לסיכום?",
      answers: ["חשוב לשמור על בעלי חיים ובתי הגידול שלהם", "חיות אוהבות ממתקים", "הפסקה קצרה מדי תמיד", "אין צורך לסכם טקסטים"],
      correct: 0,
      subtopicId: "g4.summary_intro",
    },
    {
      question: "למה בטקסט מידעי לעיתים יש כותרות משנה לפני כל חלק?",
      answers: ["כדי לסמן נושא חדש ולהקל על המעבר", "כדי להחליף את שם המחבר", "כדי למחוק פסקאות", "כדי שלא יהיה סדר"],
      correct: 0,
      subtopicId: "g4.text_structure",
    },
    {
      question: "בטקסט על חיות מחמד יש פסקה על בריאות ואחריה על אימון. מה חסר אם קופצים ישר ל'אוכל' בלי מעבר?",
      answers: ["משפט מקשר או כותרת שמסמנת את המעבר בין נושאים", "רק ציור", "רק ניקוד", "אין חוסר"],
      correct: 0,
      subtopicId: "g4.text_structure",
      patternFamily: "g4_transition_pet_topics",
      subtype: "cohesion",
    },
    {
      question: "סיכום של טקסט על זיהום אוויר - איזה משפט שומר על דיוק ולא מוסיף מידע שלא הופיע?",
      answers: ["הטקסט מציג כמה גורמים לזיהום ומדוע זה משנה את איכות החיים", "לכן כולם תמיד אוהבים גשם", "בטח יש חייזרים", "הכול בגלל צבע עיפרון אחד"],
      correct: 0,
      subtopicId: "g4.summary_intro",
      patternFamily: "g4_summary_air_pollution",
      subtype: "fidelity",
    },
  ],
  writing: [
    { question: "איך כותבים חיבור?", answers: ["כתיבת חיבור מלא עם פתיחה, גוף וסיום", "רק מילה", "רק אות", "ללא חיבור"], correct: 0 },
    { question: "איך כותבים תיאור?", answers: ["תיאור מפורט ומעניין", "רק מילה", "רק אות", "ללא תיאור"], correct: 0, subtopicId: "g4.genre_appropriate_language" },
    { question: "איך כותבים הסבר?", answers: ["הסבר ברור ומסודר", "רק מילה", "רק אות", "ללא הסבר"], correct: 0 },
    {
      question: "בסיפור ילדים - מה מתאים לשפת הטקסט?",
      answers: ["פשוטה וציורית, עם פרטים חושיים", "רשימת מספרים בלבד", "שפה משפטית רשמית מאוד", "בלי פסיקים"],
      correct: 0,
      subtopicId: "g4.genre_appropriate_language",
    },
  ],
  grammar: [
    { question: "מה תחביר?", answers: ["מבנה המשפט", "רק מילה", "רק אות", "ללא מבנה"], correct: 0 },
    { question: "מה נטיית פועל?", answers: ["שינוי הפועל לפי גוף וזמן", "רק מילה אחת", "רק אות", "ללא שינוי"], correct: 0 },
    { question: "מה חלקי דיבר?", answers: ["שם עצם, פועל, תואר, מילות קישור", "רק שם עצם", "רק פועל", "ללא כלום"], correct: 0 },
    {
      question: "במילים 'הִסְתַּכְּלוּ' ו'מִסְתַּכֵּל' - מה משותף לפי שורש ודפוס?",
      answers: ["שורש ס כל ובניינים שונים של אותו שורש", "אין שורש משותף", "רק אות ראשונה", "רק ארוך המילה"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
    },
    {
      question: "במילים 'הִתְוַכְּחוּ' ו'מִתְוַכֵּחַ' - מה הדמיון המבני לעומק?",
      answers: ["בניין התפעל עם שינוי לפי גוף ומספר על אותו שורש", "אין קשר ביניהן", "רק ארוך המילה", "רק ניקוד"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
      patternFamily: "g4_root_hitpael_debate",
      subtype: "parallel_roots",
    },
    {
      question:
        "כיתה ד׳ - הכתבה ושגיאת כתיב (1): במשפט 'הילדים אכלו תפוחים' - איזו חלופה נכונה אם ביקשו צורת רבים של 'תפוח'?",
      answers: ["תפוחים", "תפוחיםים", "תפוח", "תפוחה"],
      correct: 0,
      subtopicId: "g4.dictation_spot_error",
      patternFamily: "phase717_p0_dictation",
      subtype: "n1",
    },
    {
      question:
        "כיתה ד׳ - הכתבה ושגיאת כתיב (2): בהכתבה נכתב 'יבש' במקום 'יָבֵשׁ' (במובן opposite of wet). מה סוג הטעות?",
      answers: ["שגיאת כתיב/ניקוד לפי המילה הנכונה בהקשר", "אין טעות", "טעות רק במספרים", "טעות רק בפיסוק"],
      correct: 0,
      subtopicId: "g4.dictation_spot_error",
      patternFamily: "phase717_p0_dictation",
      subtype: "n2",
    },
    {
      question:
        "כיתה ד׳ - הכתבה ושגיאת כתיב (3): במשפט 'הם רצים למגרש' - איזו צורה מתאימה לגוף נסתר יחיד?",
      answers: ["הוא רץ למגרש", "הם רצים למגרש", "אתה רצים למגרש", "אנחנו רצה למגרש"],
      correct: 0,
      subtopicId: "g4.dictation_spot_error",
      patternFamily: "phase717_p0_dictation",
      subtype: "n3",
    },
    {
      question:
        "כיתה ד׳ - הכתבה ושגיאת כתיב (4): איזו צורה שגויה נפוצה במילה 'כִּיסֵא'?",
      answers: ["כיסא בלי אותיות ניקוד כשביקשו צורה מדויקת בהכתבה - טעות בהתאמה לניקוד הנלמד", "תמיד נכון", "אין צורה שגויה", "רק אות ראשונה"],
      correct: 0,
      subtopicId: "g4.dictation_spot_error",
      patternFamily: "phase717_p0_dictation",
      subtype: "n4",
    },
  ],
  vocabulary: [
    {
      question: "בכיתה ד׳ - מה המשמעות של ״אוצר מילים ספרותי״ בקריאה?",
      answers: ["מילים עשירות המתאימות לספרות", "רק מילים פשוטות", "רק אותיות", "ללא מילים"],
      correct: 0,
    },
    { question: "מה שפה ציורית?", answers: ["שימוש בדימויים ומטפורות", "רק מילים פשוטות", "רק אותיות", "ללא דימויים"], correct: 0 },
    {
      question: "מה המשמעות של 'מטאפורה' בטקסט ספרותי?",
      answers: ["השוואה סמויה בלי מילות השוואה כמו 'כמו'", "רק שם של פרק", "סימן פיסוק", "סוג של כתיבת מספרים"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
    },
    {
      question: "מה המשמעות של 'לתפוס את הראש בידיים' (ביטוי)?",
      answers: ["להיות מודאג או מבולבל", "לשחק כדורגל", "לישון עמוק", "לסיים שיעורי בית"],
      correct: 0,
      subtopicId: "g4.idiom_light",
    },
    {
      question: "מה המשמעות של 'מטפורה' כשאומרים 'הלב חומק מהמקום'?",
      answers: ["תיאור דימויי לפחד או התרגשות חזקה", "תיאור מדויק של אנטומיה", "הנחיה לבישול", "חוק פיסיקלי"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
      patternFamily: "g4_lex_metaphor_fear",
      subtype: "figurative_read",
    },
  ],
  speaking: [
    {
      question: "בכיתה ד׳ - מה נכון לגבי דיון ספרותי?",
      answers: ["דיון על הטקסט, דמויות ומסרים", "רק שתיקה", "רק צחוק", "ללא דיון"],
      correct: 0,
    },
    { question: "איך מציגים ניתוח?", answers: ["מציגים ניתוח מעמיק של הטקסט", "רק שותקים", "רק צוחקים", "ללא הצגה"], correct: 0 },
  ],
};

const G4_HARD_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט הספרותי המורכב: 'הילד יצא לטיול ביער העתיק. העצים הגבוהים יצרו צל נעים. הוא שמע את שירת הציפורים והרגיש חלק מהטבע. פתאום הוא הבין כמה חשוב לשמור על היער.' מה המסר העמוק?", answers: ["חשיבות שמירה על הטבע", "ילד משחק", "ילד אוכל", "ילד כותב"], correct: 0 },
  ],
  comprehension: [
    { question: "מה ניתוח ספרותי מעמיק?", answers: ["ניתוח של רבדים שונים: נושא, דמויות, סמלים, מסר", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה חשיבה ביקורתית?", answers: ["חשיבה ביקורתית על הטקסט והמסר", "רק הסכמה", "רק סירוב", "ללא חשיבה"], correct: 0 },
    {
      question: "בטקסט ארוך על מחזור המים - מה כדאי לכלול במשפט פתיחה של סיכום?",
      answers: ["הנושא המרכזי: מחזור המים בטבע", "רק שם המחבר", "רשימת כל המילים באל״ף בי״ת", "ציטוט מלא בלי הבנה"],
      correct: 0,
      subtopicId: "g4.summary_intro",
    },
    {
      question: "למה לפעמים מוסיפים 'סיכום ביניים' באמצע פרק באנציקלופדיה?",
      answers: ["כדי לעזור לקורא לזכור את העיקר לפני המשך", "כדי למחוק מידע", "כדי שלא יהיו כותרות", "כדי לקצר את הספר לשני משפטים בלבד"],
      correct: 0,
      subtopicId: "g4.text_structure",
    },
    {
      question: "במאמר ארוך - למה כדאי שמשפט הסיכום יחזור במילים אחרות על השאלה שפתחה את הטקסט?",
      answers: ["כדי לסגור מעגל ולהדגיש את התשובה המרכזית", "כדי להוסיף נושא חדש שלא נלמד", "כדי להאריך בלי מטרה", "כדי למחוק את הפתיחה"],
      correct: 0,
      subtopicId: "g4.summary_intro",
      patternFamily: "g4_summary_close_loop",
      subtype: "rhetorical_closure",
    },
  ],
  writing: [
    { question: "איך כותבים חיבור טיעוני?", answers: ["כתיבת חיבור עם טענה, נימוקים ומסקנה", "רק מילה", "רק אות", "ללא חיבור"], correct: 0 },
    { question: "איך כותבים דעה מנומקת?", answers: ["הצגת דעה עם נימוקים ברורים", "רק מילה", "רק אות", "ללא דעה"], correct: 0, subtopicId: "g4.genre_appropriate_language" },
    {
      question: "במכתב רשמי לרכזת - מה לא מתאים?",
      answers: ["פתיחה בסגנון 'היי מה קורה'", "כותרת ברורה", "נימוס בסיסי", "חתימה בסוף"],
      correct: 0,
      subtopicId: "g4.genre_appropriate_language",
    },
  ],
  grammar: [
    {
      question: "בכיתה ד׳ - מה המשמעות של ״תחביר מורכב״ בהקשר של משפטים מורכבים?",
      answers: ["מבני משפט מורכבים ומשולבים", "רק משפטים פשוטים", "רק מילים", "ללא מבנה"],
      correct: 0,
    },
    { question: "מהו דקדוק?", answers: ["דקדוק מורכב ומעמיק", "רק רשימת מילים", "רק אותיות", "ללא דקדוק"], correct: 0 },
    {
      question: "איך מזהים שורש כשיש תחיליות וסופיות (למשל 'הִתְלַבְּשׁוּ')?",
      answers: ["מסירים תחיליות/סופיות ובודקים את ליבת המילה", "רק סופרים אותיות", "בוחרים אות ראשונה בלבד", "משאירים רק את הניקוד"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
    },
    {
      question: "במילה 'הִתְיַיעֲצוּ' - מה עקרון חשוב לזיהוי שורש כשיש תחילית הִתְ?",
      answers: ["לבודד את ליבת המילה אחרי הסרת בניין/תחילית לפי כלל שנלמד", "לספור רק אותיות עיצור", "להתעלם מהשורש", "לקחת רק האות הראשונה"],
      correct: 0,
      subtopicId: "g4.root_pattern_intro",
      patternFamily: "g4_root_consult_hitpael",
      subtype: "peel_prefix",
    },
  ],
  vocabulary: [
    { question: "מהו אוצר מילים ספרותי?", answers: ["אוצר מילים עשיר לספרות", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0 },
    { question: "מה שפה אקדמית?", answers: ["שפה מקצועית ומדויקת", "רק שפה פשוטה", "רק אותיות", "ללא שפה"], correct: 0 },
    {
      question: "מה המשמעות של 'סמל' בטקסט ספרותי?",
      answers: ["דבר שמייצג רעיון נוסף מעבר למילה עצמה", "רק צבע הכריכה", "שם של מבחן", "מספר עמודים"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
    },
    {
      question: "מה המשמעות של 'עיניים גדולות' כשאומרים על מישהו ששמע חדשות?",
      answers: ["הפתעה או התרגשות", "עייפות", "שינה", "כעס בלבד"],
      correct: 0,
      subtopicId: "g4.idiom_light",
    },
    {
      question: "מה המשמעות של 'אירוניה' בטקסט?",
      answers: ["כשהמילים אומרות דבר אחד והכוונה הפוכה או מבקרת", "כשהכול ממש מילולי בלי רמזים", "כשאין דמויות", "כשאין כותרת"],
      correct: 0,
      subtopicId: "g4.literary_lexicon_light",
      patternFamily: "g4_lex_irony",
      subtype: "tone_device",
    },
  ],
  speaking: [
    { question: "איך מתנהלים דיון ביקורתי?", answers: ["דיון ביקורתי מעמיק על הטקסט", "רק שתיקה", "רק צחוק", "ללא דיון"], correct: 0 },
  ],
};

// ========== כיתה ה' ==========
const G5_EASY_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט המרובה רבדים: 'הילד קרא ספר על הרפתקאות. הסיפור תיאר מסע של גיבור אמיץ. במהלך הקריאה, הילד השווה את עצמו לגיבור והבין שגם הוא יכול להיות אמיץ.' מה הרעיון המרכזי?", answers: ["קריאה מעודדת השוואה ולמידה", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
    { question: "קרא את הטקסט: 'השמש היא מקור החיים. היא נותנת אור וחום. בלי השמש, כדור הארץ יהיה קפוא וחשוך. לכן חשוב להבין את חשיבות השמש.' מה המסקנה?", answers: ["השמש חשובה מאוד לחיים", "השמש לא חשובה", "לילה", "עננים"], correct: 0 },
  ],
  comprehension: [
    { question: "מה הסקת מסקנות?", answers: ["הסקת מסקנות מהטקסט", "רק קריאה", "רק כתיבה", "ללא מסקנות"], correct: 0, subtopicId: "g5.inference" },
    { question: "מה השוואות?", answers: ["השוואה בין דברים שונים", "רק דבר אחד", "ללא השוואה", "לא יודע"], correct: 0 },
    { question: "מה זיהוי עמדה?", answers: ["זיהוי העמדה של הכותב", "רק קריאה", "רק כתיבה", "ללא זיהוי"], correct: 0 },
    {
      question: "הטקסט אומר: 'המורה לא אמרה מילה כשראתה את השלט.' מה אפשר להסיק לגבי הרגש שלה?",
      answers: ["ייתכן שהיא הופתעה או לא מרוצה", "בטוח שהיא שמחה מאוד", "אין שום מידע בטקסט", "היא רצה לשחק כדורגל"],
      correct: 0,
      subtopicId: "g5.inference",
    },
    {
      question: "סבא אומר: 'בילדותי לא היה מסך.' הנכד אומר: 'לי יש טאבלט.' מה מבטא ההבדל בין שתי עמדות?",
      answers: ["חוויית ילדות שונה בגלל טכנולוגיה", "שניהם מדברים על אותו צעצוע", "אין הבדל", "שניהם מתארים אותו מזג אוויר"],
      correct: 0,
      subtopicId: "g5.multiple_perspectives_light",
    },
    {
      question: "בטקסט: 'היא אמרה שהכול בסדר, אבל קולה רעד.' מה ההסקה הסבירה ביותר?",
      answers: ["ייתכן שהיא מנסה להסתיר מתח או עצב", "בטוח שהיא רעבה", "אין שום רמז לרגש", "הטקסט מדבר על ספורט בלבד"],
      correct: 0,
      subtopicId: "g5.inference",
      patternFamily: "g5_inference_voice_tremble",
      subtype: "implicit_emotion",
    },
  ],
  writing: [
    { question: "איך כותבים חיבור מלא?", answers: ["חיבור עם פתיחה, גוף מפורט וסיום", "רק מילה", "רק אות", "ללא חיבור"], correct: 0 },
    { question: "איך כותבים תיאור?", answers: ["תיאור מפורט ומעניין", "רק מילה", "רק אות", "ללא תיאור"], correct: 0, subtopicId: "g5.genre_variety" },
    { question: "איך כותבים הסבר?", answers: ["הסבר ברור ומסודר עם דוגמאות", "רק מילה", "רק אות", "ללא הסבר"], correct: 0, subtopicId: "g5.genre_variety" },
    { question: "איך כותבים טיעון?", answers: ["טיעון עם נימוקים ברורים", "רק מילה", "רק אות", "ללא טיעון"], correct: 0, subtopicId: "g5.genre_variety" },
    {
      question: "מה ההבדל העיקרי בין 'תיאור' ל'טיעון' בכתיבה?",
      answers: ["תיאור מתאר; טיעון מנסה לשכנע עם נימוקים", "אין שום הבדל", "שניהם רק שיר", "שניהם רק רשימת מילים"],
      correct: 0,
      subtopicId: "g5.genre_variety",
    },
    {
      question: "בחיבור טיעוני - איפה נכון לשים את הנימוק העיקרי אחרי הטענה?",
      answers: ["מיד אחרי הטענה, לפני דוגמה או מקור", "רק בכותרת", "רק אחרי חתימה", "בלי קשר לטענה"],
      correct: 0,
      subtopicId: "g5.full_composition_scaffold_choice",
      patternFamily: "g5_scaffold_reason_placement",
      subtype: "macro_structure",
    },
  ],
  grammar: [
    { question: "מה מבנים תחביריים?", answers: ["מבני משפט מורכבים", "רק משפטים פשוטים", "רק מילים", "ללא מבנה"], correct: 0 },
    { question: "מה נטיות פועל?", answers: ["שינוי הפועל לפי גוף, זמן ומספר", "רק פועל אחד", "ללא שינוי", "לא יודע"], correct: 0 },
    { question: "מה חלקי דיבר?", answers: ["זיהוי חלקי הדיבר השונים", "רק שם עצם", "רק פועל", "ללא חלקים"], correct: 0 },
    {
      question: "במילים 'לְהַדְרִיךְ' (למשל) ו'הוּא מַדְרִיךְ' - מה משתנה בעיקרון?",
      answers: ["צורת הפועל (זמן/גוף/מספר) לפי אותו שורש ובניין", "רק האורך של המילה", "רק הניקוד בלי משמעות", "אין שורש משותף"],
      correct: 0,
      subtopicId: "g5.verb_patterns",
    },
  ],
  vocabulary: [
    { question: "מה שורשים?", answers: ["שורשי המילים בעברית", "רק מילה אחת", "ללא שורש", "לא יודע"], correct: 0 },
    { question: "מה משפחות מילים?", answers: ["מילים מאותה משפחה", "רק מילה אחת", "ללא משפחה", "לא יודע"], correct: 0 },
    { question: "מה שדות סמנטיים?", answers: ["מילים הקשורות לאותו נושא", "רק מילה אחת", "ללא קשר", "לא יודע"], correct: 0, subtopicId: "g5.semantic_fields" },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'מטבח ואפייה'?",
      answers: ["תנור", "מחברת", "אוטובוס", "כדורסל"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
    },
    {
      question: "בחרו מילה פותחת מתאימה לטיעון: '_____ נראה ששעות המסך הארוכות משפיעות על השינה.'",
      answers: ["לכן", "פתאום", "מחר", "למרות ש"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
    },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'תחבורה בעיר'?",
      answers: ["תחנת אוטובוס", "מחברת", "מקרר", "מדבקה"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
      patternFamily: "g5_semantic_urban_transit",
      subtype: "field_cluster",
    },
    {
      question: "בחרו פתיחה מתאימה לפסקה שמציגה עובדה מוכרת לפני טיעון: '_____ רבים מבלים מעל שעתיים ביום ברשתות חברתיות.'",
      answers: ["ידוע ש", "פתאום", "בדיחה", "בלי קשר"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
      patternFamily: "g5_starter_yadua_she",
      subtype: "fact_lead",
    },
  ],
  speaking: [
    { question: "איך מציגים מצגת?", answers: ["הצגה ברורה ומסודרת", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    { question: "איך טוענים טיעון?", answers: ["הצגת טיעון עם נימוקים", "רק הסכמה", "רק סירוב", "ללא טיעון"], correct: 0 },
    {
      question: "בחרו פתיחה מתאימה לנאום קצר: '_____ אני חושב שיש לצמצם שימוש בבקבוקי פלסטיק אחד פעמי.'",
      answers: ["לדעתי", "אולי מחר", "בלי קשר", "סתם"],
      correct: 0,
      subtopicId: "g5.argument_scaffold_choice",
    },
  ],
};

const G5_MEDIUM_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט המורכב: 'הילד קרא ספר על הרפתקאות של גיבור אמיץ. במהלך הקריאה, הוא השווה את עצמו לגיבור והבין שגם הוא יכול להיות אמיץ ולהתמודד עם אתגרים. הספר לימד אותו על אומץ ותושייה.' מה המסר והעמדה?", answers: ["קריאה מלמדת אומץ ומעודדת התמודדות", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
    {
      question:
        "כיתה ה׳ - מיקום בטקסט (1): 'בפסקה השנייה כתוב מפורש למה הדמות מפחדת.' איפה נמצאת העמדה המרכזית לפי המשפט?",
      answers: ["בפסקה השנייה", "בכותרת בלבד", "בפתיחה בלבד", "מחוץ לטקסט"],
      correct: 0,
      subtopicId: "g5.position_in_text",
      patternFamily: "phase717_p0_position",
      subtype: "n1",
    },
    {
      question:
        "כיתה ה׳ - מיקום בטקסט (2): 'משפט הסיכום מופיע לפני המשפט האחרון.' מה זה אומר על מיקום הסיכום?",
      answers: ["הסיכום לא בהכרח בסוף המאמר", "הסיכום תמיד חייב להיות במילה הראשונה", "אין סיכום", "הסיכום תמיד באמצע בלי קשר"],
      correct: 0,
      subtopicId: "g5.position_in_text",
      patternFamily: "phase717_p0_position",
      subtype: "n2",
    },
    {
      question:
        "כיתה ה׳ - מיקום בטקסט (3): 'הראיה לטענה מופיעה אחרי המשפט שמציג את הטענה.' מה הסדר?",
      answers: ["טענה ואחריה ראיה", "ראיה לפני טענה תמיד אסורה", "אין סדר בטקסטים", "תמיד מתחילים מסיכום"],
      correct: 0,
      subtopicId: "g5.position_in_text",
      patternFamily: "phase717_p0_position",
      subtype: "n3",
    },
    {
      question:
        "כיתה ה׳ - מיקום בטקסט (4): באיזה פסקה מופיעה ההגדרה למושג אקלים? מה סוג השאלה?",
      answers: ["שאלה על מיקום מידע בפסקאות", "שאלה על צבע עיפרון", "שאלה על מספר אותיות בלבד", "שאלה בלי קשר לטקסט"],
      correct: 0,
      subtopicId: "g5.position_in_text",
      patternFamily: "phase717_p0_position",
      subtype: "n4",
    },
  ],
  comprehension: [
    { question: "מה ניתוח מורכב?", answers: ["ניתוח של רבדים שונים וזוויות שונות", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה נקודות מבט מרובות?", answers: ["הבנת נקודות מבט שונות", "רק נקודת מבט אחת", "ללא נקודת מבט", "לא יודע"], correct: 0, subtopicId: "g5.multiple_perspectives_light" },
    {
      question: "בטקסט כתוב: 'הדלת נטרקה, אבל אף אחד לא נכנס.' מה ההסבר הסביר ביותר?",
      answers: ["ייתכן שרוח סגרה את הדלת", "בטוח שבאו אורחים", "הדלת נעלמה", "הטקסט מדבר על חגיגה"],
      correct: 0,
      subtopicId: "g5.inference",
    },
    {
      question: "חקלאי אומר: 'גשם עוזר ליבול.' נהג אומר: 'גשם מקשה על נסיעה.' מה נכון?",
      answers: ["אותו אירוע נראה אחרת מתלוי בנקודת המבט", "רק החקלאי צודק תמיד", "רק הנהג צודק תמיד", "אין קשר בין הדעות"],
      correct: 0,
      subtopicId: "g5.multiple_perspectives_light",
    },
    {
      question: "כותב מציין נתון ומיד כותב 'זה מוכח שכולם חושבים כמוני.' מה הבעיה?",
      answers: ["קפיצה מנתון ספציפי להכללה רחבה מדי", "זה תמיד נכון מבחינה מדעית", "אין בעיה בניסוח", "נתונים לא צריכים הסבר"],
      correct: 0,
      subtopicId: "g5.inference",
      patternFamily: "g5_inference_overgeneralize",
      subtype: "logic_gap",
    },
  ],
  writing: [
    { question: "איך כותבים ז'אנרים שונים?", answers: ["כתיבה בסגנונות שונים: תיאור, הסבר, טיעון", "רק תיאור", "רק הסבר", "ללא כתיבה"], correct: 0, subtopicId: "g5.genre_variety" },
    { question: "איך כותבים יצירתי?", answers: ["כתיבה יצירתית עם דמיון", "רק עובדות", "רק מספרים", "ללא יצירתיות"], correct: 0, subtopicId: "g5.genre_variety" },
    { question: "איך כותבים מובנה?", answers: ["כתיבה מסודרת עם מבנה ברור", "רק מילה", "רק אות", "ללא מבנה"], correct: 0 },
    {
      question: "מתי עדיף ז'אנר 'הסבר' ולא 'סיפור'?",
      answers: ["כשרוצים להבהיר איך משהו עובד או למה הוא קורה", "כשרוצים רק לצייר כריכה", "תמיד - אין הבדל", "רק כשכותבים שיר"],
      correct: 0,
      subtopicId: "g5.genre_variety",
    },
    {
      question: "בחיבור - איך כדאי לנסח 'ניגוד' בין טענה לניגודית בצורה מנומקת?",
      answers: ["'מצד אחד ... מצד שני ...' ואז החלטה מבוססת", "להתעלם מהניגוד", "רק לצעוק שהכול שגוי", "לכתוב רק משפט אחד בלי קשר"],
      correct: 0,
      subtopicId: "g5.full_composition_scaffold_choice",
      patternFamily: "g5_scaffold_tension_phrase",
      subtype: "contrast_bridge",
    },
  ],
  grammar: [
    {
      question: "בכיתה ה׳ - מה המשמעות של ״תחביר מורכב״ לעומת משפט פשוט?",
      answers: ["מבני משפט מורכבים ומשולבים", "רק משפטים פשוטים", "רק מילים", "ללא מבנה"],
      correct: 0,
    },
    { question: "מה צורות פועל?", answers: ["צורות שונות של הפועל", "רק פועל אחד", "ללא צורות", "לא יודע"], correct: 0, subtopicId: "g5.verb_patterns" },
    { question: "מה התאמה?", answers: ["התאמה בין פועל לנושא", "ללא התאמה", "לא יודע", "רק אחד"], correct: 0 },
    {
      question: "מה דומה בין 'הִתְפַּלְּלוּ' ל'מִתְפַּלֵּל' מבחינת דפוס הפועל?",
      answers: ["בניין התפעל עם שינוי לפי גוף ומספר", "אין קשר ביניהם", "אותו בניין תמיד בלי שינוי", "רק מילת יחס משתנה"],
      correct: 0,
      subtopicId: "g5.verb_patterns",
    },
  ],
  vocabulary: [
    { question: "מה שדות סמנטיים?", answers: ["מילים הקשורות לאותו נושא", "רק מילה אחת", "ללא קשר", "לא יודע"], correct: 0, subtopicId: "g5.semantic_fields" },
    { question: "מה אוצר מילים אקדמי?", answers: ["אוצר מילים מקצועי ומדויק", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0, subtopicId: "g5.academic_starter_words" },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'לימודים ומוסדות'?",
      answers: ["ספרייה", "מקרר", "מגרש כדורגל", "מטבע"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
    },
    {
      question: "בחרו מילה פותחת מתאימה: '_____ יש להבדיל בין דעה אישית לעובדה.'",
      answers: ["חשוב", "אולי", "מצחיק", "פתאום"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
    },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'בריאות ואורח חיים'?",
      answers: ["פעילות גופנית", "מפתח ברזל", "כביש מהיר", "מחשבון"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
      patternFamily: "g5_semantic_health_lifestyle",
      subtype: "field_cluster",
    },
    {
      question: "בחרו פתיחה מתאימה לפסקה שמסכמת דיון: '_____ נראה שיש יתרון לשילוב בין למידה פרונטלית ללמידה מקוונת.'",
      answers: ["למסקנה", "סתם", "בדיחה", "בלי קשר"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
      patternFamily: "g5_starter_lemaskana",
      subtype: "wrap_up",
    },
  ],
  speaking: [
    { question: "איך מציגים ז'אנרים שונים?", answers: ["הצגה בסגנונות שונים", "רק סגנון אחד", "ללא סגנון", "לא יודע"], correct: 0 },
    { question: "איך כותבים יצירתי?", answers: ["הבעה יצירתית עם דמיון", "רק עובדות", "רק מספרים", "ללא יצירתיות"], correct: 0 },
    {
      question: "בחרו משפט שמביא נימוק אחרי טענה: 'צריך לאסוף בקבוקים למיחזור' -",
      answers: ["כי זה מפחית זיהום ושומר על הסביבה", "כי זה לא חשוב", "בלי סיבה", "רק כי כך נהוג לומר"],
      correct: 0,
      subtopicId: "g5.argument_scaffold_choice",
    },
  ],
};

const G5_HARD_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט האקדמי: 'הילד קרא ספר מחקר על הטבע. הספר הציג מחקרים שונים והשווה ביניהם. הילד למד על חשיבות המחקר והבין כמה חשוב לבדוק עובדות לפני שמסיקים מסקנות.' מה המסר האקדמי?", answers: ["חשיבות מחקר וביקורתיות", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
  ],
  comprehension: [
    { question: "מה ניתוח אקדמי?", answers: ["ניתוח מקצועי ומעמיק", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה מחקר?", answers: ["חקר מעמיק של נושא", "רק קריאה", "רק כתיבה", "ללא מחקר"], correct: 0 },
    {
      question: "המחבר כותב בציניות: 'כמה נוח לפתור בעיות מהספה.' מה ניתן להסיק מנימת הכתיבה?",
      answers: ["הוא מבקר חוסר מעש או שאננות", "הוא מעודד לשבת בבית", "הוא מתאר מוצר חדש", "אין שום רמז בטקסט"],
      correct: 0,
      subtopicId: "g5.inference",
    },
    {
      question: "מנהל בית ספר ותלמיד מתווכחים על שעות שיעורי הבית. מה נכון לגבי הוויכוח?",
      answers: ["לכל צד יש שיקולים שונים שכדאי להבין", "רק אחד מהם רשאי לדבר", "אין טעם לשמוע את שני הצדדים", "הוויכוח תמיד על אותו נושא"],
      correct: 0,
      subtopicId: "g5.multiple_perspectives_light",
    },
    {
      question: "מחבר כותב: 'מחקרים מוכיחים' אך לא מציין איזה מחקר. מה חסר לקורא הביקורתי?",
      answers: ["מקור או פרטים שמאפשרים לבדוק את הטענה", "רק צבע גופן", "רק כותרת משנה", "אין חוסר"],
      correct: 0,
      subtopicId: "g5.inference",
      patternFamily: "g5_inference_missing_source",
      subtype: "evidence_literacy",
    },
  ],
  writing: [
    { question: "איך כותבים כתיבה אקדמית?", answers: ["כתיבה מקצועית עם מחקר וציטוטים", "רק מילה", "רק אות", "ללא כתיבה"], correct: 0 },
    { question: "איך כותבים מחקר?", answers: ["כתיבת מחקר מעמיק", "רק מילה", "רק אות", "ללא מחקר"], correct: 0 },
    { question: "איך כותבים ציטוט?", answers: ["ציטוט נכון של מקורות", "רק העתקה", "ללא ציטוט", "לא יודע"], correct: 0, subtopicId: "g5.genre_variety" },
    {
      question: "במאמר מדעי - למה לא משלבים סיפור אישי ארוך באמצע ההסבר?",
      answers: ["כי הוא עלול לסטות מהמטרה ולהחליש את החדות", "כי זה תמיד אסור בכל טקסט", "כי אין מקום לדוגמאות", "כי מדע לא משתמש במילים"],
      correct: 0,
      subtopicId: "g5.genre_variety",
    },
    {
      question: "במאמר - איך כדאי לסיים אחרי שמעלים טענה נגדית ומפריכים אותה?",
      answers: ["לחזור לטענה המרכזית ולחזק אותה בנימוק מסכם", "לפתוח נושא חדש שלא קשור", "למחוק את הפתיחה", "להפסיק באמצע משפט"],
      correct: 0,
      subtopicId: "g5.full_composition_scaffold_choice",
      patternFamily: "g5_scaffold_rebuttal_close",
      subtype: "argument_arc",
    },
  ],
  grammar: [
    { question: "מה דקדוק אקדמי?", answers: ["דקדוק מקצועי ומעמיק", "רק רשימת מילים", "רק אותיות", "ללא דקדוק"], correct: 0 },
    { question: "מה שפה פורמלית?", answers: ["שפה רשמית ומקצועית", "רק שפה פשוטה", "רק אותיות", "ללא שפה"], correct: 0 },
    {
      question: "למה חשוב להבדיל בין 'דיבר' ל'מדבר' כשכותבים דו״ח בזמנים שונים?",
      answers: ["כדי לדייק בזמן ובתבנית הפועל", "אין חשיבות לזמן", "שניהם תמיד אותו דבר", "רק בגלל האורך"],
      correct: 0,
      subtopicId: "g5.verb_patterns",
    },
  ],
  vocabulary: [
    { question: "מה שפה טכנית?", answers: ["שפה מקצועית וטכנית", "רק שפה פשוטה", "רק אותיות", "ללא שפה"], correct: 0 },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'משפט וחוק (בקצרה)'?",
      answers: ["עדות", "כפית", "ענן", "מחברת"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
    },
    {
      question: "בחרו פתיחה פורמלית: '_____ יש לבחון את המקורות לפני קבלת החלטה.'",
      answers: ["לפיכך", "וואלה", "סתם", "אולי אחר כך"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
    },
    {
      question: "איזו מילה שייכת לשדה סמנטי של 'מידע דיגיטלי ובטיחות ברשת'?",
      answers: ["סיסמה", "מחבת", "מגרפה", "כרית"],
      correct: 0,
      subtopicId: "g5.semantic_fields",
      patternFamily: "g5_semantic_digital_safety",
      subtype: "field_cluster",
    },
    {
      question: "בחרו פתיחה שמסמנת סתירה מנומקת: '_____ יש טיעונים נגד ההנחה שטכנולוגיה תמיד מזיקה.'",
      answers: ["אולם", "סתם", "בדיחה", "פתאום בלי הקשר"],
      correct: 0,
      subtopicId: "g5.academic_starter_words",
      patternFamily: "g5_starter_ulem_counter",
      subtype: "counter_turn",
    },
  ],
  speaking: [
    { question: "איך מציגים מצגת אקדמית?", answers: ["הצגה מקצועית עם מחקר", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    { question: "איך מציגים מחקר?", answers: ["הצגת מחקר מעמיק", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    {
      question: "בחרו ניסוח שמסכם טיעון ומציע פעולה: 'לסיכום, ____'",
      answers: ["כדאי לנסות לצמצם פלסטיק בשימוש יומיומי", "אין מה לעשות", "בטל את כל הדיון", "רק תשכח מהנושא"],
      correct: 0,
      subtopicId: "g5.argument_scaffold_choice",
    },
  ],
};

// ========== כיתה ו' ==========
const G6_EASY_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט המורכב: 'הילד קרא ספר על נושא מורכב. הספר הציג דעות שונות והשווה ביניהן. במהלך הקריאה, הילד פיתח חשיבה ביקורתית והבין כמה חשוב לבדוק עובדות ולהבין נקודות מבט שונות.' מה הנושא המרכזי?", answers: ["חשיבות חשיבה ביקורתית", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
    { question: "קרא את הטקסט: 'השמש היא מקור החיים. מחקרים מראים שהיא נותנת אור וחום החיוניים לחיים. בלי השמש, כדור הארץ יהיה קפוא וחשוך. לכן חשוב להבין את חשיבות השמש ולשמור על הסביבה.' מה המסר והמסקנה?", answers: ["חשיבות השמש ושמירה על הסביבה", "השמש לא חשובה", "לילה", "עננים"], correct: 0 },
  ],
  comprehension: [
    { question: "מה ניתוח מעמיק?", answers: ["ניתוח מעמיק של הטקסט וכל רבדיו", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה חשיבה ביקורתית?", answers: ["חשיבה ביקורתית על הטקסט והמסר", "רק הסכמה", "רק סירוב", "ללא חשיבה"], correct: 0, subtopicId: "g6.critical_evaluation_light" },
    { question: "מה הערכת ביקורתית?", answers: ["הערכה ביקורתית של הטקסט", "רק קריאה", "רק כתיבה", "ללא הערכה"], correct: 0, subtopicId: "g6.critical_evaluation_light" },
    {
      question: "הטקסט טוען: 'כל התלמידים בכיתה זה אוהבים מתמטיקה.' האם הטענה מאוזנת?",
      answers: ["לא - היא מכלילה ואין ראיות", "כן - תמיד נכון", "אין דרך לבדוק", "זה עניין של צבעים"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
    },
    {
      question: "איזה משפט נשען ישירות על ראיה מהטקסט: 'לפי המחקר, 60% מהילדים קוראים לפחות ספר אחד בשבוע'?",
      answers: ["60% מהילדים קוראים לפחות ספר אחד בשבוע", "קריאה זה כיף תמיד", "ספרים זה יקר", "מורים לא קוראים"],
      correct: 0,
      subtopicId: "g6.evidence_from_text",
    },
    {
      question: "מאמר מציג גרף ומיד כותב 'זה מוכיח שהמדיניות נכשלה לחלוטין.' מה הבעיה?",
      answers: ["מסקנה חזקה מדי בלי הצגת קשר סיבתי מפורט מהנתונים", "גרף תמיד מספיק בלי הסבר", "אין בעיה בניסוח", "גרפים לא קשורים לטקסט"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
      patternFamily: "g6_crit_graph_jump",
      subtype: "evidence_strength",
    },
  ],
  writing: [
    { question: "איך כותבים חיבור טיעוני?", answers: ["חיבור עם טענה, נימוקים ומסקנה", "רק מילה", "רק אות", "ללא חיבור"], correct: 0 },
    { question: "איך כותבים עבודות ארוכות?", answers: ["כתיבת עבודה מפורטת וארוכה", "רק מילה", "רק אות", "ללא עבודה"], correct: 0 },
    { question: "איך כותבים סיכומים מורכבים?", answers: ["סיכום מעמיק ומפורט", "רק מילה", "רק אות", "ללא סיכום"], correct: 0 },
    { question: "איך כותבים דעה מנומקת?", answers: ["הצגת דעה עם נימוקים ברורים", "רק מילה", "רק אות", "ללא דעה"], correct: 0 },
    {
      question: "בדיון כתוב (פורום) - איזו פתיחה שומרת על נימוס ועדיין מביעה חילוקי דעות?",
      answers: ["אני מסכים חלקית, אך יש לשקול גם את הנקודה הבאה", "אתה טועה תמיד בלי יוצא מן הכלל", "בלי קשר לנושא", "רק קללות"],
      correct: 0,
      subtopicId: "g6.argumentative_full_scaffold",
      patternFamily: "g6_written_debate_tone",
      subtype: "civil_counter",
    },
    {
      question: "לפני שמצטטים מקור - מה חשוב לוודא כדי לשמור על אמינות?",
      answers: ["שהציטוט מדויק ומקושר להקשר שבו נאמר", "שהציטוט יהיה ארוך ככל האפשר תמיד", "שלא יהיה שום שם מקור", "להעתיק בלי לקרוא"],
      correct: 0,
      subtopicId: "g6.research_literacy_choice",
      patternFamily: "g6_quote_integrity",
      subtype: "source_hygiene",
    },
  ],
  grammar: [
    { question: "מה שייכות?", answers: ["הבעת שייכות", "רק שם עצם", "רק פועל", "ללא שייכות"], correct: 0 },
    { question: "מה מילות יחס מורכבות?", answers: ["מילות יחס מתקדמות", "רק מילות יחס פשוטות", "ללא מילות יחס", "לא יודע"], correct: 0 },
    { question: "מה התאמה של פועל-נושא?", answers: ["התאמה בין הפועל לנושא", "ללא התאמה", "לא יודע", "רק אחד"], correct: 0 },
  ],
  vocabulary: [
    { question: "מה אוצר מילים אקדמי?", answers: ["אוצר מילים מקצועי לחטיבת ביניים", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0, subtopicId: "g6.academic_vocab" },
    { question: "מה מיומנויות לספרות חטיבת ביניים?", answers: ["מיומנויות לספרות", "רק מיומנויות כלליות", "ללא מיומנויות", "לא יודע"], correct: 0 },
    {
      question: "מה המשמעות של 'להסיק' בטקסט לימודי?",
      answers: ["להגיע למסקנה על בסיס מידע", "למחוק משפט", "לצבוע את הדף", "לקרוא בלי להבין"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
    },
    {
      question: "במדע - מה המשמעות של 'ניסוי ביקורתי'?",
      answers: ["בדיקה שמנסה לבודד גורם אחד", "סיפור על חללית", "שיעור חינוך גופני", "כתיבת שיר"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
    },
    {
      question: "מה המשמעות של 'הטיה' (bias) בדיון על מחקר?",
      answers: ["נטייה שמעוותת איסוף או פרשנות של מידע", "סוג של גרף תמיד", "מילה נרדפת ל'מסקנה נכונה'", "רק שם של מחבר"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
      patternFamily: "g6_vocab_bias",
      subtype: "method_term",
    },
    {
      question: "בכימיה - מה המשמעות של 'תגובה'?",
      answers: ["שינוי שבו חומרים הופכים לחומרים אחרים", "רק כתיבת טבלה", "סוג של שיר", "מילה ללא משמעות"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
      patternFamily: "g6_disc_chem_reaction",
      subtype: "stem_term",
    },
  ],
  speaking: [
    { question: "איך מציגים דעה מנומקת?", answers: ["הצגת דעה עם נימוקים ברורים", "רק הסכמה", "רק סירוב", "ללא דעה"], correct: 0 },
    { question: "איך מתנהלים דיון?", answers: ["דיון מעמיק על נושא", "רק שתיקה", "רק צחוק", "ללא דיון"], correct: 0 },
    {
      question: "בחרו ניסוח שמכבד את הצד השני בוויכוח: '_____ אני עדיין חושב שיש לצמצם שימוש במסכים בערב.'",
      answers: ["אני מבין את הטענה הנגדית, אבל", "זה לא נכון בכלל, אבל", "בלי קשר, אבל", "אין צורך לשמוע דעות, אבל"],
      correct: 0,
      subtopicId: "g6.debate_scaffold_choice",
    },
  ],
};

const G6_MEDIUM_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט: 'הילד קרא ספר מחקר מעמיק על נושא מורכב. הספר הציג מחקרים שונים, השווה ביניהם והסיק מסקנות. במהלך הקריאה, הילד פיתח חשיבה ביקורתית והבין כמה חשוב לבדוק עובדות, להבין נקודות מבט שונות ולהסיק מסקנות מבוססות.' מה המסר האקדמי?", answers: ["חשיבות מחקר, ביקורתיות ומסקנות מבוססות", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
    {
      question:
        "כיתה ו׳ - ניתוח טקסט מורכב (1): 'המחבר מציג טענה, מביא נתון, ואז מסיק - אבל לא מציין מגבלות המדגם.' מה רכיב חסר בניתוח?",
      answers: ["דיון במגבלות/הקשר של הנתונים", "רק כותרת", "רק צבע", "אין חוסר"],
      correct: 0,
      subtopicId: "g6.complex_text_analysis",
      patternFamily: "phase717_p0_complex_read",
      subtype: "n1",
    },
    {
      question:
        "כיתה ו׳ - ניתוח טקסט מורכב (2): 'במאמר יש שני מקורות שסותרים זה את זה.' מה השלב הנכון לפני מסקנה?",
      answers: ["להשוות שיטות והקשר ולאחד הסבר סביר", "לבחור אקראית", "להתעלם מהסתירה", "לסיים בלי קריאה"],
      correct: 0,
      subtopicId: "g6.complex_text_analysis",
      patternFamily: "phase717_p0_complex_read",
      subtype: "n2",
    },
    {
      question:
        "כיתה ו׳ - ניתוח טקסט מורכב (3): 'הכותב משתמש במילים טעונות בלי הגדרה.' מה הבעיה בניתוח קריאה?",
      answers: ["חוסר בהירות של מושגים מרכזיים", "זה תמיד מצוין", "אין קשר לשפה", "רק בעיה של כתיב"],
      correct: 0,
      subtopicId: "g6.complex_text_analysis",
      patternFamily: "phase717_p0_complex_read",
      subtype: "n3",
    },
    {
      question:
        "כיתה ו׳ - ניתוח טקסט מורכב (4): 'המסקנה חזקה מהנתונים המוצגים.' איך קורא ביקורתי צריך לבדוק?",
      answers: ["לבדוק אם הנתונים באמת תומכים במסקנה", "לקבל תמיד", "להתעלם מהנתונים", "לכתוב מסקנה חדשה בלי קשר"],
      correct: 0,
      subtopicId: "g6.complex_text_analysis",
      patternFamily: "phase717_p0_complex_read",
      subtype: "n4",
    },
  ],
  comprehension: [
    { question: "מה ניתוח אקדמי?", answers: ["ניתוח מקצועי ומעמיק", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מה מחקר?", answers: ["חקר מעמיק", "רק קריאה", "רק כתיבה", "ללא מחקר"], correct: 0 },
    {
      question: "מקור כותב: 'הפתרון היחיד הוא לאסור הכול.' מה חסר בהצגה כזו?",
      answers: ["דיון בפתרונות חלופיים והיגיון מתון", "רק כותרת", "רק צבע גופן", "אין חוסר"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
    },
    {
      question: "איזו טענה נתמכת ישירות במשפט: 'במחקר השתתפו 120 תלמידים לאורך שלושה חודשים'?",
      answers: ["היה מדגם של 120 תלמידים", "כל התלמידים בארץ אוהבים ספורט", "המחקר נמשך יום אחד", "לא נאמר כמה משתתפים"],
      correct: 0,
      subtopicId: "g6.evidence_from_text",
    },
    {
      question: "מאמר מציע 'פתרון קסם' בלי מנגנון, בלי עלות, ובלי סיכונים. מה כדאי לחשוד?",
      answers: ["שמדובר בהבטחה יתרה שדורשת בדיקה ביקורתית", "שזה תמיד נכון כי נשמע טוב", "שאין צורך במקורות", "שאין קשר לשפה"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
      patternFamily: "g6_crit_magic_solution",
      subtype: "credibility",
    },
  ],
  writing: [
    { question: "איך כותבים חיבורים אקדמיים?", answers: ["כתיבת חיבור מקצועי עם מחקר", "רק מילה", "רק אות", "ללא חיבור"], correct: 0 },
    { question: "איך כותבים מחקר?", answers: ["כתיבת מחקר מעמיק וארוך", "רק מילה", "רק אות", "ללא מחקר"], correct: 0 },
    { question: "איך כותבים עבודות ארוכות?", answers: ["כתיבת עבודה מפורטת וארוכה", "רק מילה", "רק אות", "ללא עבודה"], correct: 0 },
    {
      question: "במאמר - איך נכון לנסח 'הגבלה' של הטענה שלך (מה המחקר לא בדק)?",
      answers: ["לציין במפורש מה אינו נכלל ולמה זה משנה", "לא לציין הגבלות כדי להיראות חזק", "להכליל לכל האנושות תמיד", "למחוק את המקורות"],
      correct: 0,
      subtopicId: "g6.argumentative_full_scaffold",
      patternFamily: "g6_scaffold_limitation_clause",
      subtype: "epistemic_honesty",
    },
    {
      question: "כשמשווים שני מקורות שסותרים זה את זה - מה השלב הראשון לפני מסקנה?",
      answers: ["לבדוק הקשר, שיטה, ותאריך/מטרת כל מקור", "לבחור את הקצר מביניהם", "להתעלם מהסתירה", "לכתוב רק דעה אישית"],
      correct: 0,
      subtopicId: "g6.research_literacy_choice",
      patternFamily: "g6_compare_sources_step",
      subtype: "conflict_resolution",
    },
  ],
  grammar: [
    { question: "מהו דקדוק?", answers: ["דקדוק", "רק רשימת מילים", "רק אותיות", "ללא דקדוק"], correct: 0 },
    {
      question: "בכיתה ו׳ / חטיבת ביניים - מה מאפיין תחביר מורכב לעומת משפט בסיסי?",
      answers: ["מבני משפט מורכבים ומגוונים", "רק משפטים פשוטים", "רק מילים", "ללא מבנה"],
      correct: 0,
    },
    {
      question:
        "כיתה ו׳ - התאמת פועל לנושא (1): איזה משפט נכון תחבירית?",
      answers: ["הילדים משחקים בחצר", "הילדים משחק בחצר", "הילדים משחקים בחצר הוא", "הילדים משחקים הוא"],
      correct: 0,
      subtopicId: "g6.subject_verb_advanced",
      patternFamily: "phase717_p0_subj_verb",
      subtype: "n1",
    },
    {
      question:
        "כיתה ו׳ - התאמת פועל לנושא (2): איזה משפט נכון?",
      answers: ["הקבוצה מתאמנת בימי שלישי", "הקבוצה מתאמנים בימי שלישי", "הקבוצה מתאמנת הם", "הקבוצה מתאמנים הוא"],
      correct: 0,
      subtopicId: "g6.subject_verb_advanced",
      patternFamily: "phase717_p0_subj_verb",
      subtype: "n2",
    },
    {
      question:
        "כיתה ו׳ - התאמת פועל לנושא (3): איזה משפט נכון?",
      answers: ["רוב התלמידים מגיעים בזמן", "רוב התלמידים מגיע בזמן", "רוב התלמידים מגיעים הוא", "רוב התלמידים מגיע בזמן הם"],
      correct: 0,
      subtopicId: "g6.subject_verb_advanced",
      patternFamily: "phase717_p0_subj_verb",
      subtype: "n3",
    },
    {
      question:
        "כיתה ו׳ - התאמת פועל לנושא (4): איזה משפט נכון?",
      answers: ["שורת המתכוננים מתארכת לפני הדלת", "שורת המתכוננים מתארכים לפני הדלת", "שורת המתכוננים מתארכת הם", "שורת המתכוננים מתארכים הוא"],
      correct: 0,
      subtopicId: "g6.subject_verb_advanced",
      patternFamily: "phase717_p0_subj_verb",
      subtype: "n4",
    },
    {
      question:
        "כיתה ו׳ - יחסי שייכות ומילות יחס: איזה משפט נכון?",
      answers: ["הספר של דני על השולחן", "הספר של דני בשולחן", "הספר דני על השולחן", "של דני הספר על שולחן"],
      correct: 0,
      subtopicId: "g6.possession_prep",
      patternFamily: "phase719_p1_possession_prep",
      subtype: "p1",
    },
    {
      question:
        "כיתה ו׳ - שייכות: איך כותבים נכון את צמד המילים (הארנק / יוסי)?",
      answers: ["הארנק של יוסי", "הארנק יוסי", "של ארנק יוסי", "יוסי ארנק"],
      correct: 0,
      subtopicId: "g6.possession_prep",
      patternFamily: "phase719_p1_possession_prep",
      subtype: "p2",
    },
    {
      question:
        "כיתה ו׳ - מילת יחס: איפה הנעליים ביחס לדלת (בכניסה לכיתה)?",
      answers: ["ליד הדלת", "הדלת ליד", "בדלת ליד", "ליד של דלת"],
      correct: 0,
      subtopicId: "g6.possession_prep",
      patternFamily: "phase719_p1_possession_prep",
      subtype: "p3",
    },
    {
      question:
        "כיתה ו׳ - שייכות + מקום: איזה משפט מתאר נכון את התיק והכיסא?",
      answers: ["התיק שלי ליד הכיסא", "התיק לי ליד כיסא", "שלי תיק ליד הכיסא", "התיק שלי כיסא ליד"],
      correct: 0,
      subtopicId: "g6.possession_prep",
      patternFamily: "phase719_p1_possession_prep",
      subtype: "p4",
    },
  ],
  vocabulary: [
    { question: "מה אוצר מילים?", answers: ["אוצר מילים מקצועי", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0 },
    { question: "מה אוצר מילים אקדמי?", answers: ["אוצר מילים מקצועי ואקדמי", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0, subtopicId: "g6.academic_vocab" },
    {
      question: "מה המשמעות של 'ממצאים' בדו״ח?",
      answers: ["מה שגילה המחקר או הבדיקה", "שם של פרק בסיפור", "סוג של משחק", "צבע של עיפרון"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
    },
    {
      question: "בהיסטוריה - מה המשמעות של 'מקור ראשוני'?",
      answers: ["מסמך או עדות מתקופה האירוע", "סיכום מאוחר בלבד", "דעה בלי בסיס", "תמונה מדומיינת"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
    },
    {
      question: "מה המשמעות של 'מתאם' (correlation) לעומת 'סיבתיות' (causation) בדיון מדעי פשוט?",
      answers: ["שני דברים יכולים לעלות יחד בלי שאחד גורם לשני", "אם יש מתאם תמיד יש סיבתיות", "אין הבדל בין המונחים", "זה רק נושא מתמטיקה"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
      patternFamily: "g6_vocab_corr_vs_cause",
      subtype: "logic_vocab",
    },
    {
      question: "ביולוגיה - מה המשמעות של 'מערכת' בגוף האדם?",
      answers: ["קבוצת איברים שמשתפת פעולה למטרה משותפת", "איבר בודד בלבד", "סוג של צמח", "מילה ללא משמעות"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
      patternFamily: "g6_disc_bio_system",
      subtype: "stem_term",
    },
  ],
  speaking: [
    { question: "איך מציגים מצגת אקדמית?", answers: ["הצגה מקצועית עם מחקר", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    { question: "איך מציגים מחקר?", answers: ["הצגת מחקר מעמיק וארוך", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    {
      question: "בחרו ניסוח שמזמין תגובה מנומקת בדיון: '_____ מי יכול להביא דוגמה מהטקסט?'",
      answers: ["לפני שנחליט", "בלי קשר", "זה לא רלוונטי", "בואו נדלג על זה"],
      correct: 0,
      subtopicId: "g6.debate_scaffold_choice",
    },
  ],
};

const G6_HARD_QUESTIONS = {
  reading: [
    { question: "קרא את הטקסט: 'הילד קרא ספר מחקר על נושא מורכב ומעמיק. הספר הציג מחקרים שונים מרחבי העולם, השווה ביניהם, בדק את העובדות והסיק מסקנות מבוססות. במהלך הקריאה, הילד פיתח חשיבה ביקורתית והבין כמה חשוב לבדוק עובדות, להבין נקודות מבט שונות, לבקר מקורות ולהסיק מסקנות מבוססות ומקצועיות.' מה המסר?", answers: ["חשיבות מחקר, ביקורתיות ומסקנות מקצועיות", "רק קריאה", "רק משחק", "רק אכילה"], correct: 0 },
  ],
  comprehension: [
    { question: "מהו ניתוח טקסט?", answers: ["ניתוח מקצועי ומעמיק", "רק קריאה", "רק כתיבה", "ללא ניתוח"], correct: 0 },
    { question: "מהי הערכה ביקורתית?", answers: ["הערכה ביקורתית מעמיקה", "רק קריאה", "רק כתיבה", "ללא הערכה"], correct: 0, subtopicId: "g6.critical_evaluation_light" },
    {
      question: "כותב משתמש במקור יחיד ומציג אותו כ'אמת מוחלטת'. מה הבעיה המרכזית?",
      answers: ["חוסר בדיקה מול מקורות נוספים והקשר", "זה תמיד נכון", "אין בעיה במקור אחד", "מקור אחד מספיק תמיד"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
    },
    {
      question: "הטקסט: 'רק 5 משיבים ענו על הסקר.' מה מגביל את המסקנה 'כל הציבור חושב כך'?",
      answers: ["מדגם קטן מאוד - אי אפשר להכליל", "הסקר תמיד מדויק", "אין מגבלה", "סקר לא מודד דעות"],
      correct: 0,
      subtopicId: "g6.evidence_from_text",
    },
    {
      question: "מקור ממומן מציג נתון, אך מסתיר שחלק מהנתון נאסף בחופשה בלבד. מה הבעיה הביקורתית?",
      answers: ["הטיה אפשרית במדגם ובפרשנות - צריך שקיפות", "אין בעיה אם הנתון נכון", "חופשה משפרת תמיד מחקר", "זה רק עניין של עיצוב"],
      correct: 0,
      subtopicId: "g6.critical_evaluation_light",
      patternFamily: "g6_crit_sampling_bias",
      subtype: "method_transparency",
    },
  ],
  writing: [
    { question: "איך כותבים כתיבה אקדמית?", answers: ["כתיבה מקצועית עם מחקר וציטוטים", "רק מילה", "רק אות", "ללא כתיבה"], correct: 0 },
    { question: "איך כותבים מחקר?", answers: ["כתיבת מחקר מעמיק ומקצועי", "רק מילה", "רק אות", "ללא מחקר"], correct: 0 },
    { question: "איך כותבים פרסום?", answers: ["כתיבה ברמת פרסום", "רק מילה", "רק אות", "ללא פרסום"], correct: 0 },
    {
      question: "במאמר ארוך - איך כדאי לסיים אחרי שקראתם מחקר שמפריך חלקית את הטענה שלכם?",
      answers: ["לעדכן את הטענה ולנסח מסקנה מדויקת יותר עם הסתייגות", "להתעלם מהמחקר", "להעתיק את המחקר בלי ציטוט", "למחוק את כל הפרק"],
      correct: 0,
      subtopicId: "g6.argumentative_full_scaffold",
      patternFamily: "g6_scaffold_update_thesis",
      subtype: "revision_ethics",
    },
    {
      question: "כשמציגים 'ניגוד' בין שני מחקרים - מה חייב להופיע כדי שההשוואה תהיה הוגנת?",
      answers: ["קריטריון משווה (אוכלוסייה, שיטה, מדד) ולא רק מסקנה", "רק שם המוסד", "רק ציטוט ארוך בלי הקשר", "רק דעה אישית"],
      correct: 0,
      subtopicId: "g6.research_literacy_choice",
      patternFamily: "g6_fair_compare_studies",
      subtype: "comparison_frame",
    },
  ],
  grammar: [
    { question: "מה כולל לימוד דקדוק בכיתה ו׳?", answers: ["דקדוק מקצועי ומעמיק", "רק רשימת מילים", "רק אותיות", "ללא דקדוק"], correct: 0 },
    { question: "מה מבנים מורכבים?", answers: ["מבני משפט מורכבים ומגוונים", "רק משפטים פשוטים", "רק מילים", "ללא מבנה"], correct: 0 },
  ],
  vocabulary: [
    { question: "מהו אוצר מילים?", answers: ["אוצר מילים מקצועי ומדויק", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0, subtopicId: "g6.academic_vocab" },
    { question: "מה אוצר מילים מומחי?", answers: ["אוצר מילים מקצועי ומומחי", "רק מילים פשוטות", "רק אותיות", "ללא מילים"], correct: 0, subtopicId: "g6.academic_vocab" },
    {
      question: "מה המשמעות של 'מובהק סטטיסטית' בתוצאות מחקר (בשפה פשוטה)?",
      answers: ["ההבדל כנראה לא מקרי", "תמיד אומר שהמחקר שגוי", "אין משמעות למילה", "זה אומר שאין נתונים"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
    },
    {
      question: "בגיאוגרפיה - מה המשמעות של 'אקלים'?",
      answers: ["דפוס מזג אוויר אופייני לאזור לאורך זמן", "יום גשום בלבד", "סוג של עץ", "מפה בלי הסבר"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
    },
    {
      question: "מה המשמעות של 'שכיחות' (prevalence) בטקסט רפואי מדעי פשוט?",
      answers: ["כמה נפוץ מצב בתוך קבוצה מוגדרת", "תמיד אומר שמישהו חולה", "מילה נרדפת ל'טעם'", "אין משמעות"],
      correct: 0,
      subtopicId: "g6.academic_vocab",
      patternFamily: "g6_vocab_prevalence",
      subtype: "stats_literacy",
    },
    {
      question: "בפיזיקה - מה המשמעות של 'חיכוך'?",
      answers: ["כוח שמתנגד לתנועה בין משטחים", "סוג של צליל", "מילה לתיאור צבע", "תמיד אומר שאין תנועה"],
      correct: 0,
      subtopicId: "g6.discipline_words_light",
      patternFamily: "g6_disc_physics_friction",
      subtype: "stem_term",
    },
  ],
  speaking: [
    { question: "איך מציגים מצגת?", answers: ["הצגה מקצועית עם מחקר", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    { question: "איך מציגים בכנס?", answers: ["הצגה מקצועית בכנס", "רק שתיקה", "רק צחוק", "ללא הצגה"], correct: 0 },
    {
      question: "בחרו ניסוח שמזמין הפרכה מנומקת: '_____ מי יכול להציע נימוק נגד?'",
      answers: ["כדי לבדוק את החוזק של הטענה", "כדי לסיים מהר", "כדי לא לשמוע אף אחד", "כדי לשנות נושא בלי סיבה"],
      correct: 0,
      subtopicId: "g6.debate_scaffold_choice",
    },
  ],
};

/**
 * מסיר מסיחים אסורים (״כל התשובות נכונות׳ וכו׳), מנקה כפילויות, ומתקן אינדקס נכון.
 * @param {{ answers: string[], correct: number, optionCount?: number }} q
 */
function scrubHebrewMcqAnswers(q) {
  if (!Array.isArray(q.answers) || q.answers.length < 2) return;
  dedupeMcqOptionsInPlace(q);
  rebalanceGenericHebrewReadingDistractors(q);
}

const MIN_HEBREW_TOPIC_POOL = 18;

function dedupeHebrewPoolByStem(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const k = hebrewStemNorm(item?.question || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function augmentThinHebrewPool(merged, gradeKey, levelKey, topic) {
  if (!merged || merged.length >= MIN_HEBREW_TOPIC_POOL) return merged;
  const levels = ["easy", "medium", "hard"];
  const extra = [];
  for (const alt of levels) {
    if (alt === levelKey) continue;
    const leg = getQuestionsForGradeAndLevel(gradeKey, alt, topic);
    extra.push(...mergeTopicPoolsRaw(gradeKey, alt, topic, leg));
  }
  return dedupeHebrewPoolByStem([...merged, ...extra]);
}

export function finalizeHebrewMcq(raw, selectedTopic, levelKey, gradeKey) {
  const q = {
    question: raw.question,
    answers: Array.isArray(raw.answers) ? [...raw.answers] : [],
    correct: raw.correct,
    patternFamily: raw.patternFamily,
    subtype: raw.subtype,
    distractorFamily: raw.distractorFamily,
    optionCount: raw.optionCount,
    binary: raw.binary,
    difficultyBand: raw.difficultyBand || levelKey,
    subtopicId: raw.subtopicId,
    preferredAnswerMode: raw.preferredAnswerMode,
    typingAcceptedAnswers: Array.isArray(raw.typingAcceptedAnswers)
      ? [...raw.typingAcceptedAnswers]
      : undefined,
    maxTypingChars: raw.maxTypingChars,
    authenticity_pattern: raw.authenticity_pattern,
  };
  let stem = String(q.question || "").trim();
  if (gradeKey && /^איזה משפט נכון\?$/i.test(stem)) {
    const g = parseInt(String(gradeKey).replace(/\D/g, ""), 10);
    if (g >= 1 && g <= 6) {
      const childStem =
        levelKey === "easy"
          ? "איזה משפט נכון?"
          : levelKey === "medium"
            ? "איזה משפט תקין?"
            : "בחרו את המשפט הנכון ביותר.";
      q.question = childStem;
      stem = String(q.question || "").trim();
      if (!q.patternFamily || q.patternFamily === "grammar_correct_sentence") {
        q.patternFamily = "grammar_correct_sentence_scoped";
      }
      q.subtype = `${q.subtype || "level_scoped"}_${levelKey}`;
    }
  }
  const gNumScope = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 0;
  const scoped = scopeHebrewStemForGrade(
    selectedTopic,
    String(q.question || "").trim(),
    gradeKey
  );
  if (scoped !== String(q.question || "").trim()) {
    q.question = scoped;
    stem = scoped;
  }
  const strippedLead = stripHebrewQuestionPedagogicalLeadIn(String(q.question || "").trim());
  if (strippedLead !== String(q.question || "").trim()) {
    q.question = strippedLead;
    stem = strippedLead;
  }
  const binaryStem =
    q.binary === true ||
    q.optionCount === 2 ||
    /^האם (המשפט )?נכון\?/i.test(stem) ||
    /אמת או שקר|נכון או לא נכון|\bכן או לא\b/.test(stem);
  if (binaryStem && q.answers.length > 2) {
    const correctIdx = Number(q.correct) || 0;
    const correctText = q.answers[correctIdx];
    const others = q.answers.filter((_, i) => i !== correctIdx);
    const polarFirst =
      others.find((t) => /^(לא נכון|לא)$/i.test(String(t).trim())) ||
      others.find((t) => /^(נכון|כן)$/i.test(String(t).trim())) ||
      others[0];
    if (polarFirst != null && correctText != null) {
      q.answers =
        Math.random() < 0.5
          ? [correctText, polarFirst]
          : [polarFirst, correctText];
      q.correct = q.answers.indexOf(correctText);
      q.optionCount = 2;
    }
  }
  const inferred = inferHebrewLegacyMeta(
    selectedTopic,
    stem,
    levelKey,
    gradeKey
  );
  if (!raw.patternFamily) {
    q.patternFamily = inferred.patternFamily;
  }
  if (!raw.subtype || raw.subtype === "general") {
    q.subtype = inferred.subtype;
  }
  if (!q.distractorFamily) q.distractorFamily = "mixed";
  if (raw.diagnosticSkillId != null) q.diagnosticSkillId = raw.diagnosticSkillId;
  if (Array.isArray(raw.expectedErrorTags)) q.expectedErrorTags = [...raw.expectedErrorTags];
  if (raw.probePower != null) q.probePower = raw.probePower;
  if (raw.nextProbeSkillId != null) q.nextProbeSkillId = raw.nextProbeSkillId;
  if (raw.explanationHe != null) q.explanationHe = raw.explanationHe;
  q.hebrewLegacyMeta = {
    answerMode: inferred.answerMode,
    allowedLevels: inferred.allowedLevels,
    minGrade: inferred.minGrade,
    maxGrade: inferred.maxGrade,
    allowedGrades: inferred.allowedGrades,
    inferredDifficultyBand: inferred.difficultyBand,
  };
  scrubHebrewMcqAnswers(q);
  if (Array.isArray(q.answers) && q.answers.length >= 4) {
    const repaired = repairMcqObviousAnswerContent(
      {
        question: q.question,
        answers: q.answers,
        correct: q.correct,
        correctIndex: q.correct,
      },
      { subject: "hebrew", stem: q.question }
    );
    if (Array.isArray(repaired.answers)) {
      const prevCorrect = q.answers[q.correct];
      q.answers = repaired.answers;
      const newIdx = q.answers.indexOf(prevCorrect);
      if (newIdx >= 0) q.correct = newIdx;
    }
  }
  const padded = ensureMcqFourOptions(
    {
      question: q.question,
      answers: q.answers,
      correct: q.correct,
      correctIndex: q.correct,
      correctAnswer: q.answers?.[q.correct],
      params: { answerMode: "choice", subject: "hebrew" },
    },
    { subject: "hebrew" }
  );
  if (Array.isArray(padded.answers)) {
    q.answers = padded.answers;
    if (padded.correct != null) q.correct = padded.correct;
    if (padded.correctIndex != null) q.correct = padded.correctIndex;
    q.optionCount = padded.answers.length;
  }
  return sanitizeQuestionForStudentDisplay(q);
}

function isShallowLegacyQuestion(raw, levelKey, gradeKey) {
  const stem = String(raw.question || "");
  const answers = (raw.answers || []).map((a) => String(a).trim());
  const junkRe = /^(רק |ללא |רק$)/;
  let junk = 0;
  for (const a of answers) {
    if (
      junkRe.test(a) ||
      a === "ללא מילים" ||
      a === "ללא דקדוק" ||
      a === "ללא מבנה" ||
      a === "ללא הצגה"
    ) {
      junk++;
    }
  }
  if (junk >= 2) return true;
  if (
    levelKey === "hard" &&
    /מה (דקדוק|אוצר מילים|תחביר|ניתוח|הערכה|מסר|מחקר)\b/.test(stem) &&
    stem.length < 110
  ) {
    return true;
  }
  if (
    levelKey === "hard" &&
    (gradeKey === "g5" || gradeKey === "g6") &&
    /קרא את הטקסט המתקדמ|מה המסר המתקדמ/.test(stem) &&
    answers.some((a) => /^רק /.test(a))
  ) {
    return true;
  }
  const gNum = parseInt(String(gradeKey).replace(/\D/g, ""), 10) || 1;
  if (
    (levelKey === "medium" || levelKey === "hard") &&
    gNum >= 3 &&
    /^מה (המשמעות|ההפך) של '/.test(stem) &&
    answers.filter((a) => a.length <= 6).length >= 3
  ) {
    return true;
  }
  return false;
}

function pickWeightedHebrewItem(
  merged,
  levelKey,
  selectedTopic,
  gradeKey,
  excludeFingerprints = null
) {
  if (!merged || merged.length === 0) return null;
  const exclude = excludeFingerprints instanceof Set ? excludeFingerprints : null;

  const pickOne = () => {
  const rich = merged.filter((q) => q._fromRich === true);
  const legacy = merged.filter((q) => !q._fromRich);
  const legacyStrong = legacy.filter(
    (q) => !isShallowLegacyQuestion(q, levelKey, gradeKey)
  );
  const ratio =
    levelKey === "hard" ? 0.82 : levelKey === "medium" ? 0.72 : 0.58;
  const roll = Math.random();
    if (rich.length && roll < ratio) {
      return rich[Math.floor(Math.random() * rich.length)];
    }
    if (legacyStrong.length) {
      return legacyStrong[Math.floor(Math.random() * legacyStrong.length)];
    }
    return merged[Math.floor(Math.random() * merged.length)];
  };

  if (!exclude || exclude.size === 0) {
    return pickOne();
  }

  for (let attempt = 0; attempt < 48; attempt++) {
    const raw = pickOne();
    if (!raw) return null;
    const preview = finalizeHebrewMcq(
      { ...raw },
      selectedTopic,
      levelKey,
      gradeKey
    );
    const fp = hebrewQuestionFingerprint({
      topic: selectedTopic,
      question: preview.question,
      answers: preview.answers,
      params: { patternFamily: preview.patternFamily, subtype: preview.subtype },
    });
    if (!exclude.has(fp)) return raw;
  }

  const unused = merged.filter((raw) => {
    const preview = finalizeHebrewMcq(
      { ...raw },
      selectedTopic,
      levelKey,
      gradeKey
    );
    const fp = hebrewQuestionFingerprint({
      topic: selectedTopic,
      question: preview.question,
      answers: preview.answers,
      params: { patternFamily: preview.patternFamily, subtype: preview.subtype },
    });
    return !exclude.has(fp);
  });
  if (unused.length) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  return pickOne();
}

function mergeTopicPoolsRaw(gradeKey, levelKey, topic, legacyList) {
  const richRows = filterRichHebrewPool(gradeKey, levelKey, topic);
  const fromRich = richRows.map(
    ({
      grades: _g,
      gradeBand: _gb,
      allowedLevels: _al,
      levels: _l,
      topic: _tp,
      ...rest
    }) => ({
      ...rest,
      _fromRich: true,
    })
  );
  const base = Array.isArray(legacyList) ? [...legacyList] : [];
  return dedupeHebrewPoolByStem(base.concat(fromRich));
}

function mergeTopicPools(gradeKey, levelKey, topic, legacyList) {
  let merged = mergeTopicPoolsRaw(gradeKey, levelKey, topic, legacyList);
  merged = augmentThinHebrewPool(merged, gradeKey, levelKey, topic);
  if (isLowerGradeG1G2Key(gradeKey) && topic === "reading") {
    merged = merged.filter((row) => !isHebrewReadAloudCopyLeakRaw(row));
  }
  return merged;
}

/** מאגרי עברית חיים ב UI — לא `data/hebrew-questions/*` (אין ייבוא בריפו). */
const HEBREW_LIVE_SOURCE_FILE_LEGACY = "utils/hebrew-question-generator.js";
const HEBREW_LIVE_SOURCE_FILE_RICH = "utils/hebrew-rich-question-bank.js";

function attachSubtopicParamsForGrade(gradeKey, topicKey, rawPick) {
  const g = String(gradeKey || "").toLowerCase();
  if (g === "g1") return attachG1SubtopicParams(topicKey, rawPick);
  if (g === "g2") return attachG2SubtopicParams(topicKey, rawPick);
  if (["g3", "g4", "g5", "g6"].includes(g)) {
    return attachUpperGradeSubtopicParams(gradeKey, topicKey, rawPick);
  }
  return {};
}

/**
 * מעקב מקור לשאלה חיה (אל params / דיבוג). מאגר `data/hebrew-questions/*.js` לא נטען ב generateQuestion.
 * @param {Record<string, unknown>} rawPick
 * @param {Record<string, unknown>} randomQ
 */
function buildHebrewSourceTrace(rawPick, randomQ, ctx) {
  const fromRich = Boolean(rawPick && rawPick._fromRich);
  const sub = ctx.subtopicParams || {};
  return {
    runtimeEntry: "utils/hebrew-question-generator.js#generateQuestion",
    question: String(randomQ?.question ?? ""),
    gradeKey: ctx.gradeKey,
    topic: ctx.topic,
    levelKey: ctx.poolLevelKey,
    requestedLevelKey: ctx.requestedLevelKey ?? ctx.poolLevelKey,
    subtopicId: sub.subtopicId != null ? String(sub.subtopicId) : null,
    preferredAnswerMode:
      randomQ?.preferredAnswerMode != null
        ? String(randomQ.preferredAnswerMode)
        : null,
    patternFamily: randomQ?.patternFamily != null ? String(randomQ.patternFamily) : null,
    subtype: randomQ?.subtype != null ? String(randomQ.subtype) : null,
    sourceBank: fromRich ? "HEBREW_RICH_POOL" : "HEBREW_LEGACY_INLINE",
    sourceFile: fromRich ? HEBREW_LIVE_SOURCE_FILE_RICH : HEBREW_LIVE_SOURCE_FILE_LEGACY,
    fromRich,
    dataHebrewQuestionsG1Imported: false,
    dataHebrewQuestionsG2Imported: false,
    dataHebrewQuestionsNote:
      "data/hebrew-questions/g*.js is not imported by the app; grep the repo for 'hebrew-questions' / 'data/hebrew-questions' on JS/TS entrypoints.",
  };
}

function logHebrewSourceTraceIfDev(trace) {
  try {
    if (
      typeof console !== "undefined" &&
      console.info &&
      typeof process !== "undefined" &&
      process.env &&
      process.env.NODE_ENV === "development"
    ) {
      console.info("[hebrew][sourceTrace]", trace);
    }
  } catch (_e) {
    /* ignore */
  }
}

/** צילום מאגרי legacy לסקריפט אודיט — `scripts/audit-question-banks.mjs` */
export const HEBREW_LEGACY_QUESTIONS_SNAPSHOT = {
  G1_EASY_QUESTIONS,
  G1_MEDIUM_QUESTIONS,
  G1_HARD_QUESTIONS,
  G2_EASY_QUESTIONS,
  G2_MEDIUM_QUESTIONS,
  G2_HARD_QUESTIONS,
  G3_EASY_QUESTIONS,
  G3_MEDIUM_QUESTIONS,
  G3_HARD_QUESTIONS,
  G4_EASY_QUESTIONS,
  G4_MEDIUM_QUESTIONS,
  G4_HARD_QUESTIONS,
  G5_EASY_QUESTIONS,
  G5_MEDIUM_QUESTIONS,
  G5_HARD_QUESTIONS,
  G6_EASY_QUESTIONS,
  G6_MEDIUM_QUESTIONS,
  G6_HARD_QUESTIONS,
};

// ========== פונקציה לקבלת שאלות לפי כיתה ורמה ==========
function getQuestionsForGradeAndLevel(gradeKey, levelKey, topic) {
  const key = `${gradeKey.toUpperCase()}_${levelKey.toUpperCase()}_QUESTIONS`;
  
  // מיפוי של כיתות ורמות למאגרי השאלות
  const questionsMap = {
    'G1_EASY_QUESTIONS': G1_EASY_QUESTIONS,
    'G1_MEDIUM_QUESTIONS': G1_MEDIUM_QUESTIONS,
    'G1_HARD_QUESTIONS': G1_HARD_QUESTIONS,
    'G2_EASY_QUESTIONS': G2_EASY_QUESTIONS,
    'G2_MEDIUM_QUESTIONS': G2_MEDIUM_QUESTIONS,
    'G2_HARD_QUESTIONS': G2_HARD_QUESTIONS,
    'G3_EASY_QUESTIONS': G3_EASY_QUESTIONS,
    'G3_MEDIUM_QUESTIONS': G3_MEDIUM_QUESTIONS,
    'G3_HARD_QUESTIONS': G3_HARD_QUESTIONS,
    'G4_EASY_QUESTIONS': G4_EASY_QUESTIONS,
    'G4_MEDIUM_QUESTIONS': G4_MEDIUM_QUESTIONS,
    'G4_HARD_QUESTIONS': G4_HARD_QUESTIONS,
    'G5_EASY_QUESTIONS': G5_EASY_QUESTIONS,
    'G5_MEDIUM_QUESTIONS': G5_MEDIUM_QUESTIONS,
    'G5_HARD_QUESTIONS': G5_HARD_QUESTIONS,
    'G6_EASY_QUESTIONS': G6_EASY_QUESTIONS,
    'G6_MEDIUM_QUESTIONS': G6_MEDIUM_QUESTIONS,
    'G6_HARD_QUESTIONS': G6_HARD_QUESTIONS,
  };
  
  const questionsPool = questionsMap[key];
  if (!questionsPool) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[hebrew] missing question pool:", key);
    }
    return [];
  }
  return questionsPool[topic] || questionsPool.reading || [];
}

// ========== פונקציה עיקרית ליצירת שאלה ==========
export function generateQuestion(
  levelConfig,
  topic,
  gradeKey,
  mixedTopics = null,
  selectionOpts = null
) {
  const excludeFingerprints =
    selectionOpts?.excludeFingerprints instanceof Set
      ? selectionOpts.excludeFingerprints
      : null;
  const forceKind =
    selectionOpts?.forceKind != null ? String(selectionOpts.forceKind) : "";
  const forceSkillId =
    selectionOpts?.forceSkillId != null ? String(selectionOpts.forceSkillId) : "";
  const gradeCfg = GRADES[gradeKey] || GRADES.g3;

  let allowedTopics = gradeCfg.topics.filter((t) => t !== "mixed");
  if (mixedTopics) {
    allowedTopics = allowedTopics.filter((t) => mixedTopics[t]);
  }
  if (allowedTopics.length === 0) {
    allowedTopics = ["reading", "comprehension", "writing", "grammar", "vocabulary", "speaking"];
  }

  const isMixed = topic === "mixed";
  let selectedTopic = topic;
  
  if (isMixed) {
    selectedTopic = allowedTopics[Math.floor(Math.random() * allowedTopics.length)];
  }

  if (!allowedTopics.includes(selectedTopic)) {
    selectedTopic = "reading";
  }

  // קבלת רמת הקושי מ-levelConfig
  const levelKey = levelConfig?.name === "קל" ? "easy" : 
                   levelConfig?.name === "בינוני" ? "medium" : 
                   levelConfig?.name === "קשה" ? "hard" : "easy";

  // קבלת שאלות מהמאגר המתאים + בנק עשיר מובנה
  const topicQuestions = getQuestionsForGradeAndLevel(gradeKey, levelKey, selectedTopic);
  let topicQuestionsMerged = mergeTopicPools(
    gradeKey,
    levelKey,
    selectedTopic,
    topicQuestions
  );
  let poolLevelKey = levelKey;
  if (!topicQuestionsMerged.length) {
    for (const alt of ["easy", "medium", "hard"]) {
      if (alt === levelKey) continue;
      const legAlt = getQuestionsForGradeAndLevel(gradeKey, alt, selectedTopic);
      const mergedAlt = mergeTopicPools(gradeKey, alt, selectedTopic, legAlt);
      if (mergedAlt.length) {
        topicQuestionsMerged = mergedAlt;
        poolLevelKey = alt;
        break;
      }
    }
  }

  if (String(gradeKey).toLowerCase() === "g1") {
    const w = withG1SubtopicPreference(gradeKey, selectedTopic, topicQuestionsMerged);
    topicQuestionsMerged = w.merged;
  } else if (String(gradeKey).toLowerCase() === "g2") {
    const w = withG2SubtopicPreference(gradeKey, selectedTopic, topicQuestionsMerged);
    topicQuestionsMerged = w.merged;
  } else if (["g3", "g4", "g5", "g6"].includes(String(gradeKey).toLowerCase())) {
    const w = withUpperGradeSubtopicPreference(gradeKey, selectedTopic, topicQuestionsMerged);
    topicQuestionsMerged = w.merged;
  }

  if (forceKind) {
    topicQuestionsMerged = filterHebrewPoolByBookPage(
      topicQuestionsMerged,
      gradeKey,
      selectedTopic,
      forceKind,
      forceSkillId
    );
  }

  const HEBREW_NIQQUD_RE = /[\u0591-\u05C7]/g;
  const SURROUNDING_PUNCT_RE = /^[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+|[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+$/g;
  const normalizeQuotes = (value) =>
    String(value || "")
      .replace(/[“”״]/g, '"')
      .replace(/[‘’׳]/g, "'")
      .trim();
  const stripNiqqud = (value) => normalizeQuotes(value).replace(HEBREW_NIQQUD_RE, "");
  const stripSurroundingPunctuation = (value) =>
    normalizeQuotes(value).replace(SURROUNDING_PUNCT_RE, "").trim();
  const buildAcceptedAnswers = (baseAnswer) => {
    const base = normalizeQuotes(baseAnswer);
    const noNiqqud = stripNiqqud(base);
    const noPunct = stripSurroundingPunctuation(base);
    const noPunctNoNiqqud = stripSurroundingPunctuation(noNiqqud);
    const candidates = [base, noNiqqud, noPunct, noPunctNoNiqqud];
    return Array.from(
      new Set(
        candidates
          .map((c) => String(c || "").trim())
          .filter(Boolean)
      )
    );
  };

  const buildAcceptedAnswersUnion = (seeds) => {
    const acc = new Set();
    for (const seed of seeds) {
      if (seed == null) continue;
      const s = String(seed).trim();
      if (!s) continue;
      for (const v of buildAcceptedAnswers(s)) acc.add(v);
    }
    return [...acc];
  };

  function resolveG12ControlledTypingGate(topicKey, rawPick) {
    const g = String(gradeKey || "").toLowerCase();
    if (g !== "g1" && g !== "g2") return false;
    if (String(rawPick?.preferredAnswerMode || "").toLowerCase() !== "typing") {
      return false;
    }
    const sid =
      g === "g1"
        ? resolveG1ItemSubtopicId(rawPick, topicKey)
        : resolveG2ItemSubtopicId(rawPick, topicKey);
    return G12_ALLOWED_TYPING_SUBTOPICS.has(sid);
  }

  const resolveAnswerMode = (selectedTopicKey, questionText, rawPickForGate) => {
    const gEarly = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 9;
    if (gEarly <= 2) {
      if (resolveG12ControlledTypingGate(selectedTopicKey, rawPickForGate)) {
        return "typing";
      }
      return "choice";
    }
    const q = String(questionText || "").trim();
    const hasBlankPattern = q.includes("_") || q.includes(BLANK);
    if (selectedTopicKey === "writing" || selectedTopicKey === "speaking") {
      return "typing";
    }
    if (selectedTopicKey === "comprehension") {
      return "choice";
    }
    if (selectedTopicKey === "grammar") {
      if (hasBlankPattern || q.includes("איך כותבים")) return "typing";
      return "choice";
    }
    if (selectedTopicKey === "reading") {
      if (hasBlankPattern || q.includes("איזה אות חסרה") || q.includes("מה המילה הנכונה")) {
        return "typing";
      }
      return "choice";
    }
    if (selectedTopicKey === "vocabulary") {
      if (q.includes("מה המילה המתאימה") || q.includes("השלם")) return "typing";
      return "choice";
    }
    return "choice";
  };

  if (!topicQuestionsMerged || topicQuestionsMerged.length === 0) {
    const levelTryOrder = [
      levelKey,
      ...["easy", "medium", "hard"].filter((x) => x !== levelKey),
    ];
    const tryMergedForTopic = (top) => {
      for (const lv of levelTryOrder) {
        const m = mergeTopicPools(
          gradeKey,
          lv,
          top,
          getQuestionsForGradeAndLevel(gradeKey, lv, top)
        );
        if (m.length) return { merged: m, lv, topic: top };
      }
      return null;
    };
    let got = tryMergedForTopic(selectedTopic);
    if (!got && selectedTopic !== "reading") {
      got = tryMergedForTopic("reading");
    }
    if (!got) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[hebrew] empty merged pool and no legacy for grade", {
          gradeKey,
          levelKey,
          selectedTopic,
        });
      }
      const emptyTrace = {
        runtimeEntry: "utils/hebrew-question-generator.js#generateQuestion",
        question:
          "אין כרגע שאלות זמינות לכיתה ולרמה שנבחרו. נסו נושא אחר או רמת קושי אחרת.",
        gradeKey,
        topic: selectedTopic,
        levelKey,
        requestedLevelKey: levelKey,
        subtopicId: null,
        patternFamily: "no_questions",
        subtype: null,
        sourceBank: "EMPTY_POOL_PLACEHOLDER",
        sourceFile: null,
        fromRich: false,
        dataHebrewQuestionsG1Imported: false,
        dataHebrewQuestionsG2Imported: false,
        dataHebrewQuestionsNote:
          "data/hebrew-questions/g*.js is not imported by the app; grep the repo for 'hebrew-questions' / 'data/hebrew-questions' on JS/TS entrypoints.",
      };
      logHebrewSourceTraceIfDev(emptyTrace);
      return attachCanonicalMetadataToHebrewQuestion(
        {
          question:
            "אין כרגע שאלות זמינות לכיתה ולרמה שנבחרו. נסו נושא אחר או רמת קושי אחרת.",
          questionLabel: "",
          exerciseText:
            "אין כרגע שאלות זמינות לכיתה ולרמה שנבחרו. נסו נושא אחר או רמת קושי אחרת.",
          answers: ["הבנתי", "אנסה שוב", "אחזור לתפריט", "אבחר נושא אחר"],
          correctAnswer: "הבנתי",
          acceptedAnswers: ["הבנתי"],
          answerMode: "choice",
          optionCount: 4,
          correctIndex: 0,
          topic: selectedTopic,
          operation: selectedTopic,
          a: null,
          b: null,
          params: {
            kind: "empty_pool",
            grade: gradeKey,
            gradeKey,
            levelKey,
            patternFamily: "no_questions",
            answerMode: "choice",
            sourceTrace: emptyTrace,
          },
        },
        { topic: selectedTopic, gradeKey, levelKey, sourceRow: null }
      );
    }
    const fallbackTopic = got.topic;
    const fallbackLevelKey = got.lv;
    let mergedForPick = got.merged;
    if (String(gradeKey).toLowerCase() === "g1") {
      mergedForPick = withG1SubtopicPreference(gradeKey, fallbackTopic, got.merged).merged;
    } else if (String(gradeKey).toLowerCase() === "g2") {
      mergedForPick = withG2SubtopicPreference(gradeKey, fallbackTopic, got.merged).merged;
    } else if (["g3", "g4", "g5", "g6"].includes(String(gradeKey).toLowerCase())) {
      mergedForPick = withUpperGradeSubtopicPreference(gradeKey, fallbackTopic, got.merged).merged;
    }
    const rawPick = pickWeightedHebrewItem(
      mergedForPick,
      fallbackLevelKey,
      fallbackTopic,
      gradeKey,
      excludeFingerprints
    );
    const randomQ = finalizeHebrewMcq(
      rawPick,
      fallbackTopic,
      fallbackLevelKey,
      gradeKey
    );

    // ערבוב התשובות - Fisher-Yates shuffle
    const shuffledAnswers = [...randomQ.answers];
    for (let i = shuffledAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
    }

    // מציאת המיקום החדש של התשובה הנכונה
    const correctAnswer = randomQ.answers[randomQ.correct];
    const newCorrectIndex = shuffledAnswers.findIndex((ans) => ans === correctAnswer);

    const answerMode = resolveAnswerMode(fallbackTopic, randomQ.question, rawPick);
    const acceptedAnswers =
      answerMode === "typing"
        ? buildAcceptedAnswersUnion([
            correctAnswer,
            ...(Array.isArray(rawPick?.typingAcceptedAnswers)
              ? rawPick.typingAcceptedAnswers
              : []),
          ])
        : buildAcceptedAnswers(correctAnswer);
    const optionCount = shuffledAnswers.length;
    const subtopicParams = attachSubtopicParamsForGrade(
      gradeKey,
      fallbackTopic,
      rawPick
    );
    const sourceTrace = buildHebrewSourceTrace(rawPick, randomQ, {
      gradeKey,
      topic: fallbackTopic,
      poolLevelKey: fallbackLevelKey,
      requestedLevelKey: levelKey,
      subtopicParams,
    });
    logHebrewSourceTraceIfDev(sourceTrace);
    return attachCanonicalMetadataToHebrewQuestion(
      {
        question: randomQ.question,
        questionLabel: "",
        exerciseText: randomQ.question,
        answers: shuffledAnswers,
        correctAnswer: correctAnswer,
        acceptedAnswers,
        answerMode,
        optionCount,
        correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
        topic: fallbackTopic,
        operation: fallbackTopic,
        a: null,
        b: null,
        params: {
          kind: fallbackTopic,
          grade: gradeKey,
          gradeKey: gradeKey,
          levelKey: fallbackLevelKey,
          patternFamily: randomQ.patternFamily,
          subtype: randomQ.subtype,
          distractorFamily: randomQ.distractorFamily,
          difficultyBand: randomQ.difficultyBand,
          optionCount,
          answerMode,
          requestedLevelKey: levelKey,
          ...(randomQ.hebrewLegacyMeta
            ? { hebrewLegacyMeta: randomQ.hebrewLegacyMeta }
            : {}),
          ...(fallbackTopic !== selectedTopic
            ? { gradeFallbackFromTopic: selectedTopic }
            : {}),
          ...(fallbackLevelKey !== levelKey ? { levelRelaxedFrom: levelKey } : {}),
          ...subtopicParams,
          ...pickDiagnosticContractFields(randomQ),
          ...(randomQ.authenticity_pattern != null &&
          String(randomQ.authenticity_pattern).trim() !== ""
            ? { authenticity_pattern: String(randomQ.authenticity_pattern).trim() }
            : {}),
          sourceTrace,
        },
      },
      {
        topic: fallbackTopic,
        gradeKey,
        levelKey: fallbackLevelKey,
        sourceRow: rawPick,
      }
    );
  }

  const rawPick = pickWeightedHebrewItem(
    topicQuestionsMerged,
    poolLevelKey,
    selectedTopic,
    gradeKey,
    excludeFingerprints
  );
  const randomQ = finalizeHebrewMcq(
    rawPick,
    selectedTopic,
    poolLevelKey,
    gradeKey
  );

  // ערבוב התשובות - Fisher-Yates shuffle
  const shuffledAnswers = [...randomQ.answers];
  for (let i = shuffledAnswers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
  }

  // מציאת המיקום החדש של התשובה הנכונה
  const correctAnswer = randomQ.answers[randomQ.correct];
  const newCorrectIndex = shuffledAnswers.findIndex((ans) => ans === correctAnswer);

  const answerMode = resolveAnswerMode(selectedTopic, randomQ.question, rawPick);
  const acceptedAnswers =
    answerMode === "typing"
      ? buildAcceptedAnswersUnion([
          correctAnswer,
          ...(Array.isArray(rawPick?.typingAcceptedAnswers)
            ? rawPick.typingAcceptedAnswers
            : []),
        ])
      : buildAcceptedAnswers(correctAnswer);
  const optionCount = shuffledAnswers.length;
  const subtopicParams = attachSubtopicParamsForGrade(
    gradeKey,
    selectedTopic,
    rawPick
  );
  const sourceTrace = buildHebrewSourceTrace(rawPick, randomQ, {
    gradeKey,
    topic: selectedTopic,
    poolLevelKey,
    requestedLevelKey: levelKey,
    subtopicParams,
  });
  logHebrewSourceTraceIfDev(sourceTrace);
  return attachCanonicalMetadataToHebrewQuestion(
    {
      question: randomQ.question,
      questionLabel: "",
      exerciseText: randomQ.question,
      answers: shuffledAnswers,
      correctAnswer: correctAnswer,
      acceptedAnswers,
      answerMode,
      optionCount,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      topic: selectedTopic,
      operation: selectedTopic,
      a: null,
      b: null,
      params: {
        kind: selectedTopic,
        grade: gradeKey,
        gradeKey: gradeKey,
        levelKey: poolLevelKey,
        patternFamily: randomQ.patternFamily,
        subtype: randomQ.subtype,
        distractorFamily: randomQ.distractorFamily,
        difficultyBand: randomQ.difficultyBand,
        optionCount,
        answerMode,
        requestedLevelKey: levelKey,
        ...(randomQ.hebrewLegacyMeta
          ? { hebrewLegacyMeta: randomQ.hebrewLegacyMeta }
          : {}),
        ...(poolLevelKey !== levelKey ? { levelRelaxedFrom: levelKey } : {}),
        ...subtopicParams,
        ...pickDiagnosticContractFields(randomQ),
        ...(randomQ.authenticity_pattern != null &&
        String(randomQ.authenticity_pattern).trim() !== ""
          ? { authenticity_pattern: String(randomQ.authenticity_pattern).trim() }
          : {}),
        sourceTrace,
      },
    },
    {
      topic: selectedTopic,
      gradeKey,
      levelKey: poolLevelKey,
      sourceRow: rawPick,
    }
  );
}
