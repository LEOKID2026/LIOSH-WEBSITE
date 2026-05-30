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
        className="max-w-5xl mx-auto px-4 py-5 md:py-6 flex flex-col justify-center gap-6 md:gap-7 min-h-[calc(100vh-9.5rem)]"
        dir="rtl"
      >
        <section className="text-center space-y-3 md:space-y-4">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs tracking-[0.25em] uppercase text-amber-300 font-semibold">
            כיף · בטוח · חינוכי
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
            ברוכים הבאים ל־<span className="text-amber-300">LEO KIDS</span>
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-white/70 max-w-2xl mx-auto">
            עולם קטן של מיני־משחקים ופעילויות לימוד לילדים: ריצה, טיסה, חידות
            ותרגול במתמטיקה, גיאומטריה ואנגלית — הכול במקום אחד.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {PORTAL_CARDS.map((card) => {
            const inner = (
              <div className="h-full rounded-2xl bg-black/60 p-4 md:p-5 flex flex-col items-center justify-center text-center min-h-[140px] md:min-h-[152px]">
                <div className="text-3xl md:text-4xl mb-3">{card.emoji}</div>
                <h2 className="text-lg md:text-xl font-bold">{card.title}</h2>
                {card.authAware && studentPortalBusy ? (
                  <span className="mt-2 text-xs text-white/60">טוען...</span>
                ) : null}
              </div>
            );

            if (card.authAware) {
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={studentPortalBusy}
                  onClick={() => void goStudentPortal()}
                  className={`group rounded-2xl bg-gradient-to-br ${card.gradient} p-[1px] text-right w-full disabled:opacity-60 disabled:pointer-events-none`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link
                key={card.key}
                href={card.href}
                className={`group rounded-2xl bg-gradient-to-br ${card.gradient} p-[1px]`}
              >
                {inner}
              </Link>
            );
          })}
        </section>

        <div className="flex justify-center pt-1">
          <InstallAppButton className="" />
        </div>
      </div>
    </Layout>
  );
}
