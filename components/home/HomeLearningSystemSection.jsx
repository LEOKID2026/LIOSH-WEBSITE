import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";
import { getHomeTextClasses } from "./home-theme";
import HomeCapabilityCard from "./HomeCapabilityCard";

/**
 * Expanded learning system — flow teaser lives in hero; here only depth + capability cards.
 * @param {{ isBright: boolean }} props
 */
export default function HomeLearningSystemSection({ isBright }) {
  const copy = HOMEPAGE_COPY.learningSystem;
  const cls = getHomeTextClasses(isBright);

  return (
    <section
      className="space-y-6 md:space-y-8"
      data-testid="home-learning-system"
      aria-labelledby="home-learning-system-title"
    >
      <div className="space-y-3 text-center md:text-right">
        <p
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${cls.label}`}
        >
          {copy.label}
        </p>
        <h2 id="home-learning-system-title" className={cls.sectionTitle}>
          {copy.title}
        </h2>
        <div
          className={`mx-auto max-w-4xl space-y-2 text-sm leading-relaxed md:mx-0 md:text-base lg:text-lg ${cls.body}`}
        >
          {copy.textParts.map((part) => (
            <p key={part}>{part}</p>
          ))}
        </div>
        <p
          className={`inline-flex rounded-full px-4 py-1.5 text-xs font-semibold md:text-sm ${cls.reinforcement}`}
        >
          {copy.dimensionTags}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {copy.capabilities.map((item, index) => (
          <HomeCapabilityCard
            key={item.id}
            id={item.id}
            title={item.title}
            text={item.text}
            isBright={isBright}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

