const ICONS = {
  "subject-map": (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h10M4 18h16"
    />
  ),
  skills: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  ),
  "spot-difficulty": (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  "over-time": (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  "parent-report": (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  "focused-work": (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
};

/**
 * @param {{ id: string, title: string, text: string, isBright: boolean }} props
 */
export default function HomeCapabilityCard({ id, title, text, isBright }) {
  const shellClass = isBright
    ? "rounded-2xl bg-gradient-to-br from-cyan-400/70 to-violet-400/60 p-[1px] h-full"
    : "rounded-2xl bg-gradient-to-br from-cyan-500/50 to-violet-500/40 p-[1px] h-full";
  const innerClass = isBright
    ? "h-full rounded-2xl bg-white/95 p-4 text-right shadow-sm"
    : "h-full rounded-2xl bg-black/55 p-4 text-right";

  return (
    <article className={shellClass} data-testid={`home-capability-${id}`}>
      <div className={innerClass}>
        <div
          className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
            isBright ? "bg-sky-100 text-sky-700" : "bg-cyan-500/20 text-cyan-200"
          }`}
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {ICONS[id] || ICONS["parent-report"]}
          </svg>
        </div>
        <h3
          className={`text-base font-bold leading-snug md:text-lg ${
            isBright ? "text-slate-900" : "text-white"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-2 text-sm leading-relaxed ${
            isBright ? "text-slate-600" : "text-white/75"
          }`}
        >
          {text}
        </p>
      </div>
    </article>
  );
}
