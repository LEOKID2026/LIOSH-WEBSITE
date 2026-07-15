import Layout from "../../components/Layout";
import PageSeo from "../../components/seo/PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import HelpHubCard from "../../components/help/HelpHubCard";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";
import { SECTIONS } from "../../data/help-center";

const HUB_SECTIONS = [
  SECTIONS.parents,
  SECTIONS.students,
  SECTIONS["parent-report"],
  SECTIONS.subjects,
];

const helpSeo = getPublicPageSeo("help");

export default function HelpCenterHome() {
  useIOSViewportFix();
  const { theme } = useStudentTheme();
  const { SP, isBright } = useSharedShellUi();

  return (
    <Layout studentTheme={theme} studentShell="home">
      <PageSeo
        title={helpSeo.title}
        description={helpSeo.description}
        canonicalPath={helpSeo.canonicalPath}
      />
      <div dir="rtl" className={SP.helpWrap}>
        <header className="text-center space-y-4">
          <p className={SP.badge}>עזרה · מדריכים · שאלות נפוצות</p>
          <h1 className={SP.helpH1}>מרכז עזרה</h1>
          <p className={SP.helpSubtitle}>
            מדריכים בעברית להורים ולילדים - איך להשתמש באתר, איך לקרוא את הדוח,
            ואיך לתרגל בכל מקצוע.
          </p>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HUB_SECTIONS.map((s) => (
            <HelpHubCard
              key={s.key}
              href={s.href}
              title={s.title}
              description={s.description}
              emoji={s.emoji}
              sectionKey={s.hubGradientKey}
              isBright={isBright}
            />
          ))}
        </section>
      </div>
    </Layout>
  );
}
