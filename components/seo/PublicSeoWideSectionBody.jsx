import PracticeSeoGradeSections from "./PracticeSeoGradeSections";
import {
  getPublicSeoInnerPanelClass,
  getPublicSeoSectionPanelVariant,
  getPublicSeoWideClasses,
} from "./public-seo-wide-theme";

/**
 * @param {{
 *   section: {
 *     title: string,
 *     intro?: string,
 *     paragraphs?: string[],
 *     bullets?: string[],
 *     gradeSections?: { title: string, text: string }[],
 *   },
 *   isBright: boolean,
 * }} props
 */
export default function PublicSeoWideSectionBody({ section, isBright }) {
  const cls = getPublicSeoWideClasses(isBright);
  const hasTopicsBlock = Boolean(section.intro || section.bullets?.length);
  const topicsPanel = getPublicSeoInnerPanelClass(isBright, "sky");
  const paragraphVariant = getPublicSeoSectionPanelVariant(section.title);
  const paragraphPanel = getPublicSeoInnerPanelClass(isBright, paragraphVariant);

  return (
    <section className={`space-y-4 ${cls.section}`}>
      <h2 className={cls.sectionTitle}>{section.title}</h2>

      {hasTopicsBlock ? (
        <div className={topicsPanel}>
          {section.intro ? (
            <p className={`w-full text-sm leading-relaxed md:text-base ${cls.body}`}>
              {section.intro}
            </p>
          ) : null}
          {section.bullets?.length ? (
            <ul className={`grid grid-cols-1 gap-3 ${section.intro ? "mt-4" : ""}`}>
              {section.bullets.map((b) => (
                <li key={b} className={cls.bulletRow}>
                  <span className={cls.bulletIcon} aria-hidden>
                    ✓
                  </span>
                  <span className={`min-w-0 flex-1 text-sm md:text-base ${cls.body}`}>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {section.paragraphs?.length ? (
        <div className={paragraphPanel}>
          <div className="w-full space-y-3">
            {section.paragraphs.map((p) => (
              <p key={p} className={`w-full text-sm leading-relaxed md:text-base ${cls.body}`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {section.gradeSections ? (
        <PracticeSeoGradeSections grades={section.gradeSections} isBright={isBright} />
      ) : null}
    </section>
  );
}
