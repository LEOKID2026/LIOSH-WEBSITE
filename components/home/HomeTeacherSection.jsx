import { HOMEPAGE_COPY, HOMEPAGE_ROUTES } from "../../data/home/homepage-copy.he";
import { getHomeBtnClasses, getHomeTextClasses } from "./home-theme";
import HomeCtaLink from "./HomeCtaLink";

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeTeacherSection({ isBright }) {
  const copy = HOMEPAGE_COPY.teachers;
  const cls = getHomeTextClasses(isBright);

  return (
    <section
      className={`space-y-4 text-center md:space-y-5 ${cls.panel}`}
      data-testid="home-teacher-section"
    >
      <p
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${cls.teacherLabel}`}
      >
        {copy.label}
      </p>
      <h2 className={`text-lg font-black md:text-xl ${cls.heading}`}>{copy.title}</h2>
      <p className={`mx-auto max-w-2xl text-sm md:text-base ${cls.body}`}>{copy.text}</p>

      <ul className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 text-sm">
        {copy.bullets.map((bullet) => (
          <li
            key={bullet}
            className={`rounded-full px-3 py-1 ${
              isBright
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "border border-amber-400/30 bg-amber-500/10 text-amber-100"
            }`}
          >
            {bullet}
          </li>
        ))}
      </ul>

      <HomeCtaLink
        href={HOMEPAGE_ROUTES.teacherLogin}
        label={copy.cta}
        className={getHomeBtnClasses("teachers", isBright, "primary")}
        size="md"
        testId="home-teacher-cta"
      />
    </section>
  );
}
