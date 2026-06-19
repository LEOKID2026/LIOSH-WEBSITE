/**
 * Leo shop cards — phase 1 image registry (40 cards).
 * Maps card_key (filename without .webp) to public image path.
 */

/** @type {Record<string, string>} */
export const LEO_SHOP_CARD_IMAGES = {
  leo_scientist: "/rewards/cards/shop/professions/leo_scientist.webp",
  leo_detective: "/rewards/cards/shop/professions/leo_detective.webp",
  leo_doctor: "/rewards/cards/shop/professions/leo_doctor.webp",
  leo_chef: "/rewards/cards/shop/professions/leo_chef.webp",
  leo_pilot: "/rewards/cards/shop/professions/leo_pilot.webp",
  leo_engineer: "/rewards/cards/shop/professions/leo_engineer.webp",
  leo_artist: "/rewards/cards/shop/professions/leo_artist.webp",
  leo_musician: "/rewards/cards/shop/professions/leo_musician.webp",
  leo_astronaut: "/rewards/cards/shop/space-tech/leo_astronaut.webp",
  leo_space_commander: "/rewards/cards/shop/space-tech/leo_space_commander.webp",
  leo_star_explorer: "/rewards/cards/shop/space-tech/leo_star_explorer.webp",
  leo_robotic: "/rewards/cards/shop/space-tech/leo_robotic.webp",
  leo_super_inventor: "/rewards/cards/shop/space-tech/leo_super_inventor.webp",
  leo_galaxy_captain: "/rewards/cards/shop/space-tech/leo_galaxy_captain.webp",
  leo_space_pilot: "/rewards/cards/shop/space-tech/leo_space_pilot.webp",
  leo_technodog: "/rewards/cards/shop/space-tech/leo_technodog.webp",
  leo_wizard: "/rewards/cards/shop/fantasy/leo_wizard.webp",
  leo_sorcerer: "/rewards/cards/shop/fantasy/leo_sorcerer.webp",
  leo_knight: "/rewards/cards/shop/fantasy/leo_knight.webp",
  leo_pirate: "/rewards/cards/shop/fantasy/leo_pirate.webp",
  leo_ninja: "/rewards/cards/shop/fantasy/leo_ninja.webp",
  leo_king: "/rewards/cards/shop/fantasy/leo_king.webp",
  leo_forest_guardian: "/rewards/cards/shop/fantasy/leo_forest_guardian.webp",
  leo_superhero: "/rewards/cards/shop/fantasy/leo_superhero.webp",
  leo_football: "/rewards/cards/shop/sport-fun/leo_football.webp",
  leo_basketball: "/rewards/cards/shop/sport-fun/leo_basketball.webp",
  leo_runner: "/rewards/cards/shop/sport-fun/leo_runner.webp",
  leo_swimmer: "/rewards/cards/shop/sport-fun/leo_swimmer.webp",
  leo_surfer: "/rewards/cards/shop/sport-fun/leo_surfer.webp",
  leo_dancer: "/rewards/cards/shop/sport-fun/leo_dancer.webp",
  leo_champion: "/rewards/cards/shop/sport-fun/leo_champion.webp",
  leo_gamer: "/rewards/cards/shop/sport-fun/leo_gamer.webp",
  leo_smart: "/rewards/cards/shop/style/leo_smart.webp",
  leo_funny: "/rewards/cards/shop/style/leo_funny.webp",
  leo_playful: "/rewards/cards/shop/style/leo_playful.webp",
  leo_celebration: "/rewards/cards/shop/style/leo_celebration.webp",
  leo_classic: "/rewards/cards/shop/style/leo_classic.webp",
  leo_glasses: "/rewards/cards/shop/style/leo_glasses.webp",
  leo_suit: "/rewards/cards/shop/style/leo_suit.webp",
  leo_cool: "/rewards/cards/shop/style/leo_cool.webp",
};

const DEFAULT_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

function basenameFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/([^/?#]+)\.(webp|svg|png|jpe?g)$/i);
  return match ? match[1] : null;
}

/**
 * Resolve shop card image URL from card_key or image_url basename.
 * @param {{ card_key?: string | null, image_url?: string | null } | null | undefined} card
 * @returns {string | null}
 */
export function resolveShopCardImageUrl(card) {
  if (!card) return null;
  const key = card.card_key || basenameFromUrl(card.image_url);
  if (key && LEO_SHOP_CARD_IMAGES[key]) {
    return LEO_SHOP_CARD_IMAGES[key];
  }
  return card.image_url || null;
}

export function resolveShopCardImageUrlOrPlaceholder(card) {
  return resolveShopCardImageUrl(card) || DEFAULT_PLACEHOLDER;
}
