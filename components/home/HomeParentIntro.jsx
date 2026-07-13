import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";
import { getHomeTextClasses } from "./home-theme";

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeParentIntro({ isBright }) {
  const copy = HOMEPAGE_COPY.parentIntro;
  const cls = getHomeTextClasses(isBright);

  return (
    <section className="space-y-3 text-center md:text-right" data-testid="home-parent-intro">
      <p
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${cls.label}`}
      >
        {copy.label}
      </p>
      <h2 className={cls.sectionTitle}>{copy.title}</h2>
      <p className={`max-w-3xl text-sm leading-relaxed md:text-base lg:text-lg ${cls.body}`}>
        {copy.text}
      </p>
    </section>
  );
}
