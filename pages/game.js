import Layout from "../components/Layout";

import Link from "next/link";

import { useEffect } from "react";

import { useGamesHubUi } from "../hooks/useGamesHubUi.js";

import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";

import StudentThemePicker from "../components/student/StudentThemePicker";

import { resetSoloGameDocumentShell } from "../lib/solo-games/solo-game-document-cleanup.client.js";

import { SOLO_GAME_LIST } from "../lib/solo-games/solo-game-registry.js";



export default function Games() {

  const { theme } = useStudentTheme();

  const { GH } = useGamesHubUi();



  useEffect(() => {

    resetSoloGameDocumentShell();

  }, []);



  return (

    <Layout studentTheme={theme} studentShell="home">

      <main className={GH.pageWrap} dir="rtl">

        <div className={`${GH.container} space-y-6`}>

          <div className="flex justify-between items-center gap-3 flex-wrap">

            <Link href="/games" className={GH.backBtn}>

              ← משחקים

            </Link>

            <div className="flex items-center gap-3">

              <p className={`text-xs uppercase tracking-[0.3em] ${GH.muted}`}>משחקי ליאו</p>

              <StudentThemePicker variant="icon" iconSize="nav" />

            </div>

          </div>



          <header className="text-center space-y-3">

            <p className={GH.badge}>🎮 משחקי ליאו</p>

            <h1 className={GH.hubTitle}>משחקי ליאו — עולם הילד</h1>

            <p className={GH.hubSub}>

              שחקו, צברו ניקוד וקבלו מטבעות אמיתיים לעולם הילד!

            </p>

          </header>



          <section className="space-y-3">

            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">

              {SOLO_GAME_LIST.map((game) => (

                <Link

                  key={game.id}

                  href={game.route}

                  className={GH.card}

                >

                  <div className="flex items-center gap-3 mb-2">

                    <div className={GH.cardEmoji}>{game.emoji}</div>

                    <div>

                      <h2 className={GH.cardTitle}>{game.titleHe}</h2>

                      <p className={GH.cardMeta}>משחק יחיד · מטבעות</p>

                    </div>

                  </div>

                  <p className={`${GH.cardBlurb} flex-1`}>{game.blurbHe}</p>

                  <span className={GH.cardCta}>

                    <span>←</span>

                    שחק עכשיו

                  </span>

                </Link>

              ))}

            </div>

            <p className={`text-center text-sm ${GH.muted}`}>

              <Link href="/student/solo-games" className="underline underline-offset-2">

                לכל משחקי הילד היחיד

              </Link>

            </p>

          </section>

        </div>

      </main>

    </Layout>

  );

}


