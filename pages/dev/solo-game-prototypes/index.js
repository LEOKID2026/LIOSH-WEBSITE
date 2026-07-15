import Head from "next/head";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { useGamesHubUi } from "../../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import GamesHubNavBar from "../../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../../components/games/GamesHubHeader.jsx";
import {
  LEARNING_DEV_PROTOTYPES_HUB,
  LEO_DOG_PROTOTYPE,
  SOLO_DEV_PROTOTYPES_PLAY_HUB,
  STUDENT_WORLD_HOME_PROTOTYPE,
} from "../../../lib/solo-games/dev-prototype-hub-list.js";

/** Dev hub — pet prototype + solo play + learning prototypes */
export default function SoloGamePrototypesHubPage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  const sections = [
    STUDENT_WORLD_HOME_PROTOTYPE,
    LEO_DOG_PROTOTYPE,
    SOLO_DEV_PROTOTYPES_PLAY_HUB,
    LEARNING_DEV_PROTOTYPES_HUB,
  ];

  return (
    <>
      <Head>
        <title>אבטיפוסי משחקים - פיתוח</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/game"
              backLabel="משחקי ליאו"
              badge="🧪 אבטיפוסים"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
              showAudioSettings={false}
            />

            <GamesHubHeader
              title="אבטיפוסי משחקים"
              subtitle="בחרו סוג אבטיפוסים - משחקי סולו או לימודיים. לבדיקה בלבד, ללא פרסים."
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {sections.map((item) => (
                <Link key={item.route} href={item.route} className={GH.card}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={GH.cardEmoji}>{item.emoji}</div>
                    <div>
                      <h2 className={GH.cardTitle}>{item.titleHe}</h2>
                      <p className={GH.cardMeta}>{item.metaHe}</p>
                    </div>
                  </div>
                  <p className={`${GH.cardBlurb} flex-1`}>{item.blurbHe}</p>
                  <span className={GH.cardCta}>{item.ctaHe}</span>
                </Link>
              ))}
            </section>
          </div>
        </main>
      </Layout>
    </>
  );
}
