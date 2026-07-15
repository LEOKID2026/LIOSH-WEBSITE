import Head from "next/head";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { useGamesHubUi } from "../../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import GamesHubNavBar from "../../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../../components/games/GamesHubHeader.jsx";
import { SOLO_DEV_PROTOTYPE_LIST } from "../../../lib/solo-games/dev-prototype-hub-list.js";

/** Dev hub — links to all solo play prototypes */
export default function SoloGamePrototypesListPage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <>
      <Head>
        <title>אבטיפוסי משחקי סולו - פיתוח</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref="/dev/solo-game-prototypes"
              backLabel="אבטיפוסים"
              badge="🎮 סולו"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
              showAudioSettings={false}
            />

            <GamesHubHeader
              title="אבטיפוסי משחקי סולו"
              subtitle="רעיונות למשחקי סולו חדשים - לבדיקה בלבד, לא מחוברים לפרסים או לעולם הילד."
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {SOLO_DEV_PROTOTYPE_LIST.map((item) => (
                <Link key={item.id} href={item.route} className={GH.card}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={GH.cardEmoji}>{item.emoji}</div>
                    <div>
                      <h2 className={GH.cardTitle}>{item.titleHe}</h2>
                      <p className={GH.cardMeta}>אבטיפוס · ללא פרסים</p>
                    </div>
                  </div>
                  <p className={`${GH.cardBlurb} flex-1`}>פתיחת אבטיפוס לבדיקת תחושה ומשחקיות</p>
                  <span className={GH.cardCta}>פתח אבטיפוס</span>
                </Link>
              ))}
            </section>
          </div>
        </main>
      </Layout>
    </>
  );
}
