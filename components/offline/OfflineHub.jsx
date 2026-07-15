import Link from "next/link";
import { useOfflineHubUi } from "../../hooks/useOfflineHubUi.js";
import OfflineHubGameCard from "../games/OfflineHubGameCard.jsx";
import OfflineHubTileCard from "../games/OfflineHubTileCard.jsx";
import OfflineHubPageShell from "./OfflineHubPageShell.jsx";
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
import OfflinePrecacheWarmup from "./OfflinePrecacheWarmup.jsx";

function OfflineSectionTitle({ children, GH }) {
  return (
    <h2 className={GH.sectionTitle} dir="rtl">
      {children}
    </h2>
  );
}

export default function OfflineHub() {
  const { GH } = useOfflineHubUi();
  const fullGames = STUDENT_OFFLINE_FULL_GAMES_ENABLED;

  return (
    <>
      <OfflinePrecacheWarmup />
      <OfflineHubPageShell>
        <div className={`${GH.container} space-y-5`}>
          <header className="space-y-2 text-center sm:text-right">
            <p className={GH.badge}>🔌 משחקים ללא אינטרנט</p>
            <h1 className={GH.hubTitle}>משחקים ללא אינטרנט</h1>
            <p className={GH.hubSub}>משחקים מקומיים - ללא שמירה וללא פרסים</p>
          </header>

          <OfflineReconnectBanner />

          <section className="space-y-3">
            <OfflineSectionTitle GH={GH}>משחקים על אותו מכשיר</OfflineSectionTitle>
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
                <OfflineSectionTitle GH={GH}>משחקי ליאו (סולו)</OfflineSectionTitle>
                <OfflineHubTileCard
                  href={OFFLINE_SOLO_HUB_ROUTE}
                  emoji="🎮"
                  title="12 משחקי סולו"
                  blurb="תופס, חידות, מבוכים ועוד - בלי חיבור."
                  GH={GH}
                />
              </section>

              <section className="space-y-3">
                <OfflineSectionTitle GH={GH}>משחקים חינוכיים</OfflineSectionTitle>
                <OfflineHubTileCard
                  href={OFFLINE_EDUCATIONAL_HUB_ROUTE}
                  emoji="📚"
                  title={`${OFFLINE_EDUCATIONAL_GAMES.length} משחקים חינוכיים`}
                  blurb="מיחזור, מכולת, מעבדה, פיצרייה, רכבת המילים ועוד - הכל מקומי."
                  GH={GH}
                />
              </section>
            </>
          ) : null}
        </div>
      </OfflineHubPageShell>
    </>
  );
}

/** Solo sub-hub grid — only rendered behind OfflineFullGamesRouteGuard. */
export function OfflineSoloGamesHub() {
  const { GH } = useOfflineHubUi();

  return (
    <OfflineHubPageShell>
      <div className={`${GH.container} space-y-4`}>
        <GamesHubNav offlineHubRoute={OFFLINE_HUB_ROUTE} title="משחקי ליאו - אופליין" GH={GH} />
        <OfflineReconnectBanner />
        <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {OFFLINE_SOLO_GAMES.map((game) => (
            <OfflineHubTileCard
              key={game.id}
              href={game.route}
              emoji={game.emoji}
              title={game.titleHe}
              blurb={game.blurbHe}
              GH={GH}
            />
          ))}
        </section>
      </div>
    </OfflineHubPageShell>
  );
}

/** Educational sub-hub — only rendered behind OfflineFullGamesRouteGuard. */
export function OfflineEducationalGamesHub() {
  const { GH } = useOfflineHubUi();

  return (
    <OfflineHubPageShell>
      <div className={`${GH.container} space-y-4`}>
        <GamesHubNav offlineHubRoute={OFFLINE_HUB_ROUTE} title="משחקים חינוכיים - אופליין" GH={GH} />
        <OfflineReconnectBanner />
        <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {OFFLINE_EDUCATIONAL_GAMES.map((game) => (
            <OfflineHubTileCard
              key={game.id}
              href={game.route}
              emoji={game.emoji}
              title={game.titleHe}
              blurb={game.blurbHe}
              GH={GH}
            />
          ))}
        </section>
      </div>
    </OfflineHubPageShell>
  );
}

function GamesHubNav({ offlineHubRoute, title, GH }) {
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
