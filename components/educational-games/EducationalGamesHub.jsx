import Link from "next/link";
import Layout from "../Layout";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../games/GameAccessGuard.jsx";
import GamesHubNavBar from "../games/GamesHubNavBar.jsx";
import GamesHubHeader from "../games/GamesHubHeader.jsx";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
import { EDUCATIONAL_HUB } from "../../lib/educational-games/educational-game-registry.js";

export default function EducationalGamesHub() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const { state, playableGames } = useStudentGameAccess();
  const games = playableGames("educational");

  return (
    <GameAccessGuard category="educational">
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/games"
              backLabel="משחקים"
              badge="📚 חינוכי"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
            />

            <GamesHubHeader
              title={EDUCATIONAL_HUB.titleHe}
              subtitle={EDUCATIONAL_HUB.blurbHe}
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {state === "loading" ? (
                <p className={`col-span-full text-center text-sm ${GH.muted}`}>טוען...</p>
              ) : games.length === 0 ? (
                <p className={`col-span-full text-center text-sm ${GH.muted}`}>
                  אין משחקים חינוכיים זמינים כרגע
                </p>
              ) : (
                games.map((row) => (
                  <Link key={row.gameKey} href={row.route} className={GH.card}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={GH.cardEmoji}>{row.emoji || "📚"}</div>
                      <div>
                        <h2 className={GH.cardTitle}>{row.titleHe}</h2>
                        <p className={GH.cardMeta}>משחק חינוכי · מטבעות</p>
                      </div>
                    </div>
                    <p className={`${GH.cardBlurb} flex-1`}>{row.blurbHe}</p>
                    <span className={GH.cardCta}>שחק עכשיו</span>
                  </Link>
                ))
              )}
            </section>
          </div>
        </main>
      </Layout>
    </GameAccessGuard>
  );
}
