import Layout from "../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../components/student/StudentThemePicker";

const GAME_HUB_CARDS = [
  {
    key: "regular",
    title: "משחקים רגילים",
    emoji: "🎮",
    blurb: "משחקי ליאו הקלאסיים — ריצה, טיסה, חידות ועוד.",
    href: "/game",
  },
  {
    key: "offline",
    title: "משחקים לא מקוונים",
    emoji: "🔌",
    blurb: "משחקים על אותו מכשיר — גם בלי אינטרנט.",
    href: "/offline",
  },
  {
    key: "online",
    title: "משחקי אונליין",
    emoji: "🌐",
    blurb: "חדרי משחק מרובי משתתפים עם חברים ושחקנים אחרים.",
    href: "/student/arcade",
  },
];

export default function GamesHubPage() {
  useIOSViewportFix();
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <div className={GH.pageWrap} dir="rtl">
        <div className={GH.container}>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-3 flex-wrap">
            <Link href="/student/home" className={GH.backBtn}>
              חזרה
            </Link>
            <StudentThemePicker variant="icon" iconSize="nav" />
          </div>

          <header className="text-center space-y-2 md:space-y-3 mb-5 md:mb-8">
            <p className={GH.badge}>🎯 בחרו סוג משחק</p>
            <h1 className={GH.hubTitle}>משחקים</h1>
            <p className={GH.hubSub}>
              בחרו את סוג החוויה שמתאימה לכם — משחקי ליאו, משחקים ללא אינטרנט, או משחקים מקוונים.
            </p>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {GAME_HUB_CARDS.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className={`${GH.card} text-right min-h-[9.5rem] md:min-h-[11rem]`}
              >
                <div className="space-y-2 flex-1">
                  <div className={GH.cardEmoji} aria-hidden>
                    {card.emoji}
                  </div>
                  <h2 className={GH.cardTitle}>{card.title}</h2>
                  <p className={GH.cardBlurb}>{card.blurb}</p>
                </div>
                <span className={GH.cardCta}>
                  <span aria-hidden>←</span>
                  כניסה
                </span>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
