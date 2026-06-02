import Layout from "../components/Layout";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const whyCards = [
  {
    title: "למידה בקצב אישי",
    text: "כל תלמיד מתקדם לפי היכולת שלו, עם תרגול שמתאים לרמה ולנושאים שבהם הוא צריך חיזוק.",
  },
  {
    title: "תמונה ברורה להורים",
    text: "הדוחות עוזרים להבין איפה הילד מצליח, איפה הוא מתקשה, ומה כדאי לתרגל בהמשך.",
  },
  {
    title: "חוויה נעימה לילדים",
    text: "האתר משלב תרגול, משחקים ועיצוב ידידותי כדי לעודד התמדה ולמידה חיובית.",
  },
];

const funGamesCards = [
  {
    title: "משחקים חווייתיים",
    text: "משחקים שמוסיפים עניין וכיף, ומעודדים את הילדים להמשיך להתאמן.",
  },
  {
    title: "חוויה חברתית",
    text: "אפשרות למשחקי חברה ותחרות חיובית שמחברת בין ילדים בצורה נעימה.",
  },
  {
    title: "מוטיבציה ללמידה",
    text: "שילוב של תרגול, ניקוד, משחקים ואתגרים שמחזק רצון להתקדם.",
  },
];

const siteFeatures = [
  { phase: "תרגול לפי מקצועות", text: "מתמטיקה, גאומטריה, עברית, אנגלית, מדעים ומולדת/גאוגרפיה." },
  { phase: "כיתות א׳–ו׳ ורמות קושי", text: "תרגול מותאם לפי שכבת גיל, נושא ורמה, כדי לאפשר התקדמות הדרגתית וברורה לכל תלמיד." },
  { phase: "דוחות להורים", text: "סיכום ברור של ביצועים, טעויות, חוזקות ונקודות לשיפור." },
  { phase: "משחקים וחוויה חברתית", text: "משחקים אישיים ומשחקי חברה שנועדו להוסיף כיף, התמדה ומוטיבציה ללמידה." },
];

export default function About() {
  return (
    <Layout page="about">
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

      <motion.main
        className="relative min-h-screen flex flex-col items-center text-white p-0 m-0 overflow-x-hidden pt-0 mt-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 bg-black/50 z-10" />

        <div
          dir="rtl"
          className="relative z-20 w-full max-w-6xl p-4 sm:p-6 rounded-xl"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
            <div className="flex-shrink-0">
              <Image
                src="/images/lio.png"
                alt="ליאו - סביבת לימוד חכמה לילדים"
                width={300}
                height={300}
                className="rounded-2xl border-2 border-amber-400/60 shadow-lg"
              />
            </div>

            <div className="text-center md:text-right max-w-xl flex-1">
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent leading-tight"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
              >
                אודות ליאו – לומדים, מתרגלים ומתקדמים
              </motion.h1>

              <p className="text-base sm:text-lg md:text-xl mb-4 text-white/90 text-right">
                ברוכים הבאים לליאו – סביבת למידה חכמה בעברית, שנבנתה כדי לעזור לתלמידים לתרגל, להבין ולהתקדם בקצב שמתאים להם.
              </p>

              <p className="text-base sm:text-lg md:text-xl mb-4 text-white/90 text-right">
                האתר מותאם לתלמידי כיתות א׳–ו׳, עם תרגול לפי מקצוע, כיתה, נושא ורמת קושי. כך כל תלמיד יכול להתחיל מהמקום שמתאים לו, להתקדם בהדרגה, ולחזק את הנושאים שבהם הוא צריך יותר ביטחון.
              </p>

              <p className="text-base sm:text-lg md:text-xl text-white/85 text-right">
                המטרה שלנו היא להפוך את הלמידה לחוויה ברורה, נעימה ומדויקת יותר: פחות ניחושים, פחות תסכול, ויותר הבנה אמיתית של מה הילד כבר יודע ומה עדיין צריך חיזוק.
              </p>
            </div>
          </div>

          <section className="mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent">
              המשימה שלנו
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-4 text-right">
              המשימה שלנו היא לעזור לתלמידים לבנות ביטחון בלמידה, לחזק מיומנויות בסיסיות ומתקדמות, ולתת להורים תמונה ברורה יותר על ההתקדמות של הילד.
            </p>
            <p className="text-base sm:text-lg md:text-xl text-white/85 max-w-3xl mx-auto text-right">
              המערכת משלבת תרגול, משחקיות, דוחות להורים ותובנות חכמות, כדי ליצור תהליך למידה שמרגיש אישי, מסודר ומעודד.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center bg-gradient-to-r from-teal-200 to-amber-200 bg-clip-text text-transparent">
              גם לומדים וגם נהנים
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-4 text-right">
              בנוסף לתרגול הלימודי, האתר כולל גם משחקי חברה ומשחקים חווייתיים שנועדו להוסיף כיף, מוטיבציה והנאה לתהליך הלמידה. המטרה היא שילדים לא ירגישו שהם רק ‘עושים שיעורים’, אלא נכנסים לסביבה שמאפשרת להם ללמוד, לשחק, להתחרות בצורה חיובית וליהנות.
            </p>
            <p className="text-base sm:text-lg md:text-xl text-white/85 max-w-3xl mx-auto mb-6 text-right">
              חלק מהמשחקים מיועדים לחוויה אישית, וחלקם יכולים להתפתח למשחקים מרובי משתתפים – כדי לאפשר לילדים לשחק יחד, לשתף פעולה, להתחרות בכיף ולחזק התמדה דרך חוויה חברתית.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {funGamesCards.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  className="bg-black/50 border border-white/10 p-6 rounded-xl shadow-md text-right"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-amber-200 mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-white/85">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-amber-200 to-teal-300 bg-clip-text text-transparent">
              למה זה חשוב?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {whyCards.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  className="bg-black/50 border border-white/10 p-6 rounded-xl shadow-md text-right"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-amber-200 mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-white/85">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-teal-200 to-amber-200 bg-clip-text text-transparent">
              מה תמצאו באתר?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center mb-8">
              {siteFeatures.map((phase, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  className="p-6 bg-black/50 border border-white/10 rounded-xl shadow-md text-right"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-amber-200 mb-2">{phase.phase}</h3>
                  <p className="text-sm sm:text-base text-white/85">{phase.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 text-center">
              <Link href="/student/login">
                <button
                  type="button"
                  className="bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 px-8 py-4 rounded-xl text-base sm:text-lg font-bold text-black hover:scale-105 transition w-full sm:w-auto min-w-[200px]"
                >
                  להתחיל ללמוד
                </button>
              </Link>
              <Link href="/parent/login">
                <button
                  type="button"
                  className="bg-white/10 border border-white/25 hover:bg-white/20 px-8 py-4 rounded-xl text-base sm:text-lg font-bold text-white hover:scale-105 transition w-full sm:w-auto min-w-[200px]"
                >
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
