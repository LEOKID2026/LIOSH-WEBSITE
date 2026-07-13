import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";

const STEP_COLORS_BRIGHT = [
  "from-cyan-400 to-sky-500",
  "from-sky-500 to-indigo-500",
  "from-indigo-500 to-violet-500",
  "from-violet-500 to-fuchsia-500",
];

const STEP_COLORS_CLASSIC = [
  "from-cyan-400 to-sky-600",
  "from-sky-500 to-indigo-600",
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-fuchsia-600",
];

/**
 * @param {{ isBright: boolean }} props
 */
export default function HomeHeroHowItWorks({ isBright }) {
  const copy = HOMEPAGE_COPY.hero;
  const steps = copy.heroFlowSteps;
  const colors = isBright ? STEP_COLORS_BRIGHT : STEP_COLORS_CLASSIC;

  const shell = isBright
    ? "rounded-2xl border border-violet-200/70 bg-gradient-to-br from-amber-50 via-violet-50 to-cyan-50 p-4 shadow-lg sm:p-5"
    : "rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-600/20 via-cyan-600/15 to-indigo-900/40 p-4 shadow-xl sm:p-5";

  const titleClass = isBright ? "text-slate-900" : "text-white";
  const stepTextClass = isBright ? "text-slate-800" : "text-white/90";

  return (
    <div className={shell} data-testid="home-hero-how-it-works">
      <h3 className={`mb-4 text-base font-black md:text-lg ${titleClass}`}>
        {copy.howItWorksTitle}
      </h3>
      <ol className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex flex-1 items-center gap-3 lg:flex-col lg:items-center lg:text-center"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors[index]} text-base font-black text-white shadow-md`}
              aria-hidden
            >
              {index + 1}
            </span>
            <span className={`text-sm font-bold leading-snug md:text-base ${stepTextClass}`}>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
