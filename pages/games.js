import Layout from "../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../components/student/StudentThemePicker";
import GameHubCard from "../components/games/GameHubCard.jsx";
import { useStudentGameAccess } from "../hooks/useStudentGameAccess.js";
import { hubCardKeyToCategory } from "../lib/games/game-catalog.constants.js";

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
  const { state, categoryState } = useStudentGameAccess();

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

          {state === "loading" ? (
            <p className="text-center text-sm opacity-70">טוען...</p>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {GAME_HUB_CARDS.map((card) => {
                const category = hubCardKeyToCategory(card.key);
                const catState = category ? categoryState(category) : null;
                return (
                  <GameHubCard
                    key={card.key}
                    title={card.title}
                    emoji={card.emoji}
                    blurb={card.blurb}
                    href={catState?.playable ? card.href : undefined}
                    cardClass={`${GH.card} text-right min-h-[9.5rem] md:min-h-[11rem]`}
                    ctaClass={GH.cardCta}
                    hidden={catState ? !catState.visible : false}
                    locked={catState?.locked === true}
                  />
                );
              })}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
