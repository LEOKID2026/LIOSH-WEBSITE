import { useEffect } from "react";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { useGamesHubUi } from "../../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import StudentThemePicker from "../../../components/student/StudentThemePicker";
import GameAccessGuard from "../../../components/games/GameAccessGuard.jsx";
import { useStudentGameAccess } from "../../../hooks/useStudentGameAccess.js";
import { resetSoloGameDocumentShell } from "../../../lib/solo-games/solo-game-document-cleanup.client.js";
import { SOLO_GAME_LIST } from "../../../lib/solo-games/solo-game-registry.js";

export default function SoloGamesHubPage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const { state, playableGames } = useStudentGameAccess();
  const games = playableGames("solo");

  useEffect(() => {
    resetSoloGameDocumentShell();
  }, []);

  return (
    <GameAccessGuard category="solo">
      <Layout studentTheme={theme} studentShell="home">
        <div className={`${GH.pageWrap} overflow-x-hidden px-4 py-6`} dir="rtl">
          <div className={`${GH.container} space-y-6`}>
            <div className="flex items-center justify-between gap-3">
              <Link href="/games" className={GH.backBtn}>
                ← חזרה למשחקים
              </Link>
              <StudentThemePicker variant="icon" iconSize="nav" />
            </div>

            <header className="space-y-2 text-center">
              <p className={GH.badge}>🎮 משחקי ליאו</p>
              <h1 className={GH.hubTitle}>משחקים לילד יחיד</h1>
              <p className={GH.hubSub}>
                שחקו, צברו ניקוד וקבלו מטבעות ויהלומים לעולם הילד!
              </p>
            </header>

            {state === "loading" ? (
              <p className={`text-center text-sm ${GH.muted}`}>טוען...</p>
            ) : (
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {games.map((row) => {
                  const game = SOLO_GAME_LIST.find((g) => g.id === row.gameKey);
                  if (!game) return null;
                  return (
                    <Link key={game.id} href={game.route} className={GH.card}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={GH.cardEmoji}>{game.emoji}</div>
                        <div>
                          <h2 className={GH.cardTitle}>{game.titleHe}</h2>
                          <p className={GH.cardMeta}>משחק יחיד · מטבעות · יהלומים</p>
                        </div>
                      </div>
                      <p className={`${GH.cardBlurb} flex-1`}>{game.blurbHe}</p>
                      <span className={GH.cardCta}>
                        <span>←</span>
                        שחק עכשיו
                      </span>
                    </Link>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </Layout>
    </GameAccessGuard>
  );
}
