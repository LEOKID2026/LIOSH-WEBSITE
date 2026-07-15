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
  MOLEDET_GENERAL_GOALS,
  MOLEDET_GRADES,
  MOLEDET_TEACHABLE_GRADE_ORDER,
} from "../../data/moledet-curriculum";
import {
  GEOGRAPHY_SUBJECT_GENERAL_GOALS,
  GEOGRAPHY_SUBJECT_GRADES,
  GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER,
} from "../../data/geography-subject-curriculum";
import {
  HISTORY_GENERAL_GOALS,
  HISTORY_GRADES,
  HISTORY_GRADE_ORDER,
  HISTORY_TOPIC_LABEL_HE,
  HISTORY_TOPIC_ORDER,
  HISTORY_TOPIC_SUBTOPICS,
  historySubtopicLabelHe,
} from "../../data/history-curriculum";
import {
  TOPICS,
  TOPIC_SHAPES,
  topicDescriptionForCurriculumPage,
  GRADES,
} from "../../utils/geometry-constants";
import { TOPICS as MOLEDET_GEO_TOPICS } from "../../utils/moledet-geography-constants";

const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

const HEB_GRADE = {
  g1: "א׳",
  g2: "ב׳",
  g3: "ג׳",
  g4: "ד׳",
  g5: "ה׳",
  g6: "ו׳",
};


export const PARENT_CURRICULUM_SUBJECTS = [
  { key: "math", title: "מתמטיקה" },
  { key: "geometry", title: "גאומטריה" },
  { key: "hebrew", title: "עברית" },
  { key: "english", title: "אנגלית" },
  { key: "science", title: "מדעים" },
  { key: "history", title: "היסטוריה" },
  { key: "moledet", title: "מולדת" },
  { key: "geography", title: "גאוגרפיה" },
];

const subjectTitles = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  history: "היסטוריה",
  moledet: "מולדת, חברה ואזרחות",
  geography: "גאוגרפיה",
};

const subjectDescriptions = {
  math:
    "מותאם לפי כיתה, נושא ורמת תרגול (רגיל / מתקדם) - כפי שמוצגים בדף החשבון. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  english:
    "מותאם לפי כיתה, נושא ורמת תרגול (רגיל / מתקדם) - כפי שמוצגים בדף האנגלית. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  science:
    "מותאם לפי כיתה, נושא ורמת תרגול (רגיל בלבד) - כפי שמוצגים בדף המדעים. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  geometry:
    "מותאם לפי כיתה, נושא ורמת תרגול (רגיל / מתקדם) - כפי שמוצגים בדף הגאומטריה. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  hebrew:
    "מותאם לפי כיתה, נושא ורמת תרגול (רגיל / מתקדם) - כפי שמוצגים בדף השפה העברית. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.",
  history:
    "מותאם לכיתה ו׳ - כפי שמוצג בדף ההיסטוריה. נושאי העולם היווני-רומי והיהודים.",
  moledet:
    "מותאם לכיתות ב׳–ד׳ - כפי שמוצג בדף המולדת. נושאי תרגול: מולדת, קהילה, אזרחות, ערכים וערבוב.",
  geography:
    "מותאם לכיתות ה׳–ו׳ - כפי שמוצג בדף הגאוגרפיה. נושאי תרגול: גאוגרפיה, מפות וערבוב.",
};

function GeometryCurriculumBody() {
  const getTopicName = (topicKey) => {
    return TOPICS[topicKey]?.name || topicKey;
  };

  const shapeNames = {
    square: "ריבוע",
    rectangle: "מלבן",
    triangle: "משולש",
    quadrilateral: "מרובע",
    circle: "עיגול",
    parallelogram: "מקבילית",
    trapezoid: "טרפז",
    rectangular_prism: "תיבה",
    cube: "קובייה",
    cylinder: "גליל",
    sphere: "כדור",
    cone: "חרוט",
    pyramid: "פירמידה",
    prism: "מנסרה",
  };

  const getShapesForGradeTopic = (gradeKey, topicKey) => {
    const shapes = TOPIC_SHAPES[topicKey]?.[gradeKey] || [];
    return shapes.map((s) => shapeNames[s] || s).join(", ");
  };

  const topicKeysForProduct = Object.keys(TOPICS).filter((k) => k !== "mixed");
  const topicCountLabel = String(topicKeysForProduct.length);

  return (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
            <div className="max-w-none text-slate-800">
              <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מבנה כללי</h3>
                <ul className="list-disc pr-6 space-y-2">
                  <li>
                    <strong>6 כיתות</strong>: א׳, ב׳, ג׳, ד׳, ה׳, ו׳
                  </li>
                  <li>
                    <strong>שתי רמות תרגול - רגיל ומתקדם</strong> לכל כיתה
                  </li>
                  <li>
                    <strong>{topicCountLabel} נושאי גאומטריה</strong> (לא כולל &quot;ערבוב&quot; כנושא נפרד בספירה זו)
                  </li>
                </ul>
                <p className="text-sm text-slate-600 mt-3">
                  בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
                </p>
              </div>

              {GRADE_KEYS.map((gradeKey) => {
                const topics = GRADES[gradeKey]?.topics || [];
                return (
                  <div
                    key={gradeKey}
                    className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6"
                  >
                    <h2 className="text-2xl font-bold mb-3">כיתה {HEB_GRADE[gradeKey]}</h2>
                    <h3 className="text-lg font-semibold mb-2">נושאים לכיתה זו:</h3>
                    <ol className="list-decimal pr-6 space-y-1 mb-4">
                      {topics.map((tk) => {
                        const desc = topicDescriptionForCurriculumPage(gradeKey, tk);
                        return (
                        <li key={tk}>
                          <span className="font-semibold">{getTopicName(tk)}</span>
                          {desc ? (
                            <span className="text-slate-700"> - {desc}</span>
                          ) : null}
                        </li>
                      );
                      })}
                    </ol>
                    <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                      <h4 className="font-semibold mb-2">צורות ודוגמאות לפי נושא:</h4>
                      <div className="text-sm space-y-1">
                        {topics.map((tk) => {
                          const shapesLine = getShapesForGradeTopic(gradeKey, tk);
                          if (!shapesLine) return null;
                          return (
                            <div key={`${gradeKey}-${tk}`}>
                              <strong>{getTopicName(tk)}:</strong> {shapesLine}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-center">סיכום כללי</h3>
                <p className="text-center mb-3">
                  במערכת מוצגים <strong>{topicCountLabel} נושאי גאומטריה</strong> (בנוסף למצב ערבוב היכן שקיים), ב 
                  <strong> שש כיתות</strong> וב<strong>שתי רמות תרגול - רגיל ומתקדם</strong>.
                </p>
                <p className="text-center text-sm text-slate-700">
                  בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
                </p>
              </div>
            </div>
          </div>
  );
}

/**
 * Full site curriculum browse content for the parent portal.
 * Data-driven subjects import the same catalogs as /learning/curriculum;
 * math body is copied from that page; geometry body mirrors geometry-curriculum.js.
 * Cross-subject links call onSelectSubject instead of student-protected routes.
 */
export default function ParentCurriculumContent({ subject, onSelectSubject }) {
  const englishGrades = ENGLISH_GRADE_ORDER.map((key) => ENGLISH_GRADES[key]);
  const scienceGrades = SCIENCE_GRADE_ORDER.map((key) => SCIENCE_GRADES[key]);
  const hebrewGrades = HEBREW_GRADE_ORDER.map((key) => HEBREW_GRADES[key]);
  const historyGrades = HISTORY_GRADE_ORDER.map((key) => HISTORY_GRADES[key]);
  const moledetGrades = MOLEDET_TEACHABLE_GRADE_ORDER.map((key) => MOLEDET_GRADES[key]);
  const geographySubjectGrades = GEOGRAPHY_SUBJECT_TEACHABLE_GRADE_ORDER.map(
    (key) => GEOGRAPHY_SUBJECT_GRADES[key]
  );

  const subjectTitle = subjectTitles[subject] || subjectTitles.math;
  const subjectDescription = subjectDescriptions[subject] || subjectDescriptions.math;

  const isEnglish = subject === "english";
  const isScience = subject === "science";
  const isHebrew = subject === "hebrew";
  const isHistory = subject === "history";
  const isMoledet = subject === "moledet";
  const isGeographySubject = subject === "geography";
  const isGeometry = subject === "geometry";

  return (
    <div className="space-y-4" dir="rtl">
      <header className="text-center space-y-2">
        <h3 className="text-xl md:text-2xl font-black text-sky-800">
          תוכנית הלימודים באתר - {subjectTitle}
        </h3>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          {subjectDescription}
        </p>
      </header>

      {isEnglish ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                  className="bg-sky-50 border border-sky-200 border-r-4 border-r-sky-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות עיקריות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">דקדוק ומבנים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.grammar?.map((item, idx) => (
                          <li key={`grammar-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">נושאי אוצר מילים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.vocabulary?.map((item, idx) => (
                          <li key={`vocab-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-semibold mb-1 text-slate-900">יעדי סף</h4>
                    <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                      {grade.curriculum?.benchmark?.map((item, idx) => (
                        <li key={`benchmark-${grade.key}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
      ) : isHebrew ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                  className="bg-sky-50 border border-sky-200 border-r-4 border-r-sky-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">דקדוק</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.grammar?.map((item, idx) => (
                          <li key={`grammar-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">אוצר מילים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.vocabulary?.map((item, idx) => (
                          <li key={`vocab-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      ) : isMoledet ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {MOLEDET_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
                <p className="text-sm text-slate-600 mt-3">
                  גאוגרפיה (כיתות ה׳–ו׳) מוצגת בנפרד -{" "}
                  <button
                    type="button"
                    onClick={() => onSelectSubject("geography")}
                    className="text-sky-700 underline hover:text-sky-900 font-semibold"
                  >
                    תוכנית לימודים בגאוגרפיה
                  </button>
                </p>
              </div>
              <div className="bg-white border border-sky-100 p-4 rounded-lg mb-6 text-sm text-slate-700 shadow-sm">
                <strong>נושאים זמינים בדף המולדת:</strong>{" "}
                {["homeland", "community", "citizenship", "values", "mixed"]
                  .map((k) => MOLEDET_GEO_TOPICS[k]?.name || k)
                  .join(" · ")}
              </div>
              {moledetGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-sky-50 border border-sky-200 border-r-4 border-r-sky-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מולדת</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.homeland?.map((item, idx) => (
                          <li key={`homeland-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">קהילה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.community?.map((item, idx) => (
                          <li key={`community-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">אזרחות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.citizenship?.map((item, idx) => (
                          <li key={`cit-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">ערכים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.values?.map((item, idx) => (
                          <li key={`values-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      ) : isGeographySubject ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {GEOGRAPHY_SUBJECT_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`geo-goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
                <p className="text-sm text-slate-600 mt-3">
                  מולדת (כיתות ב׳–ד׳) מוצגת בנפרד -{" "}
                  <button
                    type="button"
                    onClick={() => onSelectSubject("moledet")}
                    className="text-sky-700 underline hover:text-sky-900 font-semibold"
                  >
                    תוכנית לימודים במולדת
                  </button>
                </p>
              </div>
              <div className="bg-white border border-sky-100 p-4 rounded-lg mb-6 text-sm text-slate-700 shadow-sm">
                <strong>נושאים זמינים בדף הגאוגרפיה:</strong>{" "}
                {["geography", "maps", "mixed"]
                  .map((k) => MOLEDET_GEO_TOPICS[k]?.name || k)
                  .join(" · ")}
              </div>
              {geographySubjectGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`geo-focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`geo-skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">גאוגרפיה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.geography?.map((item, idx) => (
                          <li key={`geo-geo-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מפות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.maps?.map((item, idx) => (
                          <li key={`geo-maps-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">סביבה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.environment?.map((item, idx) => (
                          <li key={`geo-env-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      ) : isHistory ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
                <h3 className="text-xl font-bold mb-2">מטרות כלליות</h3>
                <ul className="list-disc pr-6 space-y-2">
                  {HISTORY_GENERAL_GOALS.map((goal, idx) => (
                    <li key={`hist-goal-${idx}`}>{goal}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-sky-100 p-4 rounded-lg mb-6 text-sm text-slate-700 shadow-sm space-y-2">
                <p>
                  <strong>מבנה ההיסטוריה באתר:</strong> תוכן לימודי לכיתה ו׳ בלבד -{" "}
                  <strong>2 רמות תרגול</strong> (רגיל, מתקדם) ונושאי תרגול כפי שמופיעים
                  בדף ההיסטוריה.
                </p>
                <p>
                  <strong>נושאים זמינים:</strong>{" "}
                  {HISTORY_TOPIC_ORDER.filter((k) => k !== "mixed")
                    .map((k) => HISTORY_TOPIC_LABEL_HE[k] || k)
                    .join(" · ")}{" "}
                  · תערובת
                </p>
              </div>
              {historyGrades.map((grade) => (
                <div
                  key={grade.key}
                  className="bg-sky-50 border border-sky-200 border-r-4 border-r-sky-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מוקדי למידה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`hist-focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות היסטוריות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`hist-skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-3">נושאים ותת-נושאים בדף ההיסטוריה</h3>
                  <div className="space-y-4">
                    {HISTORY_TOPIC_ORDER.filter((topicKey) => topicKey !== "mixed").map(
                      (topicKey) => (
                        <div
                          key={topicKey}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                        >
                          <h4 className="font-semibold text-slate-900 mb-2">
                            {HISTORY_TOPIC_LABEL_HE[topicKey] || topicKey}
                          </h4>
                          <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                            {(HISTORY_TOPIC_SUBTOPICS[topicKey] || []).map((subKey) => (
                              <li key={subKey}>{historySubtopicLabelHe(subKey)}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {HISTORY_TOPIC_LABEL_HE.mixed}
                      </h4>
                      <p className="text-sm text-slate-600">
                        תרגול מעורב מכל הנושאים והתת-נושאים של כיתה ו׳
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      ) : isScience ? (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg mb-6">
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
                  className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-500 shadow-sm p-4 rounded-lg mb-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{grade.name}</h2>
                    <span className="text-sm text-slate-600">{grade.stage}</span>
                  </div>
                  {grade.curriculum?.summary && (
                    <p className="text-sm text-slate-700 mb-3" dir="rtl">
                      {grade.curriculum.summary}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">נושאים מרכזיים</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.focus?.map((item, idx) => (
                          <li key={`science-focus-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">מיומנויות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.skills?.map((item, idx) => (
                          <li key={`science-skills-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">חקר והתנסות</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
                        {grade.curriculum?.inquiry?.map((item, idx) => (
                          <li key={`science-inquiry-${grade.key}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1 text-slate-900">קישור לטכנולוגיה</h4>
                      <ul className="list-disc pr-5 space-y-1 text-sm text-slate-700">
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
        <GeometryCurriculumBody />
      ) : (
<div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:p-6" dir="rtl">
              <div className="max-w-none text-slate-800">
                <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">מבנה כללי</h3>
                  <ul className="list-disc pr-6 space-y-2">
                    <li><strong>6 כיתות</strong>: א', ב', ג', ד', ה', ו'</li>
                    <li><strong>2 רמות תרגול</strong> לכל כיתה: רגיל, מתקדם</li>
                    <li><strong>נושאים לפי כיתה</strong> - כפי שמוצגים בדף החשבון</li>
                  </ul>
                </div>

                {/* כיתה א' */}
                <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
                  <h2 className="text-2xl font-bold mb-3">כיתה א'</h2>
                  <h3 className="text-lg font-semibold mb-2">נושאים זמינים:</h3>
                  <ol className="list-decimal pr-6 space-y-1 mb-4">
                    <li>חיבור - כולל חיבור בעשרות שלמות ובעשרת השנייה</li>
                    <li>חיסור - כולל חיסור בעשרות שלמות ובעשרת השנייה</li>
                    <li>כפל - עד 20</li>
                    <li>השוואה</li>
                    <li>תחושת מספר - שכנים, זוגי/אי-זוגי, השלמה ל-10, עשרות/אחדות, ישר המספרים, מנייה וספירה (כולל השלמת מספר / איזון פשוט בלבד - לא אלגברה פורמלית)</li>
                    <li>שאלות מילוליות - שאלות חיבור וחיסור (כסף, זמן, כמויות)</li>
                    <li>מעורב - תרגילים מעורבים מתוך הנושאים למעלה</li>
                  </ol>
                  <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                    <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור מ-10 עד 20 (כולל חיבור בעשרות שלמות ובעשרת השנייה), חיסור מ-10 עד 20, כפל עד 5×5, השוואה מ-10 עד 20, תחושת מספר מ-10 עד 20 (ישר המספרים, מנייה וספירה), שאלות מילוליות עד 20, מעורב</div>
                      <div><strong>מתקדם:</strong> חיבור עד 30, חיסור עד 30, כפל עד 5×5, השוואה עד 30, תחושת מספר עד 30, שאלות מילוליות עד 30, מעורב</div>
                    </div>
                  </div>
                </div>

                {/* כיתה ב' */}
                <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                  <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                    <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור/חיסור מ-50 עד 100, כפל מ-5×5 עד 10×10, חילוק מ-50 עד 100, שברים חצי/רבע, השוואה עד 1000, שאלות מילוליות עד 100</div>
                      <div><strong>מתקדם:</strong> חיבור/חיסור עד 100, כפל עד 10×10, חילוק עד 100, שברים חצי/רבע, השוואה עד 1000, שאלות מילוליות עד 100</div>
                    </div>
                  </div>
                </div>

                {/* כיתה ג' */}
                <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                    <li>תחושת מספר (כולל השלמת מספר / איזון פשוט - לא משוואות אלגבריות כנושא נפרד)</li>
                    <li>שאלות מילוליות</li>
                    <li>מעורב</li>
                  </ol>
                  <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                    <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                    <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור/חיסור מ-200 עד 500, כפל מ-10 עד 12 (כולל כפל בעשרות ומאות), חילוק מ-100 עד 144 (עם שארית), שברים מכנה מ-4 עד 6, סדרות התחלה מ-20 עד 50, עשרוניים בסיס עד 50, סימני התחלקות ב-2,5,10, סדר פעולות עם סוגריים, השוואה עד 10000, שאלות מילוליות</div>
                      <div><strong>מתקדם:</strong> חיבור/חיסור עד 1000, כפל עד 12 (כולל כפל בעשרות ומאות), חילוק עד 200 (עם שארית), שברים מכנה עד 6, סדרות התחלה עד 50, עשרוניים בסיס עד 50, סימני התחלקות ב-2,5,10, סדר פעולות עם סוגריים, השוואה עד 10000, שאלות מילוליות</div>
                    </div>
                  </div>
                </div>

              {/* כיתה ד' */}
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                  <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                  <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור/חיסור מ-1000 עד 5000, כפל מ-20×20 עד 30×30 (כולל כפל במאונך), חילוק מ-200 עד 500 (כולל חילוק ארוך), שברים מכנה מ-6 עד 8, עיגול מ-999 לעשרות ועד 9999 למאות, סימני התחלקות ב-3,6,9, מספרים ראשוניים מ-100 עד 200, חזקות בסיס עד 10^3, אומדן, תכונות 0 ו-1, גורמים/כפולות מ-100 עד 200, השוואה עד מיליון</div>
                      <div><strong>מתקדם:</strong> חיבור/חיסור עד 10000, כפל עד 25×25 (כולל כפל במאונך), חילוק עד 1000 (כולל חילוק ארוך), שברים מכנה עד 8, עיגול עד 9999 למאות, סימני התחלקות ב-3,6,9, מספרים ראשוניים עד 500, חזקות בסיס עד 10^3, אומדן, תכונות 0 ו-1, גורמים/כפולות עד 500, השוואה עד מיליון</div>
                    </div>
                </div>
              </div>

              {/* כיתה ה' */}
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                  <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                  <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור/חיסור מ-10000 עד 50000, כפל מ-30×30 עד 50×50, שברים (כולל מספרים מעורבים), אחוזים בסיס מ-400 עד 1000, אומדן, בעיות מילוליות מ-10000 עד 50000</div>
                      <div><strong>מתקדם:</strong> חיבור/חיסור עד 100000, כפל עד 99×99, שברים (כולל מספרים מעורבים), אחוזים בסיס עד 2000, אומדן, בעיות מילוליות עד 100000, מספרים שליליים</div>
                    </div>
                </div>
              </div>

              {/* כיתה ו' */}
              <div className="bg-sky-100/70 border border-sky-200 border-r-4 border-r-sky-600 shadow-sm p-4 rounded-lg mb-6">
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
                <div className="bg-white/80 border border-slate-200 p-3 rounded-lg mb-3 shadow-sm">
                  <h4 className="font-semibold mb-2">רמות תרגול (רגיל / מתקדם):</h4>
                  <div className="text-sm space-y-2">
                      <div><strong>רגיל:</strong> חיבור/חיסור מ-50000 עד 100000, כפל מ-100×100 עד 200×200, חילוק במספר דו-ספרתי, שברים (כולל כפל/חילוק, שבר כמנת חילוק), אחוזים בסיס מ-1000 עד 2000, עשרוניים (כולל כפל/חילוק ב-10/100, שבר מחזורי), קנה מידה, בעיות מילוליות מ-50000 עד 100000</div>
                      <div><strong>מתקדם:</strong> חיבור/חיסור עד 200000, כפל עד 500×500, חילוק במספר דו-ספרתי, שברים (כולל כפל/חילוק, שבר כמנת חילוק), אחוזים בסיס עד 5000, עשרוניים (כולל כפל/חילוק ב-10/100, שבר מחזורי), קנה מידה, בעיות מילוליות עד 200000, מספרים שליליים</div>
                    </div>
                </div>
              </div>

              {/* סיכום */}
              <div className="bg-teal-50 border border-teal-200 border-r-4 border-r-teal-600 shadow-sm p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-center">סיכום כללי</h3>
                <p className="text-center">
                  המערכת מותאמת לפי כיתה, נושא ורמת תרגול: <strong>6 כיתות</strong>, <strong>רגיל / מתקדם</strong>, והנושאים כפי שמופיעים למעלה ובדף החשבון. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
                </p>
              </div>
            </div>
            </div>
      )}
    </div>
  );
}
