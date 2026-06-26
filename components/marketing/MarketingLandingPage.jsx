import Head from "next/head";
import Link from "next/link";
import Layout from "../Layout";
import MarketingFeatureCard from "./MarketingFeatureCard";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

const ACCENT = {
  kids: {
    classicCardGradient: "from-violet-500/60 to-fuchsia-700/70",
    brightCardGradient: "from-violet-400/80 to-fuchsia-500/80",
    heroBadgeClassic: "bg-white/10 text-fuchsia-300",
    heroBadgeBright: "border border-violet-300 bg-violet-100 text-violet-900",
    heroTitleBright: "text-violet-700",
    heroTitleClassic: "from-violet-300 via-fuchsia-200 to-rose-300",
    primaryBtnBright:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-300/40 hover:brightness-105",
    primaryBtnClassic:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110",
    secondaryBtnBright:
      "border-2 border-violet-400 bg-white text-violet-800 hover:bg-violet-50",
    secondaryBtnClassic:
      "border border-white/25 bg-white/10 text-white hover:bg-white/15",
  },
  parents: {
    classicCardGradient: "from-cyan-500/60 to-blue-700/70",
    brightCardGradient: "from-cyan-400/80 to-sky-500/80",
    heroBadgeClassic: "bg-white/10 text-cyan-300",
    heroBadgeBright: "border border-cyan-300 bg-cyan-100 text-cyan-900",
    heroTitleBright: "text-sky-700",
    heroTitleClassic: "from-cyan-300 via-sky-200 to-blue-300",
    primaryBtnBright:
      "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-lg shadow-cyan-300/40 hover:brightness-105",
    primaryBtnClassic:
      "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30 hover:brightness-110",
    secondaryBtnBright:
      "border-2 border-cyan-400 bg-white text-cyan-800 hover:bg-cyan-50",
    secondaryBtnClassic:
      "border border-white/25 bg-white/10 text-white hover:bg-white/15",
  },
  teachers: {
    classicCardGradient: "from-orange-500/60 to-amber-600/70",
    brightCardGradient: "from-orange-400/80 to-amber-500/80",
    heroBadgeClassic: "bg-white/10 text-amber-300",
    heroBadgeBright: "border border-amber-300 bg-amber-100 text-amber-900",
    heroTitleBright: "text-amber-700",
    heroTitleClassic: "from-amber-300 via-orange-200 to-yellow-300",
    primaryBtnBright:
      "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-300/40 hover:brightness-105",
    primaryBtnClassic:
      "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-900/30 hover:brightness-110",
    secondaryBtnBright:
      "border-2 border-amber-400 bg-white text-amber-800 hover:bg-amber-50",
    secondaryBtnClassic:
      "border border-white/25 bg-white/10 text-white hover:bg-white/15",
  },
};

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CtaButton({ cta, accent, isBright, size = "lg" }) {
  const sizeClass =
    size === "lg"
      ? "w-full sm:w-auto min-h-[48px] px-6 py-3 text-base font-bold rounded-2xl"
      : "min-h-[40px] px-4 py-2 text-sm font-semibold rounded-xl";

  const primaryClass = isBright ? accent.primaryBtnBright : accent.primaryBtnClassic;
  const secondaryClass = isBright ? accent.secondaryBtnBright : accent.secondaryBtnClassic;

  if (cta.scrollTo) {
    return (
      <button
        type="button"
        onClick={() => scrollToSection(cta.scrollTo)}
        className={`inline-flex items-center justify-center ${sizeClass} ${secondaryClass} transition`}
      >
        {cta.label}
      </button>
    );
  }

  if (cta.variant === "secondary") {
    return (
      <Link href={cta.href} className={`inline-flex items-center justify-center ${sizeClass} ${secondaryClass} transition`}>
        {cta.label}
      </Link>
    );
  }

  return (
    <Link href={cta.href} className={`inline-flex items-center justify-center ${sizeClass} ${primaryClass} transition`}>
      {cta.label}
    </Link>
  );
}

/**
 * Shared marketing landing page shell (RTL Hebrew).
 * @param {{ audience: 'kids' | 'parents' | 'teachers', content: import('../../data/marketing/landing-pages.he').MarketingPageContent }} props
 */
export default function MarketingLandingPage({ audience, content }) {
  const { theme, isBright } = useStudentTheme();
  const accent = ACCENT[audience];
  const cardGradient = isBright ? accent.brightCardGradient : accent.classicCardGradient;

  const sectionTitleClass = isBright
    ? "text-xl font-black text-slate-900 md:text-2xl"
    : "text-xl font-black text-white md:text-2xl";

  const sectionTextClass = isBright ? "text-slate-600" : "text-white/75";

  const panelClass = isBright
    ? "rounded-2xl border border-slate-200/80 bg-white/70 p-5 md:p-6 shadow-sm"
    : "rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6";

  return (
    <>
      <Head>
        <title>{content.pageTitle}</title>
        {content.metaDescription ? (
          <meta name="description" content={content.metaDescription} />
        ) : null}
      </Head>
      <Layout studentTheme={theme} studentShell="home">
        <div dir="rtl" lang="he" className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12 space-y-12 md:space-y-16">
          {/* Hero */}
          <header className="space-y-5 text-center">
            <p
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${
                isBright ? accent.heroBadgeBright : accent.heroBadgeClassic
              }`}
            >
              {content.badge}
            </p>
            <h1
              className={`text-3xl font-black leading-tight md:text-4xl lg:text-5xl ${
                isBright
                  ? accent.heroTitleBright
                  : `bg-gradient-to-r ${accent.heroTitleClassic} bg-clip-text text-transparent`
              }`}
            >
              {content.hero.title}
            </h1>
            <p
              className={`mx-auto max-w-2xl text-sm leading-relaxed md:text-base lg:text-lg ${sectionTextClass}`}
            >
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <CtaButton cta={content.hero.primaryCta} accent={accent} isBright={isBright} />
              {content.hero.secondaryCta ? (
                <CtaButton
                  cta={{ ...content.hero.secondaryCta, variant: "secondary" }}
                  accent={accent}
                  isBright={isBright}
                />
              ) : null}
            </div>
          </header>

          {/* Benefits */}
          <section id="benefits" className="scroll-mt-24 space-y-6">
            {content.benefits.title ? (
              <h2 className={`text-center ${sectionTitleClass}`}>{content.benefits.title}</h2>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.benefits.items.map((item) => (
                <MarketingFeatureCard
                  key={item.title}
                  title={item.title}
                  text={item.text}
                  emoji={item.emoji}
                  gradientClass={cardGradient}
                  isBright={isBright}
                />
              ))}
            </div>
          </section>

          {/* How it works / info blocks */}
          {content.infoSections?.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className={sectionTitleClass}>{section.title}</h2>
              {section.intro ? (
                <p className={`text-sm md:text-base ${sectionTextClass}`}>{section.intro}</p>
              ) : null}
              {section.steps ? (
                <ol className={`space-y-3 ${panelClass}`}>
                  {section.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm md:text-base">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isBright
                            ? "bg-slate-900 text-white"
                            : "bg-amber-400/90 text-black"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={isBright ? "text-slate-700" : "text-white/85"}>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {section.bullets ? (
                <ul className={`space-y-2.5 ${panelClass}`}>
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className={`flex gap-2 text-sm md:text-base ${
                        isBright ? "text-slate-700" : "text-white/85"
                      }`}
                    >
                      <span className={isBright ? "text-emerald-600" : "text-emerald-400"} aria-hidden>
                        ✓
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.body ? (
                <p className={`text-sm md:text-base leading-relaxed ${sectionTextClass}`}>
                  {section.body}
                </p>
              ) : null}
            </section>
          ))}

          {/* Closing */}
          <section className={`space-y-5 text-center ${panelClass}`}>
            <h2 className={sectionTitleClass}>{content.closing.title}</h2>
            <p className={`mx-auto max-w-2xl text-sm md:text-base ${sectionTextClass}`}>
              {content.closing.text}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <CtaButton cta={content.closing.primaryCta} accent={accent} isBright={isBright} />
              {content.closing.secondaryCta ? (
                <CtaButton
                  cta={{ ...content.closing.secondaryCta, variant: "secondary" }}
                  accent={accent}
                  isBright={isBright}
                  size="sm"
                />
              ) : null}
            </div>
          </section>

          <p className="pb-4 text-center">
            <Link
              href="/"
              className={`text-sm font-medium underline-offset-4 hover:underline ${
                isBright ? "text-slate-500 hover:text-slate-700" : "text-white/50 hover:text-white/80"
              }`}
            >
              חזרה לעמוד הבית
            </Link>
          </p>
        </div>
      </Layout>
    </>
  );
}
