import Layout from "../components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const CONTACT_EMAIL = "leokid2026@gmail.com";
const INSTAGRAM_URL = "https://www.instagram.com/leotheshiba21";
/** כשיש קישור — ממלאים כאן */
const FACEBOOK_URL = "";
const X_URL = "";

const btnBase =
  "px-5 py-2.5 rounded-xl transition hover:scale-105 text-center shadow-md text-sm sm:text-base font-semibold";

const faqs = [
  {
    q: "למי האתר מיועד?",
    a: "האתר מיועד לתלמידים שרוצים לתרגל ולהתקדם, ולהורים שרוצים לקבל תמונה ברורה יותר על ההתקדמות, החוזקות והנושאים שדורשים חיזוק.",
  },
  {
    q: "באילו מקצועות אפשר לתרגל?",
    a: "האתר כולל תרגול במקצועות כמו מתמטיקה, גאומטריה, עברית, אנגלית, מדעים ומולדת/גאוגרפיה, בהתאם לשלבי הפיתוח והתוכן הזמין באתר.",
  },
  {
    q: "מה ההורים יכולים לראות?",
    a: "ההורים יכולים לקבל דוחות שמציגים ביצועים, טעויות חוזרות, נקודות חוזק ונושאים שכדאי להמשיך לתרגל.",
  },
  {
    q: "האם האתר מתאים גם לילדים שצריכים חיזוק?",
    a: "כן. המטרה היא לאפשר תרגול הדרגתי וברור, כך שכל תלמיד יוכל להתקדם בקצב שמתאים לו ולחזק את הנושאים שבהם הוא מתקשה.",
  },
  {
    q: "האם יש באתר גם משחקים?",
    a: "כן. לצד התרגול הלימודי יש גם משחקים וחוויות מהנות שנועדו להוסיף מוטיבציה, עניין והתמדה בלמידה.",
  },
  {
    q: "איך אפשר לדווח על תקלה או לשלוח רעיון?",
    a: "אפשר לפנות אלינו דרך אפשרויות יצירת הקשר בעמוד הזה. נשמח לקבל הערות, רעיונות ודיווחים שיעזרו לשפר את האתר.",
  },
];

export default function Contact() {
  const [activeAnswer, setActiveAnswer] = useState(null);

  const handleClose = () => setActiveAnswer(null);

  return (
    <Layout page="contact">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover -z-10 pointer-events-none"
        aria-hidden
      >
        <source src="/videos/contact-bg.mp4" type="video/mp4" />
      </video>

      <div
        className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 -z-10 pointer-events-none"
        aria-hidden
      />

      <div
        dir="rtl"
        className="relative w-full max-w-4xl mx-auto flex flex-col items-center text-white px-4 sm:px-6 pt-4 pb-10"
      >
        <motion.h1
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-center drop-shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-rose-300 bg-clip-text text-transparent">
            צור קשר
          </span>
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg text-white/80 max-w-2xl text-center mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          יש לכם שאלה, רעיון, הערה או תקלה? נשמח לשמוע מכם ולעזור. אפשר לפנות אלינו בנושאים שקשורים ללמידה, לחשבון התלמיד, לדוחות ההורים, למשחקים או לחוויית השימוש באתר.
        </motion.p>

        <div className="flex flex-wrap justify-center gap-3 mb-10 w-full">
          <motion.a
            href={`mailto:${CONTACT_EMAIL}`}
            aria-label={`שליחת אימייל לכתובת ${CONTACT_EMAIL}`}
            className={`${btnBase} bg-amber-500/90 hover:bg-amber-400 border border-amber-300/40 text-black`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.05 }}
          >
            📧 אימייל
          </motion.a>

          <motion.a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="פתיחת עמוד האינסטגרם בחלון חדש"
            className={`${btnBase} bg-pink-600/90 hover:bg-pink-500 border border-pink-400/30 text-white`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            whileHover={{ scale: 1.05 }}
          >
            📷 אינסטגרם
          </motion.a>

          {FACEBOOK_URL ? (
            <motion.a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="פתיחת עמוד הפייסבוק בחלון חדש"
              className={`${btnBase} bg-blue-600/90 hover:bg-blue-500 border border-blue-400/30 text-white`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              📘 פייסבוק
            </motion.a>
          ) : (
            <motion.button
              type="button"
              aria-label="פייסבוק"
              className={`${btnBase} bg-blue-600/90 hover:bg-blue-500 border border-blue-400/30 text-white`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              📘 פייסבוק
            </motion.button>
          )}

          {X_URL ? (
            <motion.a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="פתיחת עמוד X בחלון חדש"
              className={`${btnBase} bg-neutral-800/90 hover:bg-neutral-700 border border-white/25 text-white`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              whileHover={{ scale: 1.05 }}
            >
              🐦 X
            </motion.a>
          ) : (
            <motion.button
              type="button"
              aria-label="X"
              className={`${btnBase} bg-neutral-800/90 hover:bg-neutral-700 border border-white/25 text-white`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              whileHover={{ scale: 1.05 }}
            >
              🐦 X
            </motion.button>
          )}
        </div>

        <motion.h2
          className="text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-amber-200 to-teal-200 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          שאלות נפוצות
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pb-8">
          {faqs.map((faq, i) => (
            <motion.button
              key={faq.q}
              type="button"
              onClick={() => setActiveAnswer(faq.a)}
              className="px-4 py-3 bg-black/50 backdrop-blur-sm border border-white/15 rounded-xl text-amber-100 font-semibold text-sm sm:text-base text-right hover:bg-black/65 hover:border-amber-400/40 transition"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
            >
              {faq.q}
            </motion.button>
          ))}
        </div>

        <motion.p
          className="text-sm text-white/60 text-center max-w-xl mx-auto pb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          לפניות בנושא פרטיות, מחיקת נתונים או נגישות —{" "}
          <Link href="/privacy" className="text-amber-300 underline">
            מדיניות פרטיות
          </Link>
          ,{" "}
          <Link href="/data-deletion" className="text-amber-300 underline">
            מחיקת נתונים
          </Link>
          ,{" "}
          <Link href="/accessibility" className="text-amber-300 underline">
            נגישות
          </Link>
          .
        </motion.p>
      </div>

      {activeAnswer && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          dir="rtl"
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-md min-h-[260px] rounded-2xl border border-white/20 overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
              style={{ backgroundImage: "url('/images/faq.png')" }}
              aria-hidden
            />
            <div className="relative bg-black/75 backdrop-blur-sm p-6 sm:p-8 min-h-[260px] flex flex-col text-right">
              <button
                type="button"
                onClick={handleClose}
                aria-label="סגור חלון תשובה"
                className="self-start mb-4 bg-amber-500/90 hover:bg-amber-400 text-black px-3 py-1.5 text-sm rounded-lg font-bold"
              >
                סגור
              </button>
              <p className="text-base sm:text-lg text-white/95 leading-relaxed flex-1">
                {activeAnswer}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
