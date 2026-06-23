import Layout from "../../components/Layout";
import StudentImmersiveAdPage from "../../components/student/StudentImmersiveAdPage.jsx";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  ENGLISH_GENERAL_GOALS,
  ENGLISH_GRADES,
  ENGLISH_GRADE_ORDER,
} from "../../data/english-curriculum";
import {
  SCIENCE_GENERAL_GOALS,
  SCIENCE_GRADES,
  SCIENCE_GRADE_ORDER,
} from "../../data/science-curriculum";
import {
  HEBREW_GENERAL_GOALS,
  HEBREW_GRADES,
  HEBREW_GRADE_ORDER,
} from "../../data/hebrew-curriculum";
import {
  MOLEDET_GEOGRAPHY_GENERAL_GOALS,
  MOLEDET_GEOGRAPHY_GRADES,
  MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER,
} from "../../data/moledet-geography-curriculum";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPIC_META,
  topicDescriptionForCurriculumPage,
} from "../../utils/geometry-constants";

const GEOMETRY_GRADE_ORDER = ["g1", "g2", "g3", "g4", "g5", "g6"];

export default function Curriculum() {
  useIOSViewportFix();
  const router = useRouter();
  const subjectParam = Array.isArray(router.query.subject)
    ? router.query.subject[0]
    : router.query.subject;
  const normalizedSubject = (subjectParam || "math").toString().toLowerCase();
  const supportedSubjects = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];
  const subject = supportedSubjects.includes(normalizedSubject) ? normalizedSubject : "math";
  const isEnglish = subject === "english";
  const isScience = subject === "science";
  const isHebrew = subject === "hebrew";
  const isMoledetGeography = subject === "moledet-geography";
  const isGeometry = subject === "geometry";
  const englishGrades = ENGLISH_GRADE_ORDER.map((key) => ENGLISH_GRADES[key]);
  const scienceGrades = SCIENCE_GRADE_ORDER.map((key) => SCIENCE_GRADES[key]);
  const hebrewGrades = HEBREW_GRADE_ORDER.map((key) => HEBREW_GRADES[key]);
  const moledetGeographyGrades = MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER.map(
    (key) => MOLEDET_GEOGRAPHY_GRADES[key]
  );
  
  const subjectTitles = {
    math: "מתמטיקה",
    geometry: "גאומטריה",
    english: "אנגלית",
    science: "מדעים",
    hebrew: "עברית",
    "moledet-geography": "מולדת, חברה ואזרחות + גאוגרפיה",
  };

  const subjectDescriptions = {
    math:
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף החשבון. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
    english:
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף האנגלית. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
    science:
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף המדעים. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
    geometry:
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף הגאומטריה. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
    hebrew:
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף השפה העברית. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
    "moledet-geography":
      "מותאם לפי כיתה, נושא ורמת קושי — כפי שמוצגים בדף מולדת/גיאוגרפיה. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.",
  };

  const subjectTitle = subjectTitles[subject] || subjectTitles.math;
  const subjectDescription = subjectDescriptions[subject] || subjectDescriptions.math;

  const handleClose = () => {
    router.back();
  };
  
  return (
    <Layout>
      <StudentImmersiveAdPage>
      <main className="min-h-screen bg-gradient-to-b from-[#120b1f] to-[#1b1430] text-white px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleClose}
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold tracking-widest hover:bg-white/20 transition"
            >
              ✖ סגירה
            </button>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              תוכנית לימודים
            </p>
          </div>

          <header className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-black" dir="rtl">
              תוכנית הלימודים באתר - {subjectTitle}
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto" dir="rtl">
              {subjectDescription}
            </p>
          </header>

          {isEnglish ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {ENGLISH_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
              </div>
              {englishGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-blue-500/15 border-r-4 border-blue-400 p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-white/70">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-white/80 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מיומנויות עיקריות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">דקדוק ומבנים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.grammar?.map((item, idx) => (
                          <li key={`grammar-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">נושאי אוצר מילים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.vocabulary?.map((item, idx) => (
                          <li key={`vocab-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-semibold mb-1 text-white">יעדי סף</h4>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                      {grade.curriculum?.benchmark?.map((item, idx) => (
                        <li key={`benchmark-${grade.key}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : isHebrew ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {HEBREW_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
              </div>
              {hebrewGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-blue-500/15 border-r-4 border-blue-400 p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-white/70">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-white/80 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">דקדוק</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.grammar?.map((item, idx) => (
                          <li key={`grammar-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">אוצר מילים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.vocabulary?.map((item, idx) => (
                          <li key={`vocab-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isMoledetGeography ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {MOLEDET_GEOGRAPHY_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
              </div>
              {moledetGeographyGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-blue-500/15 border-r-4 border-blue-400 p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-white/70">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-white/80 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">גאוגרפיה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.geography?.map((item, idx) => (
                          <li key={`geo-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">אזרחות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.citizenship?.map((item, idx) => (
                          <li key={`cit-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isScience ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="bg-emerald-500/20 border-r-4 border-emerald-500 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {SCIENCE_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`science-goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
              </div>

              {scienceGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-emerald-500/15 border-r-4 border-emerald-400 p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-white/70">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-white/80 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-white">נושאים מרכזיים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`science-focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`science-skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">חקר והתנסות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.inquiry?.map((item, idx) => (
                          <li key={`science-inquiry-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-white">קישור לטכנולוגיה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-white/80">
                        {grade.curriculum?.technology?.map((item, idx) => (
                          <li key={`science-tech-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isGeometry ? (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מבנה גאומטריה באתר</h3>
                <ul className="list-disc pr-6 space-y-2 text-sm text-white/85">
                  <li>
                    <strong>6 כיתות</strong> (א׳–ו׳) — הרשימות למטה תואמות את בחירת הנושא בדף הגאומטריה ואת מדיניות
                    הנושאים בגנרטור
                  </li>
                  <li>
                    <strong>3 רמות קושי</strong> לכל כיתה: קל, בינוני, קשה — כפי שמוגדר בדף התרגול
                  </li>
                  <li>
                    <strong>ערבוב</strong>: נשען רק על נושאים המורשים לאותה כיתה (לא עוקף מגבלות כיתה או נושא חסום)
                  </li>
                </ul>
              </div>
              {GEOMETRY_GRADE_ORDER.map((gk) => {
                const grade = GEOMETRY_GRADES[gk];
                const topicKeys = (grade?.topics || []).filter((t) => t !== "mixed");
                return (
                  <div
                    key={gk}
                    className="bg-blue-500/15 border-r-4 border-blue-400 p-4 rounded-lg mb-6"
                  >
                    <h2 className="text-2xl font-bold mb-3">{grade.name}</h2>
                    <h3 className="text-lg font-semibold mb-2">נושאים זמינים בדף הגאומטריה</h3>
                    <ul className="list-disc pr-6 space-y-2 text-sm text-white/85">
                      {topicKeys.map((topicKey) => (
                        <li key={`${gk}-${topicKey}`}>
                          <strong>{GEOMETRY_TOPIC_META[topicKey]?.name || topicKey}</strong>
                          {" — "}
                          {topicDescriptionForCurriculumPage(gk, topicKey) ||
                            GEOMETRY_TOPIC_META[topicKey]?.description ||
                            ""}
                        </li>
                      ))}
                      <li>
                        <strong>{GEOMETRY_TOPIC_META.mixed?.name || "ערבוב"}</strong>
                        {" — "}
                        תרגול מעורב מתוך הנושאים המורשים לכיתה זו בלבד
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
              <div className="prose prose-invert max-w-none">
                <div className="bg-emerald-500/20 border-r-4 border-emerald-500 p-4 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">מבנה כללי</h3>
                  <ul className="list-disc pr-6 space-y-2">
                    <li><strong>6 כיתות</strong>: א', ב', ג', ד', ה', ו'</li>
                    <li><strong>3 רמות קושי</strong> לכל כיתה: קל, בינוני, קשה</li>
                    <li><strong>נושאים לפי כיתה</strong> — הרשימות למטה תואמות את בחירת הנושא בדף החשבון ואת מדיניות הנושאים בגנרטור</li>
                    <li><strong>בקרות פנימיות</strong> — ארגון הנושאים לפי כיתה ורמת קושי</li>
                  </ul>
                </div>

                {/* כיתה א' */}
                <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                  <h2 className="text-2xl font-bold mb-3">כיתה א'</h2>
                  <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                  <ol className="list-decimal pr-6 space-y-1 mb-4">
                    <li>חיבור - כולל חיבור בעשרות שלמות ובעשרת השנייה</li>
                    <li>חיסור - כולל חיסור בעשרות שלמות ובעשרת השנייה</li>
                    <li>כפל - עד 20</li>
                    <li>השוואה</li>
                    <li>תחושת מספר - שכנים, זוגי/אי-זוגי, השלמה ל-10, עשרות/אחדות, ישר המספרים, מנייה וספירה (כולל השלמת מספר / איזון פשוט בלבד — לא אלגברה פורמלית)</li>
                    <li>שאלות מילוליות - שאלות חיבור וחיסור (כסף, זמן, כמויות)</li>
                    <li>מעורב — תרגילים מעורבים מתוך הנושאים למעלה</li>
                  </ol>
                  <div className="bg-white/5 p-3 rounded mb-3">
                    <h4 className="font-semibold mb-2">רמות קושי:</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>קל:</strong> חיבור עד 10 (כולל חיבור בעשרות שלמות ובעשרת השנייה), חיסור עד 10, כפל עד 5×5, השוואה עד 10, תחושת מספר עד 10 (ישר המספרים, מנייה וספירה), שאלות מילוליות עד 10, מעורב</div>
                      <div><strong>בינוני:</strong> חיבור עד 20 (כולל חיבור בעשרות שלמות ובעשרת השנייה), חיסור עד 20, כפל עד 5×5, השוואה עד 20, תחושת מספר עד 20 (ישר המספרים, מנייה וספירה), שאלות מילוליות עד 20, מעורב</div>
                      <div><strong>קשה:</strong> חיבור עד 20 (כולל חיבור בעשרות שלמות ובעשרת השנייה), חיסור עד 20, כפל עד 5×5, השוואה עד 20, תחושת מספר עד 20 (ישר המספרים, מנייה וספירה), שאלות מילוליות עד 20, מעורב</div>
                    </div>
                  </div>
                  <div className="bg-yellow-500/20 p-3 rounded text-sm">
                    <strong>הערות:</strong> כפל עד 20. חילוק נלמד רק כהפוך לכפל בשאלות מילוליות, לא תרגילים ישירים. אין שברים כנושא נפרד. אין עשרוניים, התחלקות פורמלית או משוואות כנושא. אין מספרים שליליים.
                  </div>
                </div>

                {/* כיתה ב' */}
                <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                  <h2 className="text-2xl font-bold mb-3">כיתה ב'</h2>
                  <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                  <ol className="list-decimal pr-6 space-y-1 mb-4">
                    <li>חיבור</li>
                    <li>חיסור</li>
                    <li>כפל - לוח כפל עד 10×10</li>
                    <li>חילוק - לפי לוח הכפל</li>
                    <li>שברים - חצי, רבע וחלק מהשלם (היכרות בסיסית בלבד)</li>
                    <li>השוואה</li>
                    <li>תחושת מספר</li>
                    <li>שאלות מילוליות - שאלות חיבור, חיסור, כפל וחילוק (כסף, זמן, כמויות)</li>
                    <li>מעורב - תרגילים מעורבים בתחום ה-1000</li>
                  </ol>
                  <div className="bg-white/5 p-3 rounded mb-3">
                    <h4 className="font-semibold mb-2">רמות קושי:</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>קל:</strong> חיבור/חיסור עד 50, כפל עד 5×5, חילוק עד 50, שברים חצי/רבע, השוואה עד 1000, שאלות מילוליות עד 100</div>
                      <div><strong>בינוני:</strong> חיבור/חיסור עד 100, כפל עד 10×10, חילוק עד 100, שברים חצי/רבע, השוואה עד 1000, שאלות מילוליות עד 100</div>
                      <div><strong>קשה:</strong> חיבור/חיסור עד 100, כפל עד 10×10, חילוק עד 100, שברים חצי/רבע, השוואה עד 1000, שאלות מילוליות עד 100</div>
                    </div>
                  </div>
                  <div className="bg-yellow-500/20 p-3 rounded text-sm">
                    <strong>הערות:</strong> אין מספרים שליליים. אין עשרוניים כנושא מלא, אין סימני התחלקות פורמליים ואין אלגברה פורמלית. שברים ברמת היכרות חצי/רבע/חלק מהשלם בלבד.
                  </div>
                </div>

                {/* כיתה ג' */}
                <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                  <h2 className="text-2xl font-bold mb-3">כיתה ג'</h2>
                  <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                  <ol className="list-decimal pr-6 space-y-1 mb-4">
                    <li>חיבור</li>
                    <li>חיסור</li>
                    <li>כפל - כולל כפל בעשרות שלמות ובמאות שלמות</li>
                    <li>חילוק - כולל חילוק עם שארית</li>
                    <li>שברים - היכרות עם שבר כחלק משלם</li>
                    <li>סדרות</li>
                    <li>עשרוניים - עשרוניים בסיסיים</li>
                    <li>סימני התחלקות - ב-2, 5, 10</li>
                    <li>סדר פעולות והשימוש בסוגריים</li>
                    <li>השוואה</li>
                    <li>תחושת מספר (כולל השלמת מספר / איזון פשוט — לא משוואות אלגבריות כנושא נפרד)</li>
                    <li>שאלות מילוליות</li>
                    <li>מעורב</li>
                  </ol>
                  <div className="bg-white/5 p-3 rounded mb-3">
                    <h4 className="font-semibold mb-2">רמות קושי:</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>קל:</strong> חיבור/חיסור עד 200, כפל עד 10 (כולל כפל בעשרות ומאות), חילוק עד 100 (עם שארית), שברים מכנה עד 4, סדרות התחלה עד 20, עשרוניים בסיס עד 50, סימני התחלקות ב-2,5,10, סדר פעולות עם סוגריים, השוואה עד 10000, שאלות מילוליות</div>
                      <div><strong>בינוני:</strong> חיבור/חיסור עד 500, כפל עד 12 (כולל כפל בעשרות ומאות), חילוק עד 144 (עם שארית), שברים מכנה עד 6, סדרות התחלה עד 50, עשרוניים בסיס עד 50, סימני התחלקות ב-2,5,10, סדר פעולות עם סוגריים, השוואה עד 10000, שאלות מילוליות</div>
                      <div><strong>קשה:</strong> חיבור/חיסור עד 1000, כפל עד 12 (כולל כפל בעשרות ומאות), חילוק עד 200 (עם שארית), שברים מכנה עד 6, סדרות התחלה עד 50, עשרוניים בסיס עד 50, סימני התחלקות ב-2,5,10, סדר פעולות עם סוגריים, השוואה עד 10000, שאלות מילוליות</div>
                    </div>
                  </div>
                  <div className="bg-yellow-500/20 p-3 rounded text-sm">
                    <strong>הערות:</strong> אין מספרים שליליים. עשרוניים בסיסיים מכיתה זו. סימני התחלקות פורמליים מכיתה זו. ללא משוואות אלגבריות כנושא נפרד — רק השלמת מספר / איזון פשוט במסגרת תחושת מספר וסדר פעולות. חילוק עם שארית.
                  </div>
                </div>

              {/* כיתה ד' */}
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h2 className="text-2xl font-bold mb-3">כיתה ד'</h2>
                <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                <ol className="list-decimal pr-6 space-y-1 mb-4">
                  <li>חיבור</li>
                  <li>חיסור</li>
                  <li>כפל - כולל כפל במאונך (גורם רב-ספרתי)</li>
                  <li>חילוק - כולל חילוק ארוך (מחלק חד-ספרתי או עשרת שלמה)</li>
                  <li>שברים - שברים פשוטים, משמעות והשוואה</li>
                  <li>עשרוניים</li>
                  <li>סדרות</li>
                  <li>עיגול</li>
                  <li>סימני התחלקות - ב-3, 6, 9</li>
                  <li>מספרים ראשוניים ופריקים</li>
                  <li>חזקות</li>
                  <li>אומדן ופיתוח תובנה מספרית</li>
                  <li>תכונות ה-0 וה-1</li>
                  <li>משוואות</li>
                  <li>השוואה</li>
                  <li>תחושת מספר</li>
                  <li>גורמים וכפולות</li>
                  <li>מעורב</li>
                </ol>
                <div className="bg-white/5 p-3 rounded mb-3">
                  <h4 className="font-semibold mb-2">רמות קושי:</h4>
                  <div className="text-sm space-y-2">
                    <div><strong>קל:</strong> חיבור/חיסור עד 1000, כפל עד 20×20 (כולל כפל במאונך), חילוק עד 200 (כולל חילוק ארוך), שברים מכנה עד 6, עיגול עד 999 לעשרות, סימני התחלקות ב-3,6,9, מספרים ראשוניים עד 100, חזקות בסיס עד 10^3, אומדן, תכונות 0 ו-1, גורמים/כפולות עד 100, השוואה עד מיליון</div>
                    <div><strong>בינוני:</strong> חיבור/חיסור עד 5000, כפל עד 30×30 (כולל כפל במאונך), חילוק עד 500 (כולל חילוק ארוך), שברים מכנה עד 8, עיגול עד 9999 למאות, סימני התחלקות ב-3,6,9, מספרים ראשוניים עד 200, חזקות בסיס עד 10^4, אומדן, תכונות 0 ו-1, גורמים/כפולות עד 200, השוואה עד מיליון</div>
                    <div><strong>קשה:</strong> חיבור/חיסור עד 10000, כפל עד 50×50 (כולל כפל במאונך), חילוק עד 1000 (כולל חילוק ארוך), שברים מכנה עד 8, עיגול עד 9999 למאות, סימני התחלקות ב-3,6,9, מספרים ראשוניים עד 500, חזקות בסיס עד 10^5, אומדן, תכונות 0 ו-1, גורמים/כפולות עד 500, השוואה עד מיליון</div>
                  </div>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded text-sm">
                  <strong>הערות:</strong> אין מספרים שליליים. מתחילים עיגול, גורמים/כפולות, סימני התחלקות ב-3,6,9, מספרים ראשוניים ופריקים, חזקות, כפל במאונך, חילוק ארוך, אומדן, תכונות ה-0 וה-1.
                </div>
              </div>

              {/* כיתה ה' */}
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h2 className="text-2xl font-bold mb-3">כיתה ה'</h2>
                <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                <ol className="list-decimal pr-6 space-y-1 mb-4">
                  <li>חיבור</li>
                  <li>חיסור</li>
                  <li>כפל</li>
                  <li>חילוק - כולל חילוק במספר דו-ספרתי</li>
                  <li>שברים - כולל צמצום, הרחבה, חיבור וחיסור, מספרים מעורבים</li>
                  <li>אחוזים</li>
                  <li>סדרות</li>
                  <li>עשרוניים</li>
                  <li>עיגול</li>
                  <li>אומדן תוצאות של פעולות</li>
                  <li>משוואות</li>
                  <li>השוואה</li>
                  <li>תחושת מספר</li>
                  <li>גורמים וכפולות</li>
                  <li>בעיות מילוליות - כולל ממוצע</li>
                  <li>מעורב</li>
                </ol>
                <div className="bg-white/5 p-3 rounded mb-3">
                  <h4 className="font-semibold mb-2">רמות קושי:</h4>
                  <div className="text-sm space-y-2">
                    <div><strong>קל:</strong> חיבור/חיסור עד 10000, כפל עד 50×50, שברים (כולל מספרים מעורבים), אחוזים בסיס עד 400, אומדן, בעיות מילוליות עד 10000</div>
                    <div><strong>בינוני:</strong> חיבור/חיסור עד 50000, כפל עד 100×100, שברים (כולל מספרים מעורבים), אחוזים בסיס עד 1000, אומדן, בעיות מילוליות עד 50000</div>
                    <div><strong>קשה:</strong> חיבור/חיסור עד 100000, כפל עד 200×200, שברים (כולל מספרים מעורבים), אחוזים בסיס עד 2000, אומדן, בעיות מילוליות עד 100000, מספרים שליליים</div>
                  </div>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded text-sm">
                  <strong>הערות:</strong> מתחילים מספרים שליליים (ברמה קשה), אחוזים, בעיות מילוליות, צמצום והרחבה של שברים, חיבור וחיסור שברים. תרגילים דו-שלביים (ברמה בינונית/קשה).
                </div>
              </div>

              {/* כיתה ו' */}
              <div className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
                <h2 className="text-2xl font-bold mb-3">כיתה ו'</h2>
                <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                <ol className="list-decimal pr-6 space-y-1 mb-4">
                  <li>חיבור</li>
                  <li>חיסור</li>
                  <li>כפל</li>
                  <li>חילוק</li>
                  <li>שברים - כולל כפל וחילוק שברים, שבר כמנת חילוק</li>
                  <li>אחוזים</li>
                  <li>יחס</li>
                  <li>סדרות</li>
                  <li>עשרוניים - כולל כפל וחילוק ב-10/100, שבר עשרוני מחזורי</li>
                  <li>עיגול</li>
                  <li>קנה מידה - במפות ובמודלים</li>
                  <li>משוואות</li>
                  <li>השוואה</li>
                  <li>תחושת מספר</li>
                  <li>גורמים וכפולות</li>
                  <li>בעיות מילוליות</li>
                  <li>מעורב</li>
                </ol>
                <div className="bg-white/5 p-3 rounded mb-3">
                  <h4 className="font-semibold mb-2">רמות קושי:</h4>
                  <div className="text-sm space-y-2">
                    <div><strong>קל:</strong> חיבור/חיסור עד 50000, כפל עד 100×100, חילוק במספר דו-ספרתי, שברים (כולל כפל/חילוק, שבר כמנת חילוק), אחוזים בסיס עד 1000, עשרוניים (כולל כפל/חילוק ב-10/100), קנה מידה, בעיות מילוליות עד 50000</div>
                    <div><strong>בינוני:</strong> חיבור/חיסור עד 100000, כפל עד 200×200, חילוק במספר דו-ספרתי, שברים (כולל כפל/חילוק, שבר כמנת חילוק), אחוזים בסיס עד 2000, עשרוניים (כולל כפל/חילוק ב-10/100, שבר מחזורי), קנה מידה, בעיות מילוליות עד 100000</div>
                    <div><strong>קשה:</strong> חיבור/חיסור עד 200000, כפל עד 500×500, חילוק במספר דו-ספרתי, שברים (כולל כפל/חילוק, שבר כמנת חילוק), אחוזים בסיס עד 5000, עשרוניים (כולל כפל/חילוק ב-10/100, שבר מחזורי), קנה מידה, בעיות מילוליות עד 200000, מספרים שליליים</div>
                  </div>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded text-sm">
                  <strong>הערות:</strong> מספרים שליליים (ברמה קשה). כפל וחילוק שברים, שבר כמנת חילוק, יחס, כפל וחילוק עשרוניים ב-10/100, שבר עשרוני מחזורי, קנה מידה. תרגילים דו-שלביים ומורכבים.
                </div>
              </div>

              {/* סיכום */}
              <div className="bg-emerald-500/20 border-r-4 border-emerald-500 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-center">סיכום כללי</h3>
                <p className="text-center">
                  המערכת מותאמת לפי כיתה, נושא ורמת קושי: <strong>6 כיתות</strong>, <strong>3 רמות קושי</strong> לכל כיתה, והנושאים כפי שמופיעים למעלה ובדף החשבון. בהתאם לנושאים המקובלים בלימודי המקצוע בבתי הספר היסודיים.
                </p>
              </div>
            </div>
            </div>
          )}
        </div>
      </main>
      </StudentImmersiveAdPage>
    </Layout>
  );
}

