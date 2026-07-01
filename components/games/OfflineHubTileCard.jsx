import Link from "next/link";
import GamesHubLockFooter from "./GamesHubLockFooter.jsx";

const TILE_MIN_H = "min-h-[10.5rem] sm:min-h-[11rem] md:min-h-[12rem]";

/**
 * Uniform offline hub tile — content grows, CTA pinned to bottom.
 *
 * @param {{
 *   emoji: string;
 *   title: string;
 *   meta?: string;
 *   blurb?: string;
 *   href?: string;
 *   locked?: boolean;
 *   GH: Record<string, string>;
 *   ctaLabel?: string;
 *   titleOneLine?: boolean;
 * }} props
 */
export default function OfflineHubTileCard({
  emoji,
  title,
  meta = "",
  blurb = "",
  href,
  locked = false,
  GH,
  ctaLabel = "שחק",
  titleOneLine = false,
}) {
  const shell = `${GH.card} ${TILE_MIN_H}${locked ? " opacity-80" : ""}`;
  const titleClass = `${GH.cardTitle} text-[clamp(0.875rem,3.4vw,1.125rem)] md:!text-lg${
    titleOneLine ? " truncate whitespace-nowrap" : ""
  }`;

  const inner = (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 text-right">
        <div className="flex items-start gap-2 md:gap-3">
          <span
            className="shrink-0 text-[clamp(1.35rem,5vw,2.25rem)] md:text-4xl leading-none"
            aria-hidden
          >
            {emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={titleClass}>{title}</h2>
            {meta ? <p className={`${GH.cardMeta} leading-snug`}>{meta}</p> : null}
          </div>
        </div>
        {blurb ? (
          <p className={`${GH.cardBlurb} line-clamp-3 leading-snug`}>{blurb}</p>
        ) : null}
      </div>
      <div className="mt-3 shrink-0">
        {locked ? (
          <GamesHubLockFooter ctaClass={`${GH.cardCta} w-full justify-center`} />
        ) : (
          <span className={`${GH.cardCta} flex w-full justify-center`}>{ctaLabel}</span>
        )}
      </div>
    </>
  );

  if (locked || !href) {
    return (
      <div className={shell} aria-disabled={locked ? "true" : undefined}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={shell}>
      {inner}
    </Link>
  );
}
