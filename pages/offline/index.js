import Layout from "../../components/Layout";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../components/games/GamesHubHeader.jsx";
import OfflineHubGameCard from "../../components/games/OfflineHubGameCard.jsx";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";

const OFFLINE_GAMES = [
  {
    slug: "tic-tac-toe",
    gameKey: "tic-tac-toe",
    title: "איקס עיגול",
    emoji: "❌⭕️",
    players: "2 שחקנים",
    blurb: "לוחות מ 3×3 ועד 7×7 עם מעקב ציון.",
  },
  {
    slug: "rock-paper-scissors",
    gameKey: "rock-paper-scissors",
    title: "אבן · נייר · מספריים",
    titleOneLine: true,
    emoji: "🪨📄✂️",
    players: "2 שחקנים או נגד רובוט",
    blurb: "משחקים מהירים, סיבובים הטוב מול כולם.",
  },
  {
    slug: "tap-battle",
    gameKey: "tap-battle",
    title: "קרב הקשות",
    emoji: "⚡️",
    players: "2 שחקנים",
    blurb: "כל צד מקיש מהר ככל האפשר — מי ינצח?",
  },
  {
    slug: "memory-match",
    gameKey: "memory-match",
    title: "התאמת זיכרון",
    emoji: "🧠",
    players: "1–2 שחקנים",
    blurb: "הופכים קלפים, מוצאים זוגות ומנסים לנצח.",
  },
];

export default function OfflineHub() {
  useIOSViewportFix();
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const { state, gamesByKey, isGuest } = useStudentGameAccess();

  const visibleGames = OFFLINE_GAMES.filter((g) => {
    const row = gamesByKey[g.gameKey];
    if (!row?.isEnabled) return false;
    if (isGuest) return true;
    return row.playable;
  }).map((g) => ({
    ...g,
    locked: isGuest && !gamesByKey[g.gameKey]?.playable,
  }));

  return (
    <GameAccessGuard category="offline">
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/games"
              backLabel="משחקים"
              badge="🔌כל הזמן עם ליאו"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
            />

            <GamesHubHeader
              title="משחקים כל הזמן עם ליאו"
              subtitle="משחקים על אותו מכשיר — גם בלי אינטרנט."
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            {state === "loading" ? (
              <StudentLoadingPanel message="טוען..." hubGrid />
            ) : (
              <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                {visibleGames.map((game) => (
                  <OfflineHubGameCard key={game.slug} game={game} GH={GH} locked={game.locked} />
                ))}
              </section>
            )}
          </div>
        </main>
      </Layout>
    </GameAccessGuard>
  );
}
