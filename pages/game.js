import Layout from "../components/Layout";
import Link from "next/link";
import { useGamesHubUi } from "../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../components/student/StudentThemePicker";

const GAMES = [
  {
    slug: "mleo-runner",
    title: "מירוץ ליאו",
    emoji: "🏃‍♂️",
    type: "משחק ארקייד",
    blurb: "רוצים עם ליאו ואוספים נקודות!",
  },
  {
    slug: "mleo-flyer",
    title: "ליאו במטוס",
    emoji: "🪂",
    type: "משחק ארקייד",
    blurb: "טסים עם ליאו ואוספים מטבעות!",
  },
  {
    slug: "mleo-catcher",
    title: "תופס עם ליאו",
    emoji: "🎯",
    type: "משחק ארקייד",
    blurb: "תופסים מטבעות ויהלומים — מתרחקים מפצצות!",
  },
  {
    slug: "mleo-puzzle",
    title: "חידת ליאו",
    emoji: "🧩",
    type: "משחק ארקייד",
    blurb: "משלבים שלושה אריחים וצוברים נקודות!",
  },
  {
    slug: "mleo-memory",
    title: "זיכרון ליאו",
    emoji: "🧠",
    type: "משחק ארקייד",
    blurb: "הופכים קלפים ומוצאים זוגות מתאימים!",
  },
  {
    slug: "mleo-penalty",
    title: "פנדל ליאו",
    emoji: "⚽",
    type: "משחק ארקייד",
    blurb: "כובשים שערים בבעיטות עונשין!",
  },
];

export default function Games() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <main className={GH.pageWrap} dir="rtl">
        <div className={`${GH.container} space-y-6`}>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <Link href="/" className={GH.backBtn}>
              בית ←
            </Link>
            <div className="flex items-center gap-3">
              <p className={`text-xs uppercase tracking-[0.3em] ${GH.muted}`}>משחקי ארקייד</p>
              <StudentThemePicker variant="icon" iconSize="nav" />
            </div>
          </div>

          <header className="text-center space-y-3">
            <p className={GH.badge}>🎮 פעולה · כיף · הרפתקאות</p>
            <h1 className={GH.hubTitle}>מרכז משחקי הארקייד</h1>
            <p className={GH.hubSub}>
              שחקו ותיהנו ממשחקי ליאו! צברו נקודות, טסו גבוה — והכול עם גיבור השיבה אינו האמיתי.
            </p>
          </header>

          <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {GAMES.map((g) => (
              <Link
                key={g.slug}
                href={`/${g.slug}`}
                className={GH.card}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={GH.cardEmoji}>{g.emoji}</div>
                  <div>
                    <h2 className={GH.cardTitle}>{g.title}</h2>
                    <p className={GH.cardMeta}>{g.type}</p>
                  </div>
                </div>
                <p className={`${GH.cardBlurb} flex-1`}>{g.blurb}</p>
                <span className={GH.cardCta}>
                  <span>←</span>
                  שחק עכשיו
                </span>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </Layout>
  );
}
