import {
  baseArticle,
  paragraph,
  heading,
  list,
  callout,
  screenshotBlock,
  videoBlock,
  relatedLinks,
} from "../articleHelpers";

const S = "students";

function studentArticle(opts) {
  return baseArticle({ ...opts, section: S, audience: "student" });
}

export const studentLogin = studentArticle({
  slug: "student-login",
  title: "איך מתחברים?",
  summary: "כניסה עם שם וקוד PIN.",
  keywords: ["כניסה", "PIN"],
  toc: [{ id: "steps", title: "שלבים" }],
  blocks: [
    heading(2, "steps", "שלבים"),
    list(["בקשו מההורה את שם המשתמש והקוד", "הקלידו בעמוד הכניסה", "לחצו התחבר"], true),
    videoBlock(S, "student-login"),
    screenshotBlock(S, "student-login", "login", "מסך כניסת ילד/ה"),
  ],
});

export const studentHomeTour = studentArticle({
  slug: "student-home-tour",
  title: "עמוד הבית שלי",
  summary: "מה רואים אחרי שנכנסים: מקצועות, מטבעות ואווטאר.",
  keywords: ["בית", "ילד/ה"],
  toc: [{ id: "home", title: "עמוד הבית" }],
  blocks: [
    heading(2, "home", "עמוד הבית"),
    paragraph("כאן תראו את השם שלכם, כמה מטבעות יש לכם, ולאיזה מקצועים אפשר להיכנס."),
    videoBlock(S, "student-home-tour"),
    screenshotBlock(S, "student-home-tour", "home", "עמוד בית ילד/ה עם כרטיסי מקצועות"),
  ],
});

export const chooseSubjectAndGrade = studentArticle({
  slug: "choose-subject-and-grade",
  title: "בחירת מקצוע וכיתה",
  summary: "איך נכנסים לתרגול במקצוע שבחרתם.",
  keywords: ["מקצוע", "כיתה"],
  toc: [{ id: "learning-hub", title: "אזור לימודים" }],
  blocks: [
    heading(2, "learning-hub", "אזור לימודים"),
    paragraph("בחרו מקצוע מהרשימה. המשחק יתאים לכיתה שלכם."),
    videoBlock(S, "choose-subject-and-grade"),
    screenshotBlock(S, "choose-subject-and-grade", "subjects", "רשימת מקצועות באזור לימודים"),
    relatedLinks([{ href: "/learning", label: "לאזור הלימודים" }]),
  ],
});

export const answeringQuestions = studentArticle({
  slug: "answering-questions",
  title: "איך עונים על שאלות?",
  summary: "בחירה, הקלדה ורבברירה.",
  keywords: ["שאלות", "תשובה"],
  toc: [{ id: "types", title: "סוגי שאלות" }],
  blocks: [
    heading(2, "types", "סוגי שאלות"),
    list([
      "לפעמים בוחרים תשובה מרשימה",
      "לפעמים מקלידים מספר או מילה",
      "אחרי התשובה תראו אם צדקתם",
    ]),
    videoBlock(S, "answering-questions"),
    screenshotBlock(S, "answering-questions", "question", "שאלת תרגול על המסך"),
  ],
});

export const hintsAndExplanations = studentArticle({
  slug: "hints-and-explanations",
  title: "רמזים והסברים",
  summary: "מה קורה אחרי תשובה נכונה או שגויה.",
  keywords: ["הסבר", "רמז"],
  toc: [{ id: "after", title: "אחרי התשובה" }],
  blocks: [
    heading(2, "after", "אחרי התשובה"),
    paragraph("אם טעיתם - קראו את ההסבר ונסו שוב. אם צדקתם - המשיכו לשאלה הבאה!"),
    callout("tip", "אל תמהרו - קריאת ההסבר עוזרת להבין."),
    videoBlock(S, "hints-and-explanations"),
  ],
});

export const dailyMissions = studentArticle({
  slug: "daily-missions",
  title: "משימות יומיות",
  summary: "משימות קטנות שעוזרות להתקדם כל יום.",
  keywords: ["יומי", "משימות"],
  toc: [{ id: "missions", title: "משימות" }],
  blocks: [
    heading(2, "missions", "משימות"),
    paragraph("בעמוד הבית תראו משימות יומיות. כשמסיימים אותן - מקבלים נקודות והתקדמות."),
    videoBlock(S, "daily-missions"),
    screenshotBlock(S, "daily-missions", "missions", "פאנל משימות יומיות"),
  ],
});

export const monthlyPersistence = studentArticle({
  slug: "monthly-persistence",
  title: "מסע התמדה חודשי",
  summary: "להתאמן כל חודש ולצבור התקדמות.",
  keywords: ["התמדה", "חודש"],
  toc: [{ id: "persistence", title: "התמדה" }],
  blocks: [
    heading(2, "persistence", "התמדה"),
    paragraph("ככל שמתאמנים יותר בחודש - המסע מתקדם. זה מראה כמה התמדתם!"),
    screenshotBlock(S, "monthly-persistence", "persistence", "מסע התמדה חודשי"),
    videoBlock(S, "monthly-persistence"),
  ],
});

export const coinsAndArcade = studentArticle({
  slug: "coins-and-arcade",
  title: "מטבעות וארקייד",
  summary: "איך מרוויחים מטבעות ומשחקים מקוונים.",
  keywords: ["מטבעות", "ארקייד"],
  toc: [{ id: "coins", title: "מטבעות" }],
  blocks: [
    heading(2, "coins", "מטבעות"),
    paragraph("מתרגלים ומרוויחים מטבעות. בארקייד אפשר לשחק משחקי לוח עם חברים."),
    videoBlock(S, "coins-and-arcade"),
    screenshotBlock(S, "coins-and-arcade", "arcade", "עמוד ארקייד"),
    relatedLinks([{ href: "/student/arcade", label: "לארקייד" }]),
  ],
});

export const avatarAndProfile = studentArticle({
  slug: "avatar-and-profile",
  title: "שינוי אווטאר",
  summary: "איך בוחרים דמות או תמונה לפרופיל.",
  keywords: ["אווטאר", "פרופיל"],
  toc: [{ id: "avatar", title: "אווטאר" }],
  blocks: [
    heading(2, "avatar", "אווטאר"),
    paragraph("לחצו על התמונה בעמוד הבית ובחרו אווטאר חדש."),
    screenshotBlock(S, "avatar-and-profile", "avatar", "בחירת אווטאר"),
    videoBlock(S, "avatar-and-profile"),
  ],
});

export const offlineGames = studentArticle({
  slug: "offline-games",
  title: "משחקים לא מקוונים",
  summary: "משחקים בלי אינטרנט על אותו מכשיר.",
  keywords: ["לא מקוון", "משחק"],
  toc: [{ id: "offline", title: "לא מקוון" }],
  blocks: [
    heading(2, "offline", "לא מקוון"),
    paragraph("איקס עיגול ומשחקים נוספים - בלי צורך ברשת."),
    screenshotBlock(S, "offline-games", "offline", "רשימת משחקים לא מקוונים"),
    videoBlock(S, "offline-games"),
    relatedLinks([{ href: "/offline", label: "משחקים לא מקוונים" }]),
  ],
});

export const tipsForGoodPractice = studentArticle({
  slug: "tips-for-good-practice",
  title: "טיפים לתרגול טוב",
  summary: "זמן לימוד, הפסקות ורצף.",
  keywords: ["טיפים", "תרגול"],
  toc: [{ id: "tips", title: "טיפים" }],
  blocks: [
    heading(2, "tips", "טיפים"),
    list([
      "תרגלו קצת כל יום",
      "קחו הפסקה אם עייפים",
      "קראו הסברים כשלא מבינים",
    ]),
    callout("tip", "כיף ללמוד כשלא לוחצים על עצמכם!"),
    videoBlock(S, "tips-for-good-practice"),
  ],
});

export const STUDENT_ARTICLES = [
  studentLogin,
  studentHomeTour,
  chooseSubjectAndGrade,
  answeringQuestions,
  hintsAndExplanations,
  dailyMissions,
  monthlyPersistence,
  coinsAndArcade,
  avatarAndProfile,
  offlineGames,
  tipsForGoodPractice,
];
