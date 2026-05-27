export function SchoolReportSection({ title, empty, children }) {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-bold text-amber-200/95 mb-2">{title}</h3>
      {children || (
        <p className="text-sm text-white/50 rounded-lg border border-dashed border-white/15 px-3 py-3">
          {empty}
        </p>
      )}
    </section>
  );
}

export function SchoolReportInsight({ text }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-3 mb-4 text-sm text-sky-100 leading-relaxed">
      {text}
    </div>
  );
}

export function SchoolReportActivityList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-white break-words">{item.title}</p>
            {item.date ? <span className="text-xs text-white/45 shrink-0">{item.date}</span> : null}
          </div>
          <p className="text-xs text-white/55 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {item.subject ? <span>{item.subject}</span> : null}
            {item.mode ? <span>· {item.mode}</span> : null}
            {item.status ? (
              <span className="rounded border border-white/15 px-1.5 py-0.5">{item.status}</span>
            ) : null}
            {item.meta ? <span>· {item.meta}</span> : null}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SchoolReportLabelList({ items, variant = "default" }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={`${item.label || item.tier || item.name}-${i}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            variant === "tier" || variant === "subject"
              ? "border-white/10 bg-black/20 flex justify-between gap-2 items-start"
              : "border-white/10 bg-black/25"
          }`}
        >
          {variant === "tier" || variant === "subject" ? (
            <>
              <div className="min-w-0">
                <span className="text-white/90">{item.label || item.tier || item.name}</span>
                {item.detail ? (
                  <span className="text-xs text-white/50 block mt-0.5">{item.detail}</span>
                ) : null}
              </div>
              {item.count != null ? (
                <span className="tabular-nums text-amber-200 font-semibold shrink-0">{item.count}</span>
              ) : null}
              {item.status ? (
                <span
                  className={`text-xs shrink-0 ${
                    item.status === "אין עדיין נתונים" ? "text-white/45" : "text-amber-200 font-semibold"
                  }`}
                >
                  {item.status}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="text-white/90">{item.label || item.tier || item.name}</span>
              {item.detail ? (
                <span className="text-xs text-white/50 block mt-0.5">{item.detail}</span>
              ) : null}
              {item.status ? (
                <span className="text-xs text-white/60 block mt-0.5">{item.status}</span>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** @deprecated Use ReportHubModal — kept for list/section building blocks only. */
export function SchoolReportModalBody() {
  return null;
}
