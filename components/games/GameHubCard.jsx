import Link from "next/link";

/**
 * @param {{
 *   title: string,
 *   emoji?: string,
 *   blurb?: string,
 *   href?: string,
 *   cardClass?: string,
 *   ctaClass?: string,
 *   locked?: boolean,
 *   hidden?: boolean,
 *   lockTitle?: string,
 *   lockSub?: string,
 * }} props
 */
export default function GameHubCard({
  title,
  emoji,
  blurb,
  href,
  cardClass = "",
  ctaClass = "",
  locked = false,
  hidden = false,
  lockTitle = "נעול על ידי ההורים",
  lockSub = "פנה להורה",
}) {
  if (hidden) return null;

  const inner = (
    <>
      <div className="space-y-2 flex-1">
        {emoji ? (
          <div className="text-3xl md:text-4xl" aria-hidden>
            {emoji}
          </div>
        ) : null}
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        {blurb ? <p className="text-sm opacity-80">{blurb}</p> : null}
      </div>
      {locked ? (
        <div className="mt-3 space-y-1 text-right">
          <span className={`${ctaClass} inline-flex items-center gap-1 opacity-90 cursor-not-allowed`}>
            🔒 {lockTitle}
          </span>
          <p className="text-xs opacity-70">{lockSub}</p>
        </div>
      ) : (
        <span className={ctaClass}>כניסה</span>
      )}
    </>
  );

  if (locked || !href) {
    return (
      <div
        className={`${cardClass} text-right min-h-[9.5rem] md:min-h-[11rem] opacity-80`}
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={`${cardClass} text-right min-h-[9.5rem] md:min-h-[11rem]`}>
      {inner}
    </Link>
  );
}
