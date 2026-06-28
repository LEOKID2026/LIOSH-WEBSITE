import Link from "next/link";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import Layout from "../Layout";
import OfflineHubGameCard from "../games/OfflineHubGameCard.jsx";
import {
  OFFLINE_EDUCATIONAL_GAMES,
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_GAMES,
  OFFLINE_SOLO_HUB_ROUTE,
  SAME_DEVICE_OFFLINE_GAMES,
} from "../../lib/offline/offline-game-catalog.js";
import { STUDENT_OFFLINE_FULL_GAMES_ENABLED } from "../../lib/offline/offline-flags.js";
import OfflineReconnectBanner from "./OfflineReconnectBanner.jsx";

function OfflineSectionTitle({ children }) {
  return (
    <h2 className="text-base font-bold text-white/90 sm:text-lg" dir="rtl">
      {children}
    </h2>
  );
}

function OfflineCategoryCard({ href, title, emoji, blurb, GH }) {
  return (
    <Link href={href} className={`${GH.card} !p-4 md:!p-5`}>
      <div className="flex items-center gap-3 text-right">
        <span className="text-3xl" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`${GH.cardTitle} !text-lg`}>{title}</h3>
          <p className={GH.cardBlurb}>{blurb}</p>
        </div>
      </div>
      <span className={`${GH.cardCta} mt-3 w-full justify-center`}>כניסה</span>
    </Link>
  );
}

export default function OfflineHub() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const fullGames = STUDENT_OFFLINE_FULL_GAMES_ENABLED;

  return (
    <Layout studentTheme={theme} studentShell="home">
      <main className={GH.pageWrap} dir="rtl">
        <div className={`${GH.container} space-y-5`}>
          <header className="space-y-2 text-center sm:text-right">
            <p className={GH.badge}>🔌 משחקים ללא אינטרנט</p>
            <h1 className={GH.hubTitle}>משחקים ללא אינטרנט</h1>
            <p className={GH.hubSub}>
              משחקים מקומיים — ללא שמירה וללא פרסים
            </p>
          </header>

          <OfflineReconnectBanner />

          <section className="space-y-3">
            <OfflineSectionTitle>משחקים על אותו מכשיר</OfflineSectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {SAME_DEVICE_OFFLINE_GAMES.map((game) => (
                <OfflineHubGameCard
                  key={game.slug}
                  game={game}
                  GH={GH}
                  hrefBase={`${OFFLINE_HUB_ROUTE}/`}
                />
              ))}
            </div>
          </section>

          {fullGames ? (
            <>
              <section className="space-y-3">
                <OfflineSectionTitle>משחקי ליאו (סולו)</OfflineSectionTitle>
                <OfflineCategoryCard
                  href={OFFLINE_SOLO_HUB_ROUTE}
                  title="12 משחקי סולו"
                  emoji="🎮"
                  blurb="תופס, חידות, מבוכים ועוד — בלי חיבור."
                  GH={GH}
                />
              </section>

              <section className="space-y-3">
                <OfflineSectionTitle>משחקים חינוכיים</OfflineSectionTitle>
                <OfflineCategoryCard
                  href={OFFLINE_EDUCATIONAL_HUB_ROUTE}
                  title="6 משחקים חינוכיים"
                  emoji="📚"
                  blurb="מיחזור, מכולת, מעבדה ועוד — הכל מקומי."
                  GH={GH}
                />
              </section>
            </>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}

/** Solo sub-hub grid — only rendered behind OfflineFullGamesRouteGuard. */
export function OfflineSoloGamesHub() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <main className={GH.pageWrap} dir="rtl">
        <div className={`${GH.container} space-y-4`}>
          <GamesHubNav offlineHubRoute={OFFLINE_HUB_ROUTE} title="משחקי ליאו — אופליין" />
          <OfflineReconnectBanner />
          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {OFFLINE_SOLO_GAMES.map((game) => (
              <Link key={game.id} href={game.route} className={`${GH.card} !p-3 md:!p-5`}>
                <div className="text-right">
                  <span className="text-2xl">{game.emoji}</span>
                  <h2 className={GH.cardTitle}>{game.titleHe}</h2>
                  <p className={GH.cardBlurb}>{game.blurbHe}</p>
                  <span className={`${GH.cardCta} mt-2 w-full justify-center`}>שחק</span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </Layout>
  );
}

/** Educational sub-hub — only rendered behind OfflineFullGamesRouteGuard. */
export function OfflineEducationalGamesHub() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <main className={GH.pageWrap} dir="rtl">
        <div className={`${GH.container} space-y-4`}>
          <GamesHubNav offlineHubRoute={OFFLINE_HUB_ROUTE} title="משחקים חינוכיים — אופליין" />
          <OfflineReconnectBanner />
          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {OFFLINE_EDUCATIONAL_GAMES.map((game) => (
              <Link key={game.id} href={game.route} className={`${GH.card} !p-3 md:!p-5`}>
                <div className="text-right">
                  <span className="text-2xl">{game.emoji}</span>
                  <h2 className={GH.cardTitle}>{game.titleHe}</h2>
                  <p className={GH.cardBlurb}>{game.blurbHe}</p>
                  <span className={`${GH.cardCta} mt-2 w-full justify-center`}>שחק</span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </Layout>
  );
}

function GamesHubNav({ offlineHubRoute, title }) {
  const { GH } = useGamesHubUi();
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={offlineHubRoute} className={GH.backBtn}>
        חזרה
      </Link>
      <h1 className={`${GH.hubTitle} !text-lg sm:!text-xl`}>{title}</h1>
      <span className="w-16" aria-hidden />
    </div>
  );
}
