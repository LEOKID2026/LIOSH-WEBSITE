// Service worker for LEO K student PWA (scope /student/ only).
// Sync STUDENT_OFFLINE_FULL_SW_ENABLED with lib/offline/offline-flags.js — must stay false in commit.

const STUDENT_OFFLINE_FULL_SW_ENABLED = true;

const CACHE_NAME = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? "student-offline-v2-full"
  : "student-offline-v1";
const CACHE_PREFIX = "student-";

const INSTALL_PRECACHE = ["/student/offline.html", "/icons/child/pwa-192x192.png"];

const BASELINE_OFFLINE_GAME_URLS = [
  "/student/offline",
  "/student/offline/tic-tac-toe",
  "/student/offline/rock-paper-scissors",
  "/student/offline/tap-battle",
  "/student/offline/memory-match",
];

const FULL_OFFLINE_NAV_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? [
      "/student/offline/solo",
      "/student/offline/educational",
      "/student/offline/solo/catcher",
      "/student/offline/solo/flyer",
      "/student/offline/solo/puzzle",
      "/student/offline/solo/memory",
      "/student/offline/solo/leo-jump",
      "/student/offline/solo/balloons",
      "/student/offline/solo/maze",
      "/student/offline/solo/picture-puzzle",
      "/student/offline/solo/target-tap",
      "/student/offline/solo/sort-shapes",
      "/student/offline/solo/smart-blocks",
      "/student/offline/solo/fruit-slice",
      "/student/offline/educational/recycling-factory",
      "/student/offline/educational/leo-supermarket",
      "/student/offline/educational/leo-lab",
      "/student/offline/educational/leo-gifts",
      "/student/offline/educational/leo-bakery",
      "/student/offline/educational/leo-number-path",
    ]
  : [];

const FULL_OFFLINE_ASSET_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? [
      "/images/leo.png",
      "/images/leo2.png",
      "/images/leo-logo.png",
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
      "/images/game-park.png",
      "/images/game-balloons-bg.png",
      "/images/candy/heart.png",
      "/images/candy/circle.png",
      "/images/candy/square.png",
      "/images/candy/drop.png",
      "/images/candy/diamond.png",
      "/images/candy/star.png",
      "/rewards/cards/common/card_back.webp",
      "/images/card/shiba1.png",
      "/images/card/shiba2.png",
      "/images/card/shiba3.png",
      "/images/card/shiba4.png",
      "/images/card/shiba5.png",
      "/sounds/flap.mp3",
    ]
  : [];

const OFFLINE_GAME_URLS = [...BASELINE_OFFLINE_GAME_URLS, ...FULL_OFFLINE_NAV_URLS];

const ASSET_ALLOWLIST = STUDENT_OFFLINE_FULL_SW_ENABLED ? FULL_OFFLINE_ASSET_URLS : null;

function isAllowlistedAsset(pathname) {
  if (!ASSET_ALLOWLIST) return false;
  return ASSET_ALLOWLIST.includes(pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.all(
          INSTALL_PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: "reload" })),
          ),
        );
        await Promise.allSettled(
          OFFLINE_GAME_URLS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })),
          ),
        );
        if (STUDENT_OFFLINE_FULL_SW_ENABLED && FULL_OFFLINE_ASSET_URLS.length) {
          await Promise.allSettled(
            FULL_OFFLINE_ASSET_URLS.map((url) =>
              cache.add(new Request(url, { cache: "reload" })),
            ),
          );
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/manifest-student.webmanifest"
  ) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (
    STUDENT_OFFLINE_FULL_SW_ENABLED &&
    (url.pathname.startsWith("/images/") ||
      url.pathname.startsWith("/sounds/") ||
      url.pathname.startsWith("/rewards/cards/")) &&
    isAllowlistedAsset(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && OFFLINE_GAME_URLS.includes(url.pathname)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/student/offline.html")),
        ),
    );
  }
});
