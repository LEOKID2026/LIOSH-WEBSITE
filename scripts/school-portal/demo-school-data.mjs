/** Static demo school configuration (108 subject-class records, 398 students). */

export const DEMO_SCHOOL_NAME = "בית ספר ניסוי לאו קידס";
export const DEMO_SCHOOL_CITY = "תל אביב — QA";
export const DEMO_SCHOOL_COUNTRY = "IL";
export const DEMO_SCHOOL_MAX_TEACHERS = 15;
export const DEMO_SCHOOL_CONTACT_EMAIL = "school@leo-k.com";

export const DEMO_PARENT_EMAIL = "demofamily@leo-k.com";
export const DEMO_PARENT_DISPLAY = "משפחת הדגמה";

export const SUBJECTS = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "moledet_geography",
  "science",
];

const GRADE_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];

export function physicalClassName(grade, section) {
  return `כיתה ${GRADE_HE[grade - 1]} ${section}`;
}

/** @type {{ grade: number, section: number, count: number }[]} */
export const PHYSICAL_CLASSES = [
  { grade: 1, section: 1, count: 24 },
  { grade: 1, section: 2, count: 22 },
  { grade: 1, section: 3, count: 20 },
  { grade: 2, section: 1, count: 24 },
  { grade: 2, section: 2, count: 22 },
  { grade: 2, section: 3, count: 22 },
  { grade: 3, section: 1, count: 22 },
  { grade: 3, section: 2, count: 22 },
  { grade: 3, section: 3, count: 22 },
  { grade: 4, section: 1, count: 24 },
  { grade: 4, section: 2, count: 22 },
  { grade: 4, section: 3, count: 20 },
  { grade: 5, section: 1, count: 22 },
  { grade: 5, section: 2, count: 22 },
  { grade: 5, section: 3, count: 22 },
  { grade: 6, section: 1, count: 24 },
  { grade: 6, section: 2, count: 22 },
  { grade: 6, section: 3, count: 20 },
];

export const TEACHERS = [
  { key: "dan", email: "dan@leo-k.com", displayName: "דן כהן", subjects: ["math", "geometry"], grades: [1, 2] },
  { key: "vered", email: "vered@leo-k.com", displayName: "ורד לוי", subjects: ["math", "geometry"], grades: [3, 4] },
  { key: "noam", email: "noam@leo-k.com", displayName: "נועם מזרחי", subjects: ["math", "geometry"], grades: [5, 6] },
  { key: "sara", email: "sara@leo-k.com", displayName: "שרה פרץ", subjects: ["english"], grades: [1, 2] },
  { key: "michal", email: "michal@leo-k.com", displayName: "מיכל ביטון", subjects: ["english"], grades: [3, 4] },
  { key: "alon", email: "alon@leo-k.com", displayName: "אלון אברהם", subjects: ["english"], grades: [5, 6] },
  { key: "rachel", email: "rachel@leo-k.com", displayName: "רחל פרידמן", subjects: ["hebrew", "moledet_geography"], grades: [1, 2] },
  { key: "yael", email: "yael@leo-k.com", displayName: "יעל שפירא", subjects: ["hebrew", "moledet_geography"], grades: [3, 4] },
  { key: "david", email: "david@leo-k.com", displayName: "דוד דוד", subjects: ["hebrew", "moledet_geography"], grades: [5, 6] },
  { key: "liron", email: "liron@leo-k.com", displayName: "לירון אזולאי", subjects: ["science"], grades: [1, 2, 3] },
  { key: "tamar", email: "tamar@leo-k.com", displayName: "תמר יוסף", subjects: ["science"], grades: [4, 5, 6] },
];

export const SCHOOL_MANAGER = {
  key: "manager",
  email: "school@leo-k.com",
  displayName: "מנהל/ת בית הספר",
};

export const FEMALE_FIRST = [
  "נועה", "מיה", "שירה", "תמר", "ליאור", "חן", "רותם", "יעל", "מיכל", "ורד",
  "גלי", "הדס", "לילך", "נרית", "עדי", "שחר", "רעות", "דנה", "עינב", "טל",
  "הילה", "אורית", "שני", "יונית", "ליאת", "קרן", "אמית", "שיר", "ספיר", "גל",
  "ניצן", "עמית", "איה", "נגה", "אריאל",
];

export const MALE_FIRST = [
  "עומר", "יואב", "אדם", "נדב", "אורי", "ניר", "ליאם", "גיל", "אלון", "רון",
  "יונתן", "מתן", "תמיר", "איתי", "אסף", "גלעד", "עמרי", "דרור", "עידן", "אוהד",
  "אמיר", "שחר", "ידין", "נתן", "ראם", "אביב", "ישי", "ברק", "מאור", "ליעד",
  "יוסף", "אלי", "שי", "מיכה", "אריאל",
];

export const FAMILY_NAMES = [
  "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "פרידמן", "שפירא", "דוד", "אזולאי",
  "יוסף", "חדד", "רוזן", "שמש", "בן-דוד", "ברק", "שטרן", "גרוס", "אלון", "נחום",
];

/** physical class name → { topic, subject } */
export const WEAK_TOPICS_BY_CLASS = {
  "כיתה א׳ 1": { topic: "subtraction", subject: "math" },
  "כיתה א׳ 2": { topic: "vowels_reading", subject: "hebrew" },
  "כיתה ב׳ 1": { topic: "plurals", subject: "hebrew" },
  "כיתה ב׳ 3": { topic: "simple_sentences", subject: "english" },
  "כיתה ג׳ 2": { topic: "fractions", subject: "math" },
  "כיתה ג׳ 3": { topic: "animals", subject: "science" },
  "כיתה ד׳ 1": { topic: "angles", subject: "geometry" },
  "כיתה ד׳ 2": { topic: "community", subject: "moledet_geography" },
  "כיתה ה׳ 2": { topic: "environment", subject: "science" },
  "כיתה ה׳ 3": { topic: "multiplication_advanced", subject: "math" },
  "כיתה ו׳ 1": { topic: "maps", subject: "moledet_geography" },
  "כיתה ו׳ 3": { topic: "pythagoras", subject: "geometry" },
};

/** day index 0=Sunday … 4=Thursday, each hour 1-6 */
export const TIMETABLE_BY_DAY = [
  ["math", "hebrew", "english", "science", "moledet_geography", "geometry"],
  ["math", "english", "hebrew", "math", "science", "moledet_geography"],
  ["geometry", "hebrew", "english", "math", "science", "moledet_geography"],
  ["math", "english", "science", "hebrew", "math", "moledet_geography"],
  ["math", "geometry", "hebrew", "english", "math", "science"],
];

export function teacherKeyForSubject(grade, subject) {
  if (subject === "math" || subject === "geometry") {
    if (grade <= 2) return "dan";
    if (grade <= 4) return "vered";
    return "noam";
  }
  if (subject === "english") {
    if (grade <= 2) return "sara";
    if (grade <= 4) return "michal";
    return "alon";
  }
  if (subject === "hebrew" || subject === "moledet_geography") {
    if (grade <= 2) return "rachel";
    if (grade <= 4) return "yael";
    return "david";
  }
  if (subject === "science") {
    return grade <= 3 ? "liron" : "tamar";
  }
  throw new Error(`Unknown subject: ${subject}`);
}

export function achievementProfile(globalIndex) {
  const mod = globalIndex % 20;
  if (mod < 3) return "struggling";
  if (mod >= 17) return "strong";
  return "average";
}

export function studentFullName(globalIndex) {
  const female = globalIndex % 2 === 0;
  const pool = female ? FEMALE_FIRST : MALE_FIRST;
  const first = pool[globalIndex % pool.length];
  const last = FAMILY_NAMES[Math.floor(globalIndex / pool.length) % FAMILY_NAMES.length];
  return `${first} ${last}`;
}

export function classRecordKey(grade, section, subject) {
  return `${grade}:${section}:${subject}`;
}

export function physicalClassKey(grade, section) {
  return `${grade}:${section}`;
}
