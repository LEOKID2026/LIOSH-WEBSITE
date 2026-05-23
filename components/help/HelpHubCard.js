import Link from "next/link";

const GRADIENTS = {
  parents: "from-amber-500/60 to-rose-600/70",
  students: "from-emerald-500/60 to-teal-600/70",
  "parent-report": "from-violet-500/60 to-fuchsia-700/70",
  subjects: "from-sky-500/60 to-indigo-600/70",
};

export default function HelpHubCard({ href, title, description, emoji, sectionKey }) {
  const gradient = GRADIENTS[sectionKey] || GRADIENTS.parents;

  return (
    <Link
      href={href}
      className={`group rounded-2xl bg-gradient-to-br ${gradient} p-[1px] block text-right`}
    >
      <div className="h-full rounded-2xl bg-black/60 p-5 flex flex-col justify-between min-h-[180px]">
        <div className="space-y-3">
          {emoji ? <div className="text-4xl" aria-hidden>{emoji}</div> : null}
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-white/75">{description}</p>
        </div>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 group-hover:-translate-x-1 transition">
          <span aria-hidden>←</span>
          כניסה למדריך
        </span>
      </div>
    </Link>
  );
}
