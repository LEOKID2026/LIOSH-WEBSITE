import Layout from "../../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../../components/student/StudentThemePicker";

const OFFLINE_GAMES = [
  {
    slug: "tic-tac-toe",
    title: "איקס עיגול XL",
    emoji: "❌⭕️",
    players: "2 שחקנים",
    blurb: "לוחות מ 3×3 ועד 7×7 עם מעקב ציון.",
  },
  {
    slug: "rock-paper-scissors",
    title: "אבן · נייר · מספריים",
    emoji: "🪨📄✂️",
    players: "2 שחקנים או נגד רובוט",
    blurb: "משחקים מהירים, סיבובים הטוב מול כולם והיסטוריית ציון.",
  },
  {
    slug: "tap-battle",
    title: "קרב הקשות",
    emoji: "⚡️",
    players: "2 שחקנים",
    blurb: "כל צד מקיש מהר ככל האפשר — מי שמגיע קודם ליעד מנצח.",
  },
  {
    slug: "memory-match",
    title: "התאמת זיכרון",
    emoji: "🧠",
    players: "1–2 שחקנים",
    blurb: "הופכים קלפים, מוצאים זוגות ומנסים לנצח את השעון.",
  },
];

export default function OfflineHub() {
  useIOSViewportFix();
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
              <p className={`text-xs uppercase tracking-[0.3em] ${GH.muted}`}>משחקים לא מקוונים</p>
              <StudentThemePicker variant="icon" iconSize="nav" />
            </div>
          </div>

          <header className="text-center space-y-3">
            <p className={GH.badge}>🔌 אותו מכשיר · בלי אינטרנט</p>
            <h1 className={GH.hubTitle}>מרכז המשחקים הלא מקוונים</h1>
            <p className={GH.hubSub}>
              בחרו משחק ושחקו יחד על טלפון או טאבלט אחד — מתאים לנסיעות, טיסות ומקומות בלי קליטה.
            </p>
          </header>

          <section className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {OFFLINE_GAMES.map((g) => (
              <Link
                key={g.slug}
                href={`/offline/${g.slug}`}
                className={GH.card}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={GH.cardEmoji}>{g.emoji}</div>
                  <div>
                    <h2 className={GH.cardTitle}>{g.title}</h2>
                    <p className={GH.cardMeta}>{g.players}</p>
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
