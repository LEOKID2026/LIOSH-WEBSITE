import OfflineHubTileCard from "./OfflineHubTileCard.jsx";

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
 *   hrefBase?: string,
 * }} props
 */
export default function OfflineHubGameCard({ game, GH, locked = false, hrefBase = "/offline/" }) {
  return (
    <OfflineHubTileCard
      emoji={game.emoji}
      title={game.title}
      meta={game.players}
      blurb={game.blurb}
      href={locked ? undefined : `${hrefBase}${game.slug}`}
      locked={locked}
      GH={GH}
      titleOneLine={Boolean(game.titleOneLine)}
    />
  );
}
