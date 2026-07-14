import { useState } from "react";
import Link from "next/link";
import Layout from "../Layout";
import PageSeo from "../seo/PageSeo";
import MarketingFeatureCard from "./MarketingFeatureCard";
import PortalPwaInstallButton from "../pwa/PortalPwaInstallButton";
import ParentPromoVideo from "../parent/ParentPromoVideo";
import StudentPromoVideo from "../student/StudentPromoVideo";
import PublicSeoEntrySection from "../seo/PublicSeoEntrySection";
import StudentParentInviteModal from "../student/StudentParentInviteModal";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getPrivateTeacherLayoutProps } from "../../lib/teacher-ui/teacher-portal-theme.client.js";

const AUDIENCE_PORTAL = {
  kids: "student",
  parents: "parent",
  teachers: "teacher",
};

const AUDIENCE_CANONICAL_PATH = {
  kids: "/kids",
  parents: "/parents",
  teachers: "/teachers",
};

export const ACCENT = {
  kids: {
    cardGradientsClassic: [
      "from-violet-500/60 to-fuchsia-700/70",
      "from-amber-500/60 to-orange-600/70",
      "from-emerald-500/60 to-teal-600/70",
      "from-sky-500/60 to-indigo-600/70",
      "from-rose-500/60 to-pink-600/70",
      "from-yellow-500/60 to-amber-600/70",
    ],
    cardGradientsBright: [
      "from-violet-400/85 to-fuchsia-500/85",
      "from-amber-400/85 to-orange-500/85",
      "from-emerald-400/85 to-teal-500/85",
      "from-sky-400/85 to-blue-500/85",
      "from-rose-400/85 to-pink-500/85",
      "from-yellow-400/85 to-amber-500/85",
    ],
    stepBadgesBright: [
      "bg-violet-600 text-white",
      "bg-amber-500 text-white",
      "bg-emerald-500 text-white",
      "bg-sky-500 text-white",
    ],
    stepBadgesClassic: [
      "bg-fuchsia-400/90 text-black",
      "bg-amber-400/90 text-black",
      "bg-emerald-400/90 text-black",
      "bg-sky-400/90 text-black",
    ],
    classicCardGradient: "from-violet-500/60 to-fuchsia-700/70",
    brightCardGradient: "from-violet-400/80 to-fuchsia-500/80",
    heroBadgeClassic: "bg-white/10 text-amber-300",
    heroBadgeBright: "border border-green-400 bg-green-300 text-violet-900",
    heroTitleBright:
      "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent",
    heroTitleClassic: "from-amber-300 via-fuchsia-200 to-emerald-300",
    primaryBtnBright:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-lg shadow-fuchsia-300/40 hover:brightness-105",
    primaryBtnClassic:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-lg shadow-fuchsia-900/30 hover:brightness-110",
    secondaryBtnBright:
      "border-2 border-teal-400 bg-white text-teal-800 hover:bg-teal-50",
    secondaryBtnClassic:
      "border border-teal-400/45 bg-teal-500/10 text-teal-100 hover:bg-teal-500/20",
    installBtnBright:
      "bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 border-2 border-teal-400 text-violet-900 shadow-md shadow-amber-200/50 hover:from-amber-400 hover:via-yellow-400 hover:to-orange-300",
    installBtnClassic:
      "bg-gradient-to-r from-amber-400/90 via-yellow-400/85 to-orange-400/80 border border-amber-300/60 text-violet-950 shadow-lg shadow-amber-900/25 hover:brightness-110",
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
    installBtnBright:
      "bg-gradient-to-r from-cyan-100 via-sky-100 to-blue-100 border-2 border-cyan-400 text-cyan-900 shadow-md shadow-cyan-200/50 hover:from-cyan-200 hover:via-sky-200 hover:to-blue-200",
    installBtnClassic:
      "bg-gradient-to-r from-cyan-600/35 via-sky-600/30 to-blue-700/35 border border-cyan-400/55 text-cyan-100 shadow-lg shadow-cyan-950/25 hover:from-cyan-600/45 hover:to-blue-700/45",
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
    installBtnBright:
      "bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 border-2 border-amber-400 text-amber-900 shadow-md shadow-amber-200/50 hover:from-amber-200 hover:via-orange-200 hover:to-yellow-200",
    installBtnClassic:
      "bg-gradient-to-r from-orange-600/35 via-amber-600/30 to-yellow-600/35 border border-amber-400/55 text-amber-100 shadow-lg shadow-amber-950/25 hover:from-orange-600/45 hover:to-yellow-600/45",
  },
};

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getKidsCardGradient(accent, isBright, index) {
  const list = isBright ? accent.cardGradientsBright : accent.cardGradientsClassic;
  return list[index % list.length];
}

function getKidsStepBadge(accent, isBright, index) {
  const list = isBright ? accent.stepBadgesBright : accent.stepBadgesClassic;
  return list[index % list.length];
}

function getMarketingLayoutProps(audience, theme) {
  if (audience === "teachers") {
    return getPrivateTeacherLayoutProps(theme);
  }
  const base = { studentTheme: theme, studentShell: "home" };
  if (audience === "parents") {
    return { ...base, layoutShowThemePicker: true };
  }
  return base;
}

function CtaButton({ cta, accent, isBright, size = "lg", onParentInvite }) {
  const sizeClass =
    size === "lg"
      ? "w-full sm:w-auto min-h-[48px] px-6 py-3 text-base font-bold rounded-2xl"
      : "min-h-[40px] px-4 py-2 text-sm font-semibold rounded-xl";

  const primaryClass = isBright ? accent.primaryBtnBright : accent.primaryBtnClassic;
  const secondaryClass = isBright ? accent.secondaryBtnBright : accent.secondaryBtnClassic;
  const isSecondary = cta.variant === "secondary";

  if (cta.action === "parentInvite" && onParentInvite) {
    return (
      <button
        type="button"
        onClick={onParentInvite}
        className={`inline-flex items-center justify-center ${sizeClass} ${
          isSecondary ? secondaryClass : primaryClass
        } transition`}
        data-testid="kids-parent-invite-cta"
      >
        {cta.label}
      </button>
    );
  }

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
 * @param {{ audience: 'kids' | 'parents' | 'teachers', content: import('../../data/marketing/landing-pages.he').MarketingPageContent, showPublicSeoEntrySection?: boolean }} props
 */
export default function MarketingLandingPage({ audience, content, showPublicSeoEntrySection = false }) {
  const { theme, isBright } = useStudentTheme();
  const accent = ACCENT[audience];
  const portal = AUDIENCE_PORTAL[audience];
  const isKidsPage = audience === "kids";
  const [parentInviteOpen, setParentInviteOpen] = useState(false);
  const openParentInvite = () => setParentInviteOpen(true);
  const ctaParentInvite = isKidsPage ? openParentInvite : undefined;
  const defaultCardGradient = isBright ? accent.brightCardGradient : accent.classicCardGradient;

  const sectionTitleClass = isBright
    ? "text-xl font-black text-slate-900 md:text-2xl"
    : "text-xl font-black text-white md:text-2xl";

  const kidsSectionTitleClass = isBright
    ? "text-xl font-black md:text-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-teal-600 bg-clip-text text-transparent"
    : "text-xl font-black text-white md:text-2xl bg-gradient-to-r from-amber-300 via-fuchsia-200 to-emerald-300 bg-clip-text text-transparent";

  const sectionTextClass = isBright ? "text-slate-600" : "text-white/75";

  const panelClass = isBright
    ? isKidsPage
      ? "rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white/70 to-amber-50/60 p-5 md:p-6 shadow-sm"
      : "rounded-2xl border border-slate-200/80 bg-white/70 p-5 md:p-6 shadow-sm"
    : isKidsPage
      ? "rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-violet-500/10 via-white/5 to-amber-500/10 p-5 md:p-6"
      : "rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6";

  const resolvedSectionTitleClass = isKidsPage ? kidsSectionTitleClass : sectionTitleClass;
  const layoutProps = getMarketingLayoutProps(audience, theme);

  return (
    <>
      <PageSeo
        title={content.pageTitle}
        description={content.metaDescription || content.hero.subtitle}
        canonicalPath={AUDIENCE_CANONICAL_PATH[audience] || "/"}
      />
      <Layout {...layoutProps}>
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
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-center sm:gap-4">
              <CtaButton
                cta={content.hero.primaryCta}
                accent={accent}
                isBright={isBright}
                onParentInvite={ctaParentInvite}
              />
              {content.hero.secondaryCta ? (
                <CtaButton
                  cta={{ ...content.hero.secondaryCta, variant: "secondary" }}
                  accent={accent}
                  isBright={isBright}
                  onParentInvite={ctaParentInvite}
                />
              ) : null}
              {content.installLabel ? (
                <PortalPwaInstallButton
                  portal={portal}
                  isBright={isBright}
                  accent={accent}
                  label={content.installLabel}
                />
              ) : null}
            </div>
          </header>

          {audience === "parents" ? (
            <ParentPromoVideo isBright={isBright} className="py-2" />
          ) : null}

          {audience === "kids" ? (
            <StudentPromoVideo isBright={isBright} className="py-2" />
          ) : null}

          {/* Benefits */}
          <section id="benefits" className="scroll-mt-24 space-y-6">
            {content.benefits.title ? (
              <h2 className={`text-center ${resolvedSectionTitleClass}`}>{content.benefits.title}</h2>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.benefits.items.map((item, index) => (
                <MarketingFeatureCard
                  key={item.title}
                  title={item.title}
                  text={item.text}
                  emoji={item.emoji}
                  gradientClass={
                    isKidsPage
                      ? getKidsCardGradient(accent, isBright, index)
                      : defaultCardGradient
                  }
                  isBright={isBright}
                />
              ))}
            </div>
          </section>

          {/* How it works / info blocks */}
          {content.infoSections?.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className={resolvedSectionTitleClass}>{section.title}</h2>
              {section.intro ? (
                <p className={`text-sm md:text-base ${sectionTextClass}`}>{section.intro}</p>
              ) : null}
              {section.steps ? (
                <ol className={`space-y-3 ${panelClass}`}>
                  {section.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm md:text-base">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isKidsPage
                            ? getKidsStepBadge(accent, isBright, index)
                            : isBright
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
            <h2 className={resolvedSectionTitleClass}>{content.closing.title}</h2>
            <p className={`mx-auto max-w-2xl text-sm md:text-base ${sectionTextClass}`}>
              {content.closing.text}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <CtaButton
                cta={content.closing.primaryCta}
                accent={accent}
                isBright={isBright}
                onParentInvite={ctaParentInvite}
              />
              {content.closing.secondaryCta ? (
                <CtaButton
                  cta={{ ...content.closing.secondaryCta, variant: "secondary" }}
                  accent={accent}
                  isBright={isBright}
                  size="sm"
                  onParentInvite={ctaParentInvite}
                />
              ) : null}
            </div>
          </section>

          {showPublicSeoEntrySection ? (
            <PublicSeoEntrySection isBright={isBright} />
          ) : null}

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

      {isKidsPage ? (
        <StudentParentInviteModal
          open={parentInviteOpen}
          onClose={() => setParentInviteOpen(false)}
        />
      ) : null}
    </>
  );
}
