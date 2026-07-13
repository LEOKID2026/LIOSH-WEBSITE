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

const CARD_SHELL_BRIGHT = [
  "rounded-2xl border border-sky-100/90 bg-sky-50/70",
  "rounded-2xl border border-cyan-100/90 bg-cyan-50/65",
  "rounded-2xl border border-violet-100/90 bg-violet-50/65",
  "rounded-2xl border border-indigo-100/90 bg-indigo-50/60",
  "rounded-2xl border border-emerald-100/90 bg-emerald-50/60",
  "rounded-2xl border border-amber-100/90 bg-amber-50/55",
];

const CARD_SHELL_CLASSIC = [
  "rounded-2xl border border-sky-400/15 bg-sky-500/10",
  "rounded-2xl border border-cyan-400/15 bg-cyan-500/10",
  "rounded-2xl border border-violet-400/15 bg-violet-500/10",
  "rounded-2xl border border-indigo-400/15 bg-indigo-500/10",
  "rounded-2xl border border-emerald-400/15 bg-emerald-500/10",
  "rounded-2xl border border-amber-400/15 bg-amber-500/10",
];

/**
 * @param {{ id: string, title: string, text: string, isBright: boolean, index?: number }} props
 */
export default function HomeCapabilityCard({ id, title, text, isBright, index = 0 }) {
  const shells = isBright ? CARD_SHELL_BRIGHT : CARD_SHELL_CLASSIC;
  const shellClass = shells[index % shells.length];

  return (
    <article className={`h-full p-4 text-right md:p-5 ${shellClass}`} data-testid={`home-capability-${id}`}>
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
          isBright ? "bg-white/80 text-sky-700" : "bg-white/10 text-cyan-200"
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
          isBright ? "text-sky-900" : "text-sky-100"
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
    </article>
  );
}
