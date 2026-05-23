import Head from "next/head";
import Layout from "../../components/Layout";
import HelpHubCard from "../../components/help/HelpHubCard";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { SECTIONS } from "../../data/help-center";

const HUB_SECTIONS = [
  SECTIONS.parents,
  SECTIONS.students,
  SECTIONS["parent-report"],
  SECTIONS.subjects,
];

export default function HelpCenterHome() {
  useIOSViewportFix();

  return (
    <Layout>
      <Head>
        <title>מרכז עזרה · LEO KIDS</title>
        <meta
          name="description"
          content="מרכז עזרה בעברית — מדריכים להורים, לתלמידים, לדוחות ולמקצועות."
        />
      </Head>
      <div dir="rtl" className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <header className="text-center space-y-4">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs tracking-wider text-amber-300 font-semibold">
            עזרה · מדריכים · שאלות נפוצות
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
            מרכז עזרה
          </h1>
          <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto">
            מדריכים בעברית להורים ולתלמידים — איך להשתמש באתר, איך לקרוא את הדוח,
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
            />
          ))}
        </section>
      </div>
    </Layout>
  );
}
