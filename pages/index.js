import Layout from "../components/Layout";
import InstallAppChoiceButton from "../components/InstallAppChoiceButton";
import PageSeo from "../components/seo/PageSeo";
import HomeHero from "../components/home/HomeHero";
import HomeValueCards from "../components/home/HomeValueCards";
import HomeLearningSystemSection from "../components/home/HomeLearningSystemSection";
import HomeParentIntro from "../components/home/HomeParentIntro";
import HomeParentBenefits from "../components/home/HomeParentBenefits";
import HomeKidsSection from "../components/home/HomeKidsSection";
import HomeHowItWorks from "../components/home/HomeHowItWorks";
import HomeFinalCta from "../components/home/HomeFinalCta";
import HomeTeacherSection from "../components/home/HomeTeacherSection";
import { HOME_PAGE_MAX, HOME_PAGE_PAD } from "../components/home/home-theme";
import { getPublicPageSeo } from "../lib/site/public-page-seo.he";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";

const homeSeo = getPublicPageSeo("home");

export default function HomePage() {
  const { theme, isBright } = useStudentTheme();

  const installBtnClass = isBright
    ? "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300/80 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
    : "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white/75 transition hover:bg-white/15 hover:text-white";

  return (
    <Layout homepage studentTheme={theme} studentShell="home">
      <PageSeo
        title={homeSeo.title}
        description={homeSeo.description}
        canonicalPath={homeSeo.canonicalPath}
      />
      <div dir="rtl" lang="he" data-testid="home-page">
        <HomeHero isBright={isBright} />

        <div className="space-y-6 py-6 md:space-y-8 md:py-8">
          <HomeValueCards isBright={isBright} />

          <div className="flex justify-center">
            <InstallAppChoiceButton buttonClassName={installBtnClass} className="mt-0" />
          </div>
        </div>

        <div
          className={`mx-auto w-full ${HOME_PAGE_MAX} ${HOME_PAGE_PAD} pb-8 md:pb-10 space-y-8 md:space-y-12 lg:space-y-14`}
        >
          <HomeLearningSystemSection isBright={isBright} />
          <HomeParentIntro isBright={isBright} />
          <HomeParentBenefits isBright={isBright} />

          <HomeKidsSection isBright={isBright} />
          <HomeHowItWorks isBright={isBright} />
          <HomeFinalCta isBright={isBright} />
          <HomeTeacherSection isBright={isBright} />
        </div>
      </div>
    </Layout>
  );
}
