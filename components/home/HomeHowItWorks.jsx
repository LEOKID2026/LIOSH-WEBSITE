import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";
import { ACCENT, getHomeTextClasses } from "./home-theme";

function getStepBadge(isBright, index) {
  const accent = ACCENT.kids;
  const list = isBright ? accent.stepBadgesBright : accent.stepBadgesClassic;
  return list[index % list.length];
}

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeHowItWorks({ isBright }) {
  const copy = HOMEPAGE_COPY.howItWorks;
  const cls = getHomeTextClasses(isBright);

  return (
    <section className="space-y-4" data-testid="home-how-it-works">
      <h2 className={`text-center ${cls.sectionTitle}`}>{copy.title}</h2>
      <ol className={`space-y-3 ${cls.panel}`}>
        {copy.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm md:text-base">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getStepBadge(
                isBright,
                index
              )}`}
            >
              {index + 1}
            </span>
            <span className={isBright ? "text-slate-700" : "text-white/85"}>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
