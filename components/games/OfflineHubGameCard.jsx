import Link from "next/link";

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
  const cardTitle = `${GH.cardTitle} !text-base md:!text-lg`;
  const mobileTitleClass = game.titleOneLine
    ? `${cardTitle} whitespace-nowrap`
    : cardTitle;

  return (
    <Link href={`/offline/${game.slug}`} className={GH.card}>
      {/* Mobile: vertical stack — natural height, full card width for text */}
      <div className="flex flex-col gap-2 text-right md:hidden">
        <div className={`${GH.cardEmoji} text-center`} aria-hidden>
          {game.emoji}
        </div>
        <h2 className={mobileTitleClass}>{game.title}</h2>
        <p className={GH.cardMeta}>{game.players}</p>
        <p className={GH.cardBlurb}>{game.blurb}</p>
        <span className={`${GH.cardCta} w-full justify-center`}>שחק עכשיו</span>
      </div>

      {/* Desktop */}
      <div className="hidden flex-col md:flex">
        <div className="mb-2 flex items-center gap-3">
          <div className={GH.cardEmoji}>{game.emoji}</div>
          <div className="min-w-0 text-right">
            <h2 className={cardTitle}>{game.title}</h2>
            <p className={GH.cardMeta}>{game.players}</p>
          </div>
        </div>
        <p className={`${GH.cardBlurb} flex-1`}>{game.blurb}</p>
        <span className={`${GH.cardCta} mt-3`}>שחק עכשיו</span>
      </div>
    </Link>
  );
}
