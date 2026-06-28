import Link from "next/link";
import GamesHubLockFooter from "./GamesHubLockFooter.jsx";

/** @param {string} emoji */
function emojiGraphemes(emoji) {
  return Array.from(emoji || "");
}

/**
 * @param {{
 *   game: {
 *     slug: string,
 *     title: string,
 *     emoji: string,
 *     players: string,
 *     blurb: string,
 *     titleOneLine?: boolean,
 *   },
 *   GH: Record<string, string>,
 *   locked?: boolean,
 * }} props
 */
export default function OfflineHubGameCard({ game, GH, locked = false }) {
  const cardTitle = `${GH.cardTitle} text-[clamp(0.875rem,3.4vw,1.125rem)] md:!text-lg`;
  const mobileTitleClass = game.titleOneLine
    ? `${cardTitle} whitespace-nowrap`
    : cardTitle;
  const cardShell = `${GH.card} !p-3 md:!p-5${locked ? " opacity-80" : ""}`;

  const mobileBody = (
    <>
      <div
        className="flex shrink-0 flex-nowrap items-center justify-center gap-[0.1em] leading-none text-[clamp(0.95rem,5vw,2rem)]"
        aria-hidden
      >
        {emojiGraphemes(game.emoji).map((char, i) => (
          <span key={`${game.slug}-emoji-${i}`} className="inline-block shrink-0">
            {char}
          </span>
        ))}
      </div>
      <h2 className={mobileTitleClass}>{game.title}</h2>
      <p className={`${GH.cardMeta} leading-snug`}>{game.players}</p>
      <p className={`${GH.cardBlurb} leading-snug`}>{game.blurb}</p>
      {locked ? (
        <GamesHubLockFooter ctaClass={`${GH.cardCta} mt-0.5 w-full justify-center`} />
      ) : (
        <span className={`${GH.cardCta} mt-0.5 w-full justify-center`}>שחק עכשיו</span>
      )}
    </>
  );

  const desktopBody = (
    <>
      <div className="mb-2 flex items-center gap-3">
        <div className={GH.cardEmoji}>{game.emoji}</div>
        <div className="min-w-0 text-right">
          <h2 className={`${GH.cardTitle} !text-lg`}>{game.title}</h2>
          <p className={GH.cardMeta}>{game.players}</p>
        </div>
      </div>
      <p className={`${GH.cardBlurb} flex-1`}>{game.blurb}</p>
      {locked ? (
        <GamesHubLockFooter ctaClass={GH.cardCta} />
      ) : (
        <span className={`${GH.cardCta} mt-3`}>שחק עכשיו</span>
      )}
    </>
  );

  if (locked) {
    return (
      <div className={cardShell} aria-disabled="true">
        <div className="flex flex-col gap-1.5 text-right md:hidden">{mobileBody}</div>
        <div className="hidden flex-col md:flex">{desktopBody}</div>
      </div>
    );
  }

  return (
    <Link href={`/offline/${game.slug}`} className={cardShell}>
      <div className="flex flex-col gap-1.5 text-right md:hidden">{mobileBody}</div>
      <div className="hidden flex-col md:flex">{desktopBody}</div>
    </Link>
  );
}
