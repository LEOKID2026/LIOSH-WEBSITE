import { PUZZLE_IMAGES } from "../solo-games/picture-puzzle-config.js";
import { GAME_AUDIO_MANIFEST } from "../game-audio/game-audio-manifest.js";
import {
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_GAMES,
  OFFLINE_SOLO_HUB_ROUTE,
  SAME_DEVICE_OFFLINE_GAMES,
} from "./offline-game-catalog.js";

const CANDY_SHAPES = [
  "heart.png",
  "circle.png",
  "square.png",
  "drop.png",
  "diamond.png",
  "star.png",
];

const GAME_AUDIO_OFFLINE_URLS = GAME_AUDIO_MANIFEST.filter(
  (entry) => entry.offlinePolicy === "required-offline" && entry.path,
).map((entry) => entry.path);

const SOLO_ASSET_URLS = [
  "/images/leo.png",
  "/images/leo2.png",
  "/images/leo-logo.png",
  "/images/dog.png",
  "/images/coin.png",
  "/images/coin2.png",
  "/images/diamond.png",
  "/images/magnet.png",
  "/images/obstacle.png",
  "/images/obstacle1.png",
  "/images/game-day.png",
  "/images/game1.png",
  "/images/game2.png",
  "/images/game3.png",
  "/images/game4.png",
  "/images/game10.png",
  "/images/game-park.png",
  "/images/game-balloons-bg.png",
  ...CANDY_SHAPES.map((name) => `/images/candy/${name}`),
  ...PUZZLE_IMAGES.map((img) => img.src),
  "/rewards/cards/common/card_back.webp",
  "/images/card/shiba1.png",
  "/images/card/shiba2.png",
  "/images/card/shiba3.png",
  "/images/card/shiba4.png",
  "/images/card/shiba5.png",
  ...GAME_AUDIO_OFFLINE_URLS,
];

const EDUCATIONAL_ASSET_URLS = [
  "/images/leo-supermarket/leo-cashier.png",
  "/images/grocery-items/juice.svg",
  "/images/recycling-items/newspaper.svg",
  "/images/recycling-items/paper-page.svg",
  "/images/recycling-items/cardboard-box.svg",
  "/images/recycling-items/plastic-bottle.svg",
  "/images/recycling-items/plastic-bag.svg",
  "/images/recycling-items/glass-jar.svg",
  "/images/recycling-items/metal-can.svg",
  "/images/recycling-items/banana-peel.svg",
];

const SAME_DEVICE_ROUTES = SAME_DEVICE_OFFLINE_GAMES.map(
  (g) => `${OFFLINE_HUB_ROUTE}/${g.slug}`,
);

const SOLO_ROUTES = OFFLINE_SOLO_GAMES.map((g) => g.route);

const EDUCATIONAL_ROUTES = [
  "recycling-factory",
  "leo-supermarket",
  "leo-lab",
  "leo-gifts",
  "leo-bakery",
  "leo-number-path",
  "leo-pizzeria",
  "leo-word-train",
  "leo-word-detective",
].map((key) => `${OFFLINE_EDUCATIONAL_HUB_ROUTE}/${key}`);

/** Navigation URLs precached when STUDENT_OFFLINE_FULL_SW_ENABLED is true. */
export const OFFLINE_FULL_PRECACHE_NAV_URLS = Object.freeze([
  OFFLINE_HUB_ROUTE,
  OFFLINE_SOLO_HUB_ROUTE,
  OFFLINE_EDUCATIONAL_HUB_ROUTE,
  ...SAME_DEVICE_ROUTES,
  ...SOLO_ROUTES,
  ...EDUCATIONAL_ROUTES,
]);

/** Static assets precached when STUDENT_OFFLINE_FULL_SW_ENABLED is true. */
export const OFFLINE_FULL_PRECACHE_ASSET_URLS = Object.freeze([
  "/icons/child/pwa-192x192.png",
  ...SOLO_ASSET_URLS,
  ...EDUCATIONAL_ASSET_URLS,
]);

/** Baseline precache (always) — matches pre-feature student SW. */
export const OFFLINE_BASELINE_PRECACHE_NAV_URLS = Object.freeze([
  OFFLINE_HUB_ROUTE,
  ...SAME_DEVICE_ROUTES,
]);

export const OFFLINE_BASELINE_INSTALL_PRECACHE = Object.freeze([
  "/student/offline.html",
  "/icons/child/pwa-192x192.png",
]);
