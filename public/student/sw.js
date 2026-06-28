// Service worker for LEO K student PWA (scope /student/ only).
// Sync STUDENT_OFFLINE_FULL_SW_ENABLED with lib/offline/offline-flags.js — must stay false in commit.

try {
  importScripts("./offline-precache-generated.js");
} catch (err) {
  console.warn("[SW student] offline-precache-generated.js not loaded:", err);
}

const STUDENT_OFFLINE_FULL_SW_ENABLED = true;

const GENERATED = self.__STUDENT_OFFLINE_PRECACHE__ || {
  chunkUrls: [],
  navUrls: [],
  dataUrls: [],
  assetUrls: [],
};

const CACHE_NAME = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? "student-offline-v3-full"
  : "student-offline-v1";
const CACHE_PREFIX = "student-";

const OFFLINE_HTML = "/student/offline.html";

const INSTALL_PRECACHE = [OFFLINE_HTML, "/icons/child/pwa-192x192.png"];

const BASELINE_OFFLINE_GAME_URLS = [
  "/student/offline",
  "/student/offline/tic-tac-toe",
  "/student/offline/rock-paper-scissors",
  "/student/offline/tap-battle",
  "/student/offline/memory-match",
];

const FULL_OFFLINE_NAV_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? GENERATED.navUrls.filter((url) => !BASELINE_OFFLINE_GAME_URLS.includes(url))
  : [];

const OFFLINE_GAME_URLS = [...BASELINE_OFFLINE_GAME_URLS, ...FULL_OFFLINE_NAV_URLS];

const FULL_CHUNK_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED ? GENERATED.chunkUrls || [] : [];
const FULL_DATA_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED ? GENERATED.dataUrls || [] : [];
const FULL_ASSET_URLS = STUDENT_OFFLINE_FULL_SW_ENABLED
  ? GENERATED.assetUrls || []
  : [];

const OFFLINE_HTML_FALLBACK = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>אין חיבור — LEO K</title>
<style>
body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#050816;color:#fff;font-family:system-ui,sans-serif;padding:1.5rem}
.card{max-width:22rem;text-align:center}
.btn{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#2dd4bf,#0ea5e9);color:#050816;font-weight:700;text-decoration:none;border-radius:1rem;padding:.85rem 2rem;width:100%}
</style>
</head>
<body>
<div class="card">
<h1>אין חיבור לאינטרנט</h1>
<p>ניתן לשחק במשחקים הבאים גם בלי אינטרנט</p>
<a href="/student/offline" class="btn">🎮 משחקים ללא אינטרנט</a>
</div>
</body>
</html>`;

const IMAGE_PATTERNS = [
  /^\/images\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i,
  /^\/images\/card\/.*\.png$/i,
  /^\/images\/candy\/.*\.png$/i,
  /^\/images\/puzzle\/.*\.png$/i,
  /^\/images\/grocery-items\/.*\.svg$/i,
  /^\/images\/recycling-items\/.*\.svg$/i,
  /^\/images\/leo-supermarket\/.*\.(png|jpg|webp)$/i,
];

const SOUND_PATTERNS = [/^\/sounds\/.*\.(mp3|wav|ogg)$/i];

const REWARD_CARD_PATH_PREFIX = "/rewards/cards/";

function isStudentStaticAsset(pathname) {
  if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return false;
  if (pathname.startsWith(REWARD_CARD_PATH_PREFIX)) return true;
  return (
    IMAGE_PATTERNS.some((pattern) => pattern.test(pathname)) ||
    SOUND_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

function isStudentNavigation(request, url) {
  return (
    url.pathname.startsWith("/student/") &&
    (request.mode === "navigate" || request.destination === "document")
  );
}

function isStudentDataRequest(url) {
  return url.pathname.startsWith("/_next/data/") && url.pathname.endsWith(".json");
}

/** @param {Request} request */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (err) {
    const cachedFallback = await caches.match(request.url.split("?")[0]);
    if (cachedFallback) return cachedFallback;
    throw err;
  }
}

async function serveOfflineHtmlFallback() {
  const cache = await caches.open(CACHE_NAME);
  const candidates = [
    OFFLINE_HTML,
    new Request(OFFLINE_HTML, { mode: "navigate" }),
  ];

  for (const candidate of candidates) {
    const match = await cache.match(candidate, { ignoreSearch: true });
    if (match) return match;
  }

  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    if (!name.startsWith(CACHE_PREFIX)) continue;
    const altCache = await caches.open(name);
    for (const candidate of candidates) {
      const match = await altCache.match(candidate, { ignoreSearch: true });
      if (match) return match;
    }
  }

  return new Response(OFFLINE_HTML_FALLBACK, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** @param {Request} request */
async function handleStudentNavigation(request) {
  const url = new URL(request.url);

  try {
    const response = await fetch(request);
    if (response.ok && OFFLINE_GAME_URLS.includes(url.pathname)) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (_err) {
    const cached =
      (await caches.match(request)) ||
      (await caches.match(url.pathname, { ignoreSearch: true }));
    if (cached) return cached;
    return serveOfflineHtmlFallback();
  }
}

/** @param {string[]} urls */
async function precacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    urls.map(async (url) => {
      const request = new Request(url, { credentials: "same-origin", cache: "reload" });
      const existing = await cache.match(request, { ignoreSearch: true });
      if (existing) return;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response);
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        INSTALL_PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );

      await Promise.allSettled(
        OFFLINE_GAME_URLS.map((url) =>
          cache.add(new Request(url, { credentials: "same-origin", cache: "reload" })),
        ),
      );

      if (STUDENT_OFFLINE_FULL_SW_ENABLED) {
        const fullUrls = [
          ...FULL_CHUNK_URLS,
          ...FULL_DATA_URLS,
          ...FULL_ASSET_URLS,
        ];
        await Promise.allSettled(
          fullUrls.map(async (url) => {
            const request = new Request(url, { credentials: "same-origin", cache: "reload" });
            try {
              const response = await fetch(request);
              if (response.ok) {
                await cache.put(request, response);
              }
            } catch (_err) {
              // Warm-up from hub will retry while online.
            }
          }),
        );
      }

      await self.skipWaiting();
    })(),
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

self.addEventListener("message", (event) => {
  if (!STUDENT_OFFLINE_FULL_SW_ENABLED) return;

  if (event.data?.type === "PRE_CACHE_STUDENT_OFFLINE") {
    const buildId = event.data.buildId || GENERATED.buildId;
    const extraDataUrls = buildId
      ? OFFLINE_GAME_URLS.map((navUrl) => {
          const suffix = navUrl === "/" ? "/index" : navUrl;
          return `/_next/data/${buildId}${suffix}.json`;
        })
      : [];

    const urls = [
      ...OFFLINE_GAME_URLS,
      ...FULL_CHUNK_URLS,
      ...FULL_DATA_URLS,
      ...extraDataUrls,
      ...FULL_ASSET_URLS,
    ];

    event.waitUntil(
      precacheUrls([...new Set(urls)]).then(() => {
        if (event.source) {
          event.source.postMessage({ type: "PRE_CACHE_STUDENT_OFFLINE_DONE" });
        }
      }),
    );
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (STUDENT_OFFLINE_FULL_SW_ENABLED && isStudentDataRequest(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (STUDENT_OFFLINE_FULL_SW_ENABLED && isStudentStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (isStudentNavigation(event.request, url)) {
    event.respondWith(handleStudentNavigation(event.request));
  }
});
