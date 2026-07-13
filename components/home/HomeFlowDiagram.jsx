import { getHomeTextClasses } from "./home-theme";

/**
 * @param {{ steps: string[], isBright: boolean, variant?: "default"|"hero" }} props
 */
export default function HomeFlowDiagram({ steps, isBright, variant = "default" }) {
  const cls = getHomeTextClasses(isBright);
  const isHero = variant === "hero";

  const stepBox = isHero
    ? isBright
      ? "rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-white to-sky-50 px-4 py-4 text-center text-sm font-bold shadow-md md:text-base lg:py-5"
      : "rounded-2xl border-2 border-cyan-400/35 bg-gradient-to-br from-black/60 to-cyan-900/30 px-4 py-4 text-center text-sm font-bold shadow-lg md:text-base lg:py-5"
    : isBright
    ? "rounded-xl border border-sky-200 bg-white/90 px-3 py-2.5 text-center text-sm font-semibold shadow-sm"
    : "rounded-xl border border-cyan-400/25 bg-black/40 px-3 py-2.5 text-center text-sm font-semibold";

  const arrowClass = isBright ? "text-sky-500" : "text-cyan-300";
  const arrowSize = isHero ? "text-2xl md:text-3xl" : "text-lg md:text-xl";

  return (
    <div
      className="motion-reduce:transition-none"
      data-testid="home-flow-diagram"
      aria-label="תהליך המערכת"
    >
      <div
        className={`flex flex-col items-stretch gap-2 ${
          isHero ? "md:gap-3" : ""
        } md:flex-row md:items-center md:justify-between md:gap-3`}
      >
        {steps.map((step, index) => (
          <div key={step} className="contents">
            <div className={`${stepBox} ${cls.title} md:flex-1`}>{step}</div>
            {index < steps.length - 1 ? (
              <>
                <span
                  className={`self-center font-bold md:hidden ${arrowClass} ${arrowSize}`}
                  aria-hidden
                >
                  ↓
                </span>
                <span
                  className={`hidden shrink-0 font-bold md:inline ${arrowClass} ${arrowSize}`}
                  aria-hidden
                >
                  ←
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
