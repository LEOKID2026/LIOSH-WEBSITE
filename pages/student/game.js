import Layout from "../../components/Layout";
import Link from "next/link";
import { useLayoutEffect } from "react";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GameAccessGuard from "../../components/games/GameAccessGuard.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../components/games/GamesHubHeader.jsx";
import { useStudentGameAccess } from "../../hooks/useStudentGameAccess.js";
import { resetSoloGameDocumentShell } from "../../lib/solo-games/solo-game-document-cleanup.client.js";
import { SOLO_GAME_LIST } from "../../lib/solo-games/solo-game-registry.js";
import {
  SHOW_PUBLIC_PROTOTYPE_HUB_ENTRY,
  SOLO_DEV_PROTOTYPES_HUB,
} from "../../lib/solo-games/dev-prototype-hub-list.js";
import SoloGameHelpButton from "../../components/solo-games/SoloGameHelpButton.jsx";
import SoloGameHelpModal from "../../components/solo-games/SoloGameHelpModal.jsx";
import GamesHubLockFooter from "../../components/games/GamesHubLockFooter.jsx";
import { useSoloGameHelp } from "../../hooks/solo-games/useSoloGameHelp.js";

export default function StudentSoloGamesPage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();
  const { state, playableGames, enabledGames, isGuest } = useStudentGameAccess();
  const accessRows = isGuest ? enabledGames("solo") : playableGames("solo");
  const { helpGame, openSoloGameHelp, closeSoloGameHelp } = useSoloGameHelp();

  useLayoutEffect(() => {
    resetSoloGameDocumentShell();
  }, []);

  return (
    <Layout studentTheme={theme} studentShell="home">
      <GameAccessGuard category="solo">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/student/games"
              backLabel="משחקים"
              badge="🎮 משחקי ליאו"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
            />

            <GamesHubHeader
              title="משחקי ליאו - עולם הילד"
              subtitle="שחקו, צברו ניקוד וקבלו מטבעות ויהלומים לעולם הילד!"
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                {state === "loading"
                  ? null
                  : accessRows.map((row) => {
                    const game = SOLO_GAME_LIST.find((g) => g.id === row.gameKey);
                    if (!game) return null;
                    const locked = isGuest && !row.playable;
                    const cardBody = (
                      <>
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
                        {locked ? (
                          <GamesHubLockFooter ctaClass={GH.cardCta} />
                        ) : (
                          <span className={GH.cardCta}>שחק עכשיו</span>
                        )}
                      </>
                    );
                    if (locked) {
                      return (
                        <div
                          key={game.id}
                          className={`${GH.card} relative opacity-80`}
                          aria-disabled="true"
                        >
                          {cardBody}
                        </div>
                      );
                    }
                    return (
                      <Link key={game.id} href={game.route} className={`${GH.card} relative`}>
                        {cardBody}
                      </Link>
                    );
                  })}
                {SHOW_PUBLIC_PROTOTYPE_HUB_ENTRY && state !== "loading" ? (
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
                ) : null}
              </div>
            </section>
          </div>
          <SoloGameHelpModal game={helpGame} onClose={closeSoloGameHelp} />
        </main>
      </GameAccessGuard>
    </Layout>
  );
}
