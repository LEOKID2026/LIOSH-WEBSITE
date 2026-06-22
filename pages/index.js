import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Link from "next/link";
import InstallAppPrompt from "../components/InstallAppPrompt";
import InstallAppButton from "../components/InstallAppButton";
import { ParentHomeInstallLinkButton } from "../components/InstallParentAppButton";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";

const PORTAL_CARDS = [
  {
    key: "student",
    title: "עולם הילדים",
    emoji: "🎒",
    classicGradient: "from-amber-500/60 to-rose-600/70",
    /** Full saturated face — own palette for bright mode (not classic tints). */
    brightFace:
      "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-700 text-white shadow-lg shadow-fuchsia-300/45",
    /** Same 🎒 — shifted to teal/green so it reads on the purple face. */
    brightEmojiFilter:
      "[filter:hue-rotate(118deg)_saturate(2.5)_brightness(1.12)_contrast(1.05)]",
    authAware: true,
  },
  {
    key: "parent",
    title: "פורטל הורים",
    emoji: "👨‍👩‍👧‍👦",
    classicGradient: "from-emerald-500/60 to-teal-600/70",
    brightFace:
      "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-700 text-white shadow-lg shadow-cyan-300/45",
    href: "/parent/login",
  },
  {
    key: "teacher",
    title: "פורטל מורים",
    emoji: "📋",
    classicGradient: "from-sky-500/60 to-indigo-600/70",
    brightFace:
      "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-300/45",
    href: "/teacher/login",
  },
];

const CARD_BODY =
  "flex h-full min-h-[118px] w-full flex-col items-center justify-center rounded-2xl p-4 text-center md:min-h-[152px] md:p-5";

function cardGridClass(key) {
  if (key === "student") return "col-span-2 lg:col-span-1";
  return "col-span-1";
}

export default function HomePage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
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
    <Layout homepage studentTheme={theme} studentShell="home">
      <InstallAppPrompt />
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col items-stretch justify-between gap-5 overflow-hidden px-3 pb-3 pt-3.5 md:min-h-[calc(100vh-9.5rem)] md:justify-center md:gap-7 md:px-4 md:py-6 md:flex-initial"
        dir="rtl"
      >
        <section className="mt-1.5 shrink-0 space-y-2.5 text-center md:mt-0 md:space-y-4">
          <p
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] md:tracking-[0.25em] ${
              isBright
                ? "border border-green-400 bg-green-300 text-blue-800"
                : "bg-white/10 text-amber-300"
            }`}
          >
            לומדים · מתרגלים · מתקדמים
          </p>
          <h1
            className={`text-[1.75rem] font-black leading-tight md:text-4xl lg:text-5xl ${
              isBright ? "text-slate-900" : "text-white"
            }`}
          >
            ברוכים הבאים אל{" "}
            <span className={isBright ? "text-red-600" : "text-amber-300"}>LEO KIDS</span>
          </h1>
          <p
            className={`mx-auto max-w-2xl px-1 text-sm leading-relaxed md:text-base md:leading-normal lg:text-lg ${
              isBright ? "text-slate-600" : "text-white/70"
            }`}
          >
            אתר לימודים לילדים עם תרגול חכם, פעילויות קצרות ומיני משחקים — מתמטיקה,
            גאומטריה, אנגלית ועוד. הכל במקום אחד.
          </p>
        </section>

        <section className="grid shrink-0 grid-cols-2 gap-x-2.5 gap-y-3.5 md:gap-5 lg:grid-cols-3">
          {PORTAL_CARDS.map((card) => {
            const gridClass = cardGridClass(card.key);

            const cardContent = (
              <>
                <div className="mb-2 text-3xl md:mb-3 md:text-4xl">
                  <span
                    className={
                      isBright && card.brightEmojiFilter ? card.brightEmojiFilter : undefined
                    }
                  >
                    {card.emoji}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-snug md:text-xl">{card.title}</h2>
                {card.authAware && studentPortalBusy ? (
                  <span className="mt-1 text-xs text-white/80">טוען...</span>
                ) : null}
              </>
            );

            if (isBright) {
              const brightClass = `${CARD_BODY} ${card.brightFace} ${gridClass}`;
              if (card.authAware) {
                return (
                  <button
                    key={card.key}
                    type="button"
                    disabled={studentPortalBusy}
                    onClick={() => void goStudentPortal()}
                    className={`${brightClass} text-right disabled:opacity-60 disabled:pointer-events-none`}
                  >
                    {cardContent}
                  </button>
                );
              }
              return (
                <Link key={card.key} href={card.href} className={brightClass}>
                  {cardContent}
                </Link>
              );
            }

            const shellClass = `group rounded-2xl bg-gradient-to-br ${card.classicGradient} p-[1px] w-full ${gridClass}`;
            const inner = (
              <div className={`${CARD_BODY} bg-black/60 text-white`}>{cardContent}</div>
            );

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

        <section className="flex shrink-0 flex-col items-center gap-3 px-1 sm:flex-row sm:justify-center sm:gap-4">
          <InstallAppButton className="" label="התקנת אפליקציה לילדים" />
          <ParentHomeInstallLinkButton />
        </section>
      </div>
    </Layout>
  );
}
