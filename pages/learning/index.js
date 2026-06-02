import { useEffect } from "react";
import Layout from "../../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";

const LEARNING_GAMES = [
  {
    slug: "math-master",
    title: "חשבון",
    emoji: "🧮",
    grades: "כיתות א׳–ו׳",
    blurb: "תרגול חיבור, חיסור, כפל, חילוק ועוד לפי כיתה.",
  },
  {
    slug: "geometry-master",
    title: "גאומטריה",
    emoji: "📐",
    grades: "כיתות א׳–ו׳",
    blurb: "שטחים, היקפים, נפח, זוויות, פיתגורס וצורות — עם הסברים.",
  },
  {
    slug: "english-master",
    title: "אנגלית",
    emoji: "🇬🇧",
    grades: "כיתות א׳–ו׳",
    blurb: "אוצר מילים, דקדוק, תרגום ובניית משפטים עם תמיכה בעברית.",
  },
  {
    slug: "science-master",
    title: "מדעים",
    emoji: "🔬",
    grades: "כיתות א׳–ו׳",
    blurb: "גוף, בעלי חיים, צמחים, חלל, חומר, מזג אוויר, כוחות ועוד — עם הסברים.",
  },
  {
    slug: "hebrew-master",
    title: "עברית",
    emoji: "📚",
    grades: "כיתות א׳–ו׳",
    blurb: "תרגול שפה, אוצר מילים, דקדוק, הבנת הנקרא ועוד לפי כיתה.",
  },
  {
    slug: "moledet-geography-master",
    title: "מולדת וגיאוגרפיה",
    emoji: "🗺️",
    grades: "כיתות א׳–ו׳",
    blurb: "מולדת, חברה, אזרחות וגיאוגרפיה בתרגילים אינטראקטיביים.",
  },
];

export async function getServerSideProps() {
  return {
    props: {
      showDevStudentSimulator:
        String(process.env.ENABLE_DEV_STUDENT_SIMULATOR || "").trim().toLowerCase() === "true",
    },
  };
}

export default function LearningHub({ showDevStudentSimulator }) {
  useIOSViewportFix();

  useEffect(() => {
    if (!isStudentIdentityDiagnosticsEnabled()) return undefined;
    console.log("[learning/index] localStorage on mount", {
      liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
      mleo_player_name: localStorage.getItem("mleo_player_name"),
    });
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => {
        console.log("[learning/index] GET /api/student/me", {
          ok: payload?.ok === true,
          id: payload.student?.id,
          fullName: payload.student?.full_name,
          gradeLevel: payload.student?.grade_level,
          debug: payload.debugStudentIdentity,
        });
        console.log("[learning/index] localStorage after /me response", {
          liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
          mleo_player_name: localStorage.getItem("mleo_player_name"),
        });
      })
      .catch((err) => {
        console.log("[learning/index] GET /api/student/me failed", String(err?.message || err));
      });
    return undefined;
  }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 md:py-6 pb-4 overflow-x-hidden" dir="rtl">
        <div className="mb-3 md:mb-4">
          <Link
            href="/student/home"
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition"
          >
            חזרה לפורטל תלמיד
          </Link>
        </div>

        <header className="text-center space-y-1.5 md:space-y-2 mb-3 md:mb-5">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs tracking-wider uppercase text-amber-300 font-semibold">
            📚 תרגול · חזרה · שיפור
          </p>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-black leading-tight">מרכז משחקי הלימוד</h1>
          <p className="text-xs md:text-sm text-white/70 max-w-2xl mx-auto leading-relaxed line-clamp-2 md:line-clamp-none">
            בחרו מקצוע והתחילו לשחק — לכל משחק התאמה לכיתות שונות, ציונים, רמות והסברים לשאלות.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4" aria-label="בחירת מקצוע">
          {LEARNING_GAMES.map((g) => (
            <Link
              key={g.slug}
              href={`/learning/${g.slug}`}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:border-emerald-400/35 hover:from-emerald-950/25 hover:to-white/[0.05] transition p-3 md:p-4 flex flex-col text-right min-h-[7.5rem] md:min-h-[8.5rem]"
            >
              <span className="text-2xl md:text-3xl leading-none mb-2" aria-hidden>
                {g.emoji}
              </span>
              <h2 className="font-bold text-sm md:text-base leading-snug text-white">{g.title}</h2>
              <p className="text-[11px] md:text-xs text-white/55 mt-0.5">{g.grades}</p>
              <p className="text-[11px] md:text-xs text-white/60 mt-1.5 leading-snug line-clamp-2 flex-1">
                {g.blurb}
              </p>
            </Link>
          ))}
        </section>

        {/* Dev simulator — kept for development; hidden from visible UI for now */}
        {false && showDevStudentSimulator ? (
          <section className="mt-4">
            <Link
              href="/learning/dev-student-simulator"
              className="block rounded-2xl border border-indigo-300/40 bg-indigo-500/10 hover:bg-indigo-500/20 transition p-4 text-center"
            >
              <h2 className="font-bold text-lg">סימולטור תלמידים (פיתוח)</h2>
              <p className="text-sm text-white/70">סימולטור תלמידים לפיתוח</p>
            </Link>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
