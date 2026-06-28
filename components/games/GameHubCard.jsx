import Link from "next/link";
import GamesHubLockFooter from "./GamesHubLockFooter.jsx";

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
 *   lockHint?: string,
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
  lockHint = "",
}) {
  if (hidden) return null;

  const inner = (
    <>
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-3">
          {emoji ? (
            <div className="text-3xl md:text-4xl shrink-0" aria-hidden>
              {emoji}
            </div>
          ) : null}
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        </div>
        {blurb && !locked ? <p className="text-sm opacity-80">{blurb}</p> : null}
      </div>
      {locked ? (
        lockHint ? (
          <GamesHubLockFooter ctaClass={ctaClass} label={lockTitle} hint={lockHint} />
        ) : (
          <div className="mt-3 text-right">
            <span className={`${ctaClass} inline-flex items-center gap-1 opacity-90 cursor-not-allowed`}>
              🔒 {lockTitle}
            </span>
          </div>
        )
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
