import { useEffect } from "react";
import Layout from "../../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

const LEARNING_GAMES = [
  {
    slug: "math-master",
    title: "מתמטיקה",
    emoji: "🧮",
    blurb: "תרגול חיבור, חיסור, כפל, חילוק ועוד.",
  },
  {
    slug: "geometry-master",
    title: "גאומטריה",
    emoji: "📐",
    blurb: "שטחים, היקפים, נפח, זוויות, פיתגורס וצורות ועוד.",
  },
  {
    slug: "english-master",
    title: "אנגלית",
    emoji: "🇬🇧",
    blurb: "אוצר מילים, דקדוק, תרגום ובניית משפטים ועוד.",
  },
  {
    slug: "science-master",
    title: "מדעים",
    emoji: "🔬",
    blurb: "גוף, בעלי חיים, צמחים, חלל, חומר, מזג אוויר, כוחות ועוד.",
  },
  {
    slug: "hebrew-master",
    title: "עברית",
    emoji: "📚",
    blurb: "תרגול שפה, אוצר מילים, דקדוק, הבנת הנקרא ועוד.",
  },
  {
    slug: "moledet-master",
    title: "מולדת",
    emoji: "🏠",
    blurb: "מולדת, חברה, אזרחות וערכים.",
  },
  {
    slug: "geography-master",
    title: "גאוגרפיה",
    emoji: "🗺️",
    blurb: "גאוגרפיה, מפות, נוף ויישובים.",
  },
  {
    slug: "history-master",
    title: "היסטוריה",
    emoji: "📜",
    blurb: "יוון, הלניזם, החשמונאים, רומא והיהודים.",
  },
];

const DEFAULT_SUBJECT_CARD = {
  card: "border-slate-100 hover:border-sky-100 bg-white",
  bar: "bg-sky-300",
  emoji: "bg-slate-50 border-slate-100",
};

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
  const { tokens: T, theme, subjectHubCard } = useStudentTheme();

  useEffect(() => {
    if (!isStudentIdentityDiagnosticsEnabled()) return undefined;
    console.log("[learning/index] localStorage on mount", {
      liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
      mleo_player_name: localStorage.getItem("mleo_player_name"),
    });
    fetch("/api/student/me", { credentials: "include", cache: "no-store" })
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
    <Layout studentTheme={theme} studentShell="learning">
      <div className={`max-w-5xl mx-auto px-3 sm:px-4 py-3 md:py-6 pb-4 overflow-x-hidden ${T.learningPageWrap}`} dir="rtl">
        <div className={T.hubTopBar}>
          <div className={T.hubTopBarBack}>
            <Link href="/student/home" className={T.hubBackLink}>
              חזרה
            </Link>
          </div>
          <p className={`${T.hubBadge} max-w-[min(100%,14rem)] sm:max-w-none text-center leading-tight`}>
            📚 תרגול · חזרה · שיפור
          </p>
        </div>

        <header className={T.hubHeaderCard}>
          <h1 className={T.hubTitle}>מרכז משחקי הלימוד</h1>
          <p className={`${T.hubDesc} mt-2 line-clamp-2 md:line-clamp-none`}>
            בחרו מקצוע והתחילו לשחק — ציונים, רמות והסברים לשאלות.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" aria-label="בחירת מקצוע">
          {LEARNING_GAMES.map((g) => {
            const subject = subjectHubCard[g.slug] || DEFAULT_SUBJECT_CARD;
            return (
              <Link
                key={g.slug}
                href={`/learning/${g.slug}`}
                className={`${T.hubCardBase} ${subject.card}`}
              >
                <span className={`${T.hubCardBar} ${subject.bar}`} aria-hidden />
                <div className={T.hubCardHeadRow}>
                  <span className={`${T.hubCardEmoji} ${subject.emoji}`} aria-hidden>
                    {g.emoji}
                  </span>
                  <h2 className={T.hubCardTitle}>{g.title}</h2>
                </div>
                <p className={T.hubCardBlurb}>{g.blurb}</p>
              </Link>
            );
          })}
        </section>

        {false && showDevStudentSimulator ? (
          <section className="mt-4">
            <Link
              href="/learning/dev-student-simulator"
              className="block rounded-2xl border border-indigo-300/40 bg-indigo-500/10 hover:bg-indigo-500/20 transition p-4 text-center"
            >
              <h2 className="font-bold text-lg">סימולטור ילדים (פיתוח)</h2>
              <p className="text-sm text-white/70">סימולטור ילדים לפיתוח</p>
            </Link>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
