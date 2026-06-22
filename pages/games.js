import Layout from "../components/Layout";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import GameHubCard from "../components/games/GameHubCard.jsx";
import GamesHubNavBar from "../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../components/games/GamesHubHeader.jsx";
import { useStudentGameAccess } from "../hooks/useStudentGameAccess.js";
import { hubCardKeyToCategory } from "../lib/games/game-catalog.constants.js";

const GAME_HUB_CARDS = [
  {
    key: "regular",
    title: "המשחקים של ליאו",
    emoji: "🎮",
    blurb: "משחקי ליאו הקלאסיים — ריצה, טיסה, חידות ועוד.",
    href: "/game",
  },
  {
    key: "offline",
    title: "משחקים כל הזמן עם ליאו",
    emoji: "🔌",
    blurb: "משחקים על אותו מכשיר — גם בלי אינטרנט.",
    href: "/offline",
  },
  {
    key: "online",
    title: "משחקים עם חברים",
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
      <main className={GH.pageWrap} dir="rtl">
        <div className={`${GH.container} space-y-4`}>
          <GamesHubNavBar
            backHref="/student/home"
            backLabel="חזרה"
            badge="🎯 משחקים"
            backBtnClass={GH.backBtn}
            badgeClass={GH.badge}
          />

          <GamesHubHeader
            title=""
            subtitle="בחרו את סוג החוויה שמתאימה לכם — משחקי ליאו, משחקים ללא אינטרנט, או משחקים עם חברים."
            titleClass={GH.hubTitle}
            subtitleClass={GH.hubSub}
          />

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
      </main>
    </Layout>
  );
}
