export default function AdminSectionCard({ id, title, children, className = "" }) {
  return (
    <section
      id={id}
      className={`rounded-xl border border-white/15 bg-black/30 p-4 md:p-5 text-right scroll-mt-24 ${className}`}
    >
      {title ? <h2 className="text-base font-semibold mb-4 text-white">{title}</h2> : null}
      {children}
    </section>
  );
}

export function AdminStatTile({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-right">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value ?? "-"}</p>
      {hint ? <p className="text-[11px] text-white/40 mt-1">{hint}</p> : null}
    </div>
  );
}

export function AdminFieldRow({ label, value, children }) {
  const display = children ?? value ?? "-";
  const titleText = typeof display === "string" && display !== "-" ? display : undefined;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(5rem,auto)_1fr] items-baseline gap-x-4 gap-y-1 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/50 shrink-0">{label}</span>
      <span
        className="text-sm text-white/90 text-right min-w-0 break-words"
        title={titleText}
      >
        {display}
      </span>
    </div>
  );
}
