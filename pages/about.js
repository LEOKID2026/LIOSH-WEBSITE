import Layout from "../components/Layout";
import PageSeo from "../components/seo/PageSeo";
import { getPublicPageSeo } from "../lib/site/public-page-seo.he";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { useSharedShellUi } from "../hooks/useSharedShellUi.js";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const whyCards = [
  {
    title: "למידה בקצב אישי",
    text: "כל ילד מתקדם לפי היכולת שלו, עם תרגול שמתאים לרמה ולנושאים שבהם הוא צריך חיזוק.",
  },
  {
    title: "תמונה ברורה להורים",
    text: "הדוחות עוזרים להבין איפה הילד מצליח, איפה הוא מתקשה, ומה כדאי לתרגל בהמשך.",
  },
  {
    title: "חוויה נעימה לילדים",
    text: "האתר משלב תרגול, משחקים, מטבעות, קלפים ועיצוב ידידותי כדי לעודד התמדה ולמידה חיובית.",
  },
];

const funGamesCards = [
  {
    title: "משחקים חווייתיים",
    text: "משחקים שמוסיפים עניין וכיף, ומעודדים את הילדים להמשיך להתאמן.",
  },
  {
    title: "חוויה חברתית",
    text: "משחקים עם חברים וחוויות חברתיות לפי מה שפתוח באתר, בצורה נעימה וחיובית.",
  },
  {
    title: "מוטיבציה ללמידה",
    text: "שילוב של תרגול, מטבעות, קלפים, משחקים ואתגרים שמעודדים להמשיך.",
  },
];

const siteFeatures = [
  { phase: "תרגול לפי מקצועות", text: "מתמטיקה, גאומטריה, עברית, אנגלית, מדעים, מולדת, גאוגרפיה והיסטוריה." },
  { phase: "כיתות א׳–ו׳ ורמות קושי", text: "תרגול מותאם לפי שכבת גיל, נושא ורמה, כדי לאפשר התקדמות הדרגתית וברורה לכל ילד/ה." },
  { phase: "דוחות להורים", text: "סיכום ברור של ביצועים, טעויות, חוזקות ונקודות לשיפור." },
  { phase: "משחקים וחוויה חברתית", text: "משחקים אישיים, משחקים חינוכיים, משחקים עם חברים, מטבעות וקלפים." },
];

const aboutSeo = getPublicPageSeo("about");

export default function About() {
  const { theme } = useStudentTheme();
  const { SP } = useSharedShellUi();

  return (
    <Layout page="about" studentTheme={theme} studentShell="home">
      <PageSeo
        title={aboutSeo.title}
        description={aboutSeo.description}
        canonicalPath={aboutSeo.canonicalPath}
      />
      {SP.showVideoBg ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/videos/about-bg.mp4" type="video/mp4" />
        </video>
      ) : null}

      <motion.main
        className={SP.aboutMain}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {SP.aboutVideoOverlay ? (
          <div className={SP.aboutVideoOverlay} aria-hidden />
        ) : null}

        <div dir="rtl" className="relative z-20 w-full max-w-6xl p-4 sm:p-6 rounded-xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
            <div className="flex-shrink-0">
              <Image
                src="/images/lio.png"
                alt="ליאו - סביבת לימוד חכמה לילדים"
                width={300}
                height={300}
                className={SP.imageBorder}
              />
            </div>

            <div className="text-center md:text-right max-w-xl flex-1">
              <motion.h1
                className={SP.h1}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
              >
                אודות ליאו – לומדים, מתרגלים ומתקדמים
              </motion.h1>

              <p className={SP.body}>
                ברוכים הבאים לליאו – סביבת למידה חכמה בעברית, שנבנתה כדי לעזור לילדים לתרגל, להבין ולהתקדם בקצב שמתאים להם.
              </p>

              <p className={SP.body}>
                האתר מיועד לילדים וילדות בכיתות א׳–ו׳, עם תרגול לפי מקצוע, כיתה, נושא ורמת קושי. כך כל ילד יכול להתחיל מהמקום שמתאים לו, להתקדם בהדרגה, ולחזק את הנושאים שבהם הוא צריך יותר ביטחון.
              </p>

              <p className={SP.bodyLast}>
                המטרה שלנו היא להפוך את הלמידה לחוויה ברורה, נעימה ומדויקת יותר: פחות ניחושים, פחות תסכול, ויותר הבנה אמיתית של מה הילד כבר יודע ומה עדיין צריך חיזוק.
              </p>
            </div>
          </div>

          <section className="mb-12 text-center">
            <h2 className={SP.h2}>המשימה שלנו</h2>
            <p className={SP.bodyCenter}>
              המשימה שלנו היא לעזור לילדים לבנות ביטחון בלמידה, לחזק מיומנויות בסיסיות ומתקדמות, ולתת להורים תמונה ברורה יותר על ההתקדמות של הילד.
            </p>
            <p className={SP.bodyCenterMuted}>
              המערכת משלבת תרגול, משחקיות, דוחות להורים וסיכומי התקדמות ברורים, כדי ליצור תהליך למידה שמרגיש אישי, מסודר ומעודד.
            </p>
          </section>

          <section className="mb-12">
            <h2 className={SP.h2Teal}>גם לומדים וגם נהנים</h2>
            <p className={SP.bodyCenter}>
              בנוסף לתרגול הלימודי, האתר כולל משחקים חינוכיים, משחקים חווייתיים, מטבעות וקלפים שנועדו להוסיף כיף, מוטיבציה והנאה לתהליך הלמידה. המטרה היא שילדים לא ירגישו שהם רק "עושים שיעורים", אלא נכנסים לעולם ילדים צבעוני שבו אפשר ללמוד, לשחק ולהתקדם בתחושה טובה.
            </p>
            <p className={`${SP.bodyCenterMuted} mb-6`}>
              יש משחקים אישיים, משחקים חינוכיים וגם אפשרות למשחקים עם חברים - לפי מה שפתוח וזמין באתר.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {funGamesCards.map((item, i) => (
                <motion.div key={i} whileHover={{ scale: 1.03 }} className={SP.card}>
                  <h3 className={SP.cardTitle}>{item.title}</h3>
                  <p className={SP.cardText}>{item.text}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className={SP.h2AmberTeal}>למה זה חשוב?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {whyCards.map((item, i) => (
                <motion.div key={i} whileHover={{ scale: 1.03 }} className={SP.card}>
                  <h3 className={SP.cardTitle}>{item.title}</h3>
                  <p className={SP.cardText}>{item.text}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <h2 className={SP.h2TealAmber}>מה תמצאו באתר?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center mb-8">
              {siteFeatures.map((phase, i) => (
                <motion.div key={i} whileHover={{ scale: 1.03 }} className={SP.card}>
                  <h3 className={SP.cardTitle}>{phase.phase}</h3>
                  <p className={SP.cardText}>{phase.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 text-center">
              <Link href="/student/login">
                <button
                  type="button"
                  className="bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 px-8 py-4 rounded-xl text-base sm:text-lg font-bold text-black hover:scale-105 transition w-full sm:w-auto min-w-[200px]"
                >
                  לעולם הילדים
                </button>
              </Link>
              <Link href="/parent/login">
                <button type="button" className={SP.secondaryCta}>
                  כניסת הורים
                </button>
              </Link>
            </div>
          </section>
        </div>
      </motion.main>
    </Layout>
  );
}
