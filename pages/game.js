import Layout from "../components/Layout";
import Link from "next/link";
import { useEffect } from "react";
import { useGamesHubUi } from "../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../components/games/GamesHubHeader.jsx";
import { useStudentGameAccess } from "../hooks/useStudentGameAccess.js";
import { resetSoloGameDocumentShell } from "../lib/solo-games/solo-game-document-cleanup.client.js";
import { SOLO_GAME_LIST } from "../lib/solo-games/solo-game-registry.js";
import { SOLO_DEV_PROTOTYPES_HUB } from "../lib/solo-games/dev-prototype-hub-list.js";
import SoloGameHelpButton from "../components/solo-games/SoloGameHelpButton.jsx";
import SoloGameHelpModal from "../components/solo-games/SoloGameHelpModal.jsx";
import { useSoloGameHelp } from "../hooks/solo-games/useSoloGameHelp.js";

export default function Games() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const { state, playableGames } = useStudentGameAccess();
  const games = playableGames("solo");
  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();

  useEffect(() => {
    resetSoloGameDocumentShell();
  }, []);

  return (
    <GameAccessGuard category="solo">
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/games"
              backLabel="משחקים"
              badge="🎮 משחקי ליאו"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
            />

            <GamesHubHeader
              title="משחקי ליאו — עולם הילד"
              subtitle="שחקו, צברו ניקוד וקבלו מטבעות ויהלומים לעולם הילד!"
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                {state === "loading" ? (
                  <p className={`col-span-full text-center text-sm ${GH.muted}`}>טוען...</p>
                ) : (
                  games.map((row) => {
                    const game = SOLO_GAME_LIST.find((g) => g.id === row.gameKey);
                    if (!game) return null;
                    return (
                      <Link key={game.id} href={game.route} className={`${GH.card} relative`}>
                        <SoloGameHelpButton
                          game={game}
                          onOpen={openSoloGameHelp}
                          stopPropagation
                        />
                        <div className="flex items-center gap-3 mb-2">
                          <div className={GH.cardEmoji}>{game.emoji}</div>
                          <div>
                            <h2 className={GH.cardTitle}>{game.titleHe}</h2>
                            <p className={GH.cardMeta}>משחק יחיד · מטבעות · יהלומים</p>
                          </div>
                        </div>
                        <p className={`${GH.cardBlurb} flex-1`}>{game.blurbHe}</p>
                        <span className={GH.cardCta}>שחק עכשיו</span>
                      </Link>
                    );
                  })
                )}
                <Link href={SOLO_DEV_PROTOTYPES_HUB.route} className={GH.card}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={GH.cardEmoji}>{SOLO_DEV_PROTOTYPES_HUB.emoji}</div>
                    <div>
                      <h2 className={GH.cardTitle}>{SOLO_DEV_PROTOTYPES_HUB.titleHe}</h2>
                      <p className={GH.cardMeta}>פיתוח · בדיקות פנימיות</p>
                    </div>
                  </div>
                  <p className={`${GH.cardBlurb} flex-1`}>{SOLO_DEV_PROTOTYPES_HUB.blurbHe}</p>
                  <span className={GH.cardCta}>{SOLO_DEV_PROTOTYPES_HUB.ctaHe}</span>
                </Link>
              </div>
            </section>
          </div>
          <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
        </main>
      </Layout>
    </GameAccessGuard>
  );
}

