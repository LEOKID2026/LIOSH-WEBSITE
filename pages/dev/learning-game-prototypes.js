import Head from "next/head";
import Layout from "../../components/Layout";
import Link from "next/link";
import { useGamesHubUi } from "../../hooks/useGamesHubUi.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import GamesHubNavBar from "../../components/games/GamesHubNavBar.jsx";
import GamesHubHeader from "../../components/games/GamesHubHeader.jsx";
import { LEARNING_DEV_PROTOTYPE_LIST } from "../../lib/dev/learning-prototype-hub-list.js";
import { SOLO_DEV_PROTOTYPES_HUB } from "../../lib/solo-games/dev-prototype-hub-list.js";

/** Dev hub — learning / enrichment game prototypes */
export default function LearningGamePrototypesHubPage() {
  const { theme } = useStudentTheme();
  const { GH } = useGamesHubUi();

  return (
    <>
      <Head>
        <title>אבטיפוסים לימודיים - פיתוח</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <Layout studentTheme={theme} studentShell="home">
        <main className={GH.pageWrap} dir="rtl">
          <div className={`${GH.container} space-y-4`}>
            <GamesHubNavBar
              backHref={SOLO_DEV_PROTOTYPES_HUB.route}
              backLabel="אבטיפוסים"
              badge="📚 לימודי"
              backBtnClass={GH.backBtn}
              badgeClass={GH.badge}
              showAudioSettings={false}
            />

            <GamesHubHeader
              title="אבטיפוסים לימודיים"
              subtitle="העשרה ולמידה דרך משחק - לבדיקה בלבד, לא מחובר לפרסים או למנוע הלמידה."
              titleClass={GH.hubTitle}
              subtitleClass={GH.hubSub}
            />

            <section className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {LEARNING_DEV_PROTOTYPE_LIST.map((item) => (
                <Link key={item.id} href={item.route} className={GH.card}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={GH.cardEmoji}>{item.emoji}</div>
                    <div>
                      <h2 className={GH.cardTitle}>{item.titleHe}</h2>
                      <p className={GH.cardMeta}>{item.subjectHe ?? "אבטיפוס · ללא שמירה"}</p>
                    </div>
                  </div>
                  <p className={`${GH.cardBlurb} flex-1`}>{item.blurbHe}</p>
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
