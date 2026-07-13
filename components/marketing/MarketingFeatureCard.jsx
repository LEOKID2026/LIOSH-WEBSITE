/**
 * Benefit card for public marketing landing pages.
 */
export default function MarketingFeatureCard({
  title,
  text,
  emoji,
  gradientClass,
  isBright,
  titleClassName = "",
}) {
  const shellClass = `rounded-2xl bg-gradient-to-br ${gradientClass} p-[1px] h-full text-right`;
  const innerClass = isBright
    ? "h-full rounded-2xl bg-white/90 p-4 md:p-5 shadow-sm border border-white/60"
    : "h-full rounded-2xl bg-black/60 p-4 md:p-5";

  return (
    <div className={shellClass}>
      <div className={innerClass}>
        {emoji ? (
          <div className="mb-2 text-2xl md:text-3xl" aria-hidden>
            {emoji}
          </div>
        ) : null}
        <h3
          className={
            titleClassName ||
            `text-base font-bold leading-snug md:text-lg ${
              isBright ? "text-slate-900" : "text-white"
            }`
          }
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
    </div>
  );
}
