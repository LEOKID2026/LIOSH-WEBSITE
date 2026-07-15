import Layout from "../../components/Layout";
import StudentImmersiveAdPage from "../../components/student/StudentImmersiveAdPage.jsx";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  GRADES,
  TOPICS,
  LEVELS,
  TOPIC_SHAPES,
  topicDescriptionForCurriculumPage,
} from "../../utils/geometry-constants";

const GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];

const HEB_GRADE = {
  g1: "א׳",
  g2: "ב׳",
  g3: "ג׳",
  g4: "ד׳",
  g5: "ה׳",
  g6: "ו׳",
};


export default function GeometryCurriculum() {
  useIOSViewportFix();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const getTopicName = (topicKey) => {
    return TOPICS[topicKey]?.name || "נושא";
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
    <Layout>
      <StudentImmersiveAdPage>
      <main className="min-h-screen bg-gradient-to-b from-[#120b1f] to-[#1b1430] text-white px-4 py-10" dir="rtl">
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
              תוכנית הלימודים באתר - גאומטריה
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto" dir="rtl">
              מותאם לפי כיתה, נושא ורמת תרגול (רגיל / מתקדם) - כפי שמוצגים בדף הגאומטריה. בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
            </p>
          </header>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-6" dir="rtl">
            <div className="prose prose-invert max-w-none">
              <div className="bg-emerald-500/20 border-r-4 border-emerald-500 p-4 rounded-lg mb-6">
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
                <p className="text-sm text-white/75 mt-3">
                  בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
                </p>
              </div>

              {GRADE_KEYS.map((gradeKey) => {
                const topics = GRADES[gradeKey]?.topics || [];
                return (
                  <div
                    key={gradeKey}
                    className="bg-blue-500/20 border-r-4 border-blue-500 p-4 rounded-lg mb-6"
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
                            <span className="text-white/85"> - {desc}</span>
                          ) : null}
                        </li>
                      );
                      })}
                    </ol>
                    <div className="bg-white/5 p-3 rounded mb-3">
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

              <div className="bg-emerald-500/20 border-r-4 border-emerald-500 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-center">סיכום כללי</h3>
                <p className="text-center mb-3">
                  במערכת מוצגים <strong>{topicCountLabel} נושאי גאומטריה</strong> (בנוסף למצב ערבוב היכן שקיים), ב 
                  <strong> שש כיתות</strong> וב<strong>שתי רמות תרגול - רגיל ומתקדם</strong>.
                </p>
                <p className="text-center text-sm text-white/80">
                  בהתאם לנושאים המקובלים הנלמדים בבתי הספר היסודיים.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      </StudentImmersiveAdPage>
    </Layout>
  );
}
