import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useOfflineHubUi } from "../../hooks/useOfflineHubUi.js";
import OfflineHubPageShell from "../../components/offline/OfflineHubPageShell.jsx";
import GameAccessGuard from "../../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../components/games/GamesHubHeader.jsx";
import OfflineHubGameCard from "../../components/games/OfflineHubGameCard.jsx";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
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
    blurb: "כל צד מקיש מהר ככל האפשר - מי ינצח?",
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
  const { GH } = useOfflineHubUi();
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
    <OfflineHubPageShell>
      <GameAccessGuard category="offline">
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
            subtitle="משחקים על אותו מכשיר - גם בלי אינטרנט."
            titleClass={GH.hubTitle}
            subtitleClass={GH.hubSub}
          />

          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {state === "loading"
              ? null
              : visibleGames.map((game) => (
                <OfflineHubGameCard key={game.slug} game={game} GH={GH} locked={game.locked} />
              ))}
          </section>
        </div>
      </GameAccessGuard>
    </OfflineHubPageShell>
  );
}
