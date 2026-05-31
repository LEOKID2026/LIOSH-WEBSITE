import Layout from "../components/Layout";
import Link from "next/link";
import { useIOSViewportFix } from "../hooks/useIOSViewportFix";

const GAME_HUB_CARDS = [
  {
    key: "regular",
    title: "משחקים רגילים",
    emoji: "🎮",
    blurb: "משחקי ליאו הקלאסיים — ריצה, טיסה, חידות ועוד.",
    href: "/game",
    gradient: "from-sky-500/60 to-indigo-600/70",
  },
  {
    key: "offline",
    title: "משחקים לא מקוונים",
    emoji: "🔌",
    blurb: "משחקים על אותו מכשיר — גם בלי אינטרנט.",
    href: "/offline",
    gradient: "from-emerald-500/60 to-teal-600/70",
  },
  {
    key: "online",
    title: "משחקי אונליין",
    emoji: "🌐",
    blurb: "חדרי משחק מרובי משתתפים עם חברים ושחקנים אחרים.",
    href: "/student/arcade",
    gradient: "from-amber-500/60 to-rose-600/70",
  },
];

export default function GamesHubPage() {
  useIOSViewportFix();

  return (
    <Layout>
      <div
        className="max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden"
        dir="rtl"
      >
        <div className="mb-4 md:mb-6">
          <Link
            href="/student/home"
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition"
          >
            חזרה לפורטל תלמיד
          </Link>
        </div>

        <header className="text-center space-y-2 md:space-y-3 mb-5 md:mb-8">
          <p className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/10 text-xs md:text-sm tracking-wider text-amber-300 font-semibold">
            🎯 בחרו סוג משחק
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">
            משחקים
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto leading-relaxed px-1">
            בחרו את סוג החוויה שמתאימה לכם — משחקי ליאו, משחקים ללא אינטרנט, או משחקים מקוונים.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {GAME_HUB_CARDS.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className={`group rounded-2xl bg-gradient-to-br ${card.gradient} p-[1px] block text-right min-h-[9.5rem] md:min-h-[11rem]`}
            >
              <div className="h-full rounded-2xl bg-black/60 p-4 md:p-5 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="text-3xl md:text-4xl leading-none" aria-hidden>
                    {card.emoji}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white leading-snug">
                    {card.title}
                  </h2>
                  <p className="text-sm text-white/75 leading-relaxed">{card.blurb}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200 group-hover:-translate-x-1 transition">
                  <span aria-hidden>←</span>
                  כניסה
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </Layout>
  );
}
