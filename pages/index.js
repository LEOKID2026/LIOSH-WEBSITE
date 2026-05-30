import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Link from "next/link";
import InstallAppPrompt from "../components/InstallAppPrompt";
import InstallAppButton from "../components/InstallAppButton";

const PORTAL_CARDS = [
  {
    key: "student",
    title: "פורטל תלמידים",
    emoji: "🎒",
    gradient: "from-amber-500/60 to-rose-600/70",
    authAware: true,
  },
  {
    key: "parent",
    title: "פורטל הורים",
    emoji: "👨‍👩‍👧‍👦",
    gradient: "from-emerald-500/60 to-teal-600/70",
    href: "/parent/login",
  },
  {
    key: "teacher",
    title: "פורטל מורים",
    emoji: "📋",
    gradient: "from-sky-500/60 to-indigo-600/70",
    href: "/teacher/login",
  },
];

function cardGridClass(key) {
  if (key === "student") return "col-span-2 lg:col-span-1";
  return "col-span-1";
}

export default function HomePage() {
  const router = useRouter();
  const [studentPortalBusy, setStudentPortalBusy] = useState(false);

  const goStudentPortal = async () => {
    setStudentPortalBusy(true);
    try {
      const res = await fetch("/api/student/me", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.student?.id) {
        await router.push("/student/home");
      } else {
        await router.push("/student/login");
      }
    } catch {
      await router.push("/student/login");
    } finally {
      setStudentPortalBusy(false);
    }
  };

  return (
    <Layout homepage>
      <InstallAppPrompt />
      <div
        className="max-w-5xl mx-auto px-3 pt-3.5 pb-3 md:px-4 md:py-6 flex flex-col flex-1 min-h-0 w-full justify-between md:min-h-[calc(100vh-9.5rem)] md:justify-center md:flex-initial gap-5 md:gap-7"
        dir="rtl"
      >
        <section className="text-center space-y-2.5 md:space-y-4 mt-1.5 mb-0.5 md:mt-0 md:mb-0">
          <p className="inline-flex items-center gap-2 px-3 py-1 md:py-1.5 rounded-full bg-white/10 text-xs md:text-xs tracking-[0.2em] md:tracking-[0.25em] uppercase text-amber-300 font-semibold">
            כיף · בטוח · חינוכי
          </p>
          <h1 className="text-[1.75rem] md:text-4xl lg:text-5xl font-black leading-tight">
            ברוכים הבאים ל־<span className="text-amber-300">LEO KIDS</span>
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed md:leading-normal px-1">
            עולם קטן של מיני־משחקים ופעילויות לימוד לילדים: ריצה, טיסה, חידות
            ותרגול במתמטיקה, גיאומטריה ואנגלית — הכול במקום אחד.
          </p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-x-2.5 gap-y-3.5 md:gap-5">
          {PORTAL_CARDS.map((card) => {
            const inner = (
              <div className="h-full rounded-2xl bg-black/60 flex flex-col items-center justify-center text-center p-4 md:p-5 min-h-[118px] md:min-h-[152px]">
                <div className="text-3xl md:text-4xl mb-2 md:mb-3">{card.emoji}</div>
                <h2 className="text-lg md:text-xl font-bold leading-snug">{card.title}</h2>
                {card.authAware && studentPortalBusy ? (
                  <span className="mt-1 text-xs text-white/60">טוען...</span>
                ) : null}
              </div>
            );

            const shellClass = `group rounded-2xl bg-gradient-to-br ${card.gradient} p-[1px] w-full ${cardGridClass(card.key)}`;

            if (card.authAware) {
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={studentPortalBusy}
                  onClick={() => void goStudentPortal()}
                  className={`${shellClass} text-right disabled:opacity-60 disabled:pointer-events-none`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link key={card.key} href={card.href} className={shellClass}>
                {inner}
              </Link>
            );
          })}
        </section>

        <div className="flex justify-center shrink-0 pt-1 md:pt-0">
          <InstallAppButton className="" />
        </div>
      </div>
    </Layout>
  );
}
