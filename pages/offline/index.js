import Layout from "../../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../components/games/GamesHubHeader.jsx";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";

const OFFLINE_GAMES = [
  {
    slug: "tic-tac-toe",
    gameKey: "tic-tac-toe",
    title: "איקס עיגול XL",
    emoji: "❌⭕️",
    players: "2 שחקנים",
    blurb: "לוחות מ 3×3 ועד 7×7 עם מעקב ציון.",
  },
  {
    slug: "rock-paper-scissors",
    gameKey: "rock-paper-scissors",
    title: "אבן · נייר · מספריים",
    emoji: "🪨📄✂️",
    players: "2 שחקנים או נגד רובוט",
    blurb: "משחקים מהירים, סיבובים הטוב מול כולם והיסטוריית ציון.",
  },
  {
    slug: "tap-battle",
    gameKey: "tap-battle",
    title: "קרב הקשות",
    emoji: "⚡️",
    players: "2 שחקנים",
    blurb: "כל צד מקיש מהר ככל האפשר — מי שמגיע קודם ליעד מנצח.",
  },
  {
    slug: "memory-match",
    gameKey: "memory-match",
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
  const { state, gamesByKey } = useStudentGameAccess();

  const visibleGames = OFFLINE_GAMES.filter((g) => {
    const row = gamesByKey[g.gameKey];
    return row?.isEnabled && row?.playable;
  });

  return (
    <GameAccessGuard category="offline">
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/games"
              backLabel="משחקים"
              badge="🔌 לא מקוון"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
            />

            <GamesHubHeader
              title="משחקים לא מקוונים"
              subtitle="משחקים על אותו מכשיר — גם בלי אינטרנט."
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            {state === "loading" ? (
              <p className={`text-center text-sm ${GH.muted}`}>טוען...</p>
            ) : (
              <section className="grid sm:grid-cols-2 gap-3 md:gap-4">
                {visibleGames.map((game) => (
                  <Link key={game.slug} href={`/offline/${game.slug}`} className={GH.card}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={GH.cardEmoji}>{game.emoji}</div>
                      <div>
                        <h2 className={GH.cardTitle}>{game.title}</h2>
                        <p className={GH.cardMeta}>{game.players}</p>
                      </div>
                    </div>
                    <p className={`${GH.cardBlurb} flex-1`}>{game.blurb}</p>
                    <span className={GH.cardCta}>שחק עכשיו</span>
                  </Link>
                ))}
              </section>
            )}
          </div>
        </main>
      </Layout>
    </GameAccessGuard>
  );
}
