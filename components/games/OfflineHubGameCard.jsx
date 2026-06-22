import Link from "next/link";

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
 * }} props
 */
export default function OfflineHubGameCard({ game, GH }) {
  const cardTitle = `${GH.cardTitle} text-[clamp(0.875rem,3.4vw,1.125rem)] md:!text-lg`;
  const mobileTitleClass = game.titleOneLine
    ? `${cardTitle} whitespace-nowrap`
    : cardTitle;

  return (
    <Link href={`/offline/${game.slug}`} className={`${GH.card} !p-3 md:!p-5`}>
      {/* Mobile: compact vertical stack — emoji row never wraps */}
      <div className="flex flex-col gap-1.5 text-right md:hidden">
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
        <span className={`${GH.cardCta} mt-0.5 w-full justify-center`}>שחק עכשיו</span>
      </div>

      {/* Desktop */}
      <div className="hidden flex-col md:flex">
        <div className="mb-2 flex items-center gap-3">
          <div className={GH.cardEmoji}>{game.emoji}</div>
          <div className="min-w-0 text-right">
            <h2 className={`${GH.cardTitle} !text-lg`}>{game.title}</h2>
            <p className={GH.cardMeta}>{game.players}</p>
          </div>
        </div>
        <p className={`${GH.cardBlurb} flex-1`}>{game.blurb}</p>
        <span className={`${GH.cardCta} mt-3`}>שחק עכשיו</span>
      </div>
    </Link>
  );
}
